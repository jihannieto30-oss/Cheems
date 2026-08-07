"""Un Transformer decodificador, escrito a mano.

No se usa `nn.Transformer`, ni `nn.MultiheadAttention`, ni nada que esconda la
atención. Lo único que se toma prestado de PyTorch son las piezas de álgebra
—`Linear`, `Embedding`, `matmul`— y el autograd.

## Qué lleva y por qué

| Pieza | Elegido | En vez de | Motivo |
|---|---|---|---|
| Normalización | RMSNorm | LayerNorm | Un parámetro menos y una media menos que calcular; misma calidad medida. |
| Posición | RoPE | Embedding aprendido | La posición entra en la atención como un giro, no como un vector sumado: el modelo ve *distancias relativas*, y eso extrapola más allá del contexto de entrenamiento. |
| Orden de la norma | Pre-norm | Post-norm | Con post-norm hace falta warmup largo o el gradiente explota en las primeras capas. Pre-norm entrena estable desde el primer paso. |
| MLP | SwiGLU | GELU | Mejor pérdida a igualdad de parámetros; por eso se pone el oculto en 8/3·d y no en 4·d. |
| Sesgos | Ninguno | bias=True | En un decodificador no aportan nada medible y son parámetros y memoria. |
| Embeddings | Atados | Sueltos | Entrada y salida viven en el mismo espacio. En un modelo pequeño esto es entre el 15 % y el 30 % de los parámetros. |

## La atención, en una línea

    softmax( (Q·Kᵀ)/√d_k + máscara ) · V

`√d_k` no es decorativo: sin él, la varianza del producto crece con la
dimensión, el softmax se satura y el gradiente se muere. La máscara es
triangular porque la posición *t* sólo puede mirar hasta *t*; es lo único que
separa a un decodificador de un codificador.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class Config:
    tam_vocab: int = 4096
    n_capas: int = 6
    n_cabezas: int = 6
    n_kv_cabezas: int | None = None   # None = atención multi-cabeza clásica
    d_modelo: int = 384
    bloque: int = 256                 # ventana de contexto, en tokens
    dropout: float = 0.0
    rope_base: float = 10000.0
    sdpa: bool = False                # True = núcleo fusionado de PyTorch

    def __post_init__(self) -> None:
        assert self.d_modelo % self.n_cabezas == 0, \
            'd_modelo tiene que repartirse entero entre las cabezas'
        if self.n_kv_cabezas is None:
            self.n_kv_cabezas = self.n_cabezas
        assert self.n_cabezas % self.n_kv_cabezas == 0, \
            'las cabezas de consulta se agrupan por cabeza de clave'

    @property
    def d_cabeza(self) -> int:
        return self.d_modelo // self.n_cabezas


# ---------------------------------------------------------------------------
# normalización
# ---------------------------------------------------------------------------
class RMSNorm(nn.Module):
    """x · rsqrt(mean(x²) + eps) · g

    LayerNorm resta la media y divide por la desviación. RMSNorm sólo divide.
    Resulta que centrar no aportaba nada en un Transformer, así que sobra el
    cálculo y sobra el parámetro de sesgo.
    """

    def __init__(self, d: int, eps: float = 1e-6) -> None:
        super().__init__()
        self.eps = eps
        self.g = nn.Parameter(torch.ones(d))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # En float32 aunque el resto vaya en menos precisión: es una reducción
        # y ahí es donde se pierden bits que luego no se recuperan.
        dt = x.dtype
        x = x.float()
        x = x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)
        return (x * self.g.float()).to(dt)


# ---------------------------------------------------------------------------
# posición: RoPE
# ---------------------------------------------------------------------------
def frecuencias_rope(d_cabeza: int, largo: int, base: float,
                     device, dtype=torch.float32):
    """Precalcula cos y sin. Se hacen una vez, no en cada paso."""
    inv = 1.0 / (base ** (torch.arange(0, d_cabeza, 2, device=device).float() / d_cabeza))
    t = torch.arange(largo, device=device).float()
    ang = torch.outer(t, inv)                      # (largo, d_cabeza/2)
    return torch.cos(ang).to(dtype), torch.sin(ang).to(dtype)


def aplica_rope(x: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor) -> torch.Tensor:
    """Gira cada par de dimensiones un ángulo proporcional a la posición.

    x llega como (B, cabezas, T, d_cabeza). Se parte cada vector en pares
    (x1, x2) y se rota:

        x1' = x1·cos − x2·sin
        x2' = x1·sin + x2·cos

    Como el producto escalar de dos vectores girados sólo depende de la
    diferencia de ángulos, la atención acaba viendo la distancia entre
    posiciones y no las posiciones absolutas. Ése es todo el truco.
    """
    x1, x2 = x[..., 0::2], x[..., 1::2]
    cos = cos[None, None, :, :]
    sin = sin[None, None, :, :]
    out = torch.empty_like(x)
    out[..., 0::2] = x1 * cos - x2 * sin
    out[..., 1::2] = x1 * sin + x2 * cos
    return out


# ---------------------------------------------------------------------------
# atención
# ---------------------------------------------------------------------------
class AtencionCausal(nn.Module):
    """Multi-cabeza con máscara triangular, y caché KV para generar.

    Soporta agrupar cabezas (GQA): varias cabezas de consulta comparten una
    misma cabeza de clave/valor. Con `n_kv_cabezas = n_cabezas` es la atención
    multi-cabeza de toda la vida.
    """

    def __init__(self, cfg: Config) -> None:
        super().__init__()
        self.cfg = cfg
        self.nh, self.nkv, self.dh = cfg.n_cabezas, cfg.n_kv_cabezas, cfg.d_cabeza
        self.rep = self.nh // self.nkv

        # Q, K y V en una sola matriz: un GEMM en vez de tres.
        self.qkv = nn.Linear(cfg.d_modelo, (self.nh + 2 * self.nkv) * self.dh, bias=False)
        self.proj = nn.Linear(cfg.d_modelo, cfg.d_modelo, bias=False)
        self.drop_at = nn.Dropout(cfg.dropout)
        self.drop_re = nn.Dropout(cfg.dropout)

        # La máscara no es un parámetro: es una constante que viaja con el
        # módulo (`persistent=False` para no meterla en el checkpoint).
        m = torch.tril(torch.ones(cfg.bloque, cfg.bloque, dtype=torch.bool))
        self.register_buffer('mascara', m.view(1, 1, cfg.bloque, cfg.bloque),
                             persistent=False)

    def forward(self, x, cos, sin, cache=None):
        B, T, C = x.shape

        q, k, v = self.qkv(x).split(
            [self.nh * self.dh, self.nkv * self.dh, self.nkv * self.dh], dim=-1)
        q = q.view(B, T, self.nh, self.dh).transpose(1, 2)
        k = k.view(B, T, self.nkv, self.dh).transpose(1, 2)
        v = v.view(B, T, self.nkv, self.dh).transpose(1, 2)

        q = aplica_rope(q, cos, sin)
        k = aplica_rope(k, cos, sin)

        # `cache=None` significa «sin caché»; `(None, None)` significa «con
        # caché, todavía vacía». Distinguirlos importa: si el primer paso de la
        # generación no puede decir «vacía pero activa», la caché no se llena
        # nunca y cada token acaba atendiéndose sólo a sí mismo.
        if cache is not None:
            # Al generar, sólo entra el token nuevo: las claves y valores de
            # todo lo anterior ya están calculados. Sin esto, generar N tokens
            # costaría O(N²) pasadas completas en vez de O(N).
            kv, vv = cache
            if kv is not None:
                k = torch.cat([kv, k], dim=2)
                v = torch.cat([vv, v], dim=2)
            cache = (k, v)

        if self.rep > 1:                       # GQA: se repiten K y V
            k = k.repeat_interleave(self.rep, dim=1)
            v = v.repeat_interleave(self.rep, dim=1)

        Tk = k.size(2)
        # Las T consultas son las ÚLTIMAS T posiciones de las Tk claves. Vale
        # igual para la pasada sin caché (Tk == T) que para la incremental.
        m = self.mascara[:, :, Tk - T:Tk, :Tk]

        if self.cfg.sdpa:
            # Máscara explícita y no `is_causal`: con caché, la consulta no
            # empieza en la posición 0 y `is_causal` la enmascararía mal.
            y = F.scaled_dot_product_attention(
                q, k, v, attn_mask=m,
                dropout_p=self.cfg.dropout if self.training else 0.0)
        else:
            # La atención, a mano.
            att = (q @ k.transpose(-2, -1)) / math.sqrt(self.dh)
            att = att.masked_fill(~m, float('-inf'))
            att = self.drop_at(F.softmax(att, dim=-1))
            y = att @ v

        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.drop_re(self.proj(y)), cache


# ---------------------------------------------------------------------------
# MLP
# ---------------------------------------------------------------------------
class SwiGLU(nn.Module):
    """SiLU(W1·x) ⊙ (W3·x), y luego W2.

    Dos proyecciones hacia arriba en vez de una: la primera decide *cuánto*
    pasa y la segunda *qué* pasa. Es una puerta. Como son tres matrices en vez
    de dos, el oculto se pone en 8/3·d para gastar los mismos parámetros que un
    MLP clásico de 4·d.
    """

    def __init__(self, cfg: Config) -> None:
        super().__init__()
        oculto = int(8 * cfg.d_modelo / 3)
        oculto = 64 * ((oculto + 63) // 64)      # múltiplo de 64: GEMM contento
        self.w1 = nn.Linear(cfg.d_modelo, oculto, bias=False)
        self.w3 = nn.Linear(cfg.d_modelo, oculto, bias=False)
        self.w2 = nn.Linear(oculto, cfg.d_modelo, bias=False)
        self.drop = nn.Dropout(cfg.dropout)

    def forward(self, x):
        return self.drop(self.w2(F.silu(self.w1(x)) * self.w3(x)))


class Bloque(nn.Module):
    """Pre-norm: x + f(norm(x)). El residuo queda limpio de principio a fin.

    Ésa es la diferencia con post-norm, y no es cosmética: aquí hay un camino
    de gradiente sin nada en medio desde la pérdida hasta la primera capa.
    """

    def __init__(self, cfg: Config) -> None:
        super().__init__()
        self.n1 = RMSNorm(cfg.d_modelo)
        self.at = AtencionCausal(cfg)
        self.n2 = RMSNorm(cfg.d_modelo)
        self.mlp = SwiGLU(cfg)

    def forward(self, x, cos, sin, cache=None):
        h, cache = self.at(self.n1(x), cos, sin, cache)
        x = x + h
        x = x + self.mlp(self.n2(x))
        return x, cache


# ---------------------------------------------------------------------------
# el modelo
# ---------------------------------------------------------------------------
class GPT(nn.Module):
    def __init__(self, cfg: Config) -> None:
        super().__init__()
        self.cfg = cfg
        self.emb = nn.Embedding(cfg.tam_vocab, cfg.d_modelo)
        self.drop = nn.Dropout(cfg.dropout)
        self.bloques = nn.ModuleList([Bloque(cfg) for _ in range(cfg.n_capas)])
        self.norma = RMSNorm(cfg.d_modelo)
        self.salida = nn.Linear(cfg.d_modelo, cfg.tam_vocab, bias=False)

        # Pesos atados. La matriz de embedding y la de salida son la misma.
        self.salida.weight = self.emb.weight

        self.apply(self._init)
        # Escalado de las proyecciones residuales: cada capa suma al residuo,
        # así que sin esto la varianza crece con la profundidad. 1/√(2·capas)
        # la mantiene en 1. Viene de GPT-2 y sigue siendo correcto.
        for n, p in self.named_parameters():
            if n.endswith('proj.weight') or n.endswith('w2.weight'):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * cfg.n_capas))

        cos, sin = frecuencias_rope(cfg.d_cabeza, cfg.bloque, cfg.rope_base, 'cpu')
        self.register_buffer('cos', cos, persistent=False)
        self.register_buffer('sin', sin, persistent=False)

    @staticmethod
    def _init(m: nn.Module) -> None:
        if isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)
            if m.bias is not None:
                nn.init.zeros_(m.bias)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)

    def n_params(self, sin_embedding: bool = False) -> int:
        n = sum(p.numel() for p in self.parameters())
        if sin_embedding:
            n -= self.emb.weight.numel()
        return n

    def forward(self, idx, objetivo=None, caches=None, desfase: int = 0):
        B, T = idx.shape
        assert T <= self.cfg.bloque, f'{T} tokens no caben en {self.cfg.bloque}'

        x = self.drop(self.emb(idx))
        cos = self.cos[desfase:desfase + T]
        sin = self.sin[desfase:desfase + T]

        nuevas = []
        for i, b in enumerate(self.bloques):
            x, c = b(x, cos, sin, None if caches is None else caches[i])
            nuevas.append(c)
        x = self.norma(x)

        if objetivo is None:
            # Al generar sólo importa la última posición: calcular los logits
            # de todas es tirar un GEMM de vocab×T a la basura.
            return self.salida(x[:, [-1], :]), nuevas

        logits = self.salida(x)
        perdida = F.cross_entropy(
            logits.view(-1, logits.size(-1)), objetivo.reshape(-1), ignore_index=-1)
        return logits, perdida

    # -- muestreo ----------------------------------------------------------
    @torch.no_grad()
    def genera(self, idx, max_tokens: int = 200, temperatura: float = 0.8,
               top_k: int | None = 50, top_p: float | None = 0.95,
               pen_repeticion: float = 1.1, parar_en: int | None = None):
        """Genera token a token con caché KV.

        - `temperatura` divide los logits: <1 agudiza, >1 aplana. En 0 es argmax.
        - `top_k` deja las k más probables. Corta la cola larga de ruido.
        - `top_p` deja las que suman p de masa. Se adapta: donde el modelo está
          seguro deja pocas, donde duda deja muchas.
        - `pen_repeticion` castiga lo ya dicho. Es lo que evita el bucle.
        """
        self.eval()
        caches = [(None, None)] * self.cfg.n_capas   # activa, vacía
        vistos = idx[0].tolist()
        # La primera pasada procesa el prompt entero y llena la caché.
        entrada, desfase = idx, 0

        for _ in range(max_tokens):
            if entrada.size(1) + desfase > self.cfg.bloque:
                break
            logits, caches = self(entrada, caches=caches, desfase=desfase)
            desfase += entrada.size(1)
            logits = logits[:, -1, :].float()

            if pen_repeticion != 1.0 and vistos:
                # División si el logit es positivo, multiplicación si es
                # negativo: en ambos casos baja la probabilidad. Restar sin más
                # subiría los logits negativos, que es justo lo contrario.
                u = torch.tensor(sorted(set(vistos)), device=logits.device)
                l = logits[0, u]
                logits[0, u] = torch.where(l > 0, l / pen_repeticion,
                                           l * pen_repeticion)

            if temperatura <= 0:
                sig = torch.argmax(logits, dim=-1, keepdim=True)
            else:
                logits = logits / temperatura
                if top_k:
                    k = min(top_k, logits.size(-1))
                    umbral = torch.topk(logits, k, dim=-1).values[..., -1, None]
                    logits = logits.masked_fill(logits < umbral, float('-inf'))
                if top_p is not None and top_p < 1.0:
                    ordenados, indices = torch.sort(logits, descending=True, dim=-1)
                    acum = torch.cumsum(F.softmax(ordenados, dim=-1), dim=-1)
                    fuera = acum - F.softmax(ordenados, dim=-1) > top_p
                    fuera[..., 0] = False          # la más probable nunca se cae
                    logits = logits.masked_fill(
                        fuera.scatter(-1, indices, fuera), float('-inf'))
                sig = torch.multinomial(F.softmax(logits, dim=-1), num_samples=1)

            t = int(sig.item())
            if parar_en is not None and t == parar_en:
                break
            vistos.append(t)
            idx = torch.cat([idx, sig], dim=1)
            entrada = sig                       # a partir de aquí, uno a uno

        return idx

"""Entrenamiento. Bucle a mano, sin Trainer ni Lightning ni Accelerate.

    python3 llm/entrena.py --pasos 2000 --capas 6 --dmodelo 384

Lo que hay aquí y por qué está:

- **AdamW con grupos.** Decaimiento de peso sólo sobre las matrices. Aplicarlo
  a las ganancias de RMSNorm y a los embeddings las empuja hacia cero, que es
  justo lo contrario de lo que hacen falta.
- **Warmup lineal y luego coseno.** Adam necesita unos cientos de pasos para
  estimar sus momentos; darle el ritmo completo antes de eso es la forma más
  fácil de divergir en el paso 50.
- **Recorte de gradiente a 1.0.** Barato, y convierte un pico de pérdida en un
  paso pequeño en vez de en un modelo roto.
- **Acumulación.** El tamaño de lote que importa es el efectivo. Si no cabe en
  memoria, se parte y se suman los gradientes: sale igual.
- **Checkpoint por pérdida de validación, no por la última.** La última es la
  del lote que tocó, y el lote que tocó es ruido.
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import time

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from px.conversaciones import construye as construye_dialogo   # noqa: E402
from px.datos import construye_corpus, lote, particiona           # noqa: E402
from px.modelo import GPT, Config                                  # noqa: E402
from px.tokenizador import Tokenizador                             # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SALIDA = os.path.join(AQUI, 'salida')   # lo pisa --salida


def ritmo(paso: int, total: int, lr: float, warmup: int, suelo: float) -> float:
    if paso < warmup:
        return lr * (paso + 1) / warmup
    if paso >= total:
        return suelo
    t = (paso - warmup) / max(1, total - warmup)
    return suelo + 0.5 * (1 + math.cos(math.pi * t)) * (lr - suelo)


@torch.no_grad()
def evalua(modelo, datos, tam, bloque, n=40, gen=None):
    modelo.eval()
    p = torch.zeros(n)
    for i in range(n):
        x, y = lote(datos, tam, bloque, gen)
        _, l = modelo(x, y)
        p[i] = l.item()
    modelo.train()
    return p.mean().item()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--pasos', type=int, default=2000)
    ap.add_argument('--capas', type=int, default=6)
    ap.add_argument('--cabezas', type=int, default=6)
    ap.add_argument('--dmodelo', type=int, default=384)
    ap.add_argument('--bloque', type=int, default=256)
    ap.add_argument('--vocab', type=int, default=4096)
    ap.add_argument('--lote', type=int, default=16)
    ap.add_argument('--acumula', type=int, default=1)
    ap.add_argument('--lr', type=float, default=6e-4)
    ap.add_argument('--suelo-lr', type=float, default=6e-5)
    ap.add_argument('--warmup', type=int, default=100)
    ap.add_argument('--decaimiento', type=float, default=0.1)
    ap.add_argument('--dropout', type=float, default=0.1)
    ap.add_argument('--recorte', type=float, default=1.0)
    ap.add_argument('--cada', type=int, default=100)
    ap.add_argument('--semilla', type=int, default=1337)
    ap.add_argument('--sdpa', action='store_true',
                    help='usa el núcleo fusionado en vez de la atención a mano')
    ap.add_argument('--hilos', type=int, default=0)
    ap.add_argument('--salida', default='salida')
    a = ap.parse_args()

    global SALIDA
    SALIDA = os.path.join(AQUI, a.salida)
    torch.manual_seed(a.semilla)
    if a.hilos:
        torch.set_num_threads(a.hilos)
    os.makedirs(SALIDA, exist_ok=True)

    # -- datos --------------------------------------------------------------
    print('\n[1/4] corpus')
    corpus = construye_corpus(RAIZ)
    dialogo = construye_dialogo(RAIZ)
    # La prosa enseña a escribir como PEPTIDEX; el diálogo enseña la forma de
    # un turno. Hacen falta las dos, y van juntas en el mismo corpus para que
    # el tokenizador vea las marcas especiales al aprender las fusiones.
    corpus = corpus + '\n\n' + dialogo

    print('\n[2/4] tokenizador')
    ruta_tok = os.path.join(SALIDA, 'tokenizador.json')
    if os.path.exists(ruta_tok):
        tok = Tokenizador.carga(ruta_tok)
        print(f'  reusado de {ruta_tok}')
    else:
        t0 = time.time()
        # Las marcas se quitan ANTES de aprender las fusiones. Si se dejan, BPE
        # gasta entradas de vocabulario en deletrear «<|usuario|>», que luego
        # nunca se usan porque la marca entra como un token especial entero.
        sin_marcas = re.sub(r'<\|[a-z]+\|>', ' ', corpus)
        tok = Tokenizador().entrena(sin_marcas, a.vocab)
        tok.registra_especiales(['<|fin|>', '<|usuario|>', '<|jarvis|>'])
        tok.guarda(ruta_tok)
        print(f'  entrenado en {time.time() - t0:.1f}s')
    # Aquí sí con especiales: es lo que hace que el modelo vea un turno como
    # un turno y no como texto que casualmente lleva barras verticales.
    ids = tok.codifica(corpus, permitir_especiales=True)
    print(f'  vocabulario {tok.tam_vocab} · {len(ids):,} tokens · '
          f'{len(corpus) / max(1, len(ids)):.2f} caracteres por token')

    tr, va = particiona(ids)
    print(f'  entrenamiento {len(tr):,} · validación {len(va):,}')

    # -- modelo -------------------------------------------------------------
    print('\n[3/4] modelo')
    cfg = Config(tam_vocab=tok.tam_vocab, n_capas=a.capas, n_cabezas=a.cabezas,
                 d_modelo=a.dmodelo, bloque=a.bloque, dropout=a.dropout,
                 sdpa=a.sdpa)
    modelo = GPT(cfg)
    print(f'  {modelo.n_params():,} parámetros '
          f'({modelo.n_params(True):,} sin contar el embedding)')
    # Chinchilla dice ~20 tokens por parámetro. Con mucho menos, el modelo
    # tiene sitio de sobra para memorizar el corpus, y lo hará.
    print(f'  {len(tr) / modelo.n_params():.2f} tokens por parámetro '
          f'(la referencia de Chinchilla son 20)')

    decae = [p for n, p in modelo.named_parameters() if p.dim() >= 2]
    no_decae = [p for n, p in modelo.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW(
        [{'params': decae, 'weight_decay': a.decaimiento},
         {'params': no_decae, 'weight_decay': 0.0}],
        lr=a.lr, betas=(0.9, 0.95), eps=1e-8)
    print(f'  AdamW · {sum(p.numel() for p in decae):,} con decaimiento · '
          f'{sum(p.numel() for p in no_decae):,} sin él')

    # -- bucle --------------------------------------------------------------
    print(f'\n[4/4] entrenando {a.pasos} pasos '
          f'(lote efectivo {a.lote * a.acumula} × {a.bloque} tokens)\n')
    gen = torch.Generator().manual_seed(a.semilla)
    mejor, t0 = float('inf'), time.time()
    historia = []

    for paso in range(a.pasos):
        lr = ritmo(paso, a.pasos, a.lr, a.warmup, a.suelo_lr)
        for g in opt.param_groups:
            g['lr'] = lr

        opt.zero_grad(set_to_none=True)
        acum = 0.0
        for _ in range(a.acumula):
            x, y = lote(tr, a.lote, a.bloque, gen)
            _, perdida = modelo(x, y)
            # Dividir aquí y no al final: así el gradiente acumulado es la
            # media de los micro-lotes, que es lo que sería un lote grande.
            (perdida / a.acumula).backward()
            acum += perdida.item() / a.acumula

        norma = torch.nn.utils.clip_grad_norm_(modelo.parameters(), a.recorte)
        opt.step()

        if paso % a.cada == 0 or paso == a.pasos - 1:
            pv = evalua(modelo, va, a.lote, a.bloque, gen=gen)
            dt = time.time() - t0
            marca = ''
            if pv < mejor:
                mejor = pv
                torch.save({'modelo': modelo.state_dict(), 'cfg': cfg.__dict__,
                            'paso': paso, 'val': pv},
                           os.path.join(SALIDA, 'modelo.pt'))
                marca = '  ← guardado'
            historia.append((paso, acum, pv))
            print(f'  paso {paso:>5}  entren {acum:.4f}  val {pv:.4f}  '
                  f'ppl {math.exp(min(20, pv)):>8.1f}  lr {lr:.2e}  '
                  f'|g| {norma:.2f}  {dt:>5.0f}s{marca}')

    print(f'\n  mejor validación: {mejor:.4f} '
          f'(perplejidad {math.exp(min(20, mejor)):.1f})')
    print(f'  {os.path.join(SALIDA, "modelo.pt")}')

    # Una muestra al terminar, para ver qué aprendió de verdad.
    from px.modelo import GPT as _  # noqa: F401
    print('\n  muestra ---------------------------------------------------')
    ck = torch.load(os.path.join(SALIDA, 'modelo.pt'), weights_only=False)
    m = GPT(Config(**ck['cfg']))
    m.load_state_dict(ck['modelo'])
    ini = torch.tensor([tok.codifica('## BPC 157')], dtype=torch.long)
    out = m.genera(ini, max_tokens=120, temperatura=0.8, top_k=40)
    print('  ' + tok.descodifica(out[0].tolist()).replace('\n', '\n  '))


if __name__ == '__main__':
    main()

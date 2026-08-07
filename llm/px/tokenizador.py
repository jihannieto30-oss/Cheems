"""BPE a nivel de bytes, escrito a mano.

Por qué a nivel de bytes y no de caracteres ni de palabras:

- **Palabras** obligan a un vocabulario cerrado. «Tirzepatida», «BPC-157» o
  «sb_publishable_…» caerían todas en <UNK> y el modelo no podría ni copiarlas.
- **Caracteres** no tienen ese problema, pero gastan una posición de contexto
  por letra. Con 256 de ventana eso son 256 letras, unas 40 palabras: no cabe
  ni un párrafo.
- **Bytes + BPE** no tiene <UNK> por construcción —los 256 bytes son el suelo
  del vocabulario— y aun así aprende que «peptid» es una sola pieza. Es lo que
  usan GPT-2 y los que vinieron después, y es lo correcto para un corpus que
  mezcla español con acentos, inglés y nomenclatura química.

El algoritmo es el original de Sennrich (2016) aplicado a bytes: se parte de la
secuencia de bytes, se busca el par adyacente más frecuente, se sustituye por
un símbolo nuevo, y se repite. Cada sustitución es una «fusión» y el orden en
que se aprendieron *es* el modelo: al codificar se aplican en ese mismo orden.
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter


# Se pre-trocea antes de fusionar. Sin esto, BPE aprende fusiones que cruzan
# el espacio —«de la» como una pieza— y el vocabulario se llena de bigramas
# concretos en vez de trozos reutilizables. El patrón es el de GPT-2, con la
# categoría \p{L} sustituida por su equivalente en `re` sin dependencias.
PATRON = re.compile(
    r"""'(?:[sdmt]|ll|ve|re)| ?[^\W\d_]+| ?\d+| ?[^\s\w]+|\s+(?!\S)|\s+""",
    re.UNICODE,
)


def _pares(ids: list[int], cuenta: Counter | None = None) -> Counter:
    """Frecuencia de cada par adyacente. Reutiliza el contador si se le pasa."""
    c = Counter() if cuenta is None else cuenta
    for a, b in zip(ids, ids[1:]):
        c[(a, b)] += 1
    return c


def _funde(ids: list[int], par: tuple[int, int], nuevo: int) -> list[int]:
    """Sustituye toda aparición de `par` por `nuevo`, de izquierda a derecha."""
    out, i, n = [], 0, len(ids)
    a, b = par
    while i < n:
        if i < n - 1 and ids[i] == a and ids[i + 1] == b:
            out.append(nuevo)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out


class Tokenizador:
    """BPE de bytes. `entrena` aprende las fusiones; `codifica`/`descodifica` las usan.

    Atributos que definen el modelo entrenado:
      fusiones : dict[(int,int) -> int]  el par y el id que lo sustituye
      vocab    : dict[int -> bytes]      id -> los bytes que representa
      especial : dict[str -> int]        marcas que nunca salen del texto
    """

    def __init__(self) -> None:
        self.fusiones: dict[tuple[int, int], int] = {}
        self.vocab: dict[int, bytes] = {i: bytes([i]) for i in range(256)}
        self.especial: dict[str, int] = {}

    # -- entrenamiento -----------------------------------------------------
    def entrena(self, texto: str, vocab_objetivo: int = 4096,
                verboso: bool = True) -> "Tokenizador":
        assert vocab_objetivo >= 256, 'el suelo son los 256 bytes'
        n_fusiones = vocab_objetivo - 256

        # Cada trozo se fusiona por separado: así ninguna fusión cruza la
        # frontera del pre-troceo.
        trozos = [list(t.encode('utf-8')) for t in PATRON.findall(texto)]

        for i in range(n_fusiones):
            cuenta = Counter()
            for t in trozos:
                if len(t) >= 2:
                    _pares(t, cuenta)
            if not cuenta:
                if verboso:
                    print(f'  sin más pares que fundir en {256 + i}')
                break

            par = max(cuenta, key=cuenta.get)
            if cuenta[par] < 2:
                # Fundir un par que aparece una sola vez es memorizar, no
                # comprimir: gasta una entrada de vocabulario para siempre.
                if verboso:
                    print(f'  todos los pares son únicos en {256 + i}')
                break

            nuevo = 256 + i
            trozos = [_funde(t, par, nuevo) if len(t) >= 2 else t for t in trozos]
            self.fusiones[par] = nuevo
            self.vocab[nuevo] = self.vocab[par[0]] + self.vocab[par[1]]

            if verboso and (i + 1) % 500 == 0:
                pieza = self.vocab[nuevo].decode('utf-8', errors='replace')
                print(f'  fusión {i + 1:>5}/{n_fusiones}  ×{cuenta[par]:<6} {pieza!r}')

        return self

    def registra_especiales(self, nombres: list[str]) -> None:
        """Marcas de control. Van al final del vocabulario y nunca se fusionan."""
        base = 256 + len(self.fusiones)
        self.especial = {n: base + i for i, n in enumerate(nombres)}
        for n, i in self.especial.items():
            self.vocab[i] = n.encode('utf-8')

    # -- uso ---------------------------------------------------------------
    @property
    def tam_vocab(self) -> int:
        return 256 + len(self.fusiones) + len(self.especial)

    def _codifica_trozo(self, b: bytes) -> list[int]:
        ids = list(b)
        while len(ids) >= 2:
            # Se aplica siempre la fusión que se aprendió ANTES (id más bajo).
            # Aplicarlas en otro orden daría una segmentación distinta de la
            # que vio el modelo al entrenar.
            par = min(((p, self.fusiones[p]) for p in set(zip(ids, ids[1:]))
                       if p in self.fusiones),
                      key=lambda x: x[1], default=None)
            if par is None:
                break
            ids = _funde(ids, par[0], par[1])
        return ids

    def codifica(self, texto: str, permitir_especiales: bool = True) -> list[int]:
        if permitir_especiales and self.especial:
            # Se parte por las marcas para que salgan enteras y sin fundirse.
            patron = '(' + '|'.join(re.escape(k) for k in self.especial) + ')'
            salida: list[int] = []
            for parte in re.split(patron, texto):
                if not parte:
                    continue
                if parte in self.especial:
                    salida.append(self.especial[parte])
                else:
                    salida.extend(self.codifica(parte, permitir_especiales=False))
            return salida

        out: list[int] = []
        for t in PATRON.findall(texto):
            out.extend(self._codifica_trozo(t.encode('utf-8')))
        return out

    def descodifica(self, ids: list[int]) -> str:
        b = b''.join(self.vocab.get(i, b'') for i in ids)
        # `replace` y no `strict`: al muestrear, el modelo puede cortar a mitad
        # de un carácter multibyte y eso no debe reventar la generación.
        return b.decode('utf-8', errors='replace')

    # -- persistencia ------------------------------------------------------
    def guarda(self, ruta: str) -> None:
        os.makedirs(os.path.dirname(ruta) or '.', exist_ok=True)
        with open(ruta, 'w', encoding='utf-8') as f:
            json.dump({
                'fusiones': [[a, b, i] for (a, b), i in self.fusiones.items()],
                'especial': self.especial,
            }, f, ensure_ascii=False)

    @classmethod
    def carga(cls, ruta: str) -> "Tokenizador":
        t = cls()
        with open(ruta, encoding='utf-8') as f:
            d = json.load(f)
        # El orden importa: reconstruye el vocabulario en el mismo orden en que
        # se aprendió, porque cada fusión se apoya en las anteriores.
        for a, b, i in sorted(d['fusiones'], key=lambda x: x[2]):
            t.fusiones[(a, b)] = i
            t.vocab[i] = t.vocab[a] + t.vocab[b]
        t.especial = {k: int(v) for k, v in d['especial'].items()}
        for n, i in t.especial.items():
            t.vocab[i] = n.encode('utf-8')
        return t

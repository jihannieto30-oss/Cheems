"""El corpus sale del propio repositorio.

No se descarga nada. Lo que el modelo tiene que aprender a decir es lo que
PEPTIDEX ya escribió: las fichas de los 60 compuestos, las notas del cerebro,
la documentación. Es un corpus pequeño —lo que lo hace un problema honesto de
poco dato, no un juguete con datos de mentira.

Las fichas se convierten a prosa antes de entrar. Un JSON crudo enseñaría al
modelo a escribir JSON, que no es lo que se le pide.
"""

from __future__ import annotations

import json
import os
import random
import re

import torch


def _ficha_a_prosa(e: dict) -> str:
    """Una ficha de `library.json`, contada como la contaría una persona."""
    p = [f"## {e['n']}"]
    if e.get('mec'):
        p.append(e['mec'].strip())

    d = []
    if e.get('cat'):
        d.append(f"Se clasifica en {e['cat'].lower()}")
    if e.get('esp'):
        d.append(f"se presenta como {e['esp']}")
    if e.get('sol'):
        d.append(f"se reconstituye con {e['sol']}")
    if e.get('alm'):
        d.append(f"se conserva a {e['alm']}")
    if d:
        p.append('. '.join(d).replace('. se', ', se') + '.')

    r = e.get('ref') or {}
    if r.get('ini') or r.get('mant'):
        cifras = ' · '.join(x for x in [r.get('ini'), r.get('mant'), r.get('frec')] if x)
        p.append(f"El registro de operación anota como referencia: {cifras}. "
                 f"Es una cifra citada, no una recomendación.")
    if e.get('sku'):
        p.append(f"SKU {e['sku']}.")
    return '\n'.join(p)


def _limpia_md(t: str) -> str:
    t = re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S)      # frontmatter
    t = re.sub(r'```.*?```', '', t, flags=re.S)             # bloques de código
    t = re.sub(r'!?\[\[([^\]|]+)(\|[^\]]+)?\]\]', r'\1', t)  # wikilinks
    t = re.sub(r'!?\[([^\]]*)\]\([^)]+\)', r'\1', t)        # enlaces markdown
    t = re.sub(r'<[^>]+>', '', t)                           # html suelto
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


def construye_corpus(raiz: str, verboso: bool = True) -> str:
    partes: list[str] = []
    cuenta: dict[str, int] = {}

    lib = os.path.join(raiz, 'web', 'assets', 'library.json')
    if os.path.exists(lib):
        fichas = json.load(open(lib, encoding='utf-8'))
        txt = '\n\n'.join(_ficha_a_prosa(e) for e in fichas)
        partes.append('# Catálogo de compuestos\n\n' + txt)
        cuenta['fichas'] = len(fichas)

    for carpeta, etiqueta in [('cerebro', 'cerebro'), ('docs', 'documentación')]:
        d = os.path.join(raiz, carpeta)
        if not os.path.isdir(d):
            continue
        n = 0
        for dirp, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if not x.startswith('.') and x != 'sinapsis']
            for f in sorted(files):
                if not f.endswith('.md'):
                    continue
                t = _limpia_md(open(os.path.join(dirp, f), encoding='utf-8').read())
                # Debajo de ~200 caracteres es un índice o un stub: mete ruido
                # de formato y no enseña a escribir.
                if len(t) >= 200:
                    partes.append(t)
                    n += 1
        cuenta[etiqueta] = n

    corpus = '\n\n'.join(partes)
    if verboso:
        det = ' · '.join(f'{v} {k}' for k, v in cuenta.items())
        print(f'  corpus: {len(corpus):,} caracteres  ({det})')
    return corpus


def particiona(ids: list[int], val: float = 0.1, semilla: int = 1337):
    """Separa validación por bloques contiguos, no barajando tokens.

    Barajar tokens sueltos dejaría el 90 % del contexto de cada token de
    validación dentro del entrenamiento. La pérdida saldría preciosa y sería
    mentira. Se cortan trozos contiguos y se apartan enteros.
    """
    rnd = random.Random(semilla)
    n = len(ids)
    trozo = max(1, n // 100)
    bloques = [ids[i:i + trozo] for i in range(0, n, trozo)]
    idx = list(range(len(bloques)))
    rnd.shuffle(idx)
    corte = max(1, int(len(bloques) * val))
    ival = set(idx[:corte])

    tr = [t for i, b in enumerate(bloques) if i not in ival for t in b]
    va = [t for i, b in enumerate(bloques) if i in ival for t in b]
    return torch.tensor(tr, dtype=torch.long), torch.tensor(va, dtype=torch.long)


def lote(datos: torch.Tensor, tam: int, bloque: int, generador=None):
    """Un lote de ventanas al azar. `y` es `x` corrido una posición.

    Ahí está todo el objetivo del modelo: en cada posición, predecir el token
    siguiente. Una sola pasada da `bloque` predicciones supervisadas.
    """
    i = torch.randint(len(datos) - bloque - 1, (tam,), generator=generador)
    x = torch.stack([datos[j:j + bloque] for j in i])
    y = torch.stack([datos[j + 1:j + 1 + bloque] for j in i])
    return x, y

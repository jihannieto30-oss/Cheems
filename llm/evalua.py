"""Cuánto acierta el modelo, en número.

La pérdida de validación dice lo bien que predice el siguiente token. No dice
si lo que afirma es verdad. Para un negocio que vende compuestos, la segunda
pregunta es la única que importa: una frase bien construida con el dato de otro
compuesto es peor que no contestar.

Esto pregunta por los 60 compuestos y compara contra `library.json`.

    python3 llm/evalua.py            # el modelo entrenado
    python3 llm/evalua.py --salida salida_b
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from genera import carga, responde        # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def normaliza(s: str) -> str:
    return ' '.join(str(s).lower().split())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--salida', default='salida')
    ap.add_argument('--n', type=int, default=60)
    ap.add_argument('--temp', type=float, default=0.4)
    a = ap.parse_args()

    m, tok, ck = carga(a.salida)
    fichas = json.load(open(os.path.join(RAIZ, 'web', 'assets', 'library.json'),
                            encoding='utf-8'))[:a.n]

    # (pregunta, campo de la ficha)
    PRUEBAS = [('how do I store {n}', 'alm'),
               ('what solvent for {n}', 'sol'),
               ('what class is {n}', 'cat')]

    print(f"  {m.n_params():,} parámetros · paso {ck['paso']} · "
          f"val {ck['val']:.4f}\n")

    total = {k: [0, 0] for _, k in PRUEBAS}
    fuga = 0            # respuestas que nombran a OTRO compuesto
    nombres = [e['n'] for e in fichas]

    for e in fichas:
        for plantilla, campo in PRUEBAS:
            v = e.get(campo)
            if not v:
                continue
            r = responde(m, tok, plantilla.format(n=e['n']), max_tokens=60,
                         temperatura=a.temp, top_k=20, pen_repeticion=1.05)
            total[campo][1] += 1
            if normaliza(v) in normaliza(r):
                total[campo][0] += 1
            # ¿ha metido el nombre de otro compuesto en la respuesta?
            otros = [x for x in nombres
                     if x != e['n'] and len(x) > 4 and normaliza(x) in normaliza(r)]
            if otros:
                fuga += 1

    print('  campo         acierta  de   %')
    print('  ' + '-' * 34)
    n_ok = n_tot = 0
    ETI = {'alm': 'conservación', 'sol': 'solvente', 'cat': 'clase'}
    for campo, (ok, tot) in total.items():
        n_ok += ok
        n_tot += tot
        print(f'  {ETI[campo]:<12} {ok:>7}  {tot:>3}  {100 * ok / max(1, tot):>5.1f}')
    print('  ' + '-' * 34)
    print(f'  {"TOTAL":<12} {n_ok:>7}  {n_tot:>3}  {100 * n_ok / max(1, n_tot):>5.1f}')
    print(f'\n  respuestas que nombran a otro compuesto: {fuga}/{n_tot} '
          f'({100 * fuga / max(1, n_tot):.1f} %)')
    print('\n  Un acierto alto aquí NO significa que el modelo sepa: con 60 '
          'fichas\n  en el entrenamiento, acertar es recordar. Lo que sí '
          'significa algo es\n  la fuga: mide cuánto confunde un compuesto con '
          'otro.')


if __name__ == '__main__':
    main()

"""Hablar con el modelo entrenado.

    python3 llm/genera.py --prompt "what is BPC 157"
    python3 llm/genera.py --charla          # conversación en el terminal

`--charla` monta el prompt con las marcas que el modelo vio al entrenar. Sin
ellas, el modelo no sabe que le están preguntando: continúa el texto, que es lo
único que hace un modelo de lenguaje.
"""

from __future__ import annotations

import argparse
import os
import sys

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from px.modelo import GPT, Config          # noqa: E402
from px.tokenizador import Tokenizador     # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))


def carga(salida: str = 'salida'):
    d = os.path.join(AQUI, salida)
    tok = Tokenizador.carga(os.path.join(d, 'tokenizador.json'))
    ck = torch.load(os.path.join(d, 'modelo.pt'), weights_only=False, map_location='cpu')
    m = GPT(Config(**ck['cfg']))
    m.load_state_dict(ck['modelo'])
    m.eval()
    return m, tok, ck


def responde(m, tok, pregunta: str, **kw) -> str:
    p = f"<|usuario|> {pregunta}<|jarvis|>"
    ids = torch.tensor([tok.codifica(p)], dtype=torch.long)
    fin = tok.especial.get('<|fin|>')
    out = m.genera(ids, parar_en=fin, **kw)
    # Sólo lo generado, sin el prompt.
    return tok.descodifica(out[0].tolist()[ids.size(1):]).strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--salida', default='salida')
    ap.add_argument('--prompt', default=None)
    ap.add_argument('--crudo', default=None, help='continúa el texto, sin formato de turno')
    ap.add_argument('--charla', action='store_true')
    ap.add_argument('--tokens', type=int, default=140)
    ap.add_argument('--temp', type=float, default=0.7)
    ap.add_argument('--topk', type=int, default=40)
    ap.add_argument('--topp', type=float, default=0.92)
    ap.add_argument('--pen', type=float, default=1.15)
    a = ap.parse_args()

    m, tok, ck = carga(a.salida)
    print(f"  {m.n_params():,} parámetros · paso {ck['paso']} · "
          f"validación {ck['val']:.4f}\n")
    kw = dict(max_tokens=a.tokens, temperatura=a.temp, top_k=a.topk,
              top_p=a.topp, pen_repeticion=a.pen)

    if a.crudo:
        ids = torch.tensor([tok.codifica(a.crudo)], dtype=torch.long)
        print(tok.descodifica(m.genera(ids, **kw)[0].tolist()))
    elif a.prompt:
        print(responde(m, tok, a.prompt, **kw))
    elif a.charla:
        print('  (ctrl-c para salir)\n')
        try:
            while True:
                q = input('> ').strip()
                if q:
                    print('  ' + responde(m, tok, q, **kw) + '\n')
        except (KeyboardInterrupt, EOFError):
            print()
    else:
        ap.print_help()


if __name__ == '__main__':
    main()

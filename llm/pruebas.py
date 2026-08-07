"""Los invariantes del modelo. `python3 llm/pruebas.py`

No son pruebas de cortesía: los cuatro fallaron mientras se escribía esto, y
dos de los fallos —la caché KV y la máscara del núcleo fusionado— no habrían
dado error nunca. Habrían dado un modelo peor, en silencio.
"""

from __future__ import annotations

import math
import os
import sys

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from px.conversaciones import construye as construye_dialogo   # noqa: E402
from px.datos import construye_corpus                          # noqa: E402
from px.modelo import GPT, Config                              # noqa: E402
from px.tokenizador import Tokenizador                         # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fallos = []


def comprueba(nombre: str, ok: bool, detalle: str = '') -> None:
    print(f'  {"ok  " if ok else "FALLA"} {nombre}{"  · " + detalle if detalle else ""}')
    if not ok:
        fallos.append(nombre)


def main() -> None:
    torch.manual_seed(0)
    print('\n[tokenizador]')
    corpus = construye_corpus(RAIZ, verboso=False)
    tok = Tokenizador().entrena(corpus[:120000], 1024, verboso=False)
    tok.registra_especiales(['<|fin|>', '<|usuario|>', '<|jarvis|>'])

    pr = 'BPC 157 se conserva a 2°C a 8°C. Tirzepatida — «señor», ¿sí?'
    comprueba('ida y vuelta sin pérdida', tok.descodifica(tok.codifica(pr)) == pr)
    comprueba('comprime', len(tok.codifica(pr)) < len(pr.encode()),
              f'{len(pr.encode())} bytes → {len(tok.codifica(pr))} tokens')
    m1 = tok.codifica('<|usuario|> hola<|jarvis|>')
    comprueba('las marcas son un token cada una',
              tok.especial['<|usuario|>'] in m1 and tok.especial['<|jarvis|>'] in m1)
    # Guardar y cargar tiene que dar exactamente el mismo tokenizador.
    tmp = '/tmp/_tok_prueba.json'
    tok.guarda(tmp)
    t2 = Tokenizador.carga(tmp)
    comprueba('sobrevive a guardar y cargar', t2.codifica(pr) == tok.codifica(pr))

    print('\n[modelo]')
    cfg = Config(tam_vocab=tok.tam_vocab, n_capas=2, n_cabezas=4,
                 d_modelo=128, bloque=64)
    m = GPT(cfg)
    m.eval()

    ids = torch.tensor(tok.codifica(corpus[:6000], permitir_especiales=False))
    x, y = ids[:64].unsqueeze(0), ids[1:65].unsqueeze(0)
    _, p0 = m(x, y)
    esperado = math.log(tok.tam_vocab)
    comprueba('pérdida inicial ≈ ln(V)', abs(p0.item() - esperado) < 0.35,
              f'{p0.item():.3f} vs {esperado:.3f}')

    for sdpa in (False, True):
        for b in m.bloques:
            b.at.cfg.sdpa = sdpa
        with torch.no_grad():
            seq = x[:, :20]
            entero, _ = m(seq)
            ca = [(None, None)] * cfg.n_capas
            off = 0
            for i in range(20):
                inc, ca = m(seq[:, i:i + 1], caches=ca, desfase=off)
                off += 1
        d = float((entero - inc).abs().max())
        comprueba(f'caché KV == recálculo (sdpa={sdpa})', d < 1e-4, f'máx {d:.2e}')

    with torch.no_grad():
        for b in m.bloques:
            b.at.cfg.sdpa = False
        a, _ = m(x)
        for b in m.bloques:
            b.at.cfg.sdpa = True
        bq, _ = m(x)
    d = float((a - bq).abs().max())
    comprueba('atención a mano == núcleo fusionado', d < 1e-4, f'máx {d:.2e}')

    for b in m.bloques:
        b.at.cfg.sdpa = False
    with torch.no_grad():
        z = x.clone()
        z[0, -1] = (z[0, -1] + 7) % tok.tam_vocab
        la, _ = m(x[:, :-1])
        lb, _ = m(z[:, :-1])
    comprueba('causal: el futuro no mueve el pasado', torch.allclose(la, lb, atol=1e-6))

    # Los pesos atados tienen que ser el MISMO tensor, no una copia igual.
    comprueba('embeddings atados', m.salida.weight is m.emb.weight)

    g = m.genera(torch.tensor([tok.codifica('BPC')]), max_tokens=10, temperatura=0.9)
    comprueba('genera', g.shape[1] > len(tok.codifica('BPC')))
    g0 = m.genera(torch.tensor([tok.codifica('BPC')]), max_tokens=10, temperatura=0.0)
    g1 = m.genera(torch.tensor([tok.codifica('BPC')]), max_tokens=10, temperatura=0.0)
    comprueba('temperatura 0 es determinista', torch.equal(g0, g1))

    print('\n[datos]')
    d = construye_dialogo(RAIZ, verboso=False)
    comprueba('el diálogo lleva las tres marcas',
              all(k in d for k in ('<|usuario|>', '<|jarvis|>', '<|fin|>')))
    # Ninguna respuesta puede recomendar una dosis: eso es lo que vigila `lex`.
    malas = [l for l in d.split('\n')
             if '<|jarvis|>' in l
             and any(w in l.lower() for w in ('you should take', 'i recommend',
                                              'recommended dose for you'))]
    comprueba('ninguna respuesta recomienda dosis', not malas, f'{len(malas)} sospechosas')

    print()
    if fallos:
        print(f'  {len(fallos)} fallo(s): ' + ', '.join(fallos))
        sys.exit(1)
    print('  todo en orden')


if __name__ == '__main__':
    main()

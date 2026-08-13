#!/usr/bin/env python3
"""Mete los cambios de web/src/ en la tienda ya construida.

POR QUÉ EXISTE ESTO Y NO SE RECONSTRUYE Y YA

`build_restore.py` no puede correr: le faltan dos entradas que no están en el
repositorio ni en el disco —`web/PEPTIDEX.base.html` y `web/ls_master/`—. Sin
el fichero base no hay nada sobre lo que construir.

Pero el build concatena cada fichero de `web/src/` **literalmente**, y cada uno
aparece exactamente una vez dentro de `PEPTIDEX.html`. Eso da una salida
limpia: se localiza el bloque viejo y se sustituye por el nuevo. No es un
parche por expresiones regulares sobre HTML — es sustituir un fichero completo
por su versión actual.

Y es idempotente por construcción: si el bloque ya está al día, no hay nada que
hacer y lo dice.

    python3 web/parche_tienda.py            # aplica
    python3 web/parche_tienda.py --revisa   # sólo dice qué está desfasado

CUANDO APAREZCAN LA BASE Y ls_master, ESTO SOBRA. Se vuelve a
`build_restore.py`, que es el camino bueno, y este fichero se borra.
"""

from __future__ import annotations

import hashlib
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(AQUI, 'src')
TIENDA = os.path.join(AQUI, 'PEPTIDEX.html')

# Lo que el build incrusta literalmente. El orden no importa: cada bloque se
# busca por su contenido anterior, no por su posición.
BLOQUES = [
    '67_catalog.css', '68_catalog.js', '69_names.js', '70_names.css',
    '64_logos.css', '71_pens.css', '41_label.css', '51_profile.css',
    '52_card.css', '62_dive.css', '71_search.css', '72_nav.css',
    '30_motion.css', '65_mobile.css', '82_door.css', '83_lineplx.css', '85_extras.css', '86_pago.css',
    '50_profile.js', '31_motion.js', '63_dive.js', '70_search.js',
    '66_mobile.js', '82_door.js', '83_lineplx.js', '84_sinpepx.js', '85_extras.js', '86_pago.js',
]

# La copia de referencia: lo que había en el fichero construido la última vez
# que esto corrió. Sin ella no se sabe qué texto sustituir.
ESPEJO = os.path.join(AQUI, '.tienda_espejo')


def lee(p: str) -> str:
    with open(p, encoding='utf-8') as f:
        return f.read()


def main() -> int:
    solo_revisa = '--revisa' in sys.argv

    if not os.path.exists(TIENDA):
        print('no encuentro PEPTIDEX.html', file=sys.stderr)
        return 1
    html = lee(TIENDA)
    os.makedirs(ESPEJO, exist_ok=True)

    cambiados, iguales, perdidos, nuevos = [], [], [], []

    for nombre in BLOQUES:
        ruta = os.path.join(SRC, nombre)
        if not os.path.exists(ruta):
            continue
        nuevo = lee(ruta)
        viejo_p = os.path.join(ESPEJO, nombre)

        if nuevo in html:
            # Ya está al día. Se guarda como referencia para la próxima vez.
            iguales.append(nombre)
            if not solo_revisa:
                with open(viejo_p, 'w', encoding='utf-8') as f:
                    f.write(nuevo)
            continue

        viejo = lee(viejo_p) if os.path.exists(viejo_p) else None
        n = html.count(viejo) if viejo else 0

        if n == 0:
            # Nunca llegó a entrar en la tienda: son los ficheros que se
            # escribieron DESPUÉS del último build. Es justo el caso de «el
            # fichero ya sin lo que se había agregado», así que se añade en el
            # mismo sitio donde lo pondría el build.
            nuevos.append(nombre)
            if not solo_revisa:
                marca = '</style>' if nombre.endswith('.css') else '</script>'
                i = html.rindex(marca)
                html = html[:i] + '\n/* ' + nombre + ' */\n' + nuevo + '\n' + html[i:]
                with open(viejo_p, 'w', encoding='utf-8') as f:
                    f.write(nuevo)
            continue

        if n != 1:
            # Aparece más de una vez: sustituir sería ambiguo. Se dice y no se
            # toca nada — acertar a medias en 5,6 MB es peor que no tocar.
            perdidos.append(f'{nombre} (aparece {n} veces, esperaba 1)')
            continue

        cambiados.append(nombre)
        if not solo_revisa:
            html = html.replace(viejo, nuevo, 1)
            with open(viejo_p, 'w', encoding='utf-8') as f:
                f.write(nuevo)

    print(f'  al día    {len(iguales)}')
    for x in cambiados:
        print(f'  ACTUALIZA {x}')
    for x in nuevos:
        print(f'  AÑADE     {x}   (nunca había entrado en la tienda)')
    for x in perdidos:
        print(f'  SIN PISTA {x}')

    if (cambiados or nuevos) and not solo_revisa:
        antes = hashlib.sha256(lee(TIENDA).encode()).hexdigest()[:12]
        with open(TIENDA, 'w', encoding='utf-8') as f:
            f.write(html)
        despues = hashlib.sha256(html.encode()).hexdigest()[:12]
        print(f'\n  PEPTIDEX.html  {antes} → {despues}  ({len(html):,} bytes)')
    elif not (cambiados or nuevos):
        print('\n  nada que hacer')

    return 1 if perdidos else 0


if __name__ == '__main__':
    sys.exit(main())

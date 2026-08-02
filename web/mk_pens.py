#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PEPTIDEX — prepara los recortes de las plumas para el escenario blanco.

    python3 mk_pens.py

Lee de  web/assets/pens/  los ficheros  fitness.png · beauty.png · longevity.png
y escribe  web/assets/pens.json,  que build_restore.py inyecta en el sitio.

QUÉ HACE Y QUÉ NO

No redibuja nada. Recorta el margen sobrante, iguala la escala de las tres
piezas y comprime. Ni un píxel del render se reinterpreta: se mueve y se
reescala, nada más.

DOS FORMAS DE ENTREGAR EL ARTE

  1 · PNG CON ALFA  (lo correcto)
      La pieza recortada sobre transparencia. El script recorta el margen
      transparente y ya está.

  2 · PNG SOBRE NEGRO  (el que probablemente tienes)
      Con  --key  se separa del fondo por luminancia. Funciona, y hay que
      decir cómo de bien: el fondo es negro puro y la pieza es casi negra, así
      que cualquier umbral que quite el fondo se lleva por delante las zonas
      más oscuras de la pieza. El resultado sirve para maquetar y para ver el
      encuadre. Para publicar, no.

      Y aunque el recorte saliera perfecto seguiría sin encajar, porque el
      problema de fondo no es el recorte: esas piezas están iluminadas para un
      set negro —cuerpo casi negro, filos de luz muy brillantes, caída a oscuro
      en los bordes— y sobre blanco un objeto recibe rebote por todos lados y
      sus filos son mucho más discretos. Eso no se arregla recortando. Se
      arregla volviendo a renderizar sobre el set blanco.

      Ver docs/PEPTIDEX_Pens_Render_Brief.md.
"""
import base64, io, json, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Falta Pillow:  pip install pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'assets', 'pens')
OUT  = os.path.join(HERE, 'assets', 'pens.json')

LINES = ('fitness', 'beauty', 'longevity')

# Alto de trabajo. El escenario nunca dibuja una pieza por encima de 460 px
# CSS, así que 1100 cubre pantallas de 2× con margen y no infla el fichero.
H = 1100

KEY_ARGS = '--key' in sys.argv


def key_out(im):
    """Separa la pieza de un fondo negro por luminancia.

    El alfa sale de la propia luminancia con un umbral suave: por debajo de LO
    es fondo, por encima de HI es pieza, y en medio se interpola — que es lo
    que evita el borde de sierra. Después se rellena todo lo que quede
    encerrado dentro de la silueta, porque las zonas oscuras del interior de la
    pieza caen por debajo del umbral y se abrirían agujeros.
    """
    LO, HI = 10, 34
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()

    a = Image.new('L', (w, h))
    ap = a.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = (r * 299 + g * 587 + b * 114) // 1000
            if   lum <= LO: ap[x, y] = 0
            elif lum >= HI: ap[x, y] = 255
            else:           ap[x, y] = int(255 * (lum - LO) / (HI - LO))

    # Relleno de huecos: se inunda desde los cuatro bordes por lo que es fondo;
    # lo transparente que la inundación no alcance está dentro de la pieza y
    # vuelve a ser opaco.
    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0)); stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y)); stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if seen[i] or ap[x, y] > 8:
            continue
        seen[i] = 1
        if x > 0:     stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0:     stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    for y in range(h):
        for x in range(w):
            if ap[x, y] < 255 and not seen[y * w + x]:
                ap[x, y] = 255

    out = im.convert('RGBA')
    out.putalpha(a)
    return out


def trim(im):
    """Quita el margen transparente. Sin esto, tres recortes con márgenes
    distintos salen a tres escalas distintas aunque la caja sea la misma."""
    bb = im.getchannel('A').getbbox()
    return im.crop(bb) if bb else im


def datauri(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=92, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    if not os.path.isdir(SRC):
        os.makedirs(SRC, exist_ok=True)
        print('Creada  web/assets/pens/  — deja ahí fitness.png, beauty.png y')
        print('longevity.png (PNG con alfa) y vuelve a ejecutar.')
        return

    art, missing = {}, []
    for line in LINES:
        p = os.path.join(SRC, line + '.png')
        if not os.path.exists(p):
            missing.append(line)
            continue

        im = Image.open(p)
        opaque = im.mode not in ('RGBA', 'LA') or \
                 im.convert('RGBA').getchannel('A').getextrema()[0] == 255

        if opaque:
            if not KEY_ARGS:
                print('  %-10s sin canal alfa. Con --key se recorta del negro,'
                      ' con la calidad que dice la cabecera.' % line)
                missing.append(line)
                continue
            im = key_out(im)
            print('  %-10s recortado del fondo negro' % line)
        else:
            im = im.convert('RGBA')

        im = trim(im)
        w = max(1, round(im.width * H / im.height))
        im = im.resize((w, H), Image.LANCZOS)
        uri = datauri(im)
        art[line] = uri
        print('  %-10s %4d x %d  ·  %.0f KB' % (line, w, H, len(uri) / 1024))

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(art, f)

    print('\n  pens.json  %d de 3 piezas  ·  %.0f KB'
          % (len(art), os.path.getsize(OUT) / 1024))
    if missing:
        print('  faltan: ' + ', '.join(missing))
    print('  Ahora:  python3 build_restore.py')


if __name__ == '__main__':
    main()

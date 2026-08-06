#!/usr/bin/env python3
"""El arte de marca y de producto que usa la app, recortado de lo entregado.

LA REGLA, OTRA VEZ

Nada de esto se dibuja. Se ELIGE una región de un fichero entregado, se recorta
y se reescala al tamaño al que se va a ver. No se redibuja, no se re-vectoriza,
no se recolorea, no se retipografía y no se genera nada parecido. Recortar y
reescalar es elegir; lo otro sería otra cosa.

Esto sustituye a los viales dibujados con CSS. Un rectángulo con dos sombras
puede parecer un vial a 40 px; a 400 px es un rectángulo, y el producto de
PEPTIDEX existe y está fotografiado.

EL PROBLEMA DE LA MARCA EN OSCURO, Y CÓMO SE RESUELVE SIN TOCARLA

logo_master.png es arte OSCURO sobre transparente. Sobre el fondo negro del
tema oscuro no se ve. La salida fácil sería un filter:invert() — y eso es
recolorear la marca, que está prohibido.

Pero la versión clara existe y es real: es la que PEPTIDEX imprime en sus
propias etiquetas. p_fitness.png es el panel entregado de la línea FITNESS, con
el Px en foil plateado sobre la placa negra. De ahí sale la marca del tema
oscuro, recortada. La placa negra se queda —no se recorta contra transparencia,
que sería procesarla— y como es casi negra desaparece contra el fondo del tema.

Dos polaridades, las dos entregadas, ninguna inventada.

QUÉ SALE

    px_light / px_dark        el monograma, para la lateral y la barra
    lock_light / lock_dark    el bloque completo, para la portada
    vial_*                    el vial de línea, en dos tamaños
    pen_*                     las plumas recargables entregadas
    fam_*                     los tres bloques de línea con su símbolo

Todo a assets/appart.json, que build_app.py incrusta en el documento.
"""
import base64, io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
A    = os.path.join(HERE, 'assets')
OUT  = os.path.join(A, 'appart.json')


def uri(im, q=82, lossless=False):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6, lossless=lossless)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def destapa(im, tol=14):
    """Quita el fondo blanco de una foto de producto, sólo por fuera.

    LA REGLA SIGUE EN PIE: esto no recolorea nada. Es el mismo recorte de
    siempre, hecho contra un fondo plano en vez de contra un rectángulo — la
    pluma no se toca, se le quita el papel de detrás.

    Y se hace por RELLENO DESDE EL BORDE, no por «todo lo que sea claro»:
    la pluma de LONGEVITY es plateada y la de FITNESS tiene reflejos blancos
    en el cuerpo. Un umbral global se los comería y dejaría el producto
    agujereado. El relleno sólo alcanza el blanco que está conectado con el
    borde, que es exactamente el fondo.

    Hace falta en el tema oscuro: sobre #0D0D0D un fondo blanco es un
    rectángulo blanco, y la portada es la primera pantalla que se ve.
    """
    from PIL import Image
    from collections import deque
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    fuera = bytearray(w * h)
    q = deque()
    def blanco(x, y):
        r, g, b, _ = px[x, y]
        return r >= 255 - tol and g >= 255 - tol and b >= 255 - tol
    for x in range(w):
        for y in (0, h - 1):
            if not fuera[y*w+x] and blanco(x, y): fuera[y*w+x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not fuera[y*w+x] and blanco(x, y): fuera[y*w+x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0), (-1,0), (0,1), (0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not fuera[ny*w+nx] and blanco(nx, ny):
                fuera[ny*w+nx] = 1
                q.append((nx, ny))
    for y in range(h):
        row = y * w
        for x in range(w):
            if fuera[row+x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    return im


def cut(src, box, alto, q=82):
    """Recorta `box` de `src` y lo deja con `alto` píxeles de alto."""
    from PIL import Image
    im = Image.open(os.path.join(A, src))
    im = im.crop(box)
    k = alto / im.height
    im = im.resize((max(1, round(im.width * k)), alto), Image.LANCZOS)
    return im


# ---------------------------------------------------------------------------
# LAS CAJAS, MEDIDAS SOBRE LOS PROPIOS FICHEROS
# ---------------------------------------------------------------------------
# logo_master.png (1090x672) — arte oscuro sobre transparente
#   el recorte de alfa empieza en 10,10; el monograma va de 201,0 a 881,454
MASTER_PX   = (10 + 201, 10 + 0, 10 + 881, 10 + 454)
MASTER_LOCK = (0, 0, 1090, 672)

# p_fitness.png (470x885) — el panel de etiqueta entregado, foil sobre placa
PANEL_PX    = (135, 35, 345, 195)
PANEL_LOCK  = (45, 35, 425, 295)

# px_logos-000.png (1536x1024) — los tres bloques de línea, medidos por fila
FAM = {
    'fitness':   (200, 105, 1262, 335),
    'beauty':    (195, 388, 1262, 620),
    'longevity': (168, 678, 1262, 913),
}


def main():
    art = {}

    # --- la marca -----------------------------------------------------------
    art['px_light']   = uri(cut('logo_master.png', MASTER_PX,   180), 88)
    art['lock_light'] = uri(cut('logo_master.png', MASTER_LOCK, 300), 88)
    art['px_dark']    = uri(cut('p_fitness.png',   PANEL_PX,    180), 88)
    art['lock_dark']  = uri(cut('p_fitness.png',   PANEL_LOCK,  300), 88)

    # --- el producto --------------------------------------------------------
    # El vial de LÍNEA: lleva la línea y nada más, ni compuesto ni dosis. Es el
    # correcto para una interfaz donde el compuesto cambia en cada fila.
    for k in ('fitness', 'beauty', 'longevity'):
        im = os.path.join(A, 'line_%s.webp' % k)
        if not os.path.exists(im):
            continue
        art['vial_%s' % k]  = uri(cut('line_%s.webp' % k, (0, 0, 411, 1155), 520), 80)
        art['vialt_%s' % k] = uri(cut('line_%s.webp' % k, (0, 0, 411, 1155), 160), 82)

    # --- las plumas ---------------------------------------------------------
    # Sólo la PLUMA. El fichero entregado trae debajo su bloque de rótulo
    # —Px PEPTIDEX / FITNESS / REUSABLE PEN INJECTOR— y en la portada de la
    # referencia las plumas van solas, sin pie. Se recorta por encima de ese
    # bloque: 950 de 1340 es donde termina la punta y empieza el aire.
    for k in ('fitness', 'beauty', 'longevity'):
        p = os.path.join(A, 'pens', '%s.png' % k)
        if not os.path.exists(p):
            continue
        im = cut(os.path.join('pens', '%s.png' % k), (0, 0, 790, 950), 560)
        art['pen_%s' % k] = uri(destapa(im), 82)

    # --- los tres bloques de línea -----------------------------------------
    for k, box in FAM.items():
        art['fam_%s' % k] = uri(cut('px_logos-000.png', box, 96), 88)

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(art, f)

    total = 0
    for k in sorted(art):
        n = len(art[k])
        total += n
        print('  %-16s %7.1f KB' % (k, n / 1024))
    print('\n  %d piezas · %.1f KB en total' % (len(art), total / 1024))
    print('  %s' % OUT)


if __name__ == '__main__':
    main()

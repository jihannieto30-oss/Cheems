#!/usr/bin/env python3
"""Extract the label kit from the SUPPLIED artwork.

Nothing here is drawn, traced, re-typeset or recoloured. Three things are cut
straight out of the panels the client supplied, so every label the site renders
is built from the real artwork instead of an imitation of it:

  lock   the Px mark + PEPTIDEX + ENGINEERED BEYOND PERFECTION
  word   the foil line wordmark — FITNESS / BEAUTY / LONGEVITY
  plate  a band of the finish itself with no type on it

The two type crops arrive with their own plate behind them. Pasting them as
rectangles shows their edge, because a crop taken from high on the panel does
not share the tone of a band taken from low on it. So each crop is cut against
a background estimated from the panel itself, and only the ink survives; the
colour inside the cut is the supplied colour, untouched.

How the background is estimated depends on how the foil sits in the material,
which differs across the three panels and is a property of the artwork:

  fitness    bright foil on a black plate — the plate is the local minimum
  beauty     rose gold on a white plate   — the plate is the local maximum
  longevity  silver debossed into silver, throwing a highlight on one side of
             every stroke and a shadow on the other. Neither extreme is the
             plate; the plate is what the stroke is centred on, so the estimate
             is a wide blur.

`foil` is each line's ink colour, measured from its wordmark rather than
chosen. It drives the hairlines and the small type on the landscape label.
"""
from PIL import Image, ImageOps, ImageFilter, ImageChops
import os, json, base64, io

HERE = os.path.dirname(os.path.abspath(__file__))
M    = os.path.join(HERE, 'ls_master')

# The Px lockup, as supplied.
LOCKUP = {'fitness': (52, 52, 418, 372),
          'beauty':  (52, 52, 414, 372),
          'longevity': (52, 52, 415, 372)}
# The foil line wordmark. One y band for all three; x found by differencing
# each panel against its cleaned plate.
WORD = {'fitness':   (79, 386, 383, 446),
        'beauty':    (86, 386, 383, 446),
        'longevity': (49, 386, 429, 446)}

# 'lo' = plate is the local minimum, 'hi' = the local maximum, 'mid' = a deboss
# centred on the plate.  (mode, lockup radius, wordmark radius, alpha floor)
FINISH = {'fitness':   ('lo',  61, 61, 20),
          'beauty':    ('hi',  61, 61, 20),
          'longevity': ('mid', 48, 26, 14)}

# Rows 558..652 of the panel carry no type on any of the three.
BAND  = (30, 558, 436, 652)
AR    = 1400 / 800     # the landscape band, as it sits on the vial
GAMMA = 0.78           # matte roll-off: below 1 so a faint deboss survives


def mirror_tile(im, w, h):
    """Grow a band to w x h by mirroring vertically, so the horizontal texture
    keeps its original scale and the repeat leaves no visible seam."""
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    out, y, flip = Image.new('RGB', (w, h)), 0, False
    while y < h:
        out.paste(ImageOps.flip(im) if flip else im, (0, y))
        y += im.height
        flip = not flip
    return out


def flatten_rows(im):
    """Take the vertical lighting gradient out of a tiled plate.

    The band carries the panel's own top-to-bottom falloff. Repeated, that
    falloff becomes a stack of visible steps. Each row is levelled to the
    plate's overall tone, which removes the banding and leaves the grain."""
    w, h = im.size
    px = im.load()
    mean = [sum(px[x, y][i] for y in range(h) for x in range(w)) / (w * h) for i in range(3)]
    for y in range(h):
        row = [sum(px[x, y][i] for x in range(w)) / w for i in range(3)]
        off = [mean[i] - row[i] for i in range(3)]
        for x in range(w):
            p = px[x, y]
            px[x, y] = tuple(max(0, min(255, round(p[i] + off[i]))) for i in range(3))
    return im


def lift(src, box, mode, radius, floor):
    """Cut the ink out of the panel against a background estimated from it."""
    c = src.crop(box)
    g = c.convert('L')
    if mode == 'mid':
        bg = g.filter(ImageFilter.GaussianBlur(radius))
    else:
        f  = ImageFilter.MinFilter if mode == 'lo' else ImageFilter.MaxFilter
        bg = g.filter(f(radius)).filter(ImageFilter.GaussianBlur(radius // 3))

    d = ImageChops.difference(g, bg)
    hist = sorted(d.get_flattened_data() if hasattr(d, 'get_flattened_data') else d.getdata())
    K = max(floor, hist[int(len(hist) * 0.97)])
    a = d.point(lambda v: min(255, round(255 * (min(1.0, v / K) ** GAMMA))))

    out = c.convert('RGBA')
    out.putalpha(a)
    return out


def foil_of(src, box):
    """The ink colour, measured rather than chosen: the mean of the eighth of
    the crop's pixels furthest from the plate, on the side the foil sits."""
    s = src.crop(box).convert('RGB')
    sp = s.load()
    lum = lambda p: .299 * p[0] + .587 * p[1] + .114 * p[2]
    px = [(lum(sp[x, y]), sp[x, y]) for y in range(s.height) for x in range(s.width)]
    mid = sum(p[0] for p in px) / len(px)
    px.sort(key=lambda p: -p[0] if mid < 128 else p[0])
    top = px[:max(1, len(px) // 8)]
    return '#%02x%02x%02x' % tuple(round(sum(p[1][i] for p in top) / len(top)) for i in range(3))


def uri(im, q):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())


out = {}
for k in ('fitness', 'beauty', 'longevity'):
    src   = Image.open(os.path.join(M, 'p_%s.png' % k)).convert('RGB')
    clean = Image.open(os.path.join(M, 'plate_%s.png' % k)).convert('RGB')
    if clean.size != src.size:
        clean = clean.resize(src.size, Image.LANCZOS)

    mode, rl, rw, floor = FINISH[k]
    PW    = 900
    plate = flatten_rows(mirror_tile(clean.crop(BAND), PW, round(PW / AR)))
    lock  = lift(src, LOCKUP[k], mode, rl, floor)
    word  = lift(src, WORD[k],   mode, rw, floor)

    lu, ls = uri(lock, 94)
    wu, ws = uri(word, 94)
    pu, ps = uri(plate, 92)
    out[k] = {'lock': lu, 'word': wu, 'plate': pu,
              'lockAR': round(lock.width / lock.height, 4),
              'wordAR': round(word.width / word.height, 4),
              'foil':   foil_of(src, WORD[k])}
    print('  %-10s lock %dx%-3d %5.1f KB   word %dx%-3d %5.1f KB   plate %5.1f KB   foil %s'
          % (k, lock.width, lock.height, ls / 1024,
             word.width, word.height, ws / 1024, ps / 1024, out[k]['foil']))

with open(os.path.join(M, 'labelkit.json'), 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('\n  labelkit.json  %.1f KB' % (os.path.getsize(os.path.join(M, 'labelkit.json')) / 1024))

# Check sheet: every cut composited back onto its own rendered plate.
cw, ch = 700, 280
sheet = Image.new('RGB', (cw * 3 + 40, ch * 2 + 20), 'white')
for i, k in enumerate(('fitness', 'beauty', 'longevity')):
    src   = Image.open(os.path.join(M, 'p_%s.png' % k)).convert('RGB')
    clean = Image.open(os.path.join(M, 'plate_%s.png' % k)).convert('RGB').resize(src.size, Image.LANCZOS)
    mode, rl, rw, floor = FINISH[k]
    for j, (box, r) in enumerate(((LOCKUP[k], rl), (WORD[k], rw))):
        pl = flatten_rows(mirror_tile(clean.crop(BAND), cw, ch))
        cr = lift(src, box, mode, r, floor)
        s  = min((cw - 80) / cr.width, (ch - 60) / cr.height)
        cr = cr.resize((round(cr.width * s), round(cr.height * s)), Image.LANCZOS)
        pl.paste(cr, ((cw - cr.width) // 2, (ch - cr.height) // 2), cr)
        sheet.paste(pl, (i * (cw + 20), j * (ch + 20)))
sheet.save(os.path.join(M, 'kit_check.png'))
print('  kit_check.png  %dx%d' % sheet.size)

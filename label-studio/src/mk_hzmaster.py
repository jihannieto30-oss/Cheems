#!/usr/bin/env python3
"""Cut the three approved PEPTIDEX horizontal labels out of the supplied master
and measure every editable element on them.

NOTHING IS REDRAWN HERE. The master raster is the artwork; this script only

  1. finds each label's exact trim box,
  2. measures the bounding box of every element the operator is allowed to
     edit, in the master's own pixel space,
  3. builds a CLEAN PLATE for each text region — the master with that region
     inpainted from its own surroundings — so that when, and only when, an
     operator retypes a string, the studio has something correct to lay the
     new text on. An untouched label draws the master and nothing else, which
     is what makes the default view pixel-identical.

Everything measured is written to hz_master.json for the studio to consume.
"""
from PIL import Image, ImageFilter, ImageStat
import os, io, json, base64, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'uv2', 'm-000.png')
OUT  = os.path.join(HERE, 'ls_master')

im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()

lum = lambda c: (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000
NEAR_WHITE = 6


# --------------------------------------------------------------------------
# 1 · the three labels
# --------------------------------------------------------------------------
def row_is_paper(y):
    for x in range(0, W, 3):
        r, g, b = px[x, y]
        if abs(r - 255) > NEAR_WHITE or abs(g - 255) > NEAR_WHITE or abs(b - 255) > NEAR_WHITE:
            return False
    return True


runs, s = [], None
for y in range(H):
    p = row_is_paper(y)
    if not p and s is None: s = y
    if p and s is not None:
        runs.append((s, y)); s = None
if s is not None: runs.append((s, H))
runs = [r for r in runs if r[1] - r[0] > 40]
assert len(runs) == 3, 'expected three labels, found %d' % len(runs)

LINES = ['fitness', 'beauty', 'longevity']
labels = {}
for name, (y0, y1) in zip(LINES, runs):
    xs = []
    for x in range(W):
        for y in range(y0, y1, 2):
            r, g, b = px[x, y]
            if abs(r - 255) > NEAR_WHITE or abs(g - 255) > NEAR_WHITE or abs(b - 255) > NEAR_WHITE:
                xs.append(x); break
    labels[name] = (min(xs), y0, max(xs) + 1, y1)
    print('%-10s trim %4d,%4d .. %4d,%4d   %4d x %3d   ratio %.4f'
          % (name, *labels[name], labels[name][2] - labels[name][0],
             labels[name][3] - labels[name][1],
             (labels[name][2] - labels[name][0]) / (labels[name][3] - labels[name][1])))


# --------------------------------------------------------------------------
# 2 · element boxes, measured inside each label
# --------------------------------------------------------------------------
def ink_mask(crop, panel_lum):
    """True where the pixel departs from its own neighbourhood.

    A fixed threshold against the panel tone works on the black and the white
    panels and fails completely on brushed silver, where the plate is a
    gradient with visible grain and the ink is only a little darker than the
    metal beside it. Measuring each pixel against a wide blur of the label
    itself removes the gradient and the grain and leaves the marks — the same
    local-contrast estimate the portrait masters are cut with."""
    g = crop.convert('L')
    bg = g.filter(ImageFilter.GaussianBlur(14))
    w, h = crop.size
    gp, bp = g.load(), bg.load()
    # Otsu on the local-contrast histogram: the plate's own noise and the ink
    # are two populations, and the split between them is a measurement rather
    # than a number that has to be re-tuned for every panel finish.
    hist = [0] * 256
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            hist[abs(gp[x, y] - bp[x, y])] += 1
    tot = sum(hist)
    sumall = sum(i * hist[i] for i in range(256))
    wB = 0.0; sumB = 0.0; best = 0.0; thr = 12
    for i in range(256):
        wB += hist[i]
        if wB == 0: continue
        wF = tot - wB
        if wF == 0: break
        sumB += i * hist[i]
        mB = sumB / wB
        mF = (sumall - sumB) / wF
        v = wB * wF * (mB - mF) ** 2
        if v > best: best = v; thr = i
    thr = max(8, min(60, thr))
    # The label's own edge against the paper is the highest local contrast on
    # the sheet — a rounded corner reads as ink and drags every measurement
    # with it. The trim border is not an element, so it is excluded.
    ex = max(3, int(round(w * 0.006)))
    ey = max(5, int(round(h * 0.055)))
    out = [[False] * w for _ in range(h)]
    for y in range(ey, h - ey):
        for x in range(ex, w - ex):
            if abs(gp[x, y] - bp[x, y]) > thr:
                out[y][x] = True
    return out


def bbox_of(mask, x0, x1, y0, y1, minrun=2):
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if mask[y][x]:
                xs.append(x); ys.append(y)
    if not xs: return None
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def bands(mask, x0, x1, y0, y1, gap=3, minh=4):
    """Horizontal ink bands inside a column range.

    A band that runs the full width of the zone and is only a few pixels tall
    is the panel's own edge shading, not an element — the artwork has no
    full-bleed hairlines. Those are dropped."""
    prof = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if mask[y][x])
        prof.append(n)
    out, s, empty = [], None, 0
    for i, v in enumerate(prof):
        if v > 1:
            if s is None: s = i
            empty = 0
        else:
            if s is not None:
                empty += 1
                if empty >= gap:
                    if i - empty - s >= minh: out.append((y0 + s, y0 + i - empty))
                    s = None; empty = 0
    if s is not None and len(prof) - s >= minh: out.append((y0 + s, y0 + len(prof)))
    span = x1 - x0
    keep = []
    for (a, b) in out:
        wide = max(prof[a - y0:b - y0] or [0]) > span * 0.95
        if wide and (b - a) < max(6, (y1 - y0) * 0.045): continue
        keep.append((a, b))
    return keep


def cols(mask, x0, x1, y0, y1, gap=6, minw=3):
    prof = []
    for x in range(x0, x1):
        n = sum(1 for y in range(y0, y1) if mask[y][x])
        prof.append(n)
    out, s, empty = [], None, 0
    for i, v in enumerate(prof):
        if v > 0:
            if s is None: s = i
            empty = 0
        else:
            if s is not None:
                empty += 1
                if empty >= gap:
                    if i - empty - s >= minw: out.append((x0 + s, x0 + i - empty))
                    s = None; empty = 0
    if s is not None and len(prof) - s >= minw: out.append((x0 + s, x0 + len(prof)))
    return out


def dominant(crop):
    """Modal colour of a crop — the panel tone."""
    q = crop.resize((min(60, crop.width), min(40, crop.height)))
    hist = {}
    for c in q.getdata():
        k = (c[0] // 6, c[1] // 6, c[2] // 6)
        hist[k] = hist.get(k, 0) + 1
    k = max(hist, key=hist.get)
    tot = [0, 0, 0]; n = 0
    for c in q.getdata():
        if (c[0] // 6, c[1] // 6, c[2] // 6) == k:
            tot = [tot[i] + c[i] for i in range(3)]; n += 1
    return tuple(round(v / n) for v in tot)


def ink_colour(crop, panel):
    """Mean of the pixels furthest from the panel tone — the actual ink."""
    p = crop.load()
    pl = lum(panel)
    picks = []
    for y in range(crop.height):
        for x in range(crop.width):
            c = p[x, y]
            if abs(lum(c) - pl) > 40: picks.append(c)
    if not picks: return panel
    picks.sort(key=lambda c: -abs(lum(c) - pl))
    top = picks[:max(1, len(picks) // 3)]
    return tuple(round(sum(c[i] for c in top) / len(top)) for i in range(3))


hexs = lambda c: '#%02x%02x%02x' % c

meta = {}
for name, (lx0, ly0, lx1, ly1) in labels.items():
    lab = im.crop((lx0, ly0, lx1, ly1))
    LW, LH = lab.size
    panel = dominant(lab.crop((int(LW * .40), int(LH * .05), int(LW * .46), int(LH * .16))))
    mask = ink_mask(lab, lum(panel))

    # --- the two vertical dividers: tall thin columns of ink ---------------
    divs = []
    for x in range(int(LW * .18), int(LW * .80)):
        n = sum(1 for y in range(int(LH * .10), int(LH * .90)) if mask[y][x])
        if n > (LH * .80) * .80: divs.append(x)
    grp, cur = [], [divs[0]]
    for v in divs[1:]:
        if v - cur[-1] <= 3: cur.append(v)
        else: grp.append(cur); cur = [v]
    grp.append(cur)
    grp = [g for g in grp if len(g) <= 12][:2]
    dxs = [sum(g) / len(g) for g in grp]
    dbox = []
    for g in grp:
        ys = [y for y in range(LH) for x in g if mask[y][x]]
        dbox.append((min(g), min(ys), max(g) + 1, max(ys) + 1))

    zA = (int(LW * .015), int(dxs[0]) - 6)
    zB = (int(dxs[0]) + 8, int(dxs[1]) - 6)
    zC = (int(dxs[1]) + 8, LW - int(LW * .015))

    el = {}
    el['divider_left']  = dbox[0]
    el['divider_right'] = dbox[1]

    # --- zone A: the lockup, split into mark / wordmark / tagline ----------
    ab = bands(mask, zA[0], zA[1], 0, LH, gap=4, minh=5)
    ab = [b for b in ab if b[1] - b[0] > 6]
    keys = ['px_logo', 'wordmark', 'tagline']
    for k, (a, b) in zip(keys, ab[:3]):
        bx = bbox_of(mask, zA[0], zA[1], a, b)
        if bx: el[k] = bx
    if len(ab) >= 1:
        el['lockup'] = (min(el[k][0] for k in keys if k in el),
                        ab[0][0],
                        max(el[k][2] for k in keys if k in el),
                        ab[min(2, len(ab) - 1)][1])

    # --- zone B: compound / line / mg / rule / tested + flag ---------------
    bb = bands(mask, zB[0], zB[1], 0, LH, gap=3, minh=4)
    # a merged rule+tested band is much taller than the rule alone; split it
    fixed = []
    for (a, b) in bb:
        if b - a > LH * 0.13:
            sub = bands(mask, zB[0], zB[1], a, b, gap=2, minh=3)
            fixed += sub if len(sub) > 1 else [(a, b)]
        else:
            fixed.append((a, b))
    bb = fixed
    bkeys = ['compound', 'line_name', 'mg_value', 'rule', 'tested']
    for k, (a, b) in zip(bkeys, bb[:5]):
        bx = bbox_of(mask, zB[0], zB[1], a, b)
        if bx: el[k] = bx
    # the flag is the rightmost coloured island on the tested row
    if 'tested' in el:
        ty0, ty1 = el['tested'][1], el['tested'][3]
        cc = cols(mask, zB[0], zB[1], ty0, ty1, gap=8, minw=4)
        if len(cc) >= 2:
            fx0, fx1 = cc[-1]
            el['flag'] = (fx0, ty0, fx1, ty1)
            el['tested'] = (el['tested'][0], ty0, cc[-2][1], ty1)

    # --- zone C: hexagon + icon, purity, research -------------------------
    cc = cols(mask, zC[0], zC[1], 0, LH, gap=14, minw=6)
    if cc:
        hx0, hx1 = cc[0]
        # the badge is about as wide as the label is tall; if the first column
        # group swallowed the copy beside it, cut it back to that width
        if hx1 - hx0 > LH * 0.92:
            sub = cols(mask, hx0, hx1, 0, LH, gap=int(LH * .05), minw=6)
            if sub: hx1 = min(hx1, sub[0][1])
            cc = [(hx0, hx1)] + [c for c in cc[1:]]
            nxt = cols(mask, hx1 + 4, zC[1], 0, LH, gap=int(LH * .09), minw=6)
            if nxt: cc = [(hx0, hx1), (nxt[0][0], zC[1])]
        hy = bbox_of(mask, hx0, hx1, 0, LH)
        el['hexagon'] = hy
        if hy:
            inner = bbox_of(mask, hy[0] + int((hy[2] - hy[0]) * .26), hy[2] - int((hy[2] - hy[0]) * .26),
                            hy[1] + int((hy[3] - hy[1]) * .26), hy[3] - int((hy[3] - hy[1]) * .26))
            if inner: el['icon'] = inner
        tx0 = cc[1][0] if len(cc) > 1 else hx1 + 8
        tb = bands(mask, tx0, zC[1], 0, LH, gap=4, minh=5)
        for k, (a, b) in zip(['purity', 'research'], tb[:2]):
            bx = bbox_of(mask, tx0, zC[1], a, b)
            if bx: el[k] = bx

    # --- measured ink colours ---------------------------------------------
    inks = {}
    for k in ('compound', 'line_name', 'mg_value', 'tested', 'purity', 'research', 'rule', 'hexagon', 'icon'):
        if k in el and el[k]:
            x0, y0, x1, y1 = el[k]
            inks[k] = hexs(ink_colour(lab.crop((x0, y0, x1, y1)), panel))

    meta[name] = {
        'trim': [lx0, ly0, lx1, ly1],
        'w': LW, 'h': LH,
        'panel': hexs(panel),
        'elements': {k: list(v) for k, v in el.items() if v},
        'inks': inks
    }
    print('\n%s  panel %s' % (name.upper(), hexs(panel)))
    for k in sorted(el):
        if el[k]:
            x0, y0, x1, y1 = el[k]
            print('   %-14s %4d,%3d  %4dx%-3d   %s'
                  % (k, x0, y0, x1 - x0, y1 - y0, inks.get(k, '')))


# --------------------------------------------------------------------------
# 3 · clean plates — the master with the text regions inpainted
# --------------------------------------------------------------------------
TEXT_KEYS = ['compound', 'line_name', 'mg_value', 'tested', 'purity', 'research']

def inpaint(lab, boxes):
    """Carry the surrounding panel across a region. Repeated blur passes pull
    the neighbourhood in; grain measured just outside is put back, so the patch
    matches the plate it sits on rather than reading as a flat rectangle."""
    out = lab.copy()
    for (x0, y0, x1, y1) in boxes:
        pad = 10
        sx0, sy0 = max(0, x0 - pad), max(0, y0 - pad)
        sx1, sy1 = min(lab.width, x1 + pad), min(lab.height, y1 + pad)
        strip = out.crop((sx0, sy0, sx1, sy1))
        lx0, ly0 = x0 - sx0, y0 - sy0
        lx1, ly1 = x1 - sx0, y1 - sy0
        for r in (26, 18, 13, 9, 6, 4, 2.5, 1.6, 1.0):
            b = strip.filter(ImageFilter.GaussianBlur(r))
            sp, bp = strip.load(), b.load()
            for y in range(ly0, ly1):
                for x in range(lx0, lx1):
                    sp[x, y] = bp[x, y]
        # grain, measured on the rows just above and below the patch
        src = lab.load(); sp = strip.load()
        samples = []
        for y in list(range(max(0, sy0), y0)) + list(range(y1, min(lab.height, sy1))):
            row = [lum(src[x, y]) for x in range(x0, x1)]
            if not row: continue
            m = sum(row) / len(row)
            samples += [v - m for v in row]
        if samples:
            mu = sum(samples) / len(samples)
            sig = max(0.4, min(math.sqrt(sum((v - mu) ** 2 for v in samples) / len(samples)), 3.2))
            random.seed(7)
            for y in range(ly0, ly1):
                for x in range(lx0, lx1):
                    n = random.gauss(0, sig); q = sp[x, y]
                    sp[x, y] = tuple(max(0, min(255, int(round(q[c] + n)))) for c in range(3))
        out.paste(strip, (sx0, sy0))
    return out


def uri(img, q=93):
    b = io.BytesIO(); img.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())


os.makedirs(OUT, exist_ok=True)
out = {}
print()
for name, m in meta.items():
    lx0, ly0, lx1, ly1 = m['trim']
    lab = im.crop((lx0, ly0, lx1, ly1))
    boxes = [tuple(m['elements'][k]) for k in TEXT_KEYS if k in m['elements']]
    clean = inpaint(lab, boxes)
    lab.save(os.path.join(OUT, 'hzm_%s.png' % name))
    clean.save(os.path.join(OUT, 'hzc_%s.png' % name))
    mu, mn = uri(lab)
    cu, cn = uri(clean)
    out[name] = dict(m, src=mu, clean=cu)
    print('  %-10s master %6.1f KB   clean %6.1f KB   %d regions inpainted'
          % (name, mn / 1024, cn / 1024, len(boxes)))

with open(os.path.join(OUT, 'hz_master.json'), 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('\n  hz_master.json  %.1f KB'
      % (os.path.getsize(os.path.join(OUT, 'hz_master.json')) / 1024))

# check sheet: master over clean, so any inpaint that reads as a rectangle shows
sheet = Image.new('RGB', (labels['fitness'][2] - labels['fitness'][0],
                          sum(meta[n]['h'] for n in LINES) * 2 + 40), 'white')
y = 0
for n in LINES:
    lab = Image.open(os.path.join(OUT, 'hzm_%s.png' % n))
    cln = Image.open(os.path.join(OUT, 'hzc_%s.png' % n))
    sheet.paste(lab, (0, y)); y += lab.height + 6
    sheet.paste(cln, (0, y)); y += cln.height + 8
sheet.save(os.path.join(OUT, 'hz_plates_check.png'))
print('  hz_plates_check.png')

# boxes drawn on the master — the only way to know the measurements are right
from PIL import ImageDraw
COL = {'px_logo':'#00e5ff','wordmark':'#00e5ff','tagline':'#00e5ff',
       'compound':'#ff2d55','line_name':'#ff9500','mg_value':'#ffcc00',
       'rule':'#7cff5a','tested':'#ff5af0','flag':'#ffffff',
       'divider_left':'#5a8cff','divider_right':'#5a8cff',
       'hexagon':'#00ff9d','icon':'#c77dff','purity':'#ff6b6b','research':'#4dd0e1'}
gap = 14
tot_h = sum(meta[n]['h'] for n in LINES) + gap * 4
chk = Image.new('RGB', (max(meta[n]['w'] for n in LINES), tot_h), '#101216')
yy = gap
for n in LINES:
    lab = Image.open(os.path.join(OUT, 'hzm_%s.png' % n)).convert('RGB')
    d = ImageDraw.Draw(lab)
    for k, bx in meta[n]['elements'].items():
        if k == 'lockup': continue
        d.rectangle([bx[0], bx[1], bx[2] - 1, bx[3] - 1], outline=COL.get(k, '#888'), width=2)
    chk.paste(lab, (0, yy)); yy += lab.height + gap
chk.save(os.path.join(OUT, 'hz_boxes.png'))
print('  hz_boxes.png')

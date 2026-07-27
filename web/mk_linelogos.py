#!/usr/bin/env python3
"""Cut the three line logos out of the supplied PDF.

Nothing is drawn, retouched, recoloured or re-typeset. The sheet is lifted from
the PDF at its embedded resolution, split on the blank bands between the three
lockups, and the paper is removed by flooding inward from the border — so the
metal's own highlights, which are enclosed by the artwork, are never mistaken
for background the way a brightness threshold would mistake them.

What comes out is the supplied lockup, its own pixels, on transparency.
"""
from PIL import Image, ImageFilter
import os, io, base64, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
M    = os.path.join(HERE, 'ls_master')
PDF  = os.environ.get('PX_LOGO_PDF', '')

SHEET = os.path.join(M, 'px_logos-000.png')
BANDS = {'fitness': (120, 321), 'beauty': (401, 607), 'longevity': (690, 900)}
TOL   = 16      # how far from paper white still counts as paper
PAD   = 12      # breathing room kept around the artwork


def sheet():
    if not os.path.exists(SHEET) and PDF:
        subprocess.run(['pdfimages', '-png', PDF, os.path.join(M, 'px_logos')], check=True)
    return Image.open(SHEET).convert('RGB')


def cut(panel):
    """Take the paper away and give back the ink as it was before printing.

    Flooding in from the border says which pixels are paper, which is what
    keeps the metal's own highlights — enclosed by the artwork — from being
    mistaken for background. But a hard in-or-out answer is wrong at the
    boundary, where a pixel is part ink and part paper, and it is wrong in two
    ways that both show:

      the coverage — a boundary pixel is not fully opaque, so its alpha comes
      from how far it sits from white rather than from the flood's verdict;

      the colour — what is stored there is ink *already mixed with white*.
      Left alone it carries that white into whatever it is placed on, which is
      the pale fringe the marks had against the dark water. Dividing the mix
      back out recovers the ink, so the edge lands clean on black and on white
      alike.
    """
    w, h = panel.size
    pad = Image.new('RGB', (w + 4, h + 4), (255, 255, 255))
    pad.paste(panel, (2, 2))

    px = pad.load()
    paper = bytearray((w + 4) * (h + 4))
    stack = [(0, 0)]
    W4 = w + 4
    while stack:
        x, y = stack.pop()
        i = y * W4 + x
        if paper[i]:
            continue
        r, g, b = px[x, y]
        if 255 - min(r, g, b) > TOL:
            continue
        paper[i] = 1
        if x > 0:      stack.append((x - 1, y))
        if x < W4 - 1: stack.append((x + 1, y))
        if y > 0:      stack.append((x, y - 1))
        if y < h + 3:  stack.append((x, y + 1))

    hard = Image.new('L', (w + 4, h + 4))
    hard.putdata([0 if s else 255 for s in paper])
    hard = hard.crop((2, 2, w + 2, h + 2))

    # how dark this artwork's ink actually runs, away from every boundary
    inner = hard.filter(ImageFilter.MinFilter(5))
    ink = sorted(min(p) for p, m in zip(panel.getdata(), inner.getdata()) if m)
    K = ink[len(ink) // 4] if ink else 0

    src = panel.load()
    hp  = hard.load()
    out = Image.new('RGBA', (w, h))
    op  = out.load()
    span = max(24, 255 - K)

    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if not hp[x, y]:
                op[x, y] = (0, 0, 0, 0)
                continue
            # coverage, from how far this pixel sits from paper white
            a = (255 - min(r, g, b)) / span
            a = 1.0 if a >= 1 else (0.0 if a <= 0 else a)
            if a <= 0.004:
                op[x, y] = (0, 0, 0, 0)
                continue
            # divide the paper back out of the mix
            k = 255 * (1 - a)
            op[x, y] = (
                max(0, min(255, int(round((r - k) / a)))),
                max(0, min(255, int(round((g - k) / a)))),
                max(0, min(255, int(round((b - k) / a)))),
                int(round(a * 255)))
    return out


def tint(cut_img):
    """The colour this line's light should be.

    The dive happens in black water, and light in black water reads as its own
    colour, not as the pigment's. So the hue is measured from the artwork — the
    eighth of its pixels that carry the most colour — and then taken to full
    strength. What comes back is that line's hue, alive, rather than the
    washed-out average of a piece of brushed metal.

    A lockup with no colour in it at all — steel on steel — has no hue to
    measure, and gets the house blue instead of a grey nobody would call a
    colour.
    """
    import colorsys
    px = [(r, g, b) for r, g, b, a in cut_img.getdata() if a > 200]
    if not px:
        return '#1e5eff'
    scored = sorted(px, key=lambda c: -( (max(c) - min(c)) / (max(c) or 1) ))
    top = scored[:max(1, len(scored) // 8)]
    m = [sum(c[i] for c in top) / len(top) for i in range(3)]
    h, l, sat = colorsys.rgb_to_hls(m[0]/255, m[1]/255, m[2]/255)
    if sat < 0.12:
        return '#1e5eff'
    r, g, b = colorsys.hls_to_rgb(h, 0.58, 0.72)
    return '#%02x%02x%02x' % (int(r*255), int(g*255), int(b*255))


def uri(im, q=94):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())


if __name__ == '__main__':
    src = sheet()
    out = {}
    for k, (y0, y1) in BANDS.items():
        cutout = cut(src.crop((0, y0, src.width, y1)))
        bb = cutout.getbbox()
        cutout = cutout.crop((max(0, bb[0] - PAD), max(0, bb[1] - PAD),
                              min(cutout.width,  bb[2] + PAD),
                              min(cutout.height, bb[3] + PAD)))
        cutout.save(os.path.join(M, 'logo_%s.png' % k))
        u, n = uri(cutout)
        out[k] = {'src': u, 'tint': tint(cutout)}
        print('  logo_%-10s %dx%-4d  %5.1f KB   tint %s'
              % (k, cutout.width, cutout.height, n / 1024, out[k]['tint']))

    import json
    with open(os.path.join(M, 'linelogos.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print('\n  linelogos.json  %.1f KB'
          % (os.path.getsize(os.path.join(M, 'linelogos.json')) / 1024))

    # check sheet: the cutouts over a mid grey, where any leftover paper shows
    pad = 26
    ws = [Image.open(os.path.join(M, 'logo_%s.png' % k)) for k in BANDS]
    W  = max(i.width for i in ws) + pad * 2
    Hh = sum(i.height for i in ws) + pad * (len(ws) + 1)
    chk = Image.new('RGB', (W, Hh), (128, 132, 138))
    y = pad
    for i in ws:
        chk.paste(i, ((W - i.width) // 2, y), i)
        y += i.height + pad
    chk.save(os.path.join(M, 'logo_check.png'))
    print('  logo_check.png  %dx%d' % chk.size)

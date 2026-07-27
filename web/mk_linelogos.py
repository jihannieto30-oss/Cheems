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
    """Remove the paper by flooding in from the border."""
    w, h = panel.size
    pad = Image.new('RGB', (w + 4, h + 4), (255, 255, 255))
    pad.paste(panel, (2, 2))

    px = pad.load()
    seen = bytearray((w + 4) * (h + 4))
    stack = [(0, 0)]
    W4 = w + 4
    while stack:
        x, y = stack.pop()
        i = y * W4 + x
        if seen[i]:
            continue
        r, g, b = px[x, y]
        if 255 - min(r, g, b) > TOL:
            continue
        seen[i] = 1
        if x > 0:      stack.append((x - 1, y))
        if x < W4 - 1: stack.append((x + 1, y))
        if y > 0:      stack.append((x, y - 1))
        if y < h + 3:  stack.append((x, y + 1))

    a = Image.new('L', (w + 4, h + 4))
    a.putdata([0 if s else 255 for s in seen])
    a = a.crop((2, 2, w + 2, h + 2)).filter(ImageFilter.GaussianBlur(0.7))

    out = panel.convert('RGBA')
    out.putalpha(a)
    return out


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
        out[k] = u
        print('  logo_%-10s %dx%-4d  %5.1f KB' % (k, cutout.width, cutout.height, n / 1024))

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

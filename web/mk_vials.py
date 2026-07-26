#!/usr/bin/env python3
"""Wrap the SUPPLIED production label artwork onto the production vial.

The artwork is read-only: it is never redrawn, recoloured or re-typeset.
It is only projected onto a cylinder — the same thing that happens when the
printed vinyl is applied to real glass — and lit to match the photograph.
"""
from PIL import Image, ImageFilter
import math, os

HERE = os.path.dirname(os.path.abspath(__file__))
BLANK = os.path.join(HERE, 'ls_master', 'base_vial_blank.webp')
PANEL = {'fitness':'p_fitness.png','beauty':'p_beauty.png','longevity':'p_longevity.png'}

vial = Image.open(BLANK).convert('RGBA')
VW, VH = vial.size                      # 560 x 1389

# Label seat on the glass. The width is chosen so the artwork's full width
# stays inside the visible arc — nothing is cropped and nothing is stretched:
# the panel is scaled uniformly and the seat height is derived from its own
# aspect ratio, so the proportions are exactly as supplied.
SEAT_CX   = 277                          # optical centre of the glass body
SEAT_W    = 330
SEAT_L, SEAT_R = SEAT_CX - SEAT_W//2, SEAT_CX + SEAT_W//2
SEAT_TOP  = 404                          # just below the shoulder
SEAT_H    = None                         # derived per panel, never assumed
SEAT_T = SEAT_B = 0

# the visible arc of the cylinder in the photograph (radians each side)
THETA = math.radians(30)

def seat_for(panel):
    global SEAT_H, SEAT_T, SEAT_B
    sw, sh = panel.size
    SEAT_H = int(round(SEAT_W * sh / sw))     # uniform scale — no distortion
    SEAT_T = SEAT_TOP
    SEAT_B = SEAT_T + SEAT_H

def wrap(panel):
    """Project the flat artwork onto the cylinder. Sampling only — no redraw."""
    src = panel.convert('RGBA')
    sw, sh = src.size
    # render at 2x then downsample, so the edges stay clean
    OW, OH = SEAT_W*2, SEAT_H*2
    out = Image.new('RGBA', (OW, OH), (0,0,0,0))
    sp, op = src.load(), out.load()
    R = OW/2.0
    for x in range(OW):
        # inverse cylindrical projection: screen x -> angle -> source column
        t = (x - R + .5)/R
        t = max(-1.0, min(1.0, t))
        th = math.asin(t)*THETA/(math.pi/2)
        u = (th/THETA + 1)/2 * (sw-1)
        u0 = int(u); u1 = min(sw-1, u0+1); fu = u-u0
        # the label's top and bottom edges bow as the surface turns away
        bow = (1-math.cos(th))*OH*0.030
        # lambert-ish shading with a soft specular where the studio light sits
        lam = math.cos(th)
        # printed vinyl is opaque: it keeps its density and only takes the
        # curvature of the surface it is applied to
        shade = 0.82 + 0.18*(lam**0.7)
        spec = 0.11*math.exp(-((th+0.28)**2)/0.026) + 0.05*math.exp(-((th-0.60)**2)/0.018)
        for y in range(OH):
            v = (y - bow)/(OH - 2*bow)*(sh-1) if OH>2*bow else 0
            if v < 0 or v > sh-1:
                continue
            v0 = int(v); v1 = min(sh-1, v0+1); fv = v-v0
            # bilinear sample of the untouched artwork
            c = [0,0,0,0]
            for i in range(4):
                a = sp[u0,v0][i]*(1-fu) + sp[u1,v0][i]*fu
                b = sp[u0,v1][i]*(1-fu) + sp[u1,v1][i]*fu
                c[i] = a*(1-fv) + b*fv
            r,g,bl,al = c
            r = r*shade + 255*spec
            g = g*shade + 255*spec
            bl = bl*shade + 255*spec
            op[x,y] = (max(0,min(255,int(r))), max(0,min(255,int(g))),
                       max(0,min(255,int(bl))), int(al))
    return out.resize((SEAT_W, SEAT_H), Image.LANCZOS)

for key, fn in PANEL.items():
    panel = Image.open(os.path.join(HERE,'ls_master',fn))
    seat_for(panel)
    lab = wrap(panel)

    out = vial.copy()
    # the label sits on the glass, so it is masked by the glass silhouette
    body = Image.new('L', (VW,VH), 0)
    body.paste(lab.split()[3], (SEAT_L, SEAT_T))
    alpha = vial.split()[3].point(lambda a: 255 if a>28 else 0)
    body = Image.composite(body, Image.new('L',(VW,VH),0), alpha)
    layer = Image.new('RGBA', (VW,VH), (0,0,0,0))
    layer.paste(lab, (SEAT_L, SEAT_T))
    out = Image.alpha_composite(out, Image.merge('RGBA', (*layer.split()[:3], body)))

    # the glass rim and the specular highlights belong in front of the vinyl
    hl = Image.new('RGBA', (VW,VH), (0,0,0,0))
    hp = hl.load(); vp = vial.load()
    for y in range(SEAT_T, SEAT_B):
        for x in range(SEAT_L, SEAT_R):
            r,g,b,a = vp[x,y]
            if a > 40 and min(r,g,b) > 244:                 # only the hard specular
                k = (min(r,g,b)-244)/11.0
                hp[x,y] = (255,255,255,int(58*k))
    out = Image.alpha_composite(out, hl.filter(ImageFilter.GaussianBlur(0.6)))

    # the vinyl has thickness — a hairline of shade where it meets the glass
    edge = Image.new('RGBA', (VW,VH), (0,0,0,0)); ep = edge.load()
    for y in range(SEAT_T, SEAT_B):
        for d in range(4):
            for x in (SEAT_L+d, SEAT_R-1-d):
                if 0 <= x < VW:
                    ep[x,y] = (18,22,30,int(52*(1-d/4.0)))
    for x in range(SEAT_L, SEAT_R):
        for d in range(3):
            for y in (SEAT_T+d, SEAT_B-1-d):
                ep[x,y] = (18,22,30,int(38*(1-d/3.0)))
    out = Image.alpha_composite(out, edge.filter(ImageFilter.GaussianBlur(1.1)))

    # match the delivered asset geometry exactly (411 x 1155)
    out = out.resize((411,1155), Image.LANCZOS)
    out.save(os.path.join(HERE,'ls_master','vial_'+key+'.png'))
    out.convert('RGB').save(os.path.join(HERE,'ls_master','vial_'+key+'_prev.jpg'),quality=92)
    print(' vial_%-10s %s' % (key, out.size))

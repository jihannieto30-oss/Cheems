#!/usr/bin/env python3
"""Build PEPTIDEX: the original site, plus the label system and the governor.

Three changes to the base file and nothing else:

  1. the label system — one renderer draws the landscape band for every label
     on the site, from artwork cut out of the supplied panels. The three line
     vials it produces are baked in so the first paint is already right.
  2. the open product sits nearer the middle of the screen
  3. the motion governor — a purely subtractive patch that anchors the products
     and the marks and damps the parallax to a tenth

No colour, typography or copy elsewhere on the site is altered.
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'web_src')
M    = os.path.join(HERE, 'ls_master')
BASE = os.path.join(HERE, 'PEPTIDEX.base.html')
OUT  = os.path.join(HERE, 'PEPTIDEX.html')

with open(BASE, encoding='utf-8') as f: html = f.read()

def rd(p):
    with open(p, encoding='utf-8') as f: return f.read()

def datauri(p):
    with open(p, 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()

# ---- 1 · the line vials, baked from the same renderer the site uses --------
for k in ('fitness', 'beauty', 'longevity'):
    uri = datauri(os.path.join(M, 'line_%s.webp' % k))
    pat = re.compile(r'(vial_' + k + r'\s*:\s*")data:image/[a-z]+;base64,[^"]+(")')
    html, n = pat.subn(lambda m: m.group(1) + uri + m.group(2), html, count=1)
    if not n: raise SystemExit('vial_%s not found' % k)
    print('  vial_%-10s baked' % k)

# ---- 2 · the layers -------------------------------------------------------
kit   = rd(os.path.join(M, 'labelkit.json'))
label = rd(os.path.join(SRC, '40_label.js')).replace('__LABELKIT__', kit)
css   = rd(os.path.join(SRC, '41_label.css')) + '\n' + rd(os.path.join(SRC, '30_motion.css'))
js    = ('window.__pxBakedLines = true;\n' + label + '\n' + rd(os.path.join(SRC, '31_motion.js')))

i = html.rindex('</style>')
html = html[:i] + '\n/* ===== PEPTIDEX LABEL + MOTION ===== */\n' + css + '\n' + html[i:]
j = html.rindex('</script>')
html = html[:j] + '\n/* ===== PEPTIDEX LABEL + MOTION ===== */\n' + js + '\n' + html[j:]

print('  label system     %.1f KB  (kit %.1f KB)' % (len(label.encode())/1024, len(kit.encode())/1024))
print('  motion governor  %.1f KB' % (len(rd(os.path.join(SRC, '31_motion.js')).encode())/1024))
print('  css              %.1f KB' % (len(css.encode())/1024))

with open(OUT, 'w', encoding='utf-8') as f: f.write(html)
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f: f.write(html)
print('\n  PEPTIDEX.html  %.1f KB' % (len(html.encode())/1024))

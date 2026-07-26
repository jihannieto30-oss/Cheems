#!/usr/bin/env python3
"""Build PEPTIDEX: the original site + the motion governor.

Two changes to the base file and nothing else:

  1. three static images — the line vials wear the supplied label artwork
  2. the motion governor — a purely subtractive patch that anchors the
     products and the marks and damps the parallax to a tenth

No colour, layout, typography, spacing or markup is altered.
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, 'PEPTIDEX.base.html')
OUT  = os.path.join(HERE, 'PEPTIDEX.html')

with open(BASE, encoding='utf-8') as f: html = f.read()

def datauri(p):
    with open(p, 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()

for k in ('fitness', 'beauty', 'longevity'):
    uri = datauri(os.path.join(HERE, 'ls_master', 'vial_%s.webp' % k))
    pat = re.compile(r'(vial_' + k + r'\s*:\s*")data:image/[a-z]+;base64,[^"]+(")')
    html, n = pat.subn(lambda m: m.group(1) + uri + m.group(2), html, count=1)
    if not n: raise SystemExit('vial_%s not found' % k)
    print('  vial_%-10s replaced' % k)

# ---- motion governor: subtractive only ------------------------------------
SRC = os.path.join(HERE, 'web_src')
def rd(p):
    with open(p, encoding='utf-8') as f: return f.read()

css = rd(os.path.join(SRC, '30_motion.css'))
js  = rd(os.path.join(SRC, '31_motion.js'))
i = html.rindex('</style>')
html = html[:i] + '\n/* ===== MOTION GOVERNOR ===== */\n' + css + '\n' + html[i:]
j = html.rindex('</script>')
html = html[:j] + '\n/* ===== MOTION GOVERNOR ===== */\n' + js + '\n' + html[j:]
print('  motion governor  %.1f KB css + %.1f KB js'
      % (len(css.encode())/1024, len(js.encode())/1024))

with open(OUT, 'w', encoding='utf-8') as f: f.write(html)
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f: f.write(html)
print('\n  PEPTIDEX.html  %.1f KB   (site + vials + motion governor)'
      % (len(html.encode())/1024))

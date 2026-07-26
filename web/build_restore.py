#!/usr/bin/env python3
"""Restore PEPTIDEX to the original site.

The platform layer is NOT applied. The only change to the base file is a
swap of three static images: the line vials now wear the supplied production
label artwork. That is a data substitution — it cannot move, shake or
re-layout anything, because no CSS rule and no line of script is added.
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

with open(OUT, 'w', encoding='utf-8') as f: f.write(html)
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f: f.write(html)
print('\n  PEPTIDEX.html  %.1f KB   (original site + supplied vial artwork)'
      % (len(html.encode())/1024))

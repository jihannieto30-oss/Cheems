#!/usr/bin/env python3
"""Assemble PEPTIDEX.html — base site + platform layer.
The base file is never edited by hand; the layer is injected at build time."""
import os, sys, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'web_src')
BASE = os.path.join(HERE, 'PEPTIDEX.base.html')
OUT  = os.path.join(HERE, 'PEPTIDEX.html')

def rd(p):
    with open(p, encoding='utf-8') as f: return f.read()

base = rd(BASE)
css  = '\n'.join(rd(os.path.join(SRC, f)) for f in
                 ['00_tokens.css','05_nav.css','10_ui.css','06_card.css'])
js   = rd(os.path.join(SRC, '20_platform.js'))

# 1) CSS — appended to the existing sheet so it wins on equal specificity
i = base.rindex('</style>')
out = base[:i] + '\n/* ===== PEPTIDEX PLATFORM LAYER ===== */\n' + css + '\n' + base[i:]

# 2) JS — appended inside the existing module so it shares scope with the app
j = out.rindex('</script>')
out = out[:j] + '\n/* ===== PEPTIDEX PLATFORM LAYER ===== */\n' + js + '\n' + out[j:]

# 3) theme-color meta so the browser chrome follows the theme
if 'name="theme-color"' not in out:
    out = out.replace('<meta charset="utf-8">',
                      '<meta charset="utf-8">\n<meta name="theme-color" content="#ffffff">', 1)

with open(OUT, 'w', encoding='utf-8') as f: f.write(out)

# Netlify copy
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f: f.write(out)

print('  base   %8.1f KB' % (len(base.encode())/1024))
print('  css    %8.1f KB' % (len(css.encode())/1024))
print('  js     %8.1f KB' % (len(js.encode())/1024))
print('  ---')
print('  PEPTIDEX.html %6.1f KB   (+index.html)' % (len(out.encode())/1024))

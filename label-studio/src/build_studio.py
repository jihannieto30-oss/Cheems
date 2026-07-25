#!/usr/bin/env python3
"""Assemble PEPTIDEX_LabelStudio_Pro.html — single file, zero build, offline."""
import base64, json, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'ls_src')
MST  = os.path.join(HERE, 'ls_master')

def rd(p):
    with open(p, encoding='utf-8') as f: return f.read()

def datauri(path, mime='image/jpeg'):
    with open(path, 'rb') as f: b = f.read()
    return 'data:%s;base64,%s' % (mime, base64.b64encode(b).decode()), len(b)

# ---- masters -------------------------------------------------------------
LINES = [
    ('fitness',   'FITNESS · Black',    'fitness'),
    ('beauty',    'BEAUTY · White',     'beauty'),
    ('longevity', 'LONGEVITY · Silver', 'longevity'),
]
defs = []
for key, name, line in LINES:
    uri, n = datauri(os.path.join(MST, 'plate_%s_q95.jpg' % key))
    defs.append({
        'key': key, 'name': name, 'line': line,
        'pxW': 466, 'pxH': 884,
        'src': uri,
        'palette': None,
        'provenance': 'ChatGPT_Image_25_jul_2026.pdf · page 1 · panel %s · variable-data zones separated, static artwork untouched' % name.split(' ')[0],
    })
    print('  %-10s %7.1f KB' % (key, n / 1024))

master_js = 'const PX_MASTER_DEFS = ' + json.dumps(defs, separators=(',', ':')) + ';\n'
catalog   = rd(os.path.join(SRC, 'catalog.json'))

# ---- assemble ------------------------------------------------------------
qr = rd(os.path.join(HERE, 'qr.js'))
qr = qr.replace("if(typeof module!=='undefined')module.exports=QRGen;", '')

brand = rd(os.path.join(SRC, '40_brand.js')).replace('__CATALOG__', catalog)

parts = [
    rd(os.path.join(SRC, '00_head.html')),
    rd(os.path.join(SRC, '10_body.html')),
    '<script>\n/* ==== embedded master artwork (immutable, content-addressed) ==== */\n',
    master_js,
    "const ADMIN_PIN = 'PX-CHEEMS-2026';\n",
    '/* ==== vendored: QR generator (byte mode, EC-L, v1..5) ==== */\n', qr, '\n',
    rd(os.path.join(SRC, '20_core.js')), '\n',
    rd(os.path.join(SRC, '30_master.js')), '\n',
    brand, '\n',
    rd(os.path.join(SRC, '50_render.js')), '\n',
    rd(os.path.join(SRC, '60_state.js')), '\n',
    rd(os.path.join(SRC, '70_preflight.js')), '\n',
    rd(os.path.join(SRC, '80_export.js')), '\n',
    rd(os.path.join(SRC, '85_persist.js')), '\n',
    rd(os.path.join(SRC, '90_ui.js')), '\n',
    '</script>\n</body>\n</html>\n',
]
out = ''.join(parts)
dest = os.path.join(HERE, 'PEPTIDEX_LabelStudio_Pro.html')
with open(dest, 'w', encoding='utf-8') as f: f.write(out)
print('\n  %s  %.1f KB' % (os.path.basename(dest), len(out.encode()) / 1024))

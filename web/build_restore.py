#!/usr/bin/env python3
"""Build PEPTIDEX: the original site, plus the label system and the governor.

Three changes to the base file and nothing else:

  1. the label system — one renderer draws the landscape band for every label
     on the site, from artwork cut out of the supplied panels. The three line
     vials it produces are baked in so the first paint is already right.
  2. the member overview — the account's own record, shown in full
  3. the open product sits nearer the middle of the screen
  4. the motion governor — a purely subtractive patch that anchors the products
     and the marks and damps the parallax to a tenth

No colour, typography or copy elsewhere on the site is altered.
"""
import base64, json, os, re

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

# ---- 2 · the line logos, cut out of the supplied PDF ----------------------
for k in ('fitness', 'beauty', 'longevity'):
    uri = datauri(os.path.join(M, 'logo_%s.webp' % k))
    pat = re.compile(r'(badge_' + k + r'\s*:\s*")data:image/[a-z]+;base64,[^"]+(")')
    html, n = pat.subn(lambda m: m.group(1) + uri + m.group(2), html, count=1)
    if not n: raise SystemExit('badge_%s not found' % k)
    print('  badge_%-9s replaced' % k)

# ---- 3 · the master logo, cut out of the supplied PDF ---------------------
master = datauri(os.path.join(M, 'logo_master.webp'))

# the bar's own mark
pat = re.compile(r'(<a class="brand" href="#/" data-nav><img src=")data:image/[a-z]+;base64,[^"]+(")')
html, n = pat.subn(lambda m: m.group(1) + master + m.group(2), html, count=1)
if not n: raise SystemExit('nav brand image not found')
print('  nav brand       replaced')

# ---- 4 · the layers -------------------------------------------------------
kit   = rd(os.path.join(M, 'labelkit.json'))
label = rd(os.path.join(SRC, '40_label.js')).replace('__LABELKIT__', kit)
css   = '\n'.join(rd(os.path.join(SRC, f)) for f in
                  ('41_label.css', '51_profile.css', '52_card.css', '62_dive.css', '64_logos.css',
                   '71_search.css', '72_nav.css', '30_motion.css',
                   '65_mobile.css', '67_catalog.css', '70_names.css',
                   '71_pens.css', '80_app.css'))
# ---- 4b · el arte de las plumas, si ya existe ----------------------------
# Lo produce mk_pens.py a partir de los recortes. Si no está, el escenario del
# sitio dibuja tres contornos en su lugar y no se rompe nada.
PENS = os.path.join(HERE, 'assets', 'pens.json')
pens = rd(PENS) if os.path.exists(PENS) else '{}'
print('  plumas           %d de 3' % len([k for k in json.loads(pens) if not k.startswith('_')]))

js    = ('window.__pxBakedLines = true;\n' +
         'const PX_PENS_ART = ' + pens + ';\n' +
         'const PX_MASTER_LOGO = ' + repr(master).replace("'", '"', 2) + ';\n' +
         'const PX_WATER = ' + json.dumps(
             {k: {'tint': v['tint'], 'depth': v['depth']}
              for k, v in json.loads(kit).items()}
         ) + ';\n' +
         label + '\n' +
         rd(os.path.join(SRC, '50_profile.js')) + '\n' +
         rd(os.path.join(SRC, '31_motion.js')) + '\n' +
         rd(os.path.join(SRC, '63_dive.js')) + '\n' +
         rd(os.path.join(SRC, '70_search.js')) + '\n' +
         rd(os.path.join(SRC, '66_mobile.js')) + '\n' +
         rd(os.path.join(SRC, '68_catalog.js')) + '\n' +
         rd(os.path.join(SRC, '69_names.js')) + '\n' +
         rd(os.path.join(SRC, '81_app.js')))

i = html.rindex('</style>')
html = html[:i] + '\n/* ===== PEPTIDEX LABEL + MOTION ===== */\n' + css + '\n' + html[i:]
j = html.rindex('</script>')
html = html[:j] + '\n/* ===== PEPTIDEX LABEL + MOTION ===== */\n' + js + '\n' + html[j:]

# ---- 6 · lo que hace que se pueda instalar en un teléfono ------------------
# El manifiesto y el trabajador de servicio TIENEN que ser ficheros aparte: un
# data: URI vale en Chrome para el manifiesto y no vale en Safari, y para el
# trabajador no vale en ninguno. Los genera mk_pwa.py junto a este HTML; aquí
# sólo van las etiquetas que apuntan a ellos.
#
# Si el HTML se abre suelto (file://, o sin esos ficheros al lado) no pasa
# nada: el navegador no encuentra el manifiesto, el registro falla en su
# propio catch, y el sitio sigue exactamente igual.
PWA = '''
<link rel="manifest" href="manifest.webmanifest"/>
<link rel="apple-touch-icon" href="apple-touch-icon.png"/>
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="default"/>
<meta name="apple-mobile-web-app-title" content="PepX"/>
<script>
/* isSecureContext, no location.protocol === 'https:'.

   Los dos parecen lo mismo y no lo son: localhost y 127.0.0.1 son contextos
   seguros sirviendo por http, y con la comprobación del protocolo el
   trabajador no se registraba en desarrollo — que es justo donde hace falta
   verlo funcionar antes de subir nada. En file:// isSecureContext es falso y
   no se intenta, que era el otro caso que había que cubrir. */
if('serviceWorker' in navigator && window.isSecureContext){
  addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
</script>
'''
k = html.rindex('</head>')
html = html[:k] + PWA + html[k:]

print('  label system     %.1f KB  (kit %.1f KB)' % (len(label.encode())/1024, len(kit.encode())/1024))
print('  motion governor  %.1f KB' % (len(rd(os.path.join(SRC, '31_motion.js')).encode())/1024))
print('  css              %.1f KB' % (len(css.encode())/1024))

with open(OUT, 'w', encoding='utf-8') as f: f.write(html)
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f: f.write(html)
print('\n  PEPTIDEX.html  %.1f KB' % (len(html.encode())/1024))

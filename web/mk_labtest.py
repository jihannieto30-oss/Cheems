#!/usr/bin/env python3
"""Build a standalone page that exercises the label renderer on its own.

It stands in for the parts of the site the renderer touches — LINES, PHOTOS,
IMG, artReady — and nothing else, so a label can be looked at without the CDN,
GSAP, Lenis or Three.js being involved.
"""
import os, re, json, base64

HERE = os.path.dirname(os.path.abspath(__file__))
M    = os.path.join(HERE, 'ls_master')

kit  = open(os.path.join(M, 'labelkit.json')).read()
js   = open(os.path.join(HERE, 'web_src', '40_label.js')).read().replace('__LABELKIT__', kit)

with open(os.path.join(M, 'base_vial_blank.webp'), 'rb') as f:
    blank = 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()

# The three lines, exactly as the site declares them, plus one product each.
base = open(os.path.join(HERE, 'PEPTIDEX.base.html'), encoding='utf-8').read()
LINES = {}
for k in ('fitness', 'beauty', 'longevity'):
    m = re.search(k + r':\{\s*name:"([^"]+)",\s*tagline:"[^"]*",\s*theme:"([^"]+)",\s*kind:"([^"]+)",\s*category:"([^"]+)"', base)
    LINES[k] = {'name': m.group(1), 'theme': m.group(2), 'kind': m.group(3), 'category': m.group(4)}

SAMPLES = {
    'fitness':   [['IG', 'IGF-1 LR3', '0.1 · 1 mg', 'Lean tissue synthesis'],
                  ['BC', 'BPC-157', '5 · 10 · 20 mg', 'Recovery & tissue repair'],
                  ['RT', 'Retatrutide', '5–60 mg', 'Triple-agonist metabolic'],
                  ['CP', 'CJC-1295 + Ipamorelin', '10 mg', 'Synergistic GH blend']],
    'beauty':    [['AHK', 'AHK-Cu', '50 mg', 'Copper peptide']],
    'longevity': [['EP', 'Epitalon', '10 · 20 mg', 'Telomere & pineal axis']],
}

html = """<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#f4f5f7;font:13px/1.5 -apple-system,'Segoe UI',sans-serif;padding:24px;}
  h3{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#666;margin:26px 0 10px;}
  .bands figure{margin:0 0 14px;} .bands figcaption{font-size:11px;color:#777;margin-top:4px;}
  .bands img{display:block;width:700px;box-shadow:0 8px 24px -12px rgba(0,0,0,.4);}
  .vials{display:flex;gap:18px;align-items:flex-end;background:#fff;padding:26px;border-radius:14px;}
  .vials figure{margin:0;text-align:center;}
  .vials img{height:520px;display:block;}
  .vials figcaption{font-size:11px;color:#777;margin-top:8px;}
</style>
<div id="out"></div>
<script>
const LINES = __LINES__;
const SAMPLES = __SAMPLES__;
const PHOTOS = {vial_fitness:'', vial_beauty:'', vial_longevity:''};
const IMG = {};
let makeProductVial = null;
const artReady = new Promise(res => {
  const im = new Image();
  im.onload = () => { IMG.blank = im; res(); };
  im.src = "__BLANK__";
});
</script>
<script>
__LABELJS__
</script>
<script>
window.__pxLabel.kitReady.then(() => artReady).then(() => {
  const out = document.getElementById('out');
  const add = (h) => { const d = document.createElement('div'); d.innerHTML = h; out.appendChild(d); };

  add('<h3>Line bands</h3><div class="bands" id="lb"></div>');
  add('<h3>Compound bands</h3><div class="bands" id="cb"></div>');
  add('<h3>Line vials</h3><div class="vials" id="lv"></div>');
  add('<h3>Compound vials</h3><div class="vials" id="cv"></div>');

  const put = (host, src, cap) => {
    const f = document.createElement(cap ? 'figure' : 'span');
    f.innerHTML = '<img src="' + src + '">' + (cap ? '<figcaption>' + cap + '</figcaption>' : '');
    document.getElementById(host).appendChild(f);
  };

  Object.keys(LINES).forEach(k => {
    put('lb', window.__pxLabel.drawBand(k, null).canvas.toDataURL());
    put('lv', window.__pxLabel.buildVial(k, null), k);
    (SAMPLES[k] || []).forEach(p => {
      put('cb', window.__pxLabel.drawBand(k, p).canvas.toDataURL(), p[2]);
      put('cv', window.__pxLabel.buildVial(k, p), p[1]);
    });
  });
  document.title = 'ready';
});
</script>
"""

html = (html.replace('__LINES__', json.dumps(LINES))
            .replace('__SAMPLES__', json.dumps(SAMPLES))
            .replace('__BLANK__', blank)
            .replace('__LABELJS__', js))

out = os.path.join(HERE, '_labtest.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('  _labtest.html  %.1f KB' % (len(html.encode()) / 1024))

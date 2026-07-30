# -*- coding: utf-8 -*-
"""
PEPTIDEX — generador de PEPTIDEX_Fichas_Tecnicas.html

Un solo archivo, sin dependencias externas, con las 56 fichas y las 118
presentaciones del catálogo.  El documento se lee de arriba abajo como un
vademécum: un índice fijo a la izquierda que filtra en vivo, y la columna de
fichas a la derecha.  Imprime a una ficha por página.

La estructura de cada ficha es deliberadamente la misma en las 56, aunque
sobre algunos compuestos haya diez veces más que decir que sobre otros: un
documento técnico se consulta comparando, y comparar exige que el dato esté
siempre en el mismo sitio.  Donde no hay dato, la ficha imprime un guión y lo
dice — el hueco declarado es información, el hueco rellenado es un riesgo.
"""
import base64, json, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.dirname(HERE)
CATALOG = os.path.join(REPO, 'label-studio', 'src', 'catalog.json')
ASSETS  = os.path.join(HERE, 'assets')
import sys; sys.path.insert(0, HERE)
from pepdata_a import FITNESS
from pepdata_b import BEAUTY, LONGEVITY

OUT = os.path.join(OUTDIR, 'PEPTIDEX_Fichas_Tecnicas.html')
CAT = json.load(open(CATALOG, encoding='utf-8'))
LOGOS = json.load(open(os.path.join(ASSETS, 'tlogos.json'), encoding='utf-8'))

LINES = [
    ('fitness',   'FITNESS',   FITNESS,   '#1b1b1b', '#5b6068'),
    ('beauty',    'BEAUTY',    BEAUTY,    '#8a4f2e', '#c98a63'),
    ('longevity', 'LONGEVITY', LONGEVITY, '#023473', '#5f7characters'),
]
LINES[2] = ('longevity', 'LONGEVITY', LONGEVITY, '#023473', '#4a6fa5')

e = lambda s: html.escape(str(s), quote=True)


def sizes_for(line_key, cid):
    """Presentaciones del catálogo para este compuesto, en el orden del catálogo."""
    for row in CAT[line_key]:
        if row[0] == cid:
            return [s[1] for s in row[3]], [s[0] for s in row[3]]
    return [], []


def fmt_mw(mw):
    if mw is None:
        return None
    return ('%.2f' % mw).rstrip('0').rstrip('.') + ' Da'


# ---------------------------------------------------------------------------
# La ficha.  Dos bloques: la cabecera de identidad, que es la parte verificable
# y objetiva, y el cuerpo, que es interpretación de literatura y va etiquetado
# como tal.
# ---------------------------------------------------------------------------
def ficha(c, line_key, line_name, ink, accent, n):
    sizes, skus = sizes_for(line_key, c['id'])
    idb = []
    for label, val in [
        ('CAS',      c.get('cas')),
        ('Fórmula',  c.get('formula')),
        ('Masa',     fmt_mw(c.get('mw'))),
        ('Residuos', c.get('len')),
    ]:
        idb.append(
            '<div class="idc"><span class="idk">%s</span>'
            '<span class="idv%s">%s</span></div>'
            % (e(label), '' if val else ' none', e(val) if val else 'sin registro público')
        )

    pills = ''.join('<span class="pill">%s</span>' % e(s) for s in sizes)
    skuline = ' · '.join(skus)

    rows = []
    def row(k, v, cls=''):
        if not v:
            return
        rows.append('<div class="row %s"><div class="k">%s</div><div class="v">%s</div></div>'
                    % (cls, e(k), v))

    row('Para qué es', e(c['purpose']))
    row('Qué contiene el vial', e(c['contains']), 'hi')
    row('Mecanismo', e(c['mechanism']))
    if c.get('research'):
        row('Investigación', '<ul>%s</ul>' % ''.join('<li>%s</li>' % e(r) for r in c['research']))
    row('Vida media', e(c['halflife']))
    row('Reconstitución', e(c['recon']), 'hi')
    row('Almacenamiento', e(c['storage']), 'hi')
    row('Estabilidad química', e(c['stability']))
    row('Manejo', e(c['handling']))
    if c.get('flags'):
        row('Advertencias', '<ul class="warn">%s</ul>'
            % ''.join('<li>%s</li>' % e(f) for f in c['flags']), 'flags')

    return f'''
<article class="ficha" id="f-{e(c['id'])}" data-line="{line_key}"
         data-q="{e((c['name'] + ' ' + (c.get('aka') or '') + ' ' + c['cls'] + ' ' + skuline).lower())}"
         style="--lk:{ink};--acc:{accent}">
  <header class="fh">
    <div class="fh-l">
      <div class="fnum">{n:02d}</div>
      <div>
        <h2>{e(c['name'])}</h2>
        <p class="aka">{e(c.get('aka') or '—')}</p>
      </div>
    </div>
    <div class="fh-r">
      <span class="lchip">{e(line_name)}</span>
      <span class="cls">{e(c['cls'])}</span>
    </div>
  </header>

  <div class="idbar">{''.join(idb)}</div>

  <div class="seq"><span class="sk">Secuencia</span><code>{e(c['seq'])}</code></div>

  <div class="pres">
    <span class="sk">Presentaciones</span>
    <div class="pills">{pills or '<span class="pill none">—</span>'}</div>
    <span class="skus">SKU: {e(skuline) or '—'}</span>
  </div>

  <div class="body">{''.join(rows)}</div>
</article>'''


def build():
    cards, nav, n = [], [], 0
    counts = {}
    for line_key, line_name, data, ink, accent in LINES:
        counts[line_key] = (len(data), sum(len(sizes_for(line_key, c['id'])[0]) for c in data))
        nav.append('<div class="ng" data-line="%s"><span class="ngt" style="--acc:%s">%s</span>'
                   % (line_key, accent, e(line_name)))
        for c in data:
            n += 1
            cards.append(ficha(c, line_key, line_name, ink, accent, n))
            sizes, _ = sizes_for(line_key, c['id'])
            nav.append(
                '<a class="ni" href="#f-%s" data-line="%s" data-q="%s">'
                '<span class="nn">%02d</span><span class="nname">%s</span>'
                '<span class="nsz">%d</span></a>'
                % (e(c['id']), line_key,
                   e((c['name'] + ' ' + (c.get('aka') or '')).lower()), n,
                   e(c['name']), len(sizes)))
        nav.append('</div>')

    tot_c = sum(v[0] for v in counts.values())
    tot_s = sum(v[1] for v in counts.values())

    logo = LOGOS['t_master']
    tf, tb, tl = LOGOS['t_fitness'], LOGOS['t_beauty'], LOGOS['t_longevity']

    doc = TEMPLATE.format(
        logo=logo, tf=tf, tb=tb, tl=tl,
        nav=''.join(nav), cards=''.join(cards),
        tot_c=tot_c, tot_s=tot_s,
        cf=counts['fitness'][0], cb=counts['beauty'][0], cl=counts['longevity'][0],
        sf=counts['fitness'][1], sb=counts['beauty'][1], sl=counts['longevity'][1],
    )
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(doc)
    print('  PEPTIDEX_Fichas_Tecnicas.html  %.1f KB' % (len(doc.encode()) / 1024))
    print('  %d compuestos · %d presentaciones' % (tot_c, tot_s))


TEMPLATE = r'''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>PEPTIDEX · Fichas Técnicas</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
:root{{
  --ink:#0b0d12; --ink2:#4d525c; --muted:#8a9099; --hair:#e6e8ec;
  --bg:#ffffff; --bg2:#fafbfc; --sunk:#f4f5f7;
  --warn:#a8471f; --warnbg:#fdf6f3;
  --font:"Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}}
html{{scroll-behavior:smooth;-webkit-text-size-adjust:100%}}
body{{font-family:var(--font);color:var(--ink);background:var(--bg);
  font-size:15px;line-height:1.62;-webkit-font-smoothing:antialiased;
  font-feature-settings:"kern" 1,"liga" 1,"cv11" 1;}}

/* ---------- cabecera ---------- */
.top{{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);
  backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);
  border-bottom:1px solid var(--hair);}}
.topin{{max-width:1440px;margin:0 auto;padding:13px 26px;display:flex;align-items:center;gap:20px;}}
.brand{{display:flex;align-items:center;gap:13px;flex-shrink:0}}
.brand img{{height:30px;width:auto;display:block}}
.brand .bt{{display:flex;flex-direction:column;line-height:1.18}}
.brand .bt b{{font-size:12.5px;font-weight:750;letter-spacing:.03em}}
.brand .bt span{{font-size:9.5px;letter-spacing:.24em;color:var(--muted);text-transform:uppercase;font-weight:600}}
.search{{flex:1;position:relative;max-width:520px}}
.search input{{width:100%;font-family:inherit;font-size:14px;padding:10px 15px 10px 38px;
  border:1px solid var(--hair);border-radius:999px;background:var(--bg2);color:var(--ink);
  outline:none;transition:border-color .2s,background .2s}}
.search input:focus{{border-color:var(--ink);background:#fff}}
.search svg{{position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:.4}}
.filters{{display:flex;gap:6px;flex-shrink:0}}
.filters button{{font-family:inherit;font-size:11.5px;font-weight:650;letter-spacing:.06em;
  padding:8px 14px;border-radius:999px;border:1px solid var(--hair);background:#fff;
  color:var(--ink2);cursor:pointer;transition:all .18s;white-space:nowrap}}
.filters button:hover{{border-color:var(--ink2)}}
.filters button.on{{background:var(--ink);border-color:var(--ink);color:#fff}}
.printb{{font-family:inherit;font-size:11.5px;font-weight:650;padding:8px 14px;border-radius:999px;
  border:1px solid var(--hair);background:#fff;cursor:pointer;flex-shrink:0}}
.printb:hover{{border-color:var(--ink)}}

/* ---------- portada ---------- */
.hero{{max-width:1440px;margin:0 auto;padding:52px 26px 30px;border-bottom:1px solid var(--hair)}}
.hero h1{{font-size:clamp(30px,4.4vw,46px);font-weight:780;letter-spacing:-.035em;line-height:1.06}}
.hero .sub{{margin-top:11px;font-size:16px;color:var(--ink2);max-width:70ch;line-height:1.6}}
.stats{{display:flex;gap:34px;flex-wrap:wrap;margin-top:28px}}
.stat .n{{font-size:30px;font-weight:780;letter-spacing:-.03em;line-height:1}}
.stat .l{{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  font-weight:700;margin-top:5px}}
.ruo{{margin-top:26px;padding:15px 18px;border:1px solid var(--hair);border-left:3px solid var(--ink);
  border-radius:0 12px 12px 0;background:var(--bg2);font-size:13px;color:var(--ink2);max-width:92ch}}
.ruo b{{color:var(--ink);font-weight:700}}

/* ---------- layout ---------- */
.wrap{{max-width:1440px;margin:0 auto;padding:0 26px;display:grid;
  grid-template-columns:250px 1fr;gap:40px;align-items:start}}
.rail{{position:sticky;top:66px;max-height:calc(100vh - 82px);overflow-y:auto;
  padding:26px 0 40px;scrollbar-width:thin}}
.rail::-webkit-scrollbar{{width:5px}}
.rail::-webkit-scrollbar-thumb{{background:#d8dbe0;border-radius:3px}}
.ng{{margin-bottom:22px}}
.ngt{{display:block;font-size:9.5px;font-weight:800;letter-spacing:.2em;color:var(--acc);
  padding:0 10px 8px;text-transform:uppercase}}
.ni{{display:flex;align-items:center;gap:9px;padding:6px 10px;border-radius:8px;
  text-decoration:none;color:var(--ink2);font-size:13px;transition:background .14s,color .14s}}
.ni:hover{{background:var(--sunk);color:var(--ink)}}
.ni.act{{background:var(--ink);color:#fff}}
.ni.act .nn,.ni.act .nsz{{color:rgba(255,255,255,.6)}}
.nn{{font-family:var(--mono);font-size:10px;color:var(--muted);flex-shrink:0;width:17px}}
.nname{{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:520}}
.nsz{{font-size:10px;color:var(--muted);flex-shrink:0}}
.col{{padding:26px 0 90px;min-width:0}}

/* ---------- ficha ---------- */
.ficha{{border:1px solid var(--hair);border-radius:18px;background:#fff;
  padding:30px 32px;margin-bottom:22px;scroll-margin-top:78px;overflow:hidden;position:relative}}
.ficha::before{{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--acc)}}
.fh{{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}}
.fh-l{{display:flex;gap:16px;align-items:baseline;min-width:0}}
.fnum{{font-family:var(--mono);font-size:12px;color:var(--muted);flex-shrink:0;padding-top:5px}}
.fh h2{{font-size:26px;font-weight:760;letter-spacing:-.028em;line-height:1.16;color:var(--lk)}}
.aka{{font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45}}
.fh-r{{display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;flex-shrink:0}}
.lchip{{font-size:9px;font-weight:800;letter-spacing:.18em;color:#fff;background:var(--lk);
  padding:4px 10px;border-radius:999px}}
.cls{{font-size:11.5px;color:var(--ink2);max-width:26ch;line-height:1.4}}

.idbar{{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--hair);
  border:1px solid var(--hair);border-radius:12px;overflow:hidden;margin-top:20px}}
.idc{{background:var(--bg2);padding:11px 13px;min-width:0}}
.idk{{display:block;font-size:8.5px;font-weight:800;letter-spacing:.15em;color:var(--muted);
  text-transform:uppercase}}
.idv{{display:block;font-family:var(--mono);font-size:12px;margin-top:4px;word-break:break-all;
  line-height:1.4}}
.idv.none{{font-family:var(--font);font-style:italic;color:var(--muted);font-size:11.5px}}

.sk{{display:block;font-size:8.5px;font-weight:800;letter-spacing:.15em;color:var(--muted);
  text-transform:uppercase;margin-bottom:6px}}
.seq{{margin-top:16px;padding:13px 15px;background:var(--sunk);border-radius:11px}}
.seq code{{font-family:var(--mono);font-size:12.5px;line-height:1.65;word-break:break-word;
  color:var(--ink);display:block}}

.pres{{margin-top:14px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}}
.pres .sk{{width:100%;margin-bottom:2px}}
.pills{{display:flex;flex-wrap:wrap;gap:6px}}
.pill{{font-family:var(--mono);font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;
  border:1px solid var(--hair);background:#fff;color:var(--ink)}}
.pill.none{{color:var(--muted)}}
.skus{{font-family:var(--mono);font-size:10px;color:var(--muted);margin-left:auto}}

.body{{margin-top:22px}}
.row{{display:grid;grid-template-columns:158px 1fr;gap:18px;padding:13px 0;
  border-top:1px solid var(--hair)}}
.row .k{{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;
  color:var(--muted);padding-top:2px}}
.row .v{{font-size:14px;line-height:1.66;color:var(--ink2)}}
.row.hi .v{{color:var(--ink)}}
.row .v ul{{list-style:none;display:flex;flex-direction:column;gap:7px}}
.row .v li{{padding-left:15px;position:relative}}
.row .v li::before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;
  border-radius:50%;background:var(--acc)}}
.row.flags{{background:var(--warnbg);margin:12px -32px -30px;padding:16px 32px 24px;
  border-top:1px solid #f0dcd3;grid-template-columns:158px 1fr}}
.row.flags .k{{color:var(--warn)}}
.row.flags .v li{{color:var(--warn);font-weight:520}}
.row.flags .v li::before{{background:var(--warn)}}

.empty{{padding:70px 20px;text-align:center;color:var(--muted);font-size:14px;display:none}}
.foot{{max-width:1440px;margin:0 auto;padding:34px 26px 60px;border-top:1px solid var(--hair);
  font-size:11.5px;color:var(--muted);line-height:1.7}}
.foot b{{color:var(--ink2)}}

@media(max-width:1080px){{
  .wrap{{grid-template-columns:1fr;gap:0}}
  .rail{{display:none}}
  .idbar{{grid-template-columns:repeat(2,1fr)}}
}}
@media(max-width:720px){{
  .topin{{flex-wrap:wrap;gap:11px;padding:11px 16px}}
  .search{{order:3;max-width:none;flex-basis:100%}}
  .filters{{flex-wrap:wrap}}
  .hero,.wrap,.foot{{padding-left:16px;padding-right:16px}}
  .ficha{{padding:22px 18px;border-radius:14px}}
  .row{{grid-template-columns:1fr;gap:5px}}
  .row.flags{{margin:12px -18px -22px;padding:16px 18px 20px}}
  .fh-r{{align-items:flex-start;text-align:left}}
}}

@media print{{
  .top,.rail,.printb,.filters,.search{{display:none !important}}
  body{{font-size:9.6pt;line-height:1.5}}
  .wrap{{display:block;padding:0;max-width:none}}
  .col{{padding:0}}
  .hero{{padding:0 0 16pt;border:none;page-break-after:always}}
  .ficha{{page-break-inside:avoid;page-break-after:always;border:none;border-radius:0;
    padding:0 0 12pt;margin:0}}
  .ficha::before{{display:none}}
  .idbar{{background:none}}
  .idc{{background:none;border:1px solid #ddd}}
  .row.flags{{margin:8pt 0 0;padding:8pt;border:1px solid #e0c8bd;border-radius:6pt;
    background:#fdf6f3 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  .foot{{page-break-before:always}}
  a{{color:inherit;text-decoration:none}}
  @page{{margin:14mm 13mm}}
}}
</style>
</head>
<body>

<div class="top"><div class="topin">
  <div class="brand"><img src="{logo}" alt="PEPTIDEX"/>
    <div class="bt"><b>Fichas Técnicas</b><span>Research Use Only</span></div></div>
  <div class="search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
      stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="q" type="search" placeholder="Buscar compuesto, sinónimo, clase o SKU…" autocomplete="off"/>
  </div>
  <div class="filters">
    <button data-f="all" class="on">Todas</button>
    <button data-f="fitness">Fitness</button>
    <button data-f="beauty">Beauty</button>
    <button data-f="longevity">Longevity</button>
  </div>
  <button class="printb" id="pr">Imprimir / PDF</button>
</div></div>

<section class="hero">
  <h1>Fichas técnicas de compuesto</h1>
  <p class="sub">Identidad química, mecanismo, evidencia publicada, reconstitución,
     almacenamiento y advertencias para cada compuesto del catálogo PEPTIDEX.
     Un formato idéntico en las {tot_c} fichas, para que se puedan comparar.</p>
  <div class="stats">
    <div class="stat"><div class="n">{tot_c}</div><div class="l">Compuestos</div></div>
    <div class="stat"><div class="n">{tot_s}</div><div class="l">Presentaciones</div></div>
    <div class="stat"><div class="n">{cf}</div><div class="l">Fitness · {sf} SKU</div></div>
    <div class="stat"><div class="n">{cb}</div><div class="l">Beauty · {sb} SKU</div></div>
    <div class="stat"><div class="n">{cl}</div><div class="l">Longevity · {sl} SKU</div></div>
  </div>
  <div class="ruo">
    <b>Research Use Only.</b> Todos los materiales descritos en este documento se
    suministran exclusivamente para investigación de laboratorio. No son medicamentos,
    no están destinados a diagnóstico, tratamiento, cura ni prevención de enfermedad
    alguna, y no son para consumo humano ni animal. Cuando una ficha menciona una
    aprobación regulatoria, se refiere al producto farmacéutico del innovador — el
    material de investigación <b>no es ese producto</b>. Las dosis no se incluyen de
    forma deliberada: este documento describe compuestos, no pautas de administración.
  </div>
</section>

<div class="wrap">
  <nav class="rail" id="rail">{nav}</nav>
  <main class="col" id="col">{cards}<div class="empty" id="empty">Sin resultados.</div></main>
</div>

<footer class="foot">
  <b>Sobre las fuentes.</b> La identidad química (CAS, fórmula, masa, secuencia) procede de
  registros públicos y de hojas de datos de proveedores analíticos. Los hallazgos citados
  indican entre paréntesis la especie o el tipo de estudio: la distinción entre un resultado
  en roedor y uno en humano es la información más importante de cada ficha y nunca se omite.
  Donde no existe una entrada de registro pública, la ficha lo declara en lugar de estimar.<br/><br/>
  <b>Sobre lo que este documento no hace.</b> No prescribe, no recomienda pautas y no
  sustituye al certificado de análisis del lote. La identidad y la pureza de un vial concreto
  sólo las establece su CoA.<br/><br/>
  PEPTIDEX · Engineered Beyond Perfection · Documento generado para uso interno y de cliente.
</footer>

<script>
(function(){{
  var q=document.getElementById('q'), rail=document.getElementById('rail'),
      empty=document.getElementById('empty'),
      fichas=[].slice.call(document.querySelectorAll('.ficha')),
      items=[].slice.call(document.querySelectorAll('.ni')),
      groups=[].slice.call(document.querySelectorAll('.ng')),
      btns=[].slice.call(document.querySelectorAll('.filters button')),
      line='all', term='';

  function apply(){{
    var shown=0;
    fichas.forEach(function(f){{
      var ok=(line==='all'||f.dataset.line===line) &&
             (!term||f.dataset.q.indexOf(term)>=0);
      f.style.display=ok?'':'none'; if(ok)shown++;
    }});
    items.forEach(function(i){{
      var ok=(line==='all'||i.dataset.line===line) &&
             (!term||i.dataset.q.indexOf(term)>=0);
      i.style.display=ok?'':'none';
    }});
    groups.forEach(function(g){{
      var any=[].slice.call(g.querySelectorAll('.ni')).some(function(i){{return i.style.display!=='none'}});
      g.style.display=any?'':'none';
    }});
    empty.style.display=shown?'none':'block';
  }}

  q.addEventListener('input',function(){{term=q.value.trim().toLowerCase();apply();}});
  btns.forEach(function(b){{
    b.addEventListener('click',function(){{
      btns.forEach(function(x){{x.classList.remove('on')}}); b.classList.add('on');
      line=b.dataset.f; apply();
      window.scrollTo({{top:0,behavior:'smooth'}});
    }});
  }});
  document.getElementById('pr').addEventListener('click',function(){{window.print()}});

  /* El índice sigue a la lectura.  Un IntersectionObserver con un margen que
     recorta el viewport a una banda estrecha bajo la cabecera: la ficha activa
     es la que cruza esa banda, no la que ocupa más pantalla — así el resaltado
     cambia cuando el título entra, que es cuando el lector cambia de ficha. */
  if('IntersectionObserver' in window){{
    var byId={{}}; items.forEach(function(i){{byId[i.getAttribute('href').slice(1)]=i}});
    var io=new IntersectionObserver(function(es){{
      es.forEach(function(en){{
        if(!en.isIntersecting)return;
        var a=byId[en.target.id]; if(!a)return;
        items.forEach(function(x){{x.classList.remove('act')}}); a.classList.add('act');
        var r=a.getBoundingClientRect(), rr=rail.getBoundingClientRect();
        if(r.top<rr.top+10||r.bottom>rr.bottom-10)
          rail.scrollTop+=r.top-rr.top-rr.height/2;
      }});
    }},{{rootMargin:'-72px 0px -78% 0px'}});
    fichas.forEach(function(f){{io.observe(f)}});
  }}

  /* Ctrl/Cmd+K enfoca la búsqueda; Escape la limpia. */
  document.addEventListener('keydown',function(ev){{
    if((ev.metaKey||ev.ctrlKey)&&ev.key==='k'){{ev.preventDefault();q.focus();q.select();}}
    if(ev.key==='Escape'&&document.activeElement===q){{q.value='';term='';apply();q.blur();}}
  }});
}})();
</script>
</body></html>'''


if __name__ == '__main__':
    build()

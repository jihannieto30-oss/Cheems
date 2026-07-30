# -*- coding: utf-8 -*-
"""
PEPTIDEX — generador de PEPTIDEX_Etiquetas_Niimbot.html

Etiquetas de vial para la Niimbot M2: 300 dpi, un solo color, 50×30 mm y
40×20 mm.  Las 118 presentaciones cargadas y todo editable.

POR QUÉ LAS ETIQUETAS SALEN MAL Y QUÉ HACE ESTE ARCHIVO DISTINTO

Una térmica no imprime gris.  Cada punto del cabezal quema o no quema: es un
bitmap de un bit.  Cuando se le manda un diseño con degradados, sombras, logos
metálicos o texto gris, el driver no tiene más remedio que TRAMARLO — sustituir
cada gris por una nube de puntos negros y blancos.  Esa nube, a 300 dpi y
mirada de cerca en un vial de 2 ml, es exactamente lo que se ve «sucio».

Segundo problema: la escala.  Un diseño hecho en una hoja y reescalado al
tamaño de etiqueta se remuestrea, y remuestrear un bitmap de un bit lo destroza
— los bordes se deshilachan y las líneas finas desaparecen o se parten.

Así que aquí la etiqueta NO se diseña en CSS y luego se convierte.  Se dibuja
directamente sobre un canvas del tamaño exacto en puntos de impresora —
591×354 px para 50×30 mm, 472×236 px para 40×20 mm — y se umbraliza a blanco y
negro puro antes de mostrarla.  Lo que se ve en pantalla ES el bitmap que sale
del cabezal, punto por punto, sin un solo remuestreo por el camino.

LAS REGLAS QUE SE APLICAN AL DIBUJO

  · 300 dpi = 11.811 px/mm.  Todo se calcula desde ahí.
  · Nada de grises, degradados, sombras ni transparencias.
  · Filete mínimo 3 px (0.25 mm).  Por debajo, el punto de la térmica se
    ensancha y la línea se convierte en una raya irregular.
  · Texto mínimo 17 px (~1.4 mm, ~4 pt).  Y en negrita: a un bit, una fuente
    fina pierde la mitad de los trazos.
  · Nada de texto pequeño en blanco sobre negro.  La tinta térmica se expande
    al quemar —ganancia de punto— y los contornos se cierran; en negativo eso
    borra las letras.  El negativo se reserva para texto grande.
  · QR con módulo de 4 px como mínimo y zona de silencio de 4 módulos.  Un QR
    con módulo de 2 px no lo lee ningún teléfono.

CÓMO SE IMPRIME DE VERDAD

Exportar PNG y abrirlo desde la app de Niimbot como imagen, al 100 %.  El PNG
ya viene al tamaño exacto en puntos, así que la app no tiene nada que escalar.
Si se deja que la app reescale, vuelve el problema del principio.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.dirname(HERE)
CATALOG = os.path.join(REPO, 'label-studio', 'src', 'catalog.json')
ASSETS = os.path.join(HERE, 'assets')

OUT = os.path.join(OUTDIR, 'PEPTIDEX_Etiquetas_Niimbot.html')
CAT = json.load(open(CATALOG, encoding='utf-8'))
NBL = json.load(open(os.path.join(ASSETS, 'nb_logos.json'), encoding='utf-8'))
TL = json.load(open(os.path.join(ASSETS, 'tlogos.json'), encoding='utf-8'))
QR = open(os.path.join(REPO, 'label-studio', 'src', 'qr.js'), encoding='utf-8').read()
SHA = open(os.path.join(HERE, 'assets', 'sha256.js'), encoding='utf-8').read()

LINE_LABEL = {'fitness': 'FITNESS', 'beauty': 'BEAUTY', 'longevity': 'LONGEVITY'}
TAGLINE = {'fitness': 'BUILD PERFORMANCE',
           'beauty': 'ELEVATE AESTHETICS',
           'longevity': 'EXTEND POSSIBILITY'}


def items():
    """Las 118 presentaciones, aplanadas y en el orden del catálogo."""
    out = []
    for line in ('fitness', 'beauty', 'longevity'):
        for cid, name, short, skus in CAT[line]:
            for sku, size in skus:
                out.append({'k': sku, 'n': name, 'short': short, 's': size,
                            'l': line, 'L': LINE_LABEL[line], 'c': cid})
    return out


ITEMS = items()
assert len(ITEMS) == 118, 'se esperaban 118 presentaciones, hay %d' % len(ITEMS)


def build():
    doc = (TEMPLATE
           .replace('__ITEMS__', json.dumps(ITEMS, ensure_ascii=False))
           .replace('__NBL__', json.dumps(NBL, ensure_ascii=False))
           .replace('__TAG__', json.dumps(TAGLINE, ensure_ascii=False))
           .replace('__QRJS__', QR)
           .replace('__SHA__', SHA)
           .replace('__LOGO__', TL['t_master']))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(doc)
    print('  PEPTIDEX_Etiquetas_Niimbot.html  %.1f KB' % (len(doc.encode()) / 1024))
    print('  %d presentaciones · 50×30 mm (591×354 px) y 40×20 mm (472×236 px) a 300 dpi' % len(ITEMS))


TEMPLATE = r'''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>PEPTIDEX · Etiquetas Niimbot M2</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --ink:#0b0d12;--ink2:#3f444d;--muted:#8a9099;--hair:#dcdfe4;--bg:#eef0f3;
  --nav:#0f275e;--edit:#1e5eff;
  --font:"Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
body{font-family:var(--font);color:var(--ink);background:var(--bg);font-size:14px;line-height:1.55;
  -webkit-font-smoothing:antialiased}

/* ---------- candado ---------- */
.gate{position:fixed;inset:0;z-index:200;background:#0d1117;display:none;
  align-items:center;justify-content:center;padding:24px}
body.locked .gate{display:flex}
body.locked .top,body.locked .wrap{display:none}
body.locked{overflow:hidden}
.gate-card{width:100%;max-width:350px;text-align:center}
.gate-card img{height:58px;width:auto;margin:0 auto 24px;display:block;filter:brightness(0) invert(1)}
.gate-card h2{color:#fff;font-size:13px;font-weight:700;letter-spacing:.26em;text-transform:uppercase}
.gate-card p{color:#7c8798;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;margin:4px 0 22px}
.gate input{width:100%;font-family:inherit;font-size:14px;padding:11px 14px;margin-bottom:8px;
  border:1px solid #252c38;border-radius:9px;background:#151b24;color:#e9edf3;outline:none}
.gate input:focus{border-color:#3a86ff}
.gate button{width:100%;font-family:inherit;font-size:13px;font-weight:700;padding:11px;border:none;
  border-radius:9px;background:#fff;color:#0d1117;cursor:pointer;margin-top:5px}
.gate .err{color:#ff6b5e;font-size:12px;margin-top:11px;min-height:16px}

/* ---------- barra ---------- */
.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);
  backdrop-filter:saturate(180%) blur(18px);border-bottom:1px solid var(--hair)}
.topin{max-width:1500px;margin:0 auto;padding:11px 22px;display:flex;align-items:center;gap:12px;
  flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:11px}
.brand img{height:27px;width:auto}
.brand .bt{display:flex;flex-direction:column;line-height:1.2}
.brand .bt b{font-size:12px;font-weight:700}
.brand .bt span{font-size:9px;letter-spacing:.2em;color:var(--muted);text-transform:uppercase;font-weight:700}
.seg{display:flex;background:#f1f3f6;border-radius:999px;padding:3px;gap:2px}
.seg button{font-family:inherit;font-size:11.5px;font-weight:700;padding:6px 13px;border:none;
  border-radius:999px;background:transparent;color:var(--ink2);cursor:pointer;white-space:nowrap}
.seg button.on{background:var(--nav);color:#fff}
.btn{font-family:inherit;font-size:11.5px;font-weight:700;padding:8px 13px;border-radius:999px;
  border:1px solid var(--hair);background:#fff;cursor:pointer;color:var(--ink);white-space:nowrap}
.btn:hover{border-color:var(--nav)}
.btn.dark{background:var(--nav);border-color:var(--nav);color:#fff}
.sp{flex:1}
.lock-out{font-size:11px;color:var(--muted);background:none;border:none;cursor:pointer;padding:6px}

/* ---------- layout ---------- */
.wrap{max-width:1500px;margin:0 auto;padding:20px 22px 70px;display:grid;
  grid-template-columns:280px 1fr;gap:22px;align-items:start}
.side{background:#fff;border:1px solid var(--hair);border-radius:12px;overflow:hidden;
  position:sticky;top:62px;max-height:calc(100vh - 80px);display:flex;flex-direction:column}
.side-s{padding:11px;border-bottom:1px solid var(--hair)}
.side-s input{width:100%;font-family:inherit;font-size:13px;padding:8px 12px;border:1px solid var(--hair);
  border-radius:999px;outline:none}
.side-s input:focus{border-color:var(--nav)}
.side-l{overflow-y:auto;flex:1}
.it{display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;font-size:12.5px;
  border-bottom:1px solid #f2f4f6}
.it:hover{background:#f6f8fa}
.it.on{background:var(--nav);color:#fff}
.it.on .is,.it.on .il{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.4)}
.it .inm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.it .is{font-family:var(--mono);font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;
  border:1px solid var(--hair);color:var(--ink2)}
.it .il{font-size:8px;font-weight:800;letter-spacing:.1em;color:var(--muted);width:16px;text-align:right}
.side-f{padding:9px 12px;border-top:1px solid var(--hair);font-size:11px;color:var(--muted);
  display:flex;align-items:center;gap:8px}

.main{min-width:0;display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
.stage{background:#fff;border:1px solid var(--hair);border-radius:12px;padding:22px}
.stage h3{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);margin-bottom:4px}
.stage .dim{font-family:var(--mono);font-size:11px;color:var(--ink2);margin-bottom:14px}
.cvwrap{background:#f6f7f9;border:1px solid var(--hair);border-radius:8px;padding:18px;
  display:flex;justify-content:center;align-items:center;overflow:auto}
/* image-rendering pixelated: a 1 bit, un canvas suavizado al ampliarlo miente
   — enseña grises que la impresora no puede hacer. */
canvas#cv{image-rendering:pixelated;image-rendering:crisp-edges;
  box-shadow:0 0 0 1px #cfd4da;background:#fff}
.zoom{display:flex;align-items:center;gap:9px;margin-top:12px;font-size:11.5px;color:var(--muted)}
.zoom input{flex:1}
.warn{margin-top:14px;padding:10px 12px;border:1px solid #ecd6cc;background:#fdf6f3;border-radius:8px;
  font-size:11.5px;color:#a8471f;line-height:1.5;display:none}
.warn.on{display:block}
.warn b{display:block;margin-bottom:2px}

.panel{background:#fff;border:1px solid var(--hair);border-radius:12px;overflow:hidden}
.panel h4{font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);
  padding:12px 15px 8px;border-bottom:1px solid var(--hair)}
.fld{padding:9px 15px;border-bottom:1px solid #f2f4f6}
.fld:last-child{border-bottom:none}
.fld label{display:block;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  color:var(--muted);margin-bottom:3px}
.fld input,.fld select,.fld textarea{width:100%;font-family:inherit;font-size:13px;padding:6px 9px;
  border:1px solid var(--hair);border-radius:6px;outline:none;color:var(--ink);background:#fff;resize:vertical}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:var(--edit)}
.fld .row{display:flex;gap:8px}
.fld .row>*{flex:1;min-width:0}
.fld .chk{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink2);cursor:pointer}
.fld .chk input{width:auto;flex:0 0 auto}
.acts{padding:13px 15px;display:flex;flex-wrap:wrap;gap:7px;border-top:1px solid var(--hair);background:#fafbfc}

.help{background:#fff;border:1px solid var(--hair);border-radius:12px;padding:16px 18px;margin-top:20px;
  font-size:12.5px;line-height:1.6;color:var(--ink2);grid-column:1 / -1}
.help h4{font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--ink);
  margin-bottom:8px}
.help ol{margin:0 0 10px 0;padding-left:0;list-style:none;counter-reset:h}
.help li{counter-increment:h;position-relative;padding-left:24px;margin-bottom:5px;position:relative}
.help li::before{content:counter(h);position:absolute;left:0;top:1px;width:16px;height:16px;
  border-radius:50%;background:var(--nav);color:#fff;font-size:9px;font-weight:700;text-align:center;
  line-height:16px}
.help p{margin-bottom:8px}
.help b{color:var(--ink)}
.help code{font-family:var(--mono);font-size:11.5px;background:#f4f6f8;padding:1px 5px;border-radius:4px}

@media(max-width:1220px){ .main{grid-template-columns:1fr} }
@media(max-width:980px){
  .wrap{grid-template-columns:1fr}
  .side{position:static;max-height:340px}
}
@media print{ body{background:#fff} .top,.side,.panel,.help,.zoom,.warn{display:none} }
</style>
</head>
<body>

<div class="gate">
  <form class="gate-card" id="gateForm">
    <img src="__LOGO__" alt="PEPTIDEX"/>
    <h2>Etiquetas</h2><p>Acceso restringido</p>
    <input id="gEmail" type="email" placeholder="Correo" autocomplete="username"/>
    <input id="gPass" type="password" placeholder="Contraseña" autocomplete="current-password"/>
    <label style="display:flex;align-items:center;gap:7px;color:#7c8798;font-size:11.5px;
      margin:9px 0 2px;cursor:pointer;text-align:left">
      <input id="gKeep" type="checkbox" style="width:auto;margin:0"/> Mantener la sesión abierta</label>
    <button type="submit">Entrar</button>
    <div class="err" id="gErr"></div>
  </form>
</div>

<div class="top"><div class="topin">
  <div class="brand"><img src="__LOGO__" alt="PEPTIDEX"/>
    <div class="bt"><b>Etiquetas · Niimbot M2</b><span>300 dpi · un color</span></div></div>
  <div class="seg" id="segSize">
    <button data-w="50" data-h="30" class="on">50 × 30 mm</button>
    <button data-w="40" data-h="20">40 × 20 mm</button>
  </div>
  <span class="sp"></span>
  <button class="btn" id="bReset">Restaurar</button>
  <button class="btn" id="bAll">Exportar las 118</button>
  <button class="btn dark" id="bPng">Exportar PNG</button>
  <button class="lock-out" id="lockOut" title="Cerrar sesión">⎋</button>
</div></div>

<div class="wrap">
  <aside class="side">
    <div class="side-s"><input id="q" type="search" placeholder="Buscar entre las 118…" autocomplete="off"/></div>
    <div class="side-l" id="list"></div>
    <div class="side-f"><span id="cnt"></span></div>
  </aside>

  <div class="main">
    <section class="stage">
      <h3>Vista real · 1 bit</h3>
      <div class="dim" id="dim"></div>
      <div class="cvwrap"><canvas id="cv"></canvas></div>
      <div class="zoom"><span>Zoom</span><input id="zoom" type="range" min="1" max="6" step="0.5" value="2"/>
        <span id="zval">200 %</span></div>
      <div class="warn" id="warn"></div>
    </section>

    <section class="panel">
      <h4>Contenido</h4>
      <div class="fld"><label>Compuesto</label>
        <input id="fName" type="text"/></div>
      <div class="fld"><label>Presentación</label>
        <div class="row"><input id="fDose" type="text"/>
          <select id="fLine">
            <option value="fitness">FITNESS</option>
            <option value="beauty">BEAUTY</option>
            <option value="longevity">LONGEVITY</option></select></div></div>
      <div class="fld"><label>Segunda línea (opcional)</label>
        <input id="fSub" type="text" placeholder="p. ej. sal de acetato"/></div>
      <div class="fld"><label>Lote · Caducidad</label>
        <div class="row"><input id="fLot" type="text" placeholder="LOTE"/>
          <input id="fExp" type="text" placeholder="EXP"/></div></div>
      <div class="fld"><label>Pie</label>
        <input id="fFoot" type="text"/></div>
      <div class="fld"><label>QR — contenido</label>
        <textarea id="fQr" rows="2"></textarea></div>
      <div class="fld"><label class="chk"><input id="fQrOn" type="checkbox" checked/> Imprimir el QR</label></div>
      <div class="fld"><label class="chk"><input id="fTag" type="checkbox" checked/> Lema de la línea</label></div>
      <div class="fld"><label>Ajuste fino</label>
        <div class="row">
          <select id="fLogo"><option value="1">Logo normal</option><option value="0">Sin logo</option>
            <option value="2">Logo grande</option></select>
          <select id="fBold"><option value="0">Nombre normal</option><option value="1">Nombre condensado</option></select>
        </div></div>
      <div class="acts">
        <button class="btn" id="bCopy">Aplicar a toda la línea</button>
        <button class="btn" id="bRevert">Revertir esta</button>
      </div>
    </section>

    <section class="help">
      <h4>Cómo imprimir sin que salga sucio</h4>
      <p>Una térmica <b>no imprime gris</b>. Cada punto del cabezal quema o no quema. Cuando le
      mandas un diseño con degradados, sombras o un logo metálico, el driver lo <b>trama</b>:
      cambia cada gris por una nube de puntos. Esa nube es lo que ves como suciedad.</p>
      <p>Por eso esta pantalla dibuja la etiqueta directamente en <b>puntos de impresora</b>
      —<code id="hpx"></code>— y la umbraliza a blanco y negro puro. Lo que ves <b>es</b> el
      bitmap que sale del cabezal, sin un solo reescalado por el camino.</p>
      <ol>
        <li>Elige el compuesto en la lista y ajusta lo que quieras a la derecha.</li>
        <li><b>Exportar PNG</b>. El archivo ya viene al tamaño exacto en puntos.</li>
        <li>En la app de Niimbot: nueva etiqueta, fija el tamaño del papel, <b>Imagen</b>,
            y elige el PNG.</li>
        <li>Colócalo <b>al 100 %</b>, ocupando la etiqueta entera. No lo estires ni lo ajustes
            «a pantalla»: cualquier reescalado devuelve el problema del principio.</li>
        <li>Densidad media-alta. Si el negro sale gris, sube; si los textos pequeños se
            cierran, baja.</li>
      </ol>
      <p><b>Lo que este diseño respeta y conviene no romper.</b> Filete mínimo 3 px (0.25 mm).
      Texto mínimo 17 px (~1.4 mm) y siempre en negrita — a un bit, una fuente fina pierde la
      mitad de los trazos. Nada de texto pequeño en blanco sobre negro: la tinta térmica se
      expande al quemar y en negativo eso borra las letras. El QR sale con módulo de 4 px y
      zona de silencio de 4 módulos, que es el mínimo para que lo lea un teléfono.</p>
    </section>
  </div>
</div>

<script>
__SHA__
var AUTH={
  email:'f44ff633110f3dbeac9e7ae1b45dff2ce91972c3549aed52f2467700e6a16514',
  pass:['650cf7ef315e01ced1fd785ec634e6778178afcf8819966b27067a5729d09def',
        '09d969942f8ae82544114b9a7494a711983323e4b7c89cc3c2db9bcbe5d84ae9']
};
var GKEY='px-etq-auth';
function unlock(){ document.body.classList.remove('locked'); if(window.PX_ETQ_SHOWN) PX_ETQ_SHOWN(); }
function lock(){ document.body.classList.add('locked');
  sessionStorage.removeItem(GKEY); localStorage.removeItem(GKEY);
  var g=document.getElementById('gPass'); if(g) g.value=''; }
(function(){ if(sessionStorage.getItem(GKEY)==='1'||localStorage.getItem(GKEY)==='1') unlock();
  else document.body.classList.add('locked'); })();
document.getElementById('gateForm').addEventListener('submit',function(ev){
  ev.preventDefault();
  var em=document.getElementById('gEmail').value.trim().toLowerCase(),
      pw=document.getElementById('gPass').value, err=document.getElementById('gErr');
  if(sha256(em)===AUTH.email && AUTH.pass.indexOf(sha256(pw))>=0){
    (document.getElementById('gKeep').checked?localStorage:sessionStorage).setItem(GKEY,'1');
    err.textContent=''; unlock();
  }else{ err.textContent='Credenciales incorrectas.'; document.getElementById('gPass').value=''; }
});

__QRJS__
</script>

<script>
(function(){
"use strict";
var ITEMS=__ITEMS__, NBL=__NBL__, TAG=__TAG__;
var KEY='px-etiquetas';

/* 300 dpi.  Todo el archivo se apoya en esta constante: los milímetros de la
   etiqueta se convierten a puntos de cabezal una sola vez, aquí. */
var DPI=300, PPMM=DPI/25.4;
var mm=function(v){ return Math.round(v*PPMM); };

var SIZES={
  '50x30':{w:50,h:30},
  '40x20':{w:40,h:20}
};
var size='50x30';

var cv=document.getElementById('cv'), ctx=cv.getContext('2d',{willReadFrequently:true});
var list=document.getElementById('list'), q=document.getElementById('q');
var cur=0, zoom=2, edits={}, imgs={};

/* ---------- estado ---------- */
function load(){ try{ var d=JSON.parse(localStorage.getItem(KEY)); if(d&&typeof d==='object') edits=d; }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(edits)); }catch(e){} }
function keyOf(i){ return ITEMS[i].k+'|'+size; }

function base(i){
  var it=ITEMS[i];
  return {name:it.n, dose:it.s, line:it.l, sub:'',
          lot:'', exp:'', foot:'RESEARCH USE ONLY · NOT FOR HUMAN USE',
          qr:'PX:'+it.k, qrOn:true, tag:true, logo:'1', cond:'0'};
}
function data(i){
  var k=keyOf(i), b=base(i);
  if(edits[k]) for(var p in edits[k]) b[p]=edits[k][p];
  return b;
}
function setData(i,d){ edits[keyOf(i)]=d; save(); }

/* ---------- imágenes de logo, decodificadas una vez ---------- */
function preload(cb){
  var n=0, keys=Object.keys(NBL);
  keys.forEach(function(k){
    var im=new Image();
    im.onload=im.onerror=function(){ if(++n===keys.length) cb(); };
    im.src=NBL[k]; imgs[k]=im;
  });
}

/* ============================ EL DIBUJO ============================
   Se dibuja en escala de grises y al final se umbraliza de golpe.  Hacerlo al
   revés — intentar dibujar ya en blanco y negro — obliga a renunciar al
   antialias del texto, y sin antialias el trazado del navegador se come los
   remates.  Dibujar suave y cortar después da letras mucho más limpias.        */
function draw(){
  var S=SIZES[size], W=mm(S.w), H=mm(S.h), d=data(cur), it=ITEMS[cur];
  cv.width=W; cv.height=H;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#000'; ctx.strokeStyle='#000';
  ctx.textBaseline='alphabetic';

  var small = (size==='40x20');
  var pad   = small?mm(1.3):mm(1.8);
  var RULE  = Math.max(3, mm(0.28));          // filete mínimo: 3 px
  var qrOn  = d.qrOn!==false;

  /* --- QR a la derecha ---------------------------------------------------
     El módulo se redondea a entero: un módulo fraccionario reparte medio
     píxel entre dos celdas y el lector pierde la retícula. */
  var qrBox=0, qrX=0, qrY=0, mod=0, qm=null;
  if(qrOn && typeof QRGen!=='undefined'){
    try{ qm=QRGen.matrix(String(d.qr||" ")); }catch(e){ qm=null; }
  }
  if(qm){
    var quiet=4, n=qm.length, tot=n+quiet*2;
    /* El QR no debe pasar de un tercio del ancho: por encima de eso el nombre
       del compuesto se queda sin sitio y hay que encogerlo hasta que no se lee.
       El módulo se mantiene entre 4 y 8 px — por debajo de 4 no lo lee un
       teléfono, y por encima de 8 sólo se gana tamaño, no legibilidad. */
    var maxBox = Math.min(H-pad*2, Math.round(W*0.34));
    mod = Math.floor(maxBox/tot);
    if(mod>8) mod=8;
    if(mod<4){                                 // se le deja crecer hasta el alto
      mod = Math.min(8, Math.floor((H-pad*2)/tot));
      if(mod<4) mod=4;                         // y si aun así no llega, se avisa
    }
    qrBox=tot*mod;
    qrX=W-pad-qrBox; qrY=Math.round((H-qrBox)/2);
    ctx.fillStyle='#fff'; ctx.fillRect(qrX,qrY,qrBox,qrBox);
    ctx.fillStyle='#000';
    for(var yy=0;yy<n;yy++) for(var xx=0;xx<n;xx++)
      if(qm[yy][xx]) ctx.fillRect(qrX+(xx+quiet)*mod, qrY+(yy+quiet)*mod, mod, mod);
  }

  var right = qrBox ? qrX-mm(1.6) : W-pad;
  var colW  = right-pad;

  /* --- logo de línea ---------------------------------------------------- */
  var y=pad;
  var lg=imgs[d.line];
  if(d.logo!=='0' && lg && lg.width){
    var lh = small ? mm(d.logo==='2'?4.2:3.4) : mm(d.logo==='2'?6.2:5.0);
    var lw = Math.round(lg.width*lh/lg.height);
    if(lw>colW*0.62){ lw=Math.round(colW*0.62); lh=Math.round(lg.height*lw/lg.width); }
    ctx.drawImage(lg, pad, y, lw, lh);

    /* Nombre de línea y lema, alineados al pie del logo. */
    var tx=pad+lw+mm(1.6);
    var hw=right-tx;                            // lo que queda hasta el QR
    var fs1=small?mm(1.5):mm(2.0);
    ctx.font='800 '+fs1+'px Arial,Helvetica,sans-serif';
    ctx.fillText(clip(sp(it.L,1), hw, fs1, '800'), tx, y+lh-(small?mm(1.4):mm(2.0)));
    if(d.tag!==false){
      var fs2=small?mm(1.15):mm(1.45);
      var tg=sp(TAG[d.line]||'',1);
      ctx.font='700 '+fs2+'px Arial,Helvetica,sans-serif';
      /* Entero o nada: un lema cortado con puntos suspensivos parece un fallo
         de impresión, no una decisión. */
      if(ctx.measureText(tg).width<=hw) ctx.fillText(tg, tx, y+lh);
    }
    y+=lh+(small?mm(1.1):mm(1.6));
  }

  ctx.fillRect(pad, y, colW, RULE);
  y+=RULE+(small?mm(1.3):mm(2.0));

  /* --- la franja inferior se mide antes de componer el centro -------------
     Su altura no depende de nada más, así que fijarla primero da el techo real
     del que dispone el nombre.  Al revés, el centro crecía y el filete acababa
     cruzando la caja de dosis. */
  var fullW = W-pad*2;
  var fsl = small?mm(1.5):mm(1.75);
  var fsf = small?mm(1.45):mm(1.65);
  var gl  = small?mm(0.7):mm(1.0);
  var gf  = small?mm(0.8):mm(1.1);
  var le=[];
  if(d.lot) le.push('LOTE '+d.lot);
  if(d.exp) le.push('EXP '+d.exp);

  var bottomH = 0;
  if(d.foot)     bottomH += fsf+gf;
  if(le.length)  bottomH += fsl+gl;
  if(bottomH)    bottomH += Math.max(2,mm(0.2)) + (small?mm(0.8):mm(1.2));
  var ceil = H-pad-bottomH;                    // el centro no puede pasar de aquí

  /* --- nombre y dosis, dentro del hueco ---------------------------------- */
  var subH  = d.sub ? (small?mm(1.5):mm(1.9))+(small?mm(0.5):mm(0.8)) : 0;
  var dose  = String(d.dose||'').toUpperCase();
  var fsd   = small?mm(2.6):mm(3.4);
  var doseH = dose ? Math.round(fsd*1.42)+(small?mm(1.1):mm(1.6)) : 0;

  var nameMax = small?mm(4.6):mm(6.4);
  var nameMin = small?mm(2.4):mm(3.0);
  var room = ceil - y - subH - doseH;
  if(room < nameMax) nameMax = Math.max(nameMin, Math.floor(room));

  var fam = d.cond==='1' ? '"Arial Narrow",Arial,sans-serif' : 'Arial,Helvetica,sans-serif';
  var fs  = fit(String(d.name||'').toUpperCase(), colW, nameMax, nameMin, '800', fam);
  ctx.font='800 '+fs+'px '+fam;
  y+=fs;
  ctx.fillText(clip(String(d.name||'').toUpperCase(), colW, fs, '800'), pad, y);

  if(d.sub){
    var fss=small?mm(1.5):mm(1.9);
    ctx.font='700 '+fss+'px Arial,Helvetica,sans-serif';
    y+=fss+(small?mm(0.5):mm(0.8));
    ctx.fillText(clip(String(d.sub), colW, fss, '700'), pad, y);
  }

  /* Dosis en negativo.  Aquí sí se puede invertir: es texto grande.  A tamaño
     pequeño el negativo se cierra por la ganancia de punto de la térmica. */
  if(dose){
    ctx.font='800 '+fsd+'px Arial,Helvetica,sans-serif';
    var tw=ctx.measureText(dose).width;
    var bw=Math.round(tw+mm(2.4)), bh=Math.round(fsd*1.42);
    y+=(small?mm(1.1):mm(1.6));
    if(y+bh>ceil) y = ceil-bh;                 // último recurso: pegarla al techo
    ctx.fillStyle='#000'; ctx.fillRect(pad, y, bw, bh);
    ctx.fillStyle='#fff';
    ctx.fillText(dose, pad+mm(1.2), y+bh-Math.round(bh*0.28));
    ctx.fillStyle='#000';
    y+=bh;
  }

  /* --- franja inferior, a ancho completo --------------------------------- */
  var footY = H-pad;
  if(d.foot){
    ctx.font='700 '+fsf+'px Arial,Helvetica,sans-serif';
    ctx.fillText(clip(String(d.foot).toUpperCase(), fullW, fsf, '700'), pad, footY);
    footY -= fsf+gf;
  }
  if(le.length){
    ctx.font='700 '+fsl+'px Arial,Helvetica,sans-serif';
    ctx.fillText(clip(le.join('   ·   '), fullW, fsl, '700'), pad, footY);
    footY -= fsl+gl;
  }
  if(bottomH){
    ctx.fillRect(pad, Math.round(footY), fullW, Math.max(2,mm(0.2)));
  }

  threshold();
  checkWarnings(fs, mod, small);
}

/* Ajusta el cuerpo hasta que la línea quepa, y nunca por debajo del mínimo
   legible: si aun así no cabe, se recorta con puntos suspensivos.  Encoger sin
   suelo es lo que produce nombres de 8 px que no lee nadie. */
function fit(txt, maxW, hi, lo, weight, fam){
  for(var s=hi; s>=lo; s-=1){
    ctx.font=weight+' '+s+'px '+fam;
    if(ctx.measureText(txt).width<=maxW) return s;
  }
  return lo;
}
function clip(txt, maxW, fs, weight){
  ctx.font=weight+' '+fs+'px Arial,Helvetica,sans-serif';
  if(ctx.measureText(txt).width<=maxW) return txt;
  var t=txt;
  while(t.length>2 && ctx.measureText(t+'…').width>maxW) t=t.slice(0,-1);
  return t+'…';
}
/* Espaciado de letras a mano: canvas no tiene letter-spacing en todos los
   navegadores que nos importan. */
function sp(t, px){
  if(!px) return t;
  return String(t).split('').join(String.fromCharCode(8202));
}

/* Umbral duro.  Todo lo que no sea claro pasa a negro puro; el resto, a blanco
   puro.  A partir de aquí el canvas contiene exactamente dos valores, que es
   lo único que la M2 sabe imprimir. */
function threshold(){
  var W=cv.width,H=cv.height;
  var im=ctx.getImageData(0,0,W,H), p=im.data;
  for(var i=0;i<p.length;i+=4){
    var v=(p[i]*299+p[i+1]*587+p[i+2]*114)/1000;
    var b=v<176?0:255;
    p[i]=p[i+1]=p[i+2]=b; p[i+3]=255;
  }
  ctx.putImageData(im,0,0);
}

function checkWarnings(nameFs, mod, small){
  var w=document.getElementById('warn'), msgs=[];
  var minTxt = small?mm(1.45):mm(1.65);
  if(nameFs <= (small?mm(2.4):mm(3.0)))
    msgs.push('El nombre llegó al cuerpo mínimo y puede haberse recortado. Prueba «Nombre condensado» o quita el QR.');
  if(mod && mod<4)
    msgs.push('El QR quedó con módulo de '+mod+' px. Por debajo de 4 px muchos teléfonos no lo leen.');
  if(minTxt<17)
    msgs.push('El texto de pie queda por debajo de 1.4 mm y la térmica lo cerrará.');
  w.className = msgs.length?'warn on':'warn';
  w.innerHTML = msgs.map(function(m){ return '<b>Aviso</b>'+m; }).join('<br/>');
}

/* ---------- vista ---------- */
function paint(){
  draw();
  var S=SIZES[size];
  cv.style.width=Math.round(cv.width*zoom/ (window.devicePixelRatio>1?1:1) /3*zoom*0+cv.width*zoom/3)+'px';
  cv.style.width=Math.round(cv.width*zoom/3)+'px';
  cv.style.height=Math.round(cv.height*zoom/3)+'px';
  document.getElementById('dim').textContent=
    S.w+' × '+S.h+' mm  ·  '+cv.width+' × '+cv.height+' px  ·  300 dpi  ·  1 bit';
  document.getElementById('hpx').textContent=cv.width+' × '+cv.height+' px';
}
window.PX_ETQ_SHOWN=function(){ paint(); };

/* ---------- lista ---------- */
function buildList(){
  var t=(q.value||'').trim().toLowerCase();
  var h='', shown=0;
  ITEMS.forEach(function(it,i){
    if(t && (it.n+' '+it.s+' '+it.k+' '+it.L).toLowerCase().indexOf(t)<0) return;
    shown++;
    h+='<div class="it'+(i===cur?' on':'')+'" data-i="'+i+'">'+
       '<span class="il">'+it.L.charAt(0)+'</span>'+
       '<span class="inm">'+esc(it.n)+'</span>'+
       '<span class="is">'+esc(it.s)+'</span></div>';
  });
  list.innerHTML=h||'<div style="padding:26px;text-align:center;color:#8a9099;font-size:12.5px">Sin resultados.</div>';
  document.getElementById('cnt').textContent=shown+' de '+ITEMS.length+' presentaciones';
  [].forEach.call(list.querySelectorAll('.it'), function(el){
    el.addEventListener('click', function(){ cur=+el.dataset.i; buildList(); fill(); paint(); });
  });
}
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------- formulario ---------- */
var F={name:'fName',dose:'fDose',line:'fLine',sub:'fSub',lot:'fLot',exp:'fExp',
       foot:'fFoot',qr:'fQr',logo:'fLogo',cond:'fBold'};
function fill(){
  var d=data(cur);
  for(var k in F) document.getElementById(F[k]).value=d[k]||'';
  document.getElementById('fQrOn').checked=d.qrOn!==false;
  document.getElementById('fTag').checked=d.tag!==false;
}
function grab(){
  var d=data(cur);
  for(var k in F) d[k]=document.getElementById(F[k]).value;
  d.qrOn=document.getElementById('fQrOn').checked;
  d.tag=document.getElementById('fTag').checked;
  setData(cur,d); paint();
}
Object.keys(F).forEach(function(k){
  var el=document.getElementById(F[k]);
  el.addEventListener('input',grab); el.addEventListener('change',grab);
});
document.getElementById('fQrOn').addEventListener('change',grab);
document.getElementById('fTag').addEventListener('change',grab);

/* ---------- acciones ---------- */
document.getElementById('bRevert').addEventListener('click', function(){
  delete edits[keyOf(cur)]; save(); fill(); paint();
});
document.getElementById('bReset').addEventListener('click', function(){
  if(!confirm('Restaurar TODAS las etiquetas a su contenido original.\n¿Continuar?')) return;
  edits={}; save(); fill(); paint();
});
/* Copia a toda la línea los campos que se repiten —pie, QR, acabados— y NO los
   que identifican al vial.  Copiar el nombre o la dosis sería sabotear las
   otras etiquetas. */
document.getElementById('bCopy').addEventListener('click', function(){
  var d=data(cur), L=ITEMS[cur].l, n=0;
  if(!confirm('Aplicar pie, opciones de QR y acabados al resto de la línea '+ITEMS[cur].L+'.\n'+
              'El nombre, la dosis, el lote y la caducidad no se tocan.')) return;
  ITEMS.forEach(function(it,i){
    if(it.l!==L || i===cur) return;
    var t=data(i);
    t.foot=d.foot; t.qrOn=d.qrOn; t.tag=d.tag; t.logo=d.logo; t.cond=d.cond;
    setData(i,t); n++;
  });
  alert('Aplicado a '+n+' etiquetas de la línea.');
});

function pngOf(i){
  var keep=cur; cur=i; draw(); var url=cv.toDataURL('image/png'); cur=keep; return url;
}
function dl(url,name){
  var a=document.createElement('a'); a.href=url; a.download=name; a.click();
}
document.getElementById('bPng').addEventListener('click', function(){
  var it=ITEMS[cur];
  draw();
  dl(cv.toDataURL('image/png'),
     'PX_'+it.k+'_'+SIZES[size].w+'x'+SIZES[size].h+'mm_300dpi.png');
  paint();
});
/* Las 118 se descargan de una en una y espaciadas: lanzar 118 descargas en el
   mismo tick hace que el navegador se quede con las primeras y descarte el
   resto sin avisar. */
document.getElementById('bAll').addEventListener('click', function(){
  if(!confirm('Descargar las '+ITEMS.length+' etiquetas en '+SIZES[size].w+'×'+SIZES[size].h+' mm.\n'+
              'Son '+ITEMS.length+' archivos PNG, uno por presentación. Tardará un momento.')) return;
  var i=0;
  (function next(){
    if(i>=ITEMS.length){ paint(); alert('Listo: '+ITEMS.length+' etiquetas.'); return; }
    var it=ITEMS[i];
    dl(pngOf(i), 'PX_'+it.k+'_'+SIZES[size].w+'x'+SIZES[size].h+'mm_300dpi.png');
    i++; setTimeout(next, 220);
  })();
});
document.getElementById('lockOut').addEventListener('click', function(){ lock(); });

/* ---------- tamaño y zoom ---------- */
[].forEach.call(document.querySelectorAll('#segSize button'), function(b){
  b.addEventListener('click', function(){
    [].forEach.call(document.querySelectorAll('#segSize button'), function(x){ x.classList.remove('on'); });
    b.classList.add('on');
    size=b.dataset.w+'x'+b.dataset.h;
    fill(); paint();
  });
});
var zr=document.getElementById('zoom');
zr.addEventListener('input', function(){
  zoom=+zr.value; document.getElementById('zval').textContent=Math.round(zoom*100/3*3)+' %';
  document.getElementById('zval').textContent=Math.round(zoom/3*100)+' %';
  paint();
});
q.addEventListener('input', buildList);

/* ---------- arranque ---------- */
load();
preload(function(){ buildList(); fill(); paint(); });
})();
</script>
</body></html>'''


if __name__ == '__main__':
    build()

/*
  Builds UNIBRAZE_Fichas_Tecnicas.html — one self-contained file holding every
  datasheet in the catalogue, editable in place and printable one at a time.

      node scripts/fichas-html.mjs

  Two references, and they govern different halves.

  The application is the PEPTIDEX one: a single HTML file with no build and no
  framework, a toolbar across the top, an index rail down the left, and every
  sheet stacked in the main column as a sheet of paper. Every value on every
  sheet is a field that looks like printed text until the cursor comes near it.
  Nothing is a form; the document is the form.

  The sheet itself is the Certilas one and does not move: a label column on the
  left at a fixed width, the content beside it, a hairline between every row,
  and the data tables underneath. That is the layout the trade reads, and the
  brief was that it stays put and only the brand changes.

  The data comes from the same modules the websites use, so there is one
  catalogue and not two. Designations, families, specifications and processes
  are known and are filled in. Chemistry and mechanical properties are measured
  values: where no certificate has been transcribed the fields are present and
  empty, which is what makes this file worth having — it is where they get
  filled in.
*/

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'UNIBRAZE_Fichas_Tecnicas.html')

const { CATALOG, SECTIONS, FORMS } = await import('../src/ows/data/catalog.js')
const { SHEETS, NOTICE } = await import('../src/fichas/sheets.js')
const { LOCKUP } = await import('../src/ows/brandMark.js')
const { BRAND } = await import('../src/ows/brand.js')

/*
  The five elements reported on essentially every steel filler certificate.
  They are the columns of an empty table, not data: every value under them
  starts blank. A sheet for an aluminium or a nickel alloy gets the same empty
  table and its columns renamed, which is one edit rather than a different
  screen.
*/
const DEFAULT_ELEMENTS = ['C', 'Si', 'Mn', 'P', 'S']

const DEFAULT_MECH = [
  'Límite elástico (MPa)',
  'Resistencia a la tracción (MPa)',
  'Elongación (%)',
  'Energía de impacto Charpy (J)',
]

const DEFAULT_PARAMS = ['Diámetro (mm)', 'Voltaje (V)', 'Corriente (A)', 'Extensión (mm)', 'Gas (L/min)']

const formsOf = (item) => item.forms.map((f) => FORMS[f]?.es).filter(Boolean).join(' · ')

/** A complete sheet for a catalogue row: what is known, and blanks for the rest. */
function docFor(item) {
  const sheet = SHEETS[item.id]
  if (sheet) return { ...sheet, id: item.id, section: item.section, edited: false }

  return {
    id: item.id,
    section: item.section,
    title: item.designation,
    designation: item.designation,
    type: item.note ?? '',
    properties: [],
    applications: [],
    classification: [{ body: item.spec, value: item.designation }],
    suitable: [],
    facts: [
      { k: 'Proceso', v: item.process },
      { k: 'Forma', v: formsOf(item) },
      { k: 'Gas de protección', v: '' },
      { k: 'Polaridad', v: '' },
      { k: 'Diámetros', v: '' },
      { k: 'Embalaje', v: '' },
    ],
    positions: [],
    approvals: [],
    chemistry: {
      note: 'Composición química del metal depositado, % en peso',
      elements: [...DEFAULT_ELEMENTS],
      rows: [{ label: 'Típico', note: '', values: DEFAULT_ELEMENTS.map(() => '') }],
    },
    mechanical: {
      note: 'Metal depositado',
      columns: ['Valor'],
      rows: DEFAULT_MECH.map((label) => ({ label, values: [''] })),
    },
    parameters: {
      note: 'Parámetros de soldadura recomendados',
      columns: [...DEFAULT_PARAMS],
      rows: [{ values: DEFAULT_PARAMS.map(() => '') }],
    },
    packaging: [],
    notice: NOTICE,
    edited: false,
  }
}

const DOCS = CATALOG.map(docFor)

/* The mark, as markup rather than an image: it scales, it prints sharp, and it
   costs a few hundred bytes instead of a base64 raster. Inked as drawn — red U,
   black blocks, black letters — which is the form that belongs on paper. */
const MARK_SVG =
  `<svg class="ubz" viewBox="0 0 ${LOCKUP.width} ${LOCKUP.height}" fill-rule="evenodd" aria-label="UNIBRAZE">` +
  `<path fill="#d10500" d="${LOCKUP.a}"/>` +
  `<path fill="#101114" d="${LOCKUP.b}"/>` +
  `<path fill="#101114" d="${LOCKUP.c}"/>` +
  `</svg>`

const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c')

const CSS = String.raw`
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --red:#d10500; --red2:#8f0400;
  --ink:#101114; --ink2:#3f434a; --muted:#8a9099; --hair:#dcdfe4; --hair2:#eceef1;
  --bg:#eef0f3; --paper:#ffffff; --edit:#1e5eff;
  --font:Arial,"Helvetica Neue",Helvetica,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--font);color:var(--ink);background:var(--bg);font-size:14px;line-height:1.55;
  -webkit-font-smoothing:antialiased}
.ubz{display:block;height:100%;width:auto}

/* ---------- barra de herramientas ---------- */
.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);
  backdrop-filter:saturate(180%) blur(18px);-webkit-backdrop-filter:saturate(180%) blur(18px);
  border-bottom:1px solid var(--hair)}
.topin{max-width:1400px;margin:0 auto;padding:10px 24px 0;display:flex;align-items:center;gap:13px}
/* Doce familias no caben en la misma línea que la marca, la búsqueda y las
   acciones. En vez de encoger la búsqueda hasta que desaparece, los filtros
   bajan a su propia banda y ahí sí pueden envolver. */
.tfil{max-width:1400px;margin:0 auto;padding:8px 24px 10px}
.brand{display:flex;align-items:center;gap:11px;flex-shrink:0;min-width:0}
.brand .lg{height:30px}
.brand .bt{display:flex;flex-direction:column;line-height:1.2;min-width:0}
.brand .bt b{font-size:12px;font-weight:700;letter-spacing:.03em}
.brand .bt span{font-size:9px;letter-spacing:.2em;color:var(--muted);text-transform:uppercase;font-weight:700}
.search{flex:1;position:relative;max-width:320px;min-width:170px}
.search input{width:100%;font-family:inherit;font-size:13.5px;padding:8px 14px 8px 34px;
  border:1px solid var(--hair);border-radius:999px;background:#f7f8fa;outline:none}
.search input:focus{border-color:var(--red);background:#fff}
.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:.4}
.filters{display:flex;gap:5px;flex-wrap:wrap}
.filters button{font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.04em;
  padding:7px 11px;border-radius:999px;border:1px solid var(--hair);background:#fff;
  color:var(--ink2);cursor:pointer;white-space:nowrap}
.filters button:hover{border-color:var(--red)}
.filters button.on{background:var(--ink);border-color:var(--ink);color:#fff}
.acts{display:flex;gap:5px;flex-shrink:0;align-items:center;margin-left:auto;flex-wrap:wrap;min-width:0}
.btn{font-family:inherit;font-size:11px;font-weight:700;padding:7px 12px;border-radius:999px;
  border:1px solid var(--hair);background:#fff;cursor:pointer;color:var(--ink);white-space:nowrap}
.btn:hover{border-color:var(--red)}
.btn.dark{background:var(--ink);border-color:var(--ink);color:#fff}
.saved{font-size:10.5px;color:var(--muted);min-width:92px;text-align:right}

/* ---------- layout ---------- */
.wrap{max-width:1400px;margin:0 auto;padding:22px 24px 80px;display:grid;
  grid-template-columns:250px 1fr;gap:30px;align-items:start}
.rail{position:sticky;top:62px;max-height:calc(100vh - 78px);overflow-y:auto;
  scrollbar-width:thin;background:#fff;border:1px solid var(--hair);border-radius:10px;padding:14px 8px}
.rail::-webkit-scrollbar{width:5px}
.rail::-webkit-scrollbar-thumb{background:#cfd4da;border-radius:3px}
.ng{margin-bottom:16px}
.ngt{display:block;font-size:9px;font-weight:800;letter-spacing:.18em;padding:0 8px 7px;
  text-transform:uppercase;color:var(--red2)}
.ni{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;text-decoration:none;
  color:var(--ink2);font-size:12.5px}
.ni:hover{background:#f1f3f6;color:var(--ink)}
.ni.act{background:var(--ink);color:#fff}
.ni.act .nn{color:rgba(255,255,255,.6)}
.nn{font-family:var(--mono);font-size:9.5px;color:var(--muted);flex-shrink:0;width:22px}
.nname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;
  font-family:var(--mono);font-size:11.5px}
.nsz{font-size:12px;color:var(--edit);flex-shrink:0;width:8px;line-height:1}
.col{min-width:0}

/* ============================ LA FICHA ============================
   Certilas, sin moverse: rótulo a la izquierda a ancho fijo, contenido al
   lado, un filete entre cada fila y las tablas debajo. Lo único que cambia
   respecto al documento original es la marca. */
.ficha{background:var(--paper);border:1px solid var(--hair);border-radius:4px;
  padding:32px 40px 28px;margin-bottom:26px;scroll-margin-top:74px;position:relative;
  box-shadow:0 10px 34px -28px rgba(10,20,60,.5)}

.fx-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
  padding-bottom:14px;border-bottom:2px solid var(--ink)}
.fx-headL{min-width:0;flex:1}
.fx-kick{font-size:9px;font-weight:700;letter-spacing:.34em;color:var(--red2);
  text-transform:uppercase;margin-bottom:7px}
.fx-master{height:34px;flex-shrink:0;margin-top:2px}

/* --- filas rótulo / contenido --- */
.fx-row{display:grid;grid-template-columns:118px 1fr;gap:18px;padding:11px 0;
  border-bottom:1px solid var(--hair2);align-items:start}
.fx-lab{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);padding-top:3px}

/* --- pares clave / valor dentro de una fila --- */
.pr{display:grid;grid-template-columns:minmax(90px,180px) 1fr auto;gap:12px;
  padding:3px 0;align-items:start}
.pr+.pr{border-top:1px solid #f2f4f6}

/* --- tablas --- */
.fx-tt{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);margin:22px 0 0;padding-bottom:7px;border-bottom:1px solid #b9bec6}
.tw{overflow-x:auto}
.fx-tab{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px}
.fx-tab th,.fx-tab td{padding:6px 8px;border-bottom:1px solid var(--hair2);text-align:right;
  vertical-align:top}
.fx-tab th{font-weight:700;color:var(--ink);border-bottom-color:var(--hair)}
.fx-tab th:first-child,.fx-tab td:first-child{text-align:left;padding-left:0}
.fx-tab td:last-child,.fx-tab th:last-child{padding-right:0}
.rowlab{min-width:120px}
.cellnote{font-size:8.5px;color:var(--muted)}

/* --- controles de estructura: añadir y quitar filas y columnas --- */
.xs{border:1px solid var(--hair);background:#fff;border-radius:5px;cursor:pointer;
  font-family:inherit;font-size:9px;font-weight:700;color:var(--muted);padding:2px 6px;line-height:1.5}
.xs:hover{border-color:var(--red);color:var(--red)}
.addrow{margin-top:7px;display:flex;gap:5px;flex-wrap:wrap}

/* --- aviso legal --- */
.fx-legal{margin-top:22px;padding-top:11px;border-top:1px solid var(--hair)}

/* --- acciones por ficha --- */
.fx-tools{position:absolute;top:10px;right:12px;display:flex;gap:5px;align-items:center}
.fbtn{border:1px solid var(--hair);background:#fff;border-radius:6px;cursor:pointer;
  font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--muted);
  padding:3px 7px;text-transform:uppercase}
.fbtn:hover{border-color:var(--red);color:var(--red)}
.fbtn.go{border-color:var(--ink);color:var(--ink)}
.fbtn.del:hover{border-color:#c0392b;color:#c0392b;background:#fdf2f0}
.badge{position:absolute;top:13px;left:14px;font-size:8px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--edit);display:none}
.ficha.dirty .badge{display:block}

/* ---------- campos editables ----------
   El campo no se anuncia hasta que se le acerca el cursor: en reposo la ficha
   se lee exactamente como el documento impreso, y sólo al pasar por encima
   aparece el subrayado que dice «esto se puede escribir». */
.f{width:100%;font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;
  font-weight:inherit;letter-spacing:inherit;text-align:inherit;text-transform:inherit;
  background:transparent;border:none;border-bottom:1px dashed transparent;padding:0;
  outline:none;resize:none;overflow:hidden;display:block;transition:border-color .15s,background .15s}
.f:hover{border-bottom-color:#d8dce2}
.f:focus{border-bottom-color:var(--edit);background:#f5f8ff}
.f::placeholder{color:#b9c0c9;font-style:italic;font-weight:400;letter-spacing:0;text-transform:none}
.f-name{font-size:23px;font-weight:700;letter-spacing:.01em;line-height:1.16;text-transform:uppercase}
.f-desig{font-family:var(--mono);font-size:11.5px;color:var(--ink2);margin-top:5px}
.f-body{font-size:12.5px;line-height:1.6;color:var(--ink2)}
.f-cellk{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--ink);font-weight:700}
.f-cell{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--ink2)}
.f-num{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--ink2);text-align:right}
.f-th{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--ink);font-weight:700;
  text-align:right}
.f-note{font-family:var(--mono);font-size:8.5px;color:var(--muted)}
.f-list{font-size:12.5px;line-height:1.6;color:var(--ink2)}
.f-legal{font-size:9px;line-height:1.5;color:var(--ink2)}
.hint{font-size:8.5px;color:#b9c0c9;letter-spacing:.04em;margin-top:2px;display:block}

/* ---------- espejo de impresión ---------- */
.m{display:none;white-space:pre-wrap;word-wrap:break-word}
.lw{position:relative;cursor:text;border-bottom:1px dashed transparent;border-radius:2px}
.lw:hover{border-bottom-color:#d8dce2}
.lw .m{display:block}
.lw.on .m{display:none}
.lw .f{display:none}
.lw.on .f{display:block}
.lw .m:empty::before{content:attr(data-ph);color:#b9c0c9;font-style:italic}
.m ul{list-style:none}
.m li{padding-left:14px;position:relative;margin-bottom:2px}
.m li::before{content:"\25aa";position:absolute;left:0;top:0;font-size:.7em;line-height:2;
  color:var(--red)}

.empty{padding:64px 20px;text-align:center;color:var(--muted);font-size:14px;display:none;
  background:#fff;border:1px solid var(--hair);border-radius:4px}

@media(max-width:1040px){
  .wrap{grid-template-columns:1fr;gap:0}
  .rail{display:none}
  .ficha{padding:22px 18px}
  .fx-row{grid-template-columns:1fr;gap:6px}
  .pr{grid-template-columns:1fr}
}
@media(max-width:820px){
  .topin{flex-wrap:wrap;gap:8px;padding:10px 14px}
  .search{order:3;max-width:none;flex-basis:100%}
  /* Cinco acciones no caben junto a la marca en un teléfono, y una fila flex
     que no envuelve no encoge: crece y arrastra el documento con ella. Toma la
     línea entera y envuelve dentro de ella. */
  .acts{flex-wrap:wrap;margin-left:0;width:100%;min-width:0;order:4}
  .saved{min-width:0;text-align:left;width:100%}
  .tfil{padding:6px 14px 10px}
  .wrap{padding:16px 14px 60px}
}
@media(max-width:420px){
  /* El descriptor de la marca mide 305 px y no parte: en una pantalla de 320
     empuja la barra entera y con ella el documento. La marca y el título
     bastan para saber dónde se está. */
  .brand .bt span{display:none}
  .brand .bt b{white-space:nowrap}
}

/* ============================================================================
   IMPRESIÓN — una ficha por página, que es como está pensado el documento.

   Dos cosas hay que forzar aquí que no se ven en pantalla. La hoja Carta con
   márgenes mide unos 718 px de CSS, por debajo del punto de ruptura de móvil:
   sin forzarlo, el papel heredaría la disposición de teléfono y la fila de
   rótulo se desmontaría en bloques apilados. Y los textarea se imprimen con la
   altura que midieron en pantalla, así que se imprimen los espejos en su lugar.

   La clase .only es lo que permite descargar una ficha y no las 188: al
   imprimir una sola, el cuerpo lleva esa clase y todas las demás se ocultan.
   ============================================================================ */
@page{size:Letter;margin:11mm 12mm 9mm}
@media print{
  .top,.rail,.fx-tools,.hint,.badge,.xs,.addrow{display:none !important}
  body{background:#fff;font-size:8.8pt}
  .wrap{display:block;padding:0;max-width:none}
  .ficha{border:none;border-radius:0;box-shadow:none;padding:0 0 6pt;margin:0;
    page-break-after:always;page-break-inside:auto}
  .ficha:last-of-type{page-break-after:auto}
  .empty{display:none !important}
  body.only .ficha{display:none !important}
  body.only .ficha.pick{display:block !important;page-break-after:auto}

  .f{display:none !important}
  .m{display:block}
  .fx-row{display:grid !important;grid-template-columns:88pt 1fr;gap:10pt;padding:6pt 0}
  .pr{display:grid !important;grid-template-columns:120pt 1fr;gap:8pt}
  .m-name{font-size:15pt;font-weight:700;line-height:1.14;text-transform:uppercase}
  .m-desig{font-family:var(--mono);font-size:8pt;color:var(--ink2);margin-top:2pt}
  .m-body,.m-list{font-size:8pt;line-height:1.4;color:var(--ink2)}
  .m-cell,.m-num{font-family:var(--mono);font-size:7.6pt;color:var(--ink2)}
  .m-cellk,.m-th{font-family:var(--mono);font-size:7.6pt;color:var(--ink);font-weight:700}
  .m-note{font-size:6.4pt;color:var(--muted)}
  .m-legal{font-size:6.2pt;line-height:1.4;color:var(--ink2)}
  .fx-master{height:26pt}
  .fx-kick{font-size:6.6pt;letter-spacing:.32em;margin-bottom:4pt}
  .fx-lab{font-size:6.4pt;letter-spacing:.14em}
  .fx-tt{font-size:6.4pt;margin-top:12pt;padding-bottom:4pt}
  /* Once eleven elements are on the page the table is wider than Letter. The
     row-label column gives up its minimum and the cells give up their padding,
     which is enough for the widest composition in this catalogue; the last
     column was being cut off the sheet without it. */
  .fx-tab{font-size:7pt;table-layout:auto}
  .fx-tab th,.fx-tab td{padding:3.2pt 3pt;white-space:nowrap}
  .fx-tab.wide{font-size:6.2pt}
  .fx-tab.wide th,.fx-tab.wide td{padding:2.8pt 2pt}
  .rowlab{min-width:0}
  .tw{overflow:visible}
  .fx-row.blank,.fx-tsec.blank{display:none !important}
  .fx-legal{margin-top:12pt;padding-top:6pt}
}
`

const JS = String.raw`
(function(){
"use strict";

var ORIGINAL = __DOCS__;
var SECTIONS = __SECTIONS__;
var BRANDNAME = __BRAND__;
var KEY = 'unibraze-fichas-v1';

var col=document.getElementById('col'), rail=document.getElementById('rail'),
    empty=document.getElementById('empty'), q=document.getElementById('q'),
    saved=document.getElementById('saved');

var docs=[], fam='all', term='';

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function esc(v){ return String(v==null?'':v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function orig(id){ for(var i=0;i<ORIGINAL.length;i++) if(ORIGINAL[i].id===id) return ORIGINAL[i]; return null; }
function famName(slug){ for(var i=0;i<SECTIONS.length;i++) if(SECTIONS[i].slug===slug) return SECTIONS[i].es; return slug; }

/* ---------- rutas ----------
   Un campo no dice qué propiedad edita sino dónde vive: "chemistry.rows.0.values.2".
   Eso permite que el mismo control sirva para un párrafo y para una celda de la
   tabla de composición, y que añadir una columna no obligue a reescribir nada. */
function get(o,path){
  var p=path.split('.'), v=o;
  for(var i=0;i<p.length;i++){ if(v==null) return ''; v=v[p[i]]; }
  return v==null?'':v;
}
function set(o,path,val){
  var p=path.split('.'), v=o;
  for(var i=0;i<p.length-1;i++){
    if(v[p[i]]==null) v[p[i]] = /^\d+$/.test(p[i+1]) ? [] : {};
    v=v[p[i]];
  }
  v[p[p.length-1]]=val;
}

/* ---------- persistencia ---------- */
var saveT=null;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(docs)); }catch(e){
    saved.textContent='Sin guardar (almacenamiento no disponible)'; return;
  }
  saved.textContent='Guardado '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
}
function queueSave(){ clearTimeout(saveT); saveT=setTimeout(save,500); }
function load(){
  try{
    var raw=localStorage.getItem(KEY); if(!raw) return false;
    var d=JSON.parse(raw);
    if(!Array.isArray(d)||!d.length) return false;
    docs=d; return true;
  }catch(e){ return false; }
}

/* ---------- campos ----------
   Un textarea que crece con su contenido. Se pone a 'auto' antes de medir
   porque el scrollHeight de un textarea ya encogido nunca reporta menos de su
   altura actual: sin ese reset el campo crece pero jamás vuelve a bajar. */
function grow(t){ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }

function fld(cls,path,ph){
  return '<textarea class="f '+cls+'" data-k="'+esc(path)+'" rows="1" placeholder="'+esc(ph||'')+'"></textarea>'+
         '<div class="m m-'+cls.slice(2)+'"></div>';
}
/* Un conjunto corto — posiciones, aprobaciones — se escribe y se lee en una
   línea separada por puntos. Siete viñetas para decir PA PB PC PD PE PF PG es
   siete líneas de papel para una sola idea. */
function fldSet(cls,path,ph){
  return '<textarea class="f '+cls+'" data-k="'+esc(path)+'" data-set="1" rows="1" placeholder="'+esc(ph||'')+'"></textarea>'+
         '<div class="m m-'+cls.slice(2)+'"></div>';
}
function fldList(cls,path,ph){
  return '<div class="lw">'+
           '<textarea class="f '+cls+'" data-k="'+esc(path)+'" data-list="1" rows="1"></textarea>'+
           '<div class="m m-list" data-ph="'+esc(ph||'')+'"></div>'+
           '<span class="hint">una línea = una viñeta</span>'+
         '</div>';
}

/* El espejo: el div que se imprime en lugar del textarea. Un div se dimensiona
   solo a cualquier ancho, así que no pierde texto al reflujo. */
function sync(t){
  var m=t.nextElementSibling;
  if(!m || m.className.indexOf('m ')!==0) m=t.parentNode.querySelector('.m');
  if(!m) return;
  if(t.dataset.list){
    var ls=t.value.split('\n').filter(function(x){ return x.trim(); });
    m.innerHTML = ls.length ? '<ul>'+ls.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>' : '';
  }else{ m.textContent=t.value; }
}

function bind(node,d){
  var tas=node.querySelectorAll('textarea.f');
  for(var i=0;i<tas.length;i++){
    (function(t){
      var path=t.dataset.k, v=get(d,path);
      t.value = t.dataset.list ? (Array.isArray(v)?v.join('\n'):String(v||''))
              : t.dataset.set  ? (Array.isArray(v)?v.join(' · '):String(v||''))
              : String(v||'');
      grow(t); sync(t);
      t.addEventListener('input', function(){
        set(d, path, t.dataset.list ? t.value.split('\n').filter(function(x){ return x.trim(); })
                   : t.dataset.set  ? t.value.split(/[·,\n]+/).map(function(x){ return x.trim(); }).filter(Boolean)
                   : t.value);
        grow(t); sync(t);
        d.edited=true; node.classList.add('dirty');
        if(path==='title'||path==='designation'){
          var a=railItem(d.id);
          if(a){ a.querySelector('.nname').textContent=d.designation||d.title; a.querySelector('.nsz').textContent='•'; }
        }
        queueSave();
      });
      var lw=t.closest('.lw');
      if(lw){
        lw.addEventListener('mousedown', function(ev){
          if(lw.classList.contains('on')) return;
          ev.preventDefault(); lw.classList.add('on'); grow(t); t.focus();
        });
        t.addEventListener('blur', function(){ lw.classList.remove('on'); sync(t); });
      }
      /* Esc devuelve ESTE campo a su valor original, sin tocar el resto de la
         ficha. Es el deshacer que se necesita nueve de cada diez veces. */
      t.addEventListener('keydown', function(ev){
        if(ev.key!=='Escape') return;
        var o=orig(d.id); if(!o) return;
        var ov=get(o,path); ev.preventDefault();
        t.value = t.dataset.list ? (Array.isArray(ov)?ov.join('\n'):String(ov||''))
                : t.dataset.set  ? (Array.isArray(ov)?ov.join(' · '):String(ov||''))
                : String(ov||'');
        set(d,path, t.dataset.list ? t.value.split('\n').filter(function(x){return x.trim();})
                  : t.dataset.set  ? t.value.split(/[·,\n]+/).map(function(x){return x.trim();}).filter(Boolean)
                  : t.value);
        grow(t); sync(t); queueSave();
      });
    })(tas[i]);
  }
}

/* ---------- piezas de la ficha ---------- */
function row(label, inner){
  return '<div class="fx-row"><div class="fx-lab">'+label+'</div><div>'+inner+'</div></div>';
}
function pairs(d, key, ka, kb, pa, pb){
  var list=d[key]||[], h='';
  for(var i=0;i<list.length;i++){
    h+='<div class="pr">'+
         fld('f-cellk', key+'.'+i+'.'+ka, pa)+
         fld('f-cell',  key+'.'+i+'.'+kb, pb)+
         '<button class="xs" data-act="rmpair" data-key="'+key+'" data-i="'+i+'" title="Quitar">×</button>'+
       '</div>';
  }
  h+='<div class="addrow"><button class="xs" data-act="addpair" data-key="'+key+'" data-a="'+ka+'" data-b="'+kb+'">+ fila</button></div>';
  return h;
}

function table(d, key, opts){
  var t=d[key]||{}, cols=t[opts.colKey]||[], rows=t.rows||[], h='';
  h+='<section class="fx-tsec"><div class="fx-tt">'+fld('f-note', key+'.note', opts.title)+
     '</div><div class="tw"><table class="fx-tab"><thead><tr>';
  /* Una tabla sin rótulo de fila — los parámetros — no tiene una columna guía
     aparte: su primera columna ES la guía. Antes se dibujaba el rótulo fijo Y
     además todas las columnas, así que la cabecera llevaba una celda más que
     el cuerpo y cada dato quedaba una columna a la izquierda de su título. */
  var c0 = opts.labelled ? 0 : 1;
  h+='<th class="rowlab">'+
     (opts.labelled ? (opts.lead||'&mdash;')
                    : fld('f-th', key+'.'+opts.colKey+'.0','Col')+
                      '<button class="xs" data-act="rmcol" data-key="'+key+'" data-ck="'+opts.colKey+'" data-i="0" title="Quitar columna">×</button>')+
     '</th>';
  for(var c=c0;c<cols.length;c++){
    h+='<th>'+fld('f-th', key+'.'+opts.colKey+'.'+c, 'Col')+
       '<button class="xs" data-act="rmcol" data-key="'+key+'" data-ck="'+opts.colKey+'" data-i="'+c+'" title="Quitar columna">×</button></th>';
  }
  h+='</tr></thead><tbody>';
  for(var r=0;r<rows.length;r++){
    h+='<tr><td class="rowlab">';
    if(opts.labelled) h+=fld('f-cellk', key+'.rows.'+r+'.label', 'Propiedad');
    else h+=fld('f-cell', key+'.rows.'+r+'.values.0', '—');
    if(opts.note) h+=fld('f-note', key+'.rows.'+r+'.note', 'nota');
    h+='<button class="xs" data-act="rmrow" data-key="'+key+'" data-i="'+r+'" title="Quitar fila">×</button></td>';
    for(var c2=c0;c2<cols.length;c2++){
      h+='<td>'+fld('f-num', key+'.rows.'+r+'.values.'+c2, '—')+'</td>';
    }
    h+='</tr>';
  }
  h+='</tbody></table></div><div class="addrow">'+
     '<button class="xs" data-act="addrow" data-key="'+key+'" data-lab="'+(opts.labelled?1:0)+'">+ fila</button>'+
     '<button class="xs" data-act="addcol" data-key="'+key+'" data-ck="'+opts.colKey+'">+ columna</button></div></section>';
  return h;
}

function fichaNode(d,n){
  var art=document.createElement('article');
  art.className='ficha'+(d.edited?' dirty':'');
  art.id='f-'+d.id;
  art.dataset.fam=d.section;
  art.innerHTML =
  '<span class="badge">editada</span>'+
  '<div class="fx-tools">'+
    '<button class="fbtn go" data-act="print">Imprimir / PDF</button>'+
    '<button class="fbtn rest">Restaurar</button>'+
    '<button class="fbtn del">Eliminar</button>'+
  '</div>'+

  '<div class="fx-head"><div class="fx-headL">'+
      '<div class="fx-kick">Ficha Técnica</div>'+
      fld('f-name','title','Designación')+
      fld('f-desig','designation','Clasificación como se escribe')+
    '</div>'+
    __MARKHEAD__+
  '</div>'+

  row('Tipo', fld('f-body','type','Qué es este consumible, en una línea'))+
  row('Propiedades', fldList('f-list','properties','Una afirmación por línea'))+
  row('Aplicación', fldList('f-list','applications','Un sector o pieza por línea'))+
  row('Clasificación', pairs(d,'classification','body','value','Norma','Designación'))+
  row('Apto para', pairs(d,'suitable','label','value','Sistema','Grados'))+
  row('Datos', pairs(d,'facts','k','v','Parámetro','—'))+
  row('Posiciones', fldSet('f-cell','positions','PA · PB · PC · PD · PE · PF · PG'))+
  row('Aprobaciones', fldSet('f-cell','approvals','CE · DB · ABS · TÜV'))+

  table(d,'chemistry',{colKey:'elements',title:'Composición química',lead:'&mdash;',labelled:true,note:true})+
  table(d,'mechanical',{colKey:'columns',title:'Propiedades mecánicas',lead:'Propiedad',labelled:true})+
  table(d,'parameters',{colKey:'columns',title:'Parámetros recomendados',lead:'Diámetro',labelled:false})+

  '<div class="fx-legal">'+fld('f-legal','notice','Aviso legal')+'</div>';

  bind(art,d);
  art.addEventListener('click', function(ev){
    var b=ev.target.closest('button'); if(!b) return;
    var act=b.dataset.act;
    if(act==='print'){ printOne(d); return; }
    if(b.classList.contains('rest')){ restore(d); return; }
    if(b.classList.contains('del')){ remove(d); return; }
    if(!act) return;
    structure(d, b);
  });
  return art;
}

/* ---------- estructura: filas y columnas ----------
   La invariante que se defiende aquí: el encabezado de una tabla y los valores
   de cada fila tienen siempre el mismo largo. Una fila con una celda de menos
   corre una medición a la columna equivocada y nadie lo nota. */
function structure(d,b){
  var act=b.dataset.act, key=b.dataset.key, i=+b.dataset.i, ck=b.dataset.ck;
  if(act==='addpair'){ (d[key]=d[key]||[]).push(defPair(b.dataset.a,b.dataset.b)); }
  else if(act==='rmpair'){ d[key].splice(i,1); }
  else if(act==='addcol'){
    var t=d[key]; t[ck].push('');
    t.rows.forEach(function(r){ r.values.push(''); });
  }
  else if(act==='rmcol'){
    var t2=d[key]; t2[ck].splice(i,1);
    t2.rows.forEach(function(r){ r.values.splice(i,1); });
  }
  else if(act==='addrow'){
    var t3=d[key], cols=(t3.elements||t3.columns||[]).length;
    var lab=b.dataset.lab==='1';
    var r={values:[]};
    for(var c=0;c<cols;c++) r.values.push('');
    if(lab){ r.label=''; r.note=''; }
    t3.rows.push(r);
  }
  else if(act==='rmrow'){ d[key].rows.splice(i,1); }
  else return;
  d.edited=true; save(); redrawOne(d);
}
function defPair(a,b){ var o={}; o[a]=''; o[b]=''; return o; }

function redrawOne(d){
  var old=document.getElementById('f-'+d.id); if(!old) return;
  var el=fichaNode(d,0);
  old.replaceWith(el);
  [].forEach.call(el.querySelectorAll('textarea.f'), function(t){ if(!t.closest('.lw')) grow(t); });
  apply();
}

/* ---------- índice ---------- */
function railItem(id){
  var as=rail.querySelectorAll('.ni');
  for(var i=0;i<as.length;i++) if(as[i].getAttribute('data-id')===id) return as[i];
  return null;
}
function buildRail(){
  var groups={}, n=0;
  docs.forEach(function(d){ (groups[d.section]=groups[d.section]||[]).push([d,++n]); });
  var h='';
  SECTIONS.forEach(function(s){
    var g=groups[s.slug]; if(!g||!g.length) return;
    h+='<div class="ng" data-fam="'+s.slug+'"><span class="ngt">'+esc(s.es)+'</span>';
    g.forEach(function(p){
      var d=p[0];
      h+='<a class="ni" href="#f-'+esc(d.id)+'" data-id="'+esc(d.id)+'" data-fam="'+esc(d.section)+'">'+
         '<span class="nn">'+(p[1]<10?'00':p[1]<100?'0':'')+p[1]+'</span>'+
         '<span class="nname">'+esc(d.designation||d.title)+'</span>'+
         '<span class="nsz">'+(d.edited?'•':'')+'</span></a>';
    });
    h+='</div>';
  });
  rail.innerHTML=h;
}

/* ---------- render ---------- */
function render(){
  var frag=document.createDocumentFragment();
  docs.forEach(function(d,i){ frag.appendChild(fichaNode(d,i+1)); });
  col.innerHTML=''; col.appendChild(frag); col.appendChild(empty);
  buildRail(); apply();
  /* Los campos se miden AQUÍ y no en bind(): dentro de un DocumentFragment no
     hay layout, y el scrollHeight de un elemento sin caja es cero — todos los
     textarea nacían con altura 0 y la ficha salía en blanco. */
  growAll();
}
function growAll(){
  [].forEach.call(col.querySelectorAll('textarea.f'), function(t){
    if(!t.closest('.lw') && t.offsetParent!==null) grow(t);
  });
}

function qtext(d){
  return ((d.designation||'')+' '+(d.title||'')+' '+(d.type||'')+' '+
    ((d.classification||[]).map(function(c){return c.body+' '+c.value;}).join(' '))+' '+
    ((d.facts||[]).map(function(f){return f.v;}).join(' '))).toLowerCase();
}
function apply(){
  var shown=0;
  docs.forEach(function(d){
    var el=document.getElementById('f-'+d.id); if(!el) return;
    var ok=(fam==='all'||d.section===fam) && (!term||qtext(d).indexOf(term)>=0);
    el.style.display=ok?'':'none'; if(ok)shown++;
    var a=railItem(d.id); if(a) a.style.display=ok?'':'none';
  });
  [].forEach.call(rail.querySelectorAll('.ng'), function(g){
    var any=[].some.call(g.querySelectorAll('.ni'), function(i){ return i.style.display!=='none'; });
    g.style.display=any?'':'none';
  });
  empty.style.display=shown?'none':'block';
  /* Una ficha oculta no tiene caja: si estaba en display:none cuando se midió,
     su altura quedó en cero. Al volver a mostrarla se remide. */
  growAll();
}

/* ---------- lo vacío no se imprime ----------
   En pantalla toda sección existe siempre: es donde se escribe. En papel una
   sección vacía es un rótulo con nada debajo, que en una ficha técnica se lee
   como «este dato es cero» y no como «este dato falta». Los espejos guardan
   exactamente el valor de cada campo, así que preguntarles a ellos es la
   comprobación exacta — los botones de estructura no cuentan como contenido. */
function hasInk(node){
  var ms=node.querySelectorAll('.m');
  for(var i=0;i<ms.length;i++) if((ms[i].textContent||'').trim()) return true;
  return false;
}
function markBlanks(){
  [].forEach.call(document.querySelectorAll('.fx-row'), function(r){
    r.classList.toggle('blank', !hasInk(r.lastElementChild));
  });
  [].forEach.call(document.querySelectorAll('.fx-tsec'), function(t){
    var body=t.querySelector('tbody');
    t.classList.toggle('blank', !body || !hasInk(body));
    /* Once an alloy reports more than eight elements the table is wider than
       the sheet. CSS cannot count columns, so it is counted here and the print
       sheet is told to set that one smaller. */
    var tab=t.querySelector('.fx-tab'), head=tab && tab.querySelector('thead tr');
    if(tab) tab.classList.toggle('wide', !!head && head.children.length>8);
  });
}
window.addEventListener('beforeprint', markBlanks);

/* ---------- imprimir una sola ----------
   El navegador imprime el documento, no un elemento, así que no se puede pedir
   «imprime esta ficha». Lo que sí se puede es marcar el cuerpo y dejar que la
   hoja de impresión oculte todas las demás — una hoja, una ficha, y el diálogo
   del navegador ofrece Guardar como PDF. */
function printOne(d){
  var el=document.getElementById('f-'+d.id); if(!el) return;
  markBlanks();
  var prev=document.title;
  document.title = (d.designation||d.title||'ficha').replace(/[\\/:*?"<>|]/g,'-');
  el.classList.add('pick'); document.body.classList.add('only');
  var done=function(){
    el.classList.remove('pick'); document.body.classList.remove('only');
    document.title=prev; window.removeEventListener('afterprint',done);
  };
  window.addEventListener('afterprint',done);
  window.print();
  /* Safari no siempre dispara afterprint. */
  setTimeout(function(){ if(document.body.classList.contains('only')) done(); }, 1500);
}

/* ---------- acciones ---------- */
function restore(d){
  var o=orig(d.id);
  if(!o){ alert('Esta ficha se añadió a mano: no tiene original al que volver. Usa Eliminar.'); return; }
  if(!confirm('Devolver «'+(d.designation||d.title)+'» a su contenido original.\nSe pierden los cambios de esta ficha.')) return;
  var i=docs.indexOf(d); docs[i]=clone(o);
  save(); render();
  var el=document.getElementById('f-'+docs[i].id); if(el) el.scrollIntoView({block:'center'});
}
function remove(d){
  if(!confirm('Eliminar «'+(d.designation||d.title)+'» del documento. ¿Continuar?')) return;
  docs.splice(docs.indexOf(d),1); save(); render();
}

document.getElementById('add').addEventListener('click', function(){
  var id='NEW'+Date.now().toString(36);
  var base=clone(ORIGINAL[0]);
  base.id=id; base.edited=true;
  base.title='NUEVA DESIGNACIÓN'; base.designation=''; base.type='';
  base.properties=[]; base.applications=[]; base.suitable=[]; base.positions=[]; base.approvals=[];
  base.classification=[{body:'',value:''}];
  base.facts=[{k:'Proceso',v:''},{k:'Forma',v:''}];
  ['chemistry','mechanical','parameters'].forEach(function(k){
    base[k].rows.forEach(function(r){
      r.values=r.values.map(function(){ return ''; });
      if('label' in r) r.label='';
      if('note' in r) r.note='';
    });
  });
  base.packaging=[]; base.section=SECTIONS[0].slug;
  docs.unshift(base); save(); render();
  var el=document.getElementById('f-'+id);
  if(el){ el.scrollIntoView({block:'center'}); el.querySelector('textarea').focus(); }
});

document.getElementById('rst').addEventListener('click', function(){
  if(!confirm('Devolver las '+ORIGINAL.length+' fichas a su contenido original.\n'+
              'Se pierde todo lo escrito y las fichas añadidas a mano. ¿Continuar?')) return;
  docs=clone(ORIGINAL); save(); render(); window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('exp').addEventListener('click', function(){
  var b=new Blob([JSON.stringify(docs,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='UNIBRAZE_Fichas_'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); },1000);
});

var file=document.getElementById('file');
document.getElementById('imp').addEventListener('click', function(){ file.click(); });
file.addEventListener('change', function(){
  var f=file.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var d=JSON.parse(r.result);
      if(!Array.isArray(d)||!d.length) throw new Error('el archivo no contiene una lista de fichas');
      docs=d; save(); render(); window.scrollTo({top:0});
      alert('Importadas '+d.length+' fichas.');
    }catch(e){ alert('No se pudo importar: '+e.message); }
    file.value='';
  };
  r.readAsText(f);
});

document.getElementById('pr').addEventListener('click', function(){ markBlanks(); window.print(); });

q.addEventListener('input', function(){ term=q.value.trim().toLowerCase(); apply(); });

var fbs=document.querySelectorAll('.filters button');
[].forEach.call(fbs, function(b){
  b.addEventListener('click', function(){
    [].forEach.call(fbs, function(x){ x.classList.remove('on'); });
    b.classList.add('on'); fam=b.dataset.f; apply();
  });
});

/* El índice marca dónde está el lector. Un observador por ficha en lugar de un
   listener de scroll: el navegador ya sabe qué hay en pantalla. */
var io=null;
function observe(){
  if(io) io.disconnect();
  if(!('IntersectionObserver' in window)) return;
  io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      var a=railItem(e.target.id.slice(2)); if(!a) return;
      [].forEach.call(rail.querySelectorAll('.ni.act'), function(x){ x.classList.remove('act'); });
      a.classList.add('act');
    });
  },{rootMargin:'-72px 0px -70% 0px'});
  [].forEach.call(col.querySelectorAll('.ficha'), function(f){ io.observe(f); });
}

if(!load()) docs=clone(ORIGINAL);
render();
observe();
var mo=new MutationObserver(function(){ observe(); });
mo.observe(col,{childList:true});
window.addEventListener('resize', growAll);
})();
`

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>${BRAND.code} · Fichas Técnicas</title>
<style>${CSS}</style>
</head>
<body>

<div class="top"><div class="topin">
  <div class="brand"><span class="lg">${MARK_SVG}</span>
    <div class="bt"><b>Fichas Técnicas</b><span>${BRAND.descriptor}</span></div></div>
  <div class="search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
      stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="q" type="search" placeholder="Buscar designación…" autocomplete="off"/>
  </div>
  <div class="acts">
    <span class="saved" id="saved"></span>
    <button class="btn" id="add">＋ Ficha</button>
    <button class="btn" id="exp">Exportar</button>
    <button class="btn" id="imp">Importar</button>
    <button class="btn" id="rst">Restaurar todo</button>
    <button class="btn dark" id="pr">Imprimir todo</button>
  </div>
</div>
<div class="tfil"><div class="filters">
  <button data-f="all" class="on">Todas</button>
  ${SECTIONS.map((s) => `<button data-f="${s.slug}">${s.es}</button>`).join('\n  ')}
</div></div></div>

<div class="wrap">
  <nav class="rail" id="rail"></nav>
  <main class="col" id="col"><div class="empty" id="empty">Sin resultados.</div></main>
</div>

<input type="file" id="file" accept="application/json" style="display:none"/>

<script>
${JS.replace('__DOCS__', json(DOCS))
  .replace('__SECTIONS__', json(SECTIONS.map((s) => ({ slug: s.slug, es: s.es }))))
  .replace('__BRAND__', json(BRAND.code))
  .replace('__MARKHEAD__', json(`<span class="fx-master">${MARK_SVG}</span>`))}
</script>
</body>
</html>
`

writeFileSync(OUT, page)
console.log(`UNIBRAZE_Fichas_Tecnicas.html  ${(page.length / 1024).toFixed(0)} kB`)
console.log(`  ${DOCS.length} fichas · ${SECTIONS.length} familias · ${Object.keys(SHEETS).length} con datos medidos`)

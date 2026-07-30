# -*- coding: utf-8 -*-
"""
PEPTIDEX — generador del módulo PROTOCOLO.

Produce dos cosas a partir de una sola fuente:

  1. PEPTIDEX_Protocolos.html   — el editor como archivo suelto
  2. PEPTIDEX_Facturador.html   — el mismo editor injertado como quinta vista

Escribirlo una vez y montarlo dos veces es lo único que garantiza que el
protocolo que sale del facturador y el que sale del archivo suelto sean el
mismo documento.  Si se mantuvieran por separado divergirían en la primera
corrección.

DECISIÓN DE DISEÑO: el documento ES el editor.  No hay panel de formulario a
un lado y vista previa al otro — se escribe directamente sobre la hoja, en los
huecos que están debajo de cada título, y lo que se ve en pantalla es
exactamente lo que sale impreso.  Los campos son textarea reales con
autocrecimiento, no contenteditable: un textarea conserva el texto plano, se
serializa sin sorpresas y no acepta HTML pegado desde otro sitio.

El contenido lo llena el usuario.  Este archivo pone los títulos y nada más,
con una única excepción deliberada: el disclosure en inglés viene redactado,
porque es texto legal fijo que debe ser idéntico en todos los protocolos y no
algo que se improvise documento a documento.  Sigue siendo editable.
"""
import json, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.dirname(HERE)
CATALOG = os.path.join(REPO, 'label-studio', 'src', 'catalog.json')
LOGOS_MASTER = json.load(open(os.path.join(HERE, 'assets', 'tlogos.json'),
                              encoding='utf-8'))['t_master']
ASSETS  = os.path.join(HERE, 'assets')
CAT = json.load(open(CATALOG, encoding='utf-8'))

STANDALONE = os.path.join(OUTDIR, 'PEPTIDEX_Protocolos.html')
# El facturador se reconstruye SIEMPRE desde la base intacta, nunca desde su
# propia salida: injertar sobre lo ya injertado apila copias del módulo.
BASE = os.path.join(HERE, 'PEPTIDEX_Facturador.base.html')
FACT = os.path.join(OUTDIR, 'PEPTIDEX_Facturador.html')

LINE_LABEL = {'fitness': 'Fitness', 'beauty': 'Beauty', 'longevity': 'Longevity'}


def catalog_js():
    """Las 118 presentaciones, aplanadas a la lista que consume el selector.

    Se aplana aquí y no en el navegador porque el orden importa: el catálogo
    ya viene ordenado por línea y por compuesto, y ese es el orden en el que
    el usuario espera encontrarlos."""
    out = []
    for line in ('fitness', 'beauty', 'longevity'):
        for cid, name, short, skus in CAT[line]:
            for sku, size in skus:
                out.append({'k': sku, 'n': name, 's': size, 'l': line,
                            'L': LINE_LABEL[line], 'c': cid})
    return out


ITEMS = catalog_js()
assert len(ITEMS) == 118, 'se esperaban 118 presentaciones, hay %d' % len(ITEMS)


# ---------------------------------------------------------------------------
# El disclosure.  Redactado en inglés porque el mercado es Estados Unidos y
# porque un deslinde sólo sirve en el idioma en que se va a leer.
# ---------------------------------------------------------------------------
DISCLOSURE = """RESEARCH USE ONLY — DISCLAIMER OF LIABILITY

The materials referenced in this document are supplied strictly as research chemicals, for in-vitro laboratory research and further chemical or analytical study only. They are not drugs, foods, dietary supplements, cosmetics or medical devices. They have not been approved or evaluated by the U.S. Food and Drug Administration, nor by any other regulatory authority, for the diagnosis, treatment, cure, mitigation or prevention of any disease or condition.

These materials are not for human or veterinary consumption. They are not intended for ingestion, injection, inhalation, topical application, or any other form of in-vivo administration, and any such use is expressly prohibited and falls entirely outside the intended and authorized use of the product.

Nothing in this document — and no statement made by PEPTIDEX or by any of its officers, employees, agents or representatives, whether written or verbal — constitutes medical advice, a medical opinion, a diagnosis, a prescription, or a recommendation for any course of treatment. No physician-patient relationship of any kind is created by this document or by the supply of these materials. Any dosage, duration, protocol, recommendation or benefit recorded in this document has been entered by the recipient at the recipient's sole initiative and reflects the recipient's own research parameters; PEPTIDEX has not reviewed, verified, endorsed or approved them, and takes no position on their appropriateness.

The recipient represents and warrants that they are at least 21 years of age, that they are a qualified researcher or professional competent to handle research chemicals, that they are legally permitted to purchase and possess these materials in their jurisdiction, and that they will handle, store, use, label and dispose of them in accordance with all applicable laws, regulations and good laboratory practice.

To the maximum extent permitted by applicable law, PEPTIDEX and its officers, directors, employees, affiliates, suppliers and agents disclaim any and all liability for any loss, injury, illness, death, damage, claim, cost or expense of any kind — whether direct, indirect, incidental, special, consequential, punitive or exemplary — arising out of or in connection with the purchase, receipt, handling, storage, transfer, misuse, or any in-vivo administration of these materials, whether or not such use was foreseeable. The recipient assumes full, exclusive and non-delegable responsibility and risk for any use made of them.

By accepting this document and the accompanying materials, the recipient acknowledges having read, understood and agreed to the foregoing in its entirety."""


# ---------------------------------------------------------------------------
CSS = r'''
/* ===================== PROTOCOLO ===================== */
#protocol{max-width:1180px;margin:0 auto;display:none;}
body.viewpro #protocol{display:block;}

.pro-bar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;background:#fff;
  border:1px solid var(--hair);border-radius:14px;padding:11px 14px;margin-bottom:16px;
  position:sticky;top:8px;z-index:20;box-shadow:0 10px 30px -26px rgba(10,20,60,.3);}
.pro-bar .glabel{font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);}
.pro-bar .sp{flex:1}
/* El facturador viste .tbtn para el chrome oscuro de la cabecera, con
   !important y color casi blanco.  Esta barra es una tarjeta blanca, así que
   ahí esos botones salían invisibles.  Se les devuelve la piel clara sólo
   dentro de .pro-bar — no se toca la regla global, que sigue siendo correcta
   donde fue escrita. */
.pro-bar .tbtn{background:#fff!important;border-color:var(--hair)!important;
  color:var(--ink)!important;font-size:12.5px;padding:9px 15px;}
.pro-bar .tbtn:hover{background:#f6f7f9!important;border-color:var(--ink)!important;}
.pro-bar #proPrint{background:var(--ink)!important;border-color:var(--ink)!important;color:#fff!important;}
.pro-bar #proPrint:hover{background:#22262e!important;}
.pro-pick{position:relative;min-width:270px;flex:1;max-width:420px}
.pro-pick input{width:100%;font-family:inherit;font-size:13px;padding:9px 13px;
  border:1px solid var(--hair);border-radius:999px;background:#fff;outline:none}
.pro-pick input:focus{border-color:var(--ink)}
.pro-drop{position:absolute;top:calc(100% + 6px);left:0;right:0;max-height:300px;overflow-y:auto;
  background:#fff;border:1px solid var(--hair);border-radius:13px;z-index:40;display:none;
  box-shadow:0 18px 50px -20px rgba(10,20,60,.3);padding:5px}
.pro-drop.on{display:block}
.pro-opt{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:9px;cursor:pointer;
  font-size:13px}
.pro-opt:hover,.pro-opt.sel{background:var(--sunk,#f4f5f7)}
.pro-opt .on1{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pro-opt .os{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;font-weight:700;
  padding:2px 7px;border-radius:5px;border:1px solid var(--hair)}
.pro-opt .ol{font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  color:var(--muted);width:66px;text-align:right}
.pro-drop .none{padding:16px;text-align:center;color:var(--muted);font-size:12.5px}

/* ---- la hoja ---- */
.pro-sheet{background:#fff;border:1px solid var(--hair);border-radius:16px;
  padding:46px 52px 54px;box-shadow:0 24px 70px -50px rgba(10,20,60,.4);}
.pro-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
  padding-bottom:20px;border-bottom:2px solid var(--ink);}
.pro-head img{height:40px;width:auto;display:block}
.pro-head .ttl{text-align:right}
.pro-head .ttl h1{font-size:27px;font-weight:800;letter-spacing:.16em;line-height:1}
.pro-head .ttl p{font-size:9.5px;letter-spacing:.28em;color:var(--muted);margin-top:5px;
  text-transform:uppercase;font-weight:700}

.pro-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--hair);}
.pro-fld{padding:15px 18px 14px;border-right:1px solid var(--hair);}
.pro-fld:last-child{border-right:none}
.pro-lbl{display:block;font-size:8.5px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;
  color:var(--muted);margin-bottom:5px;}
.pro-in{width:100%;font-family:inherit;font-size:14.5px;color:var(--ink);background:transparent;
  border:none;border-bottom:1px dashed #d5d8dd;padding:3px 0 5px;outline:none;resize:none;
  line-height:1.6;overflow:hidden;display:block;}
.pro-in:focus{border-bottom-color:var(--ink);background:#fcfcfd}
.pro-in::placeholder{color:#c3c7cd;font-style:italic}
.pro-in.big{font-size:19px;font-weight:650;letter-spacing:-.01em}

.pro-sec{padding:22px 0 4px;border-bottom:1px solid var(--hair);}
.pro-sec:last-of-type{border-bottom:none}
.pro-sec>.pro-lbl{font-size:9.5px;letter-spacing:.2em;color:var(--ink);margin-bottom:10px;
  display:flex;align-items:center;gap:9px}
.pro-sec>.pro-lbl::after{content:"";flex:1;height:1px;background:var(--hair)}

.pro-empty{padding:26px;text-align:center;border:1px dashed #d9dce1;border-radius:12px;
  color:var(--muted);font-size:13px;margin-bottom:12px}

.pro-cmp{border:1px solid var(--hair);border-radius:13px;padding:0;margin-bottom:13px;
  overflow:hidden;position:relative}
.pro-cmp::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--pl,#1b1b1b)}
.pro-cmp-h{display:flex;align-items:center;gap:11px;padding:13px 16px 13px 19px;
  background:#fafbfc;border-bottom:1px solid var(--hair)}
.pro-cmp-h .nm{font-size:16px;font-weight:720;letter-spacing:-.015em;flex:1;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pro-cmp-h .sz{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;font-weight:700;
  padding:3px 9px;border-radius:6px;border:1px solid var(--hair);background:#fff}
.pro-cmp-h .ln{font-size:8.5px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;
  color:#fff;background:var(--pl,#1b1b1b);padding:3px 9px;border-radius:999px}
.pro-x{border:none;background:transparent;cursor:pointer;font-size:17px;line-height:1;color:#b9bec5;
  padding:3px 5px;border-radius:6px}
.pro-x:hover{color:#c0392b;background:#fdf2f0}
.pro-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.pro-grid .pro-fld{border-bottom:1px solid var(--hair)}
.pro-grid .pro-fld:nth-child(2n){border-right:none}
.pro-grid .pro-fld:nth-last-child(-n+2){border-bottom:none}

.pro-disc{background:#fafbfc;border:1px solid var(--hair);border-radius:12px;padding:17px 19px;
  margin-top:4px}
.pro-disc textarea{width:100%;font-family:inherit;font-size:10.5px;line-height:1.62;color:#3f444d;
  background:transparent;border:none;outline:none;resize:none;overflow:hidden;display:block;
  white-space:pre-wrap}
.pro-disc textarea:focus{color:var(--ink)}

.pro-sign{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:40px}
.pro-sign div{border-top:1px solid var(--ink);padding-top:7px;font-size:9.5px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted);font-weight:700}
.pro-foot{margin-top:34px;padding-top:14px;border-top:1px solid var(--hair);text-align:center}
.pro-foot .a{font-size:11px;font-weight:800;letter-spacing:.34em}
.pro-foot .b{margin-top:3px;font-size:8.5px;letter-spacing:.3em;color:var(--muted)}

.pro-saved{font-size:11.5px;color:var(--muted);min-width:130px}

@media(max-width:820px){
  .pro-sheet{padding:26px 20px 34px;border-radius:12px}
  .pro-meta,.pro-grid{grid-template-columns:1fr}
  .pro-fld{border-right:none;border-bottom:1px solid var(--hair)}
  .pro-grid .pro-fld:nth-last-child(-n+2){border-bottom:1px solid var(--hair)}
  .pro-grid .pro-fld:last-child{border-bottom:none}
  .pro-sign{grid-template-columns:1fr;gap:30px}
  .pro-bar{position:static}
}

/* ---- espejo de impresión ----
   Un textarea se imprime con la altura que tenía en pantalla.  Al imprimir, la
   hoja es más estrecha que la ventana, el texto reflúe a más líneas y el
   sobrante se pierde bajo overflow:hidden.  En un disclosure legal eso no es
   un defecto cosmético: es media cláusula que desaparece del papel.

   Así que no se imprime el textarea.  Cada campo lleva al lado un div con el
   mismo texto, que no tiene altura fija porque un div se dimensiona solo a
   cualquier ancho.  En pantalla se escribe en el textarea y el div está
   oculto; al imprimir se cambian los papeles. */
.pro-mirror{display:none;white-space:pre-wrap;word-wrap:break-word;}
.pro-mirror:empty::before{content:"—";color:#c3c7cd;}

@media print{
  body.viewpro .pro-bar{display:none !important}
  body.viewpro .pro-x{display:none !important}
  body.viewpro .pro-sheet{border:none;border-radius:0;box-shadow:none;padding:0;max-width:none}
  body.viewpro textarea{display:none !important}
  body.viewpro .pro-mirror{display:block}
  body.viewpro .pro-in-m{font-size:14.5px;line-height:1.6;color:var(--ink);
    border-bottom:1px dashed #e2e4e8;padding:3px 0 5px;min-height:1.6em}
  body.viewpro .pro-in-m.big{font-size:19px;font-weight:650;letter-spacing:-.01em}
  body.viewpro .pro-disc .pro-mirror{font-size:10.5px;line-height:1.62;color:#3f444d;border:none}
  /* La hoja impresa es más estrecha que el punto de ruptura móvil, así que sin
     esto el papel heredaría la disposición de teléfono: una columna y el doble
     de páginas. */
  body.viewpro .pro-meta{grid-template-columns:repeat(3,1fr)}
  body.viewpro .pro-meta .pro-fld{border-right:1px solid var(--hair);border-bottom:none}
  body.viewpro .pro-meta .pro-fld:last-child{border-right:none}
  body.viewpro .pro-grid{grid-template-columns:1fr 1fr}
  body.viewpro .pro-grid .pro-fld{border-bottom:1px solid var(--hair)}
  body.viewpro .pro-grid .pro-fld:nth-child(2n){border-right:none}
  body.viewpro .pro-grid .pro-fld:nth-last-child(-n+2){border-bottom:none}
  body.viewpro .pro-sign{grid-template-columns:1fr 1fr;gap:44px}
  body.viewpro .pro-cmp{page-break-inside:avoid}
  body.viewpro .pro-sec{page-break-inside:auto}
  body.viewpro .pro-disc{page-break-inside:auto;background:#fafbfc !important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  body.viewpro .pro-empty{display:none}
}
'''


HTML = r'''
<div id="protocol">

  <div class="pro-bar">
    <span class="glabel">Compuesto</span>
    <div class="pro-pick">
      <input id="proQ" type="search" placeholder="Buscar entre las 118 presentaciones…" autocomplete="off"/>
      <div class="pro-drop" id="proDrop"></div>
    </div>
    <span class="sp"></span>
    <span class="pro-saved" id="proSaved"></span>
    <button class="tbtn ghost" id="proNew">＋ Nuevo</button>
    <button class="tbtn ghost" id="proClear">Vaciar</button>
    <button class="tbtn" id="proPrint">Imprimir / PDF</button>
  </div>

  <div class="pro-sheet" id="proSheet">

    <div class="pro-head">
      <img id="proLogo" alt="PEPTIDEX"/>
      <div class="ttl"><h1>PROTOCOLO</h1><p>Research Use Only</p></div>
    </div>

    <div class="pro-meta">
      <div class="pro-fld" style="grid-column:1 / -1">
        <span class="pro-lbl">Nombre del cliente</span>
        <textarea class="pro-in big" rows="1" data-k="cliente" placeholder="Nombre completo"></textarea>
      </div>
    </div>
    <div class="pro-meta">
      <div class="pro-fld"><span class="pro-lbl">Folio</span>
        <textarea class="pro-in" rows="1" data-k="folio" placeholder="—"></textarea></div>
      <div class="pro-fld"><span class="pro-lbl">Fecha</span>
        <textarea class="pro-in" rows="1" data-k="fecha" placeholder="—"></textarea></div>
      <div class="pro-fld"><span class="pro-lbl">Preparado por</span>
        <textarea class="pro-in" rows="1" data-k="por" placeholder="—"></textarea></div>
    </div>

    <div class="pro-sec">
      <span class="pro-lbl">Compuestos del protocolo</span>
      <div id="proList"></div>
      <div class="pro-empty" id="proEmpty">
        Aún no hay compuestos. Búscalos arriba y añádelos: cada uno abre su propio
        bloque de dosis, duración, recomendaciones y beneficios.
      </div>
    </div>

    <div class="pro-sec">
      <span class="pro-lbl">Notas generales</span>
      <textarea class="pro-in" rows="1" data-k="notas" placeholder="—"></textarea>
    </div>

    <div class="pro-sec">
      <span class="pro-lbl">Disclosure</span>
      <div class="pro-disc"><textarea data-k="disclosure" rows="1"></textarea></div>
    </div>

    <div class="pro-sign">
      <div>Firma del cliente</div>
      <div>PEPTIDEX</div>
    </div>

    <div class="pro-foot">
      <div class="a">PEPTIDEX</div>
      <div class="b">ENGINEERED BEYOND PERFECTION</div>
    </div>
  </div>
</div>
'''


JS = r'''
/* ================= PROTOCOLO ================= */
(function(){
  var CAT = __CATALOG__;
  var DISC = __DISCLOSURE__;
  var TINT = {fitness:'#1b1b1b', beauty:'#8a4f2e', longevity:'#023473'};
  var KEY  = 'px-protocolo';

  var q      = document.getElementById('proQ'),
      drop   = document.getElementById('proDrop'),
      list   = document.getElementById('proList'),
      empty  = document.getElementById('proEmpty'),
      sheet  = document.getElementById('proSheet'),
      saved  = document.getElementById('proSaved');
  if(!sheet) return;

  var doc = {cliente:'',folio:'',fecha:'',por:'',notas:'',disclosure:DISC,items:[]};
  var sel = 0, hits = [];

  function esc(v){return String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  /* Un textarea que crece con su contenido.  Se pone a 'auto' primero porque
     scrollHeight de un textarea ya encogido nunca reporta menos de su altura
     actual: sin ese reset el campo crece pero jamás vuelve a bajar. */
  function grow(t){ t.style.height='auto'; t.style.height=(t.scrollHeight)+'px'; sync(t); }

  /* Cada textarea lleva un div gemelo que sólo existe para el papel.  Se crea
     la primera vez que se toca el campo y desde ahí lleva su mismo texto. */
  function sync(t){
    var m=t.nextElementSibling;
    if(!m || !m.classList.contains('pro-mirror')){
      m=document.createElement('div');
      m.className='pro-mirror'+(t.classList.contains('pro-in')?' pro-in-m':'')+
                  (t.classList.contains('big')?' big':'');
      t.parentNode.insertBefore(m, t.nextSibling);
    }
    m.textContent=t.value;
  }
  function growAll(){ [].forEach.call(sheet.querySelectorAll('textarea'), grow); }

  /* ---- persistencia ---- */
  var saveT=null;
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(doc)); }catch(e){}
    saved.textContent='Guardado '+new Date().toLocaleTimeString('es-MX',
      {hour:'2-digit',minute:'2-digit'});
  }
  function queueSave(){ clearTimeout(saveT); saveT=setTimeout(save,500); }
  function load(){
    try{
      var raw=localStorage.getItem(KEY); if(!raw) return false;
      var d=JSON.parse(raw); if(!d||typeof d!=='object') return false;
      doc={cliente:d.cliente||'',folio:d.folio||'',fecha:d.fecha||'',por:d.por||'',
           notas:d.notas||'',disclosure:(typeof d.disclosure==='string'?d.disclosure:DISC),
           items:Array.isArray(d.items)?d.items:[]};
      return true;
    }catch(e){ return false; }
  }

  /* ---- campos de la hoja (los de nivel documento, que no se reconstruyen) ---- */
  function bindDocFields(){
    [].forEach.call(sheet.querySelectorAll('[data-k]'), function(t){
      if(t.closest('.pro-cmp')) return;
      t.value = doc[t.dataset.k] || '';
      grow(t);
      t.addEventListener('input', function(){
        doc[t.dataset.k]=t.value; grow(t); queueSave();
      });
    });
  }

  /* ---- bloques de compuesto ----
     Se reconstruye la lista entera al añadir o quitar, pero NUNCA al teclear:
     los campos se enlazan una vez y escriben directo sobre el objeto.  Volver
     a pintar mientras alguien escribe le quita el cursor de las manos. */
  function renderItems(){
    list.innerHTML='';
    doc.items.forEach(function(it, i){
      var d=document.createElement('div');
      d.className='pro-cmp';
      d.style.setProperty('--pl', TINT[it.l]||'#1b1b1b');
      d.innerHTML =
        '<div class="pro-cmp-h">'+
          '<span class="ln">'+esc(it.L)+'</span>'+
          '<span class="nm">'+esc(it.n)+'</span>'+
          '<span class="sz">'+esc(it.s)+'</span>'+
          '<button class="pro-x" title="Quitar">✕</button>'+
        '</div>'+
        '<div class="pro-grid">'+
          fld('Dosis','dosis')+ fld('Duración','duracion')+
          fld('Recomendaciones','recos')+ fld('Beneficios','benef')+
        '</div>';
      d.querySelector('.pro-x').addEventListener('click', function(){
        doc.items.splice(i,1); renderItems(); save();
      });
      [].forEach.call(d.querySelectorAll('textarea'), function(t){
        var k=t.dataset.k;
        t.value = it[k]||'';
        t.addEventListener('input', function(){ it[k]=t.value; grow(t); queueSave(); });
      });
      list.appendChild(d);
      [].forEach.call(d.querySelectorAll('textarea'), grow);
    });
    empty.style.display = doc.items.length ? 'none' : 'block';
  }
  function fld(label,k){
    return '<div class="pro-fld"><span class="pro-lbl">'+label+'</span>'+
           '<textarea class="pro-in" rows="1" data-k="'+k+'" placeholder="—"></textarea></div>';
  }

  /* ---- selector de las 118 presentaciones ---- */
  function search(term){
    term=(term||'').trim().toLowerCase();
    if(!term) return CAT.slice(0,40);
    return CAT.filter(function(o){
      return (o.n+' '+o.s+' '+o.k+' '+o.L).toLowerCase().indexOf(term)>=0;
    }).slice(0,60);
  }
  function paintDrop(){
    if(!hits.length){ drop.innerHTML='<div class="none">Sin resultados.</div>'; return; }
    drop.innerHTML = hits.map(function(o,i){
      return '<div class="pro-opt'+(i===sel?' sel':'')+'" data-i="'+i+'">'+
             '<span class="on1">'+esc(o.n)+'</span>'+
             '<span class="os">'+esc(o.s)+'</span>'+
             '<span class="ol">'+esc(o.L)+'</span></div>';
    }).join('');
    [].forEach.call(drop.querySelectorAll('.pro-opt'), function(el){
      el.addEventListener('mousedown', function(ev){
        ev.preventDefault(); add(hits[+el.dataset.i]);
      });
    });
  }
  function openDrop(){ hits=search(q.value); sel=0; paintDrop(); drop.classList.add('on'); }
  function closeDrop(){ drop.classList.remove('on'); }

  function add(o){
    if(!o) return;
    doc.items.push({k:o.k,n:o.n,s:o.s,l:o.l,L:o.L,
                    dosis:'',duracion:'',recos:'',benef:''});
    renderItems(); save();
    q.value=''; closeDrop();
    var last=list.lastElementChild;
    if(last){ var ta=last.querySelector('textarea'); if(ta) ta.focus(); }
  }

  q.addEventListener('focus', openDrop);
  q.addEventListener('input', openDrop);
  q.addEventListener('blur', function(){ setTimeout(closeDrop,140); });
  q.addEventListener('keydown', function(ev){
    if(!drop.classList.contains('on')) return;
    if(ev.key==='ArrowDown'){ ev.preventDefault(); sel=Math.min(sel+1,hits.length-1); paintDrop(); scrollSel(); }
    else if(ev.key==='ArrowUp'){ ev.preventDefault(); sel=Math.max(sel-1,0); paintDrop(); scrollSel(); }
    else if(ev.key==='Enter'){ ev.preventDefault(); add(hits[sel]); }
    else if(ev.key==='Escape'){ closeDrop(); q.blur(); }
  });
  function scrollSel(){
    var el=drop.querySelector('.pro-opt.sel'); if(!el) return;
    var r=el.getBoundingClientRect(), d=drop.getBoundingClientRect();
    if(r.bottom>d.bottom) drop.scrollTop += r.bottom-d.bottom;
    if(r.top<d.top)       drop.scrollTop -= d.top-r.top;
  }

  /* ---- acciones ---- */
  document.getElementById('proPrint').addEventListener('click', function(){ window.print(); });
  document.getElementById('proNew').addEventListener('click', function(){
    if(!confirm('Empezar un protocolo nuevo. Se pierde lo que no hayas impreso o guardado. ¿Continuar?')) return;
    doc={cliente:'',folio:'',fecha:new Date().toLocaleDateString('es-MX',
          {day:'2-digit',month:'long',year:'numeric'}),por:'',notas:'',disclosure:DISC,items:[]};
    bindDocFields(); renderItems(); growAll(); save();
  });
  document.getElementById('proClear').addEventListener('click', function(){
    if(!confirm('Vaciar todos los campos de este protocolo. ¿Continuar?')) return;
    doc.cliente=doc.folio=doc.fecha=doc.por=doc.notas=''; doc.items=[];
    bindDocFields(); renderItems(); growAll(); save();
  });

  /* ---- arranque ---- */
  if(!load()){
    doc.fecha=new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
  }
  bindDocFields(); renderItems();
  /* Un textarea mide mal mientras su contenedor está en display:none — el
     scrollHeight de un elemento sin caja es cero.  Se remide al entrar en la
     vista y al cambiar el ancho de la ventana. */
  window.addEventListener('resize', growAll);
  window.PX_PROTOCOL_SHOWN = growAll;
  growAll();
})();
'''


def js_payload():
    js = JS.replace('__CATALOG__', json.dumps(ITEMS, ensure_ascii=False))
    js = js.replace('__DISCLOSURE__', json.dumps(DISCLOSURE, ensure_ascii=False))
    return js


# ---------------------------------------------------------------------------
# 1. Injerto en el facturador
# ---------------------------------------------------------------------------
def patch_facturador():
    """Injerta el módulo en una copia intacta del facturador.

    Se lee siempre de BASE y se escribe siempre en FACT.  Nunca se lee de FACT:
    la primera versión de esta función parcheaba el archivo en su sitio y
    guardaba un .orig al lado, y bastaba un segundo `python3 build_protocolo.py`
    para acabar con el módulo duplicado dentro del documento.  Leyendo de una
    fuente que nunca se escribe, reconstruir es idempotente por construcción.
    """
    s = open(BASE, encoding='utf-8').read()
    assert 'id="protocol"' not in s, 'la base ya trae el módulo — no es una base limpia'

    # --- CSS: justo antes del cierre del <style> que contiene las vistas ---
    anchor = '  body.viewana #analytics{display:block;}'
    assert anchor in s, 'no se encontró el ancla de CSS de vistas'
    s = s.replace(anchor, anchor + '\n' + CSS, 1)

    # --- botón de la barra segmentada ---
    seg = '<button id="vAna">Visitas</button>'
    assert seg in s
    s = s.replace(seg, seg + '\n    <button id="vPro">Protocolo</button>', 1)

    # --- ocultar la hoja de factura y la barra de documento en esta vista ---
    hide = '  body.viewana .sheet,body.viewana .cstrip,body.viewana #docBar,body.viewana #docHint{display:none;}'
    assert hide in s
    s = s.replace(hide, hide +
        '\n  body.viewpro .sheet,body.viewpro .cstrip,body.viewpro #docBar,body.viewpro #docHint{display:none;}', 1)

    # --- markup: después del bloque de analítica ---
    m = re.search(r'\n<div id="analytics">', s)
    assert m, 'no se encontró #analytics'
    depth, i, n = 0, m.start() + 1, len(s)
    while i < n:                                   # recorrer hasta cerrar el div
        if s.startswith('<div', i):
            depth += 1; i += 4
        elif s.startswith('</div>', i):
            depth -= 1; i += 6
            if depth == 0:
                break
        else:
            i += 1
    assert depth == 0, 'no se pudo cerrar #analytics'
    s = s[:i] + '\n' + HTML + s[i:]

    # --- JS: vistas ---
    s = s.replace("const VIEWS=['vDoc','vReg','vOrd','vAna'];",
                  "const VIEWS=['vDoc','vReg','vOrd','vAna','vPro'];", 1)
    s = s.replace(
        "function setViewDoc(){document.body.classList.remove('viewreg','vieworders','viewana');setSeg('vDoc');}",
        "function setViewDoc(){document.body.classList.remove('viewreg','vieworders','viewana','viewpro');setSeg('vDoc');}", 1)
    for a, b in [
        ("function setViewReg(){document.body.classList.remove('vieworders','viewana');",
         "function setViewReg(){document.body.classList.remove('vieworders','viewana','viewpro');"),
        ("function setViewOrders(){document.body.classList.remove('viewreg','viewana');",
         "function setViewOrders(){document.body.classList.remove('viewreg','viewana','viewpro');"),
    ]:
        assert a in s, a[:50]
        s = s.replace(a, b, 1)
    s = s.replace("function setViewAna(){document.body.classList.remove('viewreg','vieworders');document.body.classList.add('viewana');setSeg('vAna');loadStats();}",
        "function setViewAna(){document.body.classList.remove('viewreg','vieworders','viewpro');document.body.classList.add('viewana');setSeg('vAna');loadStats();}\n"
        "/* Los textarea de la hoja miden mal mientras la vista está oculta: un\n"
        "   elemento sin caja reporta scrollHeight 0. Se remiden al mostrarla. */\n"
        "function setViewPro(){document.body.classList.remove('viewreg','vieworders','viewana');document.body.classList.add('viewpro');setSeg('vPro');\n"
        "  if(window.PX_PROTOCOL_SHOWN) requestAnimationFrame(window.PX_PROTOCOL_SHOWN);}", 1)
    s = s.replace("$('vAna').onclick=setViewAna;",
                  "$('vAna').onclick=setViewAna;\n$('vPro').onclick=setViewPro;", 1)

    # --- JS del módulo + logo, justo antes del </script> final ---
    tail = s.rstrip().rfind('</script>')
    assert tail > 0
    boot = ("\n{ var _pl=document.getElementById('proLogo');\n"
            "  if(_pl) _pl.src=document.getElementById('logo').src; }\n")
    s = s[:tail] + boot + js_payload() + '\n' + s[tail:]

    open(FACT, 'w', encoding='utf-8').write(s)
    print('  PEPTIDEX_Facturador.html  %.1f KB  (vista Protocolo añadida)'
          % (len(s.encode()) / 1024))


# ---------------------------------------------------------------------------
# 2. El editor como archivo suelto
# ---------------------------------------------------------------------------
def build_standalone():
    src = open(BASE, encoding='utf-8').read()
    m = re.search(r'<img id="logo" src="(data:image/[^"]+)"', src)
    assert m, 'no se encontró el logo en el facturador'
    build_standalone_from(m.group(1))


def build_standalone_from(logo):
    # Sin el facturador a mano se cae al logo de marca de assets/, que es el
    # mismo dibujo en otro formato.
    if logo is None:
        logo = LOGOS_MASTER

    doc = STANDALONE_TPL.replace('__CSS__', CSS)\
                        .replace('__HTML__', HTML)\
                        .replace('__JS__', js_payload())\
                        .replace('__LOGO__', logo)
    open(STANDALONE, 'w', encoding='utf-8').write(doc)
    print('  PEPTIDEX_Protocolos.html  %.1f KB' % (len(doc.encode()) / 1024))


STANDALONE_TPL = r'''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>PEPTIDEX · Protocolo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--ink:#0b0d12;--ink2:#4d525c;--muted:#8a9099;--hair:#e6e8ec;--sunk:#f4f5f7;--accent:#1e5eff;}
body{font-family:"Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
  Helvetica,Arial,sans-serif;color:var(--ink);background:#f6f7f9;font-size:15px;line-height:1.6;
  -webkit-font-smoothing:antialiased;padding:22px 18px 70px;}
.tbtn{font-family:inherit;font-size:12.5px;font-weight:650;padding:9px 15px;border-radius:999px;
  border:1px solid var(--ink);background:var(--ink);color:#fff;cursor:pointer;white-space:nowrap}
.tbtn:hover{opacity:.86}
.tbtn.ghost{background:transparent;border-color:var(--hair);color:var(--ink)}
.tbtn.ghost:hover{border-color:var(--ink);opacity:1}
__CSS__
#protocol{display:block}
@media print{ body{background:#fff;padding:0} }
</style></head>
<body class="viewpro">
__HTML__
<script>
document.getElementById('proLogo').src='__LOGO__';
__JS__
</script>
</body></html>'''


if __name__ == '__main__':
    # El facturador no está versionado: lleva claves de Supabase embebidas y la
    # protección de secretos de GitHub bloquea el push.  Si la base no está
    # presente se genera sólo el editor suelto, que es autosuficiente.
    if os.path.exists(BASE):
        patch_facturador()
        build_standalone()
    else:
        print('  (sin PEPTIDEX_Facturador.base.html — se omite el injerto)')
        build_standalone_from(None)

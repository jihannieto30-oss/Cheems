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



# El aviso regulatorio del documento aprobado, palabra por palabra.  Va al pie
# de la hoja igual que en la ficha técnica: los dos documentos salen de la misma
# casa y deben cerrar igual.
LEGAL = ('Regulatory Notice & Legal Disclaimer: All compounds provided by PeptideX are sold '
         'for laboratory research and analytical reference use only (RUO). By purchasing this '
         'material, the buyer assumes absolute, sole, and unconditional liability for any '
         'handling, storage, application, or misuse of the product. PeptideX disclaims any and '
         'all responsibility for damages, adverse effects, or consequences resulting from any '
         'use outside of strictly controlled research protocols by professionals.')

# Rótulos de sección.  Editables como todo lo demás; esto es sólo el arranque.
SEC = ['DATOS DEL CLIENTE',
       'COMPUESTOS DEL PROTOCOLO',
       'RECOMENDACIONES GENERALES',
       'ALMACENAMIENTO Y MANEJO',
       'SEGUIMIENTO Y REVISIÓN',
       'NOTAS']

# Campos de cada compuesto.  Seis, no cuatro: se añadieron vía y frecuencia,
# que son las dos preguntas que el documento anterior dejaba sin sitio y que
# terminaban escritas a mano en el margen.
CFIELDS = [('dosis', 'Dosis'), ('frecuencia', 'Frecuencia'), ('via', 'Vía'),
           ('duracion', 'Duración'), ('recos', 'Recomendaciones'), ('benef', 'Beneficios')]


# ---------------------------------------------------------------------------
CSS = r'''
/* ===================== PROTOCOLO =====================
   Misma casa que la ficha técnica: logo maestro, sello RUO, secciones
   numeradas sobre barra azul y el aviso regulatorio al pie.  Los dos
   documentos salen del mismo cliente y no deberían parecer de dos empresas.

   NO HAY CAMPO «PREPARADO POR».  Se retiró a propósito: nombra a una persona
   en un documento que lleva dosis, y eso es exactamente la firma que no
   conviene que exista.  El disclosure hace el trabajo contrario — deja por
   escrito que la pauta la fija quien recibe.
   =============================================================== */
#protocol{max-width:1180px;margin:0 auto;display:none;}
body.viewpro #protocol{display:block;}
#protocol{--pnav1:#0f275e;--pnav2:#1b449b;--pink:#101010;--pink2:#3a3f46;
  --pmut:#8a9099;--phair:#dcdfe4;--pedit:#1e5eff;
  --pfont:Arial,"Helvetica Neue",Helvetica,"Segoe UI",Roboto,sans-serif;
  --pmono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;}

.pro-bar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;background:#fff;
  border:1px solid var(--phair);border-radius:14px;padding:11px 14px;margin-bottom:16px;
  position:sticky;top:8px;z-index:20;box-shadow:0 10px 30px -26px rgba(10,20,60,.3);}
.pro-bar .glabel{font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--pmut);}
.pro-bar .sp{flex:1}
/* El facturador viste .tbtn para el chrome oscuro de su cabecera, con
   !important y color casi blanco.  Esta barra es una tarjeta blanca, así que
   ahí esos botones salían invisibles.  Se les devuelve la piel clara sólo
   dentro de .pro-bar — la regla global sigue siendo correcta donde se escribió. */
.pro-bar .tbtn{background:#fff!important;border-color:var(--phair)!important;
  color:var(--pink)!important;font-size:12px;padding:8px 14px;}
.pro-bar .tbtn:hover{background:#f6f7f9!important;border-color:var(--pnav1)!important;}
.pro-bar #proPrint{background:var(--pnav1)!important;border-color:var(--pnav1)!important;color:#fff!important;}
.pro-bar #proPrint:hover{background:#16346f!important;}
.pro-saved{font-size:11px;color:var(--pmut);min-width:120px}

.pro-pick{position:relative;min-width:250px;flex:1;max-width:400px}
.pro-pick input{width:100%;font-family:inherit;font-size:13px;padding:9px 13px;
  border:1px solid var(--phair);border-radius:999px;background:#fff;outline:none;color:var(--pink)}
.pro-pick input:focus{border-color:var(--pnav1)}
.pro-drop{position:absolute;top:calc(100% + 6px);left:0;right:0;max-height:300px;overflow-y:auto;
  background:#fff;border:1px solid var(--phair);border-radius:13px;z-index:40;display:none;
  box-shadow:0 18px 50px -20px rgba(10,20,60,.3);padding:5px}
.pro-drop.on{display:block}
.pro-opt{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:9px;cursor:pointer;
  font-size:13px;color:var(--pink)}
.pro-opt:hover,.pro-opt.sel{background:#f2f4f7}
.pro-opt .on1{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pro-opt .os{font-family:var(--pmono);font-size:11px;font-weight:700;padding:2px 7px;
  border-radius:5px;border:1px solid var(--phair)}
.pro-opt .ol{font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  color:var(--pmut);width:66px;text-align:right}
.pro-drop .none{padding:16px;text-align:center;color:var(--pmut);font-size:12.5px}

/* ---------------- la hoja ---------------- */
.pro-sheet{background:#fff;border:1px solid var(--phair);border-radius:4px;
  padding:34px 42px 30px;box-shadow:0 16px 50px -40px rgba(10,20,60,.5);
  font-family:var(--pfont);color:var(--pink);font-size:14px;line-height:1.55}

.pro-head{text-align:center;padding-bottom:14px}
.pro-master{height:70px;width:auto;display:block;margin:0 auto 12px}
.pro-title{font-size:27px;font-weight:700;letter-spacing:.3em;line-height:1.1;text-transform:uppercase}
.pro-ruo{display:inline-block;border:1px solid var(--pnav1);color:var(--pnav1);border-radius:999px;
  padding:3px 16px;font-size:8.5px;font-weight:700;letter-spacing:.22em;margin-top:10px}
.pro-rule{margin-top:14px;border-top:1px solid var(--phair)}

.pro-sec{display:flex;align-items:center;gap:11px;margin:18px 0 9px;padding:6px 12px;
  background:linear-gradient(90deg,var(--pnav1),var(--pnav2));border-radius:2px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.pro-n{flex-shrink:0;width:17px;height:17px;border-radius:50%;border:1px solid rgba(255,255,255,.85);
  color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1}
.pro-sec .pf{color:#fff}
.pro-sec .pf:hover{border-bottom-color:rgba(255,255,255,.5)}
.pro-sec .pf:focus{border-bottom-color:#fff;background:rgba(255,255,255,.12)}

/* datos del cliente: rejilla de rótulo + hueco */
.pro-meta{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--phair)}
.pro-fld{padding:9px 12px;border-right:1px solid var(--phair);min-width:0}
.pro-fld:last-child{border-right:none}
.pro-meta.wide{grid-template-columns:1fr;border-top:none}
.pro-lbl{display:block;font-size:8.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--pmut);margin-bottom:3px}

/* compuestos */
.pro-empty{padding:22px;text-align:center;border:1px dashed #c9cfd8;border-radius:4px;
  color:var(--pmut);font-size:12.5px}
.pro-cmp{border:1px solid var(--phair);margin-bottom:11px;position:relative}
.pro-cmp::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--pl,#1b1b1b)}
.pro-cmp-h{display:flex;align-items:center;gap:10px;padding:9px 13px 9px 16px;background:#f6f7f9;
  border-bottom:1px solid var(--phair);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pro-cmp-h .ln{font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:#fff;background:var(--pl,#1b1b1b);padding:3px 8px;border-radius:999px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.pro-cmp-h .nm{font-size:14.5px;font-weight:700;flex:1;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.pro-cmp-h .sz{font-family:var(--pmono);font-size:11px;font-weight:700;padding:2px 8px;
  border-radius:4px;border:1px solid var(--phair);background:#fff}
.pro-x{border:none;background:transparent;cursor:pointer;font-size:15px;line-height:1;color:#b9bec5;
  padding:2px 5px;border-radius:5px}
.pro-x:hover{color:#c0392b;background:#fdf2f0}
.pro-grid{display:grid;grid-template-columns:repeat(4,1fr)}
.pro-grid .pro-fld{border-bottom:1px solid var(--phair)}
.pro-grid .pro-fld:nth-child(4n){border-right:none}
.pro-grid .pro-fld:nth-last-child(-n+2){border-bottom:none}
.pro-grid .pro-fld.span2{grid-column:span 2}
.pro-grid .pro-fld.span2:last-child{border-right:none}

/* disclosure y cierre */
.pro-disc{background:#f8f9fb;border:1px solid var(--phair);padding:14px 16px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.pro-sign{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:34px}
.pro-sign div{border-top:1px solid var(--pink);padding-top:6px;font-size:9px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--pmut);font-weight:700}
.pro-legal{margin-top:22px;padding-top:11px;border-top:1px solid var(--phair);text-align:center}
.pro-foot{margin-top:16px;text-align:center}
.pro-foot .a{font-size:10px;font-weight:800;letter-spacing:.34em}
.pro-foot .b{margin-top:3px;font-size:8px;letter-spacing:.3em;color:var(--pmut)}

/* ---------------- campos editables ----------------
   Mismo trato que en la ficha: en reposo la hoja se lee como el impreso, y el
   subrayado sólo aparece al pasar por encima. */
.pf{width:100%;font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;
  font-weight:inherit;letter-spacing:inherit;text-align:inherit;text-transform:inherit;
  background:transparent;border:none;border-bottom:1px dashed transparent;padding:0;
  outline:none;resize:none;overflow:hidden;display:block;border-radius:2px;
  transition:border-color .15s,background .15s}
.pf:hover{border-bottom-color:#d8dce2}
.pf:focus{border-bottom-color:var(--pedit);background:#f5f8ff}
.pf::placeholder{color:#b9c0c9;font-style:italic;font-weight:400;letter-spacing:0;text-transform:none}
.pf-title{font-size:27px;font-weight:700;letter-spacing:.3em;text-align:center;text-transform:uppercase}
.pf-sect{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.pf-lbl{font-size:8.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--pmut)}
.pf-val{font-size:13px;line-height:1.55;color:var(--pink)}
.pf-big{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--pink)}
.pf-list{font-size:12.5px;line-height:1.6;color:var(--pink2)}
.pf-disc{font-size:9.5px;line-height:1.6;color:var(--pink2);white-space:pre-wrap}
.pf-legal{font-size:9px;line-height:1.5;color:var(--pink2);font-style:italic;font-weight:700;
  text-align:center}
.phint{font-size:8.5px;color:#c2c7ce;letter-spacing:.04em;margin-top:2px;display:block}

/* espejo de impresión + turno campo/espejo para las listas */
.pm{display:none;white-space:pre-wrap;word-wrap:break-word}
.pm ul{list-style:none;margin:0;padding:0}
.pm li{padding-left:14px;position:relative;margin-bottom:2px}
.pm li::before{content:"\25cf";position:absolute;left:0;top:0;font-size:.72em;line-height:1.9;
  color:var(--pnav1)}
.plw{position:relative;cursor:text;border-bottom:1px dashed transparent;border-radius:2px}
.plw:hover{border-bottom-color:#d8dce2}
.plw .pm{display:block}
.plw.on .pm{display:none}
.plw .pf{display:none}
.plw.on .pf{display:block}
.plw .pm:empty::before{content:attr(data-ph);color:#b9c0c9;font-style:italic;position:static}

@media(max-width:900px){
  .pro-sheet{padding:22px 18px 26px}
  .pro-meta,.pro-grid{grid-template-columns:1fr}
  .pro-fld{border-right:none;border-bottom:1px solid var(--phair)}
  .pro-grid .pro-fld.span2{grid-column:span 1}
  .pro-sign{grid-template-columns:1fr;gap:26px}
  .pro-bar{position:static}
}

/* ============================================================================
   IMPRESIÓN

   Dos trampas, las mismas que en la ficha.  La hoja Carta con márgenes mide
   unos 732 px de CSS, por debajo del punto de ruptura de móvil: sin forzarlo
   el papel heredaría la disposición de teléfono.  Y un textarea se imprime con
   la altura que midió en pantalla, así que se imprimen los espejos — que es lo
   que evitó que el disclosure perdiera tres párrafos por debajo del corte.
   ============================================================================ */
@media print{
  body.viewpro .pro-bar,body.viewpro .pro-x,body.viewpro .phint{display:none !important}
  body.viewpro .pro-sheet{border:none;border-radius:0;box-shadow:none;padding:0;max-width:none;
    font-size:9.6pt}
  body.viewpro textarea{display:none !important}
  body.viewpro .pm{display:block}
  body.viewpro .pm-title{font-size:19pt;font-weight:700;letter-spacing:.3em;text-align:center;
    text-transform:uppercase}
  body.viewpro .pm-sect{font-size:8.4pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    color:#fff}
  body.viewpro .pm-lbl{font-size:6.6pt;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
    color:var(--pmut)}
  body.viewpro .pm-val{font-size:9pt;color:var(--pink);min-height:1.5em;
    border-bottom:1px dashed #e2e4e8}
  body.viewpro .pm-big{font-size:13pt;font-weight:700;color:var(--pink);min-height:1.4em;
    border-bottom:1px dashed #e2e4e8}
  body.viewpro .pm-list{font-size:8.8pt;line-height:1.45;color:var(--pink2)}
  body.viewpro .pm-list:empty{min-height:3.6em;border-bottom:1px dashed #dfe2e7}
  body.viewpro .pm-disc{font-size:7pt;line-height:1.5;color:var(--pink2)}
  body.viewpro .pm-legal{font-size:6.4pt;line-height:1.42;font-style:italic;font-weight:700;
    text-align:center;color:var(--pink2)}
  /* El hueco impreso no lleva el texto guía de la aplicación: es una
     instrucción de pantalla colada en un documento de cliente. */
  body.viewpro .pm:empty::before{content:"" !important}

  body.viewpro .pro-master{height:46pt;margin-bottom:8pt}
  body.viewpro .pro-meta{grid-template-columns:repeat(3,1fr)}
  body.viewpro .pro-grid{grid-template-columns:repeat(4,1fr)}
  body.viewpro .pro-fld{border-right:1px solid var(--phair);border-bottom:none;padding:5pt 8pt}
  body.viewpro .pro-fld:last-child{border-right:none}
  body.viewpro .pro-grid .pro-fld{border-bottom:1px solid var(--phair)}
  body.viewpro .pro-grid .pro-fld:nth-child(4n){border-right:none}
  body.viewpro .pro-grid .pro-fld.span2:last-child{border-right:none}
  body.viewpro .pro-grid .pro-fld:nth-last-child(-n+2){border-bottom:none}
  body.viewpro .pro-sign{grid-template-columns:1fr 1fr;gap:40pt}
  body.viewpro .pro-sec{margin:11pt 0 5pt;padding:3.5pt 9pt;page-break-after:avoid;
    page-break-inside:avoid}
  body.viewpro .pro-n{width:11pt;height:11pt;font-size:6.6pt}
  body.viewpro .pro-cmp{page-break-inside:avoid;margin-bottom:7pt}
  body.viewpro .pro-disc{page-break-inside:auto}
  body.viewpro .pro-empty{display:none}
  body.viewpro .pro-legal{margin-top:14pt;padding-top:7pt}
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
    <button class="tbtn ghost" id="proExp">Exportar</button>
    <button class="tbtn ghost" id="proImp">Importar</button>
    <button class="tbtn ghost" id="proClear">Vaciar</button>
    <button class="tbtn" id="proPrint">Imprimir / PDF</button>
  </div>

  <div class="pro-sheet" id="proSheet">

    <div class="pro-head">
      <img class="pro-master" id="proLogo" alt="PEPTIDEX"/>
      <div class="pro-title"><textarea class="pf pf-title" data-k="titulo" rows="1"></textarea>
        <div class="pm pm-title"></div></div>
      <div class="pro-ruo">RUO · RESEARCH USE ONLY</div>
    </div>
    <div class="pro-rule"></div>

    <div class="pro-sec"><span class="pro-n">1</span>
      <textarea class="pf pf-sect" data-k="s1" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="pro-meta wide">
      <div class="pro-fld">
        <span class="pro-lbl"><textarea class="pf pf-lbl" data-k="kCliente" rows="1"></textarea>
          <div class="pm pm-lbl"></div></span>
        <textarea class="pf pf-big" data-k="cliente" rows="1" placeholder="Nombre completo"></textarea>
        <div class="pm pm-big"></div>
      </div>
    </div>
    <div class="pro-meta">
      <div class="pro-fld">
        <span class="pro-lbl"><textarea class="pf pf-lbl" data-k="kFolio" rows="1"></textarea>
          <div class="pm pm-lbl"></div></span>
        <textarea class="pf pf-val" data-k="folio" rows="1"></textarea><div class="pm pm-val"></div>
      </div>
      <div class="pro-fld">
        <span class="pro-lbl"><textarea class="pf pf-lbl" data-k="kFecha" rows="1"></textarea>
          <div class="pm pm-lbl"></div></span>
        <textarea class="pf pf-val" data-k="fecha" rows="1"></textarea><div class="pm pm-val"></div>
      </div>
      <div class="pro-fld">
        <span class="pro-lbl"><textarea class="pf pf-lbl" data-k="kContacto" rows="1"></textarea>
          <div class="pm pm-lbl"></div></span>
        <textarea class="pf pf-val" data-k="contacto" rows="1"></textarea><div class="pm pm-val"></div>
      </div>
    </div>

    <div class="pro-sec"><span class="pro-n">2</span>
      <textarea class="pf pf-sect" data-k="s2" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div id="proList"></div>
    <div class="pro-empty" id="proEmpty">
      Aún no hay compuestos. Búscalos en la barra de arriba: cada uno abre su propio
      bloque de dosis, frecuencia, vía, duración, recomendaciones y beneficios.
    </div>

    <div class="pro-sec"><span class="pro-n">3</span>
      <textarea class="pf pf-sect" data-k="s3" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="plw"><textarea class="pf pf-list" data-k="general" data-list="1" rows="1"></textarea>
      <div class="pm pm-list" data-ph="Escribe aquí las recomendaciones generales — una línea por viñeta"></div>
      <span class="phint">una línea = una viñeta</span></div>

    <div class="pro-sec"><span class="pro-n">4</span>
      <textarea class="pf pf-sect" data-k="s4" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="plw"><textarea class="pf pf-list" data-k="almacen" data-list="1" rows="1"></textarea>
      <div class="pm pm-list" data-ph="Almacenamiento, reconstitución y manejo — una línea por viñeta"></div>
      <span class="phint">una línea = una viñeta</span></div>

    <div class="pro-sec"><span class="pro-n">5</span>
      <textarea class="pf pf-sect" data-k="s5" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="plw"><textarea class="pf pf-list" data-k="seguimiento" data-list="1" rows="1"></textarea>
      <div class="pm pm-list" data-ph="Revisiones, controles y fechas — una línea por viñeta"></div>
      <span class="phint">una línea = una viñeta</span></div>

    <div class="pro-sec"><span class="pro-n">6</span>
      <textarea class="pf pf-sect" data-k="s6" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="plw"><textarea class="pf pf-list" data-k="notas" data-list="1" rows="1"></textarea>
      <div class="pm pm-list" data-ph="Notas — una línea por viñeta"></div>
      <span class="phint">una línea = una viñeta</span></div>

    <div class="pro-sec"><span class="pro-n">7</span>
      <textarea class="pf pf-sect" data-k="s7" rows="1"></textarea><div class="pm pm-sect"></div></div>
    <div class="pro-disc">
      <textarea class="pf pf-disc" data-k="disclosure" rows="1"></textarea><div class="pm pm-disc"></div>
    </div>

    <div class="pro-sign">
      <div>Firma del cliente</div>
      <div>PEPTIDEX</div>
    </div>

    <div class="pro-legal">
      <textarea class="pf pf-legal" data-k="legal" rows="1"></textarea><div class="pm pm-legal"></div>
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
  var CAT   = __CATALOG__;
  var DISC  = __DISCLOSURE__;
  var LEGAL = __LEGAL__;
  var SEC   = __SEC__;
  var CF    = __CFIELDS__;
  var TINT  = {fitness:'#1b1b1b', beauty:'#8a4f2e', longevity:'#023473'};
  var KEY   = 'px-protocolo-2';

  var q      = document.getElementById('proQ'),
      drop   = document.getElementById('proDrop'),
      list   = document.getElementById('proList'),
      empty  = document.getElementById('proEmpty'),
      sheet  = document.getElementById('proSheet'),
      saved  = document.getElementById('proSaved');
  if(!sheet) return;

  /* El documento en blanco.  Sólo tres campos nacen con texto: el título, el
     disclosure y el aviso regulatorio.  Todo lo demás lo escribe el usuario.

     NO HAY «preparado por».  Se retiró: nombrar a una persona en un documento
     que lleva dosis es precisamente la firma que no conviene que exista. */
  function blank(){
    return {titulo:'PROTOCOLO',
            kCliente:'Nombre del cliente', cliente:'',
            kFolio:'Folio',     folio:'',
            kFecha:'Fecha',     fecha:'',
            kContacto:'Contacto', contacto:'',
            s1:SEC[0], s2:SEC[1], s3:SEC[2], s4:SEC[3], s5:SEC[4], s6:SEC[5],
            s7:'DISCLOSURE',
            general:'', almacen:'', seguimiento:'', notas:'',
            disclosure:DISC, legal:LEGAL, items:[]};
  }
  var doc = blank();
  var sel = 0, hits = [];

  function esc(v){ return String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* Un textarea que crece con su contenido.  Se pone a 'auto' antes de medir
     porque el scrollHeight de un textarea ya encogido nunca reporta menos de
     su altura actual: sin ese reset el campo crece pero jamás vuelve a bajar. */
  function grow(t){ t.style.height='auto'; t.style.height=(t.scrollHeight)+'px'; }

  /* El espejo: el div que se imprime en lugar del textarea.  Un textarea se
     imprime con la altura que midió en pantalla, y la hoja es más estrecha que
     la ventana — el sobrante se perdía bajo overflow:hidden, que en un
     disclosure legal significa media cláusula fuera del papel.  Un div se
     dimensiona solo a cualquier ancho.

     Se toma el hermano siguiente y no parentNode.querySelector('.pm'): en los
     rótulos conviven dos campos en el mismo contenedor y el primero se
     llevaba el texto del segundo. */
  function mirrorOf(t){
    var m=t.nextElementSibling;
    if(m && m.className.indexOf('pm')===0) return m;
    return t.parentNode.querySelector('.pm');
  }
  function sync(t){
    var m=mirrorOf(t); if(!m) return;
    if(t.dataset.list){
      var ls=t.value.split('\n').filter(function(x){ return x.trim(); });
      m.innerHTML = ls.length
        ? '<ul>'+ls.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>' : '';
    }else{
      m.textContent=t.value;
    }
  }

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
      var b=blank();
      for(var k in b) if(d[k]!==undefined) b[k]=d[k];
      b.items=Array.isArray(d.items)?d.items:[];
      doc=b; return true;
    }catch(e){ return false; }
  }

  /* ---- enlace de un campo ---- */
  function bindField(t, obj){
    t.value = obj[t.dataset.k] || '';
    grow(t); sync(t);
    t.addEventListener('input', function(){
      obj[t.dataset.k]=t.value; grow(t); sync(t); queueSave();
    });
    var lw=t.closest ? t.closest('.plw') : null;
    if(lw){
      lw.addEventListener('mousedown', function(ev){
        if(lw.classList.contains('on')) return;
        ev.preventDefault(); lw.classList.add('on'); grow(t); t.focus();
      });
      t.addEventListener('blur', function(){ lw.classList.remove('on'); sync(t); });
    }
  }

  /* ---- campos de nivel documento (no se reconstruyen al teclear) ---- */
  function bindDocFields(){
    [].forEach.call(sheet.querySelectorAll('[data-k]'), function(t){
      if(t.closest('.pro-cmp')) return;
      bindField(t, doc);
    });
  }

  /* ---- bloques de compuesto ----
     Se reconstruye la lista al añadir o quitar, pero NUNCA al teclear: los
     campos se enlazan una vez y escriben directo sobre el objeto.  Volver a
     pintar mientras alguien escribe le quita el cursor de las manos. */
  function renderItems(){
    list.innerHTML='';
    doc.items.forEach(function(it, i){
      var d=document.createElement('div');
      d.className='pro-cmp';
      d.style.setProperty('--pl', TINT[it.l]||'#1b1b1b');
      var cells='';
      CF.forEach(function(f, n){
        cells += '<div class="pro-fld'+(n>=4?' span2':'')+'">'+
                 '<span class="pro-lbl">'+esc(f[1])+'</span>'+
                 (n>=4
                   ? '<div class="plw"><textarea class="pf pf-list" data-k="'+f[0]+'" data-list="1" rows="1"></textarea>'+
                     '<div class="pm pm-list" data-ph="—"></div>'+
                     '<span class="phint">una línea = una viñeta</span></div>'
                   : '<textarea class="pf pf-val" data-k="'+f[0]+'" rows="1"></textarea><div class="pm pm-val"></div>');
        cells += '</div>';
      });
      d.innerHTML =
        '<div class="pro-cmp-h">'+
          '<span class="ln">'+esc(it.L)+'</span>'+
          '<span class="nm">'+esc(it.n)+'</span>'+
          '<span class="sz">'+esc(it.s)+'</span>'+
          '<button class="pro-x" title="Quitar">✕</button>'+
        '</div>'+
        '<div class="pro-grid">'+cells+'</div>';
      d.querySelector('.pro-x').addEventListener('click', function(){
        doc.items.splice(i,1); renderItems(); save();
      });
      list.appendChild(d);
      [].forEach.call(d.querySelectorAll('textarea'), function(t){ bindField(t, it); });
    });
    empty.style.display = doc.items.length ? 'none' : 'block';
    growAll();
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
    var it={k:o.k,n:o.n,s:o.s,l:o.l,L:o.L};
    CF.forEach(function(f){ it[f[0]]=''; });
    doc.items.push(it);
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
  function syncAll(){ [].forEach.call(sheet.querySelectorAll('textarea'), sync); }
  document.getElementById('proPrint').addEventListener('click', function(){ syncAll(); window.print(); });
  window.addEventListener('beforeprint', syncAll);

  document.getElementById('proNew').addEventListener('click', function(){
    if(!confirm('Empezar un protocolo nuevo. Se pierde lo que no hayas impreso o exportado. ¿Continuar?')) return;
    doc=blank();
    doc.fecha=new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
    bindDocFields(); renderItems(); growAll(); save();
  });
  document.getElementById('proClear').addEventListener('click', function(){
    if(!confirm('Vaciar todos los campos de este protocolo. ¿Continuar?')) return;
    ['cliente','folio','fecha','contacto','general','almacen','seguimiento','notas']
      .forEach(function(k){ doc[k]=''; });
    doc.items=[];
    bindDocFields(); renderItems(); growAll(); save();
  });
  document.getElementById('proExp').addEventListener('click', function(){
    var b=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(b);
    a.download='PEPTIDEX_Protocolo_'+(doc.cliente||'sin-nombre').replace(/[^\w\- ]+/g,'').trim()
               .replace(/\s+/g,'-')+'.json';
    a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); },1000);
  });
  var file=document.createElement('input');
  file.type='file'; file.accept='application/json'; file.style.display='none';
  document.body.appendChild(file);
  document.getElementById('proImp').addEventListener('click', function(){ file.click(); });
  file.addEventListener('change', function(){
    var f=file.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      try{
        var d=JSON.parse(r.result);
        if(!d||typeof d!=='object') throw new Error('el archivo no contiene un protocolo');
        var b=blank();
        for(var k in b) if(d[k]!==undefined) b[k]=d[k];
        b.items=Array.isArray(d.items)?d.items:[];
        doc=b; bindDocFields(); renderItems(); growAll(); save();
        alert('Protocolo importado.');
      }catch(e){ alert('No se pudo leer el archivo: '+e.message); }
      file.value='';
    };
    r.readAsText(f);
  });

  /* ---- arranque ---- */
  if(!load()){
    doc.fecha=new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
  }
  bindDocFields(); renderItems();
  /* Un textarea mide mal mientras su contenedor está en display:none — el
     scrollHeight de un elemento sin caja es cero.  Se remide al entrar en la
     vista y al cambiar el ancho de la ventana.  Los campos de lista viven
     ocultos tras su espejo: esos se miden al abrirlos. */
  function growAll(){
    [].forEach.call(sheet.querySelectorAll('textarea'), function(t){
      if(!t.closest('.plw')) grow(t);
    });
  }
  window.addEventListener('resize', growAll);
  window.PX_PROTOCOL_SHOWN = growAll;
  growAll();
})();
'''
def js_payload():
    js = JS.replace('__CATALOG__',   json.dumps(ITEMS, ensure_ascii=False))
    js = js.replace('__DISCLOSURE__', json.dumps(DISCLOSURE, ensure_ascii=False))
    js = js.replace('__LEGAL__',      json.dumps(LEGAL, ensure_ascii=False))
    js = js.replace('__SEC__',        json.dumps(SEC, ensure_ascii=False))
    js = js.replace('__CFIELDS__',    json.dumps(CFIELDS, ensure_ascii=False))
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

# -*- coding: utf-8 -*-
"""
PEPTIDEX — generador de PEPTIDEX_Fichas_Tecnicas.html

Las 56 fichas del catálogo en la maqueta aprobada de PEPTIDEX (la del
Ficha_Tecnica_WS): logo maestro, FICHA TÉCNICA, nombre, sello RUO, tira de
línea con su logo, y seis secciones numeradas sobre barra azul —

    1  DESCRIPCIÓN GENERAL
    2  COMPOSICIÓN / CONTENIDO QUÍMICO
    3  APLICACIONES Y BENEFICIOS EN USO HUMANO
    4  DOSIS Y FRECUENCIA DE USO
    5  RECOMENDACIONES
    6  EFECTOS SECUNDARIOS Y RIESGOS

— y el aviso legal en inglés al pie.

TRES REGLAS QUE GOBIERNAN ESTE ARCHIVO

1. La maqueta no se toca.  El orden de las secciones, sus números, sus títulos,
   la barra azul y el pie son los del documento aprobado.

2. Los logos son los suministrados.  Se embeben los PNG de marca tal cual —
   maestro y los tres de línea — sin recortar, recolorear ni reconstruir.

3. La sección 4, DOSIS Y FRECUENCIA DE USO, sale VACÍA por diseño.  La llena
   el usuario, ficha por ficha.  El generador no propone ninguna pauta.

POR QUÉ SE RENDERIZA EN EL NAVEGADOR Y NO EN PYTHON

Para editar hace falta que la página sepa reconstruir una ficha, y para eso los
datos tienen que seguir en la página en lugar de haberse evaporado en el
generador.  Python emite una sola cosa — el array ORIGINAL, que nadie modifica —
y el documento se dibuja a sí mismo.  Eso da las tres operaciones de golpe:
editar sobre el original, restaurar el original, y añadir fichas nuevas.

CÓMO SE IMPRIME

Un textarea se imprime con la altura que tenía en pantalla, y la hoja es más
estrecha que la ventana: el texto reflúe a más líneas y el sobrante se pierde
bajo overflow:hidden.  Por eso cada campo lleva al lado un div gemelo con el
mismo texto, oculto en pantalla y visible en el papel.  Un div no tiene altura
fija: se dimensiona solo a cualquier ancho.
"""
import json, os

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
    ('longevity', 'LONGEVITY', LONGEVITY, '#023473', '#4a6fa5'),
]


def sizes_for(line_key, cid):
    """Presentaciones del catálogo para este compuesto, en el orden del catálogo."""
    for row in CAT[line_key]:
        if row[0] == cid:
            return [s[1] for s in row[3]], [s[0] for s in row[3]]
    return [], []


def fmt_mw(mw):
    if mw is None:
        return ''
    return ('%.2f' % mw).rstrip('0').rstrip('.') + ' Da'


STRIP = {
    'fitness':   'L\u00cdNEA FITNESS \u00b7 BUILD PERFORMANCE',
    'beauty':    'L\u00cdNEA BEAUTY \u00b7 ELEVATE AESTHETICS',
    'longevity': 'L\u00cdNEA LONGEVITY \u00b7 EXTEND POSSIBILITY',
}

LEGAL = ('Regulatory Notice & Legal Disclaimer: All compounds provided by PeptideX are sold '
         'for laboratory research and analytical reference use only (RUO). By purchasing this '
         'material, the buyer assumes absolute, sole, and unconditional liability for any '
         'handling, storage, application, or misuse of the product. PeptideX disclaims any and '
         'all responsibility for damages, adverse effects, or consequences resulting from any '
         'use outside of strictly controlled research protocols by professionals.')

SEC = ['DESCRIPCI\u00d3N GENERAL',
       'COMPOSICI\u00d3N / CONTENIDO QU\u00cdMICO',
       'APLICACIONES Y BENEFICIOS EN USO HUMANO',
       'DOSIS Y FRECUENCIA DE USO',
       'RECOMENDACIONES',
       'EFECTOS SECUNDARIOS Y RIESGOS']


def payload():
    """Aplana las tres listas al array que consume la p\u00e1gina.

    El contenido investigado se reparte en las seis secciones de la maqueta.
    Nada se descarta: la descripci\u00f3n general recoge para-qu\u00e9-es y mecanismo,
    la tabla de composici\u00f3n recoge la identidad qu\u00edmica, y recomendaciones
    recoge reconstituci\u00f3n, almacenamiento, estabilidad y manejo.

    La secci\u00f3n 4 sale VAC\u00cdA a prop\u00f3sito.  Es la \u00fanica del documento que el
    generador no rellena, porque la pauta la pone el usuario.

    Las presentaciones se resuelven aqu\u00ed y se guardan como texto, no como
    estructura: en cuanto el usuario puede editarlas dejan de ser una relaci\u00f3n
    con el cat\u00e1logo y pasan a ser un campo suyo."""
    out = []
    for line_key, line_name, data, ink, accent in LINES:
        for c in data:
            sizes, skus = sizes_for(line_key, c['id'])

            # 1 \u2014 descripci\u00f3n general: qu\u00e9 es y c\u00f3mo act\u00faa, en dos p\u00e1rrafos.
            desc = c['purpose'] + '\n\n' + c['mechanism']

            # 5 \u2014 recomendaciones: la maqueta las quiere como vi\u00f1etas con
            #     r\u00f3tulo, igual que el documento aprobado.
            recom = '\n'.join([
                'Almacenamiento: ' + c['storage'],
                'Reconstituci\u00f3n: ' + c['recon'],
                'Estabilidad: ' + c['stability'],
                'Manejo: ' + c['handling'],
                'Vida media: ' + c['halflife'],
            ])

            out.append({
                'id':    c['id'],
                'line':  line_key,
                'L':     line_name,
                'ink':   ink,
                'acc':   accent,
                'name':  c['name'],
                'sub':   c.get('aka') or c['cls'],
                'strip': STRIP[line_key],

                # r\u00f3tulos de secci\u00f3n \u2014 editables como todo lo dem\u00e1s
                's1': SEC[0], 's2': SEC[1], 's3': SEC[2],
                's4': SEC[3], 's5': SEC[4], 's6': SEC[5],

                # 1
                'desc': desc,

                # 2 \u2014 tabla de composici\u00f3n: r\u00f3tulo y valor, ambos editables
                'k1': 'Tipo',
                'v1': c['cls'],
                'k2': 'F\u00f3rmula molecular (referencia)',
                'v2': c.get('formula') or 'Sin registro p\u00fablico',
                'k3': 'Peso molecular aprox.',
                'v3': fmt_mw(c.get('mw')) or 'Sin registro p\u00fablico',
                'k4': 'CAS',
                'v4': c.get('cas') or 'Sin registro p\u00fablico',
                'k5': 'Secuencia',
                'v5': c['seq'],
                'k6': 'Presentaci\u00f3n en investigaci\u00f3n',
                'v6': ('Liofilizado (polvo), vial de laboratorio \u2014 ' + ' \u00b7 '.join(sizes)
                       if sizes else 'Liofilizado (polvo), vial de laboratorio'),
                'k7': 'Contenido del vial',
                'v7': c['contains'],
                'k8': 'Pureza reportada (proveedores RUO)',
                'v8': '\u226598% (HPLC, referencia de cat\u00e1logo)',

                # 3
                'benef': '\n'.join(c.get('research') or []),

                # 4 \u2014 EN BLANCO, la llena el usuario
                'dosis': '',

                # 5 y 6
                'recom':   recom,
                'riesgos': '\n'.join(c.get('flags') or []),

                'legal': LEGAL,
                'skus':  ' \u00b7 '.join(skus),
                'sizes': ' \u00b7 '.join(sizes),
                'cas':   c.get('cas') or '',
                'cls':   c['cls'],
                'aka':   c.get('aka') or '',
            })
    return out


def build():
    data = payload()
    assert len(data) == 56, 'se esperaban 56 compuestos, hay %d' % len(data)
    tot_s = sum(len(sizes_for(k, c['id'])[0]) for k, _, d, _, _ in LINES for c in d)
    assert tot_s == 118, 'se esperaban 118 presentaciones, hay %d' % tot_s

    doc = (TEMPLATE.replace('__DATA__', json.dumps(data, ensure_ascii=False))
                   .replace('__LOGO__',   LOGOS['t_master'])
                   .replace('__LFIT__',   LOGOS['t_fitness'])
                   .replace('__LBEA__',   LOGOS['t_beauty'])
                   .replace('__LLON__',   LOGOS['t_longevity'])
                   .replace('__TOTC__',   str(len(data)))
                   .replace('__TOTS__',   str(tot_s)))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(doc)
    print('  PEPTIDEX_Fichas_Tecnicas.html  %.1f KB' % (len(doc.encode()) / 1024))
    print('  %d compuestos · %d presentaciones · todos los campos editables' % (len(data), tot_s))




# ===========================================================================
# La maqueta.  Es la del documento aprobado, en HTML.
#
# Nada de lo que sigue improvisa estructura: el orden de los bloques, los seis
# títulos numerados, la barra azul, el sello RUO y el aviso legal al pie vienen
# del Ficha_Tecnica_WS.  Lo único que se añade es la capa de edición, y se
# añade por debajo: cada texto es un textarea sin borde que en reposo se lee
# exactamente como el impreso.
# ===========================================================================
TEMPLATE = r'''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>PEPTIDEX · Fichas Técnicas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --nav1:#0f275e; --nav2:#1b449b;          /* la barra de sección, medida del documento */
  --ink:#101010; --ink2:#3a3f46; --muted:#8a9099; --hair:#dcdfe4;
  --bg:#eef0f3; --paper:#ffffff; --edit:#1e5eff;
  --font:Arial,"Helvetica Neue",Helvetica,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--font);color:var(--ink);background:var(--bg);font-size:14px;line-height:1.55;
  -webkit-font-smoothing:antialiased}

/* ---------- barra de herramientas ---------- */
.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);
  backdrop-filter:saturate(180%) blur(18px);-webkit-backdrop-filter:saturate(180%) blur(18px);
  border-bottom:1px solid var(--hair)}
.topin{max-width:1400px;margin:0 auto;padding:11px 24px;display:flex;align-items:center;gap:13px}
.brand{display:flex;align-items:center;gap:11px;flex-shrink:0}
.brand img{height:28px;width:auto;display:block}
.brand .bt{display:flex;flex-direction:column;line-height:1.2}
.brand .bt b{font-size:12px;font-weight:700;letter-spacing:.03em}
.brand .bt span{font-size:9px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase;font-weight:700}
.search{flex:1;position:relative;max-width:300px}
.search input{width:100%;font-family:inherit;font-size:13.5px;padding:8px 14px 8px 34px;
  border:1px solid var(--hair);border-radius:999px;background:#f7f8fa;outline:none}
.search input:focus{border-color:var(--nav1);background:#fff}
.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:.4}
.filters{display:flex;gap:5px;flex-shrink:0}
.filters button{font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.05em;
  padding:7px 12px;border-radius:999px;border:1px solid var(--hair);background:#fff;
  color:var(--ink2);cursor:pointer;white-space:nowrap}
.filters button:hover{border-color:var(--nav1)}
.filters button.on{background:var(--nav1);border-color:var(--nav1);color:#fff}
.acts{display:flex;gap:5px;flex-shrink:0;align-items:center;margin-left:auto}
.btn{font-family:inherit;font-size:11px;font-weight:700;padding:7px 12px;border-radius:999px;
  border:1px solid var(--hair);background:#fff;cursor:pointer;color:var(--ink);white-space:nowrap}
.btn:hover{border-color:var(--nav1)}
.btn.dark{background:var(--nav1);border-color:var(--nav1);color:#fff}
.saved{font-size:10.5px;color:var(--muted);min-width:92px;text-align:right}

/* ---------- layout ---------- */
.wrap{max-width:1400px;margin:0 auto;padding:22px 24px 80px;display:grid;
  grid-template-columns:236px 1fr;gap:30px;align-items:start}
.rail{position:sticky;top:62px;max-height:calc(100vh - 78px);overflow-y:auto;padding-bottom:30px;
  scrollbar-width:thin;background:#fff;border:1px solid var(--hair);border-radius:10px;padding:14px 8px}
.rail::-webkit-scrollbar{width:5px}
.rail::-webkit-scrollbar-thumb{background:#cfd4da;border-radius:3px}
.ng{margin-bottom:16px}
.ngt{display:block;font-size:9px;font-weight:800;letter-spacing:.2em;padding:0 8px 7px;text-transform:uppercase}
.ni{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;text-decoration:none;
  color:var(--ink2);font-size:12.5px}
.ni:hover{background:#f1f3f6;color:var(--ink)}
.ni.act{background:var(--nav1);color:#fff}
.ni.act .nn{color:rgba(255,255,255,.65)}
.nn{font-family:var(--mono);font-size:9.5px;color:var(--muted);flex-shrink:0;width:16px}
.nname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.nsz{font-size:12px;color:var(--edit);flex-shrink:0;width:8px;line-height:1}
.col{min-width:0}

/* ============================ LA FICHA ============================ */
.ficha{background:var(--paper);border:1px solid var(--hair);border-radius:4px;
  padding:34px 40px 30px;margin-bottom:26px;scroll-margin-top:74px;position:relative;
  box-shadow:0 10px 34px -28px rgba(10,20,60,.5)}

/* --- cabecera: logo maestro, FICHA TÉCNICA, nombre, RUO, tira de línea --- */
.fx-head{text-align:center;padding-bottom:16px}
.fx-master{height:74px;width:auto;display:block;margin:0 auto 14px}
.fx-kick{font-size:10px;font-weight:700;letter-spacing:.42em;color:var(--nav1);
  text-transform:uppercase;margin-bottom:4px}
.fx-ruo{display:inline-block;border:1px solid var(--nav1);color:var(--nav1);border-radius:999px;
  padding:3px 16px;font-size:8.5px;font-weight:700;letter-spacing:.22em;margin-top:10px}
.fx-strip{margin-top:16px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);
  padding:9px 0;display:flex;align-items:center;justify-content:center;gap:16px}
.fx-strip>div{flex:0 1 560px;min-width:0}
.fx-linelogo{height:44px;width:auto;display:block;flex-shrink:0}

/* --- barra de sección --- */
.fx-sec{display:flex;align-items:center;gap:11px;margin:20px 0 10px;padding:6px 12px;
  background:linear-gradient(90deg,var(--nav1),var(--nav2));border-radius:2px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.fx-n{flex-shrink:0;width:17px;height:17px;border-radius:50%;border:1px solid rgba(255,255,255,.85);
  color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;
  line-height:1}
.fx-sec .f{color:#fff}
.fx-sec .f:hover{border-bottom-color:rgba(255,255,255,.5)}
.fx-sec .f:focus{border-bottom-color:#fff;background:rgba(255,255,255,.12)}

/* --- tabla de composición --- */
.fx-tab{width:100%;border-collapse:collapse;margin-top:2px}
.fx-tab td{border:1px solid var(--hair);padding:6px 10px;vertical-align:top}
.fx-tab td.kk{width:32%;background:#f6f7f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* --- viñetas --- */
.fx-ul{padding-left:2px}
.fx-blank{border:1px dashed #c9cfd8;border-radius:4px;padding:8px 11px;background:#fcfdff}

/* --- aviso legal --- */
.fx-legal{margin-top:24px;padding-top:12px;border-top:1px solid var(--hair);text-align:center}

/* --- acciones por ficha --- */
.fx-tools{position:absolute;top:10px;right:12px;display:flex;gap:5px;align-items:center}
.fbtn{border:1px solid var(--hair);background:#fff;border-radius:6px;cursor:pointer;
  font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--muted);
  padding:3px 7px;text-transform:uppercase}
.fbtn:hover{border-color:var(--nav1);color:var(--nav1)}
.fbtn.del:hover{border-color:#c0392b;color:#c0392b;background:#fdf2f0}
.lsel{font-size:8.5px;font-weight:700;letter-spacing:.12em;color:var(--muted);background:#fff;
  border:1px solid var(--hair);border-radius:6px;padding:3px 6px;font-family:inherit;cursor:pointer}
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
.f-name{font-size:27px;font-weight:700;letter-spacing:.02em;line-height:1.14;text-align:center;
  text-transform:uppercase;color:var(--ink)}
.f-sub{font-size:11.5px;color:var(--ink2);line-height:1.45;text-align:center;margin-top:4px}
.f-strip{font-size:10px;font-weight:700;letter-spacing:.3em;color:var(--nav1);text-align:center;
  text-transform:uppercase}
.f-sect{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.f-body{font-size:12.5px;line-height:1.62;color:var(--ink2);text-align:justify}
.f-cell{font-size:11.5px;line-height:1.5;color:var(--ink2)}
.f-cellk{font-size:11.5px;line-height:1.5;color:var(--ink);font-weight:700}
.f-list{font-size:12.5px;line-height:1.62;color:var(--ink2)}
.f-legal{font-size:9px;line-height:1.5;color:var(--ink2);font-style:italic;font-weight:700;
  text-align:center}
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
.m li{padding-left:15px;position:relative;margin-bottom:3px}
.m-list li{margin-bottom:1.5px}
.m li::before{content:"\25cf";position:absolute;left:0;top:0;font-size:.72em;line-height:1.85;
  color:var(--nav1)}

.empty{padding:64px 20px;text-align:center;color:var(--muted);font-size:14px;display:none;
  background:#fff;border:1px solid var(--hair);border-radius:4px}

@media(max-width:1040px){
  .wrap{grid-template-columns:1fr;gap:0}
  .rail{display:none}
  .ficha{padding:22px 18px}
  .fx-tab td.kk{width:38%}
}
@media(max-width:820px){
  .topin{flex-wrap:wrap;gap:8px;padding:10px 14px}
  .search{order:3;max-width:none;flex-basis:100%}
  .filters,.acts{flex-wrap:wrap}.acts{margin-left:0}
  .wrap{padding:16px 14px 60px}
  .fx-strip{flex-direction:column;gap:8px}
  .fx-tab,.fx-tab tbody,.fx-tab tr,.fx-tab td{display:block;width:100%}
  .fx-tab td.kk{width:100%;border-bottom:none}
}

/* ============================================================================
   IMPRESIÓN — una ficha por página, que es como está pensado el documento.

   Dos cosas que hay que forzar aquí y que no se ven en pantalla.  La hoja Carta
   con márgenes mide unos 718 px de CSS, por debajo del punto de ruptura de
   móvil: sin forzarlo, el papel heredaría la disposición de teléfono y la tabla
   de composición se desmontaría en bloques apilados.  Y los textarea se
   imprimen con la altura que midieron en pantalla, así que se imprimen los
   espejos en su lugar.
   ============================================================================ */
@page{size:Letter;margin:10mm 11mm 8mm}
@media print{
  .top,.rail,.fx-tools,.hint,.badge{display:none !important}
  body{background:#fff;font-size:8.8pt}
  .wrap{display:block;padding:0;max-width:none}
  .ficha{border:none;border-radius:0;box-shadow:none;padding:0 0 6pt;margin:0;
    page-break-after:always;page-break-inside:auto}
  .ficha:last-of-type{page-break-after:auto}
  .empty{display:none !important}

  .f{display:none !important}
  .m{display:block}
  .m-name{font-size:15pt;font-weight:700;letter-spacing:.02em;line-height:1.12;text-align:center;
    text-transform:uppercase}
  .m-sub{font-size:7.8pt;color:var(--ink2);text-align:center;margin-top:3pt;line-height:1.4}
  .m-strip{font-size:7pt;font-weight:700;letter-spacing:.28em;color:var(--nav1);text-align:center;
    text-transform:uppercase}
  .m-sect{font-size:7.8pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff}
  .m-body,.m-list{font-size:7.9pt;line-height:1.34;color:var(--ink2);text-align:justify}
  .m-cell{font-size:7.5pt;color:var(--ink2)}
  .m-cellk{font-size:7.5pt;color:var(--ink);font-weight:700}
  .m-legal{font-size:6.2pt;line-height:1.4;font-style:italic;font-weight:700;text-align:center;
    color:var(--ink2)}

  .fx-head{padding-bottom:6pt}
  .fx-master{height:34pt;margin-bottom:5pt}
  .fx-linelogo{height:22pt}
  .fx-kick{font-size:6.8pt;letter-spacing:.4em}
  .fx-ruo{font-size:6pt;padding:1.5pt 11pt;margin-top:5pt}
  .fx-strip{margin-top:7pt;padding:4pt 0}
  .fx-sec{margin:6pt 0 3pt;padding:2.6pt 8pt;page-break-after:avoid;page-break-inside:avoid}
  .m-list li,.m-body{orphans:2;widows:2}
  .fx-n{width:10.5pt;height:10.5pt;font-size:6.4pt}
  .fx-tab,.fx-tab tbody,.fx-tab tr{display:revert}
  .fx-tab{display:table;width:100%;page-break-inside:auto}
  .fx-tab tr{display:table-row;page-break-inside:avoid}
  .fx-tab td{display:table-cell;padding:2.1pt 6pt}
  .fx-tab td.kk{width:32%;border-bottom:1px solid var(--hair)}
  .fx-strip{flex-direction:row}
  /* El hueco de dosis se imprime vacío: en pantalla el texto guía dice cómo
     se escribe, pero en el papel sería una instrucción de la aplicación
     colada en un documento de cliente.  Queda el recuadro, que es el sitio
     donde se rellena a mano si hace falta. */
  .fx-blank{min-height:30pt}
  .fx-blank .m:empty::before{content:"" !important}

  /* Autoajuste.  La maqueta está pensada para una ficha por página, pero once
     de las 56 llevan bastante más texto que el resto y se pasaban por unas
     pocas líneas.  fit() las mide antes de imprimir y les baja el cuerpo un
     escalón — o dos si con uno no basta.  Es la tipografía la que cede, no la
     estructura: los márgenes, la barra y la tabla no se tocan. */
  .ficha.tight  .m-body,.ficha.tight  .m-list{font-size:7.4pt;line-height:1.3}
  .ficha.tight  .m-cell,.ficha.tight  .m-cellk{font-size:7.1pt}
  .ficha.tight  .fx-sec{margin:5pt 0 2.5pt}
  .ficha.tighter .m-body,.ficha.tighter .m-list{font-size:6.9pt;line-height:1.26}
  .ficha.tighter .m-cell,.ficha.tighter .m-cellk{font-size:6.7pt}
  .ficha.tighter .fx-sec{margin:4pt 0 2pt}
  .ficha.tighter .fx-master{height:28pt}
  .fx-legal{margin-top:7pt;padding-top:4pt}
  a{color:inherit;text-decoration:none}
}
</style>
</head>
<body>

<div class="top"><div class="topin">
  <div class="brand"><img src="__LOGO__" alt="PEPTIDEX"/>
    <div class="bt"><b>Fichas Técnicas</b><span>Research Use Only</span></div></div>
  <div class="search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
      stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="q" type="search" placeholder="Buscar compuesto…" autocomplete="off"/>
  </div>
  <div class="filters">
    <button data-f="all" class="on">Todas</button>
    <button data-f="fitness">Fitness</button>
    <button data-f="beauty">Beauty</button>
    <button data-f="longevity">Longevity</button>
  </div>
  <div class="acts">
    <span class="saved" id="saved"></span>
    <button class="btn" id="add">＋ Ficha</button>
    <button class="btn" id="exp">Exportar</button>
    <button class="btn" id="imp">Importar</button>
    <button class="btn" id="rst">Restaurar todo</button>
    <button class="btn dark" id="pr">Imprimir / PDF</button>
  </div>
</div></div>

<div class="wrap">
  <nav class="rail" id="rail"></nav>
  <main class="col" id="col"><div class="empty" id="empty">Sin resultados.</div></main>
</div>

<input type="file" id="file" accept="application/json" style="display:none"/>

<script>
(function(){
"use strict";
var ORIGINAL = __DATA__;
var KEY   = 'px-fichas-ws';
var MASTER= '__LOGO__';
var LOGO  = {fitness:'__LFIT__', beauty:'__LBEA__', longevity:'__LLON__'};
var TINT  = {fitness:'#1b1b1b', beauty:'#8a4f2e', longevity:'#023473'};
var LNAME = {fitness:'FITNESS', beauty:'BEAUTY', longevity:'LONGEVITY'};

var col   = document.getElementById('col'),
    rail  = document.getElementById('rail'),
    empty = document.getElementById('empty'),
    q     = document.getElementById('q'),
    saved = document.getElementById('saved');

var docs = [], line = 'all', term = '';

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function esc(v){ return String(v==null?'':v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function orig(id){
  for(var i=0;i<ORIGINAL.length;i++) if(ORIGINAL[i].id===id) return ORIGINAL[i];
  return null;
}

/* ---------- persistencia ---------- */
var saveT=null;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(docs)); }catch(e){}
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
   Un textarea que crece con su contenido.  Se pone a 'auto' antes de medir
   porque el scrollHeight de un textarea ya encogido nunca reporta menos de su
   altura actual: sin ese reset el campo crece pero jamás vuelve a bajar. */
function grow(t){ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }

function fld(cls, k, ph){
  return '<textarea class="f '+cls+'" data-k="'+k+'" rows="1" placeholder="'+esc(ph||'')+'"></textarea>'+
         '<div class="m m-'+cls.slice(2)+'"></div>';
}
function fldList(cls, k, ph){
  return '<div class="lw">'+
           '<textarea class="f '+cls+'" data-k="'+k+'" data-list="1" rows="1"></textarea>'+
           '<div class="m m-list" data-ph="'+esc(ph||'')+'"></div>'+
           '<span class="hint">una línea = una viñeta</span>'+
         '</div>';
}

/* El espejo: el div que se imprime en lugar del textarea.  Un div se
   dimensiona solo a cualquier ancho, así que no pierde texto al reflujo. */
function sync(t){
  var m=t.nextElementSibling;
  if(!m || m.className.indexOf('m ')!==0) m=t.parentNode.querySelector('.m');
  if(!m) return;
  if(t.dataset.list){
    var ls=t.value.split('\n').filter(function(x){ return x.trim(); });
    m.innerHTML = ls.length
      ? '<ul>'+ls.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>' : '';
  }else{
    m.textContent=t.value;
  }
}

function bind(node, d){
  var tas=node.querySelectorAll('textarea.f');
  for(var i=0;i<tas.length;i++){
    (function(t){
      t.value = d[t.dataset.k] || '';
      grow(t); sync(t);
      t.addEventListener('input', function(){
        d[t.dataset.k]=t.value; grow(t); sync(t);
        d.edited=true; node.classList.add('dirty');
        if(t.dataset.k==='name'){
          var a=railItem(d.id);
          if(a){ a.querySelector('.nname').textContent=t.value; a.querySelector('.nsz').textContent='•'; }
        }
        queueSave();
      });
      var lw=t.closest('.lw');
      if(lw){
        lw.addEventListener('mousedown', function(ev){
          if(lw.classList.contains('on')) return;
          ev.preventDefault();
          lw.classList.add('on'); grow(t); t.focus();
        });
        t.addEventListener('blur', function(){ lw.classList.remove('on'); sync(t); });
      }
      /* Esc devuelve ESTE campo a su valor original, sin tocar el resto de la
         ficha.  Es el deshacer que se necesita nueve de cada diez veces. */
      t.addEventListener('keydown', function(ev){
        if(ev.key!=='Escape') return;
        var o=orig(d.id); if(!o || o[t.dataset.k]===undefined) return;
        ev.preventDefault();
        t.value=o[t.dataset.k]; d[t.dataset.k]=t.value; grow(t); sync(t); queueSave();
      });
    })(tas[i]);
  }
  var sel=node.querySelector('.lsel');
  if(sel){
    sel.value=d.line;
    sel.addEventListener('change', function(){
      d.line=sel.value; d.L=LNAME[d.line];
      node.dataset.line=d.line;
      node.querySelector('.fx-linelogo').src=LOGO[d.line];
      d.edited=true; node.classList.add('dirty');
      save(); buildRail(); apply();
    });
  }
}

/* --- una fila de la tabla de composición: rótulo y valor, ambos editables --- */
function trow(kk, vk){
  return '<tr><td class="kk">'+fld('f-cellk',kk,'Parámetro')+'</td>'+
             '<td>'+fld('f-cell',vk,'—')+'</td></tr>';
}
function sec(n, k){
  return '<div class="fx-sec"><span class="fx-n">'+n+'</span>'+fld('f-sect',k,'Título de sección')+'</div>';
}

function fichaNode(d, n){
  var art=document.createElement('article');
  art.className='ficha'+(d.edited?' dirty':'');
  art.id='f-'+d.id;
  art.dataset.line=d.line;
  art.innerHTML =
  '<span class="badge">editada</span>'+
  '<div class="fx-tools">'+
    '<select class="lsel">'+
      '<option value="fitness">FITNESS</option>'+
      '<option value="beauty">BEAUTY</option>'+
      '<option value="longevity">LONGEVITY</option></select>'+
    '<button class="fbtn rest">Restaurar</button>'+
    '<button class="fbtn del">Eliminar</button>'+
  '</div>'+

  '<div class="fx-head">'+
    '<img class="fx-master" src="'+MASTER+'" alt="PEPTIDEX"/>'+
    '<div class="fx-kick">Ficha Técnica</div>'+
    fld('f-name','name','Nombre del compuesto')+
    fld('f-sub','sub','Subtítulo')+
    '<div class="fx-ruo">RUO · RESEARCH USE ONLY</div>'+
    '<div class="fx-strip">'+
      '<img class="fx-linelogo" src="'+(LOGO[d.line]||LOGO.fitness)+'" alt=""/>'+
      '<div>'+fld('f-strip','strip','Línea')+'</div>'+
    '</div>'+
  '</div>'+

  sec(1,'s1')+ '<div>'+fld('f-body','desc','—')+'</div>'+

  sec(2,'s2')+
  '<table class="fx-tab"><tbody>'+
    trow('k1','v1')+trow('k2','v2')+trow('k3','v3')+trow('k4','v4')+
    trow('k5','v5')+trow('k6','v6')+trow('k7','v7')+trow('k8','v8')+
  '</tbody></table>'+

  sec(3,'s3')+ '<div class="fx-ul">'+fldList('f-list','benef','—')+'</div>'+

  /* La sección 4 nace vacía a propósito: el recuadro punteado es el hueco
     donde el usuario escribe su pauta.  El generador no propone ninguna. */
  sec(4,'s4')+ '<div class="fx-ul fx-blank">'+
    fldList('f-list','dosis','Escribe aquí la dosis y la frecuencia — una línea por viñeta')+'</div>'+

  sec(5,'s5')+ '<div class="fx-ul">'+fldList('f-list','recom','—')+'</div>'+

  sec(6,'s6')+ '<div class="fx-ul">'+fldList('f-list','riesgos','—')+'</div>'+

  '<div class="fx-legal">'+fld('f-legal','legal','Aviso legal')+'</div>';

  bind(art, d);
  art.querySelector('.rest').addEventListener('click', function(){ restore(d); });
  art.querySelector('.del').addEventListener('click', function(){ remove(d); });
  return art;
}

/* ---------- índice ---------- */
function railItem(id){
  var as=rail.querySelectorAll('.ni');
  for(var i=0;i<as.length;i++) if(as[i].getAttribute('data-id')===id) return as[i];
  return null;
}
function buildRail(){
  var groups={fitness:[],beauty:[],longevity:[]}, n=0;
  docs.forEach(function(d){ n++; (groups[d.line]||groups.fitness).push([d,n]); });
  var h='';
  ['fitness','beauty','longevity'].forEach(function(k){
    if(!groups[k].length) return;
    h+='<div class="ng" data-line="'+k+'"><span class="ngt" style="color:'+TINT[k]+'">'+LNAME[k]+'</span>';
    groups[k].forEach(function(p){
      var d=p[0];
      h+='<a class="ni" href="#f-'+esc(d.id)+'" data-id="'+esc(d.id)+'" data-line="'+k+'">'+
         '<span class="nn">'+(p[1]<10?'0':'')+p[1]+'</span>'+
         '<span class="nname">'+esc(d.name)+'</span>'+
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
  buildRail(); apply(); observe();
  /* Los campos se miden AQUÍ y no en bind(): dentro de un DocumentFragment no
     hay layout, y el scrollHeight de un elemento sin caja es cero — todos los
     textarea nacían con altura 0 y la ficha salía en blanco.  Sólo una vez
     montados en el documento se puede saber cuánto miden. */
  growAll();
}
function growAll(){
  /* Los campos de lista viven ocultos tras su espejo; medirlos ahí daría cero.
     Se miden cuando se abren. */
  [].forEach.call(col.querySelectorAll('textarea.f'), function(t){
    if(!t.closest('.lw')) grow(t);
  });
}

function qtext(d){
  return (d.name+' '+d.sub+' '+d.v1+' '+d.v4+' '+d.skus+' '+d.sizes).toLowerCase();
}
function apply(){
  var shown=0;
  docs.forEach(function(d){
    var el=document.getElementById('f-'+d.id); if(!el) return;
    var ok=(line==='all'||d.line===line) && (!term||qtext(d).indexOf(term)>=0);
    el.style.display=ok?'':'none'; if(ok)shown++;
    var a=railItem(d.id); if(a) a.style.display=ok?'':'none';
  });
  [].forEach.call(rail.querySelectorAll('.ng'), function(g){
    var any=[].some.call(g.querySelectorAll('.ni'), function(i){ return i.style.display!=='none'; });
    g.style.display=any?'':'none';
  });
  empty.style.display=shown?'none':'block';
  /* Una ficha oculta no tiene caja: si estaba en display:none cuando se midió,
     su altura quedó en cero.  Al volver a mostrarla se remide. */
  if(typeof growAll==='function') growAll();
}

/* ---------- acciones ---------- */
function restore(d){
  var o=orig(d.id);
  if(!o){ alert('Esta ficha se añadió a mano: no tiene original al que volver. Usa Eliminar.'); return; }
  if(!confirm('Devolver «'+d.name+'» a su contenido original.\nSe pierden los cambios de esta ficha, incluida la dosis que hayas escrito.')) return;
  var i=docs.indexOf(d); docs[i]=clone(o);
  save(); render();
  var el=document.getElementById('f-'+docs[i].id);
  if(el) el.scrollIntoView({block:'center'});
}
function remove(d){
  if(!confirm('Eliminar «'+d.name+'» del documento. ¿Continuar?')) return;
  docs.splice(docs.indexOf(d),1); save(); render();
}
document.getElementById('add').addEventListener('click', function(){
  var id='NEW'+Date.now().toString(36);
  var base=clone(ORIGINAL[0]);
  for(var k in base) if(typeof base[k]==='string') base[k]='';
  base.id=id; base.line='fitness'; base.L='FITNESS'; base.edited=true;
  base.name='COMPUESTO NUEVO';
  base.strip=ORIGINAL[0].strip; base.legal=ORIGINAL[0].legal;
  ['s1','s2','s3','s4','s5','s6','k1','k2','k3','k4','k5','k6','k7','k8'].forEach(function(k){
    base[k]=ORIGINAL[0][k];
  });
  docs.push(base); save(); render();
  var el=document.getElementById('f-'+id);
  if(el){ el.scrollIntoView({block:'center'}); el.querySelector('textarea').focus(); }
});
document.getElementById('rst').addEventListener('click', function(){
  if(!confirm('Devolver las '+ORIGINAL.length+' fichas a su contenido original.\n'+
              'Se pierden todos los cambios, las dosis escritas y las fichas añadidas a mano. ¿Continuar?')) return;
  docs=clone(ORIGINAL); save(); render(); window.scrollTo({top:0,behavior:'smooth'});
});
document.getElementById('exp').addEventListener('click', function(){
  var b=new Blob([JSON.stringify(docs,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='PEPTIDEX_Fichas_'+new Date().toISOString().slice(0,10)+'.json';
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
    }catch(e){ alert('No se pudo leer el archivo: '+e.message); }
    file.value='';
  };
  r.readAsText(f);
});

/* Los espejos se remiden justo antes de imprimir: si se cambió el zoom o el
   ancho de la ventana, el div ya no coincide con lo que hay en el textarea. */
function syncAll(){ [].forEach.call(document.querySelectorAll('textarea.f'), sync); }

/* Alto útil de una hoja Carta con los márgenes de @page, a 96 dpi:
   (11in − 10mm − 8mm) × 96 ≈ 988 px.  Es el número contra el que se decide si
   una ficha cabe. */
var PAGE_PX = 988;
function fit(){
  var fs=[].slice.call(col.querySelectorAll('.ficha'));
  fs.forEach(function(f){ f.classList.remove('tight','tighter'); });
  fs.forEach(function(f){
    if(f.style.display==='none') return;
    if(f.getBoundingClientRect().height<=PAGE_PX) return;
    f.classList.add('tight');
    if(f.getBoundingClientRect().height>PAGE_PX){
      f.classList.remove('tight'); f.classList.add('tighter');
    }
  });
}
window.PX_FIT = fit;
document.getElementById('pr').addEventListener('click', function(){ syncAll(); window.print(); });
/* beforeprint se dispara con los estilos de impresión ya aplicados, que es el
   único momento en que medir tiene sentido. */
window.addEventListener('beforeprint', function(){ syncAll(); fit(); });
if(window.matchMedia){
  var mq=window.matchMedia('print');
  var onmq=function(e){ if(e.matches){ syncAll(); fit(); } };
  if(mq.addEventListener) mq.addEventListener('change',onmq);
  else if(mq.addListener) mq.addListener(onmq);
}
window.addEventListener('resize', function(){
  [].forEach.call(document.querySelectorAll('textarea.f'), grow);
});

/* ---------- búsqueda y filtros ---------- */
q.addEventListener('input', function(){ term=q.value.trim().toLowerCase(); apply(); });
var btns=[].slice.call(document.querySelectorAll('.filters button'));
btns.forEach(function(b){
  b.addEventListener('click', function(){
    btns.forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on');
    line=b.dataset.f; apply(); window.scrollTo({top:0,behavior:'smooth'});
  });
});
document.addEventListener('keydown', function(ev){
  if((ev.metaKey||ev.ctrlKey)&&ev.key==='k'){ ev.preventDefault(); q.focus(); q.select(); }
});

/* El índice sigue a la lectura.  El margen recorta el viewport a una banda
   estrecha bajo la cabecera: la ficha activa es la que cruza esa banda, no la
   que ocupa más pantalla, así el resaltado cambia cuando entra el título. */
var io=null;
function observe(){
  if(!('IntersectionObserver' in window)) return;
  if(io) io.disconnect();
  io=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting) return;
      var a=railItem(en.target.id.slice(2)); if(!a) return;
      [].forEach.call(rail.querySelectorAll('.ni'), function(x){ x.classList.remove('act'); });
      a.classList.add('act');
      var r=a.getBoundingClientRect(), rr=rail.getBoundingClientRect();
      if(r.top<rr.top+10||r.bottom>rr.bottom-10) rail.scrollTop+=r.top-rr.top-rr.height/2;
    });
  },{rootMargin:'-68px 0px -78% 0px'});
  [].forEach.call(col.querySelectorAll('.ficha'), function(f){ io.observe(f); });
}

/* ---------- arranque ---------- */
if(!load()) docs=clone(ORIGINAL);
render();
})();
</script>
</body></html>'''


if __name__ == '__main__':
    build()

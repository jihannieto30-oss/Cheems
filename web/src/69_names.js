/* ============================================================================
   PEPTIDEX — EL NOMBRE PROPIO DE CADA COMPUESTO

   Un catálogo de cincuenta y seis códigos —BPC-157, TB-500, CJC-1295 (no DAC)—
   es un inventario, no una marca. Nadie recuerda un guion y un número, nadie
   los repite, y nadie los pide por su nombre porque no tienen ninguno.

   CUATRO REGLAS, Y LA PRIMERA MANDA SOBRE LAS OTRAS TRES

   1 · EL NOMBRE CIENTÍFICO NO DESAPARECE NUNCA
       Ni en la tarjeta, ni en la ficha, ni en la etiqueta, ni en la factura.
       El nombre PepX es una capa encima, no un reemplazo. Un comprador busca
       "BPC-157" y tiene que encontrarlo; un laboratorio recibe un vial y tiene
       que saber qué hay dentro sin consultar una tabla de equivalencias. La
       etiqueta y la ficha siguen mandando el código: es el identificador.

   2 · NINGÚN NOMBRE PROMETE NADA
       Esto es material de investigación. Un nombre como SLIMLINE o CUREJOINT
       convierte un compuesto en una promesa clínica sin decir una sola palabra
       clínica, y esa promesa la firma la marca. Los nombres de aquí evocan
       materia, luz o tiempo — no resultados. Donde un nombre roza el mecanismo
       (TRIAD por el triple agonismo, FERRY por el transporte de ácidos grasos,
       COBALT por el cobalto del centro de la cobalamina) describe química
       conocida, no efecto esperado.

   3 · UN REGISTRO POR LÍNEA
       El nombre dice a qué línea pertenece antes de que se lea nada más.
         FITNESS    materia forjada — mineral, mecánica, carga
         BEAUTY     luz — amanecer, seda, claridad
         LONGEVITY  tiempo — permanencia, noche, vigilia

   4 · CORTO, DECIBLE, PROPIO
       Una palabra. Se tiene que poder decir por teléfono y escribir sin
       preguntar cómo. Ninguno pasa de nueve letras.

   Los nombres son propuestas, no decisiones. Antes de usarlos comercialmente
   hay que comprobar que no chocan con marcas registradas en México y Estados
   Unidos — es un trámite, pero es un trámite que va antes de imprimir.
   ============================================================================ */
(function(){
'use strict';

/* Si es false, el nombre científico vuelve a llevar la voz cantante y el
   nombre PepX pasa a ser la línea de arriba. Un valor, no una reescritura. */
const NAME_LEADS = true;

const NAMES = {
  /* ---------- FITNESS · materia forjada ---------- */
  'BC' :'ATLAS',    /* BPC-157 — el que carga */
  'TB' :'STRATA',   /* TB-500 — por capas, sistémico */
  'BB' :'BASTION',  /* BPC-157 + TB-500 */
  'IG' :'INGOT',    /* IGF-1 LR3 — masa fundida */
  'IPA':'CADENCE',  /* Ipamorelin */
  'CD' :'MERIDIAN', /* CJC-1295 DAC — sostenido */
  'CN' :'CREST',    /* CJC-1295 sin DAC — pulsátil */
  'CP' :'TANDEM',   /* CJC-1295 + Ipamorelin */
  'SMO':'PRELUDE',  /* Sermorelin */
  'TSM':'KEEL',     /* Tesamorelin — la quilla */
  'G2' :'EMBER',    /* GHRP-2 */
  'G6' :'KILN',     /* GHRP-6 */
  'HX' :'ANVIL',    /* Hexarelin — el más potente de los tres */
  'H'  :'OBELISK',  /* HGH 191AA */
  'RT' :'TRIAD',    /* Retatrutide — triple agonista */
  'SM' :'VECTOR',   /* Semaglutide */
  'TR' :'BINARY',   /* Tirzepatide — doble agonista */
  'MZ' :'AXIS',     /* Mazdutide */
  'CGL':'ANCHOR',   /* Cagrilintide */
  'CS' :'CONFLUX',  /* Cagri + Sema */
  'AD' :'SHARD',    /* AOD-9604 — es literalmente un fragmento */
  'APT':'VERTEX',   /* Adipotide */
  'AM' :'CIPHER',   /* 5-Amino-1MQ */
  'AR' :'RELAY',    /* AICAR */
  'MS' :'HEARTH',   /* MOTS-c — mitocondrial */
  '2S' :'FILAMENT', /* SS-31 */
  'LC' :'FERRY',    /* L-Carnitine — transporta ácidos grasos */
  'MIC':'ALLOY',    /* Lipo-C + B12 — una mezcla */
  'AX' :'FLINT',    /* Adamax */
  'RA' :'AEGIS',    /* Ara-290 — el escudo */

  /* ---------- BEAUTY · luz ---------- */
  'CU' :'AURELIA',  /* GHK-Cu — cobre, oro */
  'AC' :'PATINA',   /* AHK-Cu — el otro cobre */
  'MX' :'SILK',     /* Matrixyl */
  'GL' :'LUMEN',    /* GLOW Blend */
  'KL' :'HALO',     /* KLOW Blend */
  'MT1':'SOLARA',   /* Melanotan I */
  'MT2':'AMBRE',    /* Melanotan II */
  'PT' :'VELVET',   /* PT-141 */
  'NP8':'STILL',    /* Snap-8 — líneas de expresión */
  'GT' :'ALBA',     /* Glutathione — el alba, lo blanco */
  'KP' :'MIRA',     /* KPV */
  'OT' :'AURA',     /* Oxytocin */

  /* ---------- LONGEVITY · tiempo ---------- */
  'ET' :'AEON',     /* Epithalon */
  'NJ' :'VIGIL',    /* NAD+ */
  'F4' :'SOLSTICE', /* FOXO4-DRI — el punto de giro */
  'DX' :'LUCID',    /* Dihexa */
  'DS' :'NOCTURNE', /* DSIP */
  'PI' :'VESPER',   /* Pinealon — la tarde, la pineal */
  'CTL':'CONDUIT',  /* Cartalax — vascular */
  'Ta1':'SENTINEL', /* Thymosin Alpha-1 */
  'TY' :'WARDEN',   /* Thymalin */
  'SK' :'ZEPHYR',   /* Selank */
  'SX' :'PRISM',    /* Semax */
  'ML' :'ECLIPSE',  /* Melatonin */
  'KS' :'SIGNAL',   /* KissPeptin-10 */
  'B12':'COBALT'    /* Vitamin B12 — cobalamina, cobalto en el centro */
};

const nameFor = code => NAMES[code] || null;

/* --------------------------------------------------------------------------
   LA TARJETA

   Se decora después de pintar en vez de reescribir la plantilla, porque la
   plantilla vive en el fichero base y ése no se toca. El nombre PepX se
   inserta delante del nombre científico y éste se marca; el resto —el código,
   las presentaciones, la nota, el precio— se queda exactamente donde estaba.
   -------------------------------------------------------------------------- */
function dressCards(){
  document.querySelectorAll('.pcard[data-product]').forEach(card => {
    if(card.__pxNamed) return;
    const h4 = card.querySelector('h4');
    const abbr = card.querySelector('.abbr');
    if(!h4 || !abbr) return;
    const nm = nameFor(abbr.textContent.trim());
    if(!nm) return;
    card.__pxNamed = true;

    const el = document.createElement('div');
    el.className = 'px-nm';
    el.textContent = nm;
    h4.classList.add('px-sci');
    h4.parentNode.insertBefore(el, h4);
  });
}

/* --------------------------------------------------------------------------
   EL COMPUESTO ABIERTO

   Mismo orden, más grande. El <h2> del panel es el nombre científico; encima
   va el propio. Cuando NAME_LEADS es false los dos intercambian tamaño y no
   cambia nada más — ni el marcado, ni el orden de lectura.
   -------------------------------------------------------------------------- */
function dressPanel(){
  const panel = document.querySelector('#product .panel');
  if(!panel) return;
  const code = panel.querySelector('.code');
  const h2 = panel.querySelector('h2');
  if(!code || !h2 || panel.querySelector('.px-nm-big')) return;
  const nm = nameFor(code.textContent.trim());
  if(!nm) return;

  const el = document.createElement('div');
  el.className = 'px-nm-big';
  el.textContent = nm;
  h2.classList.add('px-sci-big');
  h2.parentNode.insertBefore(el, h2);
}

/* --------------------------------------------------------------------------
   engancharse a lo que ya existe
   -------------------------------------------------------------------------- */
document.documentElement.classList.toggle('px-name-leads', NAME_LEADS);

const _render = render;
render = function(route, defer){ const r = _render(route, defer); dressCards(); return r; };

if(typeof openProduct === 'function'){
  const _open = openProduct;
  openProduct = function(k, i){ const r = _open(k, i); dressPanel(); return r; };
}

dressCards();

/* El buscador indexa por nombre científico y por código; el nombre propio se
   añade a lo que ya busca, para que las dos formas de pedirlo lleguen al mismo
   sitio. */
window.__pxNames = {map: NAMES, of: nameFor, leads: NAME_LEADS};

})();

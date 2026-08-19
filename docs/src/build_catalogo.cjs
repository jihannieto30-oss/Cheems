/* ============================================================================
   CATÁLOGO PEPTIDEX — generador de Word

       node docs/src/build_catalogo.cjs

   Sale un .docx editable al cien por cien: texto, tablas y encabezados son
   objetos de Word de verdad, no una imagen ni un PDF disfrazado. Se abre y se
   toca en iPad, en Word de escritorio, en Google Docs y en Pages.

   POR QUÉ WORD Y NO UNA PÁGINA

   Porque este documento se manda. Un HTML hay que alojarlo en algún sitio y en
   un iPad se abre a medias; un Word llega por correo o por WhatsApp, se abre
   con lo que la persona ya tiene, y quien lo recibe puede corregir un precio o
   quitar una línea sin pedir permiso a nadie.

   LO QUE NO LLEVA, Y ES DELIBERADO

   Ninguna dosis. Ninguna pauta. Ni las cifras del campo `ref` de
   `library.json`, que son un calendario de dosificación humana.

   Este documento existe para compartirse, y en el momento en que se comparte
   deja de ser una nota interna: es material de la marca. Un catálogo que lleva
   miligramos por toma al lado del nombre de un compuesto es una receta con
   membrete, aunque diga «investigación» en la portada. Concentración, solvente
   y conservación sí van — son propiedades del producto, no indicaciones de
   uso.
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, PageBreak,
  TableOfContents, Header, Footer, PageNumber, VerticalAlign, LevelFormat,
  convertInchesToTwip
} = require('docx');

const RAIZ = path.resolve(__dirname, '..', '..');
const ASSETS = path.join(RAIZ, 'web', 'assets');
const SALIDA = path.join(RAIZ, 'docs', 'PEPTIDEX_Catalogo.docx');

/* ---- la paleta, tomada de los lockups entregados ------------------------ */
const TINTA   = '111111';
const GRIS    = '6B7078';
const HAIRLINE= 'DCDFE4';
const LINEAS = {
  FITNESS:   {color: '3A3F47', logo: 'logo_fitness.png',
              lema: 'Rendimiento, recuperación y masa magra'},
  BEAUTY:    {color: 'B87351', logo: 'logo_beauty.png',
              lema: 'Piel, pigmento y matriz de colágeno'},
  LONGEVITY: {color: '8A9099', logo: 'logo_longevity.png',
              lema: 'Neuroprotección, sueño y función mitocondrial'},
  SOLVENTES: {color: '8A9099', logo: null,
              lema: 'Vehículos de reconstitución y material de apoyo'}
};

/* ---- datos --------------------------------------------------------------- */
const LIB = JSON.parse(fs.readFileSync(path.join(ASSETS, 'library.json'), 'utf8'));

/* El mapa de líneas sale de la tienda; aquí sólo van los que la tienda no
   resuelve porque se escriben distinto o se añadieron después. */
const A_MANO = {
  'Lipo-C': 'FITNESS',
  'BPC157 5/10mg + TB500 5/10mg': 'FITNESS',
  'HCG': 'FITNESS',
  'Lemon Bottle': 'FITNESS',
  'Acetic Acid solution 1%': 'SOLVENTES',
  'BAC Water': 'SOLVENTES'
};

function norm(x){ return String(x||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

function cargaMapa(){
  const p = path.join(RAIZ, 'web', 'PEPTIDEX.html');
  const mapa = {};
  if(!fs.existsSync(p)) return mapa;
  const s = fs.readFileSync(p, 'utf8');
  const i = s.indexOf('const LINES={');
  if(i < 0) return mapa;
  const seg = s.slice(i, i + 400000);
  const re = /(\w+):\{\s*name:"([^"]+)"/g;
  let m;
  while((m = re.exec(seg))){
    const j = seg.indexOf('products:[', m.index + m[0].length);
    if(j < 0) continue;
    /* corchetes emparejados: cortar en el primer `]` partiría en el primer
       producto, que es un array él mismo */
    let d = 0, fin = j;
    for(let k = j + 'products:'.length; k < seg.length; k++){
      if(seg[k] === '[') d++;
      else if(seg[k] === ']'){ d--; if(d === 0){ fin = k; break; } }
    }
    const bloque = seg.slice(j, fin + 1);
    const rp = /\["([^"]*)","([^"]*)"/g;
    let q;
    while((q = rp.exec(bloque))) mapa[norm(q[2])] = m[2];
  }
  return mapa;
}

const MAPA = cargaMapa();
const ALIAS = {
  b12:'vitaminb12', adipotideftpp:'adipotide', cjc1295withdac:'cjc1295dac',
  cjc1295withoutdac:'cjc1295nodac', cjc1295withoutdac5mgipa5mg:'cjc1295ipamorelin',
  cagrilintidesemaglutide:'cagrisema', ghrp2acetate:'ghrp2', ghrp6acetate:'ghrp6',
  oxytocinacetate:'oxytocin', pinealon10mg:'pinealon', sermorelinacetate:'sermorelin',
  ghkcubpc157tb500kpv:'glowblend'
};

/* El orden importa y costó un error: la heurística por categoría iba antes que
   el mapa de la tienda, y `Glutathione` —que es un producto de BEAUTY— tiene
   la categoría «Soporte General / Solventes», así que acababa listada como si
   fuera un disolvente. El dato de la tienda es una decisión tomada; la
   categoría es una etiqueta heredada. Manda la decisión. */
function lineaDe(e){
  if(A_MANO[e.n]) return A_MANO[e.n];
  const k = ALIAS[norm(e.n)] || norm(e.n);
  if(MAPA[k]) return MAPA[k];
  if(/vehículo|vehiculo|solvente/i.test(e.cat || '')) return 'SOLVENTES';
  return 'LONGEVITY';
}

/* ---- concentración -------------------------------------------------------
   Si la ficha ya trae `conc`, manda ella. Si no, se calcula de los miligramos
   del vial y del volumen de reconstitución que la propia ficha declara. Es
   aritmética sobre su dato, no una recomendación: dice qué hay en el vial, no
   cuánto usar. */
function concentracion(e){
  if(e.conc) return e.conc;
  if(Array.isArray(e.mg) && e.mg.length && e.bac){
    const v = e.mg.map(m => (m / e.bac));
    const f = x => (Math.round(x * 100) / 100).toString().replace(/\.00$/, '');
    return v.map(f).join(' / ') + ' mg/mL  ·  al reconstituir con ' + e.bac + ' mL';
  }
  return '';
}

/* ---- helpers de composición --------------------------------------------- */
const P = (t, o = {}) => new Paragraph({
  children: [new TextRun({
    text: t, size: o.size || 20, color: o.color || TINTA,
    bold: o.bold || false, italics: o.it || false,
    characterSpacing: o.track || 0, font: 'Aptos'
  })],
  spacing: {before: o.before === undefined ? 0 : o.before,
            after: o.after === undefined ? 120 : o.after,
            line: o.line || 276},
  alignment: o.align || AlignmentType.LEFT,
  border: o.border,
  keepNext: o.keepNext || false
});

const ETIQUETA = t => P(t.toUpperCase(), {size: 15, color: GRIS, track: 60, after: 60});

function imagen(archivo, anchoPx){
  const p = path.join(ASSETS, archivo);
  if(!fs.existsSync(p)) return null;
  const dim = {
    'logo_master.png':    [1090, 672],
    'logo_fitness.png':   [1049, 201],
    'logo_beauty.png':    [1058, 206],
    'logo_longevity.png': [1087, 210]
  }[archivo] || [1000, 200];
  return new ImageRun({
    type: 'png', data: fs.readFileSync(p),
    transformation: {width: anchoPx, height: Math.round(anchoPx * dim[1] / dim[0])}
  });
}

const SIN_BORDE = {
  top:    {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'},
  bottom: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'},
  left:   {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'},
  right:  {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}
};

/* La tabla de cada ficha. Dos columnas: qué campo, y qué dice.
   Sin relleno de color y con una sola línea fina entre filas: es como se leen
   las fichas técnicas de la marca, y es lo que aguanta una fotocopia. */
function fichaTabla(filas, color){
  const ANCHO = 9360, C1 = 2600, C2 = 6760;
  return new Table({
    columnWidths: [C1, C2],
    width: {size: ANCHO, type: WidthType.DXA},
    borders: {
      ...SIN_BORDE,
      insideHorizontal: {style: BorderStyle.SINGLE, size: 2, color: HAIRLINE}
    },
    rows: filas.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: {size: C1, type: WidthType.DXA},
          margins: {top: 90, bottom: 90, right: 160},
          verticalAlign: VerticalAlign.TOP,
          children: [P(k.toUpperCase(), {size: 14, color: GRIS, track: 50, after: 0})]
        }),
        new TableCell({
          width: {size: C2, type: WidthType.DXA},
          margins: {top: 90, bottom: 90},
          children: [P(v, {size: 19, after: 0, color: TINTA})]
        })
      ]
    }))
  });
}

/* ============================================================================
   EL CONTENIDO
   ============================================================================ */
const hijos = [];

/* ---- portada ------------------------------------------------------------- */
const master = imagen('logo_master.png', 260);
if(master) hijos.push(new Paragraph({
  children: [master], alignment: AlignmentType.CENTER,
  spacing: {before: 2400, after: 480}
}));
hijos.push(P('CATÁLOGO DE COMPUESTOS', {size: 30, bold: true, track: 120,
  align: AlignmentType.CENTER, after: 140}));
hijos.push(P('Engineered Beyond Perfection', {size: 19, color: GRIS, it: true,
  align: AlignmentType.CENTER, after: 700}));
hijos.push(P('FITNESS   ·   BEAUTY   ·   LONGEVITY', {size: 16, color: GRIS,
  track: 90, align: AlignmentType.CENTER, after: 900}));
hijos.push(P('Material de uso exclusivo en investigación', {size: 17, bold: true,
  align: AlignmentType.CENTER, after: 80}));
hijos.push(P('No destinado a consumo humano ni a uso diagnóstico o terapéutico.',
  {size: 16, color: GRIS, align: AlignmentType.CENTER, after: 600}));
hijos.push(P(LIB.length + ' compuestos  ·  ' + new Date().toLocaleDateString('es-MX',
  {year: 'numeric', month: 'long'}), {size: 16, color: GRIS,
  align: AlignmentType.CENTER}));
hijos.push(new Paragraph({children: [new PageBreak()]}));

/* ---- índice -------------------------------------------------------------- */
hijos.push(new Paragraph({heading: HeadingLevel.HEADING_1,
  children: [new TextRun({text: 'Índice', font: 'Aptos', size: 32, bold: true, color: TINTA})],
  spacing: {after: 240}}));
hijos.push(P('Toca cualquier entrada para ir a su página. Si editas el documento, '
  + 'actualiza el índice con clic derecho → Actualizar campos.',
  {size: 17, color: GRIS, after: 300}));
hijos.push(new TableOfContents('Índice', {hyperlink: true, headingStyleRange: '1-2'}));
hijos.push(new Paragraph({children: [new PageBreak()]}));

/* ---- qué son los péptidos ------------------------------------------------ */
hijos.push(new Paragraph({heading: HeadingLevel.HEADING_1,
  children: [new TextRun({text: 'Qué son los péptidos', font: 'Aptos', size: 32, bold: true, color: TINTA})],
  spacing: {after: 240}}));

const PREGUNTAS = [
  ['¿Qué es un péptido?',
   'Una cadena corta de aminoácidos unidos entre sí. Los aminoácidos son las mismas '
 + 'piezas con las que el cuerpo construye sus proteínas; la diferencia entre un '
 + 'péptido y una proteína es sólo de longitud. Por convención, hasta unos cincuenta '
 + 'aminoácidos se habla de péptido, y por encima de ahí de proteína.'],

  ['¿En qué se diferencia de un fármaco tradicional?',
   'Un fármaco clásico suele ser una molécula pequeña, fabricada por síntesis química '
 + 'y capaz de atravesar membranas con facilidad. Un péptido es una molécula grande y '
 + 'frágil, más parecida a lo que el propio organismo produce. Esa semejanza es lo que '
 + 'los hace interesantes en investigación y también lo que los hace delicados de '
 + 'conservar y de administrar.'],

  ['¿Por qué el orden de los aminoácidos importa tanto?',
   'Porque la secuencia determina la forma, y la forma determina la función. Un '
 + 'péptido actúa encajando en un receptor como una llave en una cerradura. Cambiar un '
 + 'solo aminoácido, o dejar que la cadena pierda su plegamiento, puede dejar la '
 + 'molécula intacta en peso y completamente inútil en efecto.'],

  ['¿Qué significa «grado investigación»?',
   'Que el material se produce y se vende para trabajo de laboratorio: ensayos in '
 + 'vitro, caracterización analítica, desarrollo de método. No es un medicamento, no '
 + 'está aprobado para uso en personas y no se acompaña de indicaciones clínicas. Es '
 + 'una categoría regulatoria distinta, con obligaciones distintas.'],

  ['¿Qué es un COA y por qué se pide siempre?',
   'El certificado de análisis es el documento que acompaña a cada lote y dice qué '
 + 'contiene de verdad. Un COA completo trae al menos: identidad confirmada por '
 + 'espectrometría de masas, pureza medida por HPLC con su cromatograma, contenido '
 + 'neto de péptido, humedad residual y contraión. Un certificado que sólo declara un '
 + 'porcentaje, sin método y sin cromatograma, no es un certificado: es una '
 + 'afirmación.'],

  ['¿Qué quiere decir «pureza 99 %»?',
   'Que el 99 % del área del cromatograma corresponde al pico del compuesto buscado. '
 + 'El 1 % restante son impurezas de síntesis: cadenas truncadas, deleciones, '
 + 'variantes. Conviene saber que la pureza se mide sobre el material peptídico, no '
 + 'sobre el contenido del vial — y ésas son dos cosas distintas, como explica la '
 + 'pregunta siguiente.'],

  ['¿Por qué un vial de 5 mg puede tener menos de 5 mg de péptido?',
   'Porque el polvo liofilizado no es sólo péptido: lleva agua residual, sales y el '
 + 'contraión que queda de la purificación, habitualmente trifluoroacetato. El '
 + '«contenido neto de péptido» es la fracción que de verdad es la molécula, y suele '
 + 'estar entre el 75 % y el 90 % de la masa declarada. Es el dato que permite '
 + 'comparar precios entre proveedores de forma honesta.'],

  ['¿Qué es la reconstitución?',
   'El paso de llevar el polvo liofilizado a solución añadiendo un disolvente estéril, '
 + 'normalmente agua bacteriostática. El disolvente y el volumen determinan la '
 + 'concentración final. En este catálogo, la concentración de cada compuesto aparece '
 + 'con el volumen de referencia sobre el que está calculada.'],

  ['¿Qué es el agua bacteriostática?',
   'Agua estéril con alcohol bencílico al 0,9 %, que inhibe el crecimiento bacteriano '
 + 'y permite que un vial reconstituido se conserve más tiempo que con agua estéril '
 + 'simple. Algunos compuestos poco solubles requieren en cambio una solución ácida. '
 + 'El disolvente correcto de cada uno figura en su ficha.'],

  ['¿Por qué hace falta cadena de frío?',
   'Porque los péptidos se degradan por hidrólisis, oxidación y agregación, y las tres '
 + 'se aceleran con el calor. En polvo y a −20 °C un péptido aguanta años; en solución '
 + 'y a temperatura ambiente puede perder actividad en días. La conservación no es una '
 + 'recomendación de almacén: es parte de la especificación del producto.'],

  ['¿Por qué unos se guardan en refrigeración y otros congelados?',
   'Depende de la estabilidad de cada secuencia y de si está en polvo o en solución. '
 + 'La regla general es que el liofilizado tolera congelación y la solución no debe '
 + 'congelarse y descongelarse repetidamente, porque cada ciclo favorece la '
 + 'agregación. Cada ficha indica la condición concreta.'],

  ['¿Qué significan las tres líneas de PEPTIDEX?',
   'Son una forma de ordenar el catálogo por área de investigación, no una promesa de '
 + 'resultado. FITNESS agrupa lo relacionado con tejido, metabolismo y eje '
 + 'somatotrópico; BEAUTY, lo relacionado con piel, pigmento y matriz; LONGEVITY, lo '
 + 'relacionado con neuroprotección, sueño y función mitocondrial.'],

  ['¿Por qué este catálogo no trae dosis?',
   'Porque una dosis es una indicación de uso en un organismo, y este material no está '
 + 'destinado a un organismo. Incluir pautas convertiría un catálogo de investigación '
 + 'en algo distinto, con consecuencias regulatorias reales en México y en Estados '
 + 'Unidos. Lo que sí encontrarás es todo lo que define al producto: composición, '
 + 'concentración, disolvente y conservación.']
];

PREGUNTAS.forEach(([q, a]) => {
  hijos.push(P(q, {size: 21, bold: true, before: 220, after: 70, keepNext: true}));
  hijos.push(P(a, {size: 19, color: '2A2E35', after: 60, line: 300}));
});

hijos.push(new Paragraph({children: [new PageBreak()]}));

/* ---- cómo leer una ficha ------------------------------------------------- */
hijos.push(new Paragraph({heading: HeadingLevel.HEADING_1,
  children: [new TextRun({text: 'Cómo leer una ficha', font: 'Aptos', size: 32, bold: true, color: TINTA})],
  spacing: {after: 240}}));
hijos.push(P('Cada compuesto trae los mismos siete campos, siempre en el mismo orden.',
  {size: 19, color: GRIS, after: 240}));
hijos.push(fichaTabla([
  ['Clase', 'El área de investigación a la que pertenece.'],
  ['Presentación', 'Los formatos de vial disponibles y cuántos vienen por caja.'],
  ['Concentración', 'Miligramos por mililitro una vez reconstituido, con el volumen de referencia sobre el que está calculada.'],
  ['SKU', 'La referencia interna. Es lo que hay que citar al pedir.'],
  ['Disolvente', 'Con qué se reconstituye. No son intercambiables.'],
  ['Conservación', 'Temperatura y condiciones. Forma parte de la especificación, no es un consejo.'],
  ['Mecanismo', 'Qué hace la molécula, descrito en términos de su diana. No es una afirmación de eficacia.']
], TINTA));
hijos.push(new Paragraph({children: [new PageBreak()]}));

/* ---- las líneas ---------------------------------------------------------- */
const porLinea = {FITNESS: [], BEAUTY: [], LONGEVITY: [], SOLVENTES: []};
LIB.forEach(e => porLinea[lineaDe(e)].push(e));
Object.values(porLinea).forEach(a => a.sort((x, y) => x.n.localeCompare(y.n, 'es')));

['FITNESS', 'BEAUTY', 'LONGEVITY', 'SOLVENTES'].forEach((clave, idx) => {
  const L = LINEAS[clave], lista = porLinea[clave];
  if(!lista.length) return;
  if(idx > 0) hijos.push(new Paragraph({children: [new PageBreak()]}));

  const lg = L.logo ? imagen(L.logo, 300) : null;
  if(lg){
    hijos.push(new Paragraph({children: [lg], alignment: AlignmentType.CENTER,
      spacing: {before: 900, after: 260}}));
  }else{
    hijos.push(P('PEPTIDEX', {size: 26, bold: true, track: 140,
      align: AlignmentType.CENTER, before: 900, after: 120}));
  }
  hijos.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({text: clave, font: 'Aptos', size: 34, bold: true,
      color: L.color, characterSpacing: 140})],
    alignment: AlignmentType.CENTER, spacing: {after: 100}
  }));
  hijos.push(P(L.lema, {size: 19, color: GRIS, it: true,
    align: AlignmentType.CENTER, after: 80}));
  hijos.push(P(lista.length + (lista.length === 1 ? ' referencia' : ' referencias'),
    {size: 16, color: GRIS, track: 70, align: AlignmentType.CENTER, after: 0}));
  hijos.push(new Paragraph({children: [new PageBreak()]}));

  lista.forEach((e, i) => {
    if(i > 0) hijos.push(P('', {after: 260}));
    hijos.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({text: e.n, font: 'Aptos', size: 26, bold: true, color: TINTA})],
      spacing: {before: 120, after: 30}, keepNext: true,
      border: {bottom: {style: BorderStyle.SINGLE, size: 8, color: L.color, space: 6}}
    }));
    if(e.ins) hijos.push(P(e.ins, {size: 18, color: GRIS, it: true, after: 160, keepNext: true}));

    const filas = [];
    if(e.cat) filas.push(['Clase', e.cat]);
    if(e.esp) filas.push(['Presentación', e.esp]);
    const c = concentracion(e);
    if(c) filas.push(['Concentración', c]);
    if(e.sku) filas.push(['SKU', e.sku]);
    if(e.sol) filas.push(['Disolvente', e.sol]);
    if(e.alm) filas.push(['Conservación', e.alm]);
    if(e.mec) filas.push(['Mecanismo', e.mec]);
    hijos.push(fichaTabla(filas, L.color));
  });
});

/* ---- aviso final --------------------------------------------------------- */
hijos.push(new Paragraph({children: [new PageBreak()]}));
hijos.push(new Paragraph({heading: HeadingLevel.HEADING_1,
  children: [new TextRun({text: 'Aviso', font: 'Aptos', size: 32, bold: true, color: TINTA})],
  spacing: {after: 240}}));
[
 'Todo el material descrito en este catálogo es de uso exclusivo en investigación. '
+'No está destinado a consumo humano ni animal, ni a uso diagnóstico, preventivo o '
+'terapéutico, y no ha sido evaluado por ninguna agencia sanitaria para esos fines.',

 'Este documento no contiene dosis, pautas ni vías de administración, y su ausencia '
+'es deliberada. PEPTIDEX no recomienda protocolos de uso.',

 'Las descripciones de mecanismo resumen la diana molecular descrita en la '
+'literatura. No son afirmaciones de eficacia ni de seguridad.',

 'Las especificaciones de cada lote son las del certificado de análisis que lo '
+'acompaña. Ante cualquier diferencia, manda el certificado del lote.',

 'La disponibilidad, las presentaciones y las referencias pueden cambiar sin previo '
+'aviso. Confirma siempre contra el pedido.'
].forEach(t => hijos.push(P(t, {size: 18, color: '2A2E35', after: 140, line: 300})));

hijos.push(P('PEPTIDEX  ·  official.peptidex@outlook.com', {size: 17, color: GRIS,
  track: 60, align: AlignmentType.CENTER, before: 500}));

/* ============================================================================
   DOCUMENTO
   ============================================================================ */
const doc = new Document({
  creator: 'PEPTIDEX',
  title: 'PEPTIDEX — Catálogo de compuestos',
  description: 'Catálogo de compuestos de investigación. Uso exclusivo en investigación.',
  styles: {
    default: {
      document: {run: {font: 'Aptos', size: 20, color: TINTA}}
    },
    paragraphStyles: [
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
       quickFormat: true,
       run: {font: 'Aptos', size: 32, bold: true, color: TINTA},
       paragraph: {spacing: {before: 240, after: 160}, outlineLevel: 0}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
       quickFormat: true,
       run: {font: 'Aptos', size: 26, bold: true, color: TINTA},
       paragraph: {spacing: {before: 200, after: 60}, outlineLevel: 1}}
    ]
  },
  sections: [{
    properties: {
      page: {
        size: {width: 12240, height: 15840},          /* US Letter */
        margin: {top: 1080, right: 1440, bottom: 1080, left: 1440}
      }
    },
    headers: {
      default: new Header({children: [
        new Paragraph({
          children: [new TextRun({text: 'PEPTIDEX  ·  CATÁLOGO DE COMPUESTOS',
            font: 'Aptos', size: 14, color: GRIS, characterSpacing: 70})],
          alignment: AlignmentType.CENTER, spacing: {after: 60},
          border: {bottom: {style: BorderStyle.SINGLE, size: 2, color: HAIRLINE, space: 6}}
        })
      ]})
    },
    footers: {
      default: new Footer({children: [
        new Paragraph({
          children: [
            new TextRun({text: 'Uso exclusivo en investigación  ·  ',
              font: 'Aptos', size: 13, color: GRIS}),
            new TextRun({children: [PageNumber.CURRENT], font: 'Aptos', size: 13, color: GRIS})
          ],
          alignment: AlignmentType.CENTER
        })
      ]})
    },
    children: hijos
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(SALIDA, buf);
  const n = Object.entries(porLinea).map(([k, v]) => `${k} ${v.length}`).join(' · ');
  console.log(`  ${SALIDA}`);
  console.log(`  ${LIB.length} compuestos — ${n}`);
  console.log(`  ${(buf.length / 1024).toFixed(0)} KB`);
});

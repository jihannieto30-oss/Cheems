/*
  Technical datasheets — the Certilas shape, in Unibraze's system.

  The reference layout is the one every consumables maker converges on, because
  it is the one a welding engineer reads: a stack of full-width label/content
  rows down the page (TYPE, APPLICATIONS, PROPERTIES, CLASSIFICATION, SUITABLE
  FOR, APPROVALS, POSITIONS) followed by the data tables (chemistry, mechanical
  properties, welding parameters, packaging). Nothing is in a sidebar and
  nothing is in a card; a datasheet is read top to bottom and printed.

  Shape
  -----
  id            slug, matches the catalogue designation
  title         what is on the label
  designation   the classification as written, headline size
  type          one line: what this consumable is
  properties    [string]  — what it does
  applications  [string]  — where it is used
  classification[{ body, value }] — AWS, EN ISO, W.Nr, F-no, A-no …
  suitable      [{ label, value }] — base materials this joins
  approvals     [string]
  positions     [string]  — PA … PG, or 1G … 6G
  facts         [{ k, v }] — gas, polarity, hydrogen, diameters, packaging
  chemistry     { note, elements: [string], rows: [{ label, values: [string] }] }
  mechanical    { note, columns: [string], rows: [{ label, values: [string] }] }
  parameters    { columns: [string], rows: [{ values: [string] }] }
  packaging     [{ size, rows: [{ pack, kg, code }] }]
  notice        the disclaimer, verbatim

  Every field is optional. A sheet renders the sections it has and says
  plainly, once, which of the others have not been supplied — an empty table
  drawn with dashes in it reads as data, and this is the one document on the
  site where that would be a real problem.

  On what is real here
  --------------------
  SHEETS holds only datasheets whose numbers came from a Unibraze document.
  There is exactly one at the time of writing, and it is complete. Every other
  designation in the catalogue gets a skeleton built from its classification —
  which is genuinely known — and nothing else. Chemistry and mechanical
  properties are measured, not derived; inventing a plausible carbon content
  for 187 products would produce a site that looks finished and lies. The
  editor exists to fill them in from the real certificates.
*/

/** The disclaimer, as it appears on the company's own sheets. */
export const NOTICE =
  'Los resultados informados se basan en pruebas del producto bajo condiciones ' +
  'de laboratorio controladas de acuerdo con Estándares de la Sociedad Americana ' +
  'de Soldadura. El uso real del producto puede producir resultados diferentes ' +
  'debido a las diferentes condiciones. Un ejemplo de tales condiciones sería el ' +
  'tamaño del electrodo, la química de la placa, el medio ambiente, el diseño de ' +
  'la soldadura, los métodos de fabricación, la soldadura, requisitos de ' +
  'procedimiento y servicio. Por lo tanto, los resultados no son garantías para ' +
  'su uso en el campo. El fabricante renuncia a cualquier garantía de ' +
  'comerciabilidad o idoneidad para cualquier propósito específico con respecto ' +
  'a sus productos.'

/** The order sections are rendered in, and what each is called. */
export const SECTIONS = [
  { key: 'type', label: 'TIPO' },
  { key: 'properties', label: 'PROPIEDADES' },
  { key: 'applications', label: 'APLICACIÓN' },
  { key: 'classification', label: 'CLASIFICACIÓN' },
  { key: 'suitable', label: 'APTO PARA' },
  { key: 'approvals', label: 'APROBACIONES' },
  { key: 'positions', label: 'POSICIONES' },
]

export const SHEETS = {
  /*
    Transcribed from the Unibraze datasheet for FCAW E81T1-Ni1CJ/Ni1MJ H4 CC
    SMLSS. Every number below is from that document; the two deposit columns
    are the two shielding gases it was tested under, which is why they are
    reported separately and why the AWS column beside them is a limit rather
    than a measurement.
  */
  // Keyed by the catalogue id for E81T1-Ni1, which is the designation this
  // document classifies — the C/M suffixes are the two shielding gases it was
  // qualified under, not two different products.
  'e81t1-ni1': {
    id: 'e81t1-ni1',
    title: 'FCAW E81T1-Ni1CJ / Ni1MJ H4 CC SMLSS',
    designation: 'E81T1-Ni1C-J H4 / E81T1-Ni1M-J H4',
    type: 'Alambre tubular de flux de tipo rutilo para soldadura con gas de protección.',

    properties: [
      'Proporciona un metal depositado con un contenido de hidrógeno difusible extremadamente bajo.',
      'Ofrece un arco suave y una excelente soldabilidad.',
      'Presenta una buena tenacidad al impacto a −40 °C.',
      'Apto para soldar en todas las posiciones.',
      'Capaz de cumplir con los requisitos de tratamiento térmico.',
    ],

    applications: [
      'Estructuras de acero',
      'Equipos para operaciones en alta mar',
      'Recipientes a presión',
      'Oleoductos y gasoductos',
      'Puentes',
    ],

    classification: [
      { body: 'AWS A5.29', value: 'E81T1-Ni1C-J H4 / E81T1-Ni1M-J H4' },
      { body: 'EN ISO 17632-A', value: 'T 46 4 1Ni P (C1 & M21) 1 H5' },
    ],

    approvals: [],

    positions: ['PA', 'PB', 'PC', 'PD', 'PE', 'PF', 'PG'],

    facts: [
      { k: 'Tipo', v: 'Alambres de flux de tipo rutilo para soldadura con gas.' },
      { k: 'Gas de protección', v: 'Compatible con 100 % CO₂ o una mezcla de 80 % Argón (Ar) y 20 % CO₂.' },
      { k: 'Polaridad', v: 'DC+ (corriente continua, electrodo positivo).' },
      { k: 'Posición de soldadura', v: 'Adecuado para todas las posiciones (PA, PB, PC, PD, PE, PF, PG).' },
      { k: 'Hidrógeno difusible', v: 'Menos de 3.0 ml por 100 g.' },
      { k: 'Diámetro', v: '1.2 mm · 1.4 mm · 1.6 mm.' },
      { k: 'Embalaje', v: 'Bobinas de 5 kg o 15 kg.' },
    ],

    chemistry: {
      note: 'Composición química del metal depositado, % en peso',
      elements: ['C', 'Si', 'Mn', 'Cr', 'Ni', 'Mo', 'P', 'S', 'V', 'Cu'],
      rows: [
        {
          label: 'AWS',
          note: 'límite',
          values: ['0.12', '0.80', '1.75', '0.15', '0.8–1.1', '0.35', '0.03', '0.03', '0.05', '—'],
        },
        {
          label: 'C1',
          note: '100 % CO₂',
          values: ['0.037', '0.345', '1.506', '0.03', '0.842', '0.009', '0.015', '0.002', '0.009', '0.114'],
        },
        {
          label: 'M21',
          note: '80 Ar / 20 CO₂',
          values: ['0.038', '0.505', '1.696', '0.032', '0.82', '0.012', '0.013', '0.002', '0.01', '0.104'],
        },
      ],
    },

    mechanical: {
      note: 'Metal depositado',
      columns: ['AWS', 'C1', 'M21'],
      rows: [
        { label: 'Límite elástico (MPa)', values: ['470', '530', '630'] },
        { label: 'Resistencia a la tracción (MPa)', values: ['550–690', '603', '684'] },
        { label: 'Elongación (%)', values: ['19', '27', '22'] },
        {
          label: 'Energía de impacto Charpy (KV2) J',
          values: ['27 a −40 °C', '56 · 61 · 72 a −40 °C', '116 · 100 · 122 a −40 °C'],
        },
      ],
    },

    parameters: {
      note: 'Parámetros de soldadura recomendados',
      columns: ['Diámetro (mm)', 'Voltaje (V)', 'Corriente (A)', 'Extensión (mm)', 'Gas (L/min)'],
      rows: [
        { values: ['1.2', '22–32', '150–300', '15–20', '15–25'] },
        { values: ['1.4', '23–35', '170–350', '15–20', '15–25'] },
        { values: ['1.6', '25–40', '200–400', '15–20', '15–25'] },
      ],
    },

    packaging: [
      { size: '1.2 mm', rows: [{ pack: 'Bobina', kg: '5' }, { pack: 'Bobina', kg: '15' }] },
      { size: '1.4 mm', rows: [{ pack: 'Bobina', kg: '5' }, { pack: 'Bobina', kg: '15' }] },
      { size: '1.6 mm', rows: [{ pack: 'Bobina', kg: '5' }, { pack: 'Bobina', kg: '15' }] },
    ],

    notice: NOTICE,
  },
}

/**
 * A sheet with nothing measured in it: the classification, which is known from
 * the designation itself, and nothing more. This is what every product without
 * a transcribed certificate gets, and the missing sections are reported as
 * missing rather than drawn empty.
 */
export function skeletonSheet(item, formLabels = []) {
  if (!item) return null
  return {
    id: item.id,
    title: item.designation,
    designation: item.designation,
    type: item.note || '',
    classification: item.spec ? [{ body: item.spec, value: item.designation }] : [],
    facts: [
      item.process ? { k: 'Proceso', v: item.process } : null,
      formLabels.length ? { k: 'Forma', v: formLabels.join(' · ') } : null,
    ].filter(Boolean),
    notice: NOTICE,
    /* Marks this as a shell rather than a document. The page says so, once. */
    skeleton: true,
  }
}

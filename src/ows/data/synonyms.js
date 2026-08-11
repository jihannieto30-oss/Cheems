/*
  Spanish access to an English corpus.

  The technical records are written in English — that is where the source
  material is, and AWS designations are not translated by anybody. But the
  interface is Spanish, and a reader who types "aluminio" or "porosidad" and
  gets nothing back concludes the index is empty, not that it speaks a
  different language.

  So each record's match surface is widened: when it already covers a concept
  in English, the Spanish words for that concept are appended to it. Nothing is
  displayed differently and no record is duplicated — this only affects what a
  query can reach.

  Read as: typing any key on the left should find records that talk about any
  term on the right. Keys are stored unaccented because queries are folded
  before matching.
*/
export const SPANISH_ALIASES = {
  // ---- materials -------------------------------------------------------
  acero: ['steel'],
  aluminio: ['aluminum', 'aluminium'],
  inoxidable: ['stainless'],
  austenitico: ['austenitic'],
  ferritico: ['ferritic'],
  duplex: ['duplex'],
  carbono: ['carbon'],
  niquel: ['nickel', 'inconel'],
  cobre: ['copper'],
  bronce: ['bronze'],
  laton: ['brass'],
  plata: ['silver'],
  'hierro fundido': ['cast iron'],
  fundicion: ['cast iron'],
  aleacion: ['alloy'],
  'metal base': ['base metal'],
  cromo: ['chromium', 'chrome'],
  molibdeno: ['molybdenum'],
  manganeso: ['manganese'],
  silicio: ['silicon'],
  azufre: ['sulfur', 'sulphur'],
  fosforo: ['phosphorus'],
  titanio: ['titanium'],
  magnesio: ['magnesium'],

  // ---- product forms ---------------------------------------------------
  alambre: ['wire'],
  varilla: ['rod'],
  electrodo: ['electrode'],
  revestido: ['covered', 'coated'],
  rollo: ['spool', 'coil'],
  carrete: ['spool'],
  'metal de aporte': ['filler metal'],
  aporte: ['filler'],
  tubular: ['flux cored', 'tubular'],
  fundente: ['flux'],
  soldadura: ['welding', 'weld', 'brazing'],
  'soldadura fuerte': ['brazing'],
  recargue: ['hardfacing', 'overlay'],

  // ---- processes and parameters ---------------------------------------
  proceso: ['process'],
  arco: ['arc'],
  gas: ['gas', 'shielding'],
  'gas de proteccion': ['shielding gas'],
  proteccion: ['shielding'],
  polaridad: ['polarity'],
  corriente: ['current', 'amperage'],
  amperaje: ['amperage', 'current'],
  voltaje: ['voltage'],
  parametros: ['parameters'],
  posicion: ['position'],
  penetracion: ['penetration'],
  deposito: ['deposit', 'deposition'],
  cordon: ['bead'],
  pasada: ['pass'],
  raiz: ['root'],
  bisel: ['bevel', 'groove'],
  junta: ['joint'],
  filete: ['fillet'],
  corte: ['cutting'],
  tungsteno: ['tungsten'],

  // ---- defects ---------------------------------------------------------
  defecto: ['defect', 'discontinuity'],
  porosidad: ['porosity'],
  poros: ['porosity'],
  grieta: ['crack', 'cracking'],
  fisura: ['crack', 'cracking'],
  agrietamiento: ['cracking'],
  socavado: ['undercut'],
  mordedura: ['undercut'],
  'falta de fusion': ['lack of fusion'],
  distorsion: ['distortion'],
  deformacion: ['distortion'],
  escoria: ['slag'],
  salpicadura: ['spatter'],
  inclusion: ['inclusion'],

  // ---- metallurgy ------------------------------------------------------
  metalurgia: ['metallurgy'],
  microestructura: ['microstructure'],
  composicion: ['composition', 'chemistry'],
  ferrita: ['ferrite'],
  austenita: ['austenite'],
  martensita: ['martensite'],
  dureza: ['hardness'],
  traccion: ['tensile'],
  fluencia: ['yield'],
  tenacidad: ['toughness'],
  impacto: ['impact', 'charpy'],
  hidrogeno: ['hydrogen'],
  'zona afectada por el calor': ['heat affected zone'],
  precalentamiento: ['preheat'],
  'tratamiento termico': ['heat treatment', 'pwht'],
  'alivio de tensiones': ['stress relief', 'residual stress'],
  tension: ['stress'],
  temperatura: ['temperature'],
  soldabilidad: ['weldability'],
  'carbono equivalente': ['carbon equivalent'],

  // ---- inspection and documents ---------------------------------------
  inspeccion: ['inspection'],
  ensayo: ['test', 'testing'],
  ultrasonido: ['ultrasonic'],
  radiografia: ['radiographic', 'radiography'],
  penetrantes: ['penetrant'],
  'particulas magneticas': ['magnetic particle'],
  norma: ['standard', 'code', 'specification'],
  normas: ['standard', 'code'],
  codigo: ['code'],
  especificacion: ['specification'],
  procedimiento: ['procedure', 'wps'],
  calificacion: ['qualification'],
  certificado: ['certificate'],
  simbolos: ['symbols'],
  aplicaciones: ['applications'],
  seleccion: ['selection'],
}

/** Words carried only for grammar; they would match everything. */
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'por', 'y', 'en', 'a'])

/** Strips accents and lowercases, so "aleación" and "aleacion" are one word. */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * The Spanish terms that should reach a record, given its English match text.
 * Returns both the full phrases and their individual words, because a query is
 * matched token by token but the haystack is searched as a string.
 */
export function aliasesFor(haystack) {
  const phrases = new Set()
  const words = new Set()

  for (const [spanish, english] of Object.entries(SPANISH_ALIASES)) {
    if (!english.some((term) => haystack.includes(term))) continue
    phrases.add(spanish)
    for (const word of spanish.split(' ')) {
      if (!STOPWORDS.has(word)) words.add(word)
    }
  }

  return { phrases, words }
}

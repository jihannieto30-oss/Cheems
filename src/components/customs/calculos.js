// Motor de cálculo del pedimento: contribuciones, número oficial,
// cadena original, sello digital simulado y validaciones VUCEM/SAT.
// Fórmulas con fines educativos. Verifica siempre la normatividad vigente.

// Cuotas y tasas de referencia (ilustrativas).
export const TASA_DTA = 0.008        // 8 al millar sobre el valor en aduana
export const DTA_MINIMO_MXN = 419    // cuota mínima aproximada de DTA
export const DTA_CUOTA_FIJA_TEMP = 419 // cuota fija para temporales (aprox.)
export const PREVALIDACION_MXN = 290 // cuota de prevalidación por pedimento
export const TASA_IVA = 0.16         // IVA general 16%

// Redondeo a 2 decimales evitando errores de punto flotante.
export function r2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// Valor en aduana de una partida (en MXN).
// valorComercial + incrementables, todo convertido con el tipo de cambio.
export function valorAduanaPartida(item, incrementablesUSD, tipoCambio) {
  const comercialUSD = Number(item.valorComercial) || 0
  const inc = Number(incrementablesUSD) || 0
  return r2((comercialUSD + inc) * tipoCambio)
}

// Reparte los incrementables totales (flete + seguro + otros) de forma
// proporcional al valor comercial de cada partida.
export function calcularPartidas(items, incrementablesUSD, tipoCambio, esExportacion) {
  const totalComercial = items.reduce((s, i) => s + (Number(i.valorComercial) || 0), 0) || 1
  return items.map((item) => {
    const comercialUSD = Number(item.valorComercial) || 0
    const proporcion = comercialUSD / totalComercial
    const incPartida = (Number(incrementablesUSD) || 0) * proporcion
    const valorAduana = valorAduanaPartida(item, incPartida, tipoCambio)
    // En exportación definitiva el IGE general es 0%.
    const tasaIgi = esExportacion ? 0 : (Number(item.igi) || 0)
    const igi = r2(valorAduana * tasaIgi)
    return {
      ...item,
      valorComercialMXN: r2(comercialUSD * tipoCambio),
      incrementableMXN: r2(incPartida * tipoCambio),
      valorAduana,
      tasaIgiAplicada: tasaIgi,
      igi,
    }
  })
}

// Suma de incrementables en USD según el incoterm seleccionado.
export function incrementablesUSD(transporte, incoterm) {
  const flete = (incoterm?.fleteIncrementa ? Number(transporte.flete) : 0) || 0
  const seguro = (incoterm?.seguroIncrementa ? Number(transporte.seguro) : 0) || 0
  const embalajes = Number(transporte.embalajes) || 0
  const otros = Number(transporte.otros) || 0
  return r2(flete + seguro + embalajes + otros)
}

// Liquidación completa de contribuciones.
export function liquidar({ partidas, regimen, esExportacion, cuotasComp = 0 }) {
  const valorAduana = r2(partidas.reduce((s, p) => s + p.valorAduana, 0))
  const igi = r2(partidas.reduce((s, p) => s + p.igi, 0))

  const esTemporal = ['ITR', 'ITE', 'ETR', 'ETE'].includes(regimen)
  let dta
  if (esExportacion) {
    dta = DTA_CUOTA_FIJA_TEMP // exportación: cuota fija
  } else if (esTemporal) {
    dta = DTA_CUOTA_FIJA_TEMP
  } else {
    dta = r2(Math.max(valorAduana * TASA_DTA, DTA_MINIMO_MXN))
  }

  const prevalidacion = PREVALIDACION_MXN
  const comp = Number(cuotasComp) || 0

  // Base de IVA: valor en aduana + IGI + DTA + prevalidación + cuotas comp.
  // En exportación definitiva la tasa de IVA es 0%.
  const baseIva = r2(valorAduana + igi + dta + prevalidacion + comp)
  const iva = esExportacion ? 0 : r2(baseIva * TASA_IVA)

  const total = r2(igi + dta + prevalidacion + comp + iva)

  return {
    valorAduana,
    igi,
    dta,
    prevalidacion,
    cuotasComp: comp,
    baseIva,
    iva,
    total,
    esTemporal,
  }
}

// Genera el número de pedimento de 15 dígitos:
// AA (año) + AAA→usa 2 de aduana + PPPP (patente) + NNNNNNN (consecutivo).
// Formato visible: "AA  AA  PPPP  NNNNNNN".
export function generarNumeroPedimento(aduanaClave, patente, fecha) {
  const yy = String(new Date(fecha || Date.now()).getFullYear()).slice(-2)
  const adu = String(aduanaClave || '00').padStart(3, '0').slice(-2)
  const pat = String(patente || '0000').padStart(4, '0').slice(-4)
  const cons = String(Math.floor(1000000 + Math.random() * 8999999)).slice(0, 7)
  return `${yy} ${adu} ${pat} ${cons}`
}

// Hash determinístico simple (FNV-1a de 32 bits) -> hex. Solo para simular.
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

// Construye la "cadena original" del pedimento con sus campos clave.
export function construirCadenaOriginal(p) {
  return [
    p.numeroPedimento,
    p.tipoOperacion,
    p.clave,
    p.regimen,
    p.aduana,
    p.rfcImportador,
    p.tipoCambio,
    p.valorAduana,
    p.total,
    p.fecha,
  ].map((v) => (v ?? '').toString().trim()).join('|')
}

// Sello digital simulado: cadena pseudo-aleatoria estable a partir del hash.
export function generarSello(cadenaOriginal) {
  const base = fnv1a(cadenaOriginal)
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let seed = parseInt(base, 16) >>> 0
  let out = ''
  for (let i = 0; i < 172; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345 + i * 7) >>> 0
    out += charset[seed % charset.length]
    if ((i + 1) % 86 === 0 && i !== 171) out += '\n'
  }
  return out
}

// Validaciones tipo "validador VUCEM/SAT". Devuelve lista de chequeos.
export function validarPedimento(estado) {
  const checks = []
  const add = (label, ok, detail) => checks.push({ label, ok, detail })

  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i
  add(
    'RFC del importador/exportador',
    rfcRegex.test((estado.general.rfc || '').trim()),
    'Debe cumplir el formato del RFC (12-13 caracteres).'
  )
  add(
    'Razón social registrada',
    (estado.general.razonSocial || '').trim().length >= 3,
    'Captura la razón social o nombre del contribuyente.'
  )
  add(
    'Patente del agente aduanal',
    /^\d{4}$/.test((estado.general.patente || '').trim()),
    'La patente debe tener 4 dígitos.'
  )
  add(
    'Aduana de despacho seleccionada',
    !!estado.general.aduana,
    'Selecciona la aduana de entrada/salida.'
  )
  add(
    'Tipo de cambio válido',
    Number(estado.general.tipoCambio) > 0,
    'Captura el tipo de cambio DOF aplicable.'
  )
  add(
    'Proveedor / comprador en el extranjero',
    (estado.contraparte.razonSocial || '').trim().length >= 3 && !!estado.contraparte.pais,
    'Captura los datos del proveedor (importación) o comprador (exportación).'
  )
  const partidasValidas = estado.items.length > 0 && estado.items.every(
    (i) => /^\d{4}\.\d{2}\.\d{2}$/.test((i.fraccion || '').trim()) &&
      (Number(i.valorComercial) || 0) > 0 &&
      (Number(i.cantidadUMC) || 0) > 0
  )
  add(
    'Partidas y fracciones arancelarias',
    partidasValidas,
    'Cada partida requiere fracción (NNNN.NN.NN), cantidad y valor comercial.'
  )
  add(
    'Pesos de la mercancía',
    (Number(estado.transporte.pesoBruto) || 0) > 0,
    'Captura el peso bruto en kilogramos.'
  )
  add(
    'Valor en aduana mayor a cero',
    (Number(estado.liquidacion.valorAduana) || 0) > 0,
    'El valor en aduana resulta de la suma de las partidas.'
  )

  return checks
}

/*
  A PDF writer, for one document: the datasheet.

  Why this exists rather than a library. Rasterising the page — html2canvas and
  friends — produces a PDF whose text cannot be selected, searched or copied,
  which for a specification sheet is most of the point of having one. Embedding
  a full PDF toolkit costs several hundred kilobytes to lay out a document whose
  structure is fixed and known. So the sheet is written directly: real vector
  text in the standard Helvetica, selectable, searchable, a few kilobytes, and
  no dependency at all.

  Two things make that cheap. The standard 14 fonts are guaranteed present in
  every PDF reader, so nothing has to be embedded. And Arial has the same
  advance widths as Helvetica, so the browser's own text measurement can be
  used to wrap lines that a PDF reader will then set identically.

  Everything is laid out top-down in points from the top-left corner, because
  that is how a page is read; the one conversion to PDF's bottom-left origin
  happens at the moment of writing.
*/

const A4 = { w: 595.28, h: 841.89 }

/*
  WinAnsi is Latin-1 with a different 0x80–0x9F block, so the characters this
  document actually uses that live in that block — the dashes and the curly
  quotes — need naming. Anything with no WinAnsi code at all is transliterated
  rather than dropped: a specification that renders 550≥690 as 550690 is worse
  than one that renders it as 550>=690.
*/
const WIN_ANSI = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85,
  '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c,
  'ž': 0x9e, 'Ÿ': 0x9f,
}

/*
  Characters with no WinAnsi code at all, transliterated rather than dropped.

  Each one is commented, because several are invisible or near-invisible in an
  editor — three of the keys below are different kinds of space — and a table
  of unlabelled glyphs is a table nobody can safely edit. The subscripts are
  the ones that matter most: a subscript two silently dropped turns CO₂ into
  CO, which is a different molecule and a different shielding gas.
*/
const FALLBACK = {
  '−': '-', // minus sign
  '≤': '<=',
  '≥': '>=',
  '×': 'x',
  '⁄': '/', // fraction slash
  '≈': '~',
  '→': '->',
  '∅': 'Ø', // empty set, used for diameter
  '⌀': 'Ø', // the real diameter sign
  ' ': ' ', // no-break space
  ' ': ' ', // thin space
  ' ': ' ', // narrow no-break space
  '‑': '-', // non-breaking hyphen
  // Subscripts. CO2 is on nearly every sheet in this catalogue.
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  // Superscripts one to three do have WinAnsi codes; the rest do not.
  '⁰': '0', '⁴': '4', '⁵': '5', '⁶': '6',
  '⁷': '7', '⁸': '8', '⁹': '9',
}

function encodeWinAnsi(text) {
  let out = ''
  for (const ch of String(text ?? '')) {
    if (FALLBACK[ch]) {
      out += FALLBACK[ch]
      continue
    }
    const win = WIN_ANSI[ch]
    if (win !== undefined) {
      out += String.fromCharCode(win)
      continue
    }
    const code = ch.codePointAt(0)
    out += code <= 0xff ? ch : '?'
  }
  return out
}

/** Escapes the three characters that end a PDF string early. */
const escapeString = (s) => s.replace(/[\\()]/g, (m) => `\\${m}`)

/*
  Measurement. Helvetica's metrics are Arial's, so the browser can be asked —
  which avoids shipping two 256-entry width tables and is exact for the fonts
  that matter here. The canvas is created once and kept.
*/
let gauge = null
function widthOf(text, size, bold) {
  if (!gauge) gauge = document.createElement('canvas').getContext('2d')
  gauge.font = `${bold ? '700 ' : ''}${size}px Helvetica, Arial, sans-serif`
  return gauge.measureText(text).width
}

export class Pdf {
  constructor({ margin = 42, footer = null } = {}) {
    this.margin = margin
    this.footer = footer
    this.pages = []
    this.ops = []
    this.y = margin
    this.pages.push(this.ops)
  }

  get width() {
    return A4.w - this.margin * 2
  }

  get left() {
    return this.margin
  }

  get right() {
    return A4.w - this.margin
  }

  /** Room left before the footer band. */
  get room() {
    return A4.h - this.margin - 26 - this.y
  }

  newPage() {
    this.ops = []
    this.pages.push(this.ops)
    this.y = this.margin
    return this
  }

  /** Starts a new page when the next block will not fit on this one. */
  need(height) {
    if (this.room < height) this.newPage()
    return this
  }

  gray(v) {
    this.ops.push(`${v} ${v} ${v} rg`)
    return this
  }

  strokeGray(v) {
    this.ops.push(`${v} ${v} ${v} RG`)
    return this
  }

  rgb(r, g, b) {
    this.ops.push(`${r} ${g} ${b} rg`)
    return this
  }

  /** One line of text at an absolute position, measured from the top. */
  text(str, x, y, { size = 9, bold = false, tracking = 0, align = 'left' } = {}) {
    const body = encodeWinAnsi(str)
    if (!body) return this
    let px = x
    if (align !== 'left') {
      const w = widthOf(body, size, bold) + tracking * (body.length - 1)
      px = align === 'right' ? x - w : x - w / 2
    }
    this.ops.push(
      'BT',
      `/${bold ? 'F2' : 'F1'} ${size} Tf`,
      tracking ? `${tracking} Tc` : '0 Tc',
      `1 0 0 1 ${px.toFixed(2)} ${(A4.h - y).toFixed(2)} Tm`,
      `(${escapeString(body)}) Tj`,
      'ET',
    )
    return this
  }

  line(x1, y1, x2, y2, weight = 0.5) {
    this.ops.push(
      `${weight} w`,
      `${x1.toFixed(2)} ${(A4.h - y1).toFixed(2)} m`,
      `${x2.toFixed(2)} ${(A4.h - y2).toFixed(2)} l`,
      'S',
    )
    return this
  }

  /** Greedy word wrap, returning the lines a width will hold. */
  wrap(str, width, size, bold = false) {
    const words = encodeWinAnsi(str).split(/\s+/).filter(Boolean)
    const lines = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (widthOf(next, size, bold) <= width || !line) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    return lines
  }

  /** A wrapped paragraph starting at the cursor; advances it. */
  paragraph(str, x, width, { size = 9, bold = false, leading = 1.45, gray = 0.28 } = {}) {
    const lines = this.wrap(str, width, size, bold)
    const step = size * leading
    this.gray(gray)
    for (const line of lines) {
      this.need(step)
      this.y += step
      this.text(line, x, this.y - step * 0.22, { size, bold })
    }
    return this
  }

  toBlob() {
    /*
      Objects are written in order and their byte offsets recorded, because the
      cross-reference table at the end is a list of exactly those offsets — a
      PDF is read backwards from the trailer, and a reader that cannot find an
      object at the offset it was promised rejects the file entirely.
    */
    const objects = []
    const add = (body) => {
      objects.push(body)
      return objects.length
    }

    const pageIds = []
    const contentIds = []
    for (const ops of this.pages) {
      const stream = ops.join('\n')
      contentIds.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`))
      pageIds.push(0) // reserved; filled once the Pages id is known
    }

    const fontA = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    const pagesId = objects.length + this.pages.length + 1

    for (let i = 0; i < this.pages.length; i++) {
      pageIds[i] = add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] ` +
          `/Resources << /Font << /F1 ${fontA} 0 R /F2 ${fontB} 0 R >> >> ` +
          `/Contents ${contentIds[i]} 0 R >>`,
      )
    }

    add(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] ` +
        `/Count ${pageIds.length} >>`,
    )
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

    let out = '%PDF-1.4\n'
    const offsets = [0]
    objects.forEach((body, i) => {
      offsets.push(out.length)
      out += `${i + 1} 0 obj\n${body}\nendobj\n`
    })
    const xref = out.length
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (let i = 1; i <= objects.length; i++) {
      out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
    }
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`

    // Latin-1 out, byte for byte: the content was encoded to WinAnsi already,
    // and letting the browser re-encode it as UTF-8 would shift every offset
    // in the table above and break the file.
    const bytes = new Uint8Array(out.length)
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff
    return new Blob([bytes], { type: 'application/pdf' })
  }
}

/** Stamps the running foot on every page once the total is known. */
function stampFooter(pdf, lines) {
  const y = A4.h - pdf.margin + 12
  pdf.pages.forEach((ops, i) => {
    const saved = pdf.ops
    pdf.ops = ops
    pdf.strokeGray(0.75)
    pdf.line(pdf.left, y - 12, pdf.right, y - 12, 0.4)
    pdf.gray(0.55)
    pdf.text(lines.left, pdf.left, y, { size: 6.5, tracking: 0.3 })
    pdf.text(`${i + 1} / ${pdf.pages.length}`, pdf.right, y, { size: 6.5, align: 'right' })
    if (lines.right) pdf.text(lines.right, A4.w / 2, y, { size: 6.5, align: 'center' })
    pdf.ops = saved
  })
}

/**
 * Lays a datasheet out as A4 and returns it as a Blob.
 *
 * The layout is the one on screen because it is the one the trade reads: a
 * label column, a content column, a rule between every row, and the tables
 * underneath. Reflowed rather than screenshotted, so it sets at print sizes.
 */
export function sheetToPdf(sheet, brand = {}) {
  const pdf = new Pdf({ margin: 42 })
  const LABEL_W = 96
  const contentX = pdf.left + LABEL_W
  const contentW = pdf.right - contentX

  // ---- head ----
  pdf.gray(0.55)
  pdf.y += 10
  pdf.text('FICHA TÉCNICA', pdf.left, pdf.y, { size: 6.5, tracking: 1.6 })
  pdf.gray(0.05)
  pdf.y += 22
  for (const line of pdf.wrap(sheet.title ?? '', contentW + LABEL_W, 16, true)) {
    pdf.text(line, pdf.left, pdf.y, { size: 16, bold: true })
    pdf.y += 19
  }
  if (sheet.designation && sheet.designation !== sheet.title) {
    pdf.gray(0.35)
    pdf.text(sheet.designation, pdf.left, pdf.y + 2, { size: 8.5 })
    pdf.y += 12
  }
  pdf.y += 6
  pdf.strokeGray(0.1)
  pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 1.2)
  pdf.y += 4

  /** One label/content row with a hairline under it. */
  const row = (label, draw) => {
    pdf.need(34)
    const top = pdf.y
    pdf.y += 14
    pdf.gray(0.55)
    pdf.text(label, pdf.left, pdf.y - 3, { size: 6.5, tracking: 1.1 })
    pdf.y -= 14
    draw()
    pdf.y += 8
    pdf.strokeGray(0.82)
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.4)
  }

  if (sheet.type) row('TIPO', () => pdf.paragraph(sheet.type, contentX, contentW))

  if (sheet.properties?.length) {
    row('PROPIEDADES', () => {
      for (const p of sheet.properties) pdf.paragraph(p, contentX, contentW)
    })
  }

  if (sheet.applications?.length) {
    row('APLICACIÓN', () => pdf.paragraph(sheet.applications.join('  ·  '), contentX, contentW))
  }

  const pairs = (list, a, b) => () => {
    for (const item of list) {
      const keyLines = pdf.wrap(item[a] ?? '', 120, 8, true)
      const valLines = pdf.wrap(item[b] ?? '', contentW - 130, 8)
      const height = Math.max(keyLines.length, valLines.length) * 11.6
      pdf.need(height)
      const top = pdf.y
      pdf.gray(0.1)
      keyLines.forEach((l, i) => pdf.text(l, contentX, top + 9 + i * 11.6, { size: 8, bold: true }))
      pdf.gray(0.32)
      valLines.forEach((l, i) => pdf.text(l, contentX + 130, top + 9 + i * 11.6, { size: 8 }))
      pdf.y = top + height
    }
  }

  if (sheet.classification?.length) row('CLASIFICACIÓN', pairs(sheet.classification, 'body', 'value'))
  if (sheet.suitable?.length) row('APTO PARA', pairs(sheet.suitable, 'label', 'value'))
  if (sheet.facts?.length) row('DATOS', pairs(sheet.facts, 'k', 'v'))
  if (sheet.positions?.length) {
    row('POSICIONES', () => pdf.paragraph(sheet.positions.join('   ·   '), contentX, contentW))
  }
  if (sheet.approvals?.length) {
    row('APROBACIONES', () => pdf.paragraph(sheet.approvals.join('  ·  '), contentX, contentW))
  }

  /*
    A table. Columns are sized from their own content rather than split evenly:
    an element column holding "0.037" and a property column holding "Resistencia
    a la tracción (MPa)" have nothing to gain from being the same width.
  */
  const table = (title, head, rows, leadWidth) => {
    pdf.need(60)
    pdf.y += 22
    pdf.gray(0.55)
    pdf.text(title.toUpperCase(), pdf.left, pdf.y, { size: 6.5, tracking: 1.1 })
    pdf.y += 6
    pdf.strokeGray(0.55)
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.7)

    const lead = leadWidth ?? 120
    const cols = head.length
    const colW = (pdf.right - pdf.left - lead) / cols

    pdf.y += 13
    pdf.gray(0.1)
    head.forEach((h, i) => {
      pdf.text(h, pdf.left + lead + colW * (i + 1) - 4, pdf.y, { size: 7.5, bold: true, align: 'right' })
    })
    pdf.y += 4
    pdf.strokeGray(0.78)
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.4)

    for (const r of rows) {
      const labelLines = pdf.wrap(r.label ?? '', lead - 8, 7.5)
      const height = Math.max(1, labelLines.length) * 10.5 + 5
      pdf.need(height)
      const top = pdf.y
      pdf.gray(0.1)
      labelLines.forEach((l, i) => pdf.text(l, pdf.left, top + 10 + i * 10.5, { size: 7.5 }))
      if (r.note) {
        pdf.gray(0.6)
        pdf.text(r.note, pdf.left, top + 10 + labelLines.length * 10.5, { size: 6 })
      }
      pdf.gray(0.32)
      ;(r.values ?? []).forEach((v, i) => {
        pdf.text(String(v ?? ''), pdf.left + lead + colW * (i + 1) - 4, top + 10, {
          size: 7.5,
          align: 'right',
        })
      })
      pdf.y = top + height + (r.note ? 6 : 0)
      pdf.strokeGray(0.88)
      pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.3)
    }
  }

  if (sheet.chemistry?.rows?.length) {
    table(
      sheet.chemistry.note || 'Composición química',
      sheet.chemistry.elements ?? [],
      sheet.chemistry.rows,
      90,
    )
  }

  if (sheet.mechanical?.rows?.length) {
    table('Propiedades mecánicas', sheet.mechanical.columns ?? [], sheet.mechanical.rows, 180)
  }

  if (sheet.parameters?.rows?.length) {
    // This one has no row label — the first column is data, so the head is
    // shifted by one and the lead column carries the first value.
    const [first, ...rest] = sheet.parameters.columns ?? []
    table(
      sheet.parameters.note || 'Parámetros recomendados',
      rest,
      sheet.parameters.rows.map((r) => ({ label: r.values?.[0] ?? '', values: r.values?.slice(1) ?? [] })),
      120,
    )
    pdf.gray(0.55)
    pdf.text(first ?? '', pdf.left, pdf.y + 10, { size: 6.5 })
    pdf.y += 12
  }

  if (sheet.packaging?.length) {
    pdf.need(50)
    pdf.y += 22
    pdf.gray(0.55)
    pdf.text('EMBALAJE', pdf.left, pdf.y, { size: 6.5, tracking: 1.1 })
    pdf.y += 6
    pdf.strokeGray(0.55)
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.7)
    for (const group of sheet.packaging) {
      pdf.need(24)
      pdf.y += 13
      pdf.gray(0.1)
      pdf.text(group.size ?? '', pdf.left, pdf.y, { size: 8, bold: true })
      pdf.gray(0.32)
      const parts = (group.rows ?? []).map(
        (r) => `${r.pack ?? ''} ${r.kg ? `${r.kg} kg` : ''}${r.code ? ` · ${r.code}` : ''}`.trim(),
      )
      pdf.text(parts.join('    ·    '), pdf.left + 90, pdf.y, { size: 8 })
      pdf.y += 4
      pdf.strokeGray(0.88)
      pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.3)
    }
  }

  if (sheet.notice) {
    pdf.need(70)
    pdf.y += 22
    pdf.strokeGray(0.55)
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.5)
    pdf.y += 6
    pdf.gray(0.45)
    pdf.text('AVISO', pdf.left, pdf.y + 8, { size: 6.5, tracking: 1.1 })
    pdf.y += 10
    pdf.gray(0.5)
    pdf.paragraph(sheet.notice, pdf.left, pdf.width, { size: 6.5, leading: 1.55, gray: 0.5 })
  }

  stampFooter(pdf, {
    left: (brand.code ?? 'UNIBRAZE').toUpperCase(),
    right: brand.contact?.address ?? '',
  })

  return pdf.toBlob()
}

/** Hands the sheet to the reader as a file. */
export function downloadSheet(sheet, brand) {
  const blob = sheetToPdf(sheet, brand)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(sheet.id ?? 'ficha').replace(/[^a-z0-9-]+/gi, '-')}.pdf`
  a.click()
  // Revoked on the next turn: revoking in this one races the click on Safari.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

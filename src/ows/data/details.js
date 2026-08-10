/*
  Record detail — the technical sheet behind a search result.

  Kept separate from knowledge.js so the search corpus stays a flat, cheap
  match surface while the sheet carries the heavy payload. `getRecord(id)` in
  data/index.js merges the two; nothing else should read this file directly.

  Shape
  -----
  subtitle     product-line descriptor, shown under the title
  description  one or two sentences, plain
  strip        the four-cell specification bar; always exactly four
  chemistry    { note, columns: [{ el, val }] }  — composition, % by weight
  mechanical   [{ k, v }]                        — all-weld-metal properties
  parameters   [{ k, v }]                        — welding parameters
  applications [string]
  documents    [{ label, kind }]
*/

export const DETAILS = {
  'er70s-6': {
    subtitle: 'GMAW Solid Wire',
    description:
      'Copper coated solid wire for GMAW welding of carbon steels. The high manganese and silicon content tolerates moderate mill scale and rust.',
    strip: [
      { v: 'AWS A5.18', k: 'Classification' },
      { v: 'C - Mn - Si', k: 'Alloy type' },
      { v: 'DC+', k: 'Polarity' },
      { v: 'Ar / CO₂', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'C', val: '0.06' },
        { el: 'Si', val: '0.85' },
        { el: 'Mn', val: '1.40' },
        { el: 'P', val: '0.025' },
        { el: 'S', val: '0.035' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '570 MPa' },
      { k: 'Yield Strength', v: '470 MPa' },
      { k: 'Elongation', v: '22 %' },
      { k: 'Impact ( -30 °C )', v: '60 J' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.023 – 0.045 in' },
      { k: 'Current', v: '120 – 300 A' },
      { k: 'Voltage', v: '18 – 28 V' },
      { k: 'Stickout', v: '3/8 – 3/4 in' },
      { k: 'Transfer', v: 'Short-circuit · Spray' },
    ],
    applications: [
      'Structural steel fabrication',
      'General fabrication and repair',
      'Pressure vessels',
      'Pipe and pipeline',
      'Automotive and heavy equipment',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
      { label: 'Certificate of Conformance', kind: 'PDF' },
    ],
  },

  'er70s-2': {
    subtitle: 'GTAW Solid Rod',
    description:
      'Triple deoxidised rod for root passes on carbon and mild steel. The zirconium, titanium and aluminium reserve lets it run over rust and mill scale.',
    strip: [
      { v: 'AWS A5.18', k: 'Classification' },
      { v: 'Zr - Ti - Al', k: 'Deoxidisers' },
      { v: 'DCEN', k: 'Polarity' },
      { v: 'Argon', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'C', val: '0.05' },
        { el: 'Si', val: '0.55' },
        { el: 'Mn', val: '1.05' },
        { el: 'Ti', val: '0.08' },
        { el: 'Zr', val: '0.05' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '565 MPa' },
      { k: 'Yield Strength', v: '460 MPa' },
      { k: 'Elongation', v: '24 %' },
      { k: 'Impact ( -30 °C )', v: '80 J' },
    ],
    parameters: [
      { k: 'Diameter', v: '1/16 – 1/8 in' },
      { k: 'Length', v: '36 in' },
      { k: 'Current', v: '70 – 180 A' },
      { k: 'Electrode', v: 'EWTh-2 · EWLa-1.5' },
      { k: 'Gas flow', v: '15 – 20 cfh' },
    ],
    applications: [
      'Pipe root passes',
      'Boiler and pressure piping',
      'Thin section carbon steel',
      'Maintenance over mill scale',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
    ],
  },

  er308l: {
    subtitle: 'Austenitic Stainless Wire',
    description:
      'Standard filler for 304 and 304L. The 0.03 % carbon ceiling suppresses chromium carbide precipitation at grain boundaries.',
    strip: [
      { v: 'AWS A5.9', k: 'Classification' },
      { v: '19 Cr - 9 Ni', k: 'Alloy type' },
      { v: 'DC+ / DCEN', k: 'Polarity' },
      { v: 'Ar / Ar-He', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'C', val: '0.03' },
        { el: 'Cr', val: '20.0' },
        { el: 'Ni', val: '10.0' },
        { el: 'Mn', val: '1.80' },
        { el: 'Si', val: '0.45' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '585 MPa' },
      { k: 'Yield Strength', v: '400 MPa' },
      { k: 'Elongation', v: '40 %' },
      { k: 'Ferrite Number', v: 'FN 5 – 12' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.030 – 0.045 in' },
      { k: 'Current', v: '90 – 250 A' },
      { k: 'Interpass', v: '≤ 150 °C' },
      { k: 'Service', v: '≤ 425 °C sustained' },
    ],
    applications: [
      'Food and dairy equipment',
      'Sanitary process piping',
      'Chemical plant vessels',
      'Architectural stainless',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
    ],
  },

  er316l: {
    subtitle: 'Molybdenum Stainless Wire',
    description:
      'Molybdenum-bearing austenitic filler. The 2–3 % Mo buys pitting resistance in chloride service; nothing else meaningfully separates it from 308L.',
    strip: [
      { v: 'AWS A5.9', k: 'Classification' },
      { v: '18 Cr - 12 Ni - 2 Mo', k: 'Alloy type' },
      { v: 'DC+ / DCEN', k: 'Polarity' },
      { v: 'Ar / Ar-He', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'C', val: '0.03' },
        { el: 'Cr', val: '18.5' },
        { el: 'Ni', val: '12.0' },
        { el: 'Mo', val: '2.50' },
        { el: 'Si', val: '0.45' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '590 MPa' },
      { k: 'Yield Strength', v: '420 MPa' },
      { k: 'Elongation', v: '38 %' },
      { k: 'PREN', v: '~ 24' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.030 – 0.045 in' },
      { k: 'Current', v: '90 – 250 A' },
      { k: 'Interpass', v: '≤ 150 °C' },
      { k: 'Resists', v: 'Chloride pitting' },
    ],
    applications: [
      'Marine and offshore',
      'Chemical and pharmaceutical',
      'Chloride-bearing process lines',
      'Pulp and paper',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
    ],
  },

  er309l: {
    subtitle: 'Dissimilar Joint Wire',
    description:
      'Over-alloyed for dissimilar joints. The extra chromium and nickel carry enough alloy through carbon-steel dilution to stay austenitic.',
    strip: [
      { v: 'AWS A5.9', k: 'Classification' },
      { v: '23 Cr - 13 Ni', k: 'Alloy type' },
      { v: 'DC+ / DCEN', k: 'Polarity' },
      { v: 'Ar / Ar-He', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'C', val: '0.03' },
        { el: 'Cr', val: '23.5' },
        { el: 'Ni', val: '13.5' },
        { el: 'Mn', val: '1.90' },
        { el: 'Si', val: '0.45' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '600 MPa' },
      { k: 'Yield Strength', v: '420 MPa' },
      { k: 'Elongation', v: '35 %' },
      { k: 'Dilution', v: 'Tolerates ~ 30 %' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.035 – 0.045 in' },
      { k: 'Current', v: '100 – 260 A' },
      { k: 'Use', v: 'Buttering · Cladding' },
      { k: 'Risk', v: 'Martensite if over-diluted' },
    ],
    applications: [
      'Carbon steel to stainless transitions',
      'Overlay and buttering layers',
      'Dissimilar metal repair',
    ],
    documents: [{ label: 'Technical Data Sheet', kind: 'PDF' }],
  },

  er4043: {
    subtitle: 'Aluminium Silicon Wire',
    description:
      'Al-5Si. The silicon widens the freezing range and suppresses hot cracking on 6xxx base metal, which is why it beats 5356 on 6061.',
    strip: [
      { v: 'AWS A5.10', k: 'Classification' },
      { v: 'Al - 5 Si', k: 'Alloy type' },
      { v: 'AC / DC+', k: 'Polarity' },
      { v: 'Argon', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'Si', val: '5.20' },
        { el: 'Fe', val: '0.80' },
        { el: 'Cu', val: '0.30' },
        { el: 'Mg', val: '0.05' },
        { el: 'Zn', val: '0.10' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '165 MPa' },
      { k: 'Yield Strength', v: '55 MPa' },
      { k: 'Elongation', v: '8 %' },
      { k: 'Melting Range', v: '575 – 630 °C' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.030 – 1/8 in' },
      { k: 'Current', v: '70 – 200 A' },
      { k: 'AC balance', v: '60 – 75 % EN' },
      { k: 'Anodising', v: 'Darkens — avoid' },
    ],
    applications: [
      '6061 and 6063 extrusions',
      'Aluminium castings, 356 series',
      'Heat exchangers',
      'General aluminium fabrication',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
    ],
  },

  er5356: {
    subtitle: 'Aluminium Magnesium Wire',
    description:
      'Al-5Mg. Higher shear strength than 4043 and a column stiff enough to feed through a spool gun. Not for sustained service above 65 °C.',
    strip: [
      { v: 'AWS A5.10', k: 'Classification' },
      { v: 'Al - 5 Mg', k: 'Alloy type' },
      { v: 'AC / DC+', k: 'Polarity' },
      { v: 'Argon', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'Mg', val: '5.00' },
        { el: 'Mn', val: '0.12' },
        { el: 'Cr', val: '0.10' },
        { el: 'Ti', val: '0.10' },
        { el: 'Si', val: '0.25' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '265 MPa' },
      { k: 'Yield Strength', v: '120 MPa' },
      { k: 'Elongation', v: '17 %' },
      { k: 'Melting Range', v: '570 – 635 °C' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.030 – 1/8 in' },
      { k: 'Current', v: '70 – 220 A' },
      { k: 'Feedability', v: 'Stiffer than 4043' },
      { k: 'Anodising', v: 'Colour match' },
    ],
    applications: [
      '5052 and 5083 plate',
      'Marine hull and deck',
      'Structural aluminium',
      'Anodised architectural work',
    ],
    documents: [{ label: 'Technical Data Sheet', kind: 'PDF' }],
  },

  'ercusi-a': {
    subtitle: 'Silicon Bronze Rod',
    description:
      'Silicon bronze, ~3 % Si. Deposits well below the melting point of steel, so it braze-welds galvanised and thin sheet with minimal HAZ.',
    strip: [
      { v: 'AWS A5.7', k: 'Classification' },
      { v: 'Cu - 3 Si', k: 'Alloy type' },
      { v: 'DC+ / DCEN', k: 'Polarity' },
      { v: 'Argon', k: 'Shielding gas' },
    ],
    chemistry: {
      note: '%',
      columns: [
        { el: 'Cu', val: '95.5' },
        { el: 'Si', val: '3.10' },
        { el: 'Mn', val: '1.00' },
        { el: 'Sn', val: '0.20' },
        { el: 'Fe', val: '0.20' },
      ],
    },
    mechanical: [
      { k: 'Tensile Strength', v: '345 MPa' },
      { k: 'Yield Strength', v: '170 MPa' },
      { k: 'Elongation', v: '30 %' },
      { k: 'Melting Range', v: '910 – 1025 °C' },
    ],
    parameters: [
      { k: 'Diameter', v: '0.035 – 1/8 in' },
      { k: 'Current', v: '60 – 180 A' },
      { k: 'Heat input', v: 'Low' },
      { k: 'Process', v: 'GTAW · GMAW · OAW' },
    ],
    applications: [
      'Braze-welding galvanised sheet',
      'Thin gauge automotive panel',
      'Copper and brass repair',
      'Sculpture and architectural metal',
    ],
    documents: [
      { label: 'Technical Data Sheet', kind: 'PDF' },
      { label: 'Safety Data Sheet', kind: 'PDF' },
    ],
  },
}

export function getDetail(id) {
  return DETAILS[id] ?? null
}

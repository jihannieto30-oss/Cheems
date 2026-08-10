/*
  The invisible architecture.

  Almost none of this is rendered on the home page — it exists so that the
  search layer, the future backend and the eventual routing all agree on one
  vocabulary. Facets here map 1:1 to the `category` field on knowledge records.
*/

export const TAXONOMY = [
  {
    id: 'processes',
    label: 'PROCESSES',
    index: '01',
    children: [
      { id: 'gmaw', label: 'GMAW / MIG' },
      { id: 'gtaw', label: 'GTAW / TIG' },
      { id: 'smaw', label: 'SMAW' },
      { id: 'fcaw', label: 'FCAW' },
      { id: 'saw', label: 'SAW' },
      { id: 'brazing', label: 'BRAZING' },
      { id: 'soldering', label: 'SOLDERING' },
      { id: 'thermal-cutting', label: 'THERMAL CUTTING' },
    ],
  },
  {
    id: 'materials',
    label: 'MATERIALS',
    index: '02',
    children: [
      { id: 'carbon-steel', label: 'CARBON STEEL' },
      { id: 'stainless-steel', label: 'STAINLESS STEEL' },
      { id: 'aluminum', label: 'ALUMINUM' },
      { id: 'copper', label: 'COPPER' },
      { id: 'titanium', label: 'TITANIUM' },
      { id: 'nickel-alloys', label: 'NICKEL ALLOYS' },
      { id: 'specialty-alloys', label: 'SPECIALTY ALLOYS' },
    ],
  },
  {
    id: 'metallurgy',
    label: 'METALLURGY',
    index: '03',
    children: [
      { id: 'haz', label: 'HAZ' },
      { id: 'phase-transformations', label: 'PHASE TRANSFORMATIONS' },
      { id: 'solidification', label: 'SOLIDIFICATION' },
      { id: 'residual-stress', label: 'RESIDUAL STRESS' },
      { id: 'distortion', label: 'DISTORTION' },
      { id: 'heat-treatment', label: 'HEAT TREATMENT' },
      { id: 'cracking', label: 'CRACKING' },
      { id: 'microstructure', label: 'MICROSTRUCTURE' },
    ],
  },
  {
    id: 'joints',
    label: 'JOINTS & DESIGN',
    index: '04',
    children: [
      { id: 'butt', label: 'BUTT JOINT' },
      { id: 'fillet', label: 'FILLET' },
      { id: 'groove', label: 'GROOVE' },
      { id: 'lap', label: 'LAP' },
      { id: 'edge', label: 'EDGE' },
      { id: 'joint-preparation', label: 'JOINT PREPARATION' },
      { id: 'weld-size', label: 'WELD SIZE' },
      { id: 'penetration', label: 'PENETRATION' },
    ],
  },
  {
    id: 'inspection',
    label: 'INSPECTION',
    index: '05',
    children: [
      { id: 'vt', label: 'VT' },
      { id: 'pt', label: 'PT' },
      { id: 'mt', label: 'MT' },
      { id: 'ut', label: 'UT' },
      { id: 'rt', label: 'RT' },
      { id: 'ndt', label: 'NDT / NDE' },
    ],
  },
  {
    id: 'problems',
    label: 'PROBLEMS',
    index: '06',
    children: [
      { id: 'porosity', label: 'POROSITY' },
      { id: 'cracking-defect', label: 'CRACKING' },
      { id: 'undercut', label: 'UNDERCUT' },
      { id: 'lack-of-fusion', label: 'LACK OF FUSION' },
      { id: 'lack-of-penetration', label: 'LACK OF PENETRATION' },
      { id: 'distortion-defect', label: 'DISTORTION' },
      { id: 'contamination', label: 'CONTAMINATION' },
      { id: 'excess-penetration', label: 'EXCESS PENETRATION' },
    ],
  },
  {
    id: 'standards',
    label: 'STANDARDS & DOCUMENTATION',
    index: '07',
    children: [
      { id: 'aws', label: 'AWS' },
      { id: 'wps', label: 'WPS' },
      { id: 'pqr', label: 'PQR' },
      { id: 'welding-symbols', label: 'WELDING SYMBOLS' },
      { id: 'specifications', label: 'SPECIFICATIONS' },
      { id: 'tolerances', label: 'TOLERANCES' },
      { id: 'procedures', label: 'PROCEDURES' },
    ],
  },
]

/** Flat id → label lookup across every level. */
export const TAXONOMY_INDEX = TAXONOMY.reduce((acc, root) => {
  acc[root.id] = root.label
  for (const child of root.children) acc[child.id] = child.label
  return acc
}, {})

export function rootLabel(id) {
  return TAXONOMY_INDEX[id] ?? id.toUpperCase()
}

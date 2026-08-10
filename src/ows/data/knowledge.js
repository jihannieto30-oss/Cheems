/*
  Seed knowledge index.

  This is a local corpus, not a database. It exists so the search UI can be
  exercised against real technical queries before a backend exists — every
  record uses the exact shape a remote provider is expected to return, so
  swapping `createLocalProvider` for `createHttpProvider` changes nothing above
  the service layer.

  Record contract
  ---------------
  id        stable slug, future route segment
  title     what the user typed, or close to it
  kind      record class, rendered as the left-hand label
  category  taxonomy root id (see taxonomy.js)
  path      breadcrumb, coarse → fine
  spec      governing specification, when one applies
  summary   one or two sentences, written for someone who already knows
  facets    ordered key/value technical pairs
  tags      additional match surface; never rendered
*/

export const KNOWLEDGE = [
  // ---------------------------------------------------------------- fillers
  {
    id: 'er70s-6',
    title: 'ER70S-6',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'CARBON STEEL'],
    spec: 'AWS A5.18 / ASME SFA-5.18',
    summary:
      'Highest Mn/Si of the ER70S family. The deoxidiser load tolerates moderate mill scale and rust, which is why it is the default shop wire for structural GMAW.',
    facets: [
      { k: 'PROCESS', v: 'GMAW · SAW' },
      { k: 'SHIELDING', v: 'CO₂ · 75/25 Ar-CO₂' },
      { k: 'TENSILE', v: '70 ksi min' },
      { k: 'POSITION', v: 'All, short-circuit' },
      { k: 'DIA', v: '.023 – .045 in' },
    ],
    tags: ['mig', 'gmaw', 'mild steel', 'carbon steel', 'solid wire', 'a5.18', 's6'],
  },
  {
    id: 'er70s-2',
    title: 'ER70S-2',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'CARBON STEEL'],
    spec: 'AWS A5.18 / ASME SFA-5.18',
    summary:
      'Triple deoxidised with zirconium, titanium and aluminium. The reserve of deoxidisers is what lets it run over rust and mill scale where S-2 root passes would otherwise pinhole.',
    facets: [
      { k: 'PROCESS', v: 'GTAW · GMAW' },
      { k: 'DEOXIDISERS', v: 'Zr · Ti · Al' },
      { k: 'TENSILE', v: '70 ksi min' },
      { k: 'USE', v: 'Root passes, pipe' },
      { k: 'FORM', v: '36 in cut length' },
    ],
    tags: ['tig', 'gtaw', 'root pass', 'pipe', 'triple deoxidized', 'mill scale'],
  },
  {
    id: 'er308l',
    title: 'ER308L',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'STAINLESS STEEL'],
    spec: 'AWS A5.9 / ASME SFA-5.9',
    summary:
      'Standard filler for 304 and 304L. The L carbon ceiling of 0.03% suppresses chromium carbide precipitation at grain boundaries, preserving corrosion resistance without a stabiliser.',
    facets: [
      { k: 'MATCHES', v: '304 · 304L · 308' },
      { k: 'CARBON', v: '0.03 % max' },
      { k: 'FERRITE', v: 'FN 5 – 12' },
      { k: 'PROCESS', v: 'GTAW · GMAW · SAW' },
      { k: 'SERVICE', v: '≤ 800 °F sustained' },
    ],
    tags: ['stainless', '304', '304l', 'austenitic', 'sensitisation', 'a5.9'],
  },
  {
    id: 'er309l',
    title: 'ER309L',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'STAINLESS STEEL'],
    spec: 'AWS A5.9 / ASME SFA-5.9',
    summary:
      'Over-alloyed for dissimilar joints. The extra Cr and Ni carry enough alloy through carbon-steel dilution to land inside the austenite-plus-ferrite field on the Schaeffler diagram.',
    facets: [
      { k: 'USE', v: 'CS → SS dissimilar' },
      { k: 'ALSO', v: 'Buttering, cladding' },
      { k: 'DILUTION', v: 'Tolerates ~30 %' },
      { k: 'CARBON', v: '0.03 % max' },
      { k: 'RISK', v: 'Martensite if over-diluted' },
    ],
    tags: ['dissimilar', 'cladding', 'buttering', 'schaeffler', 'transition joint'],
  },
  {
    id: 'er316l',
    title: 'ER316L',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'STAINLESS STEEL'],
    spec: 'AWS A5.9 / ASME SFA-5.9',
    summary:
      'Molybdenum-bearing austenitic filler. The 2–3% Mo is what buys pitting resistance in chloride service; nothing else in the composition distinguishes it meaningfully from 308L.',
    facets: [
      { k: 'MATCHES', v: '316 · 316L' },
      { k: 'MOLYBDENUM', v: '2.0 – 3.0 %' },
      { k: 'CARBON', v: '0.03 % max' },
      { k: 'RESISTS', v: 'Chloride pitting' },
      { k: 'PREN', v: '~24' },
    ],
    tags: ['316', '316l', 'moly', 'pitting', 'chloride', 'sanitary', 'pren'],
  },
  {
    id: 'er80s-ni1',
    title: 'ER80S-Ni1',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'LOW ALLOY'],
    spec: 'AWS A5.28 / ASME SFA-5.28',
    summary:
      'Roughly 1% nickel for low-temperature notch toughness. Specified where CVN is required down to −50 °F and plain carbon deposit will not certify.',
    facets: [
      { k: 'NICKEL', v: '~1.0 %' },
      { k: 'TENSILE', v: '80 ksi min' },
      { k: 'IMPACT', v: '20 ft-lb @ −50 °F' },
      { k: 'PROCESS', v: 'GMAW · GTAW' },
      { k: 'USE', v: 'Weathering, offshore' },
    ],
    tags: ['low alloy', 'nickel', 'toughness', 'cvn', 'impact', 'a5.28', 'low temperature'],
  },
  {
    id: 'er4043',
    title: 'ER4043',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'ALUMINUM'],
    spec: 'AWS A5.10 / ASME SFA-5.10',
    summary:
      'Al-5Si. The silicon widens the freezing range and lowers fluidity-driven cracking on 6xxx base metal — the reason it beats 5356 on 6061 despite lower strength.',
    facets: [
      { k: 'SILICON', v: '4.5 – 6.0 %' },
      { k: 'FOR', v: '6061 · 6063 · 356 cast' },
      { k: 'ANODISING', v: 'Darkens — avoid' },
      { k: 'SHEAR', v: 'Lower than 5356' },
      { k: 'MELT', v: '1065 – 1170 °F' },
    ],
    tags: ['aluminum', 'aluminium', '4043', '6061', 'hot cracking', 'silicon'],
  },
  {
    id: 'er5356',
    title: 'ER5356',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'ALUMINUM'],
    spec: 'AWS A5.10 / ASME SFA-5.10',
    summary:
      'Al-5Mg. Higher shear strength and a column stiff enough to feed reliably through a spool gun. Not for sustained service above 150 °F, where Mg segregation embrittles.',
    facets: [
      { k: 'MAGNESIUM', v: '4.5 – 5.5 %' },
      { k: 'FOR', v: '5052 · 5083 · 6061' },
      { k: 'ANODISING', v: 'Colour match' },
      { k: 'FEEDABILITY', v: 'Stiffer than 4043' },
      { k: 'LIMIT', v: 'Not > 150 °F service' },
    ],
    tags: ['aluminum', 'aluminium', '5356', 'magnesium', 'spool gun', 'anodize'],
  },
  {
    id: 'ercusi-a',
    title: 'ERCuSi-A',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'COPPER ALLOYS'],
    spec: 'AWS A5.7 / ASME SFA-5.7',
    summary:
      'Silicon bronze, ~3% Si. Deposits well below steel’s melting point, so it braze-welds galvanised and thin sheet with minimal HAZ and no burn-through of the zinc layer.',
    facets: [
      { k: 'SILICON', v: '~3.0 %' },
      { k: 'BASE', v: 'Copper' },
      { k: 'USE', v: 'Braze-weld, galvanised' },
      { k: 'HEAT INPUT', v: 'Low' },
      { k: 'PROCESS', v: 'GTAW · GMAW · OAW' },
    ],
    tags: ['silicon bronze', 'bronze', 'brazing', 'galvanized', 'copper', 'sheet metal'],
  },
  {
    id: 'enife-ci',
    title: 'ENiFe-CI',
    kind: 'ELECTRODE',
    category: 'materials',
    path: ['MATERIALS', 'ELECTRODES', 'CAST IRON'],
    spec: 'AWS A5.15 / ASME SFA-5.15',
    summary:
      'Nickel-iron electrode for cast iron. The ~55Ni/45Fe deposit has a lower coefficient of expansion than pure nickel, which cuts the residual stress that cracks the fusion line on rigid castings.',
    facets: [
      { k: 'DEPOSIT', v: '~55 Ni / 45 Fe' },
      { k: 'FOR', v: 'Ductile & grey iron' },
      { k: 'TECHNIQUE', v: 'Short beads, peen' },
      { k: 'INTERPASS', v: 'Keep low' },
      { k: 'MACHINABLE', v: 'Yes' },
    ],
    tags: ['cast iron', 'nickel', 'repair', 'maintenance', 'peening', 'ductile iron', '55'],
  },
  {
    id: 'er410',
    title: 'ER410',
    kind: 'FILLER METAL',
    category: 'materials',
    path: ['MATERIALS', 'FILLER METALS', 'STAINLESS STEEL'],
    spec: 'AWS A5.9 / ASME SFA-5.9',
    summary:
      '12% Cr martensitic filler for wear and corrosion overlay. Air-hardening, so preheat and post-weld temper are not optional — an as-welded deposit will be brittle.',
    facets: [
      { k: 'CHROMIUM', v: '11.5 – 13.5 %' },
      { k: 'PREHEAT', v: '400 – 600 °F' },
      { k: 'PWHT', v: 'Temper required' },
      { k: 'USE', v: 'Overlay, valve seats' },
      { k: 'STRUCTURE', v: 'Martensitic' },
    ],
    tags: ['410', 'martensitic', 'hardfacing', 'overlay', 'preheat', 'temper'],
  },

  // ---------------------------------------------------------------- processes
  {
    id: 'gtaw',
    title: 'GTAW',
    kind: 'PROCESS',
    category: 'processes',
    path: ['PROCESSES', 'GTAW / TIG'],
    spec: 'AWS A5.12 (electrodes)',
    summary:
      'Non-consumable tungsten, independently fed filler. Complete decoupling of heat input from deposition is what makes it the reference process for root passes and thin section.',
    facets: [
      { k: 'POLARITY', v: 'DCEN · AC' },
      { k: 'SHIELDING', v: 'Ar · Ar-He' },
      { k: 'ELECTRODE', v: 'EWTh-2 · EWLa-1.5' },
      { k: 'DEPOSITION', v: 'Low' },
      { k: 'CONTROL', v: 'Highest' },
    ],
    tags: ['tig', 'tungsten', 'argon', 'root pass', 'heliarc', 'gtaw'],
  },
  {
    id: 'gtaw-ac',
    title: 'GTAW AC',
    kind: 'PARAMETER SET',
    category: 'processes',
    path: ['PROCESSES', 'GTAW / TIG', 'AC BALANCE'],
    spec: null,
    summary:
      'Alternating current for aluminium and magnesium. EP half-cycles sputter the refractory oxide off the puddle; EN half-cycles put the heat into the base metal. Balance is the trade between the two.',
    facets: [
      { k: 'BALANCE', v: '60 – 75 % EN' },
      { k: 'FREQUENCY', v: '60 – 250 Hz' },
      { k: 'ELECTRODE', v: 'Balled pure / lanthanated' },
      { k: 'MORE EN', v: 'Deeper, narrower' },
      { k: 'MORE EP', v: 'Wider cleaning band' },
    ],
    tags: ['ac', 'aluminum', 'aluminium', 'balance', 'cleaning action', 'oxide', 'frequency', 'tig'],
  },
  {
    id: 'gmaw',
    title: 'GMAW',
    kind: 'PROCESS',
    category: 'processes',
    path: ['PROCESSES', 'GMAW / MIG'],
    spec: 'AWS A5.18',
    summary:
      'Continuously fed solid wire under gas shield. Transfer mode — short-circuit, globular, spray or pulsed — is the parameter that actually governs position, penetration and fusion risk.',
    facets: [
      { k: 'MODES', v: 'Short · Globular · Spray · Pulse' },
      { k: 'SPRAY GAS', v: '> 80 % Ar' },
      { k: 'DEPOSITION', v: 'High' },
      { k: 'RISK', v: 'Cold lap in short-circuit' },
      { k: 'STICKOUT', v: '3/8 – 3/4 in' },
    ],
    tags: ['mig', 'spray transfer', 'short circuit', 'pulse', 'transfer mode', 'gmaw'],
  },
  {
    id: 'smaw',
    title: 'SMAW',
    kind: 'PROCESS',
    category: 'processes',
    path: ['PROCESSES', 'SMAW'],
    spec: 'AWS A5.1 / A5.5',
    summary:
      'Flux-coated consumable electrode. Slag-forming coating makes it indifferent to wind and surface condition, which is why field and repair work never left it.',
    facets: [
      { k: 'CLASSES', v: 'E6010 · E7018 · E308-16' },
      { k: 'LOW-H', v: 'E7018 — control exposure' },
      { k: 'POLARITY', v: 'DCEP typical' },
      { k: 'ENVIRONMENT', v: 'Wind tolerant' },
      { k: 'SLAG', v: 'Must be removed' },
    ],
    tags: ['stick', 'electrode', '7018', '6010', 'low hydrogen', 'field welding', 'smaw'],
  },
  {
    id: 'fcaw',
    title: 'FCAW',
    kind: 'PROCESS',
    category: 'processes',
    path: ['PROCESSES', 'FCAW'],
    spec: 'AWS A5.20 / A5.29',
    summary:
      'Tubular wire with internal flux. Splits into gas-shielded (FCAW-G) and self-shielded (FCAW-S); the distinction drives everything about outdoor use and toughness.',
    facets: [
      { k: 'FCAW-G', v: 'E71T-1 · CO₂ or mix' },
      { k: 'FCAW-S', v: 'E71T-11 · no gas' },
      { k: 'DEPOSITION', v: 'Highest of the wire processes' },
      { k: 'POSITION', v: 'All, rutile types' },
      { k: 'SLAG', v: 'Yes — interpass removal' },
    ],
    tags: ['flux core', 'e71t-1', 'e71t-11', 'dual shield', 'self shielded', 'fcaw'],
  },
  {
    id: 'fcaw-parameters',
    title: 'FCAW PARAMETERS',
    kind: 'PARAMETER SET',
    category: 'processes',
    path: ['PROCESSES', 'FCAW', 'PARAMETERS'],
    spec: null,
    summary:
      'Starting envelope for E71T-1 in flat and horizontal. Stickout is the variable most often wrong on the floor — it moves current far more than the dial suggests.',
    facets: [
      { k: '0.045 in', v: '180 – 250 A · 24 – 28 V' },
      { k: '0.052 in', v: '220 – 300 A · 25 – 29 V' },
      { k: 'STICKOUT', v: '3/4 – 1 in' },
      { k: 'GAS', v: '100 % CO₂ or 75/25' },
      { k: 'TRAVEL', v: '10 – 18 ipm' },
    ],
    tags: ['fcaw', 'parameters', 'amperage', 'voltage', 'stickout', 'wfs', 'settings', 'e71t-1'],
  },
  {
    id: 'saw',
    title: 'SAW',
    kind: 'PROCESS',
    category: 'processes',
    path: ['PROCESSES', 'SAW'],
    spec: 'AWS A5.17 / A5.23',
    summary:
      'Arc buried under granular flux. No visible arc, no spatter, very high deposition — restricted to flat and horizontal fillet by the need to hold the flux bed.',
    facets: [
      { k: 'POSITION', v: 'Flat · Horiz. fillet' },
      { k: 'CURRENT', v: 'Up to 1000+ A' },
      { k: 'FLUX', v: 'Neutral · Active' },
      { k: 'USE', v: 'Vessel seams, beams' },
      { k: 'HEAT INPUT', v: 'Very high' },
    ],
    tags: ['submerged arc', 'flux', 'high deposition', 'pressure vessel', 'saw'],
  },

  // ---------------------------------------------------------------- problems
  {
    id: 'porosity',
    title: 'POROSITY',
    kind: 'DEFECT',
    category: 'problems',
    path: ['PROBLEMS', 'POROSITY'],
    spec: 'AWS D1.1 §6.9',
    summary:
      'Gas trapped by a solidification front moving faster than the bubble can escape. The defect is always downstream of one of four inputs: contamination, shielding loss, moisture or parameters.',
    facets: [
      { k: 'CONTAMINATION', v: 'Oil, paint, rust, zinc' },
      { k: 'GAS FLOW', v: 'Too low, too high, draught' },
      { k: 'MOISTURE', v: 'Electrode, base, line' },
      { k: 'PARAMETERS', v: 'Arc length, travel, stickout' },
      { k: 'DETECT', v: 'RT · UT · VT' },
    ],
    tags: ['gas', 'pinhole', 'wormhole', 'contamination', 'shielding', 'moisture', 'defect'],
  },
  {
    id: 'cracking',
    title: 'CRACKING',
    kind: 'DEFECT',
    category: 'problems',
    path: ['PROBLEMS', 'CRACKING'],
    spec: 'AWS D1.1 §6.9',
    summary:
      'Separates into hot and cold. Hot cracking is a solidification problem in the weld metal; cold cracking is hydrogen plus a susceptible microstructure plus restraint, and can appear days later.',
    facets: [
      { k: 'HOT', v: 'Segregation, S & P, crater' },
      { k: 'COLD', v: 'H₂ + martensite + restraint' },
      { k: 'DELAY', v: 'Up to 72 h' },
      { k: 'CONTROL', v: 'Preheat, low-H, CE limit' },
      { k: 'DESIGN', v: 'Reduce restraint' },
    ],
    tags: [
      'hydrogen',
      'cold cracking',
      'hot cracking',
      'underbead',
      'restraint',
      'carbon equivalent',
      'delayed',
      'defect',
    ],
  },
  {
    id: 'undercut',
    title: 'UNDERCUT',
    kind: 'DEFECT',
    category: 'problems',
    path: ['PROBLEMS', 'UNDERCUT'],
    spec: 'AWS D1.1 Table 6.1',
    summary:
      'Groove melted into the base metal at the toe and left unfilled. A geometric stress raiser — its significance is fatigue, not section loss.',
    facets: [
      { k: 'CAUSE', v: 'Excess current / voltage' },
      { k: 'CAUSE', v: 'Travel speed too high' },
      { k: 'CAUSE', v: 'Wrong work angle' },
      { k: 'CAUSE', v: 'No toe dwell in weave' },
      { k: 'LIMIT', v: '1/32 in typical, cyclic' },
    ],
    tags: ['toe', 'stress riser', 'fatigue', 'travel speed', 'work angle', 'defect'],
  },
  {
    id: 'lack-of-fusion',
    title: 'LACK OF FUSION',
    kind: 'DEFECT',
    category: 'problems',
    path: ['PROBLEMS', 'LACK OF FUSION'],
    spec: 'AWS D1.1 §6.9',
    summary:
      'Deposit laid against unmelted metal. Planar, tight and near-invisible to RT when oriented wrong — which is why UT is the honest method for it.',
    facets: [
      { k: 'CAUSE', v: 'Insufficient heat input' },
      { k: 'CAUSE', v: 'Short-circuit cold lap' },
      { k: 'CAUSE', v: 'Arc off the leading edge' },
      { k: 'CAUSE', v: 'Interpass slag, tight groove' },
      { k: 'DETECT', v: 'UT — RT unreliable' },
    ],
    tags: ['cold lap', 'incomplete fusion', 'lof', 'sidewall', 'ut', 'planar', 'defect'],
  },
  {
    id: 'distortion',
    title: 'DISTORTION',
    kind: 'DEFECT',
    category: 'problems',
    path: ['PROBLEMS', 'DISTORTION'],
    spec: null,
    summary:
      'Non-uniform expansion and contraction resolving into permanent movement. Governed by heat input, joint symmetry and sequence — never by welder skill alone.',
    facets: [
      { k: 'MODES', v: 'Angular · Longitudinal · Bowing' },
      { k: 'CONTROL', v: 'Balanced sequence' },
      { k: 'CONTROL', v: 'Back-step, skip welding' },
      { k: 'CONTROL', v: 'Minimum weld size' },
      { k: 'CORRECT', v: 'Flame straightening' },
    ],
    tags: ['warping', 'shrinkage', 'sequence', 'presetting', 'back-step', 'residual stress'],
  },

  // ---------------------------------------------------------------- metallurgy
  {
    id: 'haz',
    title: 'HAZ',
    kind: 'METALLURGY',
    category: 'metallurgy',
    path: ['METALLURGY', 'HEAT AFFECTED ZONE'],
    spec: null,
    summary:
      'Base metal that never melted but was thermally rewritten. Width and microstructure follow directly from heat input and cooling rate — and the coarse-grained band next to fusion is where toughness goes to die.',
    facets: [
      { k: 'SUB-ZONES', v: 'CGHAZ · FGHAZ · IC · SC' },
      { k: 'DRIVER', v: 'Heat input, t8/5' },
      { k: 'RISK', v: 'CGHAZ toughness loss' },
      { k: 'RISK', v: 'Sensitisation in austenitics' },
      { k: 'MITIGATE', v: 'Preheat, interpass, PWHT' },
    ],
    tags: ['heat affected zone', 'cghaz', 'grain growth', 't8/5', 'cooling rate', 'toughness'],
  },
  {
    id: '316l-haz',
    title: '316L HAZ',
    kind: 'METALLURGY',
    category: 'metallurgy',
    path: ['METALLURGY', 'HAZ', 'AUSTENITIC STAINLESS'],
    spec: null,
    summary:
      'The L grade exists for this zone. Below 0.03% C there is not enough carbon to precipitate Cr₂₃C₆ at the boundaries during the 800–1500 °F transit, so the HAZ keeps its corrosion resistance.',
    facets: [
      { k: 'SENSITISATION', v: '800 – 1500 °F' },
      { k: 'MECHANISM', v: 'Cr₂₃C₆ at boundaries' },
      { k: 'RESULT', v: 'Cr-depleted margin' },
      { k: 'CONTROL', v: 'Low C, fast transit' },
      { k: 'INTERPASS', v: '≤ 350 °F' },
    ],
    tags: [
      '316l',
      'haz',
      'sensitisation',
      'sensitization',
      'carbide precipitation',
      'intergranular',
      'weld decay',
      'stainless',
    ],
  },
  {
    id: 'pwht',
    title: 'PWHT',
    kind: 'PROCEDURE',
    category: 'metallurgy',
    path: ['METALLURGY', 'HEAT TREATMENT', 'PWHT'],
    spec: 'ASME B31.3 · AWS D1.1 §5.8',
    summary:
      'Controlled reheat below transformation to relieve residual stress, temper martensite and drive off diffusible hydrogen. Heating and cooling rates are part of the requirement, not a detail.',
    facets: [
      { k: 'CARBON STEEL', v: '1100 – 1250 °F' },
      { k: 'HOLD', v: '1 h per inch, 15 min min' },
      { k: 'RATE', v: '≤ 400 °F/h above 600 °F' },
      { k: 'GRADIENT', v: 'Banded, controlled' },
      { k: 'RECORD', v: 'Chart is the evidence' },
    ],
    tags: ['stress relief', 'post weld heat treatment', 'tempering', 'hydrogen bake', 'soak'],
  },
  {
    id: 'pwht-p91',
    title: 'PWHT P91',
    kind: 'PROCEDURE',
    category: 'metallurgy',
    path: ['METALLURGY', 'HEAT TREATMENT', 'CREEP STRENGTH ENHANCED FERRITIC'],
    spec: 'ASME B31.1 · ASME Section I',
    summary:
      'Grade 91 is unforgiving. Cool below the martensite finish before tempering or the untransformed austenite never converts; exceed Ac1 during temper and you re-austenitise and destroy the creep properties.',
    facets: [
      { k: 'PREHEAT', v: '400 – 600 °F' },
      { k: 'COOL TO', v: '200 – 300 °F before PWHT' },
      { k: 'TEMPER', v: '1350 – 1425 °F' },
      { k: 'CEILING', v: 'Stay below Ac1' },
      { k: 'HOLD', v: '1 – 2 h min' },
    ],
    tags: [
      'p91',
      'grade 91',
      't91',
      'creep',
      'csef',
      'martensite',
      'ac1',
      'power piping',
      'tempering',
    ],
  },
  {
    id: 'residual-stress',
    title: 'RESIDUAL STRESS',
    kind: 'METALLURGY',
    category: 'metallurgy',
    path: ['METALLURGY', 'RESIDUAL STRESS'],
    spec: null,
    summary:
      'Locked-in stress from restrained contraction, routinely reaching yield magnitude in the weld. Invisible until it combines with hydrogen, a notch or a corrosive to become a crack.',
    facets: [
      { k: 'MAGNITUDE', v: 'Approaches yield' },
      { k: 'DRIVES', v: 'Distortion, SCC, cold cracking' },
      { k: 'MEASURE', v: 'Hole-drilling · XRD' },
      { k: 'RELIEVE', v: 'PWHT · VSR · peening' },
      { k: 'REDUCE', v: 'Sequence, restraint' },
    ],
    tags: ['locked in stress', 'scc', 'stress corrosion', 'peening', 'vibratory', 'relief'],
  },

  // ---------------------------------------------------------------- materials
  {
    id: '304-vs-316l',
    title: '304 vs 316L',
    kind: 'COMPARISON',
    category: 'materials',
    path: ['MATERIALS', 'STAINLESS STEEL', 'SELECTION'],
    spec: 'ASTM A240',
    summary:
      'One variable that matters: molybdenum. 316L buys chloride pitting resistance and nothing else worth paying for — in clean or dry service 304 is the correct, cheaper answer.',
    facets: [
      { k: '304', v: '18Cr-8Ni · no Mo' },
      { k: '316L', v: '16Cr-10Ni-2Mo · C ≤ .03' },
      { k: 'PREN 304', v: '~18' },
      { k: 'PREN 316L', v: '~24' },
      { k: 'FILLER', v: '308L / 316L respectively' },
    ],
    tags: [
      '304',
      '316',
      '316l',
      '304l',
      'comparison',
      'vs',
      'molybdenum',
      'pitting',
      'chloride',
      'selection',
      'stainless',
    ],
  },
  {
    id: 'carbon-equivalent',
    title: 'CARBON EQUIVALENT',
    kind: 'METALLURGY',
    category: 'materials',
    path: ['MATERIALS', 'CARBON STEEL', 'WELDABILITY'],
    spec: 'IIW formula',
    summary:
      'Collapses composition into one hardenability number. Above roughly 0.45 the CGHAZ will make martensite on normal cooling, and preheat stops being optional.',
    facets: [
      { k: 'IIW', v: 'C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15' },
      { k: '< 0.35', v: 'Generally no preheat' },
      { k: '0.35 – 0.45', v: 'Preheat advisable' },
      { k: '> 0.45', v: 'Preheat + low-H required' },
      { k: 'ALSO', v: 'Pcm for low-C modern steels' },
    ],
    tags: ['ce', 'ceq', 'iiw', 'pcm', 'preheat', 'hardenability', 'weldability', 'martensite'],
  },
  {
    id: 'aluminum-weldability',
    title: 'ALUMINUM',
    kind: 'MATERIAL',
    category: 'materials',
    path: ['MATERIALS', 'ALUMINUM'],
    spec: 'AWS D1.2',
    summary:
      'Two properties dominate: an oxide melting near 3700 °F over metal melting near 1200 °F, and hydrogen solubility that collapses on solidification. Everything else is downstream.',
    facets: [
      { k: 'OXIDE', v: 'Remove mechanically, then weld' },
      { k: 'HYDROGEN', v: 'Sole porosity source' },
      { k: 'CONDUCTIVITY', v: 'High preheat demand' },
      { k: 'NO COLOUR', v: 'No visual heat cue' },
      { k: 'HAZ', v: 'Strength loss in 6xxx' },
    ],
    tags: ['aluminium', 'oxide', 'hydrogen porosity', '6061', '5052', 'stainless brush', 'd1.2'],
  },

  // ---------------------------------------------------------------- standards
  {
    id: 'wps',
    title: 'WPS',
    kind: 'DOCUMENT',
    category: 'standards',
    path: ['STANDARDS', 'DOCUMENTATION', 'WPS'],
    spec: 'AWS D1.1 §4 · ASME IX',
    summary:
      'The written instruction the welder actually follows, bounded by essential variables. It is only valid inside the range its supporting PQR qualified.',
    facets: [
      { k: 'STATES', v: 'Process, filler, position' },
      { k: 'STATES', v: 'Preheat, interpass, PWHT' },
      { k: 'STATES', v: 'Current, voltage, travel' },
      { k: 'BACKED BY', v: 'PQR' },
      { k: 'PREQUALIFIED', v: 'D1.1 §5 only' },
    ],
    tags: ['procedure specification', 'essential variables', 'prequalified', 'asme ix', 'welding procedure'],
  },
  {
    id: 'pqr',
    title: 'PQR',
    kind: 'DOCUMENT',
    category: 'standards',
    path: ['STANDARDS', 'DOCUMENTATION', 'PQR'],
    spec: 'AWS D1.1 §4 · ASME IX',
    summary:
      'The record of what was welded and what the destructive testing proved. A PQR is history — it is never edited, and it is what gives a WPS its authority.',
    facets: [
      { k: 'RECORDS', v: 'As-welded actuals' },
      { k: 'TESTS', v: 'Tensile · Bend · Impact' },
      { k: 'MACRO', v: 'Fillet, etch' },
      { k: 'SUPPORTS', v: 'One or more WPS' },
      { k: 'IMMUTABLE', v: 'Never revised' },
    ],
    tags: ['qualification record', 'destructive testing', 'bend test', 'tensile', 'asme ix'],
  },
  {
    id: 'aws-d1-1',
    title: 'AWS D1.1',
    kind: 'STANDARD',
    category: 'standards',
    path: ['STANDARDS', 'AWS', 'D1.1'],
    spec: 'Structural Welding Code — Steel',
    summary:
      'The governing code for structural steel in the United States. Prequalified joints in §5 let fabricators skip procedure qualification entirely, provided every listed limit holds.',
    facets: [
      { k: 'SCOPE', v: 'Steel ≥ 1/8 in' },
      { k: '§5', v: 'Prequalification' },
      { k: '§6', v: 'Inspection, acceptance' },
      { k: '§9', v: 'Strengthening & repair' },
      { k: 'SEE ALSO', v: 'D1.2 Al · D1.6 SS' },
    ],
    tags: ['d1.1', 'structural', 'code', 'prequalified', 'aws', 'acceptance criteria'],
  },
  {
    id: 'welding-symbols',
    title: 'WELDING SYMBOLS',
    kind: 'STANDARD',
    category: 'standards',
    path: ['STANDARDS', 'DOCUMENTATION', 'SYMBOLS'],
    spec: 'AWS A2.4',
    summary:
      'Reference line, arrow, tail. Side of the line places the weld: below is arrow side, above is other side — the single convention most often read backwards.',
    facets: [
      { k: 'BELOW LINE', v: 'Arrow side' },
      { k: 'ABOVE LINE', v: 'Other side' },
      { k: 'LEFT OF SYMBOL', v: 'Size' },
      { k: 'RIGHT OF SYMBOL', v: 'Length – pitch' },
      { k: 'TAIL', v: 'Process, spec, WPS' },
    ],
    tags: ['a2.4', 'symbol', 'blueprint', 'drawing', 'arrow side', 'fillet symbol'],
  },

  // ---------------------------------------------------------------- inspection
  {
    id: 'ut',
    title: 'UT',
    kind: 'INSPECTION',
    category: 'inspection',
    path: ['INSPECTION', 'ULTRASONIC'],
    spec: 'AWS D1.1 §6 · ASNT SNT-TC-1A',
    summary:
      'High-frequency sound reflected off internal discontinuities. Superior to RT for planar defects — lack of fusion and cracks — and it needs no exclusion zone.',
    facets: [
      { k: 'DETECTS', v: 'Planar, subsurface' },
      { k: 'STRONG ON', v: 'LOF, cracks' },
      { k: 'WEAK ON', v: 'Fine scattered porosity' },
      { k: 'NEEDS', v: 'Couplant, calibration block' },
      { k: 'VARIANT', v: 'PAUT · TOFD' },
    ],
    tags: ['ultrasonic', 'phased array', 'paut', 'tofd', 'ndt', 'nde', 'shear wave'],
  },
  {
    id: 'rt',
    title: 'RT',
    kind: 'INSPECTION',
    category: 'inspection',
    path: ['INSPECTION', 'RADIOGRAPHIC'],
    spec: 'ASME V Article 2',
    summary:
      'Volumetric imaging by differential absorption. Excellent on porosity, slag and voids; blind to tight planar defects that lie across the beam.',
    facets: [
      { k: 'DETECTS', v: 'Volumetric' },
      { k: 'STRONG ON', v: 'Porosity, slag' },
      { k: 'WEAK ON', v: 'Tight LOF, cracks' },
      { k: 'IQI', v: 'Penetrameter required' },
      { k: 'CONTROL', v: 'Exclusion zone' },
    ],
    tags: ['radiography', 'x-ray', 'gamma', 'film', 'iqi', 'penetrameter', 'ndt', 'nde'],
  },
  {
    id: 'pt',
    title: 'PT',
    kind: 'INSPECTION',
    category: 'inspection',
    path: ['INSPECTION', 'LIQUID PENETRANT'],
    spec: 'ASME V Article 6',
    summary:
      'Capillary action draws dye into surface-breaking discontinuities. Works on any non-porous material, ferrous or not — and finds nothing that does not break the surface.',
    facets: [
      { k: 'DETECTS', v: 'Surface-breaking only' },
      { k: 'MATERIALS', v: 'Any non-porous' },
      { k: 'STEPS', v: 'Clean · Penetrate · Develop' },
      { k: 'DWELL', v: '5 – 30 min typical' },
      { k: 'TYPES', v: 'Visible · Fluorescent' },
    ],
    tags: ['dye penetrant', 'liquid penetrant', 'capillary', 'developer', 'ndt', 'nde'],
  },
  {
    id: 'mt',
    title: 'MT',
    kind: 'INSPECTION',
    category: 'inspection',
    path: ['INSPECTION', 'MAGNETIC PARTICLE'],
    spec: 'ASME V Article 7',
    summary:
      'Flux leakage at a discontinuity holds iron particles. Ferromagnetic materials only, and the field must run across the defect — so every area is examined twice, 90° apart.',
    facets: [
      { k: 'DETECTS', v: 'Surface & near-surface' },
      { k: 'MATERIALS', v: 'Ferromagnetic only' },
      { k: 'FIELD', v: 'Two directions, 90°' },
      { k: 'METHODS', v: 'Yoke · Prod · Coil' },
      { k: 'AFTER', v: 'Demagnetise' },
    ],
    tags: ['magnetic particle', 'flux leakage', 'yoke', 'wet fluorescent', 'ndt', 'nde'],
  },
]

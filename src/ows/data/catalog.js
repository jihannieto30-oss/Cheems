/*
  Product catalogue — the ~150 designations, grouped the way Unibraze México
  sections its special-welding range.

  Scope note, deliberate: every entry below is a real, published classification
  (AWS A5.x / ASME SFA-5.x). What is NOT here is per-product chemistry and
  mechanical data — that comes off each manufacturer's certificate and is not
  something to invent. Records with a full technical sheet live in details.js
  and are marked `sheet: true`; everything else renders as catalogued with its
  specification pending, which is honest and obvious to the reader.

  Forms follow the product photography: R = varilla (cut length rod),
  W = rollo (spool), E = electrodo (covered electrode).
*/

export const FORMS = {
  R: { id: 'rod', es: 'Varilla', en: 'Rod', art: '/unibraze/rod.svg' },
  W: { id: 'wire', es: 'Rollo', en: 'Spool', art: '/unibraze/spool.svg' },
  E: { id: 'electrode', es: 'Electrodo', en: 'Electrode', art: '/unibraze/electrode.svg' },
}

export const SECTIONS = [
  {
    slug: 'carbon-steel',
    en: 'Carbon Steel & Low Alloy',
    es: 'Acero al Carbón y Baja Aleación',
    blurb:
      'Structural and pressure work. Solid wire, flux-cored and covered electrodes from 70 through 120 ksi.',
  },
  {
    slug: 'stainless-steel',
    en: 'Stainless Steel',
    es: 'Acero Inoxidable',
    blurb:
      'Austenitic, martensitic, duplex and super-duplex. Includes the over-alloyed grades for dissimilar joints.',
  },
  {
    slug: 'nickel',
    en: 'Nickel Alloys',
    es: 'Níquel',
    blurb:
      'Alloy 600, 625, C-276 and the Monel family. Corrosion, cryogenic and high-temperature service.',
  },
  {
    slug: 'cast-iron',
    en: 'Cast Iron',
    es: 'Hierro Fundido',
    blurb: 'Nickel and nickel-iron electrodes for grey, ductile and malleable iron repair.',
  },
  {
    slug: 'aluminium',
    en: 'Aluminium',
    es: 'Aluminio',
    blurb: 'The 1xxx, 4xxx and 5xxx filler families for wrought and cast aluminium.',
  },
  {
    slug: 'titanium',
    en: 'Titanium',
    es: 'Titanio',
    blurb: 'Commercially pure grades 1–4 and the alloyed grades, for aerospace and chemical service.',
  },
  {
    slug: 'cobalt',
    en: 'Cobalt Alloys',
    es: 'Cobalto',
    blurb: 'Cobalt-chromium hardfacing for combined wear, heat and corrosion. Valve and tool work.',
  },
  {
    slug: 'hardfacing',
    en: 'Hard Surfacing',
    es: 'Recubrimiento Duro',
    blurb: 'Build-up and wear-resistant overlay: manganese, chromium carbide and tungsten carbide.',
  },
  {
    slug: 'copper',
    en: 'Copper Alloys',
    es: 'Aleaciones de Cobre',
    blurb: 'Silicon and aluminium bronze, cupronickel and deoxidised copper.',
  },
  {
    slug: 'brazing',
    en: 'Silver Brazing',
    es: 'Soldadura de Plata',
    blurb: 'Silver, phos-copper and brass brazing filler metals for joining dissimilar metals.',
  },
  {
    slug: 'tubular',
    en: 'Tubular Wires',
    es: 'Alambres Tubulares',
    blurb:
      'Flux-cored stainless and nickel. Carbon-steel flux-cored wires are filed under Carbon Steel with the rest of that alloy family.',
  },
  {
    slug: 'strip',
    en: 'Strip & Cladding',
    es: 'Tira y Recubrimiento',
    blurb:
      'Electroslag and submerged-arc strip for wide-area overlay on vessel and reactor internals.',
  },
]

/*
  [designation, forms, spec, process, note]
  Forms are a string of R / W / E keys.
*/
const RAW = {
  'carbon-steel': [
    ['ER70S-2', 'R', 'AWS A5.18', 'GTAW', 'Triple deoxidised — root passes over mill scale'],
    ['ER70S-3', 'W', 'AWS A5.18', 'GMAW', 'Clean-plate general purpose'],
    ['ER70S-4', 'W', 'AWS A5.18', 'GMAW', 'Higher Si for wetting'],
    ['ER70S-6', 'WR', 'AWS A5.18', 'GMAW · SAW', 'Highest Mn/Si — the default shop wire'],
    ['ER70S-7', 'W', 'AWS A5.18', 'GMAW', 'High Mn, smooth bead'],
    ['ER80S-B2', 'WR', 'AWS A5.28', 'GMAW · GTAW', '1¼Cr-½Mo creep service'],
    ['ER80S-D2', 'W', 'AWS A5.28', 'GMAW', 'C-Mn-Mo, high deposition'],
    ['ER80S-Ni1', 'WR', 'AWS A5.28', 'GMAW · GTAW', '1 % Ni for low-temperature toughness'],
    ['ER80S-Ni2', 'WR', 'AWS A5.28', 'GMAW · GTAW', '2½ % Ni, CVN to −60 °C'],
    ['ER80S-Ni3', 'WR', 'AWS A5.28', 'GMAW · GTAW', '3½ % Ni cryogenic'],
    ['ER90S-B3', 'WR', 'AWS A5.28', 'GMAW · GTAW', '2¼Cr-1Mo, P22 piping'],
    ['ER90S-D2', 'W', 'AWS A5.28', 'GMAW', '90 ksi C-Mn-Mo'],
    ['ER90S-G', 'W', 'AWS A5.28', 'GMAW', 'General 90 ksi, agreed analysis'],
    ['ER100S-1', 'W', 'AWS A5.28', 'GMAW', 'HY-80 and quenched-tempered plate'],
    ['ER110S-1', 'W', 'AWS A5.28', 'GMAW', 'HY-100 class'],
    ['ER120S-1', 'W', 'AWS A5.28', 'GMAW', 'Highest strength solid wire'],
    ['ER90S-B9', 'WR', 'AWS A5.28', 'GMAW · GTAW', 'Grade 91 — creep strength enhanced ferritic'],
    ['EM12K', 'W', 'AWS A5.17', 'SAW', 'Submerged arc, medium manganese'],
    ['EH14', 'W', 'AWS A5.17', 'SAW', 'High manganese, multi-pass'],
    ['EL12', 'W', 'AWS A5.17', 'SAW', 'Low manganese, single pass'],
    ['E71T-1', 'W', 'AWS A5.20', 'FCAW-G', 'Rutile flux core, all position'],
    ['E71T-11', 'W', 'AWS A5.20', 'FCAW-S', 'Self-shielded, no gas'],
    ['E70T-1', 'W', 'AWS A5.20', 'FCAW-G', 'Flat and horizontal, high deposition'],
    ['E70T-4', 'W', 'AWS A5.20', 'FCAW-S', 'Self-shielded, heavy deposit'],
    ['E81T1-Ni1', 'W', 'AWS A5.29', 'FCAW-G', 'Low alloy flux core, notch toughness'],
    ['E91T1-B3', 'W', 'AWS A5.29', 'FCAW-G', '2¼Cr-1Mo flux core'],
    ['E6010', 'E', 'AWS A5.1', 'SMAW', 'Cellulosic, deep penetration root'],
    ['E6011', 'E', 'AWS A5.1', 'SMAW', 'Cellulosic, AC capable'],
    ['E6013', 'E', 'AWS A5.1', 'SMAW', 'Rutile, light fabrication'],
    ['E7014', 'E', 'AWS A5.1', 'SMAW', 'Iron powder rutile'],
    ['E7016', 'E', 'AWS A5.1', 'SMAW', 'Low hydrogen, AC/DC'],
    ['E7018', 'E', 'AWS A5.1', 'SMAW', 'Low hydrogen iron powder — structural standard'],
    ['E7018-1', 'E', 'AWS A5.1', 'SMAW', 'Low hydrogen, improved CVN'],
    ['E7024', 'E', 'AWS A5.1', 'SMAW', 'High iron powder, fillet production'],
    ['E7028', 'E', 'AWS A5.1', 'SMAW', 'Low hydrogen, horizontal fillet'],
    ['E8018-B2', 'E', 'AWS A5.5', 'SMAW', '1¼Cr-½Mo, PWHT required'],
    ['E8018-C1', 'E', 'AWS A5.5', 'SMAW', '2½ % Ni low temperature'],
    ['E8018-C2', 'E', 'AWS A5.5', 'SMAW', '3½ % Ni low temperature'],
    ['E8018-C3', 'E', 'AWS A5.5', 'SMAW', '1 % Ni, weathering steel'],
    ['E9018-B3', 'E', 'AWS A5.5', 'SMAW', '2¼Cr-1Mo, P22'],
    ['E9018-M', 'E', 'AWS A5.5', 'SMAW', 'Military spec toughness'],
    ['E10018-D2', 'E', 'AWS A5.5', 'SMAW', 'C-Mn-Mo, 100 ksi'],
    ['E11018-M', 'E', 'AWS A5.5', 'SMAW', 'HY-100 class'],
    ['E12018-M', 'E', 'AWS A5.5', 'SMAW', 'Highest strength covered electrode'],
  ],
  'stainless-steel': [
    ['ER308', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'For 304 base metal'],
    ['ER308L', 'WR', 'AWS A5.9', 'GTAW · GMAW · SAW', 'Low carbon, resists sensitisation'],
    ['ER308H', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Controlled high carbon, creep service'],
    ['ER308LSi', 'W', 'AWS A5.9', 'GMAW', 'Added silicon for wetting'],
    ['ER309', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Heat resistant, 309 base'],
    ['ER309L', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Dissimilar joints and cladding'],
    ['ER309LSi', 'W', 'AWS A5.9', 'GMAW', 'Dissimilar, improved wetting'],
    ['ER309LMo', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Molybdenum-bearing transition layer'],
    ['ER310', 'WR', 'AWS A5.9', 'GTAW · GMAW', '25Cr-20Ni, furnace parts'],
    ['ER312', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'High ferrite, dissimilar and unknown steels'],
    ['ER316', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Molybdenum, 316 base'],
    ['ER316L', 'WR', 'AWS A5.9', 'GTAW · GMAW · SAW', 'Low carbon Mo — chloride service'],
    ['ER316LSi', 'W', 'AWS A5.9', 'GMAW', 'Mo with silicon'],
    ['ER317L', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Higher Mo, severe corrosion'],
    ['ER318', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Niobium stabilised Mo grade'],
    ['ER320LR', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Alloy 20, sulphuric acid'],
    ['ER321', 'R', 'AWS A5.9', 'GTAW', 'Titanium stabilised'],
    ['ER330', 'WR', 'AWS A5.9', 'GTAW · GMAW', '35Ni-15Cr heat resistant'],
    ['ER347', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Niobium stabilised, 321/347 base'],
    ['ER347Si', 'W', 'AWS A5.9', 'GMAW', 'Stabilised with silicon'],
    ['ER385', 'WR', 'AWS A5.9', 'GTAW · GMAW', '904L, high alloy corrosion'],
    ['ER410', 'WR', 'AWS A5.9', 'GTAW · GMAW', '12Cr martensitic overlay'],
    ['ER410NiMo', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Soft martensitic, hydro turbine'],
    ['ER420', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'High carbon martensitic, wear'],
    ['ER430', 'WR', 'AWS A5.9', 'GTAW · GMAW', '16Cr ferritic'],
    ['ER630', 'WR', 'AWS A5.9', 'GTAW · GMAW', '17-4 PH precipitation hardening'],
    ['ER2209', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Duplex 22Cr — the standard duplex filler'],
    ['ER2553', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Super duplex 25Cr'],
    ['ER2594', 'WR', 'AWS A5.9', 'GTAW · GMAW', 'Super duplex, high PREN'],
    ['E308L-16', 'E', 'AWS A5.4', 'SMAW', 'Low carbon austenitic electrode'],
    ['E309L-16', 'E', 'AWS A5.4', 'SMAW', 'Dissimilar joint electrode'],
    ['E316L-16', 'E', 'AWS A5.4', 'SMAW', 'Molybdenum austenitic electrode'],
    ['E312-16', 'E', 'AWS A5.4', 'SMAW', 'High ferrite repair electrode'],
    ['E347-16', 'E', 'AWS A5.4', 'SMAW', 'Stabilised austenitic electrode'],
    ['E410-16', 'E', 'AWS A5.4', 'SMAW', 'Martensitic electrode, preheat required'],
    ['E2209-16', 'E', 'AWS A5.4', 'SMAW', 'Duplex electrode'],
  ],
  nickel: [
    ['ERNi-1', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Commercially pure nickel'],
    ['ERNiCu-7', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Monel 400'],
    ['ERNiCr-3', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 82 — Inconel 600, dissimilar'],
    ['ERNiCrMo-3', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 625 — the workhorse'],
    ['ERNiCrMo-4', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Hastelloy C-276'],
    ['ERNiCrMo-10', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Hastelloy C-22'],
    ['ERNiCrMo-22', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 59'],
    ['ERNiCrFe-7', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 52, nuclear cladding'],
    ['ERNiFeCr-1', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 825'],
    ['ERNiFeCr-2', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 718'],
    ['ERNiCrCoMo-1', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Alloy 617, high temperature'],
    ['ERNiMo-7', 'WR', 'AWS A5.14', 'GTAW · GMAW', 'Hastelloy B-2'],
    ['ENi-1', 'E', 'AWS A5.11', 'SMAW', 'Pure nickel electrode'],
    ['ENiCu-7', 'E', 'AWS A5.11', 'SMAW', 'Monel electrode'],
    ['ENiCrFe-2', 'E', 'AWS A5.11', 'SMAW', 'Alloy 182, dissimilar'],
    ['ENiCrFe-3', 'E', 'AWS A5.11', 'SMAW', 'Alloy 182 high Mn'],
    ['ENiCrMo-3', 'E', 'AWS A5.11', 'SMAW', 'Alloy 625 electrode'],
    ['ENiCrMo-4', 'E', 'AWS A5.11', 'SMAW', 'C-276 electrode'],
  ],
  'cast-iron': [
    ['ENi-CI', 'E', 'AWS A5.15', 'SMAW', '99 % nickel, most machinable deposit'],
    ['ENiFe-CI', 'E', 'AWS A5.15', 'SMAW', '55Ni-45Fe — lower expansion, less cracking'],
    ['ENiFeMn-CI', 'E', 'AWS A5.15', 'SMAW', 'Manganese bearing, high strength'],
    ['ENiCu-A', 'E', 'AWS A5.15', 'SMAW', 'Nickel-copper, low dilution'],
    ['ENiCu-B', 'E', 'AWS A5.15', 'SMAW', 'Higher copper variant'],
    ['ESt', 'E', 'AWS A5.15', 'SMAW', 'Steel core, non-machinable repair'],
    ['ERNi-CI', 'R', 'AWS A5.15', 'GTAW', 'Nickel rod for cast iron'],
    ['ERNiFe-CI', 'R', 'AWS A5.15', 'GTAW', 'Nickel-iron rod'],
    // RBCuZn-C is also used to braze-weld iron, but it is filed once, under
    // Silver Brazing. Listing a designation twice collides its record id.
  ],
  aluminium: [
    ['ER1100', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Commercially pure aluminium'],
    ['ER1188', 'WR', 'AWS A5.10', 'GTAW · GMAW', '99.88 % Al, high purity'],
    ['ER2319', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Cu, 2xxx series, heat treatable'],
    ['ER4009', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Si-Cu castings'],
    ['ER4010', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Si castings'],
    ['ER4043', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-5Si — 6061 and castings'],
    ['ER4047', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-12Si, brazing and low shrink'],
    ['ER4145', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Si-Cu, die castings'],
    ['ER5183', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Mg, marine 5083'],
    ['ER5356', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-5Mg — highest use rate'],
    ['ER5554', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Mg, elevated temperature'],
    ['ER5556', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Mg, high strength'],
    ['ER5654', 'WR', 'AWS A5.10', 'GTAW · GMAW', 'Al-Mg, hydrogen peroxide service'],
  ],
  titanium: [
    ['ERTi-1', 'R', 'AWS A5.16', 'GTAW', 'CP grade 1, most ductile'],
    ['ERTi-2', 'R', 'AWS A5.16', 'GTAW', 'CP grade 2 — general purpose'],
    ['ERTi-3', 'R', 'AWS A5.16', 'GTAW', 'CP grade 3, higher strength'],
    ['ERTi-4', 'R', 'AWS A5.16', 'GTAW', 'CP grade 4, highest CP strength'],
    ['ERTi-5', 'R', 'AWS A5.16', 'GTAW', 'Ti-6Al-4V, aerospace'],
    ['ERTi-7', 'R', 'AWS A5.16', 'GTAW', 'Palladium bearing, corrosion'],
    ['ERTi-9', 'R', 'AWS A5.16', 'GTAW', 'Ti-3Al-2.5V tubing'],
    ['ERTi-12', 'R', 'AWS A5.16', 'GTAW', 'Ti-Mo-Ni, crevice corrosion'],
    ['ERTi-23', 'R', 'AWS A5.16', 'GTAW', 'Ti-6Al-4V ELI, medical'],
  ],
  cobalt: [
    ['ERCoCr-A', 'R', 'AWS A5.21', 'GTAW', 'Stellite 6 — valve seats, 40 HRC'],
    ['ERCoCr-B', 'R', 'AWS A5.21', 'GTAW', 'Stellite 12, higher hardness'],
    ['ERCoCr-C', 'R', 'AWS A5.21', 'GTAW', 'Stellite 1, maximum abrasion'],
    ['ERCoCr-E', 'R', 'AWS A5.21', 'GTAW', 'Stellite 21, impact and thermal shock'],
    ['ECoCr-A', 'E', 'AWS A5.13', 'SMAW', 'Stellite 6 electrode'],
    ['ECoCr-B', 'E', 'AWS A5.13', 'SMAW', 'Stellite 12 electrode'],
    ['ECoCr-C', 'E', 'AWS A5.13', 'SMAW', 'Stellite 1 electrode'],
  ],
  hardfacing: [
    ['EFeMn-A', 'E', 'AWS A5.13', 'SMAW', 'Austenitic manganese, work hardening'],
    ['EFeMn-B', 'E', 'AWS A5.13', 'SMAW', 'Manganese with molybdenum'],
    ['EFeCr-A1', 'E', 'AWS A5.13', 'SMAW', 'Chromium carbide, severe abrasion'],
    ['ERFeCr-A1', 'R', 'AWS A5.21', 'GTAW', 'Chromium carbide rod'],
    ['EFe5-A', 'E', 'AWS A5.13', 'SMAW', 'Martensitic build-up, tool steel type'],
    ['EFe5-B', 'E', 'AWS A5.13', 'SMAW', 'Higher alloy martensitic'],
    ['EFe2', 'E', 'AWS A5.13', 'SMAW', 'Pearlitic build-up under overlay'],
    ['EFe3', 'E', 'AWS A5.13', 'SMAW', 'Austenitic build-up'],
    ['EWC', 'E', 'AWS A5.13', 'SMAW', 'Tungsten carbide composite, extreme wear'],
    ['ERCuAl-A2', 'R', 'AWS A5.7', 'GTAW', 'Aluminium bronze, metal-to-metal wear'],
    ['ECuAl-A2', 'E', 'AWS A5.6', 'SMAW', 'Aluminium bronze electrode'],
  ],
  copper: [
    ['ERCu', 'R', 'AWS A5.7', 'GTAW · GMAW', 'Deoxidised copper'],
    ['ERCuSi-A', 'WR', 'AWS A5.7', 'GTAW · GMAW', 'Silicon bronze — braze-weld galvanised'],
    ['ERCuSn-A', 'R', 'AWS A5.7', 'GTAW', 'Phosphor bronze, bearing surfaces'],
    ['ERCuAl-A1', 'R', 'AWS A5.7', 'GTAW', 'Aluminium bronze, iron-free'],
    ['ERCuNi', 'WR', 'AWS A5.7', 'GTAW · GMAW', '70/30 cupronickel, marine'],
    ['ERCuMnNiAl', 'R', 'AWS A5.7', 'GTAW', 'Manganese-nickel-aluminium bronze, propellers'],
    ['ECuSi', 'E', 'AWS A5.6', 'SMAW', 'Silicon bronze electrode'],
    ['ECuNi', 'E', 'AWS A5.6', 'SMAW', 'Cupronickel electrode'],
  ],
  brazing: [
    ['BAg-1', 'R', 'AWS A5.8', 'Braze', '45 % Ag, lowest flow point — cadmium bearing'],
    ['BAg-1a', 'R', 'AWS A5.8', 'Braze', '50 % Ag, narrow melting range'],
    ['BAg-2', 'R', 'AWS A5.8', 'Braze', '35 % Ag general purpose'],
    ['BAg-3', 'R', 'AWS A5.8', 'Braze', 'Nickel bearing, carbide and stainless'],
    ['BAg-5', 'R', 'AWS A5.8', 'Braze', '45 % Ag cadmium free'],
    ['BAg-6', 'R', 'AWS A5.8', 'Braze', '50 % Ag cadmium free'],
    ['BAg-7', 'R', 'AWS A5.8', 'Braze', 'Tin bearing, white colour, food service'],
    ['BAg-24', 'R', 'AWS A5.8', 'Braze', 'Nickel bearing, cadmium free'],
    ['BAg-34', 'R', 'AWS A5.8', 'Braze', '38 % Ag, tin bearing'],
    ['BCuP-2', 'R', 'AWS A5.8', 'Braze', 'Phos-copper, self-fluxing on copper'],
    ['BCuP-3', 'R', 'AWS A5.8', 'Braze', '5 % Ag phos-copper'],
    ['BCuP-5', 'R', 'AWS A5.8', 'Braze', '15 % Ag phos-copper, refrigeration'],
    ['BCuP-6', 'R', 'AWS A5.8', 'Braze', '2 % Ag phos-copper'],
    ['RBCuZn-A', 'R', 'AWS A5.8', 'Braze', 'Naval brass, braze-welding steel'],
    ['RBCuZn-C', 'R', 'AWS A5.8', 'Braze', 'Low fuming bronze'],
    ['RBCuZn-D', 'R', 'AWS A5.8', 'Braze', 'Nickel silver, carbide tips'],
  ],
  tubular: [
    ['E308LT1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Austenitic flux-cored, all position'],
    ['E308LT0-1', 'W', 'AWS A5.22', 'FCAW-G', 'Flat and horizontal, high deposition'],
    ['E309LT1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Dissimilar and overlay flux-cored'],
    ['E316LT1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Molybdenum austenitic flux-cored'],
    ['E317LT1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Higher Mo flux-cored'],
    ['E347T1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Niobium stabilised flux-cored'],
    ['E2209T1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Duplex flux-cored'],
    ['E410NiMoT1-1', 'W', 'AWS A5.22', 'FCAW-G', 'Soft martensitic overlay'],
    ['ENiCrMo3T1-4', 'W', 'AWS A5.34', 'FCAW-G', 'Alloy 625 flux-cored'],
    ['ENiCrFe2T1-4', 'W', 'AWS A5.34', 'FCAW-G', 'Alloy 182 flux-cored'],
  ],
  strip: [
    ['EQ308L', 'W', 'AWS A5.9', 'ESW · SAW strip', '60 mm and 90 mm cladding strip'],
    ['EQ309L', 'W', 'AWS A5.9', 'ESW · SAW strip', 'First-layer overlay on carbon steel'],
    ['EQ309LNb', 'W', 'AWS A5.9', 'ESW · SAW strip', 'Niobium stabilised transition layer'],
    ['EQ316L', 'W', 'AWS A5.9', 'ESW · SAW strip', 'Molybdenum second-layer overlay'],
    ['EQ347', 'W', 'AWS A5.9', 'ESW · SAW strip', 'Stabilised overlay'],
    ['EQ430', 'W', 'AWS A5.9', 'ESW · SAW strip', 'Ferritic overlay'],
    ['EQNiCr-3', 'W', 'AWS A5.14', 'ESW · SAW strip', 'Alloy 82 cladding strip'],
    ['EQNiCrMo-3', 'W', 'AWS A5.14', 'ESW · SAW strip', 'Alloy 625 cladding strip'],
  ],
}

/** Records that already carry a full technical sheet in details.js. */
const WITH_SHEET = new Set([
  'ER70S-6',
  'ER70S-2',
  'ER308L',
  'ER316L',
  'ER309L',
  'ER4043',
  'ER5356',
  'ERCuSi-A',
])

export const CATALOG = Object.entries(RAW).flatMap(([section, rows]) =>
  rows.map(([designation, forms, spec, process, note]) => ({
    id: designation.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    designation,
    section,
    forms: forms.split(''),
    spec,
    process,
    note,
    sheet: WITH_SHEET.has(designation),
  })),
)

const BY_SECTION = CATALOG.reduce((acc, item) => {
  ;(acc[item.section] ??= []).push(item)
  return acc
}, {})

export function sectionBySlug(slug) {
  return SECTIONS.find((s) => s.slug === slug) ?? null
}

export function itemsInSection(slug) {
  return BY_SECTION[slug] ?? []
}

export function countInSection(slug) {
  return BY_SECTION[slug]?.length ?? 0
}

export const CATALOG_TOTAL = CATALOG.length
export const SHEET_TOTAL = CATALOG.filter((c) => c.sheet).length

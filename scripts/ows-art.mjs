/*
  Generates the monochrome industrial artwork for Online Welding Supply.

      node scripts/ows-art.mjs

  These are drawn rather than photographed on purpose: vector art stays crisp at
  any viewport, weighs a few kilobytes, is guaranteed monochrome and carries no
  licensing or watermark question. Every file is a drop-in replacement target —
  swap public/ows/arc.svg for arc.webp and change one prop on ParallaxImage.

  Output is deterministic: the PRNG is seeded, so regenerating produces a byte
  identical file and the diff stays empty unless the art actually changed.
*/

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ows')
const W = 1600
const H = 1000

/** mulberry32 — small, fast, seedable. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (v, p = 2) => Number(v.toFixed(p))
const svg = (body, w = W, h = H) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" role="presentation">\n${body}\n</svg>\n`

/** Radial darkening at the frame edges — keeps every image reading as black. */
const vignette = (id, inner = 0.35) => `
  <radialGradient id="${id}" cx="50%" cy="50%" r="72%">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="${inner * 100}%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.92"/>
  </radialGradient>`

/** Fine film grain. Low frequency keeps the rasteriser cheap. */
const grain = (id, freq = 0.9) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
  </filter>`

/* ------------------------------------------------------------------ arc.svg
   A welding arc: hot core, bloom, spatter, electrode silhouette. */
function arc() {
  const r = rng(1337)
  const ax = 640
  const ay = 560

  const spatter = Array.from({ length: 140 }, () => {
    const angle = r() * Math.PI * 2
    const dist = 30 + Math.pow(r(), 1.8) * 620
    const x = ax + Math.cos(angle) * dist * 1.5
    const y = ay + Math.sin(angle) * dist * 0.55
    if (y > H - 10 || y < 40) return ''
    const size = 0.6 + r() * 2.4
    const op = n(0.5 * (1 - dist / 700) + r() * 0.15, 3)
    if (op <= 0.02) return ''
    // Longer-lived particles drag a trail behind them.
    const trail =
      r() > 0.72
        ? `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x - Math.cos(angle) * size * 9)}" y2="${n(
            y - Math.sin(angle) * size * 4,
          )}" stroke="#fff" stroke-opacity="${n(op * 0.4, 3)}" stroke-width="${n(size * 0.4)}"/>`
        : ''
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(size)}" fill="#fff" fill-opacity="${op}"/>${trail}`
  }).join('')

  const rays = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 + r() * 0.12
    const len = 180 + r() * 520
    return `<line x1="${ax}" y1="${ay}" x2="${n(ax + Math.cos(a) * len * 1.4)}" y2="${n(
      ay + Math.sin(a) * len * 0.5,
    )}" stroke="#fff" stroke-opacity="${n(0.02 + r() * 0.05, 3)}" stroke-width="${n(0.5 + r() * 1.5)}"/>`
  }).join('')

  return svg(`
  <defs>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="22%" stop-color="#fff" stop-opacity="0.72"/>
      <stop offset="52%" stop-color="#fff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.3"/>
      <stop offset="45%" stop-color="#fff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="puddle" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="38%" stop-color="#fff" stop-opacity="0.34"/>
      <stop offset="50%" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="62%" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rod" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000"/>
      <stop offset="42%" stop-color="#2a2a2a"/>
      <stop offset="58%" stop-color="#101010"/>
      <stop offset="100%" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="workTop" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.02"/>
      <stop offset="40%" stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#fff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0.02"/>
    </linearGradient>
    ${vignette('vig', 0.2)}
    ${grain('gr', 1.1)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>

  <!-- wide atmospheric bloom -->
  <ellipse cx="${ax}" cy="${ay}" rx="760" ry="330" fill="url(#bloom)"/>
  <g>${rays}</g>

  <!-- workpiece -->
  <rect x="0" y="${ay + 26}" width="${W}" height="${H - ay - 26}" fill="#040404"/>
  <rect x="0" y="${ay + 24}" width="${W}" height="3" fill="url(#workTop)"/>
  <ellipse cx="${ax}" cy="${ay + 28}" rx="210" ry="16" fill="url(#puddle)"/>

  <!-- electrode -->
  <path d="M${ax - 14} ${ay - 8} L${ax + 12} ${ay - 8} L${ax + 268} ${-40} L${ax + 226} ${-40} Z" fill="url(#rod)"/>
  <path d="M${ax + 12} ${ay - 8} L${ax + 268} ${-40}" stroke="#fff" stroke-opacity="0.14" stroke-width="1"/>

  <!-- arc core, drawn last so nothing dims it -->
  <ellipse cx="${ax}" cy="${ay}" rx="132" ry="120" fill="url(#core)"/>
  <ellipse cx="${ax}" cy="${ay + 4}" rx="34" ry="30" fill="#fff" fill-opacity="0.9"/>

  <g>${spatter}</g>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" filter="url(#gr)" opacity="0.05" style="mix-blend-mode:overlay"/>`)
}

/* ---------------------------------------------------------------- plate.svg
   Brushed steel plate, raking light. */
function plate() {
  const r = rng(90210)

  const brush = Array.from({ length: 260 }, () => {
    const y = r() * H
    const x = r() * W * 0.4
    const len = 260 + r() * (W - x)
    const op = n(0.008 + Math.pow(r(), 2.2) * 0.075, 3)
    return `<line x1="${n(x)}" y1="${n(y)}" x2="${n(Math.min(W, x + len))}" y2="${n(y)}" stroke="#fff" stroke-opacity="${op}" stroke-width="${n(0.4 + r() * 1.1)}"/>`
  }).join('')

  const scratches = Array.from({ length: 14 }, () => {
    const y = r() * H
    const x = r() * W
    const len = 60 + r() * 380
    const dy = (r() - 0.5) * 14
    return `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + len)}" y2="${n(y + dy)}" stroke="#fff" stroke-opacity="${n(0.08 + r() * 0.14, 3)}" stroke-width="${n(0.5 + r() * 0.7)}"/>`
  }).join('')

  // Mill-scale mottling: soft dark blooms across the surface.
  const scale = Array.from({ length: 30 }, () => {
    const cx = r() * W
    const cy = r() * H
    const rx = 60 + r() * 220
    return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(rx * (0.3 + r() * 0.4))}" fill="#000" fill-opacity="${n(0.1 + r() * 0.22, 3)}"/>`
  }).join('')

  return svg(`
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="#000"/>
      <stop offset="34%" stop-color="#141414"/>
      <stop offset="52%" stop-color="#1f1f1f"/>
      <stop offset="70%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#000"/>
    </linearGradient>
    ${vignette('vigp', 0.28)}
    ${grain('grp', 0.75)}
  </defs>

  <rect width="${W}" height="${H}" fill="#050505"/>
  <rect width="${W}" height="${H}" fill="url(#sheen)"/>
  <g>${scale}</g>
  <g>${brush}</g>
  <g>${scratches}</g>
  <rect width="${W}" height="${H}" fill="url(#vigp)"/>
  <rect width="${W}" height="${H}" filter="url(#grp)" opacity="0.07" style="mix-blend-mode:overlay"/>`)
}

/* ---------------------------------------------------------------- stock.svg
   Round bar stock, seen end-on in hexagonal packing. */
function stock() {
  const r = rng(4711)
  const rad = 62
  const dx = rad * 2 + 9
  const dy = rad * 1.74
  const bars = []

  for (let row = -1; row * dy < H + rad * 2; row++) {
    const offset = row % 2 === 0 ? 0 : dx / 2
    for (let col = -1; col * dx + offset < W + rad * 2; col++) {
      const cx = col * dx + offset
      const cy = row * dy
      // Depth cue: bars further from the light source sit darker and softer.
      const depth = n(0.35 + 0.65 * (1 - Math.hypot(cx - W * 0.34, cy - H * 0.4) / 1100), 3)
      bars.push(
        `<g opacity="${Math.max(0.2, depth)}">` +
          `<circle cx="${n(cx)}" cy="${n(cy)}" r="${rad}" fill="url(#barFace)"/>` +
          `<circle cx="${n(cx)}" cy="${n(cy)}" r="${rad}" fill="none" stroke="#fff" stroke-opacity="${n(0.05 + r() * 0.07, 3)}"/>` +
          `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad * 0.62)}" fill="none" stroke="#fff" stroke-opacity="${n(0.03 + r() * 0.04, 3)}"/>` +
          `<path d="M${n(cx - rad * 0.72)} ${n(cy - rad * 0.4)} A ${n(rad * 0.84)} ${n(rad * 0.84)} 0 0 1 ${n(cx - rad * 0.1)} ${n(cy - rad * 0.82)}" stroke="#fff" stroke-opacity="${n(0.14 + r() * 0.12, 3)}" stroke-width="2" fill="none"/>` +
          `</g>`,
      )
    }
  }

  return svg(`
  <defs>
    <radialGradient id="barFace" cx="34%" cy="30%" r="78%">
      <stop offset="0%" stop-color="#2e2e2e"/>
      <stop offset="40%" stop-color="#161616"/>
      <stop offset="78%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    ${vignette('vigs', 0.18)}
    ${grain('grs', 0.85)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>
  <g>${bars.join('')}</g>
  <rect width="${W}" height="${H}" fill="url(#vigs)"/>
  <rect width="${W}" height="${H}" filter="url(#grs)" opacity="0.06" style="mix-blend-mode:overlay"/>`)
}

/* -------------------------------------------------------------- section.svg
   A single-V groove butt joint in section, drawn as a working detail. */
function section() {
  const cx = W / 2
  const top = 300
  const bottom = 700
  const rootFace = 34
  const gap = 26
  const bevelRun = (bottom - top - rootFace) * Math.tan((30 * Math.PI) / 180)

  // Section hatching, clipped to the two plates.
  const hatch = []
  for (let i = -H; i < W + H; i += 13) {
    hatch.push(
      `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}" stroke="#fff" stroke-opacity="0.055" stroke-width="0.8"/>`,
    )
  }

  const leftPlate = `M0 ${top} L${cx - gap / 2 - bevelRun} ${top} L${cx - gap / 2} ${bottom - rootFace} L${cx - gap / 2} ${bottom} L0 ${bottom} Z`
  const rightPlate = `M${W} ${top} L${cx + gap / 2 + bevelRun} ${top} L${cx + gap / 2} ${bottom - rootFace} L${cx + gap / 2} ${bottom} L${W} ${bottom} Z`

  // Weld passes: root, two fills, cap.
  const passes = [
    `M${cx - gap / 2 - 4} ${bottom - 4} Q ${cx} ${bottom - 46} ${cx + gap / 2 + 4} ${bottom - 4}`,
    `M${cx - 66} ${bottom - 118} Q ${cx} ${bottom - 168} ${cx + 66} ${bottom - 118}`,
    `M${cx - 118} ${bottom - 232} Q ${cx} ${bottom - 282} ${cx + 118} ${bottom - 232}`,
    `M${cx - bevelRun - gap / 2 - 26} ${top} Q ${cx} ${top - 56} ${cx + bevelRun + gap / 2 + 26} ${top}`,
  ]
    .map(
      (d, i) =>
        `<path d="${d}" stroke="#fff" stroke-opacity="${n(0.5 - i * 0.07, 3)}" stroke-width="1.4" fill="none"/>`,
    )
    .join('')

  // Kept faint: the callouts should read as annotation glimpsed on a drawing,
  // never as legible words competing with the page's own type.
  const label = (x, y, text, anchor = 'middle') =>
    `<text x="${x}" y="${y}" fill="#fff" fill-opacity="0.26" font-family="ui-monospace,monospace" font-size="15" letter-spacing="3" text-anchor="${anchor}">${text}</text>`

  return svg(`
  <defs>
    <clipPath id="plates"><path d="${leftPlate}"/><path d="${rightPlate}"/></clipPath>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" stroke="#fff" stroke-opacity="0.028" stroke-width="1" fill="none"/>
    </pattern>
    ${vignette('vigd', 0.3)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- HAZ band: the zone that never melted but was rewritten anyway -->
  <path d="${leftPlate}" fill="#fff" fill-opacity="0.028"/>
  <path d="${rightPlate}" fill="#fff" fill-opacity="0.028"/>
  <g clip-path="url(#plates)">${hatch.join('')}</g>
  <path d="${leftPlate}" stroke="#fff" stroke-opacity="0.34" stroke-width="1.5" fill="none"/>
  <path d="${rightPlate}" stroke="#fff" stroke-opacity="0.34" stroke-width="1.5" fill="none"/>

  <!-- fusion line -->
  <path d="M${cx - gap / 2 - bevelRun} ${top} L${cx - gap / 2} ${bottom - rootFace} L${cx - gap / 2} ${bottom}" stroke="#fff" stroke-opacity="0.2" stroke-width="1" stroke-dasharray="7 7" fill="none"/>
  <path d="M${cx + gap / 2 + bevelRun} ${top} L${cx + gap / 2} ${bottom - rootFace} L${cx + gap / 2} ${bottom}" stroke="#fff" stroke-opacity="0.2" stroke-width="1" stroke-dasharray="7 7" fill="none"/>

  ${passes}

  <!-- included angle -->
  <path d="M${cx - 92} ${top + 128} A 150 150 0 0 1 ${cx + 92} ${top + 128}" stroke="#fff" stroke-opacity="0.22" stroke-width="1" fill="none"/>
  ${label(cx, top + 108, '60°')}

  <!-- dimensions -->
  <line x1="${cx - gap / 2}" y1="${bottom + 54}" x2="${cx + gap / 2}" y2="${bottom + 54}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  <line x1="${cx - gap / 2}" y1="${bottom + 40}" x2="${cx - gap / 2}" y2="${bottom + 68}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  <line x1="${cx + gap / 2}" y1="${bottom + 40}" x2="${cx + gap / 2}" y2="${bottom + 68}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  ${label(cx, bottom + 96, 'ROOT  1 / 8')}

  <line x1="${cx + 300}" y1="${top}" x2="${cx + 300}" y2="${bottom}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  <line x1="${cx + 286}" y1="${top}" x2="${cx + 314}" y2="${top}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  <line x1="${cx + 286}" y1="${bottom}" x2="${cx + 314}" y2="${bottom}" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>
  ${label(cx + 330, (top + bottom) / 2 + 7, 'T', 'start')}

  ${label(160, top - 44, 'BASE  METAL', 'start')}
  ${label(W - 160, bottom + 96, 'HAZ', 'end')}

  <rect width="${W}" height="${H}" fill="url(#vigd)"/>`)
}

/*
  ── PRODUCT ART ───────────────────────────────────────────────────────────
  Varilla, rollo, electrodo — the three forms from the product sheet.

  These are the only artwork that carries colour. Copper is what the product
  actually is, and the brand's own product photography shows it; rendering the
  consumables in greyscale would make them read as concept art rather than as
  something you can order. Everything around them stays monochrome.

  The realism comes from one trick used consistently: a cylinder is a rect with
  a linear gradient across its short axis (dark → specular → mid → dark), and a
  light source fixed to the upper left for every object on the page.
*/

/** Cylindrical shading across a horizontal bar. */
const cylinderStops = (dark, mid, hot) => `
    <stop offset="0%" stop-color="${dark}"/>
    <stop offset="18%" stop-color="${mid}"/>
    <stop offset="34%" stop-color="${hot}"/>
    <stop offset="46%" stop-color="${mid}"/>
    <stop offset="78%" stop-color="${dark}"/>
    <stop offset="100%" stop-color="#000"/>`

/* ------------------------------------------------------------------ rod.svg
   Varilla — a bundle of copper-coated rods, cut ends toward the viewer. */
function rod() {
  const r = rng(7781)
  const rodR = 26 // radius in local units
  const len = 1500
  const rows = 6
  const perRow = [7, 8, 7, 6, 4, 2]

  const bars = []
  const caps = []
  let idx = 0
  for (let row = 0; row < rows; row++) {
    const y = row * (rodR * 1.72)
    const offset = (row % 2) * rodR
    for (let i = 0; i < perRow[row]; i++) {
      const x = i * (rodR * 2 + 2) + offset
      // Slight per-rod variation stops the bundle reading as a printed pattern.
      const jitter = (r() - 0.5) * 5
      const shade = 0.82 + r() * 0.32
      bars.push(
        `<g transform="translate(${n(x)},${n(y + jitter)})" opacity="${n(Math.min(1, shade), 2)}">` +
          `<rect x="0" y="${-rodR}" width="${len}" height="${rodR * 2}" fill="url(#cu)"/>` +
          `</g>`,
      )
      // Cut face: bare steel, not copper — the coating is only on the flank.
      caps.push(
        `<g transform="translate(${n(x)},${n(y + jitter)})">` +
          `<ellipse cx="0" cy="0" rx="${n(rodR * 0.42)}" ry="${rodR}" fill="url(#cut)"/>` +
          `<ellipse cx="0" cy="0" rx="${n(rodR * 0.42)}" ry="${rodR}" fill="none" stroke="#d8d2c8" stroke-opacity="0.5" stroke-width="1.6"/>` +
          `<ellipse cx="${n(-rodR * 0.1)}" cy="${n(-rodR * 0.3)}" rx="${n(rodR * 0.16)}" ry="${n(rodR * 0.34)}" fill="#fff" fill-opacity="0.22"/>` +
          `</g>`,
      )
      idx++
    }
  }

  return svg(`
  <defs>
    <linearGradient id="cu" x1="0" y1="0" x2="0" y2="1">
      ${cylinderStops('#3d2110', '#a8642c', '#e5a463')}
    </linearGradient>
    <linearGradient id="cut" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b9b4ab"/>
      <stop offset="45%" stop-color="#7c7871"/>
      <stop offset="100%" stop-color="#3a3833"/>
    </linearGradient>
    <linearGradient id="rodFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="62%" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000" stop-opacity="1"/>
    </linearGradient>
    ${vignette('vigr', 0.3)}
    ${grain('grr', 0.9)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>
  <ellipse cx="620" cy="820" rx="480" ry="52" fill="#000" fill-opacity="0.85"/>

  <!-- The bundle runs away from the viewer to the upper right. -->
  <g transform="translate(250,700) rotate(-16)">
    <g>${bars.join('')}</g>
    <rect x="0" y="-60" width="${len}" height="600" fill="url(#rodFade)"/>
    <g>${caps.join('')}</g>
  </g>

  <rect width="${W}" height="${H}" fill="url(#vigr)"/>
  <rect width="${W}" height="${H}" filter="url(#grr)" opacity="0.05" style="mix-blend-mode:overlay"/>`)
}

/* ------------------------------------------------------------ electrode.svg
   Electrodo — covered electrodes leaving an opened box. */
function electrode() {
  const r = rng(3319)
  const eR = 27
  const len = 980
  const rows = [5, 4, 3]

  const sticks = []
  for (let row = rows.length - 1; row >= 0; row--) {
    const y = row * (eR * 1.9)
    const offset = (row % 2) * eR
    for (let i = 0; i < rows[row]; i++) {
      const x = i * (eR * 2 + 7) + offset
      const jitter = (r() - 0.5) * 7
      // Flux covering stops short of the striking end, leaving bare core.
      sticks.push(
        `<g transform="translate(${n(x)},${n(y + jitter)})">` +
          `<rect x="0" y="${-eR}" width="${len}" height="${eR * 2}" fill="url(#flux)"/>` +
          // faint longitudinal seam, the way extruded covering actually looks
          `<rect x="0" y="${n(-eR * 0.52)}" width="${len}" height="1.4" fill="#fff" fill-opacity="0.05"/>` +
          `<rect x="${-118}" y="${n(-eR * 0.4)}" width="122" height="${n(eR * 0.8)}" fill="url(#core)"/>` +
          `<ellipse cx="${-118}" cy="0" rx="${n(eR * 0.16)}" ry="${n(eR * 0.4)}" fill="#6f6b64"/>` +
          `<ellipse cx="0" cy="0" rx="${n(eR * 0.3)}" ry="${eR}" fill="#8d8880"/>` +
          `<ellipse cx="${n(-eR * 0.06)}" cy="${n(-eR * 0.3)}" rx="${n(eR * 0.13)}" ry="${n(eR * 0.34)}" fill="#fff" fill-opacity="0.14"/>` +
          `</g>`,
      )
    }
  }

  return svg(`
  <defs>
    <!-- Matte: the covering is a pressed mineral flux, so the highlight is
         broad and dull. A tight specular reads as chromed tube instead. -->
    <linearGradient id="flux" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#100f0d"/>
      <stop offset="20%" stop-color="#4a453d"/>
      <stop offset="40%" stop-color="#8b8478"/>
      <stop offset="58%" stop-color="#6a655c"/>
      <stop offset="82%" stop-color="#26241f"/>
      <stop offset="100%" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="core" x1="0" y1="0" x2="0" y2="1">
      ${cylinderStops('#1c1c1c', '#6e6e6e', '#a8a8a8')}
    </linearGradient>
    <linearGradient id="boxFront" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1c1c"/>
      <stop offset="55%" stop-color="#0c0c0c"/>
      <stop offset="100%" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="boxLid" x1="0" y1="0" x2="1" y2="0.5">
      <stop offset="0%" stop-color="#343434"/>
      <stop offset="45%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#060606"/>
    </linearGradient>
    <linearGradient id="eFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#000" stop-opacity="1"/>
    </linearGradient>
    ${vignette('vige', 0.3)}
    ${grain('gre', 0.9)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>
  <ellipse cx="720" cy="850" rx="540" ry="56" fill="#000" fill-opacity="0.85"/>

  <g transform="translate(230,600) rotate(-13)">
    <!-- carton behind and below the sticks -->
    <path d="M250 -186 L${len + 60} -186 L${len + 60} 250 L250 250 Z" fill="url(#boxFront)"/>
    <path d="M250 250 L${len + 60} 250" stroke="#fff" stroke-opacity="0.09" stroke-width="2"/>

    <g>${sticks.join('')}</g>
    <rect x="220" y="-230" width="${len}" height="520" fill="url(#eFade)"/>

    <!-- lid, brand rule and legend -->
    <path d="M232 -188 L${len + 80} -188 L${len + 80} -84 L232 -84 Z" fill="url(#boxLid)"/>
    <path d="M232 -188 L${len + 80} -188" stroke="#fff" stroke-opacity="0.2" stroke-width="2.5"/>
    <path d="M232 -84 L${len + 80} -84" stroke="#000" stroke-opacity="0.9" stroke-width="3"/>
    <rect x="470" y="-124" width="440" height="6" fill="#e10600"/>
    <text x="470" y="-140" fill="#fff" fill-opacity="0.62" font-family="ui-monospace,monospace" font-size="28" letter-spacing="8">WELDING ELECTRODES</text>
  </g>

  <rect width="${W}" height="${H}" fill="url(#vige)"/>
  <rect width="${W}" height="${H}" filter="url(#gre)" opacity="0.05" style="mix-blend-mode:overlay"/>`)
}

/* ---------------------------------------------------------------- spool.svg
   Rollo — black spool wound with copper-coated MIG wire. */
function spool() {
  const r = rng(20260810)
  const cx = 800
  const cy = 600
  const x0 = 540
  const x1 = 1060
  const flangeRy = 300
  const flangeRx = 62
  const barrelRy = 214

  // Individual copper winds. Spacing near the wire diameter is what sells it:
  // too coarse and it reads as a striped drum, too fine and it turns to noise.
  const winds = []
  for (let x = x0 + 3; x < x1 - 3; x += 3.4) {
    const t = (x - x0) / (x1 - x0)
    const lit = Math.pow(Math.sin(t * Math.PI), 0.55)
    const jitter = (r() - 0.5) * 2.5
    const shade = 0.28 + lit * 0.72
    const cR = Math.round(70 + shade * 175)
    const cG = Math.round(38 + shade * 118)
    const cB = Math.round(18 + shade * 66)
    winds.push(
      `<line x1="${n(x)}" y1="${n(cy - barrelRy + jitter)}" x2="${n(x)}" y2="${n(cy + barrelRy + jitter)}" stroke="rgb(${cR},${cG},${cB})" stroke-width="2.6"/>`,
    )
    // Specular thread running along the top of each wind.
    if (lit > 0.55)
      winds.push(
        `<line x1="${n(x)}" y1="${n(cy - barrelRy * 0.72)}" x2="${n(x)}" y2="${n(cy - barrelRy * 0.1)}" stroke="#ffd9a8" stroke-opacity="${n((lit - 0.55) * 0.7, 3)}" stroke-width="1.4"/>`,
      )
  }

  // Horizontal seams where one winding pass meets the next.
  const layers = []
  for (let i = 1; i < 7; i++) {
    const yy = cy - barrelRy + (i / 7) * barrelRy * 2 + (r() - 0.5) * 8
    const op = n(0.1 + r() * 0.16, 3)
    layers.push(
      `<line x1="${x0 + 2}" y1="${n(yy)}" x2="${x1 - 2}" y2="${n(yy + (r() - 0.5) * 5)}" stroke="#0d0703" stroke-opacity="${op}" stroke-width="${n(2 + r() * 3)}"/>`,
      `<line x1="${x0 + 2}" y1="${n(yy - 2.5)}" x2="${x1 - 2}" y2="${n(yy - 2.5)}" stroke="#ffbe86" stroke-opacity="${n(op * 0.5, 3)}" stroke-width="1"/>`,
    )
  }

  return svg(`
  <defs>
    <linearGradient id="barrelShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.72"/>
      <stop offset="26%" stop-color="#000" stop-opacity="0.05"/>
      <stop offset="62%" stop-color="#000" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.82"/>
    </linearGradient>
    <radialGradient id="flangeFace" cx="34%" cy="28%" r="82%">
      <stop offset="0%" stop-color="#2b2b2b"/>
      <stop offset="42%" stop-color="#131313"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#000"/>
    </linearGradient>
    ${vignette('vigw', 0.24)}
    ${grain('grw', 0.9)}
  </defs>

  <rect width="${W}" height="${H}" fill="#000"/>
  <rect y="${cy + flangeRy - 40}" width="${W}" height="${H - cy - flangeRy + 40}" fill="url(#floor)"/>
  <ellipse cx="${cx}" cy="${cy + flangeRy - 6}" rx="330" ry="34" fill="#000" fill-opacity="0.85"/>

  <!-- wound copper wire between the flanges -->
  <rect x="${x0}" y="${cy - barrelRy}" width="${x1 - x0}" height="${barrelRy * 2}" fill="#1a0e05"/>
  <g>${winds.join('')}</g>
  <!-- Layer edges. A spool is wound in passes, and the seam between passes is
       the cue that separates "wound wire" from "striped drum". -->
  <g>${layers.join('')}</g>
  <rect x="${x0}" y="${cy - barrelRy}" width="${x1 - x0}" height="${barrelRy * 2}" fill="url(#barrelShade)"/>

  <!-- rear flange, then the near one over the winds -->
  <ellipse cx="${x1}" cy="${cy}" rx="${flangeRx}" ry="${flangeRy}" fill="url(#flangeFace)" stroke="#fff" stroke-opacity="0.08"/>
  <ellipse cx="${x0}" cy="${cy}" rx="${flangeRx}" ry="${flangeRy}" fill="url(#flangeFace)" stroke="#fff" stroke-opacity="0.18"/>

  <!-- Moulded ribs radiating from the hub. Without them the flange reads as a
       flat black oval rather than a formed plastic part. -->
  ${Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const ix = x0 + Math.cos(a) * flangeRx * 0.34
    const iy = cy + Math.sin(a) * flangeRy * 0.34
    const ox = x0 + Math.cos(a) * flangeRx * 0.9
    const oy = cy + Math.sin(a) * flangeRy * 0.9
    const lit = n(0.05 + Math.max(0, Math.cos(a - 2.4)) * 0.13, 3)
    return `<line x1="${n(ix)}" y1="${n(iy)}" x2="${n(ox)}" y2="${n(oy)}" stroke="#fff" stroke-opacity="${lit}" stroke-width="2"/>`
  }).join('')}

  <!-- hub: locating ring, brand rule, centre bore -->
  <ellipse cx="${x0}" cy="${cy}" rx="${n(flangeRx * 0.5)}" ry="${n(flangeRy * 0.5)}" fill="none" stroke="#fff" stroke-opacity="0.1" stroke-width="1.5"/>
  <path d="M${n(x0 - flangeRx * 0.34)} ${n(cy + flangeRy * 0.56)} A ${n(flangeRx * 0.62)} ${n(flangeRy * 0.62)} 0 0 0 ${n(x0 - flangeRx * 0.34)} ${n(cy - flangeRy * 0.56)}" stroke="#e10600" stroke-opacity="0.85" stroke-width="4" fill="none"/>
  <ellipse cx="${x0}" cy="${cy}" rx="${n(flangeRx * 0.2)}" ry="${n(flangeRy * 0.2)}" fill="#000" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5"/>

  <!-- rim light down the leading edge -->
  <path d="M${x0} ${cy - flangeRy} A ${flangeRx} ${flangeRy} 0 0 0 ${x0} ${cy + flangeRy}" stroke="#fff" stroke-opacity="0.36" stroke-width="2.5" fill="none"/>
  <path d="M${x0 + 6} ${cy - barrelRy} L${x1 - 6} ${cy - barrelRy}" stroke="#ffcf9a" stroke-opacity="0.28" stroke-width="1.5"/>

  <rect width="${W}" height="${H}" fill="url(#vigw)"/>
  <rect width="${W}" height="${H}" filter="url(#grw)" opacity="0.05" style="mix-blend-mode:overlay"/>`)
}

/* ----------------------------------------------------------------- mark.svg
   Brand mark: a single-V groove joint in section, reduced to three strokes.
   Abstract to anyone else; unmistakable to anyone who preps plate. */
function mark() {
  // The two prepared edges never meet: the root opening between them is what
  // keeps the mark abstract. Close the gap and it collapses into a letter Y.
  return svg(
    `  <path d="M5 4.5 L10 15.5 L10 19.5" stroke="#fff" stroke-width="1.6" stroke-linecap="square" fill="none"/>
  <path d="M19 4.5 L14 15.5 L14 19.5" stroke="#fff" stroke-width="1.6" stroke-linecap="square" fill="none"/>`,
    24,
    24,
  )
}

mkdirSync(OUT, { recursive: true })
const files = {
  'arc.svg': arc(),
  'plate.svg': plate(),
  'stock.svg': stock(),
  'section.svg': section(),
  'spool.svg': spool(),
  'rod.svg': rod(),
  'electrode.svg': electrode(),
  'mark.svg': mark(),
}
for (const [name, content] of Object.entries(files)) {
  writeFileSync(resolve(OUT, name), content)
  console.log(`${name.padEnd(14)} ${(content.length / 1024).toFixed(1)} kB`)
}

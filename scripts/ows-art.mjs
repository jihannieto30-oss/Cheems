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
const files = { 'arc.svg': arc(), 'plate.svg': plate(), 'stock.svg': stock(), 'section.svg': section(), 'mark.svg': mark() }
for (const [name, content] of Object.entries(files)) {
  writeFileSync(resolve(OUT, name), content)
  console.log(`${name.padEnd(14)} ${(content.length / 1024).toFixed(1)} kB`)
}

import * as THREE from 'three'
import { LOCKUP } from '../brandMark'

/*
  Printed packaging, generated.

  The carton is the product for a covered electrode — it is what is on the
  shelf and what the buyer recognises — so it carries the real logo rather
  than a red rectangle standing in for one. The mark's own path data is
  rasterised through Path2D at texture resolution, which keeps it sharp at any
  size the carton is seen at and costs nothing to ship: the geometry is already
  in the bundle for the interface.
*/

const cache = new Map()
const memo = (key, build) => {
  if (!cache.has(key)) cache.set(key, build())
  return cache.get(key)
}

const RED = '#d81419'

/** Draws the lockup into `ctx`, fitted to a box, in the given inks. */
function drawMark(ctx, x, y, w, inkA, inkB) {
  const scale = w / LOCKUP.width
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = inkA
  ctx.fill(new Path2D(LOCKUP.a), 'evenodd')
  ctx.fillStyle = inkB
  ctx.fill(new Path2D(LOCKUP.b), 'evenodd')
  ctx.restore()
  return LOCKUP.height * scale
}

/**
 * The long face of an electrode carton: red, the mark, a rule, a designation.
 * `text` is the classification printed under the mark.
 */
export function cartonFaceTexture({ text = 'E7018', size = 1024 } = {}) {
  return memo(`carton-${text}-${size}`, () => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = Math.round(size / 4) // the face is four times as long as it is deep
    const ctx = c.getContext('2d')
    const h = c.height

    // Print red, with a slight vertical shade so the flat face is not dead.
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#e2181d')
    bg.addColorStop(0.55, RED)
    bg.addColorStop(1, '#b30f14')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, c.width, h)

    const markW = size * 0.3
    const markH = drawMark(ctx, size * 0.055, h * 0.16, markW, '#ffffff', '#ffffff')

    // A rule and the classification, set the way packaging actually sets it.
    const x = size * 0.055 + markW + size * 0.045
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillRect(x, h * 0.16, 2, markH)

    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.font = `700 ${Math.round(h * 0.3)}px "Space Grotesk", system-ui, sans-serif`
    ctx.fillText(text, x + size * 0.035, h * 0.42)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = `500 ${Math.round(h * 0.115)}px "Space Grotesk", system-ui, sans-serif`
    ctx.letterSpacing = '0.22em'
    ctx.fillText('ELECTRODO REVESTIDO', x + size * 0.035, h * 0.68)

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  })
}

/** The short end of the carton: just the mark, centred. */
export function cartonEndTexture({ size = 256 } = {}) {
  return memo(`carton-end-${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#c31217'
    ctx.fillRect(0, 0, size, size)
    const w = size * 0.74
    drawMark(ctx, (size - w) / 2, size * 0.36, w, '#ffffff', '#ffffff')

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Plain print red for the faces that carry no artwork. */
export function cartonPlainTexture({ size = 64 } = {}) {
  return memo(`carton-plain-${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, size)
    g.addColorStop(0, '#d0151a')
    g.addColorStop(1, '#a50d12')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

export function disposeLabelCache() {
  for (const t of cache.values()) t.dispose?.()
  cache.clear()
}

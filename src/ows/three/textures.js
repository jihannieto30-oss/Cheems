import * as THREE from 'three'

/*
  Surface detail, generated.

  A metal with a uniform roughness value reads as CGI immediately — real metal
  is scratched, and it is the *variation* in roughness that the eye reads as
  "this object has been handled". These canvases supply that variation.

  Everything is cached: a page can mount several product stages and they all
  share one set of GPU textures.
*/

const cache = new Map()
const memo = (key, build) => {
  if (!cache.has(key)) cache.set(key, build())
  return cache.get(key)
}

/**
 * Clones a cached texture so one surface can carry its own repeat/rotation
 * without touching the shared original.
 *
 * The clone shares the source image but holds its own GPU upload, so it has to
 * be freed with the material that used it — `owned` is how disposeProduct tells
 * those apart from the cached originals, which must survive.
 */
export function ownedClone(texture, { repeat, rotation, center } = {}) {
  const tex = texture.clone()
  tex.needsUpdate = true
  tex.userData = { owned: true }
  if (repeat) tex.repeat.set(repeat[0], repeat[1])
  if (rotation !== undefined) tex.rotation = rotation
  if (center) tex.center.set(center[0], center[1])
  return tex
}

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

/** Deterministic noise so the same surface renders identically every load. */
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

/**
 * Micro-scratches. Mid grey is the base roughness; darker streaks are polished
 * passes, lighter ones are duller wear. Doubles as a bump map at low scale.
 */
export function scratchTexture({ seed = 11, size = 1024, density = 900 } = {}) {
  return memo(`scratch-${seed}-${size}-${density}`, () => {
    const c = canvas(size)
    const ctx = c.getContext('2d')
    const r = rng(seed)

    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, size, size)

    // Broad cloudy variation first — machining is never uniform.
    for (let i = 0; i < 46; i++) {
      const x = r() * size
      const y = r() * size
      const rad = size * (0.05 + r() * 0.18)
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      const v = r() > 0.5 ? 255 : 0
      g.addColorStop(0, `rgba(${v},${v},${v},${0.05 + r() * 0.06})`)
      g.addColorStop(1, `rgba(${v},${v},${v},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }

    // Then the scratches, mostly aligned but never perfectly.
    ctx.lineCap = 'round'
    for (let i = 0; i < density; i++) {
      const x = r() * size
      const y = r() * size
      const len = 8 + Math.pow(r(), 2.4) * size * 0.5
      const angle = (r() - 0.5) * 0.5 + (r() > 0.85 ? Math.PI / 2 : 0)
      const light = r() > 0.55
      ctx.strokeStyle = light
        ? `rgba(255,255,255,${0.02 + r() * 0.08})`
        : `rgba(0,0,0,${0.02 + r() * 0.09})`
      ctx.lineWidth = 0.4 + r() * 1.4
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      ctx.stroke()
    }

    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })
}

/**
 * Wound wire. On a cylinder, U runs around the circumference and V along the
 * axis, so a wind — which circles the barrel — is a line of constant V. The
 * texture is therefore horizontal stripes, repeated hard along V.
 */
export function windingTexture({ size = 512, lines = 64 } = {}) {
  return memo(`winding-${size}-${lines}`, () => {
    const c = canvas(size)
    const ctx = c.getContext('2d')
    const r = rng(4242)
    const pitch = size / lines

    ctx.fillStyle = '#7d7d7d'
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < lines; i++) {
      const y = i * pitch
      // Each wind is a tiny cylinder: bright along its crest, dark in the
      // valley where it meets the next turn.
      const g = ctx.createLinearGradient(0, y, 0, y + pitch)
      g.addColorStop(0, 'rgba(0,0,0,0.55)')
      g.addColorStop(0.32, 'rgba(255,255,255,0.5)')
      g.addColorStop(0.55, 'rgba(255,255,255,0.12)')
      g.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = g
      ctx.fillRect(0, y, size, pitch)

      // Break the regularity so it does not read as a printed pattern.
      if (r() > 0.82) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`
        ctx.fillRect(r() * size, y, size * (0.1 + r() * 0.3), pitch)
      }
    }

    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })
}

/** Pressed mineral flux: matte, granular, no directional grain. */
export function fluxTexture({ size = 512 } = {}) {
  return memo(`flux-${size}`, () => {
    const c = canvas(size)
    const ctx = c.getContext('2d')
    const r = rng(909)

    ctx.fillStyle = '#9a9a9a'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 26000; i++) {
      const v = r() > 0.5 ? 255 : 0
      ctx.fillStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.06})`
      ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2)
    }

    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/**
 * Weld bead ripples — the stacked-dime pattern a weave leaves behind.
 *
 * The ripples run across the bead, so on a shape extruded along the seam they
 * are arcs repeating along V. They are the single detail that makes a bead
 * read as deposited rather than as a moulded strip of plastic.
 */
export function beadTexture({ size = 512, ripples = 26 } = {}) {
  return memo(`bead-${size}-${ripples}`, () => {
    const c = canvas(size)
    const ctx = c.getContext('2d')
    const r = rng(1717)
    const pitch = size / ripples

    ctx.fillStyle = '#8f8f8f'
    ctx.fillRect(0, 0, size, size)

    ctx.lineCap = 'round'
    for (let i = 0; i <= ripples; i++) {
      const y = i * pitch
      // Each ripple is a frozen crescent of the puddle: bright on the crest
      // that faces the arc, dark in the trough behind it.
      for (const [offset, color, width] of [
        [-pitch * 0.16, `rgba(0,0,0,${0.32 + r() * 0.12})`, pitch * 0.42],
        [pitch * 0.1, `rgba(255,255,255,${0.3 + r() * 0.14})`, pitch * 0.3],
      ]) {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.beginPath()
        // Bowed toward the direction of travel, with a little variation so the
        // pattern does not tile visibly.
        ctx.moveTo(-size * 0.05, y + offset)
        ctx.quadraticCurveTo(size / 2, y + offset - pitch * (0.5 + r() * 0.25), size * 1.05, y + offset)
        ctx.stroke()
      }
    }

    // Fine granular noise on top — solidified metal is never smooth.
    for (let i = 0; i < 9000; i++) {
      const v = r() > 0.5 ? 255 : 0
      ctx.fillStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.05})`
      ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2)
    }

    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })
}

/** Soft radial falloff used as a contact shadow under a product. */
export function contactShadowTexture({ size = 512 } = {}) {
  return memo(`contact-${size}`, () => {
    const c = canvas(size)
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(0,0,0,0.85)')
    g.addColorStop(0.45, 'rgba(0,0,0,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(c)
  })
}

export function disposeTextureCache() {
  for (const t of cache.values()) t.dispose?.()
  cache.clear()
}

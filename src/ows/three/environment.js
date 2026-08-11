import * as THREE from 'three'

/*
  Studio lighting, generated.

  Physically-correct metal is almost entirely reflection: without an environment
  to reflect, a metalness-1 surface renders as a flat dark shape no matter how
  many lights you add. There is no network here to fetch an HDRI from, so the
  environment is painted into a canvas and prefiltered through PMREM — the same
  path an .hdr would take, minus the download.

  The layout is a real photographic set: dark ceiling, a wrapping bright band at
  reflection height, two hard softbox strips, a warm bounce card low on one
  side, a cool fill on the other. Those strips are what become the long specular
  highlights running down a spool flange or a rod.

  Note the environment is only ever used as an IBL source — `scene.background`
  stays unset — so it can be much brighter than the page without lifting the
  black behind the product.
*/

function paintStudio(width = 2048, height = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Ground-to-sky falloff. Equirectangular: v=0 is up, v=1 is down.
  // The step across the middle is the horizon, and it is what draws the bright
  // line across a curved metal surface that says "this was photographed".
  const base = ctx.createLinearGradient(0, 0, 0, height)
  base.addColorStop(0, '#14161a')
  base.addColorStop(0.26, '#3a3f47')
  base.addColorStop(0.44, '#8b929c')
  base.addColorStop(0.5, '#aab2bd')
  base.addColorStop(0.54, '#3c3e43')
  base.addColorStop(0.7, '#17181b')
  base.addColorStop(1, '#08080a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  /*
    A softbox, as a soft-edged rectangle rather than a blurred disc.

    A disc reflects as a round blob; a real strip box reflects as a long straight
    highlight with square ends, and that shape is most of what makes a rendered
    surface read as photographed. Nested rounded rects from transparent outward
    edge to solid core give the falloff without needing a blur filter.
  */
  const strip = (cx, cy, w, h, intensity, tint, steps = 26) => {
    for (let i = steps; i >= 1; i--) {
      const t = i / steps
      // Ease the alpha so the core stays flat and the edge falls away fast.
      const alpha = intensity * Math.pow(1 - t, 2.1) * 0.16
      if (alpha <= 0.001) continue
      const rw = w * (0.32 + t * 0.68)
      const rh = h * (0.32 + t * 0.68)
      const r = Math.min(rw, rh) * 0.42
      ctx.fillStyle = `rgba(${tint},${alpha})`
      ctx.beginPath()
      ctx.roundRect(cx - rw / 2, cy - rh / 2, rw, rh, r)
      ctx.fill()
    }
    // Solid core, so the highlight has a real edge to reflect.
    ctx.fillStyle = `rgba(${tint},${intensity})`
    ctx.beginPath()
    ctx.roundRect(cx - w * 0.16, cy - h * 0.16, w * 0.32, h * 0.32, Math.min(w, h) * 0.08)
    ctx.fill()
  }

  // Key: a tall strip box high and left of centre — the main highlight.
  strip(width * 0.26, height * 0.28, width * 0.2, height * 0.44, 1, '255,251,244')
  // Rim: narrower, opposite side and higher — this is the edge light.
  strip(width * 0.72, height * 0.2, width * 0.11, height * 0.34, 0.95, '235,242,255')
  // Second key wrapping around the back, so a turning product never goes dead.
  strip(width * 0.96, height * 0.36, width * 0.09, height * 0.26, 0.5, '255,248,238')
  // Warm bounce low left, the colour a shop floor throws back.
  strip(width * 0.1, height * 0.72, width * 0.3, height * 0.2, 0.34, '255,196,140')
  // Cool fill low right, keeps the shadow side from going dead.
  strip(width * 0.86, height * 0.68, width * 0.26, height * 0.18, 0.26, '150,175,220')

  return canvas
}

/**
 * Builds a prefiltered environment for the renderer.
 * Returns the PMREM render target's texture; dispose it with the scene.
 */
export function createStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  const texture = new THREE.CanvasTexture(paintStudio())
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace

  const target = pmrem.fromEquirectangular(texture)

  texture.dispose()
  pmrem.dispose()

  return target.texture
}

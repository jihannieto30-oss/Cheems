import * as THREE from 'three'
import { scratchTexture, beadTexture, ownedClone } from './textures'

/*
  A weld, built as a scene the reader scrolls through.

  Two plates prepared with a 30° single-V groove, and a bead laid into it. The
  whole thing is driven by one number — scroll progress, 0 to 1 — which:

    · grows the bead along the seam
    · carries the arc along its leading edge
    · heats the metal just behind the arc and lets it cool back to steel
    · dollies the camera from a wide establishing view down into the puddle

  Everything is modelled at 1 unit = 10 mm and the seam runs along Z, which is
  also the extrusion axis, so plates and bead share one cross-section language:
  draw the profile in XY, extrude along the joint.

  The heat is the point of the whole thing. A bead that simply appears reads as
  a decal; a bead that arrives molten and cools behind the arc reads as having
  been deposited, and that is what the section is arguing.
*/

const T = 0.5 // plate thickness
const HALF_W = 5 // plate half-width, each side
const GAP = 0.16 // root opening
const BEVEL = T * Math.tan(Math.PI / 6) // 30° groove face
const LENGTH = 20 // seam length
const CROWN = 0.17 // how far the bead stands proud of the plate

/** One plate, as a profile extruded along the seam. `side` is -1 or +1. */
function buildPlate(side, material) {
  const inner = GAP / 2
  const shape = new THREE.Shape()
  shape.moveTo(side * inner, 0)
  shape.lineTo(side * (inner + BEVEL), T) // the prepared groove face
  shape.lineTo(side * HALF_W, T)
  shape.lineTo(side * HALF_W, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, { depth: LENGTH, steps: 1, bevelEnabled: false })
  geo.translate(0, 0, -LENGTH / 2)
  return new THREE.Mesh(geo, material)
}

/**
 * The bead profile: fills the groove, wets out onto both toes, crowns above.
 * Extruded along the seam and grown from one end by scaling in Z.
 */
function buildBeadGeometry(segments = 220) {
  const toe = GAP / 2 + BEVEL + 0.13
  const shape = new THREE.Shape()
  shape.moveTo(-toe, T)
  shape.quadraticCurveTo(0, T + CROWN * 1.32, toe, T)
  shape.lineTo(GAP / 2, 0)
  shape.lineTo(-GAP / 2, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: LENGTH,
    // Many steps because the bead is what the emissive heat gradient is
    // painted onto, and that gradient is per-vertex.
    steps: segments,
    bevelEnabled: false,
    curveSegments: 14,
  })
  geo.translate(0, 0, -LENGTH / 2)
  return geo
}

export function createWeldScene(renderer) {
  const group = new THREE.Group()

  // ---- plates -------------------------------------------------------------
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0x8d9096,
    metalness: 1,
    roughness: 0.52,
    roughnessMap: ownedClone(scratchTexture(), { repeat: [3, 8] }),
    bumpMap: ownedClone(scratchTexture(), { repeat: [3, 8] }),
    bumpScale: 0.004,
    envMapIntensity: 1.15,
  })
  group.add(buildPlate(-1, steel), buildPlate(1, steel))

  // ---- bead ---------------------------------------------------------------
  const beadGeo = buildBeadGeometry()

  /*
    Heat is carried as a vertex attribute rather than a texture: each vertex
    knows where it sits along the seam, and the material's emissive is looked
    up from that against the arc's current position. One float per vertex,
    updated by a uniform — no per-frame geometry work at all.
  */
  const zs = beadGeo.attributes.position.array
  const along = new Float32Array(beadGeo.attributes.position.count)
  for (let i = 0; i < along.length; i++) {
    along[i] = (zs[i * 3 + 2] + LENGTH / 2) / LENGTH // 0 at the start of the seam
  }
  beadGeo.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))

  const beadMap = ownedClone(beadTexture(), { repeat: [1, 26] })
  const bead = new THREE.MeshPhysicalMaterial({
    color: 0x9aa0a8,
    metalness: 1,
    roughness: 0.44,
    roughnessMap: beadMap,
    bumpMap: beadMap,
    bumpScale: 0.02,
    envMapIntensity: 1.2,
    // Black, so the only emission on this surface is the heat ramp added in
    // the shader below. A white base emissive lights the entire bead evenly
    // and there is nothing left for the gradient to say.
    emissive: 0x000000,
    // The bead is cut open at the arc, so the inside of the far wall is on
    // screen for one frame's worth of geometry at the leading edge.
    side: THREE.DoubleSide,
  })

  const heat = { value: 0 } // arc position along the seam, 0 → 1

  /*
    The bead is drawn at full length and clipped at the arc rather than scaled
    up to it. Scaling would have been cheaper, but it detaches every vertex
    from its real position along the seam — and that position is exactly what
    the heat gradient is a function of, so a scaled bead glows in the wrong
    place, or nowhere. Discarding keeps one coordinate system for both.
  */
  bead.onBeforeCompile = (shader) => {
    shader.uniforms.uHeat = heat
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong;\nvarying float vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;')

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHeat;\nvarying float vAlong;')
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (vAlong > uHeat) discard;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Distance behind the arc, as a fraction of the seam. Ahead of the arc
        // there is no metal at all, so only the trailing side is ever hot.
        float behind = uHeat - vAlong;
        // Written low-edge-first: GLSL leaves smoothstep undefined when edge0
        // is greater than edge1, and the inverted form is what a driver is
        // free to return as a flat 1.0 — which glows the whole bead.
        float glow = 1.0 - smoothstep(0.0, 0.14, behind);
        // Cooling ramp: white at the arc, through orange, to nothing.
        vec3 hot = mix(vec3(1.0, 0.28, 0.015), vec3(1.0, 0.95, 0.84), pow(glow, 2.4));
        totalEmissiveRadiance += hot * glow * 3.2;`,
      )
  }

  const beadMesh = new THREE.Mesh(beadGeo, bead)
  group.add(beadMesh)

  // ---- the arc itself -----------------------------------------------------
  // A light for what it does to the plates, and a sprite for what the camera
  // sees. Neither alone reads as an arc.
  const arcLight = new THREE.PointLight(0xdce8ff, 0, 9, 2)
  arcLight.position.y = T + CROWN
  group.add(arcLight)

  const flare = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flareTexture(),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    }),
  )
  flare.scale.setScalar(2.6)
  flare.position.y = T + CROWN
  group.add(flare)

  // ---- sparks -------------------------------------------------------------
  const SPARKS = 220
  const sparkPos = new Float32Array(SPARKS * 3)
  const sparkVel = new Float32Array(SPARKS * 3)
  const sparkLife = new Float32Array(SPARKS)
  const sparkGeo = new THREE.BufferGeometry()
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))

  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      size: 0.055,
      color: 0xffb861,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  group.add(sparks)

  let cursor = 0
  const rand = (a, b) => a + Math.random() * (b - a)

  function spawn(z, count) {
    for (let n = 0; n < count; n++) {
      const i = cursor
      cursor = (cursor + 1) % SPARKS
      sparkPos[i * 3] = rand(-0.05, 0.05)
      sparkPos[i * 3 + 1] = T + CROWN
      sparkPos[i * 3 + 2] = z + rand(-0.06, 0.06)
      // Thrown mostly sideways and back, the way spatter actually leaves a
      // puddle — straight up looks like a firework, not a weld.
      sparkVel[i * 3] = rand(-3.4, 3.4)
      sparkVel[i * 3 + 1] = rand(0.6, 3.4)
      sparkVel[i * 3 + 2] = rand(-2.6, 0.9)
      sparkLife[i] = rand(0.3, 0.85)
    }
  }

  function stepSparks(dt) {
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue
      sparkLife[i] -= dt
      if (sparkLife[i] <= 0) {
        sparkPos[i * 3 + 1] = -99 // parked out of frame rather than branching
        continue
      }
      sparkVel[i * 3 + 1] -= 9.2 * dt
      sparkPos[i * 3] += sparkVel[i * 3] * dt
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt
      if (sparkPos[i * 3 + 1] < T) {
        // Bounce off the plate, losing most of the energy.
        sparkPos[i * 3 + 1] = T
        sparkVel[i * 3 + 1] *= -0.28
        sparkVel[i * 3] *= 0.7
        sparkVel[i * 3 + 2] *= 0.7
      }
    }
    sparkGeo.attributes.position.needsUpdate = true
  }

  /*
    Drive everything from progress.

    `progress` is where the arc has reached along the seam. `dt` steps the
    sparks, which are the one thing here that has to keep living between
    scroll events — a still frame of a weld with the spatter frozen mid-air
    looks broken.
  */
  function update(progress, dt) {
    const p = Math.max(0, Math.min(1, progress))
    // The bead exists only as far as the arc has travelled; the shader
    // discards everything ahead of this.
    heat.value = p

    const z = -LENGTH / 2 + LENGTH * p
    arcLight.position.z = z
    flare.position.z = z

    // The arc strikes as the section is entered and extinguishes at the end of
    // the seam, so the scene opens and closes on cold metal.
    const live = Math.min(smooth(p, 0, 0.06), smooth(1 - p, 0, 0.05))
    arcLight.intensity = live * 26
    flare.material.opacity = live * 0.95
    flare.scale.setScalar(2.2 + live * 0.9 + Math.sin(performance.now() * 0.02) * 0.16 * live)

    if (live > 0.15 && dt > 0) spawn(z, Math.round(dt * 260 * live))
    stepSparks(dt)
  }

  function dispose() {
    group.traverse((node) => {
      node.geometry?.dispose?.()
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      for (const mat of mats) {
        if (!mat) continue
        for (const key of ['map', 'roughnessMap', 'bumpMap']) {
          if (mat[key]?.userData?.owned) mat[key].dispose()
        }
        mat.dispose?.()
      }
    })
  }

  return { group, update, dispose, length: LENGTH, thickness: T, crown: CROWN }
}

const smooth = (x, a, b) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** The arc's visible core: a hard white centre in a wide blue-white halo. */
function flareTexture() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.1, 'rgba(233,244,255,0.95)')
  g.addColorStop(0.26, 'rgba(150,190,255,0.4)')
  g.addColorStop(0.55, 'rgba(90,140,255,0.12)')
  g.addColorStop(1, 'rgba(60,110,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

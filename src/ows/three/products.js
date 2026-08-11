import * as THREE from 'three'
import {
  scratchTexture,
  windingTexture,
  fluxTexture,
  contactShadowTexture,
  ownedClone,
} from './textures'

/*
  The three product forms, built as real geometry.

  Everything is modelled at roughly 1 unit = 100 mm, centred on the origin, and
  laid out with its length along X so a single spin around Y turns any of them
  through a sensible product rotation.

  Instancing is used wherever a form repeats — a rod bundle is one draw call,
  not thirty — which is what keeps this viable on a phone.

  Each builder also publishes how it wants to be looked at, in userData:
    · view — camera direction, so a long bundle can be shot more down its axis
    · yaw  — the resting rotation the spin starts from
  A single fixed camera angle cannot flatter a disc and a bundle at once.
*/

const COPPER = 0xc07a3e
const STEEL = 0xc8c8c8
const FLUX = 0x7a7466

function metal({ color, roughness = 0.32, map, bumpScale = 0.006, repeat = [1, 1] }) {
  const tex = ownedClone(map ?? scratchTexture(), { repeat })

  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness,
    roughnessMap: tex,
    bumpMap: tex,
    bumpScale,
    envMapIntensity: 1.3,
  })
}

/** Contact shadow: a soft dark disc laid on the ground plane under the piece. */
function contactShadow(radius, y = 0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.6, radius * 2.6),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.renderOrder = -1
  // Excluded from the framing bounds: the shadow plane is much wider than the
  // object, and letting it into the bounds pushes the camera back until the
  // product is a speck.
  mesh.userData.isShadow = true
  return mesh
}

/** Deterministic per-index jitter in -1..1, so a bundle is never machine-perfect. */
function wobble(i, salt = 0) {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return (v - Math.floor(v)) * 2 - 1
}

/**
 * Hexagonal close packing for a bundle cross-section.
 * Returns points in the YZ plane, centred, since bundles run along X.
 */
function packRows(rows, r, pitch = 2.06, rowPitch = 1.79) {
  const points = []
  const widest = Math.max(...rows)
  let maxV = 0

  rows.forEach((count, row) => {
    const v = row * r * rowPitch
    // Odd rows sit in the valley of the row below — that is what makes it read
    // as packed rather than stacked.
    const inset = ((widest - count) / 2) * r * pitch
    for (let i = 0; i < count; i++) {
      points.push([i * r * pitch + inset, v])
      maxV = Math.max(maxV, v)
    }
  })

  const spanH = (widest - 1) * r * pitch
  return points.map(([h, v]) => [h - spanH / 2, v - maxV / 2]).map((p) => ({
    z: p[0],
    y: p[1],
    halfH: spanH / 2 + r,
    halfV: maxV / 2 + r,
  }))
}

/* ------------------------------------------------------------------ ROLLO */
export function buildSpool() {
  const group = new THREE.Group()
  const R = 1.0 // flange radius
  const halfWidth = 0.44
  const barrelR = 0.7
  const boreR = 0.17
  const flangeDepth = 0.075

  /*
    A real wire spool flange is not a solid disc — it is a moulded wheel with
    spoke openings, and you see the wound copper through them. That reading is
    most of what identifies the object, so the openings are modelled rather
    than painted: an extruded shape with the bore and six kidney cut-outs.
  */
  const shape = new THREE.Shape()
  shape.absarc(0, 0, R, 0, Math.PI * 2, false)

  const bore = new THREE.Path()
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true)
  shape.holes.push(bore)

  const SPOKES = 6
  const web = 0.19 // radians of solid material between openings
  for (let i = 0; i < SPOKES; i++) {
    const a0 = (i / SPOKES) * Math.PI * 2 + web
    const a1 = ((i + 1) / SPOKES) * Math.PI * 2 - web
    const opening = new THREE.Path()
    opening.absarc(0, 0, R * 0.8, a0, a1, false)
    opening.absarc(0, 0, R * 0.36, a1, a0, true)
    shape.holes.push(opening)
  }

  const flangeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: flangeDepth,
    steps: 1,
    curveSegments: 40,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelOffset: 0,
    bevelSegments: 2,
  })
  flangeGeo.center()

  // Injection-moulded plastic: dielectric, satin, with a clearcoat so the rim
  // catches the softbox the way a moulded part actually does.
  const plastic = new THREE.MeshPhysicalMaterial({
    color: 0x1b1c1f,
    metalness: 0,
    roughness: 0.4,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.1,
  })

  for (const side of [-1, 1]) {
    const flange = new THREE.Mesh(flangeGeo, plastic)
    flange.rotation.y = Math.PI / 2 // extruded along +Z, stood up onto the X axis
    flange.position.x = side * halfWidth
    group.add(flange)
  }

  // Wound wire. The winding texture supplies every turn; modelling them as
  // geometry would cost thousands of triangles for the same silhouette.
  const wire = ownedClone(windingTexture(), {
    repeat: [1, 30],
    rotation: Math.PI / 2,
    center: [0.5, 0.5],
  })

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(barrelR, barrelR, halfWidth * 2 - flangeDepth, 128, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: COPPER,
      metalness: 1,
      roughness: 0.26,
      roughnessMap: wire,
      bumpMap: wire,
      bumpScale: 0.018,
      envMapIntensity: 1.5,
    }),
  )
  barrel.rotation.z = Math.PI / 2
  group.add(barrel)

  // Moulded hub carrying the flanges, seen through the spoke openings.
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(boreR * 1.55, boreR * 1.55, halfWidth * 2, 40, 1, true),
    plastic,
  )
  hub.rotation.z = Math.PI / 2
  group.add(hub)

  // Bore, seen through the centre of the near flange.
  const boreTube = new THREE.Mesh(
    new THREE.CylinderGeometry(boreR, boreR, halfWidth * 2.1, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.92, side: THREE.BackSide }),
  )
  boreTube.rotation.z = Math.PI / 2
  group.add(boreTube)

  group.add(contactShadow(R, -R - 0.01))
  group.userData.view = new THREE.Vector3(0.46, 0.3, 1)
  group.userData.yaw = -0.58
  return group
}

/* ---------------------------------------------------------------- VARILLA */
export function buildRod() {
  const group = new THREE.Group()
  const rodR = 0.075
  const len = 3.0
  const packed = packRows([4, 5, 6, 5, 4], rodR)
  const { halfV } = packed[0]

  const copper = metal({ color: COPPER, roughness: 0.24, repeat: [1, 5] })
  // Sheared steel: no coating, duller, and it scatters rather than mirrors.
  const cut = metal({ color: STEEL, roughness: 0.55, repeat: [1, 1] })

  const shafts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(rodR, rodR, len, 22, 1, true),
    copper,
    packed.length,
  )
  const caps = new THREE.InstancedMesh(new THREE.CircleGeometry(rodR, 22), cut, packed.length)

  const m = new THREE.Matrix4()
  const s = new THREE.Vector3(1, 1, 1)
  // The cylinder is built along Y; a quarter turn about Z lays it along X.
  const along = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2))
  const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0))
  const pos = new THREE.Vector3()

  packed.forEach(({ y, z }, i) => {
    // The cross-section spreads across Y and Z; X is the rod's own length, so
    // the only variation along it is the stagger of a hand-gathered bundle.
    const stagger = wobble(i, 1) * rodR * 2.2
    const cy = y + wobble(i, 2) * rodR * 0.12
    const cz = z + wobble(i, 3) * rodR * 0.12

    m.compose(pos.set(stagger, cy, cz), along, s)
    shafts.setMatrixAt(i, m)

    // Cut face sits on the near end of its shaft, normal along -X.
    m.compose(pos.set(stagger - len / 2 - 0.001, cy, cz), facing, s)
    caps.setMatrixAt(i, m)
  })
  shafts.instanceMatrix.needsUpdate = true
  caps.instanceMatrix.needsUpdate = true
  group.add(shafts, caps)

  // Strap. Two of them, because a single band reads as decoration while a pair
  // reads as packaging — and they give the eye a scale reference on the length.
  const strapMat = new THREE.MeshPhysicalMaterial({
    color: 0x121316,
    metalness: 0,
    roughness: 0.62,
    clearcoat: 0.3,
    envMapIntensity: 0.9,
  })
  for (const x of [-len * 0.24, len * 0.26]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.026, 10, 56), strapMat)
    strap.rotation.y = Math.PI / 2 // hole along X, around the bundle
    strap.scale.set(1, 0.78, 1)
    strap.position.x = x
    group.add(strap)
  }

  group.add(contactShadow(len * 0.4, -halfV - 0.01))
  // Shot part-way down its own axis: a bundle seen square-on is a set of lines,
  // but turned toward the ends the cut faces catch the key and it reads solid.
  group.userData.view = new THREE.Vector3(0.95, 0.34, 0.72)
  group.userData.yaw = -0.34
  return group
}

/* -------------------------------------------------------------- ELECTRODO */
export function buildElectrode() {
  const group = new THREE.Group()
  const eR = 0.085
  const len = 2.7
  const bare = 0.34
  const packed = packRows([4, 5, 4], eR, 2.25, 1.95)
  const { halfV } = packed[0]

  const fluxTex = ownedClone(fluxTexture(), { repeat: [2, 5] })

  // Pressed mineral covering: fully dielectric and very rough, which is what
  // separates it visually from the bare core sticking out of the end.
  const covering = new THREE.MeshPhysicalMaterial({
    color: FLUX,
    metalness: 0,
    roughness: 0.94,
    roughnessMap: fluxTex,
    bumpMap: fluxTex,
    bumpScale: 0.005,
    envMapIntensity: 1,
  })
  const core = metal({ color: STEEL, roughness: 0.42, repeat: [1, 2] })

  const covered = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(eR, eR, len - bare, 20),
    covering,
    packed.length,
  )
  const tips = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(eR * 0.44, eR * 0.44, bare, 16),
    core,
    packed.length,
  )

  const m = new THREE.Matrix4()
  const s = new THREE.Vector3(1, 1, 1)
  const pos = new THREE.Vector3()
  const euler = new THREE.Euler()
  const q = new THREE.Quaternion()

  packed.forEach(({ y, z }, i) => {
    // A small yaw per stick fans the ends apart, the way a handful dropped into
    // a box never lies parallel.
    const splay = wobble(i, 5) * 0.045
    q.setFromEuler(euler.set(0, splay, Math.PI / 2))

    const cy = y + wobble(i, 6) * eR * 0.1
    const cz = z + wobble(i, 7) * eR * 0.12
    const stagger = wobble(i, 8) * eR * 1.1

    m.compose(pos.set(stagger + bare / 2, cy, cz), q, s)
    covered.setMatrixAt(i, m)
    m.compose(pos.set(stagger - (len - bare) / 2, cy, cz), q, s)
    tips.setMatrixAt(i, m)
  })
  covered.instanceMatrix.needsUpdate = true
  tips.instanceMatrix.needsUpdate = true
  group.add(covered, tips)

  group.add(contactShadow(len * 0.4, -halfV - 0.01))
  group.userData.view = new THREE.Vector3(0.9, 0.36, 0.78)
  group.userData.yaw = -0.28
  return group
}

export const PRODUCT_BUILDERS = {
  spool: buildSpool,
  rod: buildRod,
  electrode: buildElectrode,
}

/** Frees every geometry, material and cloned texture a built product owns. */
export function disposeProduct(group) {
  group.traverse((node) => {
    node.geometry?.dispose?.()
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    for (const mat of mats) {
      if (!mat) continue
      // Cloned maps carry their own GPU upload even though the image is shared
      // with the cache, so they are released here. The cached originals are not
      // owned by any one product and have to survive for the next one.
      for (const key of ['map', 'roughnessMap', 'bumpMap']) {
        const tex = mat[key]
        if (tex?.isTexture && tex.userData?.owned) tex.dispose()
      }
      mat.dispose?.()
    }
  })
}

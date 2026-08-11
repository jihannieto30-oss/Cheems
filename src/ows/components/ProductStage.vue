<template>
  <div :ref="setHost" class="stage" :class="{ 'stage--ready': ready }">
    <canvas v-if="supported" ref="cv" class="stage__cv" aria-hidden="true" />

    <!-- Every stage carries a still. It is what shows on a device without
         WebGL, and what fills the frame while the scene compiles. -->
    <ParallaxImage
      v-if="!supported || !ready"
      class="stage__fallback"
      :src="fallbackSrc"
      :alt="alt"
      :depth="4"
      :scale="1.12"
      :scrim="0"
      :hairlines="false"
      :mono="false"
    />

    <span v-if="alt" class="ows-sr">{{ alt }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import ParallaxImage from './ParallaxImage.vue'
import { PRODUCT_BUILDERS, disposeProduct } from '../three/products'
import { createStudioEnvironment } from '../three/environment'
import { prefersReducedMotion } from '../composables/useReducedMotion'
import { useParallax } from '../composables/useParallax'

/*
  A single product, rendered for real.

  The scene is intentionally small — one product, one environment, no
  post-processing — because the realism is coming from the prefiltered studio
  environment and the roughness variation, not from effect passes. That keeps it
  inside a phone's budget while still reading as a photographed object.

  Three things guard the frame budget:
    · the render loop only runs while the canvas is on screen and the tab visible
    · pixel ratio is capped, and antialiasing is dropped on hi-dpi where it buys
      nothing visible but costs a lot of fill
    · reduced-motion renders exactly one frame and then stops
*/

const props = defineProps({
  /** spool · rod · electrode */
  product: { type: String, default: 'spool' },
  /** Still shown before the scene is ready and on unsupported devices. */
  fallbackSrc: { type: String, default: '/ows/spool.svg' },
  alt: { type: String, default: '' },
  /** 0–1 scroll progress through the host, drives the dolly. */
  scrollDriven: { type: Boolean, default: true },
  /** Continuous idle rotation, in radians per second. */
  spin: { type: Number, default: 0.16 },
  /** Framing headroom. 1.0 fits the product edge to edge; above that leaves
      margin around it. */
  distance: { type: Number, default: 1.12 },
  /** Pointer parallax strength, 0 disables it. */
  tilt: { type: Number, default: 1 },
})

const host = ref(null)
const cv = ref(null)
const ready = ref(false)
const supported = ref(true)

const parallaxEl = useParallax()
const setHost = (el) => {
  host.value = el
  parallaxEl.value = el
}

let renderer = null
let scene = null
let camera = null
let product = null
let envMap = null
let raf = 0
let visible = false
let running = false
let reduced = false
let last = 0
let elapsed = 0

// Both are replaced per product on mount: a disc and a long bundle cannot be
// flattered by one camera angle, so each builder publishes its own.
let startYaw = -0.62

// Pointer and scroll are held as targets and eased toward, so no input ever
// snaps the camera.
const target = { x: 0, y: 0, dolly: 0 }
const current = { x: 0, y: 0, dolly: 0 }

function detect() {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

function build() {
  const rect = host.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75)

  renderer = new THREE.WebGLRenderer({
    canvas: cv.value,
    antialias: dpr < 1.5,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(dpr)
  renderer.setSize(rect.width, rect.height, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.45
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene = new THREE.Scene()
  envMap = createStudioEnvironment(renderer)
  scene.environment = envMap

  camera = new THREE.PerspectiveCamera(34, rect.width / rect.height, 0.1, 60)

  // The environment does the lighting. These two only sharpen the edges the
  // softboxes leave soft — without them the silhouette goes mushy on black.
  const key = new THREE.DirectionalLight(0xfff4e8, 1.6)
  key.position.set(-3, 3.2, 4)
  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.1)
  rim.position.set(4, 1.6, -3.4)
  scene.add(key, rim)

  mount()
}

function mount() {
  if (product) {
    scene.remove(product)
    disposeProduct(product)
  }
  const builder = PRODUCT_BUILDERS[props.product] ?? PRODUCT_BUILDERS.spool
  product = builder()
  startYaw = product.userData.yaw ?? -0.62
  if (product.userData.view) VIEW_DIR.copy(product.userData.view).normalize()
  elapsed = 0
  scene.add(product)
  frameCamera()
}

/*
  Frames whatever was built rather than trusting a hand-tuned distance.

  A bounding *sphere* is the wrong shape to fit here. A rod bundle is long and
  thin, so its sphere is mostly empty air; fitting that sphere into the frame
  height leaves the product occupying a fifth of the picture. This fits the
  world-space box instead, width against the horizontal field and height
  against the vertical, and takes whichever is binding.

  The box is sampled at several yaw angles and the widest is kept, because the
  product turns continuously — measuring one pose would let it grow out of
  frame a few seconds later.
*/
const VIEW_DIR = new THREE.Vector3(0.5, 0.36, 1).normalize()
const bounds = { center: new THREE.Vector3(), size: new THREE.Vector3(1, 1, 1) }

function measure() {
  const box = new THREE.Box3()
  const widest = new THREE.Box3()

  for (let i = 0; i < 4; i++) {
    product.rotation.set(-0.12, startYaw + (i * Math.PI) / 4, 0)
    product.updateMatrixWorld(true)
    box.makeEmpty()
    product.traverse((node) => {
      if (node.isMesh && !node.userData.isShadow) box.expandByObject(node)
    })
    if (!box.isEmpty()) widest.union(box)
  }

  product.rotation.set(-0.12, startYaw, 0)
  product.updateMatrixWorld(true)

  if (widest.isEmpty()) {
    bounds.center.set(0, 0, 0)
    bounds.size.set(1, 1, 1)
    return
  }
  widest.getCenter(bounds.center)
  widest.getSize(bounds.size)
}

function fitDistance() {
  const vFov = (camera.fov * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
  const dV = bounds.size.y / 2 / Math.tan(vFov / 2)
  const dH = bounds.size.x / 2 / Math.tan(hFov / 2)
  // Half the depth is added so the near face, not the centre, clears the frame.
  return Math.max(dV, dH) * props.distance + bounds.size.z / 2
}

function frameCamera() {
  measure()
  camera.position.copy(VIEW_DIR).multiplyScalar(fitDistance()).add(bounds.center)
  camera.lookAt(bounds.center)
}

function resize() {
  if (!renderer || !host.value) return
  const rect = host.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  frameCamera()
  draw(0)
}

function draw(dt) {
  if (!renderer) return

  // Ease every driver toward its target; nothing is applied directly.
  const k = reduced ? 1 : 1 - Math.pow(0.0015, dt)
  current.x += (target.x - current.x) * k
  current.y += (target.y - current.y) * k
  current.dolly += (target.dolly - current.dolly) * k

  if (!reduced) elapsed += dt

  // Start at three-quarters rather than side-on: a rod bundle seen exactly
  // from the side is a set of lines, and reads as nothing.
  product.rotation.y = startYaw + elapsed * props.spin + current.x * 0.5
  product.rotation.x = -0.12 + current.y * 0.26

  // Scroll pulls the camera in and lifts it, the way a dolly move reads.
  const dist = fitDistance() * (1 - current.dolly * 0.24)
  camera.position
    .copy(VIEW_DIR)
    .setY(VIEW_DIR.y + current.dolly * 0.22)
    .normalize()
    .multiplyScalar(dist)
    .add(bounds.center)
  camera.lookAt(bounds.center)

  renderer.render(scene, camera)
}

function loop(now) {
  raf = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  draw(dt)
  if (running) raf = requestAnimationFrame(loop)
}

function start() {
  if (running || !visible || !renderer || reduced) return
  running = true
  last = performance.now()
  if (!raf) raf = requestAnimationFrame(loop)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function onPointer(event) {
  if (!props.tilt || reduced || !host.value) return
  const rect = host.value.getBoundingClientRect()
  target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2 * props.tilt
  target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2 * props.tilt
}

function onScroll() {
  if (!props.scrollDriven || !host.value) return
  const rect = host.value.getBoundingClientRect()
  const vh = window.innerHeight || 1
  // 0 when the frame's centre is a viewport below, 1 when a viewport above.
  const p = 1 - (rect.top + rect.height / 2) / vh
  target.dolly = Math.max(0, Math.min(1, p))
}

const onVisibility = () => (document.hidden ? stop() : start())

let io = null
let ro = null

/*
  Deferred until the stage is first seen.

  Building means creating a WebGL context and prefiltering an environment
  through PMREM, and a page can carry several of these. Doing that for all of
  them at mount costs a visible stall on load for scenes the reader may never
  scroll to; doing it on first intersection costs nothing, because the still is
  already in the frame and cross-fades out when the scene is ready.
*/
function ensureBuilt() {
  if (renderer || !supported.value) return
  try {
    build()
  } catch {
    // A context can still fail to create on a constrained device; the still is
    // already in the DOM, so failing here degrades rather than breaks.
    supported.value = false
    return
  }
  onScroll()
  draw(0)
  ready.value = true
  ro = new ResizeObserver(resize)
  ro.observe(host.value)
}

onMounted(() => {
  supported.value = detect()
  if (!supported.value) return

  reduced = prefersReducedMotion()

  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible) ensureBuilt()
      visible ? start() : stop()
    },
    // Built a little before it is reached, so the scene is already drawn by
    // the time the frame is actually on screen.
    { threshold: 0, rootMargin: '20% 0px' },
  )
  io.observe(host.value)

  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  host.value.addEventListener('pointermove', onPointer, { passive: true })
})

watch(() => props.product, () => {
  if (renderer) {
    mount()
    draw(0)
  }
})

onUnmounted(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  host.value?.removeEventListener('pointermove', onPointer)

  if (product) disposeProduct(product)
  envMap?.dispose()
  renderer?.dispose()
  renderer = null
  scene = null
})
</script>

<style scoped>
.stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  contain: paint;
}

.stage__cv {
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 900ms var(--ows-ease);
}

.stage--ready .stage__cv {
  opacity: 1;
}

/* The still cross-fades out once the scene has drawn its first frame. */
.stage__fallback {
  position: absolute;
  inset: 0;
  transition: opacity 700ms var(--ows-ease);
}

.stage--ready .stage__fallback {
  opacity: 0;
  pointer-events: none;
}
</style>

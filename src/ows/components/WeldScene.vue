<template>
  <section ref="host" class="weld" :style="{ '--stages': stages.length }">
    <div class="weld__sticky">
      <div class="weld__stage">
        <canvas v-if="supported" ref="cv" class="weld__cv" aria-hidden="true" />

        <!-- Without WebGL the section still runs: the 2D arc plays and the
             captions still advance with the scroll. -->
        <ArcScene v-else :depth="8" :density="4" :origin-y="0.62" :intensity="0.9" />

        <span class="weld__vignette" aria-hidden="true" />
      </div>

      <div class="weld__ui ows-shell">
        <p class="weld__eyebrow ows-meta">{{ eyebrow }}</p>

        <div class="weld__captions">
          <p
            v-for="(stage, i) in stages"
            :key="stage.title"
            class="weld__caption"
            :class="{ 'is-on': i === active }"
            :aria-hidden="i === active ? undefined : 'true'"
          >
            <span class="weld__caption-title">{{ stage.title }}</span>
            <span class="weld__caption-body">{{ stage.body }}</span>
          </p>
        </div>

        <div class="weld__rail" aria-hidden="true">
          <span class="weld__rail-track"><i :style="{ transform: `scaleX(${progress})` }" /></span>
          <span class="weld__rail-read ows-num">{{ Math.round(progress * 100) }}%</span>
        </div>
      </div>

      <!-- The scene is decorative; the argument it illustrates has to exist in
           text for anyone who never sees it. -->
      <div class="ows-sr">
        <h2>{{ eyebrow }}</h2>
        <p v-for="stage in stages" :key="stage.title">{{ stage.title }}. {{ stage.body }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import ArcScene from './ArcScene.vue'
import { createWeldScene } from '../three/weld'
import { createStudioEnvironment } from '../three/environment'
import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  The section the reader scrolls *through* rather than past.

  The page is 320vh tall with a sticky 100vh stage inside it, so the 220vh of
  overflow becomes the scrub: entering the section strikes the arc, scrolling
  runs it down the joint, and leaving the section leaves a finished bead.

  Progress is read from the host's own rect each frame rather than from an
  event, because scroll events and rAF do not agree on a phone and the camera
  is the one thing here that must never stutter.
*/

const props = defineProps({
  eyebrow: { type: String, default: 'EL ARCO' },
  /** [{ title, body }] — cross-faded across the scrub, in order. */
  stages: { type: Array, required: true },
})

const host = ref(null)
const cv = ref(null)
const supported = ref(true)
const active = ref(0)
const progress = ref(0)

let renderer = null
let scene = null
let camera = null
let weld = null
let envMap = null
let raf = 0
let visible = false
let reduced = false
let last = 0

// Camera offsets from the arc, wide at the start and inside the puddle at the
// end. Everything cinematic about this section is these six numbers.
const WIDE = new THREE.Vector3(6.4, 5.2, -8.2)
const CLOSE = new THREE.Vector3(1.35, 0.95, -2.15)
const offset = new THREE.Vector3()
const target = new THREE.Vector3()

function detect() {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

function build() {
  const rect = cv.value.getBoundingClientRect()
  // Capped harder than the product stages: this scene fills the viewport, so
  // its fill cost is the whole screen rather than a thumbnail.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

  renderer = new THREE.WebGLRenderer({
    canvas: cv.value,
    antialias: dpr < 1.4,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(dpr)
  renderer.setSize(rect.width, rect.height, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene = new THREE.Scene()
  envMap = createStudioEnvironment(renderer)
  scene.environment = envMap

  camera = new THREE.PerspectiveCamera(38, rect.width / rect.height, 0.1, 120)

  // Kept deliberately dim. The arc is meant to be the brightest thing in the
  // frame by a wide margin, the way it is in a shop.
  const fill = new THREE.DirectionalLight(0x9fb4d8, 0.5)
  fill.position.set(-4, 6, -3)
  scene.add(fill)

  weld = createWeldScene(renderer)
  scene.add(weld.group)
}

function measure() {
  if (!host.value) return 0
  const rect = host.value.getBoundingClientRect()
  const vh = window.innerHeight || 1
  const travel = rect.height - vh
  if (travel <= 1) return 0
  return Math.max(0, Math.min(1, -rect.top / travel))
}

function draw(dt) {
  // Reduced motion has no scrub to read, so the scene rests on the finished
  // bead with the arc already extinguished — a photograph of the result.
  const p = reduced ? 1 : measure()
  progress.value = p
  active.value = Math.min(props.stages.length - 1, Math.floor(p * props.stages.length))

  if (renderer) {
    weld.update(p, reduced ? 0 : dt)

    target.set(0, weld.thickness, -weld.length / 2 + weld.length * p)
    offset.lerpVectors(WIDE, CLOSE, ease(p))
    // A slow orbit across the move, so the camera is travelling rather than
    // being towed along behind the arc on a rigid boom.
    const yaw = -0.34 + p * 0.62
    const x = offset.x * Math.cos(yaw) - offset.z * Math.sin(yaw)
    const z = offset.x * Math.sin(yaw) + offset.z * Math.cos(yaw)

    camera.position.set(target.x + x, target.y + offset.y, target.z + z)
    camera.lookAt(target)
    renderer.render(scene, camera)
  }
}

function frame(now) {
  raf = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  draw(dt)
  if (visible && !reduced) raf = requestAnimationFrame(frame)
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function start() {
  if (raf || !visible) return
  last = performance.now()
  // Reduced motion draws exactly once and then leaves the loop alone.
  if (reduced) draw(0)
  else raf = requestAnimationFrame(frame)
}

function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function resize() {
  if (!renderer || !cv.value) return
  const rect = cv.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  // The running loop repaints on its own; a resting scene has to be told.
  if (reduced) draw(0)
}

const onVisibility = () => (document.hidden ? stop() : start())

let io = null
let ro = null

/*
  Built on first sight, not on mount. The context, the prefiltered environment
  and the bead's several thousand vertices are all paid for the first time the
  section comes into view — which on the home page is four screens down.
*/
function ensureBuilt() {
  if (renderer || !supported.value) return
  try {
    build()
  } catch {
    supported.value = false
    renderer = null
    return
  }
  ro = new ResizeObserver(resize)
  ro.observe(cv.value)
}

onMounted(() => {
  reduced = prefersReducedMotion()
  supported.value = detect()

  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible) ensureBuilt()
      visible ? start() : stop()
    },
    { threshold: 0, rootMargin: '15% 0px' },
  )
  io.observe(host.value)

  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  weld?.dispose()
  envMap?.dispose()
  renderer?.dispose()
  renderer = null
  scene = null
})
</script>

<style scoped>
.weld {
  /* 100vh of stage plus the scrub. Shortened on small screens, where 220vh of
     scrolling for one section is a long way to ask someone to thumb. */
  height: 320vh;
  position: relative;
  background: var(--ows-void);
  border-top: 1px solid var(--ows-line-soft);
}

.weld__sticky {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
  isolation: isolate;
}

.weld__stage {
  position: absolute;
  inset: 0;
}

.weld__cv {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* Holds the corners down so the captions always have something to sit on. */
.weld__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% 45%, transparent 40%, rgb(0 0 0 / 0.72) 100%),
    linear-gradient(to top, rgb(0 0 0 / 0.7), transparent 45%);
}

.weld__ui {
  position: absolute;
  inset: auto 0 0 0;
  padding-bottom: clamp(2rem, 8vh, 4.5rem);
  z-index: var(--ows-z-content);
}

.weld__eyebrow {
  color: var(--ows-ink-muted);
}

/*
  The captions are stacked on top of each other and cross-faded, so the block
  never changes height as the text changes and nothing below it moves.
*/
/* Tall enough for the longest caption at the narrowest measure — the block is
   a fixed slot, so the rail beneath it never moves and never gets written
   through by an overflowing paragraph. */
.weld__captions {
  position: relative;
  margin-top: 1.25rem;
  min-height: clamp(12.5rem, 24vh, 15rem);
}

.weld__caption {
  position: absolute;
  inset: 0;
  max-width: 34ch;
  opacity: 0;
  transform: translate3d(0, 1.25rem, 0);
  transition:
    opacity var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease);
  pointer-events: none;
}

.weld__caption.is-on {
  opacity: 1;
  transform: none;
}

.weld__caption-title {
  display: block;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  line-height: 1.1;
  letter-spacing: var(--ows-track-display);
  text-transform: uppercase;
  color: var(--ows-ink);
  text-wrap: balance;
}

.weld__caption-body {
  display: block;
  margin-top: 1rem;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.weld__rail {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.weld__rail-track {
  flex: 1;
  height: 1px;
  background: var(--ows-line);
  overflow: hidden;
}

.weld__rail-track i {
  display: block;
  height: 100%;
  background: var(--ows-red);
  transform-origin: left center;
}

.weld__rail-read {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  min-width: 3.5ch;
  text-align: right;
}

@media (max-width: 46rem) {
  .weld {
    height: 260vh;
  }

  .weld__captions {
    min-height: 13rem;
  }
}

/*
  Reduced motion keeps the section — it is content, not decoration — but the
  scrub becomes a single settled frame of the finished weld, and the captions
  stop being an overlay and become an ordinary stack of prose beneath it.
*/
@media (prefers-reduced-motion: reduce) {
  .weld {
    height: auto;
  }

  .weld__sticky {
    position: static;
    height: auto;
  }

  .weld__stage {
    position: relative;
    inset: auto;
    height: min(70svh, 34rem);
  }

  .weld__ui {
    position: static;
    padding-block: clamp(2rem, 5vh, 3rem) clamp(2.5rem, 8vh, 4.5rem);
  }

  .weld__captions {
    min-height: 0;
  }

  .weld__caption {
    position: relative;
    inset: auto;
    opacity: 1;
    transform: none;
    transition: none;
  }

  .weld__caption + .weld__caption {
    margin-top: 1.75rem;
  }

  .weld__rail {
    display: none;
  }
}
</style>

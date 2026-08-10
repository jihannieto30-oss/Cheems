<template>
  <div :ref="setHost" class="scene" :style="{ '--depth': depth }">
    <canvas ref="cv" class="scene__cv" aria-hidden="true" />
    <span class="scene__vignette" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'
import { useParallax } from '../composables/useParallax'

/*
  The welding arc, drawn rather than filmed.

  A 2D particle field: an incandescent core, sparks thrown from it that cool
  from white through amber to the brand red as they die, drifting smoke, and a
  lit workpiece edge. Motion-blurred by fading the previous frame instead of
  clearing it, which is what gives the sparks their trails.

  Cheaper than a photograph, animated, and it reacts to scroll — but it is
  still a stand-in for real photography. Drop an <img> behind it and lower
  `density` when the shoot exists.

  Honours prefers-reduced-motion by painting exactly one still frame, and
  suspends entirely when scrolled out of view or the tab is hidden.
*/

const props = defineProps({
  /** Emitter position as a fraction of the canvas. */
  originX: { type: Number, default: 0.5 },
  originY: { type: Number, default: 0.74 },
  /** Sparks emitted per frame at 60fps. */
  density: { type: Number, default: 5 },
  /** Parallax travel in vh across a viewport of scroll. */
  depth: { type: Number, default: 10 },
  /** Overall brightness, 0-1. */
  intensity: { type: Number, default: 1 },
})

const host = ref(null)
const cv = ref(null)

// The scene drifts against the scroll. useParallax needs the same element the
// observers use, so one function ref feeds both.
const parallaxEl = useParallax()
const setHost = (el) => {
  host.value = el
  parallaxEl.value = el
}

let ctx = null
let raf = 0
let w = 0
let h = 0
let dpr = 1
let sparks = []
let smoke = []
let t = 0
let visible = true
let running = false

// Cooling curve: white-hot → amber → the brand red, by remaining life.
function sparkColor(k) {
  if (k > 0.72) return [255, 255, 250]
  if (k > 0.45) return [255, 226, 160]
  if (k > 0.22) return [255, 138, 42]
  return [225, 24, 6]
}

function resize() {
  if (!cv.value || !host.value) return
  const rect = host.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = rect.width
  h = rect.height
  cv.value.width = Math.round(w * dpr)
  cv.value.height = Math.round(h * dpr)
  ctx = cv.value.getContext('2d', { alpha: false })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
}

function emit(n) {
  const ox = w * props.originX
  const oy = h * props.originY
  for (let i = 0; i < n; i++) {
    // Biased flat and outward, the way an arc actually throws material.
    const a = Math.random() * Math.PI * 2
    const flat = 0.34 + Math.random() * 0.5
    const speed = 1.4 + Math.pow(Math.random(), 2) * 8.5
    sparks.push({
      x: ox + (Math.random() - 0.5) * 8,
      y: oy + (Math.random() - 0.5) * 5,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed * flat - 0.6,
      px: ox,
      py: oy,
      life: 1,
      decay: 0.006 + Math.random() * 0.019,
      size: 0.5 + Math.random() * 1.6,
    })
  }
  if (sparks.length > 900) sparks.splice(0, sparks.length - 900)

  if (Math.random() > 0.72) {
    smoke.push({
      x: ox + (Math.random() - 0.5) * 90,
      y: oy - 10,
      r: 18 + Math.random() * 46,
      vy: -0.25 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      life: 1,
      decay: 0.0035 + Math.random() * 0.005,
    })
  }
  if (smoke.length > 40) smoke.shift()
}

function drawCore(ox, oy, flare) {
  const I = props.intensity
  // Wide atmospheric bloom, then the hard core on top.
  const bloom = ctx.createRadialGradient(ox, oy, 0, ox, oy, 240 * flare)
  bloom.addColorStop(0, `rgba(255,240,220,${0.3 * I})`)
  bloom.addColorStop(0.28, `rgba(255,150,60,${0.09 * I})`)
  bloom.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(ox - 260, oy - 260, 520, 520)

  const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, 42 * flare)
  core.addColorStop(0, `rgba(255,255,255,${0.98 * I})`)
  core.addColorStop(0.35, `rgba(255,246,225,${0.6 * I})`)
  core.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(ox, oy, 42 * flare, 0, Math.PI * 2)
  ctx.fill()

  // The lit edge of the workpiece the arc is sitting on.
  const edge = ctx.createLinearGradient(ox - 340, 0, ox + 340, 0)
  edge.addColorStop(0, 'rgba(255,120,40,0)')
  edge.addColorStop(0.5, `rgba(255,190,120,${0.34 * I * flare})`)
  edge.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = edge
  ctx.fillRect(ox - 340, oy + 1, 680, 1.6)
}

function frame() {
  raf = 0
  if (!ctx) return
  t += 1

  // Fade rather than clear: this is what leaves the spark trails.
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(0,0,0,0.26)'
  ctx.fillRect(0, 0, w, h)

  ctx.globalCompositeOperation = 'lighter'

  const ox = w * props.originX
  const oy = h * props.originY
  // Irregular flicker — a steady pulse reads as a lamp, not an arc.
  const flare =
    0.86 + Math.sin(t * 0.29) * 0.06 + Math.sin(t * 1.7) * 0.035 + Math.random() * 0.05

  for (const s of smoke) {
    s.x += s.vx
    s.y += s.vy
    s.r += 0.45
    s.life -= s.decay
    if (s.life <= 0) continue
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
    g.addColorStop(0, `rgba(120,110,105,${0.05 * s.life * props.intensity})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  smoke = smoke.filter((s) => s.life > 0)

  drawCore(ox, oy, flare)

  for (const s of sparks) {
    s.px = s.x
    s.py = s.y
    s.vy += 0.055 // gravity
    s.vx *= 0.985 // drag
    s.vy *= 0.985
    s.x += s.vx
    s.y += s.vy
    s.life -= s.decay

    if (s.life <= 0) continue
    const [r, g, b] = sparkColor(s.life)
    const alpha = Math.min(1, s.life * 1.5) * props.intensity
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.lineWidth = s.size * s.life
    ctx.beginPath()
    ctx.moveTo(s.px, s.py)
    ctx.lineTo(s.x, s.y)
    ctx.stroke()
  }
  sparks = sparks.filter((s) => s.life > 0 && s.y < h + 60)

  emit(props.density)

  ctx.globalCompositeOperation = 'source-over'
  if (running) raf = requestAnimationFrame(frame)
}

/** One still frame for reduced-motion: lit, populated, but never moving. */
function still() {
  if (!ctx) return
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'
  emit(260)
  for (const s of sparks) {
    // Advance each particle to a different point in its own arc so the field
    // reads as a frozen moment rather than an explosion at the origin.
    const steps = Math.random() * 70
    for (let i = 0; i < steps; i++) {
      s.px = s.x
      s.py = s.y
      s.vy += 0.055
      s.vx *= 0.985
      s.vy *= 0.985
      s.x += s.vx
      s.y += s.vy
      s.life -= s.decay
    }
    if (s.life <= 0) continue
    const [r, g, b] = sparkColor(s.life)
    ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, s.life * 1.5) * props.intensity})`
    ctx.lineWidth = s.size * s.life
    ctx.beginPath()
    ctx.moveTo(s.px, s.py)
    ctx.lineTo(s.x, s.y)
    ctx.stroke()
  }
  drawCore(w * props.originX, h * props.originY, 1)
  ctx.globalCompositeOperation = 'source-over'
  sparks = []
}

function start() {
  if (running || !visible) return
  running = true
  if (!raf) raf = requestAnimationFrame(frame)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

const onVisibility = () => (document.hidden ? stop() : start())

let io = null
let ro = null

onMounted(() => {
  resize()

  if (prefersReducedMotion()) {
    still()
    return
  }

  // Only burn frames while the scene is actually on screen.
  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      visible ? start() : stop()
    },
    { threshold: 0 },
  )
  io.observe(host.value)

  ro = new ResizeObserver(() => resize())
  ro.observe(host.value)

  document.addEventListener('visibilitychange', onVisibility)
  start()
})

onUnmounted(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--ows-void);
  pointer-events: none;
  contain: paint;
}

.scene__cv {
  width: 100%;
  height: 100%;
  transform: translate3d(0, calc(var(--p, 0) * var(--depth) * var(--ows-parallax) * 1vh), 0)
    scale(1.12);
  will-change: transform;
}

/* Keeps the frame edges black so the scene dissolves into the page. The bottom
   stop is deliberately gentle — pushed harder it smothers the core itself. */
.scene__vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 74%, transparent 0%, transparent 40%, rgb(0 0 0 / 0.78) 88%),
    linear-gradient(
      to bottom,
      rgb(0 0 0 / 0.7) 0%,
      transparent 28%,
      transparent 78%,
      rgb(0 0 0 / 0.55) 100%
    );
}

@media (prefers-reduced-motion: reduce) {
  .scene__cv {
    transform: scale(1.12);
    will-change: auto;
  }
}
</style>

<template>
  <canvas ref="cv" class="seam" aria-hidden="true" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  A weld running along a seam, on a loop.

  Deliberately 2D. The hero is the first paint of the site and has to be on
  screen instantly; a WebGL scene here would mean a context, a prefiltered
  environment and several thousand vertices before anything appears. Everything
  this needs — an arc travelling, metal cooling behind it, spatter — is a
  gradient and a few hundred particles.

  The temperature ramp is the whole illusion. Metal directly behind the arc is
  white, then yellow, then the deep orange that lingers, then nothing. Get the
  lengths of those bands wrong and it reads as a glowing line rather than as
  something that was just molten.
*/

const props = defineProps({
  /** Where the seam sits, as a fraction of height. */
  seamY: { type: Number, default: 0.74 },
  /** Seconds for one full pass. */
  period: { type: Number, default: 11 },
  /** 0–1 overall strength, for placing this behind content. */
  intensity: { type: Number, default: 1 },
})

const cv = ref(null)

let ctx = null
let raf = 0
let w = 0
let h = 0
let dpr = 1
let start = 0
let visible = false
let reduced = false

// Spatter. Pooled and reused; a weld throws a lot of these and allocating per
// spark is the one thing that would make this animation cost anything.
const SPARKS = 260
const sparks = new Float32Array(SPARKS * 5) // x, y, vx, vy, life
let cursor = 0

const rand = (a, b) => a + Math.random() * (b - a)

function resize() {
  if (!cv.value) return
  const rect = cv.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = rect.width
  h = rect.height
  cv.value.width = Math.round(w * dpr)
  cv.value.height = Math.round(h * dpr)
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function spawn(x, y, count) {
  for (let n = 0; n < count; n++) {
    const i = cursor
    cursor = (cursor + 1) % SPARKS
    const a = i * 5
    sparks[a] = x + rand(-2, 2)
    sparks[a + 1] = y + rand(-2, 2)
    // Thrown forward and back along the seam rather than straight up: spatter
    // leaves a puddle sideways, and a vertical fountain reads as a firework.
    sparks[a + 2] = rand(-190, 150)
    sparks[a + 3] = rand(-150, -20)
    sparks[a + 4] = rand(0.25, 0.8)
  }
}

function drawSparks(dt, y) {
  for (let i = 0; i < SPARKS; i++) {
    const a = i * 5
    if (sparks[a + 4] <= 0) continue
    sparks[a + 4] -= dt
    if (sparks[a + 4] <= 0) continue

    sparks[a + 3] += 420 * dt // gravity
    sparks[a] += sparks[a + 2] * dt
    sparks[a + 1] += sparks[a + 3] * dt

    if (sparks[a + 1] > y) {
      sparks[a + 1] = y
      sparks[a + 3] *= -0.3
      sparks[a + 2] *= 0.72
    }

    const life = sparks[a + 4]
    ctx.globalAlpha = Math.min(1, life * 2.4) * props.intensity
    ctx.fillStyle = life > 0.55 ? '#fff4e2' : life > 0.3 ? '#ffb257' : '#e2560d'
    const s = life > 0.5 ? 1.7 : 1.2
    ctx.fillRect(sparks[a], sparks[a + 1], s, s)
  }
  ctx.globalAlpha = 1
}

/** One pass of the arc, with `p` running 0 → 1 across the frame. */
function draw(now, dt) {
  const y = h * props.seamY
  const p = reduced ? 0.82 : ((now - start) / 1000 / props.period) % 1

  // Travel a little beyond both edges so the arc enters and leaves rather than
  // appearing in frame.
  const head = -w * 0.12 + w * 1.24 * p
  // Fade the whole pass out at the very end so the loop does not cut.
  const passAlpha = Math.min(1, (1 - p) / 0.07) * props.intensity

  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'

  // ---- the joint: a hairline the weld is running along --------------------
  ctx.globalAlpha = 0.5 * passAlpha
  const seam = ctx.createLinearGradient(0, 0, w, 0)
  seam.addColorStop(0, 'rgba(255,255,255,0)')
  seam.addColorStop(0.5, 'rgba(255,255,255,0.16)')
  seam.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = seam
  ctx.fillRect(0, y, w, 1)

  // ---- the bead, cooling behind the arc -----------------------------------
  const trail = Math.max(160, w * 0.34)
  const from = Math.max(0, head - trail)
  if (head > 0) {
    const grad = ctx.createLinearGradient(from, 0, head, 0)
    grad.addColorStop(0, 'rgba(30,10,4,0)')
    grad.addColorStop(0.42, 'rgba(150,42,6,0.5)')
    grad.addColorStop(0.74, 'rgba(236,110,18,0.78)')
    grad.addColorStop(0.93, 'rgba(255,206,130,0.95)')
    grad.addColorStop(1, 'rgba(255,247,235,1)')
    ctx.globalAlpha = passAlpha
    ctx.fillStyle = grad
    ctx.fillRect(from, y - 1.5, Math.min(head, w) - from, 3)

    // Ripples: the frozen crescents a weave leaves. Spaced by distance, not by
    // time, so they stay put on the metal instead of sliding with the arc.
    ctx.strokeStyle = grad
    ctx.lineWidth = 1
    const PITCH = 7
    for (let x = Math.ceil(from / PITCH) * PITCH; x < Math.min(head, w); x += PITCH) {
      const heat = (x - from) / trail
      ctx.globalAlpha = heat * 0.5 * passAlpha
      ctx.beginPath()
      ctx.arc(x, y + 2.2, 3.4, Math.PI * 1.14, Math.PI * 1.86)
      ctx.stroke()
    }
  }

  // ---- the arc ------------------------------------------------------------
  if (head > -w * 0.02 && head < w * 1.02) {
    const flicker = 0.82 + Math.sin(now * 0.045) * 0.1 + Math.random() * 0.08
    const r = Math.max(58, h * 0.16) * flicker

    const glow = ctx.createRadialGradient(head, y, 0, head, y, r)
    glow.addColorStop(0, 'rgba(255,255,255,0.95)')
    glow.addColorStop(0.06, 'rgba(226,240,255,0.72)')
    glow.addColorStop(0.22, 'rgba(120,170,255,0.2)')
    glow.addColorStop(0.55, 'rgba(60,110,220,0.06)')
    glow.addColorStop(1, 'rgba(20,60,180,0)')
    ctx.globalAlpha = passAlpha
    ctx.fillStyle = glow
    ctx.fillRect(head - r, y - r, r * 2, r * 2)

    // The wash the arc throws onto the plate on either side.
    const wash = ctx.createLinearGradient(head - r * 2.6, 0, head + r * 2.6, 0)
    wash.addColorStop(0, 'rgba(120,150,220,0)')
    wash.addColorStop(0.5, 'rgba(180,205,255,0.14)')
    wash.addColorStop(1, 'rgba(120,150,220,0)')
    ctx.globalAlpha = 0.9 * passAlpha
    ctx.fillStyle = wash
    ctx.fillRect(head - r * 2.6, y - 2, r * 5.2, 4)

    if (!reduced) spawn(head, y, Math.round(dt * 150))
  }

  drawSparks(reduced ? 0 : dt, y)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

let last = 0

function frame(now) {
  raf = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  draw(now, dt)
  if (visible && !reduced) raf = requestAnimationFrame(frame)
}

function run() {
  if (raf || !visible || !ctx) return
  last = performance.now()
  if (reduced) draw(last, 0)
  else raf = requestAnimationFrame(frame)
}

function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

const onVisibility = () => (document.hidden ? stop() : run())

let io = null
let ro = null

onMounted(() => {
  reduced = prefersReducedMotion()
  resize()
  start = performance.now()

  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      visible ? run() : stop()
    },
    { threshold: 0 },
  )
  io.observe(cv.value)

  ro = new ResizeObserver(() => {
    resize()
    if (reduced) draw(performance.now(), 0)
  })
  ro.observe(cv.value)

  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.seam {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: var(--ows-z-scene);
}
</style>

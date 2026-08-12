<template>
  <canvas ref="cv" class="hs" aria-hidden="true" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  The arc, burning behind the mark.

  This exists to solve a real constraint rather than for decoration. The logo
  is black — blocks, wordmark, keyline — and a black mark on a black page is
  nothing. Reversing it to white is the usual answer and is the one thing that
  was ruled out. So the page gives it something bright to sit in front of: the
  weld itself, blooming from behind, with the mark reading as a silhouette
  against it. That is also why the bloom never fully dies between passes — it
  is not an effect, it is the light the mark is lit by.

  Everything is drawn in additive mode over black, which is how light behaves
  and why no layer needs to know about any other.
*/

const props = defineProps({
  /** Where the seam runs, as a fraction of height. */
  seamY: { type: Number, default: 0.62 },
  /** Where the key bloom sits — on the mark, not on the seam. */
  bloomY: { type: Number, default: 0.45 },
  /** Bloom size relative to the mark it has to backlight, in px. */
  bloomW: { type: Number, default: 560 },
  /** Seconds for one pass of the arc. */
  period: { type: Number, default: 13 },
  /** Floor under the bloom, so the mark is always backlit. 0–1. */
  keyLight: { type: Number, default: 0.42 },
  /** Pointer/scroll parallax strength in pixels. */
  parallax: { type: Number, default: 26 },
  /*
    Whether the arc runs. Off, the scene is only the key light and the floor —
    which is what the hero wants, because a travelling arc there is a fifth
    element competing with four, and the weld belongs to the search transition.
  */
  arc: { type: Boolean, default: true },
})

const cv = ref(null)

let ctx = null
let raf = 0
let w = 0
let h = 0
let start = 0
let last = 0
let visible = false
let reduced = false
let scrollY = 0

// Pointer is held as a target and eased toward, so the scene drifts rather
// than tracking the cursor — tracking reads as a gimmick, drift reads as depth.
const aim = { x: 0, y: 0 }
const eye = { x: 0, y: 0 }

const SPARKS = 300
const sparks = new Float32Array(SPARKS * 5)
let cursor = 0
const rand = (a, b) => a + Math.random() * (b - a)

function resize() {
  if (!cv.value) return
  const rect = cv.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = rect.width
  h = rect.height
  cv.value.width = Math.round(w * dpr)
  cv.value.height = Math.round(h * dpr)
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function spawn(x, y, n) {
  for (let i = 0; i < n; i++) {
    const k = cursor
    cursor = (cursor + 1) % SPARKS
    const a = k * 5
    sparks[a] = x + rand(-3, 3)
    sparks[a + 1] = y + rand(-3, 3)
    sparks[a + 2] = rand(-260, 210)
    sparks[a + 3] = rand(-210, -30)
    sparks[a + 4] = rand(0.3, 1.05)
  }
}

function drawSparks(dt, y, ox, oy) {
  for (let i = 0; i < SPARKS; i++) {
    const a = i * 5
    if (sparks[a + 4] <= 0) continue
    sparks[a + 4] -= dt
    if (sparks[a + 4] <= 0) continue

    sparks[a + 3] += 430 * dt
    sparks[a] += sparks[a + 2] * dt
    sparks[a + 1] += sparks[a + 3] * dt
    if (sparks[a + 1] > y) {
      sparks[a + 1] = y
      sparks[a + 3] *= -0.32
      sparks[a + 2] *= 0.7
    }

    const life = sparks[a + 4]
    ctx.globalAlpha = Math.min(1, life * 2)
    ctx.fillStyle = life > 0.62 ? '#fff6e8' : life > 0.32 ? '#ffb45c' : '#d94f08'
    const s = life > 0.55 ? 1.8 : 1.2
    // Spatter sits nearest the camera, so it takes the full parallax.
    ctx.fillRect(sparks[a] + ox, sparks[a + 1] + oy, s, s)
  }
  ctx.globalAlpha = 1
}

function draw(now, dt) {
  const p = reduced ? 0.5 : ((now - start) / 1000 / props.period) % 1
  const y = h * props.seamY
  const head = -w * 0.15 + w * 1.3 * p

  // Parallax. Each layer takes a different share, which is the whole of what
  // makes a flat canvas read as having depth.
  const px = eye.x * props.parallax
  const py = eye.y * props.parallax + scrollY * 0.12

  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'

  // ---- key light: the furnace the mark is lit by ---------------------------
  /*
    An ellipse sized to the mark rather than a circle sized to the viewport.
    A viewport-sized glow spreads its energy over the whole frame and leaves
    the middle at mid-grey, which is not enough for black type to read against
    — the light has to be concentrated where the silhouette is.
  */
  const near = 1 - Math.min(1, Math.abs(head - w / 2) / (w * 0.45))
  const breath = 0.95 + Math.sin(now * 0.0011) * 0.05
  const key = Math.min(1.15, (props.keyLight + near * 0.42) * breath)

  const bx = w / 2 + px * 0.22
  const by = h * props.bloomY + py * 0.22
  const bw = Math.min(props.bloomW, w * 0.82)

  ctx.save()
  ctx.translate(bx, by)
  ctx.scale(1, 0.62)
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, bw)
  /*
    Neutral, and matte. The earlier ramp ran through amber and violet, which
    is what a real arc throws — but it also painted the whole screen a colour,
    and the direction here is black only. Grey carries the same information
    about where the light is without tinting anything it falls on.
  */
  bloom.addColorStop(0, `rgba(238,240,244,${0.56 * key})`)
  bloom.addColorStop(0.14, `rgba(196,200,206,${0.34 * key})`)
  bloom.addColorStop(0.34, `rgba(130,134,140,${0.14 * key})`)
  bloom.addColorStop(0.64, `rgba(66,68,72,${0.045 * key})`)
  bloom.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(-bw, -bw, bw * 2, bw * 2)
  ctx.restore()

  const sy = y + py * 0.5

  // ---- the seam, the bead and the arc -------------------------------------
  if (props.arc) {
    const trail = Math.max(200, w * 0.4)
    const from = Math.max(-w * 0.2, head - trail)

    ctx.globalAlpha = 0.42
    const seam = ctx.createLinearGradient(0, 0, w, 0)
    seam.addColorStop(0, 'rgba(255,255,255,0)')
    seam.addColorStop(0.5, 'rgba(255,255,255,0.13)')
    seam.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = seam
    ctx.fillRect(0, sy, w, 1)
    ctx.globalAlpha = 1

    if (head > 0) {
      const bead = ctx.createLinearGradient(from, 0, head, 0)
      bead.addColorStop(0, 'rgba(24,8,3,0)')
      bead.addColorStop(0.4, 'rgba(150,44,8,0.42)')
      bead.addColorStop(0.72, 'rgba(238,116,22,0.72)')
      bead.addColorStop(0.93, 'rgba(255,208,138,0.92)')
      bead.addColorStop(1, 'rgba(255,248,238,1)')
      ctx.fillStyle = bead
      ctx.fillRect(from, sy - 1.5, Math.min(head, w) - from, 3)

      ctx.strokeStyle = bead
      ctx.lineWidth = 1
      for (let x = Math.ceil(from / 8) * 8; x < Math.min(head, w); x += 8) {
        ctx.globalAlpha = ((x - from) / trail) * 0.42
        ctx.beginPath()
        ctx.arc(x, sy + 2.4, 3.6, Math.PI * 1.14, Math.PI * 1.86)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // ---- the arc itself ------------------------------------------------------
    if (head > -w * 0.04 && head < w * 1.04) {
      const flick = 0.84 + Math.sin(now * 0.05) * 0.1 + Math.random() * 0.08
      const r = Math.max(72, h * 0.2) * flick
      const hx = head + px * 0.7

      const core = ctx.createRadialGradient(hx, sy, 0, hx, sy, r)
      core.addColorStop(0, 'rgba(255,255,255,0.98)')
      core.addColorStop(0.05, 'rgba(232,244,255,0.78)')
      core.addColorStop(0.2, 'rgba(130,178,255,0.22)')
      core.addColorStop(0.52, 'rgba(64,116,225,0.07)')
      core.addColorStop(1, 'rgba(20,60,180,0)')
      ctx.fillStyle = core
      ctx.fillRect(hx - r, sy - r, r * 2, r * 2)

      // The wash the arc throws sideways along the plate.
      const wash = ctx.createLinearGradient(hx - r * 3, 0, hx + r * 3, 0)
      wash.addColorStop(0, 'rgba(120,150,220,0)')
      wash.addColorStop(0.5, 'rgba(190,212,255,0.12)')
      wash.addColorStop(1, 'rgba(120,150,220,0)')
      ctx.fillStyle = wash
      ctx.fillRect(hx - r * 3, sy - 2, r * 6, 4)

      if (!reduced) spawn(head, sy, Math.round(dt * 170))
    }

  }

  if (props.arc) drawSparks(reduced ? 0 : dt, sy, px, py * 0.8)
  ctx.globalCompositeOperation = 'source-over'
}

function frame(now) {
  raf = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  // Ease toward the pointer; the constant is per-second so it is frame-rate
  // independent rather than faster on a 120 Hz screen.
  const k = 1 - Math.pow(0.0025, dt)
  eye.x += (aim.x - eye.x) * k
  eye.y += (aim.y - eye.y) * k
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

function onPointer(e) {
  aim.x = (e.clientX / window.innerWidth - 0.5) * 2
  aim.y = (e.clientY / window.innerHeight - 0.5) * 2
}

const onScroll = () => (scrollY = window.scrollY)
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

  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  window.removeEventListener('pointermove', onPointer)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
})

// The mark needs to know how hard the light behind it is pushing, so it can
// hold its own edge when the arc is at the far end of the seam.
defineExpose({})
</script>

<style scoped>
.hs {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: var(--ows-z-scene);
}
</style>

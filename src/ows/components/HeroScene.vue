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
    // Two of the components are screen velocity; the third is approach. A
    // spark coming at the lens is the one thing a flat particle field cannot
    // fake, and it is what puts the viewer over the work.
    sparks[a + 2] = rand(-150, 150)
    sparks[a + 3] = rand(-130, 30)
    sparks[a + 4] = rand(0.5, 1.5)
  }
}

function drawSparks(dt, ox, oy) {
  for (let i = 0; i < SPARKS; i++) {
    const a = i * 5
    if (sparks[a + 4] <= 0) continue
    sparks[a + 4] -= dt
    if (sparks[a + 4] <= 0) continue

    const life = sparks[a + 4]
    // Age doubles as depth: 1.5 is far, 0 is at the lens.
    const near = 1 - Math.min(1, life / 1.5)
    const grow = 1 + near * near * 7

    sparks[a + 3] += 150 * dt
    sparks[a] += sparks[a + 2] * dt * grow * 0.4
    sparks[a + 1] += sparks[a + 3] * dt * grow * 0.4

    // Nearest sparks take the most parallax, which is what separates the
    // planes when the pointer moves.
    ctx.globalAlpha = Math.min(0.9, life * 0.8) * (1 - near * 0.35)
    ctx.fillStyle = near > 0.6 ? '#eef4ff' : near > 0.3 ? '#c6d4e8' : '#8fa2bd'
    const sz = 0.9 + near * 2.6
    ctx.fillRect(sparks[a] + ox * (0.4 + near), sparks[a + 1] + oy * (0.4 + near), sz, sz)
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

  /*
    The ground the mark sits on.

    Not a light source and not a spotlight: a single wide, flat wash that lifts
    the whole middle of the frame by a few values so black artwork has
    something to sit against. A concentrated bloom made the logo look lit from
    behind, which is exactly what it must not look like — the mark has to be
    level with the ground, not floating in front of a lamp.

    Cold throughout. The greys are blue-shifted, which is what keeps the frame
    reading as cold rolled steel rather than as a warm room.
  */
  const breath = 0.97 + Math.sin(now * 0.0009) * 0.03
  const key = props.keyLight * breath

  const gx = w / 2 + px * 0.16
  const gy = h * props.bloomY + py * 0.16
  const gw = Math.max(w, h) * 0.92

  ctx.save()
  ctx.translate(gx, gy)
  ctx.scale(1, 0.7)
  const ground = ctx.createRadialGradient(0, 0, 0, 0, 0, gw)
  ground.addColorStop(0, `rgba(168,176,190,${0.115 * key})`)
  ground.addColorStop(0.3, `rgba(132,140,154,${0.075 * key})`)
  ground.addColorStop(0.62, `rgba(76,82,94,${0.032 * key})`)
  ground.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ground
  ctx.fillRect(-gw, -gw, gw * 2, gw * 2)
  ctx.restore()

  const sy = h * props.seamY + py * 0.5

  /*
    The weld, low in the frame and close to the camera.

    Not a scene being watched from across a shop — the spatter is thrown
    toward the lens and grows as it comes, which is the whole of why it reads
    as standing over the work rather than looking at a picture of it. Cold:
    the arc column really is blue-white, and the spatter is held at steel
    rather than orange so nothing warm enters the frame.
  */
  if (props.arc) {
    const flick = 0.86 + Math.sin(now * 0.055) * 0.09 + Math.random() * 0.06
    const hx = w / 2 + Math.sin(now * 0.00016) * w * 0.3 + px * 0.8
    const r = Math.max(46, h * 0.1) * flick

    const core = ctx.createRadialGradient(hx, sy, 0, hx, sy, r)
    core.addColorStop(0, 'rgba(255,255,255,0.9)')
    core.addColorStop(0.08, 'rgba(216,232,255,0.5)')
    core.addColorStop(0.3, 'rgba(150,180,225,0.12)')
    core.addColorStop(1, 'rgba(90,120,180,0)')
    ctx.fillStyle = core
    ctx.fillRect(hx - r, sy - r, r * 2, r * 2)

    if (!reduced) spawn(hx, sy, Math.round(dt * 90))
    drawSparks(reduced ? 0 : dt, px, py)
  }

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

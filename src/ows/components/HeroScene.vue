<template>
  <canvas ref="cv" class="hs" aria-hidden="true" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  The hero's scene: a light, and a joint being closed under it.

  The line across the lower frame is not decoration. It is a seam, and it is
  being welded — left to right, one pass, over and over. Ahead of the arc the
  line is two edges with a root gap between them: two parts, not yet one.
  Behind it there is a single bead, white at the arc, cooling back through the
  blue an oxide leaves on steel until it settles into the hairline that gives
  the black its floor. That is the whole idea. The frame is not a picture of
  welding; it is the moment where two things become one, held on a loop.

  Everything is drawn additively over black, which is how light behaves and why
  no layer needs to know about any other. Cold throughout: the arc column
  really is blue-white, and the spatter is held at steel rather than orange so
  nothing warm enters the frame.
*/

const props = defineProps({
  /** Where the top of the seam sits, as a fraction of height. */
  apex: { type: Number, default: 0.78 },
  /** Seam radius as a multiple of width. Large is nearly flat. */
  curve: { type: Number, default: 1.5 },
  /** Where the key bloom sits — on the mark, not on the seam. */
  bloomY: { type: Number, default: 0.32 },
  /** Seconds for one full cycle: the pass, then the bead cooling. */
  period: { type: Number, default: 19 },
  /** Share of the cycle the arc is travelling. The rest is cooling. */
  travel: { type: Number, default: 0.72 },
  /** Root gap between the two edges ahead of the arc, in px. */
  gap: { type: Number, default: 5 },
  /** Floor under the bloom, so the mark is always lit. 0–1. */
  keyLight: { type: Number, default: 1 },
  /** Pointer/scroll parallax strength in pixels. */
  parallax: { type: Number, default: 26 },
  /** Whether the arc runs at all. Off, the scene is the light and the seam. */
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

/* How far behind the arc the bead takes to come down to the base hairline. */
const COOL = 260
/* Ripple pitch. A bead is laid in pulses, and the pulses are what make a weld
   look welded rather than drawn — they stay put on the metal while the arc
   moves away from them. */
const PITCH = 13
const RIPPLES = 22

const SPARKS = 300
const sparks = new Float32Array(SPARKS * 5)
let cursor = 0
const rand = (a, b) => a + Math.random() * (b - a)
/* Hot values relax toward the base value rather than toward nothing, so the
   bead cools into the hairline instead of erasing it. */
const mix = (base, hot, k) => base + (hot - base) * k

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

/*
  The seam is the top of one enormous circle, so only a shallow arc of it is
  ever in frame — which is what gives the black a floor and a scale. Every
  point on it is addressed by x, and the outward normal is the radius, which
  is what the two edges are offset along.
*/
function seamPath(from, to, cx, cy, R, off) {
  ctx.beginPath()
  const step = 5
  const begin = Math.max(from, -step)
  const end = Math.min(to, w + step)
  for (let x = begin; x <= end; x += step) {
    const dx = x - cx
    const r = Math.sqrt(Math.max(1, R * R - dx * dx))
    // `off` may be a function of x — the two edges close on the arc rather
    // than meeting it at full gap, which is the parts being drawn together.
    const o = typeof off === 'function' ? off(x) : off
    const px = o ? x + (dx / R) * o : x
    const py = o ? cy - r - (r / R) * o : cy - r
    if (x <= begin) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
}

const seamY = (x, cx, cy, R) => cy - Math.sqrt(Math.max(1, R * R - (x - cx) * (x - cx)))

function draw(now, dt) {
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

  // ---- the joint ---------------------------------------------------------
  // Held a little in front of the wash, so it pulls against the head while the
  // light behind stays put. That difference is the depth.
  const R = props.curve * w
  const cx = w / 2 - px * 0.5
  const cy = props.apex * h + R - py * 0.5

  const cycle = ((now - start) / 1000) % props.period
  const running = props.period * props.travel
  // The pass, then the hold. During the hold the arc is off the right edge and
  // the bead behind it comes the rest of the way down to the base hairline, so
  // the loop closes on a state identical to the one it opened on.
  const u = reduced ? 0.55 : Math.min(1, cycle / running)
  const heat = reduced ? 1 : cycle <= running ? 1 : 1 - (cycle - running) / (props.period - running)
  const head = -0.08 * w + u * 1.16 * w
  const hy = seamY(head, cx, cy, R)

  ctx.lineCap = 'round'

  /*
    Ahead of the arc: two edges with a root gap between them. The gap closes
    over the last stretch before the arc rather than meeting it at full width,
    which is the two parts being drawn together — the whole point of the frame,
    and the one detail that makes the line read as a joint instead of a rule.
  */
  const TAPER = 110
  /*
    The gap also opens over the first couple of seconds of a cycle. Without
    that, the loop wraps from a finished single bead straight to two separated
    edges and the whole seam appears to split at once. Opening from zero means
    the two lines start superimposed — which is exactly the cooled bead — and
    part while the arc is still off the left edge.
  */
  const open = reduced ? 1 : Math.min(1, cycle / 2.2)
  const edge = (s) => (x) => (props.gap / 2) * s * open * Math.min(1, (x - head) / TAPER)

  const lit = ctx.createLinearGradient(head, 0, head + 240, 0)
  lit.addColorStop(0, `rgba(214,228,250,${mix(0.07, 0.26, heat)})`)
  lit.addColorStop(0.35, `rgba(180,196,222,${mix(0.07, 0.13, heat)})`)
  lit.addColorStop(1, 'rgba(158,172,196,0.07)')
  ctx.strokeStyle = lit
  ctx.lineWidth = 1
  seamPath(head, w, cx, cy, R, edge(1))
  ctx.stroke()
  seamPath(head, w, cx, cy, R, edge(-1))
  ctx.stroke()

  /*
    Behind it: one bead. The gradient is the cooling curve — white at the arc,
    down through the blue an oxide leaves on steel, to the hairline the frame
    keeps. Short and steep, because that is how fast a bead actually cools and
    because a long bright trail would outrank the search field, which is third
    in this screen's order and must stay there.
  */
  const bead = ctx.createLinearGradient(head - COOL, 0, head, 0)
  bead.addColorStop(0, 'rgba(190,204,226,0.13)')
  bead.addColorStop(0.5, `rgba(150,178,232,${mix(0.13, 0.2, heat)})`)
  bead.addColorStop(0.84, `rgba(196,216,248,${mix(0.13, 0.34, heat)})`)
  bead.addColorStop(0.95, `rgba(234,243,255,${mix(0.13, 0.6, heat)})`)
  bead.addColorStop(1, `rgba(255,255,255,${mix(0.13, 0.85, heat)})`)

  // The heat around it first, wide and weak, then the bead itself.
  const halo = ctx.createLinearGradient(head - COOL * 0.55, 0, head, 0)
  halo.addColorStop(0, 'rgba(120,150,200,0)')
  halo.addColorStop(1, `rgba(150,182,238,${0.055 * heat})`)
  ctx.strokeStyle = halo
  ctx.lineWidth = 10
  seamPath(-10, head, cx, cy, R, 0)
  ctx.stroke()

  ctx.strokeStyle = bead
  ctx.lineWidth = 1.5
  seamPath(-10, head, cx, cy, R, 0)
  ctx.stroke()

  /*
    The ripples. A bead is laid in pulses, and the pulses are locked to the
    metal — they are placed on a fixed pitch in world coordinates, not measured
    back from the arc, so they stay where they were deposited while the arc
    walks away from them.
  */
  const firstRipple = Math.floor(head / PITCH) * PITCH
  for (let i = 0; i < RIPPLES; i++) {
    const rx = firstRipple - i * PITCH
    if (rx < -PITCH) break
    const age = (head - rx) / (RIPPLES * PITCH)
    const a = (1 - age) * (1 - age) * 0.5 * heat
    if (a < 0.01) continue
    ctx.globalAlpha = a
    ctx.strokeStyle = '#dce8ff'
    ctx.lineWidth = 2
    seamPath(rx - PITCH * 0.28, rx + PITCH * 0.28, cx, cy, R, 0)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // ---- the arc -----------------------------------------------------------
  /*
    The arc. Small and blue-white, because that is what an arc is: a point, not
    a lamp. No electrode is drawn above it — a rod leaning out of the frame was
    tried and read as a stray diagonal, and the thing that actually says
    somebody is holding this is the spatter coming at the lens.
  */
  // Reduced motion holds one frame mid-pass, so the arc is always on there —
  // otherwise a resize redraw lands wherever the clock happens to be and the
  // arc disappears from a still image that is supposed to be fixed.
  if (props.arc && (reduced || cycle <= running)) {
    const flick = 0.86 + Math.sin(now * 0.055) * 0.09 + Math.random() * 0.06
    const r = Math.max(30, h * 0.062) * flick

    const core = ctx.createRadialGradient(head, hy, 0, head, hy, r)
    core.addColorStop(0, 'rgba(255,255,255,0.9)')
    core.addColorStop(0.09, 'rgba(216,232,255,0.44)')
    core.addColorStop(0.32, 'rgba(150,180,225,0.1)')
    core.addColorStop(1, 'rgba(90,120,180,0)')
    ctx.fillStyle = core
    ctx.fillRect(head - r, hy - r, r * 2, r * 2)

    if (!reduced) spawn(head, hy, Math.round(dt * 90))
  }

  drawSparks(reduced ? 0 : dt, px, py)

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

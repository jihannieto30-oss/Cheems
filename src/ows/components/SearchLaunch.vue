<template>
  <!--
    Teleported to the body deliberately. The hero sets `isolation: isolate`,
    which opens a stacking context — inside it this overlay's z-index is
    measured against its siblings, not against the fixed navigation, and the
    bar stays visible straight through the transition.
  -->
  <Teleport to="body">
    <div v-if="running" class="launch">
      <canvas ref="cv" class="launch__cv" aria-hidden="true" />
    <!-- The visual is decorative; the fact that the page is going somewhere is
         not, and has to be announced rather than only shown. -->
      <p class="ows-sr" role="status">Abriendo {{ label }}</p>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  The bridge between the index and wherever the query leads.

  Five phases over about two seconds: the field's light gathers, the technical
  columns separate into depth and rush past the camera, a weld takes the frame,
  the arc whites out, and the screen returns to black. Navigation happens on
  the black, so the destination is never revealed mid-move.

  It is a canvas rather than DOM because the whole thing is light — additive
  over black — and because it has to run at frame rate while the router is
  already resolving the next page.

  Timing is read from the clock, not accumulated per frame. A dropped frame
  then shortens the phase rather than stretching the whole transition, which is
  what keeps a slow device from sitting on a black screen for four seconds.
*/

const REDUCED_MS = 420
const FULL_MS = 2050

// Phase boundaries as fractions of the run.
const GATHER = 0.16
const RUSH = 0.46
const WELD = 0.76
const FLASH = 0.9

const running = ref(false)
const label = ref('')
const cv = ref(null)

let ctx = null
let raf = 0
let t0 = 0
let dur = FULL_MS
let done = null
let w = 0
let h = 0

const COLUMNS = 34
const cols = []
const SPARKS = 260
const sparks = new Float32Array(SPARKS * 5)
let cursor = 0

const TOKENS = [
  'AWS A5.18', 'EN ISO 2560', 'ASME IX', 'ASTM A240', 'NOM-027', 'DIN 8559',
  'ER70S-6', 'E7018', 'ER308L', 'BAg-3', '0.9 mm', '480 MPa', 'H4', 'DC+',
]

const rand = (a, b) => a + Math.random() * (b - a)
const ease = (t) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** 0 → 1 across a phase, clamped outside it. */
const span = (p, a, b) => clamp01((p - a) / (b - a))

function size() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  cv.value.width = Math.round(w * dpr)
  cv.value.height = Math.round(h * dpr)
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function seed() {
  cols.length = 0
  for (let i = 0; i < COLUMNS; i++) {
    cols.push({
      // Depth drives everything: how fast it rushes, how big it gets, how
      // bright. One number per column is the whole parallax.
      z: rand(0.12, 1),
      x: rand(-0.6, 1.6),
      y: rand(-0.3, 1.2),
      text: TOKENS[(Math.random() * TOKENS.length) | 0],
    })
  }
  sparks.fill(0)
}

function spawn(x, y, n) {
  for (let i = 0; i < n; i++) {
    const k = cursor
    cursor = (cursor + 1) % SPARKS
    const a = k * 5
    sparks[a] = x + rand(-4, 4)
    sparks[a + 1] = y + rand(-4, 4)
    sparks[a + 2] = rand(-420, 420)
    sparks[a + 3] = rand(-360, -40)
    sparks[a + 4] = rand(0.25, 0.9)
  }
}

function draw(p, dt) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'

  const cx = w / 2
  const cy = h * 0.5

  // ---- phase 2: the columns separate and rush past --------------------------
  const rush = span(p, GATHER * 0.4, WELD)
  if (rush > 0 && rush < 1) {
    const fade = 1 - span(p, RUSH, WELD)
    for (const c of cols) {
      // Perspective divide: as travel approaches the column's depth the term
      // collapses and the text flies outward past the edges of the frame.
      const travel = ease(rush) * 0.95
      const k = 1 / Math.max(0.06, c.z - travel * c.z)
      const x = cx + (c.x - 0.5) * w * k * 0.9
      const y = cy + (c.y - 0.5) * h * k * 0.9
      if (x < -300 || x > w + 300 || y < -200 || y > h + 200) continue

      ctx.globalAlpha = Math.min(0.5, 0.1 * k) * fade
      ctx.fillStyle = '#cfd6de'
      ctx.font = `300 ${Math.min(64, 9 * k)}px "Space Grotesk", system-ui, sans-serif`
      ctx.fillText(c.text, x, y)
    }
    ctx.globalAlpha = 1
  }

  // ---- phase 1: the light gathers -------------------------------------------
  const gather = span(p, 0, GATHER)
  if (gather > 0) {
    const g = ctx.createLinearGradient(0, cy - 40, 0, cy + 40)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, `rgba(255,255,255,${0.5 * gather * (1 - span(p, RUSH, WELD))})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, cy - 40, w, 80)
  }

  // ---- phase 3: the weld takes the frame ------------------------------------
  const weld = span(p, RUSH, FLASH)
  if (weld > 0) {
    const sy = cy + h * 0.1 * (1 - weld)
    // The plate: a dark metal ground that only exists once the arc lights it.
    const plate = ctx.createLinearGradient(0, sy - h * 0.3, 0, h)
    plate.addColorStop(0, `rgba(26,28,32,${0.5 * weld})`)
    plate.addColorStop(0.5, `rgba(52,56,63,${0.62 * weld})`)
    plate.addColorStop(1, `rgba(8,9,11,${0.5 * weld})`)
    ctx.fillStyle = plate
    ctx.fillRect(0, sy, w, h - sy)

    // The bead already laid, cooling to the left of the arc.
    const bead = ctx.createLinearGradient(0, 0, cx, 0)
    bead.addColorStop(0, 'rgba(40,12,4,0)')
    bead.addColorStop(0.55, `rgba(176,52,10,${0.6 * weld})`)
    bead.addColorStop(0.86, `rgba(246,132,28,${0.85 * weld})`)
    bead.addColorStop(1, `rgba(255,246,232,${weld})`)
    ctx.fillStyle = bead
    ctx.fillRect(0, sy - 2.5, cx, 5)

    // Smoke, drifting up off the puddle.
    const smoke = ctx.createRadialGradient(cx, sy - h * 0.18, 0, cx, sy - h * 0.18, h * 0.34)
    smoke.addColorStop(0, `rgba(150,150,158,${0.055 * weld})`)
    smoke.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = smoke
    ctx.fillRect(0, 0, w, h)

    // The arc.
    const r = Math.max(90, h * 0.24) * (0.7 + weld * 0.6) * (0.9 + Math.random() * 0.14)
    const core = ctx.createRadialGradient(cx, sy, 0, cx, sy, r)
    core.addColorStop(0, `rgba(255,255,255,${weld})`)
    core.addColorStop(0.06, `rgba(228,242,255,${0.82 * weld})`)
    core.addColorStop(0.22, `rgba(140,186,255,${0.26 * weld})`)
    core.addColorStop(0.6, `rgba(60,112,220,${0.08 * weld})`)
    core.addColorStop(1, 'rgba(16,50,160,0)')
    ctx.fillStyle = core
    ctx.fillRect(cx - r, sy - r, r * 2, r * 2)

    spawn(cx, sy, Math.round(dt * 340 * weld))
    for (let i = 0; i < SPARKS; i++) {
      const a = i * 5
      if (sparks[a + 4] <= 0) continue
      sparks[a + 4] -= dt
      if (sparks[a + 4] <= 0) continue
      sparks[a + 3] += 620 * dt
      sparks[a] += sparks[a + 2] * dt
      sparks[a + 1] += sparks[a + 3] * dt
      const life = sparks[a + 4]
      ctx.globalAlpha = Math.min(1, life * 2.2)
      ctx.fillStyle = life > 0.6 ? '#fff8ee' : life > 0.3 ? '#ffb85e' : '#e0530a'
      ctx.fillRect(sparks[a], sparks[a + 1], life > 0.5 ? 2.2 : 1.4, life > 0.5 ? 2.2 : 1.4)
    }
    ctx.globalAlpha = 1
  }

  // ---- phase 4: the whiteout, then black -----------------------------------
  const flash = span(p, WELD, FLASH)
  if (flash > 0) {
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = `rgba(244,249,255,${Math.sin(flash * Math.PI) * 0.95})`
    ctx.fillRect(0, 0, w, h)
  }

  ctx.globalCompositeOperation = 'source-over'
  const black = span(p, FLASH, 1)
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`
    ctx.fillRect(0, 0, w, h)
  }
}

let last = 0

function frame(now) {
  const p = clamp01((now - t0) / dur)
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  draw(p, dt)

  if (p >= 1) {
    raf = 0
    // Navigation happens on the black, never before it: the point of the
    // transition is that the destination is not seen arriving.
    done?.()
    done = null
    return
  }
  raf = requestAnimationFrame(frame)
}

/**
 * Plays the transition, then calls `onDone`.
 * Resolves immediately-ish under reduced motion — the move still happens, it
 * just stops being a performance.
 */
function play(text, onDone) {
  if (running.value) return
  label.value = text
  done = onDone
  running.value = true
  dur = prefersReducedMotion() ? REDUCED_MS : FULL_MS

  requestAnimationFrame(() => {
    if (!cv.value) {
      done?.()
      done = null
      return
    }
    size()
    seed()
    t0 = performance.now()
    last = t0
    raf = requestAnimationFrame(frame)
  })
}

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  done = null
})

defineExpose({ play })
</script>

<style scoped>
.launch {
  position: fixed;
  inset: 0;
  /* Above the navigation and the door alike: once this is running nothing
     else on the page is interactive or relevant. */
  z-index: 400;
  background: #000;
}

.launch__cv {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

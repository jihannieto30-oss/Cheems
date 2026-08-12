<template>
  <div :ref="setHost" class="cascade" :style="{ '--depth': depth }">
    <canvas ref="cv" class="cascade__cv" aria-hidden="true" />
    <span class="cascade__mask" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'
import { useParallax } from '../composables/useParallax'

/*
  The welding standards, falling.

  Columns of designations drift down the frame at three different depths — far
  columns small, dim and slow; near columns larger, brighter and faster. The
  leading token in each column carries a little more light, which is what makes
  the movement read as falling rather than scrolling.

  Deliberately quiet: nothing here is meant to be read continuously, only
  recognised. Anyone in the trade catches AWS, EN ISO, W.Nr in passing and
  understands what the index covers without a line of explanatory copy.
*/

const props = defineProps({
  /** Parallax travel in vh across a viewport of scroll. */
  depth: { type: Number, default: 16 },
  /** Column density multiplier. */
  density: { type: Number, default: 1 },
  /** Overall opacity ceiling, 0–1. */
  intensity: { type: Number, default: 1 },
})

const TOKENS = [
  'AWS A5.18',
  'AWS A5.1',
  'AWS A5.9',
  'AWS A5.28',
  'EN ISO 14341',
  'EN ISO 2560',
  'EN ISO 636',
  'ASME SFA-5.18',
  'ASME IX',
  'ASTM A240',
  'ASTM A36',
  'NOM-027-STPS',
  'DIN 8559',
  'JIS Z3312',
  'W.Nr 1.4404',
  'AISI 316L',
  'CWB W47.1',
  'ER70S-6',
  'E7018',
  'E6013',
  'ER308L',
  'BAg-3',
  '0.9 mm',
  '3.2 mm',
  '480 MPa',
  '27 J −20 °C',
  'H4',
  'DC+',
  'Ar/CO₂',
]

// Three planes. Near ones are bigger, brighter and fall faster.
/*
  Alphas are low on purpose. This is texture, not content: present enough that
  a welder recognises the designations in passing, quiet enough that it never
  competes with the headline or the field.
*/
const PLANES = [
  { size: 8, speed: 0.1, alpha: 0.045, gap: 58 },
  { size: 10, speed: 0.2, alpha: 0.075, gap: 74 },
  { size: 12, speed: 0.38, alpha: 0.115, gap: 96 },
]

const cv = ref(null)
const host = ref(null)
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
let columns = []
let running = false
let visible = true

function build() {
  columns = []
  /*
    One column every ~62px. Dense enough to read as a wall of specification
    rather than a scatter of words — at the earlier spacing the individual
    tokens read as labels on the page instead of as texture behind it.
  */
  const count = Math.max(6, Math.round((w / 62) * props.density))
  for (let i = 0; i < count; i++) {
    const plane = PLANES[i % PLANES.length]
    const items = []
    // Fill a full screen height plus a margin so the column never empties.
    const span = h + plane.gap * 4
    for (let y = -plane.gap * 2; y < span; y += plane.gap) {
      items.push({ y, token: TOKENS[Math.floor(Math.random() * TOKENS.length)] })
    }
    columns.push({
      x: (i + 0.5) * (w / count) + (Math.random() - 0.5) * 26,
      plane,
      items,
      span,
      offset: Math.random() * plane.gap,
    })
  }
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
  ctx = cv.value.getContext('2d', { alpha: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  build()
}

function paint() {
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const col of columns) {
    const { plane } = col
    ctx.font = `${plane.size}px ui-monospace, "SF Mono", Menlo, monospace`

    for (const item of col.items) {
      const y = item.y + col.offset
      if (y < -20 || y > h + 20) continue

      // Fade in at the top edge and out at the bottom so tokens are never
      // seen to pop into or out of existence.
      const edge = Math.min(1, y / 120, (h - y) / 160)
      if (edge <= 0) continue

      const a = plane.alpha * edge * props.intensity
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`
      ctx.fillText(item.token, col.x, y)
    }
  }
}

function frame() {
  raf = 0
  for (const col of columns) {
    col.offset += col.plane.speed
    // Recycle: when the column has travelled one gap, move the lowest token
    // back to the top and give it a new designation.
    if (col.offset >= col.plane.gap) {
      col.offset -= col.plane.gap
      const last = col.items.pop()
      last.y = col.items[0].y - col.plane.gap
      last.token = TOKENS[Math.floor(Math.random() * TOKENS.length)]
      col.items.unshift(last)
    }
  }
  paint()
  if (running) raf = requestAnimationFrame(frame)
}

function start() {
  if (running || !visible || !ctx) return
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
    // Still legible, simply not moving.
    paint()
    return
  }

  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      visible ? start() : stop()
    },
    { threshold: 0 },
  )
  io.observe(host.value)

  ro = new ResizeObserver(() => {
    resize()
    if (!running) paint()
  })
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
.cascade {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  contain: paint;
}

.cascade__cv {
  width: 100%;
  height: 100%;
  transform: translate3d(0, calc(var(--p, 0) * var(--depth) * var(--ows-parallax) * 1vh), 0)
    scale(1.18);
  will-change: transform;
}

/* Opens a hole behind the headline and the field so type always wins, while
   leaving the outer thirds of the frame legible. Pushed any darker and the
   cascade disappears entirely. */
.cascade__mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 38% 22% at 50% 45%,
      rgb(0 0 0 / 0.92) 0%,
      rgb(0 0 0 / 0.72) 50%,
      transparent 100%
    ),
    linear-gradient(
      to bottom,
      rgb(0 0 0 / 0.92) 0%,
      rgb(0 0 0 / 0.35) 16%,
      transparent 30%,
      transparent 74%,
      rgb(0 0 0 / 0.55) 90%,
      rgb(0 0 0 / 0.92) 100%
    );
}

@media (prefers-reduced-motion: reduce) {
  .cascade__cv {
    transform: scale(1.18);
    will-change: auto;
  }
}
</style>

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
import { STANDARD_REFS } from '../data/standards'

/*
  The welding standards, falling.

  Two things make this read as a real wall of specification rather than as
  floating words.

  What is written. Not ten acronyms but the documents themselves — AWS A5.18,
  EN ISO 14341, JIS Z 3312, GB/T 8110, W.Nr 1.4430 — set the way a reference
  actually is, the body carrying the light and the number a step under it. A
  welder does not recognise "AWS"; they recognise A5.18, and the difference
  between those two is the difference between decoration and the subject of
  the site.

  And focus. The far planes are drawn five times at a small offset instead of
  once, which is a crude blur and exactly the right one here: a field of small
  text at three brightnesses reads as one plane in three greys, and the same
  field with the far planes actually soft reads as a room with depth in it.

  Both of the obvious ways to get a better blur were tried and both cost the
  page half its frame budget on a machine with no GPU. Rendering each plane
  into a reduced-resolution buffer and scaling it back up costs ~16 ms a frame
  in the upscale alone. Giving each plane its own canvas element and animating
  it by transform costs the same, for a subtler reason: three moving layers
  under a full-frame gradient overlay force that overlay to be re-composited
  every frame. Five extra fillText calls on a six-character string cost
  nothing, and one canvas that repaints in place leaves the overlay alone.
*/

const props = defineProps({
  /** Parallax travel in vh across a viewport of scroll. */
  depth: { type: Number, default: 16 },
  /** Column density multiplier. */
  density: { type: Number, default: 1 },
  /** Overall opacity ceiling, 0–1. */
  intensity: { type: Number, default: 1 },
})

/*
  Planes, far first. Near ones are bigger, brighter, faster and sharp; far ones
  are smaller, dimmer, slower and soft. `blur` is the offset radius in pixels,
  0 for the plane that is in focus.
*/
const PLANES = [
  { size: 8.5, speed: 0.05, alpha: 0.17, gap: 170, blur: 1.6 },
  { size: 9.5, speed: 0.09, alpha: 0.21, gap: 210, blur: 0.8 },
  { size: 10.5, speed: 0.15, alpha: 0.26, gap: 260, blur: 0 },
]

/* Centre and four at the radius. Overlapping alpha means the accumulated
   centre lands a little over the nominal value, which is what the divisor
   below is for. */
const KERNEL = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
const SPREAD = 4.2

const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace'

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

const pick = () => STANDARD_REFS[Math.floor(Math.random() * STANDARD_REFS.length)]
const shade = () => 0.72 + Math.random() * 0.28

function build() {
  columns = []
  /*
    Sparse on purpose. These are references, not a texture — roughly a column
    per 116px of frame leaves each one room to be read as a line rather than
    crowding into a grey wall.
  */
  const count = Math.max(4, Math.round((w / 116) * props.density))

  /*
    References are set flush left, so a column's x is where it starts, not
    where it is centred. The run is laid out inside a band narrow enough that
    the longest of them ("ASME SFA 5.28") still finishes on screen after the
    canvas's own 1.18 blow-up has pushed the edges outward.
  */
  const reserve = 96
  const left = w * 0.05
  const right = Math.max(left + 40, w * 0.95 - reserve)
  const stride = (right - left) / count

  for (let i = 0; i < count; i++) {
    const plane = PLANES[i % PLANES.length]
    const items = []
    // Fill a full screen height plus a margin so the column never empties.
    const span = h + plane.gap * 4
    for (let y = -plane.gap * 2; y < span; y += plane.gap) {
      // A fixed per-item shade, so the wall is uneven the way printed matter
      // is rather than uniform the way a text field is.
      items.push({ y, ref: pick(), shade: shade() })
    }
    columns.push({
      x: left + (i + 0.5) * stride + (Math.random() - 0.5) * Math.min(26, stride * 0.4),
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

/** One string, sharp or smeared depending on the plane it belongs to. */
function put(text, x, y, blur) {
  if (!blur) {
    ctx.fillText(text, x, y)
    return
  }
  for (const [kx, ky] of KERNEL) ctx.fillText(text, x + kx * blur, y + ky * blur)
}

function paint() {
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  for (const plane of PLANES) {
    // Set once per plane: assigning ctx.font re-parses the shorthand, and it
    // is the expensive call in this loop.
    ctx.font = `${plane.size}px ${MONO}`
    const split = plane.blur ? SPREAD : 1

    for (const col of columns) {
      if (col.plane !== plane) continue

      for (const item of col.items) {
        const y = item.y + col.offset
        if (y < -20 || y > h + 20) continue

        // Fade in at the top edge and out at the bottom so references are
        // never seen to pop into or out of existence.
        const edge = Math.min(1, y / 120, (h - y) / 160)
        if (edge <= 0) continue

        const a = (plane.alpha * edge * item.shade * props.intensity) / split
        // Blue-shifted rather than pure white: the frame is cold throughout.
        ctx.fillStyle = `rgba(210,220,236,${a.toFixed(4)})`
        put(item.ref.body, col.x, y, plane.blur)

        // Measured once and kept: the face is fixed per plane, and the body
        // only changes when the reference is recycled, which clears this.
        if (item.bw === undefined) item.bw = ctx.measureText(item.ref.body).width
        ctx.fillStyle = `rgba(176,190,212,${(a * 0.72).toFixed(4)})`
        put(item.ref.spec, col.x + item.bw + plane.size * 0.62, y, plane.blur)
      }
    }
  }
}

function frame() {
  raf = 0
  for (const col of columns) {
    col.offset += col.plane.speed
    // Recycle: when the column has travelled one gap, move the lowest
    // reference back to the top and give it a new one.
    if (col.offset >= col.plane.gap) {
      col.offset -= col.plane.gap
      const last = col.items.pop()
      last.y = col.items[0].y - col.plane.gap
      last.ref = pick()
      last.shade = shade()
      last.bw = undefined
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
   leaving the outer thirds of the frame legible. The hole covers the mark and
   the field together — centred between them, tall enough to reach both, since
   a reference sitting beside the logo is the one place this wall becomes
   clutter instead of context. Pushed any darker and the cascade disappears. */
.cascade__mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 40% 32% at 50% 40%,
      rgb(0 0 0 / 0.94) 0%,
      rgb(0 0 0 / 0.76) 46%,
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

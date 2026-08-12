import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from './useReducedMotion'

/*
  The camera.

  useParallax answers "where is this element in the scroll", which is the right
  question for a long page. The home screen and the door are not long pages —
  they are single frames, and a frame that only moves when you scroll does not
  move at all. This answers the other question: where is the head.

  Each registered element gets two custom properties written to it:

      --mx   pointer's horizontal position, -1 (left edge) → 1 (right edge)
      --my   the same vertically

  Both are eased rather than tracked. Tracking a cursor one-to-one reads as a
  gimmick; a scene that lags behind the head by a beat reads as mass. What the
  element does with the pair is its own business — the intended use is one
  rotation on a preserve-3d stage whose children sit at different translateZ,
  which buys true perspective parallax for one transform per frame instead of
  one per layer.

  On a touch screen no pointer ever moves, so rather than leaving those users a
  dead frame the scene drifts on its own: two slow sines, well under the rate
  at which motion becomes something you look at instead of something you feel.

  One listener and one rAF for the whole document, stopped the moment the eye
  settles and restarted on the next move. Reduced motion never registers, so
  --mx and --my stay unset and every consumer falls back to its own zero.
*/

const targets = new Set()

// Where the head is, and where the scene currently believes it is.
const aim = { x: 0, y: 0 }
const eye = { x: 0, y: 0 }

let raf = 0
let last = 0
let running = false
let touched = false

function write() {
  const x = eye.x.toFixed(4)
  const y = eye.y.toFixed(4)
  for (const el of targets) {
    el.style.setProperty('--mx', x)
    el.style.setProperty('--my', y)
  }
}

function frame(now) {
  raf = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  if (!touched) {
    // Nobody has moved a pointer: a touch screen, or a mouse that has not been
    // touched yet. Drift, slowly, so the depth is still legible.
    const t = now / 1000
    aim.x = Math.sin(t * 0.11) * 0.6
    aim.y = Math.cos(t * 0.083) * 0.45
  }

  // Per-second constant, so the ease is the same on a 60 Hz panel and a 120 Hz
  // one rather than twice as fast on the latter.
  const k = 1 - Math.pow(0.0022, dt)
  eye.x += (aim.x - eye.x) * k
  eye.y += (aim.y - eye.y) * k
  write()

  const settled = Math.abs(aim.x - eye.x) < 0.0004 && Math.abs(aim.y - eye.y) < 0.0004
  if (targets.size && !(touched && settled)) raf = requestAnimationFrame(frame)
}

function schedule() {
  if (raf || !targets.size || document.hidden) return
  last = performance.now()
  raf = requestAnimationFrame(frame)
}

function onPointer(e) {
  // A coarse pointer fires this on tap, which would freeze the idle drift at
  // wherever the finger landed. Only a real hover takes the wheel.
  if (e.pointerType === 'touch') return
  touched = true
  aim.x = (e.clientX / window.innerWidth - 0.5) * 2
  aim.y = (e.clientY / window.innerHeight - 0.5) * 2
  schedule()
}

function onVisibility() {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  } else {
    schedule()
  }
}

function ensureRunning() {
  if (running) return
  running = true
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
}

function teardownIfIdle() {
  if (targets.size || !running) return
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  window.removeEventListener('pointermove', onPointer)
  document.removeEventListener('visibilitychange', onVisibility)
}

/**
 * Attach the returned ref to an element to have `--mx` / `--my` maintained on
 * it. Returns a plain template ref; no other wiring is needed.
 */
export function usePointerDepth() {
  const el = ref(null)

  onMounted(() => {
    if (!el.value || prefersReducedMotion()) return
    ensureRunning()
    targets.add(el.value)
    // Park the element at the current eye position before its first paint, so
    // it does not jump from zero on the frame after mount.
    el.value.style.setProperty('--mx', eye.x.toFixed(4))
    el.value.style.setProperty('--my', eye.y.toFixed(4))
    schedule()
  })

  onUnmounted(() => {
    if (!el.value) return
    targets.delete(el.value)
    teardownIfIdle()
  })

  return el
}

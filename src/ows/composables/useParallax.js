import { ref, onMounted, onUnmounted } from 'vue'
import { prefersReducedMotion } from './useReducedMotion'

/*
  One scroll listener, one rAF loop, one IntersectionObserver for the whole page.

  Each registered element gets a CSS custom property `--p` written to it:
  the element's travel through the viewport, normalised to -1 → 1.

      -1  element's centre sits one viewport below the fold (entering)
       0  element's centre is level with the viewport centre
      +1  element's centre sits one viewport above the fold (leaving)

  Components then express their own motion in CSS:

      transform: translate3d(0, calc(var(--p, 0) * 12vh), 0);

  Writing a scalar and letting CSS do the transform keeps the JS cost at one
  property write per visible element per frame, and lets every displacement
  scale off --ows-parallax (which prefers-reduced-motion zeroes) for free.
*/

const targets = new Map()

let observer = null
let frame = 0
let viewportH = 0
let running = false

function measureViewport() {
  viewportH = window.innerHeight || document.documentElement.clientHeight
}

function update() {
  frame = 0
  for (const [el, state] of targets) {
    if (!state.visible) continue
    const rect = el.getBoundingClientRect()
    const centre = rect.top + rect.height / 2
    // Distance from viewport centre, normalised by a full viewport of travel.
    const raw = (centre - viewportH / 2) / viewportH
    const p = Math.max(-1.5, Math.min(1.5, raw))
    if (state.last === null || Math.abs(p - state.last) > 0.0005) {
      state.last = p
      el.style.setProperty('--p', p.toFixed(4))
    }
  }
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(update)
}

function onResize() {
  measureViewport()
  for (const state of targets.values()) state.last = null
  schedule()
}

function ensureRunning() {
  if (running) return
  running = true
  measureViewport()

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const state = targets.get(entry.target)
        if (!state) continue
        state.visible = entry.isIntersecting
        // Park off-screen elements at their limit so they are already correct
        // when they scroll back in, rather than snapping from a stale value.
        if (!state.visible) state.last = null
      }
      schedule()
    },
    // Generous margin: start tracking before the element is actually on screen
    // so its first painted frame is already in the right place.
    { rootMargin: '25% 0px 25% 0px', threshold: 0 },
  )

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize, { passive: true })
}

function teardownIfIdle() {
  if (targets.size || !running) return
  running = false
  observer?.disconnect()
  observer = null
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

/**
 * Attach the returned ref to any element to have `--p` maintained on it.
 * Returns a plain template ref; no other wiring is needed.
 */
export function useParallax() {
  const el = ref(null)

  onMounted(() => {
    if (!el.value || prefersReducedMotion()) return
    ensureRunning()
    targets.set(el.value, { visible: false, last: null })
    observer.observe(el.value)
    schedule()
  })

  onUnmounted(() => {
    if (!el.value) return
    observer?.unobserve(el.value)
    targets.delete(el.value)
    teardownIfIdle()
  })

  return el
}

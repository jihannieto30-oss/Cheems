import { ref, onMounted, onUnmounted } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Reactive mirror of the user's motion preference.
 *
 * The CSS side is already handled by tokens.css (it zeroes --ows-parallax), so
 * this exists for the JS half: skipping rAF work entirely rather than running a
 * loop that multiplies everything by zero.
 */
export function useReducedMotion() {
  const reduced = ref(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(QUERY).matches,
  )

  let mql = null
  const onChange = (event) => {
    reduced.value = event.matches
  }

  onMounted(() => {
    if (typeof window.matchMedia !== 'function') return
    mql = window.matchMedia(QUERY)
    reduced.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
  })

  return reduced
}

/** Non-reactive one-shot check, for use outside component setup. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  )
}

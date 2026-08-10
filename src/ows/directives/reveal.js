import { prefersReducedMotion } from '../composables/useReducedMotion'

/*
  v-reveal — progressive entrance.

  Adds `is-revealed` to the element the first time it crosses into view, and
  writes `--reveal-delay` so a group can stagger without hand-written classes.

      <div v-reveal>…</div>
      <div v-reveal="{ delay: 120 }">…</div>
      <li v-for="(x, i) in xs" v-reveal="{ delay: i * 90 }">…</li>

  Elements start at `opacity: 0` only when JS is running and motion is allowed;
  the class is applied immediately otherwise, so content is never trapped
  invisible by a failed observer or a reduced-motion preference.
*/

const REVEALED = 'is-revealed'
const PENDING = 'is-reveal-pending'

let observer = null
const options = new WeakMap()

function ensureObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target
        el.classList.remove(PENDING)
        el.classList.add(REVEALED)
        if (options.get(el)?.once !== false) observer.unobserve(el)
      }
    },
    // Fire a little before the element is fully on screen — by the time the
    // reader's eye arrives the transition has already settled.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
  )
  return observer
}

function normalise(binding) {
  const value = binding.value
  if (typeof value === 'number') return { delay: value, once: true }
  return {
    delay: value?.delay ?? 0,
    once: value?.once ?? !binding.modifiers.repeat,
  }
}

export const reveal = {
  mounted(el, binding) {
    const config = normalise(binding)

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add(REVEALED)
      return
    }

    options.set(el, config)
    if (config.delay) el.style.setProperty('--reveal-delay', `${config.delay}ms`)
    el.classList.add(PENDING)
    ensureObserver().observe(el)
  },

  unmounted(el) {
    observer?.unobserve(el)
    options.delete(el)
  },
}

export default reveal

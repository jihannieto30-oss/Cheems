<template>
  <RouterLink :ref="setEl" class="next" :to="to">
    <span class="next__inner ows-shell">
      <span class="next__eyebrow ows-meta">{{ eyebrow }}</span>
      <span class="next__title">{{ title }}</span>
      <span v-if="lead" class="next__lead">{{ lead }}</span>
      <svg class="next__arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12 H19 M13 6 L19 12 L13 18" />
      </svg>
    </span>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useParallax } from '../composables/useParallax'

/*
  The end of a page is a decision point, and leaving it as a footer wastes it.
  This is a full-width door into whatever comes next in the argument, sized so
  it reads as the continuation of the page rather than as an advertisement for
  another one.
*/
defineProps({
  eyebrow: { type: String, default: 'Siguiente' },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  to: { type: [String, Object], required: true },
})

const el = useParallax()
// RouterLink exposes its element on $el; the plain node arrives on unmount.
const setEl = (node) => (el.value = node?.$el ?? node)
</script>

<style scoped>
.next {
  display: block;
  position: relative;
  overflow: hidden;
  padding-block: clamp(3.5rem, 12vh, 8rem);
  color: var(--ows-ink-muted);
  transition: color var(--ows-base) var(--ows-ease);
}

/* A red wash rises from the bottom on hover — the only place on the site where
   the accent fills area, and it is doing the work of a button. */
.next::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 100%;
  background: linear-gradient(to top, var(--ows-red-wash), transparent 70%);
  transform: translate3d(0, 100%, 0);
  transition: transform var(--ows-slow) var(--ows-ease);
  pointer-events: none;
}

.next:hover::after,
.next:focus-visible::after {
  transform: translate3d(0, 0, 0);
}

.next__inner {
  display: block;
  position: relative;
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * -2vh), 0);
}

.next__eyebrow {
  display: block;
}

.next__title {
  display: block;
  margin-top: 1rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h3);
  font-weight: var(--ows-display-weight);
  line-height: 1.05;
  letter-spacing: var(--ows-track-display);
  text-transform: uppercase;
  color: var(--ows-ink);
  text-wrap: balance;
}

.next__lead {
  display: block;
  margin-top: 1rem;
  max-width: 46ch;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  text-wrap: pretty;
}

.next__arrow {
  display: block;
  width: 2.5rem;
  height: 2.5rem;
  margin-top: 1.75rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
}

.next:hover .next__arrow,
.next:focus-visible .next__arrow {
  transform: translateX(0.75rem);
}
</style>

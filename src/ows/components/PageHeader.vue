<template>
  <header :ref="setEl" class="ph">
    <div class="ph__inner ows-shell">
      <nav class="ph__crumb" aria-label="Ruta">
        <RouterLink to="/">{{ BRAND.code }}</RouterLink>
        <span aria-hidden="true">/</span>
        <span>{{ eyebrow.toUpperCase() }}</span>
      </nav>

      <hr class="ows-tick" />

      <h1 class="ph__title">{{ title }}</h1>
      <p v-if="lead" class="ph__lead">{{ lead }}</p>

      <dl v-if="stats.length" class="ph__stats">
        <div v-for="stat in stats" :key="stat.label" class="ph__stat">
          <dt class="ows-meta">{{ stat.label }}</dt>
          <dd class="ph__value ows-num">{{ stat.value }}</dd>
        </div>
      </dl>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { BRAND } from '../brand'
import { useParallax } from '../composables/useParallax'

/*
  The opening of every page that is not the home page.

  It exists so the pages cannot drift apart: one crumb, one red tick, one title
  scale, one lead measure, one stat rail. A page that needs something else at
  the top is a page that should be arguing for a new pattern, not editing this
  one locally.

  The title drifts a little against the scroll — the only motion here, and it
  is what stops the header feeling like a static banner.
*/
defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  /** Optional rail of figures: [{ label, value }] */
  stats: { type: Array, default: () => [] },
})

const el = useParallax()
const setEl = (node) => (el.value = node)
</script>

<style scoped>
.ph {
  padding-top: calc(var(--ows-nav-h) + clamp(2.5rem, 9vh, 6rem));
  padding-bottom: clamp(2rem, 6vh, 4rem);
  border-bottom: 1px solid var(--ows-line-soft);
}

.ph__inner {
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * -2.5vh), 0);
}

.ph__crumb {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  margin-bottom: 1.25rem;
}

.ph__crumb a {
  color: var(--ows-ink-faint);
  /* Padded to a 24px target without moving the text off the left margin. */
  padding: 0.5rem 0.375rem;
  margin: -0.5rem -0.375rem;
  transition: color var(--ows-fast) var(--ows-ease);
}

.ph__crumb a:hover {
  color: var(--ows-ink);
}

.ph__title {
  margin-top: 1.25rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-hero);
  font-weight: var(--ows-display-weight);
  line-height: 1;
  letter-spacing: var(--ows-track-display);
  text-transform: uppercase;
  color: var(--ows-ink);
  text-wrap: balance;
}

.ph__lead {
  margin-top: 1.5rem;
  max-width: 46ch;
  font-size: var(--ows-t-lead);
  line-height: 1.65;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.ph__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 3rem;
  margin-top: clamp(2rem, 5vh, 3rem);
}

.ph__value {
  margin-top: 0.5rem;
  font-family: var(--ows-display);
  font-size: clamp(1.375rem, 2.4vw, 2rem);
  font-weight: var(--ows-display-weight);
  line-height: 1;
  color: var(--ows-ink);
}
</style>

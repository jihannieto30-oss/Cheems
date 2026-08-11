<template>
  <span class="mark" :class="[`mark--${orientation}`, `mark--${size}`]">
    <!-- Isotype: one heavy ring inside a cluster of offset thin ones — the
         rings of a weld pool. Taken from the identity sheet; the mark stays
         white in every placement, never red. -->
    <svg class="mark__glyph" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-linecap="round">
        <circle cx="50" cy="50" r="30" stroke-width="10" />
        <circle cx="47" cy="48" r="37" stroke-width="2.4" opacity="0.9" />
        <circle cx="53" cy="52" r="39" stroke-width="1.8" opacity="0.7" />
        <circle cx="52" cy="46" r="34" stroke-width="1.6" opacity="0.55" />
        <circle cx="48" cy="54" r="41" stroke-width="1.2" opacity="0.4" />
      </g>
    </svg>

    <span v-if="wordmark" class="mark__word">{{ BRAND.code }}</span>
    <span v-if="tagline" class="mark__tag">{{ BRAND.descriptor }}</span>
  </span>
</template>

<script setup>
import { BRAND } from '../brand'

defineProps({
  size: { type: String, default: 'md' }, // sm | md | lg | hero
  orientation: { type: String, default: 'h' }, // h | v
  wordmark: { type: Boolean, default: true },
  tagline: { type: Boolean, default: false },
})
</script>

<style scoped>
.mark {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  color: var(--ows-ink);
  font-size: 1.5rem;
}

.mark--v {
  flex-direction: column;
  gap: 0.35em;
}

.mark__glyph {
  width: 1.28em;
  height: 1.28em;
  flex: none;
}

.mark__word {
  font-weight: 700;
  font-size: 1em;
  line-height: 1;
  /* Positive tracking: a caps wordmark of this length sets too tight at the
     display weight, and the letters start to knit together at hero size. */
  letter-spacing: 0.015em;
  color: var(--ows-ink);
  white-space: nowrap;
}

.mark__tag {
  font-size: 0.26em;
  max-width: 9em;
  text-align: left;
  line-height: 1.5;
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
  padding-left: 0.6em;
  border-left: 1px solid var(--ows-line);
}

.mark--sm {
  font-size: 1.125rem;
}
.mark--lg {
  font-size: clamp(1.5rem, 4.6vw, 3rem);
}

/* Google-scale: the mark is the headline on the home page.

   The ceiling is set against the wordmark's length rather than picked by eye.
   UNIBRAZE is eight characters, so at the old hero size it ran past the gutter
   on a 320px screen — the clamp floor, not the vw term, is what decides there,
   and the floor has to fit the narrowest case. */
.mark--hero {
  font-size: clamp(1.875rem, 7vw, 4.75rem);
  gap: 0.38em;
}
</style>

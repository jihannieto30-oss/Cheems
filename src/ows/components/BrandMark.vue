<template>
  <span class="mark" :class="`mark--${size}`">
    <!-- Two prepared edges facing each other across a root opening — a groove
         joint in section. The gap is load-bearing: close it and the mark reads
         as the letter Y instead of a joint.
         Placeholder identity: geometric, abstract, swappable. -->
    <svg class="mark__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 4.5 L10 15.5 L10 19.5" />
      <path d="M19 4.5 L14 15.5 L14 19.5" />
    </svg>
    <span v-if="wordmark" class="mark__word">
      <span class="mark__word-a">ONLINE</span>
      <span class="mark__word-b">WELDING SUPPLY</span>
    </span>
  </span>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'sm' }, // sm | lg
  wordmark: { type: Boolean, default: true },
})
</script>

<style scoped>
.mark {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--ows-ink);
}

.mark__glyph {
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
  overflow: visible;
}

.mark__glyph path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: square;
  /* Strokes draw themselves in once, then hold. */
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: mark-draw var(--ows-slow) var(--ows-ease) forwards;
}
.mark__glyph path:nth-child(2) {
  animation-delay: 120ms;
}

@keyframes mark-draw {
  to {
    stroke-dashoffset: 0;
  }
}

.mark__word {
  display: inline-flex;
  gap: 0.4em;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1;
}

.mark__word-a {
  color: var(--ows-ink);
}
.mark__word-b {
  color: var(--ows-ink-faint);
  transition: color var(--ows-base) var(--ows-ease);
}
.mark:hover .mark__word-b {
  color: var(--ows-ink-muted);
}

.mark--lg .mark__glyph {
  width: 2rem;
  height: 2rem;
}
.mark--lg .mark__word {
  font-size: var(--ows-t-meta);
}

@media (prefers-reduced-motion: reduce) {
  .mark__glyph path {
    stroke-dashoffset: 0;
    animation: none;
  }
}

/* The full name holds down to ~360px once the tracking is eased off; only
   below that is the second word dropped rather than wrapped. */
@media (max-width: 30rem) {
  .mark__word {
    letter-spacing: 0.16em;
  }
}

@media (max-width: 22rem) {
  .mark__word-b {
    display: none;
  }
}
</style>

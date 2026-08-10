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

    <span v-if="wordmark" class="mark__word">OWS</span>
    <span v-if="tagline" class="mark__tag">ONLINE<br />WELDING<br />SUPPLY</span>
  </span>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' }, // sm | md | lg
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
  letter-spacing: -0.005em;
  color: var(--ows-ink);
}

.mark__tag {
  font-size: 0.3em;
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
  font-size: clamp(2.25rem, 6vw, 3.5rem);
}
</style>

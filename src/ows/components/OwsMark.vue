<template>
  <span class="mark" :class="[`mark--${size}`, `mark--${tone}`]">
    <svg
      class="mark__svg"
      :viewBox="`0 0 ${art.width} ${art.height}`"
      role="img"
      :aria-label="BRAND.name"
      fill-rule="evenodd"
    >
      <g :transform="art.transform || undefined">
        <path class="mark__a" :d="art.a" />
        <path class="mark__b" :d="art.b" />
      </g>
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { BRAND } from '../brand'
import { LOCKUP, MARK } from '../brandMark'

/*
  The Unibraze logo.

  Two lockups, chosen by size rather than by taste: `mark` is the monogram
  alone and is the only thing that survives at navigation scale, `lockup`
  carries the wordmark and is used wherever there is room to read it.

  Tone decides the ink. `brand` keeps the red U and knocks the dark elements
  out to white, which is the reversed form of the artwork and the only one
  that works on this site's black. `mono` runs the whole mark in one colour
  for places where a second colour would be noise.
*/
const props = defineProps({
  /** lockup · mark */
  variant: { type: String, default: 'lockup' },
  /** sm · md · lg · hero */
  size: { type: String, default: 'md' },
  /** brand · mono */
  tone: { type: String, default: 'brand' },
})

const art = computed(() => (props.variant === 'mark' ? MARK : LOCKUP))
</script>

<style scoped>
.mark {
  display: inline-block;
  /* Height is the control; the SVG's own ratio sets the width. Sizing a logo
     by width is what makes two lockups of different proportions look like two
     different sizes of the same brand. */
  --h: 1.5rem;
  line-height: 0;
}

.mark__svg {
  display: block;
  height: var(--h);
  width: auto;
}

.mark--brand .mark__a {
  fill: var(--ows-red);
}

.mark--brand .mark__b {
  fill: var(--ows-ink);
}

.mark--mono .mark__a,
.mark--mono .mark__b {
  fill: currentColor;
}

.mark--sm {
  --h: 1.5rem;
}

.mark--md {
  --h: 2.25rem;
}

.mark--lg {
  --h: clamp(2.75rem, 7vw, 4.5rem);
}

/* The mark is the headline on the home page and on the door. */
.mark--hero {
  --h: clamp(3.25rem, 11vw, 7.5rem);
}
</style>

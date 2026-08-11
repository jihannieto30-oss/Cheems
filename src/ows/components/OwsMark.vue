<template>
  <span class="mark" :class="[`mark--${size}`, `mark--${tone}`]">
    <svg
      class="mark__svg"
      :viewBox="`0 0 ${art.width} ${art.height}`"
      role="img"
      :aria-label="BRAND.name"
      fill-rule="evenodd"
    >
      <defs v-if="tone === 'metal'">
        <!-- Polished dark metal. The brand's dark elements are black, and black
             on black is nothing — so on this site they are given a surface
             instead of a colour: a steep light-to-dark ramp with one specular
             band, which is what a black anodised part looks like under a strip
             light. It reads as the black mark, and it is visible. -->
        <linearGradient :id="`${uid}-steel`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.16" stop-color="#c2c8d0" />
          <stop offset="0.34" stop-color="#7d848d" />
          <stop offset="0.5" stop-color="#eef1f5" />
          <stop offset="0.68" stop-color="#8d949d" />
          <stop offset="1" stop-color="#b6bcc4" />
        </linearGradient>
        <linearGradient :id="`${uid}-red`" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color="#ff4038" />
          <stop offset="0.42" stop-color="#e10600" />
          <stop offset="1" stop-color="#7d0400" />
        </linearGradient>
      </defs>

      <g :transform="art.transform || undefined">
        <path class="mark__a" :d="art.a" :fill="tone === 'metal' ? `url(#${uid}-red)` : undefined" />
        <path class="mark__b" :d="art.b" :fill="tone === 'metal' ? `url(#${uid}-steel)` : undefined" />
      </g>
    </svg>
  </span>
</template>

<script setup>
import { computed, useId } from 'vue'
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
  /** brand · mono · metal */
  tone: { type: String, default: 'brand' },
})

/*
  Gradients live in <defs> and are referenced by id, and ids are global to the
  document — two marks on one page would otherwise share whichever definition
  rendered last. useId gives a per-instance one; a module counter cannot,
  because <script setup> runs once per instance and would reset it.
*/
const uid = useId()

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

/* A dark object on a dark ground needs an edge to sit against. */
.mark--metal .mark__svg {
  filter: drop-shadow(0 0 22px rgb(255 255 255 / 0.07)) drop-shadow(0 2px 1px rgb(0 0 0 / 0.6));
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

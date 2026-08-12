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

      <defs v-else-if="tone === 'ink'">
        <!--
          One light, three materials.

          Every ramp here runs the same way — brighter at the top, falling off
          below — because they are all standing in the same wash the scene
          behind them is lit by. That shared direction is the whole trick: it
          is what stops the mark reading as a flat sticker laid over a
          photograph and makes it read as an object inside the frame.
        -->

        <!-- The wordmark. White, as asked — but ramped, not flat. A flat #fff
             is brighter than anything else on the page and that alone is
             enough to detach it from the scene. -->
        <linearGradient :id="`${uid}-word`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.5" stop-color="#f0f3f8" />
          <stop offset="1" stop-color="#ccd3dd" />
        </linearGradient>

        <!-- The pole blocks and the ®. Black in the artwork, and black on
             black is a hole — so they keep the value of black and are given a
             surface: graphite, lit from above, dark enough to still read as
             the black elements of the logo. -->
        <linearGradient :id="`${uid}-block`" x1="0" y1="0" x2="0.14" y2="1">
          <stop offset="0" stop-color="#4e5561" />
          <stop offset="0.38" stop-color="#2f343d" />
          <stop offset="1" stop-color="#171a1f" />
        </linearGradient>

        <!--
          The U. Brand red at the middle, lifted at the top and dropped below —
          but over a narrow range. A wide one is what makes a shape look
          lacquered, and nothing else in this frame is lacquered.
        -->
        <linearGradient :id="`${uid}-red`" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stop-color="#f2231a" />
          <stop offset="0.5" stop-color="#e10600" />
          <stop offset="1" stop-color="#a00300" />
        </linearGradient>
      </defs>

      <g :transform="art.transform || undefined">
        <path class="mark__a" :d="art.a" :fill="fills.a" />
        <path class="mark__b" :d="art.b" :fill="fills.b" />
        <path v-if="art.c" class="mark__c" :d="art.c" :fill="fills.c" />
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

  Tone decides the ink.

    brand  red U, dark elements knocked out to white — the reversed artwork,
           which is what works anywhere the mark is small and unlit
    mono   the whole mark in one colour, for places where a second would be noise
    metal  the dark elements given an anodised surface instead of a colour
    ink    the hero treatment: white letters, graphite blocks, red U, all three
           ramped by one light so the mark sits in the scene rather than on it
*/
const props = defineProps({
  /** lockup · mark */
  variant: { type: String, default: 'lockup' },
  /** sm · md · lg · hero */
  size: { type: String, default: 'md' },
  /** brand · mono · metal · ink */
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

/*
  Which ink each of the three paths takes.

  Bound here rather than in the stylesheet because the gradient ids are
  per-instance: scoped CSS can only name a literal id, and a literal id is the
  collision this component exists to avoid. Tones with no gradients return
  nothing and fall through to the CSS fills below.
*/
const fills = computed(() => {
  if (props.tone === 'metal') {
    const steel = `url(#${uid}-steel)`
    return { a: `url(#${uid}-red)`, b: steel, c: steel }
  }
  if (props.tone === 'ink') {
    return { a: `url(#${uid}-red)`, b: `url(#${uid}-block)`, c: `url(#${uid}-word)` }
  }
  return {}
})
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

/* Blocks and wordmark together: in the reversed lockup they are one colour,
   and both must be named — an unfilled SVG path is black, which on this site
   is the same as not being drawn. */
.mark--brand .mark__b,
.mark--brand .mark__c {
  fill: var(--ows-ink);
}

.mark--mono .mark__a,
.mark--mono .mark__b,
.mark--mono .mark__c {
  fill: currentColor;
}

/*
  The artwork as drawn — black elements, brand red U — with the one departure
  the brand asked for: the letters are set white while the blocks stay black.

  The fills come from the gradients above. What is left here is the contact:
  a shadow the mark casts on the ground behind it, tight and low-contrast. An
  object that casts nothing is an object that is not in the room, and this is
  the cheapest honest way to put it there without lighting it from behind.
*/
.mark--ink .mark__svg {
  filter: drop-shadow(0 0.02em 0.05em rgb(0 0 0 / 0.85));
}

/* A dark object on a dark ground needs an edge to sit against. */
.mark--metal .mark__svg {
  filter: drop-shadow(0 0 22px rgb(255 255 255 / 0.07)) drop-shadow(0 2px 1px rgb(0 0 0 / 0.6));
}

.mark--sm {
  --h: 1.5rem;
}

/*
  The navigation bar. Larger than a monogram would need to be, because this is
  the full lockup and the wordmark inside it has to survive: at 1.5rem the
  letters set at four pixels and turn to mush, and the bar is 4.5rem tall, so
  there is room to give them the height they need.
*/
.mark--nav {
  --h: clamp(2rem, 3.6vw, 2.625rem);
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

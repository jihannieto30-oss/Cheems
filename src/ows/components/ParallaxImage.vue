<template>
  <figure ref="frame" class="pxi" :class="{ 'pxi--loaded': loaded }">
    <img
      class="pxi__img"
      :src="src"
      :alt="alt"
      :style="{ '--depth': depth, '--scale': scale }"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
    />
    <span class="pxi__scrim" :style="{ '--scrim': scrim }" aria-hidden="true" />
    <span v-if="hairlines" class="pxi__frame" aria-hidden="true" />
  </figure>
</template>

<script setup>
import { ref } from 'vue'
import { useParallax } from '../composables/useParallax'

/*
  A framed image that drifts against the scroll.

  The image is deliberately oversized (--scale) so the vertical translation
  never exposes the frame edge. All motion is expressed in CSS off the `--p`
  scalar that useParallax writes, multiplied by --ows-parallax so
  prefers-reduced-motion flattens it without a JS branch here.

  `src` accepts anything — the generated SVGs today, photography tomorrow.
*/
defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  /** Travel in vh across a full viewport of scroll. Keep it under ~14. */
  depth: { type: Number, default: 8 },
  /** Oversize factor. Must exceed 1 + depth/50 or the frame will show. */
  scale: { type: Number, default: 1.3 },
  /** 0–1 black wash over the image. */
  scrim: { type: Number, default: 0.3 },
  hairlines: { type: Boolean, default: true },
})

const frame = useParallax()
const loaded = ref(false)
</script>

<style scoped>
.pxi {
  position: relative;
  overflow: hidden;
  margin: 0;
  background: var(--ows-void);
  /* Own stacking + paint containment: the parallax child never invalidates
     layout outside this box. */
  contain: paint;
  isolation: isolate;
}

.pxi__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate3d(0, calc(var(--p, 0) * var(--depth) * var(--ows-parallax) * 1vh), 0)
    scale(var(--scale));
  will-change: transform;
  opacity: 0;
  transition: opacity 1.2s var(--ows-ease);
  /* Any residual colour in a replacement photograph is removed here, so the
     palette holds no matter what asset is dropped in. */
  filter: grayscale(1) contrast(1.06);
}

.pxi--loaded .pxi__img {
  opacity: 1;
}

.pxi__scrim {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / var(--scrim));
  pointer-events: none;
}

.pxi__frame {
  position: absolute;
  inset: 0;
  border: 1px solid var(--ows-line);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .pxi__img {
    transform: none;
    will-change: auto;
    transition: none;
    opacity: 1;
  }
}
</style>

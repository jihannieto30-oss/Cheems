<template>
  <section :id="chapter.id" class="ch" :class="{ 'ch--flip': flip }">
    <div class="ch__grid ows-shell">
      <figure :ref="setMedia" class="ch__media">
        <span class="ch__ghost ows-num" aria-hidden="true">{{ chapter.index }}</span>

        <div class="ch__frame">
          <ProductStage
            v-if="visual.kind === 'product'"
            :product="visual.product"
            :fallback-src="visual.src"
            :alt="visual.alt"
            :distance="1.14"
            :spin="0.1"
          />
          <ArcScene
            v-else-if="visual.kind === 'arc'"
            :mode="visual.mode ?? 'arc'"
            :depth="6"
            :density="3"
            :origin-y="0.6"
            :intensity="0.9"
          />
          <ParallaxImage
            v-else
            :src="visual.src"
            :alt="visual.alt"
            :depth="7"
            :scale="1.18"
            :scrim="0.1"
            :hairlines="false"
          />
        </div>
      </figure>

      <div class="ch__copy">
        <p class="ch__label" v-reveal>
          <span class="ch__index ows-num">{{ chapter.index }}</span>
          {{ chapter.label }}
        </p>
        <h2 class="ch__title" v-reveal="{ delay: 80 }">{{ chapter.title }}</h2>
        <p class="ch__body" v-reveal="{ delay: 160 }">{{ chapter.body }}</p>

        <RouterLink v-if="chapter.to" class="ch__cta" :to="chapter.to" v-reveal="{ delay: 240 }">
          {{ chapter.cta }}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12 H19 M13 6 L19 12 L13 18" />
          </svg>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ArcScene from './ArcScene.vue'
import ParallaxImage from './ParallaxImage.vue'
import ProductStage from './ProductStage.vue'
import { useParallax } from '../composables/useParallax'

/*
  One chapter of the home page's argument.

  The visual is chosen by the chapter's own data rather than by a switch in the
  page, so a new chapter is a new entry in data/site.js and nothing else. Three
  kinds cover the spine: a real 3D product, the live arc, and a still.

  Chapters alternate sides. The media column drifts against the scroll and the
  index ghost drifts further, which is what gives the section depth without
  moving the text the reader is trying to read.
*/
const props = defineProps({
  chapter: { type: Object, required: true },
  flip: { type: Boolean, default: false },
})

const visual = computed(() => props.chapter.visual ?? { kind: 'still', src: '/unibraze/plate.svg', alt: '' })

const media = useParallax()
const setMedia = (el) => (media.value = el)
</script>

<style scoped>
.ch {
  padding-block: clamp(3.5rem, 12vh, 8rem);
  border-top: 1px solid var(--ows-line-soft);
}

.ch__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(2rem, 6vw, 5rem);
  align-items: center;
}

.ch--flip .ch__media {
  order: 2;
}

.ch__media {
  position: relative;
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * -4vh), 0);
}

/* The chapter number, oversized and nearly invisible behind the frame. It is
   the only place on the site where type is used as texture. */
.ch__ghost {
  position: absolute;
  top: -0.35em;
  left: -0.12em;
  z-index: 0;
  font-family: var(--ows-display);
  font-size: clamp(7rem, 18vw, 15rem);
  font-weight: var(--ows-display-weight);
  line-height: 0.8;
  letter-spacing: -0.02em;
  color: var(--ows-ink);
  opacity: 0.035;
  pointer-events: none;
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * 5vh), 0);
}

/* Aspect-ratio rather than a height: ProductStage and ArcScene both fill their
   host absolutely, so the frame has to have a size of its own. */
.ch__frame {
  position: relative;
  z-index: 1;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--ows-line-soft);
  background: var(--ows-void);
}

.ch__label {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink);
}

.ch__index {
  color: var(--ows-red);
}

.ch__title {
  margin-top: 1.5rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: var(--ows-ink);
  text-wrap: balance;
}

.ch__body {
  margin-top: 1.375rem;
  max-width: 44ch;
  font-size: var(--ows-t-lead);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.ch__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding: 0.5rem 0;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink);
  border-bottom: 1px solid var(--ows-line);
  transition: border-color var(--ows-fast) var(--ows-ease);
}

.ch__cta:hover {
  border-bottom-color: var(--ows-red);
}

.ch__cta svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-fast) var(--ows-ease);
}

.ch__cta:hover svg {
  transform: translateX(0.3rem);
}

@media (max-width: 58rem) {
  .ch__grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  /* Media first in every chapter once stacked — alternating sides only reads
     as rhythm side by side; stacked it just looks inconsistent. */
  .ch--flip .ch__media {
    order: 0;
  }

  .ch__ghost {
    font-size: clamp(5rem, 26vw, 9rem);
  }
}
</style>

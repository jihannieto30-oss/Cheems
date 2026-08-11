<template>
  <!-- Single root element, required: OwsApp wraps <RouterView> in a
       <Transition>, which silently renders nothing when its child is a
       multi-root fragment — and the dev-only warning is stripped from the
       production build, so it fails invisibly. -->
  <div class="home">
    <section class="hero">
      <!-- Three planes, each moving at its own rate against the pointer and
           the scroll. The parallax is what turns a flat black frame into a
           place you are standing in. -->
      <div :ref="setFar" class="hero__far" aria-hidden="true">
        <StandardsCascade :depth="20" :density="0.5" :intensity="0.55" />
      </div>

      <!-- The arc, burning behind the mark. It is not decoration: the logo is
           black and needs something bright to be a silhouette against. -->
      <HeroScene :seam-y="0.63" :bloom-y="0.44" :key-light="0.5" :parallax="30" />

      <span class="hero__vignette" aria-hidden="true" />
      <span class="hero__horizon" aria-hidden="true" />

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" tone="ink" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.descriptor }}</span>
        </h1>

        <div class="hero__field">
          <SearchField
            size="lg"
            placeholder="Escriba una designación"
            placeholder-short="Escriba una designación"
          />
        </div>
      </div>

      <!-- A single index in the margin, the whole of the interface furniture. -->
      <div class="hero__rail" aria-hidden="true">
        <span class="ows-num">01</span>
        <span class="hero__rail-line" />
      </div>
    </section>
  </div>
</template>

<script setup>
import StandardsCascade from '../components/StandardsCascade.vue'
import HeroScene from '../components/HeroScene.vue'
import SearchField from '../components/SearchField.vue'
import OwsMark from '../components/OwsMark.vue'
import { BRAND } from '../brand'
import { useParallax } from '../composables/useParallax'

const far = useParallax()
const setFar = (el) => (far.value = el)

/*
  One screen, and nothing under it.

  The narrative that used to run below — metal becomes material becomes a
  joint — was marketing about the subject. What is actually sold here is the
  index, and the index is reached through one field. Everything that was not
  the mark, the field and the standards falling behind them has been removed;
  the material that was worth keeping now lives on the pages that cover it.
*/
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: calc(var(--ows-nav-h) + 2rem) var(--ows-gutter) clamp(3rem, 10vh, 6rem);
  overflow: hidden;
  isolation: isolate;
  background: var(--ows-void);
}

/* Closes the corners down so the centre is the only lit part of the frame. */
.hero__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(58% 48% at 50% 44%, rgb(255 255 255 / 0.045), transparent 70%),
    radial-gradient(120% 90% at 50% 45%, transparent 30%, rgb(0 0 0 / 0.85) 100%);
}

/*
  The horizon: one enormous circle sitting mostly below the fold, so only the
  top of its arc is in frame. It is what gives the black a floor and a scale —
  without it the page is a void rather than a place.
*/
.hero__horizon {
  position: absolute;
  left: 50%;
  /* The circle is three viewport-widths across, so its top has to be placed
     against the bottom edge explicitly — left to its own height it lands far
     above the fold and nothing is drawn on screen at all. */
  width: 300vw;
  aspect-ratio: 1;
  bottom: calc(22vh - 300vw);
  transform: translateX(-50%);
  border-radius: 50%;
  border-top: 1px solid rgb(255 255 255 / 0.14);
  box-shadow:
    0 -1px 90px rgb(255 255 255 / 0.055),
    inset 0 2px 60px rgb(255 255 255 / 0.02);
  pointer-events: none;
}

.hero__center {
  position: relative;
  z-index: var(--ows-z-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.hero__mark {
  display: block;
  opacity: 0;
  animation: rise 1.4s var(--ows-ease) 240ms forwards;
}

/* The far plane drifts the least, and against the scroll rather than with it. */
.hero__far {
  position: absolute;
  inset: -8%;
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * -3vh), 0);
}

.hero__field {
  width: min(100%, 27rem);
  margin-top: clamp(2.5rem, 7vh, 4.5rem);
  opacity: 0;
  animation: rise 1.2s var(--ows-ease) 1s forwards;
}

/*
  The field loses its box here. A bordered control is the right shape on the
  results page, where it sits in a working interface; on this screen it is the
  only object beside the mark, and a rule under it is enough.
*/
.hero__field :deep(.field__form) {
  /* The height moves from the wrapper onto the input itself. The shared
     control sets `height: 100%` on its input, which collapses to a 14px line
     the moment the wrapper stops declaring one — and a 14px tap target is not
     a control anyone can hit. */
  height: auto;
  padding: 0.15rem 0.25rem;
  background: transparent;
  backdrop-filter: none;
  border: 0;
  border-bottom: 1px solid rgb(255 255 255 / 0.16);
  gap: 0.875rem;
}

.hero__field :deep(.field__form:hover) {
  border-bottom-color: rgb(255 255 255 / 0.3);
}

.hero__field :deep(.is-focused .field__form) {
  background: transparent;
  border-bottom-color: rgb(255 255 255 / 0.55);
}

.hero__field :deep(.field__input) {
  height: 2.75rem;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  text-align: center;
}

.hero__field :deep(.field__icon) {
  width: 1rem;
  height: 1rem;
}

.hero__rail {
  position: absolute;
  left: var(--ows-gutter);
  top: 50%;
  transform: translateY(-50%);
  z-index: var(--ows-z-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  opacity: 0;
  animation: fade 1.6s var(--ows-ease) 1.3s forwards;
}

.hero__rail-line {
  width: 1px;
  height: clamp(3rem, 12vh, 7rem);
  background: linear-gradient(to bottom, rgb(255 255 255 / 0.22), transparent);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fade {
  to {
    opacity: 1;
  }
}

@media (max-width: 46rem) {
  .hero__rail {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__mark,
  .hero__field,
  .hero__rail {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>

<template>
  <!-- Single root element, required: OwsApp wraps <RouterView> in a
       <Transition>, which silently renders nothing when its child is a
       multi-root fragment — and the dev-only warning is stripped from the
       production build, so it fails invisibly. -->
  <div class="home">
    <section class="hero">
      <!-- The standards, falling. They are the only thing behind the mark and
           they are held almost to the threshold of visibility: read as weather,
           not as text. -->
      <StandardsCascade :depth="14" :density="0.45" :intensity="0.5" />

      <span class="hero__vignette" aria-hidden="true" />
      <span class="hero__horizon" aria-hidden="true" />

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" tone="metal" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.descriptor }}</span>
        </h1>

        <!-- The one bright thing on the page. An anamorphic streak under the
             mark, the way a lens renders a light source just out of frame. -->
        <span class="hero__flare" aria-hidden="true" />

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
import SearchField from '../components/SearchField.vue'
import OwsMark from '../components/OwsMark.vue'
import { BRAND } from '../brand'

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

.hero__flare {
  position: relative;
  display: block;
  width: min(52vw, 21rem);
  height: 1px;
  margin-top: clamp(1.75rem, 4.5vh, 2.75rem);
  background: linear-gradient(
    90deg,
    transparent,
    rgb(255 255 255 / 0.16) 22%,
    rgb(255 255 255 / 0.9) 50%,
    rgb(255 255 255 / 0.16) 78%,
    transparent
  );
  opacity: 0;
  animation: flare 1.8s var(--ows-ease) 700ms forwards;
}

/*
  The bloom is a separate element rather than a box-shadow on the line. A
  shadow on a one-pixel box spreads in every direction equally and the streak
  reads as a soft grey bar; the glow has to be wide and flat to read as light
  coming off a line.
*/
.hero__flare::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46%;
  height: 5rem;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    closest-side,
    rgb(255 255 255 / 0.3),
    rgb(210 226 255 / 0.09) 45%,
    transparent 75%
  );
  pointer-events: none;
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

@keyframes flare {
  from {
    opacity: 0;
    transform: scaleX(0.4);
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
  .hero__flare,
  .hero__field,
  .hero__rail {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>

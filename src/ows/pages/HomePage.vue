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
        <StandardsCascade :depth="20" :density="1" :intensity="0.3" />
      </div>

      <!-- Key light only. The mark is metal now and reads on its own, so the
           scene here is the lighting the object sits in — the arc itself is
           held back for the search transition, where it is the whole point. -->
      <HeroScene :arc="false" :bloom-y="0.4" :bloom-w="720" :key-light="0.62" :parallax="30" />

      <span class="hero__vignette" aria-hidden="true" />
      <span class="hero__horizon" aria-hidden="true" />

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" tone="metal" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.descriptor }}</span>
        </h1>

        <p class="hero__welcome">{{ BRAND.welcome }}</p>

        <div class="hero__field">
          <SearchField
            luxe
            launch
            size="lg"
            placeholder="Escriba su destinación…"
            placeholder-short="Escriba su destinación…"
            @launch="onLaunch"
          />
        </div>

        <!-- The light the field throws on the floor. A separate plane, because
             the pool is cast on the ground and does not move with the object. -->
        <span class="hero__pool" aria-hidden="true" />
      </div>

      <!-- Furniture: an index at one corner, three words at the foot. Nothing
           else, and both set to disappear until looked for. -->
      <div class="hero__rail" aria-hidden="true">
        <span class="ows-num">01</span>
        <span class="hero__rail-line" />
      </div>

      <!-- The bridge. Mounted always, inert until a search is launched. -->
      <SearchLaunch ref="launcher" />

      <p class="hero__creed" aria-hidden="true">
        <span>CALIDAD</span><i /><span>PRECISIÓN</span><i /><span>INNOVACIÓN</span>
      </p>

    </section>
  </div>
</template>

<script setup>
import StandardsCascade from '../components/StandardsCascade.vue'
import HeroScene from '../components/HeroScene.vue'
import SearchField from '../components/SearchField.vue'
import OwsMark from '../components/OwsMark.vue'
import SearchLaunch from '../components/SearchLaunch.vue'
import { BRAND, resolveDestination } from '../brand'
import { useParallax } from '../composables/useParallax'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const far = useParallax()
const setFar = (el) => (far.value = el)

const router = useRouter()
const launcher = ref(null)

/*
  A search leaves through the transition, not through a route change.

  Where the query resolves to an external destination the page is handed over
  to it; where it does not — which is every query today, because no
  destinations are configured — it lands on the internal index. Either way the
  navigation happens after the screen has gone black.
*/
function onLaunch(q) {
  const dest = resolveDestination(q)
  const go = () =>
    dest ? window.location.assign(dest.url) : router.push({ name: 'search', query: { q } })

  if (launcher.value?.play) launcher.value.play(dest?.label ?? q, go)
  else go()
}

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
    radial-gradient(110% 82% at 50% 42%, transparent 22%, rgb(0 0 0 / 0.93) 100%);
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
  animation: rise 1.6s var(--ows-ease) 280ms forwards;
}

/* The only sentence on the screen. */
.hero__welcome {
  margin-top: clamp(1.75rem, 4.5vh, 2.75rem);
  font-size: var(--ows-t-micro);
  font-weight: 300;
  letter-spacing: 0.62em;
  text-transform: uppercase;
  color: var(--ows-ink-muted);
  /* Cancels the trailing space wide tracking leaves after the last glyph. */
  margin-right: -0.62em;
  opacity: 0;
  animation: rise 1.4s var(--ows-ease) 700ms forwards;
}

/* The far plane drifts the least, and against the scroll rather than with it. */
.hero__far {
  position: absolute;
  inset: -8%;
  transform: translate3d(0, calc(var(--p, 0) * var(--ows-parallax) * -3vh), 0);
}

.hero__field {
  width: min(100%, 46rem);
  margin-top: clamp(2.25rem, 6vh, 3.5rem);
  opacity: 0;
  animation: rise 1.3s var(--ows-ease) 1s forwards;
}

/*
  The floor. A wide, very flat ellipse of light under the field, with a
  hairline at its top edge — the object is sitting on a polished surface and
  this is what the surface does with the light above it.
*/
.hero__pool {
  width: min(84vw, 62rem);
  height: clamp(6rem, 16vh, 11rem);
  margin-top: clamp(1.5rem, 4vh, 3rem);
  pointer-events: none;
  background:
    radial-gradient(50% 42% at 50% 0%, rgb(255 255 255 / 0.11), transparent 72%),
    radial-gradient(28% 100% at 50% 0%, rgb(255 255 255 / 0.07), transparent 70%);
  opacity: 0;
  animation: fade 2s var(--ows-ease) 1.3s forwards;
}

.hero__rail {
  position: absolute;
  left: var(--ows-gutter);
  bottom: clamp(2rem, 6vh, 3.5rem);
  z-index: var(--ows-z-content);
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  opacity: 0;
  animation: fade 1.8s var(--ows-ease) 1.6s forwards;
}

.hero__rail-line {
  width: clamp(2.5rem, 6vw, 5rem);
  height: 1px;
  background: linear-gradient(to right, rgb(255 255 255 / 0.24), transparent);
}

.hero__creed {
  position: absolute;
  left: 50%;
  bottom: clamp(2rem, 6vh, 3.5rem);
  transform: translateX(-50%);
  z-index: var(--ows-z-content);
  display: flex;
  align-items: center;
  gap: 1.25rem;
  white-space: nowrap;
  font-size: var(--ows-t-micro);
  font-weight: 300;
  letter-spacing: 0.42em;
  color: var(--ows-ink-faint);
  opacity: 0;
  animation: fade 1.8s var(--ows-ease) 1.8s forwards;
}

.hero__creed i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ows-red);
  opacity: 0.85;
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

@media (max-width: 62rem) {
  /* The index and the creed share the same line; below this they would
     collide, and the index is the one that can be spared. */
  .hero__rail {
    display: none;
  }
}

@media (max-width: 32rem) {
  .hero__creed {
    gap: 0.75rem;
    letter-spacing: 0.24em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__mark,
  .hero__welcome,
  .hero__field,
  .hero__pool,
  .hero__creed,
  .hero__rail {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>

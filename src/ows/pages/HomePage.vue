<template>
  <!-- Single root element, required: OwsApp wraps <RouterView> in a
       <Transition>, which silently renders nothing when its child is a
       multi-root fragment — and the dev-only warning is stripped from the
       production build, so it fails invisibly. -->
  <div class="home">
    <section :ref="setStage" class="hero">
      <!-- Every plane takes a different share of the head's movement: the
           standards drift with it, the seam and everything in front of it pull
           against it, and the two solid objects turn on their own axes as
           well. That spread is the whole of what turns a flat black frame
           into a place you are standing in. -->
      <div :ref="setFar" class="hero__far" aria-hidden="true">
        <StandardsCascade :depth="20" :density="0.95" :intensity="0.78" />
      </div>

      <span class="hero__vignette" aria-hidden="true" />

      <!--
        The light, and the joint under it. After the vignette rather than
        before it, because the vignette's business is the standards falling at
        the back of the room — the seam is in the room, and closing the corners
        down on it would put the one thing happening on this screen in shadow.

        The bloom sits on the mark rather than in the middle of the frame: the
        artwork is ramped as though lit from above, and that only reads as one
        layer if the wash behind it actually is above.
      -->
      <HeroScene :apex="0.78" :bloom-y="0.32" :key-light="1" :parallax="34" />

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" tone="ink" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.descriptor }}</span>
        </h1>

        <p class="hero__welcome">{{ BRAND.welcome }}</p>

        <div class="hero__field">
          <!-- No prompt. The field is the only control on the screen and it
               is shaped like one; a line of instruction inside it is the kind
               of thing the rest of this page was stripped of. -->
          <SearchField
            luxe
            launch
            size="lg"
            placeholder=""
            placeholder-short=""
            @launch="onLaunch"
          />
        </div>

        <!-- The light the field throws on the floor. A separate plane, because
             the pool is cast on the ground and does not move with the object. -->
        <span class="hero__pool" aria-hidden="true" />
      </div>

      <!-- The only furniture left: a section index in one corner, set to
           disappear until it is looked for. -->
      <div class="hero__rail" aria-hidden="true">
        <span class="ows-num">01</span>
        <span class="hero__rail-line" />
      </div>

      <!-- The bridge. Mounted always, inert until a search is launched. -->
      <SearchLaunch ref="launcher" />

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
import { usePointerDepth } from '../composables/usePointerDepth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const far = useParallax()
const setFar = (el) => (far.value = el)

/*
  The head. Writes --mx / --my on the section; every layer inside reads them at
  its own depth. Held on the section rather than on each layer so the whole
  frame is driven by one number pair and cannot come apart.
*/
const stage = usePointerDepth()
const setStage = (el) => (stage.value = el)

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
    radial-gradient(115% 86% at 50% 44%, transparent 26%, rgb(0 0 0 / 0.9) 100%);
}

/*
  The horizon used to be a CSS element here — one enormous circle sitting
  mostly below the fold. It is drawn in the scene canvas now, because it stopped
  being a horizon: it is the seam being welded, and a line that has to be white
  behind the arc and two dim edges ahead of it is not something a border can be.
*/

.hero__center {
  position: relative;
  z-index: var(--ows-z-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/*
  Depth, declared per layer.

  --px / --py are how far this layer travels with the head, --rx / --ry how far
  it turns. Sign is what separates the planes: the standards behind drift with
  the movement, everything in front of them pulls against it, and the further
  forward a layer is the harder it pulls. The two solid objects — the mark and
  the field — also turn a degree or two on their own axes, which is what makes
  them read as plates standing in the room rather than pictures of plates.

  Every term is multiplied by --ows-parallax, which reduced motion sets to 0.
*/
.hero__mark {
  --px: calc(var(--mx, 0) * var(--ows-parallax) * -13px);
  --py: calc(var(--my, 0) * var(--ows-parallax) * -9px);
  --ry: calc(var(--mx, 0) * var(--ows-parallax) * -2.4deg);
  --rx: calc(var(--my, 0) * var(--ows-parallax) * 1.7deg);
  display: block;
  opacity: 0;
  animation: rise 1.6s var(--ows-ease) 280ms forwards;
}

/* The only sentence on the screen. */
.hero__welcome {
  --px: calc(var(--mx, 0) * var(--ows-parallax) * -17px);
  --py: calc(var(--my, 0) * var(--ows-parallax) * -11px);
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

/*
  The far plane. It drifts with the head rather than against it — that opposite
  sign is what reads as distance — and takes the scroll the other way.
*/
.hero__far {
  position: absolute;
  inset: -8%;
  transform: translate3d(
    calc(var(--mx, 0) * var(--ows-parallax) * 24px),
    calc(var(--my, 0) * var(--ows-parallax) * 15px + var(--p, 0) * var(--ows-parallax) * -3vh),
    0
  );
}

.hero__field {
  --px: calc(var(--mx, 0) * var(--ows-parallax) * -24px);
  --py: calc(var(--my, 0) * var(--ows-parallax) * -15px);
  --ry: calc(var(--mx, 0) * var(--ows-parallax) * -1.6deg);
  --rx: calc(var(--my, 0) * var(--ows-parallax) * 1deg);
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
  /* Nearest plane in the frame, so it takes the most travel. */
  transform: translate3d(
    calc(var(--mx, 0) * var(--ows-parallax) * -32px),
    calc(var(--my, 0) * var(--ows-parallax) * -19px),
    0
  );
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
  transform: translate3d(
    calc(var(--mx, 0) * var(--ows-parallax) * -20px),
    calc(var(--my, 0) * var(--ows-parallax) * -12px),
    0
  );
  opacity: 0;
  animation: fade 1.8s var(--ows-ease) 1.6s forwards;
}

.hero__rail-line {
  width: clamp(2.5rem, 6vw, 5rem);
  height: 1px;
  background: linear-gradient(to right, rgb(255 255 255 / 0.24), transparent);
}

/*
  Entry, and the resting pose, in one declaration.

  The pointer offsets have to live inside the keyframes: an element can only
  have one transform, and these elements need both the entry lift and the
  parallax. Reading them as custom properties works because a running or
  filled animation re-resolves var() whenever the property changes — so the
  `to` frame, held by `forwards`, keeps tracking the head after the entry has
  finished. Every term defaults to zero, so a layer that declares no depth
  animates exactly as it did before.
*/
@keyframes rise {
  from {
    opacity: 0;
    transform: perspective(1400px)
      translate3d(var(--px, 0px), calc(var(--py, 0px) + 1.25rem), 0)
      rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
  }
  to {
    opacity: 1;
    transform: perspective(1400px) translate3d(var(--px, 0px), var(--py, 0px), 0)
      rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
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
  .hero__welcome,
  .hero__field,
  .hero__pool,
  .hero__rail {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>

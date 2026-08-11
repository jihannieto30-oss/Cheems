<template>
  <!-- Single root element, required: OwsApp wraps <RouterView> in a
       <Transition>, which silently renders nothing when its child is a
       multi-root fragment — and the dev-only warning is stripped from the
       production build, so it fails invisibly. -->
  <div class="home">
    <!-- ── 01 · HERO ───────────────────────────────────────────────────────
         Four things and a weld. The mark is the headline, one line names the
         place, the field is the only control, and the seam runs along the
         bottom edge. Everything else that used to be here was subtracted. -->
    <section class="hero">
      <SeamScene :seam-y="0.8" :intensity="0.95" />

      <!-- A soft ground under the centre, so the mark is not competing with
           the light coming off the arc. -->
      <span class="hero__veil" aria-hidden="true" />

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.descriptor }}</span>
        </h1>
        <p class="hero__tagline">{{ BRAND.welcome }}</p>

        <div class="hero__field">
          <!-- Short enough for a phone already, so both variants are the same
               line — otherwise the hero's prompt changes wording at 46rem. -->
          <SearchField
            size="lg"
            placeholder="Escriba una designación…"
            placeholder-short="Escriba una designación…"
          />
        </div>
      </div>

      <!-- A button rather than an anchor: in the single-file build the router
           is in hash mode, and a fragment link would overwrite the route. -->
      <button class="hero__cue" type="button" @click="toContent">
        <span>DESLICE</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9 L12 15 L18 9" /></svg>
      </button>
    </section>

  <!-- ── 02 · THE SPINE ──────────────────────────────────────────────
       Six chapters, metal to result. Each carries its own visual, chosen by
       its data, so the narrative is edited in data/site.js and not here. -->
  <HomeChapter
    v-for="(chapter, i) in opening"
    :key="chapter.id"
    :chapter="chapter"
    :flip="i % 2 === 1"
  />

  <!-- The scene the reader scrolls through rather than past. It sits where
       the argument turns from what the material is to what is done with it. -->
  <WeldScene eyebrow="04 · EL ARCO" :stages="WELD_STAGES" />

  <HomeChapter
    v-for="(chapter, i) in closing"
    :key="chapter.id"
    :chapter="chapter"
    :flip="(i + opening.length) % 2 === 1"
  />

  <!-- ── 03 · POSITION ─────────────────────────────────────────────────── -->
  <section class="creed">
    <div class="creed__inner ows-shell" v-reveal>
      <hr class="ows-tick" />
      <h2 class="creed__title">
        HECHO PARA SOLDADORES.<br />
        MOVIDO POR LA PRECISIÓN.<br />
        ENFOCADO EN SOLUCIONES.
      </h2>
      <p class="creed__body">
        {{ CATALOG_TOTAL }} designaciones indexadas contra AWS, EN ISO, DIN, JIS y ASME SFA.
        Un solo campo de búsqueda, todas las normas.
      </p>
    </div>
  </section>

  <NextPage
    eyebrow="Empezar"
    title="Diga qué tiene que unir"
    lead="Espesor, metal base, proceso disponible y qué tiene que aguantar la unión. Con esos cuatro datos la recomendación deja de ser una lista de opciones."
    :to="PAGES.contact.to"
  />
  </div>
</template>

<script setup>
import SeamScene from '../components/SeamScene.vue'
import SearchField from '../components/SearchField.vue'
import OwsMark from '../components/OwsMark.vue'
import HomeChapter from '../components/HomeChapter.vue'
import NextPage from '../components/NextPage.vue'
import WeldScene from '../components/WeldScene.vue'
import { CHAPTERS, PAGES, WELD_STAGES } from '../data/site'
import { CATALOG_TOTAL } from '../data/catalog'
import { BRAND } from '../brand'

// The spine is split around the weld scene: three chapters build up to the
// arc, three follow from it. The flip pattern is carried across the break so
// the alternation does not restart.
const SPLIT = 3
const opening = CHAPTERS.slice(0, SPLIT)
const closing = CHAPTERS.slice(SPLIT)

// The cue scrolls to the first chapter by id rather than by a fixed offset, so
// it keeps working when the hero's height changes with the viewport.
function toContent() {
  document.getElementById(CHAPTERS[0].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

</script>

<style scoped>
/* ---- hero ---- */

.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: calc(var(--ows-nav-h) + 2rem) var(--ows-gutter) 3.5rem;
  overflow: hidden;
  isolation: isolate;
}

/* Lifted above the two live canvases. */
.hero__center,
.hero__cue {
  position: relative;
  z-index: var(--ows-z-content);
}

.hero__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1.5rem, 3.5vh, 2.5rem);
  margin-block: auto;
  width: 100%;
}

/* Sized in vmax so it stays a pool of light around the centre at any aspect,
   rather than a band that turns into a stripe on a wide monitor. */
.hero__veil {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120vmax;
  height: 120vmax;
  transform: translate(-50%, -55%);
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.82), rgb(0 0 0 / 0.4) 55%, transparent);
  pointer-events: none;
}

.hero__mark {
  display: block;
  opacity: 0;
  animation: rise 1.2s var(--ows-ease) 200ms forwards;
}

.hero__tagline {
  margin-top: -0.75rem;
  font-size: var(--ows-t-meta);
  font-weight: 400;
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink-muted);
  text-align: center;
  /* Cancels the trailing space letter-spacing adds after the final glyph, so
     the line is optically centred rather than sitting slightly left. */
  margin-right: calc(var(--ows-track-label) * -1);
  opacity: 0;
  animation: rise 1.1s var(--ows-ease) 360ms forwards;
}

.hero__field {
  width: min(100%, 44rem);
  opacity: 0;
  animation: rise 1.1s var(--ows-ease) 500ms forwards;
}

/* Lifts the field off the arc behind it. The shadow is what makes it read as
   the one thing on the page you are meant to touch. */
.hero__field :deep(.field__form) {
  box-shadow: 0 1.5rem 3.5rem rgb(0 0 0 / 0.6);
}

.hero__field :deep(.is-focused .field__form) {
  box-shadow:
    0 1.5rem 3.5rem rgb(0 0 0 / 0.6),
    0 0 0 1px var(--ows-red-dim);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/*
  The only thing below the fold line.

  Set to the gutter rather than centred: the cut sits at bottom centre and is
  the brightest thing on the page, so a label there is unreadable and fights
  the one image the hero is built around.
*/
.hero__cue {
  align-self: flex-start;
  margin-left: calc(var(--ows-gutter) - 1.25rem);
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: none;
  border: 0;
  color: var(--ows-ink-faint);
  font: inherit;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  cursor: pointer;
  opacity: 0;
  animation: fade 1.4s var(--ows-ease) 900ms forwards;
  transition: color var(--ows-fast) var(--ows-ease);
}

.hero__cue:hover {
  color: var(--ows-ink);
}

.hero__cue svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: nudge 2.4s var(--ows-ease-io) infinite;
}

@keyframes fade {
  to {
    opacity: 1;
  }
}

@keyframes nudge {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(0.28rem);
  }
}

/* ---- creed ---- */

.creed {
  position: relative;
  z-index: var(--ows-z-content);
  padding-block: clamp(4rem, 14vh, 9rem);
  border-top: 1px solid var(--ows-line-soft);
  background: var(--ows-surface);
}

.creed__title {
  margin-top: 1.75rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h3);
  font-weight: var(--ows-display-weight);
  line-height: 1.15;
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.creed__body {
  margin-top: 1.75rem;
  max-width: 48ch;
  font-size: var(--ows-t-lead);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

@media (max-width: 46rem) {
  .hero__nomen {
    gap: 0.375rem 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__mark,
  .hero__tagline,
  .hero__field,
  .hero__nomen,
  .hero__cue {
    opacity: 1;
    animation: none;
    transform: none;
  }

  .hero__cue svg {
    animation: none;
  }
}
</style>

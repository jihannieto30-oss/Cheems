<template>
  <!-- Single root element, required: OwsApp wraps <RouterView> in a
       <Transition>, which silently renders nothing when its child is a
       multi-root fragment — and the dev-only warning is stripped from the
       production build, so it fails invisibly. -->
  <div class="home">
    <!-- ── 01 · HERO ───────────────────────────────────────────────────────
         Laid out like a search engine's front door: the mark is the headline,
         the field sits directly under it, and the only other thing on screen
         is the nomenclature the field accepts. -->
    <section class="hero">
      <!--
        Order matters. ArcScene paints on an opaque canvas — it needs one for
        the frame-fade that draws the spark trails — so it must sit at the
        back, or it blacks out anything layered beneath it. The cascade's
        canvas is transparent and clears each frame, so it goes on top: the
        standards fall through the arc light rather than behind it.
      -->
      <ArcScene mode="cut" :depth="10" :density="5" :origin-y="0.8" :intensity="0.9" />
      <StandardsCascade :depth="16" />

      <div class="hero__rail" aria-hidden="true">
        <span class="hero__rail-num ows-num">01</span>
        <span class="hero__rail-line" />
        <span class="hero__rail-word">DESLICE</span>
      </div>

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" />
          <span class="ows-sr">{{ BRAND.code }} — {{ BRAND.name }}</span>
        </h1>
        <p class="hero__tagline">{{ BRAND.welcome }}</p>

        <div class="hero__field">
          <SearchField size="lg" placeholder="Escriba una designación…" />
        </div>

        <!-- The nomenclature line is the whole proposition: one field, every
             standard. It replaces any sentence explaining what this is. -->
        <div class="hero__nomen">
          <p class="hero__nomen-label">NOMENCLATURA ACEPTADA</p>
          <ul class="hero__nomen-list">
            <li v-for="s in standards" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>

      <div class="hero__foot ows-shell">
        <span class="hero__ticks" aria-hidden="true"><i /><i /></span>
        <span class="hero__claim">// CONOCIMIENTO TÉCNICO. SOLUCIONES REALES.</span>
      </div>
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
import ArcScene from '../components/ArcScene.vue'
import StandardsCascade from '../components/StandardsCascade.vue'
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

// The standards the index resolves against — the same set that falls in the
// cascade behind the hero.
const standards = ['AWS', 'EN ISO', 'DIN', 'JIS', 'CN', 'W.Nr', 'AISI', 'CWB', 'ASME SFA', 'ASTM']

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

/* Lifted individually, not with a blanket `> :not(.scene)` rule — that would
   overwrite the rail's own `position: absolute` and drop it into flow. */
.hero__center,
.hero__foot {
  position: relative;
  z-index: var(--ows-z-content);
}

.hero__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-block: auto;
  width: 100%;
}

.hero__mark {
  display: block;
  opacity: 0;
  animation: rise 1.2s var(--ows-ease) 200ms forwards;
}

.hero__tagline {
  margin-top: -0.5rem;
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
  width: min(100%, 46rem);
  opacity: 0;
  animation: rise 1.1s var(--ows-ease) 500ms forwards;
}

.hero__nomen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  opacity: 0;
  animation: rise 1.1s var(--ows-ease) 660ms forwards;
}

.hero__nomen-label {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
}

.hero__nomen-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem 0.875rem;
  max-width: 46rem;
}

.hero__nomen-list li {
  font-size: var(--ows-t-meta);
  letter-spacing: 0.14em;
  color: var(--ows-ink-muted);
  position: relative;
}

/* Hairline separators between designations, none after the last. */
.hero__nomen-list li:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -0.5rem;
  top: 0.35em;
  bottom: 0.35em;
  width: 1px;
  background: var(--ows-line);
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

/* Left rail: section number over a rule, with SCROLL set vertically. */
.hero__rail {
  position: absolute;
  left: var(--ows-gutter);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: var(--ows-z-content);
}

.hero__rail-num {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-muted);
}

.hero__rail-line {
  width: 1px;
  height: clamp(4rem, 14vh, 9rem);
  background: linear-gradient(to bottom, var(--ows-line-strong), transparent);
}

.hero__rail-word {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
  writing-mode: vertical-rl;
}

.hero__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  opacity: 0;
  animation: fade 1.4s var(--ows-ease) 900ms forwards;
}

@keyframes fade {
  to {
    opacity: 1;
  }
}

.hero__ticks {
  display: flex;
  gap: 0.5rem;
}
.hero__ticks i {
  width: 1.75rem;
  height: 1px;
  background: var(--ows-line-strong);
}
.hero__ticks i:first-child {
  background: var(--ows-red);
}

.hero__claim {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-muted);
  text-align: right;
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
  .hero__rail {
    display: none;
  }
  .hero__claim {
    font-size: 0.5625rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__mark,
  .hero__tagline,
  .hero__field,
  .hero__nomen,
  .hero__foot {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>

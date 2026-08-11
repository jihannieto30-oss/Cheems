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
        <span class="hero__rail-word">SCROLL</span>
      </div>

      <div class="hero__center">
        <h1 class="hero__mark">
          <OwsMark size="hero" />
          <span class="ows-sr">OWS — Online Welding Supply</span>
        </h1>
        <p class="hero__tagline">WELCOME TO A NEW WORLD</p>

        <div class="hero__field">
          <SearchField size="lg" placeholder="Enter welding designation…" />
        </div>

        <!-- The nomenclature line is the whole proposition: one field, every
             standard. It replaces any sentence explaining what this is. -->
        <div class="hero__nomen">
          <p class="hero__nomen-label">TYPE NOMENCLATURE</p>
          <ul class="hero__nomen-list">
            <li v-for="s in standards" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>

      <div class="hero__foot ows-shell">
        <span class="hero__ticks" aria-hidden="true"><i /><i /></span>
        <span class="hero__claim">// EXPERT KNOWLEDGE. REAL SOLUTIONS.</span>
      </div>
    </section>

  <!-- ── 02 · WHAT IT DOES ─────────────────────────────────────────────── -->
  <section class="pillars">
    <div class="pillars__grid ows-shell">
      <article v-for="(p, i) in pillars" :key="p.title" class="pillar" v-reveal="{ delay: i * 110 }">
        <span class="pillar__icon" v-html="p.icon" aria-hidden="true" />
        <h2 class="pillar__title">{{ p.title }}</h2>
        <p class="pillar__body">{{ p.body }}</p>
        <RouterLink class="pillar__more" :to="p.to" :aria-label="p.title">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12 H19" />
            <path d="M13 6 L19 12 L13 18" />
          </svg>
        </RouterLink>
      </article>
    </div>
  </section>

  <!-- ── 03 · POSITION ─────────────────────────────────────────────────── -->
  <section class="creed">
    <div class="creed__grid ows-shell">
      <div class="creed__copy" v-reveal>
        <hr class="ows-tick" />
        <h2 class="creed__title">
          BUILT FOR WELDERS.<br />
          DRIVEN BY PRECISION.<br />
          FOCUSED ON SOLUTIONS.
        </h2>
        <p class="creed__body">
          OWS is the most advanced welding search engine, built for professionals who
          demand accuracy, speed and results.
        </p>
        <RouterLink class="creed__link" to="/about">
          ABOUT OWS
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12 H19" />
            <path d="M13 6 L19 12 L13 18" />
          </svg>
        </RouterLink>
      </div>

      <figure class="creed__media" v-reveal="{ delay: 120 }">
        <!-- A second, quieter instance of the same scene — the arc seen from
             across the shop rather than over the hood. -->
        <ArcScene :depth="7" :density="3" :origin-y="0.6" :intensity="0.85" />
      </figure>
    </div>
  </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import ArcScene from '../components/ArcScene.vue'
import StandardsCascade from '../components/StandardsCascade.vue'
import SearchField from '../components/SearchField.vue'
import OwsMark from '../components/OwsMark.vue'

// The standards the index resolves against — the same set that falls in the
// cascade behind the hero.
const standards = ['AWS', 'EN ISO', 'DIN', 'JIS', 'CN', 'W.Nr', 'AISI', 'CWB', 'ASME SFA', 'ASTM']

const pillars = [
  {
    title: 'SEARCH WITHOUT LIMITS',
    body: 'Ask anything about welding. Instant access to technical information and solutions.',
    to: '/search',
    icon: `<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 L21 21"/></svg>`,
  },
  {
    title: 'PRECISE RESULTS',
    body: 'Clear, technical and reliable information from verified sources.',
    to: '/browse/materials',
    icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5 V6 M12 18 V22.5 M1.5 12 H6 M18 12 H22.5"/><circle cx="12" cy="12" r="1.6"/></svg>`,
  },
  {
    title: 'REAL SOLUTIONS',
    body: 'Practical answers, proven in the real world. For every welder.',
    to: '/browse/guides',
    icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7.8 12.2 L10.7 15 L16.2 9.4"/></svg>`,
  },
]
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

/* ---- pillars ---- */

.pillars {
  position: relative;
  z-index: var(--ows-z-content);
  background: var(--ows-surface);
  border-block: 1px solid var(--ows-line-soft);
  padding-block: clamp(3.5rem, 9vh, 6rem);
}

.pillars__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: clamp(2rem, 5vw, 4rem);
}

.pillar {
  position: relative;
  padding-left: clamp(0rem, 3vw, 2.5rem);
  border-left: 1px solid var(--ows-line-soft);
}

.pillar:first-child {
  border-left: 0;
  padding-left: 0;
}

.pillar__icon :deep(svg) {
  width: 1.75rem;
  height: 1.75rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pillar__title {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--ows-ink);
}

.pillar__body {
  margin-top: 0.875rem;
  max-width: 30ch;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

/* Padding gives the link a 24px+ hit area; the negative margin keeps the arrow
   optically where it was. Same pattern wherever a target is icon-sized. */
.pillar__more {
  display: inline-block;
  margin-top: 1.25rem;
  padding: 0.375rem 0.5rem;
  margin-left: -0.5rem;
}

.pillar__more svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
}

.pillar__more:hover svg {
  transform: translateX(4px);
}

/* ---- creed ---- */

.creed {
  position: relative;
  z-index: var(--ows-z-content);
  padding-block: clamp(4rem, 12vh, 8rem);
}

.creed__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  align-items: center;
}

.creed__title {
  margin-top: 1.75rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  line-height: 1.14;
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.creed__body {
  margin-top: 1.5rem;
  max-width: 42ch;
  font-size: var(--ows-t-body);
  line-height: 1.75;
  color: var(--ows-ink-muted);
}

.creed__link {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-block: 0.4375rem;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-red);
}

.creed__link svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
}

.creed__link:hover svg {
  transform: translateX(4px);
}

.creed__media {
  position: relative;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--ows-line);
  overflow: hidden;
}

@media (max-width: 60rem) {
  .creed__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .pillar {
    border-left: 0;
    padding-left: 0;
    padding-top: 2rem;
    border-top: 1px solid var(--ows-line-soft);
  }
  .pillar:first-child {
    padding-top: 0;
    border-top: 0;
  }
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

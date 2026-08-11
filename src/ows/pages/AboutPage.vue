<template>
  <div class="page">
    <header class="head">
      <ArcScene :depth="8" :density="3" :origin-y="0.82" :intensity="0.8" />
      <div class="head__inner ows-shell">
        <OwsMark size="lg" orientation="v" />
        <p class="head__claim">KNOWLEDGE IS POWER</p>
      </div>
    </header>

    <section class="ows-shell body">
      <hr class="ows-tick" />
      <h1 class="body__title">
        BUILT FOR WELDERS.<br />DRIVEN BY PRECISION.<br />FOCUSED ON SOLUTIONS.
      </h1>

      <div class="body__cols">
        <p>
          OWS — Online Welding Supply — is a technical search engine for welding, fabrication
          and metallurgy. It exists for the person who already knows what they are looking
          for and wants the answer without wading through a catalogue.
        </p>
        <p>
          Every record is a working document: classification, composition, mechanical
          properties, parameters and the applications the consumable was actually designed
          for. Defects carry their diagnosis — cause vectors first, resolution second.
        </p>
      </div>

      <dl class="facts">
        <div v-for="f in facts" :key="f.k" class="fact">
          <dt class="fact__k">{{ f.k }}</dt>
          <dd class="fact__v ows-num">{{ f.v }}</dd>
        </div>
      </dl>

      <p class="body__sign ows-meta">CONOCIMIENTO QUE UNE. SOLUCIONES QUE PERDURAN.</p>
    </section>
  </div>
</template>

<script setup>
import ArcScene from '../components/ArcScene.vue'
import OwsMark from '../components/OwsMark.vue'
import { KNOWLEDGE, FACETS, SOLUTIONS } from '../data'

const facts = [
  { k: 'Records indexed', v: String(KNOWLEDGE.length).padStart(3, '0') },
  { k: 'Sections', v: String(FACETS.length).padStart(2, '0') },
  { k: 'Defects diagnosed', v: String(SOLUTIONS.length).padStart(2, '0') },
  { k: 'Established', v: '2024' },
]
</script>

<style scoped>
.page {
  padding-bottom: clamp(4rem, 12vh, 8rem);
}

.head {
  position: relative;
  min-height: 60svh;
  display: grid;
  place-items: center;
  padding-top: var(--ows-nav-h);
  overflow: hidden;
  isolation: isolate;
}

.head__inner {
  position: relative;
  z-index: var(--ows-z-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.head__claim {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-muted);
}

.body {
  position: relative;
  z-index: var(--ows-z-content);
  padding-top: clamp(3rem, 9vh, 5rem);
}

.body__title {
  margin-top: 1.75rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  line-height: 1.14;
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.body__cols {
  display: grid;
  /* min() guard: a bare minmax(20rem, …) is a hard floor, so at 320px the
     track alone exceeds the viewport and the page scrolls sideways. */
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: 2rem 3.5rem;
  margin-top: 2.5rem;
  max-width: 68rem;
}

.body__cols p {
  font-size: var(--ows-t-body);
  line-height: 1.8;
  color: var(--ows-ink-muted);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
  margin-top: clamp(2.5rem, 7vh, 4rem);
}

.fact {
  background: var(--ows-surface);
  padding: 1.25rem;
}

.fact__k {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.fact__v {
  margin-top: 0.5rem;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--ows-ink);
}

.body__sign {
  margin-top: clamp(2.5rem, 7vh, 4rem);
  padding-top: 1.5rem;
  border-top: 1px solid var(--ows-line-soft);
}
</style>

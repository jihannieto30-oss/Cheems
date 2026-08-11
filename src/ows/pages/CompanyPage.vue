<template>
  <div class="page">
    <header class="head">
      <ArcScene :depth="8" :density="3" :origin-y="0.82" :intensity="0.8" />
      <div class="head__inner ows-shell">
        <OwsMark size="lg" orientation="v" />
        <p class="head__claim">{{ BRAND.creed }}</p>
      </div>
    </header>

    <section class="ows-shell body">
      <hr class="ows-tick" />
      <h1 class="body__title">
        HECHO PARA SOLDADORES.<br />MOVIDO POR LA PRECISIÓN.<br />ENFOCADO EN SOLUCIONES.
      </h1>

      <div class="body__cols">
        <p>
          {{ BRAND.name }} es un índice técnico de soldadura, fabricación y metalurgia.
          Existe para quien ya sabe qué está buscando y quiere la respuesta sin
          atravesar un catálogo entero para llegar a ella.
        </p>
        <p>
          Cada registro es un documento de trabajo: clasificación, composición, propiedades
          mecánicas, parámetros y las aplicaciones para las que el consumible fue realmente
          diseñado. Los defectos traen su diagnóstico — primero la causa, después la solución.
        </p>
      </div>

      <dl class="facts">
        <div v-for="f in facts" :key="f.k" class="fact">
          <dt class="fact__k">{{ f.k }}</dt>
          <dd class="fact__v ows-num">{{ f.v }}</dd>
        </div>
      </dl>

      <p class="body__sign ows-meta">{{ BRAND.claim }}</p>
    </section>
    <NextPage
      eyebrow="Siguiente"
      title="Hablemos del trabajo"
      lead="Lo que resuelve un problema no es el catálogo, es la conversación sobre la junta."
      :to="PAGES.contact.to"
    />
  </div>
</template>

<script setup>
import ArcScene from '../components/ArcScene.vue'
import NextPage from '../components/NextPage.vue'
import { PAGES } from '../data/site'
import OwsMark from '../components/OwsMark.vue'
import { KNOWLEDGE, FACETS, SOLUTIONS } from '../data'
import { CATALOG_TOTAL } from '../data/catalog'
import { BRAND } from '../brand'

const facts = [
  { k: 'Designaciones', v: String(CATALOG_TOTAL) },
  { k: 'Registros indexados', v: String(KNOWLEDGE.length).padStart(3, '0') },
  { k: 'Secciones', v: String(FACETS.length).padStart(2, '0') },
  { k: 'Defectos diagnosticados', v: String(SOLUTIONS.length).padStart(2, '0') },
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

<template>
  <div v-if="facet" class="page">
    <header class="head ows-shell">
      <nav class="crumb">
        <RouterLink to="/">{{ BRAND.code }}</RouterLink>
        <span aria-hidden="true">/</span>
        <span>{{ facet.label.toUpperCase() }}</span>
      </nav>
      <hr class="ows-tick" />
      <h1 class="head__title">{{ facet.label.toUpperCase() }}</h1>
      <p class="head__blurb">{{ facet.blurb }}</p>
      <p class="head__count ows-meta">
        <span class="ows-num">{{ records.length }}</span> REGISTROS
      </p>
    </header>

    <div class="ows-shell">
      <ul class="list">
        <li v-for="(r, i) in records" :key="r.id" v-reveal="{ delay: Math.min(i, 6) * 60 }">
          <ResultRow :record="r" />
        </li>
      </ul>

      <nav class="siblings" aria-label="Otras secciones">
        <RouterLink
          v-for="f in others"
          :key="f.slug"
          class="sibling"
          :to="`/browse/${f.slug}`"
        >
          {{ f.label }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" /></svg>
        </RouterLink>
      </nav>
    </div>
  </div>

  <NotFoundPage v-else :what="route.params.facet" />
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ResultRow from '../components/ResultRow.vue'
import NotFoundPage from './NotFoundPage.vue'
import { FACETS, facetBySlug, recordsInFacet } from '../data'
import { BRAND } from '../brand'

const route = useRoute()
const slug = computed(() => route.params.facet?.toString() ?? '')
const facet = computed(() => facetBySlug(slug.value))
const records = computed(() => recordsInFacet(slug.value))
const others = computed(() => FACETS.filter((f) => f.slug !== slug.value))
</script>

<style scoped>
.page {
  padding-top: calc(var(--ows-nav-h) + clamp(2rem, 6vh, 4rem));
  padding-bottom: clamp(4rem, 12vh, 8rem);
  min-height: 100svh;
}

.head {
  margin-bottom: clamp(2rem, 6vh, 3.5rem);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.crumb a {
  padding-block: 0.4375rem;
  transition: color var(--ows-fast) var(--ows-ease);
}

.crumb a:hover {
  color: var(--ows-ink);
}

.head__title {
  margin-top: 1.5rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.head__blurb {
  margin-top: 1rem;
  max-width: 52ch;
  font-size: var(--ows-t-lead);
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

.head__count {
  margin-top: 1.25rem;
}

.list {
  display: grid;
  gap: 0.75rem;
}

.siblings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: clamp(2.5rem, 7vh, 4rem);
  padding-top: 2rem;
  border-top: 1px solid var(--ows-line-soft);
}

.sibling {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--ows-line-soft);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-muted);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.sibling:hover {
  color: var(--ows-ink);
  border-color: var(--ows-red);
}

.sibling svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>

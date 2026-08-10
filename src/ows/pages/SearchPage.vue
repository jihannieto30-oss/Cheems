<template>
  <div class="page">
    <header class="head ows-shell">
      <p class="ows-label head__label">SEARCH KNOWLEDGE</p>
      <div class="head__field">
        <SearchField size="md" inline :initial="q" @submit="onSubmit" />
      </div>
    </header>

    <div class="ows-shell">
      <nav class="tabs" aria-label="Filter results">
        <button
          v-for="tab in RESULT_TABS"
          :key="tab.id"
          class="tab"
          :class="{ 'is-on': tab.id === active }"
          :aria-pressed="tab.id === active"
          @click="active = tab.id"
        >
          {{ tab.label }}
          <span class="tab__n ows-num">{{ countFor(tab) }}</span>
        </button>
      </nav>

      <p class="status">
        <template v-if="!q">Enter a term to search {{ KNOWLEDGE.length }} records.</template>
        <template v-else-if="state.status === 'pending'">Searching…</template>
        <template v-else>
          <span class="status__n ows-num">{{ shown.length }}</span>
          result{{ shown.length === 1 ? '' : 's' }} for
          <span class="status__q">{{ q }}</span>
          <span class="status__t">· {{ state.took.toFixed(1) }} ms</span>
        </template>
      </p>

      <ul v-if="shown.length" class="list">
        <li v-for="(hit, i) in shown" :key="hit.record.id" v-reveal="{ delay: Math.min(i, 6) * 60 }">
          <ResultRow :record="hit.record" />
        </li>
      </ul>

      <div v-else-if="q && state.status !== 'pending'" class="empty">
        <p class="empty__title">NO MATCH IN INDEX</p>
        <p class="empty__body">
          Nothing matched “{{ q }}”. Try a classification, an alloy, a process or a defect.
        </p>
        <PopularSearches class="empty__pop" />
      </div>

      <div v-else-if="!q" class="empty">
        <PopularSearches class="empty__pop" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchField from '../components/SearchField.vue'
import ResultRow from '../components/ResultRow.vue'
import PopularSearches from '../components/PopularSearches.vue'
import { useSearch } from '../composables/useSearch'
import { RESULT_TABS, KNOWLEDGE } from '../data'

const route = useRoute()
const router = useRouter()
const { state, submit, clear } = useSearch()

const active = ref('all')
const q = computed(() => (route.query.q ?? '').toString())

// The URL is the source of truth: arriving, reloading and using the back
// button all run the same path.
watch(
  q,
  (next) => {
    active.value = 'all'
    next ? submit(next) : clear()
  },
  { immediate: true },
)

function onSubmit(text) {
  router.push({ name: 'search', query: { q: text } })
}

const matcher = computed(() => RESULT_TABS.find((t) => t.id === active.value) ?? RESULT_TABS[0])
const shown = computed(() => state.results.filter((hit) => matcher.value.match(hit.record)))

function countFor(tab) {
  return state.results.filter((hit) => tab.match(hit.record)).length
}
</script>

<style scoped>
.page {
  padding-top: calc(var(--ows-nav-h) + clamp(2rem, 6vh, 4rem));
  padding-bottom: clamp(4rem, 12vh, 8rem);
  min-height: 100svh;
}

.head {
  margin-bottom: clamp(2rem, 5vh, 3rem);
}

.head__label {
  margin-bottom: 1rem;
}

.head__field {
  max-width: 46rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1.75rem;
  border-bottom: 1px solid var(--ows-line-soft);
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.875rem 0;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  transition: color var(--ows-fast) var(--ows-ease);
}

.tab::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 2px;
  background: var(--ows-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--ows-base) var(--ows-ease);
}

.tab:hover {
  color: var(--ows-ink-muted);
}

.tab.is-on {
  color: var(--ows-ink);
}

.tab.is-on::after {
  transform: scaleX(1);
}

.tab__n {
  font-size: var(--ows-t-micro);
  color: var(--ows-ink-faint);
}

.status {
  margin-block: 1.5rem;
  font-size: var(--ows-t-meta);
  letter-spacing: 0.08em;
  color: var(--ows-ink-faint);
}

.status__n {
  color: var(--ows-ink);
}

.status__q {
  color: var(--ows-red);
}

.status__t {
  margin-left: 0.5rem;
}

.list {
  display: grid;
  gap: 0.75rem;
}

.empty {
  padding-block: clamp(3rem, 10vh, 6rem);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.empty__title {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink);
}

.empty__body {
  max-width: 44ch;
  color: var(--ows-ink-muted);
}

.empty__pop {
  justify-content: flex-start;
  margin-top: 1rem;
}

.empty__pop :deep(.pop__list) {
  justify-content: flex-start;
}
</style>

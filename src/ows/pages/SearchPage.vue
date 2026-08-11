<template>
  <div class="page">
    <!-- ── Query bar ──────────────────────────────────────────────────── -->
    <header class="head ows-shell">
      <!-- The field is the page's title here, and it is not a heading element.
           Without this the results page is the one document in the site with
           no h1, which breaks heading navigation for a screen reader. -->
      <h1 class="ows-sr">{{ q ? `Resultados para ${q}` : 'Búsqueda' }}</h1>

      <div class="head__field">
        <SearchField size="md" inline :initial="q" @submit="onSubmit" />
      </div>

      <nav class="tabs" aria-label="Filtrar resultados">
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

      <p v-if="q" class="status">
        <span class="status__n ows-num">{{ shown.length }}</span>
        resultado{{ shown.length === 1 ? '' : 's' }} para
        <span class="status__q">{{ q }}</span>
        <span class="status__t">· {{ state.took.toFixed(1) }} ms · índice {{ state.provider }}</span>
      </p>
    </header>

    <div class="ows-shell">
      <!-- ── Top result ───────────────────────────────────────────────
           The strongest hit gets a card of its own with the visual and the
           specification strip, so an exact designation match is answered
           without a second click. -->
      <section v-if="top" class="top" v-reveal>
        <p class="ows-label top__label">MEJOR RESULTADO</p>
        <RouterLink class="top__card" :to="{ name: 'product', params: { id: top.record.id } }">
          <figure class="top__media">
            <RecordVisual :record="top.record" />
          </figure>

          <div class="top__body">
            <div class="top__head">
              <span class="top__kind">{{ top.record.kind }}</span>
              <span v-if="top.record.spec" class="top__spec">{{ top.record.spec }}</span>
            </div>

            <h2 class="top__title">{{ top.record.title }}</h2>
            <p v-if="topDetail?.subtitle" class="top__subtitle">{{ topDetail.subtitle }}</p>
            <p class="top__summary">{{ topDetail?.description ?? top.record.summary }}</p>

            <dl v-if="topStrip.length" class="top__strip">
              <div v-for="cell in topStrip" :key="cell.k" class="top__cell">
                <dd>{{ cell.v }}</dd>
                <dt>{{ cell.k }}</dt>
              </div>
            </dl>

            <span class="top__cta">
              VIEW RECORD
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12 H19" /><path d="M13 6 L19 12 L13 18" />
              </svg>
            </span>
          </div>
        </RouterLink>
      </section>

      <!-- ── Grouped results ──────────────────────────────────────────── -->
      <section v-for="(group, gi) in groups" :key="group.id" class="group">
        <header class="group__head" v-reveal="{ delay: Math.min(gi, 4) * 60 }">
          <h2 class="group__title">{{ group.label }}</h2>
          <span class="group__rule" aria-hidden="true" />
          <span class="group__note">{{ group.note }}</span>
          <span class="group__n ows-num">{{ group.items.length }}</span>
        </header>

        <ul class="group__list">
          <li
            v-for="(hit, i) in group.items"
            :key="hit.record.id"
            v-reveal="{ delay: Math.min(i, 5) * 50 }"
          >
            <ResultRow :record="hit.record" />
          </li>
        </ul>
      </section>

      <!-- ── Empty states ─────────────────────────────────────────────── -->
      <div v-if="q && !shown.length && state.status !== 'pending'" class="empty">
        <p class="empty__title">SIN COINCIDENCIAS</p>
        <p class="empty__body">
          Nothing matched “{{ q }}”. Try a classification, an alloy family, a process
          or a defect.
        </p>
        <PopularSearches class="empty__pop" />
      </div>

      <div v-else-if="!q" class="empty">
        <p class="empty__title">BUSQUE ENTRE {{ total }} REGISTROS</p>
        <p class="empty__body">
          Enter a designation in any standard — AWS, EN ISO, DIN, JIS, W.Nr — or a
          process, a material or a defect.
        </p>
        <PopularSearches class="empty__pop" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import SearchField from '../components/SearchField.vue'
import ResultRow from '../components/ResultRow.vue'
import RecordVisual from '../components/RecordVisual.vue'
import PopularSearches from '../components/PopularSearches.vue'
import { useSearch } from '../composables/useSearch'
import { RESULT_TABS, groupResults, ALL_RECORDS } from '../data'
import { getDetail } from '../data/details'

const route = useRoute()
const router = useRouter()
const { state, submit, clear } = useSearch()

const active = ref('all')
const q = computed(() => (route.query.q ?? '').toString())
const total = ALL_RECORDS.length

// The URL is the source of truth: arriving, reloading and the back button all
// run the same path.
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

// The featured card is only meaningful on an unfiltered, confident match.
const top = computed(() => (active.value === 'all' ? (shown.value[0] ?? null) : null))
const topDetail = computed(() => (top.value ? getDetail(top.value.record.id) : null))
const topStrip = computed(() => {
  if (topDetail.value?.strip) return topDetail.value.strip
  // Catalogue rows have no sheet yet; their facets carry the same information.
  return (top.value?.record.facets ?? []).slice(0, 4).map((f) => ({ k: f.k, v: f.v }))
})

// Everything below the featured card, grouped by the kind of answer it is.
const groups = computed(() => groupResults(shown.value.filter((hit) => hit !== top.value)))

function countFor(tab) {
  return state.results.filter((hit) => tab.match(hit.record)).length
}
</script>

<style scoped>
.page {
  padding-top: calc(var(--ows-nav-h) + clamp(1.5rem, 5vh, 3rem));
  padding-bottom: clamp(4rem, 12vh, 8rem);
  min-height: 100svh;
}

/* ---- query bar ---- */

.head {
  margin-bottom: clamp(1.5rem, 4vh, 2.5rem);
}

.head__field {
  max-width: 46rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1.75rem;
  margin-top: 1.5rem;
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
  margin-top: 1rem;
  font-size: var(--ows-t-meta);
  letter-spacing: 0.06em;
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
  text-transform: uppercase;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
}

/* ---- top result ---- */

.top {
  margin-bottom: clamp(2rem, 6vh, 3.5rem);
}

.top__label {
  margin-bottom: 0.875rem;
  color: var(--ows-red);
}

.top__card {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1fr);
  gap: clamp(1.25rem, 3vw, 2.5rem);
  padding: 1px;
  border: 1px solid var(--ows-line-strong);
  background: var(--ows-surface);
  transition:
    border-color var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.top__card:hover {
  border-color: var(--ows-red-dim);
  background: var(--ows-panel);
}

.top__media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--ows-void);
}

.top__media :deep(.pxi) {
  position: absolute;
  inset: 0;
}

.top__body {
  padding: clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 3vw, 2rem) 0;
  display: flex;
  flex-direction: column;
}

.top__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.top__kind,
.top__spec {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
}

.top__kind {
  color: var(--ows-red);
}
.top__spec {
  color: var(--ows-ink-faint);
  text-align: right;
}

.top__title {
  margin-top: 0.625rem;
  font-family: var(--ows-display);
  font-size: clamp(1.75rem, 3.6vw, 2.75rem);
  font-weight: var(--ows-display-weight);
  letter-spacing: 0.06em;
  line-height: 1.05;
  color: var(--ows-ink);
}

.top__subtitle {
  margin-top: 0.375rem;
  font-size: var(--ows-t-lead);
  color: var(--ows-ink-muted);
}

.top__summary {
  margin-top: 0.875rem;
  max-width: 56ch;
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

.top__strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(7rem, 100%), 1fr));
  gap: 1px;
  margin-top: 1.5rem;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
}

.top__cell {
  background: var(--ows-void);
  padding: 0.75rem 0.625rem;
  text-align: center;
}

.top__cell dd {
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ows-ink);
}

.top__cell dt {
  margin-top: 0.25rem;
  font-size: 0.5625rem;
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.top__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: auto;
  padding-top: 1.5rem;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-red);
}

.top__cta svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
}

.top__card:hover .top__cta svg {
  transform: translateX(4px);
}

/* ---- groups ---- */

.group + .group {
  margin-top: clamp(2rem, 5vh, 3rem);
}

.group__head {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
}

.group__title {
  font-size: var(--ows-t-meta);
  font-weight: 500;
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink);
  white-space: nowrap;
}

/* Leader rule between the group name and its note — the move that makes the
   stack read as an index rather than as repeated headings. */
.group__rule {
  flex: 1 1 auto;
  min-width: 1rem;
  height: 1px;
  background: var(--ows-line);
}

.group__note {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  white-space: nowrap;
}

.group__n {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-red);
}

.group__list {
  display: grid;
  gap: 0.5rem;
}

/* ---- empty ---- */

.empty {
  padding-block: clamp(2rem, 8vh, 5rem);
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
  max-width: 48ch;
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

.empty__pop {
  justify-content: flex-start;
  margin-top: 1rem;
}

.empty__pop :deep(.pop__list) {
  justify-content: flex-start;
}

@media (max-width: 60rem) {
  .top__card {
    grid-template-columns: minmax(0, 1fr);
  }
  .top__media {
    aspect-ratio: 16 / 9;
  }
  .top__body {
    padding: 1.25rem;
  }
}

@media (max-width: 46rem) {
  .group__note {
    display: none;
  }
  /* "Filler metals & consumables" is wider than a 320px gutter at this
     tracking, and nowrap turns that into a horizontally scrolling page. */
  .group__head {
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }
  .group__title {
    white-space: normal;
  }
}
</style>

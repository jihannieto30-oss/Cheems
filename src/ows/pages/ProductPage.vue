<template>
  <div v-if="record" class="page">
    <!-- Sheet header bar: back · title · share -->
    <div class="bar">
      <div class="bar__inner ows-shell">
        <button class="bar__back" @click="back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5 L7.5 12 L14.5 19" /></svg>
          VOLVER A RESULTADOS
        </button>
        <span class="bar__title">{{ record.title }}</span>
        <button class="bar__share" @click="share">
          {{ copied ? 'ENLACE COPIADO' : 'COMPARTIR' }}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.5 13 L15.5 9" /><path d="M8.5 11 L15.5 15" />
            <circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="7.5" r="2.4" />
            <circle cx="18" cy="16.5" r="2.4" />
          </svg>
        </button>
      </div>
    </div>

    <div class="sheet ows-shell">
      <!-- Section rail -->
      <aside class="rail">
        <nav aria-label="Secciones de este registro">
          <a
            v-for="s in sections"
            :key="s.id"
            class="rail__link"
            :class="{ 'is-on': s.id === current }"
            :href="`#${s.id}`"
            @click.prevent="goTo(s.id)"
          >
            {{ s.label }}
          </a>
        </nav>
      </aside>

      <div class="body">
        <!-- ── OVERVIEW ── -->
        <section :id="ids.overview" ref="secOverview" class="block block--intro">
          <div class="intro">
            <p class="intro__kind">{{ record.kind }}</p>
            <h1 class="intro__title">{{ record.title }}</h1>
            <p v-if="detail?.subtitle" class="intro__subtitle">{{ detail.subtitle }}</p>
            <p class="intro__body">{{ detail?.description ?? record.summary }}</p>
          </div>
          <figure class="intro__media">
            <RecordVisual :record="record" />
          </figure>
        </section>

        <!-- Specification strip -->
        <dl v-if="detail?.strip" class="strip">
          <div v-for="cell in detail.strip" :key="cell.k" class="strip__cell">
            <dd class="strip__v">{{ cell.v }}</dd>
            <dt class="strip__k">{{ cell.k }}</dt>
          </div>
        </dl>

        <!-- ── CHEMICAL COMPOSITION ── -->
        <section v-if="detail?.chemistry" :id="ids.chemistry" class="block">
          <h2 class="block__title">
            CHEMICAL COMPOSITION <span class="block__note">( {{ detail.chemistry.note }} )</span>
          </h2>
          <dl class="chem">
            <div v-for="c in detail.chemistry.columns" :key="c.el" class="chem__cell">
              <dt class="chem__el">{{ c.el }}</dt>
              <dd class="chem__val ows-num">{{ c.val }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── MECHANICAL PROPERTIES ── -->
        <section v-if="detail?.mechanical" :id="ids.mechanical" class="block">
          <h2 class="block__title">
            MECHANICAL PROPERTIES <span class="block__note">( ALL WELD METAL )</span>
          </h2>
          <dl class="rows">
            <div v-for="m in detail.mechanical" :key="m.k" class="rows__row">
              <dt>{{ m.k }}</dt>
              <dd class="ows-num">{{ m.v }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── WELDING PARAMETERS ── -->
        <section v-if="parameters.length" :id="ids.parameters" class="block">
          <h2 class="block__title">PARÁMETROS DE SOLDADURA</h2>
          <dl class="rows">
            <div v-for="p in parameters" :key="p.k" class="rows__row">
              <dt>{{ p.k }}</dt>
              <dd>{{ p.v }}</dd>
            </div>
          </dl>
        </section>

        <!-- ── DIAGNOSIS — defects only ── -->
        <section v-if="record.solution" :id="ids.diagnosis" class="block">
          <h2 class="block__title">DIAGNÓSTICO</h2>
          <p class="block__lead">{{ record.solution.premise }}</p>
          <div class="vectors">
            <article v-for="v in record.solution.vectors" :key="v.label" class="vector">
              <h3 class="vector__label">{{ v.label }}</h3>
              <ul>
                <li v-for="c in v.checks" :key="c">{{ c }}</li>
              </ul>
            </article>
          </div>
          <h3 class="block__sub">SOLUCIÓN</h3>
          <ol class="steps">
            <li v-for="(s, i) in record.solution.resolution" :key="s">
              <span class="steps__n ows-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span>{{ s }}</span>
            </li>
          </ol>
        </section>

        <!-- ── APPLICATIONS ── -->
        <section v-if="detail?.applications" :id="ids.applications" class="block">
          <h2 class="block__title">APLICACIONES</h2>
          <ul class="apps">
            <li v-for="a in detail.applications" :key="a">{{ a }}</li>
          </ul>
        </section>

        <!-- ── DOCUMENTS ── -->
        <section v-if="detail?.documents" :id="ids.documents" class="block">
          <h2 class="block__title">DOCUMENTOS</h2>
          <ul class="docs">
            <li v-for="d in detail.documents" :key="d.label">
              <!-- Deliberately inert: no file exists yet, and a dead link that
                   looks live is worse than one that says so. -->
              <span class="doc" aria-disabled="true">
                <span class="doc__label">{{ d.label }}</span>
                <span class="doc__kind">{{ d.kind }}</span>
                <span class="doc__state">NO PUBLICADO</span>
              </span>
            </li>
          </ul>
        </section>

        <!-- ── RELATED ── -->
        <section v-if="related.length" :id="ids.related" class="block">
          <h2 class="block__title">TEMAS RELACIONADOS</h2>
          <ul class="related">
            <li v-for="r in related" :key="r.id">
              <RouterLink class="related__link" :to="{ name: 'product', params: { id: r.id } }">
                <span class="related__title">{{ r.title }}</span>
                <span class="related__kind">{{ r.kind }}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" /></svg>
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>

  <NotFoundPage v-else :what="route.params.id" />
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import RecordVisual from '../components/RecordVisual.vue'
import NotFoundPage from './NotFoundPage.vue'
import { getRecord, relatedTo } from '../data'

const route = useRoute()
const router = useRouter()

const record = computed(() => getRecord(route.params.id?.toString() ?? ''))
const detail = computed(() => record.value?.detail ?? null)
const related = computed(() => (record.value ? relatedTo(record.value) : []))

// Filler metals carry a parameters table; processes already hold theirs as
// facets on the search record, so reuse those rather than duplicating data.
const parameters = computed(() => {
  if (detail.value?.parameters) return detail.value.parameters
  if (record.value?.category === 'processes') return record.value.facets
  return []
})

const ids = {
  overview: 'overview',
  chemistry: 'chemical-composition',
  mechanical: 'mechanical-properties',
  parameters: 'welding-parameters',
  diagnosis: 'diagnosis',
  applications: 'applications',
  documents: 'documents',
  related: 'related-topics',
}

const sections = computed(() => {
  const out = [{ id: ids.overview, label: 'RESUMEN' }]
  if (detail.value?.chemistry) out.push({ id: ids.chemistry, label: 'COMPOSICIÓN QUÍMICA' })
  if (detail.value?.mechanical) out.push({ id: ids.mechanical, label: 'PROPIEDADES MECÁNICAS' })
  if (parameters.value.length) out.push({ id: ids.parameters, label: 'PARÁMETROS DE SOLDADURA' })
  if (record.value?.solution) out.push({ id: ids.diagnosis, label: 'DIAGNÓSTICO' })
  if (detail.value?.applications) out.push({ id: ids.applications, label: 'APLICACIONES' })
  if (detail.value?.documents) out.push({ id: ids.documents, label: 'DOCUMENTOS' })
  if (related.value.length) out.push({ id: ids.related, label: 'TEMAS RELACIONADOS' })
  return out
})

const current = ref(ids.overview)

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function back() {
  // Only step back when there is somewhere to step back to.
  if (window.history.state?.back) router.back()
  else router.push({ name: 'search' })
}

const copied = ref(false)
let copyTimer = null
async function share() {
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: `${record.value.title} — OWS`, url })
      return
    }
    await navigator.clipboard.writeText(url)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), 2200)
  } catch {
    /* dismissed or blocked — nothing to recover from */
  }
}

// Rail highlight follows whichever section owns the top of the viewport.
let spy = null
function observe() {
  spy?.disconnect()
  spy = new IntersectionObserver(
    (entries) => {
      const hit = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) current.value = hit.target.id
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
  )
  for (const s of sections.value) {
    const el = document.getElementById(s.id)
    if (el) spy.observe(el)
  }
}

onMounted(observe)
watch(() => route.params.id, () => nextTick(observe))
onUnmounted(() => {
  spy?.disconnect()
  clearTimeout(copyTimer)
})
</script>

<style scoped>
.page {
  padding-top: var(--ows-nav-h);
  padding-bottom: clamp(4rem, 12vh, 8rem);
  min-height: 100svh;
}

/* ---- bar ---- */

.bar {
  position: sticky;
  top: var(--ows-nav-h);
  z-index: 20;
  background: rgb(0 0 0 / 0.9);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--ows-line-soft);
}

.bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 3.25rem;
}

.bar__back,
.bar__share {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  /* Hit area padded to clear 24px inside the 52px bar. */
  padding-block: 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  transition: color var(--ows-fast) var(--ows-ease);
}

.bar__back:hover,
.bar__share:hover {
  color: var(--ows-ink);
}

.bar__back svg,
.bar__share svg {
  width: 0.9375rem;
  height: 0.9375rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bar__title {
  font-size: var(--ows-t-meta);
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--ows-ink);
}

/* ---- layout ---- */

.sheet {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  padding-top: clamp(2rem, 6vh, 3.5rem);
}

.rail nav {
  position: sticky;
  top: calc(var(--ows-nav-h) + 5rem);
  display: flex;
  flex-direction: column;
}

.rail__link {
  position: relative;
  padding: 0.5rem 0 0.5rem 0.875rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  border-left: 1px solid var(--ows-line-soft);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.rail__link:hover {
  color: var(--ows-ink-muted);
}

.rail__link.is-on {
  color: var(--ows-ink);
  border-left-color: var(--ows-red);
}

/* ---- blocks ---- */

.block {
  padding-block: clamp(2rem, 5vh, 3rem);
  border-top: 1px solid var(--ows-line-soft);
  scroll-margin-top: calc(var(--ows-nav-h) + 5rem);
}

.block--intro {
  border-top: 0;
  padding-top: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: start;
}

.block__title {
  font-size: var(--ows-t-meta);
  font-weight: 500;
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink);
  margin-bottom: 1.5rem;
}

.block__note {
  color: var(--ows-ink-faint);
  letter-spacing: var(--ows-track-meta);
}

.block__sub {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: var(--ows-t-micro);
  font-weight: 500;
  letter-spacing: var(--ows-track-label);
  color: var(--ows-red);
}

.block__lead {
  max-width: 60ch;
  margin-bottom: 1.5rem;
  line-height: 1.75;
  color: var(--ows-ink-muted);
}

/* ---- intro ---- */

.intro__kind {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-red);
}

.intro__title {
  margin-top: 0.75rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h3);
  font-weight: var(--ows-display-weight);
  letter-spacing: var(--ows-track-display);
  line-height: 1;
  color: var(--ows-ink);
}

.intro__subtitle {
  margin-top: 0.5rem;
  font-size: var(--ows-t-lead);
  color: var(--ows-ink-muted);
}

.intro__body {
  margin-top: 1.25rem;
  max-width: 46ch;
  line-height: 1.75;
  color: var(--ows-ink-muted);
}

.intro__media {
  position: relative;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--ows-line-soft);
  background: var(--ows-surface);
  overflow: hidden;
}

/* ParallaxImage positions its <img> absolutely inside itself, so it has no
   intrinsic height — without this it collapses and the frame renders empty. */
.intro__media :deep(.pxi) {
  position: absolute;
  inset: 0;
}

/* ---- strip ---- */

.strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
}

.strip__cell {
  background: var(--ows-surface);
  padding: 1.125rem 1.25rem;
  text-align: center;
}

.strip__v {
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ows-ink);
}

.strip__k {
  margin-top: 0.375rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

/* ---- chemistry ---- */

.chem {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
}

.chem__cell {
  background: var(--ows-surface);
  padding: 1.125rem 0.75rem;
  text-align: center;
}

.chem__el {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.chem__val {
  margin-top: 0.5rem;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--ows-ink);
}

/* ---- key/value rows ---- */

.rows {
  border-top: 1px solid var(--ows-line-soft);
  max-width: 44rem;
}

.rows__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
}

.rows__row dt {
  color: var(--ows-ink-muted);
}

.rows__row dd {
  color: var(--ows-ink);
  text-align: right;
}

/* ---- diagnosis ---- */

.vectors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
}

.vector {
  background: var(--ows-surface);
  padding: 1.125rem;
}

.vector__label {
  font-size: var(--ows-t-micro);
  font-weight: 500;
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink);
  margin-bottom: 0.75rem;
}

.vector li {
  position: relative;
  padding-left: 0.875rem;
  margin-bottom: 0.4375rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--ows-ink-faint);
}

.vector li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 0.375rem;
  height: 1px;
  background: var(--ows-red);
}

.steps {
  border-top: 1px solid var(--ows-line-soft);
  max-width: 46rem;
}

.steps li {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
  color: var(--ows-ink-muted);
}

.steps__n {
  flex: none;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-red);
}

/* ---- applications ---- */

.apps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: 0.5rem 2rem;
  max-width: 52rem;
}

.apps li {
  position: relative;
  padding: 0.5rem 0 0.5rem 1rem;
  color: var(--ows-ink-muted);
  border-bottom: 1px solid var(--ows-line-soft);
}

.apps li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 1.1em;
  width: 0.4375rem;
  height: 1px;
  background: var(--ows-red);
}

/* ---- documents ---- */

.docs {
  display: grid;
  gap: 0.5rem;
  max-width: 40rem;
}

.doc {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  border: 1px solid var(--ows-line-soft);
  background: var(--ows-surface);
}

.doc__label {
  flex: 1 1 auto;
  color: var(--ows-ink-muted);
}

.doc__kind,
.doc__state {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.doc__state {
  padding: 0.1875rem 0.5rem;
  border: 1px solid var(--ows-line-soft);
}

/* ---- related ---- */

.related {
  display: grid;
  gap: 0.5rem;
  max-width: 46rem;
}

.related__link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9375rem 1.125rem;
  border: 1px solid var(--ows-line-soft);
  background: var(--ows-surface);
  transition:
    border-color var(--ows-fast) var(--ows-ease),
    background-color var(--ows-fast) var(--ows-ease);
}

.related__link:hover {
  border-color: var(--ows-line-strong);
  background: var(--ows-panel);
}

.related__title {
  flex: 1 1 auto;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ows-ink);
}

.related__kind {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.related__link svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-fast) var(--ows-ease);
}

.related__link:hover svg {
  transform: translateX(3px);
}

@media (max-width: 62rem) {
  .sheet {
    grid-template-columns: minmax(0, 1fr);
  }
  .rail {
    display: none;
  }
  .block--intro {
    grid-template-columns: minmax(0, 1fr);
  }
  .intro__media {
    order: -1;
    aspect-ratio: 16 / 9;
  }
}

@media (max-width: 46rem) {
  .bar__title {
    display: none;
  }
  .bar__inner {
    justify-content: space-between;
  }
}
</style>

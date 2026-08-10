<template>
  <div class="results" role="listbox" :aria-busy="state.status === 'pending'">
    <div class="results__panel">
      <ul v-if="state.results.length" class="results__list">
        <li
          v-for="(hit, i) in state.results"
          :key="hit.record.id"
          class="results__row"
          :class="{ 'is-active': i === active }"
          role="option"
          :aria-selected="i === active"
          @mouseenter="emit('hover', i)"
          @mousedown.prevent="emit('hover', i)"
        >
          <span class="results__bar" aria-hidden="true" />

          <div class="results__head">
            <span class="results__kind">{{ hit.record.kind }}</span>
            <span v-if="hit.record.spec" class="results__spec">{{ hit.record.spec }}</span>
          </div>

          <p class="results__title">{{ hit.record.title }}</p>
          <p class="results__summary">{{ hit.record.summary }}</p>

          <div class="results__meta">
            <span class="results__path">{{ hit.record.path.join(' / ') }}</span>
          </div>

          <!-- Facets are the payoff: the answer is on the result, not one
               click away. Four is the ceiling; the rest lives on the record. -->
          <dl class="results__facets">
            <div v-for="facet in hit.record.facets.slice(0, 4)" :key="facet.k" class="results__facet">
              <dt>{{ facet.k }}</dt>
              <dd>{{ facet.v }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <p v-else-if="state.status === 'pending'" class="results__empty">SEARCHING</p>
      <p v-else-if="state.status === 'error'" class="results__empty">{{ state.error }}</p>
      <p v-else class="results__empty">NO MATCH IN INDEX</p>

      <div class="results__status">
        <span>{{ statusLine }}</span>
        <span class="results__hint">↑↓ &nbsp; ⏎ &nbsp; ESC</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSearch } from '../composables/useSearch'

defineProps({
  active: { type: Number, default: -1 },
})
const emit = defineEmits(['hover', 'dismiss'])

const { state } = useSearch()

const statusLine = computed(() => {
  if (state.status === 'pending') return '—'
  const shown = state.results.length
  const count = state.total > shown ? `${shown} / ${state.total}` : String(shown)
  return `${count} · ${state.took.toFixed(1)} MS · ${state.provider.toUpperCase()} INDEX`
})
</script>

<style scoped>
.results {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: 0;
  right: 0;
  z-index: var(--ows-z-overlay);
}

.results__panel {
  border: 1px solid var(--ows-line-strong);
  background: var(--ows-void);
  box-shadow: 0 32px 80px -24px rgb(0 0 0 / 0.9);
  animation: panel-in var(--ows-base) var(--ows-ease) both;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
}

.results__list {
  max-height: min(60vh, 34rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.results__row {
  position: relative;
  padding: 1.25rem 1.5rem 1.375rem 1.75rem;
  border-bottom: 1px solid var(--ows-line-soft);
  cursor: pointer;
  transition: background-color var(--ows-fast) var(--ows-ease);
}

.results__row:last-child {
  border-bottom: 0;
}

.results__row.is-active {
  background: rgb(255 255 255 / 0.028);
}

/* Active-row indicator: a rule that grows out of the left edge. */
.results__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--ows-ink);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--ows-base) var(--ows-ease);
}

.results__row.is-active .results__bar {
  transform: scaleY(1);
}

.results__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.results__kind,
.results__spec,
.results__path {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
}

.results__kind {
  color: var(--ows-ink-muted);
}

.results__spec,
.results__path {
  color: var(--ows-ink-faint);
  text-align: right;
}

.results__title {
  font-family: var(--ows-mono);
  font-size: 1.0625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ows-ink);
  line-height: 1.2;
}

.results__summary {
  margin-top: 0.5rem;
  max-width: 46ch;
  font-size: 0.8125rem;
  line-height: 1.62;
  color: var(--ows-ink-muted);
}

.results__meta {
  margin-top: 0.75rem;
}

.results__path {
  text-align: left;
}

.results__facets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.875rem;
  /* Facets are supporting detail — they surface with the row, not before it. */
  opacity: 0;
  transform: translateY(0.25rem);
  transition:
    opacity var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease);
}

.results__row.is-active .results__facets {
  opacity: 1;
  transform: none;
}

.results__facet {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.3125rem 0.625rem;
  border: 1px solid var(--ows-line);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.results__facet dt {
  color: var(--ows-ink-faint);
  text-transform: uppercase;
}

.results__facet dd {
  color: var(--ows-ink-muted);
}

.results__empty {
  padding: 2.25rem 1.75rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.results__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.75rem;
  border-top: 1px solid var(--ows-line);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

@media (max-width: 40rem) {
  .results__row {
    padding: 1rem 1.125rem 1.125rem 1.25rem;
  }
  .results__summary {
    font-size: 0.78125rem;
  }
  /* Facets always visible on touch — there is no hover to reveal them. */
  .results__facets {
    opacity: 1;
    transform: none;
  }
  .results__hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .results__panel {
    animation: none;
  }
  .results__facets {
    opacity: 1;
    transform: none;
  }
}
</style>

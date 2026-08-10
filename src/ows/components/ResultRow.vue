<template>
  <RouterLink class="row" :to="{ name: 'record', params: { id: record.id } }">
    <span class="row__bar" aria-hidden="true" />

    <div class="row__head">
      <span class="row__kind">{{ record.kind }}</span>
      <span v-if="record.spec" class="row__spec">{{ record.spec }}</span>
    </div>

    <h3 class="row__title">{{ record.title }}</h3>
    <p v-if="subtitle" class="row__subtitle">{{ subtitle }}</p>
    <p class="row__summary">{{ record.summary }}</p>

    <div class="row__foot">
      <span class="row__path">{{ record.path.join(' / ') }}</span>
      <svg class="row__go" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12 H19" />
        <path d="M13 6 L19 12 L13 18" />
      </svg>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getDetail } from '../data/details'

const props = defineProps({
  record: { type: Object, required: true },
})

const subtitle = computed(() => getDetail(props.record.id)?.subtitle ?? '')
</script>

<style scoped>
.row {
  position: relative;
  display: block;
  padding: 1.5rem 1.5rem 1.375rem 1.75rem;
  border: 1px solid var(--ows-line-soft);
  background: var(--ows-surface);
  transition:
    border-color var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.row:hover {
  border-color: var(--ows-line-strong);
  background: var(--ows-panel);
}

/* Red edge marker, driven out on hover. */
.row__bar {
  position: absolute;
  left: -1px;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--ows-red);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--ows-base) var(--ows-ease);
}

.row:hover .row__bar {
  transform: scaleY(1);
}

.row__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.row__kind,
.row__spec,
.row__path {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
}

.row__kind {
  color: var(--ows-red);
}

.row__spec,
.row__path {
  color: var(--ows-ink-faint);
}

.row__title {
  margin-top: 0.625rem;
  font-family: var(--ows-display);
  font-size: 1.75rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.15;
  color: var(--ows-ink);
}

.row__subtitle {
  margin-top: 0.25rem;
  font-size: var(--ows-t-body);
  color: var(--ows-ink-muted);
}

.row__summary {
  margin-top: 0.75rem;
  max-width: 62ch;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

.row__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--ows-line-soft);
}

.row__go {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: translateX(-0.375rem);
  transition:
    opacity var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease);
}

.row:hover .row__go {
  opacity: 1;
  transform: none;
}

@media (max-width: 46rem) {
  .row {
    padding: 1.25rem 1.125rem 1.125rem 1.25rem;
  }
  .row__go {
    opacity: 1;
    transform: none;
  }
}
</style>

<template>
  <div class="pop">
    <span class="pop__label">Popular searches:</span>
    <ul class="pop__list">
      <li v-for="term in terms" :key="term">
        <RouterLink class="pop__chip" :to="{ name: 'search', query: { q: term } }">
          {{ term }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  terms: {
    type: Array,
    default: () => ['ER70S-6', '316L', 'GTAW', 'P91', 'AWS D1.1', 'ALUMINUM', 'POROSITY'],
  },
})
</script>

<style scoped>
.pop {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 0.875rem;
}

.pop__label {
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-faint);
}

.pop__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.pop__chip {
  display: inline-block;
  padding: 0.4375rem 0.875rem;
  border: 1px solid var(--ows-line-strong);
  border-radius: 999px;
  font-size: var(--ows-t-meta);
  letter-spacing: 0.1em;
  color: var(--ows-ink-muted);
  background: rgb(10 10 10 / 0.5);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease),
    background-color var(--ows-fast) var(--ows-ease);
}

.pop__chip:hover {
  color: var(--ows-ink);
  border-color: var(--ows-red);
  background: var(--ows-red-wash);
}

@media (max-width: 46rem) {
  .pop__label {
    width: 100%;
    text-align: center;
  }
}
</style>

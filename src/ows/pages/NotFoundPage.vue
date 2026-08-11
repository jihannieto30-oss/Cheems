<template>
  <div class="page ows-shell">
    <p class="code ows-num">404</p>
    <h1 class="title">NO RECORD</h1>
    <p class="body">
      <template v-if="what">Nothing in the index matches “{{ what }}”.</template>
      <template v-else>That address does not resolve to anything in the index.</template>
    </p>

    <div class="field">
      <SearchField size="md" />
    </div>

    <PopularSearches class="pop" />
  </div>
</template>

<script setup>
import SearchField from '../components/SearchField.vue'
import PopularSearches from '../components/PopularSearches.vue'

defineProps({
  /** What was asked for, when the caller knows. */
  what: { type: [String, Array], default: '' },
})
</script>

<style scoped>
.page {
  min-height: 100svh;
  padding-top: calc(var(--ows-nav-h) + clamp(4rem, 14vh, 9rem));
  padding-bottom: clamp(4rem, 12vh, 8rem);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.code {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-red);
}

.title {
  margin-top: 1rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.body {
  margin-top: 1rem;
  max-width: 44ch;
  line-height: 1.75;
  color: var(--ows-ink-muted);
}

.field {
  width: min(100%, 40rem);
  margin-top: 2.5rem;
}

.pop {
  margin-top: 1.5rem;
}

.pop :deep(.pop__list) {
  justify-content: flex-start;
}
</style>

<template>
  <dl class="spec">
    <div v-for="(row, i) in rows" :key="row.term" class="spec__row" v-reveal="{ delay: Math.min(i, 8) * 55 }">
      <dt class="spec__term">{{ row.term }}</dt>
      <dd class="spec__def">
        {{ row.def }}
        <span v-if="row.note" class="spec__note">{{ row.note }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup>
/*
  A technical definition list: term on the left, value on the right, hairline
  between. It replaces the card grid that this kind of content normally gets —
  cards imply the items are interchangeable options, and these are properties
  of one thing.
*/
defineProps({
  /** [{ term, def, note? }] */
  rows: { type: Array, required: true },
})
</script>

<style scoped>
.spec {
  border-top: 1px solid var(--ows-line-soft);
}

.spec__row {
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
  gap: 0.5rem 2.5rem;
  padding-block: 1.125rem;
  border-bottom: 1px solid var(--ows-line-soft);
}

.spec__term {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  padding-top: 0.2em;
}

.spec__def {
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.spec__note {
  display: block;
  margin-top: 0.375rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

@media (max-width: 46rem) {
  .spec__row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}
</style>

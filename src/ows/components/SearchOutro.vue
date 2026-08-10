<template>
  <section class="outro">
    <div class="outro__inner ows-shell">
      <span class="ows-meta outro__label" v-reveal>SEARCH</span>

      <div class="outro__field" v-reveal="{ delay: 90 }">
        <SearchField variant="inline" :placeholder-mode="placeholderMode" />
      </div>

      <!-- Only ever shown once the visitor has actually searched. Nothing is
           suggested to someone who has not asked for anything yet. -->
      <ul v-if="state.recent.length" class="outro__recent" v-reveal="{ delay: 160 }">
        <li v-for="term in state.recent" :key="term">
          <button class="outro__term" @click="replay(term)">{{ term }}</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import SearchField from './SearchField.vue'
import { useSearch } from '../composables/useSearch'

defineProps({
  placeholderMode: { type: String, default: 'quiet' },
})

const { state, submit } = useSearch()

function replay(term) {
  submit(term)
  document.querySelector('.outro__field input')?.focus()
}
</script>

<style scoped>
.outro {
  position: relative;
  z-index: 1;
  /* Deliberately open, but the preceding section already carries its own
     bottom padding — stacking two full-height voids reads as a broken page
     rather than as space. */
  padding-block: clamp(5rem, 13vh, 9rem);
  border-top: 1px solid var(--ows-line-soft);
}

.outro__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
}

.outro__label {
  color: var(--ows-ink-faint);
}

.outro__field {
  width: 100%;
  display: flex;
  justify-content: center;
}

.outro__recent {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  max-width: 44rem;
}

.outro__term {
  padding: 0.4375rem 0.875rem;
  border: 1px solid var(--ows-line);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.outro__term:hover {
  color: var(--ows-ink);
  border-color: var(--ows-line-strong);
}
</style>

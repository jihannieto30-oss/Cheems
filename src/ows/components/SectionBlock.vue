<template>
  <section :id="id" class="sb">
    <div class="ows-shell">
      <header class="sb__head" v-reveal>
        <p class="sb__index ows-num">{{ index }}</p>
        <div class="sb__titles">
          <h2 class="ows-h2">{{ title }}</h2>
          <p v-if="lead" class="sb__lead">{{ lead }}</p>
        </div>
      </header>

      <div class="sb__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup>
/*
  A numbered chapter of a page.

  The number is the point: these pages are arguments, read top to bottom, and
  an index in the margin tells the reader where they are in one without a
  progress bar or a sticky table of contents.
*/
defineProps({
  id: { type: String, default: undefined },
  index: { type: String, required: true },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
})
</script>

<style scoped>
.sb {
  padding-block: clamp(3.5rem, 11vh, 7rem);
  border-bottom: 1px solid var(--ows-line-soft);
}

.sb__head {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0 2rem;
  align-items: start;
}

.sb__index {
  font-family: var(--ows-display);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-red);
  padding-top: 0.45em;
}

/* Uppercase display type set to the full column width stops being a heading
   and starts being a banner; the measure keeps it to two or three lines. */
.sb__titles h2 {
  max-width: 22ch;
  text-wrap: balance;
}

.sb__lead {
  margin-top: 1.125rem;
  max-width: 56ch;
  font-size: var(--ows-t-lead);
  line-height: 1.65;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.sb__body {
  margin-top: clamp(2rem, 5vh, 3.25rem);
  padding-left: 7rem;
}

/* Below the two-column threshold the index sits above the title rather than
   beside it, and the body loses its indent — otherwise the measure collapses. */
@media (max-width: 52rem) {
  .sb__head {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .sb__index {
    padding-top: 0;
  }

  .sb__body {
    padding-left: 0;
  }
}
</style>

<template>
  <div class="grid" aria-hidden="true">
    <span v-for="i in columns" :key="i" class="grid__line" />
  </div>
</template>

<script setup>
/*
  Fixed hairline column rules behind everything.

  Not decoration for its own sake: it gives the page a visible measuring system,
  so letterspaced headings and section numerals read as placed on a grid rather
  than floated in void.
*/
defineProps({
  columns: { type: Number, default: 5 },
})
</script>

<style scoped>
.grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  padding-inline: var(--ows-gutter);
  /* Fades in after the hero has landed, so the first frame is pure black. */
  opacity: 0;
  animation: grid-in 2s var(--ows-ease) 700ms forwards;
}

.grid__line {
  width: 1px;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--ows-line-soft) 12%,
    var(--ows-line-soft) 88%,
    transparent
  );
}

@keyframes grid-in {
  to {
    opacity: 1;
  }
}

/* Two interior rules are plenty on a phone; five would read as noise. */
@media (max-width: 52rem) {
  .grid__line:nth-child(even) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid {
    opacity: 1;
    animation: none;
  }
}
</style>

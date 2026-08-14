<template>
  <div class="miss">
    <h1 class="miss__title">Sin ficha</h1>
    <p class="miss__body">
      <template v-if="what">No hay ninguna designación con el identificador “{{ what }}”.</template>
      <template v-else>Esa dirección no corresponde a ninguna página de este catálogo.</template>
    </p>
    <RouterLink class="miss__back" to="/">Volver al catálogo</RouterLink>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({ what: { type: String, default: '' } })
</script>

<style scoped>
.miss {
  padding-block: clamp(3rem, 10vh, 6rem);
  max-width: 46ch;
}

.miss__title {
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: 500;
  color: var(--ows-ink);
}

.miss__body {
  margin-top: 0.75rem;
}

.miss__back {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.6875rem 1rem;
  border: 1px solid var(--ows-line);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink);
}

.miss__back:hover {
  border-color: var(--ows-ink);
}
</style>

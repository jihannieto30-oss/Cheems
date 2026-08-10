<template>
  <footer id="about" class="foot">
    <div class="foot__inner ows-shell">
      <div class="foot__brand">
        <BrandMark />
      </div>

      <nav class="foot__nav" aria-label="Sections">
        <a v-for="link in links" :key="link.href" class="foot__link" :href="link.href">
          {{ link.label }}
        </a>
      </nav>

      <p class="foot__meta">
        <span>{{ year }}</span>
        <span class="foot__sep" aria-hidden="true" />
        <span>TECHNICAL INDEX</span>
      </p>
    </div>
  </footer>
</template>

<script setup>
import BrandMark from './BrandMark.vue'

const links = [
  { label: 'KNOWLEDGE', href: '#knowledge' },
  { label: 'MATERIALS', href: '#materials' },
  { label: 'PROCESSES', href: '#processes' },
  { label: 'SOLUTIONS', href: '#solutions' },
]

const year = new Date().getFullYear()
</script>

<style scoped>
/* Black on black: the footer is felt as a boundary before it is read. */
.foot {
  position: relative;
  z-index: 1;
  background: var(--ows-surface);
  border-top: 1px solid var(--ows-line-soft);
  padding-block: clamp(3rem, 8vh, 5rem);
}

.foot__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem 3rem;
  flex-wrap: wrap;
}

.foot__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0 2rem;
  /* Cancels the links' own vertical padding so the row keeps its optical height. */
  margin-block: -0.375rem;
}

.foot__link {
  padding-block: 0.375rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  transition: color var(--ows-base) var(--ows-ease);
}

.foot__link:hover {
  color: var(--ows-ink);
}

.foot__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.foot__sep {
  width: 1.5rem;
  height: 1px;
  background: var(--ows-line);
}

@media (max-width: 52rem) {
  .foot__inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
}
</style>

<template>
  <footer class="foot">
    <div class="foot__top ows-shell">
      <div class="foot__brand">
        <OwsMark size="md" />
        <p class="foot__claim">{{ BRAND.promise }}</p>
      </div>

      <nav v-for="col in FOOTER" :key="col.title" class="foot__col" :aria-label="col.title">
        <h2 class="foot__col-title">{{ col.title }}</h2>
        <ul>
          <li v-for="link in col.items" :key="link.to">
            <RouterLink class="foot__link" :to="link.to">{{ link.label }}</RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="foot__bottom ows-shell">
      <p class="ows-meta">
        © {{ year }} {{ BRAND.code }} · {{ BRAND.name.toUpperCase() }}
      </p>
      <p class="ows-meta foot__sign">{{ BRAND.claim }}</p>
    </div>
  </footer>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import OwsMark from './OwsMark.vue'
import { FOOTER } from '../data/site'
import { BRAND } from '../brand'

const year = new Date().getFullYear()
</script>

<style scoped>
.foot {
  position: relative;
  z-index: var(--ows-z-content);
  background: var(--ows-surface);
  border-top: 1px solid var(--ows-line-soft);
}

.foot__top {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
  gap: 2.5rem;
  padding-block: clamp(2.5rem, 7vh, 4rem);
}

.foot__claim {
  margin-top: 1rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.foot__col-title {
  font-size: var(--ows-t-micro);
  font-weight: 500;
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink);
  margin-bottom: 1rem;
}

.foot__link {
  display: inline-block;
  padding-block: 0.375rem;
  font-size: var(--ows-t-body);
  color: var(--ows-ink-faint);
  transition: color var(--ows-fast) var(--ows-ease);
}

.foot__link:hover {
  color: var(--ows-ink);
}

.foot__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 2rem;
  padding-block: 1.25rem;
  border-top: 1px solid var(--ows-line-soft);
}

.foot__sign {
  color: var(--ows-ink-faint);
}

@media (max-width: 60rem) {
  .foot__top {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .foot__brand {
    grid-column: 1 / -1;
  }
}
</style>

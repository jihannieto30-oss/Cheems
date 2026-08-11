<template>
  <nav class="menu" aria-label="All sections" @keydown.esc="emit('close')">
    <div class="menu__inner ows-shell">
      <ul class="menu__list">
        <li v-for="(item, i) in items" :key="item.to" :style="{ '--i': i }">
          <RouterLink class="menu__link" :to="item.to" @click="emit('close')">
            <span class="menu__label">{{ item.label }}</span>
            <svg class="menu__chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5 L16 12 L9 19" />
            </svg>
          </RouterLink>
        </li>
      </ul>

      <footer class="menu__foot">
        <p class="menu__claim">KNOWLEDGE IS POWER</p>
        <p class="ows-meta">CONOCIMIENTO QUE UNE. SOLUCIONES QUE PERDURAN.</p>
      </footer>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { FACETS } from '../data'

const emit = defineEmits(['close'])

const items = [
  { label: 'Catalogue', to: '/catalog' },
  ...FACETS.map((f) => ({ label: f.label, to: `/browse/${f.slug}` })),
  { label: 'About', to: '/about' },
]
</script>

<style scoped>
.menu {
  position: fixed;
  inset: 0;
  z-index: var(--ows-z-menu);
  background: var(--ows-void);
  overflow-y: auto;
  display: flex;
  align-items: center;
}

.menu__inner {
  width: 100%;
  padding-block: calc(var(--ows-nav-h) + 2rem) 3rem;
}

.menu__list {
  border-top: 1px solid var(--ows-line-soft);
}

.menu__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: clamp(0.875rem, 2.4vh, 1.5rem) 0;
  border-bottom: 1px solid var(--ows-line-soft);
  color: var(--ows-ink-muted);
  transition: color var(--ows-base) var(--ows-ease);
  animation: menu-in var(--ows-base) var(--ows-ease) both;
  animation-delay: calc(var(--i) * 45ms + 60ms);
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.menu__link:hover {
  color: var(--ows-ink);
}

.menu__label {
  font-family: var(--ows-display);
  font-size: clamp(1.625rem, 5vw, 3rem);
  font-weight: var(--ows-display-weight);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.2;
}

.menu__chevron {
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  fill: none;
  stroke: var(--ows-ink-faint);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    transform var(--ows-base) var(--ows-ease),
    stroke var(--ows-base) var(--ows-ease);
}

.menu__link:hover .menu__chevron {
  stroke: var(--ows-red);
  transform: translateX(0.375rem);
}

.menu__foot {
  margin-top: clamp(2rem, 6vh, 4rem);
  padding-top: 1.5rem;
  border-top: 1px solid var(--ows-line-soft);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem 2rem;
}

.menu__claim {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink);
}

@media (prefers-reduced-motion: reduce) {
  .menu__link {
    animation: none;
  }
}
</style>

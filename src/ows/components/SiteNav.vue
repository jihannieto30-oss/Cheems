<template>
  <header class="nav" :class="{ 'nav--lifted': lifted, 'nav--open': open }">
    <RouterLink class="nav__brand" to="/" @click="open = false">
      <OwsMark variant="mark" size="sm" tone="brand" />
      <span class="nav__word">{{ BRAND.code }}</span>
    </RouterLink>

    <!--
      Not on the home screen. That screen is one object and one control, and a
      menu button is a third thing competing with both. Every other page keeps
      it, so nothing becomes unreachable once the reader is past the door.
    -->
    <button v-if="route.name !== 'home'" class="nav__toggle" :aria-expanded="open" aria-controls="ows-menu" @click="open = !open">
      <span class="ows-sr">{{ open ? 'Cerrar menú' : 'Abrir menú' }}</span>
      <span class="nav__label" aria-hidden="true">MENÚ</span>
      <span class="nav__bars" aria-hidden="true"><i /><i /><i /></span>
    </button>
  </header>

  <Transition name="menu">
    <MenuOverlay v-if="open" id="ows-menu" @close="open = false" />
  </Transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import OwsMark from './OwsMark.vue'
import MenuOverlay from './MenuOverlay.vue'
import { BRAND } from '../brand'

const open = ref(false)
const lifted = ref(false)
const route = useRoute()

// Navigating away must close the overlay, or it survives the route change.
watch(() => route.fullPath, () => (open.value = false))

watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

let frame = 0
const onScroll = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    lifted.value = window.scrollY > 30
  })
}
window.addEventListener('scroll', onScroll, { passive: true })

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--ows-z-nav);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  height: var(--ows-nav-h);
  padding-inline: var(--ows-gutter);
  border-bottom: 1px solid transparent;
  transition:
    background-color var(--ows-base) var(--ows-ease),
    border-color var(--ows-base) var(--ows-ease);
}

.nav--lifted:not(.nav--open) {
  background: rgb(0 0 0 / 0.82);
  backdrop-filter: blur(16px);
  border-bottom-color: var(--ows-line-soft);
}

.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding-block: 0.5rem;
  margin-block: -0.5rem;
  /* The monogram alone does not say whose site this is, and this brand is not
     famous enough for that to be a stylistic choice. The name is set beside
     it rather than using the lockup, whose own wordmark would be four pixels
     tall at this height. */
  color: var(--ows-ink);
}

.nav__word {
  font-size: var(--ows-t-meta);
  font-weight: 500;
  letter-spacing: 0.34em;
  /* Cancels the trailing space the tracking adds after the final glyph. */
  margin-right: -0.34em;
}

/* Dropped only where the bar genuinely runs out of room; 390px phones keep
   the name. */
@media (max-width: 22rem) {
  .nav__word {
    display: none;
  }
}

.nav__links {
  display: flex;
  align-items: center;
  gap: 2.25rem;
  margin-left: auto;
  margin-right: 0.5rem;
}

.nav__link {
  position: relative;
  padding-block: 0.5rem;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink-muted);
  transition: color var(--ows-base) var(--ows-ease);
}

.nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0.125rem;
  width: 100%;
  height: 1px;
  background: var(--ows-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--ows-base) var(--ows-ease);
}

.nav__link:hover,
.nav__link.router-link-active {
  color: var(--ows-ink);
}

.nav__link:hover::after,
.nav__link.router-link-active::after {
  transform: scaleX(1);
}

.nav__toggle {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  height: 2.75rem;
  padding-inline: 0.75rem;
  margin-right: -0.75rem;
  position: relative;
  z-index: calc(var(--ows-z-menu) + 1);
}

.nav__label {
  font-size: var(--ows-t-micro);
  font-weight: 300;
  letter-spacing: 0.34em;
  color: var(--ows-ink-muted);
  transition: color var(--ows-fast) var(--ows-ease);
}

.nav__toggle:hover .nav__label {
  color: var(--ows-ink);
}

@media (max-width: 30rem) {
  .nav__label {
    display: none;
  }
}

.nav__bars {
  display: block;
  width: 1.25rem;
  height: 0.625rem;
  position: relative;
}

.nav__bars i {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: var(--ows-ink);
  transition:
    transform var(--ows-base) var(--ows-ease),
    opacity var(--ows-fast) var(--ows-ease);
}

.nav__bars i:nth-child(1) {
  top: 0;
}
.nav__bars i:nth-child(2) {
  top: 50%;
}
.nav__bars i:nth-child(3) {
  top: 100%;
}

.nav--open .nav__bars i:nth-child(1) {
  transform: translateY(0.3125rem) rotate(45deg);
}
.nav--open .nav__bars i:nth-child(2) {
  opacity: 0;
}
.nav--open .nav__bars i:nth-child(3) {
  transform: translateY(-0.3125rem) rotate(-45deg);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity var(--ows-base) var(--ows-ease);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}

@media (max-width: 46rem) {
  .nav__links {
    display: none;
  }
}
</style>

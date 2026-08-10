<template>
  <header class="nav" :class="{ 'nav--lifted': lifted, 'nav--open': open }">
    <a class="nav__brand" href="#top" @click="close">
      <BrandMark />
    </a>

    <button class="nav__toggle" :aria-expanded="open" aria-controls="ows-menu" @click="open = !open">
      <span class="ows-sr">{{ open ? 'Close menu' : 'Open menu' }}</span>
      <span class="nav__bars" aria-hidden="true">
        <i /><i /><i />
      </span>
    </button>
  </header>

  <Transition name="menu">
    <nav v-if="open" id="ows-menu" class="menu" @keydown.esc="close">
      <ul class="menu__list">
        <li v-for="(item, i) in items" :key="item.href" :style="{ '--i': i }">
          <a class="menu__link" :href="item.href" @click="close">
            <span class="menu__index">{{ item.index }}</span>
            <span class="menu__label">{{ item.label }}</span>
          </a>
        </li>
      </ul>

      <!-- Placeholder A/B lives here rather than in the UI proper: available
           to anyone evaluating the two treatments, invisible to everyone else. -->
      <div class="menu__foot">
        <span class="ows-meta">PLACEHOLDER</span>
        <div class="menu__modes">
          <button
            v-for="mode in ['quiet', 'reveal']"
            :key="mode"
            class="menu__mode"
            :class="{ 'is-on': placeholderMode === mode }"
            @click="emit('set-placeholder', mode)"
          >
            {{ mode }}
          </button>
        </div>
      </div>
    </nav>
  </Transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import BrandMark from './BrandMark.vue'

defineProps({
  placeholderMode: { type: String, default: 'quiet' },
})
const emit = defineEmits(['set-placeholder'])

const open = ref(false)
const lifted = ref(false)

const items = [
  { index: '', label: 'SEARCH', href: '#top' },
  { index: '01', label: 'KNOWLEDGE', href: '#knowledge' },
  { index: '02', label: 'MATERIALS', href: '#materials' },
  { index: '03', label: 'PROCESSES', href: '#processes' },
  { index: '04', label: 'SOLUTIONS', href: '#solutions' },
  { index: '', label: 'ABOUT', href: '#about' },
]

function close() {
  open.value = false
}

// The bar picks up a backdrop only once it is over content.
let frame = 0
const onScroll = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    lifted.value = window.scrollY > 40
  })
}
window.addEventListener('scroll', onScroll, { passive: true })

watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

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
  gap: 1rem;
  padding: 1.5rem var(--ows-gutter);
  transition:
    background-color var(--ows-base) var(--ows-ease),
    border-color var(--ows-base) var(--ows-ease),
    backdrop-filter var(--ows-base) var(--ows-ease);
  border-bottom: 1px solid transparent;
}

.nav--lifted:not(.nav--open) {
  background: rgb(0 0 0 / 0.72);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--ows-line-soft);
}

/* Padding pulled back out by the negative margin: the hit area clears the
   24px minimum without the wordmark shifting off its optical position. */
.nav__brand {
  display: inline-flex;
  padding-block: 0.5rem;
  margin-block: -0.5rem;
}

.nav__toggle {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: -0.5rem;
}

.nav__bars {
  display: block;
  width: 1.125rem;
  height: 0.5rem;
  position: relative;
}

.nav__bars i {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
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

/* Three rules collapse into a cross. */
.nav--open .nav__bars i:nth-child(1) {
  transform: translateY(0.25rem) rotate(45deg);
}
.nav--open .nav__bars i:nth-child(2) {
  opacity: 0;
}
.nav--open .nav__bars i:nth-child(3) {
  transform: translateY(-0.25rem) rotate(-45deg);
}

/* ---- overlay ---- */

.menu {
  position: fixed;
  inset: 0;
  z-index: calc(var(--ows-z-nav) - 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3rem;
  padding: 7rem var(--ows-gutter) 3rem;
  background: var(--ows-void);
}

.menu__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu__link {
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
  padding: 0.5rem 0;
  color: var(--ows-ink-faint);
  transition: color var(--ows-base) var(--ows-ease);
  animation: menu-item var(--ows-base) var(--ows-ease) both;
  animation-delay: calc(var(--i) * 45ms + 80ms);
}

@keyframes menu-item {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.menu__link:hover {
  color: var(--ows-ink);
}

.menu__index {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  width: 2ch;
  flex: none;
  color: var(--ows-ink-faint);
}

.menu__label {
  font-size: clamp(1.5rem, 5.5vw, 2.75rem);
  font-weight: 300;
  letter-spacing: 0.24em;
  line-height: 1.25;
}

.menu__foot {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--ows-line-soft);
}

.menu__modes {
  display: flex;
  gap: 0.5rem;
}

.menu__mode {
  padding: 0.3125rem 0.75rem;
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

.menu__mode:hover {
  color: var(--ows-ink-muted);
  border-color: var(--ows-line-strong);
}

.menu__mode.is-on {
  color: var(--ows-ink);
  border-color: rgb(255 255 255 / 0.4);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity var(--ows-base) var(--ows-ease);
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .menu__link {
    animation: none;
  }
}
</style>

<template>
  <section id="top" class="hero">
    <!-- Extremely faint light source behind the field. The only thing in the
         hero that is not black, and it is barely not black. -->
    <span class="hero__light" aria-hidden="true" />

    <div class="hero__center">
      <span class="hero__glyph" aria-hidden="true">
        <BrandMark size="lg" :wordmark="false" />
      </span>

      <SearchField :placeholder-mode="placeholderMode" shortcut />
    </div>

    <footer class="hero__foot ows-shell">
      <span class="ows-meta hero__count">{{ indexed }} RECORDS INDEXED</span>
      <span class="hero__cue" aria-hidden="true">
        <i />
      </span>
      <span class="ows-meta hero__key">
        <kbd>/</kbd>
      </span>
    </footer>
  </section>
</template>

<script setup>
import BrandMark from './BrandMark.vue'
import SearchField from './SearchField.vue'
import { KNOWLEDGE } from '../data/knowledge'

defineProps({
  placeholderMode: { type: String, default: 'quiet' },
})

const indexed = String(KNOWLEDGE.length).padStart(3, '0')
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8rem var(--ows-gutter) 2rem;
  overflow: hidden;
}

.hero__light {
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(120vw, 70rem);
  aspect-ratio: 2 / 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    ellipse at center,
    rgb(255 255 255 / 0.055) 0%,
    rgb(255 255 255 / 0.018) 34%,
    transparent 68%
  );
  pointer-events: none;
  opacity: 0;
  animation: light-in 2.6s var(--ows-ease) 200ms forwards;
}

@keyframes light-in {
  to {
    opacity: 1;
  }
}

.hero__center {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2.5rem, 7vh, 5rem);
  position: relative;
}

.hero__glyph {
  opacity: 0;
  animation: rise 1.4s var(--ows-ease) 260ms forwards;
}

.hero__center :deep(.field) {
  opacity: 0;
  animation: rise 1.4s var(--ows-ease) 460ms forwards;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  opacity: 0;
  animation: fade-in 1.6s var(--ows-ease) 1.1s forwards;
}

@keyframes fade-in {
  to {
    opacity: 1;
  }
}

.hero__count,
.hero__key {
  flex: 1 1 0;
}

.hero__key {
  text-align: right;
}

.hero__key kbd {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--ows-line);
  color: var(--ows-ink-faint);
}

/* Scroll cue: a single rule that travels down and vanishes. No arrow, no word. */
.hero__cue {
  display: block;
  width: 1px;
  height: 3.5rem;
  overflow: hidden;
  background: var(--ows-line);
}

.hero__cue i {
  display: block;
  width: 100%;
  height: 45%;
  background: linear-gradient(to bottom, transparent, var(--ows-ink-muted));
  animation: cue 2.8s var(--ows-ease-io) infinite;
}

@keyframes cue {
  0% {
    transform: translateY(-100%);
  }
  60%,
  100% {
    transform: translateY(240%);
  }
}

@media (max-width: 40rem) {
  .hero {
    padding-top: 6rem;
  }
  .hero__cue {
    height: 2.5rem;
  }
  .hero__key {
    display: none;
  }
  .hero__count {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__light,
  .hero__glyph,
  .hero__foot,
  .hero__center :deep(.field) {
    opacity: 1;
    animation: none;
    transform: none;
  }
  .hero__cue i {
    animation: none;
    transform: translateY(120%);
  }
}
</style>

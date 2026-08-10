<template>
  <SectionShell id="solutions" index="04" title="SOLUTIONS">
    <div class="sol__bg" aria-hidden="true">
      <ParallaxImage
        src="/ows/section.svg"
        alt=""
        :depth="8"
        :scale="1.25"
        :scrim="0.72"
        :hairlines="false"
      />
    </div>

    <p class="sol__lead" v-reveal>
      The index is not an archive. Every record exists to close the distance between a
      defect on the bench and the change that removes it.
    </p>

    <div class="sol">
      <!-- Selector -->
      <ul class="sol__nav" role="tablist" aria-label="Defects">
        <li v-for="(entry, i) in SOLUTIONS" :key="entry.id" v-reveal="{ delay: i * 70 }">
          <button
            class="sol__tab"
            :class="{ 'is-on': entry.id === activeId }"
            role="tab"
            :aria-selected="entry.id === activeId"
            @click="activeId = entry.id"
            @mouseenter="activeId = entry.id"
          >
            <span class="sol__tab-rule" aria-hidden="true" />
            <span class="sol__tab-label">{{ entry.title }}</span>
          </button>
        </li>
      </ul>

      <!-- Chain -->
      <div class="sol__stage" v-reveal="{ delay: 120 }">
        <Transition name="chain" mode="out-in">
          <article :key="active.id" class="chain">
            <header class="chain__head">
              <h3 class="chain__title">{{ active.title }}</h3>
              <span class="ows-meta">{{ active.standard }}</span>
            </header>

            <p class="chain__premise">{{ active.premise }}</p>

            <span class="chain__arrow" aria-hidden="true"><i /></span>
            <span class="ows-meta chain__step">CAUSE</span>

            <div class="chain__vectors">
              <section v-for="vector in active.vectors" :key="vector.label" class="vector">
                <h4 class="vector__label">{{ vector.label }}</h4>
                <ul class="vector__checks">
                  <li v-for="check in vector.checks" :key="check">{{ check }}</li>
                </ul>
              </section>
            </div>

            <span class="chain__arrow" aria-hidden="true"><i /></span>
            <span class="ows-meta chain__step">RESOLUTION</span>

            <ol class="chain__resolution">
              <li v-for="(step, i) in active.resolution" :key="step">
                <span class="chain__num">{{ String(i + 1).padStart(2, '0') }}</span>
                <span>{{ step }}</span>
              </li>
            </ol>
          </article>
        </Transition>
      </div>
    </div>
  </SectionShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import SectionShell from './SectionShell.vue'
import ParallaxImage from './ParallaxImage.vue'
import { SOLUTIONS } from '../data/solutions'

const activeId = ref(SOLUTIONS[0].id)
const active = computed(() => SOLUTIONS.find((s) => s.id === activeId.value) ?? SOLUTIONS[0])
</script>

<style scoped>
/* Held well below the type. The drawing is meant to be sensed behind the
   content, not read alongside it — at higher opacity its bevel lines and
   callouts compete with the text instead of sitting under it. */
.sol__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.3;
  mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 75%, transparent);
}

.sol__bg :deep(.pxi) {
  height: 100%;
}

.sol__lead {
  max-width: 44ch;
  margin-bottom: clamp(3rem, 8vh, 5rem);
  font-size: var(--ows-t-lead);
  line-height: 1.65;
  color: var(--ows-ink-muted);
}

.sol {
  display: grid;
  grid-template-columns: minmax(11rem, 15rem) minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: start;
}

/* ---- selector ---- */

.sol__nav {
  position: sticky;
  top: 6rem;
  border-top: 1px solid var(--ows-line-soft);
}

.sol__tab {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  padding: 0.9375rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
  text-align: left;
}

.sol__tab-rule {
  width: 0.75rem;
  height: 1px;
  flex: none;
  background: var(--ows-ink-faint);
  transition:
    width var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.sol__tab.is-on .sol__tab-rule {
  width: 2rem;
  background: var(--ows-ink);
}

.sol__tab-label {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  transition: color var(--ows-base) var(--ows-ease);
}

.sol__tab.is-on .sol__tab-label {
  color: var(--ows-ink);
}

/* ---- chain ---- */

.sol__stage {
  min-height: 34rem;
}

.chain__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--ows-line);
}

.chain__title {
  font-size: clamp(1.5rem, 4.5vw, 2.75rem);
  font-weight: 300;
  letter-spacing: 0.22em;
  color: var(--ows-ink);
  line-height: 1.1;
}

.chain__premise {
  max-width: 52ch;
  margin-top: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

/* Vertical connector with a travelling highlight — the visual grammar of
   "this leads to that". */
.chain__arrow {
  display: block;
  width: 1px;
  height: 3rem;
  margin: 1.75rem 0 0.875rem;
  background: var(--ows-line);
  overflow: hidden;
}

.chain__arrow i {
  display: block;
  width: 100%;
  height: 40%;
  background: linear-gradient(to bottom, transparent, var(--ows-ink-muted));
  animation: chain-run 2.4s var(--ows-ease-io) infinite;
}

@keyframes chain-run {
  0% {
    transform: translateY(-100%);
  }
  70%,
  100% {
    transform: translateY(260%);
  }
}

.chain__step {
  display: block;
  margin-bottom: 1.25rem;
}

.chain__vectors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
}

.vector {
  padding: 1.25rem 1.125rem 1.375rem;
  background: var(--ows-void);
  transition: background-color var(--ows-base) var(--ows-ease);
}

.vector:hover {
  background: var(--ows-raised);
}

.vector__label {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  font-weight: 400;
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink);
  margin-bottom: 0.875rem;
}

.vector__checks li {
  position: relative;
  padding-left: 0.875rem;
  font-size: 0.78125rem;
  line-height: 1.6;
  color: var(--ows-ink-faint);
  margin-bottom: 0.4375rem;
  transition: color var(--ows-base) var(--ows-ease);
}

.vector:hover .vector__checks li {
  color: var(--ows-ink-muted);
}

.vector__checks li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 0.375rem;
  height: 1px;
  background: currentColor;
  opacity: 0.6;
}

.chain__resolution {
  border-top: 1px solid var(--ows-line-soft);
}

.chain__resolution li {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.9375rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
  font-size: 0.84375rem;
  line-height: 1.55;
  color: var(--ows-ink-muted);
}

.chain__num {
  flex: none;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

/* ---- swap ---- */

.chain-enter-active,
.chain-leave-active {
  transition:
    opacity 300ms var(--ows-ease),
    transform 300ms var(--ows-ease);
}
.chain-enter-from {
  opacity: 0;
  transform: translateY(1rem);
}
.chain-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}

@media (max-width: 60rem) {
  .sol__bg {
    opacity: 0.2;
  }
  .sol {
    grid-template-columns: minmax(0, 1fr);
  }
  .sol__nav {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.25rem;
    border-top: 0;
    border-bottom: 1px solid var(--ows-line-soft);
  }
  .sol__nav li {
    flex: none;
  }
  .sol__tab {
    width: auto;
    border-bottom: 0;
    padding: 0.625rem 0;
  }
  .sol__stage {
    min-height: 0;
  }
}

/* The defect name and its governing standard stop fitting on one line well
   before the layout breaks — stack them rather than crushing both. */
@media (max-width: 34rem) {
  .chain__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.625rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chain__arrow i {
    animation: none;
    transform: translateY(150%);
  }
}
</style>

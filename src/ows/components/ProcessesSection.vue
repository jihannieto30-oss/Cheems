<template>
  <SectionShell id="processes" index="03" title="PROCESSES" layout="center" deep>
    <!-- The arc, pushed almost entirely into the black. It should register as
         light in the room rather than as a photograph. -->
    <div class="proc__bg" aria-hidden="true">
      <ParallaxImage
        src="/ows/arc.svg"
        alt=""
        :depth="14"
        :scale="1.4"
        :scrim="0.66"
        :hairlines="false"
      />
    </div>

    <div class="proc">
      <ul class="proc__list">
        <li
          v-for="(item, i) in processes"
          :key="item.id"
          class="proc__item"
          :class="{ 'is-open': open === item.id }"
          v-reveal="{ delay: i * 110 }"
          @mouseenter="open = item.id"
          @mouseleave="open = null"
        >
          <button class="proc__head" :aria-expanded="open === item.id" @click="toggle(item.id)">
            <span class="proc__rule" aria-hidden="true" />
            <span class="proc__name">{{ item.title }}</span>
            <span class="proc__spec">{{ item.spec ?? '—' }}</span>
          </button>

          <div class="proc__drawer">
            <div class="proc__drawer-inner">
              <p class="proc__summary">{{ item.summary }}</p>
              <dl class="proc__facets">
                <div v-for="facet in item.facets" :key="facet.k" class="proc__facet">
                  <dt>{{ facet.k }}</dt>
                  <dd>{{ facet.v }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </SectionShell>
</template>

<script setup>
import { ref } from 'vue'
import SectionShell from './SectionShell.vue'
import ParallaxImage from './ParallaxImage.vue'
import { KNOWLEDGE } from '../data/knowledge'

/*
  Sourced from the same index the search reads. A process shown here and a
  process returned by a query are the same record — there is no second copy of
  the truth to drift.
*/
const ORDER = ['gtaw', 'gmaw', 'smaw', 'fcaw', 'saw']
const processes = ORDER.map((id) => KNOWLEDGE.find((r) => r.id === id)).filter(Boolean)

const open = ref(null)

// Pointer opens on hover; this is the keyboard and touch path.
function toggle(id) {
  open.value = open.value === id ? null : id
}
</script>

<style scoped>
.proc__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.5;
  mask-image: linear-gradient(to bottom, transparent, #000 25%, #000 70%, transparent);
}

.proc__bg :deep(.pxi) {
  height: 100%;
}

.proc {
  max-width: 58rem;
  margin-inline: auto;
}

.proc__item {
  border-bottom: 1px solid var(--ows-line-soft);
  transition: border-color var(--ows-base) var(--ows-ease);
}

.proc__item:first-child {
  border-top: 1px solid var(--ows-line-soft);
}

.proc__item.is-open {
  border-bottom-color: var(--ows-line-strong);
}

.proc__head {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
  width: 100%;
  padding: clamp(1.25rem, 3vh, 2rem) 0;
  text-align: left;
}

/* A rule that drives out from the left as the row opens. */
.proc__rule {
  width: 1.75rem;
  height: 1px;
  flex: none;
  background: var(--ows-ink-faint);
  transition:
    width var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.proc__item.is-open .proc__rule {
  width: 4.5rem;
  background: var(--ows-ink);
}

.proc__name {
  flex: 1 1 auto;
  font-size: clamp(1.375rem, 4.2vw, 2.5rem);
  font-weight: 300;
  letter-spacing: 0.26em;
  color: var(--ows-ink-faint);
  transition:
    color var(--ows-base) var(--ows-ease),
    text-shadow var(--ows-base) var(--ows-ease);
}

.proc__item.is-open .proc__name {
  color: var(--ows-ink);
  /* The single permitted glow, at the single permitted colour. */
  text-shadow: 0 0 34px rgb(255 255 255 / 0.28);
}

.proc__spec {
  flex: none;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  text-align: right;
  opacity: 0.55;
  transition: opacity var(--ows-base) var(--ows-ease);
}

.proc__item.is-open .proc__spec {
  opacity: 1;
}

/* 0fr → 1fr animates intrinsic height without measuring anything in JS. */
.proc__drawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--ows-base) var(--ows-ease);
}

.proc__item.is-open .proc__drawer {
  grid-template-rows: 1fr;
}

.proc__drawer-inner {
  overflow: hidden;
  min-height: 0;
}

.proc__summary {
  max-width: 54ch;
  margin: 0 0 1.25rem 3.75rem;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--ows-ink-muted);
  opacity: 0;
  transition: opacity var(--ows-base) var(--ows-ease);
}

.proc__facets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0 0 clamp(1.25rem, 3vh, 2rem) 3.75rem;
  opacity: 0;
  transition: opacity var(--ows-base) var(--ows-ease) 60ms;
}

.proc__item.is-open .proc__summary,
.proc__item.is-open .proc__facets {
  opacity: 1;
}

.proc__facet {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.3125rem 0.625rem;
  border: 1px solid var(--ows-line);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.proc__facet dt {
  color: var(--ows-ink-faint);
  text-transform: uppercase;
}

.proc__facet dd {
  color: var(--ows-ink-muted);
}

@media (max-width: 44rem) {
  .proc__spec {
    display: none;
  }
  .proc__summary,
  .proc__facets {
    margin-left: 2.75rem;
  }
}

@media (max-width: 34rem) {
  .proc__facet {
    white-space: normal;
  }
}
</style>

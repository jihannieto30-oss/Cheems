<template>
  <SectionShell id="materials" index="02" title="MATERIALS">
    <div class="mat">
      <!-- Image first in source and on screen: the wireframe puts the metal on
           the left and the language on the right. -->
      <div class="mat__media" v-reveal>
        <ParallaxImage
          src="/ows/stock.svg"
          alt="Round bar stock stacked end-on"
          :depth="12"
          :scrim="0.18"
        />
        <div class="mat__caption">
          <span class="ows-meta">STOCK · SECTION · FORM</span>
        </div>
      </div>

      <div class="mat__col">
        <p class="mat__lead" v-reveal="{ delay: 80 }">
          Carbon steel through nickel alloy. Base metal, filler metal, and the specification
          that binds one to the other.
        </p>

        <ul class="mat__list">
          <li
            v-for="(row, i) in rows"
            :key="row.label"
            class="mat__row"
            v-reveal="{ delay: 140 + i * 70 }"
          >
            <span class="mat__label">{{ row.label }}</span>
            <span class="mat__dash" aria-hidden="true" />
            <span class="mat__note">{{ row.note }}</span>
          </li>
        </ul>

        <div class="mat__plate" v-reveal="{ delay: 220 }">
          <ParallaxImage
            src="/ows/plate.svg"
            alt="Brushed steel plate under raking light"
            :depth="6"
            :scrim="0.34"
            :hairlines="false"
          />
        </div>
      </div>
    </div>
  </SectionShell>
</template>

<script setup>
import SectionShell from './SectionShell.vue'
import ParallaxImage from './ParallaxImage.vue'

// Editorial, not a catalogue dump. Six lines, each one a door.
const rows = [
  { label: 'METALS', note: 'CARBON · STAINLESS · AL · CU · NI · TI' },
  { label: 'ALLOYS', note: 'DUPLEX · CSEF · SPECIALTY' },
  { label: 'FILLER METALS', note: 'ER70S-6 · ER308L · ER4043 · ERCuSi-A' },
  { label: 'ELECTRODES', note: 'E7018 · E71T-1 · ENiFe-CI' },
  { label: 'CONSUMABLES', note: 'FLUX · GAS · TUNGSTEN · BACKING' },
  { label: 'SPECIFICATIONS', note: 'AWS A5 · ASME SFA · ASTM' },
]
</script>

<style scoped>
.mat {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 7vw, 6rem);
  align-items: start;
}

.mat__media :deep(.pxi) {
  aspect-ratio: 3 / 4;
}

.mat__caption {
  margin-top: 0.875rem;
}

.mat__lead {
  max-width: 32ch;
  font-size: var(--ows-t-lead);
  line-height: 1.65;
  color: var(--ows-ink-muted);
}

.mat__list {
  margin-top: clamp(2.5rem, 6vh, 3.5rem);
}

.mat__row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
}

.mat__row:first-child {
  border-top: 1px solid var(--ows-line-soft);
}

.mat__label {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink);
  white-space: nowrap;
}

/* Leader rule between term and detail — the typographic move that makes a
   list read as an index rather than a menu. */
.mat__dash {
  flex: 1 1 auto;
  height: 1px;
  min-width: 1rem;
  background: var(--ows-line);
}

.mat__note {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-micro);
  letter-spacing: 0.12em;
  color: var(--ows-ink-faint);
  text-align: right;
}

.mat__plate {
  margin-top: clamp(2.5rem, 6vh, 3.5rem);
}

.mat__plate :deep(.pxi) {
  aspect-ratio: 16 / 6;
}

@media (max-width: 60rem) {
  .mat {
    grid-template-columns: minmax(0, 1fr);
  }
  .mat__media :deep(.pxi) {
    aspect-ratio: 4 / 3;
  }
}

@media (max-width: 34rem) {
  .mat__row {
    flex-wrap: wrap;
    gap: 0.375rem 1rem;
  }
  .mat__dash {
    display: none;
  }
  .mat__note {
    width: 100%;
    text-align: left;
  }
}
</style>

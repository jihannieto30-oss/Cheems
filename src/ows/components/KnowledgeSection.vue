<template>
  <SectionShell id="knowledge" index="01" title="KNOWLEDGE">
    <div class="know">
      <div class="know__col">
        <p class="know__lead" v-reveal>
          Seven domains. Process, material, metallurgy, joint, inspection, failure, code —
          held in one index and reachable from one line.
        </p>

        <!-- Microreferences, not a glossary. Anyone who needs them defined is
             not the reader this page was built for. -->
        <ul class="know__refs">
          <li
            v-for="(ref, i) in refs"
            :key="ref"
            class="know__ref"
            v-reveal="{ delay: 120 + i * 60 }"
          >
            <span class="know__ref-rule" aria-hidden="true" />
            <span class="know__ref-text">{{ ref }}</span>
          </li>
        </ul>
      </div>

      <div class="know__media" v-reveal="{ delay: 160 }">
        <ParallaxImage
          src="/ows/arc.svg"
          alt="Welding arc at the puddle, seen in section"
          :depth="10"
          :scrim="0.22"
        />
        <div class="know__caption">
          <span class="ows-meta">ARC · TRANSFER · FUSION</span>
        </div>
      </div>
    </div>
  </SectionShell>
</template>

<script setup>
import SectionShell from './SectionShell.vue'
import ParallaxImage from './ParallaxImage.vue'

const refs = ['WPS', 'HAZ', 'GTAW', 'ER70S-6', '316L', 'PWHT', 'AWS D1.1']
</script>

<style scoped>
.know {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: clamp(2.5rem, 7vw, 6rem);
  align-items: start;
}

.know__lead {
  max-width: 30ch;
  font-size: var(--ows-t-lead);
  line-height: 1.65;
  color: var(--ows-ink-muted);
}

.know__refs {
  margin-top: clamp(2.5rem, 6vh, 4rem);
  border-top: 1px solid var(--ows-line-soft);
}

.know__ref {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
}

/* The rule grows on hover — the row acknowledges the pointer without moving. */
.know__ref-rule {
  width: 1.5rem;
  height: 1px;
  flex: none;
  background: var(--ows-ink-faint);
  transition:
    width var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.know__ref:hover .know__ref-rule {
  width: 3rem;
  background: var(--ows-ink);
}

.know__ref-text {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  transition: color var(--ows-base) var(--ows-ease);
}

.know__ref:hover .know__ref-text {
  color: var(--ows-ink);
}

.know__media :deep(.pxi) {
  aspect-ratio: 4 / 3;
}

.know__caption {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.875rem;
}

@media (max-width: 60rem) {
  .know {
    grid-template-columns: minmax(0, 1fr);
  }
  .know__media {
    order: -1;
  }
  .know__media :deep(.pxi) {
    aspect-ratio: 3 / 2;
  }
}
</style>

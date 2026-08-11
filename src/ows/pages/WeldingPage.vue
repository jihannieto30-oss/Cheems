<template>
  <div class="page">
    <PageHeader
      eyebrow="Soldadura"
      title="Cinco maneras de fundir dos cosas en una"
      lead="Ningún proceso es mejor que otro. Cada uno cambia una cosa por otra — velocidad por control, movilidad por limpieza — y elegir bien es saber qué se está entregando a cambio."
      :stats="stats"
    />

    <SectionBlock
      id="procesos"
      index="01"
      title="Los procesos, uno al lado del otro"
      lead="Corriente, protección y kilogramos por hora. Tres columnas explican más que cinco páginas de descripción."
    >
      <div class="matrix" role="region" aria-label="Comparación de procesos" tabindex="0">
        <table class="matrix__table">
          <thead>
            <tr>
              <th scope="col">Proceso</th>
              <th scope="col">Corriente</th>
              <th scope="col">Protección</th>
              <th scope="col">Depósito</th>
              <th scope="col">Posiciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in PROCESSES" :key="p.code">
              <th scope="row">
                <RouterLink
                  v-if="hasRecord(p.record)"
                  class="matrix__link"
                  :to="{ name: 'product', params: { id: p.record } }"
                >
                  <span class="matrix__code">{{ p.code }}</span>
                  <span class="matrix__name">{{ p.name }}</span>
                </RouterLink>
                <template v-else>
                  <span class="matrix__code">{{ p.code }}</span>
                  <span class="matrix__name">{{ p.name }}</span>
                </template>
              </th>
              <td>{{ p.current }}</td>
              <td>{{ p.shielding }}</td>
              <td class="ows-num">{{ p.deposition }}</td>
              <td>{{ p.positions }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="trade">
        <li v-for="(p, i) in PROCESSES" :key="p.code" class="trade__item" v-reveal="{ delay: i * 70 }">
          <p class="trade__code">{{ p.code }}</p>
          <p class="trade__strength">{{ p.strength }}</p>
          <p class="trade__limit">
            <span class="trade__limit-label">A cambio</span>
            {{ p.limit }}
          </p>
        </li>
      </ul>
    </SectionBlock>

    <SectionBlock
      id="seleccion"
      index="02"
      title="Qué está pidiendo el trabajo"
      lead="La pregunta útil no es cuál es el mejor proceso, sino cuál resuelve esta junta, en este espesor, en este lugar."
    >
      <SpecList :rows="SELECTION" />
    </SectionBlock>

    <SectionBlock
      id="defectos"
      index="03"
      title="Lo que sale mal, y cómo se reconoce"
      lead="Cinco fallas cubren la mayor parte de lo que se rechaza en inspección. Todas se diagnostican antes de cortar la pieza."
    >
      <ul class="defects">
        <li v-for="(d, i) in DEFECTS" :key="d.record" v-reveal="{ delay: i * 70 }">
          <component
            :is="hasRecord(d.record) ? RouterLink : 'div'"
            class="defect"
            v-bind="hasRecord(d.record) ? { to: { name: 'product', params: { id: d.record } } } : {}"
          >
            <p class="defect__name">{{ d.name }}</p>
            <p class="defect__tell">{{ d.tell }}</p>
            <p class="defect__cause">{{ d.cause }}</p>
            <svg v-if="hasRecord(d.record)" class="defect__arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5 L16 12 L9 19" />
            </svg>
          </component>
        </li>
      </ul>
    </SectionBlock>

    <NextPage
      eyebrow="Siguiente"
      title="El catálogo"
      lead="Elegido el proceso, queda elegir con qué se deposita."
      :to="PAGES.products.to"
    />
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import SectionBlock from '../components/SectionBlock.vue'
import SpecList from '../components/SpecList.vue'
import NextPage from '../components/NextPage.vue'
import { PROCESSES, SELECTION, DEFECTS } from '../data/welding'
import { PAGES } from '../data/site'
import { getRecord } from '../data'

/*
  A row only becomes a link when the article behind it actually exists. The
  process and defect tables are written independently of the corpus, and a
  RouterLink to a missing id would render a dead destination rather than fail
  loudly, so the check happens here.
*/
const hasRecord = (id) => Boolean(id && getRecord(id))

const stats = [
  { label: 'Procesos', value: String(PROCESSES.length).padStart(2, '0') },
  { label: 'Criterios de selección', value: String(SELECTION.length).padStart(2, '0') },
  { label: 'Defectos indexados', value: String(DEFECTS.length).padStart(2, '0') },
]
</script>

<style scoped>
.page {
  min-height: 100svh;
}

/* ---- comparison matrix ---- */

/* Five columns of technical data cannot reflow to one column and still be
   comparable, so on a narrow screen the table scrolls inside itself rather
   than stacking or forcing the page sideways. */
.matrix {
  overflow-x: auto;
  border-top: 1px solid var(--ows-line-soft);
}

.matrix:focus-visible {
  outline: 2px solid var(--ows-red);
  outline-offset: 3px;
}

.matrix__table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

.matrix__table th,
.matrix__table td {
  text-align: left;
  vertical-align: top;
  padding: 1.125rem 1.25rem 1.125rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
  font-size: var(--ows-t-body);
  font-weight: 400;
  color: var(--ows-ink-muted);
}

.matrix__table thead th {
  padding-block: 0.75rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.matrix__link {
  display: block;
  color: inherit;
}

.matrix__code {
  display: block;
  font-family: var(--ows-display);
  font-size: 1rem;
  font-weight: var(--ows-display-weight);
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
  transition: color var(--ows-fast) var(--ows-ease);
}

.matrix__link:hover .matrix__code {
  color: var(--ows-red);
}

.matrix__name {
  display: block;
  margin-top: 0.3rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

/* ---- what each one trades away ---- */

.trade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(17rem, 100%), 1fr));
  gap: 2rem 2.5rem;
  margin-top: clamp(2.5rem, 7vh, 4rem);
}

.trade__code {
  font-family: var(--ows-display);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-red);
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ows-line-soft);
}

.trade__strength {
  margin-top: 1rem;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink);
  text-wrap: pretty;
}

.trade__limit {
  margin-top: 0.875rem;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-faint);
  text-wrap: pretty;
}

.trade__limit-label {
  display: block;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  margin-bottom: 0.25rem;
}

/* ---- defects ---- */

.defects {
  border-top: 1px solid var(--ows-line-soft);
}

.defect {
  display: grid;
  grid-template-columns: minmax(0, 12rem) minmax(0, 16rem) minmax(0, 1fr) 1.5rem;
  gap: 0.5rem 2rem;
  align-items: baseline;
  padding-block: 1.375rem;
  border-bottom: 1px solid var(--ows-line-soft);
  color: inherit;
}

.defect__name {
  font-family: var(--ows-display);
  font-size: 1.0625rem;
  font-weight: var(--ows-display-weight);
  letter-spacing: 0.04em;
  color: var(--ows-ink);
  transition: color var(--ows-fast) var(--ows-ease);
}

a.defect:hover .defect__name {
  color: var(--ows-red);
}

.defect__tell {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.defect__cause {
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.defect__arrow {
  width: 1.25rem;
  height: 1.25rem;
  align-self: center;
  justify-self: end;
  fill: none;
  stroke: var(--ows-ink-faint);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    transform var(--ows-fast) var(--ows-ease),
    stroke var(--ows-fast) var(--ows-ease);
}

a.defect:hover .defect__arrow {
  stroke: var(--ows-red);
  transform: translateX(0.25rem);
}

@media (max-width: 62rem) {
  .defect {
    grid-template-columns: minmax(0, 1fr) 1.5rem;
  }

  .defect__name,
  .defect__tell,
  .defect__cause {
    grid-column: 1;
  }

  .defect__arrow {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>

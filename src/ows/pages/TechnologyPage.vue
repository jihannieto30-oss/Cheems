<template>
  <div class="page">
    <PageHeader
      eyebrow="Tecnología"
      title="De metal a material"
      lead="Una colada de acero no tiene grado, no tiene norma y no tiene garantía. Lo que sigue es lo que ocurre entre esa colada y una designación con la que se puede firmar un procedimiento."
      :stats="stats"
    />

    <!-- The four stages, each with its own numbered chapter and property list. -->
    <SectionBlock
      v-for="stage in MATERIAL_SCIENCE"
      :id="stage.id"
      :key="stage.id"
      :index="stage.index"
      :title="stage.title"
      :lead="stage.lead"
    >
      <div class="stage">
        <SpecList :rows="stage.rows" />
        <aside class="stage__aside" v-reveal>
          <p class="stage__label">{{ stage.label }}</p>
          <p class="stage__ord ows-num">{{ stage.index }} / {{ pad(MATERIAL_SCIENCE.length) }}</p>
        </aside>
      </div>
    </SectionBlock>

    <SectionBlock
      id="control"
      index="05"
      title="El control es lo que lo hace repetible"
      lead="Las cuatro etapas anteriores describen un material. Éstas describen por qué el siguiente lote va a comportarse igual que el anterior."
    >
      <SpecList :rows="CONTROL" />
    </SectionBlock>

    <NextPage
      eyebrow="Siguiente"
      title="Los procesos"
      lead="El material ya está especificado. Lo que decide si la unión resiste es cómo se deposita."
      :to="PAGES.welding.to"
    />
  </div>
</template>

<script setup>
import PageHeader from '../components/PageHeader.vue'
import SectionBlock from '../components/SectionBlock.vue'
import SpecList from '../components/SpecList.vue'
import NextPage from '../components/NextPage.vue'
import { MATERIAL_SCIENCE, CONTROL } from '../data/technology'
import { PAGES } from '../data/site'

const pad = (n) => String(n).padStart(2, '0')

const stats = [
  { label: 'Etapas', value: pad(MATERIAL_SCIENCE.length) },
  { label: 'Propiedades controladas', value: MATERIAL_SCIENCE.reduce((n, s) => n + s.rows.length, 0) },
  { label: 'Puntos de control', value: pad(CONTROL.length) },
]
</script>

<style scoped>
.page {
  min-height: 100svh;
}

/*
  The stage label sits in the right margin as a running head rather than above
  the list: the numbered index on the left already opens the section, and a
  second heading over the table would just repeat it.
*/
.stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9rem;
  gap: 2.5rem;
  align-items: start;
}

.stage__aside {
  position: sticky;
  top: calc(var(--ows-nav-h) + 2rem);
  text-align: right;
  border-right: 2px solid var(--ows-red);
  padding-right: 1rem;
}

.stage__label {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink);
}

.stage__ord {
  margin-top: 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

@media (max-width: 60rem) {
  .stage {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .stage__aside {
    position: static;
    order: -1;
    text-align: left;
    border-right: 0;
    border-left: 2px solid var(--ows-red);
    padding-right: 0;
    padding-left: 1rem;
  }
}
</style>

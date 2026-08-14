<template>
  <div>
    <header class="head">
      <h1 class="head__title">{{ section ? section.es : 'Todas las familias' }}</h1>
      <p v-if="section" class="head__en ows-meta">{{ section.en }}</p>
      <p class="head__count ows-meta">
        {{ rows.length }} {{ rows.length === 1 ? 'designación' : 'designaciones' }}
        <template v-if="query"> · filtrando “{{ query }}”</template>
      </p>
    </header>

    <p v-if="!rows.length" class="empty">
      Ninguna designación coincide con “{{ query }}” en esta familia.
    </p>

    <!--
      A table, because that is what a catalogue is. Designation, the form it is
      supplied in, the specification it is classified under, the process, and
      whether a sheet exists behind it — the last column is the one that says
      what is real, and it says PENDIENTE rather than pretending.
    -->
    <div v-else class="scroll">
      <table class="list">
        <thead>
          <tr>
            <th scope="col">Designación</th>
            <th scope="col">Forma</th>
            <th scope="col">Especificación</th>
            <th scope="col">Proceso</th>
            <th scope="col" class="list__last">Ficha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.id">
            <th scope="row">
              <RouterLink class="list__link" :to="{ name: 'sheet', params: { id: item.id } }">
                {{ item.designation }}
              </RouterLink>
            </th>
            <td>{{ formsOf(item) }}</td>
            <td>{{ item.spec }}</td>
            <td>{{ item.process }}</td>
            <td class="list__last">
              <span :class="['tag', item.sheet ? 'tag--on' : 'tag--off']">
                {{ item.sheet ? 'COMPLETA' : 'PENDIENTE' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="note">
      Una ficha marcada COMPLETA lleva composición y propiedades tomadas de un
      documento de laboratorio. Una marcada PENDIENTE publica su clasificación,
      que se deriva de la designación, y nada más: esos valores se miden, no se
      deducen. Cualquiera de las dos se edita y se descarga en PDF desde su
      propia página.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CATALOG, SECTIONS, FORMS } from '../../ows/data/catalog'

const props = defineProps({
  slug: { type: String, default: '' },
  query: { type: String, default: '' },
})

const section = computed(() => SECTIONS.find((s) => s.slug === props.slug) ?? null)

const formsOf = (item) => item.forms.map((f) => FORMS[f]?.es).filter(Boolean).join(' · ')

/*
  Matching is done on a folded string — accents stripped, case dropped — over
  the designation, the specification and the process together, so "inoxidable"
  and "gtaw" and "316" all find something without needing three fields.
*/
const fold = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const rows = computed(() => {
  const q = fold(props.query.trim())
  return CATALOG.filter((item) => {
    if (props.slug && item.section !== props.slug) return false
    if (!q) return true
    return fold(`${item.designation} ${item.spec} ${item.process} ${item.note}`).includes(q)
  })
})
</script>

<style scoped>
.head {
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--ows-ink);
}

.head__title {
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: 500;
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.head__en {
  margin-top: 0.25rem;
}

.head__count {
  margin-top: 0.625rem;
}

.empty {
  padding: 2rem 0;
  color: var(--ows-ink-faint);
}

.scroll {
  overflow-x: auto;
}

.list {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ows-t-meta);
  white-space: nowrap;
}

.list th,
.list td {
  text-align: left;
  padding: 0.6875rem 1rem 0.6875rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
}

.list thead th {
  padding-top: 0.875rem;
  font-size: var(--ows-t-micro);
  font-weight: 400;
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  border-bottom-color: var(--ows-line);
}

.list tbody th {
  font-weight: 500;
  padding-right: 1.5rem;
}

.list td {
  font-family: var(--ows-mono);
  color: var(--ows-ink-muted);
}

.list__last {
  text-align: right !important;
  padding-right: 0 !important;
}

.list__link {
  display: block;
  /* The row is the target; the padding here is what makes it 44px tall. */
  padding-block: 0.5rem;
  margin-block: -0.5rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-body);
  color: var(--ows-ink);
  box-shadow: inset 0 -1px 0 var(--ows-line);
  transition: box-shadow var(--ows-fast) var(--ows-ease);
}

.list__link:hover {
  box-shadow: inset 0 -1px 0 var(--ows-red);
}

.tag {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
}

.tag--on {
  color: var(--ows-ink);
}

.tag--off {
  color: var(--ows-ink-faint);
}

.note {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ows-line-soft);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-faint);
  max-width: 68ch;
}
</style>

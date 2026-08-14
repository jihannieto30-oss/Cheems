<template>
  <div v-if="sheet">
    <nav class="crumb no-print" aria-label="Ruta">
      <RouterLink class="ows-tap" to="/">Fichas</RouterLink>
      <span aria-hidden="true">/</span>
      <RouterLink v-if="section" class="ows-tap" :to="{ name: 'family', params: { slug: section.slug } }">
        {{ section.es }}
      </RouterLink>
      <span aria-hidden="true">/</span>
      <span class="crumb__here">{{ sheet.designation || sheet.title }}</span>
    </nav>

    <DataSheet :sheet="sheet" />

    <div class="acts no-print">
      <button class="acts__btn acts__btn--go" @click="download">DESCARGAR PDF</button>
      <button class="acts__btn" @click="print">IMPRIMIR</button>
      <button class="acts__btn" @click="editing = true">
        {{ edited ? 'EDITAR · MODIFICADA' : 'EDITAR' }}
      </button>
    </div>
  </div>

  <MissingPage v-else :what="id" />

  <SheetEditor v-if="editing && sheet" :id="sheet.id" @close="editing = false" @saved="bump++" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import DataSheet from '../components/DataSheet.vue'
import SheetEditor from '../components/SheetEditor.vue'
import MissingPage from './MissingPage.vue'
import { getSheet, isEdited } from '../sheetStore'
import { CATALOG, SECTIONS } from '../../ows/data/catalog'
import { BRAND } from '../../ows/brand'
import { downloadSheet } from '../pdf'

const props = defineProps({ id: { type: String, required: true } })

/*
  `bump` is the dependency that makes an edit show up. getSheet reads a
  reactive store, but a computed only re-runs when something it actually
  touched changes — incrementing a counter the editor owns is the cheapest
  correct way to repaint without the store knowing who reads it.
*/
const bump = ref(0)
const editing = ref(false)

const sheet = computed(() => (bump.value, getSheet(props.id)))
const edited = computed(() => (bump.value, isEdited(props.id)))

const item = computed(() => CATALOG.find((c) => c.id === props.id))
const section = computed(() => SECTIONS.find((s) => s.slug === item.value?.section) ?? null)

const download = () => downloadSheet(sheet.value, BRAND)
const print = () => window.print()
</script>

<style scoped>
.crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.crumb a:hover {
  color: var(--ows-ink);
}

.crumb__here {
  color: var(--ows-ink);
}

.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: clamp(2rem, 5vw, 3rem);
}

.acts__btn {
  height: 2.75rem;
  padding-inline: 1.125rem;
  border: 1px solid var(--ows-line);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-muted);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.acts__btn:hover {
  color: var(--ows-ink);
  border-color: var(--ows-ink);
}

.acts__btn--go {
  background: var(--ows-ink);
  border-color: var(--ows-ink);
  color: #fff;
  font-weight: 500;
}

.acts__btn--go:hover {
  color: #fff;
}
</style>

<template>
  <!-- Consumables get the real 3D stage; processes get the live arc; the rest
       fall back to their generated still. -->
  <ProductStage
    v-if="model"
    :product="model"
    :fallback-src="src"
    :alt="alt"
    :distance="1.1"
    :spin="0.14"
  />
  <ArcScene v-else-if="live" :depth="5" :density="3" :origin-y="0.62" :intensity="0.9" />
  <ParallaxImage
    v-else
    :src="src"
    :alt="alt"
    :depth="5"
    :scale="1.16"
    :scrim="0.1"
    :hairlines="false"
  />
</template>

<script setup>
import { computed } from 'vue'
import ArcScene from './ArcScene.vue'
import ParallaxImage from './ParallaxImage.vue'
import ProductStage from './ProductStage.vue'

const props = defineProps({
  record: { type: Object, required: true },
})

const live = computed(() => props.record.category === 'processes')

/*
  One visual per record class. Consumables resolve to a 3D model; the still of
  the same object stays with them as the fallback, so the frame is never empty
  on a device that cannot run WebGL.
*/
const MAP = {
  'FILLER METAL': ['spool', '/unibraze/spool.svg', 'Rollo de alambre de soldadura'],
  ELECTRODE: ['electrode', '/unibraze/electrode.svg', 'Caja de electrodos revestidos Unibraze'],
  'BRAZING ALLOY': ['rod', '/unibraze/rod.svg', 'Atado de varilla de aporte'],
  DEFECT: [null, '/unibraze/section.svg', 'Junta soldada en corte'],
  COMPARISON: [null, '/unibraze/stock.svg', 'Barras de acero apiladas de canto'],
  MATERIAL: [null, '/unibraze/stock.svg', 'Barras de acero apiladas de canto'],
  METALLURGY: [null, '/unibraze/section.svg', 'Junta soldada en corte'],
  PROCEDURE: [null, '/unibraze/plate.svg', 'Placa de acero cepillado'],
}

const pick = computed(() => MAP[props.record.kind] ?? [null, '/unibraze/plate.svg', 'Placa de acero cepillado'])

// A rod-form catalogue entry should show a rod even when it is filed as a
// filler metal, so the form on the record beats the record's class.
const model = computed(() => {
  const forms = props.record.catalogue?.forms
  if (forms && !forms.includes('W')) {
    if (forms.includes('R')) return 'rod'
    if (forms.includes('E')) return 'electrode'
  }
  return pick.value[0]
})

const src = computed(() => {
  if (model.value === 'rod') return '/unibraze/rod.svg'
  if (model.value === 'electrode') return '/unibraze/electrode.svg'
  return pick.value[1]
})
const alt = computed(() => pick.value[2])
</script>

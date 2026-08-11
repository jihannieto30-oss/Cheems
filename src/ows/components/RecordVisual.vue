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
  'FILLER METAL': ['spool', '/ows/spool.svg', 'Spool of copper-coated welding wire'],
  ELECTRODE: ['electrode', '/ows/electrode.svg', 'Covered welding electrodes'],
  'BRAZING ALLOY': ['rod', '/ows/rod.svg', 'Bundle of brazing filler rod'],
  DEFECT: [null, '/ows/section.svg', 'Groove weld joint in section'],
  COMPARISON: [null, '/ows/stock.svg', 'Bar stock stacked end-on'],
  MATERIAL: [null, '/ows/stock.svg', 'Bar stock stacked end-on'],
  METALLURGY: [null, '/ows/section.svg', 'Groove weld joint in section'],
  PROCEDURE: [null, '/ows/plate.svg', 'Brushed steel plate'],
}

const pick = computed(() => MAP[props.record.kind] ?? [null, '/ows/plate.svg', 'Brushed steel plate'])

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
  if (model.value === 'rod') return '/ows/rod.svg'
  if (model.value === 'electrode') return '/ows/electrode.svg'
  return pick.value[1]
})
const alt = computed(() => pick.value[2])
</script>

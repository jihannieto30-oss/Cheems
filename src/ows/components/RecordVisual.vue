<template>
  <!-- Processes get the live arc; everything else gets its generated still. -->
  <ArcScene v-if="live" :depth="5" :density="3" :origin-y="0.62" :intensity="0.9" />
  <ParallaxImage v-else :src="src" :alt="alt" :depth="5" :scale="1.16" :scrim="0.1" :hairlines="false" :mono="!isProduct" />
</template>

<script setup>
import { computed } from 'vue'
import ArcScene from './ArcScene.vue'
import ParallaxImage from './ParallaxImage.vue'

const props = defineProps({
  record: { type: Object, required: true },
})

const live = computed(() => props.record.category === 'processes')

// Consumables keep their copper; scene and drawing art stays monochrome.
const PRODUCT_KINDS = new Set(['FILLER METAL', 'ELECTRODE', 'BRAZING ALLOY'])
const isProduct = computed(() => PRODUCT_KINDS.has(props.record.kind))

// One visual per record class. Filler metals get the spool, defects get the
// joint section, everything else falls back to plate.
const MAP = {
  'FILLER METAL': ['/ows/spool.svg', 'Spool of copper-coated welding wire'],
  ELECTRODE: ['/ows/electrode.svg', 'Covered welding electrodes in an opened carton'],
  'BRAZING ALLOY': ['/ows/rod.svg', 'Bundle of brazing filler rod'],
  DEFECT: ['/ows/section.svg', 'Groove weld joint in section'],
  COMPARISON: ['/ows/stock.svg', 'Bar stock stacked end-on'],
  MATERIAL: ['/ows/stock.svg', 'Bar stock stacked end-on'],
  METALLURGY: ['/ows/section.svg', 'Groove weld joint in section'],
  PROCEDURE: ['/ows/plate.svg', 'Brushed steel plate'],
}

const pick = computed(() => MAP[props.record.kind] ?? ['/ows/plate.svg', 'Brushed steel plate'])
const src = computed(() => pick.value[0])
const alt = computed(() => pick.value[1])
</script>

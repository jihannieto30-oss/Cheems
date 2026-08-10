<template>
  <TechnicalGrid />
  <CursorLayer />

  <SiteNav :placeholder-mode="mode" @set-placeholder="set" />

  <main class="page">
    <SearchHero :placeholder-mode="mode" />
    <KnowledgeSection />
    <MaterialsSection />
    <ProcessesSection />
    <SolutionsSection />
    <SearchOutro :placeholder-mode="mode" />
  </main>

  <SiteFooter />
</template>

<script setup>
import TechnicalGrid from './components/TechnicalGrid.vue'
import CursorLayer from './components/CursorLayer.vue'
import SiteNav from './components/SiteNav.vue'
import SearchHero from './components/SearchHero.vue'
import KnowledgeSection from './components/KnowledgeSection.vue'
import MaterialsSection from './components/MaterialsSection.vue'
import ProcessesSection from './components/ProcessesSection.vue'
import SolutionsSection from './components/SolutionsSection.vue'
import SearchOutro from './components/SearchOutro.vue'
import SiteFooter from './components/SiteFooter.vue'
import { usePlaceholderMode } from './composables/usePlaceholderMode'

const { mode, set } = usePlaceholderMode()
</script>

<style scoped>
.page {
  position: relative;
  z-index: 1;
}
</style>

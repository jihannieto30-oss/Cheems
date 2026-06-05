<template>
  <div id="app">
    <div class="brand-bar">
      <div class="brand">
        <span class="brand-logo">🐕</span>
        <span class="brand-name">Cheems</span>
        <span class="brand-tag">Plataforma</span>
      </div>
      <nav class="brand-nav">
        <button
          class="brand-link"
          :class="{ active: vista === 'mercado' }"
          @click="vista = 'mercado'"
        >📈 Bolsa de Valores</button>
        <button
          class="brand-link"
          :class="{ active: vista === 'aduana' }"
          @click="vista = 'aduana'"
        >🛃 Comercio Exterior</button>
      </nav>
    </div>

    <MarketView v-if="vista === 'mercado'" />
    <PedimentoSimulator v-else />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MarketView from './components/MarketView.vue'
import PedimentoSimulator from './components/customs/PedimentoSimulator.vue'

const vista = ref('aduana')
</script>

<style>
.brand-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 48px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-logo { font-size: 20px; }
.brand-name { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }
.brand-tag {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;
  color: var(--text-muted); background: var(--bg-card);
  padding: 2px 7px; border-radius: 10px; font-weight: 600;
}
.brand-nav { display: flex; gap: 4px; }
.brand-link {
  padding: 6px 14px; border-radius: 7px; cursor: pointer;
  background: transparent; border: 1px solid transparent;
  color: var(--text-secondary); font-size: 13px; font-weight: 600;
  transition: all 0.15s; font-family: inherit;
}
.brand-link:hover { color: var(--text-primary); background: var(--bg-hover); }
.brand-link.active { color: var(--text-primary); background: var(--bg-card); border-color: var(--border); }
</style>

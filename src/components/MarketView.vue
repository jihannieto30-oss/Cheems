<template>
  <div class="market-view">
    <AppHeader />
    <MarketSummary />
    <main class="main">
      <div class="section-label">
        <span>Índices Principales</span>
        <span class="date-label">{{ todayDate }}</span>
      </div>
      <IndexCards />
      <StockTable />
    </main>
    <footer class="footer">
      <span>MarketView US &copy; 2026 &mdash; Datos simulados con fines educativos. No constituye asesoramiento financiero.</span>
    </footer>
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'
import MarketSummary from './MarketSummary.vue'
import IndexCards from './IndexCards.vue'
import StockTable from './StockTable.vue'

const todayDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
</script>

<style scoped>
.main { max-width: 1400px; margin: 0 auto; }
.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
}
.date-label { text-transform: none; letter-spacing: 0; font-weight: 400; }
.footer {
  border-top: 1px solid var(--border);
  padding: 16px 24px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}
</style>

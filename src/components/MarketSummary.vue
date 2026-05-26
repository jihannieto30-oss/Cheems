<template>
  <div class="summary-bar">
    <div class="summary-item" v-for="item in stats" :key="item.label">
      <span class="label">{{ item.label }}</span>
      <span class="value" :class="item.color">{{ item.value }}</span>
    </div>
    <div class="ticker-scroll">
      <div class="ticker-track">
        <span v-for="t in tickerItems.concat(tickerItems)" :key="t.key" class="ticker-item">
          <strong>{{ t.symbol }}</strong>
          <span :class="t.change >= 0 ? 'green' : 'red'">
            ${{ t.price }} {{ t.change >= 0 ? '▲' : '▼' }}{{ Math.abs(t.change).toFixed(2) }}%
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const stats = [
  { label: 'Acciones al alza', value: '318 ▲', color: 'green' },
  { label: 'Acciones a la baja', value: '182 ▼', color: 'red' },
  { label: 'Sin cambio', value: '0', color: '' },
  { label: 'Nuevo máx 52W', value: '47', color: 'green' },
  { label: 'Nuevo mín 52W', value: '12', color: 'red' },
]

const tickerItems = [
  { symbol: 'AAPL', price: '192.35', change: 1.24 },
  { symbol: 'NVDA', price: '875.40', change: 3.21 },
  { symbol: 'TSLA', price: '245.30', change: -1.45 },
  { symbol: 'MSFT', price: '415.20', change: 0.87 },
  { symbol: 'AMZN', price: '195.80', change: 2.15 },
  { symbol: 'GOOGL', price: '178.50', change: -0.32 },
  { symbol: 'META', price: '512.60', change: 0.95 },
  { symbol: 'NFLX', price: '628.45', change: 1.73 },
  { symbol: 'UNH', price: '489.30', change: -2.10 },
  { symbol: 'XOM', price: '112.80', change: 1.08 },
].map((t, i) => ({ ...t, key: i }))
</script>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 38px;
  overflow: hidden;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border-right: 1px solid var(--border);
  white-space: nowrap;
  font-size: 11px;
  flex-shrink: 0;
}
.label { color: var(--text-muted); }
.value { font-weight: 600; }
.green { color: var(--green); }
.red { color: var(--red); }
.ticker-scroll { flex: 1; overflow: hidden; margin-left: 8px; }
.ticker-track {
  display: flex;
  gap: 24px;
  animation: ticker 30s linear infinite;
  white-space: nowrap;
}
.ticker-item { display: inline-flex; gap: 6px; font-size: 11px; font-variant-numeric: tabular-nums; }
.ticker-item strong { color: var(--text-primary); }
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>

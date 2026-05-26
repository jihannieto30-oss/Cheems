<template>
  <div class="indices-grid">
    <div v-for="idx in indices" :key="idx.symbol" class="index-card" :class="idx.change >= 0 ? 'up' : 'down'">
      <div class="index-header">
        <span class="index-name">{{ idx.name }}</span>
        <span class="index-symbol">{{ idx.symbol }}</span>
      </div>
      <div class="index-price">{{ formatPrice(idx.price) }}</div>
      <div class="index-footer">
        <span class="change-badge" :class="idx.change >= 0 ? 'green' : 'red'">
          {{ idx.change >= 0 ? '▲' : '▼' }}
          {{ Math.abs(idx.change).toFixed(2) }}%
        </span>
        <span class="change-pts" :class="idx.change >= 0 ? 'green' : 'red'">
          {{ idx.change >= 0 ? '+' : '' }}{{ idx.pts.toFixed(2) }} pts
        </span>
      </div>
      <svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline
          :points="idx.spark"
          fill="none"
          :stroke="idx.change >= 0 ? '#3fb950' : '#f85149'"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>

<script setup>
const indices = [
  { symbol: 'SPX', name: 'S&P 500', price: 5248.32, change: 0.54, pts: 28.14, spark: '0,28 10,24 20,26 30,20 40,22 50,16 60,18 70,12 80,10 90,8 100,5' },
  { symbol: 'NDX', name: 'NASDAQ 100', price: 18384.47, change: 0.78, pts: 141.92, spark: '0,30 10,26 20,28 30,20 40,18 50,14 60,12 70,8 80,10 90,6 100,3' },
  { symbol: 'DJI', name: 'Dow Jones', price: 39127.14, change: 0.21, pts: 81.57, spark: '0,25 10,22 20,26 30,22 40,24 50,20 60,18 70,16 80,14 90,12 100,10' },
  { symbol: 'RUT', name: 'Russell 2000', price: 2074.86, change: -0.32, pts: -6.67, spark: '0,5 10,8 20,6 30,10 40,12 50,14 60,16 70,18 80,20 90,24 100,26' },
  { symbol: 'VIX', name: 'VIX', price: 13.42, change: -2.18, pts: -0.30, spark: '0,4 10,6 20,8 30,10 40,14 50,16 60,18 70,20 80,22 90,24 100,28' },
]

function formatPrice(val) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.indices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 20px 24px;
}
.index-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.index-card:hover { background: var(--bg-hover); border-color: #484f58; transform: translateY(-1px); }
.index-card.up { border-top: 2px solid var(--green); }
.index-card.down { border-top: 2px solid var(--red); }
.index-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.index-name { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.index-symbol { font-size: 11px; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; }
.index-price { font-size: 22px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; margin-bottom: 8px; }
.index-footer { display: flex; align-items: center; gap: 8px; }
.change-badge { font-size: 12px; font-weight: 600; }
.change-pts { font-size: 11px; }
.green { color: var(--green); }
.red { color: var(--red); }
.sparkline { width: 100%; height: 30px; margin-top: 12px; opacity: 0.6; }
</style>

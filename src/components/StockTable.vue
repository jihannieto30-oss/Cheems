<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title">
        <h2>Acciones Populares</h2>
        <span class="badge">NYSE · NASDAQ</span>
      </div>
      <div class="table-controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="search" placeholder="Buscar ticker o empresa..." />
        </div>
        <div class="filter-tabs">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-btn"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value"
          >{{ f.label }}</button>
        </div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="th-sym" @click="sort('symbol')">
              Ticker <span class="sort-arrow">{{ sortIcon('symbol') }}</span>
            </th>
            <th @click="sort('name')">Empresa <span class="sort-arrow">{{ sortIcon('name') }}</span></th>
            <th class="th-num" @click="sort('price')">Precio <span class="sort-arrow">{{ sortIcon('price') }}</span></th>
            <th class="th-num" @click="sort('change')">Cambio % <span class="sort-arrow">{{ sortIcon('change') }}</span></th>
            <th class="th-num" @click="sort('changeAmt')">Cambio $ <span class="sort-arrow">{{ sortIcon('changeAmt') }}</span></th>
            <th class="th-num" @click="sort('volume')">Volumen <span class="sort-arrow">{{ sortIcon('volume') }}</span></th>
            <th class="th-num" @click="sort('mktCap')">Cap. Mercado <span class="sort-arrow">{{ sortIcon('mktCap') }}</span></th>
            <th class="th-num">52W Rango</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in filteredStocks" :key="stock.symbol" class="stock-row">
            <td>
              <div class="symbol-cell">
                <div class="stock-logo" :style="{ background: stock.color }">{{ stock.symbol[0] }}</div>
                <span class="symbol">{{ stock.symbol }}</span>
              </div>
            </td>
            <td>
              <div class="name-cell">
                <span class="company-name">{{ stock.name }}</span>
                <span class="sector">{{ stock.sector }}</span>
              </div>
            </td>
            <td class="td-num price">${{ formatNum(stock.price) }}</td>
            <td class="td-num">
              <span class="change-pct" :class="stock.change >= 0 ? 'green' : 'red'">
                {{ stock.change >= 0 ? '▲' : '▼' }} {{ Math.abs(stock.change).toFixed(2) }}%
              </span>
            </td>
            <td class="td-num" :class="stock.changeAmt >= 0 ? 'green' : 'red'">
              {{ stock.changeAmt >= 0 ? '+' : '' }}${{ Math.abs(stock.changeAmt).toFixed(2) }}
            </td>
            <td class="td-num muted">{{ formatVol(stock.volume) }}</td>
            <td class="td-num muted">{{ formatCap(stock.mktCap) }}</td>
            <td class="td-num">
              <div class="range-bar">
                <span class="range-min">{{ stock.low52 }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: rangePos(stock) + '%' }"></div>
                </div>
                <span class="range-max">{{ stock.high52 }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="filteredStocks.length === 0">
            <td colspan="8" class="no-results">No se encontraron resultados para "{{ search }}"</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="update-note">Datos simulados · Actualizado: {{ updateTime }}</span>
      <span>{{ filteredStocks.length }} de {{ stocks.length }} acciones</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const search = ref('')
const activeFilter = ref('all')
const sortKey = ref('mktCap')
const sortDir = ref(-1)

const filters = [
  { label: 'Todas', value: 'all' },
  { label: 'Ganadoras', value: 'up' },
  { label: 'Perdedoras', value: 'down' },
]

const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología', price: 192.35, change: 1.24, changeAmt: 2.35, volume: 58200000, mktCap: 2980, low52: 164.08, high52: 199.62, color: '#555' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Tecnología', price: 415.20, change: 0.87, changeAmt: 3.57, volume: 21300000, mktCap: 3087, low52: 309.45, high52: 420.82, color: '#0078d4' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductores', price: 875.40, change: 3.21, changeAmt: 27.24, volume: 43700000, mktCap: 2159, low52: 402.88, high52: 903.63, color: '#76b900' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumo / Cloud', price: 195.80, change: 2.15, changeAmt: 4.12, volume: 36100000, mktCap: 2041, low52: 138.23, high52: 201.20, color: '#ff9900' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Tecnología', price: 178.50, change: -0.32, changeAmt: -0.57, volume: 22400000, mktCap: 2204, low52: 120.21, high52: 191.75, color: '#4285f4' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Redes Sociales', price: 512.60, change: 0.95, changeAmt: 4.82, volume: 14800000, mktCap: 1310, low52: 279.40, high52: 531.49, color: '#0082fb' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automóviles', price: 245.30, change: -1.45, changeAmt: -3.61, volume: 89600000, mktCap: 782, low52: 138.80, high52: 299.29, color: '#cc0000' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Finanzas', price: 385.90, change: -0.18, changeAmt: -0.70, volume: 3200000, mktCap: 843, low52: 340.50, high52: 400.68, color: '#6c3483' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Banca', price: 198.75, change: 0.43, changeAmt: 0.85, volume: 9800000, mktCap: 575, low52: 149.20, high52: 205.88, color: '#002d62' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Fintech', price: 275.30, change: 0.62, changeAmt: 1.70, volume: 7400000, mktCap: 556, low52: 227.94, high52: 290.96, color: '#1a1f71' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail', price: 68.20, change: 0.28, changeAmt: 0.19, volume: 18900000, mktCap: 549, low52: 52.32, high52: 71.09, color: '#0071ce' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Salud', price: 158.45, change: -0.55, changeAmt: -0.88, volume: 8200000, mktCap: 382, low52: 143.13, high52: 175.97, color: '#d5001c' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energía', price: 112.80, change: 1.08, changeAmt: 1.21, volume: 15300000, mktCap: 449, low52: 95.77, high52: 123.75, color: '#e22b1f' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Salud', price: 489.30, change: -2.10, changeAmt: -10.50, volume: 5700000, mktCap: 453, low52: 445.56, high52: 580.00, color: '#006699' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Streaming', price: 628.45, change: 1.73, changeAmt: 10.71, volume: 6100000, mktCap: 270, low52: 344.73, high52: 700.22, color: '#e50914' },
]

const updateTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

function sort(key) {
  if (sortKey.value === key) sortDir.value *= -1
  else { sortKey.value = key; sortDir.value = -1 }
}
function sortIcon(key) {
  if (sortKey.value !== key) return '⇅'
  return sortDir.value === 1 ? '↑' : '↓'
}

const filteredStocks = computed(() => {
  let list = stocks.filter(s => {
    const q = search.value.toLowerCase()
    return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  })
  if (activeFilter.value === 'up') list = list.filter(s => s.change >= 0)
  if (activeFilter.value === 'down') list = list.filter(s => s.change < 0)
  return [...list].sort((a, b) => (a[sortKey.value] - b[sortKey.value]) * sortDir.value ||
    String(a[sortKey.value]).localeCompare(String(b[sortKey.value])) * sortDir.value)
})

function rangePos(s) {
  return Math.round(((s.price - s.low52) / (s.high52 - s.low52)) * 100)
}
function formatNum(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatVol(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  return (n / 1e3).toFixed(0) + 'K'
}
function formatCap(n) { return '$' + n.toFixed(0) + 'B' }
</script>

<style scoped>
.table-section { padding: 0 24px 32px; }
.table-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.table-title { display: flex; align-items: center; gap: 10px; }
.table-title h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.badge { font-size: 11px; background: var(--accent-bg); color: var(--accent); padding: 3px 8px; border-radius: 20px; font-weight: 600; }
.table-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; }
.search-icon { font-size: 13px; }
.search-box input { background: none; border: none; outline: none; color: var(--text-primary); font-size: 13px; width: 200px; }
.search-box input::placeholder { color: var(--text-muted); }
.filter-tabs { display: flex; gap: 4px; }
.filter-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.filter-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.filter-btn.active { background: var(--accent-bg); color: var(--accent); border-color: rgba(88,166,255,0.3); }
.table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
table { width: 100%; border-collapse: collapse; }
thead { background: var(--bg-secondary); }
th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  border-bottom: 1px solid var(--border);
}
th:hover { color: var(--text-secondary); }
.th-num, .td-num { text-align: right; }
.sort-arrow { font-size: 10px; margin-left: 3px; }
.stock-row { border-bottom: 1px solid var(--border); transition: background 0.12s; }
.stock-row:last-child { border-bottom: none; }
.stock-row:hover { background: var(--bg-hover); }
td { padding: 12px 14px; white-space: nowrap; }
.symbol-cell { display: flex; align-items: center; gap: 10px; }
.stock-logo { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.symbol { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.name-cell { display: flex; flex-direction: column; gap: 2px; }
.company-name { font-size: 13px; color: var(--text-primary); }
.sector { font-size: 11px; color: var(--text-muted); }
.price { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.change-pct { font-size: 12px; font-weight: 600; }
.green { color: var(--green); }
.red { color: var(--red); }
.muted { color: var(--text-secondary); }
.range-bar { display: flex; align-items: center; gap: 6px; min-width: 130px; }
.range-min, .range-max { font-size: 10px; color: var(--text-muted); width: 40px; }
.range-max { text-align: right; }
.bar-track { flex: 1; height: 4px; background: var(--bg-secondary); border-radius: 2px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }
.no-results { text-align: center; color: var(--text-muted); padding: 40px; font-size: 14px; }
.table-footer { display: flex; justify-content: space-between; padding: 10px 4px 0; font-size: 11px; color: var(--text-muted); }
</style>

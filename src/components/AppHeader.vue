<template>
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">📈</span>
        <span class="logo-text">MarketView <span class="logo-sub">US</span></span>
      </div>
      <nav class="nav">
        <a class="nav-link active">Mercado</a>
        <a class="nav-link">Acciones</a>
        <a class="nav-link">Índices</a>
        <a class="nav-link">Noticias</a>
      </nav>
    </div>
    <div class="header-right">
      <div class="market-status" :class="isOpen ? 'open' : 'closed'">
        <span class="status-dot"></span>
        {{ isOpen ? 'Mercado Abierto' : 'Mercado Cerrado' }}
      </div>
      <div class="time">{{ currentTime }}</div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('')
const isOpen = ref(false)

function updateTime() {
  const now = new Date()
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = nyTime.getHours()
  const minutes = nyTime.getMinutes()
  const day = nyTime.getDay()
  isOpen.value = day >= 1 && day <= 5 && (hours > 9 || (hours === 9 && minutes >= 30)) && hours < 16
  currentTime.value = nyTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ET'
}

let timer
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}
.header-left { display: flex; align-items: center; gap: 32px; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 22px; }
.logo-text { font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; }
.logo-sub { color: var(--accent); }
.nav { display: flex; gap: 4px; }
.nav-link {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  text-decoration: none;
}
.nav-link:hover { color: var(--text-primary); background: var(--bg-hover); }
.nav-link.active { color: var(--text-primary); background: var(--bg-card); }
.header-right { display: flex; align-items: center; gap: 16px; }
.market-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.market-status.open { background: var(--green-bg); color: var(--green); }
.market-status.closed { background: var(--red-bg); color: var(--red); }
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.time { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
</style>

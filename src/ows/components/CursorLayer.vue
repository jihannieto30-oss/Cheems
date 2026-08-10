<template>
  <div
    v-if="enabled"
    class="cursor"
    :class="{ 'cursor--live': live, 'cursor--hot': hot, 'cursor--down': down }"
    aria-hidden="true"
  >
    <span ref="ring" class="cursor__ring" />
    <span ref="dot" class="cursor__dot" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

/*
  Minimal two-part cursor: a dot pinned to the pointer and a ring that lags
  behind it. The lag is the whole effect — it reads as mass, which reads as
  precision instrument rather than website.

  Only mounted for fine pointers. Touch devices get the native behaviour and
  none of this code runs.
*/

const enabled = ref(false)
const live = ref(false)
const hot = ref(false)
const down = ref(false)
const ring = ref(null)
const dot = ref(null)

// Elements that make the ring bloom. Anything interactive, plus opt-in marks.
const HOT_SELECTOR = 'a, button, input, [data-cursor]'

let frame = 0
let tx = 0
let ty = 0
let rx = 0
let ry = 0

function onMove(event) {
  tx = event.clientX
  ty = event.clientY
  if (!live.value) {
    rx = tx
    ry = ty
    live.value = true
  }
  hot.value = Boolean(event.target?.closest?.(HOT_SELECTOR))
}

function tick() {
  // Critically damped enough to feel weighted but never sloppy.
  rx += (tx - rx) * 0.16
  ry += (ty - ry) * 0.16
  if (dot.value) dot.value.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
  if (ring.value) ring.value.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
  frame = requestAnimationFrame(tick)
}

const onDown = () => (down.value = true)
const onUp = () => (down.value = false)
const onLeave = () => (live.value = false)

onMounted(() => {
  const fine = window.matchMedia?.('(pointer: fine)').matches
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!fine || reduced) return

  enabled.value = true
  document.documentElement.classList.add('ows-cursor-none')
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  frame = requestAnimationFrame(tick)
})

onUnmounted(() => {
  document.documentElement.classList.remove('ows-cursor-none')
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  window.removeEventListener('pointerup', onUp)
  document.removeEventListener('pointerleave', onLeave)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style>
/* Global, not scoped: the rule has to reach every element on the page. */
.ows-cursor-none,
.ows-cursor-none * {
  cursor: none !important;
}
</style>

<style scoped>
.cursor {
  position: fixed;
  inset: 0;
  z-index: var(--ows-z-cursor);
  pointer-events: none;
  opacity: 0;
  transition: opacity 300ms var(--ows-ease);
}

.cursor--live {
  opacity: 1;
}

.cursor__dot,
.cursor__ring {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  margin-top: -50%;
  margin-left: -50%;
}

.cursor__dot {
  width: 4px;
  height: 4px;
  margin: -2px 0 0 -2px;
  background: var(--ows-ink);
}

.cursor__ring {
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border: 1px solid rgb(255 255 255 / 0.35);
  transition:
    width 380ms var(--ows-ease),
    height 380ms var(--ows-ease),
    margin 380ms var(--ows-ease),
    border-color 380ms var(--ows-ease),
    background-color 380ms var(--ows-ease);
}

/* Over an interactive target the ring opens up and picks up a faint fill. */
.cursor--hot .cursor__ring {
  width: 56px;
  height: 56px;
  margin: -28px 0 0 -28px;
  border-color: rgb(255 255 255 / 0.6);
  background: rgb(255 255 255 / 0.03);
}

.cursor--down .cursor__ring {
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border-color: var(--ows-ink);
}
</style>

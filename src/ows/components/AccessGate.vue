<template>
  <div class="gate">
    <StandardsCascade :depth="10" :density="0.55" :intensity="0.55" />
    <span class="gate__wash" aria-hidden="true" />

    <div class="gate__panel">
      <OwsMark size="lg" orientation="v" />

      <p class="gate__eyebrow">ACCESO POR INVITACIÓN</p>

      <form class="gate__form" novalidate @submit.prevent="submit">
        <label class="ows-sr" for="gate-code">Código de invitación</label>
        <input
          id="gate-code"
          ref="field"
          v-model="code"
          class="gate__input"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          spellcheck="false"
          maxlength="16"
          placeholder="— — — — — — — —"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'gate-error' : 'gate-help'"
          @input="error = ''"
        />

        <button class="gate__go" type="submit" :disabled="!code.trim()">
          <span>Entrar</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12 H19 M13 6 L19 12 L13 18" />
          </svg>
        </button>
      </form>

      <!-- role=alert so a failed attempt is announced, not only shown. -->
      <p v-if="error" id="gate-error" class="gate__error" role="alert">{{ error }}</p>
      <p v-else id="gate-help" class="gate__help">
        Introduzca el código que recibió con su invitación.
      </p>
    </div>

    <p class="gate__foot">{{ BRAND.claim }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import OwsMark from './OwsMark.vue'
import StandardsCascade from './StandardsCascade.vue'
import { BRAND } from '../brand'
import { verify, unlock } from '../gate'

/*
  The door.

  It is worth being plain about what this screen does: it keeps the site closed
  to people who were not given the code, and it remembers a browser that has
  already been let in. It is not protection — see the note in gate.js — and
  nothing in the interface should suggest otherwise, which is why it says
  "acceso por invitación" and not "área segura".

  A wrong code is answered slowly and identically every time. That is not
  hardening; it is so a fast typo does not read as a system that is broken.
*/

const emit = defineEmits(['open'])

const code = ref('')
const error = ref('')
const field = ref(null)
let checking = false

onMounted(() => nextTick(() => field.value?.focus()))

async function submit() {
  if (checking) return
  const entered = code.value.trim()
  if (!entered) return

  checking = true
  await new Promise((resolve) => setTimeout(resolve, 320))
  checking = false

  if (verify(entered)) {
    unlock()
    emit('open')
    return
  }

  error.value = 'Ese código no corresponde a ninguna invitación.'
  code.value = ''
  field.value?.focus()
}
</script>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: clamp(1.5rem, 6vh, 3rem) var(--ows-gutter);
  background: var(--ows-void);
  overflow: hidden;
  isolation: isolate;
}

/* Holds the falling standards back so they read as atmosphere behind the
   panel rather than as text competing with it. */
.gate__wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(70% 55% at 50% 45%, rgb(0 0 0 / 0.92), rgb(0 0 0 / 0.55));
  pointer-events: none;
}

.gate__panel {
  position: relative;
  z-index: var(--ows-z-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 26rem;
  margin-block: auto;
  text-align: center;
  animation: gate-in 900ms var(--ows-ease) both;
}

@keyframes gate-in {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
  }
}

.gate__eyebrow {
  margin-top: 2rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
  /* Cancels the trailing space wide tracking leaves after the last glyph. */
  margin-right: calc(var(--ows-track-label) * -1);
}

.gate__form {
  width: 100%;
  margin-top: 1.75rem;
}

.gate__input {
  width: 100%;
  padding: 1rem 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ows-line);
  border-radius: 0;
  color: var(--ows-ink);
  font-family: var(--ows-display);
  font-size: clamp(1.25rem, 4.5vw, 1.75rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.42em;
  text-align: center;
  /* Same optical correction as the eyebrow: without it the digits sit left. */
  text-indent: 0.42em;
  transition: border-color var(--ows-base) var(--ows-ease);
}

.gate__input::placeholder {
  color: var(--ows-ink-faint);
  letter-spacing: 0.1em;
}

.gate__input:focus {
  outline: none;
  border-bottom-color: var(--ows-ink);
}

.gate__input[aria-invalid='true'] {
  border-bottom-color: var(--ows-red);
}

.gate__go {
  display: inline-flex;
  align-items: center;
  gap: 0.875rem;
  margin-top: 2rem;
  padding: 0.85rem 1.75rem;
  background: transparent;
  border: 1px solid var(--ows-line-strong);
  color: var(--ows-ink);
  font: inherit;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color var(--ows-fast) var(--ows-ease),
    background-color var(--ows-fast) var(--ows-ease),
    opacity var(--ows-fast) var(--ows-ease);
}

.gate__go:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gate__go:not(:disabled):hover {
  border-color: var(--ows-red);
  background: var(--ows-red-wash);
}

.gate__go svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-fast) var(--ows-ease);
}

.gate__go:not(:disabled):hover svg {
  transform: translateX(0.25rem);
}

.gate__error,
.gate__help {
  margin-top: 1.5rem;
  min-height: 1.5em;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  line-height: 1.6;
  text-wrap: pretty;
}

.gate__error {
  color: var(--ows-red);
}

.gate__help {
  color: var(--ows-ink-faint);
}

.gate__foot {
  position: relative;
  z-index: var(--ows-z-content);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  text-align: center;
  text-wrap: balance;
}

@media (prefers-reduced-motion: reduce) {
  .gate__panel {
    animation: none;
  }
}
</style>

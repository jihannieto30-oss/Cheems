<template>
  <div class="gate">
    <div class="gate__panel">
      <OwsMark size="hero" />

      <form class="gate__form" :class="{ 'gate__form--bad': error }" novalidate @submit.prevent="submit">
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
          placeholder="CÓDIGO DE INVITACIÓN"
          :aria-invalid="error"
          @input="error = false"
        />
      </form>

      <!-- The screen says nothing when a code is refused; the line going red is
           the whole message. Someone using a screen reader gets none of that,
           so the refusal is announced here instead. -->
      <p class="ows-sr" role="alert">{{ error ? 'Código no válido' : '' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import OwsMark from './OwsMark.vue'
import { verify, unlock } from '../gate'

/*
  The door.

  Everything that is not the mark and the line has been taken out — no heading,
  no button, no instruction, no claim. The placeholder is the only word on
  screen and it is doing the work all of them were.

  It is worth being plain about what this screen is: it keeps the site closed
  to people who were not given the code, and it remembers a browser that has
  already been let in. It is not protection — see the note in gate.js.

  A refused code is answered after the same short pause every time. That is not
  hardening; it is so a fast typo does not read as a system that is broken.
*/

const emit = defineEmits(['open'])

const code = ref('')
const error = ref(false)
const field = ref(null)
let checking = false

onMounted(() => nextTick(() => field.value?.focus()))

async function submit() {
  if (checking) return
  const entered = code.value.trim()
  if (!entered) return

  checking = true
  await new Promise((resolve) => setTimeout(resolve, 340))
  checking = false

  if (verify(entered)) {
    unlock()
    emit('open')
    return
  }

  error.value = true
  code.value = ''
  field.value?.focus()
}
</script>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  padding: clamp(1.5rem, 6vh, 3rem) var(--ows-gutter);
  background: var(--ows-void);
}

.gate__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 24rem;
  animation: gate-in 1s var(--ows-ease) both;
}

@keyframes gate-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.gate__form {
  width: 100%;
  margin-top: clamp(3rem, 9vh, 5rem);
}

.gate__input {
  width: 100%;
  padding: 0.9rem 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ows-line);
  border-radius: 0;
  color: var(--ows-ink);
  font: inherit;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-align: center;
  /* Cancels the trailing space wide tracking leaves after the last glyph, so
     both the placeholder and the typed code sit optically centred. */
  text-indent: var(--ows-track-label);
  text-transform: uppercase;
  transition:
    border-color var(--ows-base) var(--ows-ease),
    color var(--ows-base) var(--ows-ease);
}

.gate__input::placeholder {
  color: var(--ows-ink-faint);
}

.gate__input:focus {
  outline: none;
  border-bottom-color: var(--ows-ink-muted);
}

/* The only feedback on the screen. */
.gate__form--bad .gate__input {
  border-bottom-color: var(--ows-red);
  animation: refuse 420ms var(--ows-ease-io);
}

@keyframes refuse {
  0%,
  100% {
    transform: translateX(0);
  }
  22% {
    transform: translateX(-5px);
  }
  58% {
    transform: translateX(4px);
  }
  82% {
    transform: translateX(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gate__panel {
    animation: none;
  }

  .gate__form--bad .gate__input {
    animation: none;
  }
}
</style>

<template>
  <div class="field" :class="[`field--${variant}`, { 'is-focused': focused, 'is-open': showResults }]">
    <form class="field__form" role="search" @submit.prevent="onSubmit">
      <span class="field__glow" aria-hidden="true" />

      <svg class="field__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.5" cy="10.5" r="6.25" />
        <path d="M15.2 15.2 L20 20" />
      </svg>

      <label class="ows-sr" :for="id">Search the knowledge index</label>
      <input
        :id="id"
        ref="input"
        class="field__input"
        type="search"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="search"
        :value="state.query"
        :aria-expanded="showResults"
        aria-controls="ows-results"
        role="combobox"
        @input="onInput"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />

      <!-- Placeholder is rendered, never native: only a real element can be
           faded, cycled and driven by the two presentation modes. -->
      <span v-if="!state.query" class="field__ghost" aria-hidden="true">
        <Transition name="ghost" mode="out-in">
          <span :key="ghost" class="field__ghost-text">{{ ghost }}</span>
        </Transition>
      </span>

      <button
        class="field__submit"
        type="submit"
        :disabled="!state.query.trim()"
        :tabindex="state.query.trim() ? 0 : -1"
      >
        <span class="ows-sr">Run search</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 12 H19" />
          <path d="M13.5 6.5 L19 12 L13.5 17.5" />
        </svg>
      </button>
    </form>

    <SearchResults
      v-if="showResults"
      id="ows-results"
      :active="active"
      @hover="active = $event"
      @dismiss="close"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import { useSearch } from '../composables/useSearch'
import SearchResults from './SearchResults.vue'

const props = defineProps({
  variant: { type: String, default: 'hero' }, // hero | inline
  /*
    Two placeholder treatments, both requested for comparison:
      quiet   a single discreet word, always present
      reveal  nothing at all until focus, then cycling technical hints
    Selected globally by OwsApp; see usePlaceholderMode.
  */
  placeholderMode: { type: String, default: 'quiet' },
  /** Bind "/" and ⌘K / Ctrl-K to this instance. */
  shortcut: { type: Boolean, default: false },
})

const { state, setQuery, submit, clear } = useSearch()

const id = useId()
const input = ref(null)
const focused = ref(false)
const active = ref(-1)

// Real queries, used as the cycling hint. They double as documentation:
// the field teaches its own grammar without a line of instructional copy.
const HINTS = [
  'ER70S-6',
  '316L HAZ',
  'GTAW AC',
  'AWS D1.1',
  'PWHT P91',
  'lack of fusion',
  '304 vs 316L',
  'FCAW parameters',
]
const hintIndex = ref(0)
let hintTimer = null

const ghost = computed(() => {
  if (props.placeholderMode === 'quiet') return focused.value ? '' : 'Search'
  // reveal: silent until the user commits attention to the field
  return focused.value ? HINTS[hintIndex.value] : ''
})

const showResults = computed(
  () => state.query.trim().length > 0 && state.status !== 'idle' && focused.value,
)

function onInput(event) {
  active.value = -1
  setQuery(event.target.value)
}

function onSubmit() {
  const chosen = active.value >= 0 ? state.results[active.value] : null
  if (chosen) {
    // No router yet — resolving a record is the documented seam for it.
    setQuery(chosen.record.title)
    submit(chosen.record.title)
    active.value = -1
    return
  }
  submit()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    if (state.query) {
      clear()
    } else {
      input.value?.blur()
    }
    return
  }
  if (!showResults.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % state.results.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = active.value <= 0 ? state.results.length - 1 : active.value - 1
  }
}

function onBlur() {
  // Deferred so a click landing on a result is not cancelled by the blur.
  setTimeout(() => {
    focused.value = false
    active.value = -1
  }, 140)
}

function close() {
  focused.value = false
  active.value = -1
}

function onGlobalKey(event) {
  const target = event.target
  const typing =
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  const slash = event.key === '/' && !typing
  const cmdK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
  if (!slash && !cmdK) return

  event.preventDefault()
  input.value?.focus()
  input.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

onMounted(() => {
  if (props.placeholderMode === 'reveal') {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!reduced) {
      hintTimer = setInterval(() => {
        if (focused.value && !state.query) hintIndex.value = (hintIndex.value + 1) % HINTS.length
      }, 2600)
    }
  }
  if (props.shortcut) window.addEventListener('keydown', onGlobalKey)
})

onUnmounted(() => {
  if (hintTimer) clearInterval(hintTimer)
  if (props.shortcut) window.removeEventListener('keydown', onGlobalKey)
})

defineExpose({ focus: () => input.value?.focus() })
</script>

<style scoped>
.field {
  position: relative;
  width: 100%;
  max-width: 44rem;
}

.field__form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 4.5rem;
  padding-inline: 1.5rem;
  border: 1px solid var(--ows-line);
  background: rgb(255 255 255 / 0.012);
  transition:
    border-color var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease);
}

.field__form:hover {
  border-color: var(--ows-line-strong);
}

.is-focused .field__form {
  border-color: rgb(255 255 255 / 0.34);
  background: rgb(255 255 255 / 0.025);
  transform: scale(1.006);
}

/* The only glow in the design system: white, wide, barely there. */
.field__glow {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--ows-slow) var(--ows-ease);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.05),
    0 0 44px -8px rgb(255 255 255 / 0.16),
    inset 0 0 30px -18px rgb(255 255 255 / 0.5);
}

.is-focused .field__glow {
  opacity: 1;
}

.field__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
  fill: none;
  stroke: var(--ows-ink-faint);
  stroke-width: 1.25;
  stroke-linecap: square;
  transition: stroke var(--ows-base) var(--ows-ease);
}

.is-focused .field__icon {
  stroke: var(--ows-ink);
}

.field__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  font-family: var(--ows-mono);
  font-size: 0.9375rem;
  /* Codes are uppercase in every spec that matters; the field agrees.
     Purely presentational — the stored value is exactly what was typed. */
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ows-ink);
  caret-color: var(--ows-ink);
  background: none;
  outline: none;
}

/* Kill the UA's search affordances — they are not part of this language. */
.field__input::-webkit-search-cancel-button,
.field__input::-webkit-search-decoration {
  appearance: none;
}

.field__ghost {
  position: absolute;
  left: 4rem;
  right: 5rem;
  pointer-events: none;
  overflow: hidden;
  white-space: nowrap;
  font-family: var(--ows-mono);
  font-size: 0.9375rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.ghost-enter-active,
.ghost-leave-active {
  transition:
    opacity 420ms var(--ows-ease),
    transform 420ms var(--ows-ease);
}
.ghost-enter-from {
  opacity: 0;
  transform: translateY(0.4em);
}
.ghost-leave-to {
  opacity: 0;
  transform: translateY(-0.4em);
}

.field__submit {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  opacity: 0;
  /* visibility, not just opacity: with nothing to submit the control leaves
     the accessibility tree instead of lingering as an invisible button. */
  visibility: hidden;
  transform: translateX(-0.5rem);
  transition:
    opacity var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease),
    visibility var(--ows-base) var(--ows-ease);
}

.field__submit:not(:disabled) {
  opacity: 0.55;
  visibility: visible;
  transform: none;
}

.field__submit:not(:disabled):hover {
  opacity: 1;
}

.field__submit svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: var(--ows-ink);
  stroke-width: 1.25;
  stroke-linecap: square;
}

/* ---- inline variant: the closing field, quieter than the hero ---- */
.field--inline .field__form {
  height: 3.75rem;
  padding-inline: 1.25rem;
}

@media (max-width: 40rem) {
  .field__form {
    height: 3.5rem;
    padding-inline: 1.1rem;
    gap: 0.75rem;
  }
  .field__input,
  .field__ghost {
    font-size: 0.8125rem;
    letter-spacing: 0.12em;
  }
  .field__ghost {
    left: 3.1rem;
    right: 3.75rem;
  }
  .field--inline .field__form {
    height: 3.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-focused .field__form {
    transform: none;
  }
}
</style>

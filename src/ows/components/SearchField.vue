<template>
  <div
    class="field"
    :class="[`field--${size}`, { 'is-focused': focused, 'is-open': open, 'field--luxe': luxe }]"
  >
    <form class="field__form" role="search" @submit.prevent="go()">
      <!-- The luxe skin. Two inert layers: a specular band that travels across
           the surface, and the light the object throws on the floor under it.
           Both sit behind the controls and never take a pointer event. -->
      <template v-if="luxe">
        <span class="field__sheen" aria-hidden="true" />
        <span class="field__floor" aria-hidden="true" />
      </template>

      <svg class="field__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.4 15.4 L20.5 20.5" />
      </svg>

      <label class="ows-sr" :for="id">Buscar en el índice técnico</label>
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
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        aria-controls="ows-suggest"
        :placeholder="shownPlaceholder"
        :value="text"
        @input="onInput"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />

      <button class="field__go" type="submit" :aria-label="`Buscar ${text || 'en el índice'}`">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 12 H19.5" />
          <path d="M13.5 6 L19.5 12 L13.5 18" />
        </svg>
      </button>
    </form>

    <!-- Type-ahead. The results page is still the destination; this is only a
         shortcut for the case where the reader already knows the record. -->
    <ul v-if="open" id="ows-suggest" class="field__suggest" role="listbox">
      <li
        v-for="(hit, i) in state.results.slice(0, 6)"
        :key="hit.record.id"
        class="field__hit"
        :class="{ 'is-active': i === active }"
        role="option"
        :aria-selected="i === active"
        @mouseenter="active = i"
        @mousedown.prevent="go(hit.record)"
      >
        <span class="field__hit-title">{{ hit.record.title }}</span>
        <span class="field__hit-kind">{{ hit.record.kind }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import { useRouter } from 'vue-router'
import { useSearch } from '../composables/useSearch'

const props = defineProps({
  size: { type: String, default: 'lg' }, // lg (hero) | md | sm (nav)
  /** Premium treatment: pill, glass, travelling specular, floor light. */
  luxe: { type: Boolean, default: false },
  /** Emit `launch` instead of navigating, so the caller can play a transition. */
  launch: { type: Boolean, default: false },
  placeholder: {
    type: String,
    default: 'Busque una designación, un proceso o una norma…',
  },
  /** Shown below ~46rem, where the full sentence would be cut mid-word. */
  placeholderShort: { type: String, default: 'Designación, proceso o norma…' },
  /** Seed the field, e.g. from ?q= on the results page. */
  initial: { type: String, default: '' },
  autofocus: { type: Boolean, default: false },
  /** Emit instead of navigating — used by the results page, which is already there. */
  inline: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'launch'])

const router = useRouter()
const { state, setQuery, submit } = useSearch()

const id = useId()
const input = ref(null)
const focused = ref(false)
const active = ref(-1)
const text = ref(props.initial)

// A placeholder cannot be truncated gracefully by CSS, so the string itself
// swaps at the breakpoint rather than being clipped mid-word.
const narrow = ref(false)
let mql = null
const onWidth = (e) => (narrow.value = e.matches)
const shownPlaceholder = computed(() =>
  narrow.value ? props.placeholderShort : props.placeholder,
)

const open = computed(
  () => focused.value && text.value.trim().length > 0 && state.results.length > 0,
)

function onInput(event) {
  text.value = event.target.value
  active.value = -1
  setQuery(text.value)
}

function go(record) {
  const chosen = record ?? (active.value >= 0 ? state.results[active.value]?.record : null)
  if (chosen) {
    input.value?.blur()
    router.push({ name: 'product', params: { id: chosen.id } })
    return
  }
  const q = text.value.trim()
  if (!q) return
  submit(q)
  input.value?.blur()
  if (props.inline) emit('submit', q)
  // `launch` hands the navigation to the caller so a transition can play
  // first. The field still runs the query, so results are ready on arrival.
  else if (props.launch) emit('launch', q)
  else router.push({ name: 'search', query: { q } })
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    input.value?.blur()
    return
  }
  if (!open.value) return
  const n = Math.min(state.results.length, 6)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % n
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = active.value <= 0 ? n - 1 : active.value - 1
  }
}

function onBlur() {
  // Deferred so a click on a suggestion is not cancelled by the blur.
  setTimeout(() => {
    focused.value = false
    active.value = -1
  }, 140)
}

onMounted(() => {
  mql = window.matchMedia('(max-width: 46rem)')
  narrow.value = mql.matches
  mql.addEventListener('change', onWidth)

  if (props.autofocus) input.value?.focus()
  if (props.initial) setQuery(props.initial)
})

onUnmounted(() => mql?.removeEventListener('change', onWidth))

defineExpose({ focus: () => input.value?.focus() })
</script>

<style scoped>
/*
  ---- luxe -----------------------------------------------------------------

  The field asked to stop being an input and start being an object. What makes
  that read is not the radius, it is the light: a hairline top edge catching a
  source above, a specular band travelling slowly across the surface, and the
  pool the whole thing throws onto the floor beneath it. Take any one of the
  three away and it collapses back into a rounded rectangle.
*/
.field--luxe .field__form {
  position: relative;
  height: clamp(3.25rem, 6.4vh, 4.25rem);
  padding-inline: 1.5rem;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.13);
  /* Matte, not glass. A high-gloss panel throws a hard specular and reads as
     plastic; anodised black scatters, so the top edge is a thin line rather
     than a highlight and the body stays flat.

     Over it, one broad reflection that slides with the head — --mx comes from
     whatever scene the field is standing in, and is simply absent (0, centred)
     on pages that do not run one. */
  background:
    radial-gradient(
      52% 190% at calc(50% + var(--mx, 0) * var(--ows-parallax) * 34%) -10%,
      rgb(255 255 255 / 0.05),
      transparent 68%
    ),
    linear-gradient(180deg, rgb(21 22 24 / 0.9), rgb(9 9 10 / 0.94));
  backdrop-filter: blur(14px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.1),
    inset 0 -1px 0 rgb(0 0 0 / 0.7),
    0 1.5rem 3.5rem rgb(0 0 0 / 0.8);
  overflow: hidden;
  transition:
    border-color var(--ows-base) var(--ows-ease),
    box-shadow var(--ows-base) var(--ows-ease),
    transform var(--ows-base) var(--ows-ease);
}

/* Travels once every twelve seconds. Slow enough that it is noticed rather
   than watched — a faster sweep reads as a loading bar. */
.field--luxe .field__sheen {
  position: absolute;
  inset: -50% -30%;
  pointer-events: none;
  background: linear-gradient(
    104deg,
    transparent 40%,
    rgb(255 255 255 / 0.025) 47%,
    rgb(255 255 255 / 0.055) 50%,
    rgb(255 255 255 / 0.025) 53%,
    transparent 60%
  );
  transform: translateX(-40%);
  animation: sheen 12s linear infinite;
}

@keyframes sheen {
  to {
    transform: translateX(40%);
  }
}

.field--luxe .field__floor {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 82%;
  height: 1px;
  transform: translateX(-50%);
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(255 255 255 / 0.22) 30%,
    rgb(255 255 255 / 0.4) 50%,
    rgb(255 255 255 / 0.22) 70%,
    transparent
  );
}

.field--luxe .field__form:hover,
.field--luxe.is-focused .field__form {
  border-color: rgb(255 255 255 / 0.26);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.22),
    inset 0 -1px 0 rgb(0 0 0 / 0.6),
    0 1.75rem 4.5rem rgb(0 0 0 / 0.85);
}

/* The identity's one appearance in the interface: the accent picks out the
   trailing edge on focus, and nowhere else. */
.field--luxe.is-focused .field__form {
  border-right-color: var(--ows-red-dim);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.22),
    inset -12px 0 24px -18px var(--ows-red),
    0 1.75rem 4.5rem rgb(0 0 0 / 0.85);
}

.field--luxe .field__input {
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
}

/* The prompt is the only instruction on the screen. Held at the faint ink it
   inherits it was invisible against the panel, which left the field reading
   as an empty slot rather than as something to type into. */
.field--luxe .field__input::placeholder {
  color: rgb(255 255 255 / 0.46);
  opacity: 1;
}

.field--luxe .field__form:hover .field__input::placeholder,
.field--luxe.is-focused .field__input::placeholder {
  color: rgb(255 255 255 / 0.62);
}

.field--luxe .field__icon {
  width: 1.0625rem;
  height: 1.0625rem;
  stroke-width: 1.2;
}

.field--luxe .field__go svg {
  stroke-width: 1.1;
}

.field--luxe .field__form:hover .field__go svg {
  transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
  .field--luxe .field__sheen {
    animation: none;
  }
}

.field {
  position: relative;
  width: 100%;
}

.field__form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 4.25rem;
  padding-inline: 1.5rem;
  border: 1px solid var(--ows-line-strong);
  background: rgb(10 10 10 / 0.66);
  backdrop-filter: blur(10px);
  transition:
    border-color var(--ows-base) var(--ows-ease),
    background-color var(--ows-base) var(--ows-ease);
}

.field__form:hover {
  border-color: rgb(255 255 255 / 0.3);
}

.is-focused .field__form {
  border-color: var(--ows-red);
  background: rgb(10 10 10 / 0.86);
}

.field__icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  fill: none;
  stroke: var(--ows-ink-muted);
  stroke-width: 1.5;
  stroke-linecap: round;
  transition: stroke var(--ows-base) var(--ows-ease);
}

.is-focused .field__icon {
  stroke: var(--ows-ink);
}

.field__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  color: var(--ows-ink);
  caret-color: var(--ows-red);
  outline: none;
}

.field__input::placeholder {
  color: var(--ows-ink-faint);
}

.field__input::-webkit-search-cancel-button,
.field__input::-webkit-search-decoration {
  appearance: none;
}

/* The one piece of red in the resting state — direction. */
.field__go {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: -0.5rem;
}

.field__go svg {
  width: 1.375rem;
  height: 1.375rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
}

.field__go:hover svg {
  transform: translateX(3px);
}

/* ---- suggestions ---- */

.field__suggest {
  position: absolute;
  top: calc(100% - 1px);
  left: 0;
  right: 0;
  z-index: 20;
  border: 1px solid var(--ows-line-strong);
  border-top: 0;
  background: var(--ows-surface);
  box-shadow: 0 28px 60px -20px rgb(0 0 0 / 0.9);
  max-height: 20rem;
  overflow-y: auto;
}

.field__hit {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8125rem 1.5rem;
  border-bottom: 1px solid var(--ows-line-soft);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition:
    background-color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.field__hit:last-child {
  border-bottom: 0;
}

.field__hit.is-active {
  background: rgb(255 255 255 / 0.03);
  border-left-color: var(--ows-red);
}

.field__hit-title {
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ows-ink);
}

.field__hit-kind {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  white-space: nowrap;
}

/* ---- sizes ---- */

.field--md .field__form {
  height: 3.5rem;
  padding-inline: 1.25rem;
}

.field--sm .field__form {
  height: 3rem;
  padding-inline: 1rem;
  gap: 0.75rem;
}
.field--sm .field__input {
  font-size: 0.875rem;
}

@media (max-width: 46rem) {
  .field__form {
    height: 3.5rem;
    padding-inline: 1.125rem;
    gap: 0.75rem;
  }
  .field__input {
    font-size: 0.875rem;
  }
  .field__hit {
    padding-inline: 1.125rem;
  }
}
</style>

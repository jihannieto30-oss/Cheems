<template>
  <div :ref="setStage" class="gate">
    <!-- The same world as the home screen, held much further back: the door
         should feel like it opens onto somewhere, not like a form. -->
    <div class="gate__field" aria-hidden="true">
      <StandardsCascade :depth="8" :density="0.62" :intensity="0.4" />
    </div>
    <span class="gate__vignette" aria-hidden="true" />

    <div class="gate__stage">
      <div class="gate__card" :class="{ 'gate__card--bad': error }">
        <span class="gate__surface" aria-hidden="true" />
        <span class="gate__sheen" aria-hidden="true" />
        <span class="gate__grain" aria-hidden="true" />

        <div class="gate__head">
          <OwsMark size="lg" tone="ink" />
        </div>

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
            placeholder="CÓDIGO DE INVITACIÓN"
            :aria-invalid="error"
            @input="error = false"
          />
          <span class="gate__rule" aria-hidden="true" />
        </form>
      </div>

      <!-- What the card throws on the floor. Outside the card so it stays on
           the ground while the card turns above it. -->
      <span class="gate__shadow" aria-hidden="true" />
    </div>

    <!-- The screen says nothing when a code is refused; the line going red is
         the whole message. Someone using a screen reader gets none of that,
         so the refusal is announced here instead. -->
    <p class="ows-sr" role="alert">{{ error ? 'Código no válido' : '' }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import OwsMark from './OwsMark.vue'
import StandardsCascade from './StandardsCascade.vue'
import { usePointerDepth } from '../composables/usePointerDepth'
import { verify, unlock } from '../gate'

/*
  The door.

  It is a card: matte black, hairline edge, the mark printed on it and one line
  to fill in. That shape is doing real work — a card is an object someone was
  handed, which is exactly what an invitation code is, and it says so without a
  sentence of explanation. Everything else has been taken out: no heading, no
  button, no claim. The placeholder is the only word on screen.

  The card turns with the head, and the mark and the line stand a few
  millimetres off its face, so the turn separates them the way it would on a
  real one. The light on the surface follows too. None of it is decoration —
  it is the difference between a black rectangle and an object.

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

const stage = usePointerDepth()
const setStage = (el) => (stage.value = el)

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
  overflow: hidden;
}

.gate__field {
  position: absolute;
  inset: -10%;
  /* Furthest plane, so it drifts with the head rather than against it. */
  transform: translate3d(
    calc(var(--mx, 0) * var(--ows-parallax) * 18px),
    calc(var(--my, 0) * var(--ows-parallax) * 11px),
    0
  );
}

.gate__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(78% 62% at 50% 46%, rgb(255 255 255 / 0.035), transparent 70%),
    radial-gradient(120% 90% at 50% 46%, transparent 30%, rgb(0 0 0 / 0.92) 100%);
}

/* Carries the perspective the card turns inside. Long enough that the turn
   reads as a turn and not as a fisheye. */
.gate__stage {
  position: relative;
  z-index: 1;
  width: min(100%, 30rem);
  perspective: 1600px;
  animation: gate-in 1.1s var(--ows-ease) both;
}

.gate__card {
  /* A card in the hand turns further than a wall does. Held in custom
     properties so the refusal shake can reproduce the pose rather than
     replacing it — an element has one transform, and both need it. */
  --ry: calc(var(--mx, 0) * var(--ows-parallax) * -7deg);
  --rx: calc(var(--my, 0) * var(--ows-parallax) * 4.6deg);
  position: relative;
  /* ID-1, the proportion every card in a wallet is cut to. Padding is a
     percentage of that width, so the margins scale with the card. */
  aspect-ratio: 1.586;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(1.25rem, 6%, 2.25rem);
  border-radius: clamp(0.875rem, 2.2vw, 1.375rem);
  /* The mark is printed on the card, so it scales with the card and not with
     the viewport — which is what a container query is for. */
  container-type: inline-size;
  transform-style: preserve-3d;
  transform: rotateY(var(--ry)) rotateX(var(--rx));
}

/*
  The surface itself, on its own layer so the card can hold the geometry and
  this can hold the finish: a matte black panel, lit slightly from above,
  with a hairline edge and one bright pixel along the top where the edge
  catches the light.
*/
.gate__surface {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(163deg, #131519 0%, #0b0c0e 46%, #050506 100%);
  border: 1px solid rgb(255 255 255 / 0.085);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.075),
    inset 0 -1px 0 rgb(0 0 0 / 0.8),
    0 2px 1px rgb(0 0 0 / 0.6);
  transition: border-color var(--ows-base) var(--ows-ease);
}

/*
  The light on it. A broad, soft reflection that follows the head — broad and
  soft because the finish is matte: a sharp band would read as gloss, which is
  the one thing this surface is not.
*/
.gate__sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(
      46% 68% at calc(50% + var(--mx, 0) * 34%) calc(38% + var(--my, 0) * 28%),
      rgb(255 255 255 / 0.06),
      transparent 72%
    ),
    linear-gradient(
      104deg,
      transparent 34%,
      rgb(255 255 255 / 0.035) 50%,
      transparent 66%
    );
  background-position:
    0 0,
    calc(50% + var(--mx, 0) * -30%) 0;
  background-size:
    100% 100%,
    220% 100%;
}

/* Soft-touch, not lacquer. A little tooth on the surface is most of what
   separates a matte black object from a black rectangle. Plain compositing,
   deliberately: a blend mode is a grouping property, and a grouping property
   would flatten the card and take the standing mark down with it. */
.gate__grain {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.055;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Printed on the face, standing off it. Real embossing is a third of a
   millimetre on an 86 mm card; this is more than that, because the turn is
   only a few degrees and a truthful relief at that angle separates by nothing
   at all. Far enough to read, near enough that perspective barely enlarges it. */
.gate__head {
  position: relative;
  transform: translateZ(22px);
}

.gate__head .mark {
  --h: clamp(1.5rem, 11cqw, 2.75rem);
}

.gate__form {
  position: relative;
  transform: translateZ(34px);
}

.gate__input {
  width: 100%;
  padding: 0.75rem 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--ows-ink);
  font: inherit;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  transition: color var(--ows-base) var(--ows-ease);
}

.gate__input::placeholder {
  color: var(--ows-ink-faint);
}

.gate__input:focus {
  outline: none;
}

/* The line the code is written on. Drawn rather than bordered so it can be lit
   from one end, the way a milled channel in a black card is. */
.gate__rule {
  display: block;
  height: 1px;
  background: linear-gradient(
    to right,
    rgb(255 255 255 / 0.28),
    rgb(255 255 255 / 0.1) 62%,
    rgb(255 255 255 / 0.04)
  );
  transition: background var(--ows-base) var(--ows-ease);
}

.gate__form:focus-within .gate__rule {
  background: linear-gradient(
    to right,
    rgb(255 255 255 / 0.6),
    rgb(255 255 255 / 0.22) 62%,
    rgb(255 255 255 / 0.08)
  );
}

/* The only feedback on the screen: the line goes red and the card flinches. */
.gate__card--bad .gate__rule,
.gate__card--bad .gate__form:focus-within .gate__rule {
  background: linear-gradient(
    to right,
    var(--ows-red),
    var(--ows-red-dim) 70%,
    transparent
  );
}

.gate__card--bad .gate__surface {
  border-color: var(--ows-red-dim);
}

.gate__card--bad {
  animation: refuse 420ms var(--ows-ease-io);
}

/* The card is off the ground, so it casts. Tracks the turn, and stays flat. */
.gate__shadow {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -7%;
  height: 22%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(50% 50% at 50% 50%, rgb(0 0 0 / 0.85), transparent 70%);
  filter: blur(18px);
  transform: translate3d(
    calc(var(--mx, 0) * var(--ows-parallax) * 14px),
    calc(var(--my, 0) * var(--ows-parallax) * 5px),
    0
  );
}

@keyframes gate-in {
  from {
    opacity: 0;
    transform: translateY(1.25rem) scale(0.985);
  }
}

@keyframes refuse {
  0%,
  100% {
    transform: translateX(0) rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
  }
  22% {
    transform: translateX(-5px) rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
  }
  58% {
    transform: translateX(4px) rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
  }
  82% {
    transform: translateX(-2px) rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
  }
}

/* Below the card's own proportion the fixed ratio starts squeezing the two
   elements together; height takes over from ratio. */
@media (max-height: 34rem), (max-width: 22rem) {
  .gate__card {
    aspect-ratio: auto;
    gap: clamp(2rem, 12vh, 3.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gate__stage,
  .gate__card--bad {
    animation: none;
  }
}
</style>

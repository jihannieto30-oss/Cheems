<template>
  <section :id="id" class="sec" :class="[`sec--${layout}`, { 'sec--deep': deep }]">
    <div class="sec__rule ows-shell">
      <hr class="ows-rule" />
    </div>

    <div class="sec__inner ows-shell">
      <header class="sec__head">
        <span class="sec__index ows-index" v-reveal>{{ index }}</span>
        <h2 class="sec__title ows-title" v-reveal="{ delay: 90 }">
          <span v-for="(char, i) in letters" :key="i" class="sec__char" :style="{ '--c': i }">{{
            char
          }}</span>
        </h2>
      </header>

      <div class="sec__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

/*
  Shared chassis for the four numbered sections: the hairline that opens them,
  the index numeral, and the letterspaced title. Everything below the header is
  the section's own composition — the sections differ enough that forcing one
  body layout on all four would flatten them.
*/
const props = defineProps({
  id: { type: String, required: true },
  index: { type: String, required: true },
  title: { type: String, required: true },
  layout: { type: String, default: 'split' }, // split | center
  /** Pulls the section a step darker than the page. */
  deep: { type: Boolean, default: false },
})

// Split for per-letter entrance. Spaces are kept as non-breaking so the
// letterspaced title never collapses.
const letters = computed(() => props.title.split('').map((c) => (c === ' ' ? ' ' : c)))
</script>

<style scoped>
.sec {
  position: relative;
  z-index: 1;
  padding-block: clamp(6rem, 16vh, 12rem);
}

.sec--deep {
  background: linear-gradient(to bottom, transparent, var(--ows-surface) 22%, transparent);
}

.sec__rule {
  margin-bottom: clamp(4rem, 10vh, 7rem);
}

.sec__head {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2.5vh, 1.75rem);
  margin-bottom: clamp(3rem, 8vh, 5.5rem);
}

.sec--center .sec__head {
  align-items: center;
  text-align: center;
}

.sec__title {
  display: flex;
  flex-wrap: wrap;
}

/* v-reveal is only the trigger here — all motion belongs to the letters, so
   the generic pending treatment is cancelled on the heading itself. */
.sec__title.is-reveal-pending,
.sec__title.is-revealed {
  opacity: 1;
  transform: none;
  transition: none;
}

.sec--center .sec__title {
  justify-content: center;
}

/* Letters lift in sequence once the title reveals. */
.sec__char {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.35em);
  transition:
    opacity 620ms var(--ows-ease),
    transform 620ms var(--ows-ease);
  transition-delay: calc(var(--c) * 26ms);
}

.sec__title.is-revealed .sec__char {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .sec__char {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>

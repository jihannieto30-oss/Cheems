<template>
  <!-- The gate replaces the site rather than covering it: while it is up the
       nav, the footer and every scene below are not mounted at all, so nothing
       is rendering or running a WebGL loop behind a screen nobody is reading. -->
  <Transition name="gate">
    <AccessGate v-if="!open" @open="open = true" />
  </Transition>

  <template v-if="open">
    <a class="skip" href="#main">Ir al contenido</a>

    <SiteNav />

    <main id="main">
    <!--
      Enter-only transition, and deliberately no mode="out-in".

      out-in holds the incoming page until the outgoing one signals the end of
      its leave transition. When that signal never arrives the router view is
      left rendering an empty comment node — no error, no warning in a
      production build, just a blank page on every navigation. Leaving the
      outgoing page to unmount immediately removes the dependency entirely.
    -->
      <RouterView v-slot="{ Component, route }">
        <Transition name="page">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <SiteFooter />
  </template>
</template>

<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import AccessGate from './components/AccessGate.vue'
import { isUnlocked } from './gate'

// Read once, synchronously, before the first paint — a returning reader with a
// valid pass should never see the door flash on their way in.
const open = ref(isUnlocked())
</script>

<style scoped>
.skip {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -120%);
  z-index: 200;
  padding: 0.75rem 1.25rem;
  background: var(--ows-red);
  color: var(--ows-ink);
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-meta);
  transition: transform var(--ows-fast) var(--ows-ease);
}

.skip:focus {
  transform: translate(-50%, 0);
}

/* The door lifts away rather than cutting; the site is already mounted
   underneath by the time it finishes. */
.gate-leave-active {
  transition:
    opacity var(--ows-slow) var(--ows-ease),
    transform var(--ows-slow) var(--ows-ease);
}

.gate-leave-to {
  opacity: 0;
  transform: translateY(-2vh);
}
</style>

<template>
  <a class="skip" href="#main">Skip to content</a>

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

<script setup>
import { RouterView } from 'vue-router'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
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
</style>

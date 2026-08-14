<template>
  <a class="skip" href="#main">Saltar al contenido</a>

  <header class="top no-print">
    <RouterLink class="top__brand" to="/">
      <OwsMark size="nav" tone="print" />
      <span class="ows-sr">Unibraze</span>
    </RouterLink>

    <div class="top__meta">
      <p class="top__title">Fichas técnicas</p>
      <p class="top__sub ows-meta">{{ CATALOG.length }} designaciones · {{ SECTIONS.length }} familias</p>
    </div>

    <form class="top__find" role="search" @submit.prevent>
      <label class="ows-sr" for="find">Buscar designación</label>
      <input id="find" v-model="query" type="search" placeholder="ER70S-6, E81T1, 316L…" autocomplete="off" />
    </form>
  </header>

  <div class="shell">
    <!--
      The rail is the division the request asked for: the catalogue split by
      what the metal is, not by process or by form. A welder looking for a low
      alloy wire starts by knowing it is low alloy.
    -->
    <aside class="rail no-print">
      <nav aria-label="Familias de material">
        <RouterLink class="rail__all" :class="{ 'is-on': !slug }" to="/">
          <span>Todas</span>
          <span class="ows-num">{{ CATALOG.length }}</span>
        </RouterLink>
        <RouterLink
          v-for="s in SECTIONS"
          :key="s.slug"
          class="rail__link"
          :class="{ 'is-on': s.slug === slug }"
          :to="{ name: 'family', params: { slug: s.slug } }"
        >
          <span>{{ s.es }}</span>
          <span class="ows-num">{{ counts[s.slug] ?? 0 }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main id="main" class="main">
      <RouterView :query="query" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import OwsMark from '../ows/components/OwsMark.vue'
import { CATALOG, SECTIONS } from '../ows/data/catalog'

/*
  The frame: a bar, a rail of families, and the page.

  The search box lives up here rather than on the catalogue page because it has
  to survive a navigation — typing three characters, opening a sheet and coming
  back to an emptied field is the single most annoying thing a catalogue can
  do. It is passed down as a prop; the pages decide what to do with it.
*/
const route = useRoute()
const query = ref('')

const slug = computed(() => route.params.slug ?? '')

const counts = computed(() =>
  CATALOG.reduce((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {}),
)
</script>

<style scoped>
.skip {
  position: absolute;
  left: -999px;
  /* Padded even while parked off-screen: it is a real control the moment it is
     focused, and a target that only becomes big enough on focus is a target
     that was too small when it was measured. */
  padding: 0.6875rem 0.75rem;
}

.skip:focus {
  left: 1rem;
  top: 1rem;
  z-index: 10;
  background: var(--ows-ink);
  color: #fff;
}

.top {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
  padding: 0.875rem var(--ows-gutter);
  border-bottom: 1px solid var(--ows-line);
  background: var(--ows-void);
  position: sticky;
  top: 0;
  z-index: 5;
}

.top__brand {
  flex: none;
}

.top__meta {
  flex: 1;
  min-width: 0;
}

.top__title {
  font-family: var(--ows-display);
  font-size: 1rem;
  font-weight: 500;
  color: var(--ows-ink);
  line-height: 1.2;
}

.top__sub {
  margin-top: 0.1875rem;
}

.top__find input {
  width: min(20rem, 42vw);
  height: 2.5rem;
  padding-inline: 0.75rem;
  border: 1px solid var(--ows-line);
  background: var(--ows-void);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink);
  transition: border-color var(--ows-fast) var(--ows-ease);
}

.top__find input:focus {
  outline: none;
  border-color: var(--ows-ink);
}

.shell {
  display: grid;
  grid-template-columns: var(--ows-rail) minmax(0, 1fr);
  align-items: start;
  max-width: var(--ows-max);
  margin-inline: auto;
}

.rail {
  position: sticky;
  top: 4.25rem;
  padding: 1.5rem var(--ows-gutter) 2rem;
  border-right: 1px solid var(--ows-line);
}

.rail__all,
.rail__link {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  /* 44px of target on a 11px label: the padding is the tap area, not decoration. */
  padding: 0.6875rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
  font-size: var(--ows-t-meta);
  letter-spacing: 0.04em;
  color: var(--ows-ink-muted);
  transition: color var(--ows-fast) var(--ows-ease);
}

.rail__all {
  border-bottom-color: var(--ows-line);
  color: var(--ows-ink);
}

.rail__all span:last-child,
.rail__link span:last-child {
  flex: none;
  font-size: var(--ows-t-micro);
  color: var(--ows-ink-faint);
}

.rail__all:hover,
.rail__link:hover {
  color: var(--ows-ink);
}

.rail__all.is-on,
.rail__link.is-on {
  color: var(--ows-ink);
  font-weight: 500;
  box-shadow: inset 2px 0 0 var(--ows-red);
  padding-left: 0.625rem;
  margin-left: -0.625rem;
}

.main {
  padding: clamp(1.5rem, 4vw, 2.5rem) var(--ows-gutter) 5rem;
  min-width: 0;
}

@media (max-width: 60rem) {
  .shell {
    grid-template-columns: 1fr;
  }

  .rail {
    position: static;
    border-right: 0;
    border-bottom: 1px solid var(--ows-line);
    padding-block: 1rem;
  }

  .rail nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
  }

  .rail__all,
  .rail__link {
    border-bottom: 0;
  }

  .rail__all.is-on,
  .rail__link.is-on {
    box-shadow: inset 0 -2px 0 var(--ows-red);
    padding-left: 0;
    margin-left: 0;
  }
}

@media (max-width: 40rem) {
  .top {
    flex-wrap: wrap;
  }

  .top__find {
    order: 3;
    width: 100%;
  }

  .top__find input {
    width: 100%;
  }
}

@media print {
  .shell {
    display: block;
    max-width: none;
  }

  .main {
    padding: 0;
  }
}
</style>

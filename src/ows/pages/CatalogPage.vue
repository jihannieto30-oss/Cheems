<template>
  <div class="page">
    <!-- ── Loaded parallax band ─────────────────────────────────────────
         Three product planes at different depths plus the standards falling
         through them. This is the "cargado" the catalogue was asked for; the
         listing below stays flat and quiet by contrast. -->
    <header class="band">
      <ParallaxImage class="band__far" src="/ows/plate.svg" alt="" :depth="4" :scale="1.3" :scrim="0.62" :hairlines="false" />
      <ParallaxImage class="band__mid" src="/ows/rod.svg" alt="" :depth="11" :scale="1.25" :scrim="0.22" :hairlines="false" :mono="false" />
      <ParallaxImage class="band__near" src="/ows/spool.svg" alt="" :depth="19" :scale="1.2" :scrim="0.12" :hairlines="false" :mono="false" />
      <StandardsCascade :depth="24" :density="0.7" :intensity="0.8" />
      <!-- Holds the reading column dark. The product art is bright enough that
           the copy loses against it without this. -->
      <span class="band__scrim" aria-hidden="true" />

      <div class="band__inner ows-shell">
        <nav class="crumb">
          <RouterLink to="/">OWS</RouterLink>
          <span aria-hidden="true">/</span>
          <span>CATALOGUE</span>
        </nav>
        <hr class="ows-tick" />
        <h1 class="band__title">CATALOGUE</h1>
        <p class="band__lead">
          {{ SECTIONS.length }} sections, {{ CATALOG_TOTAL }} designations. Filler metals, covered electrodes
          and brazing alloys across every alloy family Unibraze sections its range by.
        </p>

        <p class="band__status">
          <span class="band__dot" aria-hidden="true" />
          IN PROGRESS — {{ SHEET_TOTAL }} of {{ CATALOG_TOTAL }} technical sheets published.
          The remainder are catalogued with specification pending.
        </p>
      </div>
    </header>

    <!-- ── Product forms ──────────────────────────────────────────────── -->
    <section class="forms ows-shell">
      <p class="ows-label forms__label">PRODUCT FORMS</p>
      <div class="forms__grid">
        <article v-for="(f, i) in formCards" :key="f.id" class="form" v-reveal="{ delay: i * 110 }">
          <figure class="form__media">
            <ParallaxImage :src="f.art" :alt="f.alt" :depth="6" :scale="1.14" :scrim="0.06" :hairlines="false" :mono="false" />
          </figure>
          <hr class="ows-tick form__tick" />
          <h2 class="form__title">{{ f.es }}</h2>
          <p class="form__en">{{ f.en }}</p>
          <p class="form__body">{{ f.body }}</p>
          <p class="form__count ows-meta">
            <span class="ows-num">{{ f.count }}</span> DESIGNATIONS
          </p>
        </article>
      </div>
    </section>

    <!-- ── Sections ───────────────────────────────────────────────────── -->
    <section class="sections ows-shell">
      <p class="ows-label sections__label">SECTIONS</p>

      <article v-for="(s, i) in SECTIONS" :key="s.slug" class="sec" v-reveal="{ delay: Math.min(i, 5) * 70 }">
        <button class="sec__head" :aria-expanded="open === s.slug" @click="toggle(s.slug)">
          <span class="sec__index ows-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="sec__names">
            <span class="sec__en">{{ s.en }}</span>
            <span class="sec__es">{{ s.es }}</span>
          </span>
          <span class="sec__count ows-num">{{ countInSection(s.slug) }}</span>
          <svg class="sec__chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9.5 L12 15.5 L18 9.5" />
          </svg>
        </button>

        <p class="sec__blurb">{{ s.blurb }}</p>

        <div class="sec__drawer">
          <div class="sec__drawer-inner">
            <ul class="items">
              <li v-for="item in itemsInSection(s.slug)" :key="item.id">
                <RouterLink class="item" :to="{ name: 'record', params: { id: item.id } }">
                  <span class="item__name">{{ item.designation }}</span>
                  <span class="item__forms">
                    <i v-for="f in item.forms" :key="f" :title="FORMS[f].es">{{ FORMS[f].es }}</i>
                  </span>
                  <span class="item__spec">{{ item.spec }}</span>
                  <span class="item__sheet" :class="{ 'is-on': item.sheet }">
                    {{ item.sheet ? 'SHEET' : 'PENDING' }}
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ParallaxImage from '../components/ParallaxImage.vue'
import StandardsCascade from '../components/StandardsCascade.vue'
import {
  SECTIONS,
  FORMS,
  CATALOG,
  CATALOG_TOTAL,
  SHEET_TOTAL,
  countInSection,
  itemsInSection,
} from '../data/catalog'

const open = ref(SECTIONS[0].slug)
const toggle = (slug) => (open.value = open.value === slug ? null : slug)

const countForm = (key) => CATALOG.filter((c) => c.forms.includes(key)).length

const formCards = [
  {
    id: 'rod',
    es: 'VARILLA',
    en: 'Cut length rod',
    art: '/ows/rod.svg',
    alt: 'Bundle of copper-coated welding rods',
    body: 'High quality filler rod for GTAW and brazing, with excellent flow and penetration. Available across alloys and diameters.',
    count: countForm('R'),
  },
  {
    id: 'wire',
    es: 'ROLLO',
    en: 'Spooled wire',
    art: '/ows/spool.svg',
    alt: 'Spool of copper-coated MIG welding wire',
    body: 'Solid wire for MIG/MAG with stable feeding and a uniform arc. Built for high-productivity industrial work.',
    count: countForm('W'),
  },
  {
    id: 'electrode',
    es: 'ELECTRODO',
    en: 'Covered electrode',
    art: '/ows/electrode.svg',
    alt: 'Covered welding electrodes in an opened carton',
    body: 'Covered electrodes for SMAW with easy striking and excellent arc stability. Versatile across steel grades.',
    count: countForm('E'),
  },
]
</script>

<style scoped>
.page {
  padding-bottom: clamp(4rem, 12vh, 8rem);
}

/* ---- band ---- */

.band {
  position: relative;
  min-height: 74svh;
  display: flex;
  align-items: flex-end;
  padding: calc(var(--ows-nav-h) + 4rem) 0 clamp(2.5rem, 7vh, 4.5rem);
  overflow: hidden;
  isolation: isolate;
  border-bottom: 1px solid var(--ows-line-soft);
}

/* Three planes, back to front. Each ParallaxImage carries its own --depth, so
   they separate as the page scrolls. */
.band :deep(.pxi) {
  position: absolute;
  inset: 0;
}

.band__far :deep(.pxi__img) {
  opacity: 0.5;
}

.band__mid {
  clip-path: polygon(0 34%, 100% 12%, 100% 74%, 0 96%);
  opacity: 0.72;
}

.band__near {
  left: auto !important;
  width: min(46%, 34rem);
  opacity: 0.9;
  mask-image: linear-gradient(to left, #000 42%, transparent 100%);
}

.band__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to right,
      rgb(0 0 0 / 0.92) 0%,
      rgb(0 0 0 / 0.78) 26%,
      rgb(0 0 0 / 0.2) 58%,
      transparent 100%
    ),
    linear-gradient(to bottom, rgb(0 0 0 / 0.6) 0%, transparent 22%);
}

.band__inner {
  position: relative;
  z-index: var(--ows-z-content);
  width: 100%;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.crumb a {
  padding-block: 0.4375rem;
}
.crumb a:hover {
  color: var(--ows-ink);
}

.band__title {
  margin-top: 1.5rem;
  font-family: var(--ows-display);
  font-size: var(--ows-t-h2);
  font-weight: var(--ows-display-weight);
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.band__lead {
  margin-top: 1.25rem;
  max-width: 46ch;
  font-size: var(--ows-t-lead);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  text-shadow: 0 2px 18px rgb(0 0 0 / 0.9);
}

.band__status {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 1.75rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--ows-red-dim);
  background: rgb(0 0 0 / 0.5);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-muted);
}

.band__dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--ows-red);
  animation: pulse 2.4s var(--ows-ease-io) infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.25;
  }
}

/* ---- forms ---- */

.forms {
  padding-top: clamp(3rem, 9vh, 5rem);
}

.forms__label {
  margin-bottom: 2rem;
}

.forms__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(17rem, 100%), 1fr));
  gap: clamp(1.5rem, 4vw, 3rem);
}

.form__media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--ows-void);
  border: 1px solid var(--ows-line-soft);
}

.form__media :deep(.pxi) {
  position: absolute;
  inset: 0;
}

.form__tick {
  margin-top: 1.5rem;
}

.form__title {
  margin-top: 1rem;
  font-family: var(--ows-display);
  font-size: 1.75rem;
  font-weight: var(--ows-display-weight);
  letter-spacing: 0.03em;
  color: var(--ows-ink);
}

.form__en {
  margin-top: 0.25rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.form__body {
  margin-top: 0.875rem;
  max-width: 34ch;
  line-height: 1.7;
  color: var(--ows-ink-muted);
}

.form__count {
  margin-top: 1rem;
}

/* ---- sections ---- */

.sections {
  padding-top: clamp(3.5rem, 10vh, 6rem);
}

.sections__label {
  margin-bottom: 1.5rem;
}

.sec {
  border-top: 1px solid var(--ows-line-soft);
}

.sec:last-child {
  border-bottom: 1px solid var(--ows-line-soft);
}

.sec__head {
  display: flex;
  align-items: baseline;
  gap: clamp(0.75rem, 2vw, 1.75rem);
  width: 100%;
  padding: 1.25rem 0 0.5rem;
  text-align: left;
}

.sec__index {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-red);
  flex: none;
}

.sec__names {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.375rem 1rem;
}

.sec__en {
  font-family: var(--ows-display);
  font-size: clamp(1.25rem, 2.6vw, 1.875rem);
  font-weight: var(--ows-display-weight);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ows-ink);
}

.sec__es {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.sec__count {
  flex: none;
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
}

.sec__chevron {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: var(--ows-ink-faint);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-base) var(--ows-ease);
  align-self: center;
}

.sec__head[aria-expanded='true'] .sec__chevron {
  transform: rotate(180deg);
  stroke: var(--ows-red);
}

.sec__blurb {
  max-width: 62ch;
  padding-bottom: 1.125rem;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-faint);
}

/* 0fr → 1fr animates intrinsic height with no JS measurement. */
.sec__drawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--ows-base) var(--ows-ease);
}

.sec__head[aria-expanded='true'] + .sec__blurb + .sec__drawer {
  grid-template-rows: 1fr;
}

.sec__drawer-inner {
  overflow: hidden;
  min-height: 0;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border: 1px solid var(--ows-line-soft);
  margin-bottom: 1.5rem;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  background: var(--ows-surface);
  transition: background-color var(--ows-fast) var(--ows-ease);
}

.item:hover {
  background: var(--ows-panel);
}

.item__name {
  flex: 1 1 auto;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ows-ink);
  white-space: nowrap;
}

.item__forms {
  display: flex;
  gap: 0.25rem;
}

.item__forms i {
  font-style: normal;
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  padding: 0.125rem 0.3125rem;
  border: 1px solid var(--ows-line);
  color: var(--ows-ink-faint);
}

.item__spec,
.item__sheet {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
  white-space: nowrap;
}

.item__sheet.is-on {
  color: var(--ows-red);
}

@media (max-width: 46rem) {
  .band__near {
    display: none;
  }
  .item__spec {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .band__dot {
    animation: none;
  }
}
</style>

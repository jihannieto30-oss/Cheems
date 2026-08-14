<template>
  <article class="ds">
    <!-- The head band. One dark bar carrying the name and the designation,
         which is how every consumables sheet opens and the only place on the
         page where type is allowed to be large. -->
    <header class="ds__head">
      <div class="ds__head-inner">
        <p class="ds__eyebrow">{{ eyebrow }}</p>
        <h1 class="ds__title">{{ sheet.title }}</h1>
        <p v-if="sheet.designation && sheet.designation !== sheet.title" class="ds__desig">
          {{ sheet.designation }}
        </p>
      </div>
      <OwsMark size="md" tone="print" class="ds__mark" />
    </header>

    <!--
      A shell rather than a document. Said once, at the top, in plain language:
      the alternative is a page of empty tables, and an empty table on a
      datasheet reads as a measurement of zero.
    -->
    <p v-if="sheet.skeleton" class="ds__pending">
      Ficha en preparación. De este producto está publicada su clasificación,
      que se deriva de la designación. La composición química, las propiedades
      mecánicas y los parámetros son valores medidos: se publican cuando el
      certificado correspondiente está cargado, no antes.
    </p>

    <!-- ── the label/content rows ─────────────────────────────────────── -->
    <dl class="ds__rows">
      <div v-if="sheet.type" class="ds__row">
        <dt class="ds__label">TIPO</dt>
        <dd class="ds__value">{{ sheet.type }}</dd>
      </div>

      <div v-if="sheet.properties?.length" class="ds__row">
        <dt class="ds__label">PROPIEDADES</dt>
        <dd class="ds__value">
          <ul class="ds__list">
            <li v-for="(p, i) in sheet.properties" :key="i">{{ p }}</li>
          </ul>
        </dd>
      </div>

      <div v-if="sheet.applications?.length" class="ds__row">
        <dt class="ds__label">APLICACIÓN</dt>
        <dd class="ds__value">
          <ul class="ds__list ds__list--inline">
            <li v-for="(a, i) in sheet.applications" :key="i">{{ a }}</li>
          </ul>
        </dd>
      </div>

      <div v-if="sheet.classification?.length" class="ds__row">
        <dt class="ds__label">CLASIFICACIÓN</dt>
        <dd class="ds__value">
          <div v-for="(c, i) in sheet.classification" :key="i" class="ds__pair">
            <span class="ds__pair-k">{{ c.body }}</span>
            <span class="ds__pair-v">{{ c.value }}</span>
          </div>
        </dd>
      </div>

      <div v-if="sheet.suitable?.length" class="ds__row">
        <dt class="ds__label">APTO PARA</dt>
        <dd class="ds__value">
          <div v-for="(s, i) in sheet.suitable" :key="i" class="ds__pair">
            <span class="ds__pair-k">{{ s.label }}</span>
            <span class="ds__pair-v">{{ s.value }}</span>
          </div>
        </dd>
      </div>

      <div v-if="sheet.facts?.length" class="ds__row">
        <dt class="ds__label">DATOS</dt>
        <dd class="ds__value">
          <div v-for="(f, i) in sheet.facts" :key="i" class="ds__pair">
            <span class="ds__pair-k">{{ f.k }}</span>
            <span class="ds__pair-v">{{ f.v }}</span>
          </div>
        </dd>
      </div>

      <div v-if="sheet.positions?.length" class="ds__row">
        <dt class="ds__label">POSICIONES</dt>
        <dd class="ds__value">
          <ul class="ds__pos">
            <li v-for="p in sheet.positions" :key="p">{{ p }}</li>
          </ul>
        </dd>
      </div>

      <div v-if="sheet.approvals?.length" class="ds__row">
        <dt class="ds__label">APROBACIONES</dt>
        <dd class="ds__value">
          <ul class="ds__list ds__list--inline">
            <li v-for="(a, i) in sheet.approvals" :key="i">{{ a }}</li>
          </ul>
        </dd>
      </div>
    </dl>

    <!-- ── the tables ─────────────────────────────────────────────────── -->
    <section v-if="sheet.chemistry?.rows?.length" class="ds__table-block">
      <h2 class="ds__h2">{{ sheet.chemistry.note || 'COMPOSICIÓN QUÍMICA' }}</h2>
      <div class="ds__scroll">
        <table class="ds__table">
          <thead>
            <tr>
              <th scope="col" class="ds__th-lead">—</th>
              <th v-for="el in sheet.chemistry.elements" :key="el" scope="col">{{ el }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sheet.chemistry.rows" :key="i">
              <th scope="row">
                {{ row.label }}
                <span v-if="row.note" class="ds__rownote">{{ row.note }}</span>
              </th>
              <td v-for="(v, j) in row.values" :key="j" class="ows-num">{{ v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="sheet.mechanical?.rows?.length" class="ds__table-block">
      <h2 class="ds__h2">PROPIEDADES MECÁNICAS</h2>
      <div class="ds__scroll">
        <table class="ds__table">
          <thead>
            <tr>
              <th scope="col" class="ds__th-lead">{{ sheet.mechanical.note || '—' }}</th>
              <th v-for="c in sheet.mechanical.columns" :key="c" scope="col">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sheet.mechanical.rows" :key="i">
              <th scope="row">{{ row.label }}</th>
              <td v-for="(v, j) in row.values" :key="j" class="ows-num">{{ v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="sheet.parameters?.rows?.length" class="ds__table-block">
      <h2 class="ds__h2">{{ sheet.parameters.note || 'PARÁMETROS RECOMENDADOS' }}</h2>
      <div class="ds__scroll">
        <table class="ds__table">
          <thead>
            <tr>
              <th v-for="c in sheet.parameters.columns" :key="c" scope="col">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sheet.parameters.rows" :key="i">
              <td v-for="(v, j) in row.values" :key="j" class="ows-num">{{ v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="sheet.packaging?.length" class="ds__table-block">
      <h2 class="ds__h2">EMBALAJE</h2>
      <div class="ds__packs">
        <div v-for="(p, i) in sheet.packaging" :key="i" class="ds__pack">
          <h3 class="ds__pack-size ows-num">{{ p.size }}</h3>
          <dl class="ds__pack-rows">
            <div v-for="(r, j) in p.rows" :key="j" class="ds__pack-row">
              <dt>{{ r.pack }}</dt>
              <dd class="ows-num">{{ r.kg }} kg<span v-if="r.code"> · {{ r.code }}</span></dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <p v-if="sheet.notice" class="ds__notice">
      <span class="ds__notice-k">AVISO</span>
      {{ sheet.notice }}
    </p>
  </article>
</template>

<script setup>
import OwsMark from '../../ows/components/OwsMark.vue'

/*
  The datasheet, laid out the way the trade lays them out.

  Two devices carry the whole page. A label column on the left at a fixed
  width, so every section announces itself in the same place and the eye can
  run straight down it looking for CLASIFICACIÓN. And a hairline between every
  row, because a datasheet is a table of contents for a product and the rules
  are what make it scan as one rather than as prose.

  There is no card, no shadow and no panel. This document gets printed, faxed,
  photographed on a shop floor and pasted into a procedure; anything that only
  works on a screen is in the way.
*/
defineProps({
  sheet: { type: Object, required: true },
  eyebrow: { type: String, default: 'FICHA TÉCNICA' },
})
</script>

<style scoped>
.ds {
  --label-w: 11rem;
}

/* ---- head ---- */

.ds__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  padding: clamp(1.5rem, 4vw, 2.5rem) 0 clamp(1.25rem, 3vw, 2rem);
  border-bottom: 2px solid var(--ows-ink);
}

.ds__eyebrow {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
  margin-bottom: 0.75rem;
}

.ds__title {
  font-family: var(--ows-display);
  font-size: clamp(1.5rem, 4.2vw, 2.75rem);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: var(--ows-track-display);
  color: var(--ows-ink);
}

.ds__desig {
  margin-top: 0.625rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-body);
  color: var(--ows-ink-muted);
}

.ds__mark {
  flex: none;
  margin-bottom: 0.25rem;
}

@media (max-width: 40rem) {
  .ds__mark {
    display: none;
  }
}

.ds__pending {
  margin-top: 1.25rem;
  padding: 1rem 1.125rem;
  border-left: 2px solid var(--ows-red);
  background: var(--ows-red-wash);
  font-size: var(--ows-t-body);
  color: var(--ows-ink-muted);
  max-width: 62ch;
}

/* ---- label / content rows ---- */

.ds__rows {
  margin-top: 0.5rem;
}

.ds__row {
  display: grid;
  grid-template-columns: var(--label-w) 1fr;
  gap: 1.5rem;
  padding: 1.125rem 0;
  border-bottom: 1px solid var(--ows-line);
}

.ds__label {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
  padding-top: 0.1875rem;
}

.ds__value {
  font-size: var(--ows-t-body);
  color: var(--ows-ink-muted);
  min-width: 0;
}

.ds__list li + li {
  margin-top: 0.4375rem;
}

/* Applications and approvals are a set, not a sequence — set as one line of
   items separated by a rule rather than as a bulleted column. */
.ds__list--inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
}

.ds__list--inline li + li {
  margin-top: 0;
  position: relative;
}

.ds__list--inline li + li::before {
  content: '';
  position: absolute;
  left: -0.625rem;
  top: 0.35em;
  bottom: 0.35em;
  width: 1px;
  background: var(--ows-line);
}

/* A pair is a sub-row: its own key at a fixed width, its own value beside. */
.ds__pair {
  display: grid;
  grid-template-columns: minmax(7rem, 14rem) 1fr;
  gap: 1rem;
  padding: 0.3125rem 0;
}

.ds__pair + .ds__pair {
  border-top: 1px solid var(--ows-line-soft);
}

.ds__pair-k {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink);
  letter-spacing: 0.04em;
}

.ds__pair-v {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
  overflow-wrap: anywhere;
}

.ds__pos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ds__pos li {
  min-width: 2.75rem;
  padding: 0.3125rem 0.5rem;
  border: 1px solid var(--ows-line);
  text-align: center;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink);
}

/* ---- tables ---- */

.ds__table-block {
  margin-top: clamp(2rem, 5vw, 3rem);
}

.ds__h2 {
  font-size: var(--ows-t-micro);
  font-weight: 400;
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ows-line-strong);
}

/* A composition table has as many columns as the alloy has elements, and on a
   phone that is always more than fits. It scrolls inside its own box so the
   page never does. */
.ds__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.ds__table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  white-space: nowrap;
}

.ds__table th,
.ds__table td {
  padding: 0.6875rem 0.875rem;
  text-align: right;
  border-bottom: 1px solid var(--ows-line-soft);
}

.ds__table thead th {
  color: var(--ows-ink);
  font-weight: 500;
  border-bottom-color: var(--ows-line);
}

.ds__table tbody th,
.ds__table th:first-child,
.ds__table td:first-child {
  text-align: left;
  padding-left: 0;
}

.ds__table tbody th {
  color: var(--ows-ink);
  font-weight: 400;
  white-space: normal;
  min-width: 9rem;
}

.ds__table td {
  color: var(--ows-ink-muted);
}

.ds__th-lead {
  color: var(--ows-ink-faint) !important;
  font-weight: 400 !important;
  white-space: normal;
}

.ds__rownote {
  display: block;
  font-size: var(--ows-t-micro);
  color: var(--ows-ink-faint);
}

/* ---- packaging ---- */

.ds__packs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 1px;
  background: var(--ows-line-soft);
  border-bottom: 1px solid var(--ows-line-soft);
}

.ds__pack {
  background: var(--ows-void);
  padding: 1rem 1rem 1.125rem;
}

.ds__pack-size {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-body);
  font-weight: 500;
  color: var(--ows-ink);
  margin-bottom: 0.625rem;
}

.ds__pack-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3125rem 0;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
}

.ds__pack-row + .ds__pack-row {
  border-top: 1px solid var(--ows-line-soft);
}

/* ---- notice ---- */

.ds__notice {
  margin-top: clamp(2.5rem, 6vw, 4rem);
  padding-top: 1.25rem;
  border-top: 1px solid var(--ows-line);
  font-size: var(--ows-t-micro);
  line-height: 1.7;
  color: var(--ows-ink-faint);
  max-width: 90ch;
}

.ds__notice-k {
  display: block;
  margin-bottom: 0.5rem;
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-muted);
}

@media (max-width: 46rem) {
  .ds__row {
    grid-template-columns: 1fr;
    gap: 0.625rem;
  }

  .ds__pair {
    grid-template-columns: 1fr;
    gap: 0.125rem;
  }
}

/* The sheet gets printed. Black on white, no furniture. */
@media print {
  .ds__head {
    border-bottom-color: #000;
  }

  .ds__mark {
    display: block;
  }

  .ds__table-block {
    break-inside: avoid;
  }
}
</style>

<template>
  <Teleport to="body">
    <div class="ed" role="dialog" aria-modal="true" aria-label="Editor de ficha técnica">
      <div class="ed__scrim" @click="close" />

      <div class="ed__panel">
        <header class="ed__head">
          <div>
            <p class="ed__eyebrow">EDITANDO FICHA</p>
            <h2 class="ed__title">{{ draft.title || id }}</h2>
          </div>
          <button class="ed__x" aria-label="Cerrar editor" @click="close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <p v-if="!canPersist" class="ed__warn">
          Este navegador no permite guardar en local (modo privado o archivo
          abierto desde el disco). Se puede editar y exportar, pero al recargar
          se pierde lo que no se haya exportado.
        </p>

        <div class="ed__body">
          <!-- ── identity ─────────────────────────────────────────── -->
          <section class="ed__sec">
            <h3 class="ed__h3">Identificación</h3>
            <label class="ed__field">
              <span>Título</span>
              <input v-model="draft.title" type="text" />
            </label>
            <label class="ed__field">
              <span>Designación</span>
              <input v-model="draft.designation" type="text" />
            </label>
            <label class="ed__field">
              <span>Tipo — una línea</span>
              <textarea v-model="draft.type" rows="2" />
            </label>
          </section>

          <!-- ── plain lists ──────────────────────────────────────── -->
          <section v-for="list in LISTS" :key="list.key" class="ed__sec">
            <h3 class="ed__h3">{{ list.label }}</h3>
            <div v-for="(_, i) in ensureArray(list.key)" :key="i" class="ed__line">
              <input v-model="draft[list.key][i]" type="text" :placeholder="list.hint" />
              <button class="ed__mini" title="Subir" @click="move(draft[list.key], i, -1)">↑</button>
              <button class="ed__mini" title="Bajar" @click="move(draft[list.key], i, 1)">↓</button>
              <button class="ed__mini ed__mini--del" title="Quitar" @click="draft[list.key].splice(i, 1)">
                ×
              </button>
            </div>
            <button class="ed__add" @click="ensureArray(list.key).push('')">+ Añadir</button>
          </section>

          <!-- ── key / value blocks ───────────────────────────────── -->
          <section v-for="pair in PAIRS" :key="pair.key" class="ed__sec">
            <h3 class="ed__h3">{{ pair.label }}</h3>
            <div v-for="(row, i) in ensureArray(pair.key)" :key="i" class="ed__line ed__line--pair">
              <input v-model="row[pair.a]" type="text" :placeholder="pair.aHint" />
              <input v-model="row[pair.b]" type="text" :placeholder="pair.bHint" />
              <button class="ed__mini" title="Subir" @click="move(draft[pair.key], i, -1)">↑</button>
              <button class="ed__mini" title="Bajar" @click="move(draft[pair.key], i, 1)">↓</button>
              <button class="ed__mini ed__mini--del" title="Quitar" @click="draft[pair.key].splice(i, 1)">
                ×
              </button>
            </div>
            <button class="ed__add" @click="ensureArray(pair.key).push({ [pair.a]: '', [pair.b]: '' })">
              + Añadir
            </button>
          </section>

          <!-- ── chemistry ────────────────────────────────────────── -->
          <section class="ed__sec">
            <h3 class="ed__h3">Composición química</h3>
            <label class="ed__field">
              <span>Encabezado</span>
              <input v-model="chem.note" type="text" placeholder="Composición del metal depositado, % en peso" />
            </label>

            <p class="ed__sub">Elementos</p>
            <div class="ed__cols">
              <div v-for="(_, i) in chem.elements" :key="i" class="ed__col">
                <input v-model="chem.elements[i]" type="text" class="ed__col-in" />
                <button class="ed__mini ed__mini--del" title="Quitar columna" @click="dropColumn(chem, i)">
                  ×
                </button>
              </div>
              <button class="ed__add ed__add--inline" @click="addColumn(chem)">+ Elemento</button>
            </div>

            <p class="ed__sub">Filas</p>
            <div v-for="(row, i) in chem.rows" :key="i" class="ed__row">
              <div class="ed__row-head">
                <input v-model="row.label" type="text" placeholder="AWS · C1 · M21" class="ed__row-label" />
                <input v-model="row.note" type="text" placeholder="nota (opcional)" class="ed__row-note" />
                <button class="ed__mini ed__mini--del" title="Quitar fila" @click="chem.rows.splice(i, 1)">
                  ×
                </button>
              </div>
              <div class="ed__vals">
                <label v-for="(el, j) in chem.elements" :key="j" class="ed__val">
                  <span>{{ el || '—' }}</span>
                  <input v-model="row.values[j]" type="text" />
                </label>
              </div>
            </div>
            <button class="ed__add" @click="addRow(chem)">+ Fila</button>
          </section>

          <!-- ── mechanical / parameters ──────────────────────────── -->
          <section v-for="tbl in TABLES" :key="tbl.key" class="ed__sec">
            <h3 class="ed__h3">{{ tbl.label }}</h3>
            <label class="ed__field">
              <span>Encabezado</span>
              <input v-model="table(tbl.key).note" type="text" />
            </label>

            <p class="ed__sub">Columnas</p>
            <div class="ed__cols">
              <div v-for="(_, i) in table(tbl.key).columns" :key="i" class="ed__col">
                <input v-model="table(tbl.key).columns[i]" type="text" class="ed__col-in ed__col-in--wide" />
                <button
                  class="ed__mini ed__mini--del"
                  title="Quitar columna"
                  @click="dropColumn(table(tbl.key), i, 'columns')"
                >
                  ×
                </button>
              </div>
              <button class="ed__add ed__add--inline" @click="addColumn(table(tbl.key), 'columns')">
                + Columna
              </button>
            </div>

            <p class="ed__sub">Filas</p>
            <div v-for="(row, i) in table(tbl.key).rows" :key="i" class="ed__row">
              <div class="ed__row-head">
                <input
                  v-if="tbl.labelled"
                  v-model="row.label"
                  type="text"
                  placeholder="Propiedad"
                  class="ed__row-label"
                />
                <span v-else class="ed__row-n ows-num">{{ i + 1 }}</span>
                <button
                  class="ed__mini ed__mini--del"
                  title="Quitar fila"
                  @click="table(tbl.key).rows.splice(i, 1)"
                >
                  ×
                </button>
              </div>
              <div class="ed__vals">
                <label v-for="(c, j) in table(tbl.key).columns" :key="j" class="ed__val">
                  <span>{{ c || '—' }}</span>
                  <input v-model="row.values[j]" type="text" />
                </label>
              </div>
            </div>
            <button class="ed__add" @click="addRow(table(tbl.key), 'columns', tbl.labelled)">+ Fila</button>
          </section>

          <!-- ── packaging ────────────────────────────────────────── -->
          <section class="ed__sec">
            <h3 class="ed__h3">Embalaje</h3>
            <div v-for="(group, i) in ensureArray('packaging')" :key="i" class="ed__row">
              <div class="ed__row-head">
                <input v-model="group.size" type="text" placeholder="1.2 mm" class="ed__row-label" />
                <button class="ed__mini ed__mini--del" title="Quitar medida" @click="draft.packaging.splice(i, 1)">
                  ×
                </button>
              </div>
              <div v-for="(r, j) in group.rows" :key="j" class="ed__line ed__line--pack">
                <input v-model="r.pack" type="text" placeholder="Bobina" />
                <input v-model="r.kg" type="text" placeholder="15" />
                <input v-model="r.code" type="text" placeholder="código (opcional)" />
                <button class="ed__mini ed__mini--del" title="Quitar" @click="group.rows.splice(j, 1)">×</button>
              </div>
              <button class="ed__add" @click="group.rows.push({ pack: '', kg: '', code: '' })">
                + Presentación
              </button>
            </div>
            <button class="ed__add" @click="ensureArray('packaging').push({ size: '', rows: [] })">
              + Medida
            </button>
          </section>

          <!-- ── notice ───────────────────────────────────────────── -->
          <section class="ed__sec">
            <h3 class="ed__h3">Aviso legal</h3>
            <label class="ed__field">
              <span>Texto</span>
              <textarea v-model="draft.notice" rows="6" />
            </label>
          </section>

          <!-- ── the whole set ────────────────────────────────────── -->
          <section class="ed__sec ed__sec--tools">
            <h3 class="ed__h3">Todas las fichas</h3>
            <p class="ed__note">
              Lo editado vive en este navegador. Exportar escribe un archivo con
              todas las fichas modificadas: ese archivo es lo único que las
              lleva a otra máquina, y es también lo que un desarrollador
              necesita para dejarlas fijas en la web.
            </p>
            <p class="ed__count">
              {{ editedIds.length }}
              {{ editedIds.length === 1 ? 'ficha editada' : 'fichas editadas' }}
            </p>
            <div class="ed__tools">
              <button class="ed__btn" @click="doExport">EXPORTAR JSON</button>
              <button class="ed__btn" @click="pickFile">IMPORTAR JSON</button>
              <button class="ed__btn ed__btn--warn" @click="doResetAll">BORRAR TODO</button>
            </div>
            <input ref="file" type="file" accept="application/json,.json" hidden @change="doImport" />
            <p v-if="message" class="ed__msg" role="status">{{ message }}</p>
          </section>
        </div>

        <footer class="ed__foot">
          <button class="ed__btn ed__btn--ghost" @click="doReset">DESHACER CAMBIOS</button>
          <div class="ed__foot-right">
            <button class="ed__btn ed__btn--ghost" @click="close">CANCELAR</button>
            <button class="ed__btn ed__btn--go" @click="save">GUARDAR</button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { draftOf, saveSheet, resetSheet, resetAll, exportAll, importAll, editedIds, canPersist } from '../sheetStore'

/*
  The editor.

  One panel, every field, no modes. The datasheet has four shapes of content —
  plain lists, key/value pairs, tables with a header row, and packaging groups
  — so the editor has four shapes of control and reuses each of them across
  every section that is that shape. That is why adding a section to the sheet
  costs one line in a table below rather than a new screen.

  Two rules the controls follow, both about not losing work:

  · a table's columns and every row's values are kept the same length. Adding a
    column pushes an empty cell onto every row and removing one splices the
    same index out of each; a table where row three has four values and the
    header has five is a table that silently shifts a measurement one column to
    the left.

  · nothing is written until GUARDAR. The draft is a deep copy, so closing the
    panel or hitting CANCELAR leaves the published sheet exactly as it was.
*/

const props = defineProps({
  id: { type: String, required: true },
})
const emit = defineEmits(['close', 'saved'])

const draft = reactive(draftOf(props.id) ?? { id: props.id })
const message = ref('')
const file = ref(null)

/** Sections that are a plain list of strings. */
const LISTS = [
  { key: 'properties', label: 'Propiedades', hint: 'Una afirmación por línea' },
  { key: 'applications', label: 'Aplicación', hint: 'Sector o pieza' },
  { key: 'approvals', label: 'Aprobaciones', hint: 'CE · DB · ABS …' },
  { key: 'positions', label: 'Posiciones', hint: 'PA · PB · 1G · 6G' },
]

/** Sections that are a list of two-field rows. */
const PAIRS = [
  { key: 'classification', label: 'Clasificación', a: 'body', b: 'value', aHint: 'AWS A5.29', bHint: 'E81T1-Ni1C-J H4' },
  { key: 'suitable', label: 'Apto para', a: 'label', b: 'value', aHint: 'W.Nr', bHint: '1.0038, 1.0044 …' },
  { key: 'facts', label: 'Datos', a: 'k', b: 'v', aHint: 'Gas de protección', bHint: '100 % CO₂ o 80/20' },
]

/** Sections that are a table with a labelled or numbered row head. */
const TABLES = [
  { key: 'mechanical', label: 'Propiedades mecánicas', labelled: true },
  { key: 'parameters', label: 'Parámetros recomendados', labelled: false },
]

/** Creates the array on first use, so an absent section is still editable. */
function ensureArray(key) {
  if (!Array.isArray(draft[key])) draft[key] = []
  return draft[key]
}

/** Same, for the table-shaped sections. */
function table(key) {
  if (!draft[key] || typeof draft[key] !== 'object') draft[key] = {}
  const t = draft[key]
  if (!Array.isArray(t.columns)) t.columns = []
  if (!Array.isArray(t.rows)) t.rows = []
  if (typeof t.note !== 'string') t.note = ''
  return t
}

// Chemistry keeps its header under `elements` rather than `columns`, because
// that is what it is; the column helpers take the key so both work.
const chem = table('chemistry')
if (!Array.isArray(chem.elements)) chem.elements = []

function move(arr, i, delta) {
  const j = i + delta
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

function addColumn(t, key = 'elements') {
  t[key].push('')
  for (const row of t.rows) row.values.push('')
}

function dropColumn(t, i, key = 'elements') {
  t[key].splice(i, 1)
  for (const row of t.rows) row.values.splice(i, 1)
}

function addRow(t, key = 'elements', labelled = true) {
  const row = { values: t[key].map(() => '') }
  if (labelled) row.label = ''
  t.rows.push(row)
}

function save() {
  const ok = saveSheet(props.id, draft)
  emit('saved')
  if (!ok) {
    message.value = 'No se pudo guardar en este navegador. Exporta antes de cerrar.'
    return
  }
  emit('close')
}

function doReset() {
  resetSheet(props.id)
  emit('saved')
  emit('close')
}

function doResetAll() {
  resetAll()
  emit('saved')
  message.value = 'Se borraron todas las ediciones locales.'
}

/*
  The export is handed over as a download. A blob URL is created, clicked and
  revoked in the same turn — leaving it alive holds the whole file in memory
  for as long as the tab is open.
*/
function doExport() {
  const blob = new Blob([exportAll()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unibraze-fichas-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.value = 'Archivo exportado.'
}

const pickFile = () => file.value?.click()

async function doImport(event) {
  const picked = event.target.files?.[0]
  if (!picked) return
  try {
    const n = importAll(await picked.text())
    message.value = `${n} ${n === 1 ? 'ficha importada' : 'fichas importadas'}.`
    emit('saved')
  } catch (error) {
    message.value = error.message
  }
  event.target.value = ''
}

const close = () => emit('close')
const onKey = (e) => e.key === 'Escape' && close()

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.ed {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.ed__scrim {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.7);
  backdrop-filter: blur(3px);
}

.ed__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, 46rem);
  background: var(--ows-surface);
  border-left: 1px solid var(--ows-line);
  animation: slide var(--ows-base) var(--ows-ease);
}

@keyframes slide {
  from {
    transform: translateX(2rem);
    opacity: 0;
  }
}

.ed__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem var(--ows-gutter);
  border-bottom: 1px solid var(--ows-line);
}

.ed__eyebrow {
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-label);
  color: var(--ows-ink-faint);
}

.ed__title {
  margin-top: 0.375rem;
  font-family: var(--ows-display);
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--ows-ink);
}

.ed__x {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  color: var(--ows-ink-muted);
}

.ed__x svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

.ed__x:hover {
  color: var(--ows-ink);
}

.ed__warn {
  padding: 0.75rem var(--ows-gutter);
  background: var(--ows-red-wash);
  border-bottom: 1px solid var(--ows-red-dim);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
}

.ed__body {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--ows-gutter) 2rem;
}

.ed__sec {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--ows-line-soft);
}

.ed__sec--tools {
  border-bottom: 0;
}

.ed__h3 {
  font-size: var(--ows-t-micro);
  font-weight: 400;
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  margin-bottom: 0.875rem;
}

.ed__sub {
  margin: 1rem 0 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.ed__field {
  display: block;
  margin-bottom: 0.75rem;
}

.ed__field > span {
  display: block;
  margin-bottom: 0.3125rem;
  font-size: var(--ows-t-micro);
  color: var(--ows-ink-faint);
}

/* One control skin for every input in the panel. */
.ed :is(input[type='text'], textarea) {
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: var(--ows-void);
  border: 1px solid var(--ows-line);
  color: var(--ows-ink);
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  line-height: 1.5;
  transition: border-color var(--ows-fast) var(--ows-ease);
}

.ed :is(input[type='text'], textarea):focus {
  outline: none;
  border-color: var(--ows-ink-faint);
}

.ed textarea {
  resize: vertical;
}

.ed__line {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.ed__line--pair {
  display: grid;
  grid-template-columns: minmax(6rem, 1fr) 2fr auto auto auto;
}

.ed__line--pack {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr 1.4fr auto;
}

.ed__mini {
  flex: none;
  width: 1.875rem;
  height: 1.875rem;
  border: 1px solid var(--ows-line);
  color: var(--ows-ink-muted);
  font-size: 0.8125rem;
  line-height: 1;
}

.ed__mini:hover {
  color: var(--ows-ink);
  border-color: var(--ows-ink-faint);
}

.ed__mini--del:hover {
  color: var(--ows-red-bright);
  border-color: var(--ows-red-dim);
}

.ed__add {
  margin-top: 0.375rem;
  padding: 0.4375rem 0.75rem;
  border: 1px dashed var(--ows-line);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-faint);
}

.ed__add:hover {
  color: var(--ows-ink);
  border-color: var(--ows-ink-faint);
}

.ed__add--inline {
  margin-top: 0;
}

.ed__cols {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.ed__col {
  display: flex;
  align-items: center;
  gap: 0.1875rem;
}

.ed__col-in {
  width: 4rem;
  text-align: center;
}

.ed__col-in--wide {
  width: 9rem;
  text-align: left;
}

.ed__row {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--ows-line-soft);
}

.ed__row-head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.ed__row-label {
  flex: 2;
}

.ed__row-note {
  flex: 1;
}

.ed__row-n {
  flex: 1;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-faint);
}

.ed__vals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.25rem, 1fr));
  gap: 0.375rem;
}

.ed__val > span {
  display: block;
  margin-bottom: 0.1875rem;
  font-size: var(--ows-t-micro);
  color: var(--ows-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ed__note {
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
  max-width: 56ch;
  margin-bottom: 0.75rem;
}

.ed__count {
  font-family: var(--ows-mono);
  font-size: var(--ows-t-meta);
  color: var(--ows-ink);
  margin-bottom: 0.75rem;
}

.ed__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ed__msg {
  margin-top: 0.75rem;
  font-size: var(--ows-t-meta);
  color: var(--ows-ink-muted);
}

.ed__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem var(--ows-gutter);
  border-top: 1px solid var(--ows-line);
  background: var(--ows-panel);
}

.ed__foot-right {
  display: flex;
  gap: 0.5rem;
}

.ed__btn {
  height: 2.5rem;
  padding-inline: 1rem;
  border: 1px solid var(--ows-line);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  color: var(--ows-ink-muted);
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease),
    background-color var(--ows-fast) var(--ows-ease);
}

.ed__btn:hover {
  color: var(--ows-ink);
  border-color: var(--ows-ink-faint);
}

.ed__btn--go {
  background: var(--ows-ink);
  border-color: var(--ows-ink);
  color: var(--ows-void);
  font-weight: 500;
}

.ed__btn--go:hover {
  background: var(--ows-ink);
  color: var(--ows-void);
}

.ed__btn--warn:hover {
  color: var(--ows-red-bright);
  border-color: var(--ows-red-dim);
}

@media (max-width: 46rem) {
  .ed__line--pair,
  .ed__line--pack {
    grid-template-columns: 1fr;
  }

  .ed__line--pair button,
  .ed__line--pack button {
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ed__panel {
    animation: none;
  }
}
</style>

import { reactive, computed } from 'vue'
import { SHEETS, skeletonSheet } from './data/sheets'
import { CATALOG, FORMS } from './data/catalog'

/*
  The editable layer over the datasheets.

  Everything the site publishes about a product is a datasheet, and every field
  of every datasheet can be changed from inside the site. What that means
  without a server has to be said exactly, because the difference matters:

    · edits are held in this browser, in localStorage, under one key
    · they survive reloads and they survive nothing else — another machine,
      another browser, or a cleared profile starts from the shipped data
    · EXPORT writes the whole edited set to a JSON file, and that file is the
      only thing that carries the work anywhere. It is also exactly what a
      developer needs to commit the edits into the build.
    · IMPORT reads such a file back, on any machine

  This is not a content management system pretending to be one. It is a
  complete editor with an honest boundary, and the boundary is the export
  button. A real CMS is a server, and there is no server here.

  Resolution order for any product: the local override if there is one, else
  the shipped datasheet, else a skeleton derived from the catalogue entry —
  classification and process, which are genuinely known from the designation,
  and nothing invented beyond them.
*/

const STORAGE_KEY = 'unibraze.sheets.v1'

const CATALOG_BY_ID = new Map(CATALOG.map((item) => [item.id, item]))

/*
  localStorage is wrapped: it throws rather than returning null in private
  Safari and on some file:// origins, and a datasheet that cannot be saved is
  still a datasheet that has to render.
*/
function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** The overrides, reactive so every open sheet re-renders as one is saved. */
const overrides = reactive(read())

/** True when this browser can actually keep an edit. Surfaced in the editor. */
export const canPersist = (() => {
  try {
    const probe = `${STORAGE_KEY}.probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
})()

/** Ids that carry a local edit. */
export const editedIds = computed(() => Object.keys(overrides))

/** How many products have a real, transcribed datasheet behind them. */
export const publishedCount = computed(
  () => new Set([...Object.keys(SHEETS), ...Object.keys(overrides)]).size,
)

const formLabels = (item) => (item?.forms ?? []).map((f) => FORMS[f]?.es).filter(Boolean)

/** The shipped sheet for an id, or a skeleton built from the catalogue. */
export function baseSheet(id) {
  if (SHEETS[id]) return SHEETS[id]
  const item = CATALOG_BY_ID.get(id)
  return item ? skeletonSheet(item, formLabels(item)) : null
}

/** The sheet as the site should render it: the local edit if there is one. */
export function getSheet(id) {
  return overrides[id] ?? baseSheet(id)
}

/** True when this id is showing a local edit rather than what shipped. */
export function isEdited(id) {
  return Object.prototype.hasOwnProperty.call(overrides, id)
}

/** A deep, plain copy — what the editor mutates, so nothing is live-edited. */
export function draftOf(id) {
  const sheet = getSheet(id)
  return sheet ? JSON.parse(JSON.stringify(sheet)) : null
}

export function saveSheet(id, sheet) {
  overrides[id] = JSON.parse(JSON.stringify(sheet))
  return write(overrides)
}

/** Drops the local edit; the product goes back to whatever shipped. */
export function resetSheet(id) {
  delete overrides[id]
  return write(overrides)
}

export function resetAll() {
  for (const key of Object.keys(overrides)) delete overrides[key]
  return write(overrides)
}

/** The whole edited set, as the file that carries it off this machine. */
export function exportAll() {
  return JSON.stringify(
    {
      format: 'unibraze.sheets',
      version: 1,
      exported: new Date().toISOString(),
      sheets: JSON.parse(JSON.stringify(overrides)),
    },
    null,
    2,
  )
}

/**
 * Reads an exported file back.
 * `merge` keeps edits this browser already has; without it the file replaces
 * them. Returns the number of sheets read, or throws with a plain reason —
 * silently accepting a file that is not one of ours would lose work.
 */
export function importAll(json, { merge = false } = {}) {
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es JSON válido.')
  }
  const incoming = parsed?.sheets ?? parsed
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    throw new Error('El archivo no tiene fichas dentro.')
  }
  if (!merge) for (const key of Object.keys(overrides)) delete overrides[key]
  let n = 0
  for (const [id, sheet] of Object.entries(incoming)) {
    if (!sheet || typeof sheet !== 'object') continue
    overrides[id] = { ...sheet, id }
    n++
  }
  write(overrides)
  return n
}

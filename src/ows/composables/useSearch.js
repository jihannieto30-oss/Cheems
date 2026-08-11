import { reactive, readonly, computed } from 'vue'
import { resolveProvider } from '../services/searchProvider'

/*
  One search store for the whole page.

  The hero field and the closing field are two views of the same state, so a
  query typed at the bottom is the same query that was typed at the top. When
  routing arrives this store is what a /search route reads from.
*/

const RECENT_KEY = 'ows:recent'
const RECENT_MAX = 6
const DEBOUNCE_MS = 130

const provider = resolveProvider()

const state = reactive({
  query: '',
  status: 'idle', // idle | pending | ready | error
  results: [],
  total: 0,
  took: 0,
  error: null,
  recent: loadRecent(),
  provider: provider.id,
})

let timer = null
let controller = null

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch {
    // Private mode, disabled storage, corrupt value — recents are a nicety.
    return []
  }
}

function persistRecent(text) {
  const trimmed = text.trim()
  if (trimmed.length < 2) return
  const next = [trimmed, ...state.recent.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())]
  state.recent = next.slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent))
  } catch {
    /* non-fatal */
  }
}

function cancelInFlight() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  controller?.abort()
  controller = null
}

async function run(text) {
  controller = new AbortController()
  state.status = 'pending'
  state.error = null

  try {
    const { results, total, took } = await provider.query(text, {
      // Deep enough that the results page can group meaningfully; the
      // type-ahead slices this down to six itself.
      limit: 30,
      signal: controller.signal,
    })
    state.results = results
    state.total = total
    state.took = took
    state.status = 'ready'
  } catch (error) {
    if (error?.name === 'AbortError') return
    state.error = error?.message ?? 'Search unavailable'
    state.results = []
    state.total = 0
    state.status = 'error'
  } finally {
    controller = null
  }
}

/** Type-ahead. Debounced, cancels the previous request. */
function setQuery(text) {
  state.query = text
  cancelInFlight()

  if (!text.trim()) {
    state.status = 'idle'
    state.results = []
    state.total = 0
    return
  }

  timer = setTimeout(() => {
    timer = null
    run(text)
  }, DEBOUNCE_MS)
}

/** Explicit submit — skips the debounce and records the query. */
function submit(text = state.query) {
  const trimmed = text.trim()
  if (!trimmed) return
  state.query = trimmed
  cancelInFlight()
  persistRecent(trimmed)
  return run(trimmed)
}

function clear() {
  cancelInFlight()
  state.query = ''
  state.status = 'idle'
  state.results = []
  state.total = 0
  state.error = null
}

export function useSearch() {
  return {
    state: readonly(state),
    hasQuery: computed(() => state.query.trim().length > 0),
    isOpen: computed(() => state.status !== 'idle' && state.query.trim().length > 0),
    setQuery,
    submit,
    clear,
  }
}

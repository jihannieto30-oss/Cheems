import { SEARCHABLE } from '../data'

/*
  Search provider contract
  ------------------------

      provider.id                       string, shown in the status line
      provider.query(text, options)     → Promise<{ results, took, total }>

      options = { signal, limit }
      results = Array<{ record, score }>

  Everything above this file — useSearch, SearchField, SearchResults — talks
  only to this contract. Pointing the UI at a real backend, a vector index or
  an LLM is a matter of returning the same shape from a different function.
*/

/** Fold a query into comparable tokens. "ER 70S-6" and "er70s6" must meet. */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9./\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Aggressive form used for fuzzy identity: strips separators entirely. */
function condense(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function scoreRecord(entry, tokens, condensedQuery) {
  let score = 0

  // Whole-query identity on the title is the strongest possible signal:
  // "er70s-6", "ER 70S 6" and "er70s6" all land here.
  const condensedTitle = condense(entry.record.title)
  if (condensedTitle === condensedQuery) score += 220
  else if (condensedTitle.startsWith(condensedQuery) && condensedQuery.length >= 3) score += 120

  for (const token of tokens) {
    if (token.length < 2) continue

    if (entry.titleLower === token) score += 100
    else if (entry.titleLower.startsWith(token)) score += 55
    else if (entry.titleLower.includes(token)) score += 32

    if (entry.tagSet.has(token)) score += 40
    else if (condense(entry.record.title).includes(condense(token))) score += 18

    if (entry.haystack.includes(token)) score += 10
  }

  // Reward covering more of the query rather than matching one token loudly.
  const covered = tokens.filter((t) => t.length >= 2 && entry.haystack.includes(t)).length
  if (tokens.length > 1) score += (covered / tokens.length) * 45

  return score
}

/**
 * In-memory provider over the seed corpus.
 * Synchronous work wrapped in a promise so callers never depend on timing.
 */
export function createLocalProvider({ corpus = SEARCHABLE } = {}) {
  return {
    id: 'local',
    async query(text, { limit = 8, signal } = {}) {
      const started = performance.now()
      const trimmed = text.trim()
      if (!trimmed) return { results: [], took: 0, total: 0 }

      const tokens = tokenise(trimmed)
      const condensedQuery = condense(trimmed)

      const scored = []
      for (const entry of corpus) {
        const score = scoreRecord(entry, tokens, condensedQuery)
        if (score > 20) scored.push({ record: entry.record, score })
      }

      scored.sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))

      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      return {
        results: scored.slice(0, limit),
        total: scored.length,
        took: performance.now() - started,
      }
    },
  }
}

/**
 * Remote provider. Not wired to anything yet — it is here so that the day an
 * endpoint exists, the only change is an env var.
 *
 * Expected response: { results: [{ record, score }], total }
 */
export function createHttpProvider({ endpoint, headers = {}, id = 'remote' } = {}) {
  return {
    id,
    async query(text, { limit = 8, signal } = {}) {
      const started = performance.now()
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set('q', text)
      url.searchParams.set('limit', String(limit))

      const response = await fetch(url, {
        signal,
        headers: { Accept: 'application/json', ...headers },
      })
      if (!response.ok) throw new Error(`Search failed: ${response.status}`)

      const payload = await response.json()
      return {
        results: payload.results ?? [],
        total: payload.total ?? payload.results?.length ?? 0,
        took: performance.now() - started,
      }
    },
  }
}

/**
 * Falls back to the local corpus when no endpoint is configured, so the UI is
 * fully exercisable with zero backend.
 */
export function resolveProvider() {
  const endpoint = import.meta.env?.VITE_OWS_SEARCH_ENDPOINT
  return endpoint ? createHttpProvider({ endpoint }) : createLocalProvider()
}

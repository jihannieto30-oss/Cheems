import { KNOWLEDGE } from './knowledge'
import { getDetail } from './details'
import { SOLUTIONS } from './solutions'
import { TAXONOMY } from './taxonomy'

/*
  Single entry point for reading the corpus. Pages go through here so the
  split between the search surface (knowledge.js) and the technical sheet
  (details.js) stays an implementation detail.
*/

const BY_ID = new Map(KNOWLEDGE.map((r) => [r.id, r]))
const SOLUTION_BY_ID = new Map(SOLUTIONS.map((s) => [s.id, s]))

/** A record with its detail sheet and, for defects, its diagnostic chain. */
export function getRecord(id) {
  const record = BY_ID.get(id)
  if (!record) return null
  return {
    ...record,
    detail: getDetail(id),
    solution: SOLUTION_BY_ID.get(id) ?? null,
  }
}

export function hasRecord(id) {
  return BY_ID.has(id)
}

/** Same taxonomy root, excluding the record itself. */
export function relatedTo(record, limit = 5) {
  return KNOWLEDGE.filter((r) => r.id !== record.id && r.category === record.category).slice(
    0,
    limit,
  )
}

/*
  Browse facets — the menu's top level. Each maps onto the corpus by a
  predicate rather than a duplicated list, so adding a record surfaces it here
  automatically.
*/
export const FACETS = [
  {
    slug: 'materials',
    label: 'Materials',
    blurb: 'Base metals, filler metals, electrodes and the specifications that bind them.',
    match: (r) => r.category === 'materials',
  },
  {
    slug: 'processes',
    label: 'Processes',
    blurb: 'Arc processes, transfer modes and the parameter windows that govern them.',
    match: (r) => r.category === 'processes',
  },
  {
    slug: 'standards',
    label: 'Standards',
    blurb: 'Codes, procedure documentation and welding symbols.',
    match: (r) => r.category === 'standards',
  },
  {
    slug: 'documents',
    label: 'Documents',
    blurb: 'Data sheets and certificates attached to catalogue records.',
    match: (r) => Boolean(getDetail(r.id)?.documents?.length),
  },
  {
    slug: 'guides',
    label: 'Guides',
    blurb: 'Defect diagnosis, metallurgy and inspection method selection.',
    match: (r) => ['problems', 'metallurgy', 'inspection'].includes(r.category),
  },
]

export function facetBySlug(slug) {
  return FACETS.find((f) => f.slug === slug) ?? null
}

export function recordsInFacet(slug) {
  const facet = facetBySlug(slug)
  return facet ? KNOWLEDGE.filter(facet.match) : []
}

/** Result-page tabs. `all` is not a filter, it is the absence of one. */
export const RESULT_TABS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'materials', label: 'Materials', match: (r) => r.category === 'materials' },
  { id: 'processes', label: 'Processes', match: (r) => r.category === 'processes' },
  { id: 'docs', label: 'Docs', match: (r) => r.category === 'standards' },
]

export { KNOWLEDGE, SOLUTIONS, TAXONOMY }

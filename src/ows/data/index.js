import { KNOWLEDGE } from './knowledge'
import { getDetail } from './details'
import { SOLUTIONS } from './solutions'
import { TAXONOMY } from './taxonomy'
import { CATALOG, SECTIONS, FORMS } from './catalog'

/*
  Single entry point for reading the corpus. Pages go through here so the
  split between the search surface (knowledge.js) and the technical sheet
  (details.js) stays an implementation detail.
*/

/*
  The catalogue is part of the search corpus, not a separate island: typing a
  designation has to find it whether or not a full sheet exists yet.

  Records already written by hand in knowledge.js win — a catalogue row would
  otherwise shadow the richer entry with the same designation.
*/
const SECTION_LABEL = new Map(SECTIONS.map((s) => [s.slug, s.en]))
const KNOWN_TITLES = new Set(KNOWLEDGE.map((r) => r.title.toUpperCase()))

const KIND_FOR = (item) => {
  if (item.section === 'brazing') return 'BRAZING ALLOY'
  return item.forms.includes('E') && !item.forms.includes('W') ? 'ELECTRODE' : 'FILLER METAL'
}

// Catalogue rows map onto the same record shape the search UI already renders.
const CATALOG_RECORDS = CATALOG.filter((c) => !KNOWN_TITLES.has(c.designation.toUpperCase())).map(
  (item) => {
    const forms = item.forms.map((f) => FORMS[f].en)
    return {
      id: item.id,
      title: item.designation,
      kind: KIND_FOR(item),
      category: 'materials',
      path: ['CATALOGUE', (SECTION_LABEL.get(item.section) ?? '').toUpperCase(), forms.join(' · ').toUpperCase()],
      spec: item.spec,
      summary: item.note,
      facets: [
        { k: 'PROCESS', v: item.process },
        { k: 'FORM', v: forms.join(' · ') },
        { k: 'SPEC', v: item.spec },
        { k: 'SHEET', v: item.sheet ? 'Published' : 'Pending' },
      ],
      tags: [
        item.section.replace('-', ' '),
        item.process.toLowerCase(),
        item.spec.toLowerCase(),
        ...forms.map((f) => f.toLowerCase()),
        'catalogue',
      ],
      catalogue: item,
    }
  },
)

/** Everything the search engine can return. */
export const ALL_RECORDS = [...KNOWLEDGE, ...CATALOG_RECORDS]

/** Pre-flattened match surface, built once at module load. */
export const SEARCHABLE = ALL_RECORDS.map((record) => ({
  record,
  haystack: [
    record.title,
    record.kind,
    record.spec ?? '',
    record.summary,
    record.path.join(' '),
    record.tags.join(' '),
    record.facets.map((f) => `${f.k} ${f.v}`).join(' '),
  ]
    .join(' ')
    .toLowerCase(),
  titleLower: record.title.toLowerCase(),
  tagSet: new Set(record.tags.map((t) => t.toLowerCase())),
}))

const BY_ID = new Map(ALL_RECORDS.map((r) => [r.id, r]))
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
  // Prefer a catalogue sibling from the same section, then fall back to the
  // taxonomy category, so a filler metal relates to its own alloy family
  // rather than to whatever else happens to be filed under MATERIALS.
  const section = record.catalogue?.section
  const pool = section
    ? ALL_RECORDS.filter((r) => r.catalogue?.section === section)
    : ALL_RECORDS.filter((r) => r.category === record.category && !r.catalogue)
  return pool.filter((r) => r.id !== record.id).slice(0, limit)
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

/*
  Result grouping.

  A flat ranked list is the wrong shape for this corpus: a query like "316L"
  legitimately returns a consumable, a base metal, a HAZ article and a defect,
  and they answer different questions. Grouping lets the reader jump straight
  to the kind of answer they came for. Order is deliberate — what you can buy
  first, then how to run it, then what goes wrong.
*/
const CONSUMABLE_KINDS = new Set(['FILLER METAL', 'ELECTRODE', 'BRAZING ALLOY'])

export const RESULT_GROUPS = [
  {
    id: 'consumables',
    label: 'Filler metals & consumables',
    note: 'Wire, rod and covered electrode',
    match: (r) => CONSUMABLE_KINDS.has(r.kind),
  },
  {
    id: 'processes',
    label: 'Processes & parameters',
    note: 'Arc processes and their operating windows',
    match: (r) => r.category === 'processes',
  },
  {
    id: 'selection',
    label: 'Materials & selection',
    note: 'Base metals and grade comparisons',
    match: (r) => r.category === 'materials' && !CONSUMABLE_KINDS.has(r.kind),
  },
  {
    id: 'diagnosis',
    label: 'Defects & metallurgy',
    note: 'Cause, diagnosis and resolution',
    match: (r) => ['problems', 'metallurgy'].includes(r.category),
  },
  {
    id: 'inspection',
    label: 'Inspection',
    note: 'Method selection and acceptance',
    match: (r) => r.category === 'inspection',
  },
  {
    id: 'standards',
    label: 'Standards & documentation',
    note: 'Codes, procedures and symbols',
    match: (r) => r.category === 'standards',
  },
]

/**
 * Bucket ranked hits into the groups above, preserving score order inside each
 * and dropping empties. Every hit lands in exactly one group — the first that
 * claims it — so nothing is shown twice and nothing disappears.
 */
export function groupResults(hits) {
  const seen = new Set()
  return RESULT_GROUPS.map((group) => {
    const items = hits.filter((hit) => {
      if (seen.has(hit.record.id) || !group.match(hit.record)) return false
      seen.add(hit.record.id)
      return true
    })
    return { ...group, items }
  }).filter((group) => group.items.length > 0)
}

export { KNOWLEDGE, SOLUTIONS, TAXONOMY }

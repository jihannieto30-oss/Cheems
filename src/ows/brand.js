/*
  Brand identity, in one place.

  Every name, claim and contact detail the interface renders comes from here.
  Nothing else in the app hard-codes the company name, so changing the brand is
  this file and nothing else.

  · code       the mark itself — nav, footer, breadcrumbs, page titles
  · name       the name set in sentence case, for running prose
  · descriptor the line that says what this is, used beside the name

  The internal namespace is deliberately left alone: the source still lives in
  src/ows, the CSS custom properties are still --ows-*, and the mark component
  is still OwsMark. None of that is visible to a reader, and renaming one of
  the three while leaving the others would be worse than renaming none.
*/
export const BRAND = {
  code: 'UNIBRAZE',
  name: 'Unibraze',
  descriptor: 'Metales de aporte y soldaduras especiales',

  // Voice. These are the only sentences the brand repeats.
  welcome: 'WELCOME TO UNIBRAZE',
  creed: 'KNOWLEDGE IS POWER',
  promise: 'BUILT TO JOIN. BUILT TO LAST.',
  claim: 'CONOCIMIENTO QUE UNE. SOLUCIONES QUE PERDURAN.',

  /*
    Contact block. These are placeholders — no real address, line or inbox has
    been supplied for this build, and inventing one that looks real would be
    worse than leaving it obviously unset. Fill them in and the contact page
    picks them up; leave one empty and its row is not rendered at all.
  */
  contact: {
    email: '',
    phone: '',
    address: '',
    hours: 'LUN – VIE · 08:00 – 18:00',
    /*
      Where the contact form posts. With no endpoint the form still validates
      and composes the message, then tells the visitor plainly that submission
      is not connected rather than pretending it sent.
    */
    endpoint: null,
  },

  /*
    Invitation gate.

    `codeHash` is the hash of the code that opens the site, not the code — so
    the digits are not sitting in the bundle for anyone who opens the file in a
    text editor. That is the whole of what it buys.

    This is a doorman, not a lock. The check runs in the browser, on the
    reader's own machine, over content the browser has already downloaded.
    Anyone who opens devtools can step past it in under a minute, and there is
    no client-side design that changes that. It is here to keep the site closed
    to people who were not invited, not to withstand someone determined to get
    in. Real access control needs the server to refuse to send the page.
  */
  gate: {
    enabled: true,
    codeHash: '668cc377',
    // How long an accepted code is remembered, in days.
    remember: 60,
  },
}

/*
  External destinations.

  A query typed into the hero can lead off this site. Nothing is listed here
  because no destination URLs have been supplied — and inventing them would
  send people to addresses that do not exist. Until this table has entries,
  every search resolves to the internal index, which is the behaviour that
  already works.

  Each entry is { match, url, label }. `match` is compared against the folded,
  lowercased query: a string matches on inclusion, a RegExp on test.

    { match: 'catalogo', url: 'https://…', label: 'Catálogo Unibraze' }
*/
export const DESTINATIONS = []

/** The external destination a query resolves to, or null for the index. */
export function resolveDestination(query) {
  const q = String(query ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  if (!q) return null
  return (
    DESTINATIONS.find((d) =>
      d.match instanceof RegExp ? d.match.test(q) : q.includes(String(d.match).toLowerCase()),
    ) ?? null
  )
}

/** `TÍTULO — UNIBRAZE`, or the brand line when a page has no title of its own. */
export function pageTitle(title) {
  return title ? `${title} — ${BRAND.code}` : `${BRAND.code} — ${BRAND.descriptor}`
}

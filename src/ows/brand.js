/*
  Brand identity, in one place.

  Every name, claim and contact detail the interface renders comes from here.
  Nothing else in the app hard-codes the company name, so changing the brand —
  including swapping OWS for UNIBRAZE — is this file and nothing else.

  · code  is the short mark used in the nav, the footer and page titles
  · name  is the full legal-ish name used once, where it is introduced
*/
export const BRAND = {
  code: 'OWS',
  name: 'Online Welding Supply',

  // Voice. These are the only sentences the brand repeats.
  welcome: 'WELCOME TO A NEW WORLD',
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
}

/** `TITLE — OWS`, or the bare brand line when a page has no title of its own. */
export function pageTitle(title) {
  return title ? `${title} — ${BRAND.code}` : `${BRAND.code} — ${BRAND.name}`
}

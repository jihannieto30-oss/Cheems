import { BRAND } from './brand'

/*
  The invitation gate.

  What this is: a doorman. It keeps the site closed to people who were not
  given the code, and it remembers someone who has already been let in.

  What it is not: access control. The check runs in the reader's own browser,
  against content their browser has already downloaded, using a hash that is
  shipped alongside it. Anyone who opens devtools can step past it, and no
  amount of cleverness on this side of the wire changes that — the page has
  already been sent by the time this code runs. Content that genuinely must
  not be read by the uninvited has to be withheld by the server.

  The hash is here for one narrow reason: so the digits are not sitting in the
  bundle in plain text for anyone who opens the file in an editor and searches
  for something that looks like a code.
*/

const SALT = 'unibraze/2026/invitacion'
const STORAGE_KEY = 'unibraze.invite'

/**
 * FNV-1a, 32-bit, salted. Not a cryptographic hash and not pretending to be —
 * it is doing obfuscation, and a cryptographic one would need WebCrypto, which
 * is unavailable on file:// because that is not a secure context. The
 * single-file build has to keep working.
 */
function hash(value) {
  let h = 0x811c9dc5
  const s = SALT + value
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Spaces and dashes are how people write a code down; neither should matter. */
const normalise = (value) => String(value ?? '').replace(/[\s-]/g, '')

export function verify(code) {
  const clean = normalise(code)
  if (!clean) return false
  return hash(clean) === BRAND.gate.codeHash
}

/*
  localStorage is wrapped because it throws rather than returning null in
  private-mode Safari and under some file:// origins — and a gate that throws
  on load locks everyone out, including the people holding a valid code.
*/
function read() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function write(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
    return true
  } catch {
    return false
  }
}

/** True when this browser has already been let in and the pass has not expired. */
export function isUnlocked() {
  if (!BRAND.gate.enabled) return true
  const stored = read()
  if (!stored) return false

  const [token, expires] = stored.split('|')
  if (token !== BRAND.gate.codeHash) return false
  // A pass with no expiry, or one that has passed it, is not a pass.
  return Number(expires) > Date.now()
}

/**
 * Records that this browser was let in.
 * Returns false when storage is unavailable — the session still proceeds, the
 * reader will just be asked again next visit.
 */
export function unlock() {
  const expires = Date.now() + BRAND.gate.remember * 24 * 60 * 60 * 1000
  return write(`${BRAND.gate.codeHash}|${expires}`)
}

export function lock() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage was never available.
  }
}

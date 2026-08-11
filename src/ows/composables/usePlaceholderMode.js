import { ref, watch } from 'vue'

/*
  Two placeholder treatments were requested for comparison, so the choice is a
  runtime setting rather than a code edit:

      /unibraze/?placeholder=reveal      pin a mode for this visit and remember it
      menu → PLACEHOLDER            switch it live

  Default is `quiet`: one discreet word, always present.
*/

const KEY = 'ows:placeholder'
const MODES = ['quiet', 'reveal']

function initial() {
  const fromUrl = new URLSearchParams(window.location.search).get('placeholder')
  if (MODES.includes(fromUrl)) return fromUrl
  try {
    const stored = localStorage.getItem(KEY)
    if (MODES.includes(stored)) return stored
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return 'quiet'
}

const mode = ref(initial())

watch(mode, (next) => {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* non-fatal */
  }
})

export function usePlaceholderMode() {
  return {
    mode,
    set: (next) => {
      if (MODES.includes(next)) mode.value = next
    },
    MODES,
  }
}

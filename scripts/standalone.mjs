/*
  Bundles a site into one portable HTML file.

      node scripts/standalone.mjs                 # → both
      node scripts/standalone.mjs fichas          # → fichas.html

  Everything is inlined — styles, the whole app as a single module, and the
  artwork as data URIs — so the result opens from disk, an email attachment or
  any static host with no server, no build step and no network access.

  Both sites are handled by the same script because both are built the same
  way: one entry, no dynamic imports, and a router that falls back to hash mode
  on a file:// origin. Everything that differs between them is the base name.

  These are distribution artefacts, not the source of truth. The apps live in
  src/ows/ and src/fichas/; regenerate these files rather than editing them.
*/

import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/*
  Which sites can be bundled. `mark` is the file used as the favicon; both sites
  carry the same one, and both read their typeface out of public/unibraze.
*/
const SITES = {
  unibraze: { base: 'unibraze', mark: '/unibraze/mark.svg' },
  fichas: { base: 'fichas', mark: '/unibraze/mark.svg' },
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const targets = wanted.length ? wanted : Object.keys(SITES)
for (const name of targets) {
  if (!SITES[name]) throw new Error(`unknown site "${name}" — try: ${Object.keys(SITES).join(', ')}`)
}

// ---- assets → data URIs --------------------------------------------------
// Artwork and the self-hosted typeface both live under public/unibraze and are
// referenced by absolute path, which resolves to nothing from a file:// page.
const art = new Map()

for (const file of readdirSync(resolve(ROOT, 'public/unibraze'))) {
  if (!file.endsWith('.svg')) continue
  const svg = readFileSync(resolve(ROOT, 'public/unibraze', file))
  art.set(`/unibraze/${file}`, `data:image/svg+xml;base64,${svg.toString('base64')}`)
}

for (const file of readdirSync(resolve(ROOT, 'public/unibraze/fonts'))) {
  if (!file.endsWith('.woff2')) continue
  const font = readFileSync(resolve(ROOT, 'public/unibraze/fonts', file))
  art.set(`/unibraze/fonts/${file}`, `data:font/woff2;base64,${font.toString('base64')}`)
}

const inlineArt = (text) => {
  let out = text
  for (const [path, uri] of art) out = out.split(path).join(uri)
  return out
}

async function bundle(site) {
// ---- build the entry as a single chunk ------------------------------------
// One entry and no dynamic imports in the app, so Rollup emits a single module
// with no `import` statements — the only form that runs from a file:// page.
// The assertion below is the guard: if a lazy route ever creeps back in, this
// build fails loudly instead of shipping a file with unresolvable imports.
const result = await build({
  configFile: false,
  root: ROOT,
  logLevel: 'warn',
  plugins: [vue()],
  build: {
    write: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(ROOT, `${site.base}/index.html`),
    },
  },
})

const outputs = (Array.isArray(result) ? result[0] : result).output
const html = outputs.find((o) => o.fileName.endsWith('.html'))
const js = outputs.filter((o) => o.type === 'chunk')
const css = outputs.filter((o) => o.fileName.endsWith('.css'))

if (!html) throw new Error('no HTML output produced')
if (js.length !== 1) throw new Error(`expected exactly 1 JS chunk, got ${js.length}`)

// A literal </script> inside the module would close the tag early.
const code = inlineArt(js[0].code).replace(/<\/script/gi, '<\\/script')
const styles = inlineArt(css.map((c) => c.source).join('\n'))

/*
  Every insertion below passes a FUNCTION as the replacement, never a string.
  A string replacement runs $-substitution: `$&`, `$'` and "$`" are directives,
  and the Vue runtime contains those byte sequences. Inlining it as a string
  silently rewrites parts of the bundle into copies of the surrounding HTML and
  produces a file that parses as broken JavaScript.
*/
const page = html.source
  // drop the emitted references; the inlined content replaces them
  .replace(/\s*<script[^>]*type="module"[^>]*><\/script>/g, '')
  .replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, '')
  // the font preload points at a path that will not exist in this build
  .replace(/\s*<link[^>]*rel="preload"[^>]*>/g, '')
  .replace(
    /<link rel="icon"[^>]*>/,
    () => `<link rel="icon" type="image/svg+xml" href="${art.get(site.mark)}" />`,
  )
  .replace('</head>', () => `  <style>\n${styles}\n  </style>\n  </head>`)
  .replace('</body>', () => `  <script type="module">\n${code}\n  </script>\n  </body>`)

  const out = resolve(ROOT, `${site.base}.html`)
  writeFileSync(out, page)
  console.log(`${site.base}.html  ${(page.length / 1024).toFixed(0)} kB`)
  console.log(
    `  styles ${(styles.length / 1024).toFixed(0)} kB · script ${(code.length / 1024).toFixed(0)} kB · art ${art.size} files inlined`,
  )
}

for (const name of targets) await bundle(SITES[name])

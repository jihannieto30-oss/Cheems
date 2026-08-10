/*
  Bundles Online Welding Supply into one portable HTML file.

      node scripts/ows-standalone.mjs        # → onlineweldingsupply.html

  Everything is inlined — styles, the whole app as a single module, and the
  artwork as data URIs — so the result opens from disk, an email attachment or
  any static host with no server, no build step and no network access.

  This is a distribution artefact, not the source of truth. The app lives in
  src/ows/; regenerate this file rather than editing it.
*/

import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'onlineweldingsupply.html')

// ---- assets → data URIs --------------------------------------------------
// Artwork and the self-hosted typeface both live under public/ows and are
// referenced by absolute path, which resolves to nothing from a file:// page.
const art = new Map()

for (const file of readdirSync(resolve(ROOT, 'public/ows'))) {
  if (!file.endsWith('.svg')) continue
  const svg = readFileSync(resolve(ROOT, 'public/ows', file))
  art.set(`/ows/${file}`, `data:image/svg+xml;base64,${svg.toString('base64')}`)
}

for (const file of readdirSync(resolve(ROOT, 'public/ows/fonts'))) {
  if (!file.endsWith('.woff2')) continue
  const font = readFileSync(resolve(ROOT, 'public/ows/fonts', file))
  art.set(`/ows/fonts/${file}`, `data:font/woff2;base64,${font.toString('base64')}`)
}

const inlineArt = (text) => {
  let out = text
  for (const [path, uri] of art) out = out.split(path).join(uri)
  return out
}

// ---- build the ows entry as a single chunk -------------------------------
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
      input: resolve(ROOT, 'ows/index.html'),
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
    () => `<link rel="icon" type="image/svg+xml" href="${art.get('/ows/mark.svg')}" />`,
  )
  .replace('</head>', () => `  <style>\n${styles}\n  </style>\n  </head>`)
  .replace('</body>', () => `  <script type="module">\n${code}\n  </script>\n  </body>`)

writeFileSync(OUT, page)
console.log(`onlineweldingsupply.html  ${(page.length / 1024).toFixed(0)} kB`)
console.log(`  styles ${(styles.length / 1024).toFixed(0)} kB · script ${(code.length / 1024).toFixed(0)} kB · art ${art.size} files inlined`)

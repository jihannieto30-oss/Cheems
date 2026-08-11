import { fileURLToPath } from 'node:url'
import { extname } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const entry = (path) => fileURLToPath(new URL(path, import.meta.url))

/*
  Vite's SPA fallback serves the ROOT index.html for any unmatched path. In a
  multi-page build that silently hands /unibraze/search to the Cheems app instead of
  to Unibraze — a 200 with entirely the wrong page.

  This rewrites extension-less requests under /unibraze/ to the Unibraze shell, for both
  the dev and preview servers, and emits dist/unibraze/404.html so static hosts that
  honour a per-directory 404 behave the same way.

  Deploying elsewhere needs the equivalent one-line rule, e.g.
      Netlify   /unibraze/*  /unibraze/index.html  200
      nginx     location /unibraze/ { try_files $uri $uri/ /unibraze/index.html; }
*/
function unibrazeSpaFallback() {
  const middleware = (req, _res, next) => {
    const url = (req.url ?? '').split('?')[0]
    if (url === '/unibraze') {
      req.url = '/unibraze/'
    } else if (url.startsWith('/unibraze/') && !extname(url)) {
      req.url = '/unibraze/index.html'
    }
    next()
  }

  return {
    name: 'unibraze-spa-fallback',
    // Registered directly, not from a returned callback, so it runs before
    // Vite's own static and fallback middlewares get a chance to answer.
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      const shell = `${dir}/unibraze/index.html`
      if (existsSync(shell)) writeFileSync(`${dir}/unibraze/404.html`, readFileSync(shell))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), unibrazeSpaFallback()],
  build: {
    rollupOptions: {
      input: {
        // Cheems — existing app, served at /
        main: entry('./index.html'),
        // Unibraze — served at /unibraze/
        unibraze: entry('./unibraze/index.html'),
      },
    },
  },
})

import { fileURLToPath } from 'node:url'
import { extname } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const entry = (path) => fileURLToPath(new URL(path, import.meta.url))

/*
  Vite's SPA fallback serves the ROOT index.html for any unmatched path. In a
  multi-page build that silently hands /ows/search to the Cheems app instead of
  to OWS — a 200 with entirely the wrong page.

  This rewrites extension-less requests under /ows/ to the OWS shell, for both
  the dev and preview servers, and emits dist/ows/404.html so static hosts that
  honour a per-directory 404 behave the same way.

  Deploying elsewhere needs the equivalent one-line rule, e.g.
      Netlify   /ows/*  /ows/index.html  200
      nginx     location /ows/ { try_files $uri $uri/ /ows/index.html; }
*/
function owsSpaFallback() {
  const middleware = (req, _res, next) => {
    const url = (req.url ?? '').split('?')[0]
    if (url === '/ows') {
      req.url = '/ows/'
    } else if (url.startsWith('/ows/') && !extname(url)) {
      req.url = '/ows/index.html'
    }
    next()
  }

  return {
    name: 'ows-spa-fallback',
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
      const shell = `${dir}/ows/index.html`
      if (existsSync(shell)) writeFileSync(`${dir}/ows/404.html`, readFileSync(shell))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), owsSpaFallback()],
  build: {
    rollupOptions: {
      input: {
        // Cheems — existing app, served at /
        main: entry('./index.html'),
        // OWS — Online Welding Supply, served at /ows/
        ows: entry('./ows/index.html'),
      },
    },
  },
})

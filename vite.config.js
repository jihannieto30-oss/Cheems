import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const entry = (path) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        // Cheems — existing app, served at /
        main: entry('./index.html'),
        // Online Welding Supply — served at /ows/
        ows: entry('./ows/index.html'),
      },
    },
  },
})

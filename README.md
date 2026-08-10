# Cheems

Vue 3 + Vite. The repository builds two independent apps from one toolchain:

| Route   | App                       | Entry              |
| ------- | ------------------------- | ------------------ |
| `/`     | Cheems — comercio exterior y bolsa de valores | `index.html` → `src/main.js` |
| `/ows/` | Online Welding Supply — technical knowledge index | `ows/index.html` → `src/ows/main.js` |

Both entries are declared in `vite.config.js`. They share no code and no
styles; see [`src/ows/README.md`](src/ows/README.md) for the second app's
architecture.

```sh
npm install
npm run dev      # both apps, / and /ows/
npm run build
npm run art      # regenerate public/ows/*.svg artwork
```

---

## Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

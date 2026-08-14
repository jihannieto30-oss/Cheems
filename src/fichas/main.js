import { createApp } from 'vue'
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { routes } from './routes'
import './styles/base.css'

/*
  Fichas técnicas — a separate site from the Unibraze one next door.

  Separate on purpose: this is the document library, not the front of the
  house. Different base, different entry, different palette, and the only thing
  the two share is the catalogue data and the mark.

  History mode over HTTP, hash mode from a file. A router that pushes clean
  paths onto a file:// origin navigates to a path that does not exist, so the
  same build has to answer both.
*/
const fromFile = window.location.protocol === 'file:'

const router = createRouter({
  history: fromFile ? createWebHashHistory() : createWebHistory('/fichas/'),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
})

createApp(App).use(router).mount('#app')

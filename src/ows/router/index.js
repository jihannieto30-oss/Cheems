import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import HomePage from '../pages/HomePage.vue'
import SearchPage from '../pages/SearchPage.vue'
import RecordPage from '../pages/RecordPage.vue'
import BrowsePage from '../pages/BrowsePage.vue'
import CatalogPage from '../pages/CatalogPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import NotFoundPage from '../pages/NotFoundPage.vue'

/*
  Every view is its own URL — nothing is a scroll position on the home page.

      /                     home
      /catalog              product catalogue by section
      /search?q=…           results
      /record/:id           technical record
      /browse/:facet        materials · processes · standards · documents · guides
      /about                about

  History mode when served over HTTP so the URLs are clean; hash mode when the
  page is opened straight from disk, where the History API cannot work. The
  single-file build depends on that fallback.

  Routes are imported eagerly on purpose. Lazy routes deadlock against the
  <Transition mode="out-in"> in OwsApp: the outgoing page leaves, the incoming
  one is still an unresolved async component, and the view renders empty with
  no error — every client-side navigation lands on a blank page. The whole app
  is ~30 kB gzipped, so splitting seven routes bought nothing worth that.
*/

const routes = [
  { path: '/', name: 'home', component: HomePage, meta: { scene: true } },
  { path: '/search', name: 'search', component: SearchPage, meta: { title: 'Search' } },
  { path: '/record/:id', name: 'record', component: RecordPage },
  { path: '/catalog', name: 'catalog', component: CatalogPage, meta: { title: 'Catalogue' } },
  { path: '/browse/:facet', name: 'browse', component: BrowsePage },
  { path: '/about', name: 'about', component: AboutPage, meta: { title: 'About' } },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: { title: 'Not found' },
  },
]

const fromDisk = typeof window !== 'undefined' && window.location.protocol === 'file:'

export const router = createRouter({
  history: fromDisk ? createWebHashHistory() : createWebHistory('/ows/'),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = to.meta.title ?? to.params.id?.toString().toUpperCase()
  document.title = title ? `${title} — OWS` : 'OWS — Online Welding Supply'
})

export default router

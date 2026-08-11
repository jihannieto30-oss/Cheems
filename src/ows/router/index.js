import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import { PAGES } from '../data/site'
import { pageTitle } from '../brand'

import HomePage from '../pages/HomePage.vue'
import SearchPage from '../pages/SearchPage.vue'
import ProductPage from '../pages/ProductPage.vue'
import ProductsPage from '../pages/ProductsPage.vue'
import BrowsePage from '../pages/BrowsePage.vue'
import TechnologyPage from '../pages/TechnologyPage.vue'
import WeldingPage from '../pages/WeldingPage.vue'
import CompanyPage from '../pages/CompanyPage.vue'
import ContactPage from '../pages/ContactPage.vue'
import NotFoundPage from '../pages/NotFoundPage.vue'

/*
  Every view is its own URL — nothing is a scroll position on the home page.

      /                     home, the narrative spine
      /productos            the catalogue, by form and by section
      /producto/:id         one designation, in full
      /tecnologia           how the material is specified and controlled
      /soldadura            the processes, and choosing between them
      /empresa              the company
      /contacto             contact
      /search?q=…           results
      /browse/:facet        materials · processes · standards · documents · guides

  Paths and labels come from data/site.js so the router and the navigation can
  never disagree about where a page lives.

  History mode when served over HTTP so the URLs are clean; hash mode when the
  page is opened straight from disk, where the History API cannot work. The
  single-file build depends on that fallback.

  Routes are imported eagerly on purpose. Lazy routes deadlock against the
  route <Transition> in OwsApp: the outgoing page leaves, the incoming one is
  still an unresolved async component, and the view renders empty with no
  error — every client-side navigation lands on a blank page.
*/

const page = (key, component, extra = {}) => ({
  path: PAGES[key].to,
  name: key,
  component,
  meta: { title: PAGES[key].title, ...extra },
})

const routes = [
  page('home', HomePage, { scene: true, title: null }),
  page('search', SearchPage),
  page('products', ProductsPage),
  page('technology', TechnologyPage),
  page('welding', WeldingPage),
  page('company', CompanyPage),
  page('contact', ContactPage),

  { path: '/producto/:id', name: 'product', component: ProductPage },
  { path: '/browse/:facet', name: 'browse', component: BrowsePage },

  /*
    The English paths this site shipped with. They are kept as redirects rather
    than deleted: a link that worked yesterday should not 404 today, and the
    single-file build has been handed out with those URLs inside it.
  */
  { path: '/catalog', redirect: { name: 'products' } },
  { path: '/record/:id', redirect: (to) => ({ name: 'product', params: to.params }) },
  { path: '/about', redirect: { name: 'company' } },

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: { title: 'No encontrado' },
  },
]

const fromDisk = typeof window !== 'undefined' && window.location.protocol === 'file:'

export const router = createRouter({
  history: fromDisk ? createWebHashHistory() : createWebHistory('/unibraze/'),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = pageTitle(to.meta.title ?? to.params.id?.toString().toUpperCase())
})

export default router

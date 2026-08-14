import CataloguePage from './pages/CataloguePage.vue'
import SheetPage from './pages/SheetPage.vue'
import MissingPage from './pages/MissingPage.vue'

/*
  Three routes and no more. The catalogue, optionally narrowed to one family;
  a sheet; and the page that says a designation is not here. Eagerly imported
  rather than lazy — this site is small, and a lazy route behind a transition
  is a blank frame.
*/
export const routes = [
  { path: '/', name: 'catalogue', component: CataloguePage },
  { path: '/familia/:slug', name: 'family', component: CataloguePage, props: true },
  { path: '/ficha/:id', name: 'sheet', component: SheetPage, props: true },
  { path: '/:pathMatch(.*)*', name: 'missing', component: MissingPage },
]

import { FACETS } from './index'

/*
  The site map, declared once.

  The router, the top nav, the menu overlay and the footer all read this file,
  so a page exists in exactly one place: add an entry here and wire its route,
  and it appears in navigation everywhere it belongs. Nothing keeps its own
  private copy of the link list.

  Labels are Spanish because that is the market this reads to, and because the
  brief names the sections that way. Technical designations — AWS classes,
  process codes, element symbols — are never translated.
*/

export const PAGES = {
  home: { label: 'Inicio', to: '/', title: null },
  products: { label: 'Productos', to: '/productos', title: 'Productos' },
  technology: { label: 'Tecnología', to: '/tecnologia', title: 'Tecnología' },
  welding: { label: 'Soldadura', to: '/soldadura', title: 'Soldadura' },
  company: { label: 'Empresa', to: '/empresa', title: 'Empresa' },
  contact: { label: 'Contacto', to: '/contacto', title: 'Contacto' },
  search: { label: 'Buscar', to: '/search', title: 'Búsqueda' },
}

/*
  The two links that sit in the top bar beside the mark.

  Two is the limit on purpose. The bar is a permanent frame around every page,
  and a frame with six links in it stops reading as a frame — everything else
  lives behind the menu, where it can be given room.
*/
export const PRIMARY = [PAGES.search, PAGES.products]

/** The full index, as the menu overlay presents it: grouped, in reading order. */
export const MENU = [
  {
    title: 'Catálogo',
    items: [PAGES.products, ...FACETS.map((f) => ({ label: f.label, to: `/browse/${f.slug}` }))],
  },
  {
    title: 'Conocimiento',
    items: [PAGES.technology, PAGES.welding],
  },
  {
    title: 'Casa',
    items: [PAGES.company, PAGES.contact],
  },
]

/** Footer columns. Same destinations, arranged for a footer rather than a menu. */
export const FOOTER = [
  {
    title: 'Catálogo',
    items: [
      PAGES.products,
      ...FACETS.filter((f) => ['materials', 'processes', 'standards'].includes(f.slug)).map((f) => ({
        label: f.label,
        to: `/browse/${f.slug}`,
      })),
    ],
  },
  {
    title: 'Conocimiento',
    items: [
      PAGES.technology,
      PAGES.welding,
      ...FACETS.filter((f) => ['documents', 'guides'].includes(f.slug)).map((f) => ({
        label: f.label,
        to: `/browse/${f.slug}`,
      })),
    ],
  },
  {
    title: 'Casa',
    items: [PAGES.company, PAGES.contact, PAGES.search],
  },
]

/*
  The scrubbed weld section on the Soldadura page.

  Four stages across the travel of the arc: strike, puddle, deposit, result.
  The scene is the argument; these are its captions, and they are also the
  screen-reader text for anyone who never sees the canvas.
*/
export const WELD_STAGES = [
  {
    title: 'Se ceba el arco',
    body: 'Entre el electrodo y la pieza se abre una columna de plasma a más de cinco mil grados. A partir de aquí el metal ya no es sólido.',
  },
  {
    title: 'Se forma el baño',
    body: 'El metal base y el de aporte se funden en un mismo charco. Lo que se decidió en la composición del consumible se está decidiendo aquí, otra vez, en segundos.',
  },
  {
    title: 'Avanza el depósito',
    body: 'Velocidad, amperaje y ángulo dejan su firma en cada rizo. Un cordón se lee como una firma: dice exactamente cómo se hizo.',
  },
  {
    title: 'Enfría y queda',
    body: 'Al solidificar, la microestructura se fija. Nada de lo que pase después la cambia — salvo un tratamiento térmico, y eso ya es otra decisión.',
  },
]

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
  The narrative spine of the home page.

  Six chapters, in the order the brief sets them: raw metal becomes a specified
  material, precision turns it into a joint, and the joint is the result. Each
  one is a section on the home page and, where it has a `to`, the door into the
  page that covers it properly.
*/
export const CHAPTERS = [
  {
    id: 'metal',
    index: '01',
    label: 'METAL',
    title: 'Todo empieza como metal.',
    body: 'Un lingote no sabe para qué sirve. No tiene grado, no tiene norma, no tiene garantía. Sólo tiene composición — y la composición lo decide todo.',
    visual: { kind: 'still', src: '/ows/stock.svg', alt: 'Barras de acero apiladas de canto' },
  },
  {
    id: 'material',
    index: '02',
    label: 'MATERIAL',
    title: 'El metal se convierte en material cuando se puede nombrar.',
    body: 'Una designación AWS no es una etiqueta. Es un contrato: qué contiene, cómo se comporta, qué resiste. A partir de ese momento el metal es predecible.',
    visual: { kind: 'product', product: 'spool', src: '/ows/spool.svg', alt: 'Rollo de alambre de soldadura' },
    to: PAGES.products.to,
    cta: 'Ver el catálogo',
  },
  {
    id: 'precision',
    index: '03',
    label: 'PRECISIÓN',
    title: 'La precisión es la diferencia entre unir y parecer unido.',
    body: 'Diámetro, tolerancia, recubrimiento, humedad del revestimiento. Variables que nadie ve en la pieza terminada y que deciden si aguanta.',
    visual: { kind: 'product', product: 'rod', src: '/ows/rod.svg', alt: 'Atado de varilla de aporte' },
    to: PAGES.technology.to,
    cta: 'Cómo se controla',
  },
  {
    id: 'welding',
    index: '04',
    label: 'SOLDADURA',
    title: 'El arco funde dos historias en una sola.',
    body: 'Amperaje, polaridad, gas de protección, velocidad de avance. El proceso no perdona la improvisación: cada parámetro deja su firma en el cordón.',
    visual: { kind: 'arc', mode: 'arc' },
    to: PAGES.welding.to,
    cta: 'Los procesos',
  },
  {
    id: 'technology',
    index: '05',
    label: 'TECNOLOGÍA',
    title: 'Lo que no se mide, no se puede repetir.',
    body: 'Ensayo de tracción, impacto Charpy, análisis químico por colada. La tecnología es lo que convierte un buen resultado en un resultado garantizado.',
    visual: { kind: 'still', src: '/ows/section.svg', alt: 'Junta soldada en corte' },
    to: PAGES.technology.to,
    cta: 'Control de calidad',
  },
  {
    id: 'result',
    index: '06',
    label: 'RESULTADO',
    title: 'Una unión que dura más que quien la hizo.',
    body: 'Ese es el único indicador que importa. Todo lo anterior existe para eso.',
    visual: { kind: 'still', src: '/ows/plate.svg', alt: 'Placa de acero cepillado' },
    to: PAGES.company.to,
    cta: 'Quiénes somos',
  },
]

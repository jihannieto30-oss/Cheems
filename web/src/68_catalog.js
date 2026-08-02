/* ============================================================================
   PEPTIDEX — EL CATÁLOGO COMO UNA SOLA COSA

   Hasta ahora las tres líneas vivían en tres sitios: en el objeto LINES, en la
   barra a mano y en el menú móvil a mano. Añadir una cuarta significaba tocar
   tres sitios y acordarse de los tres. Aquí hay una lista, PX_CAT, y la barra,
   el menú de catálogo, el menú móvil y el selector de cotización se construyen
   todos de ella. Añadir la sexta sección será una línea.

   Las dos nuevas — PepX Pens y Accessories — entran sin contenido, marcadas
   como `soon`. Existen, se pueden ver, se puede pedir aviso, y no fingen tener
   un catálogo que todavía no hay.
   ============================================================================ */
(function(){
'use strict';

/* La lista. `soon` es lo único que separa una sección viva de una que no lo
   está todavía: no hay dos caminos de código, hay un dato. */
const PX_CAT = [
  {route:'/fitness',     key:'fitness',     badge:'badge_fitness'},
  {route:'/beauty',      key:'beauty',      badge:'badge_beauty'},
  {route:'/longevity',   key:'longevity',   badge:'badge_longevity'},
  {route:'/pens',        key:'pens',        soon:true,
   name:'PepX Pens',     tagline:{en:'Precision Instruments', es:'Instrumentos de precisión'}},
  {route:'/accessories', key:'accessories', soon:true,
   name:'Accessories',   tagline:{en:'Around the Vial',       es:'Alrededor del vial'}}
];

const nameOf = c => (LINES[c.key] ? LINES[c.key].name : c.name);
const tagOf  = c => (LINES[c.key] ? LINES[c.key].tagline : t(c.tagline.en, c.tagline.es));

/* --------------------------------------------------------------------------
   1 · LA BARRA

   Cuatro entradas. Home se va porque la marca ya lleva a inicio; Science
   porque es un ancla de la portada, no un destino; y el botón «Explore
   Catalog» porque decía lo mismo que Catalog, más alto y en otro sitio.
   -------------------------------------------------------------------------- */
const NAVLINKS = [
  {route:'/quality', en:'Quality', es:'Calidad'},
  {route:'/tools',   en:'Tools',   es:'Herramientas'},
  {route:'/track',   en:'Track',   es:'Pedidos'}
];

function buildNav(){
  const links = document.querySelector('nav .links');
  if(!links || links.__px) return;
  links.__px = true;

  links.innerHTML =
    '<span class="px-cat">' +
      '<a class="px-cat-t" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false"' +
      ' data-en="Catalog" data-es="Catálogo">Catalog<i class="cv"></i></a>' +
    '</span>' +
    NAVLINKS.map(l =>
      '<a href="#' + l.route + '" data-nav data-route="' + l.route + '"' +
      ' data-en="' + l.en + '" data-es="' + l.es + '">' + t(l.en, l.es) + '</a>'
    ).join('');

  /* El botón de la derecha decía Catalog con otras palabras. Se va, y la barra
     recupera el sitio que hacía falta para que lo que queda respire. */
  const cta = document.querySelector('nav .navright > .btn');
  if(cta) cta.remove();

  applyStaticLang();
}

/* --------------------------------------------------------------------------
   2 · EL MENÚ DE CATÁLOGO

   Cuelga del <body>, no del <nav>: la barra tiene overflow:hidden para que la
   luz que la cruza no se salga, y cualquier cosa que asome por debajo se
   cortaría con ella. Se coloca en el momento de abrirlo, contra el rectángulo
   real del disparador, así que sigue a la barra sin depender de su caja.
   -------------------------------------------------------------------------- */
let menu = null;

function buildMenu(){
  if(menu) return menu;
  menu = document.createElement('div');
  menu.className = 'px-cat-menu';
  menu.setAttribute('role','menu');
  document.body.appendChild(menu);
  return menu;
}

function fillMenu(){
  const m = buildMenu();
  const row = c => {
    const soon = !!c.soon;
    return '<a href="#' + c.route + '" data-nav ' +
           'data-href="#' + c.route + '" role="menuitem" class="' + (soon ? 'soon' : '') + '">' +
           '<span class="tx"><span class="nm">' + esc(nameOf(c)) + '</span>' +
           '<span class="tl">' + esc(tagOf(c)) + '</span></span>' +
           (soon ? '<span class="sn">' + t('SOON','PRONTO') + '</span>' : '') +
           '</a>';
  };
  const live = PX_CAT.filter(c => !c.soon).map(row).join('');
  const soon = PX_CAT.filter(c =>  c.soon).map(row).join('');
  m.innerHTML = live + (soon ? '<div class="sep"></div>' + soon : '');
}

function place(){
  const trig = document.querySelector('nav .links .px-cat-t');
  if(!trig || !menu) return;
  const r = trig.getBoundingClientRect();
  const nav = document.querySelector('nav').getBoundingClientRect();
  menu.style.top  = Math.round(nav.bottom + 10) + 'px';
  /* alineado a su disparador, y nunca fuera de la ventana */
  const w = menu.offsetWidth || 290;
  menu.style.left = Math.round(Math.min(Math.max(12, r.left - 12), innerWidth - w - 12)) + 'px';
}

let open = false;
function setOpen(v){
  const wrap = document.querySelector('nav .links .px-cat');
  const trig = document.querySelector('nav .links .px-cat-t');
  if(!wrap || !menu) return;
  open = v;
  if(v){ fillMenu(); menu.classList.add('on'); place(); }
  else menu.classList.remove('on');
  wrap.classList.toggle('on', v);
  if(trig) trig.setAttribute('aria-expanded', v ? 'true' : 'false');
}

function wireMenu(){
  buildMenu();
  document.addEventListener('click', e => {
    const trig = e.target.closest && e.target.closest('.px-cat-t');
    if(trig){ e.preventDefault(); setOpen(!open); return; }
    /* elegir cierra el menú; navegar lo hace el enrutador de siempre */
    const item = e.target.closest && e.target.closest('.px-cat-menu a');
    if(item){ setOpen(false); return; }
    if(open) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && open) setOpen(false);
    if((e.key === 'Enter' || e.key === ' ') && document.activeElement &&
       document.activeElement.classList.contains('px-cat-t')){
      e.preventDefault(); setOpen(!open);
    }
  });
  addEventListener('resize', () => { if(open) place(); }, {passive:true});
  addEventListener('scroll', () => { if(open) place(); }, {passive:true});
}

/* --------------------------------------------------------------------------
   3 · EL MENÚ MÓVIL Y EL SELECTOR DE COTIZACIÓN

   Los dos se alimentan de la misma lista, para que no haya forma de añadir una
   sección y que aparezca en un sitio y no en el otro.
   -------------------------------------------------------------------------- */
function extendMobile(){
  const inner = document.querySelector('#mmenu .inner');
  if(!inner || inner.__px) return;
  inner.__px = true;
  const after = inner.querySelector('a[href="#/longevity"]');
  if(!after) return;
  PX_CAT.filter(c => c.soon).reverse().forEach(c => {
    const a = document.createElement('a');
    a.href = '#' + c.route;
    a.setAttribute('data-nav','');
    a.setAttribute('data-en', c.name + ' · soon');
    a.setAttribute('data-es', c.name + ' · pronto');
    a.textContent = c.name + t(' · soon',' · pronto');
    after.insertAdjacentElement('afterend', a);
  });
}

function extendQuote(){
  const sel = document.querySelector('#wl-form select[name=interest]');
  if(!sel || sel.__px) return;
  sel.__px = true;
  PX_CAT.filter(c => c.soon).forEach(c => {
    const o = document.createElement('option');
    o.value = c.name;
    o.setAttribute('data-en', c.name);
    o.setAttribute('data-es', c.name);
    o.textContent = c.name;
    sel.appendChild(o);
  });
}

/* --------------------------------------------------------------------------
   4 · LAS DOS SECCIONES VACÍAS

   Una sección sin catálogo es una promesa, y se escribe como una promesa: una
   línea, mucho aire y una sola cosa que hacer. Rellenarla de tarjetas de humo
   para que parezca llena es la única manera de que se note que está vacía.

   Lo único que hace es recoger el aviso, y lo recoge con el formulario de
   cotización que ya existe — con su propia opción en el selector, para que
   cuando abra la sección ya haya a quién avisar.
   -------------------------------------------------------------------------- */
const SOON = {
  pens:{
    eyebrow:{en:'PepX · Instruments', es:'PepX · Instrumentos'},
    title:  {en:'Pens.',              es:'Pens.'},
    lead:   {en:'A precision instrument held to the same standard as what it carries. In development — nothing is open yet, and nothing here is a specification.',
             es:'Un instrumento de precisión al mismo estándar que lo que transporta. En desarrollo — todavía no hay nada abierto, y nada de esto es una especificación.'}
  },
  accessories:{
    eyebrow:{en:'PEPTIDEX · Accessories', es:'PEPTIDEX · Accesorios'},
    title:  {en:'Accessories.',           es:'Accesorios.'},
    lead:   {en:'Everything around the vial — storage, handling, documentation. In development, and it will open one item at a time rather than all at once.',
             es:'Todo lo que rodea al vial — conservación, manejo, documentación. En desarrollo, y abrirá pieza por pieza en vez de todo de golpe.'}
  }
};

/* El escenario. Las tres piezas a la misma escala, alineadas por la base y
   separadas por igual, cada una con su sombra de contacto y el nombre de su
   línea debajo.

   PX_PENS_ART lo inyecta el build desde web/assets/pens.json, que produce
   mk_pens.py a partir de los recortes. Si no hay arte —que es hoy— salen tres
   contornos: el hueco vacío se lee como página rota, y el contorno se lee como
   producto que aún no ha salido, que es lo que es. */
const PENART = (typeof PX_PENS_ART !== 'undefined' && PX_PENS_ART) || {};

function stageHTML(){
  const rows = [
    {k:'fitness',   ln:'FITNESS'},
    {k:'beauty',    ln:'BEAUTY'},
    {k:'longevity', ln:'LONGEVITY'}
  ];
  const has = rows.some(r => PENART[r.k]);
  return '<div class="px-stage reveal">' + rows.map(r => {
    const src = PENART[r.k];
    return '<div class="px-plinth">' +
      '<div class="px-pen' + (src ? '' : ' empty') + '">' +
        (src ? '<img src="' + src + '" alt="PEPTIDEX ' + r.ln + '"/>'
             : '<div class="ghostpen"><i></i></div>') +
        '<div class="sh"></div>' +
      '</div>' +
      '<div class="ln">' + r.ln + '</div>' +
      '<div class="dz">' + (has ? '10 MG' : t('in development','en desarrollo')) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function soonHTML(key){
  const S = SOON[key], c = PX_CAT.find(x => x.key === key);
  const stage = (key === 'pens');
  return '<section class="px-soon' + (stage ? ' stage-on' : '') + '"><div class="wrap"><div class="in">' +
    '<span class="eyebrow reveal">' + t(S.eyebrow.en, S.eyebrow.es) + '</span>' +
    '<h1 class="display reveal">' + t(S.title.en, S.title.es) + '</h1>' +
    '<div class="rule reveal"></div>' +
    '<p class="lead reveal">' + t(S.lead.en, S.lead.es) + '</p>' +
    (stage ? stageHTML() : '') +
    '<div class="acts reveal">' +
      '<button class="btn mag" data-soon-notify="' + esc(c.name) + '">' +
        t('Tell me when it opens','Avísame cuando abra') + '</button>' +
      '<a class="btn ghost mag" href="#/fitness" data-nav data-href="#/fitness">' +
        t('See the catalog','Ver el catálogo') + '</a>' +
    '</div>' +
    '<div class="note reveal">' + t('Research use only','Solo uso en investigación') + '</div>' +
  '</div></div></section>' + footerHTML();
}

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-soon-notify]');
  if(!b) return;
  try{ openWL(b.dataset.soonNotify); }catch(err){}
});

/* --------------------------------------------------------------------------
   5 · LAS RUTAS

   render() del fichero base no conoce estas dos, y no hay forma de que las
   conozca sin editarlo. Se envuelve: si la ruta es una de ellas se pinta aquí
   y se llama a mano a lo que render() haría después — que es poco y está todo
   a mano en este mismo ámbito.
   -------------------------------------------------------------------------- */
const _render = render;
render = function(route, defer){
  const key = String(route || '').replace('/','');

  if(SOON[key]){
    const mw = document.getElementById('molwrap');
    if(mw && mw.__cleanup) mw.__cleanup();
    app.innerHTML = soonHTML(key);
    try{ syncAccountUI(); }catch(e){}
    try{ setView('home'); }catch(e){}
    try{ observeReveals(); }catch(e){}
    try{ lenis.scrollTo(0, {immediate:true}); }catch(e){}
    if(defer){ try{ parEls = []; }catch(e){} }
    else { try{ collectParallax(); requestAnimationFrame(() => parallaxTick()); }catch(e){} }
  } else {
    _render(route, defer);
  }
  lastRoute = route;
  footerScience();

  /* El disparador se enciende con cualquiera de las cinco: la barra ya no
     tiene un enlace por línea, así que Catalog es quien tiene que decir dónde
     estás. */
  const wrap = document.querySelector('nav .links .px-cat');
  if(wrap) wrap.classList.toggle('active', PX_CAT.some(c => c.route === route));
  const trig = document.querySelector('nav .links .px-cat-t');
  if(trig) trig.classList.toggle('active', PX_CAT.some(c => c.route === route));

  extendQuote();
};

/* --------------------------------------------------------------------------
   5b · SCIENCE, QUE SE FUE DE LA BARRA

   Era un ancla dentro de la portada colgada de la barra global, así que desde
   cualquier otra ruta no llevaba a ninguna parte: #sci no existe fuera de la
   portada. Baja al pie, donde se busca lo que no es catálogo, y desde ahí sí
   funciona: si no estás en la portada, va a la portada primero.

   El salto se hace a los 1000 ms, después de que la transición repinte la
   página a los 800 — y mientras el campo todavía la tapa, así que se llega ya
   desplazado en vez de ver el viaje. render() desplaza a cero al repintar; por
   eso esto va después y no antes.
   -------------------------------------------------------------------------- */
function footerScience(){
  const col = document.querySelector('footer .cols ul');
  if(!col || col.__pxSci) return;
  col.__pxSci = true;
  const li = document.createElement('li');
  li.innerHTML = '<a href="#/" data-px-sci><b>' + t('The Science','La ciencia') + '</b> — ' +
                 t('purity & method','pureza y método') + ' →</a>';
  col.appendChild(li);
}

document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('[data-px-sci]');
  if(!a) return;
  e.preventDefault();
  /* Se le pasa un número, no el elemento. Lenis resuelve elementos, pero
     entonces el destino depende de su versión y de su configuración; una
     posición absoluta no depende de nada y es la misma cuenta que haría él. */
  const go = () => {
    const el = document.getElementById('sci');
    if(!el) return;
    const y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - 70;
    try{ lenis.scrollTo(y); }catch(err){ window.scrollTo(0, y); }
  };
  if(currentRoute() === '/'){ go(); return; }
  try{ navigate('/'); }catch(err){ location.hash = '#/'; }
  setTimeout(go, 1000);
  setTimeout(go, 1900);   /* por si la transición se reinició a mitad */
});

/* --------------------------------------------------------------------------
   6 · EL BOTÓN DE ATRÁS

   El fichero base escucha hashchange así:

     const want = modeFor(r.replace('/',''));
     if(view.mode !== want && view.mode !== 'product') diveTransition(r);

   Decide si hay que repintar comparando el modo de la escena 3D, no la ruta. Y
   modeFor devuelve 'home' para todo lo que no sea una línea o quality — así que
   ir de /about a /faq, o de /pens a /accessories, no repinta nada: la URL
   cambia y la página se queda como estaba. Con el botón de atrás, igual.

   No se puede tocar el fichero base, así que se escucha después y se cubre el
   caso que el suyo deja fuera — sin duplicarlo: si el modo cambia, el suyo ya
   se encargó y éste no hace nada.
   -------------------------------------------------------------------------- */
let lastRoute = null;
addEventListener('hashchange', () => {
  const r = currentRoute();
  let baseHandles = false;
  try{ baseHandles = (view.mode !== modeFor(r.replace('/','')) && view.mode !== 'product'); }catch(e){}
  if(baseHandles) return;
  if(r === lastRoute) return;
  try{ if(productOpen) return; }catch(e){}
  try{ diveTransition(r); }catch(e){ render(r); }
});

/* --------------------------------------------------------------------------
   7 · arrancar
   -------------------------------------------------------------------------- */
buildNav();
wireMenu();
extendMobile();
extendQuote();
/* el arranque ya pintó el pie con el render original, antes de que esto
   existiera; el enlace se añade también aquí para la primera pantalla */
footerScience();

/* el idioma se cambia recargando la ruta, así que el menú hay que rehacerlo */
const _setLang = setLang;
setLang = function(l){ _setLang(l); fillMenu(); extendMobile(); };

/* si el arranque ya pintó una ruta antes de que esto corriera, se repinta */
try{ if(SOON[currentRoute().replace('/','')]) render(currentRoute()); }catch(e){}

/* el arnés mira por aquí; el sitio nunca */
window.__pxCat = {list: PX_CAT, open: () => open, setOpen: setOpen};

})();

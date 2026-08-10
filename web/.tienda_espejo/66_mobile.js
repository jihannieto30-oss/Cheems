/* ============================================================================
   PEPTIDEX — EL TELÉFONO, LA PARTE QUE NO ES CSS

   Tres cosas, en orden de lo que se nota.

   1 · EL DEDO PUEDE RECORRER LA HOJA DEL COMPUESTO
   openProduct llama a lenis.stop(), y Lenis detiene la página cancelando el
   touchmove. Con la hoja ya recorrible por CSS eso seguiría sin servir de
   nada: el gesto no llegaría nunca al elemento. Se corta la propagación del
   toque dentro de la hoja, así que Lenis no lo ve y el navegador la recorre
   como recorre cualquier caja — nativamente, con su inercia.

   2 · EL VIAL SE COMPONE POR FASES
   Medido con el freno de CPU a 6×: componer el vial de un compuesto costaba
   831 ms de hilo principal dentro del toque que lo abría. 40_label.js reparte
   ahora ese trabajo en cuatro fases; aquí se enlazan a la interfaz, y el toque
   arranca el trabajo en pointerdown en vez de en click, que en un teléfono son
   entre cien y trescientos milisegundos de ventaja gratis.

   3 · LA HÉLICE NO DIBUJA LO QUE NADIE VE
   El fondo 3D corre siempre. Mientras un compuesto, la bolsa o la transición
   tapan la pantalla no aporta nada y compite por la GPU justo cuando hace
   falta. Se pausa con lo que ya existe — fxPaused — y se reanuda al cerrar.
   Sólo en teléfono: en escritorio no sobra el presupuesto y el fondo se ve.
   ============================================================================ */
(function(){
'use strict';

/* MOBILE lo decide el fichero base con el mismo criterio que usa para bajar el
   3D; se reusa para no acabar con dos ideas distintas de qué es un teléfono. */
const PHONE = (typeof MOBILE !== 'undefined' && MOBILE) ||
              innerWidth < 860 ||
              (matchMedia && matchMedia('(hover:none) and (pointer:coarse)').matches);

const sheet = () => document.querySelector('#product .panel');

/* --------------------------------------------------------------------------
   1 · el gesto dentro de la hoja es del navegador, no de Lenis
   -------------------------------------------------------------------------- */
function freeSheet(){
  const pn = sheet();
  if(!pn || pn.__pxFree) return;
  pn.__pxFree = true;

  /* la vía documentada de Lenis, por si algún día deja de hacer falta la otra */
  pn.setAttribute('data-lenis-prevent', '');

  /* y la garantía: Lenis escucha en window, en fase de burbuja. Un touchmove
     que se detiene aquí no llega allí, así que no hay preventDefault que valga
     y la hoja se recorre sola. passive:true — no se cancela nada, sólo se
     evita que suba. */
  ['touchstart','touchmove','wheel'].forEach(ev =>
    pn.addEventListener(ev, e => e.stopPropagation(), {passive:true}));
}
freeSheet();

/* --------------------------------------------------------------------------
   3 · la hélice se pausa mientras algo la tapa

   Sin contador. Un contador se desequilibra en cuanto alguien cierra dos veces
   —y navigate() cierra el compuesto por su cuenta antes de irse— y un contador
   desequilibrado deja el fondo congelado para siempre. Se lee el estado real
   cada vez, que no puede mentir.
   -------------------------------------------------------------------------- */
function covered(){
  const bag = document.getElementById('bag');
  return (typeof productOpen !== 'undefined' && productOpen) ||
         (bag && bag.classList.contains('on')) ||
         document.documentElement.classList.contains('px-diving');
}
function sync3D(){
  if(typeof fxPaused === 'undefined') return;
  fxPaused = document.hidden || (PHONE && !!covered());
}
/* el base ya escucha visibilitychange y escribe fxPaused; éste va después y
   corrige, para que volver a la pestaña no reanude lo que sigue tapado */
document.addEventListener('visibilitychange', sync3D);

/* --------------------------------------------------------------------------
   2 + 3 · el compuesto
   -------------------------------------------------------------------------- */
if(typeof openProduct === 'function'){
  const _open = openProduct;
  openProduct = function(key, idx){
    const r = _open(key, idx);
    const pn = sheet();
    if(pn){ freeSheet(); pn.scrollTop = 0; }   /* el segundo compuesto empieza arriba */
    sync3D();
    return r;
  };
}
if(typeof closeProduct === 'function'){
  const _close = closeProduct;
  /* productOpen no se apaga hasta que termina el fundido del fondo, así que la
     hélice vuelve cuando el fondo ya la deja ver, no antes */
  closeProduct = function(silent){ const r = _close(silent); setTimeout(sync3D, 480); return r; };
}

/* La transición tapa la pantalla entera durante 2.6 s. Detrás no hay nada que
   mirar y sí una página que reconstruir. */
if(typeof diveTransition === 'function'){
  const _dive = diveTransition;
  diveTransition = function(route){
    const r = _dive(route);        /* pone px-diving; covered() ya lo ve */
    sync3D();
    setTimeout(sync3D, 2700);      /* 63_dive.js la quita a los 2660 */
    return r;
  };
}

if(typeof openBag === 'function' && typeof closeBag === 'function'){
  const _ob = openBag, _cb = closeBag;
  openBag  = function(){ const r = _ob(); sync3D(); return r; };
  closeBag = function(){ const r = _cb(); sync3D(); return r; };
}

/* --------------------------------------------------------------------------
   2 · el vial, por fases y empezado antes
   -------------------------------------------------------------------------- */
const L = window.__pxLabel;
if(L && L.buildVialAsync){

  /* Un píxel transparente. Es lo que ocupa el sitio del vial mientras se
     compone: la imagen entra con opacidad 0 de todos modos, así que no se ve
     nada aparecer y luego desaparecer. */
  const NOTHING = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  /* 40_label.js reemplaza makeProductVial cuando la ilustración y el kit están
     listos; hay que entrar después de eso, no antes. */
  Promise.all([artReady, L.kitReady]).then(() => {
    makeProductVial = function(lineKey, p){
      const hot = L.cached(lineKey, p);
      if(hot) return hot;                       /* ya estaba: instantáneo */

      const want = L.vialKey(lineKey, p);
      const im = document.querySelector('#pv img');
      if(im) im.__pxWant = want;

      L.buildVialAsync(lineKey, p).then(url => {
        const el = document.querySelector('#pv img');
        /* si mientras tanto se abrió otro compuesto, éste ya no es el suyo */
        if(!el || el.__pxWant !== want) return;
        el.src = url;
        try{ gsap.fromTo(el, {opacity:0}, {opacity:1, duration:.45, ease:'power2.out'}); }
        catch(e){ el.style.opacity = 1; }
      });
      return NOTHING;
    };
  });

  /* El toque empieza en pointerdown y termina en click. Entre uno y otro hay
     tiempo real en un teléfono, y es tiempo en el que ya se puede ir armando
     el vial que se acaba de pedir. Si el dedo se va sin soltar encima, lo
     único que queda es un vial de más en la caché, que es lo que habría
     pasado igualmente al volver a intentarlo. */
  addEventListener('pointerdown', e => {
    const card = e.target.closest && e.target.closest('[data-product]');
    if(!card) return;
    const [k, i] = card.dataset.product.split(':');
    const line = (typeof LINES !== 'undefined') && LINES[k];
    const p = line && line.products[+i];
    if(p) L.buildVialAsync(k, p);
  }, {passive:true});
}

/* el arnés mira por aquí; el sitio nunca */
window.__pxMobile = {phone: PHONE, covered: covered, freeSheet: freeSheet,
                     paused: () => (typeof fxPaused !== 'undefined' && fxPaused)};

})();

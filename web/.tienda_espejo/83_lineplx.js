/* ============================================================================
   PEPTIDEX — PARALLAX DE LÍNEA

   Se enciende al entrar a /fitness, /beauty o /longevity, y se apaga entero al
   salir. Fuera de esas tres rutas este fichero no mueve absolutamente nada:
   ni un escuchador puesto, ni un `transform` escrito, ni un `will-change`
   colgado. Ésa es la condición y está comprobada en el desmontaje.

   POR QUÉ NO SE TOCA EL GOBERNADOR DE MOVIMIENTO

   `31_motion.js` quitó el parallax de toda la web porque el móvil se atascaba,
   y sigue teniendo razón: una capa de composición por elemento, mantenida en
   todas las pantallas, es memoria de vídeo regalada. Lo que cambia no es su
   criterio — es que hay UN sitio donde el movimiento es el producto y no el
   adorno. Así que esta capa:

     · usa su propio atributo, `data-lp`, que el gobernador no mira. Si usara
       `data-par` se lo quitaría en el siguiente repintado.
     · usa sus propios elementos para la atmósfera, en vez de disputarle
       `.halo`. Dos motores escribiendo el mismo `style.transform` es un
       parpadeo garantizado.
     · mide una vez, en reposo, y luego sólo lee el scroll. El motor original
       leía `getBoundingClientRect()` de cada elemento dentro del bucle de
       escritura, lo que fuerza un cálculo de maquetación por elemento y por
       cuadro, y además realimenta la posición que acaba de escribir.

   QUÉ HACE EL LOGOTIPO

   Se traslada. Nada más. Ni rota, ni escala, ni se inclina, ni se filtra. Es
   la única pieza de esta pantalla que no se puede rehacer si sale mal.
   ============================================================================ */
(function(){
'use strict';

var LINEAS = {fitness:1, beauty:1, longevity:1};

/* Lo que se mueve, y cuánto. `d` es profundidad para el scroll; `m`, cuánto
   responde al puntero. Los números salen de una idea física: lo que está
   lejos se mueve poco y llega tarde; lo que está cerca, al revés.

   El lockup va deliberadamente BAJO en las dos: es el ancla de la pantalla.
   Si se mueve como la atmósfera, la marca flota; y una marca que flota no
   parece cara, parece suelta. */
var CAPAS = [
  ['.lp-atmo',        0.030, 26],   /* el fondo de luz: el que menos se mueve */
  ['.lhero .badge',   0.055,  7],   /* el logotipo. Sólo traslación. */
  ['.lhero .copy p',  0.085, 12],
  ['.lhero .copy .usa', 0.105, 16],
  ['.lhero .stage',   0.070, 20],   /* el vial se mueve por su contenedor */
  ['.cat .chead',     0.060,  8]
];

var MOTAS = 6;

var vivo = false, clave = null, raf = null, medido = false;
var capas = [], motas = [], tarjetas = [];
var px = 0, py = 0, sx = 0, sy = 0;   /* puntero crudo y suavizado */
var quieto = null;

function reduce(){
  try{ return matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(e){ return false; }
}
function estrecha(){
  try{ return matchMedia('(max-width:760px)').matches; }catch(e){ return false; }
}

/* --------------------------------------------------------------------------
   La atmósfera, inyectada. No vive en el HTML de la línea porque el HTML de la
   línea lo genera `lineHTML()`, que es del sitio y no se toca.
   -------------------------------------------------------------------------- */
function ponAtmosfera(hero){
  var a = document.createElement('div');
  a.className = 'lp-atmo';
  a.setAttribute('aria-hidden', 'true');
  hero.insertBefore(a, hero.firstChild);

  motas = [];
  if(!estrecha()){
    for(var i = 0; i < MOTAS; i++){
      var m = document.createElement('span');
      m.className = 'lp-mote';
      m.setAttribute('aria-hidden', 'true');
      /* Repartidas con una secuencia fija, no al azar: si cambian de sitio en
         cada visita, la pantalla no se reconoce al volver. */
      m.style.left = (11 + (i * 37) % 78) + '%';
      m.style.top  = (17 + (i * 53) % 66) + '%';
      hero.insertBefore(m, hero.firstChild);
      motas.push({el: m, d: 0.02 + (i % 3) * 0.018, m: 30 + (i % 3) * 22});
    }
  }
  return a;
}

/* --------------------------------------------------------------------------
   Medir una vez, en reposo. Se guarda el centro de cada elemento en
   coordenadas del documento; a partir de ahí todo sale del scroll.
   -------------------------------------------------------------------------- */
function mide(){
  var sc = window.scrollY || window.pageYOffset || 0;
  capas.concat(motas).forEach(function(c){
    var prev = c.el.style.transform;
    c.el.style.transform = 'none';
    var r = c.el.getBoundingClientRect();
    c.centro = r.top + sc + r.height / 2;
    c.el.style.transform = prev;
    c.tf = null;
  });
  medido = true;
}

function cuadro(){
  raf = null;
  if(!vivo) return;

  sx += (px - sx) * 0.07;
  sy += (py - sy) * 0.07;

  var sc = window.scrollY || window.pageYOffset || 0;
  var vh = innerHeight;
  var mueve = false;

  var todas = capas.concat(motas);
  for(var i = 0; i < todas.length; i++){
    var c = todas[i];
    if(c.centro === undefined) continue;
    var ty = -(c.centro - sc - vh / 2) * c.d;
    var tx = sx * c.m;
    var tfy = sy * c.m * 0.45;
    var tf = 'translate3d(' + tx.toFixed(2) + 'px,' + (ty + tfy).toFixed(2) + 'px,0)';
    if(c.tf !== tf){ c.tf = tf; c.el.style.transform = tf; mueve = true; }
  }

  /* Sigue pidiendo cuadros mientras algo se mueva o mientras el puntero no
     haya terminado de asentarse. Cuando todo llega, el bucle se para solo: un
     rAF eterno sobre una pantalla quieta es batería quemada por nada. */
  if(mueve || Math.abs(px - sx) > 0.0015 || Math.abs(py - sy) > 0.0015) pide();
}

function pide(){ if(!raf && vivo) raf = requestAnimationFrame(cuadro); }

function alPuntero(e){
  px = e.clientX / innerWidth - 0.5;
  py = e.clientY / innerHeight - 0.5;
  pide();
}
function alGiro(e){
  if(e.gamma == null && e.beta == null) return;
  px = Math.max(-26, Math.min(26, e.gamma || 0)) / 52;
  py = Math.max(-26, Math.min(26, (e.beta || 0) - 42)) / 52;
  pide();
}
function alScroll(){ pide(); }
function alTamano(){
  clearTimeout(quieto);
  quieto = setTimeout(function(){ if(vivo){ mide(); pide(); } }, 160);
}

/* --------------------------------------------------------------------------
   Las tarjetas: inclinación 3D y brillo especular siguiendo al cursor.

   Sólo con ratón. En táctil el puntero está donde está el dedo, así que la
   tarjeta se inclinaría justo debajo de lo que se quiere tocar.
   -------------------------------------------------------------------------- */
function inclina(card){
  var glow = document.createElement('span');
  glow.className = 'lp-glow';
  glow.setAttribute('aria-hidden', 'true');
  card.appendChild(glow);

  var rx = 0, ry = 0, tx = 0, ty = 0, r2 = null, dentro = false;

  function paso(){
    rx += (tx - rx) * 0.17;
    ry += (ty - ry) * 0.17;
    if(!dentro && Math.abs(rx) < 0.05 && Math.abs(ry) < 0.05){
      r2 = null;
      card.style.transform = '';
      card.classList.remove('lp-tilt');
      glow.style.background = '';
      return;
    }
    card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) +
                           'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    r2 = requestAnimationFrame(paso);
  }

  function mover(e){
    if(e.pointerType === 'touch') return;
    var r = card.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width - 0.5;
    var ny = (e.clientY - r.top) / r.height - 0.5;
    tx = -ny * 6; ty = nx * 8;
    dentro = true;
    card.classList.add('lp-tilt');
    glow.style.background = 'radial-gradient(circle at ' +
      (25 + (nx + 0.5) * 50).toFixed(1) + '% ' + (25 + (ny + 0.5) * 50).toFixed(1) +
      '%, color-mix(in srgb, var(--lp2) 42%, transparent), transparent 56%)';
    if(!r2) r2 = requestAnimationFrame(paso);
  }
  function salir(){ dentro = false; tx = 0; ty = 0; if(!r2) r2 = requestAnimationFrame(paso); }

  card.addEventListener('pointermove', mover);
  card.addEventListener('pointerleave', salir);
  tarjetas.push({el: card, glow: glow, mover: mover, salir: salir,
                 para: function(){ if(r2) cancelAnimationFrame(r2); }});
}

/* --------------------------------------------------------------------------
   Encender y apagar
   -------------------------------------------------------------------------- */
function enciende(k){
  var hero = document.querySelector('.lhero');
  if(!hero || vivo) return;

  vivo = true; clave = k;
  var raiz = document.documentElement;
  raiz.classList.add('lp-on');
  raiz.setAttribute('data-lp-key', k);

  var atmo = ponAtmosfera(hero);

  capas = [];
  CAPAS.forEach(function(def){
    var el = def[0] === '.lp-atmo' ? atmo : document.querySelector(def[0]);
    if(!el) return;
    el.setAttribute('data-lp', '');
    capas.push({el: el, d: def[1], m: def[2]});
  });

  if(!estrecha())
    document.querySelectorAll('.cat .pcard').forEach(inclina);

  addEventListener('scroll', alScroll, {passive: true});
  addEventListener('resize', alTamano, {passive: true});
  if(!estrecha()) addEventListener('mousemove', alPuntero, {passive: true});
  else addEventListener('deviceorientation', alGiro, {passive: true});

  /* Medir después de que el navegador haya maquetado y las imágenes tengan
     caja. Medir antes da centros a cero y la primera pasada salta. */
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if(!vivo) return;
      mide();
      raiz.classList.add('lp-ready');
      pide();
    });
  });
}

function apaga(){
  if(!vivo) return;
  vivo = false; clave = null; medido = false;

  if(raf){ cancelAnimationFrame(raf); raf = null; }
  clearTimeout(quieto);

  removeEventListener('scroll', alScroll);
  removeEventListener('resize', alTamano);
  removeEventListener('mousemove', alPuntero);
  removeEventListener('deviceorientation', alGiro);

  /* Se borra lo escrito. Dejar un `transform` puesto en un elemento que el
     sitio va a reutilizar es la forma más silenciosa de romper otra pantalla:
     no da error, sólo deja algo tres píxeles fuera de sitio para siempre. */
  capas.forEach(function(c){
    c.el.removeAttribute('data-lp');
    c.el.style.transform = '';
    c.el.style.willChange = '';
  });
  tarjetas.forEach(function(t){
    t.para();
    t.el.removeEventListener('pointermove', t.mover);
    t.el.removeEventListener('pointerleave', t.salir);
    t.el.classList.remove('lp-tilt');
    t.el.style.transform = '';
    if(t.glow && t.glow.parentNode) t.glow.parentNode.removeChild(t.glow);
  });
  document.querySelectorAll('.lp-atmo,.lp-mote').forEach(function(e){
    if(e.parentNode) e.parentNode.removeChild(e);
  });

  capas = []; motas = []; tarjetas = [];
  px = py = sx = sy = 0;

  var raiz = document.documentElement;
  raiz.classList.remove('lp-on', 'lp-ready');
  raiz.removeAttribute('data-lp-key');
}

/* --------------------------------------------------------------------------
   Engancharse a la ruta
   -------------------------------------------------------------------------- */
function claveDe(){
  var r = '';
  try{ r = currentRoute(); }catch(e){ r = (location.hash || '').replace('#', ''); }
  var k = String(r || '').replace(/^\//, '').split(/[?#]/)[0];
  return LINEAS[k] ? k : null;
}

function revisa(){
  if(reduce()){ apaga(); return; }
  var k = claveDe();
  if(!k){ apaga(); return; }
  if(vivo && k === clave) return;   /* misma línea, ya montado */
  apaga();
  enciende(k);
}

/* El sitio repinta con `render`; hay que esperar a que el DOM nuevo exista. */
if(typeof render === 'function'){
  var _render = render;
  render = function(a, b){
    apaga();                                   /* lo viejo se va antes */
    var r = _render(a, b);
    requestAnimationFrame(revisa);
    return r;
  };
}
addEventListener('hashchange', function(){ requestAnimationFrame(revisa); });

/* Y la primera pantalla, si se abrió ya dentro de una línea. */
requestAnimationFrame(revisa);

/* el arnés mira por aquí; el sitio nunca */
window.__pxLinePlx = {
  activo: function(){ return vivo; },
  clave:  function(){ return clave; },
  capas:  function(){ return capas.length; },
  motas:  function(){ return motas.length; },
  tarjetas: function(){ return tarjetas.length; },
  revisa: revisa, apaga: apaga
};

})();

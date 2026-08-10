/* ============================================================================
   LOS QUE FALTABAN EN LA TIENDA

   La biblioteca de PepX tenía sesenta entradas y la tienda mostraba
   cincuenta y seis. Cuatro de esas diferencias eran reales, no de nombre:

     Lipo-C        se vende y no estaba
     Lemon Bottle  se vende y no estaba
     HCG           estaba retenida en la biblioteca
     BAC Water     es el vehículo de reconstitución de casi todo el catálogo

   POR QUÉ SE AÑADEN AQUÍ Y NO EN `LINES`

   `LINES` vive en `PEPTIDEX.base.html`, que no existe: `build_restore.py` no
   puede correr sin él. Así que la lista se amplía en ejecución, antes del
   primer pintado. Cuando aparezca el fichero base esto se pasa a `LINES` y
   este fichero se borra.

   DOS DECISIONES QUE NO SON OBVIAS

   1 · BAC Water va al final de LAS TRES líneas, no sólo de una. Todo lo que se
       vende en polvo necesita vehículo, y quien está comprando un péptido de
       BEAUTY no tiene por qué ir a FITNESS a buscar el agua. Se repite a
       propósito, y va marcado como disolvente para que no se confunda con un
       compuesto.

   2 · La ficha de HCG no describe nada. Sólo dice que es experimental, que es
       exactamente lo que se pidió.
   ============================================================================ */
(function(){
'use strict';

if(typeof LINES === 'undefined' || !LINES.fitness) return;

/* [abreviatura, nombre, presentación, nota] — la misma forma que usa el
   sitio. La quinta posición es marca interna: el sitio la ignora al pintar y
   la lee este fichero para poner la etiqueta. */
var NUEVOS = {
  fitness: [
    ['LP', 'Lipo-C',       '10 ml',            'Lipotropic support complex'],
    ['LE', 'Lemon Bottle', '10 ml',            'Lipolytic solution'],
    ['HG', 'HCG',          '1000 – 10000 iu',  '', 'exp']
  ]
};

/* El vehículo, al final de todas. */
var VEHICULO = ['BW', 'BAC Water', '3 · 10 ml', 'Reconstitution vehicle', 'sol'];

var MARCA = {};   /* nombre → tipo de etiqueta */

function amplia(){
  Object.keys(NUEVOS).forEach(function(k){
    if(!LINES[k]) return;
    NUEVOS[k].forEach(function(p){
      /* Idempotente: si ya está, no se duplica. Este fichero puede correr dos
         veces si el sitio recarga su módulo, y un catálogo con Lipo-C dos
         veces es peor que sin él. */
      if(LINES[k].products.some(function(x){ return x[1] === p[1]; })) return;
      LINES[k].products.push(p.slice(0, 4));
      if(p[4]) MARCA[p[1]] = p[4];
    });
  });

  ['fitness', 'beauty', 'longevity'].forEach(function(k){
    if(!LINES[k]) return;
    if(LINES[k].products.some(function(x){ return x[1] === VEHICULO[1]; })) return;
    LINES[k].products.push(VEHICULO.slice(0, 4));
  });
  MARCA[VEHICULO[1]] = VEHICULO[4];
}

/* --------------------------------------------------------------------------
   Las etiquetas.

   Se buscan por el TEXTO DEL TÍTULO de cada tarjeta, no por un índice ni por
   un selector amplio. Un índice se desplaza en cuanto alguien reordene el
   catálogo, y un selector amplio ya costó una web en blanco esta misma tarde.
   Aquí, si el nombre no coincide exactamente, no pasa nada: no se pone
   etiqueta, y no se toca ninguna otra tarjeta.
   -------------------------------------------------------------------------- */
var TEXTO = {
  exp: ['EXPERIMENTAL', 'EXPERIMENTAL'],
  sol: ['SOLVENT', 'DISOLVENTE']
};

function etiqueta(){
  var cards = document.querySelectorAll('.grid-cat .pcard');
  for(var i = 0; i < cards.length; i++){
    var c = cards[i];
    if(c.querySelector('.px-mk')) continue;
    var h = c.querySelector('h4');
    if(!h) continue;
    var tipo = MARCA[h.textContent.trim()];
    if(!tipo) continue;

    var s = document.createElement('span');
    s.className = 'px-mk px-mk-' + tipo;
    var txt = TEXTO[tipo];
    s.textContent = (typeof t === 'function') ? t(txt[0], txt[1]) : txt[0];
    h.parentNode.insertBefore(s, h.nextSibling);
    c.classList.add('px-has-mk', 'px-is-' + tipo);
  }
}

amplia();

/* Después de cada pintado. `render` devuelve antes de que el navegador haya
   maquetado, así que se espera un cuadro. */
if(typeof render === 'function'){
  var _r = render;
  render = function(a, b){ var r = _r(a, b); requestAnimationFrame(etiqueta); return r; };
}
requestAnimationFrame(etiqueta);
addEventListener('hashchange', function(){ requestAnimationFrame(etiqueta); });

window.__pxExtras = {marca: MARCA, etiqueta: etiqueta,
  cuenta: function(){ return {fitness: LINES.fitness.products.length,
                              beauty: LINES.beauty.products.length,
                              longevity: LINES.longevity.products.length}; }};

})();

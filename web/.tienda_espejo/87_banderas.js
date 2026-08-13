/* ============================================================================
   LAS BANDERAS

   POR QUÉ SVG Y NO EMOJI

   El conmutador de región ya usa 🇺🇸 y 🇲🇽, y en un iPhone o en un Mac se ven
   perfectas. En Windows no: Windows no trae fuente de banderas, así que el
   emoji se degrada a las dos letras del código —«US», «MX»— en un recuadro. En
   una marca que se vende por acabado, eso es peor que no poner nada.

   Estas van dibujadas. Se ven igual en todas partes, escalan sin romperse y
   pesan menos que un carácter de fuente que hay que descargar.

   DÓNDE VAN

     · el conmutador de la barra, que es donde se cambia de país
     · el distintivo «PEPTIDEX USA / MÉXICO» de cada catálogo y del checkout
     · el campo de país del formulario, que hasta ahora era texto plano

   Sobre el conmutador: en la primera versión de este fichero se decidió NO
   tocarlo, dando por hecho que el emoji funcionaría donde más se usa. Estaba
   mal. En la captura que llegó de la barra, el botón sale VACÍO — ni bandera
   ni letras. Un botón en blanco al lado de «ES» no parece un selector de país;
   parece algo roto. Así que también se dibuja.
   ============================================================================ */
(function(){
'use strict';

/* Dibujadas a 3:2, la proporción real de las dos. */
var MX =
  '<svg class="px-bnd" viewBox="0 0 24 16" aria-hidden="true" focusable="false">' +
    '<rect width="8" height="16" fill="#006847"/>' +
    '<rect x="8" width="8" height="16" fill="#fff"/>' +
    '<rect x="16" width="8" height="16" fill="#CE1126"/>' +
    /* El escudo real es un águila sobre un nopal: a catorce píxeles sería una
       mancha. Se pone una marca circular en su sitio, que es lo que el ojo
       espera ahí y lo que separa esta bandera de la italiana. */
    '<circle cx="12" cy="8" r="2.4" fill="none" stroke="#8B5A2B" stroke-width="1.1"/>' +
  '</svg>';

var US =
  '<svg class="px-bnd" viewBox="0 0 24 16" aria-hidden="true" focusable="false">' +
    '<rect width="24" height="16" fill="#fff"/>' +
    /* Siete franjas rojas de las trece: las blancas son el fondo. */
    '<g fill="#B22234">' +
      '<rect y="0"     width="24" height="1.23"/><rect y="2.46"  width="24" height="1.23"/>' +
      '<rect y="4.92"  width="24" height="1.23"/><rect y="7.38"  width="24" height="1.23"/>' +
      '<rect y="9.84"  width="24" height="1.23"/><rect y="12.30" width="24" height="1.23"/>' +
      '<rect y="14.76" width="24" height="1.23"/>' +
    '</g>' +
    '<rect width="9.6" height="8.6" fill="#3C3B6E"/>' +
    /* Las cincuenta estrellas a este tamaño son ruido gris. Seis puntos
       sugieren el cantón y se leen limpios a catorce píxeles. */
    '<g fill="#fff">' +
      '<circle cx="2.2" cy="2.1" r=".62"/><circle cx="4.8" cy="2.1" r=".62"/><circle cx="7.4" cy="2.1" r=".62"/>' +
      '<circle cx="3.5" cy="4.3" r=".62"/><circle cx="6.1" cy="4.3" r=".62"/>' +
      '<circle cx="2.2" cy="6.5" r=".62"/><circle cx="4.8" cy="6.5" r=".62"/><circle cx="7.4" cy="6.5" r=".62"/>' +
    '</g>' +
  '</svg>';

function bandera(k){ return k === 'usa' ? US : MX; }

/* --------------------------------------------------------------------------
   1 · Los distintivos de región

   Se identifican por su clase `.reg-badge`, que ya trae `usa` o `mex`. No hace
   falta adivinar nada y no se toca ningún otro elemento.
   -------------------------------------------------------------------------- */
function ponEnDistintivos(){
  document.querySelectorAll('.reg-badge').forEach(function(b){
    if(b.querySelector('.px-bnd')) return;         /* ya la tiene */
    var k = b.classList.contains('usa') ? 'usa' : 'mex';
    b.insertAdjacentHTML('afterbegin', bandera(k));
    b.classList.add('px-con-bnd');
  });
}

/* --------------------------------------------------------------------------
   2 · El campo de país del checkout

   Es un `input` de sólo lectura con «United States» dentro. Un input no puede
   llevar un SVG, así que la bandera va al lado, dentro de un envoltorio, y el
   campo se aparta lo justo para dejarle sitio.
   -------------------------------------------------------------------------- */
function ponEnPais(){
  var f = document.querySelector('#co-form input[name="country"]');
  if(!f || f.__bnd) return;
  f.__bnd = true;

  var v = (f.value || '').toLowerCase();
  var k = /m[eé]xico|mexico/.test(v) ? 'mex' : 'usa';

  var env = document.createElement('span');
  env.className = 'px-pais';
  f.parentNode.insertBefore(env, f);
  env.appendChild(f);
  env.insertAdjacentHTML('afterbegin', bandera(k));
}

/* --------------------------------------------------------------------------
   3 · El conmutador de la barra

   `updateRegionUI()` le reescribe el `innerHTML` cada vez que se cambia de
   país, así que no basta con pintarlo una vez: hay que volver a pintarlo
   DESPUÉS de que el sitio haya escrito lo suyo. Por eso se envuelve la función
   en lugar de engancharse al clic — el clic no es la única vía: la región
   también se restaura de `localStorage` al abrir.
   -------------------------------------------------------------------------- */
function ponEnConmutador(){
  var esUSA = (typeof REGION !== 'undefined') ? (REGION === 'usa') : false;
  document.querySelectorAll('[data-region-tog]').forEach(function(b){
    var k = esUSA ? 'usa' : 'mex';
    /* Si ya está la bandera correcta, no se toca: reescribir el nodo en cada
       repintado haría parpadear el botón.

       Pero la marca sola NO basta como prueba, y esto costó un fallo: al
       arrancar, esta función pintaba primero y el sitio llamaba después a
       `updateRegionUI()`, que reescribe el `innerHTML` con el emoji. La marca
       seguía puesta, así que se salía por aquí y el botón se quedaba con el
       emoji vacío hasta que alguien hacía clic. Hay que comprobar que el SVG
       siga ahí de verdad. */
    if(b.getAttribute('data-bnd') === k && b.querySelector('svg.px-bnd')) return;
    b.setAttribute('data-bnd', k);
    b.innerHTML = bandera(k) + '<span class="px-rg">' + (esUSA ? 'US' : 'MX') + '</span>';
    b.classList.add('px-con-bnd');
  });
}

function pinta(){ ponEnConmutador(); ponEnDistintivos(); ponEnPais(); }

if(typeof updateRegionUI === 'function'){
  var _uri = updateRegionUI;
  updateRegionUI = function(){ var r = _uri(); ponEnConmutador(); return r; };
}

pinta();
if(typeof render === 'function'){
  var _r = render;
  render = function(a, b){ var r = _r(a, b); requestAnimationFrame(pinta); return r; };
}
if(typeof wireCheckout === 'function'){
  var _w = wireCheckout;
  wireCheckout = function(){ var r = _w(); requestAnimationFrame(pinta); return r; };
}
addEventListener('hashchange', function(){ requestAnimationFrame(pinta); });

window.__pxBanderas = {pinta: pinta, mx: MX, us: US};

})();

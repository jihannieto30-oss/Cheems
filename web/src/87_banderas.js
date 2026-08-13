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

     · el distintivo «PEPTIDEX USA / MÉXICO» de cada catálogo y del checkout
     · el campo de país del formulario, que hasta ahora era texto plano

   El conmutador de la barra NO se toca: ahí el emoji ya funciona en el móvil,
   que es donde más se usa, y cambiarlo obligaría a rehacer su medida.
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

function pinta(){ ponEnDistintivos(); ponEnPais(); }

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

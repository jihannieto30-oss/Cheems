/* ============================================================================
   FUERA PEPX DE LA TIENDA

   PepX es otro producto. Vive en `web/pepx/`, con su propio fichero, su propio
   manifiesto y su propio trabajador de servicio. La tienda no lo anuncia, no
   lo enlaza y no lo contiene.

   POR QUÉ SE QUITA EN EJECUCIÓN Y NO SE BORRA DEL FICHERO

   Porque el fichero no se puede reconstruir. `build_restore.py` necesita
   `PEPTIDEX.base.html` y `ls_master/`, y ninguno de los dos existe ya. Dentro
   de esos 5,6 MB hay dos cosas de PepX: una puerta vieja —anterior a
   `82_door.js`, escrita directamente en el fichero base— y la aplicación
   entera embebida, de cuando PepX vivía dentro de la tienda.

   Recortar eso a mano de un HTML de 5,6 MB, sin fuente, es la clase de
   operación que sale bien nueve de cada diez veces. La décima deja la tienda
   rota y sin forma de volver atrás.

   Así que se desmonta: se quitan los enlaces cuando aparecen, se cierra la
   ruta y se tapa lo que quede. Para quien abre la web, PepX no está. Cuando
   aparezca el fichero base, esto se sustituye por el recorte de verdad y este
   fichero se borra.

   LO QUE SÍ SE CONSERVA, Y NO ES UN OLVIDO

   El retiro del trabajador de servicio viejo de `82_door.js`. Aquel trabajador
   quedó registrado en la RAÍZ, con alcance sobre todo el dominio, y mientras
   siga ahí sirve el índice de la tienda a quien pida cualquier otra cosa sin
   conexión. Eso es una avería activa en los navegadores que ya lo tienen, y
   quitar el anuncio de PepX no la cura.
   ============================================================================ */
(function(){
'use strict';

/* Todo lo que anuncia o lleva a la app. La puerta vieja usa `#/app` y
   `data-route="/app"`; la nueva, `.px-door` y `href="pepx/"`. Se cubren las
   dos porque las dos están dentro del fichero. */
var SEL = '.px-door,[data-route="/app"],a[href="#/app"],a[href="pepx/"],' +
          'a[href="/pepx/"],a[href$="/pepx/index.html"]';

function limpia(){
  var n = 0;
  document.querySelectorAll(SEL).forEach(function(a){
    if(a.parentNode){ a.parentNode.removeChild(a); n++; }
  });
  return n;
}

/* La puerta vieja y la nueva se reinyectan con un `setInterval` durante unos
   diez segundos, esperando a que la barra termine de construirse. Un
   `MutationObserver` gana esa carrera sin encuestar: cuando algo aparece, se
   quita en el mismo ciclo, antes de pintarse. */
var obs = null;
function vigila(){
  if(obs || !window.MutationObserver) return;
  obs = new MutationObserver(function(muts){
    for(var i = 0; i < muts.length; i++){
      if(muts[i].addedNodes && muts[i].addedNodes.length){ limpia(); return; }
    }
  });
  obs.observe(document.documentElement, {childList: true, subtree: true});
}

/* La ruta. Quien tenga `#/app` en un marcador aterriza en la portada, no en
   una pantalla a medias ni en un enlace a otro producto. */
function cierraRuta(){
  var r = String(location.hash || '').replace('#', '').replace(/^\//, '');
  if(r === 'app'){
    location.replace(location.pathname + location.search + '#/');
    return true;
  }
  return false;
}

/* Y lo que no sea un enlace: cualquier resto de la app embebida que el sitio
   pinte por su cuenta. Se tapa por CSS en vez de borrarse del árbol, porque el
   enrutador de la tienda cuenta con que sus contenedores existan. */
function tapa(){
  if(document.getElementById('px-sinpepx')) return;
  var st = document.createElement('style');
  st.id = 'px-sinpepx';
  st.textContent =
    '.px-door,[data-route="/app"],a[href="#/app"],a[href="pepx/"]{display:none !important}' +
    '#app,#pepx,.pepx-app,.abar{display:none !important}';
  document.head.appendChild(st);
}

cierraRuta();
addEventListener('hashchange', cierraRuta);
tapa();
limpia();
vigila();
/* Una barrida más tarde, por si algo se pinta después de que esto corra. */
addEventListener('load', limpia);

window.__pxSinPepX = {limpia: limpia};

})();

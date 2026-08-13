/* ============================================================================
   POR QUÉ A VECES LA PÁGINA SALE EN BLANCO

   Todo lo que se ve en la tienda lo dibuja JavaScript dentro de
   `<div id="app">`. Ese JavaScript es un `<script type="module">`, y lo
   primero que hace es:

       import * as THREE from 'three'

   El mapa de importación manda «three» a **unpkg.com**. GSAP y Lenis vienen
   del mismo sitio, y además como `<script src>` bloqueantes.

   Si unpkg tarda, limita peticiones o tiene un tropiezo —y lo tiene, es un CDN
   gratuito— el módulo NO LLEGA A EJECUTARSE. No hay error visible, no hay
   mensaje: `#app` se queda vacío y la página sale blanca. Al recargar
   funciona porque la segunda vez los ficheros ya están en la caché del
   navegador.

   Y hay un segundo agravante. La cabecera registra un trabajador de servicio,
   `sw.js`, que **no existe en el repositorio**. Cuando falta, el registro
   falla y no pasa nada. Pero si en algún despliegue anterior sí existió, los
   navegadores que lo registraron lo siguen teniendo, con alcance sobre TODO el
   dominio, sirviendo copias guardadas. Esa combinación —una copia vieja
   servida a un módulo que necesita red— es exactamente una pantalla en blanco
   que se arregla recargando.

   QUÉ HACE ESTE FICHERO

   Corre ANTES del módulo, que es donde tiene que estar. Si esto viviera al
   final del módulo —como el resto de las capas— no serviría de nada: cuando el
   módulo no arranca, tampoco arranca lo que hay dentro.

     1. Retira cualquier trabajador de servicio de la raíz, ya.
     2. Vigila el arranque. Si a los 6,5 s `#app` sigue vacío, recarga UNA vez.
     3. Si tras esa recarga sigue vacío, deja de recargar y muestra un aviso de
        verdad con un botón, en vez de una pantalla blanca.

   Lo que NO hace: reintentar en bucle. Una página que se recarga sola sin
   parar es peor que una que se queda quieta y lo dice.
   ============================================================================ */
(function(){
'use strict';

var MARCA = 'px-reintento';
var ESPERA = 6500;   /* ms — generoso: en 3G lenta el módulo tarda de verdad */

/* --------------------------------------------------------------------------
   1 · Fuera el trabajador de servicio de la raíz

   El de `/pepx/` es de la aplicación y no se toca: se distingue por el
   alcance, que es lo que decide de verdad qué peticiones intercepta.
   -------------------------------------------------------------------------- */
try{
  if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
    navigator.serviceWorker.getRegistrations().then(function(rs){
      for(var i = 0; i < rs.length; i++){
        var r = rs[i];
        if(r.scope && r.scope.indexOf('/pepx/') === -1){
          try{ r.unregister(); }catch(e){}
        }
      }
    }).catch(function(){});
  }
}catch(e){}

/* --------------------------------------------------------------------------
   2 · El vigilante de arranque
   -------------------------------------------------------------------------- */
function vacia(){
  var a = document.getElementById('app');
  /* Vacío de verdad: sin hijos Y sin alto. Comprobar sólo una de las dos daba
     falsos positivos con el velo de entrada, que ocupa sitio sin contenido. */
  return !a || (a.children.length === 0 && a.offsetHeight < 8);
}

function yaSeReintento(){
  try{ return sessionStorage.getItem(MARCA) === '1'; }catch(e){ return false; }
}
function marcaReintento(){
  try{ sessionStorage.setItem(MARCA, '1'); }catch(e){}
}
function limpiaMarca(){
  try{ sessionStorage.removeItem(MARCA); }catch(e){}
}

function aviso(){
  if(document.getElementById('px-caido')) return;
  var d = document.createElement('div');
  d.id = 'px-caido';
  d.setAttribute('style',
    'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
    'justify-content:center;background:#fff;padding:28px;' +
    'font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#111');
  d.innerHTML =
    '<div style="max-width:380px;text-align:center">' +
      '<div style="font-size:11px;letter-spacing:.22em;color:#8A8F98;margin-bottom:18px">PEPTIDEX</div>' +
      '<div style="font-size:19px;font-weight:600;margin-bottom:10px">La página no terminó de cargar</div>' +
      '<p style="color:#6B7078;margin:0 0 22px">Suele ser la conexión. Vuelve a intentarlo.</p>' +
      '<button id="px-reint" style="font:inherit;font-weight:600;padding:13px 26px;border:0;' +
        'border-radius:999px;background:#111;color:#fff;cursor:pointer">Reintentar</button>' +
    '</div>';
  document.body.appendChild(d);
  var b = document.getElementById('px-reint');
  if(b) b.onclick = function(){ limpiaMarca(); location.reload(); };
}

function vigila(){
  if(!vacia()){ limpiaMarca(); return; }   /* cargó bien: se olvida el intento */

  if(yaSeReintento()){
    /* Ya se recargó una vez y sigue vacía. No se insiste: se dice. */
    aviso();
    return;
  }
  marcaReintento();
  /* `location.reload()` puede servirse de la misma caché que falló. Se añade
     un parámetro que cambia para forzar una petición nueva de verdad. */
  var u = location.href.split('#')[0];
  u += (u.indexOf('?') === -1 ? '?' : '&') + 'px=' + Date.now();
  location.replace(u + (location.hash || ''));
}

/* Se cuenta desde que la ventana termina de cargar, no desde ya: si se midiera
   desde el principio, una conexión lenta pero sana contaría como caída. */
if(document.readyState === 'complete') setTimeout(vigila, ESPERA);
else addEventListener('load', function(){ setTimeout(vigila, ESPERA); });

/* Si el módulo arranca bien antes de tiempo, se cancela el aviso pendiente. */
addEventListener('px-listo', function(){ limpiaMarca(); });

window.__pxArranque = {vacia: vacia, vigila: vigila};

})();

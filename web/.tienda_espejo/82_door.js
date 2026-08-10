/* ============================================================================
   LA PUERTA — de la tienda a la app.

   PepX ya no vive aquí. Vive en /pepx/, en su propio fichero, con su propio
   manifiesto y su propio trabajador de servicio. Lo que queda en la tienda es
   un enlace, y las tres cosas que hay que hacer bien para que la separación no
   se note como una avería:

     1. El enlace SALE del sitio. Nada de data-nav: el enrutador de la tienda
        intercepta los enlaces marcados y aquí queremos una navegación de
        verdad, a otro documento.

     2. Quien tenga #/app en un marcador, o en la pantalla de inicio de su
        teléfono, aterriza en la tienda esperando la app. Se le lleva.

     3. El trabajador de servicio viejo estaba registrado en la raíz, con
        alcance sobre TODO el dominio — incluido /pepx/. Si se deja, sirve el
        índice de la tienda cuando la app pide el suyo sin conexión. Se retira,
        y con él su copia de 5,5 MB.
   ============================================================================ */
(function(){
'use strict';

const APP = 'pepx/';

/* --- 1 · el enlace ------------------------------------------------------- */
function door(){
  /* 68_catalog.js marca la barra con __px cuando termina de rehacerla. Antes
     de eso, cualquier enlace que se cuelgue aquí lo borra ella. */
  const links = document.querySelector('nav .links');
  if(links && links.__px && !links.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door'; a.href = APP;
    a.setAttribute('data-en','PepX'); a.setAttribute('data-es','PepX');
    a.innerHTML = 'PepX<span class="nw">' + t('NEW','NUEVO') + '</span>';
    links.appendChild(a);
  }
  const inner = document.querySelector('#mmenu .inner');
  if(inner && !inner.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door'; a.href = APP;
    a.setAttribute('data-en','PepX · the app'); a.setAttribute('data-es','PepX · la app');
    a.textContent = t('PepX · the app','PepX · la app');
    inner.appendChild(a);
  }
}
door();
let tries = 0;
const timer = setInterval(() => {
  door();
  const l = document.querySelector('nav .links');
  if(++tries > 40 || (l && l.querySelector('.px-door'))) clearInterval(timer);
}, 250);

/* --- 2 · los marcadores viejos ------------------------------------------- */
function bounce(){
  if(String(location.hash).replace('#','').replace('/','') === 'app'){
    location.replace(APP);
    return true;
  }
  return false;
}
if(!bounce()) addEventListener('hashchange', bounce);

/* --- 3 · el trabajador de servicio viejo --------------------------------- */
/* Sólo el de la raíz. El de /pepx/ es de la app y no se toca: se distingue
   por el alcance, que es lo que de verdad decide qué peticiones intercepta. */
if('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations){
  navigator.serviceWorker.getRegistrations().then(rs => {
    let retirado = false;
    for(const r of rs){
      if(r.scope && r.scope.indexOf('/pepx/') === -1){ r.unregister(); retirado = true; }
    }
    /* Las copias sólo se borran si de verdad había un trabajador viejo; si no,
       esto correría en todas las visitas para no encontrar nada. */
    if(retirado && window.caches && caches.keys){
      caches.keys().then(ks => ks.forEach(k => { if(/^pepx-v/.test(k)) caches.delete(k); }));
    }
  }).catch(() => {});
}

})();

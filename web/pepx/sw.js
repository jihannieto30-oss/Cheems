/* PepX — el trabajador de servicio.

   Una sola estrategia, y a propósito: la aplicación entera es UN fichero. No
   hay nada que negociar por partes, así que se guarda una copia y se sirve de
   ahí. Sin conexión abre igual, que es la mitad del sentido de instalarla.

   Red primero para el documento, copia si la red falla. Al revés —copia
   primero— la aplicación se queda congelada en la versión del día que se
   instaló y sólo se entera de que hay otra cuando alguien borra los datos.
   Así se actualiza sola en cuanto hay señal, y sigue abriendo sin ella.

   El alcance es /pepx/ y nada más. La tienda es otro producto: si algún día
   vuelve a tener trabajador, los dos conviven sin pisarse. */
const CACHE = 'pepx-app-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-512-maskable.png',
               './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  /* fuera las versiones viejas, o la memoria del teléfono se llena de PepX */
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;   /* lo de fuera, que lo lleve la red */

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      /* ?go=inj no está en la copia y nunca lo estará: se responde con el
         documento, que es lo que pedía de todas formas. */
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

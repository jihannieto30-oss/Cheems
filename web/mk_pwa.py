#!/usr/bin/env python3
"""PepX como aplicación instalable — iconos, manifiesto y trabajador de servicio.

QUÉ ES ESTO Y QUÉ NO

Esto convierte PEPTIDEX.html en una aplicación que se instala en la pantalla de
inicio del teléfono, se abre sin barra de navegador y funciona sin conexión. No
es un envoltorio nativo ni una entrada en la App Store: eso es el paso
siguiente, y está explicado en pepx-pwa/LEEME.txt.

EL ICONO SALE DEL LOGO ENTREGADO, RECORTADO

El maestro (assets/logo_master.png) es el monograma Px sobre la palabra
PEPTIDEX y su lema. A 60 px en una pantalla de inicio, la palabra y el lema son
dos manchas grises ilegibles, así que el icono lleva sólo el monograma.

Se recorta. No se redibuja, no se re-vectoriza, no se recolorea y no se
reinterpreta: se elige una región del archivo que se entregó y se coloca
centrada sobre un cuadrado blanco. Recortar es elegir; rehacer sería otra cosa.

DOS ICONOS Y NO UNO

  any        el monograma con su aire normal. Es el que usa iOS, que respeta
             el cuadrado tal cual y le pone las esquinas redondeadas él.
  maskable   el mismo, más pequeño dentro del mismo lienzo. Android recorta el
             icono con la forma que tenga el fabricante — círculo, cuadrado
             redondeado, gota— y puede llevarse hasta un 20 % de cada borde. Un
             icono sin esa reserva sale con la P mordida en medio teléfono.
"""
import json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'assets', 'logo_master.png')
OUT  = os.path.join(HERE, 'pepx-pwa')

# El monograma dentro de logo_master.png, medido sobre el propio archivo.
# (el recorte de alfa empieza en 10,10; el monograma va de 201,0 a 881,454)
PX_BOX = (10 + 201, 10 + 0, 10 + 881, 10 + 454)

VER = '1'          # súbelo y todos los teléfonos se traen la versión nueva


def icons():
    from PIL import Image
    px = Image.open(SRC).convert('RGBA').crop(PX_BOX)

    def square(size, inset):
        """El monograma centrado en un cuadrado blanco.

        `inset` es la fracción del lado que queda libre por cada lado. 0.16 es
        aire de icono normal; 0.26 es la reserva que necesita el recorte de
        Android para no comerse el trazo."""
        canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        room = int(size * (1 - inset * 2))
        w, h = px.size
        k = min(room / w, room / h)
        art = px.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
        canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
        return canvas.convert('RGB')

    made = []
    for name, size, inset in [
        ('icon-192.png',          192, .16),
        ('icon-512.png',          512, .16),
        ('icon-512-maskable.png', 512, .26),
        ('apple-touch-icon.png',  180, .14),   # iOS ya recorta poco; más aire sobra
        ('favicon-32.png',         32, .10),
    ]:
        p = os.path.join(OUT, name)
        square(size, inset).save(p, optimize=True)
        made.append((name, os.path.getsize(p)))
    return made


MANIFEST = {
    "name": "PepX — by PEPTIDEX",
    "short_name": "PepX",
    "description": "Tu registro de pautas, medidas, viales y zonas. Todo se queda en tu teléfono.",
    "id": "/?pepx",
    # Abre EN LA APP, no en la tienda: quien instala PepX quiere PepX.
    "start_url": "./index.html#/app",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#fbfbfc",
    "theme_color": "#ffffff",
    "lang": "es",
    "dir": "ltr",
    "categories": ["health", "productivity", "utilities"],
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ],
    # Atajos: mantener pulsado el icono lleva directo a una pestaña.
    "shortcuts": [
        {"name": "Hoy",         "url": "./index.html#/app", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
        {"name": "Calculadora", "url": "./index.html#/app", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]}
    ]
}


SW = '''/* PepX — el trabajador de servicio.

   Una sola estrategia, y a propósito: la aplicación entera es UN fichero. No
   hay nada que negociar por partes, así que se guarda una copia y se sirve de
   ahí. Sin conexión abre igual, que es la mitad del sentido de instalarla.

   Red primero para el documento, copia si la red falla. Al revés —copia
   primero— la aplicación se queda congelada en la versión del día que se
   instaló y sólo se entera de que hay otra cuando alguien borra los datos.
   Así se actualiza sola en cuanto hay señal, y sigue abriendo sin ella. */
const CACHE = 'pepx-v%VER%';
const SHELL = ['./index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-512-maskable.png',
               './apple-touch-icon.png'];

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
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
'''


LEEME = '''PepX en el teléfono — los tres caminos
======================================

Este directorio es el camino 1, ya hecho. Los otros dos están explicados abajo
con lo que cuestan de verdad.


1 · APLICACIÓN INSTALABLE (PWA) — hecho, gratis, hoy
----------------------------------------------------

Lo que hay en esta carpeta ya es una aplicación instalable. Se sube tal cual a
cualquier alojamiento con HTTPS —Netlify, que es donde ya está el sitio, vale—
y desde el teléfono se añade a la pantalla de inicio.

QUÉ SE SUBE

    index.html                  el sitio entero, con PepX dentro
    manifest.webmanifest        el nombre, el icono y cómo abre
    sw.js                       lo que la hace funcionar sin conexión
    icon-192.png                Android
    icon-512.png                Android
    icon-512-maskable.png       Android, con la reserva del recorte
    apple-touch-icon.png        iPhone y iPad
    favicon-32.png              la pestaña del navegador

    Los siete ficheros en la MISMA carpeta. En Netlify: arrastra la carpeta a
    app.netlify.com/drop, o ponla en el repositorio y apunta ahí el despliegue.

CÓMO SE INSTALA

    iPhone / iPad   Safari (tiene que ser Safari, no Chrome) → botón Compartir
                    → «Añadir a pantalla de inicio». Aparece el icono Px.
    Android         Chrome enseña solo un aviso de instalar. Si no sale:
                    menú ⋮ → «Instalar aplicación».

QUÉ SE CONSIGUE

    · icono propio en la pantalla de inicio
    · abre a pantalla completa, sin barra de direcciones
    · funciona sin conexión
    · se actualiza sola cuando hay señal
    · cero coste, cero revisión, cero espera

QUÉ NO

    · no sale en la App Store ni en Google Play
    · no hay avisos automáticos («te toca a las 8:00») en iPhone. En Android sí
      se pueden, en iPhone Apple sólo los permite a apps nativas.
    · no lee Apple Health ni Google Fit


2 · APLICACIÓN NATIVA CON CAPACITOR — de días, con coste
---------------------------------------------------------

Capacitor envuelve exactamente estos mismos ficheros en un proyecto iOS y otro
Android de verdad. El código no se reescribe: se empaqueta.

    npm init -y
    npm i @capacitor/core @capacitor/cli
    npx cap init PepX com.peptidex.pepx --web-dir=pepx-pwa
    npm i @capacitor/ios @capacitor/android
    npx cap add ios
    npx cap add android
    npx cap sync
    npx cap open ios        # abre Xcode   (hace falta un Mac)
    npx cap open android    # abre Android Studio

LO QUE HACE FALTA DE VERDAD

    · un Mac con Xcode para iOS. No hay forma de saltárselo.
    · Apple Developer Program — 99 USD al año
    · Google Play Console — 25 USD una vez, para siempre
    · Android Studio para Android (vale cualquier ordenador)

CON ESTO SÍ SE CONSIGUE

    · avisos en el teléfono a la hora de la dosis, también en iPhone
      (@capacitor/local-notifications)
    · Apple Health y Google Fit, para que el peso y la FCR entren solos
    · la ficha en las dos tiendas


3 · LO QUE HAY QUE RESOLVER ANTES DE MANDARLA A UNA TIENDA
-----------------------------------------------------------

Esto no es opcional y conviene leerlo antes de pagar los 99 USD.

LA CUENTA TIENE QUE VIVIR EN UN SERVIDOR

    Hoy todo está en el teléfono. Eso está bien para la PWA y es un problema en
    una tienda: el tope del plan gratuito y la suscripción viven en el
    navegador del usuario, así que cualquiera que sepa abrir la consola los
    salta. Cobrar de verdad exige una cuenta en un servidor.

    Y si se cobra dentro de una app de iPhone, Apple obliga a usar SU cobro y
    se lleva el 15–30 %. La forma habitual de evitarlo es vender la suscripción
    en la web y que la app sólo inicie sesión.

LA REVISIÓN

    PepPedia está en las dos tiendas, así que se puede. Lo que pasa la revisión
    es exactamente el encuadre que ya tiene PepX: un REGISTRO personal y una
    calculadora, no un consejo. Concretamente:

    · nada dentro de la app debe recomendar qué tomar, cuánto ni cada cuándo.
      Ya es así, y Doc.Peps está escrito para que siga siéndolo.
    · el aviso RUO tiene que estar visible. Ya está, al pie de cada pantalla.
    · desde la app de iPhone NO conviene enlazar a la compra de material de
      investigación. Eso toca dos políticas a la vez —contenido y cobro— y es
      la forma más rápida de que la rechacen. La versión de tienda debería
      salir SIN el enlace «← Tienda».
    · si algún día lee Apple Health, hay que declarar para qué y no usar esos
      datos para publicidad.

    Cuenta con dos o tres rondas de revisión. Es normal y no significa nada.


4 · EL ORDEN QUE YO SEGUIRÍA
-----------------------------

    1. subir esta carpeta y ponerla en el teléfono hoy — sale gratis y sirve
       para ver qué se rompe con uso real
    2. separar PepX en su propio fichero (hoy son 5,5 MB porque lleva la tienda
       entera dentro; la app sola son unos 300 KB)
    3. montar la cuenta en un servidor, que es lo que desbloquea cobrar
    4. y entonces Capacitor y las tiendas

    Los pasos 1 y 2 no dependen de nadie. El 3 es el que cuesta trabajo de
    verdad, y el 4 es casi mecánico una vez está el 3.
'''


def main():
    os.makedirs(OUT, exist_ok=True)

    made = icons()

    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(SW.replace('%VER%', VER))

    with open(os.path.join(OUT, 'LEEME.txt'), 'w', encoding='utf-8') as f:
        f.write(LEEME)

    # el sitio construido, con el nombre que espera el manifiesto
    built = os.path.join(HERE, 'PEPTIDEX.html')
    if os.path.exists(built):
        shutil.copyfile(built, os.path.join(OUT, 'index.html'))
        print('  index.html      %.1f KB' % (os.path.getsize(built) / 1024))
    else:
        print('  index.html      FALTA — corre antes build_restore.py')

    for n, s in made:
        print('  %-24s %5.1f KB' % (n, s / 1024))
    print('  manifest.webmanifest')
    print('  sw.js')
    print('\n  %s' % OUT)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""PepX — la aplicación, en su propio fichero.

POR QUÉ ESTE SCRIPT EXISTE

Hasta ahora la app vivía dentro de PEPTIDEX.html. Compartía documento con la
tienda, y eso costaba tres cosas:

  · 5,5 MB de arranque para abrir una pantalla que pesa 200 KB. Quien instalaba
    PepX en el teléfono se traía el catálogo entero, las plumas, los viales y
    el escenario de Three.js para mirar cuándo le toca la siguiente dosis.
  · un cortafuegos de especificidad —una regla de reset sobre trece selectores
    de elemento— escrito sólo para que las clases de la app no chocaran con las
    de la tienda. Veintiséis colisiones cerradas de golpe, sí, pero el
    problema no debía existir.
  · imposible de envolver en Capacitor sin arrastrar la tienda dentro del
    paquete de la App Store.

Ahora son dos productos. La tienda enlaza a /pepx/ y nada más (src/82_door.js).

QUÉ ENSAMBLA

    app/shell.html          el esqueleto, con el tema aplicado en el <head>
    app/app.css             el sistema visual de los dos PDF de referencia
    app/app.js              la aplicación
    assets/library.json     los 60 compuestos del libro de operación

    →  pepx/index.html      un fichero, sin peticiones de red

Y junto a él lo que lo hace instalable: manifiesto, trabajador de servicio e
iconos. Tienen que ser ficheros de verdad: un data: URI vale en Chrome para el
manifiesto, no vale en Safari, y para el trabajador no vale en ninguno.

EL ICONO ES UN RECORTE, NO UN DIBUJO

Sale de assets/logo_master.png. Se elige la región del monograma Px y se centra
sobre blanco. No se redibuja, no se re-vectoriza, no se recolorea y no se
reinterpreta. A 60 px en una pantalla de inicio la palabra PEPTIDEX y el lema
son dos manchas grises, así que el icono lleva sólo el monograma — que es
además lo que se pidió para la portada de la app.
"""
import json, os

HERE   = os.path.dirname(os.path.abspath(__file__))
APPDIR = os.path.join(HERE, 'app')
OUT    = os.path.join(HERE, 'pepx')
LOGO   = os.path.join(HERE, 'assets', 'logo_master.png')
LIBSRC = os.path.join(HERE, 'assets', 'library.json')

# El monograma dentro de logo_master.png, medido sobre el propio archivo.
# (el recorte de alfa empieza en 10,10; el monograma va de 201,0 a 881,454)
PX_BOX = (10 + 201, 10 + 0, 10 + 881, 10 + 454)

VER = '3'          # súbelo y todos los teléfonos se traen la versión nueva


def rd(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------------------
# 1 · el documento
# ---------------------------------------------------------------------------
def bundle():
    shell = rd(os.path.join(APPDIR, 'shell.html'))
    css   = rd(os.path.join(APPDIR, 'app.css'))
    js    = rd(os.path.join(APPDIR, 'app.js'))
    lib   = rd(LIBSRC) if os.path.exists(LIBSRC) else '[]'

    # Un `</script>` dentro de una cadena de JavaScript cierra la etiqueta que
    # lo contiene: el analizador de HTML no sabe que está dentro de comillas.
    # Hoy no hay ninguno; si algún día lo hay, que falle aquí y no en silencio
    # en el navegador de alguien.
    for nombre, texto, mal in (('app.js', js, '</script'), ('app.css', css, '</style'),
                               ('library.json', lib, '</script')):
        if mal in texto:
            raise SystemExit('%s contiene %s — rompería el documento' % (nombre, mal))

    n = json.loads(lib)
    doc = (shell
           .replace('/*__CSS__*/', css)
           .replace('/*__LIB__*/', 'const PX_LIB = ' + lib + ';')
           .replace('/*__JS__*/',  js))
    if '/*__CSS__*/' in doc or '/*__JS__*/' in doc or '/*__LIB__*/' in doc:
        raise SystemExit('shell.html no tiene los tres huecos')

    print('  app.css          %6.1f KB' % (len(css.encode()) / 1024))
    print('  app.js           %6.1f KB' % (len(js.encode()) / 1024))
    print('  library.json     %6.1f KB   %d compuestos' % (len(lib.encode()) / 1024, len(n)))
    return doc


# ---------------------------------------------------------------------------
# 2 · los iconos
# ---------------------------------------------------------------------------
def icons():
    from PIL import Image
    px = Image.open(LOGO).convert('RGBA').crop(PX_BOX)

    def square(size, inset):
        """El monograma centrado en un cuadrado blanco.

        `inset` es la fracción del lado que queda libre por cada lado. 0.16 es
        aire de icono normal; 0.26 es la reserva que necesita el recorte de
        Android —círculo, cuadrado redondeado, gota, según el fabricante— para
        no comerse el trazo."""
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
        ('apple-touch-icon.png',  180, .14),   # iOS recorta poco; más aire sobra
        ('favicon-32.png',         32, .10),
    ]:
        p = os.path.join(OUT, name)
        square(size, inset).save(p, optimize=True)
        made.append((name, os.path.getsize(p)))
    return made


# ---------------------------------------------------------------------------
# 3 · el manifiesto
# ---------------------------------------------------------------------------
MANIFEST = {
    "name": "PepX — by PEPTIDEX",
    "short_name": "PepX",
    "description": "Protocolos, compuestos, inyecciones y progreso. "
                   "Todo se queda en tu teléfono. Solo uso en investigación.",
    "id": "/pepx/",
    # La app abre en la app. Ya no hay que atravesar la tienda para llegar.
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    # Claro de fábrica, como se pidió. Es el color de la pantalla de arranque
    # del sistema, así que tiene que coincidir con el fondo real del tema claro.
    "background_color": "#FFFFFF",
    "theme_color": "#FFFFFF",
    "lang": "es",
    "dir": "ltr",
    "categories": ["health", "productivity", "utilities"],
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icon-512-maskable.png", "sizes": "512x512", "type": "image/png",
         "purpose": "maskable"}
    ],
    # Mantener pulsado el icono lleva directo a una pantalla. app.js lee ?go=.
    "shortcuts": [
        {"name": "Registrar inyección", "short_name": "Registrar", "url": "./?go=inj",
         "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
        {"name": "Calculadora", "short_name": "Calcular", "url": "./?go=lib",
         "icons": [{"src": "icon-192.png", "sizes": "192x192"}]}
    ]
}


# ---------------------------------------------------------------------------
# 4 · el trabajador de servicio
# ---------------------------------------------------------------------------
SW = '''/* PepX — el trabajador de servicio.

   Una sola estrategia, y a propósito: la aplicación entera es UN fichero. No
   hay nada que negociar por partes, así que se guarda una copia y se sirve de
   ahí. Sin conexión abre igual, que es la mitad del sentido de instalarla.

   Red primero para el documento, copia si la red falla. Al revés —copia
   primero— la aplicación se queda congelada en la versión del día que se
   instaló y sólo se entera de que hay otra cuando alguien borra los datos.
   Así se actualiza sola en cuanto hay señal, y sigue abriendo sin ella.

   El alcance es /pepx/ y nada más. La tienda es otro producto: si algún día
   vuelve a tener trabajador, los dos conviven sin pisarse. */
const CACHE = 'pepx-app-v%VER%';
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
'''


LEEME = '''PepX en el teléfono
===================

Esta carpeta ES la aplicación. Ya no es la tienda con la app dentro: son dos
productos separados, y esto pesa unos 200 KB en vez de 5,5 MB.


1 · APLICACIÓN INSTALABLE (PWA) — hecho, gratis, hoy
----------------------------------------------------

Se sube tal cual a cualquier alojamiento con HTTPS —Netlify, que es donde ya
está el sitio, vale— y desde el teléfono se añade a la pantalla de inicio.

QUÉ SE SUBE

    index.html                  la aplicación entera, un fichero
    manifest.webmanifest        el nombre, el icono y cómo abre
    sw.js                       lo que la hace funcionar sin conexión
    icon-192.png                Android
    icon-512.png                Android
    icon-512-maskable.png       Android, con la reserva del recorte
    apple-touch-icon.png        iPhone y iPad
    favicon-32.png              la pestaña del navegador

    Los ocho ficheros en la MISMA carpeta, y esa carpeta se llama pepx/ colgando
    de la raíz del sitio. El enlace «PepX» de la tienda apunta ahí.

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
    · atajos: mantener pulsado el icono → Registrar inyección / Calculadora
    · cero coste, cero revisión, cero espera

QUÉ NO

    · no sale en la App Store ni en Google Play
    · no hay avisos automáticos («te toca a las 8:00») en iPhone. En Android sí
      se pueden, en iPhone Apple sólo los permite a apps nativas.
    · no lee Apple Health ni Google Fit


2 · APLICACIÓN NATIVA CON CAPACITOR — de días, con coste
---------------------------------------------------------

Capacitor envuelve exactamente estos ficheros en un proyecto iOS y otro Android
de verdad. El código no se reescribe: se empaqueta. Y ahora que la app está
separada, lo que se empaqueta es la app — no el catálogo de la tienda dentro
del paquete de la App Store, que era el problema.

    npm init -y
    npm i @capacitor/core @capacitor/cli
    npx cap init PepX com.peptidex.pepx --web-dir=web/pepx
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

    Lo que pasa la revisión es exactamente el encuadre que ya tiene PepX: un
    REGISTRO personal y una calculadora, no un consejo. Concretamente:

    · nada dentro de la app debe recomendar qué tomar, cuánto ni cada cuándo.
      Ya es así, y Doc.Peps está escrito para que siga siéndolo.
    · el aviso RUO tiene que estar visible. Ya está, al pie de cada pantalla.
    · desde la app de iPhone NO conviene enlazar a la compra de material de
      investigación. Eso toca dos políticas a la vez —contenido y cobro— y es
      la forma más rápida de que la rechacen. La versión de tienda debería
      salir SIN el enlace «← Tienda»; está en un solo sitio, en app.js.
    · si algún día lee Apple Health, hay que declarar para qué y no usar esos
      datos para publicidad.

    Cuenta con dos o tres rondas de revisión. Es normal y no significa nada.


4 · EL ORDEN QUE YO SEGUIRÍA
-----------------------------

    1. subir esta carpeta y ponerla en el teléfono — gratis, y sirve para ver
       qué se rompe con uso real                                        HECHO
    2. separar PepX en su propio fichero                                HECHO
    3. montar la cuenta en un servidor, que es lo que desbloquea cobrar
    4. y entonces Capacitor y las tiendas

    El 3 es el que cuesta trabajo de verdad, y el 4 es casi mecánico una vez
    está el 3.
'''


def main():
    os.makedirs(OUT, exist_ok=True)

    doc = bundle()
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(doc)

    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(SW.replace('%VER%', VER))

    with open(os.path.join(OUT, 'LEEME.txt'), 'w', encoding='utf-8') as f:
        f.write(LEEME)

    print()
    for n, s in icons():
        print('  %-24s %5.1f KB' % (n, s / 1024))
    print('  manifest.webmanifest')
    print('  sw.js')
    print('\n  pepx/index.html  %6.1f KB' % (len(doc.encode()) / 1024))


if __name__ == '__main__':
    main()

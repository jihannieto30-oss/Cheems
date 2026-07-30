# PEPTIDEX · Documentos

Tres documentos, un archivo cada uno, sin dependencias externas: se abren con
doble clic y funcionan sin internet.

| Archivo | Qué es |
|---|---|
| `PEPTIDEX_Fichas_Tecnicas.html` | Ficha técnica editable de los **56 compuestos** / **118 presentaciones** |
| `PEPTIDEX_Fichas_Tecnicas.pdf` | Las 56 fichas impresas — **una por página** |
| `PEPTIDEX_Protocolos.html` | Editor de **PROTOCOLO** — el documento que se llena por cliente |
| `PEPTIDEX_Etiquetas_Niimbot.html` | Etiquetas de vial para la **Niimbot M2** — 50×30 y 40×20 mm |
| `PEPTIDEX_Testeo_Peptidos.pdf` | Manual de **cómo se testea un péptido** — 32 páginas |
| `PEPTIDEX_Testeo_Peptidos.html` | El mismo manual, como página web |

---

## Fichas técnicas

La maqueta es la aprobada de PEPTIDEX, la del `Ficha_Tecnica_WS`: logo maestro,
FICHA TÉCNICA, nombre, sello RUO, tira de línea con su logo, y seis secciones
numeradas sobre barra azul.

```
1  DESCRIPCIÓN GENERAL
2  COMPOSICIÓN / CONTENIDO QUÍMICO
3  APLICACIONES Y BENEFICIOS EN USO HUMANO
4  DOSIS Y FRECUENCIA DE USO      ← en blanco, la llenas tú
5  RECOMENDACIONES
6  EFECTOS SECUNDARIOS Y RIESGOS
```

Y el aviso legal en inglés al pie, palabra por palabra el del documento.

**Todo es editable.** Los 31 campos de cada ficha: el nombre, el subtítulo, la
tira de línea, los seis títulos de sección, los ocho rótulos y los ocho valores
de la tabla de composición, las cuatro listas de viñetas y el aviso legal. Se
hace clic sobre el texto y se escribe. En reposo no se ve ni una caja: la ficha
se lee como el impreso, y el subrayado sólo aparece al pasar por encima.

**La sección 4 sale vacía a propósito.** Es la única que el generador no
rellena, porque la pauta la pones tú. El recuadro punteado es el hueco.

`Esc` dentro de un campo lo devuelve a su valor original sin tocar el resto.
Cada ficha tiene **Restaurar** y **Eliminar**; arriba están **＋ Ficha**,
**Exportar**, **Importar** y **Restaurar todo**. Se guarda solo en el navegador;
para llevarlo a otra máquina, Exportar.

**Los logos son los tuyos**, embebidos tal cual: el maestro en cada cabecera y
el de línea en la tira. No se recortan, no se recolorean, no se reconstruyen.

### Código de documento

Cada ficha lleva arriba a la izquierda su código y su revisión —
`PX-FT-01-BC · Rev. 01`. El código junta el ordinal con el código de compuesto
del catálogo, que es lo que permite casar la ficha con el SKU sin leerla. Se
busca por él desde la barra, y como todo lo demás, es editable.

### Acceso

El archivo pide correo y contraseña — **las mismas del facturador**, y con los
**mismos hashes**: dentro del HTML sólo viajan dos SHA-256, así que ni el correo
ni la contraseña aparecen nunca en texto claro. Compartir los dos hashes entre
los dos archivos también evita que las credenciales se desincronicen.

Imprimir con el candado echado no saca nada: la primera versión dejaba pasar
`Ctrl+P`, que habría hecho inútil la puerta.

> **Qué protege esto y qué no.** Impide que alguien que reciba el archivo por
> error lo abra y lea el catálogo. **No** protege el contenido de quien esté
> decidido: el documento entero viaja dentro del propio HTML, y un SHA-256 en el
> navegador es una puerta, no una caja fuerte. Para eso habría que cifrar el
> contenido con una clave derivada de la contraseña — se puede hacer, si hace
> falta.

### Impresión

**Una ficha por página, las 56 en 56 páginas.** Tres cosas hacen que eso salga
bien y ninguna es evidente:

- La hoja Carta con márgenes mide unos 732 px de CSS, por debajo del punto de
  ruptura de móvil. Sin forzarlo, el papel heredaría la disposición de teléfono
  y la tabla de composición se desmontaría en bloques apilados.
- Un `textarea` se imprime con la altura que midió en pantalla, y la hoja es más
  estrecha que la ventana: el texto reflúe a más líneas y el sobrante se pierde
  bajo `overflow:hidden`. Por eso cada campo lleva al lado un `div` gemelo con
  el mismo texto, oculto en pantalla y visible en el papel.
- Diez de las 56 llevan bastante más texto que el resto. `fit()` las mide en
  `beforeprint` y les baja el cuerpo un escalón —o dos si con uno no basta—
  para que quepan. Cede la tipografía, no la estructura: márgenes, barra y
  tabla no se tocan.

## Protocolo

Misma casa que la ficha técnica: logo maestro, PROTOCOLO, sello RUO, secciones
numeradas sobre barra azul y el aviso regulatorio al pie. Los dos documentos
salen del mismo cliente y no deberían parecer de dos empresas.

```
1  DATOS DEL CLIENTE          nombre · folio · fecha · contacto
2  COMPUESTOS DEL PROTOCOLO   dosis · frecuencia · vía · duración
                              recomendaciones · beneficios
3  RECOMENDACIONES GENERALES
4  ALMACENAMIENTO Y MANEJO
5  SEGUIMIENTO Y REVISIÓN
6  NOTAS
7  DISCLOSURE
```

Luego las firmas y el aviso regulatorio en inglés, el mismo de la ficha.

> **No hay campo «Preparado por».** Se retiró a propósito. Nombra a una persona
> en un documento que lleva dosis, y ésa es exactamente la firma que no conviene
> que exista. El disclosure hace el trabajo contrario: deja por escrito que la
> pauta la fija quien recibe el material, no PEPTIDEX.
>
> La línea de firma **PEPTIDEX** al pie es de la misma familia — una
> contrafirma sobre un documento con dosis. Se dejó porque quitarla no se pidió,
> pero conviene decidirlo.

**Todo es editable**, igual que en las fichas: el título, los siete rótulos de
sección, los cuatro rótulos de los datos del cliente, los seis campos de cada
compuesto, las cuatro listas, el disclosure y el aviso legal. Se hace clic sobre
el texto y se escribe; en reposo la hoja se lee como el impreso.

Todo llega **en blanco** salvo el disclosure y el aviso regulatorio, que son
texto legal fijo y deben ser idénticos en todos los protocolos. Siguen siendo
editables.

Las 118 presentaciones están en el buscador de la barra: teclear, `↑`/`↓`,
`Enter`. Cada compuesto abre su bloque con la tinta de su línea.

### Registro de clientes

El protocolo dejó de ser un documento suelto y pasó a ser un expediente.
**Guardar** lo archiva bajo el nombre del cliente; **Registro** abre la lista.

Cada cliente aparece con folio, fecha, número de compuestos y cuándo se tocó
por última vez, y se puede buscar por nombre, folio o compuesto. Desde ahí:
**Abrir** —vuelve tal como se dejó—, **Duplicar** —para el cliente que repite
con una variación— y **Eliminar**.

Guardar dos veces el mismo cliente **no** crea un duplicado. El documento
abierto lleva un identificador interno: si salió del registro, Guardar lo
actualiza; si nació en blanco, se le asigna uno la primera vez. Sin eso, cada
Guardar habría creado un cliente nuevo.

El registro vive **en este navegador**: no hay servidor detrás. Por eso
**Exportar registro** no es un adorno — es la única copia que sobrevive a un
formateo. **Importar registro** fusiona por identificador en lugar de
reemplazar, así que traer el registro de otra máquina no borra los clientes de
ésta; de los que coinciden se queda el más reciente.

Las secciones que queden vacías se imprimen con renglón: la hoja sirve también
para rellenarla a mano.

El mismo módulo va montado dentro del facturador como pestaña **Protocolo**,
generado de la misma fuente — mantenerlos por separado los haría divergir en la
primera corrección.

> **El facturador no está en el repositorio.** Lleva la configuración de
> Supabase embebida en el HTML, y el campo `anonKey` contiene una clave con
> prefijo `sb_secret_`: una clave de servicio, no la publicable. Una clave de
> servicio se salta Row Level Security por completo, así que cualquiera que
> abra el archivo tiene lectura y escritura sobre toda la base de datos. La
> protección de secretos de GitHub bloquea el push, y hace bien. El archivo se
> entrega por fuera del repositorio hasta que esa clave se rote y se sustituya
> por `sb_publishable_`, que ya está en el mismo objeto y es la que corresponde
> a código que corre en un navegador. Ver `docs/.gitignore`.

## Etiquetas · Niimbot M2

Las 118 presentaciones en 50 × 30 mm y 40 × 20 mm, todo editable, con hueco
para QR.

### Por qué salían sucias

Una térmica **no imprime gris**. Cada punto del cabezal quema o no quema: es un
bitmap de un bit. Cuando se le manda un diseño con degradados, sombras o un
logo metálico, el driver no tiene más remedio que **tramarlo** — cambiar cada
gris por una nube de puntos negros y blancos. Esa nube, a 300 dpi y mirada de
cerca sobre un vial, es exactamente lo que se ve como suciedad.

El segundo problema es la escala. Un diseño hecho en una hoja y reescalado al
tamaño de etiqueta se remuestrea, y remuestrear un bitmap de un bit lo destroza:
los bordes se deshilachan y las líneas finas desaparecen o se parten.

### Qué hace este archivo distinto

La etiqueta **no** se diseña en CSS y luego se convierte. Se dibuja directamente
sobre un canvas del tamaño exacto en puntos de impresora — **591 × 354 px** para
50 × 30 mm y **472 × 236 px** para 40 × 20 mm — y se umbraliza a blanco y negro
puro antes de mostrarla. Lo que se ve en pantalla **es** el bitmap que sale del
cabezal, punto por punto, sin un solo reescalado por el camino. Comprobado: el
canvas contiene exactamente dos valores, 0 y 255.

Las reglas que aplica el dibujo, todas medidas a 300 dpi (11.811 px/mm):

- Filete mínimo **3 px** (0.25 mm). Por debajo, el punto de la térmica se
  ensancha y la línea sale irregular.
- Texto mínimo **17 px** (~1.4 mm) y siempre en negrita: a un bit, una fuente
  fina pierde la mitad de los trazos.
- **Nada de texto pequeño en negativo.** La tinta térmica se expande al quemar
  y los contornos se cierran; en negativo eso borra las letras. El negativo se
  reserva para la dosis, que va grande.
- QR con módulo entre **4 y 8 px** y zona de silencio de 4 módulos. Por debajo
  de 4 px no lo lee un teléfono; el módulo se redondea a entero porque uno
  fraccionario reparte medio píxel entre dos celdas y el lector pierde la
  retícula.
- El QR nunca pasa de un tercio del ancho. Por encima de eso el nombre del
  compuesto se queda sin sitio y hay que encogerlo hasta que no se lee.

El QR trae por defecto sólo el SKU (`PX:BC5`). Son seis caracteres, que caben
en un QR de versión 1 — 21 módulos. Con la frase completa hacían falta 25
módulos y el código crecía un 40 % sin identificar mejor la presentación. Se
puede poner lo que se quiera; si crece, el archivo avisa.

### Los logos

Salen del PDF de las tres líneas, umbralizados a **1 bit puro** con el corte
medido en 235 — el valor que separa la tinta del papel sin abrir agujeros
dentro del PX. Son los mismos iconos aprobados: el hexágono de Fitness, el
rostro de Beauty, el infinito de Longevity. No se han redibujado.

### Cómo imprimir

1. Elige el compuesto y ajusta lo que quieras.
2. **Exportar PNG**. Ya viene al tamaño exacto en puntos.
3. En la app de Niimbot: nueva etiqueta, fija el tamaño del papel, **Imagen**,
   y elige el PNG.
4. Colócalo **al 100 %**, ocupando la etiqueta entera. No lo estires ni lo
   ajustes «a pantalla»: cualquier reescalado devuelve el problema del
   principio.
5. Densidad media-alta. Si el negro sale gris, sube; si los textos pequeños se
   cierran, baja.

**Exportar las 118** descarga todas de golpe, una por presentación, espaciadas
220 ms — lanzarlas en el mismo tick hace que el navegador se quede con las
primeras y descarte el resto sin avisar.

Mismo candado que las fichas, y los mismos hashes.

## Manual de testeo

32 páginas sobre instrumentos, métodos y **lectura de resultados**. Responde
tres preguntas por ensayo, siempre en el mismo orden: qué mide, con qué máquina
y **cómo se lee**. La tercera es la que suele faltar y la única que sirve
cuando uno tiene el certificado delante.

Cubre identidad (LC-MS, MALDI, MS/MS, análisis de aminoácidos, quiralidad),
pureza (RP-HPLC, ortogonalidad, el mapa completo de impurezas de síntesis con
su firma de masa), contenido y balance de masa, contraiones, agua por Karl
Fischer, solventes residuales, endotoxinas, esterilidad, impurezas elementales,
estructura y agregación.

Tres secciones son las que se usan a diario: **cómo se lee un cromatograma**
(los cinco números y las cinco formas de que mienta sin falsificar nada),
**cómo se lee un espectro de masas** (deconvolución paso a paso y la tabla de
desplazamientos: +16 oxidación, +22 sodio, +114 aducto de TFA…), y **cómo se
lee un CoA** (veinte puntos y las banderas rojas).

La sección 12 baja todo eso al catálogo: qué ensayo adicional necesita cada
compuesto y por qué. GHK-Cu necesita cobre por ICP; FOXO4-DRI necesita ensayo
quiral porque la masa no distingue D de L; Thymalin no se puede verificar por
masa porque es un extracto.

Las dos figuras **se calculan, no son capturas**: el cromatograma es una suma
de picos gaussianos con cola exponencial y el espectro es una envolvente de
estados de carga sobre 22 124 Da. Los números anotados encima son exactamente
los que produjeron la curva.

---

## Reconstruir

```bash
cd docs/src
python3 build_fichas.py          # → ../PEPTIDEX_Fichas_Tecnicas.html
python3 build_protocolo.py       # → ../PEPTIDEX_Protocolos.html + ../PEPTIDEX_Facturador.html
python3 build_handbook.py        # → ../PEPTIDEX_Testeo_Peptidos.html
python3 build_etiquetas.py       # → ../PEPTIDEX_Etiquetas_Niimbot.html
```

Los PDF se sacan del HTML con Chromium (`page.pdf`, Letter, `printBackground`).
Para las fichas hay que fijar el viewport a **732 px de ancho** antes de llamar
a `PX_FIT()`: es el ancho real de la caja de texto en Carta, y medir a otro
ancho da un autoajuste equivocado.

### Fuentes

```
src/pepdata_a.py   FITNESS  — 30 compuestos
src/pepdata_b.py   BEAUTY 12 + LONGEVITY 14
src/build_fichas.py
src/build_protocolo.py            el módulo, montado dos veces
src/hb_figs.py                    las figuras, calculadas
src/build_handbook.py
src/build_etiquetas.py            etiquetas Niimbot M2
src/assets/tlogos.json            logos de marca en base64
src/assets/nb_logos.json          los mismos, a 1 bit puro para térmica
src/assets/sha256.js              la implementación del facturador, compartida
```

El catálogo no se duplica: se lee de `label-studio/src/catalog.json`, que sigue
siendo la única fuente de los 118 SKU.

`build_protocolo.py` genera el editor suelto siempre, y además injerta el
módulo en el facturador si encuentra `src/PEPTIDEX_Facturador.base.html`. Ese
archivo no está versionado (ver arriba): sin él, el paso del facturador se
salta y el resto funciona igual.

Lee **siempre** de la base y escribe **siempre** en la salida, nunca al revés:
injertar sobre lo ya injertado apilaría copias del módulo. Reconstruir es
idempotente por construcción — se puede correr las veces que haga falta.

---

**Research Use Only.** Los materiales descritos se suministran exclusivamente
para investigación de laboratorio. No son medicamentos, no están destinados a
diagnóstico ni tratamiento, y no son para consumo humano ni animal. Cuando una
ficha menciona una aprobación regulatoria se refiere al producto del innovador
— el material de investigación no es ese producto.

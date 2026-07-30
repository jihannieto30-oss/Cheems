# PEPTIDEX · Documentos

Tres documentos, un archivo cada uno, sin dependencias externas: se abren con
doble clic y funcionan sin internet.

| Archivo | Qué es |
|---|---|
| `PEPTIDEX_Fichas_Tecnicas.html` | Ficha técnica editable de los **56 compuestos** / **118 presentaciones** |
| `PEPTIDEX_Fichas_Tecnicas.pdf` | Las 56 fichas impresas — **una por página** |
| `PEPTIDEX_Protocolos.html` | Editor de **PROTOCOLO** — el documento que se llena por cliente |
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
`Enter`. Cada compuesto abre su bloque con la tinta de su línea. Botones
**＋ Nuevo**, **Exportar**, **Importar**, **Vaciar** e **Imprimir / PDF**. Se
guarda solo en el navegador; para llevarlo a otra máquina, Exportar.

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
src/assets/tlogos.json            logos de marca en base64
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

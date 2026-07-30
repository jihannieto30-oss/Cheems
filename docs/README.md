# PEPTIDEX · Documentos

Tres documentos, un archivo cada uno, sin dependencias externas: se abren con
doble clic y funcionan sin internet.

| Archivo | Qué es |
|---|---|
| `PEPTIDEX_Fichas_Tecnicas.html` | Ficha técnica de los **56 compuestos** / **118 presentaciones** del catálogo |
| `PEPTIDEX_Protocolos.html` | Editor de **PROTOCOLO** — el documento que se llena por cliente |
| `PEPTIDEX_Testeo_Peptidos.pdf` | Manual de **cómo se testea un péptido** — 32 páginas |
| `PEPTIDEX_Testeo_Peptidos.html` | El mismo manual, como página web |

---

## Fichas técnicas

Un vademécum. Índice fijo a la izquierda que filtra en vivo, columna de fichas
a la derecha, búsqueda por nombre, sinónimo, clase o SKU (`Ctrl/Cmd+K`), filtro
por línea, e impresión a una ficha por página.

Las 56 fichas tienen **exactamente la misma estructura**, aunque sobre algunos
compuestos haya diez veces más que decir que sobre otros: un documento técnico
se consulta comparando, y comparar exige que el dato esté siempre en el mismo
sitio.

Cada ficha lleva identidad química (CAS, fórmula, masa, secuencia, residuos),
para qué es, **qué contiene realmente el vial**, mecanismo, hallazgos de
investigación —con la especie o el tipo de estudio entre paréntesis, porque la
diferencia entre un resultado en roedor y uno en humano es el dato más
importante de la ficha—, vida media, reconstitución, almacenamiento,
estabilidad química, manejo y advertencias.

**Donde no hay dato, la ficha imprime «sin registro público».** El hueco
declarado es información; el hueco rellenado es un riesgo. Los compuestos sin
CAS consolidado (Adamax, Cartalax, Thymalin y las mezclas) lo dicen en su
propia ficha.

Las dosis **no** aparecen, deliberadamente: el documento describe compuestos,
no pautas de administración.

## Protocolo

El documento **es** el editor. No hay formulario a un lado y vista previa al
otro: se escribe directamente sobre la hoja, en los huecos que están debajo de
cada título, y lo que se ve en pantalla es lo que sale impreso.

Títulos: nombre del cliente, folio, fecha, preparado por; por cada compuesto
—**dosis, duración, recomendaciones, beneficios**—; notas generales; disclosure;
firmas.

Todo llega en blanco salvo el **disclosure en inglés**, que viene redactado
porque es texto legal fijo que debe ser idéntico en todos los protocolos. Sigue
siendo editable.

Las 118 presentaciones están cargadas en el buscador de la barra superior:
teclear, `↑`/`↓`, `Enter`. Cada compuesto añadido abre su propio bloque con la
tinta de su línea. Se guarda solo en el navegador.

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

El PDF se saca del HTML con Chromium (`page.pdf`, Letter, márgenes 14/16/12 mm,
`printBackground`).

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

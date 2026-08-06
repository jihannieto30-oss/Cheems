# PEPTIDEX · PepX — Dirección de diseño

**Quién manda aquí.**

Los dos PDF entregados. No una interpretación de los dos PDF entregados.

    PEPTIDEX_App_Light_Dark_Mode_UI_Design.pdf   →  el teléfono
    PEPTIDEX_Web_App_UI_UX_Design.pdf            →  el escritorio

Todo lo que sigue está copiado de ahí o deducido de ahí. Cuando una decisión no
esté en las referencias, se dice que no está.

---

## Nota sobre la versión anterior

Hubo una fase intermedia en la que esta app se rediseñó siguiendo una dirección
propia —«FOIL»— construida sobre el acabado metálico de las etiquetas: sin
color, jerarquía por luz, titulares editoriales grandes, composiciones partidas.

Estaba bien argumentada y no era lo que se había pedido. Las referencias
entregadas enseñan otra cosa: cabeceras de navegación centradas, tarjetas de
16 px, rótulos de sección en versalitas, tiras de semana, casillas de acceso
rápido. Una dirección propia por encima de una referencia entregada no es
dirección de arte — es no haber leído el encargo.

Se ha vuelto a las referencias. Lo único que sobrevive de aquella fase es lo que
también estaba en los PDF: monocromo, el producto real en vez de dibujos, y la
regla de no tocar el arte entregado.

---

## El sistema, como lo dice la referencia

### Color

| | claro | oscuro |
|---|---|---|
| fondo | `#FFFFFF` | `#0D0D0D` |
| tarjeta | `#FFFFFF` | `#1A1A1A` |
| texto | `#111111` | `#FFFFFF` |
| gris de texto | `#6B6B6B` | `#A0A0A0` |
| superficie / filete | `#F5F5F5` | `#2A2A2A` |
| acento | negro | blanco |

**El acento es el negro.** No hay más color en la interfaz. Los tres acentos de
línea (`--fitness`, `--beauty`, `--longevity`) existen en los tokens y se usan
muy sujetos: distintivo de familia y poco más. Nunca fondo, nunca texto.

### Tipografía

Inter / SF Pro, la del sistema. Dos registros y nada en medio:

- **versalitas diminutas y muy abiertas** para rotular — 11 px, `.1em`
- **cifra o titular cerrado** para el dato — 27–29 px, `-.03em`

El rango intermedio es lo que hace que una interfaz parezca un formulario.

### Radios

tarjeta 16 · campo 12 · casilla 14 · pastilla 999

---

## Las piezas que hay que respetar

**La cabecera de pantalla.** Flecha de volver · título centrado en versalitas
abiertas · acción a la derecha. Las cinco pantallas de la referencia llevan
exactamente esta barra, y esa repetición es lo que la hace navegación y no
decoración. En escritorio se descentra y crece, porque allí la lateral ya dice
dónde estás.

**El rótulo de sección va fuera de la tarjeta.** `MIS PROTOCOLOS ····· Ver todo`,
y debajo el contenido. Ese ritmo —rótulo, contenido, aire— es lo que hace que la
pantalla se recorra sin leerla.

**Dos familias de pastilla, y se distinguen.**
`.seg` (Activos / Completados / Borradores) marca el elegido con un **marco**.
`.chips` (Todos / Rendimiento / …) lo marca en **sólido**.

**La tarjeta de protocolo.** Nombre · distintivo · fase y semana · fila de
viales con su nombre debajo · filete · próxima inyección con la flecha. Cuatro
cosas y en ese orden.

**La tira de semana.** DOM…SÁB con la cifra debajo y el día elegido en círculo
sólido.

**Las cuatro casillas de acceso rápido.** Icono lineal arriba, rótulo abajo.

**La palomita.** Círculo con trazo, no una casilla cuadrada.

**La rejilla del escritorio.** El PDF web no es la pantalla del móvil estirada:
progreso ancho con la próxima inyección al lado (8/4), y debajo tres columnas
desiguales — protocolos, gráfica, accesos (5/4/3).

---

## Lo que esta dirección prohíbe

- **Ni un color en la interfaz.** Ni un icono de color, ni un borde de color, ni
  un estado en color.
- **Nada de banco de imágenes.** Ni ADN, ni moléculas azules, ni fotos de
  laboratorio prestadas. Si no hay material propio, la respuesta es tipografía y
  aire.
- **El arte entregado no se toca.** Se recorta y se reescala. No se redibuja, no
  se re-vectoriza, no se recolorea, no se retipografía.
- **Nada se mueve solo.** El logotipo y el vial no laten, no flotan, no vibran.
- **Nada de jerga técnica en pantalla.** Al usuario no le importa dónde no vive
  un servidor. Le importa quién puede ver lo que escribe y qué pasa si cambia de
  teléfono. Eso se contesta en Privacidad y términos, en frases cortas.

---

## Dos decisiones que la referencia no cubre, y por qué se tomaron así

**1 · La marca en oscuro.** `logo_master.png` es arte oscuro sobre transparente:
sobre `#0D0D0D` no se ve. La salida fácil sería `filter:invert()`, y eso es
recolorear la marca.

La versión clara existe y es real: es la que PEPTIDEX imprime en sus etiquetas.
`p_fitness.png` es el panel entregado, con el Px en foil plateado sobre placa
negra. De ahí sale la marca del tema oscuro, recortada.

La placa se queda. Se probó difuminarla con una máscara y no se puede: el bloque
ocupa el 94 % del ancho del panel, así que no hay margen que desvanecer sin
empezar a comerse la palabra PEPTIDEX. Así que se asume, redondeada: es
exactamente lo que es, la etiqueta impresa puesta en la portada.

**2 · Las plumas de la portada.** El fichero entregado trae la pluma sobre fondo
blanco y con su bloque de rótulo debajo. En la portada de la referencia las
plumas van solas. Se recorta por encima del rótulo y se le quita el fondo con un
relleno desde el borde —sólo el blanco conectado con el borde, no «todo lo
claro»— porque la pluma de LONGEVITY es plateada y un umbral global la dejaría
agujereada. Es un recorte contra un fondo plano, no un recoloreado.

---

## El protocolo es una pila con nombre

La referencia lo enseña sin decirlo: `FAT LOSS PROTOCOL` con cinco viales
dentro. Ésa es la unidad con la que la gente piensa, y por eso el modelo de
datos la sigue.

Dentro van los compuestos con su dosis. Fuera va lo que comparten: cada cuándo,
desde cuándo y a qué hora. Si dos compuestos van a horas distintas o con
frecuencias distintas, no son un protocolo con dos cosas dentro: son dos
protocolos.

**La adherencia se cuenta por inyección, no por protocolo.** Una pila de cinco
con tres marcados son tres puestas y dos que faltan, no «un protocolo a medias».

---

## PepCheems

**Qué sabe.** Tres fuentes, las tres dentro de la aplicación: el registro del
propio usuario, el registro de operación de PEPTIDEX —las 60 fichas con su
clase, mecanismo, presentación, solvente, conservación y columna de referencia—
y una calculadora.

**Qué contesta.** Qué toca hoy · cuándo es la siguiente · cómo va la adherencia
y la racha · qué protocolos hay y qué llevan dentro · qué queda de cada vial y
cuánto dura a su ritmo · la ficha de cualquier compuesto · cómo se conserva ·
cómo se reconstituye · la aritmética de la jeringa · conversión de unidades ·
el patrón de zonas · qué hay en la biblioteca.

**Qué no hace, y esto no es un ajuste.** No dice qué tomar, cuánto ni cada
cuándo. Cuando la pregunta pide eso, lo dice y ofrece lo que sí puede. La
columna de referencia del registro de operación se **cita**, con marco y
procedencia: es el documento del operador, no una pauta que la app aplique.

**Voz.** Corta. Da el dato y se calla. No saluda cada vez, no se disculpa y no
adorna. Usa el nombre del usuario cuando lo tiene. Cuando no entiende, lo dice
en vez de inventar.

**Cada respuesta declara de dónde sale** — tu registro, el registro de
operación, o aritmética. Sin procedencia, un dato en una burbuja parece una
opinión del programa.

---

## Verificación

Una dirección sin criterio de rechazo es una opinión. Éstos se aplican a cada
pantalla antes de darla por buena:

1. ¿La cabecera es la barra de la referencia —flecha, título centrado en
   versalitas, acción— o me he inventado un titular? → la barra.
2. ¿Hay algún color fuera del distintivo de familia? → rehacer.
3. ¿El rótulo de sección está dentro de la tarjeta? → sacarlo.
4. ¿El producto aparece a tamaño de producto o de icono? → de producto.
5. ¿Se llega a esta pantalla desde un teléfono? → si no, no existe.
6. ¿Funciona a 320 px sin desbordar? → si no, no está terminada.
7. En oscuro, ¿es `#0D0D0D` con tarjeta `#1A1A1A`, o es el claro invertido?
8. ¿Hay una frase que le explique al usuario cómo está hecha la app en vez de
   qué hace? → fuera.

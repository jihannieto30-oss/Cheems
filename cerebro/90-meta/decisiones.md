---
tags: [meta, decisiones]
alias: [ADR, por qué]
actualizado: 2026-08-06
---

# Decisiones

Sólo lo que costó discutirse. Con **por qué se descartó lo otro**, que es la
parte que de verdad sirve. Lo último arriba.

---

## 2026-08-07 · Sí hay palabra de activación, con la página abierta

**Corrección.** Se dijo que una web no podía tener palabra de activación. Es
impreciso, y la imprecisión importa porque cerró una puerta que estaba abierta.

**Lo que sí puede:** con la página abierta y el permiso dado, el reconocimiento
continuo escucha y espera a oír «Jarvis». Está construido.

**Lo que no puede:** escuchar con la pestaña cerrada, el navegador cerrado o el
teléfono bloqueado. Eso es del sistema operativo, y por eso ahí manda Siri.

**Y va con dos frenos**, porque un micrófono siempre abierto es una decisión
seria: se enciende a mano, nunca por defecto, y mientras está en guardia se ve
—estado en ámbar y el flotante latiendo—.

---

## 2026-08-07 · El grafo va en capas, no en fuerzas

**Se decidió:** Sinapsis dibuja el cerebro como una red en capas — entrada,
contexto, dominio, trabajo, salida — con las notas ordenadas por grado dentro
de cada columna.

**Se descartó:** el grafo de fuerzas, que ya estaba hecho y funcionaba.

**Por qué:** un grafo de fuerzas coloca bien pero **no ordena**. Cada apertura
daba un archipiélago distinto y era imposible aprenderse dónde está una nota.
Las capas salen de las carpetas, que ya significan algo, y el dibujo es el
mismo cada vez.

---

## 2026-08-07 · El facturador sí lleva color, y por qué no contradice la marca

**Se decidió:** Jarvis, la consola de mando del facturador, usa un HUD de cian
sobre negro con ámbar para avisos.

**Se descartó:** el monocromo del resto de los productos.

**Por qué:** la prohibición de color gobierna **lo que ve un cliente** — la
tienda y PepX. El facturador no lo ve nadie más que Jihan: es su cabina. El HUD
no compite con la marca porque nunca aparece al lado de la marca, y aquí el
color hace un trabajo que en la tienda no haría falta — distinguir un dato de
un aviso mientras se opera deprisa.

**Consecuencia:** si algún día el facturador se le enseña a un cliente, esta
decisión se cae y hay que volver al monocromo.

---

## 2026-08-07 · Jarvis no tiene consciencia y se dice en su propia cara

**Se decidió:** cuando alguien le pregunta a Jarvis qué es, contesta que es un
intérprete sobre datos locales, que no es un modelo de lenguaje y que no tiene
consciencia.

**Se descartó:** dejarlo ambiguo, que era lo pedido.

**Por qué:** un producto que insinúa consciencia miente, y la primera vez que
falle el usuario descubre la mentira de la peor forma. Decirlo de frente
convierte la limitación en una característica: contesta al instante, sin
conexión, y nunca se inventa una cifra.

**Y lo que no se hizo:** meter un modelo de lenguaje de verdad exigiría una
clave de API dentro de un HTML que cualquiera puede abrir. Eso es regalar la
clave.

---

## 2026-08-06 · La referencia entregada manda sobre la dirección propia

**Se decidió:** el diseño de PepX sale de los dos PDF entregados
(`PEPTIDEX_App_Light_Dark_Mode_UI_Design.pdf` y `PEPTIDEX_Web_App_UI_UX_Design.pdf`),
literalmente. Paleta, cabeceras, tarjetas, tiras de semana y rejilla de
escritorio incluidos.

**Se descartó:** una dirección propia («FOIL») construida sobre el acabado
metálico de las etiquetas — sin color, jerarquía por luz, titulares editoriales
grandes. Estaba bien argumentada.

**Por qué:** una dirección propia por encima de una referencia entregada no es
dirección de arte, es no haber leído el encargo. Costó un rediseño entero que
hubo que tirar.

**Consecuencia permanente:** cuando Jihan entrega una referencia visual, esa
referencia es la especificación. Antes de proponer nada distinto, se pregunta.

---

## 2026-08-06 · El protocolo es una pila con nombre

**Se decidió:** un protocolo lleva N compuestos con su dosis; fuera queda lo que
comparten (frecuencia, inicio, hora). La adherencia se cuenta **por inyección**,
no por protocolo.

**Se descartó:** un protocolo = un compuesto, que era el modelo anterior.

**Por qué:** la referencia lo enseña sin decirlo — FAT LOSS PROTOCOL con cinco
viales dentro. Es la unidad con la que la gente piensa. Y contar por protocolo
hacía que una pila de cinco con tres marcados fuera «media adherencia» en vez de
tres puestas y dos que faltan.

**Regla derivada:** si dos compuestos van a horas o frecuencias distintas, no son
un protocolo con dos cosas dentro. Son dos protocolos.

---

## 2026-08-06 · La marca en tema oscuro no se invierte

**Se decidió:** la versión clara del logotipo se **recorta** del panel de
etiqueta entregado (`p_fitness.png`), donde ya existe impresa en foil sobre
placa negra. La placa se asume, redondeada.

**Se descartó:** `filter:invert()` sobre el logotipo oscuro. Y difuminar la placa
con una máscara.

**Por qué:** invertir es recolorear la marca, y está prohibido. La máscara no se
puede: el bloque ocupa el 94 % del ancho del panel, así que no hay margen que
desvanecer sin empezar a comerse la palabra PEPTIDEX.

---

## 2026-08-06 · Fuera la jerga técnica de la interfaz

**Se decidió:** ninguna pantalla explica cómo está hecha la app. Lo que el
usuario necesita saber sobre sus datos va en «Privacidad y términos», en frases
cortas y en lenguaje normal.

**Por qué:** al usuario no le importa dónde no vive un servidor. Le importa quién
puede ver lo que escribe y qué pasa si cambia de teléfono.

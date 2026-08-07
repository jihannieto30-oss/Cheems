# «Oye Siri, Jarvis»

Cómo hablar con Jarvis desde el iPhone sin abrir nada a mano.

---

## Lo que se puede y lo que no

**Sí se puede.** Decir «Oye Siri, Jarvis», dictar la pregunta, y que Jarvis
conteste en voz alta. Desde fuera se ve exactamente como hablar con Siri.

**No se puede.** Una palabra de activación propia. No hay «Oye Jarvis»
escuchando de fondo: una página web no tiene permiso para escuchar sin que la
abras, y es mejor así. **Quien escucha es Siri; Jarvis recibe lo que Siri le
pasa.**

Eso no es una limitación de cómo está hecho — es cómo funciona iOS. Cualquiera
que te prometa una palabra de activación propia desde una web te está vendiendo
humo.

---

## Antes de nada: el facturador tiene que estar en internet

Ahora mismo es un fichero en tu ordenador. El teléfono no puede abrir un
fichero que está en otra máquina.

Súbelo donde ya está el sitio —Netlify— en una carpeta con un nombre que no
adivine nadie:

```
peptidex.netlify.app/j-<algo-largo-y-raro>/PEPTIDEX_Facturador.html
```

El facturador ya pide contraseña al entrar, así que la protección real es ésa.
El nombre raro sólo evita que salga en un buscador.

**Apúntate la URL completa.** Hace falta en el paso siguiente.

---

## El atajo, paso a paso

En el iPhone, app **Atajos** → **+** (arriba a la derecha).

### 1 · Dictar

Buscar **«Dictar texto»** y añadirlo.

Tócalo para desplegarlo y pon:
- *Idioma*: Español (México)
- *Parar de escuchar*: **Tras una pausa**

### 2 · Abrir la URL

Buscar **«Abrir URL»** y añadirlo debajo.

En el campo de la URL escribe tu dirección con esto al final:

```
https://TU-DIRECCION/PEPTIDEX_Facturador.html?voz=1&jv=
```

Y **al final del todo**, sin espacio, arrastra la variable **«Texto dictado»**
(sale sobre el teclado al escribir en el campo).

Tiene que quedar así:

```
https://TU-DIRECCION/PEPTIDEX_Facturador.html?voz=1&jv=[Texto dictado]
```

### 3 · El nombre

Arriba, donde pone el nombre del atajo, escribe **Jarvis**.

Ése es literalmente el nombre que vas a decirle a Siri, así que que sea corto y
que Siri lo entienda bien. «Jarvis» funciona. «JARVIS PEPTIDEX consola» no.

### 4 · Ya está

Di **«Oye Siri, Jarvis»**. Te pedirá que hables. Dile *«cuánto facturé este
mes»* y te lo contesta en alto.

---

## La versión sin dictado

Si prefieres abrirlo y hablarle tú:

Un atajo con **sólo** «Abrir URL» y esta dirección:

```
https://TU-DIRECCION/PEPTIDEX_Facturador.html?voz=1&jv=
```

(el `jv=` vacío al final, sin variable)

Con eso, «Oye Siri, Jarvis» abre el panel, dice «aquí estoy» y se queda
escuchando. A partir de ahí es una conversación: contesta, vuelve a abrir el
micrófono, y así hasta que cierres.

---

## En Android

Igual pero con la app **Atajos de Google** o cualquier lanzador que abra una
URL. El parámetro `?jv=` funciona igual — no es de iOS, es de Jarvis.

---

## Qué le puedes decir

| | |
|---|---|
| **Consultar** | «resumen» · «quién me debe» · «cuánto facturé este mes» · «cuánto llevo este año» |
| **Buscar** | el nombre de cualquier cliente |
| **Crear** | «nueva factura para Carlos» · «nuevo cliente Ana Ruiz» |
| **Marcar** | «marca la F-0042 como pagada» — *pide confirmación antes* |
| **Navegar** | «abre el registro» · «abre los pedidos» |

---

## Si algo no funciona

**No habla.** Comprueba que el botón del altavoz en la barra de Jarvis está
encendido (en cian). Si tu iPhone está en silencio, la síntesis tampoco suena.

**Habla en inglés.** Tu iPhone no tiene voz española instalada.
*Ajustes → Accesibilidad → Contenido hablado → Voces → Español.*

**No entiende lo que dictas.** Siri transcribe antes de pasárselo. Si Siri
escribe mal el nombre de un cliente, Jarvis recibe el error. Se ve en pantalla
lo que le llegó, así que se sabe enseguida de quién es la culpa.

**No se abre el micrófono solo.** Safari en iOS pide permiso la primera vez.
Hay que dárselo una vez y ya queda.

---

## Por qué está hecho así

Jarvis lee un parámetro de la dirección, `?jv=`, y trata lo que venga dentro
como si se lo hubieras escrito. Eso es todo el truco.

No hay servidor, no hay clave y no sale ninguna petición: la voz la pone el
sistema operativo del teléfono y las respuestas salen de tus propios datos.
Por eso funciona igual sin cobertura, en cuanto la página está cargada.

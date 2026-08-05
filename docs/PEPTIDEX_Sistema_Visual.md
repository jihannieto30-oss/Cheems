# PEPTIDEX · Sistema visual y arquitectura

Versión 2 — monocromo, dos temas, primero el oscuro.

---

## 0 · La regla que gobierna todo

**El color no significa nada.** Ni estado, ni serie, ni categoría, ni jerarquía.
Todo eso lo llevan la luminosidad, la escala, el peso, el espacio, el trazo y la
palabra. Es la restricción más dura del sistema y es la que lo hace ver caro:
cuando no puedes gastar color, gastas aire.

Consecuencia directa y no negociable: **nada comunica sólo por color**. Un
estado lleva icono y rótulo. Una serie lleva trazo distinto y su nombre pegado.
Si tapas la pantalla con un filtro de escala de grises y algo deja de
entenderse, ese algo está mal construido.

---

## 1 · Superficies

Cinco planos. Un objeto nunca se apoya sobre uno del mismo nivel.

| Token | Oscuro | Claro | Para qué |
|---|---|---|---|
| `--bg` | `#000000` | `#FFFFFF` | el lienzo, detrás de todo |
| `--s1` | `#0A0A0A` | `#FAFAFA` | el papel de la página |
| `--s2` | `#121212` | `#FFFFFF` | la tarjeta |
| `--s3` | `#1C1C1C` | `#F2F2F2` | el hueco dentro de la tarjeta: campos, casillas |
| `--s4` | `#2A2A2A` | `#E6E6E6` | lo elevado sobre la tarjeta: pastilla activa, distintivo |

En claro `--bg` y `--s2` coinciden a propósito: sobre blanco, la tarjeta se
separa con filete y sombra, no con un gris que la ensucie.

## 2 · Tinta

| Token | Oscuro | Claro | Para qué |
|---|---|---|---|
| `--t1` | `#FFFFFF` | `#0A0A0A` | titulares, cifras, lo que se lee primero |
| `--t2` | `#A1A1A1` | `#5E5E5E` | cuerpo, descripciones |
| `--t3` | `#6E6E6E` | `#8A8A8A` | epígrafes, unidades, metadatos |
| `--line` | `rgba(255,255,255,.07)` | `rgba(0,0,0,.07)` | el filete que casi no está |
| `--line2` | `rgba(255,255,255,.16)` | `rgba(0,0,0,.13)` | el que sí se ve, sólo cuando hace falta |

`--t3` sobre `--s2` da 3,67:1 en oscuro y 3,45:1 en claro. Vale para
metadatos y no vale para cuerpo — por eso el cuerpo es `--t2`.

## 3 · Dato

Tres series como máximo, y **la luminosidad no basta para separarlas**:

| | Oscuro | vs `--s2` | Claro | vs `--s2` |
|---|---|---|---|---|
| serie 1 | `#FFFFFF` | 18,73:1 | `#0A0A0A` | 19,80:1 |
| serie 2 | `#B8B8B8` | 9,44:1 | `#5E5E5E` | 6,48:1 |
| serie 3 | `#7A7A7A` | 4,36:1 | `#8A8A8A` | 3,45:1 |

Las tres pasan 3:1 contra su superficie. Pero la separación **entre** series se
queda en 1,88–2,16:1, muy por debajo de lo que hace falta para distinguirlas de
un vistazo. Por eso, siempre y sin excepción:

- **trazo distinto** — continua, discontinua larga, punteada
- **rótulo directo** en el extremo de la línea, no sólo en la leyenda
- **leyenda presente** en cuanto hay dos series o más

Eso es codificación compuesta: tres canales para tres series. Es lo correcto en
monocromo y es lo que además resuelve daltonismo, impresión y `forced-colors`
de una sola vez.

## 4 · Estado

Sin color. Cuatro niveles, y cada uno se dibuja con **grosor de filete
izquierdo + icono + palabra**:

| Nivel | Filete | Icono |
|---|---|---|
| neutro | 1 px `--line2` | — |
| atención | 2 px `--t2` | triángulo |
| serio | 2 px `--t1` | triángulo relleno |
| hecho | 2 px `--t1` | marca de verificación |

## 5 · Tipografía

Una sola familia. El sistema entero se sostiene en el **contraste de escala**,
no en el peso ni en el color.

| Papel | Tamaño | Peso | Interletrado |
|---|---|---|---|
| Display | `clamp(38px, 8vw, 64px)` | 600 | `-0.05em` |
| Título de pantalla | `clamp(28px, 6vw, 40px)` | 600 | `-0.045em` |
| Título de sección | 18 px | 600 | `-0.03em` |
| Cifra | 21–56 px | 600 | `-0.04em` |
| Cuerpo | 14 px | 400 | `-0.005em` |
| Metadato | 12 px | 400 | 0 |
| Epígrafe | 9,5 px | 600 | **`0.24em`**, versalitas |

El epígrafe diminuto y muy abierto contra la cifra grande y muy cerrada es todo
el truco de la jerarquía. No cuesta un solo color.

## 6 · Espacio y forma

- Rejilla base **4 px**. Todo es múltiplo.
- Radios: 12 px campo · 16 px pastilla · **20 px tarjeta** · 999 px botón.
- Aire de tarjeta: 20–24 px. Entre tarjetas: 12 px. Entre bloques: 40 px.
- Ancho de lectura máximo 900 px. El texto corrido no pasa de 560 px.

## 7 · Profundidad

En oscuro **no hay sombra**: sobre negro una sombra no existe. La elevación se
dibuja subiendo un plano de superficie y encendiendo el filete.

En claro sí, y siempre en dos capas — una de contacto muy corta y una ambiental
muy abierta y muy tenue. Nunca la sombra media, que es la que parece plantilla.

## 8 · Movimiento

- Curva única: `cubic-bezier(.22, 1, .36, 1)`.
- Duraciones: 180 ms micro · 280 ms transición · 380 ms entrada.
- Entrada escalonada: 8 px y 40 ms entre piezas, **sólo las seis primeras**.
- Nada rebota, nada parpadea, nada flota. Lo que no se ha pedido, no se mueve.
- `prefers-reduced-motion` apaga todo.

## 9 · Arquitectura de navegación

```
SPLASH / ONBOARDING          ← sólo la primera vez, o tras salir
  └─ SIGN IN · CREATE ACCOUNT

BARRA INFERIOR (5)
  HOME        saludo · adherencia · racha · siguiente · protocolo activo
              · acciones rápidas
  PROTOCOLS   Active · Completed · Drafts → detalle
  COMPOUNDS   buscador · All/Performance/Recovery/Longevity/Beauty → detalle
  JOURNAL     calendario · historial · + Log New Injection
  MORE        Tools (calculadora · vida media · zonas · inventario)
              Data (constantes y curvas)
              Education (Articles · Videos · Protocol Education)
              Profile · Preferences · Notifications · Security · Privacy
              · Support · Plan · Logout
```

`MORE` existe para que las otras cuatro se queden con una sola idea cada una.
Todo lo que se usa a diario está en las cuatro primeras; todo lo que se toca de
vez en cuando vive en la quinta.

## 10 · Estados de cada pantalla

Las cuatro, siempre, y ninguna improvisada:

- **cargando** — esqueleto del contenido real, no un disco girando
- **vacío** — qué es esto, por qué está vacío, y una sola cosa que hacer
- **error** — qué pasó, y el botón que lo reintenta
- **lleno** — el caso normal

## 11 · Lo que Doc.Peps sigue sin hacer

El sistema visual cambia; la raya no. Doc.Peps lee el registro y describe el
número. No interpreta el cuerpo, no atribuye un cambio a un compuesto, y no
dice qué tomar, cuánto ni cada cuándo. La columna de dosis del libro de
operación se cita, con marco y procedencia, como lo que es: el documento del
operador.

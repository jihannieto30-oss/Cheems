---
name: estudio-diario
description: El estudio de las 7 — los cinco agentes miran la empresa y proponen, cada uno desde lo suyo, cómo mejorarla y cómo ingresar más. Lo dispara una Rutina cada mañana, y también vale si Jihan pide "el estudio" o "qué proponen los agentes".
---

# El estudio de las 7

Cinco especialistas miran PEPTIDEX el mismo día y cada uno dice una cosa. No es
un resumen de lo que pasó —eso es el parte— sino una propuesta: **qué cambiar
para ganar más**.

## Quién mira qué

| Agente | Su pregunta de cada mañana |
|---|---|
| `atlas` | ¿Dónde se está dejando margen? Precios contra el estudio de mercado, viales parados, coste de envío, cobros sin cerrar. |
| `vera` | ¿Qué compuesto no se puede vender bien porque su ficha está coja? Faltan mg, falta conservación, familia mal puesta. |
| `lira` | ¿Qué hay que decir esta semana? Un ángulo concreto, con el texto ya empezado, no «hacer contenido». |
| `iris` | ¿Qué se ve mal en lo que ya está publicado? Pantalla, tienda, etiqueta. |
| `lex` | ¿Hay algo publicado que cruce de registro a receta? Esto es lo único que puede parar todo lo demás. |

## Cómo se corre

Los cinco a la vez, en la misma respuesta. Cada uno recibe la misma consigna:

> Mira PEPTIDEX hoy. Dime **una** cosa concreta que cambiaría el dinero que
> entra, con el fichero y la línea donde está el problema, y qué haría en su
> lugar. Si hoy no ves nada que valga la pena, dilo y calla — no rellenes.

## Los lunes, además, la frontera

Una vez por semana el estudio lleva un apartado más: **La frontera** — qué hay
de nuevo en péptidos en el mundo que le importe a PEPTIDEX.

No es «buscar novedades». Es buscar cuatro cosas concretas y descartar todo lo
demás: un compuesto que no tenemos y ya tiene datos en humanos, un dato nuevo
sobre algo que ya vendemos, una forma nueva de administrarlo, o un movimiento
regulatorio en México o Estados Unidos.

Las instrucciones completas —quién busca qué, y las cinco reglas, incluida la
de fuente primaria y la de ninguna dosis— están en
`cerebro/00-encargos/vigilancia-frontera-peptidos.md`. Se leen antes de lanzar
a los agentes ese día.

**Lex tiene veto.** Si dice que un candidato no se puede tocar aquí, no entra en
el informe por muy bueno que sea el margen.

Los otros días el estudio va sin este apartado. Una vigilancia diaria de un
terreno que se mueve por meses sólo produce ruido.

## Cómo se escribe

A `cerebro/50-estudios/AAAA-MM-DD.md`, con este cuerpo:

```markdown
---
fecha: AAAA-MM-DD
tipo: estudio
---

# Estudio · <día> <fecha>

**Lo primero.** Una frase: de todo lo de abajo, qué haría hoy y por qué esa.

## <agente> — <titular en media línea>

Qué vio, dónde está, qué haría. Tres párrafos como mucho.

**Cuesta:** <tiempo o dinero> · **Da:** <qué mueve, en números si se puede>
```

Al final, y sólo si hay algo:

```markdown
## Necesito que decidas

- la cosa, con las dos opciones y cuál recomendaría
```

## Reglas

- **Una propuesta por agente. Cinco en total, como mucho.** Un estudio con
  quince cosas es una lista que nadie ejecuta.
- **Todo va con su fichero.** «Mejorar el catálogo» no es una propuesta;
  «`library.json` tiene 10 compuestos sin `mg` y por eso no precargan la
  calculadora — aquí están» sí lo es.
- **Cuesta / Da, siempre.** Sin eso no se puede ordenar por lo que conviene.
- **Si un agente no ve nada, se escribe que no vio nada.** Un estudio que se
  inventa hallazgos para llenar cinco huecos deja de leerse en dos semanas, y
  entonces no sirve ni el día que sí tiene algo.
- **No repitas lo de ayer si nadie lo tocó.** Mira el estudio anterior antes de
  escribir. Si algo sigue igual, va en una línea: «sigue pendiente lo de X».
- Nada de esto se publica ni se manda a un cliente sin que Jihan lo diga.

## Después de escribirlo

1. `git add cerebro/50-estudios/ && git commit && git push` a la rama de
   trabajo. El estudio vive en el repo — así se puede leer desde el móvil y
   así el de mañana sabe lo que dijo el de hoy.
2. Anotar la corrida en `cerebro/90-meta/agentes/registro.jsonl`, una línea por
   agente, para que Jarvis pueda decir cuánto ha corrido cada uno.

---
tags: [agentes, equipo, meta]
alias: [los agentes, el equipo, los cinco, Vera, Lex, Iris, Lira, Atlas]
estado: vivo
actualizado: 2026-08-07
---

# Los cinco agentes

Especialistas que se despiertan para un trabajo concreto. Viven en
`jihannieto30-oss/Cheems`, en `.claude/agents/`, porque es donde está el
material con el que trabajan.

| agente | qué lleva | puede escribir |
|---|---|---|
| **vera** | las 60 fichas de compuesto | sí, sobre `library.json` |
| **lex** | cumplimiento: que nada cruce de registro a receta | **no** |
| **iris** | que se parezca a las referencias entregadas | **no** |
| **lira** | copia de tienda, producto, educación, Instagram | sólo borradores |
| **atlas** | precios, márgenes, inventario, envíos, facturador | sí, propuestas |

## De dónde salen los nombres

Antes se llamaban por su función: `catalogo`, `la-raya`, `ojo`, `voz`,
`operacion`. Funcionaba escrito y no funcionaba dicho — «voz» y «ojo» son
palabras normales del español, así que en una frase hablada no se distinguía si
se estaba nombrando a un agente o hablando de una voz y de un ojo. Con Jarvis
escuchando, eso deja de ser un detalle.

Cada nombre dice lo que hace:

- **Vera**, de *verus*: lo verdadero. Responde de que la ficha diga la verdad.
- **Lex**, la ley. Es la raya que no se cruza.
- **Iris**, la parte del ojo que decide cuánta luz entra.
- **Lira**, el instrumento del que cuenta.
- **Atlas**, el que carga con el peso de la empresa.

El histórico no se perdió: en `90-meta/agentes/registro.jsonl` cada corrida
antigua guarda su `agente_antes`, así que las cuentas siguen cuadrando.

## Por qué tres son de sólo lectura

**`lex` y `iris` no editan a propósito.** Un revisor que puede reescribir lo
que revisa es un revisor que puede tapar sus propios hallazgos. Informan; el
arreglo lo hace otro y se vuelve a revisar.

**`lira` sólo escribe en `docs/borradores/`.** Nunca toca producción ni publica.
Su salida es texto para que Jihan apruebe.

## Cuándo se dispara cada uno

- **antes de publicar cualquier texto que vea un cliente** → `lex`
- **antes de dar por buena una pantalla** → `iris`
- **al tocar `library.json` o las fichas** → `vera`
- **al necesitar copia nueva** → `lira`
- **al hablar de precio, stock o envío** → `atlas`

## Lo que no son

No corren solos. Son especialistas que se despiertan cuando hace falta. Lo que
los volvería autónomos es una Rutina que los dispare — ver [[encargos]].

Y ninguno manda nada hacia fuera. Esa raya está en [[conectores]] y vale para
todos.

## Ver también

- [[peptidex]] — la empresa que llevan entre los cinco
- [[encargos]] — cómo se les deja trabajo

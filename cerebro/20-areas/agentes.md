---
tags: [agentes, equipo, meta]
alias: [los agentes, el equipo, los cinco]
estado: vivo
actualizado: 2026-08-06
---

# Los cinco agentes

Especialistas que se despiertan para un trabajo concreto. Viven en
`jihannieto30-oss/Cheems`, en `.claude/agents/`, porque es donde está el
material con el que trabajan.

| agente | qué lleva | puede escribir |
|---|---|---|
| **catalogo** | las 60 fichas de compuesto | sí, sobre `library.json` |
| **la-raya** | cumplimiento: que nada cruce de registro a receta | **no** |
| **ojo** | que se parezca a las referencias entregadas | **no** |
| **voz** | copia de tienda, producto, educación, Instagram | sólo borradores |
| **operacion** | precios, márgenes, inventario, envíos, facturador | sí, propuestas |

## Por qué tres son de sólo lectura

**`la-raya` y `ojo` no editan a propósito.** Un revisor que puede reescribir lo
que revisa es un revisor que puede tapar sus propios hallazgos. Informan; el
arreglo lo hace otro y se vuelve a revisar.

**`voz` sólo escribe en `docs/borradores/`.** Nunca toca producción ni publica.
Su salida es texto para que Jihan apruebe.

## Cuándo se dispara cada uno

- **antes de publicar cualquier texto que vea un cliente** → `la-raya`
- **antes de dar por buena una pantalla** → `ojo`
- **al tocar `library.json` o las fichas** → `catalogo`
- **al necesitar copia nueva** → `voz`
- **al hablar de precio, stock o envío** → `operacion`

## Lo que no son

No corren solos. Son especialistas que se despiertan cuando hace falta. Lo que
los volvería autónomos es una Rutina que los dispare — ver [[encargos]].

Y ninguno manda nada hacia fuera. Esa raya está en [[conectores]] y vale para
todos.

## Ver también

- [[peptidex]] — la empresa que llevan entre los cinco
- [[encargos]] — cómo se les deja trabajo

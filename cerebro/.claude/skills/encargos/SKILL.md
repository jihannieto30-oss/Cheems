---
name: encargos
description: Recoge y ejecuta lo que Jihan dejó pendiente en 00-encargos/. Úsala cuando despierte una Rutina, cuando él diga "mira los encargos", "¿hay algo pendiente?" o "hazlo", y al empezar una sesión si hay ficheros con estado pendiente.
---

# Encargos

La forma que tiene Jihan de dejar trabajo cuando no estamos hablando.

## El ciclo

1. Lista `00-encargos/*.md` ignorando `README.md` y `_plantilla.md`.
2. Coge los de `estado: pendiente`, del más viejo al más nuevo.
3. Marca `estado: haciendo` y **haz commit ya**. Si dos sesiones despiertan a
   la vez, esto es lo que evita que las dos hagan lo mismo.
4. Hazlo.
5. Escribe el resultado dentro del fichero, bajo `## Resultado`.
6. `estado: hecho` (o `bloqueado`), y commit.

## Cómo se escribe el resultado

Lo que él necesita para saber si hace falta que intervenga:

```markdown
## Resultado

**Hecho.** Una frase de qué pasó.

- lo concreto: ficheros tocados, commit, enlace
- lo que decidí por mi cuenta y por qué
- lo que dejé sin hacer, si dejé algo
```

Si quedó **bloqueado**, di exactamente qué falta y quién lo tiene que hacer.
«No se pudo» no es un resultado.

## La raya

**Nada sale hacia fuera sin que él lo confirme.** Mandar un correo, abrir o
fusionar un PR, publicar, borrar, escribir en cualquier cuenta suya: se prepara
todo, se deja listo, y el resultado dice «esto está listo para mandar, dime y lo
mando».

Una Rutina que despierta sola y manda un correo en nombre de alguien es
exactamente la clase de cosa que hace que se desinstale el sistema entero.

## Si no hay nada pendiente

Cállate. No escribas un encargo para justificar haber despertado, y no avises
de que no había nada. Sólo se habla cuando hay algo que decir.

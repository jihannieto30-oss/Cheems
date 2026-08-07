---
name: nota
description: Captura una idea, un dato o un enlace en el vault, en el sitio correcto y con el formato correcto. Úsala cuando Jihan suelte información nueva que no pertenece a la sesión — un proveedor, un precio, una idea, un contacto, algo que leyó.
---

# Capturar una nota

## Dónde va

Decide **antes** de escribir. Una nota en la carpeta equivocada es una nota
perdida.

| si es… | va a |
|---|---|
| algo con fecha de fin | `10-proyectos/<proyecto>/` |
| algo permanente del negocio | `20-areas/` |
| referencia que no cambia | `30-recursos/` |
| no lo tienes claro | `00-bandeja/` |

**`00-bandeja/` es un fallo controlado, no un destino.** Si acabas ahí, dilo:
«lo dejé en la bandeja porque no sé si es de proveedores o de finanzas».

## Cómo se escribe

- Nombre de fichero descriptivo y en minúsculas con guiones.
- Frontmatter con `tags`, y `alias` si la cosa tiene más de un nombre.
- **Una idea por fichero.** Si estás añadiendo un cuarto tema a una nota, son
  cuatro notas.
- Enlaza a lo que ya existe con `[[…]]`. Si nada enlaza a una nota, esa nota no
  se va a encontrar nunca.

## Antes de crear, busca

Haz `grep` del término. Si ya hay una nota de eso, **actualízala** en vez de
crear la segunda. Dos notas del mismo proveedor con datos distintos es peor que
no tener ninguna.

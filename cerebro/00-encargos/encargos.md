---
tags: [encargos, meta]
alias: [encargos, pendientes]
estado: vivo
actualizado: 2026-08-06
---

# Encargos

Aquí dejas lo que quieres que se haga cuando no estamos hablando.

Escribes un fichero desde el móvil —Obsidian sincroniza solo—, y la próxima vez
que una Rutina despierte, Claude lo lee, lo hace, escribe el resultado dentro y
lo marca como hecho.

## Cómo se escribe uno

Copia `_plantilla.md`, ponle nombre `AAAA-MM-DD-lo-que-sea.md` y escribe qué
quieres. En español normal, sin formato especial.

```markdown
---
estado: pendiente
creado: 2026-08-07
---

# Mira si la CI del repo está en rojo

Y si lo está, arréglalo si es algo tonto. Si no, dime qué pasa.
```

## Estados

| estado | qué significa |
|---|---|
| `pendiente` | sin tocar. Es lo que Claude coge. |
| `haciendo` | lo cogió y está en ello |
| `hecho` | terminado. El resultado está dentro del fichero. |
| `bloqueado` | no se pudo. Dentro dice por qué y qué hace falta. |

## Qué se puede encargar

Lo que se pueda hacer desde un contenedor con los repos enganchados: mirar y
arreglar el repo, construir PepX, regenerar Sinapsis, redactar algo, buscar en
el cerebro, ordenar el vault, preparar un informe.

## Qué no

- Nada que necesite tu ordenador encendido (ficheros locales, Obsidian abierto).
- Nada que necesite un conector que no esté autorizado. Ver [[conectores]].
- Publicar en Instagram — ver [[conectores]], y no es por falta de ganas.
- Cualquier cosa que salga hacia fuera —mandar un correo, abrir un PR, borrar
  algo— **se prepara y se deja para que la confirmes**, no se ejecuta sola.
  Esa raya no la cruza una Rutina.

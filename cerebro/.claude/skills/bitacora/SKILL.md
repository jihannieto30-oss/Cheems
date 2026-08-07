---
name: bitacora
description: Escribe la entrada del día en la bitácora del cerebro y la commitea. Úsala al terminar una sesión donde haya pasado algo — una decisión, un trabajo entregado, algo aprendido del negocio. También cuando Jihan diga "apunta esto", "guarda esto" o "que no se te olvide".
---

# Escribir la bitácora

Sin esto el cerebro no crece. Es la única razón por la que la sesión de mañana
sabrá algo de la de hoy.

## Qué hacer

1. Mira si ya existe `90-meta/bitacora/AAAA-MM-DD.md` para hoy.
   - Si existe, **añade** al final. No lo reescribas.
   - Si no, créalo con la plantilla de abajo.

2. Escribe **sólo lo que tendría valor dentro de tres meses**. Una sesión donde
   se cambió un margen de 12 px no merece entrada. Una donde se decidió que los
   protocolos pasan a ser pilas con nombre, sí.

3. Si en la sesión se tomó una decisión que costó discutirse, además de la
   bitácora añade una línea en `90-meta/decisiones.md`.

4. Si aprendiste algo nuevo de Jihan, de PEPTIDEX o de cómo trabaja, actualiza
   el fichero que corresponda (`CLAUDE.md`, `90-meta/identidad.md`,
   `20-areas/peptidex.md`) en vez de dejarlo enterrado en la bitácora.

5. `git add -A && git commit` con un mensaje que diga qué pasó, y push.

## La plantilla

```markdown
---
tags: [bitacora]
fecha: AAAA-MM-DD
---

# AAAA-MM-DD

## Qué se hizo
- …

## Qué se decidió
- … (y por qué se descartó lo otro)

## Qué aprendí
- … de Jihan, del negocio o de cómo funciona algo

## Dónde se quedó
- Lo siguiente sería …
```

## La regla que más se incumple

**No escribas un parte de trabajo.** «Se modificaron 4 ficheros» no le sirve a
nadie. Escribe lo que un compañero necesitaría para retomarlo: qué se intentó,
qué falló, por qué se hizo así y no de la otra forma.

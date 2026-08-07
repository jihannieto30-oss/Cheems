---
tags: [pepx, datos]
estado: vivo
actualizado: 2026-08-06
---

# Modelo de datos de PepX

Todo vive en el aparato del usuario, bajo la clave `pepx-app-v3`.

## El protocolo es una pila

```js
{ id, name, active,
  items: [{c, d, u}, …],     // compuesto, dosis, unidad
  freq, dow, every, on, off, // cada cuándo
  start, end, time, notes }
```

Ver [[decisiones]] para el porqué.

## El registro

`S.log[fecha][protocolo#pieza] = {t, z}` — hora y zona.

Sin sufijo `#pieza` es un apunte antiguo del protocolo entero, y **sigue valiendo**:
significa «todas hechas». Al tocar una pieza suelta hay que desdoblarlo primero,
o quitar una quitaría las cinco.

`S.extra[fecha] = [{c, d, u, t, z}]` — lo registrado fuera de pauta.

## Migración

`migraPlan()` convierte lo viejo —un compuesto por protocolo— en una pila de un
elemento, y le pone de nombre el del compuesto. Nadie pierde su registro por un
rediseño. **Cualquier cambio futuro de forma tiene que pasar por ahí.**

## La adherencia se cuenta por inyección

`adherence(n)` suma `pItems(p).length` por día de pauta, no protocolos. Una pila
de cinco con tres marcados son tres puestas y dos que faltan.

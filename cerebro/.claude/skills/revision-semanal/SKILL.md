---
name: revision-semanal
description: Revisión semanal del cerebro — vacía la bandeja, cierra lo terminado, resume la semana y detecta lo que se está pudriendo. Pensada para dispararse los domingos por Rutina, o cuando Jihan pida "revisión" o "pon orden".
---

# Revisión semanal

Un vault sin revisión se convierte en un desván en dos meses. Esto es el
mantenimiento.

## 1 · Vaciar la bandeja

Todo lo de `00-bandeja/` se coloca o se borra. Nada se queda. Si algo lleva dos
revisiones sin poder colocarse, es que no valía — bórralo y dilo.

## 2 · Estados

Recorre `10-proyectos/`:
- lo que esté terminado → `40-archivo/`, con `estado: cerrado`
- lo que lleve **tres semanas sin tocarse** → márcalo `estado: pausado` y
  **pregúntalo**: «esto está parado desde el 12, ¿sigue vivo?»

Un proyecto que se muere en silencio es la forma más común de que un sistema así
deje de reflejar la realidad.

## 3 · El resumen

Escribe `90-meta/bitacora/AAAA-Wnn-semana.md` juntando las entradas diarias:

```markdown
# Semana nn · del X al Y

## Lo que se movió
## Lo que se decidió
## Lo que sigue parado
## Lo que hay que decidir esta semana
```

## 4 · Higiene

- Notas huérfanas (nadie enlaza a ellas) → enlázalas o archívalas.
- Notas duplicadas del mismo tema → fúndelas.
- `CLAUDE.md` desactualizado → corrígelo. **Es el fichero que más envejece y el
  que más daño hace envejecido.**

## 5 · Commit

Un solo commit: `revisión semanal · semana nn`.

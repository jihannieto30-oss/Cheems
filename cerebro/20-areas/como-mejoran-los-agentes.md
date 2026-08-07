---
tags: [agentes, meta, metricas]
alias: [progreso de los agentes, cómo mejoran, aprendizaje]
estado: vivo
actualizado: 2026-08-07
---

# Cómo mejoran los agentes de verdad

Lo primero, porque cambia todo lo demás: **los agentes no aprenden solos.** No
hay entrenamiento, ni pesos, ni memoria entre ejecuciones. Un agente es un
fichero de instrucciones que se lee entero cada vez.

Cualquier barra de progreso que subiera sola sería decorado midiendo nada.

## Entonces, ¿qué sube?

Dos cosas, y las dos son reales y se pueden mirar.

### 1 · Lo que el agente vigila mejora

Es la medida honesta, porque **mide el resultado, no al agente**.

| agente | su medida | de dónde sale |
|---|---|---|
| **vera** | % de campos completos en las 60 fichas | se calcula de `library.json` |
| **iris** | pantallas sin desborde ni errores | se mide abriendo la app |
| **lex** | cadenas revisadas sin hallazgos | de su registro |
| **lira** | borradores entregados y aprobados | de `docs/borradores/` |
| **atlas** | precios dentro de banda | del estudio de mercado |

La de `vera` es la más limpia: hoy está en un número concreto, y cada ficha
que se completa lo sube. Eso no es una animación — es aritmética sobre el
fichero.

### 2 · El agente sabe más cosas

Cada vez que se le escapa algo y se le añade una regla, su fichero crece. El
número de reglas que conoce es su capacidad, y está en git con su fecha.

Se hace con la skill `afilar`, que además obliga a apuntar el caso concreto.

## Dónde se ve

En [[sinapsis]], pestaña **Agentes**. Sale de dos sitios:

- `90-meta/agentes/registro.jsonl` — una línea por ejecución
- los propios `.claude/agents/*.md` — cuántas reglas tiene cada uno

## La trampa que hay que evitar

**Un agente que crece sin parar deja de tener criterio.** Si su fichero pasa de
unas 600 palabras, lo que hay no es un agente experto: es un agente al que se
le han ido pegando parches. Toca releerlo entero y fundir reglas.

Más reglas no es mejor. Mejores reglas, sí.

## Ver también

- [[agentes]] — quiénes son los cinco
- [[sinapsis]] — dónde se mira

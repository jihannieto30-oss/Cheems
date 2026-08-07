---
tags: [pepx, pepcheems, asistente]
alias: [el asistente, PepCheems]
estado: vivo
actualizado: 2026-08-06
---

# PepCheems

El asistente dentro de PepX. **No es un modelo de lenguaje**: es un intérprete
determinista con 16 intenciones sobre tres fuentes locales.

## De dónde saca las respuestas

1. **El registro del usuario** — protocolos, lo marcado, viales, zonas, medidas
2. **El registro de operación** — las 60 fichas de `assets/library.json`
3. **Aritmética** — reconstitución, conversión de unidades, duración de un vial

Cada respuesta declara su procedencia. Sin eso, un dato en una burbuja parece una
opinión del programa.

## Qué contesta

Qué toca hoy · cuándo es la siguiente · adherencia y racha · qué protocolos hay
y qué llevan · qué queda de cada vial y cuánto dura al ritmo del usuario · la
ficha de cualquier compuesto · conservación y cadena de frío · reconstitución ·
la marca en la jeringa · conversión mg↔mcg · el patrón de zonas · qué hay en la
biblioteca · quién es.

## La raya

No dice qué tomar, cuánto ni cada cuándo. Cuando la pregunta pide eso, lo dice y
ofrece lo que sí puede. La columna de referencia del registro de operación se
**cita**, con marco y procedencia: es el documento del operador, no una pauta que
la app aplique.

Esto es lo que separa un registro de una receta, y también lo que permite que la
app pueda estar algún día en una tienda.

## Trampa conocida

**Los patrones de intención no pueden cerrar con `\b`.** En español la palabra
que el usuario escribe casi nunca es la raíz: escribe «viales», «protocolos»,
«conserva», «próxima». Un `\b` al final exige frontera justo después de la raíz,
así que `vial` no engancha «viales» y la intención se cae al «no lo cogí».

Se comió tres intenciones enteras antes de detectarse. El `\b` de delante sí se
queda. Las palabras cortas que son enteras —mes, ml, bac, voy, luz— llevan el
suyo propio.

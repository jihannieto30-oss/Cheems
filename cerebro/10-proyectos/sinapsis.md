---
tags: [sinapsis, cerebro, herramienta]
alias: [la web del cerebro, Sinapsis]
estado: vivo
actualizado: 2026-08-06
---

# Sinapsis — el cerebro en web

Un fichero HTML que se **genera desde el vault**. No es una copia dibujada a
mano que envejece en cuanto alguien escribe una nota: es una compilación.

```bash
python3 sinapsis/build.py --peptidex ../Cheems
```

Eso es lo único que la hace «viva». Una web del cerebro que hubiera que
actualizar a mano sería una tercera copia de la verdad, y con dos ya hay
bastante.

## Cuatro vistas

| | para qué |
|---|---|
| **Grafo** | la forma del cerebro: qué está conectado con qué |
| **Buscar** | texto completo, cuando ya sabes qué buscas |
| **Agentes** | qué han hecho los cinco y qué vigilan |
| **Optimizar** | el análisis, cuando no sabes qué mirar |

La de Agentes sale de `90-meta/agentes/registro.jsonl` y de los propios
`.claude/agents/*.md`. La medida que enseña cada ficha es de **resultado** —
mide lo que el agente vigila, no al agente. Ver [[como-mejoran-los-agentes]].

## El «agente», sin adornos

**No es un modelo de lenguaje.** No hay servidor y no sale ninguna petición: es
un analizador determinista, igual que [[pepcheems]]. Recorre el vault y el
registro de operación de [[peptidex]] y aplica reglas concretas.

Lo que gana: contesta al instante, no se inventa nada, y **cada hallazgo se
puede comprobar a mano**. Lo que pierde: no razona sobre lo que encuentra. Para
eso está una sesión de Claude, que sí puede leer esto y decidir.

## Lo que mira

**Del cerebro** — enlaces rotos · notas que nadie enlaza · marcadas como vivas
pero paradas · bandeja sin vaciar · notas sin etiquetas.

**De PEPTIDEX** — compuestos casi sin ficha · sin miligramos de vial (no entran
en la calculadora) · sin volumen de disolvente · sin dato de conservación (a
PepCheems no le queda qué contestar) · los que caen en «Otros» · nombres que se
contienen unos a otros.

## Regla de oro del panel

Cada regla tiene que contestar a **«¿qué se rompe si esto sigue así?»**. Una
regla que no sepa contestar a eso no es un hallazgo, es una estadística — y un
panel lleno de estadísticas deja de leerse en una semana.

Y un falso positivo es peor que no tener panel: en cuanto sale uno, dejas de
creerte los demás. Ya pasó una vez —los `[[enlaces]]` dentro de comillas de
código contaban como enlaces rotos— y por eso el extractor ahora quita el
código antes de mirar.

## Publicada

También se puede publicar como página con `--artifact`. Esa variante deja que
el tema lo mande el visor en vez de acordarse del suyo.

## Ver también

- [[pepcheems]] — el mismo enfoque, dentro de la app
- [[peptidex]] — de dónde salen las 60 fichas

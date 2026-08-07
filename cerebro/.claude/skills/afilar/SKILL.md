---
name: afilar
description: Mejora a un agente después de que haya fallado o se le haya escapado algo. Úsala cuando un agente no encuentre algo que debería haber encontrado, dé un falso positivo, o Jihan diga "esto se le pasó", "el agente falló" o "que aprenda esto". También al cerrar una tarea donde un agente se quedó corto.
---

# Afilar un agente

Los agentes **no aprenden solos**. No hay entrenamiento, no hay pesos, no hay
memoria entre ejecuciones. Un agente es un fichero de instrucciones.

Mejoran de una sola forma: **alguien edita ese fichero**. Esta skill es ese
alguien, y lo que hace que el cambio quede registrado en vez de perderse.

## Cuándo se afila

- Se le escapó algo que estaba en su terreno
- Dio un **falso positivo** — más grave que lo anterior: un revisor que se
  equivoca deja de leerse, y entonces el día que acierte nadie le hará caso
- Apuntó a un fichero que ya no existe
- Se metió donde no le tocaba

## Cómo se hace

**1 · Nombra el caso concreto.** No «mejorar la detección». Sino: «no encontró
que Semaglutide no tiene `mg` porque sólo miraba `sku`». Un caso sin ejemplo no
se puede comprobar después.

**2 · Decide si es regla o criterio.**
- **Regla** — algo comprobable. Va a la sección de su material o de su rúbrica.
- **Criterio** — un juicio. Va a su forma de decidir, con el porqué.

**3 · Edita `.claude/agents/<nombre>.md`** en el repo `Cheems`. Mínimo lo que
haga falta. **Un agente que crece sin parar deja de tener criterio**: si su
fichero pasa de unas 600 palabras, algo sobra, y probablemente sean tres reglas
que se pueden decir en una.

**4 · Apunta el cambio** en `90-meta/agentes/registro.jsonl`, una línea:

```json
{"ts":"AAAA-MM-DDTHH:MM:SS","agente":"catalogo","tarea":"afilado","hallazgos":0,"arreglados":0,"nota":"ahora mira bac además de mg"}
```

**5 · Commit** con el caso en el mensaje. Dentro de tres meses, el mensaje del
commit es lo único que explicará por qué existe esa regla.

## Lo que NO es esto

No es entrenamiento. Un agente no tiene experiencia acumulada, y decir que
«aprende» sería mentir sobre lo que pasa. Lo que crece es su fichero, lo que
mejora es lo que vigila, y las dos cosas se pueden mirar en Sinapsis.

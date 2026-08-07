---
name: parte-del-dia
description: Prepara el parte de la mañana — qué hay abierto, qué se quedó a medias, qué toca hoy. Pensado para que lo dispare una Rutina a primera hora, pero también vale si Jihan pregunta "¿cómo vamos?" o "¿qué tengo hoy?".
---

# El parte del día

## De dónde sale

1. **La última entrada de `90-meta/bitacora/`** — dónde se quedó la cosa.
2. **`10-proyectos/`** — qué hay con `estado: vivo`.
3. **El repo `jihannieto30-oss/Cheems`** — commits nuevos, PRs abiertos, CI roja.
4. **`90-meta/decisiones.md`** — si hay algo marcado como pendiente de decidir.

## Cómo se escribe

Corto. Si el parte necesita scroll, no es un parte.

```markdown
# Parte · <día> <fecha>

**Dónde se quedó:** una frase.

**Abierto ahora**
- proyecto — estado en media línea

**Ojo con**
- sólo si hay algo de verdad: CI roja, un PR sin revisar, algo que se prometió
  para hoy

**Yo empezaría por**
- una cosa. Una. Y por qué esa.
```

## Reglas

- **Si no hay nada que reportar, dilo en una línea y calla.** Un parte diario
  que inventa contenido para justificarse deja de leerse en una semana.
- No repitas lo que ya dijiste ayer si no ha cambiado.
- «Yo empezaría por» es una recomendación, no una orden, y va con su motivo.

# El cerebro — cómo montarlo

Vault de Obsidian que hace de memoria persistente para Claude.

## Montarlo, una vez

**1 · Ábrelo en Obsidian**
*Abrir carpeta como vault* → elige esta carpeta.

**2 · Súbelo a GitHub, en privado**
```bash
git init && git branch -M main
git add -A && git commit -m "cerebro inicial"
git remote add origin https://github.com/<usuario>/cerebro.git
git push -u origin main
```

**3 · Plugin Obsidian Git**
Ajustes → Complementos de la comunidad → **Obsidian Git**.
- *Vault backup interval*: 10 minutos
- *Auto pull on startup*: activado
- *Pull updates on startup*: activado

Con eso Obsidian empuja lo que escribes tú y se trae lo que escribe Claude.

**4 · Dale acceso a Claude**
En una sesión: «añade el repo `<usuario>/cerebro`».
Si GitHub lo deniega, se autoriza en `claude.ai/admin-settings`.

## Cómo funciona

`CLAUDE.md` es el interruptor. Claude lo lee solo, el primero, en cada sesión.
Sin él esto es una carpeta; con él es memoria.

`.claude/skills/` son procedimientos que Claude ejecuta igual siempre.

**El proceso** — propias de este cerebro:

| skill | para qué |
|---|---|
| `bitacora` | escribir el día y commitear. **La que hace que el cerebro crezca** |
| `nota` | capturar algo en el sitio correcto |
| `parte-del-dia` | el parte de la mañana |
| `revision-semanal` | vaciar la bandeja, cerrar lo muerto, resumir |

**La sintaxis** — de [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills),
MIT, ver `.claude/skills/PROCEDENCIA.md`:

| skill | para qué |
|---|---|
| `obsidian-markdown` | wikilinks, callouts, propiedades, embebidos |
| `obsidian-bases` | ficheros `.base` — vistas de tabla, filtros, fórmulas |
| `json-canvas` | ficheros `.canvas` — mapas y diagramas |
| `obsidian-cli` | manejar Obsidian desde la terminal · **necesita Obsidian abierto** |
| `defuddle` | leer una web sin la basura · `npm i -g defuddle` |

Si prefieres que se actualicen solas en vez de llevarlas copiadas dentro, en tu
Claude Code local:

```
/plugin marketplace add kepano/obsidian-skills
```

y borra las cinco carpetas de `.claude/skills/`. Con la copia funcionan en
cualquier sesión sin instalar nada; con el plugin se actualizan solas pero sólo
en el aparato donde lo instales.

## Sinapsis — verlo en web

```bash
python3 sinapsis/build.py --peptidex ../Cheems
open sinapsis/index.html
```

Grafo navegable, buscador y un análisis de lo que está roto o incompleto, tanto
en el vault como en las fichas de PEPTIDEX. Se regenera de cero cada vez, así
que siempre es lo que hay ahora. Ver [[sinapsis]].

## La única regla que importa

**Si no se escribe, no existe.** Claude arranca en blanco cada sesión. Lo que
esté aquí, lo sabe. Lo que no, no pasó.

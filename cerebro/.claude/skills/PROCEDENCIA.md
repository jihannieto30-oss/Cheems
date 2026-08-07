# De dónde salen estas skills

## Propias del cerebro

`bitacora` · `nota` · `parte-del-dia` · `revision-semanal`

Son el **proceso**: cuándo escribir, dónde colocar algo, qué revisar. Se editan
libremente, forman parte de este vault.

## Vendidas de terceros

`defuddle` · `json-canvas` · `obsidian-bases` · `obsidian-cli` · `obsidian-markdown`

Son la **sintaxis y los formatos** de Obsidian: wikilinks, callouts,
propiedades, ficheros `.base` y `.canvas`.

    origen    https://github.com/kepano/obsidian-skills
    autor     Steph Ango (kepano) — CEO de Obsidian
    licencia  MIT
    commit    a1dc48e
    copiado   2026-08-06

**No las edites.** Para actualizarlas:

```bash
git clone --depth 1 https://github.com/kepano/obsidian-skills.git /tmp/os
rm -rf .claude/skills/{defuddle,json-canvas,obsidian-bases,obsidian-cli,obsidian-markdown}
cp -r /tmp/os/skills/* .claude/skills/
```

Revisadas antes de instalar: sin exfiltración, sin código remoto, sin
instrucciones de anular reglas. La única arista es `obsidian eval`, que ejecuta
JavaScript dentro de tu propio Obsidian — es un comando documentado del CLI
oficial, pero es el que hay que mirar si alguna vez actualizas sin revisar.

## Qué no funciona desde una sesión web

- **`obsidian-cli`** necesita Obsidian **abierto en tu ordenador** y el CLI
  instalado. Desde el contenedor remoto no hay a qué conectarse. Sirve en Claude
  Desktop o en Claude Code local.
- **`defuddle`** necesita `npm install -g defuddle`. Si no está, se cae a
  WebFetch y no pasa nada.

Las otras tres —markdown, bases, canvas— son sólo conocimiento y funcionan en
cualquier sitio.

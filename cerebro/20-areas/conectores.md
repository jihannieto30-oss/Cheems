---
tags: [conectores, integraciones, meta]
alias: [integraciones, conexiones, qué está conectado]
estado: vivo
actualizado: 2026-08-06
---

# Conectores — qué está conectado y qué no

Comprobado el 2026-08-06 desde una sesión: **ninguno activo**. Lo que sigue es
el estado real y qué hace falta para cada uno.

## Estado

| | estado | qué falta |
|---|---|---|
| **GitHub** | ✅ funciona | nada. `jihannieto30-oss/Cheems` enganchado |
| **Correo (Gmail)** | ⬜ sin activar | Jihan lo autoriza en claude.ai |
| **Notion** | ⬜ sin autorizar | aparece pero pide autorización |
| **Canva** | ⬜ sin autorizar | ídem |
| **Instagram** | ❌ no existe | ver abajo |

## El correo

Existe conector de Gmail en claude.ai. Lo activa **él**, en ajustes de
conectores — es su cuenta y su consentimiento, no se puede hacer desde una
sesión.

Con eso: leer, buscar, resumir, redactar. **Enviar se confirma siempre antes.**

## Instagram — la explicación larga, para no volver a discutirla

**No hay conector de Instagram para Claude.** Y la única vía legítima es la
Graph API de Meta, que pide:

- cuenta **Business o Creator** — una personal no puede, y no hay rodeo
- vinculada a una página de Facebook
- una app de desarrollador en Meta, con revisión de app
- token de acceso de larga duración (60 días, renovable)

**Lo que la API sí deja:** publicar fotos, vídeos, reels y carruseles; leer y
responder comentarios; leer métricas; recibir mensajes directos (con la
Messenger API for Instagram).

**Lo que no deja, y no es cuestión de permisos:** seguir o dejar de seguir, dar
like a publicaciones ajenas, ver el feed de otros, leer historias ajenas.

**Lo que NO se va a construir:** automatizar la app con un navegador o contra la
API privada. Va contra los términos de Meta y la consecuencia habitual es que
desactiven la cuenta. Siendo el Instagram el escaparate de [[peptidex]], el
resultado probable de esa vía es perder la cuenta. No es prudencia — es
aritmética de riesgo.

### Si algún día se quiere hacer bien

1. Pasar la cuenta a Business y vincularla a una página de Facebook
2. Crear una app en `developers.facebook.com`
3. Pedir `instagram_basic`, `instagram_content_publish` y
   `instagram_manage_comments`, y pasar la revisión
4. Sacar un token de larga duración y guardarlo **fuera del repo**
5. Entonces sí: un script en el repo que publique y lea comentarios, y una
   Rutina que lo use

El paso 3 es el que tarda. Los demás son de una tarde.

## La regla que vale para todos

**Nada sale hacia fuera sin confirmación.** Da igual qué conector sea: mandar,
publicar, borrar o fusionar se prepara y se deja listo. La ejecución la
autoriza él.

Ver [[encargos]] para cómo se deja trabajo pendiente.

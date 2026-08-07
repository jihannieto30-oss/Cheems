---
tags: [pepx, proyecto, app]
alias: [la app, PepX]
estado: vivo
actualizado: 2026-08-06
---

# PepX — la aplicación

Un solo fichero HTML, instalable en el teléfono desde la pantalla de inicio.
Vive en `web/pepx/`, se ensambla con `web/build_app.py`.

Repo: `jihannieto30-oss/Cheems` · rama de trabajo `claude/peptidex-luxury-web-xpptte`

## Qué hace

Registra protocolos, inyecciones, medidas y viales. Enseña la biblioteca de 60
compuestos. Hace la aritmética de reconstitución. **No propone dosis** —
[[decisiones|la raya]].

## Pantallas

`dash · prot · comp · inj · cal · prog · lib · edu · set · more · find · legal`

Cinco pestañas abajo en el teléfono (Inicio, Protocolos, Compuestos, Diario,
Más), barra lateral de nueve destinos en escritorio.

## Cómo se construye

```
cd web
python3 mk_appart.py     # recorta el arte de marca y producto → assets/appart.json
python3 build_app.py     # ensambla → pepx/index.html + manifiesto + iconos
```

`pepx/index.html` está en `.gitignore` a propósito: es artefacto de construcción.

## Piezas

- [[pepcheems]] — el asistente
- [[modelo-de-datos]] — cómo se guarda un protocolo y el registro

## Lo que falta

- La cuenta en un servidor, que es lo que desbloquea cobrar de verdad. Hoy el
  plan vive en el navegador y quien sepa abrir la consola se lo salta.
- Capacitor y las tiendas, que es casi mecánico una vez esté lo anterior.
- Avisos programados en iPhone: sólo con compilación nativa.

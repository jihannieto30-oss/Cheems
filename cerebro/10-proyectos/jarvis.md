---
tags: [jarvis, facturador, agente]
alias: [Jarvis, la consola]
estado: vivo
actualizado: 2026-08-07
---

# Jarvis — la consola de mando del facturador

Vive dentro de `docs/PEPTIDEX_Facturador.html`. Se injerta con
`python3 src/build_jarvis.py`, que es idempotente: quita la copia previa antes
de meter la nueva, así que correrlo dos veces da el mismo documento.

Se abre con el botón flotante o con **Ctrl/Cmd + J**.

## Qué hace

**Contesta** con cifras que salen de `clients` y `docs`, nunca estimadas:
cuánto se facturó en un periodo, quién debe, la ficha de un cliente,
cotizaciones sin convertir, el resumen del negocio.

**Ejecuta**, que es lo que lo hace agente y no un chat:

| se le dice | hace |
|---|---|
| «nueva factura para Carlos» | abre el documento en modo factura con Carlos cargado |
| «nuevo cliente Ana Ruiz» | lo da de alta y refresca el registro |
| «marca la F-0042 como pagada» | **pide confirmación** y luego la marca |
| «abre el registro» | navega |

**Escucha y habla.** Micrófono con `SpeechRecognition` y voz con
`speechSynthesis`, las dos del navegador — sin servidor ni clave. Con la voz
encendida, al terminar de contestar vuelve a abrir el micrófono solo: eso es lo
que convierte dictar una orden en tener una conversación.

Se corta al cerrar el panel, al apagar el conmutador o al pasar un turno en
silencio. **Un micrófono que se reabre para siempre es una batería vacía y un
susto.**

**Desde el teléfono.** Lee `?jv=<pregunta>` de la dirección, así que un atajo
de iOS puede dictar y abrirlo: «Oye Siri, Jarvis». La receta está en
`docs/JARVIS_EN_EL_TELEFONO.md`.

Lo que **no** hay es palabra de activación propia. Quien escucha es Siri;
Jarvis recibe lo que Siri le pasa. Una web no puede escuchar de fondo, y es
mejor así.

## Lo que no es

No tiene consciencia y no es un modelo de lenguaje. Se lo dice a quien le
pregunte. Ver [[decisiones]].

## La raya

**Nada destructivo sin confirmar.** Marcar pagada pide un «sí» antes de tocar
el dato. Es el mismo criterio que rige a [[agentes|los cinco agentes]] y a los
[[encargos]].

## Trampas conocidas

**Las raíces, no las palabras.** `factur`, no `factura`: lo que se escribe es
«facturé», «facturado», «facturación». Ya se cayó una vez — «¿cuánto facturé
este mes?» no enganchaba. Mismo fallo que en [[pepcheems]], distinto sitio.

**El facturador no es responsivo.** Tiene 179 px de desborde a 390 px de ancho,
y **ya los tenía antes de Jarvis**. El panel encaja exacto (390 de 390); lo que
se sale es la hoja de factura de debajo. Arreglarlo es rehacer la maquetación de
un documento de 300 KB y no se ha hecho.

## Ver también

- [[peptidex]] · [[pepcheems]] — el mismo enfoque, en la app

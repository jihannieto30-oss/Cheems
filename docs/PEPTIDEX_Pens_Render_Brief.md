# PEPTIDEX — Brief del render de las plumas

Para producir el arte que entra en el escenario blanco de `#/pens`.
El sitio ya está construido y espera tres ficheros; esto es sobre cómo
conseguirlos.

---

## Lo que hay que entender antes de escribir un solo prompt

El render actual está iluminado **para un set negro**: cuerpo casi negro,
filos de luz muy brillantes, caída a oscuro en los bordes.

Un objeto sobre un set blanco se comporta al revés. Recibe rebote blanco por
los dos lados, así que su cuerpo se abre a gris carbón en vez de quedarse en
negro; sus reflejos especulares son **estrechos y suaves**, no filos brillantes;
y las sombras que proyecta son claras y difusas en vez de negras y duras.

Por eso **«cambia sólo el fondo» produce un mal resultado.** No es un problema
de recorte: aunque el recorte fuera perfecto, el objeto seguiría llevando
encima la luz de otra habitación, y eso se nota inmediatamente aunque nadie
sepa decir por qué. Se ve *pegado*.

Hay un segundo problema, más práctico: las cajas y las plumas son **negro sobre
negro**. Sus caras están apenas un par de niveles por encima del fondo, así que
cualquier umbral que separe el fondo se come también parte del producto. Sin
canal alfa del render original, un recorte limpio no existe.

**Conclusión: no recortar. Volver a renderizar sobre el set blanco.**

---

## El prompt

> Re-render the same PEPTIDEX injector pen, **relit for a white studio set**.
>
> **Keep the design identical.** Same PEPTIDEX / Px logo, same typography, same
> label layout, same dosage window, same transparent needle cap, same knurled
> end cap, same proportions, same line accent colour. Do not redesign, do not
> restyle, do not add or remove any element.
>
> **Change the lighting, not the design.** Large soft overhead softbox, white
> bounce cards on both sides. The body reads as deep charcoal with visible
> gradation, not as pure black. Specular highlights are narrow and soft, not
> bright rim lights. One soft contact shadow directly under the pen. Studio
> product photography, 85 mm equivalent, straight-on, no perspective
> distortion.
>
> **Background: pure white, seamless, no gradient.** Nothing else in frame — no
> box, no props, no pedestal, no molecules, no glow, no particles, no lab
> equipment, no text.
>
> **Output: one pen, vertical, centred, full length in frame, on transparent
> background (PNG with alpha).**

Tres pasadas, una por línea, cambiando sólo el color de acento:

| Línea | Acento | Ventana de dosis |
|---|---|---|
| FITNESS | azul | azul |
| BEAUTY | rosa | rosa |
| LONGEVITY | blanco / plata | blanco |

### Las dos frases que hacen el trabajo

- **«relit for a white studio set»**
- **«change the lighting, not the design»**

Sin ellas, cualquier modelo devuelve el mismo objeto de set negro sobre un
fondo blanco, que es exactamente el resultado que hay que evitar.

---

## Lo que NO hay que pedir

| No pedir | Por qué |
|---|---|
| Pedestales de mármol | Compiten con el producto. Sobre blanco puro con sombra de contacto se ve más caro. |
| Sombra o reflejo en la imagen | Los dibuja el sitio, contra el ancho real de cada pieza. Si vienen en la imagen, se duplican. |
| Las tres plumas en una sola imagen | El sitio las coloca y las escala por separado. Una imagen conjunta impide alinearlas. |
| La caja | El escenario es de producto, no de packaging. La caja tiene su sitio, y no es el hero. |
| Fondo blanco «con degradado suave» | Pedir transparencia. El fondo lo pone la página. |

---

## Cómo entra al sitio

```
web/assets/pens/fitness.png
web/assets/pens/beauty.png
web/assets/pens/longevity.png

python3 mk_pens.py
python3 build_restore.py
```

`mk_pens.py` recorta el margen transparente, iguala la escala de las tres
piezas a 1100 px de alto y las comprime a WebP. No redibuja nada: mueve y
reescala.

Mientras no haya arte, el escenario dibuja tres contornos con el nombre de su
línea debajo. La página no se rompe y no aparenta tener un producto que
todavía no ha salido.

### El atajo, y hasta dónde llega

Si sólo tienes el render sobre fondo negro:

```
python3 mk_pens.py --key
```

Separa la pieza del fondo por luminancia y rellena los huecos interiores.
Sirve **para maquetar y ver el encuadre**. Para publicar, no: por lo del negro
sobre negro, y sobre todo porque el problema de fondo es la luz, y la luz no se
arregla recortando.

---

## Una nota que no es técnica

Una pluma lista para usar, sobre pedestal, con estética de lanzamiento de
producto de consumo, empuja en contra del «Research Use Only» que llevan la
caja y la pluma. El escenario que está construido lo tiene en cuenta: nada de
manos, nada de piel, nada de gesto de uso, y la nota RUO va debajo de la
composición y no en letra pequeña.

Conviene que el render mantenga esa misma disciplina: **el producto solo, sin
contexto de uso**.

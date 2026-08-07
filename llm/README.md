# Un LLM mínimo, desde cero

Transformer decodificador estilo GPT en PyTorch. Sin `nn.Transformer`, sin
`nn.MultiheadAttention`, sin Hugging Face, sin Lightning, sin Accelerate. De
PyTorch se usan las piezas de álgebra y el autograd; todo lo demás está escrito
aquí.

```
llm/
  px/tokenizador.py     BPE a nivel de bytes
  px/modelo.py          el Transformer
  px/datos.py           corpus desde el repo, partición, lotes
  px/conversaciones.py  turnos de diálogo desde hechos reales
  entrena.py            el bucle
  genera.py             hablar con el modelo
  evalua.py             cuánto acierta, en número
```

```bash
python3 llm/entrena.py --pasos 1200 --capas 4 --dmodelo 192 --sdpa
python3 llm/genera.py --charla
python3 llm/evalua.py
```

---

## Las decisiones, y por qué

| Pieza | Elegido | Motivo |
|---|---|---|
| Tokenizador | BPE de bytes | Sin `<UNK>` por construcción. «Tirzepatida» y «BPC-157» tienen que poder escribirse. |
| Normalización | RMSNorm | Un parámetro menos que LayerNorm, misma calidad. |
| Posición | RoPE | Entra como un giro en la atención, así que el modelo ve *distancias*, no índices. |
| Orden | Pre-norm | Camino de gradiente limpio desde la pérdida a la capa 1. Post-norm necesita warmup largo o diverge. |
| MLP | SwiGLU, oculto 8/3·d | Mejor pérdida a igualdad de parámetros. |
| Sesgos | Ninguno | No aportan nada medible en un decodificador. |
| Embeddings | Atados | Aquí son el 18 % de los parámetros. |
| Atención | A mano, con `--sdpa` opcional | El objetivo es ver la matemática. El núcleo fusionado da lo mismo hasta 2e-7 y va más rápido. |

La atención, entera:

```
softmax( (Q·Kᵀ)/√d_k + máscara ) · V
```

`√d_k` no es decorativo: sin él la varianza crece con la dimensión, el softmax
se satura y el gradiente se muere. La máscara triangular es lo único que separa
a un decodificador de un codificador.

## Lo que se comprueba antes de entrenar

Cuatro invariantes, en `llm/pruebas.py`. Los cuatro fallaron alguna vez
mientras se escribía esto:

1. **Pérdida inicial ≈ ln(V).** 6.90 contra 6.93. Si sale más baja, hay fuga
   del objetivo; si sale más alta, la inicialización está rota.
2. **Caché KV == recálculo completo.** Falló: `None` significaba a la vez «sin
   caché» y «caché vacía», así que nunca se llenaba y cada token se atendía
   sólo a sí mismo. Se arregló distinguiendo `None` de `(None, None)`.
3. **Atención a mano == núcleo fusionado.** Falló: con caché, `is_causal` de
   PyTorch enmascara mal porque la consulta no empieza en la posición 0. Se
   pasa la máscara explícita.
4. **Causalidad.** Cambiar el último token no puede mover los logits
   anteriores.

---

## El entrenamiento real

Corpus: **el propio repositorio**. 60 fichas de compuesto pasadas a prosa, las
notas del cerebro, la documentación, más 847 turnos de diálogo construidos
sobre hechos reales del repo. **Las preguntas se plantillan; las respuestas
salen de `library.json` o del cerebro, nunca de la imaginación.** 253.000
caracteres → 70.115 tokens con un vocabulario de 2.051.

Configuración A · 4 capas · 192 dim · 2.164.992 parámetros · CPU, 4 hilos:

| paso | entrenamiento | validación | perplejidad |
|---:|---:|---:|---:|
| 0 | 7.6446 | 7.6354 | 2070.2 |
| 100 | 3.3791 | 3.8440 | 46.7 |
| 300 | 1.9388 | 2.5532 | 12.8 |
| **500** | 1.6731 | **2.4399** | **11.5** |
| 700 | 0.7910 | 2.5866 | 13.3 |
| 1199 | 0.7631 | 2.6652 | 14.4 |

Aprende: 2070 → 11.5 de perplejidad. Y **sobreajusta a partir del paso 500**:
la de entrenamiento sigue bajando hasta 0.76 mientras la de validación sube. No
es un fallo, es aritmética — 0,03 tokens por parámetro cuando la referencia de
Chinchilla son 20. Sobra modelo para el dato que hay, y lo que sobra se dedica
a memorizar. Guardar por validación y no por la última salva el checkpoint
correcto.

## Y aquí está lo importante

La pérdida dice lo bien que predice el siguiente token. **No dice si lo que
afirma es verdad.** Se midió (`llm/evalua.py`, 174 preguntas sobre los 60
compuestos), y contra la línea base de responder siempre el valor más común:

| Campo | Modelo | Responder siempre lo más común | |
|---|---:|---:|---|
| Conservación | 33,3 % | **54,4 %** | peor |
| Solvente | 84,2 % | **86,0 %** | peor |
| Clase | **68,3 %** | 41,7 % | mejor |

**El 70,1 % de las respuestas nombran a un compuesto distinto del preguntado.**

En dos de los tres campos, el modelo es peor que una constante. El 84 % del
solvente no es conocimiento: es que 86 % de las fichas dicen «BAC Water».

Lo que sale por la pantalla:

```
> what dose for TB-500
  The operations register lists 250 mcg por toma · Cada 24 horas (Diario)
  for Thymalin. I am quoting a record, not recommending a dose …
```

Inglés correcto. Formato correcto. Aviso de cumplimiento correcto — se lo
aprendió entero. **Y la cifra es de otro compuesto.**

Eso es exactamente el fallo que no puede permitirse un negocio que vende
compuestos: una cifra de dosis, bien redactada y con aire de autoridad, pegada
al nombre equivocado. Es lo que `lex` existe para impedir.

### La conclusión de ingeniería

**Este modelo no se conecta a Jarvis como fuente de hechos.** Ni éste ni
ninguno entrenado con 63.000 tokens. Un modelo de 2 M de parámetros aprende la
*forma* del dominio —y la aprende muy bien— pero no tiene capacidad para atar
cada hecho a su nombre.

La arquitectura correcta, y la que está montada:

```
pregunta → las reglas buscan el hecho en library.json / el cerebro
         → el hecho, literal, es lo que se responde
         → el modelo, si acaso, sólo redacta alrededor del hecho
```

Recuperar y luego redactar. El hecho nunca lo pone el modelo.

## Si se quiere que esto sí converse

Por orden de rentabilidad:

1. **Más datos.** 63.000 tokens es el problema. Para 2 M de parámetros hacen
   falta ~40 M de tokens según Chinchilla — tres órdenes de magnitud más.
2. **Afinar un modelo base ya entrenado** en vez de partir de cero. Con los
   turnos que ya genera `conversaciones.py`, un modelo de 1–3 B afinado da un
   Jarvis conversacional de verdad. Es la vía corta y la barata.
3. **Entrenar desde cero de verdad** — GPU, semanas, corpus general. Tiene
   sentido para aprender, no para tener un producto.

Para hoy, la vía es la 2, y mientras tanto Jarvis contesta con reglas, que es
lo que garantiza que sólo diga lo que hay en los ficheros.

---

## Nota sobre reproducibilidad

El corpus se construye del repo en el momento de entrenar. Si el repo cambia,
el corpus cambia: entre las dos corridas de aquí, el número de tokens pasó de
70.115 a 70.429 porque en medio se renombraron los agentes. Para comparar
configuraciones en serio hay que congelar el corpus a un fichero primero.

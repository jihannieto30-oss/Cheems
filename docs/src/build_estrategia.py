#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PEPTIDEX — ESTRUCTURA Y CRECIMIENTO
Genera PEPTIDEX_Estrategia.html: un documento imprimible en A4.

No lleva datos de clientes, ni credenciales, ni claves. Es un documento de
trabajo interno y se puede compartir con un socio o un contador sin limpiar
nada antes.
"""
import os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, '..', 'PEPTIDEX_Estrategia.html')

HOY = datetime.date.today().strftime('%d.%m.%Y')

# ---------------------------------------------------------------------------
# El contenido. Cada bloque es (tipo, ...) y se compone abajo. Escribirlo como
# datos y no como HTML a mano es lo que permite reordenar el documento sin
# reescribirlo, que es exactamente lo que va a pasar con un documento así.
# ---------------------------------------------------------------------------

DOC = []
def h1(n, t, s=''):  DOC.append(('h1', n, t, s))
def h2(t):           DOC.append(('h2', t))
def p(t):            DOC.append(('p', t))
def lead(t):         DOC.append(('lead', t))
def ul(*items):      DOC.append(('ul', items))
def ol(*items):      DOC.append(('ol', items))
def box(t, b):       DOC.append(('box', t, b))
def warn(t, b):      DOC.append(('warn', t, b))
def table(head, rows, w=None): DOC.append(('table', head, rows, w))
def quote(t):        DOC.append(('quote', t))
def pagebreak():     DOC.append(('pb',))


# ═══════════════════════════════════════════════════════════════════════════
h1('01', 'Dónde estás', 'El punto de partida, sin adornos')

lead('PEPTIDEX tiene hoy lo que la mayoría de las marcas de este sector no tiene: '
     'un sitio que parece caro, un catálogo de 56 compuestos con ficha técnica, '
     'etiquetas propias, un facturador, un rastreo de pedidos y documentación de '
     'calidad. Eso no es poco — es más de lo que tienen competidores que ya '
     'facturan.')

p('Lo que no tiene todavía es <b>una razón por la que alguien te compre a ti y no '
  'al de al lado</b>, y <b>un camino por el que esa persona llegue</b>. Este '
  'documento es sobre esas dos cosas, en ese orden, porque el orden importa: '
  'traer gente a una tienda que no da una razón para quedarse es pagar por '
  'enseñarle tu catálogo a la competencia.')

box('La ventaja que ya tienes y no estás usando',
    'Tienes ficha técnica de cada compuesto, control de lote y COA. En este mercado '
    'la mercancía es idéntica en todas partes — lo escaso no es el péptido, es '
    '<b>la prueba</b>. Casi nadie publica sus certificados de forma abierta y '
    'verificable. Tú puedes, ya tienes el papeleo hecho, y no te cuesta un peso más.')


h1('02', 'El muro', 'Lo que nadie te dice antes de que pierdas el dinero')

lead('Antes de una sola idea de crecimiento hay que decir esto, porque cambia todo '
     'lo demás: <b>no vas a poder anunciarte por los canales normales.</b>')

table(
  ['Plataforma', 'Qué pasa', 'Consecuencia'],
  [['Meta (Instagram, Facebook)',
    'Prohíbe la publicidad de sustancias no aprobadas y de «productos de salud '
    'peligrosos». Los péptidos de investigación caen ahí.',
    'Cuenta publicitaria bloqueada, y a veces el perfil con ella.'],
   ['Google Ads',
    'Prohíbe suplementos y fármacos no aprobados. La revisión es automática y '
    'después manual.',
    'Anuncios rechazados; reincidir suspende la cuenta.'],
   ['TikTok Ads',
    'Igual, y más estricto.',
    'Rechazo casi inmediato.'],
   ['Stripe · PayPal · Mercado Pago',
    'Los tres listan «research chemicals» entre los negocios prohibidos.',
    '<b>Fondos congelados 90–180 días</b> y cuenta cerrada.']],
  w=[22, 44, 34])

warn('Esto es lo más urgente de todo el documento',
     'El pie de la web dice hoy «Acepta tarjeta, Zelle y PayPal». PayPal cierra '
     'cuentas de este sector y retiene el saldo hasta 180 días. No es un riesgo '
     'teórico: es el patrón conocido del sector. Antes de escalar ventas hay que '
     'mover el cobro a un procesador de alto riesgo que acepte el giro por '
     'escrito, y no depender de un solo método. Cobrar bien es más importante que '
     'vender más: se puede sobrevivir a un mes flojo, no a que te congelen la caja '
     'entera con el inventario ya pagado.')

p('La consecuencia estratégica es sencilla y es buena noticia si la aceptas pronto: '
  '<b>como no puedes comprar tráfico, tienes que ganarlo.</b> Eso es más lento los '
  'primeros seis meses y mucho más defendible después. Un competidor con más '
  'dinero no te puede sacar de encima a golpe de presupuesto, porque el canal '
  'donde estás no se compra.')


h1('03', 'Posicionamiento', 'Una frase, y todo lo demás debajo de ella')

p('En este mercado casi todos dicen lo mismo: pureza alta, envío rápido, precio '
  'bueno. Cuando todos dicen lo mismo, nadie dice nada, y el cliente decide por '
  'precio — que es la única guerra que una marca nueva no puede ganar.')

quote('PEPTIDEX es la marca de péptidos de investigación donde <b>puedes comprobar '
      'lo que compraste</b>: cada lote con su certificado, público y verificable '
      'por número de lote.')

p('No es una promesa de calidad — todos la hacen. Es una promesa de '
  '<b>verificabilidad</b>, que es distinta porque se puede romper en público. '
  'Justo por eso vale: quien la hace se está exponiendo, y quien miente no puede '
  'copiarla.')

table(
  ['En vez de decir', 'Di'],
  [['«Pureza ≥ 99 %»', '«Pureza ≥ 99 %. Aquí está el cromatograma de tu lote.»'],
   ['«Testeado por terceros»', '«Lote PX-2601-BC. Ensayo del 14.01.26. Descárgalo.»'],
   ['«Calidad premium»', '«Si tu lote no cumple especificación, no se envía. Y si llegó, te lo cambiamos.»'],
   ['«Confía en nosotros»', '«No hace falta que confíes. Compruébalo.»']],
  w=[38, 62])

box('La prueba de que el posicionamiento es real',
    'Un posicionamiento sirve cuando obliga a hacer algo incómodo. Éste obliga a '
    'publicar certificados que a veces saldrán peor de lo que te gustaría, y a '
    'reponer lotes que no cumplan. Si no duele un poco, es un eslogan.')


h1('04', 'La arquitectura de marca', 'Qué es cada nombre y de qué manda')

p('Ya hay cuatro niveles de nombre en juego y conviene fijarlos antes de que se '
  'mezclen, porque un cliente confundido no pregunta: se va.')

table(
  ['Nivel', 'Qué es', 'Ejemplo', 'Dónde manda'],
  [['Marca madre', 'La casa. Firma todo.', 'PEPTIDEX',
    'Logo, dominio, factura, contrato'],
   ['Líneas', 'Territorios del catálogo. Ordenan la compra.',
    'FITNESS · BEAUTY · LONGEVITY', 'Navegación, etiqueta, color de línea'],
   ['Submarcas', 'Familias de producto que no son compuestos.',
    'PepX Pens · Accessories', 'Sección propia en el catálogo'],
   ['Nombre propio', 'El nombre de cada compuesto.', 'ATLAS, LUMEN, AEON',
    'Tarjeta, ficha, conversación']],
  w=[16, 32, 26, 26])

h2('La regla que no se rompe')

p('<b>El nombre científico nunca desaparece.</b> Ni en la tarjeta, ni en la ficha, '
  'ni en la etiqueta, ni en la factura. El nombre propio va encima, no en lugar de. '
  'Hay dos razones y las dos son caras si se ignoran:')

ol('<b>Búsqueda.</b> Nadie busca «ATLAS». Todo el mundo busca «BPC-157». Tu tráfico '
   'orgánico entero depende de que el nombre científico esté en el título, en la '
   'URL y en el texto. Es exactamente el canal que sí tienes: no lo tapes con tu '
   'propia marca.',
   '<b>Trazabilidad.</b> Quien recibe un vial tiene que saber qué contiene sin '
   'consultar una tabla de equivalencias. La etiqueta y la ficha llevan el código; '
   'eso no se toca.')

box('Por qué los nombres propios sí valen la pena, entonces',
    'No sirven para que te encuentren — sirven para que te recuerden y para que te '
    'repitan. «Pídeme otra vez el ATLAS» es una conversación de marca. '
    '«Pídeme otra vez el BPC-157» es una conversación de commodity. El primero lo '
    'tienes tú; el segundo lo tiene cualquiera.')

h2('Los nombres, y de dónde salen')

p('Un registro por línea, para que el nombre diga a qué familia pertenece antes de '
  'leer nada más. Ninguno promete un resultado: evocan materia, luz o tiempo. Donde '
  'rozan el mecanismo, describen química conocida y no efecto esperado.')

table(
  ['Línea', 'Registro', 'Ejemplos'],
  [['FITNESS', 'Materia forjada — mineral, mecánica, carga',
    'ATLAS · STRATA · ANVIL · KEEL · INGOT · FERRY'],
   ['BEAUTY', 'Luz — amanecer, seda, claridad',
    'AURELIA · LUMEN · SILK · ALBA · VELVET · HALO'],
   ['LONGEVITY', 'Tiempo — permanencia, noche, vigilia',
    'AEON · VESPER · NOCTURNE · SENTINEL · ECLIPSE · COBALT']],
  w=[16, 40, 44])

warn('Antes de imprimir un solo nombre',
     'Hay que comprobar que ninguno choca con una marca registrada en México (IMPI) '
     'y en Estados Unidos (USPTO) dentro de las clases que te tocan. Es un trámite '
     'de un par de días y cuesta poco; descubrirlo después de imprimir diez mil '
     'etiquetas cuesta las diez mil etiquetas. Empieza por los seis nombres de las '
     'referencias que más vendes y deja el resto para después.')


h1('05', 'La estructura del catálogo', 'Que crezca sin que se caiga')

p('Hoy hay 56 compuestos en tres líneas, y van a entrar dos secciones más. Sin una '
  'estructura explícita, en un año habrá 200 referencias y nadie encontrará nada — '
  'ni el cliente ni tú.')

h2('El código de referencia')

p('Cada presentación necesita un identificador único que no dependa del nombre. '
  'Propuesta, legible por una persona y ordenable por una máquina:')

quote('<span class="mono">PX-FIT-BC-010</span><br>'
      '<span class="small">marca · línea · compuesto · miligramos</span>')

p('Con eso, <span class="mono">PX-FIT-BC-010</span> es BPC-157 de 10 mg de la línea '
  'Fitness, y ordena solo en cualquier hoja de cálculo. Las dos nuevas secciones '
  'entran igual: <span class="mono">PX-PEN-…</span> y <span class="mono">PX-ACC-…</span>. '
  'El número de lote va aparte y es el que enlaza con el COA: '
  '<span class="mono">L-2601-BC-01</span> — año, mes, compuesto, orden del lote.')

h2('Los tres niveles de profundidad')

table(
  ['Nivel', 'Qué contiene', 'Cuántos', 'Para quién'],
  [['Núcleo', 'Lo que se vende todas las semanas', '10–15 referencias',
    'El 80 % de tu facturación'],
   ['Catálogo', 'Lo que se vende a veces', '30–40 referencias',
    'Profundidad y credibilidad'],
   ['Bajo pedido', 'Lo raro, sin stock, plazo 2–3 semanas', 'El resto',
    'Te hace ver serio sin inmovilizar dinero']],
  w=[16, 40, 20, 24])

box('Lo que esto te ahorra',
    'Hoy tratas 56 referencias como si todas valieran lo mismo. No es cierto: '
    'un puñado paga la renta y el resto ocupa capital. Marcar los tres niveles te '
    'dice dónde poner el inventario, qué fotografiar primero, qué escribir primero '
    'y qué no reponer nunca sin pedido en mano.')


h1('06', 'El precio y el momento de la verdad', 'Dónde se te cae la venta')

p('Ahora mismo hay dos comportamientos distintos: en la región USA se puede añadir '
  'al carrito con precio, y en México todo va por cotización. Eso segundo es una '
  'decisión seria y hay que tomarla a conciencia, no por defecto.')

table(
  ['', 'Cotización', 'Precio a la vista'],
  [['Convierte', 'Bajo — se pierde el 70–90 % en el formulario',
    'Alto — la decisión es inmediata'],
   ['Margen', 'Mejor: negocias cada caso', 'Peor: el precio es público'],
   ['Trabajo', 'Cada pedido es una conversación', 'Cero por pedido'],
   ['Escala', 'Se rompe a los 20 pedidos al día', 'No se rompe'],
   ['Sirve para', 'Volumen, OEM, socios', 'Cliente que repite']],
  w=[16, 42, 42])

p('<b>Recomendación:</b> los dos, pero separados. Precio a la vista en el núcleo '
  '(10–15 referencias) para que el cliente que ya sabe lo que quiere compre sin '
  'hablar con nadie; cotización para volumen, OEM y bajo pedido. Es la estructura '
  'que ya tienes a medias — sólo hay que decidirla en vez de heredarla de la región.')

h2('Las tres fugas que tienes hoy')

ol('<b>El formulario de cotización pide demasiado.</b> Nombre, correo, empresa, '
   'interés y cantidades es mucho para alguien que aún no te conoce. Con correo y '
   'qué quiere basta; lo demás se pregunta en la respuesta, cuando ya hay '
   'conversación.',
   '<b>No hay precio de referencia en México.</b> Sin un rango, el visitante no sabe '
   'si eres su liga o no, y ante la duda no pregunta: cierra. Un «desde $X» ya '
   'ordena la decisión.',
   '<b>No hay prueba en el momento de decidir.</b> El COA está en otra página. '
   'Tiene que estar en la ficha del compuesto, a un toque, en el instante exacto '
   'en el que la persona duda.')


h1('07', 'Los canales que sí funcionan', 'Cinco, por orden de retorno')

lead('No puedes comprar anuncios. Todo lo que sigue es tráfico ganado, y va en el '
     'orden en que hay que atacarlo — no en el orden en que apetece.')

h2('1 · Búsqueda orgánica — el más importante, y con diferencia')

p('Cada compuesto es una búsqueda con intención de compra. «BPC-157 comprar '
  'México», «TB-500 precio», «GHK-Cu COA». Esa gente ya decidió; sólo falta a quién '
  'le compra. Y esas búsquedas no las puede acaparar nadie con dinero, porque no '
  'hay anuncios permitidos en ellas.')

ul('<b>Una página por compuesto</b>, con el nombre científico en el título, en la URL '
   'y en el primer párrafo. Ya tienes 56 fichas técnicas escritas: son 56 páginas '
   'que hoy no existen para Google porque viven dentro de una aplicación de una '
   'sola página. <b>Sacarlas a URLs propias es la acción de mayor retorno de todo '
   'este documento.</b>',
   '<b>Cada COA, una página.</b> «Lote L-2601-BC-01» es una búsqueda que sólo tú '
   'puedes responder. Nadie más tiene ese contenido, por definición.',
   '<b>Comparativas honestas.</b> «BPC-157 vs TB-500», «CJC-1295 con y sin DAC». '
   'Escritas para explicar, no para vender. Se posicionan solas y se enlazan solas.',
   '<b>El glosario que ya tienes.</b> El diccionario de péptidos del sitio es una '
   'mina de tráfico si cada entrada tiene URL propia.')

h2('2 · La lista de correo — lo único que no te pueden quitar')

p('Instagram puede cerrarte la cuenta mañana y no hay a quién reclamar. Una lista de '
  'correos es tuya, se exporta, y sobrevive a cualquier plataforma. Es el activo más '
  'aburrido y el más valioso.')

ul('Captura en cada ficha: «avísame cuando este lote tenga COA nuevo».',
   'Captura en las dos secciones nuevas — <b>eso ya está construido</b>: el botón '
   '«avísame cuando abra» de Pens y Accessories entra por el formulario de '
   'cotización con su propia opción.',
   'Un correo al mes, no más. Lote nuevo, COA nuevo, compuesto nuevo. Sin promoción '
   'agresiva: el tono lo pone la marca, y el tuyo es sobrio.')

h2('3 · B2B y marca privada — donde está el dinero grande')

p('Un cliente minorista compra 2 o 3 viales. Una clínica, un gimnasio de alto '
  'rendimiento, un médico o un revendedor compran 50 y repiten cada mes. El coste de '
  'conseguirlos es parecido; lo que cambia es el cero.')

ul('El pie ya ofrece «OEM &amp; Private Label». Eso merece <b>una página entera</b>, '
   'no una línea: mínimos, plazos, qué se puede personalizar, qué no.',
   'Una tarifa por volumen escrita, no negociada caso por caso. Quien pide 100 '
   'unidades quiere ver el número, no pedir permiso para verlo.',
   'Un solo cliente B2B bueno vale más que trescientos minoristas, y da menos '
   'trabajo que treinta.')

h2('4 · Comunidad y prueba social')

ul('Foros y comunidades donde ya se habla de esto: se entra <b>aportando datos</b>, '
   'no vendiendo. Publicar un COA en una discusión donde alguien duda de un lote '
   'vale más que cien anuncios que no puedes poner.',
   'Ensayos independientes de terceros, publicados aunque no salgan perfectos. '
   'Publicar un resultado mediocre y explicarlo compra más confianza que diez '
   'resultados impecables sin contexto.',
   'Reseñas verificadas por número de pedido, no anónimas.')

h2('5 · Referidos')

p('En un mercado donde nadie sabe de quién fiarse, la recomendación de alguien que '
  'ya compró pesa más que cualquier otra cosa. Un código por cliente, con '
  'descuento para los dos lados. Barato de montar, y compone.')

box('Lo que NO harías todavía',
    'Influencers de fitness (te queman la cuenta y la suya), marketplaces genéricos '
    '(te suspenden el listado), y cualquier cosa que empiece por «pagar por clic». '
    'No es prudencia: es que esos canales están cerrados por reglamento, y el dinero '
    'se pierde antes de llegar a nadie.')


h1('08', 'El embudo, y qué medir', 'Cuatro números, no cuarenta')

table(
  ['Etapa', 'Qué pasa', 'El número que importa', 'Bueno'],
  [['Llega', 'Busca un compuesto y aterriza en tu ficha', 'Visitas orgánicas / mes',
    'Que suba cada mes'],
   ['Confía', 'Descarga o mira un COA', '% de visitas que abren un COA', '&gt; 15 %'],
   ['Pide', 'Cotiza o añade al carrito', '% que pide', '2–5 %'],
   ['Vuelve', 'Compra otra vez en 90 días', '<b>% que repite</b>', '&gt; 30 %']],
  w=[13, 34, 33, 20])

p('<b>El cuarto es el único que decide si esto es un negocio.</b> Con 30 % de '
  'recompra a 90 días, cada cliente que consigues vale tres veces lo que pagaste por '
  'él y el negocio crece solo. Por debajo de 15 %, estás en una cinta de correr: '
  'todos los meses vuelves a empezar de cero y todos los meses cuesta más.')

box('Una sola cosa que medir esta semana',
    'De tus pedidos de los últimos seis meses: ¿cuántos clientes distintos compraron '
    'dos veces o más? Ese porcentaje, y sólo ése, te dice si el problema es traer '
    'gente o retenerla — y las dos cosas se arreglan de forma completamente '
    'distinta.')


h1('09', 'Retención', 'Donde de verdad está el negocio')

p('Traer un cliente nuevo cuesta entre cinco y siete veces más que hacer que vuelva '
  'uno que ya te compró. En un mercado sin publicidad, esa proporción es todavía '
  'peor. Así que la palanca no es traer más: es que el que llegó no se vaya.')

ol('<b>El COA de su lote, por correo, sin que lo pida.</b> Al enviar el pedido. Es '
   'gratis, nadie lo hace, y es exactamente la prueba de tu posicionamiento.',
   '<b>Recordatorio de reposición.</b> Si alguien compró 10 mg y el consumo típico '
   'de investigación de ese compuesto ronda cierto plazo, un correo a tiempo es una '
   'venta sin coste de adquisición.',
   '<b>Trato distinto al que repite.</b> Precio de socio a partir del tercer pedido, '
   'automático, sin pedirlo. No es un descuento: es una razón para no probar al de '
   'al lado.',
   '<b>Contesta rápido.</b> En este sector la mayoría contesta en días o no contesta. '
   'Responder en horas es un diferenciador enorme y cuesta cero.')


h1('10', 'La estructura operativa', 'Eres una persona: que se note lo menos posible')

p('Un negocio emergente de una sola persona se rompe siempre por el mismo sitio — '
  'todo vive en la cabeza del fundador. La estructura no es burocracia: es lo que '
  'permite que un día no estés y no se caiga nada.')

h2('Las cuatro funciones')

table(
  ['Función', 'Qué incluye', 'Cuánto tiempo', 'Primera en delegar'],
  [['Producto', 'Compra, lotes, COA, etiquetado, calidad', '30 %', 'No — es el corazón'],
   ['Venta', 'Cotizaciones, B2B, atención', '30 %', 'Tercera'],
   ['Contenido', 'Fichas, artículos, correo, redes', '25 %', '<b>Primera</b>'],
   ['Operación', 'Envíos, cobros, contabilidad', '15 %', 'Segunda']],
  w=[16, 40, 16, 28])

h2('Los documentos que faltan')

ul('<b>Registro de lotes.</b> Una hoja: lote, compuesto, proveedor, fecha, COA, '
   'unidades, dónde se fue. Sin esto no puedes responder «¿qué lote me tocó?» y '
   'todo el posicionamiento se cae.',
   '<b>Tarifa por volumen escrita.</b> Para no improvisar un precio distinto cada '
   'vez y que dos clientes descubran que pagaron diferente.',
   '<b>Política de reposición.</b> Qué pasa si un lote no cumple, si se pierde un '
   'envío, si el cliente se equivoca. Escrita antes de que ocurra, no durante.',
   '<b>Guion de respuesta.</b> Las diez preguntas que ya te hacen siempre, '
   'contestadas una vez y bien.')

h2('Lo que ya está construido y hay que usar')

ul('Facturador con panel de pedidos y registro de clientes.',
   'Fichas técnicas de los 56 compuestos.',
   'Protocolo editable por cliente, con su registro.',
   'Etiquetas para la Niimbot M2, listas para imprimir.',
   'Consulta pública de pedidos.',
   'Manual de testeo de péptidos.')

box('El inventario de lo que tienes',
    'Esa lista de arriba es media empresa. El problema no es que falten herramientas '
    '— es que están hechas y no están en uso diario. Antes de construir nada nuevo, '
    'una semana metiendo los datos reales en lo que ya existe vale más que un mes de '
    'desarrollo.')


h1('11', 'Los primeros 90 días', 'En orden, y sin hacer dos cosas a la vez')

h2('Semanas 1–2 · Tapar la fuga')

ol('Resolver el cobro. Procesador de alto riesgo que acepte el giro por escrito. '
   'Quitar PayPal de la web hasta tenerlo.',
   'Rotar la clave de Supabase que quedó expuesta y cambiarla por la publicable.',
   'Medir el porcentaje de recompra de los últimos seis meses.')

h2('Semanas 3–6 · La prueba')

ol('Publicar los COA con URL propia y buscador por número de lote.',
   'Poner el COA dentro de la ficha de cada compuesto, a un toque.',
   'Enviar el COA por correo con cada pedido, automático.')

h2('Semanas 7–10 · El tráfico')

ol('Sacar las 56 fichas a URLs propias, con el nombre científico en título y URL.',
   'Escribir las cinco comparativas de los compuestos que más vendes.',
   'Montar la captura de correo en cada ficha.')

h2('Semanas 11–13 · El volumen')

ol('Página de OEM y marca privada, con mínimos y plazos.',
   'Tarifa por volumen publicada.',
   'Contactar veinte clínicas, gimnasios o revendedores — uno a uno, no en masa.')

box('La regla de los 90 días',
    'Una cosa a la vez y terminada. Cuatro frentes a medias no son cuatro avances: '
    'son cuatro cosas que no funcionan y que hay que mantener igual.')


h1('12', 'Los riesgos', 'Lo que puede tumbar esto, por probabilidad')

table(
  ['Riesgo', 'Probabilidad', 'Qué hacer antes de que pase'],
  [['Cierre de la pasarela de pago', 'Alta',
    'Procesador de alto riesgo + un segundo método de cobro siempre activo'],
   ['Cierre de las redes sociales', 'Media–alta',
    'La lista de correo como canal principal; las redes son un extra'],
   ['Un lote que no cumple', 'Media',
    'Política de reposición escrita y ensayo antes de enviar, no después'],
   ['Cambio regulatorio', 'Media',
    'RUO en todo el material, sin excepción y sin letra pequeña'],
   ['Copia del posicionamiento', 'Baja',
    'Publicar más y antes: la ventaja es el histórico, y ése no se copia'],
   ['Conflicto de marca por un nombre', 'Baja–media',
    'Comprobar IMPI y USPTO antes de imprimir']],
  w=[26, 16, 58])

warn('RUO, en todo, siempre',
     'Cada ficha, cada etiqueta, cada protocolo, cada correo, cada publicación. '
     '«Research Use Only — no para uso humano ni veterinario.» No es un adorno legal '
     'ni una línea que se pueda hacer pequeña para que no moleste: es la frontera '
     'que define qué negocio es éste. Todo el material que se ha construido la '
     'respeta; el material nuevo también tiene que respetarla.')


h1('13', 'Lo primero de todo', 'Si sólo pudieras hacer tres cosas')

ol('<b>Arreglar el cobro.</b> Todo lo demás sobra si te congelan la caja.',
   '<b>Publicar los COA con URL propia y por lote.</b> Es tu posicionamiento entero '
   'convertido en algo que se puede tocar, y ya tienes el papeleo hecho.',
   '<b>Sacar las 56 fichas a URLs propias.</b> Es el único canal de tráfico que '
   'nadie te puede comprar por encima, y el contenido ya está escrito.')

p('Las tres usan cosas que ya existen. Ninguna necesita dinero. Y las tres se pueden '
  'terminar en noventa días.')


# ---------------------------------------------------------------------------
# Composición
# ---------------------------------------------------------------------------

def render():
    out = []
    for b in DOC:
        k = b[0]
        if k == 'h1':
            out.append('<section class="chap"><header class="ch">'
                       '<span class="cn">%s</span>'
                       '<h1>%s</h1>%s</header>'
                       % (b[1], b[2], ('<p class="csub">%s</p>' % b[3]) if b[3] else ''))
        elif k == 'h2':    out.append('<h2>%s</h2>' % b[1])
        elif k == 'p':     out.append('<p>%s</p>' % b[1])
        elif k == 'lead':  out.append('<p class="lead">%s</p>' % b[1])
        elif k == 'quote': out.append('<blockquote>%s</blockquote>' % b[1])
        elif k == 'ul':
            out.append('<ul>%s</ul>' % ''.join('<li>%s</li>' % i for i in b[1]))
        elif k == 'ol':
            out.append('<ol>%s</ol>' % ''.join('<li>%s</li>' % i for i in b[1]))
        elif k == 'box':
            out.append('<div class="box"><div class="bt">%s</div><p>%s</p></div>' % (b[1], b[2]))
        elif k == 'warn':
            out.append('<div class="box warn"><div class="bt">%s</div><p>%s</p></div>' % (b[1], b[2]))
        elif k == 'pb':    out.append('<div class="pb"></div>')
        elif k == 'table':
            head, rows, w = b[1], b[2], b[3]
            cols = ''.join('<col style="width:%s%%">' % x for x in w) if w else ''
            th = ''.join('<th>%s</th>' % c for c in head)
            tr = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % c for c in r) for r in rows)
            out.append('<table><colgroup>%s</colgroup><thead><tr>%s</tr></thead>'
                       '<tbody>%s</tbody></table>' % (cols, th, tr))
    return '\n'.join(out) + '</section>'


CSS = """
*{box-sizing:border-box}
:root{
  --ink:#0b0d12; --muted:#5f6875; --line:#e4e8ef; --paper:#fff;
  --accent:#1e5eff;
}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:#f2f4f8; color:var(--ink);
  font:15px/1.62 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;
  letter-spacing:-.003em;
}
.page{
  max-width:820px; margin:0 auto; background:var(--paper);
  padding:76px 74px 90px;
  box-shadow:0 40px 120px -60px rgba(10,20,60,.4);
}
.cover{padding:120px 74px 96px; border-bottom:1px solid var(--line)}
.cover .k{font-size:11px; letter-spacing:.3em; color:var(--muted); font-weight:600}
.cover h1{
  font-size:clamp(40px,7vw,74px); font-weight:600; letter-spacing:-.045em;
  line-height:.94; margin:22px 0 0;
}
.cover .sub{margin-top:24px; font-size:18px; color:var(--muted); max-width:520px; line-height:1.55}
.cover .meta{
  margin-top:52px; padding-top:20px; border-top:1px solid var(--line);
  font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
  display:flex; gap:26px; flex-wrap:wrap;
}
.toc{padding:42px 74px 50px; border-bottom:1px solid var(--line); background:#fbfcfe}
.toc .tt{font-size:11px; letter-spacing:.28em; color:var(--muted); font-weight:600; margin-bottom:18px}
.toc ol{margin:0; padding:0; list-style:none; columns:2; column-gap:40px}
.toc li{font-size:13.5px; padding:5px 0; break-inside:avoid}
.toc li span{color:var(--muted); font-variant-numeric:tabular-nums; margin-right:10px}

.chap{padding-top:8px}
.ch{margin:64px 0 26px; padding-top:26px; border-top:1px solid var(--line)}
.chap:first-of-type .ch{margin-top:0; border-top:0; padding-top:0}
.cn{font-size:11px; letter-spacing:.24em; color:var(--accent); font-weight:700}
.ch h1{font-size:clamp(28px,4.4vw,40px); font-weight:600; letter-spacing:-.035em;
       line-height:1.02; margin:12px 0 0}
.csub{margin:10px 0 0; font-size:14px; color:var(--muted)}
h2{font-size:17px; font-weight:650; letter-spacing:-.02em; margin:34px 0 12px}
p{margin:0 0 14px}
.lead{font-size:17px; line-height:1.6; color:#1b212c}
b{font-weight:650}
ul,ol{margin:0 0 16px; padding-left:22px}
li{margin:0 0 9px}
blockquote{
  margin:22px 0; padding:20px 24px; border-left:2px solid var(--ink);
  background:#fbfcfe; font-size:17px; line-height:1.5;
}
.small{font-size:12px; color:var(--muted); letter-spacing:.06em}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.94em}

.box{
  margin:22px 0; padding:18px 20px; border:1px solid var(--line);
  border-radius:12px; background:#fbfcfe;
}
.box .bt{font-size:11px; letter-spacing:.16em; text-transform:uppercase;
         font-weight:700; color:var(--muted); margin-bottom:8px}
.box p{margin:0; font-size:14.2px}
.box.warn{border-color:#e9d7c8; background:#fdf8f4}
.box.warn .bt{color:#a8622c}

table{width:100%; border-collapse:collapse; margin:20px 0; font-size:13.2px}
th{
  text-align:left; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--muted); font-weight:700; padding:0 12px 9px 0;
  border-bottom:1px solid var(--ink);
}
td{padding:11px 12px 11px 0; border-bottom:1px solid var(--line); vertical-align:top}
tr:last-child td{border-bottom:0}

.pb{break-after:page}
.foot{
  margin-top:70px; padding-top:22px; border-top:1px solid var(--line);
  font-size:11px; letter-spacing:.1em; color:var(--muted); text-transform:uppercase;
}

@media (max-width:760px){
  .page,.cover,.toc{padding-left:24px; padding-right:24px}
  .cover{padding-top:70px}
  .toc ol{columns:1}
  table{font-size:12.4px}
}

@page{size:A4; margin:16mm 14mm}
@media print{
  body{background:#fff}
  .page,.cover,.toc{max-width:none; box-shadow:none; padding-left:0; padding-right:0}
  .cover{padding-top:0}
  .chap{break-before:page}
  .chap:first-of-type{break-before:auto}
  .ch{break-after:avoid}
  h2{break-after:avoid}
  table,blockquote,.box{break-inside:avoid}
  li{break-inside:avoid}
}
"""

TOC = [(b[1], b[2]) for b in DOC if b[0] == 'h1']

html = """<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PEPTIDEX — Estructura y crecimiento</title>
<style>%s</style>
</head><body>

<div class="cover">
  <div class="k">PEPTIDEX · DOCUMENTO INTERNO</div>
  <h1>Estructura<br>y crecimiento.</h1>
  <p class="sub">Cómo se ordena el catálogo, cómo se llama cada compuesto y por dónde
  llega el cliente cuando no se puede pagar por que llegue.</p>
  <div class="meta"><span>%s</span><span>13 capítulos</span><span>Research use only</span></div>
</div>

<div class="toc">
  <div class="tt">CONTENIDO</div>
  <ol>%s</ol>
</div>

<div class="page">
%s
<div class="foot">PEPTIDEX · Documento interno · %s<br>
Research Use Only — no para uso humano ni veterinario.</div>
</div>

</body></html>
""" % (CSS, HOY,
       ''.join('<li><span>%s</span>%s</li>' % (n, t) for n, t in TOC),
       render(), HOY)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('PEPTIDEX_Estrategia.html  %.1f KB  ·  %d capítulos'
      % (len(html.encode()) / 1024, len(TOC)))

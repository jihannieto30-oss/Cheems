#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PEPTIDEX — 100 IDEAS
Genera PEPTIDEX_100_Ideas.html, imprimible en A4.

El encargo era «piensa diferente, como alguien más». Así que no es una lista
plana de cien: son veinte cabezas prestadas, cinco ideas cada una. Un relojero
suizo y un químico analítico no tienen las mismas ideas sobre el mismo negocio,
y ese es justo el punto — una lista de cien escrita desde una sola cabeza son
diez ideas repetidas diez veces.
"""
import os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, '..', 'PEPTIDEX_100_Ideas.html')
HOY  = datetime.date.today().strftime('%d.%m.%Y')

# (título, subtítulo, por qué esta cabeza, [(idea, detalle, esfuerzo)])
# esfuerzo:  0 = una tarde   1 = una semana   2 = un proyecto
LENSES = [

("El relojero suizo", "Procedencia, número de serie y papeles",
 "Un reloj de diez mil euros y uno de cincuenta dan la misma hora. Lo que se "
 "paga es la trazabilidad: quién lo hizo, cuándo, con qué número. Tu producto "
 "tiene exactamente el mismo problema y exactamente la misma salida.",
 [("Papeles con cada unidad",
   "El COA impreso dentro de la caja, con el número de lote. No un enlace: papel. "
   "Un reloj no te manda el certificado por correo.", 0),
  ("Número de serie visible",
   "Lote grabado o impreso en la caja y en el vial, no sólo en el sistema. Que se "
   "pueda leer sin abrir nada.", 0),
  ("El libro del lote",
   "Una página pública por lote: cromatograma, fecha de síntesis, quién firmó el "
   "control. Permalink que no cambia nunca.", 1),
  ("Sello de inviolabilidad",
   "Un precinto que hay que romper. Barato, visible, y comunica más que cualquier "
   "adjetivo en la web.", 0),
  ("Verificación de autenticidad",
   "Cualquiera escribe un número de lote y ve si existe. Protege tu marca de "
   "falsificaciones antes de que las haya — y las habrá si funcionas.", 1)]),

("El de los hipercoches", "Asignación, no venta",
 "Ferrari no vende coches: los asigna. La escasez no es un truco de precio, es "
 "una forma de tratar al cliente que convierte comprar en ser elegido.",
 [("Lotes numerados y finitos",
   "«Lote 04 · 300 unidades». Cuando se acaba, se acaba. No es marketing: es lo "
   "que ya pasa, sólo que ahora se dice.", 0),
  ("Lista de asignación",
   "Quien ya compró tiene preferencia sobre el siguiente lote. Se avisa antes de "
   "abrirlo al público.", 1),
  ("Una serie limitada al trimestre",
   "El compuesto más difícil de sintetizar, en cantidad corta. No para ganar "
   "dinero: para demostrar capacidad.", 1),
  ("Publicar la capacidad",
   "«Este trimestre podemos producir X». La restricción contada en voz alta vale "
   "más que la abundancia fingida.", 0),
  ("Acceso anticipado por historial",
   "Tres lotes seguidos y entras en la lista que ve las cosas antes.", 1)]),

("El químico analítico", "El dato es el contenido",
 "Para quien te compra, el argumento no es un adjetivo — es una gráfica. Y las "
 "gráficas las tienes y no las enseñas.",
 [("El cromatograma entero",
   "No el resumen, no el «≥ 99 %». La imagen completa, en alta resolución, "
   "descargable.", 0),
  ("Serie «cómo se lee esto»",
   "Una entrada por tipo de pico y de artefacto. Enseñas a tu cliente a auditarte "
   "— que es la forma más fuerte de decir que puede.", 1),
  ("Estudio de estabilidad propio",
   "El mismo compuesto a 4 °C y a 25 °C durante ocho semanas, con los números. "
   "Nadie en tu escalón publica esto.", 2),
  ("Publicar un lote que falló",
   "Y por qué. Un solo post de éstos compra más credibilidad que un año de "
   "resultados impecables.", 0),
  ("Ensayo ciego contra la competencia",
   "Tu producto y tres anónimos al mismo tercero. Publicas todo, incluido si "
   "pierdes. Si ganas, es el mejor contenido que tendrás nunca.", 2)]),

("El archivero", "El histórico es el foso",
 "Un competidor puede copiarte el diseño en una semana y el precio en un día. "
 "Lo que no puede copiar es tener cinco años de certificados publicados.",
 [("Archivo público de COA",
   "Todos, desde el día uno, con buscador por lote y por compuesto.", 1),
  ("La curva de pureza",
   "Pureza media por trimestre, en una gráfica. Una tendencia visible es un "
   "argumento que no se puede fingir.", 1),
  ("Descarga masiva",
   "Todos los COA en un ZIP. Transparencia radical: quien quiera auditarte, que "
   "audite.", 0),
  ("Permalink citable",
   "Cada lote con una URL que nunca cambia, para que un foro pueda enlazarla y el "
   "enlace siga vivo en tres años.", 0),
  ("Consulta de lote abierta",
   "Un endpoint público. Un revendedor puede integrarlo en su web y estarás en su "
   "página sin pagar nada.", 2)]),

("El cuchillero japonés", "El oficio, y quién lo firma",
 "Nadie compra un cuchillo Takeda por sus especificaciones. Lo compra porque "
 "sabe quién lo hizo. Tú eres una persona; eso es una ventaja, no una carencia.",
 [("Una firma en el COA",
   "Un nombre y una persona responsable del control, no «el laboratorio».", 0),
  ("Un minuto sin música",
   "El etiquetado, en vídeo, sin locución y sin efectos. Manos y producto. Es lo "
   "contrario de lo que hace todo el sector.", 0),
  ("Por qué cada etiqueta mide lo que mide",
   "Ya está documentado — la guía de tamaños por dosis. Publicarlo es enseñar el "
   "oficio.", 0),
  ("La tasa de rechazo",
   "Qué porcentaje de lotes no llega a salir. Un número incómodo publicado vale "
   "más que diez cómodos.", 0),
  ("Bodegón del vial vacío",
   "El vial, la etiqueta, el sellado. Serie fotográfica sobre blanco. Es marca sin "
   "decir una palabra.", 1)]),

("El bodeguero", "Añadas y notas de lote",
 "El vino resolvió hace siglos el problema de vender un producto que cambia "
 "entre lotes: no lo esconde, lo convierte en el argumento.",
 [("Notas de lote",
   "Como notas de cata, pero honestas: origen, condiciones, particularidades de "
   "ese lote concreto.", 0),
  ("Comparar añadas",
   "El mismo compuesto a lo largo de dos años, lote a lote. Enseña consistencia — "
   "o dónde mejoraste.", 1),
  ("Carta de lotes",
   "Lo disponible hoy presentado como una carta, no como un inventario.", 1),
  ("Caja de evaluación",
   "Tres compuestos de la misma línea, en cantidad pequeña, para que un cliente "
   "nuevo pruebe tu calidad antes de comprometerse.", 1),
  ("Lote de reserva",
   "Guardar unidades de cada lote y republicar su análisis dos años después. "
   "Estabilidad demostrada con tu propio producto.", 2)]),

("El ingeniero de crecimiento", "Lo que ya escribiste y Google no ve",
 "Tienes 56 fichas técnicas escritas que para un buscador no existen, porque "
 "viven dentro de una aplicación de una sola página. Es la mayor pérdida seca "
 "del negocio ahora mismo.",
 [("Una URL por compuesto",
   "Con el nombre científico en título, URL y primer párrafo. Es la acción de "
   "mayor retorno de toda la lista.", 2),
  ("Una URL por lote",
   "«Lote L-2601-BC-01» es una búsqueda que sólo tú puedes responder. Contenido "
   "que nadie más puede escribir, por definición.", 1),
  ("Quince páginas «X vs Y»",
   "BPC-157 vs TB-500, CJC-1295 con y sin DAC. Escritas para explicar. Se "
   "posicionan solas.", 2),
  ("Sacar la calculadora a URL propia",
   "Ya existe dentro de Tools. Fuera, es una herramienta que la gente enlaza.", 1),
  ("Glosario con URL por término",
   "El diccionario que ya tienes, una entrada una dirección. Cola larga infinita.", 1),
  ("Inglés y español con hreflang",
   "Ya tienes las dos versiones escritas. Marcarlas bien duplica el mercado sin "
   "escribir una línea nueva.", 1),
  ("Feed de lotes nuevos",
   "RSS y sitemap. Los agregadores del sector lo recogen solos.", 0)]),

("El curador de museo", "Colecciones, no inventario",
 "Un museo no enseña todo lo que tiene: elige doce piezas y cuenta por qué esas "
 "doce. Tu catálogo de 56 pide exactamente eso.",
 [("Colección trimestral",
   "Seis compuestos con un hilo conductor y un texto que lo explique. El resto "
   "sigue ahí; esto es por dónde entrar.", 1),
  ("Catálogo impreso anual",
   "Un objeto físico que se guarda. Es caro y es exactamente por eso que funciona.", 2),
  ("La historia de un compuesto",
   "Desde su descubrimiento hasta hoy. Quién lo describió, cuándo, en qué revista.", 1),
  ("Cartelas de museo",
   "Cada ficha con «descrito en», «publicado por», «primera síntesis». Es "
   "credibilidad gratis y ya está en la literatura.", 1),
  ("Sala virtual",
   "Los tres viales a tamaño real, girables, sobre blanco. Ya tienes el "
   "renderizador de etiquetas.", 2)]),

("El periodista de investigación", "La transparencia como espectáculo",
 "Enseñar lo que todos esconden no es humildad — es la jugada más agresiva "
 "disponible, porque obliga a la competencia a explicar por qué ellos no.",
 [("Auditoría abierta",
   "Invitas a un tercero, publicas el informe sin editar. Incluidos los peros.", 2),
  ("Informe anual de calidad",
   "Lotes producidos, rechazados, incidencias, reposiciones. Con números.", 1),
  ("Publicar el margen",
   "Cuánto cuesta un compuesto y cuánto ganas. Radical, incómodo, y convierte el "
   "precio en confianza en vez de en sospecha.", 0),
  ("«Lo que no sabemos»",
   "Una página sobre los límites de la evidencia de cada compuesto. Te separa de "
   "todo el que promete.", 1),
  ("Registro de incidencias",
   "Qué salió mal y cómo se resolvió. Público.", 1)]),

("El vendedor de empresa", "Quien compra cincuenta no compra igual",
 "Un cliente minorista se lleva dos viales. Una clínica se lleva cincuenta y "
 "repite cada mes. Cuesta lo mismo conseguirlos.",
 [("Página OEM de verdad",
   "Hoy es una línea en el pie. Merece mínimos, plazos, qué se personaliza y qué "
   "no — escrito, sin pedir permiso para verlo.", 1),
  ("Ficha de proveedor descargable",
   "Datos fiscales, certificados, políticas. Es lo primero que pide un "
   "departamento de compras y casi nadie lo tiene listo.", 0),
  ("Contrato marco tipo",
   "Descargable. Quita tres semanas de fricción en una cuenta grande.", 1),
  ("Portal de cliente B2B",
   "Su histórico de lotes y sus COA en un sitio. Ya tienes medio facturador "
   "construido.", 2),
  ("Tarifa por volumen publicada",
   "Con escalones. Quien pide cien quiere ver el número, no negociarlo.", 0),
  ("Etiqueta neutra para revendedores",
   "Tú produces, ellos ponen su marca. Volumen sin competir contigo mismo.", 2),
  ("Muestra de evaluación",
   "Cantidad pequeña con COA para cuentas nuevas. El coste de adquisición más "
   "barato que vas a encontrar.", 0)]),

("El diseñador de videojuegos", "El estatus es gratis y adictivo",
 "Ya construiste un perfil de usuario nivel American Express. Un nivel sin nada "
 "que desbloquear es una tarjeta bonita; con algo detrás, es una razón para no "
 "probar al de al lado.",
 [("Niveles por volumen acumulado",
   "Con nombre propio y beneficios concretos, no un porcentaje.", 1),
  ("Insignia de primer comprador",
   "De cada lote. Cuesta cero y se presume.", 0),
  ("Historial visible de lotes",
   "Qué lotes has tenido. Coleccionismo aplicado a un consumible.", 1),
  ("Acceso anticipado por nivel",
   "Los compuestos nuevos se abren por escalones.", 1),
  ("Algo que sólo ve el nivel alto",
   "Un compuesto, un formato o una presentación. La escalera necesita un último "
   "peldaño visible desde abajo.", 1)]),

("El conserje de hotel", "El servicio es el producto",
 "En un sector donde la mercancía es idéntica, la experiencia es lo único que "
 "queda — y casi nadie contesta en menos de dos días.",
 [("Respuesta en cuatro horas, publicada",
   "Una promesa concreta y verificable. Cuesta cero y casi nadie se atreve.", 0),
  ("Un canal con nombre y cara",
   "No un formulario. Una persona.", 0),
  ("Aviso proactivo de estado",
   "El cliente se entera antes de preguntar. Ya tienes el rastreo construido.", 1),
  ("Reposición asistida",
   "Le escribes tú antes de que se le acabe. Venta sin coste de adquisición.", 1),
  ("Presentación para pedidos grandes",
   "Empaquetado cuidado cuando el pedido lo merece. Se fotografía solo.", 0)]),

("El sello discográfico", "Lanzamientos, no reposiciones",
 "Un lote nuevo es un evento y lo estás tratando como una entrada de almacén.",
 [("Fecha de lanzamiento anunciada",
   "El lote sale un día concreto y se sabe con antelación. Concentra la demanda "
   "en vez de diluirla.", 0),
  ("Cuenta atrás",
   "Visible en la web. Simple y funciona.", 0),
  ("Lote co-firmado",
   "Con un laboratorio o un analista invitado. Su público es tu público.", 2),
  ("Caras B",
   "Compuestos raros disponibles una semana. Da una razón para volver a mirar.", 1),
  ("El boletín como boletín de sello",
   "Un correo al mes, muy bien escrito, sin promoción agresiva. La lista es lo "
   "único que no te pueden quitar.", 1)]),

("El farmacéutico", "Los rituales que dan confianza",
 "La farmacia lleva un siglo perfeccionando gestos que dicen «esto es serio». "
 "Están inventados y son baratos.",
 [("Prospecto en la caja",
   "Con el COA impreso. Papel doblado, del tamaño exacto.", 0),
  ("Indicador de cadena de frío",
   "Una etiqueta que cambia de color si el envío se calentó. Céntimos, y dice más "
   "que cualquier promesa de conservación.", 0),
  ("Conservación en grande",
   "En la caja, legible, no en letra pequeña.", 0),
  ("Fecha de síntesis visible",
   "No sólo la caducidad. Esconder la fecha de síntesis es lo que hace todo el "
   "mundo, y por eso enseñarla se nota.", 0),
  ("Consulta técnica sobre el material",
   "Sobre estabilidad, conservación y documentación. Nunca sobre uso — esa raya "
   "es la que define el negocio.", 1)]),

("La casa de moda", "Temporadas y lookbook",
 "Una marca que enseña lo mismo todo el año deja de mirarse. Una que tiene "
 "colecciones da una razón para volver cada seis meses.",
 [("Dos colecciones al año",
   "Con su lookbook. El catálogo es el mismo; la puesta en escena, no.", 1),
  ("Un acento por temporada",
   "Dentro del blanco de marca. Un color que no rompe nada y marca el año.", 0),
  ("Un fotógrafo, no un render",
   "Una sesión de verdad para el catálogo. Se nota, y es lo que separa una marca "
   "de una tienda.", 2),
  ("Packaging de edición numerada",
   "Para la colección. El envase es lo único que el cliente toca.", 1),
  ("Un objeto que no es producto",
   "Una libreta de laboratorio con la marca. Se regala, se usa, se queda encima de "
   "una mesa durante años.", 1)]),

("La aerolínea", "La escalera de fidelidad",
 "Nadie vuela mal por puntos. Vuela mal por no perder el nivel. Es el mecanismo "
 "de retención más eficiente que se ha inventado.",
 [("Niveles con beneficio concreto",
   "Precio, acceso y plazo de envío. No «atención preferente».", 1),
  ("Puntos canjeables por producto",
   "Más barato para ti que un descuento, y se siente mayor.", 1),
  ("Igualación de nivel",
   "Enséñanos lo que compras en otro sitio y te igualamos el escalón. Roba "
   "clientes maduros de la competencia.", 0),
  ("Referido con premio doble",
   "Para quien trae y para quien llega. En un mercado sin publicidad, la "
   "recomendación es el canal.", 1),
  ("Nivel que caduca",
   "Se mantiene con actividad. Es lo que convierte un premio en un hábito.", 1)]),

("El de cumplimiento normativo", "La regla como argumento de venta",
 "Todo el sector trata el RUO como un estorbo y lo esconde en letra pequeña. "
 "Enseñarlo bien te distingue justo del tipo de competidor del que quieres "
 "distinguirte.",
 [("Página de qué es RUO",
   "Explicado en serio: qué significa, qué implica, qué no se puede hacer.", 0),
  ("El aviso, visible y honesto",
   "Grande, no escondido. Quien lo esconde está diciendo algo sobre sí mismo.", 0),
  ("A quién no vendemos",
   "Publicado. Una política de rechazo dice más de tu criterio que diez sellos.", 0),
  ("Formación en documentación",
   "Cómo documentar un ensayo, cómo registrar un lote, cómo conservar. Sobre "
   "método, nunca sobre uso.", 1),
  ("Manual de testeo, abierto",
   "Ya lo tienes escrito. Publicarlo entero es el mejor imán de tráfico "
   "cualificado que puedes tener.", 0)]),

("El de open source", "Regalar la herramienta, quedarte con el sitio",
 "Las herramientas que ya construiste valen más repartidas que guardadas: cada "
 "sitio que las incrusta es una página que te enlaza.",
 [("Herramientas abiertas",
   "Calculadora y diccionario, libres de usar. Con tu marca en la esquina.", 1),
  ("Datos de compuestos públicos",
   "Nombres, pesos moleculares, referencias. Un recurso que se cita.", 1),
  ("Widget de consulta de lote",
   "Incrustable. Un revendedor lo pone en su web y tu verificación aparece en su "
   "página.", 2),
  ("Changelog del catálogo",
   "Qué entró, qué salió, qué cambió de precio. Público y fechado.", 0),
  ("Plantillas de laboratorio",
   "Hojas de registro de lote y de ensayo, descargables. Utilidad pura.", 0)]),

("El jefe de logística", "La operación, contada",
 "Los plazos y el trato del envío son la parte del servicio que más se recuerda "
 "y la que menos gente comunica.",
 [("Mapa de tiempos reales",
   "Por estado y por país, con datos tuyos, actualizado. No «3–5 días hábiles».", 1),
  ("Corte horario publicado",
   "«Pedidos antes de las 14:00 salen hoy». Concreto y comprobable.", 0),
  ("Seguro incluido y dicho",
   "Si ya lo haces, decirlo cuesta cero. Si no, cuesta poco.", 0),
  ("Reposición sin discusión",
   "Envío perdido, envío repuesto. Escrito antes de que pase.", 0),
  ("Empaque discreto, explicado",
   "Qué se ve por fuera. Es la duda silenciosa de la mitad de tus compradores.", 0)]),

("El que piensa a diez años", "Lo que hoy es barato y luego no",
 "Casi todo lo de esta lista se puede hacer en cualquier momento. Estas cinco "
 "cosas sólo se pueden empezar hoy, y cada mes que pasa valen más o cuestan "
 "más.",
 [("Registrar la marca ahora",
   "PEPTIDEX y los nombres de compuesto, en IMPI y USPTO. Antes de imprimir y "
   "antes de que alguien se te adelante.", 1),
  ("Empezar el archivo hoy",
   "Dentro de tres años, tres años de COA públicos son un foso que no se compra "
   "con dinero. Sólo con haber empezado antes.", 0),
  ("Comprar los dominios de los nombres",
   "Los cincuenta y seis, mientras cuestan diez dólares.", 0),
  ("La lista de correo desde el primer día",
   "Aunque sean cuarenta personas. Es el único activo que sobrevive a que te "
   "cierren cualquier cosa.", 0),
  ("Documentar cómo se hace todo",
   "Cada proceso escrito una vez. Es lo que separa un negocio de un empleo — y lo "
   "que permite que un día no estés.", 1)]),
]

NO = [
 ("Antes/después y transformaciones",
  "Convierte material de investigación en producto de consumo en una imagen. Es "
  "exactamente la frontera que define tu negocio."),
 ("Testimonios de resultados",
  "Un cliente contando qué le pasó es una afirmación clínica que firmas tú, "
  "aunque no la escribas tú."),
 ("Influencers de fitness",
  "Te queman su cuenta y la tuya, y el mensaje que producen es siempre de uso "
  "humano. El canal está cerrado por reglamento, no por prudencia."),
 ("Protocolos, dosis o pautas públicas",
  "Es orientación de uso. El protocolo por cliente que tienes construido es un "
  "documento privado y ahí tiene que quedarse."),
 ("Publicidad pagada en Meta, Google o TikTok",
  "Prohibido en los tres. No es que convierta mal: es que la cuenta se bloquea, "
  "y a veces el perfil con ella."),
 ("Comparar tu producto con un medicamento aprobado",
  "Aunque sea la misma molécula. En cuanto lo mencionas, heredas su marco "
  "regulatorio entero."),
]

PRIMERO = [
 ("El manual de testeo, publicado entero",
  "Ya está escrito. Es el mejor imán de tráfico cualificado que tienes y sale hoy."),
 ("El COA impreso dentro de la caja",
  "Papel. Cuesta céntimos y es tu posicionamiento convertido en algo que se toca."),
 ("Archivo público de COA con buscador por lote",
  "El foso. Cada mes que pasa sin empezarlo es un mes de ventaja que no recuperas."),
 ("Las 56 fichas a URLs propias",
  "El contenido está escrito y hoy no existe para ningún buscador."),
 ("Respuesta en cuatro horas, publicada como promesa",
  "Cuesta cero y casi nadie en el sector se atreve a escribirlo."),
 ("Ficha de proveedor descargable",
  "Lo primero que pide un departamento de compras. Media hora de trabajo."),
 ("Publicar un lote que no pasó",
  "Un solo post compra más credibilidad que un año de resultados perfectos."),
 ("Registrar la marca y los nombres",
  "Antes de imprimir una sola etiqueta con los nombres nuevos."),
]

EF = ['una tarde', 'una semana', 'un proyecto']

# ---------------------------------------------------------------------------

n = 0
sections = []
for title, sub, why, ideas in LENSES:
    rows = []
    for name, detail, eff in ideas:
        n += 1
        rows.append(
          '<div class="idea"><div class="num">%03d</div><div class="body">'
          '<div class="it">%s</div><p>%s</p>'
          '<span class="ef ef%d">%s</span></div></div>' % (n, name, detail, eff, EF[eff]))
    sections.append(
      '<section class="lens"><header><span class="lk">%s</span>'
      '<h2>%s</h2><p class="ls">%s</p></header>'
      '<p class="why">%s</p>%s</section>'
      % (sub, title, sub, why, ''.join(rows)))

TOTAL = n

CSS = """
*{box-sizing:border-box}
:root{--ink:#0b0d12;--muted:#5f6875;--line:#e4e8ef;--accent:#1e5eff}
body{margin:0;background:#f2f4f8;color:var(--ink);
 font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;
 letter-spacing:-.003em}
.cover{background:#fff;padding:110px 74px 84px;border-bottom:1px solid var(--line)}
.cover .k{font-size:11px;letter-spacing:.3em;color:var(--muted);font-weight:600}
.cover h1{font-size:clamp(40px,7vw,76px);font-weight:600;letter-spacing:-.045em;
 line-height:.94;margin:22px 0 0}
.cover .sub{margin-top:24px;font-size:18px;color:var(--muted);max-width:560px;line-height:1.55}
.cover .meta{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);
 font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
 display:flex;gap:26px;flex-wrap:wrap}
.page{max-width:840px;margin:0 auto;background:#fff;padding:0 74px 90px;
 box-shadow:0 40px 120px -60px rgba(10,20,60,.4)}
.cover,.first{max-width:840px;margin:0 auto}
.first{background:#fbfcfe;padding:46px 74px 52px;border-bottom:1px solid var(--line)}
.first .tt{font-size:11px;letter-spacing:.28em;color:var(--muted);font-weight:600}
.first h3{font-size:22px;font-weight:600;letter-spacing:-.03em;margin:12px 0 18px}
.first ol{margin:0;padding-left:20px}
.first li{margin:0 0 10px;font-size:14px}
.first li b{font-weight:650}
.first li span{color:var(--muted)}

.lens{padding-top:8px}
.lens header{margin:62px 0 0;padding-top:26px;border-top:1px solid var(--line)}
.lens:first-of-type header{margin-top:44px}
.lk{display:none}
.lens h2{font-size:clamp(26px,4vw,36px);font-weight:600;letter-spacing:-.035em;
 line-height:1.04;margin:0}
.ls{margin:8px 0 0;font-size:13.5px;color:var(--muted);letter-spacing:.02em}
.why{margin:20px 0 26px;font-size:15px;line-height:1.62;color:#242b36;
 border-left:2px solid var(--ink);padding-left:18px}

.idea{display:flex;gap:18px;padding:15px 0;border-bottom:1px solid var(--line)}
.idea:last-child{border-bottom:0}
.num{flex:0 0 34px;font-size:11px;font-weight:700;color:var(--accent);
 font-variant-numeric:tabular-nums;padding-top:3px;letter-spacing:.06em}
.body{min-width:0}
.it{font-size:15.5px;font-weight:650;letter-spacing:-.015em}
.idea p{margin:5px 0 0;font-size:13.8px;line-height:1.55;color:var(--muted)}
.ef{display:inline-block;margin-top:8px;font-size:9.5px;letter-spacing:.16em;
 text-transform:uppercase;font-weight:700;padding:3px 9px;border-radius:999px;
 border:1px solid var(--line);color:var(--muted)}
.ef0{border-color:#cfe3d2;color:#3d7a4b}
.ef1{border-color:#d9dfea;color:#4a5568}
.ef2{border-color:#e9d7c8;color:#a8622c}

.no{margin-top:70px;padding:26px 28px;border:1px solid #e9d7c8;border-radius:14px;
 background:#fdf8f4}
.no .tt{font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;
 color:#a8622c;margin-bottom:6px}
.no .lead{font-size:14px;color:#242b36;margin:0 0 16px}
.no .i{padding:11px 0;border-top:1px solid #eddfd2}
.no .i b{font-size:14.2px}
.no .i p{margin:3px 0 0;font-size:13.4px;color:var(--muted);line-height:1.5}

.foot{margin-top:64px;padding-top:22px;border-top:1px solid var(--line);
 font-size:11px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}

@media (max-width:760px){
 .page,.cover,.first{padding-left:24px;padding-right:24px}
 .cover{padding-top:64px}
 .num{flex-basis:28px}
}
@page{size:A4;margin:15mm 14mm}
@media print{
 body{background:#fff}
 .page,.cover,.first{max-width:none;box-shadow:none;padding-left:0;padding-right:0}
 .cover{padding-top:0}
 .lens{break-before:page}
 .lens:first-of-type{break-before:auto}
 .lens header,.why{break-after:avoid}
 .idea,.no{break-inside:avoid}
}
"""

html = """<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PEPTIDEX — %d ideas</title>
<style>%s</style>
</head><body>

<div class="cover">
  <div class="k">PEPTIDEX · DOCUMENTO INTERNO</div>
  <h1>%d ideas,<br>veinte cabezas.</h1>
  <p class="sub">Una lista de cien escrita desde una sola cabeza son diez ideas
  repetidas diez veces. Éstas están pensadas desde veinte oficios distintos —
  un relojero suizo y un químico analítico no tienen las mismas ideas sobre el
  mismo negocio, y ahí está el valor.</p>
  <div class="meta"><span>%s</span><span>20 miradas</span><span>Research use only</span></div>
</div>

<div class="first">
  <div class="tt">SI SÓLO HICIERAS OCHO</div>
  <h3>Por dónde empezar</h3>
  <ol>%s</ol>
</div>

<div class="page">
%s

<div class="no">
  <div class="tt">Y seis que no haría</div>
  <p class="lead">No por prudencia — porque el canal está cerrado por reglamento
  o porque el mensaje convierte material de investigación en producto de
  consumo, que es la frontera que define este negocio.</p>
  %s
</div>

<div class="foot">PEPTIDEX · Documento interno · %s<br>
Research Use Only — no para uso humano ni veterinario.</div>
</div>

</body></html>
""" % (TOTAL, CSS, TOTAL, HOY,
       ''.join('<li><b>%s</b> — <span>%s</span></li>' % (a, b) for a, b in PRIMERO),
       ''.join(sections),
       ''.join('<div class="i"><b>%s</b><p>%s</p></div>' % (a, b) for a, b in NO),
       HOY)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('PEPTIDEX_100_Ideas.html  %.1f KB  ·  %d ideas  ·  %d miradas'
      % (len(html.encode()) / 1024, TOTAL, len(LENSES)))

#!/usr/bin/env python3
"""JARVIS — la consola de PEPTIDEX, en su propia página.

POR QUÉ SALE DEL FACTURADOR

Nació dentro de él y por eso sólo sabía de facturas. Pero el facturador es una
herramienta de una tarea: lo abres para cobrar y lo cierras. Jarvis tiene que
estar abierto todo el día y saber de la empresa entera — el catálogo, los
precios, los agentes, el cerebro, la app.

Metido dentro de otra herramienta, además, competía con ella por la pantalla y
heredaba sus problemas: el facturador no es responsivo y arrastraba a Jarvis a
serlo. Fuera, es lo que tiene que ser.

El del facturador se queda donde está, sabiendo de facturas, que es lo que hace
falta ahí. Éste es otro producto.

QUÉ SABE

    el catálogo        las 60 fichas del registro de operación
    el cerebro         las notas del vault, con sus enlaces
    los agentes        quiénes son, qué vigilan, qué han hecho
    los precios        las bandas del estudio de mercado
    el facturador      clientes y documentos, si comparte dominio

CONVERSACIÓN DE VERDAD

Con `JV_API` apuntando a una función de servidor, Jarvis deja de ser un
intérprete de reglas y pasa a razonar: manda la pregunta y su contexto a un
modelo y devuelve lo que conteste.

Sin `JV_API`, sigue funcionando con reglas. No es un modo degradado — es lo que
hace que responda al instante y sin conexión. El modelo se usa cuando la
pregunta no cae en ninguna regla, que es exactamente donde hace falta.

    python3 web/jarvis/build.py    →  web/jarvis/index.html
"""
import json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
WEB  = os.path.dirname(AQUI)
RAIZ = os.path.dirname(WEB)
OUT  = os.path.join(AQUI, 'index.html')

FACT = os.path.join(RAIZ, 'docs', 'src', 'build_jarvis.py')


def del_facturador():
    """CSS, núcleo y motor de voz salen del módulo del facturador.

    Copiarlos aquí sería tener dos Jarvis que se separan al primer arreglo. Se
    leen de la fuente, que ya está probada."""
    s = open(FACT, encoding='utf-8').read()
    css = re.search(r"^CSS = r'''(.*?)'''", s, re.S | re.M).group(1)
    js  = re.search(r"^JS = r'''(.*?)'''",  s, re.S | re.M).group(1)
    nuc = re.search(r"^def _marcas\(.*?^RETICULA = nucleo\(\)", s, re.S | re.M).group(0)
    return css, js, nuc


# ---------------------------------------------------------------------------
# lo que Jarvis tiene que saber de la empresa
# ---------------------------------------------------------------------------
def contexto():
    ctx = {}

    lib = os.path.join(WEB, 'assets', 'library.json')
    if os.path.exists(lib):
        L = json.load(open(lib, encoding='utf-8'))
        ctx['comp'] = [{'n': e['n'], 'cat': e.get('cat', ''), 'sku': e.get('sku', ''),
                        'esp': e.get('esp', ''), 'mg': e.get('mg'), 'bac': e.get('bac'),
                        'sol': e.get('sol', ''), 'alm': e.get('alm', ''),
                        'mec': e.get('mec', ''), 'ref': e.get('ref') or {}} for e in L]

    # el cerebro: título, resumen y ruta. El cuerpo entero pesaría de más para
    # lo que se hace con él —encontrar la nota y decir dónde está—.
    ce = os.path.join(RAIZ, 'cerebro')
    notas = []
    if os.path.isdir(ce):
        for dirp, dirs, files in os.walk(ce):
            dirs[:] = [d for d in dirs if not d.startswith('.') and
                       d not in ('sinapsis', 'plantillas')]
            for f in sorted(files):
                if not f.endswith('.md') or f.startswith('_'):
                    continue
                p = os.path.join(dirp, f)
                txt = open(p, encoding='utf-8').read()
                cuerpo = txt.split('---', 2)[-1] if txt.startswith('---') else txt
                h1 = re.search(r'^#[ \t]+(.+)$', cuerpo, re.M)
                res = ''
                for par in re.split(r'\n\s*\n', cuerpo):
                    par = par.strip()
                    if par and not par.startswith(('#', '---', '|', '```', '>')):
                        res = re.sub(r'\s+', ' ', par)[:260]
                        break
                notas.append({'t': h1.group(1).strip() if h1 else f[:-3],
                              'r': os.path.relpath(p, RAIZ).replace(os.sep, '/'),
                              's': res})
    ctx['notas'] = notas

    ag = os.path.join(RAIZ, '.claude', 'agents')
    if os.path.isdir(ag):
        ctx['agentes'] = []
        for f in sorted(os.listdir(ag)):
            if not f.endswith('.md'):
                continue
            t = open(os.path.join(ag, f), encoding='utf-8').read()
            d = re.search(r'^description:\s*(.+)$', t, re.M)
            ctx['agentes'].append({'n': f[:-3],
                                   'd': (d.group(1).strip() if d else '')[:200],
                                   # Viñetas, filas de tabla y apartados
                                   # numerados en negrita: las tres formas en
                                   # que un agente escribe una regla. Contar
                                   # sólo viñetas daba cero para `la-raya`, que
                                   # las numera; exigir letra tras la barra daba
                                   # uno para `catalogo`, cuyas filas abren con
                                   # comilla invertida.
                                   'reglas': (len(re.findall(r'^\s*[-*|]', t, re.M)) +
                                              len(re.findall(r'^\*\*\d+\s*·', t, re.M)))})

    reg = os.path.join(RAIZ, 'cerebro', '90-meta', 'agentes', 'registro.jsonl')
    ctx['corridas'] = []
    if os.path.exists(reg):
        for l in open(reg, encoding='utf-8'):
            l = l.strip()
            if l:
                try:
                    ctx['corridas'].append(json.loads(l))
                except Exception:
                    pass
    return ctx


# ---------------------------------------------------------------------------
# ENSANCHAR EL MOTOR
#
# El motor del facturador sabe de clientes y documentos. Aquí se le añaden las
# intenciones de empresa —catálogo, cerebro, agentes— y la salida al modelo.
#
# Se injerta en vez de reescribirse para que los dos Jarvis compartan el mismo
# núcleo probado. Lo que se toca aquí es lo que este Jarvis sabe de más.
# ---------------------------------------------------------------------------
EMPRESA = r"""
/* ---- lo que sabe de la empresa ---------------------------------------- */
var CTX = (typeof JV_CTX !== 'undefined' && JV_CTX) || {};
var API = (typeof JV_API !== 'undefined' && JV_API) || '';

/* Cómo se dirige a él. En la película es «sir»; aquí, «señor», y con cuentagotas:
   una fórmula de cortesía en cada frase deja de ser cortesía y pasa a ser un tic. */
var TRATO = ['', '', 'señor', '', 'señor', ''];
var trato = 0;
function sr(){ trato = (trato + 1) % TRATO.length;
  return TRATO[trato] ? ', ' + TRATO[trato] : ''; }

function buscaComp(n){
  var L = CTX.comp || [], limpio = function(x){
    return sinT(x).replace(/[^a-z0-9]/g, ''); };
  var f = limpio(n), mejor = null, largo = 0;
  L.forEach(function(e){
    var k = limpio(e.n);
    if(k.length >= 3 && f.indexOf(k) >= 0 && k.length > largo){ mejor = e; largo = k.length; }
    var raiz = String(e.n).split(/[(\s]/)[0];
    if(raiz && raiz.length >= 4){
      var r = limpio(raiz);
      if(f.indexOf(r) >= 0 && r.length > largo){ mejor = e; largo = r.length; }
    }
  });
  return mejor;
}

var VACIAS = /^(cerebro|notas?|apuntes?|decisiones?|bitacora|busca|buscame|donde|dice|esta|escrito|hay|sobre|para|como|cual|que|los|las|del|una|uno|con|por|mas|muy|tengo|tienes|hace|sabe|sabes)$/;

/* Se engancha DELANTE de las reglas del facturador: lo de la empresa manda
   sobre lo de las facturas cuando las dos podrían contestar. */
var jvBase = jvPiensa;
jvPiensa = function(txt){
  var q = String(txt || '').trim(), n = sinT(q);
  if(!n) return [];

  /* -- quién es ---------------------------------------------------------- */
  if(/\b(quien eres|que eres|quien sos|preséntate|presentate|quién eres)/.test(n)){
    return [di('Jarvis' + sr() + '. No soy el ayudante del facturador — ' +
               'eso era antes, cuando vivía dentro de él. Ahora miro la empresa entera.'),
      tel('LO QUE ALCANZO', [
        ['Catálogo', (CTX.comp || []).length + ' compuestos, con su ficha y su estado'],
        ['Cerebro', (CTX.notas || []).length + ' notas — lo decidido y por qué'],
        ['Equipo', (CTX.agentes || []).length + ' agentes y lo que ha corrido cada uno'],
        ['Facturador', 'clientes, documentos y pedidos']
      ]),
      di(API
        ? 'Cuando la pregunta no cae en ninguna regla, razono con un modelo. ' +
          'Lo que sé de la empresa va con la pregunta.'
        : 'Contesto con reglas: lo que hay en los ficheros, sin inventar. ' +
          'Para conversación abierta falta conectar el modelo.')];
  }

  /* -- una ficha de compuesto ------------------------------------------- */
  var e = buscaComp(n);
  if(e && !/\b(factur|cliente|cobr|pagad|pedido)/.test(n)){
    var r = e.ref || {};
    var filas = [];
    if(e.cat) filas.push(['Clase', e.cat]);
    if(e.esp) filas.push(['Presentación', e.esp]);
    if(e.sku) filas.push(['SKU', e.sku]);
    if(e.sol) filas.push(['Solvente', e.sol]);
    if(e.alm) filas.push(['Conservación', e.alm]);
    var out = [di('<b>' + jvE(e.n) + '</b>' + (e.mec ? '<br>' + jvE(e.mec) : '')),
               tel('FICHA', filas)];
    if(r.ini || r.mant)
      out.push(di('El registro de operación trae cifras de referencia para éste. ' +
                  'Las cito, no las aplico: <b>' + jvE(r.ini || r.mant) + '</b>' +
                  (r.frec ? ' · ' + jvE(r.frec) : '') + '.'),
               eco('CITADO DEL REGISTRO · NO ES UNA RECOMENDACIÓN', 'aviso'));
    return out;
  }

  /* -- el catálogo entero ------------------------------------------------ */
  if(/\b(catalogo|compuesto|peptido|ficha|inventario de producto)/.test(n)){
    var L = CTX.comp || [];
    var sinMg = L.filter(function(x){ return !x.mg; }).length;
    var sinAlm = L.filter(function(x){ return !x.alm; }).length;
    return [di('<b>' + L.length + '</b> compuestos en el registro de operación' + sr() + '.'),
      tel('ESTADO DEL CATÁLOGO', [
        ['Sin miligramos', String(sinMg) + ' — no precargan la calculadora'],
        ['Sin conservación', String(sinAlm)],
        ['Completos', String(L.length - sinMg)]
      ]),
      di('Nómbrame cualquiera y te leo su ficha.')];
  }

  /* -- el cerebro -------------------------------------------------------- */
  if(/\b(cerebro|nota|apunt|decision|bitacora|donde dice|donde esta escrito)/.test(n)){
    var N = CTX.notas || [];
    /* Se busca UNA palabra, la más larga que sobreviva al filtro — no la frase
       que queda al quitar las vacías. «qué hay en el cerebro sobre jarvis»
       dejaba «hay jarvis», que no está en ninguna nota. */
    var pal = n.replace(/[¿?¡!.,;:]/g, ' ').split(/\s+/)
               .filter(function(w){ return w.length > 2 && !VACIAS.test(w); })
               .sort(function(a, b){ return b.length - a.length; })[0] || '';
    var hits = pal.length > 2
      ? N.filter(function(x){ return sinT(x.t + ' ' + x.s + ' ' + x.r).indexOf(pal) >= 0; })
      : [];
    if(hits.length)
      return [di('<b>' + hits.length + '</b> en el cerebro sobre «' + jvE(pal) + '».'),
        tel('NOTAS', hits.slice(0,6).map(function(x){ return [x.t, x.r]; }))];
    return [di('El cerebro tiene <b>' + N.length + '</b> notas.'),
      tel('LO QUE HAY', N.slice(0,8).map(function(x){ return [x.t, x.r]; })),
      di('Dime de qué y te digo dónde está.')];
  }

  /* -- los agentes ------------------------------------------------------- */
  if(/\b(agente|equipo|quien vigila|quien lleva)/.test(n)){
    var A = CTX.agentes || [], C = CTX.corridas || [];
    if(!A.length) return [di('No tengo a los agentes cargados.')];
    return [di('Cinco especialistas' + sr() + '.'),
      tel('EL EQUIPO', A.map(function(x){
        var mios = C.filter(function(c){ return c.agente === x.n; });
        return [x.n, x.reglas + ' reglas · ' + mios.length + ' corridas']; })),
      di('No aprenden solos: mejoran cuando se les añade una regla. Lo que sube ' +
         'de verdad es lo que vigilan.')];
  }

  return jvBase(txt);
};

/* ==========================================================================
   RAZONAR

   Cuando ninguna regla engancha, y sólo entonces, la pregunta sale a un modelo.

   Es a propósito que sea el último recurso: lo que sí saben las reglas lo
   contestan al instante, sin conexión y sin coste. El modelo se guarda para lo
   que las reglas no cubren, que es justo donde hace falta.

   La clave NO está aquí. `JV_API` apunta a una función de servidor que la
   guarda como variable de entorno. Meter una clave en esta página sería
   regalársela a quien la abra.
   ========================================================================== */
function resumenCtx(){
  var L = CTX.comp || [], N = CTX.notas || [], A = CTX.agentes || [];
  return 'PEPTIDEX vende péptidos de investigación (RUO). ' +
    L.length + ' compuestos: ' + L.slice(0,40).map(function(e){ return e.n; }).join(', ') + '. ' +
    'Notas del cerebro: ' + N.slice(0,25).map(function(x){ return x.t; }).join('; ') + '. ' +
    'Agentes: ' + A.map(function(x){ return x.n; }).join(', ') + '.';
}

var jvReglas = jvPiensa;
jvPiensa = function(txt){
  var r = jvReglas(txt);
  var noCogio = r.length && r[0].t === 'di' && /no lo cojo|no lo cog/i.test(r[0].txt);
  if(!noCogio) return r;
  if(API){ pregunta(txt); return [di('Un momento' + sr() + '.')]; }
  /* Sin modelo, al menos que la salida en falso hable de la empresa entera y
     no sólo de facturas — que es de lo único que sabía el núcleo heredado. */
  return [di('Eso no lo cojo' + sr() + '.'),
    tel('LO QUE SÍ', [
      ['Catálogo',  'el catálogo · el nombre de un compuesto'],
      ['Cerebro',   'qué hay en el cerebro sobre …'],
      ['Equipo',    'los agentes'],
      ['Facturador','resumen · quién me debe · nueva factura']
    ])];
};

function pregunta(txt){
  JV.estado = 'pensando'; jvPinta();
  var hist = JV.msgs.filter(function(m){ return m.tu || m.t === 'di'; }).slice(-8)
    .map(function(m){ return {rol: m.tu ? 'user' : 'assistant',
                              txt: String(m.txt || '').replace(/<[^>]+>/g, '')}; });
  fetch(API, {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({pregunta: txt, contexto: resumenCtx(), historial: hist})})
    .then(function(res){ if(!res.ok) throw new Error(res.status); return res.json(); })
    .then(function(d){
      JV.estado = 'idle';
      var t = String(d.respuesta || d.text || '').trim();
      JV.msgs.push(t ? {t:'di', txt: jvE(t).replace(/\n/g, '<br>')}
                     : {t:'di', txt:'No me devolvió nada.'});
      jvPinta();
      jvHabla(t.replace(/<[^>]+>/g, ''));
    })
    .catch(function(err){
      JV.estado = 'idle';
      JV.msgs.push({t:'di', txt:'No pude alcanzar el servicio de razonamiento.'},
                   {t:'eco', txt:'SIN CONEXIÓN AL MODELO · SIGO CON LAS REGLAS', cls:'aviso'});
      jvPinta();
    });
}
"""


def ensancha(js):
    """Mete las intenciones de empresa e hispaniza lo heredado.

    El núcleo viene del facturador y se presenta como su ayudante: el saludo
    habla de clientes y documentos, y los atajos son los cuatro de facturar.
    Aquí Jarvis no es eso, así que se reescriben. Cada cambio va con su
    comprobación: si la fuente se mueve, esto falla en la compilación y no en
    silencio."""
    ancla = "document.addEventListener('keydown', function(ev){"
    assert ancla in js, 'no encuentro dónde injertar'
    js = js.replace(ancla, EMPRESA + '\n' + ancla, 1)

    saludo = "'Jarvis en línea. Leo tus clientes, tus documentos y tus pedidos.'"
    assert saludo in js, 'el saludo heredado cambió'
    js = js.replace(saludo, "'Jarvis en línea. Llevo el catálogo, el cerebro, "
                            "el equipo y el facturador.'", 1)

    atajos = "['Resumen', '¿Quién me debe?', '¿Cuánto facturé este mes?', 'Nueva factura']"
    assert atajos in js, 'los atajos heredados cambiaron'
    js = js.replace(atajos, "['El catálogo', 'Los agentes', 'Qué hay en el cerebro',"
                            " 'Resumen', '¿Quién me debe?']", 1)

    return js


SHELL = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>JARVIS — PEPTIDEX</title>
<meta name="theme-color" content="#04070A"/>
<meta name="description" content="La consola de PEPTIDEX."/>
<link rel="apple-touch-icon" href="../pepx/apple-touch-icon.png"/>
<style>
/* La página es el HUD entero, no un panel encima de otra cosa. */
html,body{margin:0;padding:0;height:100%;background:#04070A;}
body{overflow:hidden;}
/* `height:auto` es deliberado: en el facturador, bajo 640px, el panel es una
   hoja al 92% de alto —tiene sentido cuando hay una app debajo—. Aquí no hay
   nada debajo, así que se anula y mandan top/bottom. */
#jarvis{position:fixed !important; inset:0 !important; width:auto !important;
  height:auto !important; border:0 !important; max-width:none !important;
  border-radius:0 !important; animation:none !important;}
#jarvis .jv-hd,#jarvis .jv-scroll,#jarvis .jv-in,#jarvis .jv-pie,
/* El núcleo queda fuera: trae su propio `margin:auto` y estirarlo a 100%
   lo pegaba al borde izquierdo en móvil. */
#jarvis .jv-est{max-width:820px; margin-left:auto; margin-right:auto;
  /* Sin border-box, el 100% se suma al relleno propio del panel y la columna
     entera se sale ~40px por la derecha en móvil. Se veía cortado. */
  width:100%; box-sizing:border-box;}
#jarvis .jv-scroll{padding-left:22px; padding-right:22px;}
/* Aquí no hay nada detrás que descubrir al cerrar: la página es Jarvis. */
#jvScrim,#jvFab,#jvX{display:none !important;}
@media(min-width:720px){ #jarvis .jv-nuc{width:168px;height:168px;}
  #jarvis .jv-nuc svg{width:168px;height:168px;} }
__CSS__
</style>
</head>
<body>
<div id="jvWrap"></div>
<script>__CTX__</script>
<script>__JS__</script>
<script>if(window.__jarvis) window.__jarvis.abre();</script>
</body>
</html>
'''


def main():
    css, js, nuc = del_facturador()
    ctx = contexto()

    # El núcleo, generado por el mismo código que el del facturador. Un solo
    # diccionario para globales y locales: con dos, las funciones de nivel
    # superior quedan en el local y no se ven entre ellas al llamarse.
    ns = {'math': __import__('math')}
    exec(compile(nuc, 'nucleo', 'exec'), ns)

    js = js.replace('__RETICULA__', ns['RETICULA'].replace('\n', ' ').replace("'", "\\'"))
    js = ensancha(js)

    doc = (SHELL
           .replace('__CSS__', css)
           .replace('__CTX__', 'const JV_CTX = ' + json.dumps(ctx, ensure_ascii=False) + ';\n'
                               '/* Pon aquí la URL de tu función de servidor para que Jarvis\n'
                               '   razone con un modelo. Vacío = sólo reglas. */\n'
                               "const JV_API = '';")
           .replace('__JS__', js))

    open(OUT, 'w', encoding='utf-8').write(doc)
    print('  %d compuestos · %d notas del cerebro · %d agentes · %d corridas'
          % (len(ctx.get('comp', [])), len(ctx['notas']),
             len(ctx.get('agentes', [])), len(ctx['corridas'])))
    print('  %s   %.0f KB' % (OUT, len(doc.encode()) / 1024))


if __name__ == '__main__':
    main()

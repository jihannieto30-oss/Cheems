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

    # Los agentes se presentan en inglés porque este Jarvis habla inglés. La
    # `description` del fichero se queda en español a propósito: es lo que lee
    # el enrutador de Claude Code, y ahí el idioma de trabajo es el de Jihan.
    # Lo que cambia es cómo los presenta Jarvis, que es su propia voz.
    EN = {
        'vera':  'Keeps the operations register honest — the 60 compound '
                 'sheets. Catches what is missing before it reaches a customer.',
        'lex':   'The compliance line. Nothing goes out that turns a record '
                 'into a prescription. Read-only on purpose.',
        'iris':  'Checks that what gets built looks like the reference that '
                 'was handed over, not an improved version of it.',
        'lira':  'Writes in the PEPTIDEX voice — store, product, education, '
                 'campaigns. Drafts only; never publishes.',
        'atlas': 'Carries the business end: prices and margins, stock, '
                 'shipping and customs, the invoicer.',
    }
    ag = os.path.join(RAIZ, '.claude', 'agents')
    if os.path.isdir(ag):
        ctx['agentes'] = []
        for f in sorted(os.listdir(ag)):
            if not f.endswith('.md'):
                continue
            t = open(os.path.join(ag, f), encoding='utf-8').read()
            d = re.search(r'^description:\s*(.+)$', t, re.M)
            nombre = f[:-3]
            assert nombre in EN, f'agente sin presentación en inglés: {nombre}'
            ctx['agentes'].append({'n': nombre,
                                   'd': EN[nombre],
                                   'es': (d.group(1).strip() if d else '')[:200],
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
/* ==========================================================================
   JARVIS · the company layer, in English

   The engine underneath came from the invoicer and speaks Spanish about
   invoices. Everything a person actually says to Jarvis is handled here, in
   English, before it ever gets there.

   The thing that made the old version feel like a robot was not vocabulary.
   It was that every turn started from nothing: ask about BPC 157, then ask
   "and its storage?", and it had already forgotten what "its" meant. Three
   things fix that, and none of them need a model:

     1. MEM   — what we were just talking about
     2. varia — never say the same sentence twice in a row
     3. glue  — "it", "why", "and", "no", "go on" mean something

   What is NOT here, deliberately: any invented fact. Every number comes out
   of CTX, which is built from library.json and the vault at compile time. The
   measured reason is in llm/README.md — a model trained on this corpus put a
   dose figure on the wrong compound 70 % of the time. Facts are looked up.
   Only the phrasing is free.
   ========================================================================== */

var CTX = (typeof JV_CTX !== 'undefined' && JV_CTX) || {};
var API = (typeof JV_API !== 'undefined' && JV_API) || '';

/* ---- memory of the conversation --------------------------------------- */
var MEM = {
  comp: null,       // last compound we discussed
  tema: null,       // last topic: catalogo | cerebro | equipo | factura
  agente: null,
  turnos: 0,
  dichas: {},       // phrasings already used, so they do not repeat
  saludado: false
};

/* Pick a phrasing that is not the one used last time for this slot. A single
   canned string per intent is what makes something sound mechanical — not the
   words themselves, the fact that they never change. */
function varia(clave, opciones){
  if(opciones.length === 1) return opciones[0];
  var ult = MEM.dichas[clave];
  var libres = opciones.filter(function(x){ return x !== ult; });
  var pick = libres[Math.floor(Math.random() * libres.length)];
  MEM.dichas[clave] = pick;
  return pick;
}

/* "sir", sparingly. A courtesy in every sentence stops being courtesy and
   becomes a tic. Roughly one turn in three. */
var TRATO = ['', '', ', sir', '', ', sir', ''];
var trato = 0;
function sr(){ trato = (trato + 1) % TRATO.length; return TRATO[trato]; }

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

/* Words that carry no search value. Kept short on purpose: an over-eager stop
   list eats the actual query. */
var VACIAS = /^(brain|vault|note|notes|decision|decisions|log|search|find|where|says|said|about|for|the|what|which|does|has|have|with|from|that|this|there|here|know|tell|show|give|any|our|your|and|but|its|it|is|are|was|were|los|las|del|que|sobre|cerebro|nota|notas)$/;

function palabraClave(n){
  return n.replace(/[¿?¡!.,;:()]/g, ' ').split(/\s+/)
          .filter(function(w){ return w.length > 2 && !VACIAS.test(w); })
          .sort(function(a, b){ return b.length - a.length; })[0] || '';
}

/* ---- rendering a compound --------------------------------------------- */
function fichaDe(e, breve){
  var r = e.ref || {}, filas = [];
  if(e.cat) filas.push(['Class', e.cat]);
  if(e.esp) filas.push(['Presentation', e.esp]);
  if(e.sku) filas.push(['SKU', e.sku]);
  if(e.sol) filas.push(['Solvent', e.sol]);
  if(e.alm) filas.push(['Storage', e.alm]);

  var out = [];
  var cab = e.mec
    ? varia('mec', ['<b>' + jvE(e.n) + '</b>. ' + jvE(e.mec),
                    '<b>' + jvE(e.n) + '</b> — ' + jvE(e.mec),
                    '<b>' + jvE(e.n) + '</b>.<br>' + jvE(e.mec)])
    : '<b>' + jvE(e.n) + '</b>.';
  out.push(di(cab));
  if(!breve) out.push(tel('SHEET', filas));

  /* Reference figures always travel with the notice attached. Never apart. */
  if(r.ini || r.mant)
    out.push(di('The operations register has reference figures on this one. ' +
                'I am quoting them, not applying them: <b>' +
                jvE(r.ini || r.mant) + '</b>' + (r.frec ? ' · ' + jvE(r.frec) : '') + '.'),
             eco('QUOTED FROM THE REGISTER · NOT A RECOMMENDATION', 'aviso'));

  /* Say what is missing. That is the difference between reading a record and
     being useful about it. */
  var falta = [];
  if(!e.mg)  falta.push('no milligrams, so it does not preload the calculator');
  if(!e.alm) falta.push('no storage on file');
  if(!e.sol) falta.push('no solvent on file');
  if(falta.length && !breve)
    out.push(di('Worth knowing: ' + falta.join(', ') + '. Vera would flag that.'));
  return out;
}

function campoDe(e, campo){
  var M = {alm:['Storage','stored'], sol:['Solvent','reconstituted'],
           cat:['Class','filed'], esp:['Presentation','presented'], sku:['SKU','coded']};
  var v = e[campo];
  if(!v) return [di('<b>' + jvE(e.n) + '</b> has no ' + M[campo][0].toLowerCase() +
                    ' on file' + sr() + '. That is a gap in the sheet, not something I am withholding.')];
  return [di(varia('campo', [
    '<b>' + jvE(e.n) + '</b> — ' + jvE(v) + '.',
    jvE(v) + '. That is what the sheet says for <b>' + jvE(e.n) + '</b>.',
    'For <b>' + jvE(e.n) + '</b>: ' + jvE(v) + '.'
  ]))];
}

/* ======================================================================== */
var jvBase = jvPiensa;
jvPiensa = function(txt){
  var q = String(txt || '').trim(), n = sinT(q);
  if(!n) return [];
  MEM.turnos++;

  /* -- conversational glue, before anything else ------------------------ */

  /* greetings */
  if(/^(hi|hey|hello|good morning|good evening|good afternoon|yo|hola)\b/.test(n)){
    MEM.saludado = true;
    return [di(varia('saludo', [
      'Good to see you' + sr() + '. What are we looking at?',
      'Here. What do you need?',
      'Morning. The catalogue and the vault are both loaded.',
      'At your service. Where do you want to start?'
    ]))];
  }

  if(/^(thanks|thank you|cheers|gracias|nice|good|perfect|great)\b/.test(n))
    return [di(varia('gracias', ['Of course.', 'Any time.',
                                 'That is what I am for.', 'Noted.']))];

  if(/^(bye|goodbye|see you|that is all|thats all|done|nothing)\b/.test(n))
    return [di(varia('adios', ['I will be here.', 'Standing by.',
                               'Whenever you need me.']))];

  if(/\b(how are you|you ok|you there|are you there)\b/.test(n))
    return [di(varia('estado', [
      'Running' + sr() + '. ' + (CTX.comp || []).length + ' compounds and ' +
        (CTX.notas || []).length + ' notes loaded.',
      'Fine. Everything is where it should be.',
      'All systems. Nothing has fallen over.'
    ]))];

  /* "why" with nothing else — refers back */
  if(/^(why|why is that|how come|and why)\b/.test(n) && MEM.comp)
    return [di('Because that is what the sheet for <b>' + jvE(MEM.comp.n) +
               '</b> says. I do not derive it — I read it. If it looks wrong, ' +
               'the sheet is wrong, and that is a job for Vera.')];

  /* follow-up: a bare field question refers to the last compound */
  var CAMPOS = [
    [/\b(storage|stor|temperatur|cold chain|keep|kept|fridge|freez)/, 'alm'],
    [/\b(solvent|reconstitut|dilut|mix with)|\bbac\b/, 'sol'],
    [/\b(class|famil|categor)/, 'cat'],
    [/\b(presentation|format|vial|size|comes)/, 'esp'],
    [/\b(sku|code)\b/, 'sku']
  ];
  var e = buscaComp(n);
  if(e) MEM.comp = e;

  for(var ci = 0; ci < CAMPOS.length; ci++){
    if(CAMPOS[ci][0].test(n)){
      var obj = e || MEM.comp;
      if(obj){ MEM.tema = 'catalogo'; return campoDe(obj, CAMPOS[ci][1]); }
    }
  }

  /* pronoun without a referent */
  if(/^(and it|what about it|its|it|that one|the same)\b/.test(n) && !e){
    if(MEM.comp) return fichaDe(MEM.comp);
    return [di('I have lost the thread' + sr() + '. Name it again.')];
  }

  /* -- a compound sheet -------------------------------------------------- */
  if(e && !/\b(invoice|client|charge|paid|order|factur|cliente|cobr|pagad|pedido)/.test(n)){
    MEM.tema = 'catalogo';
    return fichaDe(e);
  }

  /* -- the catalogue ----------------------------------------------------- */
  if(/\b(catalogue|catalog|compound|peptide|inventory|product|catalogo|compuesto)/.test(n)){
    var L = CTX.comp || [];
    var sinMg = L.filter(function(x){ return !x.mg; });
    var sinAlm = L.filter(function(x){ return !x.alm; });
    MEM.tema = 'catalogo';
    var out = [di('<b>' + L.length + '</b> compounds in the operations register' + sr() + '.'),
      tel('CATALOGUE STATE', [
        ['No milligrams', sinMg.length + ' — these do not preload the calculator'],
        ['No storage', String(sinAlm.length)],
        ['Complete', String(L.length - sinMg.length)]
      ])];
    if(sinMg.length)
      out.push(di('The gaps are not cosmetic: without milligrams the calculator ' +
                  'starts empty, and someone has to type the number by hand — ' +
                  'which is where mistakes come from. ' +
                  jvE(sinMg.slice(0,4).map(function(x){ return x.n; }).join(', ')) +
                  (sinMg.length > 4 ? ' and ' + (sinMg.length - 4) + ' more.' : '.')));
    out.push(di('Name any of them and I will read you the sheet.'));
    return out;
  }

  /* -- the vault --------------------------------------------------------- */
  if(/\b(brain|vault|note|decision|logbook|decided|why did we|cerebro|nota|decision)/.test(n)){
    var N = CTX.notas || [];
    MEM.tema = 'cerebro';
    var pal = palabraClave(n);
    var hits = pal.length > 2
      ? N.filter(function(x){ return sinT(x.t + ' ' + x.s + ' ' + x.r).indexOf(pal) >= 0; })
      : [];
    if(hits.length)
      return [di('<b>' + hits.length + '</b> ' + (hits.length === 1 ? 'note' : 'notes') +
                 ' on «' + jvE(pal) + '».'),
        tel('NOTES', hits.slice(0,6).map(function(x){ return [x.t, x.r]; })),
        di(hits.length === 1 ? 'That is the one.' : 'Narrow it and I will go deeper.')];
    return [di('The vault holds <b>' + N.length + '</b> notes' + sr() + '.'),
      tel('WHAT IS IN THERE', N.slice(0,8).map(function(x){ return [x.t, x.r]; })),
      di(pal ? 'Nothing on «' + jvE(pal) + '» though. If it was decided, it was ' +
               'not written down — and if it was not written down, it did not happen.'
             : 'Tell me the subject and I will tell you where it lives.')];
  }

  /* -- the team ---------------------------------------------------------- */
  /* Raíces sin \b de cierre («agent» tiene que casar con «agents»), y los
     nombres propios sí con \b porque son palabras enteras. */
  if(/\b(agent|team|who watches|who handles|equipo)|\b(vera|lex|iris|lira|atlas)\b/.test(n)){
    var A = CTX.agentes || [], C = CTX.corridas || [];
    if(!A.length) return [di('The agents are not loaded.')];
    MEM.tema = 'equipo';

    var uno = A.filter(function(x){ return n.indexOf(x.n) >= 0; })[0];
    if(uno){
      MEM.agente = uno;
      var mios = C.filter(function(c){ return c.agente === uno.n; });
      var out = [di('<b>' + uno.n.toUpperCase() + '</b>. ' + jvE(uno.d))];
      if(mios.length)
        out.push(tel('RUNS', mios.map(function(c){
          return [c.tarea, c.hallazgos + ' found · ' + c.arreglados + ' fixed']; })));
      else
        out.push(di('Has not run yet.'));
      return out;
    }
    return [di(varia('equipo', [
        'Five specialists' + sr() + '.',
        'Five of them. Each one watches a different part.',
        'The team, and what each one has actually done:'
      ])),
      tel('THE TEAM', A.map(function(x){
        var mios = C.filter(function(c){ return c.agente === x.n; });
        return [x.n, x.reglas + ' rules · ' + mios.length + ' runs']; })),
      di('They do not learn on their own — they improve when someone adds a ' +
         'rule. What actually goes up is what they watch. Name one and I will ' +
         'tell you what it has found.')];
  }

  /* -- what it is, and what it is not ------------------------------------ */
  if(/\b(who are you|what are you|introduce yourself|quien eres|que eres)\b/.test(n))
    return [di('Jarvis' + sr() + '. I used to live inside the invoicer, which ' +
               'meant I could only talk about invoices. Not anymore.'),
      tel('WHAT I REACH', [
        ['Catalogue', (CTX.comp || []).length + ' compounds, with their sheets and gaps'],
        ['Vault', (CTX.notas || []).length + ' notes — what was decided and why'],
        ['Team', (CTX.agentes || []).length + ' agents and what each has run'],
        ['Invoicer', 'clients, documents, orders']
      ]),
      di(API ? 'When a question falls outside the rules, I reason with a model, ' +
               'and what I know about the company goes with the question.'
             : 'I answer from rules — which means I only say what is actually in ' +
               'the files. That is a floor, not a ceiling: it is why I cannot ' +
               'make something up.')];

  if(/\b(can you (recommend|suggest) (a )?(dose|dosage)|how much should i|what should i take)\b/.test(n))
    return [di('No' + sr() + '. I can read you what the operations register has ' +
               'on file, and I will say plainly that it is a quoted record.'),
      eco('RESEARCH USE ONLY · THAT LINE IS NOT MINE TO CROSS', 'aviso')];

  if(/\b(are you (an? )?(llm|ai|model)|do you think|are you conscious|are you real)\b/.test(n))
    return [di('Honestly' + sr() + '? Right now I am a very well-read set of rules. ' +
               'I read your files and I answer from them. ' +
               (API ? 'A model is wired in for what the rules do not cover.'
                    : 'No model is wired in yet, so anything I cannot look up, I say I cannot.')),
      di('Which is not nothing. It means I have never told you something that ' +
         'was not in a file.')];

  if(/\b(what can you do|help|commands|what do you know)\b/.test(n))
    return [di('Ask me in plain English' + sr() + '. Some of what lands:'),
      tel('TRY', [
        ['Catalogue', 'the catalogue · BPC 157 · how do I store TB-500'],
        ['Vault',     'what does the brain say about jarvis'],
        ['Team',      'the agents · what has iris found'],
        ['Invoicer',  'summary · who owes me · new invoice']
      ]),
      di('And you can follow up. Ask about a compound, then just ask ' +
         '«and its storage?» — I keep the thread.')];

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


# Todo lo que ve el usuario y viene en español del facturador. La izquierda es
# la fuente literal; la derecha, cómo queda aquí. Cada par se comprueba: si el
# facturador cambia una cadena, esto revienta en la compilación en vez de dejar
# medio Jarvis en español sin que nadie se entere.
TRADUCE = [
    # saludo y atajos: además de traducirse, dejan de hablar sólo de facturas
    ("'Jarvis en línea. Leo tus clientes, tus documentos y tus pedidos.'",
     "'Jarvis online. I have the catalogue, the vault, the team and the invoicer.'"),
    ("['Resumen', '¿Quién me debe?', '¿Cuánto facturé este mes?', 'Nueva factura']",
     "['The catalogue', 'The agents', 'What is in the vault', 'Summary', 'Who owes me']"),
    # identidad de la cabecera
    ("PEPTIDEX · consola de mando", "PEPTIDEX · command console"),
    # estados del núcleo
    ("var ESTADOS = {idle:'en línea', oyendo:'escuchando', pensando:'procesando',\n"
     "               hablando:'respondiendo', guardia:'en guardia · di «Jarvis»'};",
     "var ESTADOS = {idle:'online', oyendo:'listening', pensando:'thinking',\n"
     "               hablando:'speaking', guardia:'standing by · say «Jarvis»'};"),
    # campo de entrada y pie
    ('placeholder="Dime qué necesitas"', 'placeholder="Tell me what you need"'),
    ("'Micrófono abierto esperando «Jarvis» · sólo mientras esta página esté abierta'",
     "'Mic open, waiting for «Jarvis» · only while this page is open'"),
    ("'Opera sobre tus datos locales · no envía nada a ningún sitio'",
     "'Works on your local data · sends nothing anywhere'"),
    # avisos del micrófono
    ("'MICRÓFONO NO DISPONIBLE'", "'MICROPHONE UNAVAILABLE'"),
    ("'MICRÓFONO DENEGADO · GUARDIA APAGADA'", "'MICROPHONE DENIED · STANDBY OFF'"),
    # botones
    ('aria-label="Enviar"', 'aria-label="Send"'),
    ('aria-label="Cerrar"', 'aria-label="Close"'),
    # el «¿sí?» de la palabra de activación
    ("jvHabla('¿Sí?'", "jvHabla('Yes?'"),
]


def ensancha(js):
    """Injerta la capa de empresa y pasa a inglés lo heredado.

    El núcleo viene del facturador, que es una herramienta en español para
    Jihan. Este Jarvis habla inglés, así que las cadenas que ve el usuario se
    sustituyen aquí — no en la fuente, que tiene que seguir en español donde
    vive."""
    ancla = "document.addEventListener('keydown', function(ev){"
    assert ancla in js, 'no encuentro dónde injertar'
    js = js.replace(ancla, EMPRESA + '\n' + ancla, 1)

    for viejo, nuevo in TRADUCE:
        assert viejo in js, f'la fuente cambió, no encuentro: {viejo[:60]}'
        js = js.replace(viejo, nuevo, 1)

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

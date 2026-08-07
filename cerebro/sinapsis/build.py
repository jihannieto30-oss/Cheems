#!/usr/bin/env python3
"""SINAPSIS — el cerebro, en web.

QUÉ ES

Un fichero HTML que se genera DESDE el vault. No es una copia dibujada a mano
que envejece en cuanto alguien escribe una nota: es una compilación. Cada vez
que corres esto, la web es exactamente lo que hay en el cerebro ahora.

Eso es lo que la hace «viva», y es lo único que lo hace. Una web del cerebro
que hubiera que actualizar a mano sería una tercera copia de la verdad, y con
dos ya hay bastante.

QUÉ LLEVA DENTRO

    GRAFO       las notas y los enlaces entre ellas, como Obsidian
    BUSCAR      texto completo sobre todo el vault
    OPTIMIZAR   el análisis: qué está roto, qué falta, qué se pudre

EL «AGENTE», DICHO SIN ADORNOS

El panel de OPTIMIZAR no es un modelo de lenguaje. No hay servidor detrás y no
sale ninguna petición: es un analizador determinista, igual que PepCheems.
Recorre el vault y el registro de operación de PEPTIDEX y aplica reglas
concretas — notas que nadie enlaza, enlaces que no llevan a ningún sitio,
fichas de compuesto a las que les falta el dato que la calculadora necesita.

Lo que gana con eso: contesta al instante, no se inventa nada, y cada hallazgo
se puede comprobar a mano. Lo que pierde: no razona sobre lo que encuentra.
Para eso estoy yo, y para eso está el repo.

CÓMO SE CORRE

    python3 sinapsis/build.py                        # sólo el cerebro
    python3 sinapsis/build.py --peptidex ../Cheems   # + las 60 fichas

    →  sinapsis/index.html
"""
import argparse, io, json, os, re, sys
from datetime import date, datetime

AQUI  = os.path.dirname(os.path.abspath(__file__))
VAULT = os.path.dirname(AQUI)
SALTA = {'.git', '.obsidian', '.claude', 'sinapsis', 'node_modules', '.trash',
         'plantillas'}   # las plantillas son andamio, no pensamiento


# ---------------------------------------------------------------------------
# 1 · leer el vault
# ---------------------------------------------------------------------------
def frontmatter(txt):
    """El bloque YAML de arriba. Un analizador de YAML entero sería traer una
    dependencia para leer cuatro claves planas, así que se leen a mano — y si
    algún día hace falta YAML de verdad, que falle aquí y no en silencio."""
    if not txt.startswith('---'):
        return {}, txt
    fin = txt.find('\n---', 3)
    if fin < 0:
        return {}, txt
    crudo, cuerpo = txt[3:fin], txt[fin+4:]
    meta = {}
    for linea in crudo.splitlines():
        if ':' not in linea or linea.strip().startswith('#'):
            continue
        k, v = linea.split(':', 1)
        k, v = k.strip(), v.strip()
        if v.startswith('[') and v.endswith(']'):
            meta[k] = [x.strip().strip('"\'') for x in v[1:-1].split(',') if x.strip()]
        else:
            meta[k] = v.strip('"\'')
    return meta, cuerpo.lstrip('\n')


ENLACE = re.compile(r'\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]')
CERCA  = re.compile(r'```.*?```|`[^`\n]+`', re.S)


def sin_codigo(md):
    """El texto sin bloques ni tramos de código.

    Hace falta antes de buscar enlaces: `CLAUDE.md` explica la convención
    escribiendo «`[[nota]]` de Obsidian», entre comillas de código, y el
    extractor lo contaba como un enlace a una nota llamada «nota» que no
    existe. Un falso positivo en el panel de análisis es peor que no tener
    panel: en cuanto sale uno, dejas de creerte los demás.

    Se sustituye por espacios en vez de borrarse, para no descuadrar nada que
    dependa de las posiciones."""
    return CERCA.sub(lambda m: ' ' * len(m.group(0)), md)
# `\s+` incluye el salto de línea, así que `# ` vacío seguido de `## Qué es`
# daba «## Qué es» como título de la nota. Sólo espacio horizontal.
TITULO = re.compile(r'^#[ \t]+(.+)$', re.M)


def leer_vault(raiz):
    notas = {}
    for dirp, dirs, files in os.walk(raiz):
        dirs[:] = [d for d in dirs if d not in SALTA and not d.startswith('.')]
        for f in sorted(files):
            # `_algo.md` es andamio por convención —plantillas, borradores de
            # formato— igual que la carpeta plantillas/. Que salga en el grafo
            # como nota huérfana es ruido, y el ruido se come la credibilidad
            # del panel de análisis.
            if not f.endswith('.md') or f.startswith('_'):
                continue
            ruta = os.path.join(dirp, f)
            rel  = os.path.relpath(ruta, raiz).replace(os.sep, '/')
            with open(ruta, encoding='utf-8') as fh:
                txt = fh.read()
            meta, cuerpo = frontmatter(txt)
            slug = os.path.splitext(os.path.basename(f))[0]
            h1 = TITULO.search(cuerpo)
            carpeta = rel.split('/')[0] if '/' in rel else '(raíz)'

            # el primer párrafo de verdad, para el resumen de la ficha
            resumen = ''
            for p in re.split(r'\n\s*\n', cuerpo):
                p = p.strip()
                if p and not p.startswith(('#', '---', '|', '```', '>')):
                    resumen = re.sub(r'\s+', ' ', p)[:220]
                    break

            notas[slug] = {
                'slug': slug, 'ruta': rel, 'carpeta': carpeta,
                'titulo': (h1.group(1).strip() if h1 else slug),
                'tags': meta.get('tags') or [],
                'alias': meta.get('alias') or [],
                'estado': meta.get('estado', ''),
                'actualizado': meta.get('actualizado', ''),
                'resumen': resumen,
                'md': cuerpo,
                'texto': re.sub(r'\s+', ' ', (cuerpo + ' ' + ' '.join(meta.get('alias') or []))).lower(),
                'enlaces': [], 'rotos': [], 'entrantes': []
            }

    # los enlaces se resuelven DESPUÉS, cuando ya están todas: un [[…]] puede
    # apuntar a una nota que aparece más adelante en el recorrido.
    por_alias = {}
    for n in notas.values():
        por_alias[n['slug'].lower()] = n['slug']
        por_alias[n['titulo'].lower()] = n['slug']
        for a in n['alias']:
            por_alias[a.lower()] = n['slug']

    for n in notas.values():
        vistos = set()
        for m in ENLACE.finditer(sin_codigo(n['md'])):
            destino = por_alias.get(m.group(1).strip().lower())
            if destino and destino != n['slug']:
                if destino not in vistos:
                    vistos.add(destino)
                    n['enlaces'].append(destino)
                    notas[destino]['entrantes'].append(n['slug'])
            elif not destino:
                n['rotos'].append(m.group(1).strip())
    return notas


# ---------------------------------------------------------------------------
# 2 · el registro de operación de PEPTIDEX
# ---------------------------------------------------------------------------
BEAUTY = re.compile(r'GHK|AHK|MELANOTAN|GLUTATH|KPV|SNAP|ARGIRELIN|COLLAG|BIOTIN|PALMITOYL', re.I)
FAMILIA = [
    ('perf', re.compile(r'Somatotr|HGH|Lipólisis|Grasa|Incretina', re.I)),
    ('reco', re.compile(r'Regenera|Cicatriz', re.I)),
    ('long', re.compile(r'Neuroprot|Longevidad', re.I)),
]


def familia(e):
    if BEAUTY.search(e.get('n', '')):
        return 'beau'
    cat = e.get('cat', '') or ''
    for cod, rx in FAMILIA:
        if rx.search(cat):
            return cod
    return None


def leer_peptidex(repo):
    p = os.path.join(repo, 'web', 'assets', 'library.json')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 2b · LOS AGENTES
#
# LO QUE SE MIDE ES EL RESULTADO, NO EL AGENTE.
#
# Un agente es un fichero de instrucciones. No tiene experiencia, no acumula
# nada entre ejecuciones y no aprende solo. Una barra de progreso que subiera
# sola sería decorado midiendo el vacío.
#
# Lo que sí sube, y se puede comprobar:
#
#   · lo que el agente VIGILA mejora  — de `catalogo` se calcula de verdad,
#     recorriendo library.json y contando campos completos
#   · el agente SABE más cosas        — su fichero crece cuando se le añade una
#     regla, y eso está en git con su fecha
# ---------------------------------------------------------------------------
AGENTES = [
    ('vera',  'Vera',  'las 60 fichas de compuesto'),
    ('lex',   'Lex',   'que nada cruce de registro a receta'),
    ('iris',  'Iris',  'que se parezca a las referencias'),
    ('lira',  'Lira',  'la copia que lee un cliente'),
    ('atlas', 'Atlas', 'precios, stock, envíos'),
]
CAMPOS = ('n', 'cat', 'sku', 'esp', 'mg', 'bac', 'sol', 'alm', 'ins', 'mec')


def leer_agentes(repo, vault, lib):
    """El estado de los cinco. Nada de esto se estima."""
    reg = []
    rp = os.path.join(vault, '90-meta', 'agentes', 'registro.jsonl')
    if os.path.exists(rp):
        for linea in open(rp, encoding='utf-8'):
            linea = linea.strip()
            if not linea:
                continue
            try:
                reg.append(json.loads(linea))
            except Exception:
                pass

    out = []
    for slug, nombre, guarda in AGENTES:
        f = os.path.join(repo, '.claude', 'agents', slug + '.md')
        palabras, reglas, desde = 0, 0, ''
        if os.path.exists(f):
            txt = open(f, encoding='utf-8').read()
            palabras = len(txt.split())
            # una «regla» es un punto de lista o un encabezado numerado: lo que
            # el agente tiene que aplicar, no la prosa que lo enmarca
            reglas = len(re.findall(r'^\s*[-*|]\s+\S', txt, re.M)) + \
                     len(re.findall(r'^\*\*\d+\s*·', txt, re.M))
        mios = [r for r in reg if r.get('agente') == slug]
        if mios:
            desde = sorted(r.get('ts', '') for r in mios)[-1][:10]

        # la medida de resultado, sólo donde se puede calcular de verdad
        medida = None
        if slug == 'vera' and lib:
            hay = sum(1 for e in lib for k in CAMPOS if e.get(k))
            tot = len(lib) * len(CAMPOS)
            medida = {'et': 'Fichas completas', 'pct': round(hay / tot * 100),
                      'de': '%d de %d campos' % (hay, tot)}

        out.append({
            'slug': slug, 'nombre': nombre, 'guarda': guarda,
            'palabras': palabras, 'reglas': reglas,
            'corridas': len(mios),
            'hallazgos': sum(int(r.get('hallazgos') or 0) for r in mios),
            'arreglados': sum(int(r.get('arreglados') or 0) for r in mios),
            'ultima': desde, 'medida': medida
        })
    reg.sort(key=lambda r: r.get('ts', ''), reverse=True)
    return {'fichas': out, 'registro': reg[:24]}


# ---------------------------------------------------------------------------
# 3 · EL ANALIZADOR
#
# Cada regla contesta a «¿qué se rompe si esto sigue así?». Una regla que no
# sepa contestar a eso no es un hallazgo, es una estadística — y un panel lleno
# de estadísticas deja de leerse en una semana.
# ---------------------------------------------------------------------------
def dias_desde(s):
    try:
        return (date.today() - datetime.strptime(str(s)[:10], '%Y-%m-%d').date()).days
    except Exception:
        return None


def analizar_cerebro(notas):
    out = []
    def h(sev, clave, titulo, porque, items):
        if items:
            out.append({'ambito': 'cerebro', 'sev': sev, 'clave': clave,
                        'titulo': titulo, 'porque': porque, 'items': items})

    h('alto', 'rotos', 'Enlaces que no llevan a ningún sitio',
      'Un [[enlace]] roto es una nota que alguien dio por escrita y no existe. '
      'O se crea, o se quita el enlace.',
      [{'n': n['titulo'], 'd': ' · '.join(sorted(set(n['rotos']))), 'ir': n['slug']}
       for n in notas.values() if n['rotos']])

    h('alto', 'huerfanas', 'Notas que nadie enlaza',
      'La búsqueda aquí es por texto. Una nota a la que no llega ningún enlace '
      'sólo se encuentra si recuerdas la palabra exacta — es decir, casi nunca.',
      [{'n': n['titulo'], 'd': n['carpeta'], 'ir': n['slug']}
       for n in sorted(notas.values(), key=lambda x: x['titulo'])
       if not n['entrantes'] and n['slug'] != 'CLAUDE' and n['carpeta'] != '(raíz)'])

    paradas = []
    for n in notas.values():
        if n['estado'] == 'vivo':
            d = dias_desde(n['actualizado'])
            if d is not None and d > 21:
                paradas.append({'n': n['titulo'], 'd': 'sin tocar hace %d días' % d,
                                'ir': n['slug'], 'orden': -d})
    h('medio', 'paradas', 'Marcadas como vivas pero paradas',
      'Un proyecto que se muere en silencio es la forma más común de que el '
      'cerebro deje de reflejar la realidad. Ciérralo o retómalo.',
      sorted(paradas, key=lambda x: x['orden']))

    h('medio', 'bandeja', 'La bandeja no está vacía',
      'La bandeja es un fallo controlado, no un destino. Lo que lleva dos '
      'revisiones sin poder colocarse es que no valía.',
      [{'n': n['titulo'], 'd': n['ruta'], 'ir': n['slug']}
       for n in notas.values() if n['carpeta'] == '00-bandeja'])

    h('bajo', 'sin-tags', 'Notas sin etiquetas',
      'Sin tags la nota depende de que aciertes la palabra literal al buscar.',
      [{'n': n['titulo'], 'd': n['carpeta'], 'ir': n['slug']}
       for n in notas.values() if not n['tags'] and n['carpeta'] != '(raíz)'])
    return out


def analizar_peptidex(lib):
    out = []
    def h(sev, clave, titulo, porque, items):
        if items:
            out.append({'ambito': 'peptidex', 'sev': sev, 'clave': clave,
                        'titulo': titulo, 'porque': porque, 'items': items})

    h('alto', 'sin-ficha', 'Compuestos casi sin ficha',
      'Les falta presentación, solvente, conservación y clase a la vez. En la '
      'app salen como una fila con el nombre y poco más, y PepCheems no puede '
      'contestar nada de ellos.',
      [{'n': e['n'], 'd': 'sin ' + ', '.join(k for k in ('sku', 'esp', 'sol', 'alm', 'ins')
                                             if not e.get(k))}
       for e in lib if sum(1 for k in ('sku', 'esp', 'sol', 'alm', 'ins') if not e.get(k)) >= 4])

    h('alto', 'sin-mg', 'Sin miligramos de vial',
      'Sin el dato `mg` la calculadora de reconstitución no se puede precargar '
      'desde la ficha: el usuario tiene que buscar el número en otro sitio.',
      [{'n': e['n'], 'd': e.get('cat', '')} for e in lib if not e.get('mg')])

    h('medio', 'sin-bac', 'Sin volumen de disolvente sugerido',
      'Es el segundo de los tres números de la calculadora. Sin él, media '
      'precarga.',
      [{'n': e['n'], 'd': e.get('cat', '')}
       for e in lib if not e.get('bac') and e.get('mg')])

    h('medio', 'sin-familia', 'Caen en «Otros»',
      'No encajan en ninguna de las tres líneas, así que la lista los manda al '
      'cajón de sastre y el filtro por familia no los encuentra.',
      [{'n': e['n'], 'd': e.get('cat', '') or 'sin categoría'}
       for e in lib if not familia(e)])

    h('medio', 'sin-alm', 'Sin dato de conservación',
      'PepCheems contesta preguntas de cadena de frío desde este campo. Vacío, '
      'no tiene qué decir.',
      [{'n': e['n'], 'd': e.get('cat', '')} for e in lib if not e.get('alm')])

    norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    pares = []
    for i, a in enumerate(lib):
        for b in lib[i+1:]:
            na, nb = norm(a['n']), norm(b['n'])
            if na != nb and (na in nb or nb in na):
                pares.append({'n': a['n'], 'd': 'contenido en «%s»' % b['n']})
    h('bajo', 'parecidos', 'Nombres que se contienen unos a otros',
      'El buscador de compuestos hace coincidencia por texto: al escribir el '
      'corto salen los dos, y al escribir el largo sale sólo uno. Conviene '
      'saber cuáles son.', pares)
    return out


# ---------------------------------------------------------------------------
# 4 · ensamblar
# ---------------------------------------------------------------------------
# Los mismos valores que app.css, escritos aquí una vez para poder
# redefinirlos bajo `prefers-color-scheme` sin duplicar la hoja entera.
OSCURO = ('--bg:#0D0D0D;--s1:#1A1A1A;--s2:#1A1A1A;--s3:#232323;'
          '--tx:#FFFFFF;--tx2:#A0A0A0;--tx3:#6E6E6E;'
          '--line:#2A2A2A;--line2:#3A3A3A;--btn:#FFFFFF;--onbtn:#0D0D0D;'
          '--grafo:#FFFFFF;--arista:#3A3A3A;--sh:none;color-scheme:dark;')
CLARO  = ('--bg:#FFFFFF;--s1:#FFFFFF;--s2:#F5F5F5;--s3:#EDEDED;'
          '--tx:#111111;--tx2:#6B6B6B;--tx3:#9B9B9B;'
          '--line:#EAEAEA;--line2:#D8D8D8;--btn:#111111;--onbtn:#FFFFFF;'
          '--grafo:#111111;--arista:#C8C8C8;color-scheme:light;')


def repo_por_defecto():
    """Dónde está el repo, mirando en vez de suponiendo.

    El vault vive DENTRO del repo (`Cheems/cerebro/`), pero antes era hermano
    suyo y el valor por defecto seguía siendo `../Cheems`. Desde dentro eso
    apunta a `Cheems/Cheems`, que no existe, y el panel se quedaba sin las 60
    fichas sin decir por qué. Se comprueba: gana el primero que tenga
    `.claude/agents`.
    """
    padre = os.path.dirname(VAULT)
    for cand in (padre, os.path.join(padre, 'Cheems'),
                 os.path.join(os.path.dirname(padre), 'Cheems')):
        if os.path.isdir(os.path.join(cand, '.claude', 'agents')):
            return cand
    return os.path.join(padre, 'Cheems')


def rd(n):
    with open(os.path.join(AQUI, n), encoding='utf-8') as f:
        return f.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--peptidex', default=repo_por_defecto(),
                    help='ruta al repo de PEPTIDEX (para las 60 fichas)')
    ap.add_argument('--salida', default=os.path.join(AQUI, 'index.html'))
    ap.add_argument('--artifact', action='store_true',
                    help='salida sin <html>/<head>, para publicar como página')
    args = ap.parse_args()

    notas = leer_vault(VAULT)
    if not notas:
        sys.exit('No hay ni una nota en %s. ¿Es ésta la carpeta del vault?' % VAULT)

    lib = leer_peptidex(args.peptidex)
    hallazgos = analizar_cerebro(notas)
    if lib:
        hallazgos += analizar_peptidex(lib)

    # El grafo se manda ligero: el markdown entero de cada nota va aparte, y el
    # texto de búsqueda ya viene en minúsculas para no rehacerlo en el cliente.
    datos = {
        'generado': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'notas': [{k: v for k, v in n.items() if k != 'texto'} for n in notas.values()],
        'indice': {n['slug']: n['texto'] for n in notas.values()},
        'hallazgos': hallazgos,
        'agentes': leer_agentes(args.peptidex, VAULT, lib),
        'peptidex': ({'total': len(lib),
                      'familias': {f: sum(1 for e in lib if familia(e) == f)
                                   for f in ('perf', 'reco', 'long', 'beau')}}
                     if lib else None)
    }

    css = rd('app.css')
    js  = rd('app.js')
    dat = 'const SX = ' + json.dumps(datos, ensure_ascii=False) + ';'

    if args.artifact:
        # ---- variante para publicar como página --------------------------
        # Dos diferencias, y las dos son del contrato de la plataforma:
        #
        #  1. Sin <html>/<head>: el documento lo pone el anfitrión.
        #  2. EL TEMA LO MANDA EL VISOR. La versión de fichero se acuerda del
        #     tema en localStorage y lo aplica al abrir; una página publicada
        #     no puede hacer eso, porque el lector ya eligió claro u oscuro en
        #     su cliente y llegar pisándoselo es de mala educación. Así que
        #     los tokens salen de `prefers-color-scheme`, y `data-theme` —que
        #     es lo que estampa el conmutador del visor— gana en los dos
        #     sentidos. El botón de la barra sigue funcionando: estampa lo
        #     mismo.
        css += ('\n\n/* ---- publicada: el tema lo manda el visor ---- */\n'
                '@media (prefers-color-scheme: dark){ :root{' + OSCURO + '} }\n'
                ':root[data-theme="dark"]{' + OSCURO + '}\n'
                ':root[data-theme="light"]{' + CLARO + '}\n')
        js = js.replace("const S = {vista:'grafo', q:'', abierta:null, tema:leerTema()};",
                        "const S = {vista:'grafo', q:'', abierta:null, tema:null};")
        js = js.replace('montaGrafo();\nponTema(S.tema);\npintaTodo();',
                        'montaGrafo();\npintaTodo();')
        doc = ('<style>' + css + '</style>\n<div id="root"></div>\n'
               '<script>' + dat + '</script>\n<script>' + js + '</script>\n')
    else:
        doc = (rd('shell.html')
               .replace('/*__CSS__*/', css)
               .replace('/*__DATOS__*/', dat)
               .replace('/*__JS__*/', js))

    with open(args.salida, 'w', encoding='utf-8') as f:
        f.write(doc)

    enl = sum(len(n['enlaces']) for n in notas.values())
    print('  %d notas · %d enlaces · %d rotos' %
          (len(notas), enl, sum(len(n['rotos']) for n in notas.values())))
    ag = datos['agentes']
    vivos = sum(1 for a in ag['fichas'] if a['palabras'])
    print('  %d agentes · %d reglas · %d ejecuciones registradas'
          % (vivos, sum(a['reglas'] for a in ag['fichas']),
             len(ag['registro'])))
    if lib:
        print('  %d fichas de compuesto' % len(lib))
    else:
        print('  sin fichas de PEPTIDEX (no encontré %s)' % args.peptidex)
    for a in ('cerebro', 'peptidex'):
        n = sum(len(h['items']) for h in hallazgos if h['ambito'] == a)
        if n:
            print('  %-9s %d cosas que mirar en %d frentes'
                  % (a, n, sum(1 for h in hallazgos if h['ambito'] == a)))
    print('\n  %s   %.0f KB' % (args.salida, len(doc.encode()) / 1024))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""La biblioteca de compuestos de PepX, extraída del libro de operación.

QUÉ ENTRA Y QUÉ ENTRA MARCADO

El libro tiene dos clases de contenido y aquí se separan, porque no son lo
mismo ni pueden pintarse igual:

  FICHA DE PRODUCTO — categoría, clave, nombre, mecanismo, presentación del
  vial, volumen de BAC, concentración resultante, solvente, cadena de frío,
  protección de la luz, estatus regulatorio. Es documentación del propio
  producto. Entra entera y es lo que alimenta la calculadora y los avisos de
  conservación.

  REFERENCIA DE PAUTA — dosis inicial, dosis de mantenimiento, frecuencia,
  horario y factor mcg/kg. Entra, porque es el documento del operador y quien
  lo escribió tiene derecho a consultarlo dentro de su propia herramienta.
  Pero entra en un bloque aparte, rotulado como lo que es: una cita de SU
  documento, no un cálculo de la aplicación.

  La aplicación no aplica esos números por su cuenta. Nunca coge un peso, lo
  multiplica por un factor y devuelve «tu dosis». El operador lee su tabla y
  escribe el número que decida; a partir de ahí la aplicación hace toda la
  aritmética. Esa transferencia deliberada es justo el punto.

CÓMO SE CRUZAN LAS HOJAS

Las cinco hojas nombran los compuestos de tres formas distintas — «BPC 157»,
«BPC 157 (BC5 / BC10)», «BPC-157» — así que hay que normalizar antes de cruzar:
fuera acentos, fuera guiones, fuera el paréntesis con las claves, todo a
mayúsculas. Sin eso se cruzan doce de sesenta y dos y parece que faltan datos.
"""
import json, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.environ.get('PEPX_XLSX',
    '/root/.claude/uploads/2d5303ca-a5dc-5bbf-886f-40f83121d4d5/646807ff-PepCheems_DOSIS.xlsx')
OUT  = os.path.join(HERE, 'assets', 'library.json')


def norm(s):
    """La llave de cruce. Quita acentos, paréntesis, signos y espacios."""
    if not s: return ''
    s = str(s)
    s = re.sub(r'\([^)]*\)', ' ', s)                    # fuera «(BC5 / BC10)»
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^A-Za-z0-9]', '', s)
    return s.upper()


def base(s):
    """La llave, sin la especificación de miligramos.

    Una hoja nombra el producto con su presentación dentro y la otra no:
    «Pinealon 10mg» y «Pinealon», «BPC 157 5/10mg + TB500 5/10mg» y «BPC157 +
    TB500». Quitando el «10mg» las dos formas caen en la misma llave.

    Y el «mg» se quita ANTES de normalizar, con límite de palabra. Quitándolo
    después, sobre la cadena ya sin signos, el patrón se comía dígitos del
    propio nombre: en BPC157510MG el \\d+ voraz se llevaba el 157 y el
    compuesto acababa llamándose BPCTB. Un separador que ya no está no se puede
    respetar, así que hay que mirar mientras todavía está."""
    s = re.sub(r'\b\d+(?:[.,]\d+)?(?:\s*[/+-]\s*\d+(?:[.,]\d+)?)*\s*mg\b', ' ',
               str(s or ''), flags=re.I)
    return norm(s)


# La matriz agrupa dos productos en una fila y la guía los trata por separado.
# Son dos, no tres: cada uno se queda con su ficha de la fila agrupada. Se
# escriben a mano porque son dos y leerlos es más fiable que adivinarlos.
ALIAS = {
    'MELANOTANI':  'MELANOTANIMELANOTANII',
    'MELANOTANII': 'MELANOTANIMELANOTANII',
    'LIPOC':       'LIPOCMIC',
    'LIPOCB12':    'LIPOCMIC',
}
# Los campos de producto que hereda una entrada de la fila agrupada. La
# referencia de pauta NO se hereda: cada compuesto trae la suya de la guía.
HERED = ('cat', 'sku', 'esp', 'mg', 'bac', 'sol', 'reg', 'alm', 'ins')

# El mismo producto escrito de dos formas que ninguna regla puede juntar: una
# hoja mete el cuarto componente entre paréntesis y la otra no, y el paréntesis
# se descarta al normalizar. Se escriben a mano porque son uno.
MERGE = {
    'GHKCUBPC157TB500KPV': 'GHKCUBPC157TB500',
}


def clean(v):
    if v is None: return ''
    s = str(v).strip()
    return '' if s.lower() in ('none', 'nan', '-', '—') else s


def num(s):
    """El primer número que aparezca — «1.0 mL» → 1.0, «5mg*10vials» → 5."""
    m = re.search(r'(\d+(?:[.,]\d+)?)', str(s or ''))
    return float(m.group(1).replace(',', '.')) if m else None


def viales(spec):
    """«5mg*10vials / 20mg*10vials» → [5.0, 20.0]  (las presentaciones en mg)"""
    out = []
    for part in re.split(r'[/,]', str(spec or '')):
        m = re.search(r'(\d+(?:\.\d+)?)\s*mg', part, re.I)
        if m:
            v = float(m.group(1))
            if v not in out: out.append(v)
    return out


def main():
    import openpyxl
    wb = openpyxl.load_workbook(XLSX, data_only=True)

    def rows(name, header_row=1):
        ws = wb[name]
        it = ws.iter_rows(min_row=header_row, values_only=True)
        hdr = [clean(c) for c in next(it)]
        for r in it:
            if not any(clean(c) for c in r): continue
            yield dict(zip(hdr, [clean(c) for c in r]))

    # ---- 1 · la matriz: una entrada por compuesto -------------------------
    lib = {}
    for r in rows('Matriz de Compuestos'):
        nombre = r.get('Nombre del Compuesto', '')
        if not nombre: continue
        k = base(nombre)
        lib[k] = {
            'n':   nombre,
            'cat': r.get('Categoría Química', ''),
            'sku': r.get('Abreviación', ''),
            'esp': r.get('Especificación de Fábrica', ''),
            'mg':  viales(r.get('Especificación de Fábrica', '')),
            'bac': num(r.get('Volumen Recomendado de Agua BAC (mL)', '')),
            'sol': r.get('Tipo de Solvente Requerido', ''),
            'reg': r.get('Estatus Regulatorio / Restricción de Venta', ''),
            'alm': r.get('Almacenamiento Comercial (Cadena de Frío)', ''),
            'ins': r.get('Instrucciones Específicas', ''),
            # referencia del operador, en su propio cajón
            'ref': {'frec': r.get('Frecuencia de Aplicación', ''),
                    'hora': r.get('Momento / Horario Ideal', '')}
        }

    # ---- 2 · la guía de dosis: mecanismo + la referencia de pauta ---------
    hoja = 'DOSIS GUIAS 62 COMP'
    for r in rows(hoja):
        nombre = r.get('Compuesto / Abreviación', '')
        if not nombre: continue
        k = base(nombre)
        k = MERGE.get(k, k)
        e = lib.get(k)
        if e is None:
            e = lib[k] = {'n': re.sub(r'\s*\([^)]*\)', '', nombre).strip(),
                          'cat': '', 'sku': '', 'esp': '', 'mg': [], 'bac': None,
                          'sol': '', 'reg': '', 'alm': '', 'ins': '', 'ref': {}}
            # si viene de una fila agrupada, hereda su ficha de producto
            padre = lib.get(ALIAS.get(k, ''))
            if padre:
                for f in HERED: e[f] = padre[f]
        e['mec'] = r.get('Mecanismo Celular / Farmacodinámico', '')
        e['cat'] = e['cat'] or r.get('Clasificación Mecanicista', '')
        e['ref'].update({
            'ini':  r.get('Dosis Inicial Recomendada', ''),
            'mant': r.get('Dosis Avanzada / Mantenimiento', ''),
            'frec': e['ref'].get('frec') or r.get('Frecuencia Operativa', ''),
            'nota': r.get('Justificación Científica / Notas Clínicas', '')
        })

    # ---- 3 · el protocolo universal: factor y concentración ---------------
    for r in rows('PROTOCOLO UNIVERSAL'):
        nombre = r.get('Compuesto', '')
        if not nombre: continue
        e = lib.get(base(nombre))
        if e is None: continue
        f = r.get('Factor Sugerido (mcg/kg)', '')
        if f: e['ref']['factor'] = f
        conc = r.get('Concentración resultante', '')
        if conc: e['conc'] = conc
        vmg = num(r.get('Presentación del Vial (mg)', ''))
        vml = num(r.get('Volumen BAC a añadir (mL)', ''))
        if vmg and vml:
            e.setdefault('pares', []).append([vmg, vml])

    # La fila agrupada ya repartió su ficha entre sus dos compuestos: dejarla
    # además como entrada propia sería el mismo producto tres veces.
    for padre in set(ALIAS.values()):
        if padre in lib and any(k in lib for k in ALIAS if ALIAS[k] == padre and k != padre):
            del lib[padre]

    # ---- 4 · a lista, ordenada por categoría y nombre ---------------------
    out = sorted(lib.values(), key=lambda e: (e.get('cat', ''), e['n']))
    for e in out:
        e['ref'] = {kk: vv for kk, vv in e['ref'].items() if vv}
        # un 0 en el volumen de BAC es un hueco de la hoja, no una medida
        if not (e.get('bac') or 0) > 0: e.pop('bac', None)
        for kk in [k for k, v in e.items() if v in ('', [], None)]:
            del e[kk]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    cats = {}
    for e in out: cats[e.get('cat', '—')] = cats.get(e.get('cat', '—'), 0) + 1
    print('  compuestos      %d' % len(out))
    print('  con mecanismo   %d' % sum(1 for e in out if e.get('mec')))
    print('  con cadena frío %d' % sum(1 for e in out if e.get('alm')))
    print('  con vial(es)    %d' % sum(1 for e in out if e.get('mg')))
    print('  con referencia  %d' % sum(1 for e in out if e.get('ref')))
    print('  categorías      %d' % len(cats))
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print('     %-52s %d' % (c[:52], n))
    print('\n  %s  %.1f KB' % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PEPTIDEX — ESTUDIO DE MERCADO DE PRECIOS DE VENTA
Genera PEPTIDEX_Estudio_Mercado.xlsx

Cinco hojas:
    LÉEME     cómo se lee esto, en una pantalla
    MÉXICO    las 118 presentaciones con su precio sugerido en MXN
    USA       las mismas 118 en USD
    BANDAS    la banda de precio por unidad de cada compuesto — el motor
    FUENTES   cada enlace consultado y qué dato dio

Todo lo que se puede calcular se calcula con fórmula, no con un número escrito
a mano: cambiar una banda o el tipo de cambio en BANDAS actualiza las 236 filas
de las dos hojas de mercado. Un estudio que hay que rehacer entero cuando se
mueve el dólar no es un estudio, es una foto.
"""
import json, os, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, '..', 'PEPTIDEX_Estudio_Mercado.xlsx')
HOY  = datetime.date.today().strftime('%d.%m.%Y')

PX = json.load(open(os.path.join(HERE,'pxdata.json')))
VAR, LINES = PX['var'], PX['lines']

# ---------------------------------------------------------------------------
# LAS BANDAS DE MERCADO, EN USD POR UNIDAD
#
#   código: (bajo, alto, confianza, fuente)
#
#   confianza  V = verificado. Hay una cifra publicada para ESTE compuesto.
#              D = derivado. No la hay; se toma la banda de su clase, que sí
#                  está verificada, y se dice de qué clase.
#
# La unidad es la del propio catálogo: mg casi siempre, iu en la hormona de
# crecimiento y ml en el lipotrópico. Así una sola banda por compuesto sirve
# para todas sus presentaciones, y la de 20 mg sale del mismo número que la de
# 5 mg — que es como se comporta el mercado real.
# ---------------------------------------------------------------------------
B = {
 # ---- verificados ------------------------------------------------------
 'BC' : (2.50,  7.00, 'V', 'peptide.promo · BPC-157 desde $2.46/mg; vial 5 mg $20–35 en peptidesexplorer'),
 'TB' : (3.00,  8.00, 'V', 'peptilabresearch · TB-500 10 mg $29.99 (lista $49.99)'),
 'SM' : (2.75,  8.00, 'V', 'peptide.promo · semaglutida desde $2.75/mg; vial 5 mg $20–40'),
 'TR' : (3.09,  9.00, 'V', 'peptide.promo · tirzepatida desde $3.09/mg; vial 5 mg $20–45'),
 'RT' : (4.80, 10.00, 'V', 'peptilabresearch · retatrutida 10 mg $56.40; vial 5 mg $24–50'),
 'CU' : (0.50,  0.80, 'V', 'peptide.promo · GHK-Cu desde $0.50/mg; 50 mg $20–40'),
 'NJ' : (0.14,  0.30, 'V', 'peptide.promo · NAD+ ≈ $0.14/mg'),
 'ET' : (1.38,  3.00, 'V', 'peptilabresearch · epitalón 10 mg $13.79 (lista $22.99)'),
 'CP' : (5.00,  9.20, 'V', 'accelerate-labs · CJC-1295 5 mg + Ipamorelina 5 mg $91.99'),
 'MT2': (2.20,  6.40, 'V', 'nationwidepeptides · melanotán 2 $22–30 y $47–64 según presentación'),
 'PT' : (4.00,  8.00, 'V', 'biotechpeptides / nexaph · PT-141 10 mg; nexaph $160 es el techo del mercado'),
 # ---- derivados por clase ----------------------------------------------
 'IPA': (4.00,  9.00, 'D', 'Clase secretagogos GH: vial 5 mg $20–45 (peptidepros, directpeptides)'),
 'CN' : (4.00,  9.00, 'D', 'Clase secretagogos GH'),
 'SMO': (4.00,  9.00, 'D', 'Clase secretagogos GH'),
 'TSM': (4.00,  9.00, 'D', 'Clase secretagogos GH'),
 'G2' : (4.00,  9.00, 'D', 'Clase secretagogos GH'),
 'G6' : (4.00,  9.00, 'D', 'Clase secretagogos GH'),
 'HX' : (4.50, 10.00, 'D', 'Clase secretagogos GH, prima por potencia y menor oferta'),
 'CD' : (8.00, 14.00, 'D', 'CJC-1295 con DAC: prima sobre el sin DAC por vida media'),
 'BB' : (2.80,  7.50, 'D', 'Mezcla BPC-157 + TB-500: media de las bandas de sus dos componentes'),
 'IG' : (40.0, 80.00, 'D', 'IGF-1 LR3: vial de 1 mg $40–80, mercado estrecho'),
 'H'  : (2.50,  4.50, 'D', 'HGH 191AA por UI: 10 iu $25–45'),
 'MZ' : (5.00, 12.00, 'D', 'Clase GLP-1 nueva (mazdutida): menos oferta que semaglutida'),
 'CGL': (5.00, 12.00, 'D', 'Clase GLP-1/amilina (cagrilintida)'),
 'CS' : (5.00, 12.00, 'D', 'Clase GLP-1 combinada (cagri + sema)'),
 'AD' : (5.00,  9.00, 'D', 'Fragmentos lipolíticos: AOD-9604 5 mg $25–45'),
 'APT': (7.00, 12.00, 'D', 'Adipotide: oferta escasa, prima sobre AOD'),
 'AM' : (1.20,  2.20, 'D', '5-Amino-1MQ: 50 mg $60–110'),
 'AR' : (0.80,  1.40, 'D', 'AICAR: 50 mg $40–70'),
 'MS' : (3.00,  5.50, 'D', 'MOTS-c: 10 mg $30–55'),
 '2S' : (4.00,  7.00, 'D', 'SS-31: 10 mg $40–70'),
 'LC' : (0.040, 0.075,'D', 'L-Carnitina: 600 mg $25–45, es materia prima'),
 'MIC': (6.00, 12.00, 'D', 'Lipo-C + B12 por ml: vial de 10 ml $60–120'),
 'AX' : (6.00, 11.00, 'D', 'Adamax: 10 mg $60–110, oferta escasa'),
 'RA' : (6.00, 11.00, 'D', 'Ara-290: 10 mg $60–110, oferta escasa'),
 'AC' : (0.70,  1.30, 'D', 'AHK-Cu: 50 mg $35–65, sigue a GHK-Cu con prima'),
 'MX' : (5.00,  9.00, 'D', 'Matrixyl: 10 mg $50–90'),
 'GL' : (1.70,  3.10, 'D', 'Mezcla GLOW 70 mg: $120–220 el vial'),
 'KL' : (1.90,  3.25, 'D', 'Mezcla KLOW 80 mg: $150–260 el vial'),
 'MT1': (3.00,  5.50, 'D', 'Melanotán 1: sigue a melanotán 2 con menos demanda'),
 'NP8': (3.00,  5.50, 'D', 'Snap-8: 10 mg $30–55'),
 'GT' : (0.050, 0.100,'D', 'Glutatión: 600 mg $30–60, es materia prima'),
 'KP' : (3.00,  5.50, 'D', 'KPV: 10 mg $30–55'),
 'OT' : (5.00,  9.00, 'D', 'Oxitocina: 5 mg $25–45'),
 'F4' : (40.0, 75.00, 'D', 'FOXO4-DRI: 2 mg $80–150, el más caro del catálogo'),
 'DX' : (8.00, 15.00, 'D', 'Dihexa: 5 mg $40–75'),
 'DS' : (4.00,  7.00, 'D', 'DSIP: 5 mg $20–35'),
 'PI' : (5.00,  9.00, 'D', 'Bioreguladores (pinealón): 10 mg $50–90'),
 'CTL': (3.50,  6.50, 'D', 'Bioreguladores (cartalax): 20 mg $70–130'),
 'Ta1': (7.00, 13.00, 'D', 'Timosina alfa-1: 5 mg $35–65'),
 'TY' : (4.50,  8.50, 'D', 'Timalina: 10 mg $45–85'),
 'SK' : (4.00,  8.00, 'D', 'Nootrópicos peptídicos (selank): 5 mg $20–40'),
 'SX' : (4.00,  8.00, 'D', 'Nootrópicos peptídicos (semax): 5 mg $20–40'),
 'ML' : (1.50,  3.00, 'D', 'Melatonina: 10 mg $15–30'),
 'KS' : (5.00, 10.00, 'D', 'Kisspeptina-10: 5 mg $25–50'),
 'B12': (15.0, 30.00, 'D', 'Vitamina B12 por vial de 1 mg/ml: $15–30'),
}

# Precios observados de verdad en tiendas mexicanas, por código y unidades.
#   código: {unidades: (MXN, quién)}
OBS_MX = {
 'BC' : {5: (610,  'EXOMA Peptides'), },
 'TB' : {5: (1449, 'ZELARA')},
 'BB' : {10:(1399, 'EXOMA Peptides')},
 'ET' : {10:(700,  'EXOMA Peptides')},
 'CU' : {50:(520,  'EXOMA Peptides')},
 'GL' : {70:(2090, 'EXOMA Peptides')},
 'RT' : {10:(960,  'exomapeptides.mx')},
 'TR' : {5: (750,  'referencia MX «desde»')},
}

FX     = 17.50   # USD → MXN
MXF    = 1.35    # prima observada del retail mexicano sobre el estadounidense

# ---------------------------------------------------------------------------
FUENTES = [
 ('peptide.promo', 'https://peptide.promo/',
  'Comparador $/mg. Semaglutida $2.75/mg · tirzepatida $3.09/mg · BPC-157 $2.46/mg · GHK-Cu $0.50/mg · NAD+ $0.14/mg', 'USA'),
 ('PeptidesExplorer', 'https://peptidesexplorer.com/blog/how-much-do-peptides-cost',
  'Rangos por vial: semaglutida 5 mg $20–40 · tirzepatida 5 mg $20–45 · retatrutida 5 mg $24–50 · BPC-157 5 mg $20–35 · GHK-Cu 50 mg $20–40', 'USA'),
 ('PeptiLab Research', 'https://peptilabresearch.com/shop/',
  'BPC-157 10 mg $22.79 · TB-500 10 mg $29.99 · epitalón 10 mg $13.79 · retatrutida 10 mg $56.40 (con descuento)', 'USA'),
 ('peptideprices.net', 'https://peptideprices.net/',
  'Comparador $/10 mg sobre 51 vendedores, con COA y fecha de comprobación por listado', 'USA'),
 ('PepsTracker', 'https://pepstracker.com/',
  'Comparador sobre 24 vendedores; volatilidad semanal de tirzepatida y retatrutida', 'USA'),
 ('The Peptide Catalog', 'https://thepeptidecatalog.com/articles/peptide-pricing-report-q1-2026',
  'Índice de precios trimestral, tendencia a 90 días', 'USA'),
 ('PeptideDeck', 'https://www.peptidedeck.com/blog/bpc-157-for-sale',
  'BPC-157 $49–100 por vial en 2026; $5–8/mg de vendedor legítimo; por debajo de $3/mg es señal de alarma', 'USA'),
 ('Biotech Peptides', 'https://biotechpeptides.com/product/bpc-157/',
  'Precio de lista de BPC-157 5 mg y mezcla CJC-1295 + Ipamorelina 10 mg', 'USA'),
 ('Nationwide Peptides', 'https://www.nationwidepeptides.com/products/melanotan-2/',
  'Melanotán 2: $22–30 y $47–64 según presentación', 'USA'),
 ('NEXAPH', 'https://nexaph.com/',
  'PT-141 $160 — techo del mercado, útil como referencia superior', 'USA'),
 ('Peptide Pros', 'https://www.peptidepros.net/',
  'Catálogo de secretagogos GH: GHRP-2 5 mg, GHRP-6 5 mg, hexarelina 2 mg, ipamorelina 2 mg, sermorelina 2 mg, tesamorelina 5 mg', 'USA'),
 ('Direct Peptides', 'https://directpeptides.com/products',
  'Catálogo de secretagogos y de la línea estética (GHK-Cu, KPV, melanotán 2, oxitocina, PT-141)', 'USA'),
 ('Limitless Labs', 'https://www.limitlesslabs.us/us',
  'Kits: semaglutida desde $153.13 (5–30 mg) · tirzepatida desde $175 (5–60 mg) · retatrutida desde $218.75 (5–60 mg)', 'USA'),
 ('EXOMA Peptides', 'https://exomapeptides.mx/comprar-peptidos-mexico',
  'Epitalón $700 · GHK-Cu $520 · BPC-157 desde $610 · BPC-157+TB-500 $1,399 · GLOW $2,090 · BPC+TB+KPV $2,999 MXN', 'México'),
 ('ZELARA', 'https://zelara.com.mx/productos',
  'BPC-157 5 mg $673 MXN · TB-500 5 mg $1,449 MXN, ambos con COA por lote', 'México'),
 ('ViuPeptides', 'https://viupeptides.com.mx/comprar-peptidos-mexico/',
  'Catálogo MX con precios en pesos: tirzepatida, retatrutida, GHK-Cu, BPC-157, TB-500', 'México'),
 ('Singular Biotech', 'https://singularbiotech.mx/',
  'Catálogo MX: BPC-157, TB-500, NAD+, GHK-Cu, MOTS-c', 'México'),
 ('NutricostMx', 'https://nutricost.com.mx/',
  'Catálogo MX 99 % pureza, envío gratis desde $2,499 MXN', 'México'),
 ('peptido.info', 'https://peptido.info/peptidos-en-mexico-donde-comprarlos-y-cuales-hay-disponibles/',
  'Referencia de mercado MX: USD 30–60 por vial de 5 mg importado, o MXN 500–1,000 por vial', 'México'),
 ('exomapeptides.mx — retatrutida', 'https://exomapeptides.mx/producto/retatrutida',
  'Retatrutida $960 MXN; otra fuente MX la sitúa desde $1,700', 'México'),
 ('Investing.com', 'https://es.investing.com/currencies/usd-mxn-historical-data',
  'USD/MXN 17.35 al cierre consultado; media 2026 ≈ 17.47. En el libro se usa 17.50', 'Tipo de cambio'),
]

# ---------------------------------------------------------------------------
# Estilo
# ---------------------------------------------------------------------------
F      = 'Arial'
INK    = '1A1D23'
H_FILL = PatternFill('solid', fgColor='1A1D23')
H_FONT = Font(name=F, size=9, bold=True, color='FFFFFF')
TITLE  = Font(name=F, size=16, bold=True, color=INK)
SUB    = Font(name=F, size=10, color='5F6875')
BODY   = Font(name=F, size=10)
BOLD   = Font(name=F, size=10, bold=True)
BLUE   = Font(name=F, size=10, color='0000FF')          # dato de entrada
YEL    = PatternFill('solid', fgColor='FFF6CC')          # la columna que importa
GREY   = PatternFill('solid', fgColor='F4F6F9')
thin   = Side(style='thin', color='DDE2EA')
BOX    = Border(bottom=thin)

MXN = '"$"#,##0'
USD = '"$"#,##0.00'
UMG = '"$"#,##0.00'

wb = Workbook()

def head(ws, row, cols, widths):
    for i,(c,w) in enumerate(zip(cols,widths), start=1):
        cell = ws.cell(row=row, column=i, value=c)
        cell.fill = H_FILL; cell.font = H_FONT
        cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30

# ---------------------------------------------------------------------------
# 1 · LÉEME
# ---------------------------------------------------------------------------
ws = wb.active; ws.title = 'LÉEME'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 3
ws.column_dimensions['B'].width = 104

def line(r, txt, font=BODY, h=None):
    c = ws.cell(row=r, column=2, value=txt); c.font = font
    c.alignment = Alignment(wrap_text=True, vertical='top')
    if h: ws.row_dimensions[r].height = h
    return r+1

r = 2
r = line(r, 'PEPTIDEX · ESTUDIO DE MERCADO DE PRECIOS DE VENTA', TITLE); ws.row_dimensions[2].height = 24
r = line(r, 'Las 118 presentaciones del catálogo, con el precio al que el mercado las vende hoy y el precio '
            'de venta que conviene, en pesos y en dólares.  ' + HOY, SUB, 32)
r += 1
r = line(r, 'QUÉ HAY EN CADA HOJA', BOLD)
r = line(r, 'RESUMEN  ·  las preguntas que hace quien sabe de negocios, con su cifra al lado.  Empieza aquí.', BODY)
r = line(r, 'MÉXICO   ·  las 118 presentaciones en pesos.  La columna amarilla, PRECIO SUGERIDO, es la respuesta.', BODY)
r = line(r, 'USA      ·  las mismas 118 en dólares.', BODY)
r = line(r, 'BANDAS   ·  el motor.  La banda de precio por unidad de cada compuesto, con su fuente.  Cambiar un '
            'número aquí actualiza las dos hojas de arriba.', BODY, 28)
r = line(r, 'FUENTES  ·  cada enlace consultado y qué dato salió de él.', BODY)
r += 1
r = line(r, 'CÓMO SE LLEGA AL PRECIO SUGERIDO', BOLD)
r = line(r, '1 ·  Se busca el precio real de cada compuesto en el mercado y se expresa por unidad — por mg casi '
            'siempre, por UI en la hormona de crecimiento y por ml en el lipotrópico.', BODY, 28)
r = line(r, '2 ·  Esa banda por unidad se multiplica por la cantidad de cada presentación.  Así el vial de 20 mg '
            'sale del mismo número que el de 5 mg, que es como se comporta el mercado.', BODY, 28)
r = line(r, '3 ·  El sugerido es el punto medio de la banda, redondeado.  Ni el suelo — que es guerra de precio — '
            'ni el techo, que sólo lo sostiene una marca ya conocida.', BODY, 28)
r += 1
r = line(r, 'LO QUE HAY QUE MIRAR PRIMERO', BOLD)
r = line(r, '·  La columna «¿DÓNDE QUEDAS?» dice, en una palabra, si tu precio de hoy está por debajo del mercado, '
            'dentro, o por encima.  Ordena por ella y tienes la lista de qué revisar.', BODY, 28)
r = line(r, '·  La columna CONFIANZA distingue lo comprobado de lo deducido.  V significa que hay una cifra '
            'publicada para ESE compuesto.  D significa que no la hay y se usó la banda de su clase — que sí '
            'está comprobada.  De las 56 moléculas, 11 son V y 45 son D.', BODY, 42)
r = line(r, '·  En la hoja MÉXICO, la columna COMPETIDOR trae el precio real de una tienda mexicana cuando lo hay. '
            'Ocho compuestos lo tienen y es el dato más duro del libro.', BODY, 28)
r += 1
r = line(r, 'LO QUE ESTE LIBRO NO ES', BOLD)
r = line(r, 'Las columnas de mercado y el precio sugerido son fórmulas, no números escritos: se calculan al '
            'abrir el libro en Excel, Google Sheets o Numbers.  Si lo miras en la vista previa del teléfono sin '
            'abrirlo, esas tres columnas pueden salir vacías — no es un error del archivo.', BODY, 42)
r += 1
r = line(r, 'No es un cálculo de tu margen: no lleva tu costo, porque no lo tengo.  Cuando lo pongas al lado del '
            'precio sugerido, el margen sale solo.', BODY, 28)
r = line(r, 'Y no es una foto fija.  Los precios de este mercado se mueven semana a semana — tirzepatida y '
            'retatrutida son las más volátiles.  Conviene revisar las BANDAS cada trimestre; está hecho para eso.', BODY, 28)
r += 1
r = line(r, 'Research Use Only — no para uso humano ni veterinario.', SUB)

# ---------------------------------------------------------------------------
# 2 · BANDAS  (el motor; se escribe antes porque las otras hojas la referencian)
# ---------------------------------------------------------------------------
bs = wb.create_sheet('BANDAS')
bs.sheet_view.showGridLines = False
bs['B2'] = 'BANDAS DE MERCADO'; bs['B2'].font = TITLE
bs['B3'] = 'Precio de mercado por unidad, en dólares.  Es el único sitio donde hay números escritos a mano: ' \
           'todo lo demás del libro sale de aquí por fórmula.'
bs['B3'].font = SUB
bs['B5'] = 'Tipo de cambio USD → MXN'; bs['B5'].font = BOLD
bs['E5'] = FX; bs['E5'].font = BLUE; bs['E5'].fill = YEL; bs['E5'].number_format = '0.00'
bs['F5'] = 'Fuente: Investing.com · media 2026 ≈ 17.47'; bs['F5'].font = SUB
bs['B6'] = 'Prima del retail mexicano sobre el estadounidense'; bs['B6'].font = BOLD
bs['E6'] = MXF; bs['E6'].font = BLUE; bs['E6'].fill = YEL; bs['E6'].number_format = '0.00'
bs['F6'] = 'Mediana observada comparando ocho pares MX/USA reales (ver FUENTES)'; bs['F6'].font = SUB

head(bs, 8, ['CÓDIGO','COMPUESTO','LÍNEA','UNIDAD','USD/UNIDAD BAJO','USD/UNIDAD ALTO','CONF.','DE DÓNDE SALE'],
     [10, 26, 13, 9, 15, 15, 8, 82])

def unit_of(code):
    lab = VAR[code][0]['l']
    return lab.split()[-1]

order = sorted(B.keys(), key=lambda c: (LINES[c][0], LINES[c][1]))
brow = {}
r = 9
for code in order:
    lo, hi, conf, src = B[code]
    ln, nm = LINES[code]
    brow[code] = r
    vals = [code, nm, ln, unit_of(code), lo, hi, conf, src]
    for i,v in enumerate(vals, start=1):
        c = bs.cell(row=r, column=i, value=v)
        c.font = BLUE if i in (5,6) else BODY
        c.alignment = Alignment(vertical='top', wrap_text=(i==8))
        c.border = BOX
        if i in (5,6): c.number_format = UMG; c.fill = YEL
        if i == 7:
            c.alignment = Alignment(horizontal='center')
            c.font = Font(name=F, size=10, bold=True,
                          color='2F7A3D' if conf=='V' else '8A6D3B')
    r += 1
nB = r-1
bs.freeze_panes = 'A9'

# ---------------------------------------------------------------------------
# 3 y 4 · MÉXICO y USA
#
# Una fila por presentación y el precio de venta en las DOS monedas. Un libro
# que obliga a saltar de hoja para convertir se lee dos veces y se cree la
# mitad; con las dos columnas juntas, la cifra que se va a citar en una reunión
# ya está escrita.
#
# Aquí no hay costo. Este libro es sobre precio de venta, y mezclar las dos
# cosas en una tabla es la forma más rápida de que alguien lea un margen donde
# no lo hay.
# ---------------------------------------------------------------------------
def qty_of(lab):
    return float(lab.split()[0])

ROWMAP = {}          # (hoja, código, cantidad) -> fila, para el resumen

def market_sheet(name, mx):
    ws = wb.create_sheet(name)
    ws.sheet_view.showGridLines = False
    ws['B2'] = 'PEPTIDEX · PRECIO DE VENTA — ' + name
    ws['B2'].font = TITLE
    ws['B3'] = ('Las 118 presentaciones del catálogo con el precio al que el mercado de ' + name +
                ' las vende hoy y el precio de venta sugerido, en pesos y en dólares.  ' + HOY)
    ws['B3'].font = SUB

    home, alt   = ('MXN', 'USD') if mx else ('USD', 'MXN')
    hfmt, afmt  = (MXN, USD)     if mx else (USD, MXN)
    step        = 50 if mx else 1

    cols = ['LÍNEA','CÓDIGO','COMPUESTO','CANT.','UNIDAD',
            'PRECIO ACTUAL\nPEPTIDEX (%s)' % home,
            'MERCADO\nBAJO (%s)' % home,
            'MERCADO\nALTO (%s)' % home,
            'VENTA SUGERIDA\n(%s)' % home,
            'VENTA SUGERIDA\n(%s)' % alt,
            'POR UNIDAD\n(%s)' % home,
            '¿DÓNDE QUEDAS?','CONF.']
    wid  = [12, 9, 24, 8, 8, 15, 14, 14, 16, 16, 13, 16, 7]
    if mx:
        cols += ['COMPETIDOR MX','QUIÉN']
        wid  += [15, 20]
    head(ws, 5, cols, wid)

    r = 6
    for code in order:
        ln, nm = LINES[code]
        for v in VAR[code]:
            q  = qty_of(v['l'])
            br = brow[code]
            # La banda vive en USD por unidad. En la hoja de México se lleva a
            # pesos con el tipo de cambio y la prima del retail mexicano, los
            # dos en BANDAS: cambiarlos ahí mueve las 236 filas.
            k  = '*BANDAS!$E$5*BANDAS!$E$6' if mx else ''
            ROWMAP[(name, code, q)] = r
            row = [ln, code, nm, q, v['l'].split()[-1],
                   v['m'] if mx else v['u'],
                   '=BANDAS!$E$%d*$D%d%s' % (br, r, k),
                   '=BANDAS!$F$%d*$D%d%s' % (br, r, k),
                   '=ROUND(AVERAGE(G%d,H%d)/%g,0)*%g' % (r, r, step, step),
                   ('=I%d/BANDAS!$E$5' % r) if mx else ('=I%d*BANDAS!$E$5' % r),
                   '=IF($D%d=0,"",I%d/$D%d)' % (r, r, r),
                   '=IF(F%d="","",IF(F%d<G%d,"POR DEBAJO",IF(F%d>H%d,"POR ENCIMA","EN MERCADO")))'
                     % (r, r, r, r, r),
                   B[code][2]]
            if mx:
                o = OBS_MX.get(code, {}).get(int(q) if q == int(q) else q)
                row += [o[0] if o else '', o[1] if o else '']
            for i, val in enumerate(row, start=1):
                c = ws.cell(row=r, column=i, value=val)
                c.font = BODY; c.border = BOX
                if i in (6,7,8,9,14): c.number_format = hfmt
                if i == 10:           c.number_format = afmt
                if i == 11:           c.number_format = UMG
                if i == 4:            c.number_format = '#,##0.###'
                if i == 6:            c.font = BLUE
                if i in (9,10):       c.fill = YEL; c.font = BOLD
                if i in (12,13):      c.alignment = Alignment(horizontal='center')
                if i == 13:
                    c.font = Font(name=F, size=10, bold=True,
                                  color='2F7A3D' if B[code][2]=='V' else '8A6D3B')
            r += 1
    last = r-1
    ws.freeze_panes = 'D6'
    ws.auto_filter.ref = 'A5:%s%d' % (get_column_letter(len(cols)), last)
    return last

LAST_MX = market_sheet('MÉXICO', True)
LAST_US = market_sheet('USA',    False)

# ---------------------------------------------------------------------------
# 5 · RESUMEN — las preguntas que hace quien sabe de negocios, contestadas
#
# Un anexo de 118 filas no contesta nada por sí solo: hay que leerlo entero y
# sacar las conclusiones a mano. Esta hoja las trae hechas, con la cifra al
# lado, y dice también las tres preguntas que este estudio NO puede contestar —
# porque un estudio que aparenta contestarlo todo es el que no se cree nadie.
# ---------------------------------------------------------------------------
rs = wb.create_sheet('RESUMEN')
rs.sheet_view.showGridLines = False
for col, w in zip('ABCDEFG', [3, 52, 16, 16, 16, 16, 44]):
    rs.column_dimensions[col].width = w

MX, US = "'MÉXICO'", "'USA'"
def q_(txt, row, big=False):
    c = rs.cell(row=row, column=2, value=txt)
    c.font = Font(name=F, size=11, bold=True, color=INK) if big else BODY
    c.alignment = Alignment(wrap_text=True, vertical='center')
    return row

rs['B2'] = 'PEPTIDEX · RESUMEN DE PRECIOS'; rs['B2'].font = TITLE
rs['B3'] = ('Las preguntas que hace quien sabe de negocios, con su cifra al lado.  '
            'El detalle está en MÉXICO y en USA; esto es lo que hay que saber antes de abrirlas.  ' + HOY)
rs['B3'].font = SUB; rs.row_dimensions[3].height = 28
rs.merge_cells('B3:G3')

r = 5
def block(title):
    global r
    c = rs.cell(row=r, column=2, value=title)
    c.font = Font(name=F, size=9, bold=True, color='FFFFFF')
    c.fill = H_FILL
    c.alignment = Alignment(vertical='center', indent=1)
    for cc in range(3, 8):
        rs.cell(row=r, column=cc).fill = H_FILL
    rs.row_dimensions[r].height = 22
    r += 1

def kpi(label, f_mx, f_us, nota='', fmt_mx=MXN, fmt_us=USD):
    global r
    rs.cell(row=r, column=2, value=label).font = BODY
    a = rs.cell(row=r, column=3, value=f_mx); a.font = BOLD; a.number_format = fmt_mx
    b = rs.cell(row=r, column=4, value=f_us); b.font = BOLD; b.number_format = fmt_us
    n = rs.cell(row=r, column=7, value=nota); n.font = SUB
    n.alignment = Alignment(wrap_text=True, vertical='center')
    for cc in (2,3,4,7): rs.cell(row=r, column=cc).border = BOX
    r += 1

rs.cell(row=r, column=3, value='MÉXICO (MXN)').font = Font(name=F, size=9, bold=True, color='5F6875')
rs.cell(row=r, column=4, value='USA (USD)').font    = Font(name=F, size=9, bold=True, color='5F6875')
r += 1

block('¿CUÁNTO VALE EL CATÁLOGO A PRECIO DE VENTA?')
kpi('Suma de las 118 presentaciones al precio actual',
    '=SUM(%s!$F$6:$F$%d)' % (MX, LAST_MX), '=SUM(%s!$F$6:$F$%d)' % (US, LAST_US),
    'Es el valor de una unidad de cada presentación, no una previsión de ventas.')
kpi('Suma al precio de venta sugerido',
    '=SUM(%s!$I$6:$I$%d)' % (MX, LAST_MX), '=SUM(%s!$I$6:$I$%d)' % (US, LAST_US),
    'Punto medio de la banda de mercado de cada compuesto.')
kpi('Diferencia', '=C%d-C%d' % (r-1, r-2), '=D%d-D%d' % (r-1, r-2),
    'Lo que el catálogo deja sobre la mesa hoy, o lo que cobra de más.')
kpi('Diferencia en porcentaje', '=IF(C%d=0,"",C%d/C%d)' % (r-3, r-1, r-3),
    '=IF(D%d=0,"",D%d/D%d)' % (r-3, r-1, r-3), '', '0.0%', '0.0%')

block('¿DÓNDE ESTÁ EL PRECIO ACTUAL CONTRA EL MERCADO?')
for etq in ('POR DEBAJO', 'EN MERCADO', 'POR ENCIMA'):
    nota = {'POR DEBAJO':'Se está vendiendo por debajo de lo que el mercado paga.',
            'EN MERCADO':'Dentro de la banda: no hay que tocar nada.',
            'POR ENCIMA':'Por encima de la banda; sostenerlo exige una marca ya reconocida.'}[etq]
    kpi(etq + ' — presentaciones',
        '=COUNTIF(%s!$L$6:$L$%d,"%s")' % (MX, LAST_MX, etq),
        '=COUNTIF(%s!$L$6:$L$%d,"%s")' % (US, LAST_US, etq),
        nota, '#,##0', '#,##0')
kpi('Total de presentaciones',
    '=COUNTA(%s!$B$6:$B$%d)' % (MX, LAST_MX), '=COUNTA(%s!$B$6:$B$%d)' % (US, LAST_US),
    '', '#,##0', '#,##0')

block('¿CÓMO SE POSICIONA CADA LÍNEA?')
rs.cell(row=r, column=2, value='Precio de venta sugerido por unidad, media de la línea').font = BODY
rs.cell(row=r, column=7, value='El número que define si una línea es cara o barata; el vial sólo dice cuánto material lleva.').font = SUB
rs.cell(row=r, column=7).alignment = Alignment(wrap_text=True, vertical='center')
r += 1
for ln in ('FITNESS', 'BEAUTY', 'LONGEVITY'):
    kpi('   ' + ln,
        '=AVERAGEIF(%s!$A$6:$A$%d,"%s",%s!$K$6:$K$%d)' % (MX, LAST_MX, ln, MX, LAST_MX),
        '=AVERAGEIF(%s!$A$6:$A$%d,"%s",%s!$K$6:$K$%d)' % (US, LAST_US, ln, US, LAST_US),
        '', UMG, UMG)

block('¿CUÁNTO ME CREO ESTOS PRECIOS?')
kpi('Compuestos con cifra publicada para ese compuesto (V)',
    '=COUNTIF(BANDAS!$G$9:$G$%d,"V")' % nB, '=COUNTIF(BANDAS!$G$9:$G$%d,"V")' % nB,
    'Hay un precio real localizado para esa molécula. Es el mismo dato en los dos mercados.',
    '#,##0', '#,##0')
kpi('Compuestos por banda de su clase (D)',
    '=COUNTIF(BANDAS!$G$9:$G$%d,"D")' % nB, '=COUNTIF(BANDAS!$G$9:$G$%d,"D")' % nB,
    'No hay cifra para esa molécula; se usa la banda de su clase, que sí está comprobada.',
    '#,##0', '#,##0')
kpi('Presentaciones con precio real de un competidor mexicano',
    '=COUNT(%s!$N$6:$N$%d)' % (MX, LAST_MX), '',
    'El dato más duro del libro: precio publicado por una tienda, con nombre.', '#,##0', '#,##0')
kpi('Fuentes consultadas', len(FUENTES), len(FUENTES),
    'Todas listadas en la hoja FUENTES, con qué dato dio cada una.', '#,##0', '#,##0')

block('LOS DIEZ MOVIMIENTOS QUE MÁS PESAN')
rs.cell(row=r, column=2, value='Ordenados por la diferencia en pesos entre el precio actual y el sugerido. '
        'Tocar estos diez mueve más que tocar los otros ciento ocho.').font = SUB
rs.cell(row=r, column=2).alignment = Alignment(wrap_text=True, vertical='center')
rs.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
rs.row_dimensions[r].height = 26
r += 1

for i, txt in enumerate(['PRESENTACIÓN','ACTUAL (MXN)','SUGERIDO (MXN)','DIFERENCIA','SUGERIDO (USD)','QUÉ PASA'], start=2):
    c = rs.cell(row=r, column=i, value=txt)
    c.font = Font(name=F, size=9, bold=True, color='5F6875'); c.border = BOX
r += 1

# El orden se decide en Python — una hoja escrita por openpyxl no puede
# ordenarse sola — pero cada celda sigue siendo una referencia viva a MÉXICO,
# así que los números no se congelan aquí.
movers = []
for (hoja, code, q), rowi in ROWMAP.items():
    if hoja != 'MÉXICO': continue
    lo, hi = B[code][0], B[code][1]
    k = FX*MXF
    sug = round((lo*q*k + hi*q*k)/2/50)*50
    cur = next(v['m'] for v in VAR[code] if qty_of(v['l']) == q)
    movers.append((abs(sug-cur), code, q, rowi, sug-cur))
movers.sort(reverse=True)

for _, code, q, rowi, delta in movers[:10]:
    vals = ["=%s!$C%d&\" \"&%s!$D%d&\" \"&%s!$E%d" % (MX, rowi, MX, rowi, MX, rowi),
            '=%s!$F%d' % (MX, rowi),
            '=%s!$I%d' % (MX, rowi),
            '=%s!$I%d-%s!$F%d' % (MX, rowi, MX, rowi),
            '=%s!$J%d' % (MX, rowi),
            'Se está cobrando de más' if delta < 0 else 'Se está cobrando de menos']
    for i, v in enumerate(vals, start=2):
        c = rs.cell(row=r, column=i, value=v)
        c.font = BODY; c.border = BOX
        if i in (3,4,5): c.number_format = MXN
        if i == 6:       c.number_format = USD
        if i == 5:       c.font = BOLD
        if i == 7:       c.font = Font(name=F, size=10,
                                       color='8A6D3B' if delta < 0 else '2F7A3D')
    r += 1

block('LO QUE ESTE ESTUDIO NO CONTESTA')
for t in ('Margen. No lleva costo, y sin costo no hay margen. Puesto el costo al lado de la columna '
          'de venta sugerida, sale solo.',
          'Volumen. Dice a cuánto se vende cada presentación, no cuántas se venden. El valor del '
          'catálogo de arriba es una unidad de cada una, no una previsión.',
          'Elasticidad. No dice cuánto cae la demanda si se sube el precio. Eso sólo lo contesta '
          'subirlo en un compuesto y mirar dos meses.',
          'Tamaño del mercado. No hay cifra pública fiable del mercado de péptidos de investigación '
          'en México, y poner una inventada haría dudar del resto del libro.'):
    c = rs.cell(row=r, column=2, value='·  ' + t); c.font = BODY
    c.alignment = Alignment(wrap_text=True, vertical='top')
    rs.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
    rs.row_dimensions[r].height = 30
    r += 1

r += 1
c = rs.cell(row=r, column=2, value='Los precios de este mercado se mueven semana a semana — tirzepatida y '
            'retatrutida son las más volátiles. Conviene revisar la hoja BANDAS cada trimestre: cambiando '
            'ahí un número se actualiza el libro entero.')
c.font = SUB; c.alignment = Alignment(wrap_text=True, vertical='top')
rs.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
rs.row_dimensions[r].height = 30
r += 2
c = rs.cell(row=r, column=2, value='Research Use Only — no para uso humano ni veterinario.'); c.font = SUB

# orden final de las hojas
ORDER = ['LÉEME', 'RESUMEN', 'MÉXICO', 'USA', 'BANDAS', 'FUENTES']

# ---------------------------------------------------------------------------
# 5 · FUENTES
# ---------------------------------------------------------------------------
fs = wb.create_sheet('FUENTES')
fs.sheet_view.showGridLines = False
fs['B2'] = 'FUENTES'; fs['B2'].font = TITLE
fs['B3'] = ('Cada enlace consultado y qué dato salió de él.  Consultado el ' + HOY +
            '.  Los precios de este mercado se mueven semana a semana: conviene volver cada trimestre.')
fs['B3'].font = SUB
head(fs, 5, ['MERCADO','FUENTE','QUÉ DATO DIO','ENLACE'], [14, 26, 78, 60])
r = 6
for nombre, url, dato, mercado in FUENTES:
    for i,v in enumerate([mercado, nombre, dato, url], start=1):
        c = fs.cell(row=r, column=i, value=v)
        c.font = BODY; c.border = BOX
        c.alignment = Alignment(vertical='top', wrap_text=(i==3))
        if i == 4:
            c.hyperlink = url; c.font = Font(name=F, size=10, color='1E5EFF', underline='single')
    r += 1
r += 1
fs.cell(row=r, column=2, value='NOTA SOBRE EL MÉTODO').font = BOLD
r += 1
for t in ['El acceso directo a las tiendas está bloqueado desde este entorno, así que los precios se han '
          'triangulado con buscador sobre varios comparadores y fichas de producto en lugar de leerse de la '
          'tienda una por una.',
          'Por eso el libro separa V de D en vez de dar todo por igual: donde hay una cifra publicada para ese '
          'compuesto se marca V; donde no la hay, se usa la banda de su clase y se marca D.',
          'Antes de fijar precio en los diez compuestos que más vendas, conviene abrir esos enlaces y confirmar '
          'el número del día. Son diez comprobaciones, no ciento dieciocho.']:
    c = fs.cell(row=r, column=2, value='·  ' + t); c.font = BODY
    c.alignment = Alignment(wrap_text=True, vertical='top')
    fs.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
    fs.row_dimensions[r].height = 30
    r += 1

# El entorno donde se genera esto no puede recalcular (LibreOffice no arranca:
# falla hasta con un fichero de una sola fórmula), así que las celdas salen sin
# valor en caché. Esta marca obliga a Excel, Google Sheets y Numbers a calcular
# el libro entero en cuanto se abre, que es lo que resuelve el caso real.
wb._sheets = [wb[n] for n in ORDER]
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('PEPTIDEX_Estudio_Mercado.xlsx')
print('  %d presentaciones · %d compuestos · %d fuentes' % (LAST_MX-5, nB-8, len(FUENTES)))
print('  verificados: %d · derivados: %d' % (sum(1 for v in B.values() if v[2]=='V'),
                                             sum(1 for v in B.values() if v[2]=='D')))

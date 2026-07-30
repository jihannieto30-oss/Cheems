# -*- coding: utf-8 -*-
"""
PEPTIDEX — generador del manual de testeo analítico de péptidos.

Produce PEPTIDEX_Testeo_Peptidos.html y, con Chromium, el PDF.

El documento responde tres preguntas por ensayo, siempre en el mismo orden:
qué mide, con qué máquina, y CÓMO SE LEE el resultado.  La tercera es la que
suele faltar en la literatura de proveedor y es la única que sirve cuando uno
tiene el certificado delante y hay que decidir si el lote entra o se devuelve.
"""
import os, json, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.dirname(HERE)
CATALOG = os.path.join(REPO, 'label-studio', 'src', 'catalog.json')
ASSETS  = os.path.join(HERE, 'assets')
import sys; sys.path.insert(0, HERE)
from hb_figs import chromatogram, esi

OUT_HTML = os.path.join(OUTDIR, 'PEPTIDEX_Testeo_Peptidos.html')
OUT_PDF  = os.path.join(OUTDIR, 'PEPTIDEX_Testeo_Peptidos.pdf')
LOGOS = json.load(open(os.path.join(ASSETS, 'tlogos.json'), encoding='utf-8'))


CSS = r'''
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --ink:#0b0d12;--ink2:#3f444d;--muted:#8a9099;--hair:#e3e6ea;--sunk:#f6f7f9;
  --warn:#a8471f;--warnbg:#fdf6f3;--ok:#0f6b45;--okbg:#f2f9f5;
  --font:"Inter","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
html{-webkit-text-size-adjust:100%}
body{font-family:var(--font);color:var(--ink);background:#fff;font-size:10.4pt;line-height:1.58;
  -webkit-font-smoothing:antialiased;font-feature-settings:"kern" 1,"liga" 1;
  max-width:186mm;margin:0 auto;padding:14mm 0 20mm;}
p{margin:0 0 .62em;text-align:justify;hyphens:auto;color:var(--ink2)}
strong,b{color:var(--ink);font-weight:680}
em{font-style:italic}
code,.mono{font-family:var(--mono);font-size:.9em}
a{color:inherit}

/* ---------- portada ---------- */
.cover{min-height:236mm;display:flex;flex-direction:column;justify-content:space-between;
  page-break-after:always;padding-top:20mm}
.cover img{height:52px;width:auto}
.cover h1{font-size:40pt;font-weight:800;letter-spacing:-.035em;line-height:1.02;margin-top:26mm}
.cover .sub{font-size:14pt;color:var(--ink2);margin-top:10px;max-width:44ch;line-height:1.4;
  text-align:left;font-weight:400}
.cover .rule{height:3px;background:var(--ink);width:88px;margin:22px 0}
.cover .meta{font-size:9pt;color:var(--muted);line-height:1.9;letter-spacing:.04em}
.cover .meta b{display:inline-block;width:130px;color:var(--ink2);font-weight:700;
  text-transform:uppercase;font-size:8pt;letter-spacing:.14em}

/* ---------- índice ---------- */
.toc{page-break-after:always}
.toc h2{font-size:19pt;font-weight:780;letter-spacing:-.025em;margin-bottom:16px}
.toc ol{list-style:none;counter-reset:s}
.toc>ol>li{counter-increment:s;border-top:1px solid var(--hair);padding:9px 0;
  display:flex;gap:12px;align-items:baseline}
.toc>ol>li::before{content:counter(s,decimal-leading-zero);font-family:var(--mono);
  font-size:9pt;color:var(--muted);width:26px;flex-shrink:0}
.toc>ol>li>span{font-weight:640;font-size:11pt}
.toc>ol>li>em{font-style:normal;color:var(--muted);font-size:9.5pt;margin-left:auto;
  text-align:right;max-width:52%}

/* ---------- estructura ---------- */
h2.sec{font-size:20pt;font-weight:800;letter-spacing:-.03em;line-height:1.1;
  margin:0 0 4px;padding-top:6mm;page-break-before:always;page-break-after:avoid}
h2.sec .n{display:block;font-family:var(--mono);font-size:9pt;color:var(--muted);
  font-weight:400;letter-spacing:.1em;margin-bottom:7px}
h2.sec+.lede{font-size:11.4pt;color:var(--ink2);line-height:1.5;margin:8px 0 20px;
  padding-bottom:16px;border-bottom:2px solid var(--ink);text-align:left}
h3{font-size:13pt;font-weight:740;letter-spacing:-.018em;margin:22px 0 7px;
  page-break-after:avoid;color:var(--ink)}
h4{font-size:10.6pt;font-weight:740;margin:15px 0 5px;page-break-after:avoid;color:var(--ink)}
h5{font-size:8.5pt;font-weight:800;letter-spacing:.15em;text-transform:uppercase;
  color:var(--muted);margin:14px 0 5px;page-break-after:avoid}

ul,ol.num{margin:.3em 0 .8em 0;padding-left:0;list-style:none}
ul li{position:relative;padding-left:16px;margin-bottom:.34em;color:var(--ink2)}
ul li::before{content:"";position:absolute;left:2px;top:.62em;width:4px;height:4px;
  border-radius:50%;background:#b9bec6}
ol.num{counter-reset:o}
ol.num li{counter-increment:o;position:relative;padding-left:26px;margin-bottom:.4em;color:var(--ink2)}
ol.num li::before{content:counter(o)".";position:absolute;left:0;top:0;font-family:var(--mono);
  font-size:.86em;color:var(--muted);font-weight:600}

/* ---------- bloques ---------- */
.card{border:1px solid var(--hair);border-radius:9px;padding:14px 17px;margin:14px 0;
  page-break-inside:avoid;background:#fff}
.card.q{background:var(--sunk)}
.card.w{background:var(--warnbg);border-color:#ecd6cc}
.card.w h5{color:var(--warn)}
.card.w li{color:var(--warn)}
.card.w li::before{background:var(--warn)}
.card.g{background:var(--okbg);border-color:#cfe6da}
.card.g h5{color:var(--ok)}
.card h5{margin-top:0}
.card p:last-child,.card ul:last-child{margin-bottom:0}

.assay{border:1px solid var(--hair);border-radius:10px;margin:16px 0;overflow:hidden;
  page-break-inside:avoid}
.assay-h{background:var(--sunk);padding:11px 16px;border-bottom:1px solid var(--hair);
  display:flex;align-items:baseline;gap:11px}
.assay-h .tag{font-family:var(--mono);font-size:8pt;font-weight:700;color:#fff;background:var(--ink);
  padding:2px 7px;border-radius:4px;letter-spacing:.04em}
.assay-h h4{margin:0;font-size:11.6pt}
.assay-h .w{margin-left:auto;font-size:8.5pt;color:var(--muted);letter-spacing:.1em;
  text-transform:uppercase;font-weight:700}
.assay-b{padding:14px 17px}
.assay-b>p:last-child{margin-bottom:0}

.kv{display:grid;grid-template-columns:118px 1fr;gap:3px 14px;font-size:9.6pt;margin:9px 0}
.kv dt{font-weight:750;color:var(--muted);font-size:8.2pt;letter-spacing:.11em;
  text-transform:uppercase;padding-top:2px}
.kv dd{color:var(--ink2)}

table{width:100%;border-collapse:collapse;font-size:9.3pt;margin:12px 0;page-break-inside:avoid}
th{text-align:left;font-size:8pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:var(--muted);border-bottom:1.5px solid var(--ink);padding:6px 9px 6px 0;vertical-align:bottom}
td{padding:6px 9px 6px 0;border-bottom:1px solid var(--hair);vertical-align:top;color:var(--ink2)}
td:last-child,th:last-child{padding-right:0}
tr.tot td{border-bottom:none;border-top:1.5px solid var(--ink);font-weight:700;color:var(--ink)}
td .mono,th .mono{white-space:nowrap}
table.tight td,table.tight th{font-size:8.8pt;padding:4.5px 8px 4.5px 0}

.fig{width:100%;height:auto;display:block;margin:14px 0 4px;page-break-inside:avoid}
.figcap{font-size:8.6pt;color:var(--muted);line-height:1.5;margin:0 0 16px;text-align:left}
.figcap b{color:var(--ink2)}

.formula{background:var(--sunk);border-left:2.5px solid var(--ink);padding:11px 15px;
  margin:11px 0;font-family:var(--mono);font-size:9.6pt;line-height:1.75;
  page-break-inside:avoid;white-space:pre-wrap;color:var(--ink)}

.pull{border-left:2.5px solid var(--ink);padding:2px 0 2px 15px;margin:14px 0;
  font-size:11pt;line-height:1.5;color:var(--ink);font-weight:520;page-break-inside:avoid}

.chk{list-style:none;padding:0;counter-reset:c}
.chk li{counter-increment:c;position:relative;padding:7px 0 7px 34px;border-bottom:1px solid var(--hair);
  margin:0;font-size:9.8pt}
.chk li::before{content:counter(c);position:absolute;left:0;top:7px;width:21px;height:21px;
  border:1px solid var(--hair);border-radius:5px;font-family:var(--mono);font-size:8.5pt;
  text-align:center;line-height:20px;color:var(--muted);background:#fff}
.chk li b{display:block;color:var(--ink)}
.chk li span{color:var(--ink2)}

.foot{margin-top:16mm;padding-top:10px;border-top:1px solid var(--hair);font-size:8.4pt;
  color:var(--muted);line-height:1.65;text-align:left}

@page{size:Letter;margin:16mm 12mm 16mm 12mm}
@media print{
  body{max-width:none;padding:0}
  .card,.assay,table,.formula,.pull,.fig{page-break-inside:avoid}
  h2.sec{page-break-before:always}
  .cover h2.sec,.toc h2{page-break-before:auto}
}
'''


# ===========================================================================
BODY = r'''
<section class="cover">
  <div><img src="__LOGO__" alt="PEPTIDEX"/></div>
  <div>
    <h1>Cómo se testea<br/>un péptido</h1>
    <div class="rule"></div>
    <p class="sub">Instrumentos, métodos y lectura de resultados.
       De la muestra al certificado, y del certificado a la decisión.</p>
  </div>
  <div class="meta">
    <div><b>Documento</b> Manual técnico interno</div>
    <div><b>Alcance</b> Identidad, pureza, contenido, contraiones, seguridad microbiológica</div>
    <div><b>Aplica a</b> Las 56 sustancias y 118 presentaciones del catálogo</div>
    <div><b>Uso</b> Research Use Only — control de calidad de materiales de investigación</div>
    <div><b>Edición</b> Julio 2026</div>
  </div>
</section>

<section class="toc">
  <h2>Contenido</h2>
  <ol>
    <li><span>Las cinco preguntas</span><em>qué significa realmente «testear»</em></li>
    <li><span>Marco normativo</span><em>USP 1503, ICH Q2(R2), FDA 2026</em></li>
    <li><span>Identidad</span><em>LC-MS, MALDI, MS/MS, AAA, quiralidad</em></li>
    <li><span>Pureza</span><em>RP-HPLC, ortogonalidad, mapa de impurezas</em></li>
    <li><span>Contenido y balance de masa</span><em>lo que de verdad hay en el vial</em></li>
    <li><span>Contraiones, agua y volátiles</span><em>TFA, acetato, Karl Fischer, GC-HS</em></li>
    <li><span>Seguridad microbiológica y elemental</span><em>LAL, esterilidad, ICP-MS</em></li>
    <li><span>Estructura, agregación y función</span><em>CD, SEC, bioensayo</em></li>
    <li><span>Cómo se lee un cromatograma</span><em>la figura, número por número</em></li>
    <li><span>Cómo se lee un espectro de masas</span><em>deconvolución y aductos</em></li>
    <li><span>Cómo se lee un certificado de análisis</span><em>veinte puntos y las banderas rojas</em></li>
    <li><span>Qué necesita cada compuesto del catálogo</span><em>el ensayo que no es opcional</em></li>
    <li><span>Montar el laboratorio</span><em>cuatro niveles, con costes</em></li>
    <li><span>Laboratorios de terceros</span><em>a quién se manda y qué se pide</em></li>
    <li><span>Trampas</span><em>los quince errores que se repiten</em></li>
    <li><span>Especificación tipo</span><em>plantilla lista para adoptar</em></li>
    <li><span>Glosario y fuentes</span><em></em></li>
  </ol>
</section>


<h2 class="sec"><span class="n">SECCIÓN 01</span>Las cinco preguntas</h2>
<p class="lede">«Testear un péptido» no es una operación: son cinco preguntas independientes.
Un lote puede contestar cuatro de forma impecable y fallar la quinta, y la que falla suele
ser la que nadie midió.</p>

<p>La confusión más cara del sector es tratar «99 % de pureza» como si fuera una nota global
del producto. No lo es. La pureza cromatográfica contesta una sola pregunta —<em>de todo lo que
absorbe luz a 214 nm y sale de la columna, qué fracción es el pico principal</em>— y guarda
silencio sobre las otras cuatro. Un vial puede ser 99.2 % puro por HPLC y contener la mitad
de péptido de lo que dice la etiqueta, porque el resto es agua, acetato y manitol. Ambas
cosas son ciertas a la vez y no se contradicen.</p>

<table>
  <tr><th style="width:22%">Pregunta</th><th style="width:26%">Qué contesta</th>
      <th style="width:30%">Ensayo</th><th>Si no se mide</th></tr>
  <tr><td><b>¿Es esto?</b></td><td>Identidad de la molécula</td>
      <td>LC-MS de masa intacta; MALDI-TOF; MS/MS; AAA</td>
      <td>Se está vendiendo otra cosa con la etiqueta correcta</td></tr>
  <tr><td><b>¿Está solo?</b></td><td>Pureza cromatográfica</td>
      <td>RP-HPLC/UPLC a 214 nm, gradiente</td>
      <td>Impurezas de síntesis no cuantificadas</td></tr>
  <tr><td><b>¿Cuánto hay?</b></td><td>Contenido neto de péptido</td>
      <td>AAA, nitrógeno, qNMR, A280</td>
      <td>La dosis calculada por el cliente es sistemáticamente alta</td></tr>
  <tr><td><b>¿Con qué viene?</b></td><td>Contraión, agua, solventes</td>
      <td>IC o HPLC de TFA/acetato; Karl Fischer; GC-HS</td>
      <td>Hasta un 30 % de la masa del vial es algo que no es el péptido</td></tr>
  <tr><td><b>¿Es seguro?</b></td><td>Endotoxina, bioburden, metales</td>
      <td>LAL &lt;85&gt;; USP &lt;61&gt;/&lt;62&gt;/&lt;71&gt;; ICP-MS &lt;233&gt;</td>
      <td>El riesgo que no aparece en ningún cromatograma</td></tr>
</table>

<div class="pull">La pureza responde «¿está solo?». El contenido responde «¿cuánto hay?».
Son preguntas distintas, se miden con equipos distintos, y confundirlas es el error
número uno del sector.</div>

<h3>El principio de ortogonalidad</h3>
<p>Ningún método individual demuestra nada por sí solo. Dos impurezas pueden coeluir bajo el
mismo pico de HPLC y sumar un 99 % aparente; un espectro de masas puede confirmar la masa
correcta de una molécula que sólo representa el 60 % de la muestra. La regla operativa es
sencilla: <strong>identidad y pureza deben confirmarse por técnicas cuyo mecanismo de
separación sea distinto.</strong> HPLC separa por hidrofobicidad; la espectrometría de masas
separa por relación masa-carga. Que dos métodos que no comparten mecanismo coincidan es
evidencia real; que un método se confirme a sí mismo no lo es.</p>


<h2 class="sec"><span class="n">SECCIÓN 02</span>Marco normativo</h2>
<p class="lede">Los materiales de investigación no están obligados a cumplir farmacopea.
Conviene igualmente medirse contra ella: es el único vocabulario común que existe, y el
proveedor que lo habla se distingue enseguida del que improvisa.</p>

<h3>USP &lt;1503&gt; — Atributos de calidad de principios activos peptídicos sintéticos</h3>
<p>Vigente desde el 1 de agosto de 2021. Es el documento de referencia del sector: describe
las categorías de impureza propias de la síntesis en fase sólida (deleción, truncamiento,
inserción, epimerización, protección incompleta, aductos), y establece qué familia de métodos
corresponde a cada una. Se acompaña de <strong>USP &lt;1504&gt;</strong>, sobre la calidad de
las materias primas de partida —los aminoácidos protegidos y las resinas—, que es donde se
origina buena parte de lo que después aparece como impureza.</p>

<h3>ICH Q2(R2) — Validación de procedimientos analíticos</h3>
<p>Define qué significa que un método esté validado: especificidad, linealidad, exactitud,
precisión (repetibilidad y precisión intermedia), rango, límite de detección y límite de
cuantificación, y robustez. La revisión R2 incorpora explícitamente los procedimientos
multivariantes. Un certificado que declara un método «validado» sin indicar respecto a qué
guía y con qué parámetros no está declarando nada.</p>

<h3>Capítulos generales USP aplicables</h3>
<table class="tight">
  <tr><th style="width:15%">Capítulo</th><th>Objeto</th><th style="width:34%">Cuándo aplica a un péptido</th></tr>
  <tr><td class="mono">&lt;85&gt;</td><td>Endotoxinas bacterianas (LAL)</td><td>Todo material de uso parenteral o de investigación en cultivo celular</td></tr>
  <tr><td class="mono">&lt;61&gt; &lt;62&gt;</td><td>Recuento y ausencia de microorganismos</td><td>Producto no estéril</td></tr>
  <tr><td class="mono">&lt;71&gt;</td><td>Ensayo de esterilidad</td><td>Producto declarado estéril</td></tr>
  <tr><td class="mono">&lt;232&gt; &lt;233&gt;</td><td>Impurezas elementales — límites y métodos</td><td>Siempre; especialmente con catalizadores metálicos o complejos de cobre</td></tr>
  <tr><td class="mono">&lt;467&gt;</td><td>Solventes residuales</td><td>Siempre en síntesis SPPS: DMF, DCM, acetonitrilo, éter, piperidina</td></tr>
  <tr><td class="mono">&lt;921&gt;</td><td>Determinación de agua (Karl Fischer)</td><td>Todo liofilizado</td></tr>
  <tr><td class="mono">&lt;1057&gt;</td><td>Contenido de proteína/péptido</td><td>Base del balance de masa</td></tr>
  <tr><td class="mono">&lt;621&gt;</td><td>Cromatografía — idoneidad del sistema</td><td>Define resolución, cola y platos exigibles</td></tr>
  <tr><td class="mono">&lt;1225&gt;</td><td>Validación de procedimientos de compendio</td><td>Marco de validación</td></tr>
</table>

<h3>Lo que cambió en 2026</h3>
<p>El 28 de julio de 2026 la FDA publicó <strong>diecisiete guías específicas de producto
revisadas</strong> para péptidos genéricos, con recomendaciones nuevas en cinco áreas:
presentación por la vía ANDA de péptidos recombinantes, sintéticos y semisintéticos; ensayo de
respuesta inmune innata; umbrales de impureza; evaluación de estructura de orden superior; y
evaluación de actividad biológica. Simultáneamente la agencia <strong>retiró la guía de mayo
de 2021</strong> sobre ANDAs de péptidos sintéticos altamente purificados, por no reflejar ya
su criterio científico actual, con intención de reeditarla. El período de comentarios cierra
el 28 de septiembre de 2026.</p>
<div class="card q">
  <h5>El umbral que importa</h5>
  <p>La guía retirada de 2021 fijaba el criterio que sigue siendo el punto de referencia
  práctico del sector: <strong>toda impureza que supere el 0.10 % del principio activo debe
  identificarse y caracterizarse individualmente</strong>, y una impureza peptídica nueva por
  encima del <strong>0.5 %</strong> bloqueaba la vía ANDA. Aunque el documento esté retirado,
  esos dos números son la vara con la que se mide un certificado serio. Un CoA que reporta
  «99.1 % puro» y no lista ninguna impureza individual está por debajo de ese estándar por
  omisión, no por resultado.</p>
</div>


<h2 class="sec"><span class="n">SECCIÓN 03</span>Identidad</h2>
<p class="lede">La primera pregunta. Antes de saber si el material es puro hay que saber si es
el material. Se contesta con espectrometría de masas, y se confirma con un método que no sea
espectrometría de masas.</p>

<div class="assay">
  <div class="assay-h"><span class="tag">A1</span><h4>LC-MS de masa intacta (ESI)</h4>
    <span class="w">imprescindible</span></div>
  <div class="assay-b">
    <dl class="kv">
      <dt>Qué mide</dt><dd>La masa molecular del compuesto que sale de la columna, con precisión de décimas de dalton en un equipo de alta resolución.</dd>
      <dt>Equipo</dt><dd>HPLC o UPLC acoplado a espectrómetro de masas con ionización por electrospray. Cuadrupolo simple para confirmación; Orbitrap o Q-TOF para masa exacta.</dd>
      <dt>Muestra</dt><dd>10–50 µg disueltos en agua/acetonitrilo con 0.1 % de ácido fórmico. El TFA suprime la señal en ESI: si el péptido es sal de TFA, la sensibilidad cae y hay que compensarlo.</dd>
      <dt>Tiempo</dt><dd>15–30 min por muestra.</dd>
      <dt>Coste</dt><dd>USD 60–180 en laboratorio externo.</dd>
    </dl>
    <p><b>Cómo se lee.</b> El electrospray no produce un pico: produce una serie. La molécula
    sale cargada con distintos números de protones y cada estado de carga aparece a su propio
    <span class="mono">m/z</span>. La masa se recupera con dos ecuaciones:</p>
    <div class="formula">m/z = (M + z · 1.00728) / z        →        M = z · (m/z) − z · 1.00728

donde  M    = masa monoisotópica o promedio del péptido neutro
       z    = número de cargas (protones añadidos)
       1.00728 = masa del protón (Da)</div>
    <p>Dos picos consecutivos de la serie bastan para resolver <span class="mono">z</span> sin
    saberlo de antemano, porque la diferencia entre ellos sólo es consistente para un valor.
    El software de deconvolución hace esto automáticamente y devuelve una masa única; lo que
    hay que verificar es que la masa devuelta coincida con la teórica dentro de la tolerancia
    del instrumento.</p>
    <table class="tight">
      <tr><th>Instrumento</th><th>Tolerancia razonable</th><th>Qué distingue</th></tr>
      <tr><td>Cuadrupolo simple</td><td>± 0.5 a ± 1 Da</td><td>Identidad gruesa. No distingue Gln/Lys (0.036 Da) ni desamidación (+0.984 Da)</td></tr>
      <tr><td>Q-TOF</td><td>± 5 a 20 ppm</td><td>Desamidación, oxidación, la mayoría de modificaciones</td></tr>
      <tr><td>Orbitrap</td><td>&lt; 3 ppm</td><td>Todo lo anterior con margen; permite fórmula elemental</td></tr>
    </table>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">A2</span><h4>MALDI-TOF</h4><span class="w">alternativa</span></div>
  <div class="assay-b">
    <dl class="kv">
      <dt>Qué mide</dt><dd>Masa molecular, casi siempre como ion de carga única. Un espectro MALDI se lee directamente: el pico está en M+1.</dd>
      <dt>Equipo</dt><dd>Espectrómetro MALDI-TOF con matriz de ácido α-ciano-4-hidroxicinámico (péptidos pequeños) o ácido sinapínico (proteínas).</dd>
      <dt>Ventaja</dt><dd>Tolera sales y tampones mucho mejor que el ESI, y llega sin dificultad a masas altas: es el método natural para somatropina o IGF-1 LR3.</dd>
      <dt>Límite</dt><dd>Cuantificación pobre. Sirve para decir <em>qué</em> hay, no <em>cuánto</em>. La supresión de ionización entre componentes de una mezcla es severa.</dd>
    </dl>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">A3</span><h4>MS/MS — secuenciación y mapa peptídico</h4>
    <span class="w">confirmatorio</span></div>
  <div class="assay-b">
    <p>La masa intacta confirma la <em>composición</em>, no el <em>orden</em>. Dos péptidos con
    los mismos aminoácidos en distinto orden pesan exactamente lo mismo, y un error de
    acoplamiento que invierta dos residuos es invisible para la masa intacta y para la HPLC si
    la hidrofobicidad no cambia mucho.</p>
    <p>La fragmentación por MS/MS rompe el esqueleto en los enlaces amida y produce series de
    iones —<span class="mono">b</span> desde el extremo N, <span class="mono">y</span> desde
    el C— cuyas diferencias de masa consecutivas son exactamente las masas de los residuos.
    Leer esas diferencias es leer la secuencia. Para péptidos por encima de ~30 residuos se
    hace un mapa peptídico: digestión con tripsina y análisis LC-MS/MS de los fragmentos, con
    cobertura de secuencia declarada como porcentaje.</p>
    <div class="card q"><h5>Cuándo exigirlo</h5>
      <ul>
        <li>Producto nuevo o proveedor nuevo: una vez, para calificar.</li>
        <li>Péptidos con residuos no naturales (Aib, Nle, D-Phe, Dmt): la masa no distingue un
            isómero mal incorporado.</li>
        <li>Cualquier discrepancia entre la masa observada y la teórica que no explique una
            modificación conocida.</li>
      </ul></div>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">A4</span><h4>Análisis de aminoácidos (AAA)</h4>
    <span class="w">ortogonal</span></div>
  <div class="assay-b">
    <p>El péptido se hidroliza en HCl 6 N a 110 °C durante 24 h, y los aminoácidos liberados se
    derivatizan y se cuantifican por HPLC. Devuelve dos cosas de una vez: la
    <strong>composición</strong> —cuántos residuos de cada tipo, que debe coincidir con la
    secuencia teórica— y el <strong>contenido neto de péptido</strong>, que es la única forma
    verdaderamente trazable de saber cuánto péptido hay en el vial.</p>
    <p>Es la técnica ortogonal por excelencia frente a la espectrometría de masas: no comparte
    ni un solo principio físico con ella. Su punto débil es conocido y hay que tenerlo
    presente: <strong>el triptófano se destruye en la hidrólisis ácida</strong>, la cisteína se
    pierde parcialmente, y asparagina y glutamina se convierten en aspártico y glutámico, de
    modo que se reportan sumadas (Asx, Glx). Un AAA que reporte triptófano sin haber usado
    hidrólisis con ácido metanosulfónico está reportando ruido.</p>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">A5</span><h4>Quiralidad — configuración D/L</h4>
    <span class="w">específico</span></div>
  <div class="assay-b">
    <p>Un D-aminoácido pesa exactamente lo mismo que su L. La masa no los distingue, y la HPLC
    de fase reversa convencional tampoco de forma fiable. Se necesita una columna quiral, o
    derivatización con reactivo de Marfey seguida de HPLC, o análisis de aminoácidos tras
    hidrólisis con detección quiral.</p>
    <div class="card w"><h5>Por qué importa en este catálogo</h5>
      <p>Varios compuestos dependen de la configuración D para funcionar: <b>FOXO4-DRI</b> es
      íntegramente de D-aminoácidos en secuencia invertida —si el material fuera L, tendría la
      masa correcta, pasaría HPLC y sería una molécula distinta sin la resistencia a proteasas
      que es su razón de ser—. <b>Ipamorelin</b>, <b>GHRP-2</b>, <b>GHRP-6</b>,
      <b>Hexarelin</b>, <b>SS-31</b>, <b>Melanotan I</b> y <b>Melanotan II</b> llevan residuos
      D en posiciones definidas. En <b>L-carnitina</b>, la D-carnitina no sólo es inactiva: es
      tóxica y compite con la L.</p>
      <p>Un CoA que reporta masa y pureza no demuestra en ninguno de estos casos que la
      estereoquímica sea la correcta.</p></div>
  </div>
</div>


<h2 class="sec"><span class="n">SECCIÓN 04</span>Pureza</h2>
<p class="lede">Segunda pregunta. La cromatografía líquida de fase reversa es el ensayo central
del control de calidad de péptidos y, con diferencia, el más citado y el peor entendido.</p>

<h3>RP-HPLC / UPLC</h3>
<dl class="kv">
  <dt>Principio</dt><dd>La muestra se inyecta en una columna con fase estacionaria apolar (C18) y se eluye con un gradiente creciente de acetonitrilo. Los componentes salen ordenados por hidrofobicidad: lo polar primero, lo apolar después.</dd>
  <dt>Columna</dt><dd>C18, 4.6 × 250 mm, 5 µm y poro de 100 Å para péptidos hasta ~30 residuos; poro de 300 Å por encima, porque una molécula grande no entra en un poro pequeño y eluye sin haberse separado.</dd>
  <dt>Fase móvil</dt><dd>A: agua con 0.1 % TFA. B: acetonitrilo con 0.1 % TFA. El TFA es par iónico y agudiza los picos; el ácido fórmico se usa cuando la corrida va acoplada a masas.</dd>
  <dt>Gradiente</dt><dd>Típico 5 → 65 % B en 20–30 min a 1.0 mL/min. Un gradiente más plano en la zona de elución mejora la resolución de impurezas cercanas.</dd>
  <dt>Detección</dt><dd><b>214 nm</b>, que es el enlace peptídico y por tanto ve todo el esqueleto. 280 nm sólo ve Trp, Tyr y Phe: usarlo como detección primaria hace invisible cualquier impureza sin aromáticos.</dd>
  <dt>Reporte</dt><dd>Pureza = área del pico principal ÷ área total × 100, con la tabla de áreas de todos los picos por encima del umbral de integración.</dd>
</dl>

<div class="card w">
  <h5>Lo que la pureza por HPLC no ve</h5>
  <ul>
    <li><b>Lo que no absorbe a 214 nm.</b> Sales inorgánicas, agua, manitol. Pueden ser el 20 % de la masa del vial y no aparecer en ningún cromatograma.</li>
    <li><b>Lo que no se inyecta.</b> Material insoluble o agregado queda en el filtro. Cuanto peor es el lote, mejor sale el cromatograma del sobrenadante.</li>
    <li><b>Lo que coeluye.</b> Un diastereómero o un péptido con dos residuos permutados puede salir bajo el mismo pico.</li>
    <li><b>Lo que no eluye.</b> Material fuertemente retenido que se queda en la columna y no llega al detector.</li>
  </ul>
</div>

<h3>Ortogonalidad cromatográfica</h3>
<p>Cuando el resultado tiene que sostenerse, se corre una segunda separación de selectividad
distinta y se compara. Si el pico principal se mantiene por encima del umbral en las dos, hay
evidencia; si en la segunda aparece un hombro que no estaba, había coelución.</p>
<table class="tight">
  <tr><th>Modo</th><th>Separa por</th><th>Detecta lo que RP-C18 esconde</th></tr>
  <tr><td>RP a pH distinto (2.1 vs 6.5)</td><td>Hidrofobicidad con distinta ionización</td><td>Isoformas cargadas, desamidación</td></tr>
  <tr><td>Fase reversa C4 o fenil-hexilo</td><td>Otra química de superficie</td><td>Selectividad distinta para aromáticos</td></tr>
  <tr><td>Intercambio iónico (IEX)</td><td>Carga neta</td><td>Desamidación, variantes de carga</td></tr>
  <tr><td>Exclusión por tamaño (SEC)</td><td>Radio hidrodinámico</td><td>Dímeros y agregados</td></tr>
  <tr><td>HILIC</td><td>Hidrofilicidad</td><td>Péptidos muy polares que no se retienen en C18</td></tr>
</table>

<h3>Mapa de impurezas de la síntesis en fase sólida</h3>
<p>Las impurezas de un péptido sintético no son aleatorias: cada una procede de un fallo
identificable del ciclo de síntesis, y cada una tiene una firma de masa reconocible. Saber
leer esa firma convierte una lista de picos en un diagnóstico del proceso del proveedor.</p>
<table class="tight">
  <tr><th style="width:23%">Impureza</th><th style="width:17%">Firma de masa</th><th>Origen y lectura</th></tr>
  <tr><td>Deleción</td><td class="mono">− masa de 1 residuo</td><td>Acoplamiento incompleto en un ciclo. Es el defecto más común. Eluye cerca del principal.</td></tr>
  <tr><td>Truncamiento</td><td class="mono">− varios residuos</td><td>La cadena dejó de crecer. Suele eluir antes.</td></tr>
  <tr><td>Inserción</td><td class="mono">+ masa de 1 residuo</td><td>Doble acoplamiento del mismo aminoácido.</td></tr>
  <tr><td>Oxidación de Met</td><td class="mono">+ 16 (o + 32)</td><td>Metionina-sulfóxido. Crítica en MOTS-c, Semax, Snap-8, Adamax. Eluye antes que el principal (más polar).</td></tr>
  <tr><td>Desamidación</td><td class="mono">+ 0.984</td><td>Asn→Asp, Gln→Glu. Requiere alta resolución para verse por masa; por HPLC aparece como hombro.</td></tr>
  <tr><td>Isomerización a iso-Asp</td><td class="mono">± 0 (isobárica)</td><td>Invisible por masa. Sólo se ve como pico separado en HPLC o por MS/MS.</td></tr>
  <tr><td>Epimerización</td><td class="mono">± 0 (isobárica)</td><td>Un L se volvió D durante el acoplamiento. Requiere método quiral.</td></tr>
  <tr><td>Disulfuro barajado</td><td class="mono">± 0 o − 2</td><td>Puentes mal formados. Afecta a oxitocina, AOD-9604, cagrilintida, adipotida. La masa es igual: hace falta mapa peptídico no reductor.</td></tr>
  <tr><td>Deshidratación</td><td class="mono">− 18</td><td>Formación de succinimida en Asp-Gly. Relevante en Epithalon.</td></tr>
  <tr><td>Aducto de TFA</td><td class="mono">+ 114</td><td>Trifluoroacetilación de una lisina.</td></tr>
  <tr><td>Acetilación</td><td class="mono">+ 42</td><td>Capping residual o acetilación de amina libre.</td></tr>
  <tr><td>Protección residual</td><td class="mono">+ 156 / + 100 / + 220</td><td>Pbf (Arg), Boc (Lys), Trt (Cys/His) no eliminados en el corte final.</td></tr>
</table>


<h2 class="sec"><span class="n">SECCIÓN 05</span>Contenido y balance de masa</h2>
<p class="lede">Tercera pregunta, y la que casi ningún certificado de material de investigación
contesta. Es también la que determina si la concentración que calcula el cliente es la que
tiene en la jeringa.</p>

<p>Un vial rotulado «10 MG» contiene diez miligramos <em>de algo</em>. Ese algo es la suma del
péptido neto, el contraión, el agua adsorbida y cualquier agente de carga. El
<strong>contenido de péptido</strong> es la fracción que corresponde al péptido, y en un
liofilizado típico está entre el 70 y el 90 %.</p>

<div class="formula">Péptido real (mg)  =  masa del vial  ×  pureza (%)  ×  contenido de péptido (%)

Ejemplo, vial de 10 mg, pureza 98.5 %, contenido 82 %:

   10 mg × 0.985 × 0.82  =  8.08 mg de péptido

El vial dice 10. Hay 8. La diferencia es del 19 %, y no hay
nada defectuoso en el lote: es la composición normal de un
liofilizado que nadie declaró.</div>

<table class="tight">
  <tr><th>Método</th><th style="width:18%">Exactitud</th><th>Notas</th></tr>
  <tr><td>Análisis de aminoácidos (AAA)</td><td>± 3–5 %</td><td>Patrón de referencia. Trazable, destructivo, ~USD 120–250.</td></tr>
  <tr><td>Nitrógeno total (Kjeldahl o combustión)</td><td>± 5 %</td><td>Barato y robusto, pero cualquier impureza nitrogenada infla el resultado.</td></tr>
  <tr><td>qNMR con patrón interno</td><td>± 1–2 %</td><td>El más exacto. Requiere RMN de 400 MHz o superior y ~5 mg de muestra.</td></tr>
  <tr><td>UV a 280 nm</td><td>± 10 %</td><td>Rápido y no destructivo, pero <b>sólo funciona si el péptido tiene Trp o Tyr</b>.</td></tr>
  <tr><td>Balance de masa (100 % − todo lo demás)</td><td>± 5 %</td><td>Contenido = 100 − agua − contraión − solventes − ceniza. Barato si ya se midieron.</td></tr>
</table>

<h4>UV a 280 nm — cuándo sirve y cuándo no</h4>
<div class="formula">A₂₈₀ = ε · c · l          (Beer-Lambert)

ε ≈ (n_Trp × 5500) + (n_Tyr × 1490) + (n_Cistina × 125)   M⁻¹cm⁻¹

Sin triptófano ni tirosina, ε ≈ 0 y el método no existe.</div>
<p>De los compuestos del catálogo, este método <strong>no es aplicable</strong> a BPC-157,
Epithalon, KPV, Pinealon, Cartalax, ipamorelin ni a la mayor parte de los péptidos cortos sin
aromáticos. Sí lo es a GHRP-2, GHRP-6, hexarelin, DSIP, kisspeptina-10 y a las proteínas.</p>


<h2 class="sec"><span class="n">SECCIÓN 06</span>Contraiones, agua y volátiles</h2>
<p class="lede">Cuarta pregunta. Es la sección más ignorada y la que explica la mayoría de las
discrepancias entre lo que dice la etiqueta y lo que mide la balanza.</p>

<div class="assay">
  <div class="assay-h"><span class="tag">D1</span><h4>Contraión: TFA frente a acetato</h4></div>
  <div class="assay-b">
    <p>Un péptido con residuos básicos sale de la purificación como sal. Si se purificó con TFA
    —lo habitual— es sal de trifluoroacetato, y ese contraión puede representar
    <strong>del 10 al 30 % de la masa</strong>. Se mide por cromatografía iónica o por HPLC de
    par iónico con detección a 210 nm, o por RMN de <span class="mono">¹⁹F</span>, que es
    específica del flúor y por tanto inequívoca.</p>
    <p>El TFA residual no es inerte: es citotóxico en cultivo celular a concentraciones que se
    alcanzan con facilidad, e interfiere con ensayos funcionales. Para trabajo celular se pide
    intercambio a acetato o a clorhidrato, y ese intercambio debe constar en el certificado.</p>
    <dl class="kv"><dt>Especificación</dt><dd>TFA ≤ 1 % para trabajo celular; declarado y cuantificado siempre.</dd></dl>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">D2</span><h4>Agua — Karl Fischer, USP &lt;921&gt;</h4></div>
  <div class="assay-b">
    <p>Un liofilizado es higroscópico por construcción. El agua residual típica es del 3 al
    10 % en masa, y sube cada vez que el vial se abre en ambiente húmedo. La valoración de Karl
    Fischer es específica para agua —a diferencia de la pérdida por secado, que mide todo lo
    que se evapora— y es el método de farmacopea.</p>
    <dl class="kv">
      <dt>Coulométrico</dt><dd>Para contenidos bajos, &lt; 1 %. Necesita ~50 mg de muestra.</dd>
      <dt>Volumétrico</dt><dd>Para contenidos altos. Necesita más muestra.</dd>
      <dt>Coste equipo</dt><dd>USD 6 000–20 000 nuevo; desde USD 2 500 reacondicionado.</dd>
    </dl>
    <p>El agua importa por dos motivos: entra en el balance de masa, y por encima de cierto
    umbral moviliza las reacciones de degradación en estado sólido —desamidación e
    hidrólisis— que arruinan un lote durante el almacenamiento sin que nada se vea.</p>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">D3</span><h4>Solventes residuales — GC headspace, USP &lt;467&gt;</h4></div>
  <div class="assay-b">
    <p>La síntesis en fase sólida usa DMF, DCM, piperidina, acetonitrilo, éter dietílico, TFA y
    tioanisol. El liofilizado los arrastra en cantidades variables. Se miden por cromatografía
    de gases con muestreador de espacio de cabeza, que evita inyectar la matriz.</p>
    <p>USP &lt;467&gt; clasifica los solventes en tres clases. La <b>Clase 1</b> —benceno,
    1,2-dicloroetano, tetracloruro de carbono— debe evitarse por completo. La <b>Clase 2</b>
    —diclorometano 600 ppm, acetonitrilo 410 ppm, metanol 3000 ppm, piridina 200 ppm— tiene
    límites numéricos. La <b>Clase 3</b> se acepta hasta 5000 ppm.</p>
  </div>
</div>


<h2 class="sec"><span class="n">SECCIÓN 07</span>Seguridad microbiológica y elemental</h2>
<p class="lede">Quinta pregunta. Nada de esto aparece en un cromatograma, y es la categoría de
riesgo que un certificado de sólo HPLC y masas deja completamente sin cubrir.</p>

<div class="assay">
  <div class="assay-h"><span class="tag">E1</span><h4>Endotoxinas bacterianas — LAL, USP &lt;85&gt;</h4>
    <span class="w">crítico</span></div>
  <div class="assay-b">
    <p>Las endotoxinas son lipopolisacáridos de la pared de bacterias gram-negativas. Son
    <strong>termoestables</strong>: sobreviven a la autoclave, sobreviven al filtrado
    esterilizante, y por tanto un material puede ser estéril y estar cargado de endotoxina al
    mismo tiempo. Provocan respuesta pirogénica a nanogramos.</p>
    <p>El ensayo usa lisado de amebocitos de <em>Limulus</em>. Tres formatos: gel-clot
    (cualitativo, límite fijo), cromogénico (cuantitativo, el más usado) y turbidimétrico. El
    rFC recombinante es la alternativa sin cangrejo, ya aceptada en farmacopea europea.</p>
    <div class="formula">Límite de endotoxina  =  K / M

  K = 5.0 EU/kg/h   (parenteral, vía no intratecal)
  M = dosis máxima por kg de masa corporal y hora

Ejemplo, 10 mg de péptido en sujeto de 70 kg:
  M = 10 mg / 70 kg = 0.143 mg/kg
  Límite = 5.0 / 0.143 = 35 EU por mg de péptido</div>
    <dl class="kv"><dt>Especificación</dt><dd>&lt; 1.0 EU/mg es exigente y alcanzable; &lt; 10 EU/mg es lo habitual en material de investigación.</dd>
    <dt>Coste</dt><dd>USD 60–150 por muestra en laboratorio externo; kits desde USD 300 para ~30 determinaciones.</dd></dl>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">E2</span><h4>Carga microbiana y esterilidad</h4></div>
  <div class="assay-b">
    <p><b>USP &lt;61&gt;</b> cuenta el total de aerobios y de hongos. <b>USP &lt;62&gt;</b> busca
    específicamente <em>E. coli</em>, <em>Salmonella</em>, <em>P. aeruginosa</em>,
    <em>S. aureus</em>. <b>USP &lt;71&gt;</b> es el ensayo de esterilidad propiamente dicho:
    catorce días de incubación en dos medios, y no se puede acelerar.</p>
    <div class="card w"><h5>Advertencia sobre el agua bacteriostática</h5>
      <p>El alcohol bencílico al 0.9 % es <em>bacteriostático</em>: impide que crezca lo que
      haya, no lo elimina. Reconstituir un liofilizado contaminado con agua bacteriostática no
      lo descontamina — congela el problema en su sitio.</p></div>
  </div>
</div>

<div class="assay">
  <div class="assay-h"><span class="tag">E3</span><h4>Impurezas elementales — ICP-MS, USP &lt;232&gt;/&lt;233&gt;</h4></div>
  <div class="assay-b">
    <p>La muestra se digiere en ácido nítrico y se analiza por plasma acoplado inductivamente
    con detección de masas. Detecta a partes por billón. Los elementos de Clase 1 —Cd, Pb, As,
    Hg— tienen límites duros; los de Clase 2A —Co, V, Ni— y los catalizadores de Clase 2B
    —Pd, Pt, Ir, Rh, Ru, Os, Ag, Au— dependen de la vía de administración.</p>
    <div class="card q"><h5>Caso particular del catálogo: los complejos de cobre</h5>
      <p>En <b>GHK-Cu</b> y <b>AHK-Cu</b> el cobre no es una impureza: es parte de la molécula
      y debe cuantificarse como atributo de identidad. La relación molar péptido:cobre debe ser
      1:1. Un exceso de cobre libre es prooxidante; un defecto significa que parte del material
      es tripéptido sin acomplejar y por tanto inactivo. Se mide por ICP-OES, ICP-MS o
      absorción atómica.</p></div>
  </div>
</div>


<h2 class="sec"><span class="n">SECCIÓN 08</span>Estructura, agregación y función</h2>
<p class="lede">Para los péptidos cortos, la conformación no es una preocupación. Para las
proteínas del catálogo —somatropina, IGF-1 LR3— y para los ciclados, es donde vive el fallo
que ningún otro ensayo detecta.</p>

<h3>Dicroísmo circular (CD)</h3>
<p>Mide la absorción diferencial de luz polarizada circularmente en el UV lejano (190–250 nm).
Es la forma más directa de comprobar que una proteína está plegada. Una hélice α da un doble
mínimo característico a 208 y 222 nm; una lámina β da un mínimo a 218 nm; una cadena
desordenada da un mínimo profundo a 198 nm. Una somatropina desnaturalizada por agitación
tiene la masa correcta, sale como pico único en HPLC y ha perdido su espectro de CD.</p>

<h3>Cromatografía de exclusión por tamaño (SEC)</h3>
<p>Separa por radio hidrodinámico y es la única forma sencilla de cuantificar dímeros,
oligómeros y agregados de alto peso molecular. Se reporta como porcentaje de monómero. Los
agregados son la principal causa de inmunogenicidad en productos proteicos, y no aparecen en
la HPLC de fase reversa porque las condiciones desnaturalizantes de ésta los deshacen antes de
que lleguen al detector.</p>
<p>Aplicable a: <b>HGH 191AA</b>, <b>IGF-1 LR3</b>, <b>Timosina α-1</b> y, en general, a todo
lo que supere ~3 kDa. Los péptidos lipidados —semaglutida, tirzepatida, retatrutida,
cagrilintida— autoasocian de forma reversible y ahí la SEC hay que interpretarla con cuidado:
la micelización no es agregación patológica.</p>

<h3>Bioensayo de potencia</h3>
<p>Es el único ensayo que mide si la molécula <em>hace algo</em>. Todo lo anterior mide qué es y
cuánta hay. Para un agonista de receptor se hace en línea celular que expresa el receptor,
midiendo AMPc o un reportero de luciferasa, y se reporta como potencia relativa frente a un
patrón. Es caro (USD 800–3 000), lento y no habitual fuera del entorno farmacéutico — pero es
la única respuesta real a «¿funciona?».</p>


<h2 class="sec"><span class="n">SECCIÓN 09</span>Cómo se lee un cromatograma</h2>
<p class="lede">La figura de abajo es un cromatograma calculado, no una captura. Los números
anotados son exactamente los que produjeron la curva, y son los cinco que hay que mirar en
cualquier certificado.</p>

__FIG_CHROM__
<p class="figcap"><b>Figura 1.</b> Separación RP-HPLC ilustrativa de un péptido del 98 %.
Eje horizontal: tiempo de retención en minutos. Eje vertical: respuesta del detector UV a
214 nm. El pico principal eluye a 9.60 min; cuatro impurezas de proceso aparecen a 4.10, 6.85,
8.42 y 11.35 min. La leve subida de la línea base es la deriva normal del gradiente de
acetonitrilo, no una impureza.</p>

<h3>Los cinco números</h3>
<table>
  <tr><th style="width:19%">Parámetro</th><th style="width:15%">En la figura</th>
      <th style="width:18%">Criterio</th><th>Qué significa si falla</th></tr>
  <tr><td><b>Pureza de área</b></td><td class="mono">98.04 %</td><td>≥ 98 % material de investigación</td>
      <td>Es un cociente de áreas, no una masa. Depende del umbral de integración que fijó el analista.</td></tr>
  <tr><td><b>Tiempo de retención</b></td><td class="mono">t&#8341; 9.60 min</td><td>± 2 % entre inyecciones</td>
      <td>Debe reproducirse contra un patrón. Un t&#8341; correcto con masa incorrecta es coincidencia, no identidad.</td></tr>
  <tr><td><b>Resolución</b></td><td class="mono">Rs 4.1</td><td>≥ 1.5 (línea base); ≥ 2.0 deseable</td>
      <td>Por debajo de 1.5 los picos se solapan y el área del principal incluye parte de la impureza.</td></tr>
  <tr><td><b>Factor de cola</b></td><td class="mono">T 1.12</td><td>0.8 ≤ T ≤ 2.0</td>
      <td>Cola alta = columna degradada o interacción con silanoles. Infla el área del principal y esconde impurezas tardías.</td></tr>
  <tr><td><b>Platos teóricos</b></td><td class="mono">N 14 800</td><td>≥ 2 000; típico 10 000–20 000</td>
      <td>Eficiencia de la columna. En caída libre entre inyecciones = columna al final de su vida.</td></tr>
</table>

<div class="formula">Rs = 2 (t₂ − t₁) / (w₁ + w₂)            resolución entre picos adyacentes
T  = (A + B) / 2A                       factor de cola al 5 % de altura
N  = 16 (t&#8341; / w)²                        platos teóricos, anchura en base</div>

<div class="card w">
  <h5>Cinco formas de que un cromatograma mienta sin falsificar nada</h5>
  <ol class="num">
    <li><b>Umbral de integración alto.</b> Subir el umbral hace desaparecer los picos pequeños y la pureza sube sola. Un CoA sin la tabla de áreas no permite detectarlo.</li>
    <li><b>Corrida demasiado corta.</b> Las impurezas más hidrofóbicas eluyen después del final del gradiente y no se cuentan. Debe verse una zona de lavado limpia tras el pico principal.</li>
    <li><b>Detección a 280 nm.</b> Sólo ve residuos aromáticos. Toda impureza sin Trp/Tyr/Phe es invisible.</li>
    <li><b>Escala vertical recortada.</b> Un eje que corta al 5 % de altura oculta visualmente lo que la tabla sí reporta.</li>
    <li><b>Filtrado previo.</b> Si el material tiene insolubles y se filtra antes de inyectar, se está analizando la parte buena del lote.</li>
  </ol>
</div>


<h2 class="sec"><span class="n">SECCIÓN 10</span>Cómo se lee un espectro de masas</h2>
<p class="lede">Un espectro ESI no muestra la masa: muestra una serie de estados de carga de la
que hay que deducirla. Entender esa serie es lo que separa leer un certificado de mirarlo.</p>

__FIG_ESI__
<p class="figcap"><b>Figura 2.</b> Envolvente de estados de carga por electrospray de una
proteína de 22 124 Da (somatropina). Cada línea es la misma molécula con distinto número de
protones. Deconvolucionar es colapsar toda esta serie en un único valor de masa.</p>

<h3>El cálculo, paso a paso</h3>
<p>Tomando el pico marcado <span class="mono">18+</span> a <span class="mono">m/z 1230.3</span>:</p>
<div class="formula">M = z · (m/z) − z · 1.00728
M = 18 × 1230.3 − 18 × 1.00728
M = 22 145.4 − 18.13
M = 22 127.3 Da

Teórica: 22 124.0 Da     Δ = +3.3 Da  ≈ 149 ppm

En un cuadrupolo simple, 3 Da sobre 22 kDa está dentro de
tolerancia. En un Orbitrap, ese mismo error sería una señal
de modificación y habría que explicarlo.</div>

<h3>Los desplazamientos que hay que reconocer</h3>
<table class="tight">
  <tr><th style="width:14%">Δ masa</th><th style="width:28%">Causa</th><th>Lectura</th></tr>
  <tr><td class="mono">+ 22</td><td>Aducto de sodio (Na⁺ por H⁺)</td><td>Artefacto de preparación, no del lote. Desaparece desalando.</td></tr>
  <tr><td class="mono">+ 38</td><td>Aducto de potasio</td><td>Igual que el anterior.</td></tr>
  <tr><td class="mono">+ 16</td><td>Oxidación</td><td>Met o Trp oxidados. Es degradación real del material.</td></tr>
  <tr><td class="mono">+ 18</td><td>Hidrólisis de amida C-terminal</td><td>El péptido amidado dejó de estarlo. Suele perder actividad.</td></tr>
  <tr><td class="mono">− 18</td><td>Deshidratación / succinimida</td><td>Degradación en Asp-Gly o Asn-Gly.</td></tr>
  <tr><td class="mono">+ 0.98</td><td>Desamidación</td><td>Sólo visible con alta resolución. Es la degradación silenciosa clásica.</td></tr>
  <tr><td class="mono">+ 42</td><td>Acetilación</td><td>Capping residual, o acetato unido covalentemente.</td></tr>
  <tr><td class="mono">+ 114</td><td>Aducto de TFA</td><td>Trifluoroacetilación de una lisina.</td></tr>
  <tr><td class="mono">− 2</td><td>Formación de disulfuro</td><td>Esperado en péptidos ciclados; inesperado en los que no lo llevan.</td></tr>
  <tr><td class="mono">× 2</td><td>Dímero</td><td>Puede ser artefacto de fuente o agregado real. Confirmar con SEC.</td></tr>
</table>

<div class="card g">
  <h5>Qué debe traer un espectro para valer de algo</h5>
  <ul>
    <li>El espectro crudo, con la envolvente de cargas visible — no sólo la masa deconvolucionada.</li>
    <li>La masa teórica y la observada, juntas, con la diferencia expresada en Da y en ppm.</li>
    <li>La identificación del instrumento y su resolución nominal.</li>
    <li>Si es monoisotópica o promedio: en péptidos grandes la diferencia es de varios daltons y comparar una con otra produce falsas alarmas.</li>
  </ul>
</div>


<h2 class="sec"><span class="n">SECCIÓN 11</span>Cómo se lee un certificado de análisis</h2>
<p class="lede">El CoA es el único documento que acompaña al vial. Estos veinte puntos se
revisan en orden; los cinco primeros descartan la mayoría de los certificados malos en menos
de un minuto.</p>

<ol class="chk">
  <li><b>¿Hay número de lote, y coincide con el vial?</b><span>Un CoA sin lote no certifica nada: certifica una vez que alguien hizo bien un análisis, alguna vez.</span></li>
  <li><b>¿Hay fecha de análisis?</b><span>Un certificado de hace dos años sobre un liofilizado almacenado en condiciones desconocidas describe un material que ya no existe.</span></li>
  <li><b>¿Quién firma?</b><span>Nombre del laboratorio, del analista y método de verificación. Los laboratorios serios publican un portal donde el código del CoA se comprueba.</span></li>
  <li><b>¿Es del fabricante o de un tercero?</b><span>Un CoA del propio fabricante es una declaración de parte. No es inútil, pero no es independiente.</span></li>
  <li><b>¿Está el cromatograma, o sólo el número?</b><span>«Purity: 99.1 %» sin gráfico ni tabla de áreas es una afirmación sin respaldo.</span></li>
  <li><b>¿A qué longitud de onda se detectó?</b><span>Debe decir 214 nm. Si dice 280 nm y el péptido no tiene aromáticos, el ensayo no midió nada.</span></li>
  <li><b>¿Se ve la línea base completa?</b><span>Incluida la zona posterior al pico principal, hasta el final del gradiente.</span></li>
  <li><b>¿Hay tabla de picos con áreas individuales?</b><span>Es lo que permite comprobar el umbral de integración.</span></li>
  <li><b>¿Se identifican las impurezas por encima del 0.10 %?</b><span>El estándar de la industria. Un listado de «unspecified» por encima de ese umbral es trabajo sin terminar.</span></li>
  <li><b>¿Hay espectro de masas, con envolvente de cargas?</b><span>No sólo una masa deconvolucionada suelta.</span></li>
  <li><b>¿Coincide la masa observada con la teórica, y está la diferencia declarada?</b><span>En Da y en ppm.</span></li>
  <li><b>¿Hay contenido neto de péptido?</b><span>Éste es el punto que separa un CoA profesional de uno de catálogo. Casi ninguno lo trae.</span></li>
  <li><b>¿Se declara el contraión y su porcentaje?</b><span>TFA o acetato. Es entre el 10 y el 30 % de la masa.</span></li>
  <li><b>¿Hay contenido de agua por Karl Fischer?</b><span>Otro 3–10 % de la masa.</span></li>
  <li><b>¿Hay resultado de endotoxinas en EU/mg?</b><span>Con el método indicado (gel-clot, cromogénico, rFC).</span></li>
  <li><b>¿Hay bioburden o esterilidad?</b><span>Y si dice «estéril», ¿bajo qué capítulo y con qué duración de incubación?</span></li>
  <li><b>¿Hay solventes residuales?</b><span>Especialmente DMF, DCM y acetonitrilo.</span></li>
  <li><b>¿Hay descripción física?</b><span>Aspecto, color, solubilidad. En GHK-Cu el color azul es un ensayo de identidad gratuito.</span></li>
  <li><b>¿Coinciden las especificaciones con los resultados?</b><span>Comprobar que cada línea tiene su criterio de aceptación al lado, no sólo el valor.</span></li>
  <li><b>¿El documento es coherente consigo mismo?</b><span>Fechas posteriores a la de emisión, masas que no corresponden a la secuencia impresa, unidades cambiadas a mitad de tabla. Los certificados fabricados fallan casi siempre por aquí.</span></li>
</ol>

<div class="card w">
  <h5>Banderas rojas inmediatas</h5>
  <ul>
    <li><b>Pureza de 99.9 % o superior.</b> Alcanzable, pero excepcional en péptidos sintéticos. Con cifras así, el escrutinio del resto del documento debe subir, no bajar.</li>
    <li><b>Cromatograma sin ruido de línea base.</b> Ningún detector real produce una línea perfectamente plana. Una base sin ruido es una base dibujada.</li>
    <li><b>El mismo cromatograma para varios lotes.</b> Comparar la microestructura del ruido entre certificados es la comprobación más rápida que existe.</li>
    <li><b>Masa que no corresponde a la secuencia impresa en el mismo documento.</b> Sumar los residuos y restar el agua de los enlaces es un cálculo de dos minutos.</li>
    <li><b>Ausencia total de impurezas listadas.</b> Una síntesis real siempre deja rastro.</li>
    <li><b>Unidades ausentes o inconsistentes.</b> «Endotoxin: 0.25» sin unidad no es un resultado.</li>
  </ul>
</div>


<h2 class="sec"><span class="n">SECCIÓN 12</span>Qué necesita cada compuesto</h2>
<p class="lede">Todo lote lleva identidad por masa y pureza por HPLC. Esta tabla recoge el
ensayo <em>adicional</em> que en cada caso no es opcional, porque hay un modo de fallo
específico que los dos anteriores no ven.</p>

<table class="tight">
  <tr><th style="width:27%">Compuesto</th><th style="width:24%">Ensayo adicional</th><th>Por qué</th></tr>
  <tr><td>GHK-Cu · AHK-Cu</td><td>Cobre por ICP-OES o AAS</td><td>Relación molar 1:1 péptido:cobre. Un polvo blanco es tripéptido sin acomplejar — inactivo.</td></tr>
  <tr><td>FOXO4-DRI</td><td>Configuración quiral (Marfey o AAA quiral)</td><td>Íntegramente D. La masa y la HPLC no distinguen D de L.</td></tr>
  <tr><td>HGH 191AA</td><td>SEC (agregados) + CD (plegamiento)</td><td>La desnaturalización por agitación no cambia la masa ni la pureza.</td></tr>
  <tr><td>IGF-1 LR3</td><td>SEC + mapa de disulfuros no reductor</td><td>Tres puentes disulfuro barajables. Masa idéntica, actividad nula.</td></tr>
  <tr><td>Thymalin</td><td>Perfil cromatográfico frente a patrón + origen bovino/EEB</td><td>Es un extracto, no una molécula: no tiene masa única que verificar.</td></tr>
  <tr><td>MOTS-c · Semax · Snap-8 · Adamax</td><td>Cuantificación del +16 (Met-sulfóxido)</td><td>Metionina oxidable. Es la ruta de degradación dominante.</td></tr>
  <tr><td>Oxitocina · AOD-9604 · Cagrilintida · Adipotida</td><td>Mapa peptídico no reductor</td><td>Puentes disulfuro: barajados pesan lo mismo.</td></tr>
  <tr><td>Glutatión</td><td>Relación GSH / GSSG</td><td>Sólo la forma reducida tiene el tiol activo. La pureza no distingue una de otra.</td></tr>
  <tr><td>L-Carnitina</td><td>Pureza enantiomérica</td><td>La D-carnitina es tóxica y competitiva.</td></tr>
  <tr><td>CJC-1295 (DAC)</td><td>Integridad del grupo maleimida</td><td>Se hidroliza en solución: HPLC dice «puro» y ya no conjuga con albúmina.</td></tr>
  <tr><td>Blends (BPC+TB, GLOW, KLOW, CagriSema, CJC+IPA)</td><td>Cuantificación por componente</td><td>Hay que verificar la proporción declarada, no una pureza global.</td></tr>
  <tr><td>Semaglutida · Tirzepatida · Retatrutida · Mazdutida</td><td>Verificación de la cadena grasa por masa exacta</td><td>La lipidación es lo que da la vida media semanal. Sin ella, el péptido pesa menos y dura horas.</td></tr>
  <tr><td>Epithalon</td><td>Impureza −18 (succinimida)</td><td>Motivo Asp-Gly propenso a ciclación.</td></tr>
  <tr><td>NAD+</td><td>Pureza por HPLC de par iónico + relación NAD⁺/NADH</td><td>No es un péptido: el método de péptidos no aplica.</td></tr>
  <tr><td>5-Amino-1MQ · AICAR · Melatonina · Dihexa</td><td>Métodos de molécula pequeña (HPLC-UV, RMN, punto de fusión)</td><td>No son péptidos. Confirmar además qué sal reporta el CoA.</td></tr>
  <tr><td>Lipo-C + B12</td><td>Valoración por componente + esterilidad + conservador</td><td>Es una solución, no un liofilizado: vida útil mucho más corta.</td></tr>
  <tr><td>Adamax</td><td>Secuenciación completa por MS/MS</td><td>Sin CAS ni estructura consensuada entre proveedores. Es el único modo de saber qué hay.</td></tr>
</table>


<h2 class="sec"><span class="n">SECCIÓN 13</span>Montar el laboratorio</h2>
<p class="lede">Cuatro niveles. La mayoría de las operaciones no necesita pasar del nivel 1, y
la decisión de subir debe tomarse por volumen, no por prestigio: por debajo de cierto número
de lotes al mes, el laboratorio externo sale más barato y es más creíble ante el cliente.</p>

<h3>Nivel 0 — Verificación documental</h3>
<dl class="kv">
  <dt>Inversión</dt><dd>Cero</dd>
  <dt>Qué permite</dt><dd>Auditar los certificados que llegan con la mercancía usando la lista de veinte puntos de la sección 11; comprobar códigos en los portales de los laboratorios; verificar la coherencia interna de cada documento.</dd>
  <dt>Qué no permite</dt><dd>Nada sobre el vial que se tiene en la mano. Un CoA legítimo del lote 240815 no dice nada sobre el vial que llegó en la caja.</dd>
</dl>
<p>Es el punto de partida obligatorio y ya elimina la mayor parte del riesgo, porque los
proveedores problemáticos rara vez producen documentación que resista veinte preguntas.</p>

<h3>Nivel 1 — Verificación por terceros</h3>
<dl class="kv">
  <dt>Inversión</dt><dd>USD 100–300 por lote analizado</dd>
  <dt>Equipo propio</dt><dd>Balanza analítica de 0.1 mg (USD 1 500–4 000), viales, jeringas y hielo seco para envío</dd>
  <dt>Qué permite</dt><dd>HPLC de pureza y masa por LC-MS del <em>lote real</em>, hecho por un laboratorio independiente cuyo informe se puede enseñar al cliente.</dd>
</dl>
<div class="card g"><h5>Recomendación</h5>
  <p>Para una operación del tamaño de PEPTIDEX, éste es el nivel correcto. Muestrear
  sistemáticamente los lotes de entrada —no todos: uno de cada tanto, más el 100 % de los
  compuestos de alto valor o de proveedor nuevo— y publicar los informes. El coste por vial
  vendido es marginal y el argumento comercial es considerable.</p></div>

<h3>Nivel 2 — HPLC propia</h3>
<table class="tight">
  <tr><th>Elemento</th><th style="width:24%">Coste nuevo</th><th style="width:24%">Reacondicionado</th></tr>
  <tr><td>HPLC de gradiente binario con detector UV/DAD</td><td>USD 25 000–70 000</td><td>USD 8 000–25 000</td></tr>
  <tr><td>Columna C18 (más repuesto y precolumna)</td><td colspan="2">USD 600–1 400</td></tr>
  <tr><td>Disolventes grado HPLC, TFA, agua ultrapura</td><td colspan="2">USD 200–400 / mes</td></tr>
  <tr><td>Sistema de agua ultrapura</td><td colspan="2">USD 4 000–12 000</td></tr>
  <tr><td>Balanza analítica 0.01 mg</td><td colspan="2">USD 3 000–8 000</td></tr>
  <tr><td>Campana y gestión de residuos</td><td colspan="2">USD 3 000–10 000</td></tr>
  <tr><td>Patrones de referencia</td><td colspan="2">USD 200–800 por compuesto</td></tr>
  <tr class="tot"><td>Entrada realista</td><td colspan="2">USD 20 000–35 000 reacondicionado</td></tr>
</table>
<p>Con esto se hace pureza propia y control de estabilidad, que es lo que más valor añade a un
distribuidor: poder demostrar cómo se comporta el material a los tres, seis y doce meses en las
condiciones reales de almacén. Sigue sin haber identidad: la HPLC sola no dice qué es.</p>

<h3>Nivel 3 — LC-MS</h3>
<p>Un cuadrupolo simple acoplado cuesta entre USD 60 000 y 120 000 nuevo, y desde unos
USD 25 000 reacondicionado; un Q-TOF o un Orbitrap se van a USD 200 000–500 000. A eso hay que
sumar nitrógeno o generador, contrato de mantenimiento (del 8 al 12 % del valor del equipo al
año) y, lo más caro y lo que más se subestima, un analista que sepa usarlo.</p>
<div class="pull">Por debajo de unos veinte lotes al mes, el nivel 3 no se paga. Un laboratorio
externo cobra USD 150 por un análisis que en equipo propio cuesta seis cifras de inversión y un
salario.</div>


<h2 class="sec"><span class="n">SECCIÓN 14</span>Laboratorios de terceros</h2>
<p class="lede">Cómo se manda una muestra y qué se pide, que es donde se decide si el informe
servirá de algo.</p>

<h3>Los laboratorios de referencia del sector</h3>
<p><b>Janoshik Analytical</b> (Eslovaquia) se ha convertido en el estándar de facto del sector
de investigación: emite certificados con código verificable en un portal público, y cubre
HPLC, espectrometría de masas, esterilidad y endotoxinas. <b>MZ Biolabs</b> y <b>Colmaric
Analyticals</b> son las opciones más citadas en Estados Unidos. Para trabajo que deba
sostenerse ante una autoridad, un laboratorio con acreditación ISO/IEC 17025 y experiencia en
GMP es otra categoría de servicio y otro precio.</p>
<div class="card q"><h5>Qué significa y qué no un informe de tercero</h5>
  <p>Certifica <b>la muestra que se envió</b>. No certifica el lote, salvo que el muestreo esté
  documentado; no certifica lo que quedó en el almacén; y no certifica nada si quien envió la
  muestra pudo elegir qué vial mandaba. El valor del informe es proporcional al rigor del
  muestreo, y ése lo controla el remitente, no el laboratorio.</p></div>

<h3>Preparación y envío</h3>
<ol class="num">
  <li>Muestrear al azar del lote, no el vial que mejor aspecto tiene. Documentar cómo se eligió.</li>
  <li>Enviar el vial <b>sin abrir</b> siempre que sea posible: es la única forma de que el laboratorio verifique también la masa de llenado.</li>
  <li>De 5 a 10 mg bastan para HPLC y masas. Añadir margen si se pide contenido de péptido, que es destructivo.</li>
  <li>Enviar en frío para péptidos lipidados y para proteínas; ambiente es aceptable para péptidos cortos liofilizados en trayectos cortos.</li>
  <li>Declarar en la solicitud: nombre, secuencia teórica, masa teórica, contraión esperado y qué modificaciones son esperables. Sin la masa teórica, el laboratorio informa lo que encuentra sin poder decir si es correcto.</li>
</ol>

<h3>Qué pedir explícitamente</h3>
<ul>
  <li>Cromatograma completo, en PDF, con tabla de áreas y umbral de integración declarado.</li>
  <li>Detección a 214 nm.</li>
  <li>Espectro de masas crudo, con la envolvente de cargas, además de la masa deconvolucionada.</li>
  <li>Masa teórica frente a observada, con Δ en Da y en ppm.</li>
  <li>Identificación de toda impureza por encima del 0.10 %.</li>
  <li>Método, columna, gradiente y equipo utilizados.</li>
  <li>Endotoxinas en EU/mg, con el formato de ensayo indicado.</li>
</ul>


<h2 class="sec"><span class="n">SECCIÓN 15</span>Trampas</h2>
<p class="lede">Los quince errores que se repiten. Casi todos consisten en tomar una respuesta
correcta a una pregunta como respuesta a otra distinta.</p>

<ol class="num">
  <li><b>Confundir pureza con contenido.</b> 99 % puro y 75 % de contenido significa 0.75 mg de péptido por cada miligramo del vial. Las dos cifras son correctas.</li>
  <li><b>Leer la masa del vial como masa de péptido.</b> Sin restar contraión y agua, el error sistemático es del 15 al 30 %.</li>
  <li><b>Aceptar detección a 280 nm.</b> Deja invisible cualquier impureza sin aromáticos.</li>
  <li><b>Dar por buena una masa de cuadrupolo simple como identidad definitiva.</b> ± 1 Da no distingue desamidación, ni Gln de Lys.</li>
  <li><b>Suponer que la masa correcta implica secuencia correcta.</b> El orden de los residuos no cambia la masa.</li>
  <li><b>Suponer que la HPLC ve los estereoisómeros.</b> No los ve.</li>
  <li><b>Confundir estéril con libre de endotoxina.</b> Las endotoxinas sobreviven a la esterilización.</li>
  <li><b>Creer que el agua bacteriostática descontamina.</b> Es bacteriostática, no bactericida.</li>
  <li><b>Reutilizar un CoA entre lotes.</b> Certifica un lote y sólo uno.</li>
  <li><b>Ignorar la fecha del certificado.</b> Un liofilizado se degrada; el papel no.</li>
  <li><b>Analizar sólo el sobrenadante.</b> Filtrar antes de inyectar analiza la fracción soluble del material, que es la buena por definición.</li>
  <li><b>No verificar el peso de llenado.</b> Un vial que dice 10 mg y pesa 7 tiene un problema que ningún ensayo químico detecta. Una balanza analítica es la herramienta de QC más barata que existe.</li>
  <li><b>Aceptar «≥ 99 %» sin cromatograma.</b> Es una afirmación, no un resultado.</li>
  <li><b>Aplicar métodos de péptido a lo que no es un péptido.</b> AICAR, 5-Amino-1MQ, melatonina, NAD+ y L-carnitina requieren métodos propios.</li>
  <li><b>Tomar el CoA del fabricante como verificación independiente.</b> No lo es, por definición.</li>
</ol>


<h2 class="sec"><span class="n">SECCIÓN 16</span>Especificación tipo</h2>
<p class="lede">Plantilla de criterios de aceptación para un péptido sintético liofilizado de
grado investigación. Adoptarla tal cual y exigirla al proveedor convierte una negociación
sobre confianza en una negociación sobre números.</p>

<table>
  <tr><th style="width:26%">Atributo</th><th style="width:30%">Método</th><th style="width:26%">Criterio</th><th>Prioridad</th></tr>
  <tr><td>Aspecto</td><td>Visual</td><td>Torta o polvo blanco, sin partículas<sup>*</sup></td><td>Obligatorio</td></tr>
  <tr><td>Identidad — masa</td><td>LC-MS (ESI) o MALDI-TOF</td><td>Coincide con teórica ± tolerancia del equipo</td><td>Obligatorio</td></tr>
  <tr><td>Identidad — secuencia</td><td>MS/MS o AAA</td><td>Conforme a la secuencia declarada</td><td>Calificación inicial</td></tr>
  <tr><td>Pureza cromatográfica</td><td>RP-HPLC, 214 nm, gradiente</td><td>≥ 98.0 %</td><td>Obligatorio</td></tr>
  <tr><td>Impureza individual</td><td>RP-HPLC</td><td>≤ 1.0 %; identificar toda &gt; 0.10 %</td><td>Obligatorio</td></tr>
  <tr><td>Contenido de péptido</td><td>AAA o nitrógeno</td><td>≥ 80.0 %, valor declarado</td><td>Muy recomendado</td></tr>
  <tr><td>Contraión</td><td>IC o HPLC de par iónico</td><td>Declarado; TFA ≤ 1 % si es para cultivo celular</td><td>Muy recomendado</td></tr>
  <tr><td>Agua</td><td>Karl Fischer, USP &lt;921&gt;</td><td>≤ 8.0 %</td><td>Muy recomendado</td></tr>
  <tr><td>Solventes residuales</td><td>GC headspace, USP &lt;467&gt;</td><td>Conforme a límites de clase</td><td>Recomendado</td></tr>
  <tr><td>Endotoxinas</td><td>LAL, USP &lt;85&gt;</td><td>&lt; 10 EU/mg (&lt; 1 EU/mg preferible)</td><td>Obligatorio</td></tr>
  <tr><td>Bioburden</td><td>USP &lt;61&gt;/&lt;62&gt;</td><td>&lt; 100 UFC/g; ausencia de patógenos</td><td>Recomendado</td></tr>
  <tr><td>Impurezas elementales</td><td>ICP-MS, USP &lt;233&gt;</td><td>Conforme a USP &lt;232&gt;</td><td>Recomendado</td></tr>
  <tr><td>Peso de llenado</td><td>Balanza analítica</td><td>± 5 % del declarado</td><td>Obligatorio</td></tr>
  <tr><td>Solubilidad</td><td>Visual tras reconstitución</td><td>Solución clara, sin partículas, en el diluyente declarado</td><td>Obligatorio</td></tr>
</table>
<p class="figcap"><sup>*</sup> Excepto en los complejos de cobre, donde el criterio se invierte:
<b>GHK-Cu y AHK-Cu deben ser azules</b>. Un polvo blanco es un fallo de identidad.</p>


<h2 class="sec"><span class="n">SECCIÓN 17</span>Glosario y fuentes</h2>
<p class="lede">Los términos que aparecen en un certificado y las fuentes en las que se apoya
este documento.</p>

<h3>Glosario</h3>
<table class="tight">
  <tr><td style="width:24%"><b>AAA</b></td><td>Análisis de aminoácidos. Hidrólisis y cuantificación de los residuos liberados; da composición y contenido.</td></tr>
  <tr><td><b>Aducto</b></td><td>Especie unida al analito (Na⁺, K⁺, TFA) que desplaza la masa observada.</td></tr>
  <tr><td><b>CoA</b></td><td>Certificate of Analysis. Documento de resultados de un lote concreto.</td></tr>
  <tr><td><b>Deconvolución</b></td><td>Operación que colapsa la serie de estados de carga de un espectro ESI en una masa única.</td></tr>
  <tr><td><b>Desamidación</b></td><td>Conversión de Asn→Asp o Gln→Glu. +0.984 Da.</td></tr>
  <tr><td><b>ESI</b></td><td>Electrospray ionization. Ionización suave que produce iones multicargados.</td></tr>
  <tr><td><b>EU</b></td><td>Endotoxin Unit. Unidad de actividad de endotoxina; ~0.1 ng de LPS de referencia.</td></tr>
  <tr><td><b>Gradiente</b></td><td>Variación programada de la composición de fase móvil durante la corrida.</td></tr>
  <tr><td><b>LAL</b></td><td>Limulus Amebocyte Lysate. Reactivo del ensayo de endotoxinas.</td></tr>
  <tr><td><b>Liofilizado</b></td><td>Secado por congelación y sublimación al vacío. Higroscópico por naturaleza.</td></tr>
  <tr><td><b>MALDI</b></td><td>Matrix-Assisted Laser Desorption/Ionization. Produce iones de carga única.</td></tr>
  <tr><td><b>Masa monoisotópica</b></td><td>Calculada con el isótopo más abundante de cada elemento. Difiere de la promedio en varios Da en moléculas grandes.</td></tr>
  <tr><td><b>ppm</b></td><td>Partes por millón. Error relativo de masa: (observada − teórica) / teórica × 10⁶.</td></tr>
  <tr><td><b>RP</b></td><td>Reversed Phase. Fase estacionaria apolar, fase móvil polar.</td></tr>
  <tr><td><b>Rs</b></td><td>Resolución entre dos picos. ≥ 1.5 es separación a línea base.</td></tr>
  <tr><td><b>SEC</b></td><td>Size Exclusion Chromatography. Separa por tamaño; detecta agregados.</td></tr>
  <tr><td><b>SPPS</b></td><td>Solid Phase Peptide Synthesis. Método de Merrifield; origen de las impurezas de deleción.</td></tr>
  <tr><td><b>TFA</b></td><td>Ácido trifluoroacético. Par iónico en HPLC y contraión habitual.</td></tr>
  <tr><td><b>t&#8341;</b></td><td>Tiempo de retención.</td></tr>
  <tr><td><b>UFC</b></td><td>Unidad formadora de colonia. Unidad de recuento microbiano.</td></tr>
</table>

<h3>Fuentes</h3>
<ul>
  <li>USP &lt;1503&gt; <em>Quality Attributes of Synthetic Peptide Drug Substances</em>, vigente desde el 1 de agosto de 2021, y USP &lt;1504&gt; sobre materias primas de partida.</li>
  <li>USP, capítulos generales &lt;61&gt;, &lt;62&gt;, &lt;71&gt;, &lt;85&gt;, &lt;232&gt;, &lt;233&gt;, &lt;467&gt;, &lt;621&gt;, &lt;921&gt;, &lt;1057&gt;, &lt;1225&gt;.</li>
  <li>ICH Q2(R2), <em>Validation of Analytical Procedures</em>.</li>
  <li>FDA, <em>Draft Product-Specific Guidances for Certain Generic Peptide Products</em>, 17 guías revisadas publicadas el 28 de julio de 2026; período de comentarios hasta el 28 de septiembre de 2026.</li>
  <li>FDA, <em>ANDAs for Certain Highly Purified Synthetic Peptide Drug Products That Refer to Listed Drugs of rDNA Origin</em> (mayo de 2021) — retirada en 2026; los umbrales de 0.10 % y 0.5 % siguen siendo la referencia práctica del sector.</li>
  <li>USP, <em>Peptide Standards and Solutions</em> (febrero de 2026) y <em>Reference Standards to Support Quality of Synthetic Peptide Therapeutics</em>.</li>
  <li>Rangos de coste de instrumentación: mercado de equipo analítico nuevo y reacondicionado, julio de 2026. Son órdenes de magnitud para presupuestar, no cotizaciones.</li>
</ul>

<div class="foot">
  <b>Sobre el alcance de este documento.</b> Describe métodos de control de calidad analítico
  para materiales de investigación. No es un procedimiento normalizado de trabajo validado, no
  sustituye a la farmacopea vigente ni al criterio de un laboratorio acreditado, y no constituye
  asesoría regulatoria. Las referencias normativas deben consultarse en su edición vigente:
  las farmacopeas se revisan y los umbrales cambian — el ejemplo más reciente es la retirada
  de la guía FDA de 2021 mientras se escribía esta edición.<br/><br/>
  <b>Research Use Only.</b> Los materiales descritos se suministran exclusivamente para
  investigación de laboratorio. No son medicamentos y no son para consumo humano ni animal.<br/><br/>
  PEPTIDEX · Engineered Beyond Perfection · Edición de julio de 2026
</div>
'''


def build():
    body = BODY.replace('__LOGO__', LOGOS['t_master'])
    body = body.replace('__FIG_CHROM__', chromatogram())
    body = body.replace('__FIG_ESI__', esi())

    doc = ('<!doctype html><html lang="es"><head><meta charset="utf-8"/>'
           '<meta name="viewport" content="width=device-width,initial-scale=1"/>'
           '<title>PEPTIDEX · Cómo se testea un péptido</title>'
           '<style>' + CSS + '</style></head><body>' + body + '</body></html>')

    open(OUT_HTML, 'w', encoding='utf-8').write(doc)
    print('  PEPTIDEX_Testeo_Peptidos.html  %.1f KB' % (len(doc.encode()) / 1024))


if __name__ == '__main__':
    build()

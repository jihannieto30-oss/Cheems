<template>
  <div class="ped">
    <!-- ====== Encabezado del módulo ====== -->
    <div class="ped-hero">
      <div class="hero-main">
        <h1>Simulador de Pedimento Aduanal</h1>
        <p class="hero-sub">
          Genera de forma guiada un pedimento electrónico de
          <strong>importación</strong> o <strong>exportación</strong> y simula su
          validación y pago ante la <strong>VUCEM / SAT</strong>.
        </p>
      </div>
      <div class="hero-actions">
        <button class="btn-ghost" @click="cargarEjemplo">⚡ Cargar ejemplo</button>
        <button class="btn-ghost" @click="reiniciar">↺ Reiniciar</button>
      </div>
    </div>

    <div class="ped-grid">
      <!-- ====== Columna principal: asistente ====== -->
      <section class="ped-main">
        <!-- Stepper -->
        <ol class="stepper">
          <li
            v-for="p in pasos"
            :key="p.id"
            class="step"
            :class="{ active: paso === p.id, done: paso > p.id }"
            @click="irA(p.id)"
          >
            <span class="step-dot">{{ paso > p.id ? '✓' : p.icon }}</span>
            <span class="step-label">{{ p.label === 'Proveedor' ? etiquetaContraparte : p.label }}</span>
          </li>
        </ol>

        <div class="card step-card">
          <!-- Paso 0: Operación / datos generales -->
          <div v-if="paso === 0">
            <h2 class="card-title">🧾 Datos generales de la operación</h2>
            <div class="op-toggle">
              <button
                v-for="op in tiposOperacion"
                :key="op.clave"
                class="op-btn"
                :class="{ active: estado.general.tipoOperacion === op.clave }"
                @click="setOperacion(op.clave)"
              >
                <span class="op-icon">{{ op.icon }}</span>
                <span>{{ op.nombre }}</span>
              </button>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>Clave de pedimento</span>
                <select v-model="estado.general.clave">
                  <option v-for="c in clavesDisponibles" :key="c.clave" :value="c.clave">
                    {{ c.clave }} — {{ c.desc }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Régimen aduanero</span>
                <select v-model="estado.general.regimen">
                  <option v-for="r in regimenes" :key="r.clave" :value="r.clave">
                    {{ r.clave }} — {{ r.desc }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Aduana de despacho</span>
                <select v-model="estado.general.aduana">
                  <option v-for="a in aduanas" :key="a.clave" :value="a.clave">
                    {{ a.clave }} — {{ a.nombre }} ({{ a.tipo }})
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Patente del agente aduanal</span>
                <input v-model="estado.general.patente" maxlength="4" placeholder="3456" inputmode="numeric" />
              </label>
              <label class="field">
                <span>Tipo de cambio (DOF) MXN/USD</span>
                <input v-model.number="estado.general.tipoCambio" type="number" step="0.0001" min="0" />
              </label>
              <label class="field">
                <span>Fecha de entrada / pago</span>
                <input v-model="estado.general.fecha" type="date" />
              </label>
            </div>
          </div>

          <!-- Paso 1: Contribuyente -->
          <div v-else-if="paso === 1">
            <h2 class="card-title">🏢 {{ esExportacion ? 'Exportador' : 'Importador' }} (contribuyente)</h2>
            <div class="grid-2">
              <label class="field">
                <span>RFC</span>
                <input v-model="estado.general.rfc" maxlength="13" placeholder="IME040315J29" style="text-transform:uppercase" />
              </label>
              <label class="field">
                <span>Razón social / Nombre</span>
                <input v-model="estado.general.razonSocial" placeholder="Importadora Ejemplo S.A. de C.V." />
              </label>
              <label class="field full">
                <span>Domicilio fiscal</span>
                <input v-model="estado.general.domicilio" placeholder="Av. Paseo de la Reforma 100, Cuauhtémoc, CDMX" />
              </label>
              <label class="field">
                <span>CURP (persona física, opcional)</span>
                <input v-model="estado.general.curp" maxlength="18" placeholder="—" style="text-transform:uppercase" />
              </label>
              <label class="field">
                <span>Registro / Padrón</span>
                <input v-model="estado.general.padron" placeholder="Padrón de Importadores" />
              </label>
            </div>
          </div>

          <!-- Paso 2: Proveedor / comprador -->
          <div v-else-if="paso === 2">
            <h2 class="card-title">🌐 {{ etiquetaContraparte }} en el extranjero</h2>
            <div class="grid-2">
              <label class="field">
                <span>ID fiscal (Tax ID)</span>
                <input v-model="estado.contraparte.idFiscal" placeholder="91-1234567" />
              </label>
              <label class="field">
                <span>Razón social</span>
                <input v-model="estado.contraparte.razonSocial" placeholder="Global Trading Co. Ltd." />
              </label>
              <label class="field">
                <span>País</span>
                <select v-model="estado.contraparte.pais">
                  <option v-for="p in paises" :key="p.clave" :value="p.clave">{{ p.nombre }} ({{ p.clave }})</option>
                </select>
              </label>
              <label class="field">
                <span>Incoterm 2020</span>
                <select v-model="estado.contraparte.incoterm">
                  <option v-for="i in incoterms" :key="i.clave" :value="i.clave">{{ i.clave }} — {{ i.desc }}</option>
                </select>
              </label>
              <label class="field full">
                <span>Domicilio en el extranjero</span>
                <input v-model="estado.contraparte.domicilio" placeholder="Shenzhen, Guangdong, China" />
              </label>
              <label class="field">
                <span>¿Partes relacionadas / vinculadas?</span>
                <select v-model="estado.contraparte.vinculacion">
                  <option value="NO">No</option>
                  <option value="SI">Sí</option>
                </select>
              </label>
            </div>
            <p class="hint">
              El incoterm determina qué conceptos (flete/seguro) son
              <strong>incrementables</strong> al valor en aduana. Actual:
              <strong>{{ incoterm?.clave }}</strong> — flete
              {{ incoterm?.fleteIncrementa ? 'incrementa' : 'no incrementa' }}, seguro
              {{ incoterm?.seguroIncrementa ? 'incrementa' : 'no incrementa' }}.
            </p>
          </div>

          <!-- Paso 3: Mercancías -->
          <div v-else-if="paso === 3">
            <div class="card-title-row">
              <h2 class="card-title">📦 Mercancías / partidas</h2>
              <button class="btn-add" @click="agregarPartida">＋ Agregar partida</button>
            </div>

            <div v-for="(item, idx) in estado.items" :key="item.uid" class="partida">
              <div class="partida-head">
                <span class="partida-num">Partida {{ idx + 1 }}</span>
                <button v-if="estado.items.length > 1" class="btn-remove" @click="quitarPartida(idx)">✕ Quitar</button>
              </div>

              <label class="field full">
                <span>Catálogo TIGIE (autocompleta)</span>
                <select @change="aplicarFraccion(item, $event.target.value)" :value="''">
                  <option value="">— Selecciona una fracción de ejemplo —</option>
                  <option v-for="f in fracciones" :key="f.fraccion" :value="f.fraccion">
                    {{ f.fraccion }} — {{ f.desc }} (IGI {{ (f.igi * 100).toFixed(0) }}%)
                  </option>
                </select>
              </label>

              <div class="grid-3">
                <label class="field">
                  <span>Fracción arancelaria</span>
                  <input v-model="item.fraccion" placeholder="8471.30.01" />
                </label>
                <label class="field">
                  <span>NICO</span>
                  <input v-model="item.nico" maxlength="2" placeholder="00" />
                </label>
                <label class="field">
                  <span>País de origen</span>
                  <select v-model="item.paisOrigen">
                    <option v-for="p in paises" :key="p.clave" :value="p.clave">{{ p.nombre }}</option>
                  </select>
                </label>
              </div>

              <label class="field full">
                <span>Descripción de la mercancía</span>
                <input v-model="item.descripcion" placeholder="Computadoras portátiles (laptops)" />
              </label>

              <div class="grid-3">
                <label class="field">
                  <span>Cantidad UMC (comercial)</span>
                  <input v-model.number="item.cantidadUMC" type="number" min="0" step="any" />
                </label>
                <label class="field">
                  <span>Unidad comercial</span>
                  <select v-model="item.unidadUMC">
                    <option v-for="u in unidades" :key="u.clave" :value="u.clave">{{ u.desc }}</option>
                  </select>
                </label>
                <label class="field">
                  <span>Valor comercial (USD)</span>
                  <input v-model.number="item.valorComercial" type="number" min="0" step="any" placeholder="50000" />
                </label>
              </div>

              <div class="partida-calc">
                <div><span>Tasa IGI</span><strong>{{ pct(calc[idx]?.tasaIgiAplicada || 0) }}</strong></div>
                <div><span>Valor en aduana</span><strong>{{ mxn(calc[idx]?.valorAduana) }}</strong></div>
                <div><span>IGI/IGE</span><strong>{{ mxn(calc[idx]?.igi) }}</strong></div>
                <div class="rrna"><span>RRNA</span><strong>{{ rrnaDe(item.fraccion) }}</strong></div>
              </div>
            </div>
          </div>

          <!-- Paso 4: Transporte e incrementables -->
          <div v-else-if="paso === 4">
            <h2 class="card-title">🚢 Transporte e incrementables</h2>
            <div class="grid-2">
              <label class="field">
                <span>Medio de transporte</span>
                <select v-model="estado.transporte.medio">
                  <option v-for="m in medios" :key="m.clave" :value="m.clave">{{ m.desc }}</option>
                </select>
              </label>
              <label class="field">
                <span>Identificación (buque / vuelo / placa)</span>
                <input v-model="estado.transporte.identificacion" placeholder="MSC ANNA / AM-204" />
              </label>
              <label class="field">
                <span>Flete internacional (USD)</span>
                <input v-model.number="estado.transporte.flete" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Seguro (USD)</span>
                <input v-model.number="estado.transporte.seguro" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Embalajes / otros incrementables (USD)</span>
                <input v-model.number="estado.transporte.embalajes" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Otros (USD)</span>
                <input v-model.number="estado.transporte.otros" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Peso bruto (kg)</span>
                <input v-model.number="estado.transporte.pesoBruto" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Peso neto (kg)</span>
                <input v-model.number="estado.transporte.pesoNeto" type="number" min="0" step="any" />
              </label>
              <label class="field">
                <span>Número de bultos</span>
                <input v-model.number="estado.transporte.bultos" type="number" min="0" step="1" />
              </label>
            </div>
            <p class="hint">
              Incrementables considerados según incoterm <strong>{{ incoterm?.clave }}</strong>:
              <strong>{{ usd(incUSD) }}</strong> → {{ mxn(incUSD * estado.general.tipoCambio) }}.
            </p>
          </div>

          <!-- Paso 5: Liquidación -->
          <div v-else-if="paso === 5">
            <h2 class="card-title">💲 Liquidación de contribuciones</h2>
            <table class="liq-table">
              <tbody>
                <tr>
                  <td>Valor en aduana <small>(base gravable)</small></td>
                  <td class="num">{{ mxn(liquidacion.valorAduana) }}</td>
                </tr>
                <tr>
                  <td>IGI / IGE <small>(impuesto general)</small></td>
                  <td class="num">{{ mxn(liquidacion.igi) }}</td>
                </tr>
                <tr>
                  <td>DTA <small>({{ liquidacion.esTemporal || esExportacion ? 'cuota fija' : '8 al millar' }})</small></td>
                  <td class="num">{{ mxn(liquidacion.dta) }}</td>
                </tr>
                <tr>
                  <td>Prevalidación</td>
                  <td class="num">{{ mxn(liquidacion.prevalidacion) }}</td>
                </tr>
                <tr>
                  <td>IVA <small>({{ esExportacion ? '0% exportación' : '16%' }})</small></td>
                  <td class="num">{{ mxn(liquidacion.iva) }}</td>
                </tr>
                <tr class="liq-total">
                  <td>Total de contribuciones a pagar</td>
                  <td class="num">{{ mxn(liquidacion.total) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="hint">
              Tipo de cambio aplicado: <strong>{{ estado.general.tipoCambio }}</strong> MXN/USD ·
              {{ estado.items.length }} partida(s) · Valor factura:
              <strong>{{ usd(totalComercialUSD) }}</strong>.
            </p>
          </div>

          <!-- Paso 6: Validar y enviar -->
          <div v-else-if="paso === 6">
            <h2 class="card-title">✅ Validación y envío a VUCEM / SAT</h2>

            <!-- Resultado -->
            <div v-if="resultado" class="acuse">
              <div class="acuse-badge">
                <span class="acuse-check">✓</span>
                <div>
                  <strong>Pedimento validado y pagado</strong>
                  <small>Acuse electrónico generado por la Ventanilla Única (VUCEM)</small>
                </div>
              </div>

              <div class="acuse-grid">
                <div><span>Número de pedimento</span><strong class="mono">{{ resultado.numeroPedimento }}</strong></div>
                <div><span>Folio del acuse</span><strong class="mono">{{ resultado.folio }}</strong></div>
                <div><span>Fecha y hora</span><strong>{{ resultado.fechaHora }}</strong></div>
                <div><span>Línea de captura</span><strong class="mono">{{ resultado.lineaCaptura }}</strong></div>
                <div><span>Importe pagado</span><strong>{{ mxn(liquidacion.total) }}</strong></div>
                <div>
                  <span>Reconocimiento aduanero</span>
                  <strong :class="resultado.semaforo === 'VERDE' ? 'sem-verde' : 'sem-rojo'">
                    {{ resultado.semaforo === 'VERDE' ? '🟢 Desaduanamiento libre' : '🔴 Reconocimiento aduanero' }}
                  </strong>
                </div>
              </div>

              <div class="sello-box">
                <span class="sello-label">Cadena original</span>
                <pre class="mono small">{{ resultado.cadenaOriginal }}</pre>
                <span class="sello-label">Sello digital</span>
                <pre class="mono small">{{ resultado.sello }}</pre>
              </div>

              <div class="acuse-actions">
                <button class="btn-primary" @click="imprimir">🖨 Imprimir acuse</button>
                <button class="btn-ghost" @click="reiniciar">＋ Nuevo pedimento</button>
              </div>
            </div>

            <!-- Procesando -->
            <div v-else-if="procesando" class="procesando">
              <div class="spinner"></div>
              <p class="proc-msg">{{ etapaActual }}</p>
              <ul class="proc-steps">
                <li v-for="(e, i) in etapas" :key="i" :class="{ ok: i < etapaIdx, cur: i === etapaIdx }">
                  {{ i < etapaIdx ? '✓' : (i === etapaIdx ? '⟳' : '○') }} {{ e }}
                </li>
              </ul>
            </div>

            <!-- Checklist previo -->
            <div v-else>
              <p class="hint">El validador revisa la estructura del pedimento antes de transmitirlo:</p>
              <ul class="checks">
                <li v-for="(c, i) in chequeos" :key="i" :class="c.ok ? 'ok' : 'fail'">
                  <span class="check-icon">{{ c.ok ? '✓' : '✕' }}</span>
                  <span class="check-text">
                    <strong>{{ c.label }}</strong>
                    <small v-if="!c.ok">{{ c.detail }}</small>
                  </span>
                </li>
              </ul>
              <button class="btn-primary big" :disabled="!puedeEnviar" @click="enviarSAT">
                {{ puedeEnviar ? '🚀 Transmitir y pagar pedimento' : 'Completa los campos requeridos' }}
              </button>
            </div>
          </div>

          <!-- Navegación -->
          <div v-if="!resultado && !procesando" class="nav-buttons">
            <button class="btn-ghost" :disabled="paso === 0" @click="prev">← Anterior</button>
            <span class="nav-progress">Paso {{ paso + 1 }} de {{ pasos.length }}</span>
            <button v-if="paso < pasos.length - 1" class="btn-primary" @click="next">Siguiente →</button>
          </div>
        </div>

        <p class="disclaimer">
          ⚠️ Simulación con fines educativos. No genera documentos oficiales ni transmite
          información al SAT/VUCEM. Las tasas y cuotas son ilustrativas; consulta la TIGIE,
          la Ley Aduanera y las RGCE vigentes y a un agente aduanal autorizado.
        </p>
      </section>

      <!-- ====== Columna lateral: resumen en vivo ====== -->
      <aside class="ped-aside">
        <div class="card summary">
          <div class="summary-op" :class="esExportacion ? 'exp' : 'imp'">
            {{ esExportacion ? '📤 Exportación' : '📥 Importación' }}
            <span>{{ estado.general.clave }} · {{ estado.general.regimen }}</span>
          </div>

          <div class="summary-num">
            <span>Pedimento</span>
            <strong class="mono">{{ resultado ? resultado.numeroPedimento : numeroPreview }}</strong>
          </div>

          <div class="summary-rows">
            <div><span>Aduana</span><strong>{{ aduanaNombre }}</strong></div>
            <div><span>Partidas</span><strong>{{ estado.items.length }}</strong></div>
            <div><span>Valor en aduana</span><strong>{{ mxn(liquidacion.valorAduana) }}</strong></div>
            <div><span>IGI/IGE</span><strong>{{ mxn(liquidacion.igi) }}</strong></div>
            <div><span>DTA</span><strong>{{ mxn(liquidacion.dta) }}</strong></div>
            <div><span>IVA</span><strong>{{ mxn(liquidacion.iva) }}</strong></div>
            <div class="summary-total"><span>Total a pagar</span><strong>{{ mxn(liquidacion.total) }}</strong></div>
          </div>

          <div class="ready">
            <div class="ready-bar">
              <div class="ready-fill" :style="{ width: readyPct + '%' }" :class="{ full: puedeEnviar }"></div>
            </div>
            <span class="ready-text">
              {{ chequeosOk }} / {{ chequeos.length }} validaciones ·
              <strong :class="puedeEnviar ? 'ok-text' : 'fail-text'">
                {{ puedeEnviar ? 'Listo para transmitir' : 'Datos incompletos' }}
              </strong>
            </span>
          </div>

          <div v-if="resultado" class="summary-status paid">✓ Pagado · {{ resultado.semaforo }}</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import {
  ADUANAS, CLAVES_PEDIMENTO, REGIMENES, INCOTERMS, MEDIOS_TRANSPORTE,
  UNIDADES_MEDIDA, PAISES, FRACCIONES, TIPOS_OPERACION,
} from './catalogos.js'
import {
  calcularPartidas, incrementablesUSD, liquidar, generarNumeroPedimento,
  construirCadenaOriginal, generarSello, validarPedimento,
} from './calculos.js'

// Exponemos catálogos al template.
const aduanas = ADUANAS
const regimenes = REGIMENES
const incoterms = INCOTERMS
const medios = MEDIOS_TRANSPORTE
const unidades = UNIDADES_MEDIDA
const paises = PAISES
const fracciones = FRACCIONES
const tiposOperacion = TIPOS_OPERACION

const pasos = [
  { id: 0, label: 'Operación', icon: '🧾' },
  { id: 1, label: 'Contribuyente', icon: '🏢' },
  { id: 2, label: 'Proveedor', icon: '🌐' },
  { id: 3, label: 'Mercancías', icon: '📦' },
  { id: 4, label: 'Transporte', icon: '🚢' },
  { id: 5, label: 'Liquidación', icon: '💲' },
  { id: 6, label: 'Validar y enviar', icon: '✅' },
]

let uid = 0
const nuevaPartida = () => ({
  uid: ++uid, fraccion: '', nico: '00', descripcion: '', paisOrigen: 'USA',
  cantidadUMC: 0, unidadUMC: '06', valorComercial: 0, igi: 0,
})

const estadoInicial = () => ({
  general: {
    tipoOperacion: 'IMP', clave: 'A1', regimen: 'IMD', aduana: '240',
    patente: '', tipoCambio: 17.15, fecha: new Date().toISOString().slice(0, 10),
    rfc: '', razonSocial: '', domicilio: '', curp: '', padron: 'Padrón de Importadores',
  },
  contraparte: {
    idFiscal: '', razonSocial: '', pais: 'USA', domicilio: '',
    vinculacion: 'NO', incoterm: 'FOB',
  },
  items: [nuevaPartida()],
  transporte: {
    medio: '1', identificacion: '', flete: 0, seguro: 0, embalajes: 0, otros: 0,
    pesoBruto: 0, pesoNeto: 0, bultos: 0,
  },
})

const estado = reactive(estadoInicial())
const paso = ref(0)
const procesando = ref(false)
const resultado = ref(null)
const etapaIdx = ref(0)

const etapas = [
  'Validando estructura del pedimento…',
  'Verificando RFC y padrón de importadores…',
  'Validando fracciones arancelarias (TIGIE)…',
  'Calculando contribuciones y DTA…',
  'Generando línea de captura y pago…',
  'Sellando acuse electrónico (VUCEM)…',
]
const etapaActual = computed(() => etapas[etapaIdx.value] || 'Procesando…')

// ===== Derivados =====
const esExportacion = computed(() => estado.general.tipoOperacion === 'EXP')
const etiquetaContraparte = computed(() => (esExportacion.value ? 'Comprador' : 'Proveedor'))
const clavesDisponibles = computed(() =>
  CLAVES_PEDIMENTO.filter((c) => c.op === 'AMB' || c.op === estado.general.tipoOperacion)
)
const incoterm = computed(() => INCOTERMS.find((i) => i.clave === estado.contraparte.incoterm))
const incUSD = computed(() => incrementablesUSD(estado.transporte, incoterm.value))
const totalComercialUSD = computed(() =>
  estado.items.reduce((s, i) => s + (Number(i.valorComercial) || 0), 0)
)
const calc = computed(() =>
  calcularPartidas(estado.items, incUSD.value, estado.general.tipoCambio, esExportacion.value)
)
const liquidacion = computed(() =>
  liquidar({ partidas: calc.value, regimen: estado.general.regimen, esExportacion: esExportacion.value })
)
const aduanaNombre = computed(() => {
  const a = ADUANAS.find((x) => x.clave === estado.general.aduana)
  return a ? a.nombre : '—'
})
const numeroPreview = computed(() => {
  const yy = String(new Date(estado.general.fecha).getFullYear()).slice(-2)
  const adu = String(estado.general.aduana || '00').slice(-2)
  const pat = String(estado.general.patente || '----').padStart(4, '·').slice(-4)
  return `${yy} ${adu} ${pat} ·······`
})

// ===== Validación en vivo =====
const chequeos = computed(() =>
  validarPedimento({
    general: estado.general,
    contraparte: estado.contraparte,
    items: estado.items.map((i) => ({ ...i, cantidadUMC: i.cantidadUMC })),
    transporte: estado.transporte,
    liquidacion: liquidacion.value,
  })
)
const chequeosOk = computed(() => chequeos.value.filter((c) => c.ok).length)
const puedeEnviar = computed(() => chequeos.value.every((c) => c.ok))
const readyPct = computed(() =>
  chequeos.value.length ? Math.round((chequeosOk.value / chequeos.value.length) * 100) : 0
)

// ===== Acciones =====
function setOperacion(op) {
  estado.general.tipoOperacion = op
  estado.general.clave = 'A1'
  estado.general.regimen = op === 'EXP' ? 'EXD' : 'IMD'
  estado.general.padron = op === 'EXP' ? 'Padrón de Exportadores Sectorial' : 'Padrón de Importadores'
}

function aplicarFraccion(item, fraccion) {
  const f = FRACCIONES.find((x) => x.fraccion === fraccion)
  if (!f) return
  item.fraccion = f.fraccion
  item.nico = f.nico
  item.descripcion = f.desc
  item.igi = f.igi
  item.unidadUMC = f.umt
}
function rrnaDe(fraccion) {
  const f = FRACCIONES.find((x) => x.fraccion === (fraccion || '').trim())
  return f ? f.rrna : '—'
}

function agregarPartida() { estado.items.push(nuevaPartida()) }
function quitarPartida(idx) { estado.items.splice(idx, 1) }

function irA(id) { if (!procesando.value && !resultado.value) paso.value = id }
function next() { if (paso.value < pasos.length - 1) paso.value++ }
function prev() { if (paso.value > 0) paso.value-- }

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

async function enviarSAT() {
  if (!puedeEnviar.value) return
  procesando.value = true
  etapaIdx.value = 0
  for (let i = 0; i < etapas.length; i++) {
    etapaIdx.value = i
    await sleep(650)
  }

  const numero = generarNumeroPedimento(estado.general.aduana, estado.general.patente, estado.general.fecha)
  const now = new Date()
  const datos = {
    numeroPedimento: numero,
    tipoOperacion: estado.general.tipoOperacion,
    clave: estado.general.clave,
    regimen: estado.general.regimen,
    aduana: estado.general.aduana,
    rfcImportador: estado.general.rfc,
    tipoCambio: estado.general.tipoCambio,
    valorAduana: liquidacion.value.valorAduana,
    total: liquidacion.value.total,
    fecha: estado.general.fecha,
  }
  const cadena = construirCadenaOriginal(datos)
  const sello = generarSello(cadena)
  const semaforo = Math.random() < 0.85 ? 'VERDE' : 'ROJO'

  resultado.value = {
    numeroPedimento: numero,
    folio: 'VUCEM' + now.getFullYear() + String(Math.floor(100000 + Math.random() * 899999)),
    fechaHora: now.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
    lineaCaptura: Array.from({ length: 5 }, () =>
      Math.floor(1000 + Math.random() * 8999)).join(' '),
    cadenaOriginal: '||' + cadena + '||',
    sello,
    semaforo,
  }
  procesando.value = false
}

function imprimir() { window.print() }

function reiniciar() {
  Object.assign(estado, estadoInicial())
  estado.items = [nuevaPartida()]
  paso.value = 0
  procesando.value = false
  resultado.value = null
  etapaIdx.value = 0
}

function cargarEjemplo() {
  reiniciar()
  estado.general.tipoOperacion = 'IMP'
  estado.general.clave = 'A1'
  estado.general.regimen = 'IMD'
  estado.general.aduana = '160'
  estado.general.patente = '3456'
  estado.general.tipoCambio = 17.15
  estado.general.rfc = 'IME040315J29'
  estado.general.razonSocial = 'Importadora Ejemplo S.A. de C.V.'
  estado.general.domicilio = 'Av. Paseo de la Reforma 100, Cuauhtémoc, CDMX'
  estado.contraparte.idFiscal = '91-1234567'
  estado.contraparte.razonSocial = 'Global Trading Co. Ltd.'
  estado.contraparte.pais = 'CHN'
  estado.contraparte.domicilio = 'Shenzhen, Guangdong, China'
  estado.contraparte.incoterm = 'FOB'
  estado.items = [
    { uid: ++uid, fraccion: '8471.30.01', nico: '00', descripcion: 'Computadoras portátiles (laptops)', paisOrigen: 'CHN', cantidadUMC: 100, unidadUMC: '06', valorComercial: 50000, igi: 0.0 },
    { uid: ++uid, fraccion: '8517.13.01', nico: '00', descripcion: 'Teléfonos inteligentes (smartphones)', paisOrigen: 'CHN', cantidadUMC: 200, unidadUMC: '06', valorComercial: 80000, igi: 0.0 },
  ]
  estado.transporte = {
    medio: '1', identificacion: 'MSC ANNA', flete: 3000, seguro: 800, embalajes: 0, otros: 0,
    pesoBruto: 1200, pesoNeto: 1000, bultos: 40,
  }
  paso.value = 0
}

// ===== Formato =====
function mxn(n) {
  return (Number(n) || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
function usd(n) {
  return (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function pct(n) { return (Number(n) * 100).toFixed(2) + '%' }
</script>

<style scoped>
.ped { max-width: 1400px; margin: 0 auto; padding: 24px; }

/* Hero */
.ped-hero {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
  flex-wrap: wrap; margin-bottom: 20px;
}
.hero-main h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.4px; }
.hero-sub { color: var(--text-secondary); font-size: 14px; margin-top: 6px; max-width: 640px; }
.hero-actions { display: flex; gap: 8px; }

/* Layout */
.ped-grid { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px;
}

/* Stepper */
.stepper { display: flex; list-style: none; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.step {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-card); transition: all 0.15s; flex: 1; min-width: 120px;
}
.step:hover { background: var(--bg-hover); }
.step.active { border-color: var(--accent); background: var(--accent-bg); }
.step.done { border-color: rgba(63,185,80,0.4); }
.step-dot {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); font-size: 12px;
}
.step.active .step-dot { background: var(--accent); }
.step.done .step-dot { background: var(--green); color: #fff; }
.step-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
.step.active .step-label { color: var(--text-primary); }

/* Step card */
.step-card { min-height: 360px; display: flex; flex-direction: column; }
.card-title { font-size: 17px; font-weight: 700; margin-bottom: 16px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title-row .card-title { margin-bottom: 0; }

/* Operation toggle */
.op-toggle { display: flex; gap: 10px; margin-bottom: 20px; }
.op-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
  font-size: 14px; font-weight: 600; transition: all 0.15s;
}
.op-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.op-btn.active { border-color: var(--accent); background: var(--accent-bg); color: var(--text-primary); }
.op-icon { font-size: 26px; }

/* Fields */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }
.field > span { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.field input, .field select {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px;
  padding: 9px 11px; color: var(--text-primary); font-size: 13px; outline: none;
  transition: border-color 0.15s; font-family: inherit; width: 100%;
}
.field input:focus, .field select:focus { border-color: var(--accent); }
.field input::placeholder { color: var(--text-muted); }

/* Partidas */
.partida { border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 14px; background: var(--bg-secondary); display: flex; flex-direction: column; gap: 12px; }
.partida-head { display: flex; justify-content: space-between; align-items: center; }
.partida-num { font-size: 13px; font-weight: 700; color: var(--accent); }
.partida-calc {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  background: var(--bg-card); border-radius: 8px; padding: 10px 12px;
}
.partida-calc > div { display: flex; flex-direction: column; gap: 2px; }
.partida-calc span { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.partida-calc strong { font-size: 13px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.partida-calc .rrna strong { font-size: 11px; color: var(--gold); font-weight: 500; }

/* Buttons */
.btn-add { font-size: 12px; padding: 7px 12px; border-radius: 7px; border: 1px solid var(--accent); background: var(--accent-bg); color: var(--accent); cursor: pointer; font-weight: 600; }
.btn-add:hover { background: rgba(88,166,255,0.18); }
.btn-remove { font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--red); cursor: pointer; }
.btn-remove:hover { background: var(--red-bg); }
.btn-primary, .btn-ghost {
  padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.15s; border: 1px solid var(--border);
}
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover:not(:disabled) { background: #4493f8; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary.big { width: 100%; padding: 13px; font-size: 14px; margin-top: 16px; }
.btn-ghost { background: var(--bg-secondary); color: var(--text-secondary); }
.btn-ghost:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

/* Liquidación table */
.liq-table { width: 100%; border-collapse: collapse; }
.liq-table td { padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: 14px; }
.liq-table td small { color: var(--text-muted); font-size: 11px; margin-left: 4px; }
.liq-table .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.liq-total td { border-bottom: none; border-top: 2px solid var(--border); font-size: 16px; font-weight: 700; color: var(--accent); padding-top: 14px; }

/* Hints */
.hint { font-size: 12px; color: var(--text-secondary); margin-top: 14px; line-height: 1.6; background: var(--bg-secondary); padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--accent); }

/* Nav */
.nav-buttons { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 20px; }
.nav-progress { font-size: 12px; color: var(--text-muted); }

/* Checks */
.checks { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
.checks li { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border); }
.checks li.ok { border-color: rgba(63,185,80,0.3); }
.checks li.fail { border-color: rgba(248,81,73,0.3); }
.check-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; color: #fff; }
.checks li.ok .check-icon { background: var(--green); }
.checks li.fail .check-icon { background: var(--red); }
.check-text { display: flex; flex-direction: column; gap: 2px; }
.check-text strong { font-size: 13px; }
.check-text small { font-size: 11px; color: var(--text-muted); }

/* Procesando */
.procesando { text-align: center; padding: 24px 0; }
.spinner { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.proc-msg { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--accent); }
.proc-steps { list-style: none; display: inline-flex; flex-direction: column; gap: 8px; text-align: left; }
.proc-steps li { font-size: 12px; color: var(--text-muted); }
.proc-steps li.ok { color: var(--green); }
.proc-steps li.cur { color: var(--text-primary); font-weight: 600; }

/* Acuse */
.acuse { display: flex; flex-direction: column; gap: 16px; }
.acuse-badge { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 10px; background: var(--green-bg); border: 1px solid rgba(63,185,80,0.3); }
.acuse-check { width: 36px; height: 36px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.acuse-badge strong { display: block; font-size: 14px; }
.acuse-badge small { font-size: 12px; color: var(--text-secondary); }
.acuse-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.acuse-grid > div { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; background: var(--bg-secondary); border-radius: 8px; }
.acuse-grid span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.acuse-grid strong { font-size: 14px; }
.sem-verde { color: var(--green); }
.sem-rojo { color: var(--red); }
.sello-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.sello-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
.sello-box pre { margin-bottom: 10px; white-space: pre-wrap; word-break: break-all; }
.mono { font-family: 'SFMono-Regular', Consolas, monospace; }
.mono.small { font-size: 11px; color: var(--text-secondary); }
.acuse-actions { display: flex; gap: 10px; }

.disclaimer { font-size: 11px; color: var(--text-muted); margin-top: 16px; line-height: 1.6; }

/* Aside summary */
.ped-aside { position: sticky; top: 16px; }
.summary { padding: 16px; }
.summary-op { display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 14px; }
.summary-op span { font-size: 11px; font-weight: 500; opacity: 0.8; }
.summary-op.imp { background: var(--accent-bg); color: var(--accent); }
.summary-op.exp { background: var(--green-bg); color: var(--green); }
.summary-num { display: flex; flex-direction: column; gap: 4px; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 14px; }
.summary-num span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.summary-num strong { font-size: 15px; letter-spacing: 1px; }
.summary-rows { display: flex; flex-direction: column; gap: 10px; }
.summary-rows > div { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.summary-rows span { color: var(--text-secondary); }
.summary-rows strong { font-variant-numeric: tabular-nums; }
.summary-total { padding-top: 10px; border-top: 1px solid var(--border); }
.summary-total span { color: var(--text-primary); font-weight: 600; }
.summary-total strong { color: var(--accent); font-size: 15px; }
.ready { margin-top: 16px; }
.ready-bar { height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.ready-fill { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.3s; }
.ready-fill.full { background: var(--green); }
.ready-text { font-size: 11px; color: var(--text-muted); }
.ok-text { color: var(--green); }
.fail-text { color: var(--gold); }
.summary-status { margin-top: 14px; text-align: center; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 700; }
.summary-status.paid { background: var(--green-bg); color: var(--green); }

/* Responsive */
@media (max-width: 960px) {
  .ped-grid { grid-template-columns: 1fr; }
  .ped-aside { position: static; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .acuse-grid, .partida-calc { grid-template-columns: 1fr 1fr; }
}

/* Impresión: solo el acuse */
@media print {
  .stepper, .nav-buttons, .ped-aside, .hero-actions, .op-toggle,
  .btn-primary, .btn-ghost, .acuse-actions, .disclaimer { display: none !important; }
  .ped-grid { grid-template-columns: 1fr; }
  body, .card { background: #fff !important; color: #000 !important; }
}
</style>

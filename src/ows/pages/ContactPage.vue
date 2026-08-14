<template>
  <div class="page">
    <PageHeader
      eyebrow="Contacto"
      title="Diga qué tiene que unir"
      lead="Espesor, metal base, proceso disponible y qué tiene que aguantar la unión. Con esos cuatro datos la recomendación deja de ser una lista de opciones y pasa a ser una designación."
    />

    <div class="ows-shell contact">
      <form class="form" novalidate @submit.prevent="submit">
        <h2 class="ows-sr">Formulario de contacto</h2>

        <div class="form__grid">
          <label v-for="field in FIELDS" :key="field.name" class="field" :class="`field--${field.span}`">
            <span class="field__label">
              {{ field.label }}
              <span v-if="!field.optional" class="field__req" aria-hidden="true">*</span>
              <span v-if="field.optional" class="field__opt">opcional</span>
            </span>

            <select
              v-if="field.options"
              v-model="values[field.name]"
              class="field__input"
              :name="field.name"
              :aria-invalid="Boolean(errors[field.name])"
              :aria-describedby="errors[field.name] ? `err-${field.name}` : undefined"
            >
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <textarea
              v-else-if="field.rows"
              v-model.trim="values[field.name]"
              class="field__input field__input--area"
              :name="field.name"
              :rows="field.rows"
              :placeholder="field.placeholder"
              :aria-invalid="Boolean(errors[field.name])"
              :aria-describedby="errors[field.name] ? `err-${field.name}` : undefined"
            />

            <input
              v-else
              v-model.trim="values[field.name]"
              class="field__input"
              :name="field.name"
              :type="field.type ?? 'text'"
              :autocomplete="field.autocomplete"
              :placeholder="field.placeholder"
              :aria-invalid="Boolean(errors[field.name])"
              :aria-describedby="errors[field.name] ? `err-${field.name}` : undefined"
            />

            <span v-if="errors[field.name]" :id="`err-${field.name}`" class="field__error">
              {{ errors[field.name] }}
            </span>
          </label>
        </div>

        <div class="form__foot">
          <button class="submit" type="submit">
            <span>Enviar</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H19 M13 6 L19 12 L13 18" /></svg>
          </button>
          <p class="form__hint ows-meta">Los campos marcados con * son obligatorios</p>
        </div>

        <!-- Status is announced rather than only shown, since submitting moves
             focus nowhere and a silent state change would be missed. -->
        <p v-if="status" class="status" :class="`status--${status.tone}`" role="status">
          {{ status.message }}
        </p>

        <div v-if="composed" class="composed">
          <p class="composed__label ows-meta">Mensaje redactado</p>
          <pre class="composed__body">{{ composed }}</pre>
          <div class="composed__actions">
            <button class="ghost" type="button" @click="copy">
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
            <a v-if="BRAND.contact.email" class="ghost" :href="mailto">Abrir en correo</a>
          </div>
        </div>
      </form>

      <aside class="aside">
        <h2 class="aside__title ows-meta">Directo</h2>
        <dl class="aside__list">
          <div v-for="row in details" :key="row.label" class="aside__row">
            <dt class="ows-meta">{{ row.label }}</dt>
            <dd>
              <a v-if="row.href" :href="row.href">{{ row.value }}</a>
              <template v-else>{{ row.value }}</template>
            </dd>
          </div>
        </dl>

        <p v-if="!details.length" class="aside__empty">
          Los datos de contacto directo todavía no están configurados para esta
          instalación. El formulario es la vía disponible.
        </p>

        <p class="aside__claim">{{ BRAND.claim }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { BRAND } from '../brand'

/*
  Contact.

  The form validates and composes on the client, which is all it can honestly
  do: `BRAND.contact.endpoint` is unset in this build, so there is nowhere to
  post. Rather than animate a success state that never happened, it hands the
  visitor the composed message and a route out — copy, or open it in their own
  mail client. Set the endpoint and the same submit path posts it instead.
*/

const FIELDS = [
  { name: 'nombre', label: 'Nombre', span: 'half', autocomplete: 'name' },
  { name: 'empresa', label: 'Empresa', span: 'half', autocomplete: 'organization' },
  { name: 'email', label: 'Correo', span: 'half', type: 'email', autocomplete: 'email' },
  {
    name: 'telefono',
    label: 'Teléfono',
    span: 'half',
    type: 'tel',
    autocomplete: 'tel',
    optional: true,
  },
  {
    name: 'asunto',
    label: 'Asunto',
    span: 'full',
    options: ['Especificación técnica', 'Catálogo y disponibilidad', 'Cotización', 'Otro'],
  },
  {
    name: 'mensaje',
    label: 'Mensaje',
    span: 'full',
    rows: 6,
    placeholder: 'Espesor, metal base, proceso disponible y qué tiene que aguantar la unión.',
  },
]

const values = reactive({
  nombre: '',
  empresa: '',
  email: '',
  telefono: '',
  asunto: FIELDS.find((f) => f.options).options[0],
  mensaje: '',
})

const errors = reactive({})
const status = ref(null)
const composed = ref('')
const copied = ref(false)

function validate() {
  for (const key of Object.keys(errors)) delete errors[key]

  for (const field of FIELDS) {
    if (field.optional) continue
    if (!values[field.name]) errors[field.name] = 'Este campo es obligatorio'
  }
  // Deliberately permissive: anything with a local part, an @ and a dotted
  // domain. Stricter patterns reject valid addresses more often than they
  // catch typos, and the real check is whether the reply arrives.
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = 'Revise el formato del correo'
  }
  if (values.mensaje && values.mensaje.length < 20) {
    errors.mensaje = 'Describa el trabajo con un poco más de detalle'
  }
  return Object.keys(errors).length === 0
}

function compose() {
  return [
    `Asunto: ${values.asunto}`,
    `Nombre: ${values.nombre}`,
    `Empresa: ${values.empresa}`,
    `Correo: ${values.email}`,
    values.telefono ? `Teléfono: ${values.telefono}` : null,
    '',
    values.mensaje,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

async function submit() {
  copied.value = false

  if (!validate()) {
    status.value = { tone: 'error', message: 'Faltan datos. Revise los campos marcados.' }
    composed.value = ''
    return
  }

  const body = compose()

  if (!BRAND.contact.endpoint) {
    composed.value = body
    status.value = {
      tone: 'note',
      message:
        'El envío todavía no está conectado a un servidor en esta instalación. El mensaje quedó redactado abajo: cópielo o ábralo en su cliente de correo.',
    }
    return
  }

  status.value = { tone: 'note', message: 'Enviando…' }
  try {
    const response = await fetch(BRAND.contact.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values }),
    })
    if (!response.ok) throw new Error(String(response.status))
    composed.value = ''
    status.value = { tone: 'ok', message: 'Recibido. Le respondemos por correo.' }
  } catch {
    composed.value = body
    status.value = {
      tone: 'error',
      message: 'No se pudo enviar. El mensaje quedó abajo para que no se pierda.',
    }
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(composed.value)
    copied.value = true
  } catch {
    // Clipboard access can be refused; the text is already selectable on screen.
    copied.value = false
  }
}

const mailto = computed(
  () =>
    `mailto:${BRAND.contact.email}?subject=${encodeURIComponent(values.asunto)}` +
    `&body=${encodeURIComponent(composed.value)}`,
)

// Only the details that were actually configured are rendered — an empty row
// labelled "Teléfono" with nothing after it is worse than no row.
const details = computed(() =>
  [
    BRAND.contact.email && {
      label: 'Correo',
      value: BRAND.contact.email,
      href: `mailto:${BRAND.contact.email}`,
    },
    BRAND.contact.phone && {
      label: 'Teléfono',
      value: BRAND.contact.phone,
      href: `tel:${BRAND.contact.phone.replace(/[^\d+]/g, '')}`,
    },
    BRAND.contact.address && { label: 'Dirección', value: BRAND.contact.address },
    BRAND.contact.hours && { label: 'Horario', value: BRAND.contact.hours },
  ].filter(Boolean),
)
</script>

<style scoped>
.page {
  min-height: 100svh;
  padding-bottom: clamp(4rem, 12vh, 8rem);
}

.contact {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  padding-top: clamp(2.5rem, 8vh, 4.5rem);
}

/* ---- form ---- */

.form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.75rem 2rem;
}

.field {
  display: block;
}

.field--full {
  grid-column: 1 / -1;
}

.field__label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
}

.field__req {
  color: var(--ows-red);
}

.field__opt {
  color: var(--ows-ink-faint);
  opacity: 0.7;
}

.field__input {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ows-line);
  color: var(--ows-ink);
  font: inherit;
  font-size: var(--ows-t-lead);
  border-radius: 0;
  transition: border-color var(--ows-fast) var(--ows-ease);
}

.field__input--area {
  resize: vertical;
  line-height: 1.6;
}

/* The native select arrow is the one piece of platform chrome that cannot be
   made to match, so the control carries its own. */
select.field__input {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ows-ink-faint) 50%),
    linear-gradient(135deg, var(--ows-ink-faint) 50%, transparent 50%);
  background-position:
    calc(100% - 12px) calc(50% + 2px),
    calc(100% - 7px) calc(50% + 2px);
  background-size: 5px 5px;
  background-repeat: no-repeat;
  padding-right: 2rem;
}

select.field__input option {
  background: var(--ows-panel);
  color: var(--ows-ink);
}

.field__input::placeholder {
  color: var(--ows-ink-faint);
}

.field__input:focus {
  outline: none;
  border-bottom-color: var(--ows-ink);
}

.field__input[aria-invalid='true'] {
  border-bottom-color: var(--ows-red);
}

.field__error {
  display: block;
  margin-top: 0.5rem;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-red);
}

.form__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 2rem;
  margin-top: clamp(2rem, 5vh, 3rem);
}

.submit {
  display: inline-flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.9rem 1.75rem;
  background: transparent;
  border: 1px solid var(--ows-line-strong);
  color: var(--ows-ink);
  font: inherit;
  font-size: var(--ows-t-meta);
  letter-spacing: var(--ows-track-label);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color var(--ows-fast) var(--ows-ease),
    background-color var(--ows-fast) var(--ows-ease);
}

.submit:hover {
  border-color: var(--ows-red);
  background: var(--ows-red-wash);
}

.submit svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: var(--ows-red);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--ows-fast) var(--ows-ease);
}

.submit:hover svg {
  transform: translateX(0.25rem);
}

/* ---- status & composed message ---- */

.status {
  margin-top: 1.75rem;
  padding: 1rem 1.25rem;
  border-left: 2px solid var(--ows-line-strong);
  font-size: var(--ows-t-body);
  line-height: 1.65;
  color: var(--ows-ink-muted);
  text-wrap: pretty;
}

.status--error {
  border-left-color: var(--ows-red);
}

.status--ok {
  border-left-color: var(--ows-ink);
  color: var(--ows-ink);
}

.composed {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: var(--ows-surface);
  border: 1px solid var(--ows-line-soft);
}

.composed__body {
  margin-top: 0.75rem;
  font-family: var(--ows-mono);
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.composed__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.ghost {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1.125rem;
  background: transparent;
  border: 1px solid var(--ows-line);
  color: var(--ows-ink-muted);
  font: inherit;
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color var(--ows-fast) var(--ows-ease),
    border-color var(--ows-fast) var(--ows-ease);
}

.ghost:hover {
  color: var(--ows-ink);
  border-color: var(--ows-line-strong);
}

/* ---- aside ---- */

.aside {
  border-left: 1px solid var(--ows-line-soft);
  padding-left: clamp(1.5rem, 3vw, 2.5rem);
}

.aside__list {
  margin-top: 1.5rem;
}

.aside__row {
  padding-block: 1rem;
  border-bottom: 1px solid var(--ows-line-soft);
}

.aside__row dd {
  margin-top: 0.5rem;
  font-size: var(--ows-t-body);
  line-height: 1.6;
  color: var(--ows-ink);
}

/*
  A phone number is a tap target, and a line of body text is 18px tall — under
  every guideline there is. Padded out to reach 44px and pulled back by the
  same amount, so the row it sits in does not grow to accommodate it.
*/
.aside__row a {
  display: inline-block;
  padding-block: 0.8125rem;
  margin-block: -0.8125rem;
  color: inherit;
  transition: color var(--ows-fast) var(--ows-ease);
}

.aside__row a:hover {
  color: var(--ows-red);
}

.aside__empty {
  margin-top: 1.5rem;
  font-size: var(--ows-t-body);
  line-height: 1.7;
  color: var(--ows-ink-faint);
  text-wrap: pretty;
}

.aside__claim {
  margin-top: clamp(2.5rem, 8vh, 5rem);
  font-size: var(--ows-t-micro);
  letter-spacing: var(--ows-track-meta);
  text-transform: uppercase;
  color: var(--ows-ink-faint);
  line-height: 1.8;
}

@media (max-width: 62rem) {
  .contact {
    grid-template-columns: 1fr;
  }

  .aside {
    border-left: 0;
    border-top: 1px solid var(--ows-line-soft);
    padding-left: 0;
    padding-top: 2rem;
  }
}

@media (max-width: 40rem) {
  .form__grid {
    grid-template-columns: 1fr;
  }

  .field--half {
    grid-column: 1 / -1;
  }
}
</style>

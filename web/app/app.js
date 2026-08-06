/* ============================================================================
   PEPTIDEX · PepX — LA APLICACIÓN

   Fichero propio. Ya no vive dentro de PEPTIDEX.html: la tienda enlaza aquí y
   nada más. Eso quita 5,2 MB de arranque, elimina la hoja de estilos compartida
   —y con ella el cortafuegos de especificidad que hubo que escribir— y deja la
   app lista para envolverse en Capacitor sin arrastrar el catálogo.

   DOS COMPOSICIONES, UN LENGUAJE

   Escritorio  barra lateral de nueve destinos, barra superior con buscador,
               panel de cuatro métricas + próxima inyección + tres paneles
   Móvil       barra inferior de cinco destinos, marca centrada arriba, todo
               apilado y el titular grande dentro del contenido

   No es la misma pantalla encogida. El enrutador es uno y las vistas deciden su
   composición; MÁS existe sólo en móvil, porque en escritorio la lateral ya
   enseña los nueve destinos y un «más» sobre una lateral es un menú dentro de
   otro menú.

   DOC.PEPS — QUÉ LEE Y QUÉ NO

   Lee el registro que el usuario escribió y dice lo que de ahí sale contando:
   medias, recorridos, cobertura, huecos, existencias, fechas y conservación.
   No interpreta el cuerpo, no atribuye un cambio a un compuesto y no dice qué
   tomar, cuánto ni cada cuándo. La columna de dosis del libro de operación se
   CITA, con marco y procedencia, como lo que es: el documento del operador.

   TODO ES DEL APARATO

   No hay servidor. localStorage y nada más. Nadie lo ve —nosotros tampoco— y
   si se borra el navegador se borra: exportar es la copia de seguridad.
   ============================================================================ */
(function(){
'use strict';

const KEY  = 'pepx-app-v3';
const OLD  = ['pepx-app-v2', 'pepx-app-v1'];
const MAIL = 'official.peptidex@outlook.com';
const STORE = 'https://peptidex.netlify.app/';

/* ==========================================================================
   1 · ESTADO
   ========================================================================== */
const BLANK = {
  plan:[], log:{}, vitals:[], vials:[], sites:[], hl:{}, calc:{},
  me:{nombre:'', correo:''},
  theme:'light',              /* light | dark | system — claro de fábrica */
  win:14, sub:{tier:'free', since:null},
  on:false, route:'dash', sub1:{}, open:null
};
let S = load();

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY));
    if(raw && typeof raw === 'object') return fill(raw);
  }catch(e){}
  /* Migración: nadie pierde su registro por un rediseño. */
  for(const k of OLD){
    try{
      const v = JSON.parse(localStorage.getItem(k));
      if(v && typeof v === 'object'){
        const m = fill(v);
        m.route = 'dash'; m.on = true; m.sub1 = {}; m.open = null;
        m.theme = 'light';
        return m;
      }
    }catch(e){}
  }
  return JSON.parse(JSON.stringify(BLANK));
}
function fill(raw){
  const o = Object.assign({}, JSON.parse(JSON.stringify(BLANK)), raw);
  o.me   = Object.assign({}, BLANK.me,  raw.me  || {});
  o.sub  = Object.assign({}, BLANK.sub, raw.sub || {});
  o.sub1 = Object.assign({}, raw.sub1 || {});
  return o;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* Los atajos del icono (mantener pulsado en la pantalla de inicio) abren
   ./?go=inj y ./?go=lib. Se leen una vez, al arrancar, y sólo si el usuario ya
   entró: llevar a alguien a «registrar inyección» antes de tener una cuenta
   local es enseñarle un formulario vacío en vez de la puerta.

   El parámetro se borra de la barra acto seguido, para que recargar no vuelva
   a saltar a la misma pantalla. */
try{
  const go = new URLSearchParams(location.search).get('go');
  if(go && S.on && ['dash','prot','comp','inj','cal','prog','lib','edu','set'].indexOf(go) >= 0){
    S.route = go; S.open = null;
    if(go === 'inj') S.jnew = true;
    history.replaceState(null, '', location.pathname);
  }
}catch(e){}
const uid = () => Math.random().toString(36).slice(2,9);
const sub1 = (k, d) => S.sub1[k] || d;

/* ==========================================================================
   2 · IDIOMA

   El sitio tiene conmutador; aquí se toma del navegador una vez. Es una app
   personal: quien la instala no cambia de idioma cada martes.
   ========================================================================== */
const ES = !/^en/i.test(navigator.language || 'es');
const t = (en, es) => ES ? es : en;

/* ==========================================================================
   3 · TEMA — light | dark | system, y persiste

   El <head> ya aplicó el tema antes del primer píxel. Esto sólo lo cambia en
   caliente y escucha al sistema cuando el modo es `system`.
   ========================================================================== */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){
  const dark = S.theme === 'dark' || (S.theme === 'system' && mq.matches);
  const r = document.documentElement;
  r.dataset.theme = dark ? 'dark' : 'light';
  r.dataset.mode  = S.theme;
  const m = document.querySelector('meta[name="theme-color"]:not([media])');
  if(m) m.content = dark ? '#000000' : '#FFFFFF';
}
mq.addEventListener('change', () => { if(S.theme === 'system'){ applyTheme(); paint(); } });

/* ==========================================================================
   4 · FECHAS

   Todo en 'YYYY-MM-DD' local. Guardar ISO con zona parece más correcto y es
   peor: una dosis puesta a las once de la noche en México se registraría al día
   siguiente y el usuario vería un hueco donde sí cumplió.
   ========================================================================== */
const pad = n => String(n).padStart(2,'0');
const key = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
const today = () => key(new Date());
function parse(k){ const [y,m,d] = String(k).split('-').map(Number);
                   return new Date(y, (m||1)-1, d||1); }
function shift(k, n){ const d = parse(k); d.setDate(d.getDate()+n); return key(d); }
function days(a, b){ return Math.round((parse(b)-parse(a)) / 86400000); }
const MON  = () => t('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec',
                     'ene feb mar abr may jun jul ago sep oct nov dic').split(' ');
const MONL = () => t('January February March April May June July August September October November December',
                     'Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre').split(' ');
const DOW  = () => t('S,M,T,W,T,F,S','D,L,M,X,J,V,S').split(',');   /* empieza en domingo, como la referencia */
const DOW3 = () => t('Mon,Tue,Wed,Thu,Fri,Sat,Sun','Lun,Mar,Mié,Jue,Vie,Sáb,Dom').split(',');
function human(k){
  const d = parse(k), hoy = today();
  if(k === hoy) return t('Today','Hoy');
  if(k === shift(hoy,-1)) return t('Yesterday','Ayer');
  if(k === shift(hoy, 1)) return t('Tomorrow','Mañana');
  return d.getDate() + ' ' + MON()[d.getMonth()];
}
function longDate(k){
  const d = parse(k);
  return DOW3()[(d.getDay()+6)%7] + ', ' + d.getDate() + ' ' + MON()[d.getMonth()];
}
function fullDate(k){
  const d = parse(k);
  return MON()[d.getMonth()].toUpperCase() + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function greet(){
  const h = new Date().getHours();
  if(h < 6)  return t('Good night','Buenas noches');
  if(h < 12) return t('Good morning','Buenos días');
  if(h < 20) return t('Good afternoon','Buenas tardes');
  return t('Good evening','Buenas noches');
}

/* ==========================================================================
   5 · LA PAUTA
   ========================================================================== */
const FREQ = [
  {v:'d',   en:'Every day',          es:'Todos los días'},
  {v:'alt', en:'Every other day',    es:'Días alternos'},
  {v:'dow', en:'Certain weekdays',   es:'Días concretos'},
  {v:'nd',  en:'Every N days',       es:'Cada N días'},
  {v:'cyc', en:'Cycle: N on, N off', es:'Ciclo: N sí, N no'}
];
function dueOn(p, k){
  if(!p.active) return false;
  if(p.start && k < p.start) return false;
  if(p.end   && k > p.end)   return false;
  const n = p.start ? days(p.start, k) : 0;
  switch(p.freq){
    case 'd':   return true;
    case 'alt': return n % 2 === 0;
    case 'dow': return (p.dow||[]).indexOf((parse(k).getDay()+6) % 7) >= 0;
    case 'nd':  return n % Math.max(1, +p.every || 1) === 0;
    case 'cyc': {
      const on = Math.max(1, +p.on || 1), off = Math.max(0, +p.off || 0);
      return (n % (on+off)) < on;
    }
  }
  return false;
}
const dueList = k => S.plan.filter(p => dueOn(p, k));
const taken   = (k, id) => !!(S.log[k] && S.log[k][id]);
function freqText(p){
  switch(p.freq){
    case 'd':   return t('Every day','Todos los días');
    case 'alt': return t('Every other day','Días alternos');
    case 'dow': return (p.dow||[]).map(i => DOW3()[i]).join(' · ') || t('No days','Sin días');
    case 'nd':  return t('Every ','Cada ') + (p.every||1) + t(' days',' días');
    case 'cyc': return (p.on||1) + t(' on / ',' sí / ') + (p.off||0) + t(' off',' no');
  }
  return '';
}
/* El estado se DERIVA de las fechas y la bandera. No se escribe a mano en
   ningún sitio, así que no puede quedarse desincronizado. */
function planState(p){
  const hoy = today();
  if(!p.c || !p.freq) return 'draft';
  if(!p.active)       return (p.end && p.end < hoy) ? 'done' : 'draft';
  if(p.end && p.end < hoy) return 'done';
  return 'active';
}
/* «Fase 2 · Semana 3 de 8» — la fase y la semana salen del propio tramo */
function phase(p){
  if(!p.start) return null;
  const hoy = today();
  const semana = Math.floor(days(p.start, hoy) / 7) + 1;
  if(!p.end) return {w:semana, total:null, f:null};
  const total = Math.max(1, Math.ceil(days(p.start, p.end) / 7));
  const f = Math.min(3, Math.max(1, Math.ceil(semana / Math.max(1, total/3))));
  return {w:Math.min(semana, total), total:total, f:f};
}
function planProgress(p){
  const ph = phase(p);
  if(!ph || !ph.total) return null;
  return Math.max(0, Math.min(1, ph.w / ph.total));
}
function nextDue(p){
  const hoy = today();
  for(let i = 0; i < 400; i++){
    const k = shift(hoy, i);
    if(dueOn(p, k) && !taken(k, p.id)) return k;
  }
  return null;
}
/* los compuestos de un protocolo: el propio más los que compartan su ventana */
function planCompounds(p){
  const out = [p.c];
  S.plan.forEach(x => {
    if(x.id === p.id || !x.c || out.indexOf(x.c) >= 0) return;
    if(planState(x) === planState(p)) out.push(x.c);
  });
  return out;
}

/* ==========================================================================
   6 · CONSTANTES
   ========================================================================== */
const METRICS = [
  {id:'rhr', u:'bpm', col:false, dec:0, en:'Resting Heart Rate', es:'Frecuencia en reposo',
   sh:{en:'RHR', es:'FCR'},
   de:{en:'Your resting heart rate across the period, as you entered it.',
       es:'Tu frecuencia cardíaca en reposo a lo largo del periodo, tal y como la escribiste.'}},
  {id:'peso', u:'kg', col:false, dec:1, en:'Weight', es:'Peso', sh:{en:'Weight', es:'Peso'},
   de:{en:'Weight over the period. Weigh at the same time of day or the curve measures your schedule, not you.',
       es:'El peso durante el periodo. Pésate a la misma hora o la curva mide tu horario, no a ti.'}},
  {id:'pasos', u:'', col:true, dec:0, en:'Steps', es:'Pasos', sh:{en:'Steps', es:'Pasos'},
   de:{en:'Steps per day. Bars start at zero because a count does.',
       es:'Pasos por día. Las barras arrancan en cero porque una cuenta arranca en cero.'}},
  {id:'grasa', u:'%', col:false, dec:1, en:'Body Fat', es:'Grasa corporal', sh:{en:'Body fat', es:'Grasa'},
   de:{en:'Body fat percentage, from whatever instrument you use. Keep using the same one.',
       es:'Porcentaje de grasa, con el instrumento que uses. Sigue usando el mismo.'}},
  {id:'sueno', u:'h', col:true, dec:1, en:'Sleep', es:'Sueño', sh:{en:'Sleep', es:'Sueño'},
   de:{en:'Hours slept per night. Bars start at zero because hours are a count.',
       es:'Horas de sueño por noche. Las barras arrancan en cero porque las horas se cuentan.'}},
  {id:'cintura', u:'cm', col:false, dec:1, en:'Waist', es:'Cintura', sh:{en:'Waist', es:'Cintura'},
   de:{en:'Waist measurement. Same height, same time, same breath out.',
       es:'Medida de cintura. Misma altura, misma hora, mismo aire fuera.'}},
  {id:'energia', u:'/5', col:true, dec:1, en:'Energy', es:'Energía', sh:{en:'Energy', es:'Energía'},
   de:{en:'How you rated your energy, one to five.',
       es:'Cómo puntuaste tu energía, del uno al cinco.'}}
];
const mName  = m => t(m.en, m.es);
const mShort = m => t(m.sh.en, m.sh.es);
function series(id, win){
  const from = shift(today(), -(win-1));
  return S.vitals
    .filter(v => v.d >= from && v[id] !== '' && v[id] != null && !isNaN(+v[id]))
    .map(v => ({d:v.d, v:+v[id]}))
    .sort((a,b) => a.d < b.d ? -1 : 1);
}

/* ==========================================================================
   7 · NÚMEROS
   ========================================================================== */
function nf(v, dec){
  if(v == null || isNaN(v)) return '—';
  return (+v).toFixed(dec == null ? 1 : dec).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
const mean = a => a.reduce((x,y) => x+y, 0) / a.length;
const mn = a => Math.min.apply(null, a);
const mx = a => Math.max.apply(null, a);
const E = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ==========================================================================
   8 · ICONOS — un solo peso de trazo en toda la aplicación
   ========================================================================== */
const I = {
  dash:'<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/>',
  prot:'<rect x="4" y="4.5" width="16" height="15" rx="2.5"/><path d="M8 9.5h8M8 13h8M8 16.5h4"/>',
  comp:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="15" r="3"/><path d="M10.4 11.2 13.6 12.8"/>',
  inj:'<path d="M14 3.5 20.5 10M17 6.5 8.5 15l-3 .8.8-3L14.8 4.2"/><path d="M4 20l2.5-2.5"/>',
  cal:'<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  prog:'<path d="M4 18l5-6 4 4 7-9"/>',
  lib:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  edu:'<path d="M12 4 2.5 8.5 12 13l9.5-4.5z"/><path d="M6.5 10.7V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5.3"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  jour:'<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  bell:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>',
  auto:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12.5 10 17.5 19 7"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  warn:'<path d="M12 9v5M12 17.5v.01"/><path d="M10.3 3.9 2.6 17.6a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  flask:'<path d="M9 3v6.5L4.2 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.8-3L15 9.5V3"/><path d="M8 3h8"/>',
  box:'<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  user:'<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6"/>',
  lock:'<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  shield:'<path d="M12 3.5 5 6v6c0 4.3 3 7.6 7 8.5 4-.9 7-4.2 7-8.5V6z"/>',
  help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17v.01"/>',
  out:'<path d="M15 17l5-5-5-5M20 12H9M11 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H11"/>',
  play:'<path d="M8 5.5v13l11-6.5z"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  flat:'<path d="M5 12h14"/>'
};
/* LOS ATRIBUTOS VAN EN EL SVG, NO EN CADA SITIO QUE LO USA.

   Sin ellos, un <svg> con trazados dentro se pinta con el valor de fábrica de
   la especificación: fill negro, stroke ninguno. Es decir, una mancha. Iba
   bien donde la hoja de estilos lo corregía —la lateral, la barra de
   pestañas, los botones— y salía como un borrón en todos los demás: los
   iconos de las filas de «Más», los de accesos rápidos y los de ajustes.

   Como ATRIBUTOS de presentación pierden contra cualquier regla CSS, así que
   los sitios que ya rellenan el icono a propósito —la pestaña activa— siguen
   ganando. La capa correcta para un valor por defecto. */
const svg = n => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
  'stroke-linejoin="round">' + (I[n]||'') + '</svg>';

/* ==========================================================================
   9 · LA BIBLIOTECA DE COMPUESTOS
   ========================================================================== */
const LIB = (typeof PX_LIB !== 'undefined' && PX_LIB) || [];
const libKey = n => String(n||'').toUpperCase().replace(/\([^)]*\)/g,'')
  .normalize('NFKD').replace(/[^A-Z0-9]/g,'');
function libFind(nombre){
  const k = libKey(nombre);
  if(!k) return null;
  return LIB.filter(e => libKey(e.n) === k)[0] ||
         LIB.filter(e => e.sku && String(e.sku).toUpperCase().split(/[\s/]+/)
                    .indexOf(String(nombre).toUpperCase()) >= 0)[0] ||
         (k.length >= 4 ? LIB.filter(e => libKey(e.n).indexOf(k) === 0)[0] : null) || null;
}
const FAM = [
  {id:'perf', en:'Performance', es:'Rendimiento'},
  {id:'reco', en:'Recovery',    es:'Recuperación'},
  {id:'long', en:'Longevity',   es:'Longevidad'},
  {id:'beau', en:'Beauty',      es:'Belleza'}
];
const BEAUTY = /(GHK|AHK|MELANOTAN|GLUTATH|KPV|SNAP|ARGIRELIN|COLLAG|BIOTIN|PALMITOYL)/i;
function family(e){
  const c = (e.cat || ''), n = (e.n || '');
  if(BEAUTY.test(n)) return 'beau';
  if(/Regenera/i.test(c)) return 'reco';
  if(/Neuroprotecci|Longevidad/i.test(c)) return 'long';
  if(/Metabolismo|Somatotr|HGH/i.test(c)) return 'perf';
  return '';
}
/* el acento de línea de producto, y sólo llega a la miniatura */
const LINEA = {perf:'fitness', reco:'fitness', long:'longevity', beau:'beauty'};
const famClass = e => { const f = family(e); return f ? ' f-' + LINEA[f] : ''; };
function conserva(e){
  const out = [], a = (e.alm || '') + ' ' + (e.ins || '');
  if(/luz/i.test(a))              out.push(t('Protect from light','Proteger de la luz'));
  if(/-\s*20|−\s*20/.test(a))     out.push(t('Powder −20 °C','Polvo −20 °C'));
  if(/2\s*°?C?\s*a\s*8/i.test(a)) out.push('2–8 °C');
  if(/congel/i.test(a) && !out.length) out.push(t('Freeze','Congelar'));
  return out;
}
const research = e => /R&D|Investigaci/i.test(e.reg || '')
  ? t('Research use only','Solo para uso de investigación')
  : t('Research material','Material de investigación');

/* ==========================================================================
   9b · EL PRODUCTO REAL

   Antes esto dibujaba un rectángulo con dos sombras y la clave dentro. A 40 px
   pasaba por vial; a 400 px era un rectángulo. Y no hacía falta: el producto de
   PEPTIDEX existe y está fotografiado, y mk_appart.py recorta esas fotos del
   material entregado.

   Lo que se enseña es el vial de LÍNEA — lleva la línea y nada más, ni
   compuesto ni dosis— porque en una lista el compuesto cambia en cada fila y
   la etiqueta específica no existe para los sesenta.

   Si no hay arte (nadie corrió mk_appart.py) cae al dibujo de antes en vez de
   dejar un hueco. Degradar, no romper.
   ========================================================================== */
const ART = (typeof PX_ART !== 'undefined' && PX_ART) || {};
const hayArte = !!ART.vial_fitness;

/* La marca, en sus dos polaridades. Las dos van al DOM y el tema enseña una:
   cambiar de tema no repinta el árbol entero, así que no puede depender de que
   algo se vuelva a dibujar. */
function mark(pieza, cls){
  const l = ART[pieza + '_light'], d = ART[pieza + '_dark'];
  if(!l) return '<span class="' + (cls||'') + ' pxmark-txt">Px</span>';
  return '<span class="pxmark ' + (cls || '') + '" aria-hidden="true">' +
    '<img class="ml" src="' + l + '" alt=""/>' +
    '<img class="md" src="' + (d || l) + '" alt=""/></span>';
}

/* La línea a la que pertenece un compuesto, para elegir su vial. */
function lineaDe(nombre){
  const e = libFind(nombre);
  return (e && LINEA[family(e)]) || 'fitness';
}

function vial(nombre, size){
  const e = libFind(nombre);
  const linea = (e && LINEA[family(e)]) || 'fitness';
  const cod = (e && e.sku ? String(e.sku).split('/')[0] : String(nombre||'')).trim().slice(0,7);
  if(!hayArte){
    return '<span class="vial' + (size ? ' ' + size : '') + (e ? famClass(e) : '') + '">' +
      '<em>' + E(cod) + '</em></span>';
  }
  const grande = size === 'lg' || size === 'xl' || size === 'hero';
  const src = ART[(grande ? 'vial_' : 'vialt_') + linea];
  return '<span class="pv' + (size ? ' ' + size : '') + ' l-' + linea + '">' +
    '<img src="' + src + '" alt="' + E(t('PEPTIDEX vial','Vial PEPTIDEX')) + ' ' +
      linea.toUpperCase() + '" loading="lazy" decoding="async"/></span>';
}

/* El bloque de línea entregado — Px con su símbolo, PEPTIDEX y el nombre de la
   línea. Es la firma de familia, y va donde el usuario está mirando UN
   producto, nunca repetido en una lista. */
function famLock(linea){
  const src = ART['fam_' + linea];
  return src ? '<img class="famlock" src="' + src + '" alt="PEPTIDEX ' +
    linea.toUpperCase() + '" loading="lazy" decoding="async"/>' : '';
}

/* ==========================================================================
   10 · DOC.PEPS
   ========================================================================== */
const MK = '<span class="mk"><svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 2.4l1.85 5.6 5.6 1.85-5.6 1.85L12 17.3l-1.85-5.6-5.6-1.85 5.6-1.85z"/>' +
  '<path d="M18.6 15.4l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" opacity=".6"/>' +
  '</svg></span>';
function dp(paras, foot){
  return '<div class="dp">' + MK + '<div class="bd"><div class="who">Doc.Peps</div>' +
    paras.map(p => '<p>' + p + '</p>').join('') +
    (foot ? '<div class="foot">' +
      t('Doc.Peps reads your log — the numbers you entered. It does not interpret your body, does not attribute any change to any compound, and does not tell you what to take, how much or how often.',
        'Doc.Peps lee tu registro — los números que metiste tú. No interpreta tu cuerpo, no atribuye ningún cambio a ningún compuesto, y no te dice qué tomar, cuánto ni cada cuándo.') +
      '</div>' : '') +
    '</div></div>';
}
function dpMetric(m, pts, win){
  if(!pts.length) return null;
  const vs = pts.map(p => p.v), avg = mean(vs), a = vs[0], b = vs[vs.length-1];
  const P = [];
  if(pts.length === 1){
    P.push(t('One measurement in this window: <b>%v %u</b> on %d. A second one turns a number into a direction.',
             'Una sola medida en esta ventana: <b>%v %u</b> el %d. Con una segunda, el número pasa a ser una dirección.')
      .replace('%v', nf(a, m.dec)).replace('%u', m.u).replace('%d', human(pts[0].d)));
    return P;
  }
  P.push(t('Average <b>%a %u</b> over %n measurements.','Media <b>%a %u</b> sobre %n medidas.')
    .replace('%a', nf(avg, m.dec)).replace('%u', m.u).replace('%n', pts.length));
  const d = b - a, rel = Math.abs(a) > 0 ? Math.abs(d/a) : 0;
  if(rel < 0.01 || Math.abs(d) < Math.pow(10, -(m.dec||0)) / 2)
    P.push(t('First to last, no movement worth reading: %a → %b.',
             'Del primero al último, sin movimiento apreciable: %a → %b.')
      .replace('%a', nf(a, m.dec)).replace('%b', nf(b, m.dec)));
  else
    P.push(t('First to last, %a → %b (<b>%s%d %u</b>).','Del primero al último, %a → %b (<b>%s%d %u</b>).')
      .replace('%a', nf(a, m.dec)).replace('%b', nf(b, m.dec))
      .replace('%s', d > 0 ? '+' : '−').replace('%d', nf(Math.abs(d), m.dec)).replace('%u', m.u));
  const cov = Math.round(pts.length / win * 100);
  if(cov < 50)
    P.push(t('Coverage %n of %w days. Below half the window the average is about the days you picked as much as about you.',
             'Cobertura %n de %w días. Por debajo de la mitad de la ventana, la media habla tanto de qué días elegiste como de ti.')
      .replace('%n', pts.length).replace('%w', win));
  if(pts.length < 5)
    P.push(t('With fewer than five measurements a trend is not a trend yet.',
             'Con menos de cinco medidas, una tendencia todavía no es una tendencia.'));
  return P;
}
function dpToday(){
  const hoy = today(), due = dueList(hoy), hechas = due.filter(p => taken(hoy, p.id)).length;
  const P = [];
  if(!S.plan.length){
    P.push(t('Nothing to remember yet. Write your first protocol — the compound, the dose and how often are yours to decide; from then on I keep the count.',
             'Todavía no hay nada que recordar. Escribe tu primer protocolo — el compuesto, la dosis y la frecuencia los decides tú; a partir de ahí llevo yo la cuenta.'));
    return P;
  }
  if(due.length && hechas === due.length)
    P.push(t('Everything scheduled for today is logged.','Todo lo programado para hoy está registrado.'));
  else if(due.length)
    P.push(t('<b>%h of %d</b> logged today.','<b>%h de %d</b> registrado hoy.')
      .replace('%h', hechas).replace('%d', due.length));
  else
    P.push(t('Nothing scheduled today by your own plan.','Hoy no toca nada según tu propio plan.'));
  const sem = shift(hoy, -6);
  const faltan = METRICS.filter(m => !S.vitals.some(v => v.d >= sem && v[m.id] !== '' && v[m.id] != null));
  if(faltan.length && faltan.length < METRICS.length)
    P.push(t('Not measured this week: %l.','Sin medir esta semana: %l.')
      .replace('%l', faltan.map(m => mShort(m).toLowerCase()).join(', ')));
  return P;
}
function dpReport(win){
  const con = METRICS.map(m => ({m:m, p:series(m.id, win)})).filter(x => x.p.length);
  const P = [];
  if(!con.length){
    P.push(t('Nothing measured in the last %w days. One weight is enough to start.',
             'Nada medido en los últimos %w días. Con un peso basta para empezar.').replace('%w', win));
    return P;
  }
  const total = con.reduce((a,x) => a + x.p.length, 0);
  P.push(t('<b>%t records</b> across <b>%c measures</b> in the last %w days: %l.',
           '<b>%t registros</b> repartidos en <b>%c constantes</b> en los últimos %w días: %l.')
    .replace('%t', total).replace('%c', con.length).replace('%w', win)
    .replace('%l', con.map(x => mShort(x.m).toLowerCase()).join(', ')));
  const flojas = con.filter(x => x.p.length < 3);
  if(flojas.length)
    P.push(t('Thin on data: %l. Below three points there is a dot, not a line.',
             'Con pocos datos: %l. Por debajo de tres puntos hay un punto, no una línea.')
      .replace('%l', flojas.map(x => mShort(x.m).toLowerCase()).join(', ')));
  return P;
}

/* ==========================================================================
   11 · AVISOS — el nivel lo llevan filete, icono y palabra. Sin color.
   ========================================================================== */
function tips(){
  const out = [], hoy = today();
  if(!S.plan.length)
    out.push(['', 'info', t('No protocol yet','Todavía no hay protocolo'),
      t('Add your first one. You enter the compound, the dose and how often — PepX only remembers it for you.',
        'Añade el primero. El compuesto, la dosis y la frecuencia los pones tú — PepX sólo se acuerda por ti.')]);
  let gap = 0;
  for(let i = 1; S.plan.length && i <= 30; i++){
    const k = shift(hoy, -i), due = dueList(k);
    if(!due.length) continue;
    if(due.some(p => taken(k, p.id))) break;
    gap++;
  }
  if(gap >= 3)
    out.push(['w', 'warn', t('%d days without a record','%d días sin registrar').replace('%d', gap),
      t('A log with holes is worth less than a short one that is complete. Fill them in from the day itself.',
        'Un registro con huecos vale menos que uno corto y completo. Rellénalos desde el propio día.')]);
  if(!S.vitals.length)
    out.push(['', 'info', t('No baseline yet','Sin punto de partida'),
      t('Log a weight in Progress. Without a first measurement there is nothing to compare against later.',
        'Registra un peso en Progreso. Sin una primera medida no hay contra qué comparar después.')]);
  else {
    const dd = days(S.vitals[S.vitals.length-1].d, hoy);
    if(dd >= 21)
      out.push(['w', 'warn', t('%d days since your last measurement','%d días desde tu última medida').replace('%d', dd),
        t('Weekly is enough. Monthly and the curve stops meaning anything.',
          'Con una vez por semana basta. Una vez al mes y la curva deja de decir nada.')]);
  }
  S.vials.forEach(v => {
    const p = S.plan.filter(x => x.active && x.c === v.c)[0];
    if(v.quedan != null && v.quedan !== '' && +v.quedan <= 3){
      let when = '';
      if(p){
        let n = 0, k = hoy, left = +v.quedan;
        while(left > 0 && n < 200){ if(dueOn(p, k)) left--; if(left > 0){ k = shift(k,1); n++; } }
        when = t(' — at your frequency it runs out ',' — con tu frecuencia se acaba ') + human(k).toLowerCase();
      }
      out.push([+v.quedan <= 1 ? 'b' : 'w', 'warn',
        t('%s: %n doses left','%s: quedan %n dosis').replace('%s', v.c).replace('%n', v.quedan),
        t('Restocking takes days you may not have.','Reponer tarda días que quizá no tengas.') + when]);
    }
    if(v.recon){
      const dd = days(v.recon, hoy);
      if(dd >= 25)
        out.push([dd >= 32 ? 'b' : 'w', 'warn',
          t('%s: reconstituted %d days ago','%s: %d días desde la reconstitución')
            .replace('%s', v.c).replace('%d', dd),
          t('Check the storage window on that batch’s COA before using it.',
            'Comprueba la ventana de conservación en el COA de ese lote antes de usarlo.')]);
    }
    if(v.exp && v.exp <= shift(hoy, 30))
      out.push([v.exp <= hoy ? 'b' : 'w', 'warn',
        t('%s: expiry %e','%s: caducidad %e').replace('%s', v.c).replace('%e', human(v.exp).toLowerCase()),
        t('Past the date it does not go in the log — it goes in the bin.',
          'Pasada la fecha no va al registro: va a la basura.')]);
  });
  const vistos = {};
  S.vials.forEach(v => {
    const e = libFind(v.c);
    if(!e || vistos[e.n]) return;
    vistos[e.n] = 1;
    const c = conserva(e);
    if(c.length)
      out.push(['', 'info', E(v.c) + ' · ' + c.join(' · '),
        (e.alm ? E(e.alm) : '') + (e.ins ? (e.alm ? ' — ' : '') + E(e.ins) : '')]);
  });
  if(S.sites.length >= 3){
    const u = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1).slice(0,3);
    if(u[0].z === u[1].z && u[1].z === u[2].z)
      out.push(['w', 'warn', t('Same site three times running','La misma zona tres veces seguidas'),
        t('Your last three entries are all %z.','Tus tres últimos registros son todos %z.')
          .replace('%z', zName(u[0].z))]);
  }
  if(!out.length)
    out.push(['', 'check', t('Everything up to date','Todo al día'),
      t('Nothing to flag. Keep logging.','No hay nada que señalar. Sigue registrando.')]);
  return out;
}
const notesHTML = () => '<div class="notes">' + tips().map(x =>
  '<div class="note ' + x[0] + '"><span class="ic">' + svg(x[1]) + '</span>' +
  '<div class="bd"><div class="tt">' + x[2] + '</div><div class="td">' + x[3] + '</div></div>' +
  '</div>').join('') + '</div>';

/* ==========================================================================
   12 · GRÁFICAS
   ========================================================================== */
const CW = 620;
function barPath(x, y, w, h, r){
  const n = v => (+v).toFixed(1);
  x = +x; y = +y; w = +w; h = +h;
  const rr = Math.min(r, w/2, h);
  return 'M' + n(x) + ' ' + n(y+h) + ' V' + n(y+rr) +
         ' a' + n(rr) + ' ' + n(rr) + ' 0 0 1 ' + n(rr) + ' ' + n(-rr) +
         ' h' + n(w - 2*rr) + ' a' + n(rr) + ' ' + n(rr) + ' 0 0 1 ' + n(rr) + ' ' + n(rr) +
         ' V' + n(y+h) + ' Z';
}
function axis(slots, win, H, band){
  let g = '';
  if(win <= 14){
    const L = DOW();
    slots.forEach((k, i) => {
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-6) +
           '" text-anchor="middle">' + L[parse(k).getDay()] + '</text>';
    });
  } else {
    [0, Math.floor(win/2), win-1].forEach((i, j) => {
      const d = parse(slots[i]);
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-6) +
           '" text-anchor="' + (j===0?'start':j===2?'end':'middle') + '">' +
           d.getDate() + ' ' + MON()[d.getMonth()] + '</text>';
    });
  }
  return g;
}
function cols(pts, win, m){
  const H = 148, PT = 12, PB = 22;
  const from = shift(today(), -(win-1)), slots = [];
  for(let i = 0; i < win; i++) slots.push(shift(from, i));
  const byDay = {}; pts.forEach(p => byDay[p.d] = p.v);
  const top = (mx(pts.map(p => p.v)) || 1) * 1.14;
  const band = CW / win, bw = Math.max(3, Math.min(22, band - 5));
  const Y = v => PT + (1 - v/top) * (H - PT - PB);
  let g = '';
  for(let i = 0; i <= 4; i++){
    const y = PT + (i/4)*(H-PT-PB);
    g += '<line class="grid" x1="0" y1="' + y.toFixed(1) + '" x2="' + CW + '" y2="' + y.toFixed(1) + '"/>';
  }
  slots.forEach((k, i) => {
    const v = byDay[k]; if(v == null) return;
    const x = i*band + (band-bw)/2, y = Y(v);
    g += '<path class="bar" d="' + barPath(x, y, bw, H-PB-y, 3) + '"/>';
  });
  g += axis(slots, win, H, band);
  return '<svg class="chart" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
    'style="height:148px" role="img" aria-label="' + E(mName(m)) + '">' + g + '</svg>';
}
/* Sin relleno bajo la curva: este eje está truncado —una FCR entre 67 y 74
   desde cero serían siete puntos pegados— y en un eje truncado el área no mide
   nada, porque el suelo es una cifra elegida. */
function line(pts, win, m){
  const H = 148, PT = 14, PB = 22;
  const from = shift(today(), -(win-1));
  const vs = pts.map(p => p.v), lo = mn(vs), hi = mx(vs);
  const span = (hi - lo) || Math.max(1, Math.abs(hi)*.04);
  const top = hi + span*.26, bot = lo - span*.26, band = CW / win;
  const X = k => (days(from, k) + .5) * band;
  const Y = v => PT + (1 - (v-bot)/(top-bot)) * (H - PT - PB);
  let d = '', g = '';
  for(let i = 0; i <= 4; i++){
    const y = PT + (i/4)*(H-PT-PB);
    g += '<line class="grid" x1="0" y1="' + y.toFixed(1) + '" x2="' + CW + '" y2="' + y.toFixed(1) + '"/>';
  }
  pts.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' '; });
  g += '<path class="ln s1" d="' + d + '"/>';
  pts.forEach(p => { g += '<circle class="dot f1" cx="' + X(p.d).toFixed(1) + '" cy="' +
    Y(p.v).toFixed(1) + '" r="3"/>'; });
  const slots = []; for(let i = 0; i < win; i++) slots.push(shift(from, i));
  g += axis(slots, win, H, band);
  return '<svg class="chart" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
    'style="height:148px" role="img" aria-label="' + E(mName(m)) + '">' + g + '</svg>';
}
/* La curva del panel: adherencia de los siete últimos días, con eje de
   porcentaje y los días de la semana, como la referencia. */
function weekChart(){
  const H = 168, PT = 12, PB = 24, PL = 34;
  const hoy = today(), pts = [];
  for(let i = 6; i >= 0; i--){
    const k = shift(hoy, -i), d = dueList(k);
    const v = d.length ? d.filter(p => taken(k, p.id)).length / d.length : null;
    pts.push({k:k, v:v});
  }
  const conDatos = pts.filter(p => p.v != null);
  const X = i => PL + (i/6) * (CW - PL - 8);
  const Y = v => PT + (1 - v) * (H - PT - PB);
  let g = '';
  [0,.25,.5,.75,1].forEach(v => {
    g += '<line class="grid" x1="' + PL + '" y1="' + Y(v).toFixed(1) + '" x2="' + CW +
         '" y2="' + Y(v).toFixed(1) + '"/>' +
         '<text class="axt" x="0" y="' + (Y(v)+3.5).toFixed(1) + '">' + Math.round(v*100) + '%</text>';
  });
  if(conDatos.length >= 2){
    let d = '', first = true;
    pts.forEach((p, i) => {
      if(p.v == null) return;
      d += (first ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' ';
      first = false;
    });
    g += '<path class="ln s1" d="' + d + '"/>';
    pts.forEach((p, i) => { if(p.v == null) return;
      g += '<circle class="dot f1" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.5"/>'; });
  }
  const L = t('S,M,T,W,T,F,S','D,L,M,X,J,V,S').split(',');
  pts.forEach((p, i) => {
    g += '<text class="axt" x="' + X(i).toFixed(1) + '" y="' + (H-6) + '" text-anchor="middle">' +
      L[parse(p.k).getDay()] + '</text>';
  });
  return '<svg class="chart" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
    'style="height:168px" role="img" aria-label="' +
    t('Weekly adherence','Adherencia de la semana') + '">' + g + '</svg>' +
    (conDatos.length < 2 ? '<div class="meta" style="margin-top:10px">' +
      t('Two days with something scheduled and the curve appears.',
        'Con dos días que tengan algo programado aparece la curva.') + '</div>' : '');
}
function trendChip(pts, m){
  if(pts.length < 2) return '';
  const a = pts[0].v, b = pts[pts.length-1].v, d = b - a;
  const rel = Math.abs(a) > 0 ? Math.abs(d/a) : 0;
  const k = rel < 0.01 ? 'flat' : (d < 0 ? 'down' : 'up');
  const w = k === 'flat' ? t('Steady','Estable') : (d < 0 ? t('Down','Bajando') : t('Up','Subiendo'));
  const amt = k === 'flat' ? '' : ' ' + (d > 0 ? '+' : '−') + nf(Math.abs(d), m.dec) + (m.u ? ' ' + m.u : '');
  return '<span class="badge">' + w + amt + '</span>';
}

/* ==========================================================================
   13 · MÉTRICAS DE CABECERA
   ========================================================================== */
function adherence(n){
  const hoy = today(); let tocaba = 0, hecho = 0;
  for(let i = 0; i < n; i++){
    const k = shift(hoy, -i);
    dueList(k).forEach(p => { tocaba++; if(taken(k, p.id)) hecho++; });
  }
  return {pct: tocaba ? hecho/tocaba : 0, tocaba:tocaba, hecho:hecho};
}
function streak(){
  const hoy = today(); let n = 0;
  for(let i = 0; i < 400; i++){
    const k = shift(hoy, -i), d = dueList(k);
    if(!d.length) continue;
    if(d.every(p => taken(k, p.id))) n++; else break;
  }
  return n;
}
const WINDOWS = [[7, t('This week','Esta semana')], [30, t('This month','Este mes')],
                 [90, t('90 days','90 días')]];

/* ==========================================================================
   14 · EL ARMAZÓN
   ========================================================================== */
/* Nueve destinos en la lateral de escritorio, cinco en la barra inferior del
   móvil, y un solo enrutador. `mob` marca los cinco que salen abajo. */
const NAV = [
  {id:'dash', ic:'dash', en:'Dashboard',  es:'Dashboard',   mob:{en:'Home',      es:'Inicio'}},
  {id:'prot', ic:'prot', en:'Protocols',  es:'Protocolos',  mob:{en:'Protocols', es:'Protocolos'}},
  {id:'comp', ic:'comp', en:'Compounds',  es:'Compuestos',  mob:{en:'Compounds', es:'Compuestos'}},
  {id:'inj',  ic:'inj',  en:'Injections', es:'Inyecciones', mob:{en:'Journal',   es:'Diario'}},
  {id:'cal',  ic:'cal',  en:'Calendar',   es:'Calendario'},
  {id:'prog', ic:'prog', en:'Progress',   es:'Progreso'},
  {id:'lib',  ic:'lib',  en:'Library',    es:'Biblioteca'},
  {id:'edu',  ic:'edu',  en:'Education',  es:'Educación'},
  {id:'set',  ic:'set',  en:'Settings',   es:'Configuración'}
];
const MOBNAV = NAV.filter(n => n.mob).concat([{id:'more', ic:'more', mob:{en:'More', es:'Más'}}]);
const initials = () => {
  const n = (S.me.nombre || '').trim();
  return n ? n.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase() : 'PX';
};
const THEMEICON = () => S.theme === 'dark' ? 'moon' : S.theme === 'system' ? 'auto' : 'sun';

function sidebar(){
  return '<aside class="side">' +
    '<div class="brand">' + mark('px', 'brand-px') +
      '<span class="wm">PEPTIDEX</span></div>' +
    '<nav>' + NAV.map(n => '<button data-go="' + n.id + '"' +
      (S.route === n.id ? ' class="on" aria-current="page"' : '') + '>' +
      svg(n.ic) + '<span>' + t(n.en, n.es) + '</span></button>').join('') + '</nav>' +
    '<button class="me" data-go="set">' +
      '<span class="avatar">' + E(initials()) + '</span>' +
      '<span class="bd"><span class="nm">' +
        (S.me.nombre ? E(S.me.nombre) : t('Your profile','Tu perfil')) + '</span>' +
        '<span class="mt">' + t('My Profile','Mi Perfil') + '</span></span>' +
      '<span class="cv"></span></button>' +
  '</aside>';
}
function topbar(){
  return '<header class="topbar">' +
    '<span class="mob-mark">' + mark('px', 'mob-px') +
      '<span class="wm">PEPTIDEX</span></span>' +
    '<div class="search"><label class="sr" for="gq">' + t('Search','Buscar') + '</label>' +
      svg('search') +
      '<input id="gq" type="search" placeholder="' +
      t('Search compounds, protocols…','Buscar compuestos, protocolos…') +
      '" value="' + E(S.gq||'') + '"/></div>' +
    '<div class="right">' +
      '<button class="ibtn" data-go="inj" aria-label="' + t('Notifications','Avisos') + '">' +
        svg('bell') + '</button>' +
      '<button class="ibtn" data-theme aria-label="' + t('Theme','Tema') + '">' +
        svg(THEMEICON()) + '</button>' +
      '<button class="avatar" data-go="set" aria-label="' + t('Profile','Perfil') + '">' +
        E(initials()) + '</button>' +
    '</div></header>';
}
function tabbar(){
  return '<nav class="tabbar" role="tablist">' + MOBNAV.map(n => {
    const act = n.id === 'more'
      ? ['cal','prog','lib','edu','set','more'].indexOf(S.route) >= 0
      : S.route === n.id;
    return '<button data-go="' + n.id + '" role="tab"' + (act ? ' class="on" aria-selected="true"' : '') +
      '>' + svg(n.ic) + '<span>' + t(n.mob.en, n.mob.es) + '</span></button>';
  }).join('') + '</nav>';
}

const phead = (k, h, p, right) =>
  '<div class="phead"><div class="top"><div>' +
    (k ? '<div class="eyebrow">' + k + '</div>' : '') +
    '<h1 class="h1">' + h + '</h1>' +
    (p ? '<p>' + p + '</p>' : '') +
  '</div>' + (right || '') + '</div></div>';

const empty = (ic, b, s, act) => '<div class="empty"><div class="ico">' + svg(ic) + '</div>' +
  '<b>' + b + '</b><span>' + s + '</span>' +
  (act ? '<div class="acts">' + act + '</div>' : '') + '</div>';

const ruo = () => '<div class="ruo">' + t('Research use only.','Solo uso en investigación.') +
  '<br>' + t('PepX records what you enter. It does not recommend compounds, doses or schedules.',
             'PepX registra lo que tú introduces. No recomienda compuestos, dosis ni pautas.') + '</div>';

/* ==========================================================================
   15 · PORTADA — sin las plumas, sólo el Px
   ========================================================================== */
/* La portada lleva el BLOQUE ENTREGADO, no un «Px» compuesto con la tipografía
   del sistema. Componer las letras era, literalmente, rehacer el logotipo: la
   P con el corte diagonal y la X con su remate no son dos caracteres de una
   fuente. Ahora es el fichero, recortado, en las dos polaridades.

   Y sólo el Px, sin las plumas, como se pidió. */
function vSplash(){
  return '<div class="splash">' +
    '<div class="top">' + mark('lock', 'splash-lock') + '</div>' +
    '<div class="bottom">' +
      '<button class="btn wide" data-enter="in">' + t('Sign in','Iniciar sesión') + '</button>' +
      '<button class="btn ghost wide" data-enter="new">' + t('Create account','Crear cuenta') + '</button>' +
      '<div class="fine">' + t('Science. Precision. Transformation.','Ciencia. Precisión. Transformación.') +
        '<br>' + t('Research use only','Solo uso en investigación') + '</div>' +
    '</div></div>';
}

/* ==========================================================================
   16 · DASHBOARD
   ========================================================================== */
function vDash(){
  const hoy = today();
  const w = +sub1('win', 7);
  const ad = adherence(w), st = streak();
  const activos = S.plan.filter(p => planState(p) === 'active');
  const prox = activos.map(p => ({p:p, k:nextDue(p)})).filter(x => x.k)
    .sort((a,b) => a.k < b.k ? -1 : 1)[0];

  const sel = '<div class="pills" style="flex:0 0 auto">' + WINDOWS.map(x =>
    '<button class="pill' + (w === x[0] ? ' sel' : '') + '" data-sub="win:' + x[0] + '">' +
    x[1] + '</button>').join('') + '</div>';

  /* EL PROTOCOLO DOMINANTE. Uno, el que toca antes. No una lista de fichas:
     una composición partida con el producto real a un lado y el estado al
     otro. Es lo primero que el usuario quiere saber y ocupa el sitio que eso
     merece. */
  const act = prox ? prox.p : activos[0];
  const ph  = act ? phase(act) : null;
  const pg  = act ? planProgress(act) : 0;

  return '' +
    /* --- HÉROE: sólo tipografía y aire. Ni tarjeta ni borde. --- */
    '<section class="phero">' +
      '<h1 class="display">' + greet() +
        (S.me.nombre ? ',<br>' + E(S.me.nombre.split(/\s+/)[0]) : '') + '.</h1>' +
      '<p class="lede">' + t('Your PEPTIDEX overview.','Tu resumen PEPTIDEX.') + '</p>' +
      sel +
    '</section>' +

    /* --- LA CIFRA: cuatro datos en una tira, separados por filetes.
           Cuatro tarjetas para cuatro números era el reflejo de tablero que
           había que quitar. Un número no necesita una caja. --- */
    '<section class="strip">' +
      stat(ad.hecho,                   t('Injections','Inyecciones'),  t('completed','completadas')) +
      stat(Math.round(ad.pct*100)+'%', t('Adherence','Adherencia'),    t('to protocol','al protocolo')) +
      stat(st,                         t('Day streak','Días seguidos'),t('unbroken','sin fallar')) +
      stat(activos.length,             t('Protocols','Protocolos'),    t('active','activos')) +
    '</section>' +

    (act ? '<section class="feature' + (act ? ' l-' + lineaDe(act.c) : '') + '">' +
      '<div class="feature-art">' + vial(act.c, 'hero') + '</div>' +
      '<div class="feature-bd">' +
        '<span class="eyebrow">' + t('Active protocol','Protocolo activo') + '</span>' +
        '<h2 class="h-lg">' + E(act.c) + '</h2>' +
        '<p class="lede sm">' + E(act.dose) + ' ' + E(act.unit) + ' · ' + E(freqText(act)) + '</p>' +
        (ph && ph.total
          ? '<div class="journey">' +
              '<div class="journey-hd"><span>' + t('Phase ','Fase ') + ph.f + '</span>' +
                '<span>' + t('Week ','Semana ') + ph.w + t(' of ',' de ') + ph.total + '</span></div>' +
              '<div class="bar"><i style="width:' + Math.round(pg*100) + '%"></i></div>' +
            '</div>' : '') +
        (prox ? '<div class="nextact">' +
            '<span class="eyebrow">' + t('Next','Siguiente') + '</span>' +
            '<div class="nextact-when">' + fullDate(prox.k) +
              (prox.p.time ? '<b>' + E(prox.p.time) + '</b>' : '') + '</div>' +
          '</div>' : '') +
        '<div class="feature-act">' +
          '<button class="btn" data-open-prot="' + act.id + '">' +
            t('View Details','Ver Detalles') + '</button>' +
          '<button class="btn ghost" data-new-inj>' + t('Log injection','Registrar inyección') + '</button>' +
        '</div>' +
      '</div>' +
      famLock(lineaDe(act.c)) +
    '</section>'
    : '<section class="feature empty-feature">' +
        empty('prot', t('No active protocol','Ningún protocolo activo'),
          t('A protocol is a compound, a dose and a frequency — all three yours.',
            'Un protocolo es un compuesto, una dosis y una frecuencia — los tres tuyos.'),
          '<button class="btn" data-new-prot>' + t('Create one','Crear uno') + '</button>') +
      '</section>') +

    /* --- LOS OTROS PROTOCOLOS, si los hay: una lista sobria y sin marco --- */
    (activos.length > 1 ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Also active','También activos') + '</span>' +
        '<button class="btn quiet sm" data-go="prot">' + t('View all','Ver todos') + '</button></div>' +
      '<div class="bare">' + activos.filter(p => !act || p.id !== act.id).slice(0,3).map(p => {
        const q = phase(p);
        return '<button class="row go" data-open-prot="' + p.id + '">' +
          vial(p.c) +
          '<span class="bd"><span class="nm">' + E(p.c) + '</span>' +
            '<span class="mt">' + (q && q.total
              ? t('Phase ','Fase ') + q.f + ' · ' + t('Week ','Semana ') + q.w + t(' of ',' de ') + q.total
              : E(freqText(p))) + '</span></span>' +
          '<span class="cv"></span></button>';
      }).join('') + '</div></section>' : '') +

    /* --- UNA lectura principal, no seis gráficas --- */
    '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('This week','Esta semana') + '</span>' +
        '<button class="btn quiet sm" data-go="prog">' + t('All progress','Todo el progreso') + '</button></div>' +
      '<div class="insight">' +
        '<div class="insight-n"><b>' + Math.round(ad.pct*100) + '<i>%</i></b>' +
          '<span>' + t('of what you scheduled, logged.','de lo que programaste, registrado.') + '</span></div>' +
        '<div class="insight-c">' + weekChart() + '</div>' +
      '</div>' +
    '</section>' +

    /* --- ACCIONES: texto y filete. Sin cajas, sin iconos decorativos. --- */
    '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Quick actions','Acciones rápidas') + '</span></div>' +
      '<div class="actlist">' +
        qaRow('inj',   t('Log Injection','Registrar Inyección'), 'inj') +
        qaRow('comp',  t('My Compounds','Mis Compuestos'),       'comp') +
        qaRow('bag',   t('Order History','Historial de Pedidos'),'store') +
        qaRow('edu',   t('Education','Educación'),               'edu') +
      '</div>' +
    '</section>' +

    '<section class="band">' + dp(dpToday(), true) + '</section>' +

    (notesHTML() ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Alerts','Avisos') + '</span></div>' +
      notesHTML() + '</section>' : '') + ruo();
}
/* El dato desnudo: cifra grande, dos renglones de rótulo y un filete a la
   izquierda. Sin fondo, sin borde, sin sombra. */
const stat = (v, l1, l2) => '<div class="stat"><b>' + v + '</b>' +
  '<span>' + l1 + '<i>' + l2 + '</i></span></div>';
const qaRow = (ic, label, go) => '<button class="row go" data-go="' + go + '">' +
  '<span style="flex:0 0 auto;width:17px;height:17px;color:var(--tx2)">' + svg(ic) + '</span>' +
  '<span class="bd"><span class="nm" style="font-weight:500;font-size:13.5px">' + label + '</span></span>' +
  '<span class="cv"></span></button>';

/* ==========================================================================
   17 · PROTOCOLOS
   ========================================================================== */
function vProt(){
  const w = sub1('prot', 'active');
  const g = {active:[], done:[], draft:[]};
  S.plan.forEach(p => g[planState(p)].push(p));
  const list = g[w] || [];
  return '' +
    phead(t('PROTOCOLS','PROTOCOLOS'), t('My Protocols.','Mis Protocolos.'),
      t('You write them. PepX does not propose, adjust or suggest a protocol — it remembers the one you entered and shows it back to you.',
        'Los escribes tú. PepX no propone, no ajusta y no sugiere ninguna pauta — se acuerda de la que metiste y te la enseña.'),
      '<button class="btn sm" data-new-prot>' + svg('plus') + t('New','Nuevo') + '</button>') +
    '<div class="pills">' + [['active', t('Active','Activos')], ['done', t('Completed','Completados')],
      ['draft', t('Drafts','Borradores')]].map(x =>
      '<button class="pill' + (w === x[0] ? ' sel' : '') + '" data-sub="prot:' + x[0] + '">' +
      x[1] + (g[x[0]].length ? '<i>' + g[x[0]].length + '</i>' : '') + '</button>').join('') + '</div>' +
    (S.newProt ? protForm() : '') +
    '<div class="protlist">' +
      (list.length ? list.map(p => protCard(p)).join('')
        : '<div class="card">' + empty('prot',
            w === 'active' ? t('No active protocol','Ningún protocolo activo')
            : w === 'done' ? t('Nothing completed yet','Nada completado todavía')
                           : t('No drafts','Sin borradores'),
            t('A protocol is a compound, a dose and a frequency — all three yours.',
              'Un protocolo es un compuesto, una dosis y una frecuencia — los tres tuyos.'),
            '<button class="btn" data-new-prot>' + t('New protocol','Nuevo protocolo') + '</button>') + '</div>') +
    '</div>' + ruo();
}
/* UN PROTOCOLO ES UN RECORRIDO, NO UNA FILA.

   El usuario quiere saber cuatro cosas de un vistazo: dónde empezó, dónde está
   ahora, cuánto le queda y qué toca después. Antes eso era una tarjeta con una
   barra dentro; ahora es una composición con el producto real a un lado y el
   recorrido —hitos, no porcentaje suelto— al otro. */
function protCard(p){
  const ph = phase(p), pr = planProgress(p), nx = nextDue(p);
  const st = planState(p), abierto = S.open === p.id;
  const comps = planCompounds(p);
  const linea = lineaDe(p.c);
  const hoy = today();

  /* Los hitos: inicio, la fase de ahora, el final. Con fechas de verdad, no
     con un tanto por ciento que no dice cuándo. */
  const hitos = [];
  if(p.start) hitos.push({k:p.start, l:t('Started','Empezó'), on:true});
  if(ph && ph.total) hitos.push({k:null,
    l:t('Phase ','Fase ') + ph.f + ' · ' + t('week ','semana ') + ph.w + t(' of ',' de ') + ph.total,
    on:true, now:true});
  if(nx) hitos.push({k:nx, l:t('Next injection','Próxima inyección'), next:true});
  if(p.end) hitos.push({k:p.end, l:t('Ends','Termina'), on:false});

  return '<article class="prot l-' + linea + (abierto ? ' open' : '') + '">' +
    '<div class="prot-art">' + vial(p.c, 'lg') + '</div>' +
    '<div class="prot-bd">' +
      '<div class="prot-hd">' +
        '<div><h3 class="h2">' + E(p.c) + '</h3>' +
          '<div class="meta" style="margin-top:5px">' + E(p.dose) + ' ' + E(p.unit) +
            ' · ' + E(freqText(p)) + '</div></div>' +
        '<span class="badge' + (st === 'active' ? ' solid' : '') + '">' +
          (st === 'active' ? t('ACTIVE','ACTIVO')
            : st === 'done' ? t('DONE','COMPLETADO') : t('DRAFT','BORRADOR')) + '</span>' +
      '</div>' +

      (pr != null ? '<div class="bar" style="margin-top:16px"><i style="width:' +
        (pr*100).toFixed(0) + '%"></i></div>' : '') +

      (hitos.length ? '<ol class="miles">' + hitos.map(h =>
        '<li' + (h.now ? ' class="now"' : h.next ? ' class="next"' : '') + '>' +
          '<span class="ml">' + h.l + '</span>' +
          (h.k ? '<span class="mk">' + human(h.k) +
            (h.next && p.time ? ', ' + E(p.time) : '') + '</span>' : '') +
        '</li>').join('') + '</ol>' : '') +

      (comps.length > 1 ? '<div class="prot-comps">' + comps.slice(0,5).map(c =>
        '<span class="pc">' + vial(c, 'sm') + '<span>' + E(c) + '</span></span>').join('') +
        (comps.length > 5 ? '<span class="more">+' + (comps.length-5) + '</span>' : '') +
        '</div>' : '') +

      '<div class="acts" style="margin-top:18px">' +
        '<button class="btn ghost sm" data-open-prot="' + p.id + '">' +
          (abierto ? t('Hide details','Ocultar detalles') : t('View details','Ver detalles')) + '</button>' +
      '</div>' +

      (abierto ? '<div class="prot-more">' + protBody(p) + '</div>' : '') +
    '</div>' +
  '</article>';
}
function protBody(p){
  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + E(v) + '</b></div>' : '';
  const e = libFind(p.c);
  const hoy = today();
  let tl = '';
  for(let i = -6; i <= 7; i++){
    const k = shift(hoy, i), d = dueOn(p, k);
    tl += '<i class="' + (!d ? '' : taken(k, p.id) ? 'on' : 'miss') + '"></i>';
  }
  return '<div class="eyebrow" style="margin-bottom:8px">' + t('Timeline','Línea de tiempo') + '</div>' +
    '<div class="streak" style="grid-template-columns:repeat(14,1fr);max-width:280px">' + tl + '</div>' +
    '<div style="margin-top:18px">' +
      kv(t('Compound','Compuesto'), p.c) +
      kv(t('Dose','Dosis'), p.dose + ' ' + p.unit) +
      kv(t('Frequency','Frecuencia'), freqText(p)) +
      kv(t('Time','Hora'), p.time) +
      kv(t('Start','Inicio'), p.start ? human(p.start) : '') +
      kv(t('End','Fin'), p.end ? human(p.end) : t('open','abierto')) +
      (e ? kv(t('Product','Producto'), (e.sku || '') + (e.esp ? ' · ' + e.esp : '')) : '') +
    '</div>' +
    (p.notes ? '<p class="body" style="margin-top:14px">' + E(p.notes) + '</p>' : '') +
    '<div class="acts" style="margin-top:18px">' +
      '<button class="btn ghost sm" data-toggle="' + p.id + '">' +
        (p.active ? t('Pause','Pausar') : t('Resume','Reanudar')) + '</button>' +
      (e ? '<button class="btn ghost sm" data-comp="' + E(e.n) + '">' +
        t('View compound','Ver compuesto') + '</button>' : '') +
      '<button class="btn quiet sm" data-del="' + p.id + '">' + t('Delete','Borrar') + '</button>' +
    '</div>';
}
function protForm(){
  return '<div class="card pad" style="margin-top:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span class="eyebrow">' + t('New protocol','Nuevo protocolo') + '</span>' +
      '<button class="ibtn" data-close-prot aria-label="' + t('Close','Cerrar') + '">' + svg('close') + '</button></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Compound','Compuesto') + '</label>' +
        '<input id="pxC" list="pxCL" placeholder="BPC 157"/>' + datalist() + '</div>' +
      '<div><label>' + t('Time','Hora') + '</label><input id="pxT" type="time"/></div></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Dose','Dosis') + '</label><input id="pxD" inputmode="decimal" placeholder="250"/></div>' +
      '<div><label>' + t('Unit','Unidad') + '</label>' +
        '<select id="pxU"><option>mcg</option><option>mg</option><option>iu</option><option>ml</option></select></div></div>' +
    '<label>' + t('How often','Cada cuándo') + '</label>' +
    '<select id="pxF">' + FREQ.map(f => '<option value="' + f.v + '">' + t(f.en, f.es) + '</option>').join('') + '</select>' +
    '<div id="pxFX"></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Start','Inicio') + '</label><input id="pxS" type="date" value="' + today() + '"/></div>' +
      '<div><label>' + t('End (optional)','Fin (opcional)') + '</label><input id="pxE" type="date"/></div></div>' +
    '<label>' + t('Notes','Notas') + '</label><textarea id="pxN"></textarea>' +
    '<div class="acts" style="margin-top:18px"><button class="btn" id="pxAdd">' +
      t('Save protocol','Guardar protocolo') + '</button></div></div>';
}
function datalist(){
  return '<datalist id="pxCL">' + LIB.map(e => '<option value="' + E(e.n) + '">').join('') + '</datalist>';
}
function freqExtra(v){
  const box = document.getElementById('pxFX');
  if(!box) return;
  if(v === 'dow'){
    box.innerHTML = '<label>' + t('Which days','Qué días') + '</label><div class="pick p7">' +
      DOW3().map((d,i) => '<button type="button" data-d="' + i + '">' + d[0] + '</button>').join('') + '</div>';
    box.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));
  } else if(v === 'nd'){
    box.innerHTML = '<label>' + t('Every how many days','Cada cuántos días') + '</label>' +
      '<input id="pxEvery" type="number" min="1" value="3"/>';
  } else if(v === 'cyc'){
    box.innerHTML = '<div class="r2"><div><label>' + t('Days on','Días sí') + '</label>' +
      '<input id="pxOn" type="number" min="1" value="5"/></div><div><label>' + t('Days off','Días no') + '</label>' +
      '<input id="pxOff" type="number" min="0" value="2"/></div></div>';
  } else box.innerHTML = '';
}

/* ==========================================================================
   18 · COMPUESTOS
   ========================================================================== */
function vComp(){
  const q = ((S.lq || S.gq || '') + '').trim().toLowerCase();
  const fam = sub1('comp', '');
  const list = LIB.filter(e =>
    (!fam || family(e) === fam) &&
    (!q || (e.n + ' ' + (e.sku||'') + ' ' + (e.cat||'') + ' ' + (e.mec||'')).toLowerCase().indexOf(q) >= 0));
  const full = can('ult');
  const abierto = S.open ? LIB.filter(e => e.n === S.open)[0] : null;

  if(abierto) return compDetail(abierto, full);

  return '' +
    phead(t('COMPOUNDS','COMPUESTOS'), t('The library.','La biblioteca.'),
      t('%n entries from the PEPTIDEX operations record. Research and education only — no therapeutic claims.',
        '%n fichas del registro de operación de PEPTIDEX. Sólo investigación y formación — sin afirmaciones terapéuticas.')
      .replace('%n', LIB.length)) +
    '<div class="search" style="margin-bottom:14px">' + svg('search') +
      '<input id="lq" placeholder="' + t('Search compounds','Buscar compuestos') + '" value="' + E(S.lq||'') + '"/></div>' +
    '<div class="pills">' +
      '<button class="pill' + (fam ? '' : ' on') + '" data-sub="comp:">' + t('All','Todos') +
        '<i>' + LIB.length + '</i></button>' +
      FAM.map(f => {
        const n = LIB.filter(e => family(e) === f.id).length;
        return n ? '<button class="pill' + (fam === f.id ? ' on' : '') + '" data-sub="comp:' + f.id + '">' +
          t(f.en, f.es) + '<i>' + n + '</i></button>' : '';
      }).join('') + '</div>' +
    /* SECCIONADA, NO UN MURO DE SESENTA FILAS.

       Una lista plana de sesenta entradas obliga a leerlas todas para saber
       dónde está uno. Partida por familia, con el rótulo pegado arriba
       mientras se recorre esa familia, el usuario siempre sabe en qué mundo
       está — y en un teléfono eso es la diferencia entre buscar y hojear.

       Sólo se secciona cuando NO hay filtro: con un filtro puesto la sección
       sería una sola y el rótulo estaría diciendo lo que ya dice la píldora. */
    (list.length
      ? (fam || q ? '<div class="bare complist">' + list.map(compRow).join('') + '</div>'
        : FAM.map(f => {
            const g = list.filter(x => family(x) === f.id);
            if(!g.length) return '';
            return '<section class="csec l-' + (LINEA[f.id] || 'fitness') + '">' +
              '<h2 class="csec-h"><span>' + t(f.en, f.es) + '</span>' +
                '<i>' + g.length + '</i></h2>' +
              '<div class="bare complist">' + g.map(compRow).join('') + '</div>' +
            '</section>';
          }).join('') +
          (function(){
            const sueltos = list.filter(x => !family(x));
            return sueltos.length ? '<section class="csec">' +
              '<h2 class="csec-h"><span>' + t('Other','Otros') + '</span>' +
                '<i>' + sueltos.length + '</i></h2>' +
              '<div class="bare complist">' + sueltos.map(compRow).join('') + '</div>' +
            '</section>' : '';
          })())
      : '<div class="band">' + empty('search', t('Nothing matches','Nada coincide'),
          E(S.lq || ''), '<button class="btn ghost" data-clear-q>' + t('Clear','Limpiar') + '</button>') + '</div>') +
    (!full && LIB.length ? '<div class="card" style="margin-top:12px">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial specification, solvent and cold chain — and the calculator pre-filled from it.',
        'Mecanismo, presentación, solvente y cadena de frío — y la calculadora precargada con ella.'),
      '<button class="btn" data-go="set">' + t('See plans','Ver planes') + '</button>') + '</div>' : '') +
    ruo();
}


/* Una fila de compuesto. Una sola definición: la usan la lista plana (con
   filtro o búsqueda) y la seccionada por familia. Duplicarla era la manera
   segura de que las dos se separaran en el siguiente cambio. */
function compRow(e){
  const full = can('ult');
  return '<button class="row go" data-comp="' + E(e.n) + '">' + vial(e.n) +
    '<span class="bd"><span class="nm">' + E(e.n) + '</span>' +
      '<span class="mt">' + E(full && e.mec ? e.mec.slice(0,72) : (e.cat||'')) + '</span>' +
      '<span class="mt dim">' + E(research(e)) + '</span></span>' +
    '<span class="cv"></span></button>';
}

/* La ficha: héroe, resumen, investigación, especificaciones, relacionados —
   el orden que pide el brief, en composición editorial. */
function compDetail(e, full){
  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + E(v) + '</b></div>' : '';
  const r = e.ref || {}, cons = conserva(e);
  const hayRef = r.ini || r.mant || r.frec || r.hora || r.factor;
  const f = FAM.filter(x => x.id === family(e))[0];
  const rel = LIB.filter(x => x.n !== e.n && family(x) === family(e)).slice(0, 4);
  const ficha =
    kv(t('Vial presentation','Presentación'), e.esp) +
    kv(t('BAC volume','Volumen BAC'), e.bac ? e.bac + ' mL' : '') +
    kv(t('Concentration','Concentración'), e.conc) +
    kv(t('Solvent','Solvente'), e.sol) +
    kv(t('Storage','Almacenamiento'), e.alm) +
    kv(t('Status','Estatus'), e.reg);

  const linea = LINEA[family(e)] || 'fitness';

  return '' +
    '<div class="acts" style="margin:6px 0 0"><button class="btn quiet sm" data-back-comp>' +
      svg('left') + t('Compounds','Compuestos') + '</button></div>' +

    /* HÉROE — el producto a tamaño de producto y el nombre a tamaño de
       portada. Sin tarjeta: lo que enmarca es el aire y un filete al pie. */
    '<section class="phero-prod l-' + linea + '">' +
      '<div class="pp-art">' + vial(e.n, 'hero') + famLock(linea) + '</div>' +
      '<div class="pp-bd">' +
        (f ? '<span class="eyebrow">' + t(f.en, f.es) + '</span>' : '') +
        '<h1 class="display sm">' + E(e.n) + '</h1>' +
        (e.sku ? '<div class="pp-sku">' + E(e.sku) + '</div>' : '') +
        (e.esp ? '<p class="lede sm">' + E(e.esp) + '</p>' : '') +
        '<div class="tags" style="margin-top:18px">' +
          '<span class="badge solid">' + E(research(e)) + '</span>' +
          cons.map(c => '<span class="badge">' + E(c) + '</span>').join('') + '</div>' +
        (e.mg && e.mg.length && full ? '<div class="acts" style="margin-top:22px">' +
          '<button class="btn" data-calc="' + E(e.n) + '">' + svg('flask') +
          t('Open in calculator','Abrir en la calculadora') + '</button></div>' : '') +
      '</div>' +
    '</section>' +

    (!full ? '<section class="band">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial presentation, solvent, cold chain and your reference sheet.',
        'Mecanismo, presentación, solvente, cadena de frío y tu hoja de referencia.'),
      '<button class="btn" data-go="set">' + t('See plans','Ver planes') + '</button>') + '</section>'
    :
    /* RESUMEN — a ancho de lectura, tipografía grande, sin caja */
    (e.mec ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Overview','Resumen') + '</span></div>' +
      '<p class="read">' + E(e.mec) + '</p>' +
      (e.ins ? '<p class="read dim">' + E(e.ins) + '</p>' : '') + '</section>' : '') +

    /* ESPECIFICACIONES — hoja técnica: dos columnas de filete, como Leica */
    (ficha ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Specifications','Especificaciones') + '</span></div>' +
      '<div class="spec">' + ficha + '</div></section>' : '') +

    /* INVESTIGACIÓN — la cita, con su marco y su procedencia. Ésta SÍ lleva
       contenedor, y a propósito: es material citado, no dicho por PepX, y el
       marco es lo que lo dice sin tener que escribirlo. */
    (hayRef ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Research','Investigación') + '</span></div>' +
      '<div class="quote">' +
        '<div class="qh">' + t('From your reference sheet','De tu hoja de referencia') + '</div>' +
        kv(t('Initial','Inicial'), r.ini) + kv(t('Maintenance','Mantenimiento'), r.mant) +
        kv(t('Frequency','Frecuencia'), r.frec) + kv(t('Timing','Horario'), r.hora) +
        kv(t('Factor mcg/kg','Factor mcg/kg'), r.factor) +
        (r.nota ? '<p class="meta" style="margin-top:12px">' + E(r.nota) + '</p>' : '') +
        '<div class="qf">' + t('Quoted from the operations record. PepX does not apply these numbers on its own — you read them and enter what you decide.',
                               'Citado del registro de operación. PepX no aplica estos números por su cuenta — los lees tú y escribes lo que decidas.') + '</div>' +
      '</div></section>' : '')) +

    /* RELACIONADOS — rejilla de producto, no lista de filas */
    (rel.length ? '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('Related compounds','Compuestos relacionados') + '</span></div>' +
      '<div class="relgrid">' + rel.map(x =>
        '<button class="relcard" data-comp="' + E(x.n) + '">' +
          '<span class="relart">' + vial(x.n, 'lg') + '</span>' +
          '<span class="relnm">' + E(x.n) + '</span>' +
          '<span class="relsku">' + E(x.sku || (x.cat || '')) + '</span>' +
        '</button>').join('') + '</div></section>' : '') +
    ruo();
}

/* ==========================================================================
   19 · INYECCIONES (diario)
   ========================================================================== */
function vInj(){
  const sel = S.jsel || today();
  const hoy = today();
  /* la tira de semana de la referencia: siete días alrededor del elegido */
  const base = shift(sel, -((parse(sel).getDay()+7) % 7));
  let strip = '';
  for(let i = 0; i < 7; i++){
    const k = shift(base, i), d = parse(k);
    strip += '<button class="' + (k === sel ? 'on' : '') + '" data-day="' + k + '">' +
      '<em>' + DOW3()[(d.getDay()+6)%7] + '</em><b>' + d.getDate() + '</b></button>';
  }
  const delDia = dueList(sel), reg = S.log[sel] || {};
  const hist = Object.keys(S.log).sort().reverse().slice(0, 20);

  return '' +
    phead(t('INJECTIONS','INYECCIONES'), t('Injection log.','Registro de inyecciones.'),
      t('Every dose you logged, when you logged it and where it went.',
        'Cada dosis que registraste, cuándo la registraste y dónde fue.'),
      '<button class="btn sm" data-new-inj>' + svg('plus') + t('Log','Registrar') + '</button>') +

    '<div class="card pad">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<b style="font-size:14px;letter-spacing:.02em;text-transform:uppercase">' +
          MONL()[parse(sel).getMonth()] + ' ' + parse(sel).getFullYear() + '</b>' +
        '<button class="ibtn" data-go="cal" aria-label="' + t('Calendar','Calendario') + '">' +
          svg('right') + '</button></div>' +
      '<div class="weekstrip">' + strip + '</div>' +
    '</div>' +

    (S.jnew ? injForm(sel) : '') +

    '<div class="sect-h"><span class="eyebrow">' + longDate(sel) + '</span>' +
      '<span class="meta">' + Object.keys(reg).length + '/' + delDia.length + '</span></div>' +
    '<div class="card">' +
      (delDia.length ? delDia.map(p => {
        const on = taken(sel, p.id);
        return '<div class="row">' + vial(p.c) +
          '<span class="bd"><span class="nm">' + E(p.c) + '</span>' +
            '<span class="mt">' + E(p.dose) + ' ' + E(p.unit) +
              (on && reg[p.id] && reg[p.id].z ? ' · ' + E(zName(reg[p.id].z)) : '') + '</span></span>' +
          '<span class="rt meta">' + (on && reg[p.id] && reg[p.id].t ? E(reg[p.id].t) : E(p.time || '')) + '</span>' +
          '<button class="ibtn' + (on ? '' : ' bord') + '" data-tick="' + p.id + '|' + sel +
            '" aria-label="' + (on ? t('Logged','Registrado') : t('Log','Registrar')) + '">' +
            svg(on ? 'check' : 'plus') + '</button></div>';
      }).join('')
      : empty('inj', t('Nothing scheduled','Nada programado'),
          t('Your protocols decide this.','Esto lo deciden tus pautas.'))) +
    '</div>' +

    '<div class="acts" style="margin-top:12px"><button class="btn ghost wide sq" data-new-inj>' +
      svg('plus') + t('Log new injection','Registrar nueva inyección') + '</button></div>' +

    '<div class="sect-h"><span class="eyebrow">' + t('History','Historial') + '</span></div>' +
    (hist.length ? '<div class="card">' + hist.map(k =>
      '<button class="row go" data-day="' + k + '">' +
        '<span class="bd"><span class="nm">' + longDate(k) + '</span>' +
        '<span class="mt">' + Object.keys(S.log[k]).map(id => {
          const p = S.plan.filter(x => x.id === id)[0]; return p ? E(p.c) : '';
        }).filter(Boolean).join(' · ') + '</span></span>' +
        '<span class="rt"><b class="num" style="font-size:15px">' + Object.keys(S.log[k]).length + '</b></span>' +
      '</button>').join('') + '</div>'
    : '<div class="card">' + empty('inj', t('No history yet','Sin historial'),
        t('Every dose you tick appears here.','Cada dosis que marques aparece aquí.')) + '</div>') +
    ruo();
}
function injForm(sel){
  return '<div class="card pad" style="margin-top:12px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span class="eyebrow">' + t('Log an injection','Registrar una inyección') + '</span>' +
      '<button class="ibtn" data-close-inj aria-label="' + t('Close','Cerrar') + '">' + svg('close') + '</button></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Date','Fecha') + '</label><input id="jD" type="date" value="' + sel + '"/></div>' +
      '<div><label>' + t('Time','Hora') + '</label><input id="jT" type="time" value="' +
        new Date().toTimeString().slice(0,5) + '"/></div></div>' +
    '<label>' + t('Protocol','Protocolo') + '</label>' +
    '<select id="jP">' + (S.plan.length
      ? S.plan.map(p => '<option value="' + p.id + '">' + E(p.c) + ' · ' + E(p.dose) + ' ' + E(p.unit) + '</option>').join('')
      : '<option value="">' + t('No protocols yet','Todavía no hay protocolos') + '</option>') + '</select>' +
    '<label>' + t('Site (optional)','Zona (opcional)') + '</label>' +
    '<select id="jZ"><option value="">—</option>' +
      ZONES.map(z => '<option value="' + z.id + '">' + E(zName(z.id)) + '</option>').join('') + '</select>' +
    '<div class="acts" style="margin-top:18px"><button class="btn" id="jAdd">' + t('Save','Guardar') + '</button></div></div>';
}

/* ==========================================================================
   20 · CALENDARIO
   ========================================================================== */
function vCal(){
  const sel = S.jsel || today();
  const cur = S.jmon || sel.slice(0,7);
  const [yy, mm] = cur.split('-').map(Number);
  const first = new Date(yy, mm-1, 1), start = first.getDay();
  const nDays = new Date(yy, mm, 0).getDate();
  const hoy = today();
  let cells = '';
  for(let i = 0; i < start; i++) cells += '<button class="cell void" tabindex="-1"></button>';
  for(let d = 1; d <= nDays; d++){
    const k = yy + '-' + pad(mm) + '-' + pad(d);
    const due = dueList(k), algo = !!(S.log[k] && Object.keys(S.log[k]).length);
    cells += '<button class="cell' + (k === hoy ? ' today' : '') + (k === sel ? ' sel' : '') +
      (algo ? ' done' : due.length ? ' due' : '') + '" data-day="' + k + '">' +
      '<b>' + d + '</b><u></u></button>';
  }
  const delDia = dueList(sel), reg = S.log[sel] || {};
  return '' +
    phead(t('CALENDAR','CALENDARIO'), t('The month.','El mes.'),
      t('Filled dot: something was logged. Hollow: something was scheduled.',
        'Punto lleno: se registró algo. Hueco: había algo programado.')) +
    '<div class="card pad-lg"><div class="cal">' +
      '<div class="calhd">' +
        '<button class="ibtn" data-mon="-1" aria-label="' + t('Previous','Anterior') + '">' + svg('left') + '</button>' +
        '<b>' + MONL()[mm-1] + ' ' + yy + '</b>' +
        '<button class="ibtn" data-mon="1" aria-label="' + t('Next','Siguiente') + '">' + svg('right') + '</button></div>' +
      '<div class="caldow">' + DOW().map(d => '<span>' + d + '</span>').join('') + '</div>' +
      '<div class="calgrid">' + cells + '</div>' +
    '</div></div>' +
    '<div class="sect-h"><span class="eyebrow">' + longDate(sel) + '</span></div>' +
    '<div class="card">' + (delDia.length ? delDia.map(p => {
      const on = taken(sel, p.id);
      return '<div class="row">' + vial(p.c) +
        '<span class="bd"><span class="nm">' + E(p.c) + '</span>' +
        '<span class="mt">' + E(p.dose) + ' ' + E(p.unit) + '</span></span>' +
        '<button class="ibtn' + (on ? '' : ' bord') + '" data-tick="' + p.id + '|' + sel + '">' +
          svg(on ? 'check' : 'plus') + '</button></div>';
    }).join('') : empty('cal', t('Nothing scheduled','Nada programado'),
        t('Your protocols decide this.','Esto lo deciden tus pautas.'))) + '</div>' + ruo();
}

/* ==========================================================================
   21 · PROGRESO
   ========================================================================== */
const WINS = [7, 14, 30, 90];
function vProg(){
  const win = S.win || 14;
  const cards = METRICS.map(m => {
    const pts = series(m.id, win);
    if(!pts.length) return '';
    const vs = pts.map(p => p.v), d = dpMetric(m, pts, win);
    return '<section class="mband">' +
      '<div class="mband-h">' +
        '<div><h3 class="h2">' + E(mName(m)) + '</h3>' +
          '<div class="meta" style="margin-top:5px;max-width:420px">' + t(m.de.en, m.de.es) + '</div></div>' +
        trendChip(pts, m) + '</div>' +
      '<div style="margin-top:18px">' + (m.col ? cols(pts, win, m) : line(pts, win, m)) + '</div>' +
      '<div class="mstats">' +
        '<div><b>' + nf(mean(vs), m.dec) + '</b><span>' + t('avg','media') + ' ' + m.u + '</span></div>' +
        '<div><b>' + nf(mn(vs), m.dec) + '</b><span>' + t('low','mín') + '</span></div>' +
        '<div><b>' + nf(mx(vs), m.dec) + '</b><span>' + t('high','máx') + '</span></div>' +
      '</div>' +
      (d ? '<div style="margin-top:16px">' + dp(d) + '</div>' : '') +
    '</section>';
  }).filter(Boolean);

  /* UNA lectura principal arriba, y las demás debajo. El brief pide una
     visualización que se entienda en segundos, no un tablero de analítica.
     La principal es la adherencia: es la única cifra de esta pantalla que
     sale del registro y no de lo que el usuario se mide a mano. */
  const ad = adherence(win);

  return '' +
    phead(t('PROGRESS','PROGRESO'), t('What changed.','Qué cambió.'),
      t('Numbers you measure yourself. Weekly is enough; monthly and the curve stops meaning anything.',
        'Números que mides tú. Con una vez por semana basta; una vez al mes y la curva deja de decir nada.')) +
    '<div class="pills">' + WINS.map(w => '<button class="pill' + (w === win ? ' sel' : '') +
      '" data-win="' + w + '">' + w + ' ' + t('days','días') + '</button>').join('') + '</div>' +

    '<section class="band lead-insight">' +
      '<div class="insight">' +
        '<div class="insight-n"><b>' + Math.round(ad.pct*100) + '<i>%</i></b>' +
          '<span>' + t('of the %n doses scheduled in these %d days, logged.',
                       'de las %n dosis programadas en estos %d días, registradas.')
            .replace('%n', ad.tocaba).replace('%d', win) + '</span></div>' +
        '<div class="insight-c">' + weekChart() + '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band">' + dp(dpReport(win), true) + '</section>' +
    (cards.length ? cards.join('')
      : '<div class="card" style="margin-top:12px">' + empty('prog',
          t('Nothing measured in this window','Nada medido en esta ventana'),
          t('Use the form below. One weight is enough to start.','Usa el formulario de abajo. Con un peso basta para empezar.')) + '</div>') +
    '<div class="card pad" style="margin-top:12px">' +
      '<div class="eyebrow">' + t('Log a measurement','Registrar una medida') + '</div>' +
      '<div class="r2">' +
        '<div><label>' + t('Date','Fecha') + '</label><input id="pvD" type="date" value="' + today() + '"/></div>' +
        '<div><label>' + t('Energy 1–5','Energía 1–5') + '</label>' + sel5('pv_energia') + '</div></div>' +
      '<div class="r3">' +
        '<div><label>' + t('RHR','FCR') + '</label><input id="pv_rhr" inputmode="decimal"/></div>' +
        '<div><label>' + t('Weight','Peso') + '</label><input id="pv_peso" inputmode="decimal"/></div>' +
        '<div><label>' + t('Steps','Pasos') + '</label><input id="pv_pasos" inputmode="numeric"/></div></div>' +
      '<div class="r3">' +
        '<div><label>' + t('Body fat','Grasa') + '</label><input id="pv_grasa" inputmode="decimal"/></div>' +
        '<div><label>' + t('Sleep','Sueño') + '</label><input id="pv_sueno" inputmode="decimal"/></div>' +
        '<div><label>' + t('Waist','Cintura') + '</label><input id="pv_cintura" inputmode="decimal"/></div></div>' +
      '<label>' + t('Note','Nota') + '</label><textarea id="pvN"></textarea>' +
      '<div class="acts" style="margin-top:18px"><button class="btn" id="pvAdd">' + t('Save','Guardar') + '</button></div></div>' +
    (S.vitals.length ? '<div class="card" style="margin-top:12px">' + S.vitals.slice().reverse().slice(0,20).map(v =>
      '<div class="row"><span class="bd"><span class="nm">' + human(v.d) + '</span>' +
        '<span class="mt">' + METRICS.map(m => (v[m.id] !== '' && v[m.id] != null
          ? mShort(m) + ' ' + E(v[m.id]) + (m.u ? ' ' + m.u : '') : '')).filter(Boolean).join(' · ') + '</span></span>' +
        '<button class="ibtn" data-delv="' + v.d + '" aria-label="' + t('Delete','Borrar') + '">' +
        svg('close') + '</button></div>').join('') + '</div>' : '') +
    ruo();
}
const sel5 = id => '<select id="' + id + '"><option value="">—</option>' +
  [1,2,3,4,5].map(n => '<option>' + n + '</option>').join('') + '</select>';

/* ==========================================================================
   22 · BIBLIOTECA (herramientas)
   ========================================================================== */
function vLib(){
  const w = sub1('lib', 'calc');
  const body = w === 'hl' ? toolHL() : w === 'zon' ? toolZones() : w === 'inv' ? toolVials() : toolCalc();
  return '' +
    phead(t('LIBRARY','BIBLIOTECA'), t('The bench.','La mesa.'),
      t('Arithmetic and records. Every number here is one you entered — nothing on this screen proposes a dose.',
        'Aritmética y registros. Todos los números de aquí los metiste tú — nada de esta pantalla propone una dosis.')) +
    '<div class="pills">' + [['calc', t('Calculator','Calculadora')], ['hl', t('Half-life','Vida media')],
      ['zon', t('Sites','Zonas')], ['inv', t('Vials','Viales')]].map(x =>
      '<button class="pill' + (w === x[0] ? ' sel' : '') + '" data-sub="lib:' + x[0] + '">' + x[1] + '</button>').join('') +
    '</div><div style="margin-top:14px">' + body + '</div>' + ruo();
}
function toolCalc(){
  const c = S.calc || {};
  const mg = +c.mg || 0, ml = +c.ml || 0, dose = +c.dose || 0, du = c.du || 'mcg';
  const doseMg = du === 'mcg' ? dose/1000 : dose;
  const conc = ml > 0 ? mg/ml : 0;
  const volMl = conc > 0 ? doseMg/conc : 0;
  const units = volMl * 100;
  const nDosis = doseMg > 0 ? Math.floor(mg/doseMg) : 0;
  const pw = c.pw != null ? +c.pw : 7;
  const dias = pw > 0 && nDosis ? Math.round(nDosis / pw * 7) : 0;
  const ok = mg > 0 && ml > 0 && dose > 0;
  const e = c.comp ? libFind(c.comp) : null;
  const viales = (e && e.mg && e.mg.length) ? e.mg : [];
  const cons = e ? conserva(e) : [];
  const avisos = [];
  if(ok && units > 100)
    avisos.push(t('%u units does not fit in a 1 mL U-100 syringe — it needs more than one fill, or less solvent.',
                  '%u unidades no caben en una jeringa U-100 de 1 mL — hacen falta más de una carga, o menos disolvente.')
      .replace('%u', nf(units,1)));
  if(ok && units < 2 && units > 0)
    avisos.push(t('Below 2 units the graduation itself is the limit of what can be read on a U-100 syringe.',
                  'Por debajo de 2 unidades, la propia graduación es el límite de lo que se puede leer en una jeringa U-100.'));

  return '<div class="card pad">' +
    '<div class="eyebrow">' + t('Reconstitution','Reconstitución') + '</div>' +
    '<p class="meta" style="margin:10px 0 0">' + t('You give it the vial, the solvent and your dose. It gives you the mark on the syringe. It does not decide the dose — that is not its job and never will be.',
      'Le das el vial, el disolvente y tu dosis. Te da la marca en la jeringa. No decide la dosis — no es su trabajo, ni lo va a ser.') + '</p>' +
    (LIB.length ? '<label>' + t('Compound (optional)','Compuesto (opcional)') + '</label>' +
      '<select id="caComp"><option value="">' + t('— pick to pre-fill —','— elige y se rellena —') + '</option>' +
      LIB.map(x => '<option' + (c.comp === x.n ? ' selected' : '') + '>' + E(x.n) + '</option>').join('') + '</select>' : '') +
    (e ? '<div class="tags" style="margin-top:12px">' +
      (e.sku ? '<span class="badge">' + E(e.sku) + '</span>' : '') +
      (e.sol ? '<span class="badge">' + E(e.sol) + '</span>' : '') +
      cons.map(x => '<span class="badge solid">' + E(x) + '</span>').join('') + '</div>' : '') +
    '<label>' + t('Peptide in the vial (mg)','Péptido en el vial (mg)') + '</label>' +
    (viales.length ? '<div class="pick' + (viales.length <= 2 ? ' p2' : viales.length === 3 ? ' p3' : '') + '">' +
      viales.map(v => '<button data-vmg="' + v + '"' + (+c.mg === v ? ' class="on"' : '') + '>' +
        nf(v,1) + ' mg</button>').join('') + '</div>' : '') +
    '<input id="caMg" inputmode="decimal" placeholder="10" value="' + E(c.mg||'') + '"' +
      (viales.length ? ' style="margin-top:8px"' : '') + '/>' +
    '<label>' + t('Solvent added (mL)','Disolvente añadido (mL)') + '</label>' +
    '<div class="pick">' + [1,2,3,5].map(v =>
      '<button data-ml="' + v + '"' + (+c.ml === v ? ' class="on"' : '') + '>' + v + ' mL</button>').join('') + '</div>' +
    '<input id="caMl" inputmode="decimal" placeholder="' + t('or type it','o escríbelo') + '" value="' + E(c.ml||'') + '" style="margin-top:8px"/>' +
    '<label>' + t('Your dose per injection','Tu dosis por aplicación') + '</label>' +
    '<div class="withu"><input id="caD" inputmode="decimal" placeholder="250" value="' + E(c.dose||'') + '"/>' +
      '<span class="uu"><button data-du="mcg"' + (du==='mcg'?' class="on"':'') + '>mcg</button>' +
      '<button data-du="mg"' + (du==='mg'?' class="on"':'') + '>mg</button></span></div>' +
    '<label>' + t('How often, to estimate how long it lasts','Cada cuánto, para estimar cuánto dura') + '</label>' +
    '<div class="pick p3">' + [[7,t('Daily','Diario')],[3.5,t('Alternate','Alternos')],[2,t('2× week','2×/sem')]].map(x =>
      '<button data-pw="' + x[0] + '"' + (pw === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
    (ok ? '<div class="out">' +
      '<div class="hero"><b>' + nf(units, units < 10 ? 1 : 0) + '<small>' + t('units','unidades') + '</small></b>' +
        '<span>' + t('on a 1 mL U-100 insulin syringe','en una jeringa de insulina U-100 de 1 mL') + '</span></div>' +
      syringe(units) +
      '<div class="grid">' +
        '<div class="g"><b>' + nf(conc,2) + ' mg/mL</b><span>' + t('concentration','concentración') + '</span></div>' +
        '<div class="g"><b>' + nf(volMl,3) + ' mL</b><span>' + t('per dose','por dosis') + '</span></div>' +
        '<div class="g"><b>' + nDosis + '</b><span>' + t('doses per vial','dosis por vial') + '</span></div>' +
        '<div class="g"><b>' + (dias ? '≈ ' + dias : '—') + '</b><span>' + t('days at that rate','días a ese ritmo') + '</span></div>' +
      '</div>' +
      avisos.map(a => '<div class="warnline">' + svg('warn') + '<span>' + a + '</span></div>').join('') +
    '</div>'
    : '<div class="out">' + empty('flask', t('Fill in the three fields','Rellena los tres campos'),
        t('Vial, solvent and dose. All three are yours.','Vial, disolvente y dosis. Los tres son tuyos.')) + '</div>') +
  '</div>';
}
function syringe(units){
  const W = 620, H = 74, X0 = 28, X1 = 592, Y = 26, BH = 24;
  const u = Math.max(0, Math.min(100, units));
  const X = v => X0 + (v/100) * (X1-X0);
  let g = '';
  for(let v = 0; v <= 100; v += 5){
    const big = v % 10 === 0;
    g += '<line class="' + (big?'tkb':'tk') + '" x1="' + X(v).toFixed(1) + '" y1="' + (Y+BH) +
         '" x2="' + X(v).toFixed(1) + '" y2="' + (Y+BH+(big?7:4)) + '"/>';
    if(v % 20 === 0) g += '<text x="' + X(v).toFixed(1) + '" y="' + (Y+BH+18) +
      '" text-anchor="middle">' + v + '</text>';
  }
  g = '<rect class="fill" x="' + X0 + '" y="' + Y + '" width="' + (X(u)-X0).toFixed(1) +
      '" height="' + BH + '" rx="3"/>' +
      '<rect class="barrel" x="' + X0 + '" y="' + Y + '" width="' + (X1-X0) + '" height="' + BH + '" rx="4"/>' + g +
      '<line class="plunger" x1="' + X(u).toFixed(1) + '" y1="' + (Y-6) + '" x2="' + X(u).toFixed(1) +
      '" y2="' + (Y+BH+6) + '"/>' +
      '<text class="big" x="' + Math.min(X1-4, Math.max(X0+4, X(u))).toFixed(1) + '" y="' + (Y-12) +
      '" text-anchor="' + (u>82?'end':u<12?'start':'middle') + '">' + nf(u, u<10?1:0) + '</text>';
  return '<div class="syringe"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    t('Syringe scale','Escala de la jeringa') + '">' + g + '</svg></div>';
}
function levels(){
  const byC = {};
  Object.keys(S.log).forEach(k => Object.keys(S.log[k]).forEach(id => {
    const p = S.plan.filter(x => x.id === id)[0];
    if(!p) return;
    let mg = null;
    if(p.unit === 'mg')  mg = +p.dose;
    if(p.unit === 'mcg') mg = +p.dose / 1000;
    if(mg == null || isNaN(mg)) return;
    (byC[p.c] = byC[p.c] || []).push({d:k, mg:mg});
  }));
  return byC;
}
function levelAt(doses, hlH, k){
  if(!hlH) return null;
  const hlD = hlH/24;
  return doses.reduce((a, x) => {
    const dt = days(x.d, k);
    return dt < 0 ? a : a + x.mg * Math.pow(0.5, dt/hlD);
  }, 0);
}
function toolHL(){
  const byC = levels(), comps = Object.keys(byC), hoy = today();
  const win = 14, back = 7;
  const dib = comps.filter(c => +S.hl[c] > 0).slice(0, 3);
  let chart = '';
  if(dib.length){
    const H = 200, PT = 12, PB = 24, PR = 62;
    const from = shift(hoy, -back), xs = [];
    for(let i = 0; i < win; i++) xs.push(shift(from, i));
    const vals = [];
    const cur = dib.map(c => {
      const row = xs.map(k => levelAt(byC[c], +S.hl[c], k));
      row.forEach(v => vals.push(v));
      return {c:c, row:row};
    });
    const top = (mx(vals) || 1) * 1.16;
    const X = i => (i/(win-1)) * (CW-PR);
    const Y = v => PT + (1 - v/top) * (H-PT-PB);
    let g = '';
    for(let i = 0; i <= 3; i++){
      const v = top*i/3;
      g += '<line class="grid" x1="0" y1="' + Y(v).toFixed(1) + '" x2="' + (CW-PR) + '" y2="' + Y(v).toFixed(1) + '"/>' +
           '<text class="axt" x="' + (CW-PR+8) + '" y="' + (Y(v)+3.5).toFixed(1) + '">' + nf(v,2) + ' mg</text>';
    }
    g += '<line class="grid" x1="' + X(back).toFixed(1) + '" y1="' + PT + '" x2="' + X(back).toFixed(1) +
         '" y2="' + (H-PB) + '"/>';
    cur.forEach((s, i) => {
      const cls = 's' + (i+1);
      let d1 = '', d2 = '';
      s.row.forEach((v, j) => {
        if(j <= back) d1 += (j===0?'M':'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
        if(j >= back) d2 += (j===back?'M':'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      });
      g += '<path class="ln ' + cls + '" d="' + d1 + '"/>' +
           '<path class="ln ' + cls + ' proj" d="' + d2 + '"/>' +
           '<circle class="dot f' + (i+1) + '" cx="' + X(back).toFixed(1) + '" cy="' +
             Y(s.row[back]).toFixed(1) + '" r="3.5"/>' +
           /* el rótulo directo: en monocromo el trazo no basta para nombrar */
           '<text class="lbl" x="' + (X(back)+9).toFixed(1) + '" y="' + (Y(s.row[back])-8).toFixed(1) + '">' +
             E(s.c.slice(0,12)) + '</text>';
    });
    [0, back, win-1].forEach((i, j) => {
      const d = parse(xs[i]);
      g += '<text class="axt" x="' + X(i).toFixed(1) + '" y="' + (H-6) + '" text-anchor="' +
        (j===0?'start':j===2?'end':'middle') + '">' +
        (i === back ? t('now','ahora') : d.getDate() + ' ' + MON()[d.getMonth()]) + '</text>';
    });
    chart = '<svg class="chart" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
      'style="height:200px" role="img">' + g + '</svg>' +
      (dib.length >= 2 ? '<div class="legend">' + dib.map((c,i) =>
        '<span><i class="k' + (i+1) + '"></i>' + E(c) + '</span>').join('') + '</div>' : '');
  }
  const filas = comps.map(c => {
    const hl = +S.hl[c], idx = dib.indexOf(c);
    const now = hl ? levelAt(byC[c], hl, hoy) : null;
    let clears = '';
    if(hl && now){
      const last = byC[c].slice().sort((a,b) => a.d < b.d ? 1 : -1)[0];
      let k = hoy, lim = last.mg * 0.01, n = 0;
      while(levelAt(byC[c], hl, k) > lim && n < 400){ k = shift(k,1); n++; }
      clears = t('below 1% of the last dose ','por debajo del 1% de la última dosis ') + human(k).toLowerCase();
    }
    return '<div class="row">' +
      '<span style="flex:0 0 auto;width:16px;border-top:2px ' +
        (idx===0?'solid':idx===1?'dashed':idx===2?'dotted':'solid') + ' ' +
        (idx>=0 ? 'var(--d' + (idx+1) + ')' : 'var(--dx)') + '"></span>' +
      '<span class="bd"><span class="nm">' + E(c) + '</span>' +
      '<span class="mt">' + (hl ? t('half-life ','vida media ') + nf(hl,1) + ' h · ' + clears
                                : t('no half-life entered','sin vida media introducida')) + '</span></span>' +
      '<span class="rt"><b class="num" style="font-size:15px">' + (now != null ? nf(now,2) : '—') + '</b>' +
      '<span class="meta"> mg</span></span></div>';
  }).join('');
  return '<div class="card pad">' +
    '<div class="eyebrow">' + t('Decay of what you logged','Decaimiento de lo que registraste') + '</div>' +
    '<p class="meta" style="margin:10px 0 16px">' + t('The half-life is yours to enter — from the COA or the literature you work with. PepX does not publish pharmacokinetic values; it draws the curve of the doses you recorded, with the number you gave it.',
      'La vida media la escribes tú — del COA o de la literatura que manejes. PepX no publica valores farmacocinéticos; dibuja la curva de las dosis que registraste, con el número que le diste.') + '</p>' +
    (chart || empty('prog', t('No curve yet','Todavía no hay curva'),
      comps.length ? t('Enter a half-life below and the curve appears.','Escribe una vida media abajo y aparece la curva.')
                   : t('Log a dose first — the curve is built from your record.','Registra antes una dosis — la curva se construye con tu registro.'))) +
    '</div>' +
    (filas ? '<div class="card" style="margin-top:12px">' + filas + '</div>' : '') +
    (comps.length ? '<div class="card pad" style="margin-top:12px">' +
      '<div class="eyebrow">' + t('Half-life per compound','Vida media por compuesto') + '</div>' +
      comps.map(c => '<div><label>' + E(c) + ' — ' + t('hours','horas') + '</label>' +
        '<input data-hl="' + E(c) + '" inputmode="decimal" value="' + E(S.hl[c]||'') + '" placeholder="—"/></div>').join('') +
      '<div class="acts" style="margin-top:18px"><button class="btn" id="hlSave">' + t('Save','Guardar') + '</button></div></div>' : '');
}
const ZONES = [
  {id:'delt_i', v:'f', en:'Left deltoid',  es:'Deltoides izq.', s:'e', x:147, y:96,  rx:13, ry:17},
  {id:'delt_d', v:'f', en:'Right deltoid', es:'Deltoides der.', s:'e', x:53,  y:96,  rx:13, ry:17},
  {id:'abd_i',  v:'f', en:'Left abdomen',  es:'Abdomen izq.',   s:'r', x:102, y:150, w:19, h:38},
  {id:'abd_d',  v:'f', en:'Right abdomen', es:'Abdomen der.',   s:'r', x:79,  y:150, w:19, h:38},
  {id:'mus_i',  v:'f', en:'Left thigh',    es:'Muslo izq.',     s:'r', x:104, y:236, w:22, h:54},
  {id:'mus_d',  v:'f', en:'Right thigh',   es:'Muslo der.',     s:'r', x:74,  y:236, w:22, h:54},
  {id:'tri_i',  v:'b', en:'Left triceps',  es:'Tríceps izq.',   s:'e', x:53,  y:126, rx:12, ry:18},
  {id:'tri_d',  v:'b', en:'Right triceps', es:'Tríceps der.',   s:'e', x:147, y:126, rx:12, ry:18},
  {id:'lum_i',  v:'b', en:'Left flank',    es:'Flanco izq.',    s:'r', x:79,  y:158, w:19, h:30},
  {id:'lum_d',  v:'b', en:'Right flank',   es:'Flanco der.',    s:'r', x:102, y:158, w:19, h:30},
  {id:'glu_i',  v:'b', en:'Left glute',    es:'Glúteo izq.',    s:'r', x:77,  y:196, w:21, h:34},
  {id:'glu_d',  v:'b', en:'Right glute',   es:'Glúteo der.',    s:'r', x:102, y:196, w:21, h:34}
];
const zName = id => { const z = ZONES.filter(x => x.id === id)[0]; return z ? t(z.en, z.es) : id; };
function zoneState(id){
  const us = S.sites.filter(s => s.z === id).sort((a,b) => a.d < b.d ? 1 : -1);
  if(!us.length) return 0;
  const ult = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1)[0];
  if(ult && ult.z === id) return 2;
  return days(us[0].d, today()) <= 21 ? 1 : 0;
}
function figure(view){
  return '<svg viewBox="0 0 200 340" role="img" aria-label="' +
    (view === 'f' ? t('Front','Frente') : t('Back','Espalda')) + '">' +
    '<circle class="silo" cx="100" cy="26" r="19"/><path class="silo" d="M92 45h16v9h-16z"/>' +
    '<path class="silo" d="M66 58q34-9 68 0l-4 88q-30 8-60 0z"/>' +
    '<path class="silo" d="M60 60q-10 3-11 12l-5 62q-1 8 6 9t9-6l8-58z"/>' +
    '<path class="silo" d="M140 60q10 3 11 12l5 62q1 8-6 9t-9-6l-8-58z"/>' +
    '<path class="silo" d="M72 148h56l-4 44H76z"/>' +
    '<path class="silo" d="M77 192h20l-3 108q-1 9-8 9t-8-9z"/>' +
    '<path class="silo" d="M103 192h20l-1 108q0 9-8 9t-8-9z"/>' +
    ZONES.filter(z => z.v === view).map(z => {
      const st = zoneState(z.id);
      const cls = 'zone' + (st === 2 ? ' recent' : st === 1 ? ' used' : '');
      return z.s === 'e'
        ? '<ellipse class="' + cls + '" data-zone="' + z.id + '" cx="' + z.x + '" cy="' + z.y +
          '" rx="' + z.rx + '" ry="' + z.ry + '"><title>' + E(zName(z.id)) + '</title></ellipse>'
        : '<rect class="' + cls + '" data-zone="' + z.id + '" x="' + z.x + '" y="' + z.y +
          '" width="' + z.w + '" height="' + z.h + '" rx="8"><title>' + E(zName(z.id)) + '</title></rect>';
    }).join('') + '</svg>';
}
function toolZones(){
  const view = S.zview || 'f';
  const zs = ZONES.filter(z => z.v === view);
  return '<div class="card pad">' +
    '<div class="eyebrow">' + t('Where the last ones went','Dónde fueron las últimas') + '</div>' +
    '<p class="meta" style="margin:10px 0 0">' + t('A notebook, not a manual: PepX records the site you tell it so you can see at a glance which one has had a rest. It does not explain technique.',
      'Un cuaderno, no un manual: PepX apunta la zona que le digas para que veas de un vistazo cuál ha descansado. No explica técnica.') + '</p>' +
    '<div class="pills" style="margin-top:14px">' +
      '<button class="pill' + (view==='f'?' sel':'') + '" data-zv="f">' + t('Front','Frente') + '</button>' +
      '<button class="pill' + (view==='b'?' sel':'') + '" data-zv="b">' + t('Back','Espalda') + '</button></div>' +
    '<p class="meta" style="margin-top:12px">' + (view === 'f'
      ? t('Seen from the front, as if facing you: <b>left</b> is on the right of the drawing.',
          'Visto de frente, como si estuviera enfrente: la <b>izquierda</b> queda a la derecha del dibujo.')
      : t('Seen from behind: left and right fall on the same side as yours.',
          'Visto de espaldas: izquierda y derecha caen del mismo lado que las tuyas.')) + '</p>' +
    '<div class="bodywrap" style="margin-top:14px"><div class="fig">' + figure(view) + '</div>' +
      '<div class="zlist">' + zs.map(z => {
        const us = S.sites.filter(s => s.z === z.id).sort((a,b) => a.d < b.d ? 1 : -1);
        return '<div class="row" style="padding-left:0;padding-right:0">' +
          '<span class="bd"><span class="nm">' + E(zName(z.id)) + '</span>' +
          '<span class="mt">' + (us.length ? E(us[0].c || '') : t('never used','nunca usada')) + '</span></span>' +
          '<span class="rt meta">' + (us.length ? human(us[0].d) : '—') + '</span></div>';
      }).join('') + '</div></div></div>';
}
function toolVials(){
  const hoy = today();
  return (S.vials.length ? '<div class="card">' + S.vials.map(v => {
      const rec = v.recon ? days(v.recon, hoy) : null;
      return '<div class="row">' + vial(v.c) +
        '<span class="bd"><span class="nm">' + E(v.c) + (v.mg ? ' · ' + E(v.mg) : '') + '</span>' +
        '<span class="mt">' + (v.lote ? t('lot ','lote ') + E(v.lote) : '') +
          (rec != null ? ' · ' + rec + t(' d reconstituted',' d reconstituido') : '') +
          (v.exp ? ' · ' + t('exp ','cad ') + human(v.exp).toLowerCase() : '') + '</span></span>' +
        '<span class="rt"><b class="num" style="font-size:16px">' +
          (v.quedan !== '' && v.quedan != null ? E(v.quedan) : '—') + '</b>' +
          '<span class="meta">' + t('left','quedan') + '</span></span>' +
        '<button class="ibtn" data-delvial="' + v.id + '">' + svg('close') + '</button></div>';
    }).join('') + '</div>'
    : '<div class="card">' + empty('box', t('No vials logged','Sin viales registrados'),
        t('Add one and PepX can warn you before it runs out.','Añade uno y PepX podrá avisarte antes de que se acabe.')) + '</div>') +
  '<div class="card pad" style="margin-top:12px">' +
    '<div class="eyebrow">' + t('Add a vial','Añadir un vial') + '</div>' +
    '<div class="r2"><div><label>' + t('Compound','Compuesto') + '</label><input id="viC" list="pxCL"/>' + datalist() + '</div>' +
      '<div><label>' + t('Presentation','Presentación') + '</label><input id="viM" placeholder="10 mg"/></div></div>' +
    '<div class="r2"><div><label>' + t('Batch','Lote') + '</label><input id="viL" placeholder="L-2601-BC-01"/></div>' +
      '<div><label>' + t('Doses left','Dosis restantes') + '</label><input id="viQ" type="number" min="0"/></div></div>' +
    '<div class="r2"><div><label>' + t('Reconstituted','Reconstituido') + '</label><input id="viR" type="date"/></div>' +
      '<div><label>' + t('Expiry','Caducidad') + '</label><input id="viE" type="date"/></div></div>' +
    '<div class="acts" style="margin-top:18px"><button class="btn" id="viAdd">' + t('Add','Añadir') + '</button></div></div>';
}

/* ==========================================================================
   23 · EDUCACIÓN

   Contenido real o hueco declarado. Lo que hay son guías de uso de la propia
   aplicación, escritas aquí. Lo que no hay —los vídeos— se dice que no hay, en
   vez de rellenarlo con material inventado sobre compuestos.
   ========================================================================== */
const ARTS = [
  {k:'art', t:{en:'Reading a reconstitution', es:'Leer una reconstitución'},
   d:{en:'Why mg in the vial and mL of solvent give you a mark on the syringe, and why that mark is arithmetic and not advice.',
      es:'Por qué los mg del vial y los mL de disolvente dan una marca en la jeringa, y por qué esa marca es aritmética y no un consejo.'},
   m:{en:'4 min read', es:'4 min de lectura'}, go:'lib'},
  {k:'art', t:{en:'Cold chain and light', es:'Cadena de frío y luz'},
   d:{en:'What the storage column of each compound sheet means, and why the reconstitution date matters more than the expiry.',
      es:'Qué significa la columna de almacenamiento de cada ficha, y por qué la fecha de reconstitución importa más que la caducidad.'},
   m:{en:'5 min read', es:'5 min de lectura'}, go:'comp'},
  {k:'art', t:{en:'Why PepX never proposes a dose', es:'Por qué PepX nunca propone una dosis'},
   d:{en:'Where the line sits between a record and a recommendation, and why the reference sheet is quoted rather than applied.',
      es:'Dónde está la raya entre un registro y una recomendación, y por qué la hoja de referencia se cita en vez de aplicarse.'},
   m:{en:'3 min read', es:'3 min de lectura'}, go:'set'},
  {k:'pro', t:{en:'What a protocol is here', es:'Qué es un protocolo aquí'},
   d:{en:'Four facts you write down: a compound, a dose, a frequency and a start. The app remembers them, counts them and warns you when the vial runs out.',
      es:'Cuatro datos que escribes tú: un compuesto, una dosis, una frecuencia y un inicio. La app se acuerda, los cuenta y te avisa cuando se acaba el vial.'},
   m:{en:'4 min read', es:'4 min de lectura'}, go:'prot'},
  {k:'pro', t:{en:'Rotating sites', es:'Rotar zonas'},
   d:{en:'What the app records about placement, and what it deliberately does not explain.',
      es:'Qué apunta la aplicación sobre la colocación, y qué no explica a propósito.'},
   m:{en:'2 min read', es:'2 min de lectura'}, go:'lib'}
];
function vEdu(){
  const w = sub1('edu', 'all');
  const list = ARTS.filter(a => w === 'all' || a.k === w);
  return '' +
    phead(t('EDUCATION','EDUCACIÓN'), t('Read first.','Leer primero.'),
      t('Research and education only. Nothing here is a therapeutic claim, a protocol or a recommendation.',
        'Sólo investigación y formación. Nada de aquí es una afirmación terapéutica, un protocolo ni una recomendación.')) +
    '<div class="pills">' + [['all', t('All','Todos')], ['art', t('Articles','Artículos')],
      ['vid', t('Videos','Vídeos')], ['pro', t('Protocols','Protocolos')]].map(x =>
      '<button class="pill' + (w === x[0] ? ' on' : '') + '" data-sub="edu:' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    (w === 'vid'
      ? '<div class="card" style="margin-top:14px">' + empty('play', t('No videos yet','Todavía no hay vídeos'),
          t('This shelf is empty on purpose. It will hold PEPTIDEX material when there is PEPTIDEX material — not stock footage about compounds.',
            'Este estante está vacío a propósito. Llevará material de PEPTIDEX cuando haya material de PEPTIDEX — no vídeo de archivo sobre compuestos.')) + '</div>'
      : (list.length ? eduPortada(list[0]) + eduResto(list.slice(1)) : '')) +

    /* LAS TRES LÍNEAS — descubrimiento por familia, con el producto y el
       bloque entregados. Es lo más cerca de una portada de catálogo que puede
       estar esto sin inventar fotografía que no existe. */
    '<section class="band">' +
      '<div class="band-h"><span class="eyebrow">' + t('The three lines','Las tres líneas') + '</span></div>' +
      '<div class="lines">' + [
        ['fitness',   t('Performance, recovery and engineering.','Rendimiento, recuperación e ingeniería.'), 'perf'],
        ['beauty',    t('Refinement and cosmetic science.','Refinamiento y ciencia cosmética.'), 'beau'],
        ['longevity', t('Time, calm and advanced science.','Tiempo, calma y ciencia avanzada.'), 'long']
      ].map(x => '<button class="linecard l-' + x[0] + '" data-sub="comp:' + x[2] + '" data-go="comp">' +
        '<span class="lc-art">' + (ART['vial_' + x[0]]
          ? '<img src="' + ART['vial_' + x[0]] + '" alt="PEPTIDEX ' + x[0].toUpperCase() +
            '" loading="lazy" decoding="async"/>' : '') + '</span>' +
        '<span class="lc-bd">' + famLock(x[0]) +
          '<span class="lc-tx">' + x[1] + '</span></span>' +
      '</button>').join('') + '</div>' +
    '</section>' +
    ruo();
}
/* La portada editorial: UN artículo grande, no doce iguales. Que algo sea lo
   primero es una decisión, y una rejilla de tarjetas idénticas se niega a
   tomarla. */
function eduPortada(a){
  return '<button class="edu-lead" data-go="' + a.go + '">' +
    '<span class="edu-lead-bd">' +
      '<span class="eyebrow">' + (a.k === 'pro' ? t('PROTOCOL','PROTOCOLO') : t('ARTICLE','ARTÍCULO')) + '</span>' +
      '<span class="h-lg">' + t(a.t.en, a.t.es) + '</span>' +
      '<span class="lede sm">' + t(a.m.en, a.m.es) + '</span>' +
      '<span class="edu-go">' + t('Read','Leer') + ' →</span>' +
    '</span></button>';
}
function eduResto(list){
  if(!list.length) return '';
  return '<div class="edu-rest">' + list.map(a =>
    '<button class="edu-item" data-go="' + a.go + '">' +
      '<span class="eyebrow">' + (a.k === 'pro' ? t('PROTOCOL','PROTOCOLO') : t('ARTICLE','ARTÍCULO')) + '</span>' +
      '<span class="ei-t">' + t(a.t.en, a.t.es) + '</span>' +
      '<span class="ei-m">' + t(a.m.en, a.m.es) + '</span></button>').join('') + '</div>';
}

/* ==========================================================================
   24 · MÁS (sólo móvil)
   ========================================================================== */
/* «Más» era una caja con seis filas sin orden. Aquí no cabe todo el menú, así
   que lo que cabe tiene que estar agrupado por PARA QUÉ SIRVE — que es lo que
   el usuario tiene en la cabeza cuando abre esta pestaña. */
function vMore(){
  const GRUPOS = [
    {t:t('Your record','Tu registro'),   ids:['cal','prog']},
    {t:t('Reference','Referencia'),      ids:['lib','edu']},
    {t:t('Account','Cuenta'),            ids:['set']}
  ];
  const fila = n => '<button class="row go" data-go="' + n.id + '">' +
    '<span class="rico">' + svg(n.ic) + '</span>' +
    '<span class="bd"><span class="nm">' + t(n.en, n.es) + '</span>' +
      '<span class="mt">' + t(MOREDESC[n.id].en, MOREDESC[n.id].es) + '</span></span>' +
    '<span class="cv"></span></button>';
  return '' +
    phead('', t('More.','Más.')) +

    '<section class="band mtop0">' +
      '<button class="row go pchrow" data-pch>' +
        '<span class="rico">' + MK + '</span>' +
        '<span class="bd"><span class="nm">PepCheems</span>' +
          '<span class="mt">' + t('Ask about your log or a compound. Offline.',
                                  'Pregunta por tu registro o un compuesto. Sin conexión.') + '</span></span>' +
        '<span class="cv"></span></button>' +
    '</section>' +

    GRUPOS.map(g => '<section class="csec">' +
      '<h2 class="csec-h"><span>' + g.t + '</span></h2>' +
      '<div class="bare">' + g.ids.map(id => fila(NAV.filter(n => n.id === id)[0])).join('') + '</div>' +
    '</section>').join('') +

    '<section class="csec">' +
      '<h2 class="csec-h"><span>' + t('PEPTIDEX','PEPTIDEX') + '</span></h2>' +
      '<div class="bare">' +
        '<a class="row go" href="' + STORE + '" target="_blank" rel="noopener">' +
          '<span class="rico">' + svg('bag') + '</span>' +
          '<span class="bd"><span class="nm">' + t('Store','Tienda') + '</span>' +
          '<span class="mt">peptidex.netlify.app</span></span><span class="cv"></span></a>' +
        '<a class="row go" href="mailto:' + MAIL + '">' +
          '<span class="rico">' + svg('help') + '</span>' +
          '<span class="bd"><span class="nm">' + t('Support','Soporte') + '</span>' +
          '<span class="mt">' + MAIL + '</span></span><span class="cv"></span></a>' +
      '</div>' +
    '</section>' + ruo();
}
const MOREDESC = {
  cal:  {en:'Your month, day by day',       es:'Tu mes, día por día'},
  prog: {en:'What you measured, over time', es:'Lo que mediste, en el tiempo'},
  lib:  {en:'Vials, calculator, half-life', es:'Viales, calculadora, vida media'},
  edu:  {en:'Read before, not after',       es:'Leer antes, no después'},
  set:  {en:'Profile, theme, plan, data',   es:'Perfil, tema, plan, datos'}
};

/* ==========================================================================
   25 · CONFIGURACIÓN
   ========================================================================== */
const TIERS = [
  {id:'free', pr:'0', en:'Free', es:'Free',
   cl:{en:'Remember what you do', es:'Acuérdate de lo que haces'},
   f:[['Up to 2 protocols','Hasta 2 protocolos'],['Journal, calendar and streak','Diario, calendario y racha'],
      ['Reconstitution calculator','Calculadora de reconstitución'],
      ['Compound index — name and class','Índice de compuestos — nombre y clase'],
      ['90 days of history','90 días de histórico']]},
  {id:'pro', pr:'9', en:'Pro', es:'Pro',
   cl:{en:'See what changes over time', es:'Mira qué cambia con el tiempo'},
   f:[['Unlimited protocols','Protocolos ilimitados'],['All seven measures with charts','Las siete constantes con sus gráficas'],
      ['Doc.Peps on every measure','Doc.Peps en cada constante'],['Half-life curves','Curvas de vida media'],
      ['Vials with batch and expiry','Viales con lote y caducidad'],['Injection site map','Mapa de zonas'],
      ['Full history, export and import','Histórico completo, exportar e importar']]},
  {id:'ult', pr:'19', en:'Ultimate', es:'Ultimate',
   cl:{en:'Know exactly what you are holding', es:'Sabe exactamente qué tienes en la mano'},
   f:[['Everything in Pro','Todo lo de Pro'],['Full compound library','Biblioteca completa de compuestos'],
      ['Mechanism, vial spec and solvent','Mecanismo, presentación y solvente'],
      ['Cold chain and light alerts','Avisos de cadena de frío y luz'],
      ['Calculator pre-filled per compound','Calculadora precargada por compuesto'],
      ['Your reference sheet, in the app','Tu hoja de referencia, dentro'],
      ['Printable batch report','Informe de lote imprimible']]}
];
const RANK = {free:0, pro:1, ult:2};
/* Una puerta, no una caja fuerte: vive en el navegador y quien sepa abrir la
   consola la salta. Comunica el producto; cobrar de verdad exige un servidor. */
const can = lvl => (RANK[S.sub.tier] || 0) >= RANK[lvl];

function vSet(){
  const THEMES = [['light', t('Light','Claro'), 'sun'], ['dark', t('Dark','Oscuro'), 'moon'],
                  ['system', t('System','Sistema'), 'auto']];
  return '' +
    phead(t('SETTINGS','CONFIGURACIÓN'), S.me.nombre ? E(S.me.nombre) : t('Your account.','Tu cuenta.')) +

    '<div class="card pad">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
        '<span class="avatar lg">' + E(initials()) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="h3">' + (S.me.nombre ? E(S.me.nombre) : t('No name set','Sin nombre')) + '</div>' +
          '<div class="meta" style="margin-top:3px">' +
            (S.me.correo ? E(S.me.correo) : t('Local profile · no server','Perfil local · sin servidor')) + '</div></div></div>' +
      '<label>' + t('Name','Nombre') + '</label><input id="meN" value="' + E(S.me.nombre) + '" placeholder="—"/>' +
      '<label>' + t('Email','Correo') + '</label><input id="meE" type="email" value="' + E(S.me.correo) + '" placeholder="—"/>' +
      '<div class="acts" style="margin-top:18px"><button class="btn" id="meSave">' + t('Save','Guardar') + '</button></div></div>' +

    '<div class="card pad" style="margin-top:12px">' +
      '<div class="eyebrow">' + t('Theme','Tema') + '</div>' +
      '<p class="meta" style="margin:10px 0 0">' + t('Light is the default. System follows your device.',
        'Claro es el modo de fábrica. Sistema sigue a tu aparato.') + '</p>' +
      '<div class="pick p3" style="margin-top:14px">' + THEMES.map(x =>
        '<button data-th="' + x[0] + '"' + (S.theme === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div></div>' +

    '<div class="card" style="margin-top:12px">' +
      setRow('bell', t('Notifications','Avisos'),
        t('Installed as a web app, iPhone does not allow scheduled reminders — only a native build can. Android can.',
          'Instalada como app web, el iPhone no permite recordatorios programados — sólo una compilación nativa puede. Android sí.')) +
      setRow('lock', t('Security','Seguridad'),
        t('There is no account server yet, so there is no password to steal. Your device lock is the lock.',
          'Todavía no hay servidor de cuentas, así que no hay contraseña que robar. El bloqueo de tu aparato es el bloqueo.')) +
      setRow('shield', t('Privacy','Privacidad'),
        t('Everything stays in this browser. Nothing is sent anywhere — not to us either.',
          'Todo se queda en este navegador. No se envía a ningún sitio — a nosotros tampoco.')) +
      '<a class="row go" href="mailto:' + MAIL + '">' +
        '<span style="flex:0 0 auto;width:18px;height:18px;color:var(--tx2)">' + svg('help') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Support','Soporte') + '</span>' +
        '<span class="mt">' + MAIL + '</span></span><span class="cv"></span></a></div>' +

    '<div class="sect-h"><span class="eyebrow">' + t('Plan','Plan') + '</span></div>' +
    '<div class="tiers">' + TIERS.map(x =>
      '<div class="tier' + (x.id === 'ult' ? ' top' : '') + '">' +
        (S.sub.tier === x.id ? '<span class="cur">' + t('CURRENT','ACTUAL') + '</span>' : '') +
        '<div class="nm">' + t(x.en, x.es) + '</div>' +
        '<div class="pr num">$' + x.pr + '<small> ' + t('/ month','/ mes') + '</small></div>' +
        '<div class="cl">' + t(x.cl.en, x.cl.es) + '</div>' +
        '<ul>' + x.f.map(f => '<li>' + t(f[0], f[1]) + '</li>').join('') + '</ul>' +
        (S.sub.tier === x.id ? '' : '<div class="acts" style="margin-top:18px">' +
          '<a class="btn wide' + (x.id === 'ult' ? '' : ' ghost') + '" href="mailto:' + MAIL +
          '?subject=' + encodeURIComponent('PepX ' + t(x.en, x.es)) + '">' + t('Enquire','Consultar') + '</a></div>') +
      '</div>').join('') + '</div>' +

    '<div class="card pad" style="margin-top:12px">' +
      '<div class="eyebrow">' + t('Your data','Tus datos') + '</div>' +
      '<p class="meta" style="margin:10px 0 0">' + t('Export is the backup. If you clear this browser without one, it is gone.',
        'Exportar es la copia de seguridad. Si borras este navegador sin ella, se ha ido.') + '</p>' +
      '<div class="acts" style="margin-top:18px">' +
        '<button class="btn ghost" id="pxExp">' + t('Export','Exportar') + '</button>' +
        '<button class="btn ghost" id="pxImp">' + t('Import','Importar') + '</button>' +
        '<button class="btn quiet" id="pxWipe">' + t('Erase everything','Borrar todo') + '</button>' +
      '</div><input type="file" id="pxFile" accept="application/json" class="sr"/></div>' +

    installCard() +

    '<div class="acts" style="margin-top:12px"><button class="btn quiet wide" id="pxOut">' +
      svg('out') + t('Log out','Cerrar sesión') + '</button></div>' +

    '<div class="card pad" style="margin-top:12px">' + dp([
      t('I read what you write down, and only that. I do not read your body: I will not tell you that a number moved because of a compound, and I will not tell you what to take, how much or how often. That line is not a setting.',
        'Leo lo que apuntas, y sólo eso. No leo tu cuerpo: no te voy a decir que un número se movió por un compuesto, ni te voy a decir qué tomar, cuánto ni cada cuándo. Esa raya no es un ajuste.')], true) + '</div>' +
    ruo();
}
const setRow = (ic, n, d) => '<div class="row">' +
  '<span style="flex:0 0 auto;width:18px;height:18px;color:var(--tx2)">' + svg(ic) + '</span>' +
  '<span class="bd"><span class="nm">' + n + '</span><span class="mt">' + d + '</span></span></div>';

/* ---- instalar en el teléfono ---- */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; paint(); });
addEventListener('appinstalled', () => { deferredInstall = null; paint(); });
const installedPWA = () => {
  try{ return matchMedia('(display-mode: standalone)').matches ||
              matchMedia('(display-mode: fullscreen)').matches ||
              navigator.standalone === true; }catch(e){ return false; }
};
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installCard(){
  if(installedPWA())
    return '<div class="card pad" style="margin-top:12px"><div class="eyebrow">' +
      t('On your phone','En tu teléfono') + '</div><p class="meta" style="margin:10px 0 0">' +
      t('PepX is installed on this device. It opens without the browser bar and works with no connection.',
        'PepX está instalada en este aparato. Abre sin barra de navegador y funciona sin conexión.') + '</p></div>';
  const pasos = isIOS()
    ? [t('Open this page in <b>Safari</b> — from Chrome on iPhone the option does not exist.',
         'Abre esta página en <b>Safari</b> — desde Chrome en iPhone la opción no existe.'),
       t('Tap <b>Share</b>, the square with the arrow going up.',
         'Toca <b>Compartir</b>, el cuadrado con la flecha hacia arriba.'),
       t('Scroll down and choose <b>Add to Home Screen</b>.',
         'Baja y elige <b>Añadir a pantalla de inicio</b>.')]
    : [t('Tap the button below. If nothing happens, use the browser menu and choose <b>Install app</b>.',
         'Toca el botón de abajo. Si no pasa nada, entra en el menú del navegador y elige <b>Instalar aplicación</b>.')];
  return '<div class="card pad" style="margin-top:12px"><div class="eyebrow">' +
    t('Put it on your phone','Ponla en tu teléfono') + '</div>' +
    '<p class="meta" style="margin:10px 0 4px">' + t('PepX installs to the home screen with its own icon, opens full screen and keeps working with no connection.',
      'PepX se instala en la pantalla de inicio con su icono, abre a pantalla completa y sigue funcionando sin conexión.') + '</p>' +
    pasos.map((p,i) => '<div class="row" style="padding-left:0;padding-right:0">' +
      '<span class="meta" style="flex:0 0 16px">' + (i+1) + '</span>' +
      '<span class="bd"><span class="mt" style="margin-top:0;color:var(--tx2)">' + p + '</span></span></div>').join('') +
    (deferredInstall ? '<div class="acts" style="margin-top:18px"><button class="btn" id="pxInstall">' +
      t('Install PepX','Instalar PepX') + '</button></div>' : '') + '</div>';
}

/* ==========================================================================
   26 · PINTAR
   ========================================================================== */
const VIEWS = {dash:vDash, prot:vProt, comp:vComp, inj:vInj, cal:vCal,
               prog:vProg, lib:vLib, edu:vEdu, set:vSet, more:vMore};
function paint(){
  applyTheme();
  const root = document.getElementById('root');
  if(!root) return;
  if(!S.on){ root.innerHTML = vSplash(); wire(); return; }
  const view = (VIEWS[S.route] || vDash)();
  root.innerHTML = '<div class="shell">' + sidebar() +
    '<div class="main">' + topbar() + '<main class="view">' + view + '</main></div></div>' +
    tabbar() + pchUI();
  /* Mientras PepCheems está abierto, el fondo no se desplaza. En un teléfono
     sin esto, arrastrar dentro de la hoja mueve la página de debajo y al
     cerrarla el usuario está en otro sitio. */
  document.documentElement.style.overflow = PCH.open ? 'hidden' : '';
  wire();
  pchWire();
}
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const top0 = () => scrollTo({top:0, behavior:'instant'});

/* ==========================================================================
   27 · ESCUCHAR
   ========================================================================== */
function wire(){
  const root = document.getElementById('root');
  const on = (sel, ev, fn) => root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

  on('[data-enter]', 'click', function(){
    S.on = true; S.route = this.dataset.enter === 'new' ? 'set' : 'dash';
    save(); paint(); top0();
  });
  on('[data-go]', 'click', function(e){
    const g = this.dataset.go;
    if(g === 'store'){ open(STORE, '_blank', 'noopener'); return; }
    e.preventDefault();
    S.route = g; S.open = null; save(); paint(); top0();
  });
  on('[data-theme]', 'click', () => {
    /* el ciclo del conmutador: claro → oscuro → sistema → claro */
    S.theme = S.theme === 'light' ? 'dark' : S.theme === 'dark' ? 'system' : 'light';
    save(); paint();
  });
  on('[data-th]', 'click', function(){ S.theme = this.dataset.th; save(); paint(); });
  on('[data-sub]', 'click', function(){
    const i = this.dataset.sub.indexOf(':');
    S.sub1[this.dataset.sub.slice(0,i)] = this.dataset.sub.slice(i+1);
    save(); paint();
  });
  on('[data-win]', 'click', function(){ S.win = +this.dataset.win; save(); paint(); });

  /* buscador global: escribe en la biblioteca y lleva allí */
  const gq = document.getElementById('gq');
  if(gq){
    let tmr = null;
    gq.addEventListener('input', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        S.gq = gq.value; S.lq = gq.value; S.route = 'comp'; S.open = null; save();
        const pos = gq.selectionStart; paint();
        const n = document.getElementById('gq');
        if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
      }, 300);
    });
  }
  const lq = document.getElementById('lq');
  if(lq){
    let tmr = null;
    lq.addEventListener('input', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        S.lq = lq.value; S.gq = ''; save();
        const pos = lq.selectionStart; paint();
        const n = document.getElementById('lq');
        if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
      }, 260);
    });
  }
  on('[data-clear-q]', 'click', () => { S.lq = ''; S.gq = ''; save(); paint(); });

  /* protocolos */
  on('[data-new-prot]', 'click', () => { S.route = 'prot'; S.newProt = true; save(); paint();
    setTimeout(() => { const i = document.getElementById('pxC'); if(i) i.focus(); }, 60); });
  on('[data-close-prot]', 'click', () => { S.newProt = false; save(); paint(); });
  on('[data-open-prot]', 'click', function(){
    S.route = 'prot'; S.open = S.open === this.dataset.openProt ? null : this.dataset.openProt;
    save(); paint();
  });
  const f = document.getElementById('pxF');
  if(f){ freqExtra(f.value); f.addEventListener('change', () => freqExtra(f.value)); }
  const add = document.getElementById('pxAdd');
  if(add) add.addEventListener('click', () => {
    const c = val('pxC');
    if(!c){ const i = document.getElementById('pxC'); if(i) i.focus(); return; }
    const freq = val('pxF');
    const p = {id:uid(), c:c, dose:val('pxD'), unit:val('pxU'), freq:freq, time:val('pxT'),
               start:val('pxS') || today(), end:val('pxE'), notes:val('pxN'), active:true};
    if(freq === 'dow') p.dow = [...root.querySelectorAll('.pick.p7 .on')].map(b => +b.dataset.d);
    if(freq === 'nd')  p.every = val('pxEvery') || 3;
    if(freq === 'cyc'){ p.on = val('pxOn') || 5; p.off = val('pxOff') || 2; }
    if(!can('pro') && S.plan.length >= 2){
      alert(t('The free plan holds two protocols. Settings has the rest.',
              'El plan gratuito guarda dos protocolos. En Configuración está el resto.'));
      S.route = 'set'; save(); paint(); return;
    }
    S.plan.push(p); S.newProt = false; S.sub1.prot = 'active'; save(); paint();
  });
  on('[data-del]', 'click', function(e){ e.stopPropagation();
    S.plan = S.plan.filter(p => p.id !== this.dataset.del); S.open = null; save(); paint(); });
  on('[data-toggle]', 'click', function(e){ e.stopPropagation();
    const p = S.plan.filter(x => x.id === this.dataset.toggle)[0];
    if(p) p.active = !p.active; save(); paint(); });

  /* compuestos */
  on('[data-comp]', 'click', function(e){
    e.stopPropagation();
    S.route = 'comp'; S.open = this.dataset.comp; save(); paint(); top0();
  });
  on('[data-back-comp]', 'click', () => { S.open = null; save(); paint(); top0(); });
  on('[data-calc]', 'click', function(e){
    e.stopPropagation();
    const n = this.dataset.calc, x = libFind(n);
    S.calc = S.calc || {}; S.calc.comp = n;
    if(x && x.mg && x.mg.length) S.calc.mg = String(x.mg[0]);
    if(x && x.bac) S.calc.ml = x.bac;
    S.route = 'lib'; S.sub1.lib = 'calc'; S.open = null; save(); paint(); top0();
  });

  /* inyecciones */
  on('[data-tick]', 'click', function(e){
    e.stopPropagation();
    const [id, k] = this.dataset.tick.split('|');
    S.log[k] = S.log[k] || {};
    if(S.log[k][id]) delete S.log[k][id];
    else S.log[k][id] = {t:new Date().toTimeString().slice(0,5)};
    if(!Object.keys(S.log[k]).length) delete S.log[k];
    save(); paint();
  });
  on('[data-day]', 'click', function(){
    S.jsel = this.dataset.day; S.jmon = this.dataset.day.slice(0,7); save(); paint(); });
  on('[data-mon]', 'click', function(){
    const cur = S.jmon || today().slice(0,7);
    const [y, m] = cur.split('-').map(Number);
    const d = new Date(y, m-1 + (+this.dataset.mon), 1);
    S.jmon = d.getFullYear() + '-' + pad(d.getMonth()+1); save(); paint();
  });
  on('[data-new-inj]', 'click', () => { S.route = 'inj'; S.jnew = true; save(); paint(); });
  on('[data-close-inj]', 'click', () => { S.jnew = false; save(); paint(); });
  const jAdd = document.getElementById('jAdd');
  if(jAdd) jAdd.addEventListener('click', () => {
    const id = val('jP'); if(!id) return;
    const k = val('jD') || today();
    S.log[k] = S.log[k] || {};
    S.log[k][id] = {t: val('jT') || new Date().toTimeString().slice(0,5), z: val('jZ')};
    if(val('jZ')){
      const p = S.plan.filter(x => x.id === id)[0];
      S.sites.push({id:uid(), d:k, z:val('jZ'), c:p ? p.c : ''});
    }
    S.jnew = false; S.jsel = k; save(); paint();
  });

  /* calculadora */
  const C = () => (S.calc = S.calc || {});
  const cc = document.getElementById('caComp');
  if(cc) cc.addEventListener('change', () => {
    const x = libFind(cc.value);
    C().comp = cc.value;
    if(x && x.mg && x.mg.length) C().mg = String(x.mg[0]);
    if(x && x.bac) C().ml = x.bac;
    save(); paint();
  });
  on('[data-vmg]', 'click', function(){ C().mg = this.dataset.vmg; save(); paint(); });
  on('[data-ml]',  'click', function(){ C().ml = +this.dataset.ml; save(); paint(); });
  on('[data-du]',  'click', function(){ C().du = this.dataset.du; save(); paint(); });
  on('[data-pw]',  'click', function(){ C().pw = +this.dataset.pw; save(); paint(); });
  [['caMg','mg'],['caMl','ml'],['caD','dose']].forEach(x => {
    const el = document.getElementById(x[0]);
    if(el) el.addEventListener('input', () => { C()[x[1]] = el.value.trim(); save(); redrawCalc(); });
  });

  /* vida media, zonas, viales */
  const hs = document.getElementById('hlSave');
  if(hs) hs.addEventListener('click', () => {
    root.querySelectorAll('[data-hl]').forEach(i => {
      const v = i.value.trim();
      if(v) S.hl[i.dataset.hl] = +v; else delete S.hl[i.dataset.hl];
    });
    save(); paint();
  });
  on('[data-zv]', 'click', function(){ S.zview = this.dataset.zv; save(); paint(); });
  on('[data-zone]', 'click', function(){
    S.route = 'inj'; S.jnew = true; const z = this.dataset.zone; save(); paint();
    setTimeout(() => { const s = document.getElementById('jZ'); if(s) s.value = z; }, 60);
  });
  const vi = document.getElementById('viAdd');
  if(vi) vi.addEventListener('click', () => {
    const c = val('viC');
    if(!c){ const i = document.getElementById('viC'); if(i) i.focus(); return; }
    S.vials.push({id:uid(), c:c, mg:val('viM'), lote:val('viL'),
                  quedan:val('viQ'), recon:val('viR'), exp:val('viE')});
    save(); paint();
  });
  on('[data-delvial]', 'click', function(){
    S.vials = S.vials.filter(v => v.id !== this.dataset.delvial); save(); paint(); });

  /* medidas */
  const pv = document.getElementById('pvAdd');
  if(pv) pv.addEventListener('click', () => {
    const d = val('pvD') || today();
    const rec = {d:d, nota:val('pvN')};
    METRICS.forEach(m => rec[m.id] = val('pv_' + m.id));
    if(!METRICS.some(m => rec[m.id]) && !rec.nota) return;
    S.vitals = S.vitals.filter(v => v.d !== d);
    S.vitals.push(rec);
    S.vitals.sort((a,b) => a.d < b.d ? -1 : 1);
    save(); paint();
  });
  on('[data-delv]', 'click', function(){
    S.vitals = S.vitals.filter(v => v.d !== this.dataset.delv); save(); paint(); });

  /* perfil y datos */
  const ms = document.getElementById('meSave');
  if(ms) ms.addEventListener('click', () => {
    S.me.nombre = val('meN'); S.me.correo = val('meE'); save(); paint(); });
  const out = document.getElementById('pxOut');
  if(out) out.addEventListener('click', () => {
    if(!confirm(t('Log out returns you to the start screen. Your data stays on this device — it is not deleted.',
                  'Cerrar sesión te devuelve a la portada. Tus datos se quedan en este aparato — no se borran.'))) return;
    S.on = false; save(); paint(); top0();
  });
  const inst = document.getElementById('pxInstall');
  if(inst) inst.addEventListener('click', () => {
    if(!deferredInstall) return;
    const ev = deferredInstall; deferredInstall = null;
    ev.prompt(); ev.userChoice.then(() => paint()).catch(() => paint());
  });
  const exp = document.getElementById('pxExp');
  if(exp) exp.addEventListener('click', () => {
    const b = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'pepx-' + today() + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  const imp = document.getElementById('pxImp'), file = document.getElementById('pxFile');
  if(imp && file){
    imp.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const fl = file.files[0]; if(!fl) return;
      const r = new FileReader();
      r.onload = () => {
        try{
          const d = JSON.parse(r.result);
          if(d && typeof d === 'object'){ S = fill(d); S.on = true; save(); paint(); }
        }catch(e){ alert(t('That file could not be read.','No se pudo leer ese archivo.')); }
      };
      r.readAsText(fl);
    });
  }
  const wipe = document.getElementById('pxWipe');
  if(wipe) wipe.addEventListener('click', () => {
    if(!confirm(t('This erases every protocol, record, measurement, site and vial on this device. There is no undo.',
                  'Esto borra todos los protocolos, registros, medidas, zonas y viales de este aparato. No se puede deshacer.'))) return;
    S = JSON.parse(JSON.stringify(BLANK)); S.on = true; save(); paint();
  });
}

/* Repintar la calculadora entera en cada tecla movería el foco fuera del campo
   en el que se está escribiendo. Se recalcula sólo el bloque del resultado. */
function redrawCalc(){
  const old = document.querySelector('.out');
  if(!old) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = toolCalc();
  const nuevo = tmp.querySelector('.out');
  if(nuevo) old.replaceWith(nuevo);
}


/* ==========================================================================
   27b · PEPCHEEMS — EL ASISTENTE

   QUÉ ES, Y QUÉ NO ES

   No es un modelo de lenguaje. No hay servidor, no hay clave de API y no sale
   ni una petición de este fichero. Es un intérprete determinista sobre DOS
   fuentes, y las dos son locales:

     1. lo que el usuario escribió — sus protocolos, su registro, sus viales
     2. el registro de operación de PEPTIDEX — la biblioteca de 60 compuestos

   Decir que es una IA conversacional en el sentido de un LLM sería mentir
   sobre el producto. Lo que hace de verdad —leer tu registro y contestar de
   ahí, al instante y sin conexión— es más útil para esto que una llamada a un
   modelo, y no manda los datos de nadie a ninguna parte.

   LA LÍNEA, QUE NO SE CRUZA

   PepCheems NO dice qué tomar, cuánto ni cada cuándo. Cuando la pregunta pide
   eso, lo dice y ofrece lo que sí puede hacer. La columna de dosis del libro de
   operación se CITA, con marco y procedencia, como lo que es: el documento del
   operador, no un consejo de la app.

   Esto no es prudencia decorativa. Es lo que separa un registro de una
   prescripción, y es también lo que hace que la app pueda estar en una tienda.
   ========================================================================== */

const PCH = {open:false, msgs:[], q:''};

/* Cada respuesta declara DE DÓNDE sale. Sin procedencia, un dato en una
   burbuja parece una opinión del programa. */
const SRC = {
  tuyo:  t('from your log','de tu registro'),
  libro: t('from the operations record','del registro de operación'),
  suma:  t('arithmetic','aritmética')
};

function pchDi(txt, src, cita){
  return {q:false, txt:txt, src:src || '', cita:cita || null};
}

/* ---- los intentos ------------------------------------------------------- */
/* Orden importa: lo específico antes que lo general. La petición de consejo va
   la PRIMERA de todas, para que ninguna otra la atienda por accidente. */
function pchResponde(txt){
  const q = String(txt || '').trim();
  const n = q.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');   /* sin tildes */
  if(!n) return [];

  /* 1 · lo que no se contesta ------------------------------------------- */
  if(/\b(recomiend|recomend|que me pongo|que tomo|que deberia|deberia tomar|cuanto me pongo|cuanto tomo|cuanta dosis|que dosis|dosis deberia|es seguro|puedo mezclar|mezclar con|combinar con|ciclo para|para bajar|para subir|para ganar|recommend|should i|how much should|what dose|is it safe|stack)/.test(n))
    return [pchDi(
      t('I do not say what to take, how much or how often. That is not modesty — it is the line between a record and a prescription, and PepX stays on this side of it.',
        'No digo qué tomar, cuánto ni cada cuándo. No es prudencia — es la línea entre un registro y una receta, y PepX se queda de este lado.'),
      ''),
      pchDi(
      t('What I can do: read back what you wrote, count your adherence, do the reconstitution arithmetic, and quote the operations record for a compound — with its source attached.',
        'Lo que sí puedo: leerte lo que escribiste, contarte tu adherencia, hacer la aritmética de reconstitución y citarte el registro de operación de un compuesto — con su procedencia.'),
      '')];

  /* 2 · qué toca hoy ----------------------------------------------------- */
  if(/\b(hoy|today|ahora|pendiente|falta)/.test(n)){
    const hoy = today(), due = dueList(hoy);
    if(!S.plan.length) return [pchDi(t('You have no protocol written yet.','Todavía no tienes ningún protocolo escrito.'), SRC.tuyo)];
    if(!due.length) return [pchDi(t('Nothing scheduled today by your own plan.','Hoy no toca nada según tu propio plan.'), SRC.tuyo)];
    const hechas = due.filter(p => taken(hoy, p.id));
    const faltan = due.filter(p => !taken(hoy, p.id));
    const out = [pchDi(t('%h of %d logged today.','%h de %d registrado hoy.')
      .replace('%h', hechas.length).replace('%d', due.length), SRC.tuyo)];
    if(faltan.length) out.push(pchDi(t('Still open: %l.','Sin registrar: %l.')
      .replace('%l', faltan.map(p => p.c + ' · ' + p.dose + ' ' + p.unit +
        (p.time ? ' · ' + p.time : '')).join(' — ')), SRC.tuyo));
    return out;
  }

  /* 3 · la siguiente ------------------------------------------------------ */
  if(/\b(siguiente|proxim|next|cuando|when|toca)/.test(n)){
    const act = S.plan.filter(p => planState(p) === 'active');
    const px = act.map(p => ({p:p, k:nextDue(p)})).filter(x => x.k)
      .sort((a,b) => a.k < b.k ? -1 : 1);
    if(!px.length) return [pchDi(t('Nothing upcoming in any active protocol.','No hay nada por venir en ningún protocolo activo.'), SRC.tuyo)];
    /* Un espacio entre la cifra y la unidad. Lo había perdido un apaño para
       esquivar que `%d` se comiera el `%u` al sustituir: el remedio borraba el
       espacio y salía «250mcg». La sustitución de derecha a izquierda no
       necesita ningún apaño. */
    return [pchDi(t('%c, %d %u — %f%t.','%c, %d %u — %f%t.')
      .replace('%t', px[0].p.time ? ', ' + px[0].p.time : '')
      .replace('%f', human(px[0].k))
      .replace('%u', E(px[0].p.unit)).replace('%d', E(px[0].p.dose))
      .replace('%c', E(px[0].p.c)), SRC.tuyo)]
      .concat(px.length > 1 ? [pchDi(t('After that: %l.','Después: %l.')
        .replace('%l', px.slice(1,3).map(x => x.p.c + ' ' + human(x.k)).join(' · ')), SRC.tuyo)] : []);
  }

  /* 4 · adherencia y racha ------------------------------------------------ */
  if(/\b(adherenc|racha|streak|semana|week|voy|llevo|cumpl|mes\b|month)/.test(n)){
    const w = /mes|month|30/.test(n) ? 30 : 7;
    const a = adherence(w), st = streak();
    if(!a.tocaba) return [pchDi(t('Nothing was scheduled in the last %w days, so there is no percentage to give.',
                                  'No tocaba nada en los últimos %w días, así que no hay porcentaje que dar.')
      .replace('%w', w), SRC.tuyo)];
    return [pchDi(t('%p% over the last %w days — %h of %t scheduled doses logged.',
                    '%p% en los últimos %w días — %h de %t dosis programadas, registradas.')
      .replace('%p', Math.round(a.pct*100)).replace('%w', w)
      .replace('%h', a.hecho).replace('%t', a.tocaba), SRC.tuyo),
      pchDi(st ? t('Unbroken streak: %n days.','Racha sin fallar: %n días.').replace('%n', st)
               : t('No streak running right now.','Ahora mismo no hay racha.'), SRC.tuyo)];
  }

  /* 5 · viales y existencias ---------------------------------------------- */
  if(/\b(vial|frasco|existenc|stock|quedan|reconstitu|caduc|expir)/.test(n)){
    if(!S.vials.length) return [pchDi(t('You have no vials registered. Library → Vials adds one.',
                                        'No tienes viales registrados. Biblioteca → Viales añade uno.'), SRC.tuyo)];
    const hoy = today();
    return S.vials.slice(0,4).map(v => {
      const dias = v.recon ? days(v.recon, hoy) : null;
      return pchDi(E(v.c) + (v.mg ? ' · ' + E(v.mg) : '') +
        (v.quedan ? ' · ' + t('%n left','quedan %n').replace('%n', E(v.quedan)) : '') +
        (dias != null ? ' · ' + t('reconstituted %n days ago','reconstituido hace %n días').replace('%n', dias) : '') +
        (v.exp ? ' · ' + t('expires ','caduca ') + human(v.exp) : ''), SRC.tuyo);
    });
  }

  /* 6 · un compuesto por su nombre ---------------------------------------- */
  const e = pchBusca(n);
  if(e){
    const cons = conserva(e), r = e.ref || {};
    const out = [pchDi('<b>' + E(e.n) + '</b>' + (e.sku ? ' · ' + E(e.sku) : '') +
      (e.mec ? '<br>' + E(e.mec) : ''), SRC.libro)];
    if(e.esp || e.sol) out.push(pchDi(
      [e.esp && t('Presentation: ','Presentación: ') + E(e.esp),
       e.sol && t('Solvent: ','Solvente: ') + E(e.sol),
       cons.length && t('Storage: ','Conservación: ') + cons.join(', ')]
      .filter(Boolean).join('<br>'), SRC.libro));
    /* La columna de dosis se CITA, no se aplica. El marco lo dice. */
    if(r.ini || r.mant || r.frec)
      out.push(pchDi('', SRC.libro, {
        titulo: t('Quoted from the operations record','Citado del registro de operación'),
        filas: [[t('Initial','Inicial'), r.ini], [t('Maintenance','Mantenimiento'), r.mant],
                [t('Frequency','Frecuencia'), r.frec], [t('Timing','Horario'), r.hora]]
               .filter(x => x[1]),
        pie: t('This is the operator document. I am not applying it to you and I am not suggesting it — you read it and decide.',
               'Éste es el documento del operador. No te lo estoy aplicando ni te lo estoy sugiriendo — lo lees tú y decides.')
      }));
    return out;
  }

  /* 7 · la aritmética ------------------------------------------------------ */
  if(/\b(calcul|reconstitu|bac|agua|diluir|jeringa|unidad|units|ml\b|cuanto pongo)/.test(n)){
    const c = S.calc || {};
    const mg = parseFloat(c.mg), ml = parseFloat(c.ml), d = parseFloat(c.dose);
    if(!(mg > 0 && ml > 0 && d > 0))
      return [pchDi(t('Give me the three numbers in Library → Calculator: mg in the vial, mL of solvent, and the dose you decided. The arithmetic is mine; the three numbers are yours.',
                      'Dame los tres números en Biblioteca → Calculadora: mg del vial, mL de disolvente y la dosis que decidiste. La aritmética es mía; los tres números son tuyos.'), '')];
    const dmg = c.du === 'mcg' ? d/1000 : d;
    const conc = mg/ml, mlDosis = dmg/conc, u = mlDosis*100;
    return [pchDi(t('%m mg in %v mL is %c mg/mL. Your %d %u is <b>%x mL</b> — mark <b>%s</b> on a 100-unit syringe.',
                    '%m mg en %v mL son %c mg/mL. Tu dosis de %d %u es <b>%x mL</b> — marca <b>%s</b> en una jeringa de 100 unidades.')
      .replace('%m', nf(mg,2)).replace('%v', nf(ml,2)).replace('%c', nf(conc,2))
      .replace('%d', nf(d,2)).replace('%u', c.du || 'mcg')
      .replace('%x', nf(mlDosis,3)).replace('%s', nf(u,1)), SRC.suma),
      pchDi(t('That is division, not advice. The dose in it is the one you entered.',
              'Eso es una división, no un consejo. La dosis que lleva es la que escribiste tú.'), '')];
  }

  /* 8 · quién eres --------------------------------------------------------- */
  if(/\b(quien eres|que eres|who are you|what are you|pepcheems|ayuda|help|puedes)/.test(n))
    return [pchDi(t('PepCheems. I read two things: what you wrote in this app, and the PEPTIDEX operations record. Both live on this device.',
                    'PepCheems. Leo dos cosas: lo que escribiste en esta app y el registro de operación de PEPTIDEX. Las dos viven en este aparato.'), ''),
            pchDi(t('I am not a language model and there is no server behind me — which is why I answer offline and why nothing you write leaves the phone.',
                    'No soy un modelo de lenguaje y no hay servidor detrás — por eso contesto sin conexión y por eso nada de lo que escribes sale del teléfono.'), '')];

  /* 9 · no entendido ------------------------------------------------------- */
  return [pchDi(t('I did not catch that. Try a compound name, or one of these.',
                  'No lo cogí. Prueba con el nombre de un compuesto, o con una de éstas.'), '')];
}

/* Busca un compuesto dentro de la frase. Primero el nombre más largo, para que
   «BPC157 + TB500» no se resuelva como «TB500». */
function pchBusca(n){
  const limpio = s => String(s||'').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
  const frase = limpio(n);
  let mejor = null;
  for(const e of LIB){
    const k = limpio(e.n);
    if(k.length >= 3 && frase.indexOf(k) >= 0 && (!mejor || k.length > limpio(mejor.n).length))
      mejor = e;
  }
  return mejor;
}

const PCHSUG = () => [
  t('What is due today?','¿Qué toca hoy?'),
  t('When is my next injection?','¿Cuándo es mi siguiente inyección?'),
  t('How is my adherence this week?','¿Cómo voy de adherencia esta semana?'),
  t('BPC 157','BPC 157'),
  t('My vials','Mis viales')
];

function pchAbre(pregunta){
  PCH.open = true;
  if(!PCH.msgs.length)
    PCH.msgs = [pchDi(t('PepCheems. Ask about your log or about a compound.',
                        'PepCheems. Pregúntame por tu registro o por un compuesto.'), '')];
  paint();
  if(pregunta) setTimeout(() => pchEnvia(pregunta), 60);
  else setTimeout(() => { const i = document.getElementById('pchQ'); if(i) i.focus(); }, 120);
}
function pchEnvia(txt){
  const q = String(txt || '').trim();
  if(!q) return;
  PCH.msgs.push({q:true, txt:E(q)});
  PCH.msgs = PCH.msgs.concat(pchResponde(q));
  PCH.q = '';
  paint();
  setTimeout(() => {
    const sc = document.getElementById('pchScroll');
    if(sc) sc.scrollTop = sc.scrollHeight;
    const i = document.getElementById('pchQ'); if(i) i.focus();
  }, 30);
}

function pchUI(){
  /* El flotante estorba donde PepCheems ya tiene su fila a la vista: en «Más»
     taparía justo el contenido de debajo para ofrecer lo que está tres dedos
     más arriba. */
  if(!PCH.open) return S.route === 'more' ? '' :
    '<button class="pch-fab" data-pch aria-label="PepCheems">' +
    MK + '<span>PepCheems</span></button>';
  return '<div class="pch-scrim" data-pch-close></div>' +
    '<aside class="pch" role="dialog" aria-label="PepCheems">' +
      '<header class="pch-hd">' +
        '<span class="pch-id">' + MK + '<b>PepCheems</b>' +
          '<i>' + t('reads your log · offline','lee tu registro · sin conexión') + '</i></span>' +
        '<button class="ibtn" data-pch-close aria-label="' + t('Close','Cerrar') + '">' +
          svg('close') + '</button>' +
      '</header>' +
      '<div class="pch-scroll" id="pchScroll">' +
        PCH.msgs.map(m => m.q
          ? '<div class="pch-q">' + m.txt + '</div>'
          : '<div class="pch-a">' +
              (m.txt ? '<div class="pch-tx">' + m.txt + '</div>' : '') +
              (m.cita ? '<div class="quote pch-cita">' +
                 '<div class="qh">' + m.cita.titulo + '</div>' +
                 m.cita.filas.map(f => '<div class="kv"><span>' + f[0] + '</span><b>' +
                   E(f[1]) + '</b></div>').join('') +
                 '<div class="qf">' + m.cita.pie + '</div></div>' : '') +
              (m.src ? '<div class="pch-src">' + m.src + '</div>' : '') +
            '</div>').join('') +
        '<div class="pch-sug">' + PCHSUG().map(s =>
          '<button data-pch-ask="' + E(s) + '">' + E(s) + '</button>').join('') + '</div>' +
      '</div>' +
      '<form class="pch-in" id="pchF">' +
        '<label class="sr" for="pchQ">PepCheems</label>' +
        '<input id="pchQ" autocomplete="off" placeholder="' +
          t('Ask about your log or a compound','Pregunta por tu registro o un compuesto') + '"/>' +
        '<button class="ibtn solid" type="submit" aria-label="' + t('Send','Enviar') + '">' +
          svg('right') + '</button>' +
      '</form>' +
      '<div class="pch-foot">' + t('PepCheems does not recommend compounds, doses or schedules.',
                                   'PepCheems no recomienda compuestos, dosis ni pautas.') + '</div>' +
    '</aside>';
}

function pchWire(){
  const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));
  on('[data-pch]', 'click', () => pchAbre());
  on('[data-pch-close]', 'click', () => { PCH.open = false; paint(); });
  on('[data-pch-ask]', 'click', function(){ pchEnvia(this.dataset.pchAsk); });
  const f = document.getElementById('pchF');
  if(f) f.addEventListener('submit', ev => {
    ev.preventDefault();
    const i = document.getElementById('pchQ');
    if(i) pchEnvia(i.value);
  });
  if(PCH.open) document.addEventListener('keydown', pchEsc);
}
function pchEsc(ev){
  if(ev.key === 'Escape'){ PCH.open = false; document.removeEventListener('keydown', pchEsc); paint(); }
}

/* ==========================================================================
   28 · ARRANQUE
   ========================================================================== */
paint();
window.__pepx = {state:()=>S, paint:paint, dueOn:dueOn, tips:tips, series:series,
                 LIB:LIB, family:family, adherence:adherence, planState:planState, phase:phase};

})();

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
  plan:[], log:{}, extra:{}, vitals:[], vials:[], sites:[], hl:{}, calc:{},
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
  o.plan = (raw.plan || []).map(migraPlan);
  return o;
}
/* UN PROTOCOLO ES UNA PILA CON NOMBRE.
   Antes era un compuesto suelto con su dosis; la referencia enseña otra cosa —
   FAT LOSS PROTOCOL con cinco viales dentro— y esa es la unidad con la que la
   gente piensa. Lo que ya estuviera guardado entra como pila de un elemento y
   se llama como su compuesto: nadie pierde nada por el cambio. */
function migraPlan(p){
  if(p && p.items) return p;
  const o = Object.assign({}, p);
  o.name  = o.name || o.c || '';
  o.items = o.c ? [{c:o.c, d:o.dose, u:o.unit}] : [];
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

/* ---- la pila y sus piezas ------------------------------------------------
   Un protocolo lleva N compuestos y cada uno se marca por separado, como en
   la referencia: tres filas con su palomita, no una casilla para las tres. El
   registro antiguo guardaba `true` para el protocolo entero; eso sigue
   valiendo y significa «todas hechas». */
const pItems = p => (p && p.items && p.items.length) ? p.items
                  : (p && p.c ? [{c:p.c, d:p.dose, u:p.unit}] : []);
const pName  = p => (p && p.name) || (pItems(p)[0] || {}).c || t('Protocol','Protocolo');
const pComps = p => pItems(p).map(x => x.c).filter(Boolean);
const doseTxt = it => [it.d, it.u].filter(Boolean).join(' ');

function takenItem(k, id, i){
  const d = S.log[k]; if(!d) return false;
  return d[id] === true || !!d[id + '#' + i] ||
         (d[id] && typeof d[id] === 'object' && d[id].all === true);
}
function taken(k, id){
  const d = S.log[k]; if(!d) return false;
  if(d[id] === true) return true;
  const p = S.plan.filter(x => x.id === id)[0];
  const n = p ? pItems(p).length : 0;
  if(!n) return !!d[id];
  for(let i = 0; i < n; i++) if(!takenItem(k, id, i)) return false;
  return true;
}
/* cuántas piezas de la pila están marcadas ese día */
function takenCount(k, p){
  const n = pItems(p).length;
  let c = 0;
  for(let i = 0; i < n; i++) if(takenItem(k, p.id, i)) c++;
  return c;
}
/* el apunte de una pieza: hora y zona, si las hay */
function itemMeta(k, id, i){
  const d = S.log[k]; if(!d) return null;
  const v = d[id + '#' + i];
  if(v && typeof v === 'object') return v;
  const w = d[id];
  return (w && typeof w === 'object') ? w : null;
}
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
  if(!pItems(p).length || !p.freq) return 'draft';
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
/* Los compuestos de un protocolo son los suyos y nada más. Antes se
   «adivinaban» juntando los de otros protocolos con el mismo estado, porque un
   protocolo sólo podía tener uno. Ahora los lleva dentro. */
const planCompounds = p => pComps(p);

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
  cdown:'<path d="M6 9l6 6 6-6"/>',
  filter:'<path d="M3 6h18M7 12h10M11 18h2"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  doc:'<path d="M13.5 3.5H7A2 2 0 0 0 5 5.5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13.5 3.5V9H19"/>',
  drop:'<path d="M12 3.5s5.5 6.1 5.5 9.6a5.5 5.5 0 0 1-11 0C6.5 9.6 12 3.5 12 3.5z"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
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
  const cod = (e && e.sku ? String(e.sku).split('/')[0] : String(nombre||'')).trim().slice(0,6);
  const cls = 'vialt ' + (size || 'md');
  if(!hayArte)
    return '<span class="' + cls + '"><span class="vfall">' + E(cod) + '</span></span>';
  /* Dos resoluciones del mismo recorte: la pequeña pesa 4 KB y sale en listas
     de sesenta filas; la grande sólo donde el producto es el protagonista. */
  const grande = size === 'lg' || size === 'hero' || size === 'giant';
  const src = ART[(grande ? 'vial_' : 'vialt_') + linea];
  return '<span class="' + cls + '">' +
    '<img src="' + src + '" alt="' + E(t('PEPTIDEX vial','Vial PEPTIDEX')) + ' ' +
      linea.toUpperCase() + '" loading="lazy" decoding="async"/></span>';
}
/* Las tres plumas recargables entregadas, para la portada. Es la única imagen
   de la pantalla de entrada en la referencia y no se sustituye por nada. */
function pens(){
  const ps = ['fitness','beauty','longevity'].map(k => ART['pen_' + k]).filter(Boolean);
  if(ps.length < 3) return '';
  /* El orden de la referencia: negro, oro rosa, plata. */
  return '<div class="splash-pens" aria-hidden="true">' + ps.map(s =>
    '<img src="' + s + '" alt=""/>').join('') + '</div>';
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
    const p = S.plan.filter(x => x.active && pComps(x).indexOf(v.c) >= 0)[0];
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
/* Se cuenta POR INYECCIÓN, no por protocolo. Una pila de cinco compuestos con
   tres marcados no es «un protocolo a medias»: son tres inyecciones puestas y
   dos que faltan, y eso es lo que dice la cifra de la referencia. */
function adherence(n){
  const hoy = today(); let tocaba = 0, hecho = 0;
  for(let i = 0; i < n; i++){
    const k = shift(hoy, -i);
    dueList(k).forEach(p => {
      tocaba += pItems(p).length;
      hecho  += takenCount(k, p);
    });
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
/* Destinos que existen pero no salen en ninguna barra: se llega a ellos desde
   «Más», desde el buscador o desde otra pantalla. Están aquí para que el
   enrutador y el título de la cabecera los conozcan igual que a los demás. */
const EXTRA = [
  {id:'find',  ic:'search', en:'Search',  es:'Buscar'},
  {id:'legal', ic:'shield', en:'Privacy & Terms', es:'Privacidad y términos'}
];
const ALLNAV = NAV.concat(EXTRA);
const navOf  = id => ALLNAV.filter(n => n.id === id)[0] || null;
/* Cada pantalla sabe de dónde viene. Sin esto la flecha de volver es un
   adorno: en un teléfono es el gesto que más se usa después de tocar. */
const BACKTO = {
  cal:'more', prog:'more', lib:'more', edu:'more', set:'more',
  legal:'set', find:'dash', prot:'dash', comp:'dash', inj:'dash'
};
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
/* En el teléfono la barra de arriba lleva la marca centrada y dos botones; en
   escritorio se convierte en la barra de la referencia web, con el buscador
   ancho en medio. Es la misma barra en los dos sitios. */
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
      '<button class="ibtn m-only" data-go="find" aria-label="' + t('Search','Buscar') + '">' +
        svg('search') + '</button>' +
      '<button class="ibtn" data-theme aria-label="' + t('Theme','Tema') + '">' +
        svg(THEMEICON()) + '</button>' +
      '<button class="avatar" data-go="set" aria-label="' + t('Profile','Perfil') + '">' +
        E(initials()) + '</button>' +
    '</div></header>';
}
/* Qué pestaña se enciende cuando estás en una pantalla que no es pestaña. */
const TABOF = {
  cal:'more', prog:'more', lib:'more', edu:'more', set:'more', legal:'more',
  more:'more', find:'comp'
};
function tabbar(){
  const act = TABOF[S.route] || S.route;
  return '<nav class="tabbar" role="tablist">' + MOBNAV.map(n =>
    '<button data-go="' + n.id + '" role="tab"' +
      (act === n.id ? ' class="on" aria-selected="true"' : '') + '>' +
      svg(n.ic) + '<span>' + t(n.mob.en, n.mob.es) + '</span></button>').join('') +
  '</nav>';
}

/* LA CABECERA DE PANTALLA, COMO EN LA REFERENCIA.

   Flecha de volver · título centrado en versalitas abiertas · acción. No un
   titular editorial: en el PDF las cinco pantallas llevan exactamente esta
   barra, y esa repetición es lo que hace que se lea como navegación. En
   escritorio se descentra y crece, porque allí la lateral ya dice dónde estás.

     back   id de la pantalla a la que vuelve la flecha, o '' para no ponerla
     titulo el rótulo, que se escribe en versalitas
     right  el botón de acción, si lo hay
     sub    una línea de contexto por debajo */
function navh(back, titulo, right, sub){
  return '<div class="nav-h">' +
    (back ? '<button class="nb" data-go="' + back + '" aria-label="' +
      t('Back','Volver') + '">' + svg('left') + '</button>' : '<span class="nb"></span>') +
    '<h1>' + titulo + '</h1>' +
    (right || '<span class="na"></span>') +
  '</div>' + (sub ? '<p class="nav-sub">' + sub + '</p>' : '');
}
/* el botón de acción de la cabecera: un icono, nunca un rótulo */
const navAct = (ic, go, label) => '<button class="na" data-go="' + go + '" aria-label="' +
  E(label) + '">' + svg(ic) + '</button>';
const navActRaw = (ic, attr, label) => '<button class="na" ' + attr + ' aria-label="' +
  E(label) + '">' + svg(ic) + '</button>';

/* Rótulo de sección: va FUERA de la tarjeta, con su enlace a la derecha. */
const sectH = (label, lk, go) => '<div class="sect-h"><span class="eyebrow">' + label + '</span>' +
  (lk ? '<button class="lk" data-go="' + go + '">' + lk + '</button>' : '') + '</div>';

const empty = (ic, b, s, act) => '<div class="empty"><div class="ico">' + svg(ic) + '</div>' +
  '<b>' + b + '</b><span>' + s + '</span>' +
  (act ? '<div class="acts">' + act + '</div>' : '') + '</div>';

const ruo = () => '<div class="ruo">' + t('Research use only.','Solo uso en investigación.') +
  '<br>' + t('PepX records what you enter. It does not recommend compounds, doses or schedules.',
             'PepX registra lo que tú introduces. No recomienda compuestos, dosis ni pautas.') + '</div>';

/* ==========================================================================
   15 · PORTADA
   ========================================================================== */
/* Exactamente lo que enseña la referencia, en su orden: el bloque de marca
   entregado, las tres plumas recargables entregadas, los dos botones y el
   lema. Ni una cosa más.

   El bloque es el FICHERO recortado, no un «Px» compuesto con la tipografía
   del sistema: la P con el corte diagonal y la X con su remate no son dos
   caracteres de una fuente, y componerlas sería rehacer el logotipo. */
function vSplash(){
  return '<div class="splash">' +
    '<div class="top">' + mark('lock', 'splash-lock') + pens() + '</div>' +
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
/* LA PORTADA, EN EL ORDEN DE LA REFERENCIA

     saludo + avatar
     TU PROGRESO      tarjeta · selector de ventana · tres cifras · barra · frase
     PRÓXIMA INYECCIÓN  (la referencia web la pone aquí, y es lo que más se mira)
     MIS PROTOCOLOS   rótulo + «Ver todo» · las tarjetas de pila
     ACCIONES RÁPIDAS cuatro casillas
     avisos

   Cada bloque empieza con su rótulo fuera de la tarjeta. Ese ritmo —rótulo,
   contenido, aire— es lo que hace que la pantalla se recorra sin leerla. */
function vDash(){
  const hoy = today();
  const w = +sub1('win', 7);
  const ad = adherence(w), st = streak();
  const activos = S.plan.filter(p => planState(p) === 'active');
  const prox = activos.map(p => ({p:p, k:nextDue(p)})).filter(x => x.k)
    .sort((a,b) => a.k < b.k ? -1 : 1)[0];
  const wl = (WINDOWS.filter(x => x[0] === w)[0] || WINDOWS[0])[1];

  /* La frase de debajo de la barra cambia con la cifra. No es un adorno: es la
     única línea de la pantalla que reconoce que detrás del porcentaje hay
     alguien. Y no felicita cuando no toca. */
  const animo = !ad.tocaba
    ? t('Nothing was scheduled. Write a protocol and this starts counting.',
        'No tocaba nada. Escribe un protocolo y esto empieza a contar.')
    : ad.pct >= 1   ? t('Everything you scheduled, logged.','Todo lo que programaste, registrado.')
    : ad.pct >= .8  ? t('Keep going. Consistency is the whole thing.','Sigue así. La consistencia lo es todo.')
    : ad.pct >= .5  ? t('%h of %t logged so far.','%h de %t registradas por ahora.')
                        .replace('%h', ad.hecho).replace('%t', ad.tocaba)
                    : t('There is ground to make up — %n still open.','Hay terreno que recuperar — faltan %n.')
                        .replace('%n', ad.tocaba - ad.hecho);

  return '<div class="dash">' +
    /* --- el saludo, con el avatar a la derecha como en la referencia --- */
    '<div class="hello"><div>' +
      '<h1>' + greet() +
        (S.me.nombre ? ',<br>' + E(S.me.nombre.split(/\s+/)[0]) + '.' : '.') + '</h1>' +
      '<p>' + t('Here is your progress.','Aquí tienes tu progreso.') + '</p>' +
    '</div><button class="avatar" data-go="set" aria-label="' + t('Profile','Perfil') + '">' +
      E(initials()) + '</button></div>' +

    /* --- TU PROGRESO --- */
    '<section class="d-prog"><div class="card pad">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
        '<span class="eyebrow">' + t('Your progress','Tu progreso') + '</span>' +
        '<button class="winsel" data-win-cycle>' + wl + svg('cdown') + '</button>' +
      '</div>' +
      '<div class="dstats" style="margin-top:18px">' +
        stat(ad.hecho, t('Injections','Inyecciones'), t('completed','completadas')) +
        stat(Math.round(ad.pct*100) + '%', t('Adherence','Adherencia'), t('to protocol','al protocolo')) +
        stat(st, t('Days','Días'), t('streak','de racha')) +
        /* la cuarta cifra sólo en escritorio: es la rejilla de la referencia
           web, y en un teléfono de 390 px cuatro cifras en fila no se leen */
        '<div class="w-only">' + stat(activos.length, t('Protocols','Protocolos'),
          t('active','activos')) + '</div>' +
      '</div>' +
      '<div class="pbar" style="margin-top:20px"><i style="width:' +
        Math.round(ad.pct*100) + '%"></i></div>' +
      '<p class="meta" style="margin:12px 0 0">' + animo + '</p>' +
    '</div></section>' +

    /* --- PRÓXIMA INYECCIÓN --- */
    (prox ? (function(){
      const it = pItems(prox.p)[0] || {};
      return '<section class="d-next">' +
      '<div class="m-only">' + sectH(t('Next injection','Próxima inyección')) + '</div>' +
      '<div class="card pad">' +
        '<div class="eyebrow w-only" style="margin-bottom:14px">' +
          t('Next injection','Próxima inyección') + '</div>' +
        '<div class="row" style="padding:0">' + vial(it.c, 'md') +
          '<span class="bd"><span class="nm">' + E(it.c || pName(prox.p)) + '</span>' +
            '<span class="mt">' + E(doseTxt(it)) + '</span>' +
            '<span class="mt dim">' + fullDate(prox.k).toUpperCase() +
              (prox.p.time ? ' · ' + E(prox.p.time) : '') + '</span></span>' +
        '</div>' +
        '<button class="btn wide sq" data-open-prot="' + prox.p.id + '" style="margin-top:16px">' +
          t('View details','Ver detalles') + '</button>' +
      '</div></section>';
    })() : '<section class="d-next"></section>') +

    /* --- MIS PROTOCOLOS --- */
    '<section class="d-prot">' +
    sectH(t('My protocols','Mis protocolos'), activos.length ? t('View all','Ver todo') : '', 'prot') +
    (activos.length
      ? activos.slice(0,2).map(p => protCard(p, true)).join('')
      : '<div class="card">' + empty('prot', t('No active protocol','Ningún protocolo activo'),
          t('A protocol is a name, the compounds inside it and how often you put them.',
            'Un protocolo es un nombre, los compuestos que lleva dentro y cada cuándo te los pones.'),
          '<button class="btn" data-new-prot>' + t('Create one','Crear uno') + '</button>') + '</div>') +
    '</section>' +

    /* --- la lectura de la semana --- */
    '<section class="d-week">' +
    sectH(t('This week','Esta semana'), t('All progress','Todo el progreso'), 'prog') +
    '<div class="card pad">' + weekChart() + '</div></section>' +

    /* --- ACCIONES RÁPIDAS --- */
    '<section class="d-quick">' + sectH(t('Quick actions','Acciones rápidas')) +
    '<div class="tiles">' +
      tile('inj',  t('Log injection','Registrar inyección'),   'data-new-inj') +
      tile('comp', t('My compounds','Mis compuestos'),         'data-go="comp"') +
      tile('bag',  t('Order history','Historial de pedidos'),  'data-go="store"') +
      tile('edu',  t('Education','Educación'),                 'data-go="edu"') +
    '</div></section>' +

    '<section class="d-rest">' +
    (notesHTML() ? sectH(t('Alerts','Avisos')) +
      '<div class="card pad">' + notesHTML() + '</div>' : '') +
    sectH('Doc.Peps') + dp(dpToday(), true) + ruo() + '</section>' +
  '</div>';
}
/* La cifra: número grande, rótulo de dos renglones debajo. */
const stat = (v, l1, l2) => '<div class="stat"><b>' + v + '</b>' +
  '<span>' + l1 + '<i>' + l2 + '</i></span></div>';
/* La casilla de acceso rápido: icono lineal arriba, rótulo abajo. */
const tile = (ic, label, attr) => '<button class="tile" ' + attr + '>' +
  svg(ic) + '<span>' + label + '</span></button>';

/* ==========================================================================
   17 · PROTOCOLOS
   ========================================================================== */
function vProt(){
  const w = sub1('prot', 'active');
  const g = {active:[], done:[], draft:[]};
  S.plan.forEach(p => g[planState(p)].push(p));
  const list = g[w] || [];
  return '' +
    navh(BACKTO.prot, t('My protocols','Mis protocolos'),
      navActRaw('plus', 'data-new-prot', t('New protocol','Nuevo protocolo'))) +
    '<div class="seg">' + [['active', t('Active','Activos')], ['done', t('Completed','Completados')],
      ['draft', t('Drafts','Borradores')]].map(x =>
      '<button class="' + (w === x[0] ? 'on' : '') + '" data-sub="prot:' + x[0] + '">' +
      x[1] + (g[x[0]].length ? '<i>' + g[x[0]].length + '</i>' : '') + '</button>').join('') + '</div>' +
    (S.newProt ? protForm() : '') +
    (list.length ? list.map(p => protCard(p)).join('')
      : '<div class="card">' + empty('prot',
          w === 'active' ? t('No active protocol','Ningún protocolo activo')
          : w === 'done' ? t('Nothing completed yet','Nada completado todavía')
                         : t('No drafts','Sin borradores'),
          t('A protocol is a name, the compounds inside it and how often you put them.',
            'Un protocolo es un nombre, los compuestos que lleva dentro y cada cuándo te los pones.'),
          '<button class="btn" data-new-prot>' + t('New protocol','Nuevo protocolo') + '</button>') + '</div>') +
    ruo();
}
/* LA TARJETA DE PROTOCOLO, EXACTAMENTE COMO LA REFERENCIA

     FAT LOSS PROTOCOL                              (ACTIVO)
     Fase 2 · Semana 3 de 8
     [vial] [vial] [vial] [vial]
     CJC-1295  Ipamorelin  BPC-157   +2 más
     ─────────────────────────────────────────────
     Próxima inyección
     Hoy, 8:00 PM                                        ›

   Cuatro cosas y en ese orden: qué es, dónde va, qué lleva dentro y cuándo
   toca. La fila de viales es la que hace que el protocolo se reconozca sin
   leer el nombre, y por eso lleva el producto de verdad y no un icono.

   `corto` la usa la portada: allí la tarjeta no se despliega, sólo enseña. */
function protCard(p, corto){
  const ph = phase(p), nx = nextDue(p);
  const st = planState(p), abierto = !corto && S.open === p.id;
  const items = pItems(p);
  const hoy = today();

  /* Cuatro huecos, como en la referencia: tres viales y el «+N más». Si caben
     cuatro sin resto, se ponen los cuatro. */
  const cabe = items.length <= 4 ? items.length : 3;
  const resto = items.length - cabe;

  const fase = ph
    ? (ph.total ? t('Phase ','Fase ') + ph.f + ' · ' + t('Week ','Semana ') + ph.w +
                  t(' of ',' de ') + ph.total
                : t('Maintenance · Ongoing','Mantenimiento · Continuo'))
    : freqText(p);

  return '<article class="prot">' +
    '<div class="prot-hd">' +
      '<h3 class="prot-nm">' + E(pName(p)) + '</h3>' +
      '<span class="badge' + (st === 'active' ? ' ink' : '') + '">' +
        (st === 'active' ? t('ACTIVE','ACTIVO')
          : st === 'done' ? t('DONE','COMPLETADO') : t('DRAFT','BORRADOR')) + '</span>' +
    '</div>' +
    '<p class="prot-ph">' + E(fase) + '</p>' +

    (items.length ? '<div class="prot-vials">' +
      items.slice(0, cabe).map(it => '<span class="pv">' + vial(it.c, 'sm') +
        '<span>' + E(it.c) + '</span></span>').join('') +
      (resto > 0 ? '<span class="pv more"><b>+' + resto + t(' more',' más') + '</b></span>' : '') +
    '</div>' : '') +

    '<button class="prot-next" data-open-prot="' + p.id + '">' +
      '<span class="bd">' +
        (nx ? '<span class="lb">' + t('Next injection','Próxima inyección') + '</span>' +
              '<span class="vl">' + human(nx) + (p.time ? ', ' + E(p.time) : '') + '</span>'
            : '<span class="lb">' + t('Schedule','Pauta') + '</span>' +
              '<span class="vl">' + E(freqText(p) || t('Not set','Sin definir')) + '</span>') +
      '</span><span class="cv"></span></button>' +

    (abierto ? '<div class="prot-more">' + protBody(p) + '</div>' : '') +
  '</article>';
}
/* El detalle: la línea de tiempo de dos semanas, los compuestos con su dosis y
   su palomita de hoy, la ficha de la pauta y las acciones. */
function protBody(p){
  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + E(v) + '</b></div>' : '';
  const hoy = today();
  const items = pItems(p);
  /* Un día futuro que toca NO es un día fallado. Marcarlo en rojo punteado
     acusaba al usuario de no haberse puesto todavía una dosis de la semana que
     viene. Sólo se cuenta como fallo lo que ya pasó. */
  let tl = '';
  for(let i = -6; i <= 7; i++){
    const k = shift(hoy, i), d = dueOn(p, k);
    tl += '<i class="' + (!d ? '' : taken(k, p.id) ? 'on' : (k > hoy ? 'pend' : 'miss')) +
      '"></i>';
  }
  const hoyToca = dueOn(p, hoy);

  return '<div class="eyebrow" style="margin-bottom:8px">' + t('Last two weeks','Las dos últimas semanas') + '</div>' +
    '<div class="streak" style="grid-template-columns:repeat(14,1fr);max-width:300px">' + tl + '</div>' +

    '<div class="eyebrow" style="margin:20px 0 2px">' + t('Compounds','Compuestos') +
      (hoyToca ? ' · ' + t('today','hoy') : '') + '</div>' +
    '<div class="bare">' + items.map((it, i) => {
      const on = takenItem(hoy, p.id, i);
      return '<div class="row">' + vial(it.c, 'sm') +
        '<span class="bd"><span class="nm">' + E(it.c) + '</span>' +
          '<span class="mt">' + E(doseTxt(it)) + '</span></span>' +
        (hoyToca ? '<button class="tick' + (on ? ' on' : '') + '" data-tick="' + p.id + '#' + i +
          '|' + hoy + '" aria-label="' + (on ? t('Logged','Registrado') : t('Log','Registrar')) +
          '">' + svg('check') + '</button>'
        : '<button class="ibtn" data-comp="' + E(it.c) + '" aria-label="' +
          t('View compound','Ver compuesto') + '">' + svg('right') + '</button>') +
      '</div>';
    }).join('') + '</div>' +

    '<div style="margin-top:20px">' +
      kv(t('Frequency','Frecuencia'), freqText(p)) +
      kv(t('Time','Hora'), p.time) +
      kv(t('Start','Inicio'), p.start ? human(p.start) : '') +
      kv(t('End','Fin'), p.end ? human(p.end) : t('open','abierto')) +
      kv(t('Injections per dose day','Inyecciones por día de pauta'), String(items.length)) +
    '</div>' +
    (p.notes ? '<p class="body" style="margin-top:14px">' + E(p.notes) + '</p>' : '') +
    '<div class="acts" style="margin-top:18px">' +
      '<button class="btn ghost sm" data-edit-prot="' + p.id + '">' + t('Edit','Editar') + '</button>' +
      '<button class="btn ghost sm" data-toggle="' + p.id + '">' +
        (p.active ? t('Pause','Pausar') : t('Resume','Reanudar')) + '</button>' +
      '<button class="btn quiet sm" data-del="' + p.id + '">' + t('Delete','Borrar') + '</button>' +
    '</div>';
}
/* EL FORMULARIO DE PILA

   Un protocolo lleva N compuestos, así que la parte de arriba del formulario
   es una lista a la que se añade, no un par de campos sueltos. El resto —cada
   cuándo, desde cuándo, a qué hora— es de la pila entera, porque es lo que
   comparten: nadie escribe «BPC a las ocho los lunes y TB a las nueve los
   martes» dentro del MISMO protocolo; eso son dos protocolos. */
const NEWP = {items:[], edit:null};

function protForm(){
  const ed = NEWP.edit ? S.plan.filter(p => p.id === NEWP.edit)[0] : null;
  return '<div class="card pad" style="margin-bottom:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span class="eyebrow">' + (ed ? t('Edit protocol','Editar protocolo')
                                     : t('New protocol','Nuevo protocolo')) + '</span>' +
      '<button class="ibtn" data-close-prot aria-label="' + t('Close','Cerrar') + '">' +
        svg('close') + '</button></div>' +

    '<label>' + t('Protocol name','Nombre del protocolo') + '</label>' +
    '<input id="pxName" placeholder="' + t('Fat Loss Protocol','Protocolo de definición') +
      '" value="' + E(ed ? pName(ed) : '') + '"/>' +

    '<label>' + t('Compounds in this protocol','Compuestos de este protocolo') + '</label>' +
    '<div class="items" id="pxItems">' + itemsHTML() + '</div>' +
    '<div class="r3" style="margin-top:10px">' +
      '<input id="pxC" list="pxCL" placeholder="' + t('Compound','Compuesto') + '"/>' +
      '<input id="pxD" inputmode="decimal" placeholder="' + t('Dose','Dosis') + '"/>' +
      '<select id="pxU"><option>mcg</option><option>mg</option><option>iu</option>' +
        '<option>ml</option></select>' +
    '</div>' + datalist() +
    '<div class="acts" style="margin-top:10px">' +
      '<button class="btn ghost sm" id="pxAddIt">' + svg('plus') +
        t('Add compound','Añadir compuesto') + '</button></div>' +

    '<div class="r2">' +
      '<div><label>' + t('How often','Cada cuándo') + '</label>' +
        '<select id="pxF">' + FREQ.map(f => '<option value="' + f.v + '"' +
          (ed && ed.freq === f.v ? ' selected' : '') + '>' + t(f.en, f.es) +
          '</option>').join('') + '</select></div>' +
      '<div><label>' + t('Time','Hora') + '</label>' +
        '<input id="pxT" type="time" value="' + E(ed ? (ed.time||'') : '') + '"/></div></div>' +
    '<div id="pxFX"></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Start','Inicio') + '</label>' +
        '<input id="pxS" type="date" value="' + (ed && ed.start ? ed.start : today()) + '"/></div>' +
      '<div><label>' + t('End (optional)','Fin (opcional)') + '</label>' +
        '<input id="pxE" type="date" value="' + E(ed && ed.end ? ed.end : '') + '"/></div></div>' +
    '<label>' + t('Notes','Notas') + '</label>' +
    '<textarea id="pxN">' + E(ed ? (ed.notes||'') : '') + '</textarea>' +
    '<div class="acts" style="margin-top:18px"><button class="btn" id="pxAdd">' +
      (ed ? t('Save changes','Guardar cambios') : t('Save protocol','Guardar protocolo')) +
      '</button></div></div>';
}
function itemsHTML(){
  if(!NEWP.items.length)
    return '<div class="empty-it">' +
      t('No compounds yet. Add at least one.','Todavía ninguno. Añade al menos uno.') + '</div>';
  return NEWP.items.map((it, i) => '<div class="it">' + vial(it.c, 'xs') +
    '<span class="bd"><b>' + E(it.c) + '</b><span>' + E(doseTxt(it)) + '</span></span>' +
    '<button class="ibtn" data-rm-it="' + i + '" aria-label="' + t('Remove','Quitar') + '">' +
      svg('close') + '</button></div>').join('');
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
    navh(BACKTO.comp, t('Compounds','Compuestos')) +
    /* El buscador va LO PRIMERO, como en la referencia: sesenta fichas se
       recorren buscando, no hojeando, y el gesto tiene que estar donde cae el
       pulgar al abrir. */
    '<div class="field">' + svg('search') +
      '<input id="lq" placeholder="' + t('Search compounds','Buscar compuestos') +
      '" value="' + E(S.lq||'') + '"/>' +
      (S.lq ? '<button class="x" data-clear-q aria-label="' + t('Clear','Limpiar') + '">' +
        svg('close') + '</button>' : '') + '</div>' +
    '<div class="chips">' +
      '<button class="' + (fam ? '' : 'on') + '" data-sub="comp:">' + t('All','Todos') +
        '<i>' + LIB.length + '</i></button>' +
      FAM.map(f => {
        const n = LIB.filter(e => family(e) === f.id).length;
        return n ? '<button class="' + (fam === f.id ? 'on' : '') + '" data-sub="comp:' + f.id + '">' +
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
      : '<div class="card">' + empty('search', t('Nothing matches','Nada coincide'),
          E(S.lq || ''), '<button class="btn ghost" data-clear-q>' + t('Clear','Limpiar') + '</button>') + '</div>') +
    (!full && LIB.length ? '<div class="card" style="margin-top:12px">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial specification, solvent and cold chain — and the calculator pre-filled from it.',
        'Mecanismo, presentación, solvente y cadena de frío — y la calculadora precargada con ella.'),
      '<button class="btn" data-go="set">' + t('See plans','Ver planes') + '</button>') + '</div>' : '') +
    ruo();
}


/* LA FILA DE COMPUESTO, COMO LA REFERENCIA

     [vial]  BPC-157
             Compuesto de Protección Corporal
             Solo para uso de investigación                    ›

   Tres renglones exactos: nombre, qué es, y el aviso. El tercero no es
   relleno legal metido con calzador — en una app de material de investigación
   es parte de la identidad de la ficha, y por eso va en la fila y no sólo al
   pie de la pantalla. */
function compRow(e){
  const full = can('ult');
  return '<button class="row go" data-comp="' + E(e.n) + '">' + vial(e.n, 'md') +
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
    navh('comp', t('Compound','Compuesto'),
      navActRaw('plus', 'data-add-to-prot="' + E(e.n) + '"',
                t('Add to a protocol','Añadir a un protocolo'))) +

    /* El producto a tamaño de producto y el nombre a tamaño de portada. Sin
       tarjeta alrededor: lo que enmarca es el aire. */
    '<section class="phero-prod">' +
      '<div class="pp-art">' + vial(e.n, 'hero') + famLock(linea) + '</div>' +
      '<div class="pp-bd">' +
        (f ? '<span class="eyebrow">' + t(f.en, f.es) + '</span>' : '') +
        '<h1>' + E(e.n) + '</h1>' +
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

    (!full ? '<div class="card">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial presentation, solvent, cold chain and your reference sheet.',
        'Mecanismo, presentación, solvente, cadena de frío y tu hoja de referencia.'),
      '<button class="btn" data-go="set">' + t('See plans','Ver planes') + '</button>') + '</div>'
    :
    /* RESUMEN — a ancho de lectura, sin caja */
    (e.mec ? sectH(t('Overview','Resumen')) +
      '<p class="read">' + E(e.mec) + '</p>' +
      (e.ins ? '<p class="read dim">' + E(e.ins) + '</p>' : '') : '') +

    /* ESPECIFICACIONES — hoja técnica en dos columnas de filete */
    (ficha ? sectH(t('Specifications','Especificaciones')) +
      '<div class="spec">' + ficha + '</div>' : '') +

    /* INVESTIGACIÓN — la cita, con su marco y su procedencia. Ésta SÍ lleva
       contenedor, y a propósito: es material citado, no dicho por PepX, y el
       marco es lo que lo dice sin tener que escribirlo. */
    (hayRef ? sectH(t('Research','Investigación')) +
      '<div class="quote">' +
        '<div class="qh">' + t('From your reference sheet','De tu hoja de referencia') + '</div>' +
        kv(t('Initial','Inicial'), r.ini) + kv(t('Maintenance','Mantenimiento'), r.mant) +
        kv(t('Frequency','Frecuencia'), r.frec) + kv(t('Timing','Horario'), r.hora) +
        kv(t('Factor mcg/kg','Factor mcg/kg'), r.factor) +
        (r.nota ? '<p class="meta" style="margin-top:12px">' + E(r.nota) + '</p>' : '') +
        '<div class="qf">' + t('Quoted from the operations record. PepX does not apply these numbers on its own — you read them and enter what you decide.',
                               'Citado del registro de operación. PepX no aplica estos números por su cuenta — los lees tú y escribes lo que decidas.') + '</div>' +
      '</div>' : '')) +

    /* RELACIONADOS — rejilla de producto, no lista de filas */
    (rel.length ? sectH(t('Related compounds','Compuestos relacionados')) +
      '<div class="relgrid">' + rel.map(x =>
        '<button class="relcard" data-comp="' + E(x.n) + '">' +
          vial(x.n, 'lg') +
          '<span class="relnm">' + E(x.n) + '</span>' +
          '<span class="relsku">' + E(x.sku || (x.cat || '')) + '</span>' +
        '</button>').join('') + '</div>' : '') +
    ruo();
}

/* ==========================================================================
   19 · INYECCIONES (diario)
   ========================================================================== */
function vInj(){
  const sel = S.jsel || today();
  const hoy = today();
  /* LA TIRA DE SEMANA DE LA REFERENCIA: DOM…SÁB con la cifra debajo y el día
     elegido en círculo sólido. El punto bajo la cifra marca que ese día hay
     algo apuntado, para que la semana se lea sin tocarla. */
  const base = shift(sel, -((parse(sel).getDay()+7) % 7));
  let strip = '';
  for(let i = 0; i < 7; i++){
    const k = shift(base, i), d = parse(k);
    const algo = !!(S.log[k] && Object.keys(S.log[k]).length);
    strip += '<button class="' + (k === sel ? 'on ' : '') + (algo ? 'has' : '') +
      '" data-day="' + k + '"><em>' + DOW3()[(d.getDay()+6)%7] + '</em>' +
      '<b>' + d.getDate() + '</b></button>';
  }

  /* Cada compuesto de cada protocolo que toque ese día es UNA fila con su
     palomita, como en la referencia. Antes una pila de cinco compuestos era
     una sola casilla, y marcarla decía que te habías puesto cinco. */
  const filas = [];
  dueList(sel).forEach(p => pItems(p).forEach((it, i) => filas.push({p:p, it:it, i:i})));
  const hechas = filas.filter(f => takenItem(sel, f.p.id, f.i)).length;
  const sueltas = (S.extra && S.extra[sel]) || [];
  const hist = Object.keys(S.log).sort().reverse().slice(0, 20);

  return '' +
    navh(BACKTO.inj, t('Injection log','Registro de inyecciones'),
      navActRaw('plus', 'data-new-inj', t('Log injection','Registrar inyección'))) +

    '<div class="monthbar">' +
      '<b>' + MONL()[parse(sel).getMonth()].toUpperCase() + ' ' + parse(sel).getFullYear() + '</b>' +
      '<button class="ibtn" data-go="cal" aria-label="' + t('Calendar','Calendario') + '">' +
        svg('right') + '</button></div>' +
    '<div class="week">' + strip + '</div>' +

    (S.jnew ? injForm(sel) : '') +

    sectH(longDate(sel) + (filas.length ? ' · ' + hechas + '/' + filas.length : '')) +
    ((filas.length || sueltas.length) ? '<div class="card">' +
      filas.map(f => {
        const on = takenItem(sel, f.p.id, f.i);
        const m = itemMeta(sel, f.p.id, f.i);
        return '<div class="row">' + vial(f.it.c, 'sm') +
          '<span class="bd"><span class="nm">' + E(f.it.c) + '</span>' +
            '<span class="mt">' + E(doseTxt(f.it)) +
              (m && m.z ? ' · ' + E(zName(m.z)) : '') + '</span></span>' +
          '<span class="rt">' + E((m && m.t) || f.p.time || '') + '</span>' +
          '<button class="tick' + (on ? ' on' : '') + '" data-tick="' + f.p.id + '#' + f.i +
            '|' + sel + '" aria-label="' + (on ? t('Logged','Registrado') : t('Log','Registrar')) +
            '">' + svg('check') + '</button></div>';
      }).join('') +
      sueltas.map((x, i) => '<div class="row">' + vial(x.c, 'sm') +
        '<span class="bd"><span class="nm">' + E(x.c) + '</span>' +
          '<span class="mt">' + E([x.d, x.u].filter(Boolean).join(' ')) +
            (x.z ? ' · ' + E(zName(x.z)) : '') + ' · ' + t('off protocol','fuera de pauta') +
          '</span></span>' +
        '<span class="rt">' + E(x.t || '') + '</span>' +
        '<button class="ibtn" data-rm-extra="' + sel + '|' + i + '" aria-label="' +
          t('Remove','Quitar') + '">' + svg('close') + '</button></div>').join('') +
    '</div>'
    : '<div class="card">' + empty('inj', t('Nothing scheduled','Nada programado'),
        t('Your protocols decide this. You can still log something off protocol.',
          'Esto lo deciden tus pautas. Aun así puedes registrar algo fuera de pauta.')) + '</div>') +

    '<div class="acts" style="margin-top:12px"><button class="btn ghost wide sq" data-new-inj>' +
      svg('plus') + t('Log new injection','Registrar nueva inyección') + '</button></div>' +

    sectH(t('History','Historial')) +
    (hist.length ? '<div class="card">' + hist.map(k => {
      const n = Object.keys(S.log[k]).filter(x => S.log[k][x]).length;
      const nombres = {};
      Object.keys(S.log[k]).forEach(id => {
        const pid = String(id).split('#')[0];
        const p = S.plan.filter(x => x.id === pid)[0];
        if(p) nombres[pName(p)] = 1;
      });
      return '<button class="row go" data-day="' + k + '">' +
        '<span class="bd"><span class="nm">' + longDate(k) + '</span>' +
        '<span class="mt">' + E(Object.keys(nombres).join(' · ')) + '</span></span>' +
        '<span class="rt"><b class="num" style="font-size:15px">' + n + '</b></span>' +
      '</button>';
    }).join('') + '</div>'
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
    /* Se elige el COMPUESTO, no el protocolo: quien registra sabe qué se
       acaba de poner, no en qué pila lo tenía escrito. La última opción deja
       apuntar algo que no está en ninguna pauta, porque eso pasa. */
    '<label>' + t('What you put','Qué te pusiste') + '</label>' +
    '<select id="jP">' +
      S.plan.map(p => pItems(p).map((it, i) =>
        '<option value="' + p.id + '#' + i + '">' + E(it.c) +
        (doseTxt(it) ? ' · ' + E(doseTxt(it)) : '') + ' — ' + E(pName(p)) + '</option>').join('')
      ).join('') +
      '<option value="__otro">' + t('Something else…','Otra cosa…') + '</option>' +
    '</select>' +
    '<div id="jOtro" class="sr">' +
      '<div class="r3" style="margin-top:12px">' +
        '<input id="jC" list="pxCL" placeholder="' + t('Compound','Compuesto') + '"/>' +
        '<input id="jDose" inputmode="decimal" placeholder="' + t('Dose','Dosis') + '"/>' +
        '<select id="jU"><option>mcg</option><option>mg</option><option>iu</option>' +
          '<option>ml</option></select></div>' + datalist() + '</div>' +
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
  const filas = [];
  dueList(sel).forEach(p => pItems(p).forEach((it, i) => filas.push({p:p, it:it, i:i})));
  return '' +
    navh(BACKTO.cal, t('Calendar','Calendario')) +
    '<div class="card pad-lg"><div class="cal">' +
      '<div class="calhd">' +
        '<button class="ibtn" data-mon="-1" aria-label="' + t('Previous','Anterior') + '">' + svg('left') + '</button>' +
        '<b>' + MONL()[mm-1] + ' ' + yy + '</b>' +
        '<button class="ibtn" data-mon="1" aria-label="' + t('Next','Siguiente') + '">' + svg('right') + '</button></div>' +
      '<div class="caldow">' + DOW().map(d => '<span>' + d + '</span>').join('') + '</div>' +
      '<div class="calgrid">' + cells + '</div>' +
    '</div>' +
    '<p class="meta" style="margin:16px 0 0">' +
      t('Filled dot: something was logged. Hollow: something was scheduled.',
        'Punto lleno: se registró algo. Hueco: había algo programado.') + '</p></div>' +
    sectH(longDate(sel)) +
    '<div class="card">' + (filas.length ? filas.map(f => {
      const on = takenItem(sel, f.p.id, f.i);
      return '<div class="row">' + vial(f.it.c, 'sm') +
        '<span class="bd"><span class="nm">' + E(f.it.c) + '</span>' +
        '<span class="mt">' + E(doseTxt(f.it)) + ' · ' + E(pName(f.p)) + '</span></span>' +
        '<button class="tick' + (on ? ' on' : '') + '" data-tick="' + f.p.id + '#' + f.i +
          '|' + sel + '" aria-label="' + (on ? t('Logged','Registrado') : t('Log','Registrar')) +
          '">' + svg('check') + '</button></div>';
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
    navh(BACKTO.prog, t('Progress','Progreso')) +
    '<div class="chips">' + WINS.map(w => '<button class="' + (w === win ? 'on' : '') +
      '" data-win="' + w + '">' + w + ' ' + t('days','días') + '</button>').join('') + '</div>' +

    '<div class="card pad">' +
      '<div class="stat3">' +
        stat(Math.round(ad.pct*100) + '%', t('Adherence','Adherencia'), t('logged','registrado')) +
        stat(ad.hecho, t('Injections','Inyecciones'), t('completed','completadas')) +
        stat(ad.tocaba - ad.hecho, t('Missed','Sin poner'), t('in window','en la ventana')) +
      '</div>' +
      '<div style="margin-top:20px">' + weekChart() + '</div>' +
    '</div>' +

    sectH('Doc.Peps') + dp(dpReport(win), true) +
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
    navh(BACKTO.lib, t('Library','Biblioteca')) +
    '<div class="chips">' + [['calc', t('Calculator','Calculadora')], ['hl', t('Half-life','Vida media')],
      ['zon', t('Sites','Zonas')], ['inv', t('Vials','Viales')]].map(x =>
      '<button class="' + (w === x[0] ? 'on' : '') + '" data-sub="lib:' + x[0] + '">' + x[1] +
      '</button>').join('') + '</div>' + body + ruo();
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
/* Las dosis registradas, por compuesto y en mg. Una entrada del registro es
   `protocolo#pieza`, así que hay que abrir la pila para saber QUÉ compuesto y
   QUÉ dosis se apuntó — la vida media es de la molécula, no de la pila. */
function levels(){
  const byC = {};
  const mete = (k, c, d, u) => {
    let mg = null;
    if(u === 'mg')  mg = +d;
    if(u === 'mcg') mg = +d / 1000;
    if(mg == null || isNaN(mg)) return;
    (byC[c] = byC[c] || []).push({d:k, mg:mg});
  };
  Object.keys(S.log).forEach(k => Object.keys(S.log[k]).forEach(id => {
    const [pid, ix] = String(id).split('#');
    const p = S.plan.filter(x => x.id === pid)[0];
    if(!p) return;
    const items = pItems(p);
    /* sin sufijo el apunte es del protocolo entero: cuentan todas sus piezas */
    (ix == null ? items : [items[+ix]]).forEach(it => {
      if(it) mete(k, it.c, it.d, it.u);
    });
  }));
  Object.keys(S.extra || {}).forEach(k =>
    (S.extra[k] || []).forEach(x => mete(k, x.c, x.d, x.u)));
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
  {id:'recon', k:'art', linea:'fitness',
   t:{en:'Reading a reconstitution', es:'Leer una reconstitución'},
   m:{en:'4 min read', es:'4 min de lectura'},
   d:{en:'Why mg in the vial and mL of solvent give you a mark on the syringe.',
      es:'Por qué los mg del vial y los mL de disolvente dan una marca en la jeringa.'},
   b:{es:[
     'Un vial liofilizado trae una cantidad de polvo — 5 mg, 10 mg — y nada más. La concentración no existe hasta que le echas disolvente, y la eliges tú al elegir cuánto echar.',
     'La cuenta es una división. 5 mg de polvo en 1 mL de agua bacteriostática son 5 mg/mL. Si tu dosis son 250 mcg, eso es 0,25 mg: 0,25 dividido entre 5 da 0,05 mL. En una jeringa de insulina de 100 unidades por mililitro, 0,05 mL son 5 unidades.',
     'De ahí sale la regla práctica: con el mismo vial, el DOBLE de disolvente da la MITAD de concentración y por tanto el doble de marcas para la misma dosis. Más disolvente no es más ni menos producto — es sólo una regla más larga, más fácil de leer.',
     'Y por eso conviene elegir el volumen pensando en la marca que vas a tener que ver a las seis de la mañana. Una dosis que cae en 2 unidades se lee mal; la misma dosis reconstituida al doble cae en 4 y se lee bien.',
     'La calculadora de la Biblioteca hace exactamente esta división y nada más. Los tres números —mg, mL y dosis— los pones tú.'],
     en:[
     'A lyophilised vial arrives with an amount of powder — 5 mg, 10 mg — and nothing else. Concentration does not exist until you add solvent, and you choose it when you choose how much to add.',
     'The sum is a division. 5 mg of powder in 1 mL of bacteriostatic water is 5 mg/mL. If your dose is 250 mcg, that is 0.25 mg: 0.25 divided by 5 gives 0.05 mL. On a 100-unit insulin syringe, 0.05 mL is 5 units.',
     'Hence the practical rule: with the same vial, TWICE the solvent gives HALF the concentration and therefore twice the marks for the same dose. More solvent is not more or less product — it is just a longer ruler, easier to read.',
     'Which is why it pays to choose the volume thinking about the mark you will have to read at six in the morning. A dose landing on 2 units reads badly; the same dose reconstituted at double lands on 4 and reads well.',
     'The Library calculator does exactly this division and nothing more. The three numbers — mg, mL and dose — are yours.']},
   go:'lib'},

  {id:'frio', k:'art', linea:'longevity',
   t:{en:'Cold chain and light', es:'Cadena de frío y luz'},
   m:{en:'5 min read', es:'5 min de lectura'},
   d:{en:'What the storage column of each sheet means, and why the reconstitution date matters more than the expiry.',
      es:'Qué significa la columna de almacenamiento de cada ficha, y por qué la fecha de reconstitución importa más que la caducidad.'},
   b:{es:[
     'Cada ficha de la biblioteca trae una columna de almacenamiento con dos estados, y no dicen lo mismo. El polvo liofilizado aguanta congelado; el líquido reconstituido vive en refrigeración.',
     'La caducidad impresa en el vial es la del POLVO. En cuanto entra el disolvente empieza otro reloj, y ése no está impreso en ninguna parte: lo apuntas tú. Por eso la pantalla de Viales pide la fecha de reconstitución y no la caducidad.',
     'La luz cuenta. Un péptido en solución expuesto a luz directa se degrada más rápido que uno guardado en su caja, aunque los dos estén a la misma temperatura. La caja del vial no es embalaje: es parte de la conservación.',
     'Los ciclos de temperatura importan más que la temperatura media. Sacar y meter un vial cuatro veces al día es peor que dejarlo dos horas fuera una vez. Si trabajas con alícuotas, prepararlas una vez y congelarlas te ahorra ese vaivén.',
     'Nada de esto es una recomendación clínica: es logística de material. Lo que dice cada ficha viene del registro de operación de PEPTIDEX, y está citado como tal.'],
     en:[
     'Every library sheet carries a storage column with two states, and they do not say the same thing. Lyophilised powder keeps frozen; reconstituted liquid lives refrigerated.',
     'The expiry printed on the vial is the POWDER expiry. The moment solvent goes in, another clock starts, and that one is printed nowhere: you write it down. Which is why the Vials screen asks for the reconstitution date and not the expiry.',
     'Light counts. A peptide in solution left in direct light degrades faster than one kept in its box, even at the same temperature. The vial box is not packaging: it is part of storage.',
     'Temperature cycles matter more than average temperature. Taking a vial out and back four times a day is worse than leaving it out once for two hours. If you work with aliquots, preparing them once and freezing them saves that back and forth.',
     'None of this is clinical advice: it is material logistics. What each sheet says comes from the PEPTIDEX operations record, and it is quoted as such.']},
   go:'comp'},

  {id:'raya', k:'art', linea:'fitness',
   t:{en:'Why PepX never proposes a dose', es:'Por qué PepX nunca propone una dosis'},
   m:{en:'3 min read', es:'3 min de lectura'},
   d:{en:'Where the line sits between a record and a recommendation.',
      es:'Dónde está la raya entre un registro y una recomendación.'},
   b:{es:[
     'PepX apunta lo que tú decides y te lo devuelve ordenado. No decide por ti, y esa diferencia no es una precaución legal: es lo que la aplicación es.',
     'La biblioteca trae una columna de referencia con cifras de inicio y mantenimiento. Está CITADA, con marco y con su procedencia, porque es el documento del operador — no una pauta que la app te aplique. La lees tú y decides tú.',
     'La consecuencia práctica es que PepCheems te contesta «cuánto llevas» y no «cuánto deberías». Puede hacerte la división de una reconstitución con tus tres números, y no puede elegirte ninguno de los tres.',
     'Si alguna vez una pantalla de esta aplicación te sugiere qué tomar, es un fallo. Escríbenos.'],
     en:[
     'PepX writes down what you decide and gives it back to you in order. It does not decide for you, and that difference is not a legal precaution: it is what the app is.',
     'The library carries a reference column with starting and maintenance figures. It is QUOTED, framed and sourced, because it is the operator document — not a schedule the app applies to you. You read it and you decide.',
     'The practical consequence is that PepCheems answers "how far along are you" and not "how much should you". It can do the division of a reconstitution with your three numbers, and it cannot choose any of the three for you.',
     'If a screen of this application ever suggests what to take, that is a bug. Write to us.']},
   go:'legal'},

  {id:'pila', k:'pro', linea:'fitness',
   t:{en:'What a protocol is here', es:'Qué es un protocolo aquí'},
   m:{en:'4 min read', es:'4 min de lectura'},
   d:{en:'A name, the compounds inside it, and how often you put them.',
      es:'Un nombre, los compuestos que lleva dentro y cada cuándo te los pones.'},
   b:{es:[
     'Un protocolo en PepX es una pila con nombre. Dentro van los compuestos con su dosis, y fuera va lo que comparten: cada cuándo, desde cuándo y a qué hora.',
     'Eso es a propósito. Si dos compuestos van a horas distintas o con frecuencias distintas, no son un protocolo con dos cosas dentro: son dos protocolos. Separarlos hace que la adherencia signifique algo.',
     'La adherencia se cuenta por INYECCIÓN, no por protocolo. Una pila de cinco compuestos con tres marcados son tres puestas y dos que faltan, no «un protocolo a medias».',
     'La fase y la semana salen solas del tramo: si pones un inicio y un fin, la app calcula «Fase 2 · Semana 3 de 8». Si no pones fin, el protocolo es de mantenimiento y lo dice así.',
     'Pausar no borra. Un protocolo pausado deja de pedirte dosis y conserva todo el histórico.'],
     en:[
     'A protocol in PepX is a named stack. Inside go the compounds with their doses; outside goes what they share: how often, since when and at what time.',
     'That is deliberate. If two compounds go at different times or different frequencies, they are not one protocol with two things inside: they are two protocols. Splitting them is what makes adherence mean something.',
     'Adherence counts per INJECTION, not per protocol. A five-compound stack with three ticked is three put and two outstanding, not "half a protocol".',
     'Phase and week come out of the span on their own: give it a start and an end and the app works out "Phase 2 · Week 3 of 8". With no end, the protocol is maintenance and says so.',
     'Pausing does not delete. A paused protocol stops asking you for doses and keeps its whole history.']},
   go:'prot'},

  {id:'zonas', k:'pro', linea:'beauty',
   t:{en:'Rotating sites', es:'Rotar zonas'},
   m:{en:'2 min read', es:'2 min de lectura'},
   d:{en:'What the app records about placement, and what it deliberately does not explain.',
      es:'Qué apunta la aplicación sobre la colocación, y qué no explica a propósito.'},
   b:{es:[
     'Al registrar una inyección puedes apuntar la zona. La app guarda esa zona y te enseña el mapa con las que más has usado, en escala de gris: cuanto más oscura, más veces.',
     'Eso es todo lo que hace, y es todo lo que debe hacer. El mapa te enseña TU patrón; no te dice dónde ponerte la siguiente.',
     'Si el mapa sale muy oscuro en un sitio y muy claro en el resto, eso es información sobre tu costumbre. Qué hacer con ella no es una decisión de una aplicación.'],
     en:[
     'When you log an injection you can note the site. The app stores it and shows you the map with the ones you used most, in greyscale: the darker, the more often.',
     'That is all it does, and all it should do. The map shows YOUR pattern; it does not tell you where to put the next one.',
     'If the map comes out very dark in one place and very light everywhere else, that is information about your habit. What to do with it is not an application’s decision.']},
   go:'lib'}
];
const artOf = id => ARTS.filter(a => a.id === id)[0] || null;

function vEdu(){
  const abierto = S.open ? artOf(S.open) : null;
  if(abierto) return eduLee(abierto);
  const w = sub1('edu', 'all');
  const list = ARTS.filter(a => w === 'all' || a.k === w);
  return '' +
    navh(BACKTO.edu, t('Education','Educación')) +
    '<div class="chips">' + [['all', t('All','Todos')], ['art', t('Articles','Artículos')],
      ['vid', t('Videos','Vídeos')], ['pro', t('Protocols','Protocolos')]].map(x =>
      '<button class="' + (w === x[0] ? 'on' : '') + '" data-sub="edu:' + x[0] + '">' + x[1] +
      '</button>').join('') + '</div>' +
    (w === 'vid'
      ? '<div class="card">' + empty('play', t('No videos yet','Todavía no hay vídeos'),
          t('This shelf is empty on purpose. It will hold PEPTIDEX material when there is PEPTIDEX material.',
            'Este estante está vacío a propósito. Llevará material de PEPTIDEX cuando lo haya.')) + '</div>'
      : '<div class="edugrid">' + list.map(eduCard).join('') + '</div>') +

    /* LAS TRES LÍNEAS — descubrimiento por familia, con el producto y el
       bloque entregados. Lo más cerca de una portada de catálogo que puede
       estar esto sin inventar fotografía que no existe. */
    sectH(t('The three lines','Las tres líneas')) +
    '<div class="lines">' + [
      ['fitness',   t('Performance, recovery and engineering.','Rendimiento, recuperación e ingeniería.'), 'perf'],
      ['beauty',    t('Refinement and cosmetic science.','Refinamiento y ciencia cosmética.'), 'beau'],
      ['longevity', t('Time, calm and advanced science.','Tiempo, calma y ciencia avanzada.'), 'long']
    ].map(x => '<button class="linecard" data-sub="comp:' + x[2] + '" data-go="comp">' +
      '<span class="lc-art">' + (ART['vial_' + x[0]]
        ? '<img src="' + ART['vial_' + x[0]] + '" alt="PEPTIDEX ' + x[0].toUpperCase() +
          '" loading="lazy" decoding="async"/>' : '') + '</span>' +
      '<span class="lc-bd">' + famLock(x[0]) +
        '<span class="lc-tx">' + x[1] + '</span></span>' +
    '</button>').join('') + '</div>' + ruo();
}
/* LA TARJETA DE LA REFERENCIA: imagen grande, epígrafe, título y duración.

   La imagen es el producto entregado sobre placa oscura — el único material
   propio que existe. Nada de banco de imágenes: ni ADN girando, ni moléculas
   azules, ni laboratorios de archivo. */
function eduCard(a){
  const src = ART['vial_' + (a.linea || 'fitness')];
  return '<button class="educard" data-art="' + a.id + '">' +
    '<span class="art">' + (src ? '<img src="' + src + '" alt="" loading="lazy" decoding="async"/>' : '') +
      '</span>' +
    '<span class="bd">' +
      '<span class="kick">' + (a.k === 'pro' ? t('PROTOCOL','PROTOCOLO')
        : a.k === 'vid' ? t('VIDEO','VÍDEO') : t('ARTICLE','ARTÍCULO')) + '</span>' +
      '<span class="ti">' + t(a.t.en, a.t.es) + '</span>' +
      '<span class="mi">' + t(a.m.en, a.m.es) + '</span>' +
    '</span>' +
    (a.k === 'vid' ? '<span class="play">' + svg('play') + '</span>' : '') +
  '</button>';
}
/* El lector. Ancho de lectura, no ancho de ventana. */
function eduLee(a){
  const cuerpo = ES ? a.b.es : a.b.en;
  return '' +
    navh('edu', a.k === 'pro' ? t('Protocol','Protocolo') : t('Article','Artículo')) +
    '<span class="eyebrow">' + t(a.m.en, a.m.es) + '</span>' +
    '<h2 class="h1" style="margin:8px 0 18px;max-width:20ch">' + t(a.t.en, a.t.es) + '</h2>' +
    cuerpo.map(x => '<p class="read">' + x + '</p>').join('') +
    '<div class="acts" style="margin-top:22px">' +
      '<button class="btn ghost" data-go="' + a.go + '">' +
        t('Go to the screen','Ir a la pantalla') + '</button>' +
      '<button class="btn quiet" data-go="edu">' + t('More reading','Más lecturas') + '</button>' +
    '</div>' + ruo();
}

/* ==========================================================================
   24 · MÁS — el mapa entero de la aplicación

   ÉSTA ERA LA PANTALLA QUE ROMPÍA EL TELÉFONO.

   Con cinco pestañas abajo, todo lo que no cabe en cinco tiene que llegar por
   aquí, y antes «Más» sólo enseñaba cinco de los nueve destinos. Media
   aplicación no se podía alcanzar desde un teléfono.

   Ahora están TODOS, agrupados por para qué sirven —que es como el usuario los
   busca— y con las herramientas de la Biblioteca abiertas una por una, para
   que llegar a la calculadora sean dos toques y no cuatro.
   ========================================================================== */
function vMore(){
  const fila = (ic, nm, mt, attr) => '<button class="row go" ' + attr + '>' +
    '<span class="rico">' + svg(ic) + '</span>' +
    '<span class="bd"><span class="nm">' + nm + '</span>' +
      (mt ? '<span class="mt">' + mt + '</span>' : '') + '</span>' +
    '<span class="cv"></span></button>';
  const nav = id => {
    const n = navOf(id), d = MOREDESC[id] || {};
    return fila(n.ic, t(n.en, n.es), t(d.en||'', d.es||''), 'data-go="' + id + '"');
  };
  const GRUPOS = [
    {t:t('Your record','Tu registro'), rows:[nav('cal'), nav('prog'), nav('inj')]},
    {t:t('The bench','La mesa'), rows:[
      fila('flask', t('Reconstitution calculator','Calculadora de reconstitución'),
           t('mg, mL and the mark on the syringe','mg, mL y la marca en la jeringa'),
           'data-tool="calc"'),
      fila('prog', t('Half-life','Vida media'),
           t('What is left in you, over time','Lo que te queda dentro, en el tiempo'),
           'data-tool="hl"'),
      fila('user', t('Injection sites','Zonas de inyección'),
           t('Your own map','Tu propio mapa'), 'data-tool="zon"'),
      fila('box', t('My vials','Mis viales'),
           t('Batch, reconstitution and what is left','Lote, reconstitución y lo que queda'),
           'data-tool="inv"')]},
    {t:t('Reference','Referencia'), rows:[nav('comp'), nav('edu')]},
    {t:t('Account','Cuenta'), rows:[nav('set'),
      fila('shield', t('Privacy & Terms','Privacidad y términos'),
           t('What we store and what we do not','Qué se guarda y qué no'),
           'data-go="legal"')]},
    {t:'PEPTIDEX', rows:[
      '<a class="row go" href="' + STORE + '" target="_blank" rel="noopener">' +
        '<span class="rico">' + svg('bag') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Store','Tienda') + '</span>' +
        '<span class="mt">' + t('Catalogue and orders','Catálogo y pedidos') +
        '</span></span><span class="cv"></span></a>',
      '<a class="row go" href="mailto:' + MAIL + '">' +
        '<span class="rico">' + svg('help') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Support','Soporte') + '</span>' +
        '<span class="mt">' + MAIL + '</span></span><span class="cv"></span></a>']}
  ];
  return '' +
    navh('', t('More','Más'), navAct('search', 'find', t('Search','Buscar'))) +

    '<button class="row go" data-pch style="border:1px solid var(--line);' +
      'border-radius:var(--r-card);padding:16px 18px;margin-bottom:6px">' +
      '<span class="rico">' + MK + '</span>' +
      '<span class="bd"><span class="nm">PepCheems</span>' +
        '<span class="mt">' + t('Ask about your log, your protocols or any compound.',
                                'Pregúntale por tu registro, tus protocolos o cualquier compuesto.') +
      '</span></span><span class="cv"></span></button>' +

    GRUPOS.map(g => '<section class="csec">' +
      '<h2 class="csec-h"><span>' + g.t + '</span></h2>' +
      '<div class="bare">' + g.rows.join('') + '</div>' +
    '</section>').join('') + ruo();
}
const MOREDESC = {
  cal:  {en:'Your month, day by day',        es:'Tu mes, día por día'},
  prog: {en:'What you measured, over time',  es:'Lo que mediste, en el tiempo'},
  inj:  {en:'Every dose you logged',         es:'Cada dosis que registraste'},
  comp: {en:'The %n compound sheets',        es:'Las %n fichas de compuesto'},
  edu:  {en:'Read before, not after',        es:'Leer antes, no después'},
  set:  {en:'Profile, theme, plan, data',    es:'Perfil, tema, plan, datos'}
};

/* ==========================================================================
   24b · BUSCAR — una sola caja para toda la aplicación

   La referencia web pide «Buscar compuestos, protocolos…» arriba del todo. En
   el teléfono no cabe un campo permanente en la barra, así que la lupa abre
   ESTA pantalla, que busca en las cinco cosas que existen y agrupa por dónde
   vive cada una.

   Vacía no está vacía: enseña los destinos y las herramientas. Es el mapa de
   la aplicación, y por eso el buscador es también la forma más rápida de
   llegar a cualquier sitio sin saber en qué pestaña estaba.
   ========================================================================== */
function vFind(){
  const q = String(S.fq || '').trim();
  const n = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const hit = txt => !n || String(txt||'').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g,'').indexOf(n) >= 0;

  const comps = !n ? [] : LIB.filter(e => hit(e.n) || hit(e.cat) || hit(e.sku) || hit(e.mec));
  const prots = !n ? S.plan.slice(0,3)
                   : S.plan.filter(p => hit(pName(p)) || pComps(p).some(hit));
  const arts  = !n ? ARTS.slice(0,2)
                   : ARTS.filter(a => hit(t(a.t.en,a.t.es)) || hit(t(a.d.en,a.d.es)));
  const dests = (!n ? ALLNAV : ALLNAV.filter(x => hit(t(x.en, x.es))))
    .filter(x => x.id !== 'find');

  const grupo = (titulo, filas, mas) => filas.length
    ? '<section class="findgrp"><h2>' + titulo + '</h2>' +
      '<div class="card">' + filas.join('') + (mas || '') + '</div></section>' : '';

  const VER = 8;
  return '' +
    navh('', t('Search','Buscar')) +
    '<div class="field">' + svg('search') +
      '<input id="fq" placeholder="' +
      t('Compounds, protocols, screens…','Compuestos, protocolos, pantallas…') +
      '" value="' + E(q) + '"/>' +
      (q ? '<button class="x" data-clear-fq aria-label="' + t('Clear','Limpiar') + '">' +
        svg('close') + '</button>' : '') + '</div>' +

    grupo(t('Compounds','Compuestos'), comps.slice(0, VER).map(compRow),
      comps.length > VER ? '<button class="findmore" data-go="comp">' +
        t('See all %n','Ver los %n').replace('%n', comps.length) + '</button>' : '') +

    grupo(t('Protocols','Protocolos'), prots.map(p =>
      '<button class="row go" data-open-prot="' + p.id + '">' +
        vial(pComps(p)[0], 'sm') +
        '<span class="bd"><span class="nm">' + E(pName(p)) + '</span>' +
          '<span class="mt">' + E(pComps(p).join(' · ')) + '</span></span>' +
      '<span class="cv"></span></button>')) +

    grupo(t('Reading','Lecturas'), arts.map(a =>
      '<button class="row go" data-art="' + a.id + '">' +
        '<span class="rico">' + svg('doc') + '</span>' +
        '<span class="bd"><span class="nm">' + t(a.t.en, a.t.es) + '</span>' +
          '<span class="mt">' + t(a.m.en, a.m.es) + '</span></span>' +
      '<span class="cv"></span></button>')) +

    grupo(t('Screens','Pantallas'), dests.map(x =>
      '<button class="row go" data-go="' + x.id + '">' +
        '<span class="rico">' + svg(x.ic) + '</span>' +
        '<span class="bd"><span class="nm">' + t(x.en, x.es) + '</span></span>' +
      '<span class="cv"></span></button>')) +

    (n && !comps.length && !prots.length && !arts.length && !dests.length
      ? '<div class="card">' + empty('search', t('Nothing matches','Nada coincide'), E(q),
          '<button class="btn ghost" data-clear-fq>' + t('Clear','Limpiar') + '</button>') + '</div>'
      : '') + ruo();
}

/* ==========================================================================
   24c · PRIVACIDAD Y TÉRMINOS

   Escrito para leerse, no para cubrirse. Dos pestañas, frases cortas, y sin
   una sola línea de jerga técnica: al usuario no le importa qué API no se
   llama — le importa quién puede ver lo que escribe y qué pasa si cambia de
   teléfono. Eso es lo que se contesta.
   ========================================================================== */
const LEGAL = {
  priv:{
    en:[['What we store', [
        'Your protocols, your log, your measurements and your vials. Nothing else.',
        'It stays on the device you are using. We do not hold a copy and neither does anyone else.',
        'There is no advertising, no tracking and no profiling. Nothing you write here is used to sell you anything.']],
      ['Your name and email', [
        'Optional. They are used to greet you and to fill in your profile — nothing is sent anywhere.']],
      ['Backups and moving device', [
        'Settings → Your data → Export writes a file with everything. Import reads it back.',
        'Clearing your browser data erases PepX. Export first, or it is gone.']],
      ['Deleting everything', [
        'Settings → Your data → Erase everything removes it in one step, with no way back.']]],
    es:[['Qué se guarda', [
        'Tus protocolos, tu registro, tus medidas y tus viales. Nada más.',
        'Se queda en el aparato que estés usando. No tenemos una copia, y nadie más tampoco.',
        'No hay publicidad, ni rastreo, ni perfilado. Nada de lo que escribes aquí sirve para venderte nada.']],
      ['Tu nombre y tu correo', [
        'Opcionales. Sirven para saludarte y para rellenar tu perfil — no se mandan a ningún sitio.']],
      ['Copias y cambiar de aparato', [
        'Configuración → Tus datos → Exportar escribe un fichero con todo. Importar lo devuelve.',
        'Si borras los datos del navegador, PepX se borra. Exporta antes, o se ha ido.']],
      ['Borrarlo todo', [
        'Configuración → Tus datos → Borrar todo lo quita de una vez, sin vuelta atrás.']]]
  },
  term:{
    en:[['Research use only', [
        'PEPTIDEX material is supplied for research and educational use. It is not a medicine and it is not for human or veterinary consumption.']],
      ['PepX is a record, not a recommendation', [
        'The app writes down what you decide and gives it back in order. It does not propose compounds, doses or schedules, and it never will.',
        'The reference figures in the compound library are quoted from the PEPTIDEX operations record, with their source attached. They are the operator document — not a schedule the app applies to you.']],
      ['PepCheems', [
        'PepCheems answers from your own log and from that same operations record. It does not give clinical advice, and when a question asks for one it says so.']],
      ['No medical advice', [
        'Nothing in this application replaces a qualified professional. Decisions about your health are yours and theirs, not the app’s.']],
      ['Contact', ['Write to ' + MAIL + ' for anything at all.']]],
    es:[['Solo uso en investigación', [
        'El material de PEPTIDEX se suministra para uso de investigación y formación. No es un medicamento y no es para consumo humano ni veterinario.']],
      ['PepX es un registro, no una recomendación', [
        'La aplicación apunta lo que tú decides y te lo devuelve ordenado. No propone compuestos, ni dosis, ni pautas, y no lo va a hacer.',
        'Las cifras de referencia de la biblioteca están citadas del registro de operación de PEPTIDEX, con su procedencia. Son el documento del operador — no una pauta que la app te aplique.']],
      ['PepCheems', [
        'PepCheems contesta desde tu propio registro y desde ese mismo registro de operación. No da consejo clínico, y cuando una pregunta se lo pide, lo dice.']],
      ['Nada de consejo médico', [
        'Nada de esta aplicación sustituye a un profesional cualificado. Las decisiones sobre tu salud son tuyas y suyas, no de la app.']],
      ['Contacto', ['Escribe a ' + MAIL + ' para lo que sea.']]]
  }
};
function vLegal(){
  const w = sub1('legal', 'priv');
  const secs = LEGAL[w][ES ? 'es' : 'en'];
  return '' +
    navh(BACKTO.legal, t('Privacy & Terms','Privacidad y términos')) +
    '<div class="seg">' +
      '<button class="' + (w === 'priv' ? 'on' : '') + '" data-sub="legal:priv">' +
        t('Privacy','Privacidad') + '</button>' +
      '<button class="' + (w === 'term' ? 'on' : '') + '" data-sub="legal:term">' +
        t('Terms','Términos') + '</button>' +
    '</div>' +
    secs.map(sec => sectH(sec[0]) +
      sec[1].map(p => '<p class="read">' + E(p) + '</p>').join('')).join('') +
    '<p class="meta" style="margin-top:24px">' +
      t('Last updated ','Actualizado el ') + '06 · 2026' + '</p>' + ruo();
}

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
    navh(BACKTO.set, t('Settings','Configuración')) +

    '<div class="card pad">' +
      '<div style="display:flex;align-items:center;gap:18px">' +
        '<span class="avatar lg">' + E(initials()) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="h3">' + (S.me.nombre ? E(S.me.nombre) : t('No name set','Sin nombre')) + '</div>' +
          '<div class="meta" style="margin-top:3px">' +
            (S.me.correo ? E(S.me.correo) : t('Add your email below','Añade tu correo abajo')) + '</div></div></div>' +
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
      '<button class="row go" data-go="legal">' +
        '<span class="rico">' + svg('shield') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Privacy & Terms','Privacidad y términos') + '</span>' +
        '<span class="mt">' + t('What we store and what we do not',
                                'Qué se guarda y qué no') + '</span></span>' +
        '<span class="cv"></span></button>' +
      '<button class="row go" data-go="edu">' +
        '<span class="rico">' + svg('edu') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Education','Educación') + '</span>' +
        '<span class="mt">' + t('How this app works, in five reads',
                                'Cómo funciona esta app, en cinco lecturas') + '</span></span>' +
        '<span class="cv"></span></button>' +
      '<a class="row go" href="mailto:' + MAIL + '">' +
        '<span class="rico">' + svg('help') + '</span>' +
        '<span class="bd"><span class="nm">' + t('Support','Soporte') + '</span>' +
        '<span class="mt">' + MAIL + '</span></span><span class="cv"></span></a></div>' +

    sectH(t('Plan','Plan')) +
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
      '<p class="meta" style="margin:10px 0 0">' + t('Export writes a file with everything — that is your backup, and how you move to another device.',
        'Exportar escribe un fichero con todo — ésa es tu copia de seguridad, y así te pasas a otro aparato.') + '</p>' +
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
      t('PepX is installed on this device. It opens full screen and is always ready.',
        'PepX está instalada en este aparato. Abre a pantalla completa y está siempre lista.') + '</p></div>';
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
    '<p class="meta" style="margin:10px 0 4px">' + t('PepX installs to the home screen with its own icon and opens full screen, like any other app.',
      'PepX se instala en la pantalla de inicio con su icono y abre a pantalla completa, como cualquier otra app.') + '</p>' +
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
               prog:vProg, lib:vLib, edu:vEdu, set:vSet, more:vMore,
               find:vFind, legal:vLegal};
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
    S.route = g; S.open = null; S.newProt = false; S.jnew = false; save(); paint(); top0();
    if(g === 'find') setTimeout(() => { const i = document.getElementById('fq'); if(i) i.focus(); }, 80);
  });
  /* Las herramientas de la Biblioteca se abren directas desde «Más»: dos
     toques hasta la calculadora en vez de cuatro. */
  on('[data-tool]', 'click', function(){
    S.route = 'lib'; S.sub1.lib = this.dataset.tool; S.open = null; save(); paint(); top0();
  });
  on('[data-art]', 'click', function(){
    S.route = 'edu'; S.open = this.dataset.art; save(); paint(); top0();
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
  /* El selector de ventana de la portada gira entre las tres. Un desplegable
     nativo para tres opciones es más peso del que la decisión merece. */
  on('[data-win-cycle]', 'click', () => {
    const w = +sub1('win', 7);
    const i = WINDOWS.map(x => x[0]).indexOf(w);
    S.sub1.win = String(WINDOWS[(i + 1) % WINDOWS.length][0]);
    save(); paint();
  });

  /* buscador global: escribe en la biblioteca y lleva allí */
  const gq = document.getElementById('gq');
  if(gq){
    let tmr = null;
    gq.addEventListener('input', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        S.gq = gq.value; S.fq = gq.value; S.route = 'find'; S.open = null; save();
        const pos = gq.selectionStart; paint();
        const n = document.getElementById('gq');
        if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
      }, 300);
    });
  }
  /* el campo de la pantalla de buscar */
  const fq = document.getElementById('fq');
  if(fq){
    let tmr = null;
    fq.addEventListener('input', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        S.fq = fq.value; save();
        const pos = fq.selectionStart; paint();
        const n = document.getElementById('fq');
        if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
      }, 240);
    });
  }
  on('[data-clear-fq]', 'click', () => { S.fq = ''; S.gq = ''; save(); paint();
    setTimeout(() => { const i = document.getElementById('fq'); if(i) i.focus(); }, 60); });
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
  on('[data-new-prot]', 'click', () => {
    S.route = 'prot'; S.newProt = true; S.open = null;
    NEWP.items = []; NEWP.edit = null;
    save(); paint();
    setTimeout(() => { const i = document.getElementById('pxName'); if(i) i.focus(); }, 60);
  });
  on('[data-edit-prot]', 'click', function(e){
    e.stopPropagation();
    const p = S.plan.filter(x => x.id === this.dataset.editProt)[0];
    if(!p) return;
    NEWP.edit = p.id;
    NEWP.items = pItems(p).map(it => ({c:it.c, d:it.d, u:it.u}));
    S.route = 'prot'; S.newProt = true; S.open = null; save(); paint(); top0();
  });
  on('[data-close-prot]', 'click', () => {
    S.newProt = false; NEWP.items = []; NEWP.edit = null; save(); paint();
  });
  on('[data-open-prot]', 'click', function(){
    S.route = 'prot'; S.newProt = false;
    S.open = S.open === this.dataset.openProt ? null : this.dataset.openProt;
    save(); paint();
  });
  /* Añadir un compuesto a la pila que se está escribiendo. No se guarda nada
     todavía: la pila vive en NEWP hasta que se pulsa Guardar. */
  const addIt = document.getElementById('pxAddIt');
  const meteItem = () => {
    const c = val('pxC');
    const box = document.getElementById('pxC');
    if(!c){ if(box) box.focus(); return; }
    NEWP.items.push({c:c, d:val('pxD'), u:val('pxU') || 'mcg'});
    const lista = document.getElementById('pxItems');
    if(lista) lista.innerHTML = itemsHTML();
    ['pxC','pxD'].forEach(id => { const i = document.getElementById(id); if(i) i.value = ''; });
    if(box) box.focus();
    cableaQuitar();
  };
  const cableaQuitar = () => {
    root.querySelectorAll('[data-rm-it]').forEach(b => b.addEventListener('click', function(){
      NEWP.items.splice(+this.dataset.rmIt, 1);
      const lista = document.getElementById('pxItems');
      if(lista) lista.innerHTML = itemsHTML();
      cableaQuitar();
    }));
  };
  if(addIt){
    addIt.addEventListener('click', ev => { ev.preventDefault(); meteItem(); });
    cableaQuitar();
    const ci = document.getElementById('pxC');
    if(ci) ci.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){ ev.preventDefault(); meteItem(); }
    });
  }
  const f = document.getElementById('pxF');
  if(f){ freqExtra(f.value); f.addEventListener('change', () => freqExtra(f.value)); }
  const add = document.getElementById('pxAdd');
  if(add) add.addEventListener('click', () => {
    /* Lo que quedó escrito en la fila de abajo cuenta: pulsar Guardar sin
       haber pulsado antes «Añadir compuesto» no puede perder lo tecleado. */
    if(val('pxC')) meteItem();
    if(!NEWP.items.length){
      const i = document.getElementById('pxC'); if(i) i.focus(); return;
    }
    const freq = val('pxF');
    const nom = val('pxName') || NEWP.items[0].c;
    const p = {id: NEWP.edit || uid(), name:nom, items:NEWP.items.slice(),
               freq:freq, time:val('pxT'), start:val('pxS') || today(),
               end:val('pxE'), notes:val('pxN'), active:true};
    if(freq === 'dow') p.dow = [...root.querySelectorAll('.pick.p7 .on')].map(b => +b.dataset.d);
    if(freq === 'nd')  p.every = val('pxEvery') || 3;
    if(freq === 'cyc'){ p.on = val('pxOn') || 5; p.off = val('pxOff') || 2; }

    if(NEWP.edit){
      const i = S.plan.findIndex(x => x.id === NEWP.edit);
      if(i >= 0){ p.active = S.plan[i].active; S.plan[i] = p; }
    } else {
      if(!can('pro') && S.plan.length >= 2){
        alert(t('The free plan holds two protocols. Settings has the rest.',
                'El plan gratuito guarda dos protocolos. En Configuración está el resto.'));
        S.route = 'set'; save(); paint(); return;
      }
      S.plan.push(p);
    }
    S.newProt = false; NEWP.items = []; NEWP.edit = null;
    S.sub1.prot = 'active'; save(); paint();
  });
  /* Un compuesto se puede mandar a un protocolo desde su propia ficha. */
  on('[data-add-to-prot]', 'click', function(){
    NEWP.edit = null;
    NEWP.items = [{c:this.dataset.addToProt, d:'', u:'mcg'}];
    S.route = 'prot'; S.newProt = true; S.open = null; save(); paint(); top0();
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
    /* Un registro antiguo guardaba `true` para el protocolo entero. Al tocar
       UNA pieza hay que desdoblarlo primero, o quitar una quitaría las cinco. */
    const pid = String(id).split('#')[0];
    if(S.log[k][pid] === true || (S.log[k][pid] && S.log[k][pid].all)){
      const p = S.plan.filter(x => x.id === pid)[0];
      const hora = (S.log[k][pid] && S.log[k][pid].t) || '';
      delete S.log[k][pid];
      if(p) pItems(p).forEach((it, i) => { S.log[k][pid + '#' + i] = {t:hora}; });
    }
    if(S.log[k][id]) delete S.log[k][id];
    else S.log[k][id] = {t:new Date().toTimeString().slice(0,5)};
    if(!Object.keys(S.log[k]).length) delete S.log[k];
    save(); paint();
  });
  on('[data-rm-extra]', 'click', function(){
    const [k, i] = this.dataset.rmExtra.split('|');
    if(S.extra && S.extra[k]){
      S.extra[k].splice(+i, 1);
      if(!S.extra[k].length) delete S.extra[k];
    }
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
  /* «Otra cosa…» abre los tres campos de compuesto libre */
  const jP = document.getElementById('jP');
  const jOtro = document.getElementById('jOtro');
  const pintaOtro = () => {
    if(!jP || !jOtro) return;
    jOtro.className = jP.value === '__otro' ? '' : 'sr';
  };
  if(jP){ pintaOtro(); jP.addEventListener('change', pintaOtro); }

  const jAdd = document.getElementById('jAdd');
  if(jAdd) jAdd.addEventListener('click', () => {
    const id = val('jP');
    const k = val('jD') || today();
    const hora = val('jT') || new Date().toTimeString().slice(0,5);
    const z = val('jZ');

    if(id === '__otro' || !id){
      /* fuera de pauta: se apunta igual, marcado como tal */
      const c = val('jC');
      if(!c){ const i = document.getElementById('jC'); if(i) i.focus(); return; }
      S.extra = S.extra || {};
      S.extra[k] = S.extra[k] || [];
      S.extra[k].push({c:c, d:val('jDose'), u:val('jU') || 'mcg', t:hora, z:z});
      if(z) S.sites.push({id:uid(), d:k, z:z, c:c});
    } else {
      S.log[k] = S.log[k] || {};
      S.log[k][id] = {t:hora, z:z};
      if(z){
        const pid = String(id).split('#')[0], ix = +String(id).split('#')[1] || 0;
        const p = S.plan.filter(x => x.id === pid)[0];
        const it = p ? pItems(p)[ix] : null;
        S.sites.push({id:uid(), d:k, z:z, c:it ? it.c : ''});
      }
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

   QUÉ SABE

   Tres fuentes, y las tres están dentro de la aplicación:

     1. TU REGISTRO      protocolos, pila por pila, lo marcado y lo que falta,
                         viales, zonas y las medidas que hayas apuntado
     2. EL REGISTRO DE OPERACIÓN DE PEPTIDEX
                         las 60 fichas: clase, mecanismo, presentación,
                         solvente, conservación y la columna de referencia
     3. LA ARITMÉTICA    reconstitución, conversión de unidades, cuánto dura un
                         vial a tu ritmo, cuántas marcas de jeringa

   LA RAYA, QUE NO SE CRUZA

   PepCheems NO dice qué tomar, cuánto ni cada cuándo. Cuando la pregunta pide
   eso, lo dice y ofrece lo que sí puede hacer. La columna de referencia del
   registro de operación se CITA, con marco y procedencia, como lo que es: el
   documento del operador.

   Eso no es prudencia decorativa: es lo que separa un registro de una receta.

   LA VOZ

   Corta. Da el dato y se calla. No saluda cada vez, no se disculpa y no
   adorna. Usa el nombre del usuario cuando lo tiene. Cuando algo no cuadra lo
   dice sin rodeos, y cuando no entiende, lo dice también en vez de inventar.
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
/* El nombre de pila, cuando lo hay. Es la diferencia entre una consola y
   alguien que te conoce, y cuesta una línea. */
const yo = () => (S.me.nombre || '').trim().split(/\s+/)[0] || '';
const conNombre = (txt) => { const n = yo(); return n ? txt.replace('%n', n) : txt.replace(/,?\s*%n/,''); };

/* ---- normalizar --------------------------------------------------------- */
const sinTildes = x => String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

/* ---- los intentos --------------------------------------------------------
   NINGÚN GRUPO CIERRA CON \b, Y ES A PROPÓSITO.

   En español la palabra que el usuario escribe casi nunca es la raíz: escribe
   «viales», «protocolos», «conserva», «próxima», «recomiendas». Un `\b` al
   final del grupo exige frontera de palabra justo después de la raíz, así que
   `vial` no engancha «viales» y el intento se cae al «no lo cogí». El `\b` de
   delante sí se queda: impide enganchar dentro de otra palabra. Las palabras
   cortas que sí son enteras —mes, ml, bac, voy, luz— llevan su propio `\b`. */
/* Orden: lo que NO se contesta va primero de todo, para que ningún otro
   intento la atienda por accidente. Después lo específico, y al final lo
   general. */
function pchResponde(txt){
  const q = String(txt || '').trim();
  const n = sinTildes(q);
  if(!n) return [];

  const hoy = today();
  const e = pchBusca(n);           /* ¿hay un compuesto nombrado en la frase? */

  /* 1 · lo que no se contesta ------------------------------------------- */
  if(/\b(recomiend|recomend|que me pongo|que tomo|que deberia|deberia tomar|cuanto me pongo|cuanto tomo|cuanta dosis|que dosis|dosis deberia|es seguro|es peligroso|efectos secundarios|puedo mezclar|mezclar con|combinar con|ciclo para|para bajar de peso|para subir|para ganar|me sirve para|sirve para|cura|curar|trata|tratar|recommend|should i|how much should|what dose|is it safe|side effect|stack for|will it help|good for)/.test(n))
    return [pchDi(conNombre(
      t('I do not say what to take, how much or how often, %n. That is not modesty — it is the line between a record and a prescription, and PepX stays on this side of it.',
        'No digo qué tomar, cuánto ni cada cuándo, %n. No es prudencia — es la línea entre un registro y una receta, y PepX se queda de este lado.')), ''),
      pchDi(
      t('What I can do: read back what you wrote, count your adherence, do the reconstitution arithmetic, tell you how long a vial lasts at your pace, and quote the operations record for a compound — with its source attached.',
        'Lo que sí puedo: leerte lo que escribiste, contarte tu adherencia, hacer la aritmética de reconstitución, decirte cuánto te dura un vial a tu ritmo y citarte el registro de operación de un compuesto — con su procedencia.'),
      '')];

  /* 2 · cortesía ---------------------------------------------------------- */
  if(/^(hola|buenas|hey|hi|hello|que tal|buenos dias|buenas tardes|buenas noches)\b/.test(n))
    return [pchDi(conNombre(t('%n. What do you need?','%n. ¿Qué necesitas?'))
      .replace(/^\.\s*/, t('Here.','Aquí estoy.') + ' '), ''),
      pchDi(t('Your log, your protocols, any of the %c compound sheets, or the arithmetic.',
              'Tu registro, tus protocolos, cualquiera de las %c fichas de compuesto, o la aritmética.')
        .replace('%c', LIB.length), '')];
  if(/\b(gracias|thanks|thank you|genial|perfecto)/.test(n))
    return [pchDi(t('Noted.','Anotado.'), '')];

  /* 3 · qué toca hoy ------------------------------------------------------ */
  if(/\b(hoy|today|ahora|pendiente|falta|me queda por|toca hoy)/.test(n)){
    if(!S.plan.length) return [pchDi(
      t('You have no protocol written yet. Protocols → New, and this starts answering.',
        'Todavía no tienes ningún protocolo escrito. Protocolos → Nuevo, y esto empieza a contestar.'), SRC.tuyo)];
    const due = dueList(hoy);
    if(!due.length) return [pchDi(
      t('Nothing scheduled today by your own plan.','Hoy no toca nada según tu propio plan.'), SRC.tuyo)];
    let total = 0, hechas = 0;
    const faltan = [];
    due.forEach(p => pItems(p).forEach((it, i) => {
      total++;
      if(takenItem(hoy, p.id, i)) hechas++;
      else faltan.push(E(it.c) + (doseTxt(it) ? ' ' + E(doseTxt(it)) : '') +
                       (p.time ? ' · ' + E(p.time) : ''));
    }));
    const out = [pchDi(t('%h of %d logged today.','%h de %d registrado hoy.')
      .replace('%h', hechas).replace('%d', total), SRC.tuyo)];
    if(faltan.length) out.push(pchDi(t('Still open: %l.','Sin registrar: %l.')
      .replace('%l', faltan.join(' — ')), SRC.tuyo));
    else out.push(pchDi(t('Nothing left for today.','Por hoy no queda nada.'), SRC.tuyo));
    return out;
  }

  /* 4 · la siguiente ------------------------------------------------------ */
  if(/\b(siguiente|proxim|next|cuando|when|toca|manana|tomorrow)/.test(n)){
    const act = S.plan.filter(p => planState(p) === 'active');
    const px = act.map(p => ({p:p, k:nextDue(p)})).filter(x => x.k)
      .sort((a,b) => a.k < b.k ? -1 : 1);
    if(!px.length) return [pchDi(
      t('Nothing upcoming in any active protocol.','No hay nada por venir en ningún protocolo activo.'), SRC.tuyo)];
    const p0 = px[0].p, its = pItems(p0);
    return [pchDi('<b>' + human(px[0].k) + (p0.time ? ', ' + E(p0.time) : '') + '</b> — ' +
        E(pName(p0)) + '.', SRC.tuyo),
      pchDi(its.map(it => E(it.c) + (doseTxt(it) ? ' ' + E(doseTxt(it)) : '')).join(' · ') +
        (its.length > 1 ? ' — ' + t('%n injections','%n inyecciones').replace('%n', its.length) : ''),
        SRC.tuyo)]
      .concat(px.length > 1 ? [pchDi(t('After that: %l.','Después: %l.')
        .replace('%l', px.slice(1,3).map(x => E(pName(x.p)) + ' ' + human(x.k)).join(' · ')),
        SRC.tuyo)] : []);
  }

  /* 5 · adherencia y racha ------------------------------------------------ */
  if(/\b(adherenc|racha|streak|semana|week|voy\b|llevo|cumpl|mes\b|month|como voy)/.test(n)){
    const w = /mes|month|30/.test(n) ? 30 : 7;
    const a = adherence(w), st = streak();
    if(!a.tocaba) return [pchDi(
      t('Nothing was scheduled in the last %w days, so there is no percentage to give.',
        'No tocaba nada en los últimos %w días, así que no hay porcentaje que dar.')
      .replace('%w', w), SRC.tuyo)];
    const out = [pchDi(t('<b>%p%</b> over the last %w days — %h of %t scheduled injections logged.',
                    '<b>%p%</b> en los últimos %w días — %h de %t inyecciones programadas, registradas.')
      .replace('%p', Math.round(a.pct*100)).replace('%w', w)
      .replace('%h', a.hecho).replace('%t', a.tocaba), SRC.tuyo),
      pchDi(st ? t('Unbroken streak: %n days.','Racha sin fallar: %n días.').replace('%n', st)
               : t('No streak running right now.','Ahora mismo no hay racha.'), SRC.tuyo)];
    if(a.pct === 1) out.push(pchDi(t('Nothing missed in the window.','No falta nada en la ventana.'), ''));
    return out;
  }

  /* 6 · mis protocolos ---------------------------------------------------- */
  if(/\b(protocolo|protocol|mi pila|mis pilas|que llevo|que estoy tomando|stack mio)/.test(n)){
    if(!S.plan.length) return [pchDi(
      t('No protocols written yet.','Todavía no hay protocolos escritos.'), SRC.tuyo)];
    return S.plan.map(p => {
      const ph = phase(p), st = planState(p);
      return pchDi('<b>' + E(pName(p)) + '</b> — ' +
        (st === 'active' ? t('active','activo') : st === 'done' ? t('done','completado')
                                                                : t('draft','borrador')) +
        (ph && ph.total ? ' · ' + t('week %w of %t','semana %w de %t')
          .replace('%w', ph.w).replace('%t', ph.total) : '') +
        '<br>' + pComps(p).join(' · ') + ' — ' + E(freqText(p)), SRC.tuyo);
    });
  }

  /* 7 · viales y existencias ---------------------------------------------- */
  if(/\b(vial|frasco|existenc|stock|quedan|me dura|cuanto dura|caduc|expir)/.test(n)){
    if(!S.vials.length) return [pchDi(
      t('You have no vials registered. More → My vials adds one.',
        'No tienes viales registrados. Más → Mis viales añade uno.'), SRC.tuyo)];
    return S.vials.slice(0,5).map(v => {
      const dias = v.recon ? days(v.recon, hoy) : null;
      /* cuánto dura a SU ritmo, que es lo que se pregunta de verdad */
      const p = S.plan.filter(x => x.active && pComps(x).indexOf(v.c) >= 0)[0];
      let dura = '';
      if(p && v.quedan != null && v.quedan !== ''){
        let left = +v.quedan, k = hoy, i = 0;
        while(left > 0 && i < 400){ if(dueOn(p, k)) left--; if(left > 0){ k = shift(k,1); i++; } }
        dura = ' · ' + t('lasts until %d at your pace','a tu ritmo te llega hasta %d')
          .replace('%d', human(k).toLowerCase());
      }
      return pchDi('<b>' + E(v.c) + '</b>' + (v.mg ? ' · ' + E(v.mg) : '') +
        (v.quedan ? ' · ' + t('%n left','quedan %n').replace('%n', E(v.quedan)) : '') +
        (dias != null ? ' · ' + t('reconstituted %n days ago','reconstituido hace %n días')
          .replace('%n', dias) : '') +
        (v.exp ? ' · ' + t('expires ','caduca ') + human(v.exp) : '') + dura, SRC.tuyo);
    });
  }

  /* 8 · conservación de un compuesto -------------------------------------- */
  if(e && /\b(conserv|guardar|almacen|frio|nevera|congel|refriger|temperatura|luz\b|storage|store|fridge|freeze)/.test(n)){
    const cons = conserva(e);
    return [pchDi('<b>' + E(e.n) + '</b> — ' + E(e.alm || t('no storage note on the sheet',
      'la ficha no trae nota de conservación')), SRC.libro),
      cons.length ? pchDi(cons.join(' · '), SRC.libro) : null,
      pchDi(t('The printed expiry is the powder’s. Once reconstituted another clock starts, and that one you write down.',
              'La caducidad impresa es la del polvo. Reconstituido empieza otro reloj, y ése lo apuntas tú.'), '')
    ].filter(Boolean);
  }

  /* 9 · reconstitución de un compuesto concreto --------------------------- */
  if(e && /\b(reconstitu|bac\b|agua|disolv|solvente|diluir|cuanta agua|how much water)/.test(n)){
    const mg = (e.mg && e.mg.length) ? e.mg[0] : null;
    const ml = e.bac || null;
    const out = [pchDi('<b>' + E(e.n) + '</b> — ' +
      (e.esp ? E(e.esp) + '. ' : '') + (e.sol ? t('Solvent: ','Solvente: ') + E(e.sol) + '.' : ''),
      SRC.libro)];
    if(mg && ml)
      out.push(pchDi(t('The record has it at %m mg with %v mL, which is %c mg/mL. Volume is your call — more solvent is the same product on a longer ruler.',
                       'El registro lo trae a %m mg con %v mL, que son %c mg/mL. El volumen lo eliges tú — más disolvente es el mismo producto con una regla más larga.')
        .replace('%m', nf(mg,2)).replace('%v', nf(ml,2)).replace('%c', nf(mg/ml,2)), SRC.libro));
    out.push(pchDi(t('Give me your dose and I do the division. Library → Calculator has the three fields.',
                     'Dame tu dosis y hago la división. Biblioteca → Calculadora tiene los tres campos.'), ''));
    return out;
  }

  /* 10 · un compuesto por su nombre --------------------------------------- */
  if(e){
    const cons = conserva(e), r = e.ref || {};
    const f = FAM.filter(x => x.id === family(e))[0];
    const out = [pchDi('<b>' + E(e.n) + '</b>' + (e.sku ? ' · ' + E(e.sku) : '') +
      (f ? ' · ' + t(f.en, f.es) : '') +
      (e.mec ? '<br>' + E(e.mec) : ''), SRC.libro)];
    if(e.ins) out.push(pchDi(E(e.ins), SRC.libro));
    if(e.esp || e.sol || cons.length) out.push(pchDi(
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
    /* ¿lo llevas ya en alguna pila? */
    const mio = S.plan.filter(p => pComps(p).indexOf(e.n) >= 0);
    if(mio.length) out.push(pchDi(t('You have it in %l.','Lo llevas en %l.')
      .replace('%l', mio.map(p => E(pName(p))).join(' · ')), SRC.tuyo));
    return out;
  }

  /* 11 · conversión de unidades ------------------------------------------- */
  const conv = n.match(/(\d+(?:[.,]\d+)?)\s*(mcg|ug|mg)\b/);
  if(conv && /\b(cuanto|cuantos|convert|pasa|en mg|en mcg|equivale|son)\b/.test(n)){
    const v = parseFloat(conv[1].replace(',','.'));
    const u = conv[2] === 'mg' ? 'mg' : 'mcg';
    return [pchDi(u === 'mg'
      ? t('%v mg = <b>%o mcg</b>.','%v mg = <b>%o mcg</b>.')
          .replace('%v', nf(v,3)).replace('%o', nf(v*1000,0))
      : t('%v mcg = <b>%o mg</b>.','%v mcg = <b>%o mg</b>.')
          .replace('%v', nf(v,0)).replace('%o', nf(v/1000,4)), SRC.suma)];
  }

  /* 12 · la aritmética de reconstitución ---------------------------------- */
  if(/\b(calcul|reconstitu|bac\b|agua|diluir|jeringa|unidad|units|ml\b|cuanto pongo|que marca)/.test(n)){
    const c = S.calc || {};
    const mg = parseFloat(c.mg), ml = parseFloat(c.ml), d = parseFloat(c.dose);
    if(!(mg > 0 && ml > 0 && d > 0))
      return [pchDi(t('Give me the three numbers in Library → Calculator: mg in the vial, mL of solvent, and the dose you decided. The arithmetic is mine; the three numbers are yours.',
                      'Dame los tres números en Biblioteca → Calculadora: mg del vial, mL de disolvente y la dosis que decidiste. La aritmética es mía; los tres números son tuyos.'), '')];
    const dmg = c.du === 'mcg' ? d/1000 : d;
    const conc = mg/ml, mlDosis = dmg/conc, u = mlDosis*100;
    const dosis = dmg > 0 ? Math.floor(mg/dmg) : 0;
    const out = [pchDi(t('%m mg in %v mL is %c mg/mL. Your %d %u is <b>%x mL</b> — mark <b>%s</b> on a 100-unit syringe.',
                    '%m mg en %v mL son %c mg/mL. Tu dosis de %d %u es <b>%x mL</b> — marca <b>%s</b> en una jeringa de 100 unidades.')
      .replace('%m', nf(mg,2)).replace('%v', nf(ml,2)).replace('%c', nf(conc,2))
      .replace('%d', nf(d,2)).replace('%u', c.du || 'mcg')
      .replace('%x', nf(mlDosis,3)).replace('%s', nf(u,1)), SRC.suma)];
    if(dosis) out.push(pchDi(t('That vial holds <b>%n</b> doses of that size.',
                                'Ese vial da para <b>%n</b> dosis de ese tamaño.')
      .replace('%n', dosis), SRC.suma));
    if(u < 3) out.push(pchDi(t('%s units is a hard mark to read. Double the solvent and the same dose lands on %d.',
                               '%s unidades es una marca difícil de leer. Con el doble de disolvente la misma dosis cae en %d.')
      .replace('%s', nf(u,1)).replace('%d', nf(u*2,1)), ''));
    if(u > 100) out.push(pchDi(t('%s units does not fit in a 1 mL syringe — it needs more than one fill, or less solvent.',
                                 '%s unidades no caben en una jeringa de 1 mL — hacen falta más de una carga, o menos disolvente.')
      .replace('%s', nf(u,1)), ''));
    out.push(pchDi(t('That is division, not advice. The dose in it is the one you entered.',
                     'Eso es una división, no un consejo. La dosis que lleva es la que escribiste tú.'), ''));
    return out;
  }

  /* 13 · zonas ------------------------------------------------------------- */
  if(/\b(zona|sitio|donde me|rotar|rotation|site)/.test(n)){
    if(!S.sites.length) return [pchDi(
      t('You have not noted a site yet. The log form has the field.',
        'Todavía no has apuntado ninguna zona. El formulario de registro tiene el campo.'), SRC.tuyo)];
    const cuenta = {};
    S.sites.forEach(x => { cuenta[x.z] = (cuenta[x.z]||0) + 1; });
    const orden = Object.keys(cuenta).sort((a,b) => cuenta[b]-cuenta[a]);
    return [pchDi(orden.slice(0,5).map(z => E(zName(z)) + ' ×' + cuenta[z]).join(' · '), SRC.tuyo),
      pchDi(t('That is your pattern. What to do with it is not mine to say.',
              'Ése es tu patrón. Qué hacer con él no me toca a mí decirlo.'), '')];
  }

  /* 14 · cuántos compuestos hay -------------------------------------------- */
  if(/\b(cuantos compuestos|cuantas fichas|how many compounds|biblioteca|library|catalogo)/.test(n)){
    const porFam = FAM.map(f => {
      const k = LIB.filter(x => family(x) === f.id).length;
      return k ? t(f.en, f.es) + ' ' + k : '';
    }).filter(Boolean);
    return [pchDi(t('%n sheets in the operations record.','%n fichas en el registro de operación.')
      .replace('%n', LIB.length), SRC.libro),
      pchDi(porFam.join(' · '), SRC.libro),
      pchDi(t('Name any one and I read it back.','Nómbrame cualquiera y te la leo.'), '')];
  }

  /* 15 · quién eres --------------------------------------------------------- */
  if(/\b(quien eres|que eres|who are you|what are you|pepcheems|ayuda|help|puedes|que sabes|que haces)/.test(n))
    return [pchDi(conNombre(t('PepCheems, %n. I read three things: what you wrote in this app, the PEPTIDEX operations record, and a calculator.',
                    'PepCheems, %n. Leo tres cosas: lo que escribiste en esta app, el registro de operación de PEPTIDEX y una calculadora.')), ''),
            pchDi(t('Ask me what is due, how your week is going, what a compound sheet says, how long a vial lasts you, or the arithmetic of a reconstitution.',
                    'Pregúntame qué toca, cómo va tu semana, qué dice la ficha de un compuesto, cuánto te dura un vial, o la aritmética de una reconstitución.'), ''),
            pchDi(t('What I will not do is tell you what to take, how much or how often.',
                    'Lo que no voy a hacer es decirte qué tomar, cuánto ni cada cuándo.'), '')];

  /* 16 · no entendido ------------------------------------------------------- */
  return [pchDi(t('I did not catch that.','Eso no lo cogí.'), ''),
          pchDi(t('Try a compound name, or one of these.',
                  'Prueba con el nombre de un compuesto, o con una de éstas.'), '')];
}

/* Busca un compuesto dentro de la frase. Primero el nombre más largo, para que
   «BPC157 + TB500» no se resuelva como «TB500». Además del nombre completo
   prueba con la raíz sin sufijos —«CJC 1295 With DAC» encuentra «CJC-1295»—
   porque nadie escribe el nombre de catálogo entero. */
function pchBusca(n){
  const limpio = s => sinTildes(s).replace(/[^a-z0-9]/g,'');
  const frase = limpio(n);
  let mejor = null;
  const prueba = (clave, e) => {
    if(clave.length >= 3 && frase.indexOf(clave) >= 0 &&
       (!mejor || clave.length > limpio(mejor.k).length)) mejor = {k:clave, e:e};
  };
  for(const e of LIB){
    prueba(limpio(e.n), e);
    /* la raíz: hasta el primer paréntesis o la primera palabra suelta larga */
    const raiz = String(e.n).split(/[(\s]/)[0];
    if(raiz && raiz.length >= 4) prueba(limpio(raiz), e);
  }
  return mejor ? mejor.e : null;
}

/* Las sugerencias cambian con lo que el usuario TIENE. Ofrecerle «mis viales»
   a quien no ha registrado ninguno es enseñarle una puerta cerrada. */
const PCHSUG = () => {
  const s = [t('What is due today?','¿Qué toca hoy?'),
             t('When is my next injection?','¿Cuándo es mi siguiente inyección?')];
  if(S.plan.length) s.push(t('How is my adherence?','¿Cómo voy de adherencia?'));
  const primero = S.plan.length ? pComps(S.plan[0])[0] : null;
  s.push(primero || 'BPC-157');
  if(S.vials.length) s.push(t('My vials','Mis viales'));
  else s.push(t('How do I reconstitute?','¿Cómo se reconstituye?'));
  return s.slice(0,5);
};

function pchAbre(pregunta){
  PCH.open = true;
  if(!PCH.msgs.length){
    const n = yo();
    PCH.msgs = [pchDi(n ? t('PepCheems. Ask me about your log or any compound, %n.',
                            'PepCheems. Pregúntame por tu registro o por cualquier compuesto, %n.')
                          .replace('%n', E(n))
                        : t('PepCheems. Ask me about your log or any compound.',
                            'PepCheems. Pregúntame por tu registro o por cualquier compuesto.'), '')];
  }
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
  /* El flotante estorba donde PepCheems ya tiene su fila a la vista, y donde
     el usuario está escribiendo: en «Más» taparía justo lo que ofrece, y en
     «Buscar» tapa resultados mientras se teclea. */
  if(!PCH.open) return (S.route === 'more' || S.route === 'find') ? '' :
    '<button class="pch-fab" data-pch aria-label="PepCheems">' +
    MK + '<span>PepCheems</span></button>';
  return '<div class="pch-scrim" data-pch-close></div>' +
    '<aside class="pch" role="dialog" aria-label="PepCheems">' +
      '<header class="pch-hd">' +
        '<span class="pch-id">' + MK + '<b>PepCheems</b>' +
          '<i>' + t('reads your log','lee tu registro') + '</i></span>' +
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
          t('Ask anything','Pregunta lo que sea') + '"/>' +
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

/* ============================================================================
   PEPTIDEX · PepX

   La aplicación. Vive en #/app, dentro del mismo fichero que la tienda.

   ---------------------------------------------------------------------------
   ARQUITECTURA
   ---------------------------------------------------------------------------

       PORTADA                 sólo la primera vez, o después de salir
         └─ SIGN IN · CREATE ACCOUNT

       HOME        saludo · adherencia · racha · siguiente · protocolo activo
                   · cuatro acciones rápidas
       PROTOCOLS   Active · Completed · Drafts → detalle
       COMPOUNDS   buscador · All/Performance/Recovery/Longevity/Beauty → ficha
       JOURNAL     calendario · historial · registrar
       MORE        Tools · Data · Education · Profile · Plan

   MORE existe para que las otras cuatro se queden con una idea cada una. Lo
   que se usa a diario está en las cuatro primeras; lo que se toca de vez en
   cuando vive en la quinta. Una barra de seis pestañas no es una barra, es un
   menú, y un menú abajo en un teléfono no lo usa nadie.

   ---------------------------------------------------------------------------
   DOC.PEPS — QUÉ LEE Y QUÉ NO
   ---------------------------------------------------------------------------

   Lee UNA cosa: el registro que el usuario escribió. Y dice lo que de ahí sale
   contando — medias, recorridos, cobertura, huecos, existencias, fechas.

   No dirá nunca «excelente tendencia a la baja, probablemente por el efecto
   cardioprotector de la tirzepatida». Eso no es leer un registro: es atribuir a
   un compuesto un efecto fisiológico en una persona concreta. Doc.Peps describe
   el número. No explica el cuerpo, no señala una causa y no propone un cambio.

       ✓ contar, medir, comparar contra lo que el usuario escribió
       ✓ avisar de fechas, existencias, conservación y huecos del registro
       ✗ decir qué tomar, cuánto, cada cuánto o hasta cuándo
       ✗ atribuir un cambio en una medida a un compuesto
       ✗ interpretar un valor como bueno o malo para la salud de alguien

   La columna de dosis del libro de operación se CITA, con marco y procedencia,
   como lo que es: el documento del operador. La aplicación no coge un peso, lo
   multiplica por el factor mcg/kg y devuelve «tu dosis» — quien lee decide y
   escribe el número que decida.

   ---------------------------------------------------------------------------
   TODO ES DEL TELÉFONO
   ---------------------------------------------------------------------------

   No hay servidor. Plan, registro, medidas, inventario, zonas y perfil viven en
   localStorage. Nadie más los ve —nosotros tampoco— y si se borra el navegador
   se borran: por eso exportar no es un extra, es la copia de seguridad.
   ============================================================================ */
(function(){
'use strict';

const KEY  = 'pepx-app-v2';
const OLD  = 'pepx-app-v1';
const MAIL = 'official.peptidex@outlook.com';

/* ==========================================================================
   1 · ESTADO
   ========================================================================== */
const BLANK = {
  plan:   [],   /* pautas */
  log:    {},   /* 'YYYY-MM-DD': { planId: {t:hora, z:zona} } */
  vitals: [],   /* medidas por día */
  vials:  [],   /* inventario */
  sites:  [],   /* zonas usadas */
  hl:     {},   /* vida media por compuesto, escrita por el usuario */
  calc:   {},   /* lo último calculado */
  me:     {nombre:'', correo:''},
  theme:  'dark',
  win:    14,
  sub:    {tier:'free', since:null},
  on:     false,        /* ha pasado la portada */
  tab:    'home',
  sub1:   {}            /* la sub-pestaña de cada pantalla */
};
let S = load();

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY));
    if(raw && typeof raw === 'object') return fill(raw);
  }catch(e){}
  /* Migración desde la versión anterior: el usuario ya tiene su registro y no
     hay ninguna razón para hacerle empezar de cero por un rediseño. */
  try{
    const v1 = JSON.parse(localStorage.getItem(OLD));
    if(v1 && typeof v1 === 'object'){
      const m = fill(v1);
      m.tab = 'home'; m.on = true; m.sub1 = {};
      return m;
    }
  }catch(e){}
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
const uid = () => Math.random().toString(36).slice(2,9);
const sub1 = (k, d) => S.sub1[k] || d;

/* ==========================================================================
   2 · FECHAS

   Todo se guarda como 'YYYY-MM-DD' en hora local. Guardar ISO con zona parece
   más correcto y es peor: una dosis puesta a las once de la noche en México se
   registraría al día siguiente y el usuario vería un hueco donde sí cumplió.
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
                     'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre').split(' ');
const DOW  = () => t('M,T,W,T,F,S,S','L,M,X,J,V,S,D').split(',');
const DOW3 = () => t('Mon,Tue,Wed,Thu,Fri,Sat,Sun','lun,mar,mié,jue,vie,sáb,dom').split(',');
function human(k){
  const d = parse(k), hoy = today();
  if(k === hoy) return t('today','hoy');
  if(k === shift(hoy,-1)) return t('yesterday','ayer');
  if(k === shift(hoy, 1)) return t('tomorrow','mañana');
  return d.getDate() + ' ' + MON()[d.getMonth()];
}
function longDate(k){
  const d = parse(k);
  return DOW3()[(d.getDay()+6)%7] + ', ' + d.getDate() + ' ' + MON()[d.getMonth()];
}
function greet(){
  const h = new Date().getHours();
  if(h < 6)  return t('Good night','Buenas noches');
  if(h < 12) return t('Good morning','Buenos días');
  if(h < 20) return t('Good afternoon','Buenas tardes');
  return t('Good evening','Buenas noches');
}

/* ==========================================================================
   3 · LA PAUTA — cuándo toca
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
    case 'd':   return t('every day','todos los días');
    case 'alt': return t('every other day','días alternos');
    case 'dow': return (p.dow||[]).map(i => DOW3()[i]).join(' · ') || t('no days','sin días');
    case 'nd':  return t('every ','cada ') + (p.every||1) + t(' days',' días');
    case 'cyc': return (p.on||1) + t(' on / ',' sí / ') + (p.off||0) + t(' off',' no');
  }
  return '';
}
/* el estado de una pauta, derivado — nunca escrito a mano */
function planState(p){
  const hoy = today();
  if(!p.c || !p.freq) return 'draft';
  if(!p.active)       return p.end && p.end < hoy ? 'done' : 'draft';
  if(p.end && p.end < hoy) return 'done';
  return 'active';
}
/* el progreso: qué parte del tramo previsto lleva recorrida */
function planProgress(p){
  if(!p.start) return null;
  const hoy = today();
  if(!p.end) return null;
  const total = days(p.start, p.end), ido = days(p.start, hoy);
  if(total <= 0) return null;
  return Math.max(0, Math.min(1, ido / total));
}
function nextDue(p){
  const hoy = today();
  for(let i = 0; i < 400; i++){
    const k = shift(hoy, i);
    if(dueOn(p, k) && !taken(k, p.id)) return k;
  }
  return null;
}

/* ==========================================================================
   4 · CONSTANTES
   ========================================================================== */
const METRICS = [
  {id:'rhr',     u:'bpm', col:false, dec:0, en:'Resting Heart Rate', es:'Frecuencia en reposo',
   sh:{en:'RHR', es:'FCR'},
   de:{en:'Your resting heart rate across the period, as you entered it.',
       es:'Tu frecuencia cardíaca en reposo a lo largo del periodo, tal y como la escribiste.'}},
  {id:'peso',    u:'kg', col:false, dec:1, en:'Weight', es:'Peso', sh:{en:'Weight', es:'Peso'},
   de:{en:'Weight over the period. Weigh at the same time of day or the curve measures your schedule, not you.',
       es:'El peso durante el periodo. Pésate a la misma hora o la curva mide tu horario, no a ti.'}},
  {id:'pasos',   u:'', col:true, dec:0, en:'Steps', es:'Pasos', sh:{en:'Steps', es:'Pasos'},
   de:{en:'Steps per day. Bars start at zero because a count does.',
       es:'Pasos por día. Las barras arrancan en cero porque una cuenta arranca en cero.'}},
  {id:'grasa',   u:'%', col:false, dec:1, en:'Body Fat', es:'Grasa corporal', sh:{en:'Body fat', es:'Grasa'},
   de:{en:'Body fat percentage, from whatever instrument you use. Keep using the same one.',
       es:'Porcentaje de grasa, con el instrumento que uses. Sigue usando el mismo.'}},
  {id:'sueno',   u:'h', col:true, dec:1, en:'Sleep', es:'Sueño', sh:{en:'Sleep', es:'Sueño'},
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
   5 · NÚMEROS Y ESCAPE
   ========================================================================== */
function nf(v, dec){
  if(v == null || isNaN(v)) return '—';
  return (+v).toFixed(dec == null ? 1 : dec).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
function compact(v){
  if(v == null || isNaN(v)) return '—';
  const n = +v;
  if(Math.abs(n) >= 10000) return Math.round(n/1000) + 'k';
  if(Math.abs(n) >= 1000)  return (n/1000).toFixed(1).replace(/\.0$/,'') + 'k';
  return nf(n, n % 1 ? 1 : 0);
}
const mean = a => a.reduce((x,y) => x+y, 0) / a.length;
const mn = a => Math.min.apply(null, a);
const mx = a => Math.max.apply(null, a);
const E = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ==========================================================================
   6 · ICONOS

   Trazo de 1,5 px, sin relleno, sobre una caja de 24. Un solo peso en toda la
   aplicación: dos grosores de icono en la misma pantalla se ven como un error
   de imprenta.
   ========================================================================== */
const I = {
  home:  '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/>',
  prot:  '<rect x="4" y="4.5" width="16" height="15" rx="2.5"/><path d="M8 9.5h8M8 13h8M8 16.5h4"/>',
  comp:  '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z"/>' +
         '<path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  jour:  '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  more:  '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  moon:  '<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>',
  sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plus:  '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  warn:  '<path d="M12 9v5M12 17.5v.01"/><path d="M10.3 3.9 2.6 17.6a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
  flask: '<path d="M9 3v6.5L4.2 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.8-3L15 9.5V3"/><path d="M8 3h8"/>',
  chart: '<path d="M4 18l5-6 4 4 7-9"/>',
  book:  '<path d="M5 4.5h9a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H5z"/><path d="M19 7.5v12"/>',
  user:  '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6"/>',
  bell:  '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/>',
  lock:  '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  shield:'<path d="M12 3.5 5 6v6c0 4.3 3 7.6 7 8.5 4-.9 7-4.2 7-8.5V6z"/>',
  help:  '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17v.01"/>',
  out:   '<path d="M15 17l5-5-5-5M20 12H9M11 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H11"/>',
  box:   '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  bag:   '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  gear:  '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  up:    '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:  '<path d="M12 5v14M6 13l6 6 6-6"/>',
  flat:  '<path d="M5 12h14"/>',
  left:  '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  vial:  '<path d="M9 3h6M10 3v6.5l-2.2 3.8A3 3 0 0 0 10.4 18h3.2a3 3 0 0 0 2.6-4.7L14 9.5V3"/>',
  spark: ''
};
const svg = (n, cls) => '<svg viewBox="0 0 24 24"' + (cls ? ' class="' + cls + '"' : '') +
  ' aria-hidden="true">' + I[n] + '</svg>';

/* ==========================================================================
   7 · LA BIBLIOTECA

   Sesenta compuestos del libro de operación del propio negocio. La produce
   mk_library.py cruzando las hojas del Excel; el build la inyecta en PX_LIB.
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

/* Las cuatro familias que pidió la marca, mapeadas sobre las categorías reales
   del libro. Lo que no cae en ninguna es soporte —solventes, vehículos— y se
   queda fuera de los cuatro filtros pero dentro de «All»: esconderlo sería
   mentir sobre lo que hay en el catálogo. */
const FAM = [
  {id:'perf', en:'Performance', es:'Performance'},
  {id:'reco', en:'Recovery',    es:'Recovery'},
  {id:'long', en:'Longevity',   es:'Longevity'},
  {id:'beau', en:'Beauty',      es:'Beauty'}
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
/* lo que la ficha sabe de conservación, en frases comprobables */
function conserva(e){
  const out = [], a = (e.alm || '') + ' ' + (e.ins || '');
  if(/luz/i.test(a))              out.push(t('Protect from light','Proteger de la luz'));
  if(/-\s*20|−\s*20/.test(a))     out.push(t('Powder −20 °C','Polvo −20 °C'));
  if(/2\s*°?C?\s*a\s*8/i.test(a)) out.push(t('2–8 °C','2–8 °C'));
  if(/congel/i.test(a) && !out.length) out.push(t('Freeze','Congelar'));
  return out;
}
/* el estado de investigación, tal y como lo dice el libro */
function research(e){
  const r = e.reg || '';
  if(/R&D|Investigaci/i.test(r)) return t('Research use only','Solo uso en investigación');
  if(/Receta|Regulaci/i.test(r)) return t('Regulated','Regulado');
  return t('Research material','Material de investigación');
}

/* ==========================================================================
   8 · DOC.PEPS
   ========================================================================== */
const MK = '<span class="mk"><svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 2.4l1.85 5.6 5.6 1.85-5.6 1.85L12 17.3l-1.85-5.6-5.6-1.85 5.6-1.85z"/>' +
  '<path d="M18.6 15.4l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" opacity=".6"/>' +
  '</svg></span>';

function dp(paras, big){
  const body = '<div class="dp">' + MK + '<div class="bd"><div class="who">Doc.Peps</div>' +
    paras.map(p => '<p>' + p + '</p>').join('') + '</div></div>';
  if(!big) return body;
  return '<div class="dpbig">' + body + '<div class="foot">' +
    t('Doc.Peps reads your log — the numbers you entered. It does not interpret your body, does not attribute any change to any compound, and does not tell you what to take, how much or how often.',
      'Doc.Peps lee tu registro — los números que metiste tú. No interpreta tu cuerpo, no atribuye ningún cambio a ningún compuesto, y no te dice qué tomar, cuánto ni cada cuándo.') +
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
    P.push(t('Nothing to remember yet. Write your first protocol in <b>Protocols</b> — the compound, the dose and how often are yours to decide; from then on I keep the count.',
             'Todavía no hay nada que recordar. Escribe tu primera pauta en <b>Protocols</b> — el compuesto, la dosis y la frecuencia los decides tú; a partir de ahí llevo yo la cuenta.'));
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
    P.push(t('Nothing measured in the last %w days. The form below is the whole setup — one weight is enough to start.',
             'Nada medido en los últimos %w días. El formulario de abajo es toda la puesta a punto — con un peso basta para empezar.')
      .replace('%w', win));
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
   9 · LOS AVISOS

   Cada uno sale de un hecho que se puede contar. Ninguno opina sobre la pauta.
   El nivel se dibuja con el grosor del filete, el icono y la palabra — no con
   color, porque este sistema no tiene con qué y porque el color solo nunca
   bastó.
   ========================================================================== */
function tips(){
  const out = [], hoy = today();

  if(!S.plan.length)
    out.push(['', 'info', t('No protocol yet','Todavía no hay pauta'),
      t('Add your first one in Protocols. You enter the compound, the dose and how often — PepX only remembers it for you.',
        'Añade la primera en Protocols. El compuesto, la dosis y la frecuencia los pones tú — PepX sólo se acuerda por ti.')]);

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
      t('Log a weight in Data. Without a first measurement there is nothing to compare against later.',
        'Registra un peso en Data. Sin una primera medida no hay contra qué comparar después.')]);
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
        when = t(' — at your frequency it runs out ',' — con tu frecuencia se acaba ') + human(k);
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
        t('%s: expiry %e','%s: caducidad %e').replace('%s', v.c).replace('%e', human(v.exp)),
        t('Past the date it does not go in the log — it goes in the bin.',
          'Pasada la fecha no va al registro: va a la basura.')]);
  });

  /* conservación, desde la ficha del propio libro */
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
   10 · GRÁFICAS

   Marcas finas, rejilla que se retira, ni un número encima de cada punto: el
   valor va en el extremo y en los estadísticos de abajo. En monocromo la serie
   la distingue el TRAZO y la nombra el rótulo del extremo — la luminosidad sola
   no llega, y está medido.
   ========================================================================== */
const CW = 620;

function barPath(x, y, w, h, r){
  const n = v => (+v).toFixed(1);
  x = +x; y = +y; w = +w; h = +h;
  const rr = Math.min(r, w/2, h);
  return 'M' + n(x) + ' ' + n(y+h) + ' V' + n(y+rr) +
         ' a' + n(rr) + ' ' + n(rr) + ' 0 0 1 ' + n(rr) + ' ' + n(-rr) +
         ' h' + n(w - 2*rr) +
         ' a' + n(rr) + ' ' + n(rr) + ' 0 0 1 ' + n(rr) + ' ' + n(rr) +
         ' V' + n(y+h) + ' Z';
}

function axis(slots, win, H, band){
  let g = '';
  if(win <= 14){
    const L = DOW();
    slots.forEach((k, i) => {
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-8) +
           '" text-anchor="middle">' + L[(parse(k).getDay()+6)%7] + '</text>';
    });
  } else {
    [0, Math.floor(win/2), win-1].forEach((i, j) => {
      const d = parse(slots[i]);
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-8) +
           '" text-anchor="' + (j === 0 ? 'start' : j === 2 ? 'end' : 'middle') + '">' +
           d.getDate() + ' ' + MON()[d.getMonth()] + '</text>';
    });
  }
  return g;
}

/* COLUMNAS — para lo que se cuenta. Base en cero, siempre. */
function cols(pts, win, m){
  const H = 140, PT = 14, PB = 24;
  const from = shift(today(), -(win-1)), slots = [];
  for(let i = 0; i < win; i++) slots.push(shift(from, i));
  const byDay = {}; pts.forEach(p => byDay[p.d] = p.v);
  const top = (mx(pts.map(p => p.v)) || 1) * 1.14;
  const band = CW / win, bw = Math.max(3, Math.min(24, band - 4));
  const Y = v => PT + (1 - v/top) * (H - PT - PB);
  let g = '';
  slots.forEach((k, i) => {
    const v = byDay[k]; if(v == null) return;
    const x = i*band + (band-bw)/2, y = Y(v);
    g += '<path class="bar" d="' + barPath(x, y, bw, H-PB-y, 4) + '"/>';
  });
  const avg = mean(pts.map(p => p.v));
  g += '<line class="rule" x1="0" y1="' + Y(avg).toFixed(1) + '" x2="' + CW + '" y2="' + Y(avg).toFixed(1) + '"/>' +
       '<line class="rule" x1="0" y1="' + (H-PB) + '" x2="' + CW + '" y2="' + (H-PB) + '"/>' +
       axis(slots, win, H, band);
  return '<svg class="chart bars" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
         'role="img" aria-label="' + E(mName(m)) + '">' + g + '</svg>';
}

/* LÍNEA — para lo que se recorre en un margen estrecho.

   Sin relleno bajo la curva, y a propósito: este eje está truncado —una FCR
   entre 67 y 74 desde cero serían siete puntos pegados— y en un eje truncado el
   área no mide nada, porque el suelo es una cifra elegida. Rellenarla infla
   siete latidos hasta que parecen un desplome. */
function line(pts, win, m){
  const H = 140, PT = 16, PB = 24;
  const from = shift(today(), -(win-1));
  const vs = pts.map(p => p.v), lo = mn(vs), hi = mx(vs);
  const span = (hi - lo) || Math.max(1, Math.abs(hi)*.04);
  const top = hi + span*.28, bot = lo - span*.28, band = CW / win;
  const X = k => (days(from, k) + .5) * band;
  const Y = v => PT + (1 - (v-bot)/(top-bot)) * (H - PT - PB);
  let d = '';
  pts.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' '; });
  const last = pts[pts.length-1];
  const avg = mean(vs);
  const slots = []; for(let i = 0; i < win; i++) slots.push(shift(from, i));
  const g = '<line class="rule" x1="0" y1="' + Y(avg).toFixed(1) + '" x2="' + CW +
            '" y2="' + Y(avg).toFixed(1) + '"/>' +
            '<path class="ln s1" d="' + d + '"/>' +
            '<circle class="dot f1" cx="' + X(last.d).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="4"/>' +
            '<line class="rule" x1="0" y1="' + (H-PB) + '" x2="' + CW + '" y2="' + (H-PB) + '"/>' +
            axis(slots, win, H, band);
  return '<svg class="chart bars" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
         'role="img" aria-label="' + E(mName(m)) + '">' + g + '</svg>';
}

function spark(vals){
  if(vals.length < 2) return '';
  const W = 600, H = 56, P = 8;
  const lo = mn(vals), hi = mx(vals), rg = (hi-lo) || 1;
  const X = i => P + i * (W - P*2) / (vals.length - 1);
  const Y = v => H - P - ((v-lo)/rg) * (H - P*2);
  let d = '';
  vals.forEach((v,i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; });
  return '<svg class="chart spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path class="ln s1" d="' + d + '"/>' +
    '<circle class="dot f1" cx="' + X(vals.length-1).toFixed(1) + '" cy="' +
      Y(vals[vals.length-1]).toFixed(1) + '" r="4"/></svg>';
}

function trendChip(pts, m){
  if(pts.length < 2) return '';
  const a = pts[0].v, b = pts[pts.length-1].v, d = b - a;
  const rel = Math.abs(a) > 0 ? Math.abs(d/a) : 0;
  const k = rel < 0.01 ? 'flat' : (d < 0 ? 'down' : 'up');
  const w = k === 'flat' ? t('Steady','Estable') : (d < 0 ? t('Down','Bajando') : t('Up','Subiendo'));
  const amt = k === 'flat' ? '' : ' ' + (d > 0 ? '+' : '−') + nf(Math.abs(d), m.dec) + (m.u ? ' ' + m.u : '');
  return '<span class="trend">' + svg(k) + w + amt + '</span>';
}

/* el anillo de adherencia */
function ring(pct, label){
  const R = 62, C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(1, pct)));
  return '<div class="ring"><svg viewBox="0 0 132 132" aria-hidden="true">' +
    '<circle class="trk" cx="66" cy="66" r="' + R + '"/>' +
    '<circle class="val" cx="66" cy="66" r="' + R + '" stroke-dasharray="' + C.toFixed(1) +
      '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
    '<div class="mid"><b>' + Math.round(pct*100) + '<small style="font-size:15px">%</small></b>' +
    '<span>' + label + '</span></div></div>';
}

/* ==========================================================================
   11 · EL ARMAZÓN
   ========================================================================== */
const TABS = [
  {id:'home', ic:'home', en:'Home',      es:'Home'},
  {id:'prot', ic:'prot', en:'Protocols', es:'Protocols'},
  {id:'comp', ic:'comp', en:'Compounds', es:'Compounds'},
  {id:'jour', ic:'jour', en:'Journal',   es:'Journal'},
  {id:'more', ic:'more', en:'More',      es:'More'}
];

function head(){
  const ini = initials();
  return '<div class="abar"><div class="in">' +
    '<span class="mark"><b>PepX</b><i>PEPTIDEX</i></span>' +
    '<span class="hact">' +
      '<a class="ibtn" href="#/" data-nav data-href="#/" aria-label="' + t('Store','Tienda') + '">' +
        svg('bag') + '</a>' +
      '<button class="ibtn" data-theme-toggle aria-label="' + t('Theme','Tema') + '">' +
        svg(S.theme === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<button class="avatar" data-go="more:profile" aria-label="' + t('Profile','Perfil') + '">' +
        E(ini) + '</button>' +
    '</span>' +
  '</div></div>';
}
function initials(){
  const n = (S.me.nombre || '').trim();
  if(!n) return 'PX';
  return n.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
}
function tabbar(){
  return '<div class="tabbar" role="tablist">' + TABS.map(x =>
    '<button data-tab="' + x.id + '"' + (S.tab === x.id ? ' class="on" aria-selected="true"' : '') +
    ' role="tab">' + svg(x.ic) + '<span>' + t(x.en, x.es) + '</span></button>').join('') + '</div>';
}
const ruo = () => '<div class="ruo">' + t('Research use only.','Solo uso en investigación.') +
  '<br>' + t('PepX records what you enter. It does not recommend compounds, doses or schedules.',
             'PepX registra lo que tú introduces. No recomienda compuestos, dosis ni pautas.') + '</div>';

const phead = (k, h, p) => '<div class="phead"><div class="eyebrow">' + k + '</div>' +
  '<h2 class="title">' + h + '</h2>' + (p ? '<p>' + p + '</p>' : '') + '</div>';

const empty = (ic, b, s, act) => '<div class="empty"><div class="ico">' + svg(ic) + '</div>' +
  '<b>' + b + '</b><span>' + s + '</span>' + (act ? '<div class="acts">' + act + '</div>' : '') + '</div>';

/* ==========================================================================
   12 · PORTADA

   La primera pantalla. Negro completo, la marca en el centro y dos caminos.
   Nada más: si algo puede esperar a la segunda pantalla, espera.

   SIGN IN y CREATE ACCOUNT crean un perfil LOCAL. No hay servidor todavía y la
   pantalla no finge que lo haya — lo dice al pie. Cuando la cuenta viva en un
   servidor, esta pantalla es la que se conecta y no cambia de forma.
   ========================================================================== */
function vSplash(){
  return '<section class="pxapp splash"' + (S.theme === 'light' ? ' data-theme="light"' : '') + '>' +
    '<div class="top">' +
      '<h1 class="px">Px</h1>' +
      '<div class="wm">PEPTIDEX</div>' +
      '<div class="tag">Engineered Beyond Perfection</div>' +
      '<div class="trio" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '</div>' +
    '<div class="bottom">' +
      '<button class="btn wide" data-enter="in">' + t('Sign in','Entrar') + '</button>' +
      '<button class="btn ghost wide" data-enter="new">' + t('Create account','Crear cuenta') + '</button>' +
      '<div class="fine">' + t('Research use only','Solo uso en investigación') + '</div>' +
    '</div>' +
  '</section>';
}

/* ==========================================================================
   13 · HOME
   ========================================================================== */
function adherence(n){
  /* qué parte de lo programado en los últimos n días quedó registrada */
  const hoy = today();
  let tocaba = 0, hecho = 0;
  for(let i = 0; i < n; i++){
    const k = shift(hoy, -i);
    dueList(k).forEach(p => { tocaba++; if(taken(k, p.id)) hecho++; });
  }
  return {pct: tocaba ? hecho/tocaba : 0, tocaba: tocaba, hecho: hecho};
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

function vHome(){
  const hoy = today(), due = dueList(hoy);
  const ad = adherence(28), st = streak();
  const activos = S.plan.filter(p => planState(p) === 'active');
  const prox = activos.map(p => ({p:p, k:nextDue(p)})).filter(x => x.k)
    .sort((a,b) => a.k < b.k ? -1 : 1)[0];

  let cells = '';
  for(let i = 55; i >= 0; i--){
    const k = shift(hoy, -i), d = dueList(k);
    cells += !d.length ? '<i></i>'
           : '<i class="' + (d.every(p => taken(k, p.id)) ? 'on' : 'miss') + '"></i>';
  }
  const pesos = series('peso', 90).map(p => p.v);

  return '<div class="wrap">' +
    phead(E(longDate(hoy)), greet() + (S.me.nombre ? ', ' + E(S.me.nombre.split(/\s+/)[0]) : '')) +

    '<div class="card"><div class="heroblock">' +
      ring(ad.pct, t('Adherence','Adherencia')) +
      '<div class="side">' +
        '<div class="statrow">' +
          '<div class="stat"><b>' + st + '</b><span>' + t('Streak','Racha') + '</span></div>' +
          '<div class="stat"><b>' + ad.hecho + '</b><span>' + t('Logged','Registros') + '</span></div>' +
          '<div class="stat"><b>' + activos.length + '</b><span>' + t('Active','Activos') + '</span></div>' +
        '</div>' +
        '<div class="meta" style="margin-top:20px">' +
          t('Last 28 days · %h of %t scheduled doses logged.',
            'Últimos 28 días · %h de %t dosis programadas registradas.')
            .replace('%h', ad.hecho).replace('%t', ad.tocaba) + '</div>' +
      '</div>' +
    '</div></div>' +

    /* siguiente actividad */
    '<div class="card flush"><div class="ctitle" style="padding:22px 22px 0;margin-bottom:0">' +
      t('Next up','Lo siguiente') + '</div>' +
      (prox ? '<div style="margin-top:14px">' + doseRow(prox.p, prox.k) + '</div>'
            : '<div style="padding-bottom:8px">' + empty('check',
                t('Nothing pending','Nada pendiente'),
                t('Everything scheduled has been logged.','Todo lo programado está registrado.')) + '</div>') +
    '</div>' +

    /* protocolo activo */
    (activos.length ? '<div class="card flush">' +
      '<div class="ctitle" style="padding:22px 22px 0;margin-bottom:0">' +
        t('Active protocol','Protocolo activo') +
        '<span class="v">' + activos.length + '</span></div>' +
      '<div style="margin-top:14px">' + activos.slice(0,3).map(p => protRow(p)).join('') + '</div>' +
    '</div>' : '') +

    /* acciones rápidas */
    '<div class="ctitle" style="margin:34px 0 0">' + t('Quick actions','Acciones rápidas') + '</div>' +
    '<div class="quick">' +
      qa('vial',  t('Log Injection','Registrar dosis'), t('Today’s doses','Las dosis de hoy'), 'jour') +
      qa('comp',  t('My Compounds','Mis compuestos'),   t('%n in the library','%n en la biblioteca').replace('%n', LIB.length), 'comp') +
      qa('bag',   t('Order History','Mis pedidos'),     t('Track an order','Rastrear un pedido'), 'store') +
      qa('book',  t('Education','Formación'),           t('Articles and guides','Artículos y guías'), 'more:edu') +
    '</div>' +

    dp(dpToday(), true) +

    (pesos.length >= 2 ? '<div class="card"><div class="ctitle">' + t('Weight','Peso') +
      '<span class="v">' + nf(pesos[pesos.length-1], 1) + ' kg</span></div>' + spark(pesos) + '</div>' : '') +

    '<div class="card"><div class="ctitle">' + t('Last eight weeks','Últimas ocho semanas') + '</div>' +
      '<div class="grid56">' + cells + '</div></div>' +

    notesHTML() + ruo() + '</div>';
}
function qa(ic, b, em, go){
  return '<button class="qa" data-go="' + go + '">' + svg(ic) +
    '<span><b>' + b + '</b><em>' + em + '</em></span></button>';
}
function doseRow(p, k){
  const on = taken(k || today(), p.id), kk = k || today();
  return '<div class="row">' +
    '<div class="bd"><div class="nm">' + E(p.c) + '</div>' +
      '<div class="mt">' + E(p.dose) + ' ' + E(p.unit) +
        (p.time ? ' · ' + E(p.time) : '') + ' · ' + human(kk) + '</div></div>' +
    (kk === today()
      ? '<button class="btn ' + (on ? 'ghost ' : '') + 'sm" data-tick="' + p.id + '">' +
        (on ? svg('check') + t('Logged','Hecho') : t('Log','Registrar')) + '</button>'
      : '<span class="tag">' + t('Scheduled','Programado') + '</span>') +
  '</div>';
}
function protRow(p){
  const pr = planProgress(p), nx = nextDue(p);
  return '<div class="row go" data-prot="' + p.id + '">' +
    '<div class="bd"><div class="nm">' + E(p.c) + '</div>' +
      '<div class="mt">' + E(freqText(p)) +
        (nx ? ' · ' + t('next ','siguiente ') + human(nx) : '') +
        (pr != null ? ' · ' + Math.round(pr*100) + '%' : '') + '</div></div>' +
    '<span class="cv"></span></div>';
}

/* ==========================================================================
   14 · PROTOCOLS
   ========================================================================== */
function vProt(){
  const w = sub1('prot', 'active');
  const grupos = {active:[], done:[], draft:[]};
  S.plan.forEach(p => grupos[planState(p)].push(p));
  const list = grupos[w] || [];

  return '<div class="wrap">' +
    phead(t('PROTOCOLS','PROTOCOLOS'), t('Your plan.','Tu plan.'),
      t('You write it. PepX does not propose, adjust or suggest a protocol — it remembers the one you entered and shows it back to you.',
        'Lo escribes tú. PepX no propone, no ajusta y no sugiere ninguna pauta — se acuerda de la que metiste y te la enseña.')) +

    '<div class="seg">' +
      ['active','done','draft'].map(k => '<button data-sub="prot:' + k + '"' +
        (w === k ? ' class="on"' : '') + '>' +
        (k === 'active' ? t('Active','Activos') : k === 'done' ? t('Completed','Completados') : t('Drafts','Borradores')) +
        (grupos[k].length ? ' · ' + grupos[k].length : '') + '</button>').join('') +
    '</div>' +

    (list.length ? list.map(p => protCard(p)).join('')
      : '<div class="card">' + empty('prot',
          w === 'active' ? t('No active protocol','Ningún protocolo activo')
          : w === 'done' ? t('Nothing completed yet','Nada completado todavía')
                         : t('No drafts','Sin borradores'),
          t('A protocol is a compound, a dose and a frequency — all three yours.',
            'Un protocolo es un compuesto, una dosis y una frecuencia — los tres tuyos.'),
          '<button class="btn" data-go="prot:new">' + t('New protocol','Nuevo protocolo') + '</button>') + '</div>') +

    (S.plan.length ? '<div class="acts"><button class="btn" data-go="prot:new">' +
      svg('plus') + t('New protocol','Nuevo protocolo') + '</button></div>' : '') +

    protForm() + ruo() + '</div>';
}

function protCard(p){
  const st = planState(p), pr = planProgress(p), nx = nextDue(p);
  const e = libFind(p.c);
  const abierto = S.open === p.id;
  const hoy = today();
  /* la línea de tiempo: catorce días, lo hecho y lo que toca */
  let tl = '';
  for(let i = -6; i <= 7; i++){
    const k = shift(hoy, i), d = dueOn(p, k);
    tl += '<i class="' + (!d ? '' : taken(k, p.id) ? 'on' : 'miss') + '"></i>';
  }
  return '<div class="card cpd' + (abierto ? ' open' : '') + '" data-prot="' + p.id + '">' +
    '<div class="cpdhd">' +
      '<span class="vialart"><em>' + E((e && e.sku ? String(e.sku).split('/')[0] : p.c).trim().slice(0,7)) + '</em></span>' +
      '<div class="bd">' +
        '<div class="eyebrow">' + (st === 'active' ? t('Active','Activo')
          : st === 'done' ? t('Completed','Completado') : t('Draft','Borrador')) + '</div>' +
        '<h3 class="sec" style="margin-top:7px">' + E(p.c) + '</h3>' +
        '<div class="meta" style="margin-top:5px">' + E(p.dose) + ' ' + E(p.unit) +
          ' · ' + E(freqText(p)) + '</div>' +
      '</div>' +
      '<span class="cv"></span>' +
    '</div>' +

    (pr != null ? '<div style="margin-top:18px">' +
      '<div class="meta" style="display:flex;justify-content:space-between">' +
        '<span>' + t('Progress','Progreso') + '</span><span>' + Math.round(pr*100) + '%</span></div>' +
      '<div class="grid56" style="grid-template-columns:repeat(20,1fr);margin-top:9px">' +
        Array.from({length:20}, (_,i) => '<i class="' + (i/20 < pr ? 'on' : '') + '"></i>').join('') +
      '</div></div>' : '') +

    '<div style="margin-top:18px">' +
      '<div class="eyebrow" style="margin-bottom:9px">' + t('Timeline','Línea de tiempo') + '</div>' +
      '<div class="grid56" style="grid-template-columns:repeat(14,1fr)">' + tl + '</div>' +
    '</div>' +

    (nx ? '<div class="meta" style="margin-top:14px">' + t('Next: ','Siguiente: ') + human(nx) +
      (p.time ? ' · ' + E(p.time) : '') + '</div>' : '') +

    (abierto ? protBody(p, e) : '') +
  '</div>';
}

function protBody(p, e){
  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + E(v) + '</b></div>' : '';
  return '<div class="cpdbody">' +
    kv(t('Compound','Compuesto'), p.c) +
    kv(t('Dose','Dosis'), p.dose + ' ' + p.unit) +
    kv(t('Frequency','Frecuencia'), freqText(p)) +
    kv(t('Time','Hora'), p.time) +
    kv(t('Start','Inicio'), p.start ? human(p.start) : '') +
    kv(t('End','Fin'), p.end ? human(p.end) : t('open','abierto')) +
    (e ? kv(t('Product','Producto'), (e.sku || '') + (e.esp ? ' · ' + e.esp : '')) : '') +
    (p.notes ? '<p class="body" style="margin-top:16px">' + E(p.notes) + '</p>' : '') +
    '<div class="acts">' +
      '<button class="btn ghost sm" data-toggle="' + p.id + '">' +
        (p.active ? t('Pause','Pausar') : t('Resume','Reanudar')) + '</button>' +
      (e ? '<button class="btn ghost sm" data-go="comp:' + E(e.n) + '">' +
        t('View compound','Ver compuesto') + '</button>' : '') +
      '<button class="btn quiet sm" data-del="' + p.id + '">' + t('Delete','Borrar') + '</button>' +
    '</div>' +
  '</div>';
}

function protForm(){
  if(!S.newProt) return '';
  return '<div class="card"><div class="ctitle">' + t('New protocol','Nuevo protocolo') +
      '<button class="x" data-go="prot:close" aria-label="' + t('Close','Cerrar') + '">' + svg('close') + '</button></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Compound','Compuesto') + '</label>' +
        '<input id="pxC" list="pxCL" placeholder="BPC 157"/>' + datalist() + '</div>' +
      '<div><label>' + t('Time','Hora') + '</label><input id="pxT" type="time"/></div>' +
    '</div>' +
    '<div class="r2">' +
      '<div><label>' + t('Dose','Dosis') + '</label><input id="pxD" inputmode="decimal" placeholder="250"/></div>' +
      '<div><label>' + t('Unit','Unidad') + '</label>' +
        '<select id="pxU"><option>mcg</option><option>mg</option><option>iu</option><option>ml</option></select></div>' +
    '</div>' +
    '<label>' + t('How often','Cada cuándo') + '</label>' +
    '<select id="pxF">' + FREQ.map(f => '<option value="' + f.v + '">' + t(f.en, f.es) + '</option>').join('') + '</select>' +
    '<div id="pxFX"></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Start','Inicio') + '</label><input id="pxS" type="date" value="' + today() + '"/></div>' +
      '<div><label>' + t('End (optional)','Fin (opcional)') + '</label><input id="pxE" type="date"/></div>' +
    '</div>' +
    '<label>' + t('Notes','Notas') + '</label><textarea id="pxN"></textarea>' +
    '<div class="acts"><button class="btn" id="pxAdd">' + t('Save protocol','Guardar protocolo') + '</button></div>' +
  '</div>';
}
function datalist(){
  const names = LIB.map(e => e.n);
  try{ Object.keys(LINES).forEach(k => LINES[k].products.forEach(p => names.push(p[1]))); }catch(e){}
  return '<datalist id="pxCL">' + names.map(n => '<option value="' + E(n) + '">').join('') + '</datalist>';
}
function freqExtra(v){
  const box = document.getElementById('pxFX');
  if(!box) return;
  if(v === 'dow'){
    box.innerHTML = '<label>' + t('Which days','Qué días') + '</label><div class="pick p7">' +
      DOW().map((d,i) => '<button type="button" data-d="' + i + '">' + d + '</button>').join('') + '</div>';
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
   15 · COMPOUNDS
   ========================================================================== */
function vComp(){
  const q = (S.lq || '').trim().toLowerCase();
  const fam = sub1('comp', '');
  let list = LIB.filter(e =>
    (!fam || family(e) === fam) &&
    (!q || (e.n + ' ' + (e.sku||'') + ' ' + (e.cat||'') + ' ' + (e.mec||'')).toLowerCase().indexOf(q) >= 0));
  const full = can('ult');

  return '<div class="wrap">' +
    phead(t('COMPOUNDS','COMPUESTOS'), t('The library.','La biblioteca.'),
      t('%n entries from the PEPTIDEX operations record: class, mechanism, vial specification, solvent and cold chain. Research and education only — no therapeutic claims.',
        '%n fichas del registro de operación de PEPTIDEX: clase, mecanismo, presentación, solvente y cadena de frío. Sólo investigación y formación — sin afirmaciones terapéuticas.')
      .replace('%n', LIB.length)) +

    (LIB.length ? '<div class="card">' +
      '<div class="search">' + svg('search') +
        '<input id="lq" placeholder="' + t('Search name, code or mechanism','Buscar nombre, clave o mecanismo') +
        '" value="' + E(S.lq||'') + '"/></div>' +
      '<div class="chiprow">' +
        '<button class="chip' + (fam ? '' : ' on') + '" data-sub="comp:">' + t('All','Todo') +
          '<i>' + LIB.length + '</i></button>' +
        FAM.map(f => {
          const n = LIB.filter(e => family(e) === f.id).length;
          return n ? '<button class="chip' + (fam === f.id ? ' on' : '') + '" data-sub="comp:' + f.id + '">' +
            t(f.en, f.es) + '<i>' + n + '</i></button>' : '';
        }).join('') +
      '</div></div>'
      : '<div class="card">' + empty('comp', t('The library is not built','La biblioteca no está construida'),
          t('Run mk_library.py against the operations workbook.','Corre mk_library.py sobre el libro de operación.')) + '</div>') +

    (LIB.length && !list.length ? '<div class="card">' + empty('search',
      t('Nothing matches','Nada coincide'), E(S.lq || '') ,
      '<button class="btn ghost" data-go="comp:clear">' + t('Clear search','Limpiar') + '</button>') + '</div>' : '') +

    list.map(e => compCard(e, full)).join('') +

    (LIB.length && !full ? '<div class="card">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial specification, solvent and cold chain for all %n compounds — and the calculator pre-filled from it.',
        'Mecanismo, presentación, solvente y cadena de frío de los %n compuestos — y la calculadora precargada con ella.')
        .replace('%n', LIB.length),
      '<button class="btn" data-go="more:plan">' + t('See plans','Ver planes') + '</button>') + '</div>' : '') +

    ruo() + '</div>';
}

function compCard(e, full){
  const abre = S.open === e.n;
  const cons = conserva(e);
  const f = FAM.filter(x => x.id === family(e))[0];
  return '<div class="card cpd' + (abre ? ' open' : '') + '" data-comp="' + E(e.n) + '">' +
    '<div class="cpdhd">' +
      '<span class="vialart"><em>' + E((e.sku ? String(e.sku).split('/')[0] : e.n).trim().slice(0,7)) + '</em></span>' +
      '<div class="bd">' +
        '<div class="eyebrow">' + E(f ? t(f.en, f.es) : (e.cat || '').split('/')[0].trim()) + '</div>' +
        '<h3 class="sec" style="margin-top:7px">' + E(e.n) + '</h3>' +
        (e.sku ? '<div class="meta" style="margin-top:5px">' + E(e.sku) + '</div>' : '') +
      '</div>' +
      '<span class="cv"></span>' +
    '</div>' +
    (full && e.mec ? '<p class="desc">' + E(e.mec) + '</p>' : '') +
    '<div class="tags" style="margin-top:15px">' +
      '<span class="tag solid">' + E(research(e)) + '</span>' +
      cons.map(c => '<span class="tag">' + E(c) + '</span>').join('') +
    '</div>' +
    (abre ? compBody(e, full) : '') +
  '</div>';
}

function compBody(e, full){
  if(!full)
    return '<div class="cpdbody">' + empty('lock',
      t('Full sheet is Ultimate','La ficha completa es de Ultimate'),
      t('Mechanism, vial presentation, solvent, cold chain and your reference sheet.',
        'Mecanismo, presentación, solvente, cadena de frío y tu hoja de referencia.'),
      '<button class="btn" data-go="more:plan">' + t('See plans','Ver planes') + '</button>') + '</div>';

  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + E(v) + '</b></div>' : '';
  const r = e.ref || {};
  const hayRef = r.ini || r.mant || r.frec || r.hora || r.factor;
  const ficha =
    kv(t('Vial presentation','Presentación'), e.esp) +
    kv(t('BAC volume','Volumen BAC'), e.bac ? e.bac + ' mL' : '') +
    kv(t('Concentration','Concentración'), e.conc) +
    kv(t('Solvent','Solvente'), e.sol) +
    kv(t('Storage','Almacenamiento'), e.alm) +
    kv(t('Status','Estatus'), e.reg);

  /* compuestos hermanos: misma familia, para seguir leyendo */
  const rel = LIB.filter(x => x.n !== e.n && family(x) === family(e)).slice(0, 4);

  return '<div class="cpdbody">' +
    '<div class="eyebrow" style="margin-bottom:6px">' + t('Specifications','Especificaciones') + '</div>' +
    (ficha ? ficha : '<p class="meta">' +
      t('This entry is in the dosing guide but not in the compound matrix, so it carries no vial spec or cold chain.',
        'Esta entrada está en la guía de dosis pero no en la matriz de compuestos, así que no trae presentación ni cadena de frío.') + '</p>') +

    (e.ins ? '<div class="eyebrow" style="margin:22px 0 8px">' + t('Overview','Resumen') + '</div>' +
      '<p class="body">' + E(e.ins) + '</p>' : '') +

    (e.mg && e.mg.length ? '<div class="acts">' +
      '<button class="btn ghost sm" data-calc="' + E(e.n) + '">' + svg('flask') +
      t('Open in calculator','Abrir en la calculadora') + '</button></div>' : '') +

    /* LA CITA — el documento del operador, con su marco y su procedencia */
    (hayRef ? '<div class="quote">' +
      '<div class="qh">' + t('From your reference sheet','De tu hoja de referencia') + '</div>' +
      kv(t('Initial','Inicial'), r.ini) +
      kv(t('Maintenance','Mantenimiento'), r.mant) +
      kv(t('Frequency','Frecuencia'), r.frec) +
      kv(t('Timing','Horario'), r.hora) +
      kv(t('Factor mcg/kg','Factor mcg/kg'), r.factor) +
      (r.nota ? '<p class="meta" style="margin-top:14px">' + E(r.nota) + '</p>' : '') +
      '<div class="qf">' + t('Quoted from the operations record. PepX does not apply these numbers on its own — you read them and enter what you decide.',
                             'Citado del registro de operación. PepX no aplica estos números por su cuenta — los lees tú y escribes lo que decidas.') + '</div>' +
    '</div>' : '') +

    (rel.length ? '<div class="eyebrow" style="margin:26px 0 4px">' + t('Related','Relacionados') + '</div>' +
      rel.map(x => '<div class="row go" data-comp="' + E(x.n) + '" style="padding-left:0;padding-right:0">' +
        '<div class="bd"><div class="nm">' + E(x.n) + '</div>' +
        '<div class="mt">' + E(x.sku || '') + '</div></div><span class="cv"></span></div>').join('') : '') +
  '</div>';
}

/* ==========================================================================
   16 · JOURNAL
   ========================================================================== */
function vJour(){
  const sel = S.jsel || today();
  const cur = S.jmon || sel.slice(0,7);
  const [yy, mm] = cur.split('-').map(Number);
  const first = new Date(yy, mm-1, 1), start = (first.getDay()+6) % 7;
  const nDays = new Date(yy, mm, 0).getDate();
  const hoy = today();

  let cells = '';
  for(let i = 0; i < start; i++) cells += '<button class="cell void" tabindex="-1"></button>';
  for(let d = 1; d <= nDays; d++){
    const k = yy + '-' + pad(mm) + '-' + pad(d);
    const due = dueList(k), hecho = due.length && due.every(p => taken(k, p.id));
    const algo = !!(S.log[k] && Object.keys(S.log[k]).length);
    cells += '<button class="cell' + (k === hoy ? ' today' : '') + (k === sel ? ' sel' : '') +
      (hecho || algo ? ' done' : due.length ? ' due' : '') + '" data-day="' + k + '">' +
      '<b>' + d + '</b><u></u></button>';
  }

  const delDia = dueList(sel);
  const reg = S.log[sel] || {};
  const hist = Object.keys(S.log).sort().reverse().slice(0, 14);

  return '<div class="wrap">' +
    phead(t('JOURNAL','DIARIO'), t('The record.','El registro.'),
      t('Every dose you logged, when you logged it and where it went.',
        'Cada dosis que registraste, cuándo la registraste y dónde fue.')) +

    '<div class="card">' +
      '<div class="calhd">' +
        '<button class="ibtn" data-mon="-1" aria-label="' + t('Previous','Anterior') + '">' + svg('left') + '</button>' +
        '<b>' + MONL()[mm-1] + ' ' + yy + '</b>' +
        '<button class="ibtn" data-mon="1" aria-label="' + t('Next','Siguiente') + '">' + svg('right') + '</button>' +
      '</div>' +
      '<div class="caldow">' + DOW().map(d => '<span>' + d + '</span>').join('') + '</div>' +
      '<div class="calgrid">' + cells + '</div>' +
    '</div>' +

    '<div class="card flush">' +
      '<div class="ctitle" style="padding:22px 22px 0;margin-bottom:0">' + E(longDate(sel)) +
        '<span class="v">' + Object.keys(reg).length + '/' + delDia.length + '</span></div>' +
      (delDia.length ? '<div style="margin-top:14px">' + delDia.map(p => {
        const on = taken(sel, p.id);
        return '<div class="row"><div class="bd"><div class="nm">' + E(p.c) + '</div>' +
          '<div class="mt">' + E(p.dose) + ' ' + E(p.unit) +
            (on && reg[p.id] && reg[p.id].t ? ' · ' + E(reg[p.id].t) : '') +
            (on && reg[p.id] && reg[p.id].z ? ' · ' + E(zName(reg[p.id].z)) : '') + '</div></div>' +
          '<button class="btn ' + (on ? 'ghost ' : '') + 'sm" data-tickd="' + p.id + '|' + sel + '">' +
            (on ? svg('check') + t('Logged','Hecho') : t('Log','Registrar')) + '</button></div>';
      }).join('') + '</div>'
      : '<div style="padding-bottom:8px">' + empty('jour', t('Nothing scheduled','Nada programado'),
          t('Your protocols decide this.','Esto lo deciden tus pautas.')) + '</div>') +
    '</div>' +

    '<div class="acts"><button class="btn wide" data-go="jour:new">' + svg('plus') +
      t('Log new injection','Registrar nueva dosis') + '</button></div>' +

    (S.jnew ? jourForm(sel) : '') +

    '<div class="ctitle" style="margin-top:34px">' + t('History','Historial') + '</div>' +
    (hist.length ? '<div class="card flush">' + hist.map(k => {
      const n = Object.keys(S.log[k]).length;
      return '<div class="row go" data-day="' + k + '"><div class="bd">' +
        '<div class="nm">' + E(longDate(k)) + '</div>' +
        '<div class="mt">' + Object.keys(S.log[k]).map(id => {
          const p = S.plan.filter(x => x.id === id)[0];
          return p ? E(p.c) : '';
        }).filter(Boolean).join(' · ') + '</div></div>' +
        '<div class="rt"><b>' + n + '</b><span>' + t('logged','dosis') + '</span></div></div>';
    }).join('') + '</div>'
    : '<div class="card">' + empty('jour', t('No history yet','Sin historial todavía'),
        t('Every dose you tick appears here.','Cada dosis que marques aparece aquí.')) + '</div>') +

    ruo() + '</div>';
}

function jourForm(sel){
  return '<div class="card"><div class="ctitle">' + t('Log an injection','Registrar una dosis') +
      '<button class="x" data-go="jour:close" aria-label="' + t('Close','Cerrar') + '">' + svg('close') + '</button></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Date','Fecha') + '</label><input id="jD" type="date" value="' + sel + '"/></div>' +
      '<div><label>' + t('Time','Hora') + '</label><input id="jT" type="time" value="' +
        new Date().toTimeString().slice(0,5) + '"/></div>' +
    '</div>' +
    '<label>' + t('Protocol','Protocolo') + '</label>' +
    '<select id="jP">' + (S.plan.length
      ? S.plan.map(p => '<option value="' + p.id + '">' + E(p.c) + ' · ' + E(p.dose) + ' ' + E(p.unit) + '</option>').join('')
      : '<option value="">' + t('No protocols yet','Todavía no hay pautas') + '</option>') + '</select>' +
    '<label>' + t('Site (optional)','Zona (opcional)') + '</label>' +
    '<select id="jZ"><option value="">—</option>' +
      ZONES.map(z => '<option value="' + z.id + '">' + E(zName(z.id)) + '</option>').join('') + '</select>' +
    '<div class="acts"><button class="btn" id="jAdd">' + t('Save','Guardar') + '</button></div>' +
  '</div>';
}

/* ==========================================================================
   17 · MORE — herramientas, datos, formación, perfil, plan
   ========================================================================== */
const MORE = [
  {id:'tools', ic:'flask', en:'Tools',        es:'Herramientas',
   d:{en:'Calculator, half-life, sites, vials', es:'Calculadora, vida media, zonas, viales'}},
  {id:'data',  ic:'chart', en:'Data',         es:'Datos',
   d:{en:'Measurements and curves', es:'Constantes y curvas'}},
  {id:'edu',   ic:'book',  en:'Education',    es:'Formación',
   d:{en:'Articles, videos, protocol education', es:'Artículos, vídeos, formación'}},
  {id:'profile',ic:'user', en:'Profile',      es:'Perfil',
   d:{en:'Preferences, notifications, privacy', es:'Preferencias, avisos, privacidad'}},
  {id:'plan',  ic:'lock',  en:'Plan',         es:'Plan',
   d:{en:'Free · Pro · Ultimate', es:'Free · Pro · Ultimate'}}
];

function vMore(){
  const w = S.more || '';
  if(w === 'tools')   return vTools();
  if(w === 'data')    return vData();
  if(w === 'edu')     return vEdu();
  if(w === 'profile') return vProfile();
  if(w === 'plan')    return vPlan();

  return '<div class="wrap">' +
    phead('MORE', t('Everything else.','Todo lo demás.')) +
    '<div class="card flush">' + MORE.map(m =>
      '<div class="row go" data-go="more:' + m.id + '">' +
        '<span class="ic" style="flex:0 0 auto;width:19px;height:19px;color:var(--t2)">' + svg(m.ic) + '</span>' +
        '<div class="bd"><div class="nm">' + t(m.en, m.es) + '</div>' +
        '<div class="mt">' + t(m.d.en, m.d.es) + '</div></div>' +
        '<span class="cv"></span></div>').join('') + '</div>' +
    installCard() + ruo() + '</div>';
}
const back = (to, label) => '<div class="acts" style="margin:0 0 4px">' +
  '<button class="btn quiet sm" data-go="' + to + '">' + svg('left') + label + '</button></div>';

/* ---- TOOLS -------------------------------------------------------------- */
function vTools(){
  const w = sub1('tools', 'calc');
  const body = w === 'hl' ? toolHL() : w === 'zon' ? toolZones() : w === 'inv' ? toolVials() : toolCalc();
  return '<div class="wrap">' + back('more', 'MORE') +
    phead(t('TOOLS','HERRAMIENTAS'), t('The bench.','La mesa.'),
      t('Arithmetic and records. Every number here is one you entered — nothing on this screen proposes a dose.',
        'Aritmética y registros. Todos los números de aquí los metiste tú — nada de esta pantalla propone una dosis.')) +
    '<div class="seg">' +
      [['calc', t('Calculator','Calculadora')], ['hl', t('Half-life','Vida media')],
       ['zon', t('Sites','Zonas')], ['inv', t('Vials','Viales')]].map(x =>
      '<button data-sub="tools:' + x[0] + '"' + (w === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') +
    '</div>' + body + ruo() + '</div>';
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

  return '<div class="card">' +
    '<div class="ctitle">' + t('Reconstitution','Reconstitución') + '</div>' +
    '<div class="csub">' + t('You give it the vial, the solvent and your dose. It gives you the mark on the syringe. It does not decide the dose — that is not its job and never will be.',
                             'Le das el vial, el disolvente y tu dosis. Te da la marca en la jeringa. No decide la dosis — no es su trabajo, ni lo va a ser.') + '</div>' +

    (LIB.length ? '<label>' + t('Compound (optional)','Compuesto (opcional)') + '</label>' +
      '<select id="caComp"><option value="">' + t('— pick to pre-fill —','— elige y se rellena —') + '</option>' +
      LIB.map(x => '<option' + (c.comp === x.n ? ' selected' : '') + '>' + E(x.n) + '</option>').join('') +
      '</select>' : '') +
    (e ? '<div class="tags" style="margin-top:12px">' +
      (e.sku ? '<span class="tag">' + E(e.sku) + '</span>' : '') +
      (e.sol ? '<span class="tag">' + E(e.sol) + '</span>' : '') +
      cons.map(x => '<span class="tag solid">' + E(x) + '</span>').join('') + '</div>' : '') +

    '<label>' + t('Peptide in the vial (mg)','Péptido en el vial (mg)') + '</label>' +
    (viales.length ? '<div class="pick' + (viales.length <= 2 ? ' p2' : viales.length === 3 ? ' p3' : '') + '">' +
      viales.map(v => '<button data-vmg="' + v + '"' + (+c.mg === v ? ' class="on"' : '') + '>' +
        nf(v,1) + ' mg</button>').join('') + '</div>' : '') +
    '<input id="caMg" inputmode="decimal" placeholder="10" value="' + E(c.mg||'') + '"' +
      (viales.length ? ' style="margin-top:9px"' : '') + '/>' +

    '<label>' + t('Solvent added (mL)','Disolvente añadido (mL)') + '</label>' +
    '<div class="pick">' + [1,2,3,5].map(v =>
      '<button data-ml="' + v + '"' + (+c.ml === v ? ' class="on"' : '') + '>' + v + ' mL</button>').join('') + '</div>' +
    '<input id="caMl" inputmode="decimal" placeholder="' + t('or type it','o escríbelo') + '" value="' + E(c.ml||'') + '" style="margin-top:9px"/>' +

    '<label>' + t('Your dose per injection','Tu dosis por aplicación') + '</label>' +
    '<div class="withu"><input id="caD" inputmode="decimal" placeholder="250" value="' + E(c.dose||'') + '"/>' +
      '<span class="uu">' +
        '<button data-du="mcg"' + (du==='mcg'?' class="on"':'') + '>mcg</button>' +
        '<button data-du="mg"'  + (du==='mg' ?' class="on"':'') + '>mg</button></span></div>' +

    '<label>' + t('How often, to estimate how long it lasts','Cada cuánto, para estimar cuánto dura') + '</label>' +
    '<div class="pick p3">' + [[7,t('Daily','Diario')],[3.5,t('Alternate','Alternos')],[2,t('2× week','2×/sem')]].map(x =>
      '<button data-pw="' + x[0] + '"' + (pw === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +

    (ok ? '<div class="out">' +
      '<div class="hero"><b>' + nf(units, units < 10 ? 1 : 0) + '<small>' + t('units','unidades') + '</small></b>' +
        '<span>' + t('on a 1 mL U-100 insulin syringe','en una jeringa de insulina U-100 de 1 mL') + '</span></div>' +
      syringe(units) +
      '<div class="grid">' +
        '<div class="g"><b>' + nf(conc, 2) + ' mg/mL</b><span>' + t('concentration','concentración') + '</span></div>' +
        '<div class="g"><b>' + nf(volMl, 3) + ' mL</b><span>' + t('per dose','por dosis') + '</span></div>' +
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
  const W = 620, H = 78, X0 = 30, X1 = 590, Y = 28, BH = 26;
  const u = Math.max(0, Math.min(100, units));
  const X = v => X0 + (v/100) * (X1-X0);
  let g = '';
  for(let v = 0; v <= 100; v += 5){
    const big = v % 10 === 0;
    g += '<line class="' + (big ? 'tkb' : 'tk') + '" x1="' + X(v).toFixed(1) + '" y1="' + (Y+BH) +
         '" x2="' + X(v).toFixed(1) + '" y2="' + (Y+BH+(big?7:4)) + '"/>';
    if(v % 20 === 0)
      g += '<text x="' + X(v).toFixed(1) + '" y="' + (Y+BH+19) + '" text-anchor="middle">' + v + '</text>';
  }
  g = '<rect class="fill" x="' + X0 + '" y="' + Y + '" width="' + (X(u)-X0).toFixed(1) +
      '" height="' + BH + '" rx="3"/>' +
      '<rect class="barrel" x="' + X0 + '" y="' + Y + '" width="' + (X1-X0) + '" height="' + BH + '" rx="4"/>' + g +
      '<line class="plunger" x1="' + X(u).toFixed(1) + '" y1="' + (Y-7) + '" x2="' + X(u).toFixed(1) +
      '" y2="' + (Y+BH+7) + '"/>' +
      '<text class="big" x="' + Math.min(X1-4, Math.max(X0+4, X(u))).toFixed(1) + '" y="' + (Y-13) +
      '" text-anchor="' + (u > 82 ? 'end' : u < 12 ? 'start' : 'middle') + '">' + nf(u, u < 10 ? 1 : 0) + '</text>';
  return '<div class="syringe"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    t('Syringe scale','Escala de la jeringa') + '">' + g + '</svg></div>';
}

/* ---- vida media ---------------------------------------------------------- */
function levels(){
  const byC = {};
  Object.keys(S.log).forEach(k => {
    Object.keys(S.log[k]).forEach(id => {
      const p = S.plan.filter(x => x.id === id)[0];
      if(!p) return;
      let mg = null;
      if(p.unit === 'mg')  mg = +p.dose;
      if(p.unit === 'mcg') mg = +p.dose / 1000;
      if(mg == null || isNaN(mg)) return;
      (byC[p.c] = byC[p.c] || []).push({d:k, mg:mg});
    });
  });
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
  const conHL = comps.filter(c => +S.hl[c] > 0);
  const dib = conHL.slice(0, 3);

  let chart = '';
  if(dib.length){
    const H = 220, PT = 14, PB = 26, PR = 64;
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
      g += '<line class="rule" x1="0" y1="' + Y(v).toFixed(1) + '" x2="' + (CW-PR) + '" y2="' + Y(v).toFixed(1) + '"/>' +
           '<text class="axt" x="' + (CW-PR+8) + '" y="' + (Y(v)+3.5).toFixed(1) + '">' + nf(v,2) + ' mg</text>';
    }
    g += '<line class="now" x1="' + X(back).toFixed(1) + '" y1="' + PT + '" x2="' +
         X(back).toFixed(1) + '" y2="' + (H-PB) + '"/>';
    cur.forEach((s, i) => {
      const cls = 's' + (i+1);
      let d1 = '', d2 = '';
      s.row.forEach((v, j) => {
        if(j <= back) d1 += (j === 0 ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
        if(j >= back) d2 += (j === back ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      });
      g += '<path class="ln ' + cls + '" d="' + d1 + '"/>' +
           '<path class="ln ' + cls + ' proj" d="' + d2 + '"/>' +
           '<circle class="dot f' + (i+1) + '" cx="' + X(back).toFixed(1) + '" cy="' +
             Y(s.row[back]).toFixed(1) + '" r="4"/>' +
           /* el rótulo directo: en monocromo el trazo no basta para nombrar */
           '<text class="lbl" x="' + (X(back)+9).toFixed(1) + '" y="' + (Y(s.row[back])-9).toFixed(1) + '">' +
             E(s.c.slice(0,12)) + '</text>';
    });
    [0, back, win-1].forEach((i, j) => {
      const d = parse(xs[i]);
      g += '<text class="axt" x="' + X(i).toFixed(1) + '" y="' + (H-8) + '" text-anchor="' +
        (j===0?'start':j===2?'end':'middle') + '">' +
        (i === back ? t('now','ahora') : d.getDate() + ' ' + MON()[d.getMonth()]) + '</text>';
    });
    chart = '<svg class="chart decay" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="' + t('Decay of logged doses','Decaimiento de las dosis registradas') + '">' + g + '</svg>' +
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
      clears = t('below 1% of the last dose ','por debajo del 1% de la última dosis ') + human(k);
    }
    return '<div class="row" style="padding-left:0;padding-right:0">' +
      '<span style="flex:0 0 auto;width:16px;border-top:2px ' +
        (idx === 0 ? 'solid' : idx === 1 ? 'dashed' : idx === 2 ? 'dotted' : 'solid') + ' ' +
        (idx >= 0 ? 'var(--d' + (idx+1) + ')' : 'var(--dx)') + '"></span>' +
      '<div class="bd"><div class="nm">' + E(c) + '</div>' +
        '<div class="mt">' + (hl ? t('half-life ','vida media ') + nf(hl,1) + ' h · ' + clears
                                 : t('no half-life entered','sin vida media introducida')) + '</div></div>' +
      '<div class="rt"><b>' + (now != null ? nf(now,2) : '—') + '</b><span>mg</span></div></div>';
  }).join('');

  return '<div class="card">' +
    '<div class="ctitle">' + t('Decay of what you logged','Decaimiento de lo que registraste') + '</div>' +
    '<div class="csub">' + t('The half-life is yours to enter — from the COA or the literature you work with. PepX does not publish pharmacokinetic values; it draws the curve of the doses you recorded, with the number you gave it. Solid to today, faded from today on.',
                             'La vida media la escribes tú — del COA o de la literatura que manejes. PepX no publica valores farmacocinéticos; dibuja la curva de las dosis que registraste, con el número que le diste. Continuo hasta hoy, atenuado a partir de hoy.') + '</div>' +
    (chart || empty('chart', t('No curve yet','Todavía no hay curva'),
      comps.length ? t('Enter a half-life below and the curve appears.','Escribe una vida media abajo y aparece la curva.')
                   : t('Log a dose first — the curve is built from your record.','Registra antes una dosis — la curva se construye con tu registro.'))) +
    (filas ? '<div style="margin-top:16px">' + filas + '</div>' : '') +
  '</div>' +
  (comps.length ? '<div class="card"><div class="ctitle">' + t('Half-life per compound','Vida media por compuesto') + '</div>' +
    comps.map(c => '<div><label>' + E(c) + ' — ' + t('hours','horas') + '</label>' +
      '<input data-hl="' + E(c) + '" inputmode="decimal" value="' + E(S.hl[c]||'') + '" placeholder="—"/></div>').join('') +
    '<div class="acts"><button class="btn" id="hlSave">' + t('Save','Guardar') + '</button></div></div>' : '');
}

/* ---- zonas --------------------------------------------------------------- */
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
const zone  = id => ZONES.filter(z => z.id === id)[0];
const zName = id => { const z = zone(id); return z ? t(z.en, z.es) : id; };
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
    '<circle class="silo" cx="100" cy="26" r="19"/>' +
    '<path class="silo" d="M92 45h16v9h-16z"/>' +
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
  const rec = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1).slice(0, 8);
  return '<div class="card">' +
    '<div class="ctitle">' + t('Where the last ones went','Dónde fueron las últimas') + '</div>' +
    '<div class="csub">' + t('A notebook, not a manual: PepX records the site you tell it so you can see at a glance which one has had a rest. It does not explain technique.',
                             'Un cuaderno, no un manual: PepX apunta la zona que le digas para que veas de un vistazo cuál ha descansado. No explica técnica.') + '</div>' +
    '<div class="seg" style="margin-top:0">' +
      '<button data-zv="f"' + (view==='f'?' class="on"':'') + '>' + t('Front','Frente') + '</button>' +
      '<button data-zv="b"' + (view==='b'?' class="on"':'') + '>' + t('Back','Espalda') + '</button></div>' +
    '<div class="csub" style="margin:14px 0 0">' + (view === 'f'
      ? t('Seen from the front, as if facing you: <b>left</b> is on the right of the drawing.',
          'Visto de frente, como si estuviera enfrente: la <b>izquierda</b> queda a la derecha del dibujo.')
      : t('Seen from behind: left and right fall on the same side as yours.',
          'Visto de espaldas: izquierda y derecha caen del mismo lado que las tuyas.')) + '</div>' +
    '<div class="bodywrap"><div class="fig">' + figure(view) + '</div>' +
      '<div class="zlist">' + zs.map(z => {
        const us = S.sites.filter(s => s.z === z.id).sort((a,b) => a.d < b.d ? 1 : -1);
        return '<div class="row" style="padding-left:0;padding-right:0">' +
          '<div class="bd"><div class="nm">' + E(zName(z.id)) + '</div>' +
          '<div class="mt">' + (us.length ? E(us[0].c || '') : t('never used','nunca usada')) + '</div></div>' +
          '<div class="rt"><b>' + (us.length ? human(us[0].d) : '—') + '</b></div></div>';
      }).join('') + '</div></div>' +
  '</div>' +
  (rec.length ? '<div class="card flush">' + rec.map(s =>
    '<div class="row"><div class="bd"><div class="nm">' + E(zName(s.z)) + '</div>' +
      '<div class="mt">' + E(s.c || '—') + ' · ' + human(s.d) + '</div></div>' +
      '<button class="x" data-dels="' + s.id + '">' + svg('close') + '</button></div>').join('') + '</div>' : '');
}

/* ---- viales -------------------------------------------------------------- */
function toolVials(){
  const hoy = today();
  return (S.vials.length ? '<div class="card flush">' + S.vials.map(v => {
      const rec = v.recon ? days(v.recon, hoy) : null;
      return '<div class="row"><div class="bd"><div class="nm">' + E(v.c) +
        (v.mg ? ' · ' + E(v.mg) : '') + '</div>' +
        '<div class="mt">' + (v.lote ? t('lot ','lote ') + E(v.lote) : '') +
          (rec != null ? ' · ' + rec + t(' d reconstituted',' d reconstituido') : '') +
          (v.exp ? ' · ' + t('exp ','cad ') + human(v.exp) : '') + '</div></div>' +
        '<div class="rt"><b>' + (v.quedan !== '' && v.quedan != null ? E(v.quedan) : '—') + '</b>' +
          '<span>' + t('left','quedan') + '</span></div>' +
        '<button class="x" data-delvial="' + v.id + '">' + svg('close') + '</button></div>';
    }).join('') + '</div>'
    : '<div class="card">' + empty('box', t('No vials logged','Sin viales registrados'),
        t('Add one and PepX can warn you before it runs out.','Añade uno y PepX podrá avisarte antes de que se acabe.')) + '</div>') +
  '<div class="card"><div class="ctitle">' + t('Add a vial','Añadir un vial') + '</div>' +
    '<div class="r2">' +
      '<div><label>' + t('Compound','Compuesto') + '</label><input id="viC" list="pxCL"/>' + datalist() + '</div>' +
      '<div><label>' + t('Presentation','Presentación') + '</label><input id="viM" placeholder="10 mg"/></div></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Batch','Lote') + '</label><input id="viL" placeholder="L-2601-BC-01"/></div>' +
      '<div><label>' + t('Doses left','Dosis restantes') + '</label><input id="viQ" type="number" min="0"/></div></div>' +
    '<div class="r2">' +
      '<div><label>' + t('Reconstituted','Reconstituido') + '</label><input id="viR" type="date"/></div>' +
      '<div><label>' + t('Expiry','Caducidad') + '</label><input id="viE" type="date"/></div></div>' +
    '<div class="acts"><button class="btn" id="viAdd">' + t('Add','Añadir') + '</button></div></div>';
}

/* ---- DATA ---------------------------------------------------------------- */
const WINS = [7, 14, 30, 90];
function vData(){
  const win = S.win || 14, from = shift(today(), -(win-1));
  const cards = METRICS.map(m => {
    const pts = series(m.id, win);
    if(!pts.length) return '';
    const vs = pts.map(p => p.v), d = dpMetric(m, pts, win);
    return '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">' +
        '<h3 class="sec">' + E(mName(m)) + '</h3>' +
        '<span class="meta" style="white-space:nowrap;padding-top:4px">' + t('avg ','media ') +
          nf(mean(vs), m.dec) + ' ' + m.u + '</span></div>' +
      '<p class="meta" style="margin:6px 0 18px">' + t(m.de.en, m.de.es) + '</p>' +
      (m.col ? cols(pts, win, m) : line(pts, win, m)) +
      '<div class="statrow" style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px">' +
        '<div class="stat"><b>' + nf(mean(vs), m.dec) + '</b><span>' + t('avg','media') + '</span></div>' +
        '<div class="stat"><b>' + nf(mn(vs), m.dec) + '</b><span>' + t('low','mín') + '</span></div>' +
        '<div class="stat"><b>' + nf(mx(vs), m.dec) + '</b><span>' + t('high','máx') + '</span></div>' +
      '</div>' +
      '<div style="display:flex;margin-top:14px">' + trendChip(pts, m) + '</div>' +
      (d ? dp(d) : '') + '</div>';
  }).join('');

  return '<div class="wrap">' + back('more', 'MORE') +
    phead(E(human(from).toUpperCase()) + ' — ' + E(human(today()).toUpperCase()),
      t('What changed.','Qué cambió.'),
      t('Numbers you measure yourself. Weekly is enough; monthly and the curve stops meaning anything.',
        'Números que mides tú. Con una vez por semana basta; una vez al mes y la curva deja de decir nada.')) +
    '<div class="seg">' + WINS.map(w => '<button data-win="' + w + '"' + (w === win ? ' class="on"' : '') + '>' +
      w + ' ' + t('days','días') + '</button>').join('') + '</div>' +
    dp(dpReport(win), true) +
    (cards || '<div class="card">' + empty('chart', t('Nothing measured in this window','Nada medido en esta ventana'),
      t('Use the form below. One weight is enough to start.','Usa el formulario de abajo. Con un peso basta para empezar.')) + '</div>') +
    '<div class="card"><div class="ctitle">' + t('Log a measurement','Registrar una medida') + '</div>' +
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
      '<div class="acts"><button class="btn" id="pvAdd">' + t('Save','Guardar') + '</button></div></div>' +
    (S.vitals.length ? '<div class="card flush">' + S.vitals.slice().reverse().slice(0,20).map(v =>
      '<div class="row"><div class="bd"><div class="nm">' + human(v.d) + '</div>' +
        '<div class="mt">' + METRICS.map(m => (v[m.id] !== '' && v[m.id] != null
          ? mShort(m) + ' ' + E(v[m.id]) + (m.u ? ' ' + m.u : '') : '')).filter(Boolean).join(' · ') + '</div></div>' +
        '<button class="x" data-delv="' + v.d + '">' + svg('close') + '</button></div>').join('') + '</div>' : '') +
    ruo() + '</div>';
}
const sel5 = id => '<select id="' + id + '"><option value="">—</option>' +
  [1,2,3,4,5].map(n => '<option>' + n + '</option>').join('') + '</select>';

/* ---- EDUCATION -----------------------------------------------------------
   Contenido real o hueco declarado. Lo que hay son los documentos que PEPTIDEX
   ya tiene escritos y las guías de uso de la propia aplicación. Lo que no hay
   —los vídeos— se dice que no hay, en vez de rellenarlo con material inventado
   sobre compuestos, que es justo lo que no debe hacer una app así.
   ------------------------------------------------------------------------- */
function vEdu(){
  const w = sub1('edu', 'art');
  const GUIAS = [
    {t:{en:'Reading a reconstitution', es:'Leer una reconstitución'},
     d:{en:'Why mg in the vial and mL of solvent give you a mark on the syringe, and why that mark is arithmetic and not advice.',
        es:'Por qué los mg del vial y los mL de disolvente dan una marca en la jeringa, y por qué esa marca es aritmética y no un consejo.'},
     go:'more:tools'},
    {t:{en:'Cold chain and light', es:'Cadena de frío y luz'},
     d:{en:'What the storage column of each compound sheet means, and why the reconstitution date matters more than the expiry.',
        es:'Qué significa la columna de almacenamiento de cada ficha, y por qué la fecha de reconstitución importa más que la caducidad.'},
     go:'comp'},
    {t:{en:'Why PepX never proposes a dose', es:'Por qué PepX nunca propone una dosis'},
     d:{en:'Where the line sits between a record and a recommendation, and why the reference sheet is quoted rather than applied.',
        es:'Dónde está la raya entre un registro y una recomendación, y por qué la hoja de referencia se cita en vez de aplicarse.'},
     go:'more:profile'},
    {t:{en:'Rotating sites', es:'Rotar zonas'},
     d:{en:'What the app records about placement, and what it deliberately does not explain.',
        es:'Qué apunta la aplicación sobre la colocación, y qué no explica a propósito.'},
     go:'more:tools'}
  ];
  return '<div class="wrap">' + back('more', 'MORE') +
    phead(t('EDUCATION','FORMACIÓN'), t('Read first.','Leer primero.'),
      t('Research and education only. Nothing here is a therapeutic claim, a protocol or a recommendation.',
        'Sólo investigación y formación. Nada de aquí es una afirmación terapéutica, un protocolo ni una recomendación.')) +
    '<div class="seg">' +
      [['art', t('Articles','Artículos')], ['vid', t('Videos','Vídeos')], ['pro', t('Protocol','Protocolo')]].map(x =>
      '<button data-sub="edu:' + x[0] + '"' + (w === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +

    (w === 'art' ? '<div class="card flush">' + GUIAS.map(g =>
      '<div class="row go" data-go="' + g.go + '"><div class="bd">' +
        '<div class="nm">' + t(g.t.en, g.t.es) + '</div>' +
        '<div class="mt">' + t(g.d.en, g.d.es) + '</div></div><span class="cv"></span></div>').join('') + '</div>' : '') +

    (w === 'vid' ? '<div class="card">' + empty('book', t('No videos yet','Todavía no hay vídeos'),
      t('This shelf is empty on purpose. It will hold PEPTIDEX material when there is PEPTIDEX material — not stock footage about compounds.',
        'Este estante está vacío a propósito. Llevará material de PEPTIDEX cuando haya material de PEPTIDEX — no vídeo de archivo sobre compuestos.')) + '</div>' : '') +

    (w === 'pro' ? '<div class="card">' +
      '<div class="ctitle">' + t('What a protocol is here','Qué es un protocolo aquí') + '</div>' +
      '<p class="body">' + t('A protocol in PepX is four facts you write down: a compound, a dose, a frequency and a start. Nothing else. The app does not evaluate whether that protocol is a good idea, and it will not adjust it for you — it remembers it, counts it and tells you when the vial runs out.',
        'Un protocolo en PepX son cuatro datos que escribes tú: un compuesto, una dosis, una frecuencia y un inicio. Nada más. La aplicación no juzga si ese protocolo es buena idea y no lo va a ajustar por ti — se acuerda, lo cuenta y te avisa cuando se acaba el vial.') + '</p>' +
      '<p class="body" style="margin-top:14px">' + t('The reference figures that live in each compound sheet come from the PEPTIDEX operations record and are shown as a quotation, with their source. Reading them is a decision; the app never takes it for you.',
        'Las cifras de referencia que viven en cada ficha vienen del registro de operación de PEPTIDEX y se muestran como una cita, con su procedencia. Leerlas es una decisión; la aplicación no la toma nunca por ti.') + '</p>' +
      '<div class="acts"><button class="btn ghost" data-go="comp">' + t('Open the library','Abrir la biblioteca') + '</button></div>' +
    '</div>' : '') +
    ruo() + '</div>';
}

/* ---- PROFILE / SETTINGS --------------------------------------------------- */
function vProfile(){
  return '<div class="wrap">' + back('more', 'MORE') +
    phead(t('PROFILE','PERFIL'), S.me.nombre ? E(S.me.nombre) : t('Your account.','Tu cuenta.')) +

    '<div class="card"><div style="display:flex;align-items:center;gap:20px">' +
      '<span class="avatar lg">' + E(initials()) + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="nm" style="font-size:16px;font-weight:600">' +
          (S.me.nombre ? E(S.me.nombre) : t('No name set','Sin nombre')) + '</div>' +
        '<div class="meta" style="margin-top:4px">' +
          (S.me.correo ? E(S.me.correo) : t('Local profile · no server','Perfil local · sin servidor')) + '</div>' +
      '</div></div>' +
      '<label>' + t('Name','Nombre') + '</label><input id="meN" value="' + E(S.me.nombre) + '" placeholder="—"/>' +
      '<label>' + t('Email','Correo') + '</label><input id="meE" type="email" value="' + E(S.me.correo) + '" placeholder="—"/>' +
      '<div class="acts"><button class="btn" id="meSave">' + t('Save','Guardar') + '</button></div>' +
    '</div>' +

    '<div class="card"><div class="ctitle">' + t('Preferences','Preferencias') + '</div>' +
      '<div class="row" style="padding-left:0;padding-right:0">' +
        '<div class="bd"><div class="nm">' + t('Appearance','Apariencia') + '</div>' +
        '<div class="mt">' + t('Dark is the primary experience.','El oscuro es la experiencia principal.') + '</div></div>' +
        '<div class="seg" style="margin:0;flex:0 0 auto;width:170px">' +
          '<button data-th="dark"' + (S.theme === 'dark' ? ' class="on"' : '') + '>' + t('Dark','Oscuro') + '</button>' +
          '<button data-th="light"' + (S.theme === 'light' ? ' class="on"' : '') + '>' + t('Light','Claro') + '</button>' +
        '</div></div>' +
      '<div class="row" style="padding-left:0;padding-right:0">' +
        '<div class="bd"><div class="nm">' + t('Language','Idioma') + '</div>' +
        '<div class="mt">' + t('Follows the store toggle.','Sigue el conmutador de la tienda.') + '</div></div>' +
        '<span class="tag">' + t('EN','ES') + '</span></div>' +
    '</div>' +

    '<div class="card flush">' +
      settingRow('bell', t('Notifications','Avisos'),
        t('Installed as a web app, iPhone does not allow scheduled reminders — only a native build can. Android can.',
          'Instalada como app web, el iPhone no permite recordatorios programados — sólo una compilación nativa puede. Android sí.')) +
      settingRow('lock', t('Security','Seguridad'),
        t('There is no account server yet, so there is no password to steal. Your device lock is the lock.',
          'Todavía no hay servidor de cuentas, así que no hay contraseña que robar. El bloqueo de tu aparato es el bloqueo.')) +
      settingRow('shield', t('Privacy','Privacidad'),
        t('Everything stays in this browser. Nothing is sent anywhere — not to us either.',
          'Todo se queda en este navegador. No se envía a ningún sitio — a nosotros tampoco.')) +
      '<a class="row go" href="mailto:' + MAIL + '"><span style="flex:0 0 auto;width:19px;height:19px;color:var(--t2)">' +
        svg('help') + '</span><div class="bd"><div class="nm">' + t('Support','Soporte') + '</div>' +
        '<div class="mt">' + MAIL + '</div></div><span class="cv"></span></a>' +
    '</div>' +

    '<div class="card"><div class="ctitle">' + t('Your data','Tus datos') + '</div>' +
      '<p class="meta">' + t('Export is the backup. If you clear this browser without one, it is gone.',
                             'Exportar es la copia de seguridad. Si borras este navegador sin ella, se ha ido.') + '</p>' +
      '<div class="acts">' +
        '<button class="btn ghost" id="pxExp">' + t('Export','Exportar') + '</button>' +
        '<button class="btn ghost" id="pxImp">' + t('Import','Importar') + '</button>' +
        '<button class="btn quiet" id="pxWipe">' + t('Erase everything','Borrar todo') + '</button>' +
      '</div><input type="file" id="pxFile" accept="application/json" class="sr"/></div>' +

    installCard() +

    '<div class="acts"><button class="btn quiet wide" id="pxOut">' + svg('out') +
      t('Log out','Cerrar sesión') + '</button></div>' +

    dp([t('I read what you write down, and only that. I do not read your body: I will not tell you that a number moved because of a compound, and I will not tell you what to take, how much or how often. That line is not a setting.',
          'Leo lo que apuntas, y sólo eso. No leo tu cuerpo: no te voy a decir que un número se movió por un compuesto, ni te voy a decir qué tomar, cuánto ni cada cuándo. Esa raya no es un ajuste.')], true) +
    ruo() + '</div>';
}
const settingRow = (ic, n, d) => '<div class="row">' +
  '<span style="flex:0 0 auto;width:19px;height:19px;color:var(--t2)">' + svg(ic) + '</span>' +
  '<div class="bd"><div class="nm">' + n + '</div><div class="mt">' + d + '</div></div></div>';

/* ---- PLAN ---------------------------------------------------------------- */
const TIERS = [
  {id:'free', pr:'0', en:'Free', es:'Free',
   cl:{en:'Remember what you do', es:'Acuérdate de lo que haces'},
   f:[['Up to 2 protocols','Hasta 2 protocolos'],
      ['Journal, calendar and streak','Diario, calendario y racha'],
      ['Reconstitution calculator','Calculadora de reconstitución'],
      ['Compound index — name and class','Índice de compuestos — nombre y clase'],
      ['90 days of history','90 días de histórico']]},
  {id:'pro', pr:'9', en:'Pro', es:'Pro',
   cl:{en:'See what changes over time', es:'Mira qué cambia con el tiempo'},
   f:[['Unlimited protocols','Protocolos ilimitados'],
      ['All seven measures with charts','Las siete constantes con sus gráficas'],
      ['Doc.Peps on every measure','Doc.Peps en cada constante'],
      ['Half-life curves','Curvas de vida media'],
      ['Vials with batch and expiry','Viales con lote y caducidad'],
      ['Injection site map','Mapa de zonas'],
      ['Full history, export and import','Histórico completo, exportar e importar']]},
  {id:'ult', pr:'19', en:'Ultimate', es:'Ultimate',
   cl:{en:'Know exactly what you are holding', es:'Sabe exactamente qué tienes en la mano'},
   f:[['Everything in Pro','Todo lo de Pro'],
      ['Full compound library','Biblioteca completa de compuestos'],
      ['Mechanism, vial spec and solvent','Mecanismo, presentación y solvente'],
      ['Cold chain and light alerts','Avisos de cadena de frío y luz'],
      ['Calculator pre-filled per compound','Calculadora precargada por compuesto'],
      ['Your reference sheet, in the app','Tu hoja de referencia, dentro'],
      ['Printable batch report','Informe de lote imprimible']]}
];
const RANK = {free:0, pro:1, ult:2};
/* Una puerta, no una caja fuerte: vive en el navegador y quien sepa abrir la
   consola la salta. Está para comunicar el producto — cobrar de verdad exige
   que la cuenta viva en un servidor. */
const can = lvl => (RANK[S.sub.tier] || 0) >= RANK[lvl];

function vPlan(){
  return '<div class="wrap">' + back('more', 'MORE') +
    phead(t('PLAN','PLAN'), t('Three levels.','Tres niveles.'),
      t('Each step answers a different question, and none of them is “more days of history”.',
        'Cada salto responde a una pregunta distinta, y ninguno es «más días de histórico».')) +
    '<div class="tiers">' + TIERS.map(x =>
      '<div class="tier' + (x.id === 'ult' ? ' top' : '') + '">' +
        (S.sub.tier === x.id ? '<span class="cur">' + t('CURRENT','ACTUAL') + '</span>' : '') +
        '<div class="nm">' + t(x.en, x.es) + '</div>' +
        '<div class="pr num">$' + x.pr + '<small> ' + t('/ month','/ mes') + '</small></div>' +
        '<div class="cl">' + t(x.cl.en, x.cl.es) + '</div>' +
        '<ul>' + x.f.map(f => '<li>' + t(f[0], f[1]) + '</li>').join('') + '</ul>' +
        (S.sub.tier === x.id ? '' : '<div class="acts"><a class="btn wide' + (x.id === 'ult' ? '' : ' ghost') +
          '" href="mailto:' + MAIL + '?subject=' + encodeURIComponent('PepX ' + t(x.en, x.es)) + '">' +
          t('Enquire','Consultar') + '</a></div>') +
      '</div>').join('') + '</div>' + ruo() + '</div>';
}

/* ---- instalar en el teléfono --------------------------------------------- */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e;
  try{ if(document.querySelector('.pxapp')) paint(); }catch(err){} });
addEventListener('appinstalled', () => { deferredInstall = null;
  try{ if(document.querySelector('.pxapp')) paint(); }catch(err){} });
function installed(){
  try{ return matchMedia('(display-mode: standalone)').matches ||
              matchMedia('(display-mode: fullscreen)').matches ||
              navigator.standalone === true; }catch(e){ return false; }
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function installCard(){
  if(installed())
    return '<div class="card"><div class="ctitle">' + t('On your phone','En tu teléfono') + '</div>' +
      '<p class="meta">' + t('PepX is installed on this device. It opens without the browser bar and works with no connection.',
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
  return '<div class="card"><div class="ctitle">' + t('Put it on your phone','Ponla en tu teléfono') + '</div>' +
    '<p class="meta">' + t('PepX installs to the home screen with its own icon, opens full screen and keeps working with no connection.',
                           'PepX se instala en la pantalla de inicio con su icono, abre a pantalla completa y sigue funcionando sin conexión.') + '</p>' +
    pasos.map((p,i) => '<div class="row" style="padding-left:0;padding-right:0">' +
      '<span class="meta" style="flex:0 0 16px">' + (i+1) + '</span>' +
      '<div class="bd"><div class="mt" style="margin-top:0;color:var(--t2)">' + p + '</div></div></div>').join('') +
    (deferredInstall ? '<div class="acts"><button class="btn" id="pxInstall">' +
      t('Install PepX','Instalar PepX') + '</button></div>' : '') + '</div>';
}

/* ==========================================================================
   18 · PINTAR
   ========================================================================== */
function appHTML(){
  if(!S.on) return vSplash();
  const v = S.tab === 'prot' ? vProt() : S.tab === 'comp' ? vComp()
          : S.tab === 'jour' ? vJour() : S.tab === 'more' ? vMore() : vHome();
  return '<section class="pxapp"' + (S.theme === 'light' ? ' data-theme="light"' : '') + '>' +
    head() + tabbar() + v + '</section>';
}
function paint(){
  const app = document.getElementById('app');
  if(!app) return;
  document.documentElement.classList.toggle('px-light', S.theme === 'light');
  app.innerHTML = appHTML();
  wire();
  try{ observeReveals(); }catch(e){}
}
function top0(){ try{ lenis.scrollTo(0,{immediate:true}); }catch(e){ scrollTo(0,0); } }
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };

/* ==========================================================================
   19 · ESCUCHAR
   ========================================================================== */
function wire(){
  const root = document.querySelector('.pxapp');
  if(!root) return;
  const on = (sel, ev, fn) => root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

  /* ---- portada ---- */
  on('[data-enter]', 'click', function(){
    S.on = true; S.tab = 'home';
    if(this.dataset.enter === 'new'){ S.tab = 'more'; S.more = 'profile'; }
    save(); paint(); top0();
  });

  /* ---- armazón ---- */
  on('[data-tab]', 'click', function(){
    S.tab = this.dataset.tab; S.more = ''; S.open = null;
    save(); paint(); top0();
  });
  on('[data-theme-toggle]', 'click', () => {
    S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); paint();
  });
  on('[data-th]', 'click', function(){ S.theme = this.dataset.th; save(); paint(); });

  /* Una sola puerta para navegar: «tab», «tab:sub» o un caso con nombre. Tener
     cinco atributos distintos para ir a sitios es tener cinco sitios donde
     equivocarse. */
  on('[data-go]', 'click', function(e){
    e.stopPropagation();
    const g = this.dataset.go;
    if(g === 'store'){ location.hash = '#/track'; return; }
    if(g === 'prot:new'){ S.tab = 'prot'; S.newProt = true; save(); paint();
      setTimeout(() => { const i = document.getElementById('pxC'); if(i) i.focus(); }, 80); return; }
    if(g === 'prot:close'){ S.newProt = false; save(); paint(); return; }
    if(g === 'jour:new'){ S.jnew = true; save(); paint(); return; }
    if(g === 'jour:close'){ S.jnew = false; save(); paint(); return; }
    if(g === 'comp:clear'){ S.lq = ''; save(); paint(); return; }
    if(g.indexOf('comp:') === 0){ S.tab = 'comp'; S.more = ''; S.open = g.slice(5); save(); paint(); top0(); return; }
    if(g.indexOf('more:') === 0){ S.tab = 'more'; S.more = g.slice(5); save(); paint(); top0(); return; }
    S.tab = g; S.more = ''; save(); paint(); top0();
  });
  on('[data-sub]', 'click', function(){
    const [k, v] = this.dataset.sub.split(':');
    S.sub1[k] = v || ''; save(); paint();
  });

  /* ---- marcar dosis ---- */
  const tick = (id, k) => {
    S.log[k] = S.log[k] || {};
    if(S.log[k][id]) delete S.log[k][id];
    else S.log[k][id] = {t:new Date().toTimeString().slice(0,5)};
    if(!Object.keys(S.log[k]).length) delete S.log[k];
    save(); paint();
  };
  on('[data-tick]',  'click', function(e){ e.stopPropagation(); tick(this.dataset.tick, today()); });
  on('[data-tickd]', 'click', function(e){ e.stopPropagation();
    const [id, k] = this.dataset.tickd.split('|'); tick(id, k); });

  /* ---- protocolos ---- */
  on('[data-prot]', 'click', function(e){
    if(e.target.closest('button') && !e.target.closest('.cpdhd')) return;
    S.open = S.open === this.dataset.prot ? null : this.dataset.prot; save(); paint();
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
      alert(t('The free plan holds two protocols. Plan has the rest.',
              'El plan gratuito guarda dos protocolos. En Plan está el resto.'));
      S.tab = 'more'; S.more = 'plan'; save(); paint(); return;
    }
    S.plan.push(p); S.newProt = false; S.sub1.prot = 'active'; save(); paint();
  });
  on('[data-del]', 'click', function(e){ e.stopPropagation();
    S.plan = S.plan.filter(p => p.id !== this.dataset.del); S.open = null; save(); paint(); });
  on('[data-toggle]', 'click', function(e){ e.stopPropagation();
    const p = S.plan.filter(x => x.id === this.dataset.toggle)[0];
    if(p) p.active = !p.active; save(); paint(); });

  /* ---- compuestos ---- */
  const lq = document.getElementById('lq');
  if(lq){
    let tmr = null;
    lq.addEventListener('input', () => {
      /* no se repinta en cada tecla: eso saca el foco del campo a media palabra */
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        S.lq = lq.value; save();
        const pos = lq.selectionStart; paint();
        const n = document.getElementById('lq');
        if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
      }, 260);
    });
  }
  on('[data-comp]', 'click', function(e){
    if(e.target.closest('[data-calc]') || e.target.closest('[data-go]')) return;
    e.stopPropagation();
    S.tab = 'comp'; S.more = '';
    S.open = S.open === this.dataset.comp ? null : this.dataset.comp;
    save(); paint();
  });
  on('[data-calc]', 'click', function(e){
    e.stopPropagation();
    const n = this.dataset.calc, x = libFind(n);
    S.calc = S.calc || {}; S.calc.comp = n;
    if(x && x.mg && x.mg.length) S.calc.mg = String(x.mg[0]);
    if(x && x.bac) S.calc.ml = x.bac;
    S.tab = 'more'; S.more = 'tools'; S.sub1.tools = 'calc'; save(); paint(); top0();
  });

  /* ---- diario ---- */
  on('[data-day]', 'click', function(){ S.jsel = this.dataset.day;
    S.jmon = this.dataset.day.slice(0,7); save(); paint(); });
  on('[data-mon]', 'click', function(){
    const cur = S.jmon || today().slice(0,7);
    const [y, m] = cur.split('-').map(Number);
    const d = new Date(y, m-1 + (+this.dataset.mon), 1);
    S.jmon = d.getFullYear() + '-' + pad(d.getMonth()+1); save(); paint();
  });
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

  /* ---- calculadora ---- */
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

  /* ---- vida media, zonas, viales ---- */
  const hs = document.getElementById('hlSave');
  if(hs) hs.addEventListener('click', () => {
    root.querySelectorAll('[data-hl]').forEach(i => {
      const v = i.value.trim();
      if(v) S.hl[i.dataset.hl] = +v; else delete S.hl[i.dataset.hl];
    });
    save(); paint();
  });
  on('[data-zv]',   'click', function(){ S.zview = this.dataset.zv; save(); paint(); });
  on('[data-zone]', 'click', function(){ S.jnew = true; S.tab = 'jour'; save(); paint();
    setTimeout(() => { const z = document.getElementById('jZ'); if(z) z.value = this.dataset.zone; }, 60); });
  on('[data-dels]', 'click', function(){
    S.sites = S.sites.filter(s => s.id !== this.dataset.dels); save(); paint(); });
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

  /* ---- medidas ---- */
  on('[data-win]', 'click', function(){ S.win = +this.dataset.win; save(); paint(); });
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

  /* ---- perfil y datos ---- */
  const ms = document.getElementById('meSave');
  if(ms) ms.addEventListener('click', () => {
    S.me.nombre = val('meN'); S.me.correo = val('meE'); save(); paint();
  });
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
  const old = document.querySelector('.pxapp .out');
  if(!old) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = toolCalc();
  const nuevo = tmp.querySelector('.out');
  if(nuevo) old.replaceWith(nuevo);
}

/* ==========================================================================
   20 · LA PUERTA DESDE LA TIENDA
   ========================================================================== */
function door(){
  const links = document.querySelector('nav .links');
  if(links && links.__px && !links.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door'; a.href = '#/app';
    a.setAttribute('data-nav',''); a.setAttribute('data-route','/app');
    a.setAttribute('data-en','PepX'); a.setAttribute('data-es','PepX');
    a.innerHTML = 'PepX<span class="nw">' + t('NEW','NUEVO') + '</span>';
    links.appendChild(a);
  }
  const inner = document.querySelector('#mmenu .inner');
  if(inner && !inner.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door'; a.href = '#/app';
    a.setAttribute('data-nav','');
    a.setAttribute('data-en','PepX · the app'); a.setAttribute('data-es','PepX · la app');
    a.textContent = t('PepX · the app','PepX · la app');
    inner.appendChild(a);
  }
}
door();
let doorTries = 0;
const doorTimer = setInterval(() => {
  door();
  const l = document.querySelector('nav .links');
  if(++doorTries > 40 || (l && l.querySelector('.px-door'))) clearInterval(doorTimer);
}, 250);

/* ==========================================================================
   21 · LA RUTA
   ========================================================================== */
const _render = render;
render = function(route, defer){
  const k = String(route || '').replace('/','');
  if(k === 'app'){
    const mw = document.getElementById('molwrap');
    if(mw && mw.__cleanup) mw.__cleanup();
    document.documentElement.classList.add('px-app');
    paint();
    try{ syncAccountUI(); }catch(e){}
    try{ setView('home'); }catch(e){}
    try{ lenis.scrollTo(0,{immediate:true}); }catch(e){}
    try{ parEls = []; }catch(e){}
    return;
  }
  document.documentElement.classList.remove('px-app', 'px-light');
  return _render(route, defer);
};
try{ if(currentRoute().replace('/','') === 'app') render(currentRoute()); }catch(e){}

/* el arnés mira por aquí; el sitio nunca */
window.__pepx = {state: () => S, paint: paint, dueOn: dueOn, tips: tips,
                 series: series, levelAt: levelAt, METRICS: METRICS, LIB: LIB,
                 family: family, adherence: adherence, planState: planState};

})();

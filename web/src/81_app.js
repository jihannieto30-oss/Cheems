/* ============================================================================
   PepX — LA APLICACIÓN

   Vive en #/app, dentro del mismo fichero que la tienda, y es lo contrario de
   la tienda: negra, densa, y pensada para abrirse todos los días en un minuto.

   QUÉ HACE Y QUÉ NO — Y POR QUÉ ESTÁ ESCRITO AQUÍ

   El usuario mete SU pauta: qué compuesto, qué dosis, cada cuándo, desde
   cuándo. La aplicación no la propone, no la ajusta y no la sugiere. Lo que
   hace es acordarse por él, dejar constancia de lo que hizo, y avisarle de
   cosas que se pueden comprobar sin opinar de nada:

       adherencia   «llevas seis días sin registrar»
       inventario   «te quedan dos dosis; con tu frecuencia se acaba el jueves»
       conservación «este vial lleva 31 días reconstituido»
       datos        «sin peso de partida no hay progreso que medir»

   Ninguna de esas frases dice qué tomar, cuánto ni cada cuándo. Esa es la raya,
   y está escrita aquí arriba para que quien toque este fichero dentro de un año
   sepa dónde estaba antes de moverla.

   TODO ES DEL TELÉFONO

   No hay servidor. El plan, el registro, las medidas y el inventario viven en
   localStorage del propio aparato. Eso tiene dos consecuencias que conviene
   decir en voz alta: nadie más los ve —ni nosotros—, y si se borra el navegador
   se borran. Por eso la exportación a JSON no es un extra: es la copia de
   seguridad, y está en Cuenta.
   ============================================================================ */
(function(){
'use strict';

const KEY = 'pepx-app-v1';
const MAIL = 'official.peptidex@outlook.com';

/* --------------------------------------------------------------------------
   1 · EL ESTADO
   -------------------------------------------------------------------------- */
const BLANK = {
  plan:   [],   /* pautas del usuario */
  log:    {},   /* 'YYYY-MM-DD': { planId: {t:hora, d:dosis, n:nota} } */
  vitals: [],   /* { d, peso, cintura, sueño, energía, nota } */
  vials:  [],   /* { id, c, mg, lote, recon, exp, quedan } */
  sub:    {tier:'free', since:null},
  tab:    'hoy'
};
let S = load();

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY));
    if(raw && typeof raw === 'object') return Object.assign({}, BLANK, raw);
  }catch(e){}
  return JSON.parse(JSON.stringify(BLANK));
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
const uid = () => Math.random().toString(36).slice(2,9);

/* --------------------------------------------------------------------------
   2 · FECHAS

   Todo se guarda como 'YYYY-MM-DD' en hora local. Guardar ISO con zona parece
   más correcto y es peor: una dosis puesta a las once de la noche en México se
   registraría al día siguiente, y el usuario vería un hueco donde sí cumplió.
   -------------------------------------------------------------------------- */
const pad = n => String(n).padStart(2,'0');
const key = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
const today = () => key(new Date());
function parse(k){ const [y,m,d] = String(k).split('-').map(Number);
                   return new Date(y, (m||1)-1, d||1); }
function shift(k, n){ const d = parse(k); d.setDate(d.getDate()+n); return key(d); }
function days(a, b){ return Math.round((parse(b)-parse(a)) / 86400000); }
function human(k){
  const d = parse(k), hoy = today();
  if(k === hoy) return t('today','hoy');
  if(k === shift(hoy,-1)) return t('yesterday','ayer');
  if(k === shift(hoy, 1)) return t('tomorrow','mañana');
  const M = t('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec',
              'ene feb mar abr may jun jul ago sep oct nov dic').split(' ');
  return d.getDate() + ' ' + M[d.getMonth()];
}
const DOW = () => t('M,T,W,T,F,S,S','L,M,X,J,V,S,D').split(',');

/* --------------------------------------------------------------------------
   3 · LA PAUTA — cuándo toca

   Cinco formas de repetir. Todas se resuelven contra una fecha concreta, así
   que la misma función sirve para pintar hoy, para pintar la racha de las
   últimas ocho semanas y para calcular cuándo se acaba un vial.
   -------------------------------------------------------------------------- */
const FREQ = [
  {v:'d',   en:'Every day',            es:'Todos los días'},
  {v:'alt', en:'Every other day',      es:'Días alternos'},
  {v:'dow', en:'Certain weekdays',     es:'Días concretos de la semana'},
  {v:'nd',  en:'Every N days',         es:'Cada N días'},
  {v:'cyc', en:'Cycle: N on, N off',   es:'Ciclo: N sí, N no'}
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
function dueList(k){ return S.plan.filter(p => dueOn(p, k)); }
function taken(k, id){ return !!(S.log[k] && S.log[k][id]); }

function freqText(p){
  switch(p.freq){
    case 'd':   return t('every day','todos los días');
    case 'alt': return t('every other day','días alternos');
    case 'dow': return (p.dow||[]).map(i => DOW()[i]).join(' · ') || t('no days','sin días');
    case 'nd':  return t('every ','cada ') + (p.every||1) + t(' days',' días');
    case 'cyc': return (p.on||1) + t(' on / ',' sí / ') + (p.off||0) + t(' off',' no');
  }
  return '';
}

/* --------------------------------------------------------------------------
   4 · LO QUE LA APLICACIÓN DICE

   Cada aviso sale de un hecho que se puede contar: días sin registrar, dosis
   que quedan en un vial, días desde la reconstitución, semanas sin una medida.
   Ninguno opina sobre la pauta. Si algún día alguien quiere añadir uno que sí,
   el sitio para discutirlo es la cabecera de este fichero, no esta lista.
   -------------------------------------------------------------------------- */
function tips(){
  const out = [], hoy = today();

  if(!S.plan.length){
    out.push(['', t('Nothing scheduled yet','Todavía no hay nada programado'),
      t('Add your first protocol in Plan. You enter the compound, the dose and how often — PepX only remembers it for you.',
        'Añade tu primera pauta en Plan. El compuesto, la dosis y la frecuencia los pones tú — PepX sólo se acuerda por ti.')]);
    return out;
  }

  /* días seguidos sin registrar nada que tocaba */
  let gap = 0;
  for(let i = 1; i <= 30; i++){
    const k = shift(hoy, -i);
    const due = dueList(k);
    if(!due.length) continue;
    if(due.some(p => taken(k, p.id))) break;
    gap++;
  }
  if(gap >= 3)
    out.push(['w', t('%d days without a record','%d días sin registrar').replace('%d', gap),
      t('A log with holes is worth less than a short one that is complete. Fill them in from the day itself.',
        'Un registro con huecos vale menos que uno corto y completo. Rellénalos desde el propio día.')]);

  /* vitales: sin línea de partida no hay progreso */
  if(!S.vitals.length)
    out.push(['', t('No baseline yet','Sin punto de partida'),
      t('Log a weight in Progress. Without a first measurement there is nothing to compare against later.',
        'Registra un peso en Progreso. Sin una primera medida no hay contra qué comparar después.')]);
  else {
    const last = S.vitals[S.vitals.length-1].d;
    const dd = days(last, hoy);
    if(dd >= 21)
      out.push(['w', t('%d days since your last measurement','%d días desde tu última medida').replace('%d', dd),
        t('Weekly is enough. Monthly and the curve stops meaning anything.',
          'Con una vez por semana basta. Una vez al mes y la curva deja de decir nada.')]);
  }

  /* inventario: lo que queda y cuándo se acaba */
  S.vials.forEach(v => {
    const p = S.plan.filter(x => x.active && x.c === v.c)[0];
    if(v.quedan != null && v.quedan !== '' && +v.quedan <= 3){
      let when = '';
      if(p){
        let n = 0, k = hoy, left = +v.quedan;
        while(left > 0 && n < 120){ if(dueOn(p, k)) left--; if(left > 0){ k = shift(k,1); n++; } }
        when = t(' — at your frequency it runs out ',' — con tu frecuencia se acaba ') + human(k);
      }
      out.push([+v.quedan <= 1 ? 'b' : 'w',
        t('%s: %s doses left','%s: quedan %s dosis').replace('%s', v.c).replace('%s', v.quedan),
        t('Restocking takes days you may not have.','Reponer tarda días que quizá no tengas.') + when]);
    }
    if(v.recon){
      const dd = days(v.recon, hoy);
      if(dd >= 25)
        out.push([dd >= 32 ? 'b' : 'w',
          t('%s: reconstituted %d days ago','%s: %d días desde la reconstitución')
            .replace('%s', v.c).replace('%d', dd),
          t('Check the storage window on that batch’s COA before using it.',
            'Comprueba la ventana de conservación en el COA de ese lote antes de usarlo.')]);
    }
    if(v.exp && v.exp <= shift(hoy, 30))
      out.push([v.exp <= hoy ? 'b' : 'w',
        t('%s: expiry %s','%s: caducidad %s').replace('%s', v.c).replace('%s', human(v.exp)),
        t('Past the date it does not go in the log — it goes in the bin.',
          'Pasada la fecha no va al registro: va a la basura.')]);
  });

  if(!out.length)
    out.push(['', t('Everything up to date','Todo al día'),
      t('Nothing to flag. Keep logging.','No hay nada que señalar. Sigue registrando.')]);
  return out;
}

/* --------------------------------------------------------------------------
   5 · LAS PANTALLAS
   -------------------------------------------------------------------------- */
const esc2 = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const TABS = [
  {id:'hoy',  en:'Today',     es:'Hoy',        ic:'<path d="M3 8h18M7 3v3m10-3v3"/><rect x="3" y="5" width="18" height="16" rx="3"/>'},
  {id:'plan', en:'Plan',      es:'Plan',       ic:'<path d="M4 6h16M4 12h16M4 18h10"/>'},
  {id:'prog', en:'Progress',  es:'Progreso',   ic:'<path d="M4 18l5-6 4 4 7-9"/>'},
  {id:'inv',  en:'Inventory', es:'Inventario', ic:'<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>'},
  {id:'cta',  en:'Account',   es:'Cuenta',     ic:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>'}
];

function tabsHTML(){
  return '<div class="tabs">' + TABS.map(x =>
    '<button data-tab="' + x.id + '"' + (S.tab === x.id ? ' class="on"' : '') + '>' +
      '<svg viewBox="0 0 24 24">' + x.ic + '</svg><span>' + t(x.en, x.es) + '</span>' +
    '</button>').join('') + '</div>';
}

function headHTML(){
  const pro = S.sub.tier !== 'free';
  return '<div class="abar"><div class="wrap in">' +
    '<span class="brandx"><b>PepX</b><i>' + t('by PEPTIDEX','de PEPTIDEX') + '</i></span>' +
    '<span style="display:flex;align-items:center;gap:16px">' +
      '<a class="back" href="#/" data-nav data-href="#/">← ' + t('Store','Tienda') + '</a>' +
      '<span class="tierchip' + (pro ? ' pro' : '') + '">' +
        (pro ? S.sub.tier.toUpperCase() : t('FREE','GRATIS')) + '</span>' +
    '</span>' +
  '</div></div>';
}

/* ---------- HOY ---------- */
function vHoy(){
  const hoy = today(), due = dueList(hoy);
  const hechas = due.filter(p => taken(hoy, p.id)).length;

  /* racha: los últimos 56 días con algo programado */
  let racha = 0, rompe = false, cells = '';
  for(let i = 55; i >= 0; i--){
    const k = shift(hoy, -i), d = dueList(k);
    if(!d.length){ cells += '<i></i>'; continue; }
    const ok = d.every(p => taken(k, p.id));
    cells += '<i class="' + (ok ? 'on' : 'miss') + '"></i>';
  }
  for(let i = 0; i < 400; i++){
    const k = shift(hoy, -i), d = dueList(k);
    if(!d.length) continue;
    if(d.every(p => taken(k, p.id))) racha++;
    else if(i > 0 || d.length){ rompe = true; break; }
    if(rompe) break;
  }

  const total = Object.keys(S.log).reduce((a,k) => a + Object.keys(S.log[k]).length, 0);

  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + human(hoy).toUpperCase() + '</div>' +
      '<h2>' + (due.length
        ? (hechas === due.length ? t('All done.','Todo hecho.')
                                 : t('%d of %d.','%d de %d.').replace('%d',hechas).replace('%d',due.length))
        : t('Nothing today.','Hoy no toca.')) + '</h2></div>' +

    '<div class="stats">' +
      '<div class="stat"><b>' + racha + '</b><span>' + t('day streak','días seguidos') + '</span></div>' +
      '<div class="stat"><b>' + total + '</b><span>' + t('logged','registros') + '</span></div>' +
      '<div class="stat"><b>' + S.plan.filter(p=>p.active).length + '</b><span>' + t('active','activas') + '</span></div>' +
    '</div>' +

    (due.length ? '<div class="card pad0" style="margin-top:14px">' + due.map(p => {
      const on = taken(hoy, p.id);
      return '<div class="dose' + (on ? ' done' : '') + '">' +
        '<button class="tick" data-tick="' + p.id + '">✓</button>' +
        '<div><div class="nm">' + esc2(p.c) + '</div>' +
          '<div class="mt">' + esc2(freqText(p)) + (p.time ? ' · ' + esc2(p.time) : '') + '</div></div>' +
        '<div class="rt"><b>' + esc2(p.dose) + ' ' + esc2(p.unit) + '</b>' +
          '<span>' + (on ? t('done','hecho') : t('pending','pendiente')) + '</span></div>' +
      '</div>';
    }).join('') + '</div>'
    : '<div class="card"><div class="empty"><b>' + t('Nothing scheduled for today','Hoy no hay nada programado') + '</b>' +
      '<span>' + t('Your protocols decide this, and you write them in Plan.',
                   'Esto lo deciden tus pautas, y las escribes tú en Plan.') + '</span></div></div>') +

    '<div class="card" style="margin-top:14px"><div class="ctitle">' +
      t('Last eight weeks','Últimas ocho semanas') + '</div>' +
      '<div class="streak">' + cells + '</div></div>' +

    '<div class="tips">' + tips().map(x =>
      '<div class="tip ' + x[0] + '"><div><div class="tt">' + x[1] + '</div>' +
      '<div class="td">' + x[2] + '</div></div></div>').join('') + '</div>' +
    ruo() + '</div>';
}

/* ---------- PLAN ---------- */
function vPlan(){
  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + t('PROTOCOLS','PAUTAS') + '</div>' +
      '<h2>' + t('Your plan.','Tu plan.') + '</h2>' +
      '<p>' + t('You write it. PepX does not propose, adjust or suggest a protocol — it remembers the one you entered and shows it back to you.',
                'Lo escribes tú. PepX no propone, no ajusta y no sugiere ninguna pauta — se acuerda de la que metiste y te la enseña.') + '</p></div>' +

    (S.plan.length ? '<div class="card pad0">' + S.plan.map(p =>
      '<div class="plan' + (p.active ? '' : ' off') + '">' +
        '<div class="bd"><div class="nm">' + esc2(p.c) + ' · ' + esc2(p.dose) + ' ' + esc2(p.unit) + '</div>' +
          '<div class="mt">' + esc2(freqText(p)) +
            (p.start ? ' · ' + t('from ','desde ') + human(p.start) : '') +
            (p.end   ? ' · ' + t('to ','hasta ')  + human(p.end)   : '') +
            (p.active ? '' : ' · ' + t('paused','en pausa')) + '</div>' +
          (p.notes ? '<div class="mt">' + esc2(p.notes) + '</div>' : '') + '</div>' +
        '<button class="abtn ghost sm" data-toggle="' + p.id + '">' +
          (p.active ? t('Pause','Pausar') : t('Resume','Reanudar')) + '</button>' +
        '<button class="x" data-del="' + p.id + '" aria-label="' + t('Delete','Borrar') + '">✕</button>' +
      '</div>').join('') + '</div>'
    : '<div class="card"><div class="empty"><b>' + t('No protocols yet','Todavía no hay pautas') + '</b>' +
      '<span>' + t('Add the first one below.','Añade la primera aquí abajo.') + '</span></div></div>') +

    '<div class="card" style="margin-top:14px"><div class="ctitle">' +
      t('Add a protocol','Añadir una pauta') + '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Compound','Compuesto') + '</label>' +
          '<input id="pxC" list="pxCL" placeholder="BPC-157"/>' + datalist() + '</div>' +
        '<div><label>' + t('Time','Hora') + '</label><input id="pxT" type="time"/></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Dose','Dosis') + '</label><input id="pxD" placeholder="250"/></div>' +
        '<div><label>' + t('Unit','Unidad') + '</label>' +
          '<select id="pxU"><option>mcg</option><option>mg</option><option>iu</option><option>ml</option></select></div>' +
      '</div>' +
      '<label>' + t('How often','Cada cuándo') + '</label>' +
      '<select id="pxF">' + FREQ.map(f => '<option value="' + f.v + '">' + t(f.en, f.es) + '</option>').join('') + '</select>' +
      '<div id="pxFX"></div>' +
      '<div class="row2">' +
        '<div><label>' + t('Start','Inicio') + '</label><input id="pxS" type="date" value="' + today() + '"/></div>' +
        '<div><label>' + t('End (optional)','Fin (opcional)') + '</label><input id="pxE" type="date"/></div>' +
      '</div>' +
      '<label>' + t('Notes','Notas') + '</label><textarea id="pxN" placeholder="' +
        t('Anything you want to remember about this protocol.','Lo que quieras recordar de esta pauta.') + '"></textarea>' +
      '<div class="acts2"><button class="abtn" id="pxAdd">' + t('Add','Añadir') + '</button></div>' +
    '</div>' + ruo() + '</div>';
}

function datalist(){
  let names = [];
  try{ Object.keys(LINES).forEach(k => LINES[k].products.forEach(p => names.push(p[1]))); }catch(e){}
  return '<datalist id="pxCL">' + names.map(n => '<option value="' + esc2(n) + '">').join('') + '</datalist>';
}

function freqExtra(v){
  const box = document.getElementById('pxFX');
  if(!box) return;
  if(v === 'dow'){
    box.innerHTML = '<label>' + t('Which days','Qué días') + '</label><div class="dow">' +
      DOW().map((d,i) => '<button type="button" data-d="' + i + '">' + d + '</button>').join('') + '</div>';
    box.querySelectorAll('[data-d]').forEach(b =>
      b.addEventListener('click', () => b.classList.toggle('on')));
  } else if(v === 'nd'){
    box.innerHTML = '<label>' + t('Every how many days','Cada cuántos días') + '</label>' +
      '<input id="pxEvery" type="number" min="1" value="3"/>';
  } else if(v === 'cyc'){
    box.innerHTML = '<div class="row2"><div><label>' + t('Days on','Días sí') + '</label>' +
      '<input id="pxOn" type="number" min="1" value="5"/></div><div><label>' + t('Days off','Días no') + '</label>' +
      '<input id="pxOff" type="number" min="0" value="2"/></div></div>';
  } else box.innerHTML = '';
}

/* ---------- PROGRESO ---------- */
function vProg(){
  const V = S.vitals.slice().sort((a,b) => a.d < b.d ? -1 : 1);
  const first = V[0], last = V[V.length-1];
  const delta = (first && last && first.peso && last.peso)
    ? (+last.peso - +first.peso) : null;

  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + t('PROGRESS','PROGRESO') + '</div>' +
      '<h2>' + t('What changed.','Qué cambió.') + '</h2>' +
      '<p>' + t('Numbers you measure yourself. Weekly is enough; monthly and the curve stops meaning anything.',
                'Números que mides tú. Con una vez por semana basta; una vez al mes y la curva deja de decir nada.') + '</p></div>' +

    (V.length >= 2 ? '<div class="card"><div class="ctitle">' + t('Weight','Peso') +
      (delta != null ? '  ·  ' + (delta > 0 ? '+' : '') + delta.toFixed(1) : '') + '</div>' +
      spark(V.map(v => +v.peso).filter(n => !isNaN(n))) + '</div>' : '') +

    '<div class="card"><div class="ctitle">' + t('Log a measurement','Registrar una medida') + '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Date','Fecha') + '</label><input id="pvD" type="date" value="' + today() + '"/></div>' +
        '<div><label>' + t('Weight','Peso') + '</label><input id="pvW" inputmode="decimal" placeholder="82.4"/></div>' +
      '</div>' +
      '<div class="row3">' +
        '<div><label>' + t('Waist','Cintura') + '</label><input id="pvC" inputmode="decimal"/></div>' +
        '<div><label>' + t('Sleep','Sueño') + '</label>' + sel('pvS') + '</div>' +
        '<div><label>' + t('Energy','Energía') + '</label>' + sel('pvE') + '</div>' +
      '</div>' +
      '<label>' + t('Note','Nota') + '</label><textarea id="pvN"></textarea>' +
      '<div class="acts2"><button class="abtn" id="pvAdd">' + t('Save','Guardar') + '</button></div>' +
    '</div>' +

    (V.length ? '<div class="card pad0" style="margin-top:14px">' + V.slice().reverse().map(v =>
      '<div class="dose"><div><div class="nm">' + human(v.d) + '</div>' +
        '<div class="mt">' +
          (v.peso ? esc2(v.peso) + t(' kg',' kg') : '') +
          (v.cintura ? ' · ' + esc2(v.cintura) + ' cm' : '') +
          (v.sueno ? ' · ' + t('sleep ','sueño ') + esc2(v.sueno) + '/5' : '') +
          (v.energia ? ' · ' + t('energy ','energía ') + esc2(v.energia) + '/5' : '') +
        '</div>' + (v.nota ? '<div class="mt">' + esc2(v.nota) + '</div>' : '') + '</div>' +
        '<button class="x" data-delv="' + v.d + '" style="margin-left:auto">✕</button></div>').join('') + '</div>' : '') +
    ruo() + '</div>';
}
function sel(id){
  return '<select id="' + id + '"><option value="">—</option>' +
    [1,2,3,4,5].map(n => '<option>' + n + '</option>').join('') + '</select>';
}

/* Una curva de verdad, no una decoración: eje mínimo, punto final marcado, y
   nada más. Se dibuja en SVG contra el rango real de los datos. */
function spark(vals){
  if(vals.length < 2) return '';
  const W = 600, H = 120, P = 10;
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const rg = (hi - lo) || 1;
  const X = i => P + i * (W - P*2) / (vals.length - 1);
  const Y = v => H - P - ((v - lo) / rg) * (H - P*2);
  let d = '', a = '';
  vals.forEach((v,i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; });
  a = 'M' + X(0).toFixed(1) + ' ' + (H-P) + ' ' + d.slice(1) + 'L' + X(vals.length-1).toFixed(1) + ' ' + (H-P) + 'Z';
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<line class="grid" x1="' + P + '" y1="' + (H-P) + '" x2="' + (W-P) + '" y2="' + (H-P) + '"/>' +
    '<path class="area" d="' + a + '"/><path d="' + d + '"/>' +
    '<circle cx="' + X(vals.length-1).toFixed(1) + '" cy="' + Y(vals[vals.length-1]).toFixed(1) + '" r="3"/>' +
  '</svg>';
}

/* ---------- INVENTARIO ---------- */
function vInv(){
  const hoy = today();
  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + t('INVENTORY','INVENTARIO') + '</div>' +
      '<h2>' + t('What you have.','Lo que tienes.') + '</h2>' +
      '<p>' + t('Vial, batch, dates. This is what lets PepX warn you before you run out — and what lets you answer which batch was which.',
                'Vial, lote, fechas. Esto es lo que permite avisarte antes de que se acabe, y lo que te deja responder qué lote fue cuál.') + '</p></div>' +

    (S.vials.length ? '<div class="card pad0">' + S.vials.map(v => {
      const rec = v.recon ? days(v.recon, hoy) : null;
      return '<div class="dose"><div><div class="nm">' + esc2(v.c) +
        (v.mg ? ' · ' + esc2(v.mg) : '') + '</div>' +
        '<div class="mt">' +
          (v.lote ? t('lot ','lote ') + esc2(v.lote) : '') +
          (rec != null ? ' · ' + rec + t(' d reconstituted',' d reconstituido') : '') +
          (v.exp ? ' · ' + t('exp ','cad ') + human(v.exp) : '') + '</div></div>' +
        '<div class="rt"><b>' + (v.quedan !== '' && v.quedan != null ? esc2(v.quedan) : '—') + '</b>' +
          '<span>' + t('doses left','dosis') + '</span></div>' +
        '<button class="x" data-delvial="' + v.id + '">✕</button></div>';
    }).join('') + '</div>'
    : '<div class="card"><div class="empty"><b>' + t('No vials logged','Sin viales registrados') + '</b>' +
      '<span>' + t('Add one and PepX can warn you before it runs out.',
                   'Añade uno y PepX podrá avisarte antes de que se acabe.') + '</span></div></div>') +

    '<div class="card" style="margin-top:14px"><div class="ctitle">' + t('Add a vial','Añadir un vial') + '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Compound','Compuesto') + '</label><input id="viC" list="pxCL"/>' + datalist() + '</div>' +
        '<div><label>' + t('Presentation','Presentación') + '</label><input id="viM" placeholder="10 mg"/></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Batch','Lote') + '</label><input id="viL" placeholder="L-2601-BC-01"/></div>' +
        '<div><label>' + t('Doses left','Dosis restantes') + '</label><input id="viQ" type="number" min="0"/></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Reconstituted','Reconstituido') + '</label><input id="viR" type="date"/></div>' +
        '<div><label>' + t('Expiry','Caducidad') + '</label><input id="viE" type="date"/></div>' +
      '</div>' +
      '<div class="acts2"><button class="abtn" id="viAdd">' + t('Add','Añadir') + '</button></div>' +
    '</div>' + ruo() + '</div>';
}

/* ---------- CUENTA ---------- */
const TIERS = [
  {id:'free', pr:'0',  en:'Free', es:'Gratis',
   f:[['Up to 2 protocols','Hasta 2 pautas'],
      ['Daily log and streak','Registro diario y racha'],
      ['30 days of history','30 días de histórico']]},
  {id:'pro',  pr:'9',  en:'Pro',  es:'Pro',
   f:[['Unlimited protocols','Pautas ilimitadas'],
      ['Progress charts','Curvas de progreso'],
      ['Inventory with batch and expiry','Inventario con lote y caducidad'],
      ['Full history and export','Histórico completo y exportación']]}
];

function vCta(){
  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + t('ACCOUNT','CUENTA') + '</div>' +
      '<h2>PepX.</h2>' +
      '<p>' + t('Everything you enter stays on this device. Nobody else sees it — not us either. Which also means that if you clear this browser, it is gone: export is the backup.',
                'Todo lo que metes se queda en este aparato. No lo ve nadie más — nosotros tampoco. Lo que también quiere decir que si borras este navegador, se borra: la exportación es la copia de seguridad.') + '</p></div>' +

    '<div class="tiers">' + TIERS.map(x =>
      '<div class="tier' + (S.sub.tier === x.id ? ' on' : '') + '">' +
        (S.sub.tier === x.id ? '<span class="cur">' + t('CURRENT','ACTUAL') + '</span>' : '') +
        '<div class="nm">' + t(x.en, x.es) + '</div>' +
        '<div class="pr">$' + x.pr + '<small> ' + t('/ month','/ mes') + '</small></div>' +
        '<ul>' + x.f.map(f => '<li>' + t(f[0], f[1]) + '</li>').join('') + '</ul>' +
        (S.sub.tier === x.id ? '' :
          '<div class="acts2"><a class="abtn wide" href="mailto:' + MAIL + '?subject=' +
          encodeURIComponent('PepX ' + t(x.en, x.es)) + '">' + t('Enquire','Consultar') + '</a></div>') +
      '</div>').join('') + '</div>' +

    '<div class="card" style="margin-top:16px"><div class="ctitle">' + t('Your data','Tus datos') + '</div>' +
      '<div class="acts2">' +
        '<button class="abtn ghost" id="pxExp">' + t('Export backup','Exportar copia') + '</button>' +
        '<button class="abtn ghost" id="pxImp">' + t('Import','Importar') + '</button>' +
        '<button class="abtn ghost" id="pxWipe">' + t('Erase everything','Borrar todo') + '</button>' +
      '</div>' +
      '<input type="file" id="pxFile" accept="application/json" style="display:none"/>' +
    '</div>' +

    '<div class="card" style="margin-top:14px"><div class="ctitle">' + t('Contact','Contacto') + '</div>' +
      '<a class="abtn ghost" href="mailto:' + MAIL + '">' + MAIL + '</a></div>' +

    ruo() + '</div>';
}

function ruo(){
  return '<div class="ruo">' +
    t('Research use only — not for human or veterinary use.','Solo uso en investigación — no para uso humano ni veterinario.') +
    '<br>' + t('PepX records what you enter. It does not recommend compounds, doses or schedules.',
               'PepX registra lo que tú introduces. No recomienda compuestos, dosis ni pautas.') +
  '</div>';
}

/* --------------------------------------------------------------------------
   6 · PINTAR Y ESCUCHAR
   -------------------------------------------------------------------------- */
function appHTML(){
  const v = S.tab === 'plan' ? vPlan() : S.tab === 'prog' ? vProg()
          : S.tab === 'inv'  ? vInv()  : S.tab === 'cta'  ? vCta() : vHoy();
  return '<section class="pxapp">' + headHTML() + tabsHTML() + v + '</section>';
}

function paint(){
  const app = document.getElementById('app');
  if(!app) return;
  app.innerHTML = appHTML();
  wire();
  try{ observeReveals(); }catch(e){}
}

const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };

function wire(){
  const root = document.querySelector('.pxapp');
  if(!root) return;

  root.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); paint();
      try{ lenis.scrollTo(0,{immediate:true}); }catch(e){ scrollTo(0,0); } }));

  /* marcar una dosis: se guarda con la hora real, no con la del plan */
  root.querySelectorAll('[data-tick]').forEach(b =>
    b.addEventListener('click', () => {
      const k = today(), id = b.dataset.tick;
      S.log[k] = S.log[k] || {};
      if(S.log[k][id]) delete S.log[k][id];
      else S.log[k][id] = {t:new Date().toTimeString().slice(0,5)};
      if(!Object.keys(S.log[k]).length) delete S.log[k];
      save(); paint();
    }));

  const f = document.getElementById('pxF');
  if(f){ freqExtra(f.value); f.addEventListener('change', () => freqExtra(f.value)); }

  const add = document.getElementById('pxAdd');
  if(add) add.addEventListener('click', () => {
    const c = val('pxC');
    if(!c){ document.getElementById('pxC').focus(); return; }
    const freq = val('pxF');
    const p = {id:uid(), c:c, dose:val('pxD'), unit:val('pxU'), freq:freq,
               time:val('pxT'), start:val('pxS') || today(), end:val('pxE'),
               notes:val('pxN'), active:true};
    if(freq === 'dow') p.dow = [...root.querySelectorAll('.dow .on')].map(b => +b.dataset.d);
    if(freq === 'nd')  p.every = val('pxEvery') || 3;
    if(freq === 'cyc'){ p.on = val('pxOn') || 5; p.off = val('pxOff') || 2; }

    /* El límite del plan gratuito es una puerta, no una caja fuerte: vive en el
       navegador del usuario y cualquiera que sepa abrir la consola lo salta.
       Está aquí porque comunica el producto, no porque proteja nada. Cobrar de
       verdad exige que la cuenta viva en un servidor. */
    if(S.sub.tier === 'free' && S.plan.length >= 2){
      alert(t('The free plan holds two protocols. Account has the rest.',
              'El plan gratuito guarda dos pautas. En Cuenta está el resto.'));
      S.tab = 'cta'; save(); paint(); return;
    }
    S.plan.push(p); save(); paint();
  });

  root.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => {
      S.plan = S.plan.filter(p => p.id !== b.dataset.del); save(); paint(); }));
  root.querySelectorAll('[data-toggle]').forEach(b =>
    b.addEventListener('click', () => {
      const p = S.plan.filter(x => x.id === b.dataset.toggle)[0];
      if(p) p.active = !p.active; save(); paint(); }));

  const pv = document.getElementById('pvAdd');
  if(pv) pv.addEventListener('click', () => {
    const d = val('pvD') || today();
    const rec = {d:d, peso:val('pvW'), cintura:val('pvC'),
                 sueno:val('pvS'), energia:val('pvE'), nota:val('pvN')};
    if(!rec.peso && !rec.cintura && !rec.sueno && !rec.energia && !rec.nota) return;
    S.vitals = S.vitals.filter(v => v.d !== d);   /* una medida por día */
    S.vitals.push(rec);
    S.vitals.sort((a,b) => a.d < b.d ? -1 : 1);
    save(); paint();
  });
  root.querySelectorAll('[data-delv]').forEach(b =>
    b.addEventListener('click', () => {
      S.vitals = S.vitals.filter(v => v.d !== b.dataset.delv); save(); paint(); }));

  const vi = document.getElementById('viAdd');
  if(vi) vi.addEventListener('click', () => {
    const c = val('viC');
    if(!c){ document.getElementById('viC').focus(); return; }
    S.vials.push({id:uid(), c:c, mg:val('viM'), lote:val('viL'),
                  quedan:val('viQ'), recon:val('viR'), exp:val('viE')});
    save(); paint();
  });
  root.querySelectorAll('[data-delvial]').forEach(b =>
    b.addEventListener('click', () => {
      S.vials = S.vials.filter(v => v.id !== b.dataset.delvial); save(); paint(); }));

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
          if(d && typeof d === 'object'){ S = Object.assign({}, BLANK, d); save(); paint(); }
        }catch(e){ alert(t('That file could not be read.','No se pudo leer ese archivo.')); }
      };
      r.readAsText(fl);
    });
  }
  const wipe = document.getElementById('pxWipe');
  if(wipe) wipe.addEventListener('click', () => {
    if(!confirm(t('This erases every protocol, log, measurement and vial on this device. There is no undo.',
                  'Esto borra todas las pautas, registros, medidas y viales de este aparato. No se puede deshacer.'))) return;
    S = JSON.parse(JSON.stringify(BLANK)); save(); paint();
  });
}

/* --------------------------------------------------------------------------
   7 · LA PUERTA

   La app tenía salida y no tenía entrada: a #/app sólo se llegaba escribiéndolo.
   Una aplicación a la que hay que saber llegar no existe.

   Va la última de la barra, después de las cuatro de la tienda, porque no es
   una sección del catálogo: es lo otro que hay aquí. Y lleva NUEVO, que no
   parpadea — lo nuevo se nota por estar.

   La instala esta capa y no la del catálogo: el catálogo trata del catálogo.
   -------------------------------------------------------------------------- */
function door(){
  const links = document.querySelector('nav .links');
  /* buildNav() reescribe el innerHTML entero; hasta que no ha corrido, poner
     algo aquí es ponerlo para que lo borren. `__px` es su bandera de hecho. */
  if(links && links.__px && !links.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door';
    a.href = '#/app';
    a.setAttribute('data-nav','');
    a.setAttribute('data-route','/app');
    a.setAttribute('data-en','PepX');
    a.setAttribute('data-es','PepX');
    a.innerHTML = 'PepX<span class="nw">' + t('NEW','NUEVO') + '</span>';
    links.appendChild(a);
  }
  const inner = document.querySelector('#mmenu .inner');
  if(inner && !inner.querySelector('.px-door')){
    const a = document.createElement('a');
    a.className = 'px-door';
    a.href = '#/app';
    a.setAttribute('data-nav','');
    a.setAttribute('data-en','PepX · the app');
    a.setAttribute('data-es','PepX · la app');
    a.textContent = t('PepX · the app','PepX · la app');
    inner.appendChild(a);
  }
}
door();
/* La barra la construye otra capa y no avisa de cuándo. Se mira unas cuantas
   veces al principio y se deja de mirar: un intervalo eterno para colgar un
   enlace es un intervalo eterno. */
let doorTries = 0;
const doorTimer = setInterval(() => {
  door();
  const l = document.querySelector('nav .links');
  if(++doorTries > 40 || (l && l.querySelector('.px-door'))) clearInterval(doorTimer);
}, 250);

/* --------------------------------------------------------------------------
   8 · LA RUTA

   render() del fichero base no conoce /app. Se envuelve igual que /pens: si la
   ruta es ésta se pinta aquí, y si no, sigue su camino.
   -------------------------------------------------------------------------- */
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
  document.documentElement.classList.remove('px-app');
  return _render(route, defer);
};

/* El arranque pinta la ruta con el render original, antes de que esto exista.
   Si se entró directamente por #/app, hay que repintar. */
try{ if(currentRoute().replace('/','') === 'app') render(currentRoute()); }catch(e){}

/* el arnés mira por aquí; el sitio nunca */
window.__pepx = {state: () => S, paint: paint, dueOn: dueOn, tips: tips};

})();

/* ============================================================================
   PepX — LA APLICACIÓN

   Vive en #/app, dentro del mismo fichero que la tienda, y es lo contrario de
   la tienda: negra, densa, y pensada para abrirse todos los días en un minuto.

   ---------------------------------------------------------------------------
   DOC.PEPS — QUÉ LEE Y QUÉ NO
   ---------------------------------------------------------------------------

   Doc.Peps es el agente que habla dentro de la aplicación. Lee UNA cosa: el
   registro que el usuario ha escrito. Y dice lo que de ahí se puede sacar
   contando:

       «tu media de FCR en catorce días es 70 bpm, sobre nueve medidas»
       «del primer registro al último, de 74 a 67»
       «cobertura: nueve de catorce días»
       «llevas seis días sin apuntar nada de lo que tocaba»
       «a este vial le quedan dos dosis; con tu frecuencia se acaba el jueves»
       «este vial lleva treinta y un días reconstituido»

   Y hay una frase que no dirá nunca, aunque la app de referencia la diga:

       «excelente tendencia a la baja, probablemente por el efecto
        cardioprotector de la tirzepatida»

   Eso no es leer un registro: es atribuirle a un compuesto un efecto
   fisiológico en una persona concreta. Es un juicio clínico, lo hace un
   profesional con la persona delante, y ponerlo en boca de un agente de una
   marca que vende material de investigación es exactamente la frase por la que
   se acaba en un juzgado. Doc.Peps describe el número. No explica el cuerpo, no
   señala una causa y no propone un cambio.

   La regla operativa, para quien toque este fichero dentro de un año:

       ✓ contar, medir, comparar contra lo que el propio usuario escribió
       ✓ avisar de fechas, existencias y huecos en el registro
       ✗ decir qué tomar, cuánto, cada cuánto o hasta cuándo
       ✗ atribuir un cambio en una medida a un compuesto
       ✗ interpretar un valor como bueno o malo para la salud de alguien

   La calculadora es aritmética sobre números que pone el usuario: convierte la
   dosis que él ya escribió a las marcas de su jeringa. No propone una dosis.
   La vida media también la escribe él, sacada del COA o de la literatura que
   maneje: la aplicación no publica valores farmacocinéticos, sólo dibuja la
   curva de lo que le han dado.

   ---------------------------------------------------------------------------
   TODO ES DEL TELÉFONO
   ---------------------------------------------------------------------------

   No hay servidor. El plan, el registro, las medidas, el inventario y las zonas
   viven en localStorage del propio aparato. Eso tiene dos consecuencias que
   conviene decir en voz alta: nadie más los ve —nosotros tampoco—, y si se
   borra el navegador se borran. Por eso la exportación a JSON no es un extra:
   es la copia de seguridad, y está en Cuenta.
   ============================================================================ */
(function(){
'use strict';

const KEY  = 'pepx-app-v1';
const MAIL = 'official.peptidex@outlook.com';

/* --------------------------------------------------------------------------
   1 · EL ESTADO
   -------------------------------------------------------------------------- */
const BLANK = {
  plan:   [],   /* pautas del usuario */
  log:    {},   /* 'YYYY-MM-DD': { planId: {t:hora} } */
  vitals: [],   /* { d, rhr, peso, pasos, grasa, sueno, cintura, energia, animo, nota } */
  vials:  [],   /* { id, c, mg, lote, recon, exp, quedan } */
  sites:  [],   /* { id, d, z, c }  — dónde fue la última, para poder rotar */
  hl:     {},   /* { compuesto: horas }  — la vida media la escribe el usuario */
  calc:   {},   /* lo último que se calculó, para no reescribirlo cada vez */
  win:    14,   /* la ventana de Datos, en días */
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
const MON = () => t('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec',
                    'ene feb mar abr may jun jul ago sep oct nov dic').split(' ');
function human(k){
  const d = parse(k), hoy = today();
  if(k === hoy) return t('today','hoy');
  if(k === shift(hoy,-1)) return t('yesterday','ayer');
  if(k === shift(hoy, 1)) return t('tomorrow','mañana');
  return d.getDate() + ' ' + MON()[d.getMonth()];
}
function longDate(k){
  const d = parse(k);
  const D = t('Sun,Mon,Tue,Wed,Thu,Fri,Sat','dom,lun,mar,mié,jue,vie,sáb').split(',');
  return D[d.getDay()] + ', ' + d.getDate() + ' ' + MON()[d.getMonth()];
}
const DOW = () => t('M,T,W,T,F,S,S','L,M,X,J,V,S,D').split(',');
const DOW3 = () => t('Mon,Tue,Wed,Thu,Fri,Sat,Sun','lun,mar,mié,jue,vie,sáb,dom').split(',');

/* el saludo, por la hora del reloj del aparato */
function greet(){
  const h = new Date().getHours();
  if(h < 6)  return t('Good night','Buenas noches');
  if(h < 12) return t('Good morning','Buenos días');
  if(h < 20) return t('Good afternoon','Buenas tardes');
  return t('Good evening','Buenas noches');
}

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
    case 'dow': return (p.dow||[]).map(i => DOW3()[i]).join(' · ') || t('no days','sin días');
    case 'nd':  return t('every ','cada ') + (p.every||1) + t(' days',' días');
    case 'cyc': return (p.on||1) + t(' on / ',' sí / ') + (p.off||0) + t(' off',' no');
  }
  return '';
}
/* dosis por semana, para estimar cuánto dura un vial */
function perWeek(p){
  switch(p.freq){
    case 'd':   return 7;
    case 'alt': return 3.5;
    case 'dow': return (p.dow||[]).length;
    case 'nd':  return 7 / Math.max(1, +p.every || 1);
    case 'cyc': {
      const on = Math.max(1,+p.on||1), off = Math.max(0,+p.off||0);
      return 7 * on / (on + off);
    }
  }
  return 0;
}

/* --------------------------------------------------------------------------
   4 · LAS CONSTANTES QUE SE MIDEN

   `dir` dice hacia dónde apunta la flecha del distintivo, y NO dice si eso es
   bueno: bajar de peso y bajar de FCR se pintan igual porque son movimientos
   del número, no juicios sobre nadie. `col` dice si la forma correcta es una
   columna desde cero (una cuenta: pasos, horas) o una línea (un valor con un
   recorrido estrecho: FCR, peso, cintura). Poner FCR en columnas desde cero da
   siete barras idénticas; poner pasos en línea sugiere que 0 pasos y 12.000
   están a la misma distancia que 11.000 y 12.000. La forma la manda el dato.
   -------------------------------------------------------------------------- */
const IC = {
  rhr:'<path d="M20.8 8.6a4.6 4.6 0 0 0-8.8-1.7 4.6 4.6 0 0 0-8.8 1.7C3.2 13 12 19.5 12 19.5s8.8-6.5 8.8-10.9z"/>',
  peso:'<circle cx="12" cy="12" r="9"/><path d="M12 12l4-4.5"/>',
  pasos:'<path d="M6.5 20v-8.5a3 3 0 0 1 6 0V14"/><path d="M12.5 20v-4.5a3 3 0 0 1 6 0V20"/>',
  grasa:'<circle cx="12" cy="4.6" r="2.4"/><path d="M6 21v-6.5L4 11l3-2h10l3 2-2 3.5V21"/>',
  sueno:'<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>',
  cintura:'<rect x="2.5" y="8.5" width="19" height="7" rx="2"/><path d="M7 8.5v2.6M12 8.5v3.4M17 8.5v2.6"/>',
  energia:'<path d="M13.5 2.5L4.5 14h6l-1 7.5 9-11.5h-6z"/>'
};

const METRICS = [
  {id:'rhr', u:'bpm', col:false, dec:0,
   en:'Resting Heart Rate', es:'Frecuencia en reposo',
   sh:{en:'RHR', es:'FCR'},
   de:{en:'Your resting heart rate across the period, as you entered it.',
       es:'Tu frecuencia cardíaca en reposo a lo largo del periodo, tal y como la escribiste.'}},
  {id:'peso', u:'kg', col:false, dec:1,
   en:'Weight', es:'Peso', sh:{en:'Weight', es:'Peso'},
   de:{en:'Weight over the period. Weigh at the same time of day or the curve measures your schedule, not you.',
       es:'El peso durante el periodo. Pésate a la misma hora o la curva mide tu horario, no a ti.'}},
  {id:'pasos', u:'', col:true, dec:0,
   en:'Steps', es:'Pasos', sh:{en:'Steps', es:'Pasos'},
   de:{en:'Steps per day. Bars start at zero because a count does.',
       es:'Pasos por día. Las barras arrancan en cero porque una cuenta arranca en cero.'}},
  {id:'grasa', u:'%', col:false, dec:1,
   en:'Body Fat', es:'Grasa corporal', sh:{en:'Body fat', es:'Grasa'},
   de:{en:'Body fat percentage, from whatever instrument you use. Keep using the same one.',
       es:'Porcentaje de grasa, con el instrumento que uses. Sigue usando el mismo.'}},
  {id:'sueno', u:'h', col:true, dec:1,
   en:'Sleep', es:'Sueño', sh:{en:'Sleep', es:'Sueño'},
   de:{en:'Hours slept per night. Bars start at zero because hours are a count.',
       es:'Horas de sueño por noche. Las barras arrancan en cero porque las horas se cuentan.'}},
  {id:'cintura', u:'cm', col:false, dec:1,
   en:'Waist', es:'Cintura', sh:{en:'Waist', es:'Cintura'},
   de:{en:'Waist measurement. Same height, same time, same breath out.',
       es:'Medida de cintura. Misma altura, misma hora, mismo aire fuera.'}},
  {id:'energia', u:'/5', col:true, dec:1,
   en:'Energy', es:'Energía', sh:{en:'Energy', es:'Energía'},
   de:{en:'How you rated your energy, one to five.',
       es:'Cómo puntuaste tu energía, del uno al cinco.'}}
];

const mName  = m => t(m.en, m.es);
const mShort = m => t(m.sh.en, m.sh.es);

/* los puntos de una constante dentro de una ventana, en orden */
function series(id, win){
  const from = shift(today(), -(win-1));
  return S.vitals
    .filter(v => v.d >= from && v[id] !== '' && v[id] != null && !isNaN(+v[id]))
    .map(v => ({d:v.d, v:+v[id]}))
    .sort((a,b) => a.d < b.d ? -1 : 1);
}

/* --------------------------------------------------------------------------
   5 · NÚMEROS
   -------------------------------------------------------------------------- */
function nf(v, dec){
  if(v == null || isNaN(v)) return '—';
  const s = (+v).toFixed(dec == null ? 1 : dec);
  return s.replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
/* miles compactos para las fichas redondas: 7.412 pasos no cabe en 78 px */
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

const esc2 = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* --------------------------------------------------------------------------
   6 · DOC.PEPS

   Cada frase de aquí abajo se puede comprobar contando lo que hay en S. Si
   alguna vez una frase de esta sección necesita saber algo que el usuario no
   escribió, esa frase está mal y no va aquí.
   -------------------------------------------------------------------------- */
const SPARK = '<span class="sp"><svg viewBox="0 0 24 24">' +
  '<path d="M12 2.4l1.85 5.6 5.6 1.85-5.6 1.85L12 17.3l-1.85-5.6-5.6-1.85 5.6-1.85z"/>' +
  '<path d="M18.6 15.4l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" opacity=".65"/>' +
  '</svg></span>';

function dpBlock(paras, big){
  const body = '<div class="dp">' + SPARK + '<div class="bd">' +
    '<div class="who">Doc.Peps</div>' +
    paras.map(p => '<p>' + p + '</p>').join('') + '</div></div>';
  if(!big) return body;
  return '<div class="dpbig">' + body + '<div class="foot">' +
    t('Doc.Peps reads your log — the numbers you entered. It does not interpret your body, does not attribute any change to any compound, and does not tell you what to take, how much or how often.',
      'Doc.Peps lee tu registro — los números que metiste tú. No interpreta tu cuerpo, no atribuye ningún cambio a ningún compuesto, y no te dice qué tomar, cuánto ni cada cuándo.') +
  '</div></div>';
}

/* Lo que dice de UNA constante. Media, recorrido, cobertura, y una cautela
   cuando hay tan pocos puntos que hablar de tendencia sería inventar. */
function dpMetric(m, pts, win){
  if(!pts.length) return null;
  const vs = pts.map(p => p.v);
  const avg = mean(vs), a = vs[0], b = vs[vs.length-1];
  const P = [];

  if(pts.length === 1){
    P.push(t('One measurement in this window: <b>%v %u</b> on %d. A second one turns a number into a direction.',
             'Una sola medida en esta ventana: <b>%v %u</b> el %d. Con una segunda, el número pasa a ser una dirección.')
      .replace('%v', nf(a, m.dec)).replace('%u', m.u).replace('%d', human(pts[0].d)));
    return P;
  }

  P.push(t('Average <b>%a %u</b> over %n measurements.',
           'Media <b>%a %u</b> sobre %n medidas.')
    .replace('%a', nf(avg, m.dec)).replace('%u', m.u).replace('%n', pts.length));

  const d = b - a;
  const rel = Math.abs(a) > 0 ? Math.abs(d / a) : 0;
  if(rel < 0.01 || Math.abs(d) < Math.pow(10, -(m.dec||0)) / 2){
    P.push(t('First to last, no movement worth reading: %a → %b.',
             'Del primero al último, sin movimiento apreciable: %a → %b.')
      .replace('%a', nf(a, m.dec)).replace('%b', nf(b, m.dec)));
  } else {
    P.push(t('First to last, %a → %b (<b>%s%d %u</b>).',
             'Del primero al último, %a → %b (<b>%s%d %u</b>).')
      .replace('%a', nf(a, m.dec)).replace('%b', nf(b, m.dec))
      .replace('%s', d > 0 ? '+' : '−').replace('%d', nf(Math.abs(d), m.dec))
      .replace('%u', m.u));
  }

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

/* Lo que dice al abrir la aplicación: una línea sobre el día. */
function dpToday(){
  const hoy = today(), due = dueList(hoy);
  const hechas = due.filter(p => taken(hoy, p.id)).length;
  const P = [];

  if(!S.plan.length){
    P.push(t('Nothing to remember yet. Write your first protocol in <b>Plan</b> — the compound, the dose and how often are yours to decide; from then on I keep the count.',
             'Todavía no hay nada que recordar. Escribe tu primera pauta en <b>Plan</b> — el compuesto, la dosis y la frecuencia los decides tú; a partir de ahí llevo yo la cuenta.'));
    return P;
  }
  if(due.length && hechas === due.length)
    P.push(t('Everything scheduled for today is logged.','Todo lo programado para hoy está registrado.'));
  else if(due.length)
    P.push(t('<b>%h of %d</b> logged today.','<b>%h de %d</b> registrado hoy.')
      .replace('%h', hechas).replace('%d', due.length));
  else
    P.push(t('Nothing scheduled today by your own plan.','Hoy no toca nada según tu propio plan.'));

  /* qué falta por medir esta semana */
  const sem = shift(hoy, -6);
  const faltan = METRICS.filter(m => !S.vitals.some(v => v.d >= sem && v[m.id] !== '' && v[m.id] != null));
  if(faltan.length && faltan.length < METRICS.length)
    P.push(t('Not measured this week: %l.','Sin medir esta semana: %l.')
      .replace('%l', faltan.map(m => mShort(m).toLowerCase()).join(', ')));

  return P;
}

/* El bloque grande de Datos: de qué se está hablando y con cuánto. */
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

/* --------------------------------------------------------------------------
   7 · LOS AVISOS

   Cada uno sale de un hecho que se puede contar. Ninguno opina sobre la pauta.
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
    const k = shift(hoy, -i), due = dueList(k);
    if(!due.length) continue;
    if(due.some(p => taken(k, p.id))) break;
    gap++;
  }
  if(gap >= 3)
    out.push(['w', t('%d days without a record','%d días sin registrar').replace('%d', gap),
      t('A log with holes is worth less than a short one that is complete. Fill them in from the day itself.',
        'Un registro con huecos vale menos que uno corto y completo. Rellénalos desde el propio día.')]);

  if(!S.vitals.length)
    out.push(['', t('No baseline yet','Sin punto de partida'),
      t('Log a weight in Data. Without a first measurement there is nothing to compare against later.',
        'Registra un peso en Datos. Sin una primera medida no hay contra qué comparar después.')]);
  else {
    const last = S.vitals[S.vitals.length-1].d, dd = days(last, hoy);
    if(dd >= 21)
      out.push(['w', t('%d days since your last measurement','%d días desde tu última medida').replace('%d', dd),
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
      out.push([+v.quedan <= 1 ? 'b' : 'w',
        t('%s: %n doses left','%s: quedan %n dosis').replace('%s', v.c).replace('%n', v.quedan),
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
        t('%s: expiry %e','%s: caducidad %e').replace('%s', v.c).replace('%e', human(v.exp)),
        t('Past the date it does not go in the log — it goes in the bin.',
          'Pasada la fecha no va al registro: va a la basura.')]);
  });

  /* rotación de zonas: repetir la misma es un hecho contable, no un consejo */
  if(S.sites.length >= 3){
    const ult = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1).slice(0,3);
    if(ult[0].z === ult[1].z && ult[1].z === ult[2].z)
      out.push(['w', t('Same site three times running','La misma zona tres veces seguidas'),
        t('Your last three entries are all %z.','Tus tres últimos registros son todos %z.')
          .replace('%z', zName(ult[0].z))]);
  }

  if(!out.length)
    out.push(['', t('Everything up to date','Todo al día'),
      t('Nothing to flag. Keep logging.','No hay nada que señalar. Sigue registrando.')]);
  return out;
}

/* --------------------------------------------------------------------------
   8 · LAS GRÁFICAS

   Marcas finas, rejilla que se retira, ni un número encima de cada punto. La
   forma la elige el dato: columna desde cero para lo que se cuenta, línea para
   lo que se recorre. Las dos comparten la misma anatomía de ficha para que la
   pantalla se lea como una sola cosa.
   -------------------------------------------------------------------------- */
const CW = 620;

/* Barra con la punta redondeada y la base cuadrada, anclada a la línea de cero.
   Los argumentos entran como NÚMEROS y el redondeo se hace aquí dentro: pasar
   ya `.toFixed(1)` desde fuera convertía `y + h` en una concatenación de
   cadenas — «36.8» + «75.2» salía «36.875.2» y el trazado entero se caía. */
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

/* COLUMNAS — para lo que se cuenta. Base en cero, siempre. */
function cols(pts, win, m){
  const H = 136, PT = 14, PB = 24;
  const from = shift(today(), -(win-1));
  const slots = [];
  for(let i = 0; i < win; i++) slots.push(shift(from, i));
  const byDay = {}; pts.forEach(p => byDay[p.d] = p.v);

  const hi = mx(pts.map(p => p.v)) || 1;
  const top = hi * 1.14;
  const band = CW / win;
  const bw = Math.max(3, Math.min(24, band - 4));   /* 2 px de hueco por lado */
  const Y = v => PT + (1 - v/top) * (H - PT - PB);
  const avg = mean(pts.map(p => p.v));

  let g = '';
  slots.forEach((k, i) => {
    const v = byDay[k];
    if(v == null) return;
    const x = i*band + (band-bw)/2, y = Y(v);
    g += '<path class="bar" d="' + barPath(x, y, bw, H-PB-y, 4) + '"/>';
  });
  /* la media, como una referencia fina — no es rejilla, es una anotación */
  g += '<line class="rule" x1="0" y1="' + Y(avg).toFixed(1) + '" x2="' + CW +
       '" y2="' + Y(avg).toFixed(1) + '"/>';
  g += '<line class="rule" x1="0" y1="' + (H-PB) + '" x2="' + CW + '" y2="' + (H-PB) + '"/>';
  g += axis(slots, win, H, band);
  return '<svg class="bars" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
         'role="img" aria-label="' + esc2(mName(m)) + '">' + g + '</svg>';
}

/* LÍNEA — para lo que se recorre en un margen estrecho. */
function line(pts, win, m){
  const H = 136, PT = 16, PB = 24;
  const from = shift(today(), -(win-1));
  const vs = pts.map(p => p.v);
  const lo = mn(vs), hi = mx(vs), span = (hi - lo) || Math.max(1, Math.abs(hi)*.04);
  const top = hi + span*.28, bot = lo - span*.28;
  const band = CW / win;
  const X = k => (days(from, k) + .5) * band;
  const Y = v => PT + (1 - (v-bot)/(top-bot)) * (H - PT - PB);
  const avg = mean(vs);

  /* SIN RELLENO BAJO LA CURVA, Y A PROPÓSITO

     Una frecuencia en reposo que se mueve entre 67 y 74 no se puede dibujar
     desde cero: saldrían siete puntos pegados. Así que este eje está truncado,
     y en un eje truncado el área bajo la curva no mide nada — el suelo es una
     cifra elegida, no el cero. Rellenarla infla visualmente una diferencia de
     siete latidos hasta que parece un desplome.

     La curva de vida media sí arranca en cero, y por eso allí el relleno sí
     está y aquí no. */
  let d = '';
  pts.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' '; });

  let g = '<line class="rule" x1="0" y1="' + Y(avg).toFixed(1) + '" x2="' + CW +
          '" y2="' + Y(avg).toFixed(1) + '"/>';
  g += '<path class="ln" d="' + d + '"/>';
  /* sólo se marca el extremo: un punto en cada valor es ruido */
  const last = pts[pts.length-1];
  g += '<circle class="dot" cx="' + X(last.d).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) +
       '" r="4.5"/>';
  g += '<line class="rule" x1="0" y1="' + (H-PB) + '" x2="' + CW + '" y2="' + (H-PB) + '"/>';
  const slots = []; for(let i = 0; i < win; i++) slots.push(shift(from, i));
  g += axis(slots, win, H, band);
  /* preserveAspectRatio="none" estiraría el trazo; aquí sí se conserva */
  return '<svg class="bars" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
         'role="img" aria-label="' + esc2(mName(m)) + '">' +
         '<style>.ln{stroke:var(--s1)}.dot{fill:var(--s1)}</style>' + g + '</svg>';
}

/* El eje de abajo. Con catorce días o menos caben las iniciales; con más, tres
   fechas. Un eje ilegible no es un eje, es una textura. */
function axis(slots, win, H, band){
  let g = '';
  if(win <= 14){
    const L = DOW();
    slots.forEach((k, i) => {
      const w = (parse(k).getDay()+6) % 7;
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-8) +
           '" text-anchor="middle">' + L[w] + '</text>';
    });
  } else {
    [0, Math.floor(win/2), win-1].forEach((i, j) => {
      const k = slots[i], d = parse(k);
      g += '<text class="axt" x="' + (i*band + band/2).toFixed(1) + '" y="' + (H-8) +
           '" text-anchor="' + (j === 0 ? 'start' : j === 2 ? 'end' : 'middle') + '">' +
           d.getDate() + ' ' + MON()[d.getMonth()] + '</text>';
    });
  }
  return g;
}

/* La curvita de la portada. También sin relleno, y por lo mismo: su escala va
   del mínimo al máximo de los datos, no de cero. */
function spark(vals){
  if(vals.length < 2) return '';
  const W = 600, H = 54, P = 8;
  const lo = mn(vals), hi = mx(vals), rg = (hi-lo) || 1;
  const X = i => P + i * (W - P*2) / (vals.length - 1);
  const Y = v => H - P - ((v-lo)/rg) * (H - P*2);
  let d = '';
  vals.forEach((v,i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; });
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path class="ln" d="' + d + '"/>' +
    '<circle class="dot" cx="' + X(vals.length-1).toFixed(1) + '" cy="' +
      Y(vals[vals.length-1]).toFixed(1) + '" r="4"/></svg>';
}

/* el distintivo de tendencia: flecha Y palabra, nunca sólo color */
const AR = {
  dn:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  fl:'<path d="M5 12h14"/>'
};
function trendChip(pts, m){
  if(pts.length < 2) return '';
  const a = pts[0].v, b = pts[pts.length-1].v, d = b - a;
  const rel = Math.abs(a) > 0 ? Math.abs(d/a) : 0;
  const k = rel < 0.01 ? 'fl' : (d < 0 ? 'dn' : 'up');
  const w = k === 'fl' ? t('Steady','Estable')
          : (d < 0 ? t('Down','Bajando') : t('Up','Subiendo'));
  const amt = k === 'fl' ? '' : ' ' + (d > 0 ? '+' : '−') + nf(Math.abs(d), m.dec) +
              (m.u ? ' ' + m.u : '');
  return '<span class="trend ' + k + '"><svg viewBox="0 0 24 24">' + AR[k] + '</svg>' +
         w + amt + '</span>';
}

/* --------------------------------------------------------------------------
   9 · LA APLICACIÓN — PANTALLAS
   -------------------------------------------------------------------------- */
const TABS = [
  {id:'hoy',  en:'Today', es:'Hoy',
   ic:'<path d="M3 8h18M7 3v3m10-3v3"/><rect x="3" y="5" width="18" height="16" rx="3"/>'},
  {id:'plan', en:'Plan',  es:'Plan',
   ic:'<path d="M4 6h16M4 12h16M4 18h10"/>'},
  {id:'dat',  en:'Data',  es:'Datos',
   ic:'<path d="M4 18l5-6 4 4 7-9"/>'},
  {id:'lab',  en:'Lab',   es:'Lab',
   ic:'<path d="M9 3v6.5L4.2 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.8-3L15 9.5V3"/><path d="M8 3h8"/>'},
  {id:'cta',  en:'Account', es:'Cuenta',
   ic:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>'}
];

function tabsHTML(){
  return '<div class="ptabs">' + TABS.map(x =>
    '<button data-tab="' + x.id + '"' + (S.tab === x.id ? ' class="on"' : '') + '>' +
      '<svg viewBox="0 0 24 24">' + x.ic + '</svg><span>' + t(x.en, x.es) + '</span>' +
    '</button>').join('') + '</div>';
}

function headHTML(){
  const pro = S.sub.tier !== 'free';
  return '<div class="abar"><div class="in">' +
    '<span class="brandx"><b>PepX</b><i>' + t('by PEPTIDEX','de PEPTIDEX') + '</i></span>' +
    '<span style="display:flex;align-items:center;gap:16px">' +
      '<a class="back" href="#/" data-nav data-href="#/">← ' + t('Store','Tienda') + '</a>' +
      '<span class="tierchip' + (pro ? ' pro' : '') + '">' +
        (pro ? esc2(S.sub.tier).toUpperCase() : t('FREE','GRATIS')) + '</span>' +
    '</span>' +
  '</div></div>';
}

/* ---------- HOY ----------------------------------------------------------- */
const FACES = {
  5:'<circle cx="12" cy="12" r="9"/><path d="M7.6 13.6s1.6 2.6 4.4 2.6 4.4-2.6 4.4-2.6"/><path d="M9 9.4h.01M15 9.4h.01"/>',
  4:'<circle cx="12" cy="12" r="9"/><path d="M8.4 14s1.4 1.7 3.6 1.7 3.6-1.7 3.6-1.7"/><path d="M9 9.4h.01M15 9.4h.01"/>',
  3:'<circle cx="12" cy="12" r="9"/><path d="M8.6 14.8h6.8"/><path d="M9 9.4h.01M15 9.4h.01"/>',
  2:'<circle cx="12" cy="12" r="9"/><path d="M8.4 15.8s1.4-1.7 3.6-1.7 3.6 1.7 3.6 1.7"/><path d="M9 9.4h.01M15 9.4h.01"/>',
  1:'<circle cx="12" cy="12" r="9"/><path d="M7.6 16.4s1.6-2.6 4.4-2.6 4.4 2.6 4.4 2.6"/><path d="M9 9.4h.01M15 9.4h.01"/>',
  0:'<circle cx="12" cy="12" r="9"/><path d="M8.6 14.8h6.8"/><path d="M9 9.4h.01M15 9.4h.01"/>'
};

function chipsHTML(){
  const hoy = today();
  return '<div class="dials">' + METRICS.map(m => {
    /* el último valor de los últimos 14 días; más atrás ya no es «ahora» */
    let v = null;
    for(let i = 0; i < 14; i++){
      const k = shift(hoy, -i);
      const r = S.vitals.filter(x => x.d === k)[0];
      if(r && r[m.id] !== '' && r[m.id] != null && !isNaN(+r[m.id])){ v = +r[m.id]; break; }
    }
    return '<button class="dial' + (v == null ? ' none' : '') + '" data-chip="' + m.id + '">' +
      '<span class="ring"><svg viewBox="0 0 24 24">' + IC[m.id] + '</svg>' +
      '<b>' + (v == null ? '—' : compact(v)) + '</b></span>' +
      '<span>' + esc2(mShort(m)) + '</span></button>';
  }).join('') + '</div>';
}

function moodHTML(){
  const hoy = today();
  let g = '';
  for(let i = 6; i >= 0; i--){
    const k = shift(hoy, -i), d = parse(k);
    const r = S.vitals.filter(x => x.d === k)[0];
    const v = r && r.animo ? +r.animo : 0;
    const log = !!(S.log[k] && Object.keys(S.log[k]).length);
    g += '<button class="mday v' + v + (k === hoy ? ' hoy' : '') + (log ? ' log' : '') +
      '" data-mood="' + k + '" aria-label="' + esc2(longDate(k)) + '">' +
      '<span class="f"><svg viewBox="0 0 24 24">' + FACES[v] + '</svg></span>' +
      '<em>' + DOW3()[(d.getDay()+6)%7] + '</em><i>' + d.getDate() + '</i><u></u></button>';
  }
  return '<div class="mood">' + g + '</div>';
}

function vHoy(){
  const hoy = today(), due = dueList(hoy);

  let cells = '';
  for(let i = 55; i >= 0; i--){
    const k = shift(hoy, -i), d = dueList(k);
    if(!d.length){ cells += '<i></i>'; continue; }
    cells += '<i class="' + (d.every(p => taken(k, p.id)) ? 'on' : 'miss') + '"></i>';
  }
  let racha = 0;
  for(let i = 0; i < 400; i++){
    const k = shift(hoy, -i), d = dueList(k);
    if(!d.length) continue;
    if(d.every(p => taken(k, p.id))) racha++; else break;
  }
  const total = Object.keys(S.log).reduce((a,k) => a + Object.keys(S.log[k]).length, 0);

  /* la curva de peso, pequeña, sólo si hay con qué */
  const pesos = series('peso', 90).map(p => p.v);

  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' + esc2(longDate(hoy)) + '</div>' +
      '<h2>' + greet() + '</h2></div>' +

    chipsHTML() +

    '<div class="card"><div class="ctitle">' + t('How are you?','¿Cómo estás?') + '</div>' +
      moodHTML() + '</div>' +

    '<div class="card pad0"><div class="ctitle" style="padding:17px 17px 0;margin-bottom:0">' +
      t('Today’s doses','Las dosis de hoy') + '</div>' +
      (due.length ? '<div style="margin-top:9px">' + due.map(p => {
        const on = taken(hoy, p.id);
        return '<div class="dose' + (on ? ' done' : '') + '">' +
          '<div class="tm"><b>' + esc2(p.time || '—') + '</b>' +
            '<span>' + (on ? t('done','hecho') : t('due','toca')) + '</span></div>' +
          '<div class="bd"><div class="nm">' + esc2(p.c) + '</div>' +
            '<div class="mt">' + esc2(p.dose) + ' ' + esc2(p.unit) +
              (p.iu ? ' · ' + esc2(p.iu) + t(' units',' unidades') : '') + '</div></div>' +
          '<button class="lg' + (on ? ' on' : '') + '" data-tick="' + p.id + '" aria-label="' +
            (on ? t('Logged','Registrado') : t('Log','Registrar')) + '">' +
            (on ? '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>' : t('Log','Registrar')) +
          '</button></div>';
      }).join('') + '</div>'
      : '<div class="empty"><b>' + t('Nothing scheduled for today','Hoy no hay nada programado') + '</b>' +
        '<span>' + t('Your protocols decide this, and you write them in Plan.',
                     'Esto lo deciden tus pautas, y las escribes tú en Plan.') + '</span></div>') +
    '</div>' +

    dpBlock(dpToday(), true) +

    (pesos.length >= 2 ? '<div class="card"><div class="ctitle">' + t('Weight','Peso') +
      '<span style="color:var(--tx2)">' + nf(pesos[pesos.length-1], 1) + ' kg</span></div>' +
      spark(pesos) + '</div>' : '') +

    '<div class="card"><div class="ctitle">' + t('Last eight weeks','Últimas ocho semanas') +
      '<span>' + racha + ' ' + t('in a row','seguidos') + ' · ' + total + ' ' +
      t('logged','registros') + '</span></div>' +
      '<div class="streak">' + cells + '</div></div>' +

    '<div class="tips">' + tips().map(x =>
      '<div class="tip ' + x[0] + '"><div class="tt">' + x[1] + '</div>' +
      '<div class="td">' + x[2] + '</div></div>').join('') + '</div>' +
    ruo() + '</div>';
}

/* ---------- PLAN ---------------------------------------------------------- */
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
            (p.time ? ' · ' + esc2(p.time) : '') +
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

    '<div class="card"><div class="ctitle">' + t('Add a protocol','Añadir una pauta') + '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Compound','Compuesto') + '</label>' +
          '<input id="pxC" list="pxCL" placeholder="BPC-157"/>' + datalist() + '</div>' +
        '<div><label>' + t('Time','Hora') + '</label><input id="pxT" type="time"/></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Dose','Dosis') + '</label><input id="pxD" inputmode="decimal" placeholder="250"/></div>' +
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
  const names = [];
  try{ Object.keys(LINES).forEach(k => LINES[k].products.forEach(p => names.push(p[1]))); }catch(e){}
  return '<datalist id="pxCL">' + names.map(n => '<option value="' + esc2(n) + '">').join('') + '</datalist>';
}

function freqExtra(v){
  const box = document.getElementById('pxFX');
  if(!box) return;
  if(v === 'dow'){
    box.innerHTML = '<label>' + t('Which days','Qué días') + '</label><div class="dowsel">' +
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

/* ---------- DATOS --------------------------------------------------------- */
const WINS = [7, 14, 30, 90];

function vDat(){
  const win = S.win || 14;
  const from = shift(today(), -(win-1));

  const cards = METRICS.map(m => {
    const pts = series(m.id, win);
    if(!pts.length) return '';
    const vs = pts.map(p => p.v);
    const dp = dpMetric(m, pts, win);
    return '<div class="card mrep">' +
      '<div class="hd"><h3>' + esc2(mName(m)) + '</h3>' +
        '<span class="avg">' + t('avg ','media ') + nf(mean(vs), m.dec) + ' ' + m.u + '</span></div>' +
      '<p class="de">' + t(m.de.en, m.de.es) + '</p>' +
      (m.col ? cols(pts, win, m) : line(pts, win, m)) +
      '<div class="stats">' +
        '<div class="s"><b>' + nf(mean(vs), m.dec) + '</b><span>' + t('avg','media') + (m.u ? ' ' + m.u : '') + '</span></div>' +
        '<div class="s"><b>' + nf(mn(vs), m.dec) + '</b><span>' + t('low','mín') + '</span></div>' +
        '<div class="s"><b>' + nf(mx(vs), m.dec) + '</b><span>' + t('high','máx') + '</span></div>' +
        trendChip(pts, m) +
      '</div>' +
      (dp ? dpBlock(dp) : '') +
    '</div>';
  }).join('');

  return '<div class="wrap">' +
    '<div class="phead"><div class="k">' +
      esc2(human(from).toUpperCase()) + ' — ' + esc2(human(today()).toUpperCase()) + '</div>' +
      '<h2>' + t('What changed.','Qué cambió.') + '</h2>' +
      '<p>' + t('Numbers you measure yourself. Weekly is enough; monthly and the curve stops meaning anything.',
                'Números que mides tú. Con una vez por semana basta; una vez al mes y la curva deja de decir nada.') + '</p></div>' +

    '<div class="seg">' + WINS.map(w =>
      '<button data-win="' + w + '"' + (w === win ? ' class="on"' : '') + '>' + w + ' ' +
      t('days','días') + '</button>').join('') + '</div>' +

    dpBlock(dpReport(win), true) +
    (cards || '<div class="card"><div class="empty"><b>' +
      t('Nothing measured in this window','Nada medido en esta ventana') + '</b><span>' +
      t('Use the form below. One weight is enough to start.',
        'Usa el formulario de abajo. Con un peso basta para empezar.') + '</span></div></div>') +

    '<div class="card"><div class="ctitle">' + t('Log a measurement','Registrar una medida') + '</div>' +
      '<div class="row2">' +
        '<div><label>' + t('Date','Fecha') + '</label><input id="pvD" type="date" value="' + today() + '"/></div>' +
        '<div><label>' + t('Mood','Ánimo') + '</label>' + sel('pvA') + '</div>' +
      '</div>' +
      '<div class="row3">' +
        '<div><label>' + t('RHR','FCR') + ' bpm</label><input id="pv_rhr" inputmode="decimal"/></div>' +
        '<div><label>' + t('Weight','Peso') + ' kg</label><input id="pv_peso" inputmode="decimal"/></div>' +
        '<div><label>' + t('Steps','Pasos') + '</label><input id="pv_pasos" inputmode="numeric"/></div>' +
      '</div>' +
      '<div class="row3">' +
        '<div><label>' + t('Body fat','Grasa') + ' %</label><input id="pv_grasa" inputmode="decimal"/></div>' +
        '<div><label>' + t('Sleep','Sueño') + ' h</label><input id="pv_sueno" inputmode="decimal"/></div>' +
        '<div><label>' + t('Waist','Cintura') + ' cm</label><input id="pv_cintura" inputmode="decimal"/></div>' +
      '</div>' +
      '<label>' + t('Energy 1–5','Energía 1–5') + '</label>' + sel('pv_energia') +
      '<label>' + t('Note','Nota') + '</label><textarea id="pvN"></textarea>' +
      '<div class="acts2"><button class="abtn" id="pvAdd">' + t('Save','Guardar') + '</button></div>' +
    '</div>' +

    (S.vitals.length ? '<div class="card pad0">' + S.vitals.slice().reverse().slice(0,30).map(v =>
      '<div class="dose"><div class="bd"><div class="nm">' + human(v.d) + '</div>' +
        '<div class="mt">' + METRICS.map(m =>
          (v[m.id] !== '' && v[m.id] != null ? mShort(m) + ' ' + esc2(v[m.id]) + (m.u ? ' ' + m.u : '') : ''))
          .filter(Boolean).join(' · ') +
        '</div>' + (v.nota ? '<div class="mt">' + esc2(v.nota) + '</div>' : '') + '</div>' +
        '<button class="x" data-delv="' + v.d + '">✕</button></div>').join('') + '</div>' : '') +
    ruo() + '</div>';
}
function sel(id){
  return '<select id="' + id + '"><option value="">—</option>' +
    [1,2,3,4,5].map(n => '<option>' + n + '</option>').join('') + '</select>';
}

/* ---------- LAB: calculadora, vida media, zonas, inventario ---------------- */
function vLab(){
  const sub = S.lab || 'calc';
  const body = sub === 'hl'  ? labHL()
             : sub === 'zon' ? labZonas()
             : sub === 'inv' ? labInv() : labCalc();
  return '<div class="wrap">' +
    '<div class="phead"><div class="k">LAB</div>' +
      '<h2>' + t('The bench.','La mesa.') + '</h2>' +
      '<p>' + t('Arithmetic and records. Every number here is one you entered — nothing on this screen proposes a dose.',
                'Aritmética y registros. Todos los números de aquí los metiste tú — nada de esta pantalla propone una dosis.') + '</p></div>' +
    '<div class="seg">' +
      '<button data-lab="calc"' + (sub==='calc'?' class="on"':'') + '>' + t('Calculator','Calculadora') + '</button>' +
      '<button data-lab="hl"'   + (sub==='hl'  ?' class="on"':'') + '>' + t('Half-life','Vida media') + '</button>' +
      '<button data-lab="zon"'  + (sub==='zon' ?' class="on"':'') + '>' + t('Sites','Zonas') + '</button>' +
      '<button data-lab="inv"'  + (sub==='inv' ?' class="on"':'') + '>' + t('Vials','Viales') + '</button>' +
    '</div>' + body + ruo() + '</div>';
}

/* ····· la calculadora de reconstitución ·····································
   Tres preguntas y una regla de tres. Lo único que hace es convertir la dosis
   que el usuario ya escribió a las marcas de su jeringa, y decirle cuántas
   dosis salen del vial. Ni sugiere una dosis ni la comenta. */
function labCalc(){
  const c = S.calc || {};
  const mg   = +c.mg   || 0;         /* péptido en el vial */
  const ml   = +c.ml   || 0;         /* disolvente añadido */
  const dose = +c.dose || 0;         /* dosis por aplicación, en la unidad de abajo */
  const du   = c.du || 'mcg';
  const doseMg = du === 'mcg' ? dose/1000 : dose;

  const conc = ml > 0 ? mg/ml : 0;               /* mg por mL */
  const volMl = conc > 0 ? doseMg/conc : 0;      /* mL por dosis */
  const units = volMl * 100;                     /* marcas de una jeringa U-100 */
  const nDosis = doseMg > 0 ? Math.floor(mg/doseMg) : 0;

  /* cuánto dura, con la frecuencia de una pauta que ya exista para lo mismo */
  const pw = c.pw != null ? +c.pw : 7;
  const dias = pw > 0 && nDosis ? Math.round(nDosis / pw * 7) : 0;

  const ok = mg > 0 && ml > 0 && dose > 0;
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

    '<div class="step"><span class="n">1</span><div class="bd">' +
      '<div class="q">' + t('What is in your vial?','¿Qué hay en tu vial?') + '</div>' +
      '<label>' + t('Peptide amount (mg)','Cantidad de péptido (mg)') + '</label>' +
      '<input id="caMg" inputmode="decimal" placeholder="10" value="' + esc2(c.mg||'') + '"/>' +
      '<label>' + t('Solvent added (mL)','Disolvente añadido (mL)') + '</label>' +
      '<div class="pick">' + [1,2,3,5].map(v =>
        '<button data-ml="' + v + '"' + (+c.ml === v ? ' class="on"' : '') + '>' + v + ' mL</button>').join('') + '</div>' +
      '<input id="caMl" inputmode="decimal" placeholder="' + t('or type it','o escríbelo') + '" value="' + esc2(c.ml||'') + '" style="margin-top:8px"/>' +
    '</div></div>' +

    '<div class="step"><span class="n">2</span><div class="bd">' +
      '<div class="q">' + t('Your dose per injection','Tu dosis por aplicación') + '</div>' +
      '<div class="withu" style="margin-top:11px">' +
        '<input id="caD" inputmode="decimal" placeholder="250" value="' + esc2(c.dose||'') + '"/>' +
        '<span class="uu">' +
          '<button data-du="mcg"' + (du==='mcg'?' class="on"':'') + '>mcg</button>' +
          '<button data-du="mg"'  + (du==='mg' ?' class="on"':'') + '>mg</button>' +
        '</span></div>' +
    '</div></div>' +

    '<div class="step"><span class="n">3</span><div class="bd">' +
      '<div class="q">' + t('How often, to estimate how long it lasts','Cada cuánto, para estimar cuánto dura') + '</div>' +
      '<div class="pick p3" style="margin-top:11px">' +
        [[7,t('Daily','Diario')],[3.5,t('Alternate','Alternos')],[2,t('2× week','2×/sem')]].map(x =>
        '<button data-pw="' + x[0] + '"' + (pw === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
    '</div></div>' +

    (ok ? '<div class="out">' +
      '<div class="hero"><b>' + nf(units, units < 10 ? 1 : 0) + '<small>' +
        t('units','unidades') + '</small></b>' +
        '<span>' + t('on a 1 mL U-100 insulin syringe','en una jeringa de insulina U-100 de 1 mL') + '</span></div>' +
      syringe(units) +
      '<div class="grid">' +
        '<div class="g"><b>' + nf(conc, 2) + ' mg/mL</b><span>' + t('concentration','concentración') + '</span></div>' +
        '<div class="g"><b>' + nf(volMl, 3) + ' mL</b><span>' + t('per dose','por dosis') + '</span></div>' +
        '<div class="g"><b>' + nDosis + '</b><span>' + t('doses per vial','dosis por vial') + '</span></div>' +
        '<div class="g"><b>' + (dias ? '≈ ' + dias : '—') + '</b><span>' + t('days at that rate','días a ese ritmo') + '</span></div>' +
      '</div>' +
      avisos.map(a => '<div class="warnline"><svg viewBox="0 0 24 24">' +
        '<path d="M12 9v5M12 17.5v.01"/><path d="M10.3 3.9L2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' +
        '</svg><span>' + a + '</span></div>').join('') +
    '</div>'
    : '<div class="out"><div class="empty"><b>' + t('Fill in the three steps','Rellena los tres pasos') + '</b>' +
       '<span>' + t('Vial, solvent and dose. All three are yours.','Vial, disolvente y dosis. Los tres son tuyos.') + '</span></div></div>') +
  '</div>';
}

/* La jeringa. Es la regla graduada, no el instrumento: lo que enseña es dónde
   cae el número, que es la parte que se lee mal a las once de la noche. */
function syringe(units){
  const W = 620, H = 72, X0 = 30, X1 = 590, Y = 26, BH = 26;
  const u = Math.max(0, Math.min(100, units));
  const X = v => X0 + (v/100) * (X1-X0);
  let g = '';
  for(let v = 0; v <= 100; v += 5){
    const big = v % 10 === 0;
    g += '<line class="' + (big ? 'tickl' : 'tickm') + '" x1="' + X(v).toFixed(1) +
         '" y1="' + (Y+BH) + '" x2="' + X(v).toFixed(1) + '" y2="' + (Y+BH+(big?7:4)) + '"/>';
    if(v % 20 === 0)
      g += '<text x="' + X(v).toFixed(1) + '" y="' + (Y+BH+18) + '" text-anchor="middle">' + v + '</text>';
  }
  g = '<rect class="fill" x="' + X0 + '" y="' + Y + '" width="' + (X(u)-X0).toFixed(1) +
      '" height="' + BH + '" rx="3"/>' +
      '<rect class="barrel" x="' + X0 + '" y="' + Y + '" width="' + (X1-X0) +
      '" height="' + BH + '" rx="4"/>' + g +
      '<line class="plunge" x1="' + X(u).toFixed(1) + '" y1="' + (Y-6) +
      '" x2="' + X(u).toFixed(1) + '" y2="' + (Y+BH+6) + '"/>' +
      '<text class="big" x="' + Math.min(X1-4, Math.max(X0+4, X(u))).toFixed(1) + '" y="' + (Y-11) +
      '" text-anchor="' + (u > 82 ? 'end' : u < 12 ? 'start' : 'middle') + '">' +
      nf(u, u < 10 ? 1 : 0) + '</text>';
  return '<div class="syr"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    t('Syringe scale','Escala de la jeringa') + '">' + g + '</svg></div>';
}

/* ····· la vida media ········································································
   La app no publica valores farmacocinéticos: el usuario escribe la vida media
   que maneja, y esto dibuja el decaimiento de las dosis que él registró. Sin
   ese número no hay curva, y se dice — que es lo que hace una app honesta en
   vez de rellenar el hueco con un valor de internet. */
const SER = ['var(--s1)','var(--s2)','var(--s3)'];

function levels(){
  /* dosis registradas por compuesto, en mg, con su fecha */
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

function labHL(){
  const byC = levels();
  const comps = Object.keys(byC);
  const hoy = today();
  const win = 14, back = 7;
  const conHL = comps.filter(c => +S.hl[c] > 0);
  const dib = conHL.slice(0, 3);          /* tres series de color, y no más */

  let chart = '';
  if(dib.length){
    const H = 216, PT = 14, PB = 26, PR = 46;
    const from = shift(hoy, -back), n = win;
    const xs = []; for(let i = 0; i < n; i++) xs.push(shift(from, i));
    const vals = [];
    const cur = dib.map(c => {
      const row = xs.map(k => levelAt(byC[c], +S.hl[c], k));
      row.forEach(v => vals.push(v));
      return {c:c, row:row};
    });
    const top = (mx(vals) || 1) * 1.16;
    const X = i => (i/(n-1)) * (CW-PR);
    const Y = v => PT + (1 - v/top) * (H-PT-PB);

    let g = '';
    /* la rejilla, tres líneas y nada más */
    for(let i = 0; i <= 3; i++){
      const v = top*i/3;
      g += '<line class="rule" x1="0" y1="' + Y(v).toFixed(1) + '" x2="' + (CW-PR) +
           '" y2="' + Y(v).toFixed(1) + '"/>' +
           '<text class="axt" x="' + (CW-PR+7) + '" y="' + (Y(v)+3.5).toFixed(1) + '">' +
           nf(v, 2) + ' mg</text>';
    }
    /* el ahora */
    g += '<line class="now" x1="' + X(back).toFixed(1) + '" y1="' + PT + '" x2="' +
         X(back).toFixed(1) + '" y2="' + (H-PB) + '"/>';
    /* Aquí SÍ va relleno: este eje arranca en cero, así que el área bajo la
       curva es la cantidad de verdad y no una cifra elegida. Sólo bajo el
       tramo ya ocurrido — lo proyectado se queda en línea de puntos, porque
       rellenar una previsión la disfraza de dato. */
    cur.forEach((s, i) => {
      let d1 = '', d2 = '';
      s.row.forEach((v, j) => {
        if(j <= back) d1 += (j === 0 ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
        if(j >= back) d2 += (j === back ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      });
      const area = 'M' + X(0).toFixed(1) + ' ' + (H-PB) + ' ' + d1.slice(1) +
                   'L' + X(back).toFixed(1) + ' ' + (H-PB) + ' Z';
      g += '<path d="' + area + '" style="fill:' + SER[i] + ';opacity:.09"/>' +
           '<path class="ln" d="' + d1 + '" style="stroke:' + SER[i] + '"/>' +
           '<path class="ln proj" d="' + d2 + '" style="stroke:' + SER[i] + '"/>' +
           '<circle class="dot" cx="' + X(back).toFixed(1) + '" cy="' +
             Y(s.row[back]).toFixed(1) + '" r="4.5" style="fill:' + SER[i] + '"/>';
    });
    [0, back, n-1].forEach((i, j) => {
      const d = parse(xs[i]);
      g += '<text class="axt" x="' + X(i).toFixed(1) + '" y="' + (H-8) + '" text-anchor="' +
        (j===0?'start':j===2?'end':'middle') + '">' +
        (i === back ? t('now','ahora') : d.getDate() + ' ' + MON()[d.getMonth()]) + '</text>';
    });
    chart = '<svg class="hlc" viewBox="0 0 ' + CW + ' ' + H + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="' + t('Decay of logged doses','Decaimiento de las dosis registradas') + '">' + g + '</svg>' +
      /* leyenda: dos series o más, siempre */
      (dib.length >= 2 ? '<div class="leg">' + dib.map((c,i) =>
        '<span><i style="background:' + SER[i] + '"></i>' + esc2(c) + '</span>').join('') + '</div>' : '');
  }

  const filas = comps.map((c, i) => {
    const hl = +S.hl[c];
    const idx = dib.indexOf(c);
    const now = hl ? levelAt(byC[c], hl, hoy) : null;
    let clears = '';
    if(hl && now){
      const last = byC[c].slice().sort((a,b) => a.d < b.d ? 1 : -1)[0];
      let k = hoy, lim = last.mg * 0.01, n = 0;
      while(levelAt(byC[c], hl, k) > lim && n < 400){ k = shift(k,1); n++; }
      clears = t('below 1% of the last dose ','por debajo del 1% de la última dosis ') + human(k);
    }
    return '<div class="hlrow' + (hl ? '' : ' nodata') + '">' +
      '<span class="sw" style="background:' + (idx >= 0 ? SER[idx] : 'var(--sx)') + '"></span>' +
      '<span class="bd"><span class="nm">' + esc2(c) + '</span>' +
        '<span class="mt">' + (hl
          ? t('half-life ','vida media ') + nf(hl,1) + ' h · ' + clears
          : t('no half-life entered','sin vida media introducida')) + '</span></span>' +
      '<span class="vv">' + (now != null ? nf(now, 2) + '<small>mg</small>' : '—') + '</span>' +
    '</div>';
  }).join('');

  return '<div class="card">' +
    '<div class="ctitle">' + t('Decay of what you logged','Decaimiento de lo que registraste') + '</div>' +
    '<div class="csub">' + t('The half-life is yours to enter — from the COA or the literature you work with. PepX does not publish pharmacokinetic values; it draws the curve of the doses you recorded, with the number you gave it. Solid to today, dashed from today on.',
                             'La vida media la escribes tú — del COA o de la literatura que manejes. PepX no publica valores farmacocinéticos; dibuja la curva de las dosis que registraste, con el número que le diste. Continuo hasta hoy, discontinuo a partir de hoy.') + '</div>' +
    (chart || '<div class="empty"><b>' + t('No curve yet','Todavía no hay curva') + '</b><span>' +
      (comps.length
        ? t('Enter a half-life below and the curve appears.','Escribe una vida media abajo y aparece la curva.')
        : t('Log a dose in Today first — the curve is built from your log.',
            'Registra antes una dosis en Hoy — la curva se construye con tu registro.')) + '</span></div>') +
    (filas ? '<div style="margin-top:15px">' + filas + '</div>' : '') +
  '</div>' +

  (comps.length ? '<div class="card"><div class="ctitle">' + t('Half-life per compound','Vida media por compuesto') + '</div>' +
    comps.map(c =>
      '<div><label>' + esc2(c) + ' — ' + t('hours','horas') + '</label>' +
      '<input class="hlin" data-hl="' + esc2(c) + '" inputmode="decimal" value="' +
        esc2(S.hl[c] || '') + '" placeholder="—"/></div>').join('') +
    '<div class="acts2"><button class="abtn" id="hlSave">' + t('Save','Guardar') + '</button></div>' +
  '</div>' : '');
}

/* ····· las zonas ············································································
   Un registro de dónde fue la última, para poder rotar. Es un cuaderno, no un
   manual: aquí no se explica cómo se pone nada. */
/* LA IZQUIERDA DE QUIEN SE MIRA, NO LA DE QUIEN MIRA

   De frente, el sujeto está enfrente: su lado izquierdo cae a TU derecha. Es la
   convención de cualquier lámina anatómica y la primera versión la tenía al
   revés — «deltoides izquierdo» señalaba el derecho. De espaldas el sujeto mira
   al mismo sitio que tú, así que ahí los lados sí coinciden y las coordenadas
   de la vista trasera se quedan como están. */
const ZONES = [
  {id:'delt_i', v:'f', en:'Left deltoid',   es:'Deltoides izq.',  s:'ellipse', x:147, y:96,  rx:13, ry:17},
  {id:'delt_d', v:'f', en:'Right deltoid',  es:'Deltoides der.',  s:'ellipse', x:53,  y:96,  rx:13, ry:17},
  {id:'abd_i',  v:'f', en:'Left abdomen',   es:'Abdomen izq.',    s:'rect', x:102, y:150, w:19, h:38},
  {id:'abd_d',  v:'f', en:'Right abdomen',  es:'Abdomen der.',    s:'rect', x:79,  y:150, w:19, h:38},
  {id:'mus_i',  v:'f', en:'Left thigh',     es:'Muslo izq.',      s:'rect', x:104, y:236, w:22, h:54},
  {id:'mus_d',  v:'f', en:'Right thigh',    es:'Muslo der.',      s:'rect', x:74,  y:236, w:22, h:54},
  {id:'tri_i',  v:'b', en:'Left triceps',   es:'Tríceps izq.',    s:'ellipse', x:53,  y:126, rx:12, ry:18},
  {id:'tri_d',  v:'b', en:'Right triceps',  es:'Tríceps der.',    s:'ellipse', x:147, y:126, rx:12, ry:18},
  {id:'lum_i',  v:'b', en:'Left flank',     es:'Flanco izq.',     s:'rect', x:79,  y:158, w:19, h:30},
  {id:'lum_d',  v:'b', en:'Right flank',    es:'Flanco der.',     s:'rect', x:102, y:158, w:19, h:30},
  {id:'glu_i',  v:'b', en:'Left glute',     es:'Glúteo izq.',     s:'rect', x:77,  y:196, w:21, h:34},
  {id:'glu_d',  v:'b', en:'Right glute',    es:'Glúteo der.',     s:'rect', x:102, y:196, w:21, h:34}
];
const zone  = id => ZONES.filter(z => z.id === id)[0];
const zName = id => { const z = zone(id); return z ? t(z.en, z.es) : id; };

/* El muñeco. Cabeza, tronco, brazos y piernas — lo justo para saber dónde está
   cada zona. No pretende ser una lámina de anatomía. */
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
      return z.s === 'ellipse'
        ? '<ellipse class="' + cls + '" data-zone="' + z.id + '" cx="' + z.x + '" cy="' + z.y +
          '" rx="' + z.rx + '" ry="' + z.ry + '"><title>' + esc2(zName(z.id)) + '</title></ellipse>'
        : '<rect class="' + cls + '" data-zone="' + z.id + '" x="' + z.x + '" y="' + z.y +
          '" width="' + z.w + '" height="' + z.h + '" rx="8"><title>' + esc2(zName(z.id)) + '</title></rect>';
    }).join('') + '</svg>';
}
function zoneState(id){
  const hoy = today();
  const us = S.sites.filter(s => s.z === id).sort((a,b) => a.d < b.d ? 1 : -1);
  if(!us.length) return 0;
  const ult = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1)[0];
  if(ult && ult.z === id) return 2;
  return days(us[0].d, hoy) <= 21 ? 1 : 0;
}

function labZonas(){
  const view = S.zview || 'f';
  const recientes = S.sites.slice().sort((a,b) => a.d < b.d ? 1 : -1).slice(0, 8);
  const zs = ZONES.filter(z => z.v === view);

  return '<div class="card">' +
    '<div class="ctitle">' + t('Where the last ones went','Dónde fueron las últimas') + '</div>' +
    '<div class="csub">' + t('A notebook, not a manual: PepX records the site you tell it so you can see at a glance which one has had a rest. It does not explain technique.',
                             'Un cuaderno, no un manual: PepX apunta la zona que le digas para que veas de un vistazo cuál ha descansado. No explica técnica.') + '</div>' +
    '<div class="seg" style="margin-top:0">' +
      '<button data-zv="f"' + (view==='f'?' class="on"':'') + '>' + t('Front','Frente') + '</button>' +
      '<button data-zv="b"' + (view==='b'?' class="on"':'') + '>' + t('Back','Espalda') + '</button>' +
    '</div>' +
    '<div class="csub" style="margin:11px 0 0">' + (view === 'f'
      ? t('Seen from the front, as if facing you: <b>left</b> is on the right of the drawing.',
          'Visto de frente, como si estuviera enfrente: la <b>izquierda</b> queda a la derecha del dibujo.')
      : t('Seen from behind: left and right fall on the same side as yours.',
          'Visto de espaldas: izquierda y derecha caen del mismo lado que las tuyas.')) + '</div>' +
    '<div class="bodywrap"><div class="fig">' + figure(view) + '</div>' +
      '<div class="zlist">' + zs.map(z => {
        const us = S.sites.filter(s => s.z === z.id).sort((a,b) => a.d < b.d ? 1 : -1);
        return '<div class="zrow"><b>' + esc2(zName(z.id)) + '</b>' +
          (us.length ? '<em>' + esc2(us[0].c || '') + '</em><span>' + human(us[0].d) + '</span>'
                     : '<span>' + t('never','nunca') + '</span>') + '</div>';
      }).join('') + '</div>' +
    '</div>' +
  '</div>' +

  '<div class="card"><div class="ctitle">' + t('Log a site','Apuntar una zona') + '</div>' +
    '<div class="row2">' +
      '<div><label>' + t('Date','Fecha') + '</label><input id="zD" type="date" value="' + today() + '"/></div>' +
      '<div><label>' + t('Compound','Compuesto') + '</label><input id="zC" list="pxCL"/>' + datalist() + '</div>' +
    '</div>' +
    '<label>' + t('Site','Zona') + '</label>' +
    '<select id="zZ">' + ZONES.map(z =>
      '<option value="' + z.id + '"' + (S.zpick === z.id ? ' selected' : '') + '>' +
      esc2(zName(z.id)) + '</option>').join('') + '</select>' +
    '<div class="acts2"><button class="abtn" id="zAdd">' + t('Add','Añadir') + '</button></div>' +
  '</div>' +

  (recientes.length ? '<div class="card pad0">' + recientes.map(s =>
    '<div class="dose"><div class="bd"><div class="nm">' + esc2(zName(s.z)) + '</div>' +
      '<div class="mt">' + esc2(s.c || '—') + ' · ' + human(s.d) + '</div></div>' +
      '<button class="x" data-dels="' + s.id + '">✕</button></div>').join('') + '</div>' : '');
}

/* ····· los viales ··········································································· */
function labInv(){
  const hoy = today();
  return (S.vials.length ? '<div class="card pad0">' + S.vials.map(v => {
      const rec = v.recon ? days(v.recon, hoy) : null;
      return '<div class="dose"><div class="bd"><div class="nm">' + esc2(v.c) +
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

  '<div class="card"><div class="ctitle">' + t('Add a vial','Añadir un vial') + '</div>' +
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
  '</div>';
}

/* ---------- CUENTA -------------------------------------------------------- */
const TIERS = [
  {id:'free', pr:'0', en:'Free', es:'Gratis',
   f:[['Up to 2 protocols','Hasta 2 pautas'],
      ['Daily log, streak and sites','Registro diario, racha y zonas'],
      ['30 days of history','30 días de histórico'],
      ['Reconstitution calculator','Calculadora de reconstitución']]},
  {id:'pro', pr:'9', en:'Pro', es:'Pro',
   f:[['Unlimited protocols','Pautas ilimitadas'],
      ['Doc.Peps on every measure','Doc.Peps en cada constante'],
      ['Half-life curves','Curvas de vida media'],
      ['Inventory with batch and expiry','Inventario con lote y caducidad'],
      ['Full history and export','Histórico completo y exportación']]}
];

/* --------------------------------------------------------------------------
   PONERLA EN LA PANTALLA DE INICIO

   Los dos sistemas hacen esto de formas distintas y sólo uno se puede
   automatizar, así que la tarjeta pregunta primero dónde está:

     ya instalada   el navegador lo dice con display-mode:standalone. Entonces
                    no se enseña nada: un botón de instalar dentro de la app
                    instalada es ruido.
     Android        Chrome avisa con beforeinstallprompt y deja lanzar el
                    diálogo desde un botón de verdad.
     iPhone         Apple no da ese evento a nadie más que a Safari. Lo único
                    honesto es enseñar los dos toques exactos, y decir que
                    tiene que ser Safari — desde Chrome en iPhone la opción no
                    existe y el usuario se queda dando vueltas.
   -------------------------------------------------------------------------- */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e;
  try{ if(S.tab === 'cta' && document.querySelector('.pxapp')) paint(); }catch(err){} });
addEventListener('appinstalled', () => { deferredInstall = null;
  try{ if(document.querySelector('.pxapp')) paint(); }catch(err){} });

function installed(){
  try{
    return matchMedia('(display-mode: standalone)').matches ||
           matchMedia('(display-mode: fullscreen)').matches ||
           navigator.standalone === true;
  }catch(e){ return false; }
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function installCard(){
  if(installed())
    return '<div class="card"><div class="ctitle">' + t('On your phone','En tu teléfono') + '</div>' +
      '<div class="csub" style="margin-bottom:0">' +
      t('PepX is installed on this device. It opens without the browser bar and works with no connection.',
        'PepX está instalada en este aparato. Abre sin barra de navegador y funciona sin conexión.') +
      '</div></div>';

  const pasos = isIOS()
    ? [t('Open this page in <b>Safari</b> — from Chrome on iPhone the option does not exist.',
         'Abre esta página en <b>Safari</b> — desde Chrome en iPhone la opción no existe.'),
       t('Tap <b>Share</b>, the square with the arrow going up.',
         'Toca <b>Compartir</b>, el cuadrado con la flecha hacia arriba.'),
       t('Scroll down and choose <b>Add to Home Screen</b>.',
         'Baja y elige <b>Añadir a pantalla de inicio</b>.')]
    : [t('Tap the button below. If nothing happens, use the browser menu <b>⋮</b> and choose <b>Install app</b>.',
         'Toca el botón de abajo. Si no pasa nada, entra en el menú <b>⋮</b> del navegador y elige <b>Instalar aplicación</b>.')];

  return '<div class="card"><div class="ctitle">' + t('Put it on your phone','Ponla en tu teléfono') + '</div>' +
    '<div class="csub">' +
      t('PepX installs to the home screen with its own icon, opens full screen and keeps working with no connection. It is not from a store: nothing to pay and nothing to wait for.',
        'PepX se instala en la pantalla de inicio con su propio icono, abre a pantalla completa y sigue funcionando sin conexión. No viene de ninguna tienda: no hay que pagar nada ni esperar a nadie.') +
    '</div>' +
    pasos.map((p, i) => '<div class="zrow"><em>' + (i+1) + '</em><span style="margin-left:0;color:var(--tx2);text-align:left;white-space:normal">' +
      p + '</span></div>').join('') +
    (deferredInstall ? '<div class="acts2"><button class="abtn" id="pxInstall">' +
      t('Install PepX','Instalar PepX') + '</button></div>' : '') +
  '</div>';
}

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

    dpBlock([t('I read what you write down, and only that. I do not read your body: I will not tell you that a number moved because of a compound, and I will not tell you what to take, how much or how often. That line is not a setting.',
               'Leo lo que apuntas, y sólo eso. No leo tu cuerpo: no te voy a decir que un número se movió por un compuesto, ni te voy a decir qué tomar, cuánto ni cada cuándo. Esa raya no es un ajuste.')], true) +

    installCard() +

    '<div class="card"><div class="ctitle">' + t('Your data','Tus datos') + '</div>' +
      '<div class="acts2">' +
        '<button class="abtn ghost" id="pxExp">' + t('Export backup','Exportar copia') + '</button>' +
        '<button class="abtn ghost" id="pxImp">' + t('Import','Importar') + '</button>' +
        '<button class="abtn ghost" id="pxWipe">' + t('Erase everything','Borrar todo') + '</button>' +
      '</div>' +
      '<input type="file" id="pxFile" accept="application/json" style="display:none"/>' +
    '</div>' +

    '<div class="card"><div class="ctitle">' + t('Contact','Contacto') + '</div>' +
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
   10 · PINTAR Y ESCUCHAR
   -------------------------------------------------------------------------- */
function appHTML(){
  const v = S.tab === 'plan' ? vPlan() : S.tab === 'dat' ? vDat()
          : S.tab === 'lab'  ? vLab()  : S.tab === 'cta' ? vCta() : vHoy();
  return '<section class="pxapp">' + headHTML() + tabsHTML() + v + '</section>';
}

function paint(){
  const app = document.getElementById('app');
  if(!app) return;
  app.innerHTML = appHTML();
  wire();
  try{ observeReveals(); }catch(e){}
}
function top0(){ try{ lenis.scrollTo(0,{immediate:true}); }catch(e){ scrollTo(0,0); } }

const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };

function wire(){
  const root = document.querySelector('.pxapp');
  if(!root) return;
  const on = (sel, ev, fn) => root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

  root.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); paint(); top0(); }));

  /* marcar una dosis: se guarda con la hora real, no con la del plan */
  on('[data-tick]', 'click', function(){
    const k = today(), id = this.dataset.tick;
    S.log[k] = S.log[k] || {};
    if(S.log[k][id]) delete S.log[k][id];
    else S.log[k][id] = {t:new Date().toTimeString().slice(0,5)};
    if(!Object.keys(S.log[k]).length) delete S.log[k];
    save(); paint();
  });

  /* una ficha redonda o un día de la semana llevan al formulario de medidas */
  on('[data-chip]', 'click', () => { S.tab = 'dat'; save(); paint();
    setTimeout(() => { const e = document.getElementById('pvAdd');
      if(e) e.scrollIntoView({block:'center'}); }, 60); });
  on('[data-mood]', 'click', function(){
    const k = this.dataset.mood;
    S.tab = 'dat'; save(); paint();
    setTimeout(() => {
      const d = document.getElementById('pvD'); if(d) d.value = k;
      const r = S.vitals.filter(x => x.d === k)[0];
      if(r) fillForm(r);
      const e = document.getElementById('pvAdd'); if(e) e.scrollIntoView({block:'center'});
    }, 60);
  });

  /* ventana de Datos y sub-pestañas de Lab */
  on('[data-win]', 'click', function(){ S.win = +this.dataset.win; save(); paint(); });
  on('[data-lab]', 'click', function(){ S.lab = this.dataset.lab; save(); paint(); });
  on('[data-zv]',  'click', function(){ S.zview = this.dataset.zv; save(); paint(); });
  on('[data-zone]','click', function(){ S.zpick = this.dataset.zone; save(); paint();
    setTimeout(() => { const e = document.getElementById('zAdd');
      if(e) e.scrollIntoView({block:'center'}); }, 60); });

  /* ---- plan ---- */
  const f = document.getElementById('pxF');
  if(f){ freqExtra(f.value); f.addEventListener('change', () => freqExtra(f.value)); }

  const add = document.getElementById('pxAdd');
  if(add) add.addEventListener('click', () => {
    const c = val('pxC');
    if(!c){ const e = document.getElementById('pxC'); if(e) e.focus(); return; }
    const freq = val('pxF');
    const p = {id:uid(), c:c, dose:val('pxD'), unit:val('pxU'), freq:freq,
               time:val('pxT'), start:val('pxS') || today(), end:val('pxE'),
               notes:val('pxN'), active:true};
    if(freq === 'dow') p.dow = [...root.querySelectorAll('.dowsel .on')].map(b => +b.dataset.d);
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

  on('[data-del]', 'click', function(){
    S.plan = S.plan.filter(p => p.id !== this.dataset.del); save(); paint(); });
  on('[data-toggle]', 'click', function(){
    const p = S.plan.filter(x => x.id === this.dataset.toggle)[0];
    if(p) p.active = !p.active; save(); paint(); });

  /* ---- medidas ---- */
  const pv = document.getElementById('pvAdd');
  if(pv) pv.addEventListener('click', () => {
    const d = val('pvD') || today();
    const rec = {d:d, nota:val('pvN'), animo:val('pvA')};
    METRICS.forEach(m => rec[m.id] = val('pv_' + m.id));
    const algo = METRICS.some(m => rec[m.id]) || rec.animo || rec.nota;
    if(!algo) return;
    S.vitals = S.vitals.filter(v => v.d !== d);   /* una medida por día */
    S.vitals.push(rec);
    S.vitals.sort((a,b) => a.d < b.d ? -1 : 1);
    save(); paint();
  });
  on('[data-delv]', 'click', function(){
    S.vitals = S.vitals.filter(v => v.d !== this.dataset.delv); save(); paint(); });

  /* ---- calculadora ---- */
  const C = () => (S.calc = S.calc || {});
  on('[data-ml]', 'click', function(){ C().ml = +this.dataset.ml; save(); paint(); });
  on('[data-du]', 'click', function(){ C().du = this.dataset.du; save(); paint(); });
  on('[data-pw]', 'click', function(){ C().pw = +this.dataset.pw; save(); paint(); });
  [['caMg','mg'],['caMl','ml'],['caD','dose']].forEach(x => {
    const e = document.getElementById(x[0]);
    if(e) e.addEventListener('input', () => { C()[x[1]] = e.value.trim(); save(); redrawCalc(); });
  });

  /* ---- vida media ---- */
  const hs = document.getElementById('hlSave');
  if(hs) hs.addEventListener('click', () => {
    root.querySelectorAll('[data-hl]').forEach(i => {
      const v = i.value.trim();
      if(v) S.hl[i.dataset.hl] = +v; else delete S.hl[i.dataset.hl];
    });
    save(); paint();
  });

  /* ---- zonas ---- */
  const za = document.getElementById('zAdd');
  if(za) za.addEventListener('click', () => {
    S.sites.push({id:uid(), d:val('zD') || today(), z:val('zZ'), c:val('zC')});
    S.zpick = null; save(); paint();
  });
  on('[data-dels]', 'click', function(){
    S.sites = S.sites.filter(s => s.id !== this.dataset.dels); save(); paint(); });

  /* ---- viales ---- */
  const vi = document.getElementById('viAdd');
  if(vi) vi.addEventListener('click', () => {
    const c = val('viC');
    if(!c){ const e = document.getElementById('viC'); if(e) e.focus(); return; }
    S.vials.push({id:uid(), c:c, mg:val('viM'), lote:val('viL'),
                  quedan:val('viQ'), recon:val('viR'), exp:val('viE')});
    save(); paint();
  });
  on('[data-delvial]', 'click', function(){
    S.vials = S.vials.filter(v => v.id !== this.dataset.delvial); save(); paint(); });

  /* ---- datos ---- */
  const inst = document.getElementById('pxInstall');
  if(inst) inst.addEventListener('click', () => {
    if(!deferredInstall) return;
    const ev = deferredInstall;
    deferredInstall = null;      /* el evento sólo se puede usar una vez */
    ev.prompt();
    ev.userChoice.then(() => paint()).catch(() => paint());
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
          if(d && typeof d === 'object'){ S = Object.assign({}, BLANK, d); save(); paint(); }
        }catch(e){ alert(t('That file could not be read.','No se pudo leer ese archivo.')); }
      };
      r.readAsText(fl);
    });
  }
  const wipe = document.getElementById('pxWipe');
  if(wipe) wipe.addEventListener('click', () => {
    if(!confirm(t('This erases every protocol, log, measurement, site and vial on this device. There is no undo.',
                  'Esto borra todas las pautas, registros, medidas, zonas y viales de este aparato. No se puede deshacer.'))) return;
    S = JSON.parse(JSON.stringify(BLANK)); save(); paint();
  });
}

function fillForm(r){
  const a = document.getElementById('pvA'); if(a) a.value = r.animo || '';
  const n = document.getElementById('pvN'); if(n) n.value = r.nota || '';
  METRICS.forEach(m => { const e = document.getElementById('pv_' + m.id);
    if(e) e.value = r[m.id] == null ? '' : r[m.id]; });
}

/* Repintar la calculadora entera en cada tecla movería el foco fuera del campo
   en el que se está escribiendo. Se recalcula sólo el bloque del resultado. */
function redrawCalc(){
  const card = document.querySelector('.pxapp .card .out');
  if(!card) return;
  const nuevo = document.createElement('div');
  nuevo.innerHTML = labCalc();
  const rep = nuevo.querySelector('.out');
  if(rep) card.replaceWith(rep);
}

/* --------------------------------------------------------------------------
   11 · LA PUERTA

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
   12 · LA RUTA

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
window.__pepx = {state: () => S, paint: paint, dueOn: dueOn, tips: tips,
                 dpMetric: dpMetric, series: series, levelAt: levelAt, METRICS: METRICS};

})();

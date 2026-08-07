/* ============================================================================
   SINAPSIS — la aplicación

   Sin dependencias. El grafo está dibujado a mano sobre un <canvas> con una
   simulación de fuerzas de treinta líneas, y no es cabezonería: una biblioteca
   de grafos son 200 KB para colocar veinte círculos, y encima este fichero
   tiene que poder abrirse desde un doble clic sin servidor ni red.

   TRES VISTAS Y UN LECTOR

     GRAFO      la forma del cerebro. Para ver qué está conectado con qué.
     BUSCAR     texto completo. Para cuando ya sabes qué buscas.
     OPTIMIZAR  el análisis. Para cuando no sabes qué mirar.

   Los datos vienen en `SX`, incrustados por build.py. Aquí no se calcula nada
   del análisis: eso ya vino resuelto. Aquí sólo se pinta y se navega.
   ============================================================================ */
(function(){
'use strict';

const E = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');

const NOTAS = {};
SX.notas.forEach(n => { NOTAS[n.slug] = n; });

const S = {vista:'grafo', q:'', abierta:null, tema:leerTema()};

function leerTema(){
  try{ return localStorage.getItem('sinapsis-tema') || 'light'; }catch(e){ return 'light'; }
}
function ponTema(t){
  S.tema = t;
  try{ localStorage.setItem('sinapsis-tema', t); }catch(e){}
  const oscuro = t === 'dark' || (t === 'system' &&
    matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.content = oscuro ? '#0D0D0D' : '#FFFFFF';
  if(G.vivo) G.pinta();
}

const I = {
  buscar:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna:'<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>',
  cerrar:'<path d="M6 6l12 12M18 6 6 18"/>',
  centrar:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5"/>'
};
const svg = n => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
  'stroke-linejoin="round">' + (I[n]||'') + '</svg>';

/* ==========================================================================
   1 · EL GRAFO

   Fuerzas: repulsión entre todos los pares, muelle en cada arista, y un tirón
   suave hacia el centro para que los archipiélagos no se vayan a Groenlandia.
   La temperatura baja sola hasta que se para: un grafo que sigue temblando
   después de colocarse es un grafo que no deja leerse.
   ========================================================================== */

const ESTILO = {
  '10-proyectos':{forma:'lleno',  r:1.20},
  '20-areas'    :{forma:'anillo', r:1.10},
  '90-meta'     :{forma:'lleno',  r:0.80},
  '30-recursos' :{forma:'fino',   r:0.85},
  '00-bandeja'  :{forma:'corte',  r:0.85},
  '40-archivo'  :{forma:'fino',   r:0.75},
  '(raíz)'      :{forma:'lleno',  r:1.35}
};
const estiloDe = c => ESTILO[c] || {forma:'fino', r:0.9};

const G = {
  vivo:false, nodos:[], aristas:[], k:1, cx:0, cy:0,
  esc:1, dx:0, dy:0, T:1, auto:true, sobre:null, coge:null
};

/* LAS CAPAS

   Un grafo de fuerzas coloca bien pero no ORDENA: cada vez sale un archipiélago
   distinto y no se puede aprender dónde está nada. Una red neuronal se dibuja
   en capas, y el cerebro también tiene capas — sólo que las suyas son las
   carpetas, y ésas sí significan algo:

     ENTRADA    lo que llega sin clasificar
     CONTEXTO   quién es quién, qué significa cada palabra    (90-meta)
     DOMINIO    lo permanente del negocio                     (20-areas)
     TRABAJO    lo que tiene final                            (10-proyectos)
     SALIDA     referencia y archivo                          (30-recursos, 40-archivo)

   Igual que en la imagen: cada capa a su altura, todas las conexiones a la
   vista, y el mismo dibujo cada vez que se abre. */
const CAPAS = [
  {id:'entrada',  et:'Entrada',  sub:'sin clasificar', dirs:['00-encargos','00-bandeja']},
  {id:'contexto', et:'Contexto', sub:'quién y qué',    dirs:['90-meta','(raíz)']},
  {id:'dominio',  et:'Dominio',  sub:'lo permanente',  dirs:['20-areas']},
  {id:'trabajo',  et:'Trabajo',  sub:'lo que tiene final', dirs:['10-proyectos']},
  {id:'salida',   et:'Salida',   sub:'referencia',     dirs:['30-recursos','40-archivo']}
];
const capaDe = c => {
  for(let i = 0; i < CAPAS.length; i++) if(CAPAS[i].dirs.indexOf(c) >= 0) return i;
  return CAPAS.length - 1;
};

function montaGrafo(){
  const lista = Object.values(NOTAS);
  const idx = {};
  G.nodos = lista.map((n,i) => {
    idx[n.slug] = i;
    return {slug:n.slug, t:n.titulo, carpeta:n.carpeta,
            grado:n.enlaces.length + n.entrantes.length,
            capa:capaDe(n.carpeta), x:0, y:0, vx:0, vy:0, fijo:false};
  });

  /* Dentro de cada capa se ordena por GRADO, de más conectado a menos, y se
     reparte a la altura. Así el nodo importante de cada capa queda arriba y el
     dibujo es el mismo en cada apertura — que es lo que permite aprenderse
     dónde está una nota. */
  const porCapa = CAPAS.map(() => []);
  G.nodos.forEach((n,i) => porCapa[n.capa].push(i));
  porCapa.forEach(g => g.sort((a,b) =>
    G.nodos[b].grado - G.nodos[a].grado ||
    G.nodos[a].t.localeCompare(G.nodos[b].t)));

  /* SEP_Y por encima de MIN_Y a propósito. El encuadre es proporcional y aquí
     lo limita el ANCHO —cinco columnas—, así que con las filas juntas sobraban
     200px de alto sin usar. Separarlas no cambia la escala: rellena el hueco. */
  const SEP_X = 250, SEP_Y = 112;
  const usadas = porCapa.filter(g => g.length).length;
  let col = 0;
  porCapa.forEach((g, ci) => {
    if(!g.length) return;
    const x = (col - (usadas - 1) / 2) * SEP_X;
    const alto = (g.length - 1) * SEP_Y;
    g.forEach((ni, k) => {
      G.nodos[ni].x = x;
      G.nodos[ni].y = k * SEP_Y - alto / 2;
      G.nodos[ni].cx = x;                 /* su sitio, para volver a él */
      G.nodos[ni].col = col;
    });
    CAPAS[ci].x = x; CAPAS[ci].n = g.length;
    col++;
  });

  const vistas = {};
  G.aristas = [];
  lista.forEach(n => n.enlaces.forEach(d => {
    const a = idx[n.slug], b = idx[d];
    if(a == null || b == null) return;
    const clave = Math.min(a,b) + ':' + Math.max(a,b);
    if(vistas[clave]) return;
    vistas[clave] = 1;
    G.aristas.push({a:a, b:b});
  }));
  G.T = 1; G.auto = true;
}

/* El asentamiento sólo mueve en VERTICAL, y poco.

   Con las capas puestas, dejar que las fuerzas empujen en horizontal
   destruiría justo lo que se acaba de ordenar. Lo único que se busca es que
   dos nodos conectados de capas contiguas se acerquen en altura para que las
   líneas se crucen menos. La columna no se toca. */
function paso(){
  const n = G.nodos;
  for(let i = 0; i < n.length; i++) n[i].vy = 0;

  for(const e of G.aristas){
    const a = n[e.a], b = n[e.b];
    const d = (a.y - b.y) * 0.06;
    a.vy -= d; b.vy += d;
  }
  for(const x of n){
    if(x.fijo) continue;
    x.x += (x.cx - x.x) * 0.25;          /* siempre de vuelta a su columna */
    x.y += Math.max(-9, Math.min(9, x.vy * G.T));
  }
  separa();
  G.T *= 0.955;
}

/* La separación mínima es una RESTRICCIÓN, no una fuerza.

   Antes era un muelle que empujaba cuando dos nodos de la misma columna se
   acercaban a menos de 62. Con seis nodos en una columna y muchas aristas
   tirando, la suma de atracciones ganaba al muelle y la columna se comprimía a
   unos 44 — que es menos de lo que ocupa el rótulo, así que el texto de un
   nodo caía encima del siguiente.

   Una fuerza negocia; una restricción no. Se ordena la columna por altura y se
   empujan los pares que estén demasiado juntos, hasta que ninguno lo esté. El
   dibujo deja de depender de quién tire más fuerte. */
/* Este número, y no SEP_Y, es el que manda en la altura final: la atracción
   entre nodos enlazados comprime siempre hasta el suelo de la restricción, así
   que la columna acaba exactamente a MIN_Y pase lo que pase el reparto
   inicial. Subirlo es lo que rellena el alto que sobraba. */
const MIN_Y = 104;  /* nodo + rótulo + aire, en unidades del dibujo */
function separa(){
  const cols = {};
  for(const x of G.nodos) (cols[x.col] = cols[x.col] || []).push(x);
  for(const k in cols){
    const g = cols[k].sort((a, b) => a.y - b.y);
    for(let it = 0; it < 4; it++){          /* relajación: converge en pocas */
      let movido = false;
      for(let i = 0; i + 1 < g.length; i++){
        const falta = MIN_Y - (g[i+1].y - g[i].y);
        if(falta > 0.5){
          const m = falta / 2;
          if(!g[i].fijo)   g[i].y   -= m;
          if(!g[i+1].fijo) g[i+1].y += m;
          movido = true;
        }
      }
      if(!movido) break;
    }
  }
}
function pinta(){
  const c = document.getElementById('lienzo');
  if(!c) return;
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = c.clientWidth, H = c.clientHeight;
  if(c.width !== W*dpr || c.height !== H*dpr){ c.width = W*dpr; c.height = H*dpr; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);

  const cs = getComputedStyle(document.documentElement);
  const tinta  = cs.getPropertyValue('--grafo').trim() || '#111';
  const arista = cs.getPropertyValue('--arista').trim() || '#ccc';
  const tx3    = cs.getPropertyValue('--tx3').trim() || '#999';
  const fondo  = cs.getPropertyValue('--bg').trim() || '#fff';

  const px = x => (x + G.dx) * G.esc + W/2;
  const py = y => (y + G.dy) * G.esc + H/2;

  const foco = G.sobre;
  const vecino = {};
  if(foco != null){
    vecino[foco] = 1;
    for(const e of G.aristas){
      if(e.a === foco) vecino[e.b] = 1;
      if(e.b === foco) vecino[e.a] = 1;
    }
  }

  ctx.lineWidth = Math.max(0.6, 1 * G.esc);
  for(const e of G.aristas){
    const dest = foco != null && (e.a === foco || e.b === foco);
    ctx.strokeStyle = dest ? tinta : arista;
    ctx.globalAlpha = foco != null && !dest ? 0.25 : 1;
    ctx.beginPath();
    ctx.moveTo(px(G.nodos[e.a].x), py(G.nodos[e.a].y));
    ctx.lineTo(px(G.nodos[e.b].x), py(G.nodos[e.b].y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const base = 4.2;
  G.nodos.forEach((n,i) => {
    const st = estiloDe(n.carpeta);
    const r = (base + Math.sqrt(n.grado) * 2.6) * st.r * G.esc;
    const X = px(n.x), Y = py(n.y);
    const apagado = foco != null && !vecino[i];
    ctx.globalAlpha = apagado ? 0.22 : 1;

    ctx.beginPath();
    ctx.arc(X, Y, Math.max(2, r), 0, 6.2832);
    if(st.forma === 'lleno'){
      ctx.fillStyle = tinta; ctx.fill();
      /* un halo del color del fondo para que dos nodos pegados no se fundan */
      ctx.lineWidth = 1.6 * G.esc; ctx.strokeStyle = fondo; ctx.stroke();
    } else {
      ctx.fillStyle = fondo; ctx.fill();
      ctx.lineWidth = (st.forma === 'anillo' ? 2.2 : 1.2) * G.esc;
      ctx.strokeStyle = st.forma === 'anillo' ? tinta : tx3;
      if(st.forma === 'corte') ctx.setLineDash([3*G.esc, 3*G.esc]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* El rótulo sólo cuando hay sitio: a lo lejos, un grafo con veinte
       etiquetas encima es una mancha de texto y no un mapa. */
    if(G.esc > 0.62 || G.nodos.length <= 60 || i === foco || vecino[i]){
      ctx.globalAlpha = apagado ? 0.22 : 1;
      ctx.fillStyle = (i === foco) ? tinta : tx3;
      ctx.font = ((i === foco ? 600 : 400)) + ' ' +
                 Math.max(9, Math.min(13, 11*G.esc)) + 'px -apple-system, Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const et = n.t.length > 26 ? n.t.slice(0,24) + '…' : n.t;
      ctx.fillText(et, X, Y + r + 5);
    }
  });
  ctx.globalAlpha = 1;

  /* los rótulos de capa, como en el dibujo de una red: debajo de su columna */
  const abajo = G.nodos.reduce((m,x) => Math.max(m, py(x.y)), 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  CAPAS.forEach(c => {
    if(!c.n) return;
    const X = px(c.x), Y = Math.min(H - 34, abajo + 30);
    ctx.fillStyle = tinta;
    ctx.font = '700 ' + Math.max(9, Math.min(12, 11*G.esc)) +
               'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(c.et.toUpperCase(), X, Y);
    ctx.fillStyle = tx3;
    ctx.font = Math.max(8, Math.min(11, 10*G.esc)) + 'px -apple-system, Inter, sans-serif';
    ctx.fillText(c.sub + ' · ' + c.n, X, Y + 15);
  });
}
G.pinta = pinta;

function bucle(){
  if(!G.vivo || !document.getElementById('lienzo')) return;
  if(G.T > 0.006 || G.coge != null){
    paso();
    if(G.auto) encuadra();
  }
  pinta();
  requestAnimationFrame(bucle);
}

function nodoEn(mx, my){
  const c = document.getElementById('lienzo');
  if(!c) return null;
  const W = c.clientWidth, H = c.clientHeight;
  let mejor = null, dmin = 1e9;
  G.nodos.forEach((n,i) => {
    const X = (n.x + G.dx) * G.esc + W/2, Y = (n.y + G.dy) * G.esc + H/2;
    const r = (4.2 + Math.sqrt(n.grado)*2.6) * estiloDe(n.carpeta).r * G.esc;
    const d = Math.hypot(X-mx, Y-my);
    if(d < Math.max(11, r + 6) && d < dmin){ dmin = d; mejor = i; }
  });
  return mejor;
}

/* LOS ESCUCHADORES DE VENTANA SE ENGANCHAN UNA VEZ, NO POR CADA PINTADO.

   Arrastrar y soltar necesitan `mousemove`/`mouseup` en la ventana, porque el
   puntero se sale del lienzo a mitad del gesto. Pero `pintaTodo()` reconstruye
   el DOM entero y antes volvía a llamar a `cableaGrafo()`, que añadía otro
   juego de escuchadores encima de los anteriores: ir y volver del grafo tres
   veces dejaba tres copias vivas, y las viejas apuntaban a un <canvas> que ya
   no existe. De ahí el «Cannot read properties of null».

   Se enganchan una sola vez y comprueban si hay grafo antes de hacer nada. */
const gs = {arrastra:false, movido:false, ax:0, ay:0};

function lienzoVivo(){
  return G.vivo && document.getElementById('lienzo');
}
function posEv(ev, c){
  const r = c.getBoundingClientRect();
  const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
  return {x:t.clientX - r.left, y:t.clientY - r.top};
}
function gBaja(ev){
  const c = lienzoVivo(); if(!c) return;
  const p = posEv(ev, c);
  gs.movido = false;
  const i = nodoEn(p.x, p.y);
  if(i != null){ G.coge = i; G.nodos[i].fijo = true; G.T = Math.max(G.T, 0.12); }
  else { gs.arrastra = true; c.classList.add('arrastrando'); }
  gs.ax = p.x; gs.ay = p.y;
}
function gMueve(ev){
  const c = lienzoVivo(); if(!c) return;
  const p = posEv(ev, c);
  if(Math.hypot(p.x-gs.ax, p.y-gs.ay) > 3) gs.movido = true;
  if(G.coge != null){
    G.nodos[G.coge].x = (p.x - c.clientWidth/2)/G.esc - G.dx;
    G.nodos[G.coge].y = (p.y - c.clientHeight/2)/G.esc - G.dy;
    if(ev.cancelable) ev.preventDefault();
  } else if(gs.arrastra){
    G.auto = false;
    G.dx += (p.x-gs.ax)/G.esc; G.dy += (p.y-gs.ay)/G.esc;
    gs.ax = p.x; gs.ay = p.y; pinta();
    if(ev.cancelable) ev.preventDefault();
  } else {
    const i = nodoEn(p.x, p.y);
    if(i !== G.sobre){ G.sobre = i; c.style.cursor = i != null ? 'pointer' : 'grab'; pinta(); }
  }
}
function gSube(){
  const c = lienzoVivo();
  if(G.coge != null){
    const i = G.coge;
    G.nodos[i].fijo = false; G.coge = null;
    if(!gs.movido) abre(G.nodos[i].slug);
  }
  gs.arrastra = false;
  if(c) c.classList.remove('arrastrando');
}
addEventListener('mousemove', gMueve);
addEventListener('mouseup', gSube);
addEventListener('touchmove', gMueve, {passive:false});
addEventListener('touchend', gSube);

function cableaGrafo(){
  const c = document.getElementById('lienzo');
  if(!c) return;
  G.vivo = true;
  /* éstos sí van en el lienzo, que se destruye con él */
  c.addEventListener('mousedown', gBaja);
  c.addEventListener('touchstart', gBaja, {passive:true});
  c.addEventListener('mouseleave', () => {
    if(G.sobre != null){ G.sobre = null; pinta(); }
  });
  c.addEventListener('wheel', ev => {
    ev.preventDefault();
    zoom(ev.deltaY < 0 ? 1.12 : 1/1.12);
  }, {passive:false});
  encuadra();
  bucle();
}
function zoom(f){
  G.esc = Math.max(0.28, Math.min(3.2, G.esc * f));
  G.auto = false;
  pinta();
}

/* ENCUADRAR EN VEZ DE ADIVINAR LA ESCALA.

   Una simulación de fuerzas no tiene unidades: doce notas se colocan en un
   círculo de 200 px y trescientas en uno de 2.000. Fijar la escala a 1 y
   esperar que quepa es adivinar, y con doce notas el dibujo se salía del
   lienzo por los cuatro lados.

   Así que la escala se calcula DEL dibujo: caja envolvente, margen, y lo que
   salga. Mientras la simulación se mueve se reencuadra en cada cuadro; en
   cuanto el usuario toca el zoom o arrastra, se le deja de tocar la vista. */
function encuadra(){
  const c = document.getElementById('lienzo');
  if(!c || !G.nodos.length) return;
  const W = c.clientWidth, H = c.clientHeight;
  if(!W || !H) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(const n of G.nodos){
    if(n.x < x0) x0 = n.x; if(n.x > x1) x1 = n.x;
    if(n.y < y0) y0 = n.y; if(n.y > y1) y1 = n.y;
  }
  /* Aire asimétrico: arriba basta con el radio del nodo y su rótulo; abajo
     hacen falta además los dos renglones del rótulo de capa. Repartirlo por
     igual dejaba el dibujo pegado al borde de abajo. */
  const arriba = 70, abajo = 118, lados = 96;
  const aw = Math.max(1, x1 - x0) + lados*2;
  const ah = Math.max(1, y1 - y0) + arriba + abajo;
  G.esc = Math.max(0.3, Math.min(2.2, Math.min(W/aw, H/ah)));
  G.dx = -(x0 + x1)/2;
  G.dy = -(y0 + y1)/2 - (abajo - arriba)/2 / Math.max(.3, G.esc);
}
function recentra(){
  G.auto = true; G.T = Math.max(G.T, 0.35); encuadra(); pinta();
}

/* ==========================================================================
   2 · BUSCAR
   ========================================================================== */
const sinTildes = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

function busca(q){
  const n = sinTildes(q).trim();
  if(!n) return [];
  const out = [];
  for(const slug in SX.indice){
    const nota = NOTAS[slug];
    const heno = sinTildes(SX.indice[slug]);
    const tit  = sinTildes(nota.titulo);
    const i = heno.indexOf(n);
    const enTit = tit.indexOf(n) >= 0;
    if(i < 0 && !enTit) continue;
    /* el trozo alrededor del acierto, para que se vea POR QUÉ salió */
    let frag = nota.resumen;
    if(i >= 0){
      const a = Math.max(0, i - 60);
      frag = (a > 0 ? '…' : '') + SX.indice[slug].slice(a, i + n.length + 90) + '…';
    }
    out.push({slug:slug, tit:nota.titulo, via:nota.ruta, frag:frag,
              peso:(enTit ? 0 : 1)});
  }
  return out.sort((a,b) => a.peso - b.peso || a.tit.localeCompare(b.tit)).slice(0, 40);
}
function resalta(txt, q){
  const n = sinTildes(q).trim();
  if(!n) return E(txt);
  const plano = sinTildes(txt);
  let out = '', i = 0;
  for(;;){
    const j = plano.indexOf(n, i);
    if(j < 0){ out += E(txt.slice(i)); break; }
    out += E(txt.slice(i, j)) + '<mark>' + E(txt.slice(j, j+n.length)) + '</mark>';
    i = j + n.length;
  }
  return out;
}

/* ==========================================================================
   3 · MARKDOWN

   Lo justo para leer una nota: encabezados, énfasis, listas, tablas, código,
   citas, reglas y enlaces —incluidos los [[wikilinks]], que son la razón de
   que esto exista y no se pueda delegar en un renderizador de serie.
   ========================================================================== */
function md(src){
  const linhas = src.split('\n');
  let out = '', i = 0;

  const enLinea = s => {
    s = E(s);
    s = s.replace(/`([^`]+)`/g, (m,a) => '<code>' + a + '</code>');
    s = s.replace(/\[\[([^\]|#]+)(?:[#|]([^\]]*))?\]\]/g, (m, dest, txt) => {
      const d = dest.trim();
      const hay = NOTAS[d] || Object.values(NOTAS).find(x =>
        x.titulo.toLowerCase() === d.toLowerCase() ||
        (x.alias||[]).some(a => a.toLowerCase() === d.toLowerCase()));
      const et = E(txt || d);
      return hay
        ? '<a class="wiki" data-ir="' + E(hay.slug) + '">' + et + '</a>'
        : '<a class="wiki roto" title="no existe">' + et + '</a>';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      (m,t,u) => '<a href="' + E(u) + '" target="_blank" rel="noopener">' + t + '</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  };

  while(i < linhas.length){
    const l = linhas[i];

    if(/^```/.test(l)){
      let b = '';
      i++;
      while(i < linhas.length && !/^```/.test(linhas[i])){ b += linhas[i] + '\n'; i++; }
      i++;
      out += '<pre><code>' + E(b.replace(/\n$/,'')) + '</code></pre>';
      continue;
    }
    if(/^\s*$/.test(l)){ i++; continue; }
    if(/^---+\s*$/.test(l)){ out += '<hr/>'; i++; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if(h){ const n = h[1].length; out += '<h'+n+'>' + enLinea(h[2]) + '</h'+n+'>'; i++; continue; }
    if(/^>\s?/.test(l)){
      let b = [];
      while(i < linhas.length && /^>\s?/.test(linhas[i])){ b.push(linhas[i].replace(/^>\s?/,'')); i++; }
      out += '<blockquote>' + enLinea(b.join(' ')) + '</blockquote>';
      continue;
    }
    if(/^\|/.test(l)){
      const filas = [];
      while(i < linhas.length && /^\|/.test(linhas[i])){ filas.push(linhas[i]); i++; }
      const cel = f => f.replace(/^\||\|$/g,'').split('|').map(x => x.trim());
      let t = '<table>';
      cel(filas[0]).forEach(c => { t += '<th>' + enLinea(c) + '</th>'; });
      t = '<table><thead><tr>' + t.slice(7) + '</tr></thead><tbody>';
      for(let k = 1; k < filas.length; k++){
        if(/^\|[\s:|-]+\|?\s*$/.test(filas[k])) continue;
        t += '<tr>' + cel(filas[k]).map(c => '<td>' + enLinea(c) + '</td>').join('') + '</tr>';
      }
      out += t + '</tbody></table>';
      continue;
    }
    const lista = l.match(/^\s*([-*+]|\d+\.)\s+/);
    if(lista){
      const ord = /\d/.test(lista[1]);
      let b = '';
      while(i < linhas.length && /^\s*([-*+]|\d+\.)\s+/.test(linhas[i])){
        b += '<li>' + enLinea(linhas[i].replace(/^\s*([-*+]|\d+\.)\s+/,'')) + '</li>';
        i++;
      }
      out += (ord ? '<ol>' : '<ul>') + b + (ord ? '</ol>' : '</ul>');
      continue;
    }
    let p = [];
    while(i < linhas.length && !/^\s*$/.test(linhas[i]) &&
          !/^(#{1,4}\s|>|\||```|---+\s*$)/.test(linhas[i]) &&
          !/^\s*([-*+]|\d+\.)\s+/.test(linhas[i])){ p.push(linhas[i]); i++; }
    if(p.length) out += '<p>' + enLinea(p.join(' ')) + '</p>';
  }
  return out;
}

/* ==========================================================================
   4 · PINTAR
   ========================================================================== */
function vistaGrafo(){
  const leyenda = [
    ['lleno',  'Proyectos'], ['anillo', 'Áreas'],
    ['chico',  'Contexto'],  ['fino',   'Recursos'], ['corte', 'Entrada']
  ];
  return '<canvas id="lienzo"></canvas>' +
    /* TODO DENTRO DE LA TARJETA.

       Suelto sobre el lienzo, el texto de ayuda se montaba encima de la
       columna de la derecha y tapaba tres nodos. Un panel flotante tiene que
       tener bordes; si no, no es un panel, es texto por encima del dibujo. */
    '<div class="grafo-ui">' +
      '<div class="zoom">' +
        '<button data-zoom="1.25" aria-label="Acercar">+</button>' +
        '<button data-zoom="0.8" aria-label="Alejar">−</button>' +
        '<button data-recentra aria-label="Centrar">' + svg('centrar') + '</button>' +
      '</div>' +
      '<div class="leyenda">' +
        '<div class="eyebrow">' + G.nodos.length + ' notas · ' + G.aristas.length + ' enlaces</div>' +
        leyenda.map(x => '<div class="fila"><span class="g ' + x[0] + '"></span>' +
          x[1] + '</div>').join('') +
        '<div class="neu"><i></i>' + (SX.agentes ? SX.agentes.registro.length : 0) +
          ' ejecuciones de agente</div>' +
        '<div class="grafo-ayuda">Toca un nodo para leerlo.</div>' +
      '</div>' +
    '</div>';
}

function vistaBuscar(){
  const r = busca(S.q);
  return '<div class="vista pad"><div class="centro">' +
    '<div class="campo">' + svg('buscar') +
      '<input id="q" placeholder="Buscar en las ' + SX.notas.length +
      ' notas…" value="' + E(S.q) + '" autocomplete="off"/></div>' +
    (!S.q.trim()
      ? '<p class="eyebrow" style="margin-bottom:12px">Todo el cerebro</p>' +
        SX.notas.slice().sort((a,b) => a.ruta.localeCompare(b.ruta)).map(n =>
          '<button class="res" data-ir="' + E(n.slug) + '">' +
            '<b>' + E(n.titulo) + '</b><span class="via">' + E(n.ruta) + '</span>' +
            (n.resumen ? '<p>' + E(n.resumen) + '</p>' : '') + '</button>').join('')
      : (r.length
        ? '<p class="eyebrow" style="margin-bottom:12px">' + r.length +
            (r.length === 1 ? ' coincidencia' : ' coincidencias') + '</p>' +
          r.map(x => '<button class="res" data-ir="' + E(x.slug) + '">' +
            '<b>' + resalta(x.tit, S.q) + '</b>' +
            '<span class="via">' + E(x.via) + '</span>' +
            '<p>' + resalta(x.frag, S.q) + '</p></button>').join('')
        : '<div class="limpio"><b>Nada coincide</b><span>' + E(S.q) + '</span></div>')) +
  '</div></div>';
}

function vistaOptimizar(){
  const H = SX.hallazgos;
  const total = H.reduce((a,h) => a + h.items.length, 0);
  const alto  = H.filter(h => h.sev === 'alto').reduce((a,h) => a + h.items.length, 0);
  const rotos = (H.find(h => h.clave === 'rotos') || {items:[]}).items.length;

  const bloque = h => '<details class="hall"' + (h.sev === 'alto' ? ' open' : '') + '>' +
    '<summary><span class="sev ' + h.sev + '"></span>' +
      '<span class="bd"><b>' + E(h.titulo) + '</b><p>' + E(h.porque) + '</p></span>' +
      '<span class="cuenta">' + h.items.length + '</span></summary>' +
    '<div class="lista">' + h.items.map(it =>
      it.ir
        ? '<button class="it" data-ir="' + E(it.ir) + '"><b>' + E(it.n) + '</b>' +
          '<span>' + E(it.d) + '</span></button>'
        : '<div class="it"><b>' + E(it.n) + '</b><span>' + E(it.d) + '</span></div>'
    ).join('') + '</div></details>';

  const seccion = (ambito, titulo, sub) => {
    const g = H.filter(h => h.ambito === ambito);
    if(!g.length) return '';
    return '<div class="ambito-h"><div class="eyebrow">' + titulo + '</div>' +
      '<p style="margin:6px 0 0;font-size:13px;color:var(--tx2)">' + sub + '</p></div>' +
      g.map(bloque).join('');
  };

  const px = SX.peptidex;
  return '<div class="vista pad"><div class="centro">' +
    '<div class="resumen">' +
      '<div class="dato"><b>' + SX.notas.length + '</b><span>notas en el cerebro</span></div>' +
      '<div class="dato"><b>' + G.aristas.length + '</b><span>enlaces entre ellas</span></div>' +
      '<div class="dato"><b>' + (px ? px.total : '—') + '</b><span>fichas de compuesto</span></div>' +
      '<div class="dato"><b>' + total + '</b><span>cosas que mirar</span></div>' +
    '</div>' +
    (total === 0
      ? '<div class="limpio"><b>No encuentro nada que arreglar</b>' +
        '<span>Ni enlaces rotos, ni notas huérfanas, ni fichas incompletas. ' +
        'Vuelve a correr el análisis cuando el cerebro crezca.</span></div>'
      : (alto ? '' : '') +
        seccion('cerebro', 'El cerebro',
          'Higiene del vault. Lo que hace que una nota se pierda o que un enlace no lleve a ningún sitio.') +
        seccion('peptidex', 'PEPTIDEX',
          'El registro de operación, las ' + (px ? px.total : 0) + ' fichas. Lo que le falta a un compuesto ' +
          'para que la app pueda hacer su trabajo con él.')) +
    '<div class="pie">' +
      'Análisis determinista sobre ' + SX.notas.length + ' notas' +
      (px ? ' y ' + px.total + ' fichas' : '') + '. ' +
      'No hay modelo de lenguaje detrás: son reglas concretas, y cada hallazgo ' +
      'se puede comprobar a mano.<br>' +
      'Generado el ' + E(SX.generado) + ' · ' + rotos + ' enlaces rotos · ' +
      alto + ' de prioridad alta.' +
    '</div>' +
  '</div></div>';
}

/* ==========================================================================
   AGENTES

   Lo que se enseña arriba de cada ficha es una medida de RESULTADO: no mide al
   agente, mide lo que el agente vigila. La de `catalogo` se calcula recorriendo
   las 60 fichas y contando campos completos — sube cuando se completa una, y no
   sube sola.

   Donde no hay medida calculable, no se pinta barra. Una barra inventada para
   que la tarjeta quede simétrica es exactamente el decorado que hay que evitar.
   ========================================================================== */
function vistaAgentes(){
  const A = SX.agentes || {fichas:[], registro:[]};
  const ficha = a => '<div class="agc">' +
    '<div class="hd"><b>' + E(a.nombre) + '</b>' +
      '<i>' + (a.palabras ? a.reglas + ' reglas' : 'sin instalar') + '</i></div>' +
    '<div class="gu">' + E(a.guarda) + '</div>' +
    (a.medida
      ? '<div class="med"><div class="et"><span>' + E(a.medida.et) + '</span>' +
        '<b>' + a.medida.pct + '%</b></div>' +
        '<div class="ba"><i style="width:' + a.medida.pct + '%"></i></div>' +
        '<div class="de">' + E(a.medida.de) + '</div></div>'
      : '') +
    '<div class="kv2">' +
      '<div><b>' + a.corridas + '</b><span>ejecuciones</span></div>' +
      '<div><b>' + a.hallazgos + '</b><span>hallazgos</span></div>' +
      '<div><b>' + a.arreglados + '</b><span>arreglados</span></div>' +
      (a.ultima ? '<div><b style="font-size:13px">' + E(a.ultima) + '</b>' +
        '<span>última</span></div>' : '') +
    '</div></div>';

  const hora = t => String(t||'').replace('T',' ').slice(0,16);

  return '<div class="vista pad"><div class="centro">' +
    '<p class="eyebrow" style="margin-bottom:4px">El equipo</p>' +
    '<p style="margin:0 0 18px;font-size:13px;color:var(--tx2);max-width:62ch">' +
      'Cinco especialistas. Lo que sube en cada ficha es <b>lo que vigilan</b>, ' +
      'no ellos: un agente es un fichero de instrucciones y no acumula ' +
      'experiencia. Mejoran cuando alguien les añade una regla — y eso también ' +
      'se ve, en el número de reglas.</p>' +
    '<div class="ag">' + A.fichas.map(ficha).join('') + '</div>' +

    (A.registro.length
      ? '<p class="eyebrow" style="margin-bottom:10px">Lo que han hecho</p>' +
        '<div class="agreg">' + A.registro.map(r =>
          '<div class="f"><time>' + E(hora(r.ts)) + '</time>' +
            '<span class="qu">' + E(r.agente||'') + '</span>' +
            '<span class="bd"><b>' + E(r.tarea||'') + '</b>' +
            (r.nota ? '<span>' + E(r.nota) + '</span>' : '') + '</span>' +
            '<span class="nu">' + (+r.hallazgos||0) + '/' + (+r.arreglados||0) + '</span>' +
          '</div>').join('') + '</div>' +
        '<p style="margin:12px 0 0;font-size:11.5px;color:var(--tx3)">' +
          'hallazgos / arreglados · se escribe en <code>90-meta/agentes/registro.jsonl</code></p>'
      : '<div class="limpio"><b>Todavía no han corrido</b><span>Cuando un agente ' +
        'trabaje, su ejecución aparece aquí.</span></div>') +
  '</div></div>';
}

function lector(){
  if(!S.abierta) return '';
  const n = NOTAS[S.abierta];
  if(!n) return '';
  const sale = n.enlaces.map(s => NOTAS[s]).filter(Boolean);
  const entra = [...new Set(n.entrantes)].map(s => NOTAS[s]).filter(Boolean);
  return '<div class="velo" data-cerrar></div>' +
    '<aside class="lector" role="dialog" aria-label="' + E(n.titulo) + '">' +
      '<header class="lector-hd">' +
        '<span class="bd"><b>' + E(n.titulo) + '</b><span>' + E(n.ruta) + '</span></span>' +
        '<button class="ibtn" data-cerrar aria-label="Cerrar">' + svg('cerrar') + '</button>' +
      '</header>' +
      '<div class="lector-bd"><div class="md">' + md(n.md) + '</div>' +
        ((sale.length || entra.length) ? '<div class="vecinos">' +
          '<div class="eyebrow" style="margin-bottom:10px">Conectada con</div>' +
          sale.map(x => '<button class="chip sale" data-ir="' + E(x.slug) + '">' +
            E(x.titulo) + '</button>').join('') +
          entra.map(x => '<button class="chip entra" data-ir="' + E(x.slug) + '">' +
            E(x.titulo) + '</button>').join('') +
        '</div>' : '') +
        (n.rotos.length ? '<div class="vecinos"><div class="eyebrow" style="margin-bottom:10px">' +
          'Enlaces rotos aquí dentro</div><p style="font-size:13px;color:var(--tx2);margin:0">' +
          E([...new Set(n.rotos)].join(' · ')) + '</p></div>' : '') +
      '</div>' +
    '</aside>';
}

const TABS = [['grafo','Grafo'], ['buscar','Buscar'], ['agentes','Agentes'], ['optimizar','Optimizar']];

function pintaTodo(){
  const total = SX.hallazgos.reduce((a,h) => a + h.items.length, 0);
  const root = document.getElementById('root');
  root.innerHTML =
    '<header class="top">' +
      '<span class="marca"><b>Sinapsis</b><span>el cerebro</span></span>' +
      '<span class="hueco"></span>' +
      '<nav class="tabs">' + TABS.map(t =>
        '<button data-vista="' + t[0] + '"' + (S.vista === t[0] ? ' class="on"' : '') + '>' +
        t[1] + (t[0] === 'optimizar' && total ? '<i>' + total + '</i>' : '') +
        '</button>').join('') + '</nav>' +
      '<button class="ibtn" data-tema aria-label="Tema">' +
        svg(document.documentElement.dataset.theme === 'dark' ? 'luna' : 'sol') + '</button>' +
    '</header>' +
    '<div class="cuerpo">' +
      (S.vista === 'grafo' ? vistaGrafo()
       : S.vista === 'buscar' ? vistaBuscar()
       : S.vista === 'agentes' ? vistaAgentes() : vistaOptimizar()) +
    '</div>' + lector();

  cablea();
  if(S.vista === 'grafo') cableaGrafo(); else G.vivo = false;
}

function abre(slug){
  S.abierta = slug;
  pintaTodo();
}

function cablea(){
  const on = (sel, ev, fn) =>
    document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

  on('[data-vista]', 'click', function(){
    S.vista = this.dataset.vista; pintaTodo();
    if(S.vista === 'buscar') setTimeout(() => {
      const i = document.getElementById('q'); if(i) i.focus();
    }, 40);
  });
  on('[data-tema]', 'click', () => {
    ponTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    pintaTodo();
  });
  on('[data-ir]', 'click', function(ev){ ev.stopPropagation(); abre(this.dataset.ir); });
  on('[data-cerrar]', 'click', () => { S.abierta = null; pintaTodo(); });
  on('[data-zoom]', 'click', function(){ zoom(+this.dataset.zoom); });
  on('[data-recentra]', 'click', recentra);

  const q = document.getElementById('q');
  if(q){
    let t = null;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        S.q = q.value;
        const pos = q.selectionStart;
        pintaTodo();
        const n = document.getElementById('q');
        if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} }
      }, 180);
    });
  }
}

addEventListener('keydown', ev => {
  if(ev.key === 'Escape' && S.abierta){ S.abierta = null; pintaTodo(); }
  /* «/» para buscar, como en todas partes */
  if(ev.key === '/' && !/^(INPUT|TEXTAREA)$/.test((ev.target||{}).tagName||'')){
    ev.preventDefault(); S.vista = 'buscar'; pintaTodo();
    setTimeout(() => { const i = document.getElementById('q'); if(i) i.focus(); }, 40);
  }
});
addEventListener('resize', () => { if(G.vivo){ if(G.auto) encuadra(); pinta(); } });

montaGrafo();
ponTema(S.tema);
pintaTodo();

window.__sinapsis = {S:S, G:G, NOTAS:NOTAS, busca:busca, SX:SX};

})();

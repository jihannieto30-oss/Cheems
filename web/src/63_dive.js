/* ============================================================================
   PEPTIDEX — THE WARP

   The base timeline still runs its own beats — the mark, the rule, the caption
   — and still swaps the page at 0.8 s. This is the corridor those beats happen
   inside, and the page's own move: out through the camera, and back out of the
   light at the other end.

   SIMPLER, AND IT GLIDES

   The first version of this was a corridor: six hexagonal frames rushing the
   camera, forty-six streaks, two flash cuts and a punch through the lens. It
   was faithful to the reference and it was busy — six things asking for
   attention in two and a half seconds, with hard cuts between them.

   What is left is one movement. The field goes dark, a soft light opens at
   the centre, the mark rises into it, and the light closes. The streaks stay
   because they are what makes it read as travel rather than a fade, but they
   are fewer, slower and softer, and they no longer fight a corridor for the
   same frame. No flash cuts. No punch. Nothing that snaps.

   Everything is eased on a single smooth curve now instead of a piecewise
   list of keyframes, so there is no moment where the motion changes its mind.

   ONE LAYER, NOT NINETY

   The first build of this was DOM: a div for the black, a div for the light at
   the far end, six hexagonal frames, forty-six streaks, two blobs of haze, a
   flash. Every one of them a positioned, translucent, animated box stacked
   over the full viewport — about ninety compositor layers alive at once. It
   looked right and it ran at a fifth of the frame rate. Trimming helped by a
   few frames a second and no more, because no single layer was the problem:
   the problem was that there were ninety of them, each with its own raster,
   its own texture, and its own turn to be composited over everything below it.

   So the black, the haze, the light, the corridor, the streaks and the flash
   are all drawn into a single canvas. The browser composites one texture per
   frame instead of ninety, and the drawing itself is nothing but drawImage of
   a handful of sprites rendered once — no gradients rebuilt per frame, no
   blur, no masks, no clip paths.

   The backing store is capped well under the display's own resolution. Every
   pixel of this is soft light in motion; there is nothing in it a finer grid
   would resolve, and the difference between drawing one million pixels and
   eight million is the difference between sixty frames a second and twenty.

   What stays in the DOM is what has to: the mark, because it is the supplied
   artwork and it carries a rim light that follows its own alpha, and the page
   itself. Three animated layers in total.
   ============================================================================ */
/* ============================================================================
   PEPTIDEX — THE WARP, IN WHITE

   White was always the brand, and the base timeline was already white: its two
   shutter panels are #ffffff to #f4f6f9. The black field was a detour. This
   goes back to white and puts the colour in the light instead of in the
   background — a bloom in the destination line's own chord that turns, opens
   and closes while the mark rises through it.

   WHY THE OLD ONE FELT PAUSED, AND IT WAS NOT THE FRAME RATE

   Two reasons, both structural.

   The envelopes held. Every element rose to full, sat there while the mark was
   on screen, then fell — and a value that stops changing for half a second
   reads as the animation waiting, however smooth the frames are. Here nothing
   holds. The field turns and converges from the first frame to the last; when
   its opacity plateaus, the image underneath is still moving, so there is no
   moment with nothing happening in it.

   And the tail was dead. The base timeline runs to 2.56 s, but its last 0.8 s
   is spent sliding the two shutter panels back out — and those panels are
   turned off here, because the canvas covers and uncovers the field on this
   transition's own beat. So from 1.9 s onwards the base was animating two
   invisible boxes while the viewer looked at a still frame. Everything now
   finishes by 74 % of the span, around 1.9 s, and the page is back and
   interactive while the base quietly plays out its invisible tail.

   THE COLOUR

   Each route gets a two-colour chord rather than a single tint. One colour is
   flat; two blended across a bloom is what reads as depth, and it is the
   difference between "a blue glow" and light with something behind it. The
   chords are lighting, not artwork — no supplied asset is recoloured.

   On a white ground the arithmetic inverts. Adding light to white gives white,
   so `lighter` — which is what made the black version glow — washes everything
   out here. The field sprite is therefore drawn opaque, with the colour already
   composed over white inside it, and blitted as one image; the streaks darken
   with `multiply`, because on white the only way to show colour is to take
   light away.

   ONE LAYER, NOT NINETY

   The first build of this was DOM: a div for the field, six hexagonal frames,
   forty-six streaks, two blobs of haze, a flash — about ninety positioned,
   translucent, animated boxes over the full viewport. It looked right and ran
   at a fifth of the frame rate. No single layer was the problem; the problem
   was that there were ninety, each with its own raster and its own turn to be
   composited.

   So all of it is drawn into one canvas, from sprites rendered once — no
   gradients rebuilt per frame, no blur, no masks, no clip paths. A blit that
   covers the screen is the only genuinely expensive thing in here, and there
   are two of them: the field and the core. The backing store is capped well
   under the display's resolution, because every pixel of this is soft light in
   motion and there is nothing a finer grid would resolve.
   ============================================================================ */
(function(){
'use strict';

const SPAN = 2600;   /* the base timeline's clock, in ms */
const END  = .70;    /* everything visual is over by here — see the note below */

/* Why .70 and not something rounder: the base timeline calls pageEntrance() at
   1.82 s, which is 70 % of the span, and that call is the destination page's
   own arrival animation. Handing over exactly there means the warp clears as
   the entrance starts, on a page that is already fully visible, instead of the
   two overlapping — which is what put the longest frame of the whole
   transition in the middle of a fade. */

/* The chord of each route: two colours, blended across the bloom.
   These are light, not artwork. Nothing supplied is recoloured. */
const CHORD = {
  '':          ['#2f6bff', '#8b5cf6'],
  fitness:     ['#1f6fff', '#00cfe8'],
  beauty:      ['#e06a3c', '#ff4f8b'],
  longevity:   ['#0b46a0', '#1fc3b4'],
  quality:     ['#2f6bff', '#6ee7f9'],
  tools:       ['#5b6bff', '#a78bfa'],
  track:       ['#2563eb', '#7bd0ff'],
  account:     ['#4b5bd6', '#c084fc']
};
const chordOf = k => CHORD[k] || CHORD[''];

const hex = h => {
  const n = parseInt(String(h).slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const rgbOf = h => hex(h).join(',');

/* ---------- the shape of it ---------------------------------------------- */

/* Smoothstep, so every envelope arrives and leaves without a corner. A
   piecewise-linear ramp changes direction at each knot, and at this scale the
   eye reads those changes as the animation stuttering even when the frame rate
   is perfect. */
const ss = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/* rise from a to b, fall from c to d */
const arc = (t, a, b, c, d) => t < b ? ss((t - a) / (b - a)) : t < c ? 1 : 1 - ss((t - c) / (d - c));
/* Depth: something approaching at constant speed grows exponentially on
   screen, not linearly. */
const geo = (p, a, b) => a * Math.pow(b / a, p);

const N_STREAK = 30;

/* ---------- sprites, drawn once ------------------------------------------ */

function sprite(w, h, draw){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

/* THE FIELD — opaque, with the colour already composed over white.

   It has to be opaque for two reasons. The obvious one is that it is the
   curtain: it has to hide the page underneath. The subtler one is that on
   white you cannot add colour by adding light — white plus anything is still
   white — so the blend has to happen once, here, at full strength, and be
   blitted as a finished image. Trying to tint a white field per frame gives
   pastel mud and costs three blits instead of one.

   The two chord colours sit off-centre and opposite each other, so rotating
   this sprite sweeps one colour through where the other was. That rotation is
   most of what makes the field feel alive without a single extra draw. */
function fieldSprite(c1, c2){
  const S = 512, a = rgbOf(c1), b = rgbOf(c2);
  return sprite(S, S, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);

    const bloom = (x, y, r, rgb, al) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0,   'rgba(' + rgb + ',' + al + ')');
      gr.addColorStop(.42, 'rgba(' + rgb + ',' + (al * .52).toFixed(3) + ')');
      gr.addColorStop(.78, 'rgba(' + rgb + ',' + (al * .12).toFixed(3) + ')');
      gr.addColorStop(1,   'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    };
    bloom(S * .28, S * .32, S * .66, a, .96);
    bloom(S * .74, S * .70, S * .62, b, .93);
    bloom(S * .70, S * .24, S * .38, b, .52);
    bloom(S * .24, S * .76, S * .36, a, .48);

    /* A ring of the chord around the edge. Without it the sprite is brightest
       at the rim after the white recentring, and a field that fades outwards
       into paper reads as washed out however saturated the blooms are. The
       colour has to be deepest where the eye is not looking. */
    const v = g.createRadialGradient(S/2, S*.46, S*.28, S/2, S*.46, S*.72);
    v.addColorStop(0,   'rgba(' + a + ',0)');
    v.addColorStop(.62, 'rgba(' + a + ',.16)');
    v.addColorStop(1,   'rgba(' + b + ',.34)');
    g.fillStyle = v; g.fillRect(0, 0, S, S);

    /* The centre is taken back towards white so the mark always has clean
       ground under it, whatever the rotation has swept through — but only the
       centre. Taken too wide, this is what turned the whole field pastel. */
    const c = g.createRadialGradient(S/2, S*.46, 0, S/2, S*.46, S*.30);
    c.addColorStop(0,   'rgba(255,255,255,.90)');
    c.addColorStop(.42, 'rgba(255,255,255,.56)');
    c.addColorStop(1,   'rgba(255,255,255,0)');
    g.fillStyle = c; g.fillRect(0, 0, S, S);
  });
}

/* A streak, in the chord's colour, soft at both tips and across its thickness.
   It darkens rather than glows: on white that is the only direction colour
   can go. */
function streakSprite(c){
  const W = 256, H = 12, rgb = rgbOf(c);
  return sprite(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0,   'rgba(' + rgb + ',0)');
    gr.addColorStop(.24, 'rgba(' + rgb + ',1)');
    gr.addColorStop(.60, 'rgba(' + rgb + ',.62)');
    gr.addColorStop(1,   'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const gv = g.createLinearGradient(0, 0, 0, H);
    gv.addColorStop(0,  'rgba(0,0,0,1)');
    gv.addColorStop(.5, 'rgba(0,0,0,0)');
    gv.addColorStop(1,  'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gv; g.fillRect(0, 0, W, H);
  });
}

/* The clean white the mark stands on. On the black version this was a pocket
   that took the middle *down*; on white it does the opposite and lifts it, so
   the supplied lockup — dark artwork drawn for a white page — sits on exactly
   the ground it was designed for. */
function coreSprite(){
  const S = 256, r = S / 2;
  return sprite(S, S, (g) => {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0,   'rgba(255,255,255,.92)');
    gr.addColorStop(.36, 'rgba(255,255,255,.72)');
    gr.addColorStop(.66, 'rgba(255,255,255,.32)');
    gr.addColorStop(.86, 'rgba(255,255,255,.08)');
    gr.addColorStop(1,   'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
}

/* ---------- the field ---------------------------------------------------- */

/* A fixed sequence rather than Math.random: the warp looks the same on every
   machine and on every run, which is the difference between a designed field
   and a lucky one. */
let seed = 0x9e3779b9;
function rnd(){
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;  seed >>>= 0;
  return seed / 4294967296;
}

const W = {
  cv:null, g:null, w:0, h:0, s:1,
  spr:null, key:null, lkey:null, coreURL:null,
  streaks:[],
  raf:0, t0:0, reduced:false
};

function plan(){
  seed = 0x9e3779b9;
  W.streaks = [];
  const slice = 360 / N_STREAK;
  for(let i = 0; i < N_STREAK; i++){
    const dur = 620 + rnd() * 420;             /* speed is depth */
    W.streaks.push({
      a:   (i * slice + rnd() * slice * .9) * Math.PI / 180,
      len: 2.0 + rnd() * 2.2,
      th:  .6 + rnd() * 1.0,
      far: .60 + rnd() * .48,
      o:   .34 + rnd() * .46,
      c:   rnd() < .5 ? 0 : 1,                 /* which half of the chord */
      dur: dur,
      off: rnd() * dur
    });
  }
}

function sprites(key){
  const ch = chordOf(key);
  W.key = key;
  /* El lienzo ya sólo lleva estelas: el campo y el núcleo son capas CSS. */
  W.spr = { streak: [streakSprite(ch[0]), streakSprite(ch[1])] };
  return rgbOf(ch[0]);
}

/* El campo y el núcleo salen del lienzo.

   Medido: quitando el lienzo Y la animación de la página, la transición sigue
   dando 19 fps con once fotogramas largos bajo un freno de CPU de 4×.  El
   suelo no lo pone lo que dibujo — lo pone render(), que reconstruye la página
   entera a los 0.8 s, y pageEntrance() detrás.

   Y ahí está el verdadero problema: el lienzo se dibuja con requestAnimationFrame,
   en el hilo principal.  Cuando render() lo bloquea ochenta milisegundos, el
   warp se congela con él.  Eso es exactamente lo que se ve como «pausado», y no
   se arregla dibujando menos: se arregla no dibujando ahí.

   Así que el campo y el núcleo pasan a ser dos divs con la imagen de fondo y
   una animación CSS de transform y opacity.  Eso vive en el compositor: sigue
   girando aunque el hilo principal esté ocupado reconstruyendo la página.  El
   lienzo se queda sólo con las estelas, que son pequeñas y cuyo tirón, si lo
   hay, no es el del fondo entero parándose.

   Son dos capas más, no noventa.  Lo que hundía la primera versión era el
   número, no el hecho de existir. */
function layers(key){
  const dive = document.getElementById('dive');
  if(!dive) return;
  const ch = chordOf(key);
  let f = dive.querySelector('.px-field'), c = dive.querySelector('.px-core');
  if(!f){
    f = document.createElement('div'); f.className = 'px-field';
    f.setAttribute('aria-hidden','true'); dive.insertBefore(f, dive.firstChild);
  }
  if(!c){
    c = document.createElement('div'); c.className = 'px-core';
    c.setAttribute('aria-hidden','true'); dive.insertBefore(c, f.nextSibling);
  }
  if(W.lkey !== key){
    f.style.backgroundImage = 'url(' + fieldSprite(ch[0], ch[1]).toDataURL('image/png') + ')';
    if(!W.coreURL) W.coreURL = coreSprite().toDataURL('image/png');
    c.style.backgroundImage = 'url(' + W.coreURL + ')';
    W.lkey = key;
  }
}

function fit(){
  const cv = W.cv;
  if(!cv) return;
  const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
  /* Cap the backing store. Everything drawn here is soft light in motion, so
     nothing is lost — and the pixel count is what decides whether this holds
     sixty frames a second. */
  const s = Math.min(1, 1000 / Math.max(vw, vh));
  W.s = s;
  W.w = cv.width  = Math.round(vw * s);
  W.h = cv.height = Math.round(vh * s);
  W.g = cv.getContext('2d', { alpha:true });
}

function draw(t){
  const g = W.g, w = W.w, h = W.h, S = W.spr;
  if(!g || !S) return;
  const cx = w / 2, cy = h * .46;
  const R = Math.max(w, h), vmin = Math.min(w, h);
  /* Compuesto contra el tramo visible, no contra el reloj del base: el último
     30 % lo gasta el base deslizando dos paneles ocultos. */
  const u = Math.min(1, t / END);

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  if(W.reduced) return;

  /* LAS ESTELAS — oscurecen, porque sobre blanco es la única dirección que
     tiene el color.  Corren del primer fotograma al último sin pausa. */
  const aS = arc(u, .02, .18, .58, .96) * .95;
  if(aS <= .004) return;
  g.globalCompositeOperation = 'multiply';
  const ms = u * SPAN * END;
  for(let i = 0; i < W.streaks.length; i++){
    const s = W.streaks[i];
    const p = ((ms + s.off) % s.dur) / s.dur;
    const a = aS * s.o * ss(Math.min(1, p / .16)) * (1 - ss(Math.max(0, (p - .58) / .42)));
    if(a <= .004) continue;
    const rn = geo(p, vmin * .06, R * s.far);
    g.globalAlpha = a;
    g.setTransform(1, 0, 0, 1, cx, cy);
    g.rotate(s.a);
    g.drawImage(S.streak[s.c], rn, -s.th / 2, rn * (s.len - 1), s.th);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

function frame(now){
  const t = (now - W.t0) / SPAN;
  if(t >= END){
    W.raf = 0;
    if(W.g){ W.g.setTransform(1,0,0,1,0,0); W.g.clearRect(0, 0, W.w, W.h); }
    return;
  }
  draw(t < 0 ? 0 : t);
  W.raf = requestAnimationFrame(frame);
}

function mount(){
  const dive = document.getElementById('dive');
  if(!dive || W.cv) return;

  const cv = document.createElement('canvas');
  cv.className = 'px-canvas';
  cv.setAttribute('aria-hidden', 'true');
  dive.insertBefore(cv, dive.firstChild);
  W.cv = cv;
  layers('');
  W.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  fit();
  plan();

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(fit, 180); }, {passive:true});

  /* The mark's halo lives on a box the size of the mark.  It has to be a
     wrapper: the base timeline animates `filter` on the image itself and
     would overwrite anything set there — including the soft drop shadow the
     base's own stylesheet gives it, which GSAP replaces with blur(0px) on the
     last keyframe and never puts back. */
  const img = dive.querySelector('.dlogo');
  if(img && img.parentNode && !img.parentNode.classList.contains('dlogo-lit')){
    const lit = document.createElement('span');
    lit.className = 'dlogo-lit';
    img.parentNode.insertBefore(lit, img);
    lit.appendChild(img);
  }
}

let clear = null;

const _dive = diveTransition;
diveTransition = function(route){
  mount();
  const key = String(route || '').replace('/', '');
  if(W.cv){
    const rgb = (W.key !== key || !W.spr) ? sprites(key) : rgbOf(chordOf(key)[0]);
    layers(key);
    const dive = document.getElementById('dive');
    if(dive) dive.style.setProperty('--px-tint', rgb);
    W.t0 = performance.now();
    if(!W.raf) W.raf = requestAnimationFrame(frame);
  }
  const html = document.documentElement;

  /* a second jump before the first has landed restarts the warp rather than
     layering a second one on top of it */
  html.classList.remove('px-diving');
  void html.offsetWidth;
  html.classList.add('px-diving');

  clearTimeout(clear);
  clear = setTimeout(() => html.classList.remove('px-diving'), SPAN + 60);

  return _dive(route);
};

mount();

/* the harness needs a way in; the site itself never calls either of these */
window.__pxSetLine = function(key){ mount(); sprites(key); layers(key); };
window.__pxWarpDraw = function(t){
  mount();
  if(!W.spr) sprites('beauty');
  draw(t);
};

})();


/* ============================================================================
   PEPTIDEX — ANCHORS THAT SURVIVE THE ROUTE

   Science is a scroll anchor, not a route: <a href="#sci" data-scroll>. The bar
   it sits in is fixed, so Science is on screen on every page — but the section
   it points at, <section id="sci">, is emitted by homeHTML() and exists on the
   home route alone. The site's handler looks the target up and, finding
   nothing, does nothing at all. From Fitness, Beauty, Longevity, Quality,
   Tools, Track or the account, clicking Science was a dead click with no
   feedback of any kind.

   Two things had to be true for it to work everywhere, so the click is taken
   over completely rather than patched around:

     the section has to exist — if it is not on this page, go home first and
     scroll once render() has put it there, which happens while the field is
     still dark, so the page is already at Science when the light comes back
     and there is nothing for the user to sit and watch;

     the scroll has to land — the site hands Lenis an element, and Lenis
     ignores a scroll while it is stopped, which is the state every overlay on
     the site leaves it in. A resolved pixel target and force:true land in both
     states, and a plain window.scrollTo is there for the case where Lenis
     never came up at all.
   ============================================================================ */
(function(){
'use strict';

const HEAD = 70;   /* the fixed bar the section has to clear */

function goTo(id, immediate){
  const el = document.getElementById(id);
  if(!el) return false;
  const y = Math.max(0, el.getBoundingClientRect().top + (window.pageYOffset || 0) - HEAD);
  try{
    lenis.scrollTo(y, immediate ? {immediate:true, force:true}
                                : {duration:1.1, force:true});
    return true;
  }catch(_){}
  try{ window.scrollTo({top:y, behavior: immediate ? 'auto' : 'smooth'}); }
  catch(_){ window.scrollTo(0, y); }
  return true;
}

let pending = null;

document.addEventListener('click', function(e){
  const sc = e.target && e.target.closest ? e.target.closest('[data-scroll]') : null;
  if(!sc) return;
  const id = (sc.getAttribute('href') || '').replace(/^#/, '');
  if(!id) return;
  e.preventDefault();
  e.stopPropagation();
  if(document.getElementById(id)){ goTo(id, false); return; }
  pending = id;
  navigate('/');
}, true);

/* render() runs inside the warp, at 0.8 s, with the field still black */
const _render = render;
render = function(route, defer){
  const out = _render.apply(this, arguments);
  if(pending){
    const id = pending;
    pending = null;
    requestAnimationFrame(function(){ goTo(id, true); });
  }
  return out;
};

})();

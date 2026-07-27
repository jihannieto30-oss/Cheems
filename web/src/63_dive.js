/* ============================================================================
   PEPTIDEX — THE WARP

   The base timeline still runs its own beats — the mark, the rule, the caption
   — and still swaps the page at 0.8 s. This is the corridor those beats happen
   inside, and the page's own move: out through the camera, and back out of the
   light at the other end.

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
(function(){
'use strict';

const SPAN = 2600;   /* the base timeline's own length, in ms */

/* Each line's light, taken from that line's own material by mk_labelkit.py:
   the colour is its foil, the depth is its plate. */
const WATER = PX_WATER;

/* The colour of the line's light.
   A measured foil is a *surface* colour, and a surface read off a photograph
   is never at full intensity — #a8a8a8 as light is not silver, it is grey, and
   grey light is what "washed out" means. So the brightest channel is taken to
   full and the other two follow it by the same factor: the ratio between the
   channels is untouched, which means the hue and the saturation are exactly
   what was measured. A material with no colour in it — steel on steel —
   therefore lights the corridor white, because white is what no colour cast
   looks like at full intensity, and not one hue is invented to get there. */
function lightOf(hex){
  const n = parseInt(String(hex || '#a8a8a8').slice(1), 16);
  const c = [n>>16 & 255, n>>8 & 255, n & 255];
  const mx = Math.max(c[0], c[1], c[2]);
  if(!mx) return [255, 255, 255];
  const k = 255 / mx;
  return c.map(v => Math.min(255, Math.round(v * k)));
}

/* ---------- the shape of it ---------------------------------------------- */

/* a keyframe list, evaluated: piecewise linear, which is all any of these
   envelopes ever needed */
function env(t, pts){
  if(t <= pts[0][0]) return pts[0][1];
  for(let i = 1; i < pts.length; i++){
    if(t <= pts[i][0]){
      const a = pts[i-1], b = pts[i];
      return a[1] + (b[1] - a[1]) * ((t - a[0]) / ((b[0] - a[0]) || 1));
    }
  }
  return pts[pts.length-1][1];
}

/* Depth, done properly. Something approaching at constant speed grows
   exponentially on screen, not linearly — and that exponential is the entire
   reason six scaling hexagons read as one corridor with distance in it. */
const geo = (p, a, b) => a * Math.pow(b / a, p);

const E_VOID     = [[0,0],[.08,1],[.66,1],[.80,0],[1,0]];
const E_CORRIDOR = [[0,0],[.14,0],[.20,1],[.40,1],[.52,0],[1,0]];
const E_STREAKS  = [[0,0],[.04,1],[.22,1],[.34,0],[.54,0],[.61,1],[.72,1],[.82,0],[1,0]];
const E_CORE     = [[0,0],[.18,1],[.34,.58],[.46,0],[1,0]];
const E_CORESC   = [[0,.08],[.18,.24],[.34,.7],[.46,1.6],[1,1.6]];
const E_FLASH    = [[0,0],[.36,0],[.41,.6],[.50,0],[.60,0],[.66,.7],[.76,0],[1,0]];
const E_POCKET   = [[0,0],[.28,1],[.60,1],[.76,0],[1,0]];
const E_RING     = [[0,0],[.18,1],[.74,.9],[1,0]];
const E_STREAK   = [[0,0],[.14,1],[.76,1],[1,0]];

const N_STREAK = 46;
const N_RING   = 6;
const RING_MS  = 1180;

/* ---------- sprites, drawn once ------------------------------------------ */

function sprite(w, h, draw){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function glowSprite(rgb, inner, mid){
  const S = 256, r = S / 2;
  return sprite(S, S, (g) => {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0,   'rgba(255,255,255,' + inner + ')');
    gr.addColorStop(.34, 'rgba(' + rgb + ',' + mid + ')');
    gr.addColorStop(.72, 'rgba(' + rgb + ',0)');
    gr.addColorStop(1,   'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
}

/* a streak: white-hot at the leading end, the line's own colour trailing it,
   soft at both tips and across its thickness so nothing here has a cut edge */
function streakSprite(rgb){
  const W = 256, H = 12;
  return sprite(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0,   'rgba(' + rgb + ',0)');
    gr.addColorStop(.20, 'rgba(255,255,255,.98)');
    gr.addColorStop(.56, 'rgba(' + rgb + ',.92)');
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

/* one rod of a hexagonal frame, carrying its own specular along its length —
   which is what the reference does, rather than one gradient shared across a
   whole frame */
function rodSprite(rgb){
  const W = 256, H = 12;
  return sprite(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0,   'rgba(' + rgb + ',.30)');
    gr.addColorStop(.42, 'rgba(255,255,255,.99)');
    gr.addColorStop(.58, 'rgba(255,255,255,.92)');
    gr.addColorStop(1,   'rgba(' + rgb + ',.42)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const gv = g.createLinearGradient(0, 0, 0, H);
    gv.addColorStop(0,   'rgba(0,0,0,.9)');
    gv.addColorStop(.34, 'rgba(0,0,0,0)');
    gv.addColorStop(.66, 'rgba(0,0,0,0)');
    gv.addColorStop(1,   'rgba(0,0,0,.9)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gv; g.fillRect(0, 0, W, H);
  });
}

/* The black the whole thing happens in — WITH THE HAZE ALREADY IN IT.

   The haze used to be two soft blobs drifting on their own, and they cost two
   more full-viewport draws every frame. A blit that covers the screen is the
   only genuinely expensive thing in this transition — one is fine, three is a
   third of the frame rate — so the blooms are painted into this sprite once
   and the whole field is drawn as a single image that drifts and swells
   slightly as it goes. Same atmosphere, a third of the fill. */
function voidSprite(rgb, depth){
  const S = 512;
  return sprite(S, S, (g) => {
    let gr = g.createRadialGradient(S/2, S*.46, 0, S/2, S*.46, S*.74);
    gr.addColorStop(0,   '#0b0d10');
    gr.addColorStop(.40, '#060709');
    gr.addColorStop(.72, '#020304');
    gr.addColorStop(1,   '#000000');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);

    gr = g.createRadialGradient(S/2, S*.46, 0, S/2, S*.46, S*.46);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + (.10 * depth + .04).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);

    const bloom = (x, y, r, col, a) => {
      const b = g.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0,   'rgba(' + col + ',' + a + ')');
      b.addColorStop(.44, 'rgba(' + col + ',' + (a * .5).toFixed(3) + ')');
      b.addColorStop(1,   'rgba(' + col + ',0)');
      g.fillStyle = b; g.fillRect(0, 0, S, S);
    };
    bloom(S * .26, S * .30, S * .40, rgb, .14);
    bloom(S * .76, S * .70, S * .42, '255,255,255', .07);
  });
}

/* What the mark stands in is a pocket, not a pool.
   The instinct is to put light behind the mark and it is wrong twice over: a
   bright disc swallows Beauty's fine copper, and it does nothing at all about
   a corridor rod passing directly behind a stroke, because the rod is brighter
   than any backing. So the middle is taken *down*. The corridor keeps
   arriving; it simply goes quiet exactly where the mark is, and the rim light
   on the mark itself does the separating. */
function pocketSprite(){
  const S = 256, r = S / 2;
  return sprite(S, S, (g) => {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0,   'rgba(0,0,0,.80)');
    gr.addColorStop(.30, 'rgba(0,0,0,.66)');
    gr.addColorStop(.57, 'rgba(0,0,0,.34)');
    gr.addColorStop(.78, 'rgba(0,0,0,.10)');
    gr.addColorStop(1,   'rgba(0,0,0,0)');
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
  spr:null, key:null,
  streaks:[], rings:[],
  raf:0, t0:0, reduced:false
};

function plan(){
  seed = 0x9e3779b9;
  W.streaks = [];
  const slice = 360 / N_STREAK;
  for(let i = 0; i < N_STREAK; i++){
    const dur = 700 + rnd() * 480;             /* speed is depth */
    W.streaks.push({
      a:   (i * slice + rnd() * slice * .9) * Math.PI / 180,
      len: 1.7 + rnd() * 1.9,                  /* how far its tail trails it */
      th:  .8 + rnd() * 1.7,
      far: .62 + rnd() * .5,
      o:   .34 + rnd() * .66,
      dur: dur,
      off: rnd() * dur
    });
  }
  W.rings = [];
  for(let i = 0; i < N_RING; i++) W.rings.push({ off: i * RING_MS / N_RING });
}

function sprites(key){
  const wv  = WATER[key] || {};
  const rgb = lightOf(wv.tint).join(',');
  const dep = wv.depth == null ? .5 : wv.depth;
  W.key = key;
  W.spr = {
    field:  voidSprite(rgb, dep),
    glow:   glowSprite(rgb, .92, .55),
    flash:  glowSprite(rgb, .90, .38),
    streak: streakSprite(rgb),
    rod:    rodSprite(rgb),
    pocket: pocketSprite()
  };
  return rgb;
}

function fit(){
  const cv = W.cv;
  if(!cv) return;
  const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
  /* Cap the backing store. Everything drawn here is soft light in motion, so
     nothing is lost — and the pixel count is what decides whether this holds
     sixty frames a second. A full-viewport draw is the only expensive thing
     here, and its cost is exactly the number of pixels in it. */
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

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';

  /* the black, the haze inside it, drifting — one draw */
  const aV = env(t, E_VOID);
  if(aV > .002){
    const k = 1 + .16 * t;
    g.globalAlpha = aV;
    g.drawImage(S.field, w * (-.10 * t), h * (-.06 * t), w * k, h * k);
  }
  if(W.reduced){ g.globalAlpha = 1; return; }

  /* the light at the far end of the corridor */
  const aC = env(t, E_CORE);
  if(aC > .004){
    const sc = env(t, E_CORESC) * vmin * .9;
    g.globalAlpha = aC;
    g.drawImage(S.glow, cx - sc/2, cy - sc/2, sc, sc);
  }

  /* additive from here: light over light gets brighter, never muddier */
  g.globalCompositeOperation = 'lighter';

  /* the corridor — six frames on one path, each of six rods swung to its edge.
     R is centre-to-vertex, and for a regular hexagon that is also the side, so
     the edge midpoints sit at R·cos30 and a rod cut to 84% leaves the gap at
     the corners. */
  const aR = env(t, E_CORRIDOR);
  if(aR > .004){
    const Rv = vmin * .38, ap = Rv * .866, rodL = Rv * .84;
    const ms = t * SPAN;
    for(let i = 0; i < W.rings.length; i++){
      let p = ((ms - W.rings[i].off) % RING_MS) / RING_MS;
      if(p < 0) p += 1;
      const a = aR * env(p, E_RING);
      if(a <= .004) continue;
      const sc  = geo(p, .04, 3.6);
      const rot = (-9 + 10 * p) * Math.PI / 180;
      const th  = Math.max(.7, vmin * .0092 * sc);
      const len = rodL * sc;
      g.globalAlpha = a;
      for(let e = 0; e < 6; e++){
        g.setTransform(1, 0, 0, 1, cx, cy);
        g.rotate(rot + e * Math.PI / 3);
        g.translate(ap * sc, 0);
        g.rotate(Math.PI / 2);
        g.drawImage(S.rod, -len / 2, -th / 2, len, th);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* the streaks — anchored at the vanishing point, flying out along their own
     bearing and lengthening as they go, because at speed a point source stops
     being a point */
  const aS = env(t, E_STREAKS);
  if(aS > .004){
    const ms = t * SPAN;
    for(let i = 0; i < W.streaks.length; i++){
      const s = W.streaks[i];
      const p = ((ms + s.off) % s.dur) / s.dur;
      const a = aS * s.o * env(p, E_STREAK);
      if(a <= .004) continue;
      const rn = geo(p, vmin * .012, R * s.far);
      g.globalAlpha = a;
      g.setTransform(1, 0, 0, 1, cx, cy);
      g.rotate(s.a);
      g.drawImage(S.streak, rn, -s.th / 2, rn * (s.len - 1), s.th);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* the two cuts: one as the mark comes out of the corridor, one as it goes
     through the camera */
  const aF = env(t, E_FLASH);
  if(aF > .004){
    /* the sprite is transparent past 72% of its radius, so anything beyond
       about nine tenths of the diagonal is fill nobody ever sees */
    const fs = R * .92;
    g.globalAlpha = aF;
    g.drawImage(S.flash, cx - fs/2, cy - fs/2, fs, fs);
  }

  /* and the pocket, back to normal blending so it can take light away */
  g.globalCompositeOperation = 'source-over';
  const aP = env(t, E_POCKET);
  if(aP > .004){
    /* only as wide as the mark needs, not as wide as the screen */
    const ps = Math.min(w * 1.02, 1000 * W.s);
    g.globalAlpha = aP;
    g.drawImage(S.pocket, cx - ps/2, h * .44 - ps/2, ps, ps);
  }
  g.globalAlpha = 1;
}

function frame(now){
  const t = (now - W.t0) / SPAN;
  if(t >= 1){
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
  W.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  fit();
  plan();

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(fit, 180); }, {passive:true});

  /* the mark's rim light lives on a box the size of the mark. The base
     timeline still finds .dlogo with its own querySelector and still owns
     every property it animates on it — this only wraps it. */
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
    const rgb = (W.key !== key || !W.spr) ? sprites(key)
                                          : lightOf((WATER[key] || {}).tint).join(',');
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
window.__pxSetLine = function(key){ mount(); sprites(key); };
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

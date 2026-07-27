/* ============================================================================
   PEPTIDEX — THE WARP

   The base timeline still runs its own beats — the mark, the rule, the caption
   — and still swaps the page at 0.8 s. This builds the corridor those beats
   now happen inside, and gives the page itself the move: out through the
   camera, and back out of the light at the other end.

   Everything lives inside #dive, which the timeline sets to display:block and
   back to none. A CSS animation cannot run on a node that is not displayed, so
   the whole warp restarts on its own every time — there is no clock to keep in
   sync with, and nothing runs at rest.

   The streaks are the one thing that has to be generated. A streak is defined
   by its bearing, its length, its thickness and how fast it travels, and those
   four have to differ per streak or the field reads as a wheel rather than as
   speed. They are handed over as custom properties, which is data; the CSS
   still owns every rule.
   ============================================================================ */
(function(){
'use strict';

const SPAN = 2600;   /* the base timeline's own length, in ms */

/* Each line's light, taken from that line's own material by mk_labelkit.py:
   the colour is its foil, the depth is its plate. Two of the three lockups
   have no colour in them at all — steel on steel — so those travel through
   white light, which is what the reference does anyway; the black panel simply
   makes a deeper corridor than the silver one. */
const WATER = PX_WATER;

/* The colour of the line's light, from the line's own material.
   A measured foil is a *surface* colour, and a surface read off a photograph
   is never at full intensity — #a8a8a8 as light is not silver, it is grey,
   and grey light is what "decolorado" means. So the brightest channel is
   taken to full and the other two follow it by the same factor: the ratio
   between the channels is untouched, which means the hue and the saturation
   are exactly what was measured. A material with no colour in it — steel on
   steel — therefore lights the corridor white, because white is what no
   colour cast looks like at full intensity, and not one hue is invented to
   get there. */
function rgbOf(hex){
  const n = parseInt(String(hex || '#a8a8a8').slice(1), 16);
  const c = [n>>16 & 255, n>>8 & 255, n & 255];
  const mx = Math.max(c[0], c[1], c[2]);
  if(!mx) return '255,255,255';
  const k = 255 / mx;
  return c.map(v => Math.round(v * k)).join(',');
}

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

const STREAKS = 46;
const RINGS   = 6;

function build(){
  const dive = document.getElementById('dive');
  if(!dive || dive.querySelector('.px-void')) return;

  const void_ = document.createElement('div');
  void_.className = 'px-void';

  /* the corridor: same path, staggered, so one frame is always arriving */
  const corridor = document.createElement('div');
  corridor.className = 'px-corridor';
  const ringDur = 1180;
  for(let i = 0; i < RINGS; i++){
    const b = document.createElement('b');
    b.style.setProperty('--dur', ringDur + 'ms');
    b.style.setProperty('--d',   Math.round(i * ringDur / RINGS) + 'ms');
    corridor.appendChild(b);
  }

  /* the streaks: an even spread so the field never clumps, jittered inside
     its own slice so it never reads as spokes */
  const streaks = document.createElement('div');
  streaks.className = 'px-streaks';
  const slice = 360 / STREAKS;
  for(let i = 0; i < STREAKS; i++){
    const s = document.createElement('i');
    const dur = 700 + Math.round(rnd() * 480);      /* speed is depth */
    s.style.setProperty('--a', (i * slice + rnd() * slice * .9).toFixed(2) + 'deg');
    s.style.setProperty('--l', (14 + rnd() * 30).toFixed(1) + 'vmin');
    s.style.setProperty('--t', (.7 + rnd() * 1.5).toFixed(2) + 'px');
    s.style.setProperty('--r', (58 + rnd() * 46).toFixed(1) + 'vmax');
    s.style.setProperty('--o', (.30 + rnd() * .70).toFixed(2));
    s.style.setProperty('--g', (3 + rnd() * 9).toFixed(1) + 'px');
    s.style.setProperty('--dur', dur + 'ms');
    s.style.setProperty('--d', Math.round(rnd() * dur) + 'ms');
    streaks.appendChild(s);
  }

  const haze = document.createElement('div');
  haze.className = 'px-haze';
  haze.innerHTML = '<i></i><i></i>';

  const core = document.createElement('div');
  core.className = 'px-core';

  const flash = document.createElement('div');
  flash.className = 'px-flash';

  /* the mark's rim light lives on a box the size of the mark. The base
     timeline still finds .dlogo with its own querySelector, and still owns
     every property it animates on it — this only wraps it. */
  const img = dive.querySelector('.dlogo');
  if(img && !img.parentNode.classList.contains('dlogo-lit')){
    const lit = document.createElement('span');
    lit.className = 'dlogo-lit';
    img.parentNode.insertBefore(lit, img);
    lit.appendChild(img);
  }

  /* under .center, over nothing — .p is transparent now */
  dive.insertBefore(flash,    dive.firstChild);
  dive.insertBefore(haze,     dive.firstChild);
  dive.insertBefore(streaks,  dive.firstChild);
  dive.insertBefore(corridor, dive.firstChild);
  dive.insertBefore(core,     dive.firstChild);
  dive.insertBefore(void_,    dive.firstChild);
}

let clear = null;

const _dive = diveTransition;
diveTransition = function(route){
  build();
  const key = String(route || '').replace('/', '');
  const dive = document.getElementById('dive');
  if(dive){
    const w = WATER[key] || {};
    dive.style.setProperty('--px-tint', rgbOf(w.tint));
    dive.style.setProperty('--px-depth', w.depth == null ? 0.5 : w.depth);
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

build();

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

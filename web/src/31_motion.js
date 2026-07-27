/* ============================================================================
   PEPTIDEX — MOTION GOVERNOR
   Runs inside the existing module. It only removes motion and makes the
   remaining motion cheaper. It adds no layout, no markup and no styling.
   ============================================================================ */
(function(){
'use strict';

/* Everything that carries the brand. None of it may be transformed. */
const BRAND = '.vwrap,.vialphoto,#pv,#pv .inner,#pv img,.logowrap,.lreflect,' +
              '.badge,.dh-badge,.logo-l,.brand,.brand img,#auth-logo,.dlogo,' +
              '#pre img,.g-av img,.hv-frame,.labshot';

/* The only things allowed to drift, and only as atmosphere. */
const ATMOSPHERE = '.halo,.gword,.ghost';

/* Parallax is reduced to a tenth of what it was. */
const DAMP = 0.10;

/* --------------------------------------------------------------------------
   1 · Strip motion from everything that is not atmosphere.
   -------------------------------------------------------------------------- */
function governAttributes(){
  document.querySelectorAll('[data-par],[data-tilt],[data-scale],[data-rot],[data-skew]').forEach(el=>{
    const atmos = el.matches(ATMOSPHERE);
    /* tilt, scale, rotation and shear are removed everywhere, without exception */
    el.removeAttribute('data-tilt');
    el.removeAttribute('data-scale');
    el.removeAttribute('data-rot');
    el.removeAttribute('data-skew');
    el.__tilt = null;
    if(!atmos){
      el.removeAttribute('data-par');
      el.style.transform = '';          /* clear anything already written */
      el.__pxTf = null;
    } else if(el.dataset.speed !== undefined && !el.dataset.pxDamped){
      el.dataset.speed = (parseFloat(el.dataset.speed) * DAMP).toFixed(4);
      el.dataset.pxDamped = '1';
    }
  });
}

/* --------------------------------------------------------------------------
   2 · A parallax engine that costs almost nothing, and flows.

   The original read getBoundingClientRect() for every element inside its own
   write loop. That forces a synchronous layout per element per frame, and
   because it measures the node it has just transformed, the result feeds back
   into the next reading and the node creeps.

   This one measures each node once, while it is at rest, and derives the rest
   from the scroll position: no layout is read per frame, and there is no
   feedback path.

   It does not jump to that position either. Writing the exact target every
   frame ties the light rigidly to the scrollbar — it starts and stops when the
   finger does, which is what makes it read as a sheet being dragged. Instead
   each plane eases toward its target and keeps easing after the scroll stops,
   so the light arrives a moment late and settles. Planes further back ease
   more slowly, so the field arrives in depth order rather than as one piece.

   Sub-pixel output is deliberate here: these are soft gradients and huge faint
   lettering on their own compositor layers, and rounding them to whole pixels
   is what would make a slow drift look stepped.
   -------------------------------------------------------------------------- */
const EASE_BASE = 0.085;   /* how fast a plane closes on its target, per frame */
const EASE_DEPTH = 0.55;   /* how much its own speed slows that down */
const REST = 0.12;         /* px — below this a plane has arrived; the rest is invisible */

function installEngine(){
  function scrollY(){
    return (typeof pageScroll === 'number' ? pageScroll : 0) ||
           window.scrollY || window.pageYOffset || 0;
  }
  function measure(){
    const sy = scrollY();
    for(const P of parEls){
      const el = P.el;

      const prev = el.style.transform;

      /* Some of these are placed by a transform of their own — the big ghost
         lettering behind the line cards is centred with translateY(-50%), and
         the halos with translate(-50%,-50%). Writing the parallax over that
         would drop them by half their size. Clearing the inline value first
         exposes what the stylesheet asked for, which the parallax composes
         onto rather than replaces. */
      el.style.transform = '';
      const cs = getComputedStyle(el).transform;
      P.base = (cs && cs !== 'none') ? cs + ' ' : '';

      el.style.transform = 'none';
      const r = el.getBoundingClientRect();
      P.dc = r.top + sy + r.height / 2;
      el.style.transform = prev;
      el.__pxTf = null;
      P.k = Math.max(0.035, EASE_BASE - Math.abs(P.sp) * EASE_DEPTH);
      P.cur = undefined;          /* the first frame arrives already settled */
    }
  }

  const _collect = collectParallax;
  collectParallax = function(){ _collect(); governAttributes(); _collect(); measure(); };

  let rz; addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { measure(); parallaxTick(); }, 150);
  }, { passive:true });

  parallaxRun = function(){
    parScheduled = false;
    if(!parEls.length) return;
    const sy = scrollY(), vh = innerHeight;
    const mf = (typeof MOBILE !== 'undefined' && MOBILE) ? 0.3 : 1;
    let flowing = false;

    for(let i = 0; i < parEls.length; i++){
      const P = parEls[i], el = P.el;
      if(P.dc === undefined) continue;

      const tgt = -(P.dc - sy - vh / 2) * P.sp * mf;
      if(P.cur === undefined) P.cur = tgt;
      const d = tgt - P.cur;
      if(Math.abs(d) > REST){ P.cur += d * P.k; flowing = true; }
      else P.cur = tgt;

      const tf = (P.base || '') + 'translate3d(0,' + P.cur.toFixed(2) + 'px,0)';
      if(el.__pxTf !== tf){ el.__pxTf = tf; el.style.transform = tf; }
    }

    /* keep going while anything is still arriving, and stop the moment it has */
    if(flowing) parallaxTick();
    /* skew is disabled by stylesheet — it is not computed at all */
  };
}

/* --------------------------------------------------------------------------
   3 · Entrances. A brand asset arrives by fading in, and by nothing else.

   Rather than rewrite pageEntrance, openProduct and diveTransition, the
   animation calls themselves are filtered: when a tween targets a brand
   asset, every property except opacity and timing is dropped. One place,
   every caller covered — including the back.out(1.35) overshoot that was
   making each compound's vial bounce as it opened.
   -------------------------------------------------------------------------- */
function governTweens(){
  if(typeof gsap === 'undefined' || gsap.__pxGoverned) return;

  const nodes = t => {
    if(typeof t === 'string'){ try{ return [...document.querySelectorAll(t)]; }catch(e){ return []; } }
    if(t && t.nodeType === 1) return [t];
    if(Array.isArray(t)) return t.filter(x => x && x.nodeType === 1);
    if(t && typeof t.length === 'number') return [...t].filter(x => x && x.nodeType === 1);
    return [];
  };
  const isBrand = t => {
    const e = nodes(t);
    return e.length > 0 && e.every(x => x.matches(BRAND) || x.closest(BRAND));
  };
  const KEEP = ['duration','delay','ease','opacity','onComplete','onStart','onUpdate',
                'stagger','overwrite','immediateRender','repeat','yoyo'];
  const fade = v => {
    if(!v || typeof v !== 'object') return v;
    const o = {};
    for(const k of KEEP) if(v[k] !== undefined) o[k] = v[k];
    if(v.autoAlpha !== undefined && o.opacity === undefined) o.opacity = v.autoAlpha;
    if(o.ease && /back|elastic|bounce/i.test(String(o.ease))) o.ease = 'power2.out';
    return o;
  };

  const wrap = obj => {
    ['to','from','set'].forEach(m => {
      const orig = obj[m].bind(obj);
      obj[m] = function(t, v, p){ return orig(t, isBrand(t) ? fade(v) : v, p); };
    });
    const oft = obj.fromTo.bind(obj);
    obj.fromTo = function(t, a, b, p){
      return isBrand(t) ? oft(t, fade(a), fade(b), p) : oft(t, a, b, p);
    };
    return obj;
  };

  wrap(gsap);
  const _tl = gsap.timeline.bind(gsap);
  gsap.timeline = function(cfg){ return wrap(_tl(cfg)); };
  gsap.__pxGoverned = true;
}

/* --------------------------------------------------------------------------
   4 · Apply, and keep applying on every navigation.
   -------------------------------------------------------------------------- */
governTweens();
installEngine();
governAttributes();

const _render = render;
render = function(route, defer){
  _render(route, defer);
  governAttributes();
};

try{ collectParallax(); parallaxTick(); }catch(e){}

})();

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
   2 · A parallax engine that costs almost nothing.

   The original read getBoundingClientRect() for every element inside its own
   write loop. That forces a synchronous layout per element per frame, and
   because it measures the node it has just transformed, the result feeds back
   into the next reading and the node creeps.

   This one measures each node once, while it is at rest, and derives the rest
   from the scroll position: no layout is read per frame, there is no feedback
   path, output lands on a whole pixel, and an unchanged value is not written.
   -------------------------------------------------------------------------- */
function installEngine(){
  function scrollY(){
    return (typeof pageScroll === 'number' ? pageScroll : 0) ||
           window.scrollY || window.pageYOffset || 0;
  }
  function measure(){
    const sy = scrollY();
    for(const P of parEls){
      const el = P.el, prev = el.style.transform;
      el.style.transform = 'none';
      const r = el.getBoundingClientRect();
      P.dc = r.top + sy + r.height / 2;
      el.style.transform = prev;
      el.__pxTf = null;
    }
  }

  const _collect = collectParallax;
  collectParallax = function(){ _collect(); governAttributes(); _collect(); measure(); };

  let rz; addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { measure(); parallaxTick(); }, 150);
  }, { passive:true });

  let lastY = null;
  parallaxRun = function(){
    parScheduled = false;
    if(!parEls.length) return;
    const sy = scrollY();
    if(sy === lastY) return;             /* the pointer alone changes nothing */
    lastY = sy;
    const vh = innerHeight;
    const mf = (typeof MOBILE !== 'undefined' && MOBILE) ? 0.3 : 1;
    for(let i = 0; i < parEls.length; i++){
      const P = parEls[i], el = P.el;
      if(P.dc === undefined) continue;
      const c = P.dc - sy - vh / 2;
      const tf = 'translate3d(0,' + Math.round(-c * P.sp * mf) + 'px,0)';
      if(el.__pxTf !== tf){ el.__pxTf = tf; el.style.transform = tf; }
    }
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

/* ============================================================================
   PEPTIDEX — THE DROP

   The line cards used to drift as you scrolled. That is gone. A drop lands on
   each band instead: a point of light where it hits, then rings that leave
   fast and slow as they spread.

   Three things keep it honest. It only ever touches its own layer, which sits
   behind the content — no product, label, logo, card, title or line of copy is
   moved. It runs on the compositor, as opacity and transform on an element
   that exists for a second and a half and is then removed, so nothing
   accumulates and no layout is read. And it only runs where you are looking:
   a band that scrolls out of view stops, and a page that is hidden stops.
   ============================================================================ */
(function(){
'use strict';

if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

/* A drop every so often, never on a beat you could count. */
const GAP  = [6200, 10500];
const RING = [{d: 2650, t: 0}, {d: 2950, t: 220}, {d: 3250, t: 450}];

const timers = new WeakMap();

function tint(lineKey){
  const hex = (LINES[lineKey] && LINES[lineKey].theme) || '#1e5eff';
  const n = parseInt(hex.slice(1), 16);
  return (n>>16 & 255) + ',' + (n>>8 & 255) + ',' + (n & 255);
}

function layerOf(host, lineKey){
  let l = host.querySelector(':scope > .px-drop');
  if(!l){
    l = document.createElement('div');
    l.className = 'px-drop';
    l.style.setProperty('--tint', tint(lineKey));
    host.insertBefore(l, host.firstChild);
  }
  return l;
}

/* One impact. `x` and `y` are fractions of the band. */
function drop(host, lineKey, x, y){
  const l = layerOf(host, lineKey);
  const r = host.getBoundingClientRect();
  if(!r.width || !r.height) return;
  const d = Math.max(r.width, r.height) * 1.75;

  const place = el => {
    el.style.setProperty('--x', (x * 100).toFixed(2) + '%');
    el.style.setProperty('--y', (y * 100).toFixed(2) + '%');
    el.style.setProperty('--d', Math.round(d) + 'px');
    el.addEventListener('animationend', () => el.remove(), {once: true});
    l.appendChild(el);
  };

  place(document.createElement('b'));          /* where it lands */
  RING.forEach(ring => {                        /* what it sends out */
    const i = document.createElement('i');
    i.style.setProperty('--t', ring.d + 'ms');
    i.style.setProperty('--delay', ring.t + 'ms');
    place(i);
  });
}

/* Somewhere in the open middle of the band, never the same place twice. */
function spot(){
  return [0.22 + Math.random() * 0.56, 0.24 + Math.random() * 0.52];
}

function start(host, lineKey){
  stop(host);
  const tick = () => {
    if(document.hidden) return schedule();
    const s = spot();
    drop(host, lineKey, s[0], s[1]);
    schedule();
  };
  const schedule = () => {
    timers.set(host, setTimeout(tick, GAP[0] + Math.random() * (GAP[1] - GAP[0])));
  };
  schedule();
}

function stop(host){
  const t = timers.get(host);
  if(t){ clearTimeout(t); timers.delete(host); }
}

/* --------------------------------------------------------------------------
   Arm whatever is on screen, and re-arm on every navigation.
   -------------------------------------------------------------------------- */
let io = null;

function arm(){
  if(io) io.disconnect();
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const host = e.target, key = host.dataset.pxLine || '';
      if(e.isIntersecting){
        const s = spot();
        drop(host, key, s[0], s[1]);   /* it lands as the band arrives */
        start(host, key);
      } else {
        stop(host);
      }
    });
  }, {threshold: 0.28});

  document.querySelectorAll('.lcard').forEach(el => {
    const href = el.getAttribute('href') || '';
    el.dataset.pxLine = href.replace('#/', '');
    io.observe(el);
  });
  document.querySelectorAll('.lhero .stage').forEach(el => {
    el.dataset.pxLine = currentRoute().replace('/', '');
    io.observe(el);
  });
}

/* A touch lands one too, where the finger is. The cards are links, so this
   rides alongside the navigation rather than intercepting it. */
document.addEventListener('pointerdown', e => {
  const host = e.target && e.target.closest && e.target.closest('.lcard, .lhero .stage');
  if(!host) return;
  const r = host.getBoundingClientRect();
  drop(host, host.dataset.pxLine || '', (e.clientX - r.left) / r.width,
                                        (e.clientY - r.top) / r.height);
}, {passive: true});

/* a hidden tab holds its breath */
document.addEventListener('visibilitychange', () => {
  if(!document.hidden) arm();
});

const _render = render;
render = function(route, defer){
  document.querySelectorAll('.lcard, .lhero .stage').forEach(stop);
  _render(route, defer);
  requestAnimationFrame(arm);
};

requestAnimationFrame(arm);

})();

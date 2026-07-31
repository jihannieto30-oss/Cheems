/* ============================================================================
   PEPTIDEX — THE VIAL LABEL

   One renderer draws every label on the site: the three line vials and every
   compound. They cannot drift apart because there is only one of them.

   The brand artwork is not drawn here. The Px lockup and the FITNESS / BEAUTY
   / LONGEVITY foil wordmark are cut out of the supplied panels by
   mk_labelkit.py and placed as images, on a plate lifted from the same panels.
   Only the variable data — the compound, the dose, the standing copy — is
   typeset, because it has to be.

   The label is not one size. The supplied size guides give a different vial,
   a different diameter and a different label for each dose, so the dose picks
   the label: a 2 mg vial gets a 36 x 32 mm label and a 100 mg vial gets a
   95 x 75 mm one, and the band is laid out at that proportion.

   The band is then projected onto the vial photograph by sampling, the same
   thing that happens when printed vinyl meets glass, and lit with the
   photograph's own light so it reads as sitting under the glass rather than
   pasted on top of it.
   ============================================================================ */
(function(){
'use strict';

const KIT = __LABELKIT__;

/* ---- the supplied artwork, decoded once ---------------------------------- */
const K = {};
const kitReady = Promise.all(
  Object.keys(KIT).flatMap(line => ['lock','word','plate'].map(part =>
    new Promise(res => {
      const im = new Image();
      im.onload = () => { (K[line] = K[line] || {})[part] = im; res(); };
      im.onerror = res;
      im.src = KIT[line][part];
    })
  ))
);

/* --------------------------------------------------------------------------
   The size guides, as supplied.

   `w` is the wrap — the circumference of the vial body — and `h` is the label
   height, which the guides set equal to the body height for maximum coverage.
   The fitness and longevity sheets agree on this ladder exactly; the beauty
   sheet shifts a couple of steps and repeats 30 mg, so the two that agree are
   the ones followed.
   -------------------------------------------------------------------------- */
const SIZES = [
  {max:   3, ml: '1 mL',  dia: 11.6, h: 32, w: 36},
  {max:  10, ml: '2 mL',  dia: 16,   h: 35, w: 50},
  {max:  20, ml: '3 mL',  dia: 16,   h: 45, w: 69},
  {max:  30, ml: '5 mL',  dia: 22,   h: 50, w: 69},
  {max:  50, ml: '10 mL', dia: 24,   h: 60, w: 75},
  {max: 1e9, ml: '20 mL', dia: 30,   h: 75, w: 95}
];

/* The dose strings carry ranges and lists — "5 · 10 · 20 mg", "0.1 · 1 mg",
   "5–60 mg", "10–36 iu". The vial has to hold the largest presentation, so
   that is the number the size is read from. */
function sizeFor(dose){
  const n = String(dose || '').match(/\d+(?:\.\d+)?/g);
  const mg = n ? Math.max.apply(null, n.map(parseFloat)) : 10;
  return SIZES.find(s => mg <= s.max) || SIZES[SIZES.length - 1];
}

const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

/* Ink for each finish. The plate is the artwork's own, so type has to sit on
   it the way the supplied type does: light on the black panel, dark on the
   white and the silver ones. `accent` overrides the measured foil where the
   foil has too little contrast against its own plate to carry small type —
   which is the case for silver debossed into silver. */
const INK = {
  black:  {ink:'#f0f2f6', sub:'rgba(255,255,255,.68)', accent:null,                 rule:null},
  white:  {ink:'#15171b', sub:'rgba(16,18,22,.60)',    accent:null,                 rule:null},
  silver: {ink:'#14161a', sub:'rgba(16,18,22,.64)',    accent:'rgba(28,32,40,.88)', rule:'rgba(28,32,40,.42)'}
};

function rgba(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n>>16 & 255) + ',' + (n>>8 & 255) + ',' + (n & 255) + ',' + a + ')';
}

/* Fit an image inside a box without ever changing its proportions. */
function contain(box){
  const s = Math.min(box.w / box.iw, box.h / box.ih);
  return {w: box.iw * s, h: box.ih * s};
}

/* Shrink type until it fits, and never below the floor. */
function fit(x, text, weight, start, floor, maxW){
  let s = start;
  x.font = weight + ' ' + s + 'px ' + FONT;
  while(x.measureText(text).width > maxW && s > floor){
    s -= 1;
    x.font = weight + ' ' + s + 'px ' + FONT;
  }
  return s;
}

/* Break a compound name across two lines at its most even space. */
function split(text){
  const w = text.split(' ');
  if(w.length < 2) return null;
  let best = 1, d = 1e9;
  for(let i = 1; i < w.length; i++){
    const a = w.slice(0,i).join(' ').length, b = w.slice(i).join(' ').length;
    if(Math.abs(a-b) < d){ d = Math.abs(a-b); best = i; }
  }
  return [w.slice(0,best).join(' '), w.slice(best).join(' ')];
}

function hexagon(x, cx, cy, r){
  x.beginPath();
  for(let i = 0; i < 6; i++){
    const a = -Math.PI/2 + i * Math.PI/3;
    const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}

/* --------------------------------------------------------------------------
   The band.

   Stacked, the way every vial in the supplied guides reads: the Px lockup, the
   line, what it is, and the standing copy, one under the other, with the line's
   badge at the shoulder. `p` is a product row, or null for a line's own vial —
   a line label carries the line and nothing else, no compound and no dose.

   Every position is a fraction of the band's height, so the same layout holds
   at 36 x 32 mm and at 95 x 75 mm without a second set of numbers.
   -------------------------------------------------------------------------- */
const BAND_H = 900;      /* render height; the width follows from the size */

/* How much of a wrap label the camera ever sees.

   The label's width is the vial's circumference, so it meets itself at the
   back and the front shows a window of it. Mapping the whole width onto the
   front instead — which is what a flat mockup does — caps the band at about
   three quarters of the body height before the artwork would have to be
   squeezed horizontally to go further.

   So only the window is sampled, at true scale. The band then stands as tall
   on the glass as the guides show, the label really does wrap, and nothing is
   stretched: the fraction is whatever makes the height come out at COVER. */
const COVER = 0.86;      /* of the glass body */

function visibleWindow(size){
  const TH = SEAT.theta, R = SEAT.halfW / Math.sin(TH);
  const f = (size.h / size.w) * (2 * TH * R) / (COVER * BODY.h);
  return Math.max(0.35, Math.min(0.92, f));
}

function drawBand(lineKey, p){
  const L = LINES[lineKey], kit = KIT[lineKey], art = K[lineKey];
  const C = INK[L.kind];
  const size   = sizeFor(p ? p[2] : '10 mg');
  const accent = C.accent || rgba(kit.foil, .96);
  const ruleC  = C.rule   || rgba(kit.foil, .46);

  const H = BAND_H, W = Math.round(H * size.w / size.h);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  /* The plate, as supplied. It is cropped to fill, never stretched: the band
     is a different proportion at every size, and a stretched grain would read
     as a different material on a 36 mm label than on a 95 mm one. */
  const ps = Math.max(W / art.plate.width, H / art.plate.height);
  const pw = art.plate.width * ps, ph = art.plate.height * ps;
  x.drawImage(art.plate, (W - pw) / 2, (H - ph) / 2, pw, ph);

  /* The label goes all the way round the vial, so most of its width is behind
     the glass and only a window of it ever faces the camera. Everything that
     has to be read lives inside that window — and inside the middle of it,
     since the window's own edges are already turning away. The rest of the
     wrap carries plate, exactly as a real wrap label does. */
  const V = visibleWindow(size) * W;
  const cx = W / 2, safe = V * 0.54, copyW = V * 0.62;
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';

  /* the Px lockup, as supplied */
  const lb = contain({w: V * 0.36, h: H * 0.215, iw: kit.lockAR, ih: 1});
  x.drawImage(art.lock, cx - lb.w/2, H * 0.055, lb.w, lb.h);

  /* the line wordmark, as supplied */
  const wb = contain({w: V * 0.40, h: H * 0.085, iw: kit.wordAR, ih: 1});
  x.drawImage(art.word, cx - wb.w/2, H * 0.315, wb.w, wb.h);

  if(p){
    /* the compound. Typeset, because it is the variable data. Its authored
       casing is kept: AHK-Cu is a copper peptide, AHK-CU is nothing. */
    const name = p[1];
    x.fillStyle = C.ink;
    /* A long name set on one line has to shrink so far that it stops reading
       as the subject of the label. Below this it goes to two. */
    const one = fit(x, name, '800', H * 0.105, H * 0.070, safe);
    if(one <= H * 0.070 && x.measureText(name).width > safe){
      const two = split(name);
      if(two){
        const s = Math.min(fit(x, two[0], '800', H * 0.080, H * 0.040, safe),
                           fit(x, two[1], '800', H * 0.080, H * 0.040, safe));
        x.font = '800 ' + s + 'px ' + FONT;
        x.fillText(two[0], cx, H * 0.505);
        x.fillText(two[1], cx, H * 0.505 + s * 1.05);
      } else {
        x.fillText(name, cx, H * 0.545);
      }
    } else {
      x.fillText(name, cx, H * 0.545);
    }

    /* the dose */
    x.fillStyle = accent;
    x.letterSpacing = (H * 0.004).toFixed(1) + 'px';
    fit(x, p[2].toUpperCase(), '700', H * 0.070, H * 0.032, V * 0.52);
    x.fillText(p[2].toUpperCase(), cx, H * 0.655);
    x.letterSpacing = '0px';
  }

  /* what it is, and where it was tested */
  x.fillStyle = C.sub;
  x.letterSpacing = (H * 0.005).toFixed(1) + 'px';
  fit(x, L.category, '600', H * 0.040, H * 0.022, copyW);
  x.fillText(L.category, cx, p ? H * 0.735 : H * 0.575);
  fit(x, 'TESTED IN USA', '600', H * 0.040, H * 0.022, copyW);
  x.fillText('TESTED IN USA', cx, p ? H * 0.800 : H * 0.665);

  /* the standing copy */
  x.strokeStyle = ruleC; x.lineWidth = Math.max(1, H * 0.0025);
  x.beginPath();
  x.moveTo(cx - V * 0.24, H * 0.855); x.lineTo(cx + V * 0.24, H * 0.855);
  x.stroke();

  x.fillStyle = C.sub;
  fit(x, '99% PURITY · RESEARCH USE ONLY', '600', H * 0.038, H * 0.019, copyW);
  x.fillText('99% PURITY · RESEARCH USE ONLY', cx, H * 0.935);
  x.letterSpacing = '0px';

  /* the line's badge, at the shoulder */
  const hr = H * 0.048, hx = cx + V * 0.305, hy = H * 0.400;
  x.strokeStyle = ruleC; x.lineWidth = Math.max(1.4, H * 0.0032);
  hexagon(x, hx, hy, hr); x.stroke();

  x.fillStyle = C.ink;
  const badge = p ? p[0].toUpperCase() : L.name[0];
  fit(x, badge, '700', hr * 0.95, hr * 0.42, hr * 1.25);
  x.fillText(badge, hx, hy + hr * 0.33);

  return {canvas: c, size: size};
}

/* --------------------------------------------------------------------------
   Onto the glass.

   The band is sampled column by column through a cylindrical projection, lit
   with a lambert term and the photograph's own speculars, and bowed at the
   edges the way a wrapped label is. Then the glass's own highlights are laid
   back over the top, so the vinyl reads as being under it.

   THETA is as wide as the projection allows. Past a quarter turn the surface
   faces away from the camera and the mapping folds back on itself, so this is
   the tallest the band can sit on the body without the artwork being squeezed
   horizontally to get there — which is what the supplied mockups do, and what
   the artwork may not have done to it.
   -------------------------------------------------------------------------- */
const VW = 560, VH = 1389;
const SEAT = {
  cx:     280,     /* optical centre of the glass body */
  halfW:  198,     /* the band reaches the body's edges and stops */
  theta:  1.48,    /* half the arc it wraps, in radians */
  centre: 0.49     /* where it sits down the body */
};
const BODY = {y: 425, h: 705};

/* The glass's hard speculars, on their own so they can be laid over the vinyl
   without the rest of the photograph washing the ink out with it.

   Thresholding on brightness does not find them: the vial is clear glass shot
   on white, so most of the body is already near 255 and a threshold returns a
   white slab that greys out the black plate. What distinguishes a specular is
   that it is brighter than the glass immediately beside it — so each pixel is
   measured against a wide horizontal average of its own row, and only what
   stands above that survives. */
let specLayer = null;
function speculars(blank){
  if(specLayer) return specLayer;
  const c = document.createElement('canvas');
  c.width = VW; c.height = VH;
  const x = c.getContext('2d');
  x.drawImage(blank, 0, 0, VW, VH);
  const d = x.getImageData(0, 0, VW, VH), a = d.data;

  const R = 16, lum = new Float32Array(VW);
  for(let y = 0; y < VH; y++){
    const row = y * VW * 4;
    for(let i = 0; i < VW; i++){
      const k = row + i * 4;
      lum[i] = a[k+3] > 40 ? (a[k] * .299 + a[k+1] * .587 + a[k+2] * .114) : 0;
    }
    let sum = 0, n = 0;
    for(let i = 0; i <= R && i < VW; i++){ sum += lum[i]; n++; }
    for(let i = 0; i < VW; i++){
      const k = row + i * 4;
      const over = lum[i] - sum / n;
      a[k] = a[k+1] = a[k+2] = 255;
      a[k+3] = (a[k+3] > 40 && over > 4)
             ? Math.round(210 * Math.min(1, (over - 4) / 26)) : 0;
      const add = i + R + 1, drop = i - R;
      if(add < VW){ sum += lum[add]; n++; }
      if(drop >= 0){ sum -= lum[drop]; n--; }
    }
  }
  x.putImageData(d, 0, 0);
  return (specLayer = c);
}

/* Where the band sits on the glass. Pulled out of wrapBand so that sampling
   the artwork and lighting it can be two separate pieces of work — see the
   note on the phases below. It is arithmetic only; calling it twice costs
   nothing and keeps the two halves from drifting apart. */
function bandSeat(band, size){
  const TH = SEAT.theta, R = SEAT.halfW / Math.sin(TH), cx = SEAT.cx;
  const F = visibleWindow(size);
  const BW = band.width * F, BH = band.height;
  const SX = band.width * (1 - F) / 2;     /* the window, centred on the band */

  /* Height follows from the projection of that window, so the artwork is
     never stretched: it is whatever keeps the band true where it faces the
     camera. */
  let lh = Math.round((BH / BW) * 2 * TH * R);
  lh = Math.min(lh, Math.round(BODY.h * 0.92));
  const ly0 = Math.max(BODY.y + 16,
              Math.min(Math.round(BODY.y + BODY.h * SEAT.centre - lh / 2),
                       BODY.y + BODY.h - lh - 16));
  return {TH, R, cx, BW, BH, SX, lh, ly0,
          x0: cx - SEAT.halfW, x1: cx + SEAT.halfW};
}

function wrapBandSample(x, band, size){
  const S = bandSeat(band, size);
  const TH = S.TH, R = S.R, cx = S.cx, BW = S.BW, BH = S.BH, SX = S.SX,
        lh = S.lh, ly0 = S.ly0;

  const N = 240;
  for(let i = 0; i < N; i++){
    const u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2;
    const t0 = (2*u0 - 1) * TH, t1 = (2*u1 - 1) * TH, tm = (2*um - 1) * TH;
    const d0 = cx + R * Math.sin(t0), d1 = cx + R * Math.sin(t1);

    /* the nearest part of the band subtends the most height */
    const bow = (1 - Math.cos(tm)) * lh * 0.030;

    /* the silhouette is where the surface turns away — melt into it */
    const e = Math.abs(2*um - 1);
    x.globalAlpha = e > .94 ? Math.max(0, 1 - ((e - .94) / .06) * .9) : 1;
    x.drawImage(band, SX + u0 * BW, 0, BW / N, BH,
                      d0, ly0 + bow, (d1 - d0) + .7, lh - 2*bow);
  }
  x.globalAlpha = 1;
}

function wrapBandLight(x, band, blank, size){
  const S = bandSeat(band, size);
  const TH = S.TH, lh = S.lh, ly0 = S.ly0, x0 = S.x0, x1 = S.x1;

  x.save();
  x.beginPath(); x.rect(x0 - 2, ly0 - 2, SEAT.halfW*2 + 4, lh + 4); x.clip();

  /* lambert falloff across the curve */
  const sh = x.createLinearGradient(x0, 0, x1, 0);
  for(let i = 0; i <= 48; i++){
    const u = i/48, th = (2*u - 1) * TH;
    const lam = Math.max(0, Math.cos(th));
    sh.addColorStop(u, 'rgba(0,0,0,' + (1 - (0.78 + 0.22 * Math.pow(lam, .7))).toFixed(4) + ')');
  }
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = sh; x.fillRect(x0, ly0, SEAT.halfW*2, lh);

  /* the studio's two speculars, where the photograph puts them */
  const sp = x.createLinearGradient(x0, 0, x1, 0);
  for(let i = 0; i <= 48; i++){
    const u = i/48, th = (2*u - 1) * TH;
    const v = 0.13 * Math.exp(-Math.pow(th + .28, 2)/.030) +
              0.06 * Math.exp(-Math.pow(th - .60, 2)/.020);
    sp.addColorStop(u, 'rgba(255,255,255,' + v.toFixed(4) + ')');
  }
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = sp; x.fillRect(x0, ly0, SEAT.halfW*2, lh);

  /* the glass's own hard highlights, back over the vinyl. Only those — the
     whole photograph screened over the top would grey the black plate out. */
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = .85; x.drawImage(speculars(blank), 0, 0, VW, VH);
  x.globalAlpha = 1;

  /* and the glass's contours, faintly, so the vinyl follows the body */
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = .16;
  x.drawImage(blank, 0, 0, VW, VH);
  x.restore();
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* the vinyl has thickness: a hairline of shade where it meets the glass,
     and a catch of light on the lip above it */
  x.save();
  x.strokeStyle = 'rgba(16,20,28,.34)'; x.lineWidth = 1;
  x.beginPath();
  x.moveTo(x0 + 2, ly0 + .5);      x.lineTo(x1 - 2, ly0 + .5);
  x.moveTo(x0 + 2, ly0 + lh - .5); x.lineTo(x1 - 2, ly0 + lh - .5);
  x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.20)';
  x.beginPath();
  x.moveTo(x0 + 2, ly0 + 1.5);      x.lineTo(x1 - 2, ly0 + 1.5);
  x.moveTo(x0 + 2, ly0 + lh - 1.5); x.lineTo(x1 - 2, ly0 + lh - 1.5);
  x.stroke();
  x.restore();
}

/* --------------------------------------------------------------------------
   The vial. Same path for a line and for a compound.

   IN PHASES, BECAUSE ONE OF THEM IS TOO LONG TO HOLD

   Measured on an emulated iPhone 12 with the CPU brake at 6×, which is about
   what a mid-range phone on low power feels like:

     the band        247 ms
     the wrap        333 ms
     the alpha cut   136 ms
     the PNG          96 ms
     -------------------
     total           831 ms

   Nothing dominates, so there is nothing to optimise away — the picture costs
   what it costs. What was wrong is that all of it happened inside the tap that
   opened the compound, on the main thread, in one frame. For most of a second
   the page could not scroll, could not paint and could not answer a touch,
   which is exactly what "se traba" means.

   So the phases are handed back separately, and the wrap — the longest — is
   handed back as two: sampling the artwork onto the curve, then lighting what
   was sampled. buildVial still runs them straight through for whoever needs
   the answer now: the three line vials at boot, and the harness. buildVialAsync
   runs the same five in the same order with the event loop given a turn between
   them, so no single frame carries more than a fifth of the work and the page
   stays alive while the vial composes.

   The picture is identical either way: same operations, same order, on the
   same canvas. Only the gaps are new.
   -------------------------------------------------------------------------- */
const bandCache = {}, vialCache2 = {}, vialPending = {};

/* A phone browsing forty compounds used to accumulate forty PNG data URLs at
   roughly 600 KB each — some twenty-four megabytes of strings that nothing
   ever released. The cache keeps the last dozen and lets the rest go; a vial
   costs under a second to rebuild and memory pressure costs the whole tab. */
const VIAL_KEEP = 12;
const vialLRU = [];
function remember(key, url){
  const at = vialLRU.indexOf(key);
  if(at >= 0) vialLRU.splice(at, 1);
  vialLRU.push(key);
  while(vialLRU.length > VIAL_KEEP) delete vialCache2[vialLRU.shift()];
  return (vialCache2[key] = url);
}

function vialKey(lineKey, p){ return lineKey + ':' + (p ? p[0] : ''); }

function vialPhases(lineKey, p){
  const key = vialKey(lineKey, p);
  const blank = IMG.blank;
  const c = document.createElement('canvas');
  c.width = VW; c.height = VH;
  const x = c.getContext('2d');
  let band = null;

  return [
    () => {
      x.drawImage(blank, 0, 0, VW, VH);
      band = bandCache[key] || (bandCache[key] = drawBand(lineKey, p));
    },
    () => { wrapBandSample(x, band.canvas, band.size); },
    () => { wrapBandLight(x, band.canvas, blank, band.size); },
    () => {
      /* the glass silhouette owns the alpha — the band never spills past it */
      const cut = x.getImageData(0, 0, VW, VH);
      const bc = document.createElement('canvas');
      bc.width = VW; bc.height = VH;
      const bx = bc.getContext('2d');
      bx.drawImage(blank, 0, 0, VW, VH);
      const bd = bx.getImageData(0, 0, VW, VH);
      for(let i = 3; i < cut.data.length; i += 4) cut.data[i] = bd.data[i];
      x.putImageData(cut, 0, 0);
    },
    () => remember(key, c.toDataURL('image/png'))
  ];
}

function buildVial(lineKey, p){
  const key = vialKey(lineKey, p);
  if(vialCache2[key]) return remember(key, vialCache2[key]);
  let out;
  for(const phase of vialPhases(lineKey, p)) out = phase();
  return out;
}

/* The same vial, one phase per turn of the event loop. Two callers asking for
   the same one at the same time share the one build rather than racing. */
function buildVialAsync(lineKey, p){
  const key = vialKey(lineKey, p);
  if(vialCache2[key]) return Promise.resolve(remember(key, vialCache2[key]));
  if(vialPending[key]) return vialPending[key];

  /* A frame, then the gap after it. setTimeout alone is not enough: it yields
     to the event loop but not to rendering, so two phases can still land in
     the same frame and the frame is long again — measured, twice out of five
     runs. Waiting for rAF puts us inside the frame; the setTimeout inside it
     runs once that frame has been painted, which is exactly the free slot. */
  const breathe = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const run = (async () => {
    let out;
    for(const phase of vialPhases(lineKey, p)){ out = phase(); await breathe(); }
    delete vialPending[key];
    return out;
  })();
  return (vialPending[key] = run);
}

/* --------------------------------------------------------------------------
   Replace the old generator, and the three baked line vials with it.
   -------------------------------------------------------------------------- */
Promise.all([artReady, kitReady]).then(() => {
  makeProductVial = (lineKey, p) => buildVial(lineKey, p);

  /* The build bakes the line vials from this same renderer, so the page can
     paint them before any script runs. Only redraw them when it has not. */
  if(window.__pxBakedLines) return;

  Object.keys(KIT).forEach(line => {
    const was = PHOTOS['vial_' + line];
    const now = buildVial(line, null);
    PHOTOS['vial_' + line] = now;
    document.querySelectorAll('img').forEach(im => {
      if(im.getAttribute('src') === was) im.setAttribute('src', now);
    });
  });
});

/* the harness reaches in through this; the site never does — except for the
   three staged entries, which 66_mobile.js needs because everything in this
   file is closed inside its own scope */
window.__pxLabel = {drawBand: drawBand, buildVial: buildVial, sizeFor: sizeFor,
                    kitReady: kitReady, SIZES: SIZES, SEAT: SEAT,
                    buildVialAsync: buildVialAsync,
                    vialKey: vialKey,
                    cached: (lineKey, p) => vialCache2[vialKey(lineKey, p)] || null};

})();

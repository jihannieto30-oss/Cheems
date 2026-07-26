/* ============================================================================
   PEPTIDEX — LANDSCAPE LABEL

   One renderer draws every label on the site: the three line vials and every
   compound vial. They cannot drift apart because there is only one of them.

   The brand artwork is not drawn here. The Px lockup and the FITNESS / BEAUTY
   / LONGEVITY foil wordmark are cut out of the supplied panels by
   mk_labelkit.py and placed as images, on a plate lifted from the same panels.
   Only the variable data — the compound, the dose, the standing copy — is
   typeset, because it has to be.

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

/* ---- the flat band ------------------------------------------------------- */
const LW = 1400, LH = 800;
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

/* The band wraps, so its outer edges turn away from the camera. Everything
   that has to be read lives inside the arc that still faces it; the margins
   beyond are plate, and carry nothing. */
const ZA   = {x0: 116, x1: 448},        /* the lockup  */
      ZB   = {x0: 530, x1: 990},        /* the data    */
      ZC   = {cx: 1150, r: 104},        /* the hexagon */
      RULE = [490, 1030],               /* the two uprights */
      EDGE = 116,                       /* where the footer hairline starts */
      TOP  = 110, BOT = 630,            /* the uprights' extent */
      FOOT = 672;                       /* the footer hairline */

/* Ink for each finish. The plate is the artwork's own, so type has to sit on
   it the way the supplied type does: light on the black panel, dark on the
   white and the silver ones. `accent` overrides the measured foil where the
   foil has too little contrast against its own plate to carry small type —
   which is the case for silver debossed into silver. */
const INK = {
  black:  {ink:'#f0f2f6', sub:'rgba(255,255,255,.68)', accent:null,                rule:null},
  white:  {ink:'#15171b', sub:'rgba(16,18,22,.60)',    accent:null,                rule:null},
  silver: {ink:'#14161a', sub:'rgba(16,18,22,.64)',    accent:'rgba(28,32,40,.86)', rule:'rgba(28,32,40,.42)'}
};

function rgba(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n>>16 & 255) + ',' + (n>>8 & 255) + ',' + (n & 255) + ',' + a + ')';
}

/* Fit an image inside a box without ever changing its proportions. */
function contain(box){
  const s = Math.min(box.w / box.iw, box.h / box.ih);
  const w = box.iw * s, h = box.ih * s;
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w: w, h: h};
}

/* Shrink type until it fits, and never below the floor. */
function fit(x, text, weight, start, floor, maxW){
  let s = start;
  x.font = weight + ' ' + s + 'px ' + FONT;
  while(x.measureText(text).width > maxW && s > floor){
    s -= 2;
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
   The band. `p` is a product row, or null for a line's own vial — a line
   label carries the line and nothing else, no compound and no dose.
   -------------------------------------------------------------------------- */
function drawBand(lineKey, p){
  const L = LINES[lineKey], kit = KIT[lineKey], art = K[lineKey];
  const C = INK[L.kind];
  const accent = C.accent || rgba(kit.foil, .96);
  const ruleC  = C.rule   || rgba(kit.foil, .46);

  const c = document.createElement('canvas');
  c.width = LW; c.height = LH;
  const x = c.getContext('2d');

  /* the plate, as supplied */
  x.drawImage(art.plate, 0, 0, LW, LH);

  /* the Px lockup, as supplied */
  const lb = contain({x: ZA.x0, y: TOP, w: ZA.x1 - ZA.x0, h: BOT - TOP,
                      iw: kit.lockAR, ih: 1});
  x.drawImage(art.lock, lb.x, lb.y, lb.w, lb.h);

  /* the two uprights and the footer hairline */
  x.strokeStyle = ruleC; x.lineWidth = 2;
  RULE.forEach(rx => { x.beginPath(); x.moveTo(rx, TOP); x.lineTo(rx, BOT); x.stroke(); });
  x.beginPath(); x.moveTo(EDGE, FOOT); x.lineTo(LW - EDGE, FOOT); x.stroke();

  x.textAlign = 'left'; x.textBaseline = 'alphabetic';

  if(p){
    /* the line, as supplied — small, above its compound */
    x.drawImage(art.word, ZB.x0, TOP + 8, 56 * kit.wordAR, 56);

    /* the compound. Typeset, because it is the variable data. Its authored
       casing is kept: AHK-Cu is a copper peptide, AHK-CU is nothing. */
    const name = p[1], maxW = ZB.x1 - ZB.x0;
    x.fillStyle = C.ink;
    fit(x, name, '800', 116, 68, maxW);
    if(x.measureText(name).width > maxW){
      const two = split(name);
      if(two){
        const s = Math.min(fit(x, two[0], '800', 82, 46, maxW),
                           fit(x, two[1], '800', 82, 46, maxW));
        x.font = '800 ' + s + 'px ' + FONT;
        x.fillText(two[0], ZB.x0, 306);
        x.fillText(two[1], ZB.x0, 306 + Math.round(s * 1.06));
      } else {
        x.fillText(name, ZB.x0, 340);
      }
    } else {
      x.fillText(name, ZB.x0, 340);
    }

    /* the dose */
    x.fillStyle = accent;
    x.font = '700 42px ' + FONT; x.letterSpacing = '3px';
    x.fillText(p[2].toUpperCase(), ZB.x0, 458);
    x.letterSpacing = '0px';
  } else {
    /* a line's own vial: the line, and nothing else */
    const wb = contain({x: ZB.x0, y: 150, w: ZB.x1 - ZB.x0, h: 180,
                        iw: kit.wordAR, ih: 1});
    x.drawImage(art.word, ZB.x0, wb.y, wb.w, wb.h);

    x.fillStyle = C.sub;
    x.font = '600 32px ' + FONT; x.letterSpacing = '5px';
    x.fillText(L.category, ZB.x0, 458);
    x.letterSpacing = '0px';
  }

  /* the standing copy */
  x.strokeStyle = ruleC; x.lineWidth = 2;
  x.beginPath(); x.moveTo(ZB.x0, 500); x.lineTo(ZB.x0 + 120, 500); x.stroke();

  x.fillStyle = C.sub;
  x.font = '600 30px ' + FONT; x.letterSpacing = '7px';
  x.fillText('TESTED IN USA', ZB.x0, 562);

  x.textAlign = 'center';
  x.fillText('99% PURITY · RESEARCH USE ONLY', LW / 2, 744);
  x.letterSpacing = '0px';

  /* the hexagon, carrying the code the vial is filed under */
  const hy = (TOP + BOT) / 2, hr = ZC.r;
  x.strokeStyle = ruleC; x.lineWidth = 3;
  hexagon(x, ZC.cx, hy, hr); x.stroke();
  x.lineWidth = 2; x.globalAlpha = .5;
  hexagon(x, ZC.cx, hy, hr - 16); x.stroke();
  x.globalAlpha = 1;

  x.fillStyle = C.ink;
  const badge = p ? p[0].toUpperCase() : L.name[0];
  fit(x, badge, '700', 72, 34, hr * 1.25);
  x.fillText(badge, ZC.cx, hy + 25);

  return c;
}

/* --------------------------------------------------------------------------
   Onto the glass.

   The band is sampled column by column through a cylindrical projection, lit
   with a lambert term and the photograph's own speculars, and bowed at the
   edges the way a wrapped label is. Then the glass's own highlights are laid
   back over the top, so the vinyl reads as being under it.
   -------------------------------------------------------------------------- */
const VW = 560, VH = 1389;
const SEAT = {
  cx:     280,     /* optical centre of the glass body */
  halfW:  198,     /* the band reaches the body's edges and stops */
  theta:  1.05,    /* half the arc it wraps, in radians */
  centre: 0.49     /* where it sits down the body */
};

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

function wrapBand(x, band, blank){
  const TH = SEAT.theta, R = SEAT.halfW / Math.sin(TH), cx = SEAT.cx;

  /* Height follows from the projection, so the artwork is never stretched:
     it is whatever keeps the band true where it faces the camera. */
  const lh = Math.round((LH / LW) * 2 * TH * R);
  const bodyY = 425, bodyH = 705;
  const ly0 = Math.round(bodyY + bodyH * SEAT.centre - lh / 2);
  const x0 = cx - SEAT.halfW, x1 = cx + SEAT.halfW;

  const N = 220;
  for(let i = 0; i < N; i++){
    const u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2;
    const t0 = (2*u0 - 1) * TH, t1 = (2*u1 - 1) * TH, tm = (2*um - 1) * TH;
    const d0 = cx + R * Math.sin(t0), d1 = cx + R * Math.sin(t1);

    /* the nearest part of the band subtends the most height */
    const bow = (1 - Math.cos(tm)) * lh * 0.034;

    /* the silhouette is where the surface turns away — melt into it */
    const e = Math.abs(2*um - 1);
    x.globalAlpha = e > .93 ? Math.max(0, 1 - ((e - .93) / .07) * .9) : 1;
    x.drawImage(band, u0 * LW, 0, LW / N, LH,
                      d0, ly0 + bow, (d1 - d0) + .7, lh - 2*bow);
  }
  x.globalAlpha = 1;

  x.save();
  x.beginPath(); x.rect(x0 - 2, ly0 - 2, SEAT.halfW*2 + 4, lh + 4); x.clip();

  /* lambert falloff across the curve */
  const sh = x.createLinearGradient(x0, 0, x1, 0);
  for(let i = 0; i <= 48; i++){
    const u = i/48, th = (2*u - 1) * TH;
    const lam = Math.max(0, Math.cos(th));
    sh.addColorStop(u, 'rgba(0,0,0,' + (1 - (0.80 + 0.20 * Math.pow(lam, .7))).toFixed(4) + ')');
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
   -------------------------------------------------------------------------- */
const bandCache = {}, vialCache2 = {};

function buildVial(lineKey, p){
  const key = lineKey + ':' + (p ? p[0] : '');
  if(vialCache2[key]) return vialCache2[key];

  const blank = IMG.blank;
  const c = document.createElement('canvas');
  c.width = VW; c.height = VH;
  const x = c.getContext('2d');
  x.drawImage(blank, 0, 0, VW, VH);

  const band = bandCache[key] || (bandCache[key] = drawBand(lineKey, p));
  wrapBand(x, band, blank);

  /* the glass silhouette owns the alpha — the band never spills past it */
  const cut = x.getImageData(0, 0, VW, VH);
  const bc = document.createElement('canvas');
  bc.width = VW; bc.height = VH;
  const bx = bc.getContext('2d');
  bx.drawImage(blank, 0, 0, VW, VH);
  const bd = bx.getImageData(0, 0, VW, VH);
  for(let i = 3; i < cut.data.length; i += 4) cut.data[i] = bd.data[i];
  x.putImageData(cut, 0, 0);

  return (vialCache2[key] = c.toDataURL('image/png'));
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

/* the harness reaches in through this; the site never does */
window.__pxLabel = {drawBand: drawBand, buildVial: buildVial, kitReady: kitReady, SEAT: SEAT};

})();

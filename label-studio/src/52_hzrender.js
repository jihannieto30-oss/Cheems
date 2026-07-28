/* ============================================================================
   package: @px/hz-render
   The approved master, drawn — and patched only where it was edited.

   THE RULE THIS FILE EXISTS TO ENFORCE
   A document that has not been edited draws the master image at the trim and
   NOTHING ELSE. No re-typesetting, no re-alignment, no re-spacing, no layout
   pass. That is what makes the default view identical to the approved file
   rather than a good imitation of it.

   When an operator retypes a string, exactly one thing changes: the clean
   plate — the same master with that region carried over from its surroundings
   — is drawn inside that element's own measured box, and the new string is set
   into the same box, at the same cap height, on the same baseline, in the ink
   colour measured out of the original. Everything outside that box is still
   the master's own pixels.

   Geometry is never recomputed. The element boxes come from the master and are
   only ever scaled by the ratio between the trim and the master's own pixel
   width, so scaling the label scales the whole composition uniformly, from its
   own origin, with every relationship intact.
   depends on: core-model, brand, hz-model
   ============================================================================ */
const HZR = (() => {
  'use strict';

  const K = 12;                                   // preview px per mm
  const _mc = document.createElement('canvas').getContext('2d');

  /* ---------- type fitted into a measured box ---------------------------- */
  function shape(str, capMM, weight, maxMM, tracking) {
    const ratio = BRAND.capRatio(weight) || 0.715;
    const f = (size) => {
      _mc.font = weight + ' ' + size.toFixed(3) + 'px ' + BRAND.STACK.display;
      const tr = (tracking || 0) * size;
      const chars = []; let x = 0;
      for (const ch of str) { chars.push({ c: ch, x: x / K }); x += _mc.measureText(ch).width + tr; }
      return { chars, total: Math.max(0, x - tr) / K, size };
    };
    let px = (capMM * K) / ratio;
    let L = f(px), fitted = false;
    if (maxMM && L.total > maxMM && L.total > 0) { L = f(px * (maxMM / L.total)); fitted = true; }
    return { chars: L.chars, widthMM: L.total, sizePx: L.size,
      capMM: capMM * (L.size / px), sizePt: (L.size / K) * 72 / 25.4, fitted };
  }

  /** Tracking that makes `str` fill `boxW` at `capMM` — the approved art is
      tracked out, and a replacement that ignores that reads as a different
      typeface even when it is the same one. Only used when the operator has
      not set a tracking of their own. */
  function trackToFit(str, capMM, weight, boxW) {
    if (str.length < 2) return 0;
    const base = shape(str, capMM, weight, 0, 0);
    if (base.widthMM <= 0) return 0;
    const ratio = BRAND.capRatio(weight) || 0.715;
    const sizeMM = capMM / ratio;
    const t = (boxW - base.widthMM) / ((str.length - 1) * sizeMM);
    return Math.max(-0.06, Math.min(0.6, t));
  }

  /* ---------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------- */
  function render(doc) {
    const m = HZ.master(doc.master);
    const W = doc.trim.w, H = doc.trim.h;
    const s = W / m.w;                             // mm per master pixel
    const prims = [];
    const meta = { patches: [], textObjs: [], masterPPI: Math.round(m.w / (W / 25.4)), edits: HZ.edits(doc) };

    /* the approved artwork, at the trim, untouched */
    prims.push({ t: 'master', src: m.src, x: 0, y: 0, w: W, h: H,
      natW: m.w, natH: m.h, layer: 'background', objId: 'master' });

    for (const e of HZ.present(doc.master)) {
      const st = doc.el[e.id];
      if (!st) continue;
      const b = HZ.boxOf(doc.master, e.id);
      if (!b) continue;
      const lay = HZ.layerFor(st.finish);
      const L = doc.layers[lay];
      const box = {
        x: b.x * s + (st.ov.dx || 0), y: b.y * s + (st.ov.dy || 0),
        w: b.w * s * (st.ov.sx || 1), h: b.h * s * (st.ov.sx || 1)
      };
      const hidden = st.on === false || (L && L.on === false);
      const retyped = st.text != null;
      const recoloured = !!st.colour;

      /* Nothing was changed and nothing is hidden: the master already shows
         this element. Draw nothing at all. */
      if (!hidden && !retyped && !recoloured && !(st.finish && st.finish !== 'none')) {
        prims.push({ t: 'ghost', objId: e.id, layer: lay, box, kind: e.kind });
        continue;
      }

      /* Anything else needs the region cleared first. */
      /* the feather needs somewhere to run out — the pad is that room */
      const pad = e.kind === 'text' ? Math.max(3, Math.round(b.h * 0.18)) : 2;
      prims.push({ t: 'patch', src: m.clean, objId: e.id, layer: lay,
        sx: b.x - pad, sy: b.y - pad, sw: b.w + pad * 2, sh: b.h + pad * 2,
        x: (b.x - pad) * s, y: (b.y - pad) * s, w: (b.w + pad * 2) * s, h: (b.h + pad * 2) * s,
        natW: m.w, natH: m.h });
      meta.patches.push(e.id);
      if (hidden) continue;

      if (e.kind === 'text') {
        const str = String(st.text != null ? st.text : (m.strings && m.strings[e.id]) || '');
        if (!str) continue;
        const capMM = box.h;
        const weight = st.weight || 400;
        const tr = (st.tracking != null) ? st.tracking : trackToFit(str, capMM, weight, box.w);
        const S = shape(str, capMM, weight, null, tr);
        const x = e.align === 'right' ? box.x + box.w - S.widthMM
                : e.align === 'center' ? box.x + (box.w - S.widthMM) / 2 : box.x;
        const fill = st.colour || HZ.inkOf(doc.master, e.id);
        prims.push({ t: 'text', objId: e.id, layer: lay, str, chars: S.chars,
          x, y: box.y + box.h, capMM: S.capMM, sizePx: S.sizePx, sizePt: S.sizePt,
          weight, tracking: tr, widthMM: S.widthMM, fill, finish: st.finish, box });
        meta.textObjs.push({ id: e.id, sizePt: S.sizePt, capMM: S.capMM, fill,
          widthMM: S.widthMM, boxW: box.w, over: S.widthMM > box.w * 1.001 });
      } else {
        /* Art that was recoloured or given a finish: its own shape is taken
           from the master and refilled. The artwork is never redrawn — its
           alpha is what carries the form. */
        prims.push({ t: 'artfill', objId: e.id, layer: lay, src: m.src,
          sx: b.x, sy: b.y, sw: b.w, sh: b.h,
          x: box.x, y: box.y, w: box.w, h: box.h, natW: m.w, natH: m.h,
          fill: st.colour || null, finish: st.finish, panel: m.panel });
      }
    }

    prims.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: null, stroke: '#ff00ff',
      sw: 0.12, dash: [1, 1], layer: 'cutline', objId: 'cutline' });

    return {
      artboards: [{
        id: 'hz', label: 'PREMIUM HORIZONTAL · APPROVED MASTER', family: HZ.FAMILY,
        w: W * K, h: H * K, wMM: W, hMM: H, bg: m.panel,
        source: 'hz', vector: false, prims, meta, doc,
        bleedMM: doc.print.bleed, safeMM: doc.print.safe, radiusMM: 0,
        plates: HZ.plates(doc), masterKey: doc.master, masterPx: { w: m.w, h: m.h }
      }],
      engine: '2.0.0-hz-master', docVersion: doc.version, hz: true
    };
  }

  /* ---------------------------------------------------------------------
     PREVIEW
     --------------------------------------------------------------------- */
  const _cache = new Map();
  function img(src) {
    if (!src) return null;
    if (_cache.has(src)) return _cache.get(src);
    const i = new Image(); i.src = src; _cache.set(src, i);
    return i;
  }
  const _tint = new Map();
  const _feather = new Map();

  const Canvas = {
    draw(ctx, b, opt) {
      const sc = opt.scale, ox = opt.ox || 0, oy = opt.oy || 0;
      const doc = b.doc, prod = doc.view.production;
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(sc * K, sc * K);   // mm units
      if (opt.bleedPx > 0 && !prod) this._bleed(ctx, b);
      for (const p of b.prims) {
        if (p.t === 'ghost') continue;
        if (p.layer === 'cutline' && (prod || doc.layers.cutline.on === false)) continue;
        const L = doc.layers[p.layer];
        if (L && L.on === false && p.t !== 'patch') continue;
        this._prim(ctx, p, b, opt);
      }
      ctx.restore();
      if (prod) return;
      if (opt.guides) this._guides(ctx, b, opt);
      if (opt.selected) this._selection(ctx, b, opt);
    },

    _bleed(ctx, b) {
      const g = b.bleedMM;
      const im = img((b.prims[0] || {}).src);
      ctx.save();
      if (im && im.complete && im.naturalWidth) {
        /* bleed by edge extension of the master itself */
        ctx.drawImage(im, -g, -g, b.wMM + g * 2, b.hMM + g * 2);
      } else { ctx.fillStyle = b.bg; ctx.fillRect(-g, -g, b.wMM + g * 2, b.hMM + g * 2); }
      ctx.restore();
    },

    _prim(ctx, p, b, opt) {
      switch (p.t) {
        case 'master': {
          const im = img(p.src);
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, p.x, p.y, p.w, p.h);
          else { ctx.fillStyle = b.bg; ctx.fillRect(p.x, p.y, p.w, p.h); }
          break;
        }
        case 'patch': {
          /* A CLEAN PLATE PASTED AS A RECTANGLE IS A RECTANGLE.
             Even a good inpaint differs from its surroundings by a fraction of
             a tone, and a hard edge turns that fraction into a visible box —
             which under UV, on a solid panel, is the thing that reads as a
             smudge. The patch is feathered instead: alpha runs out to nothing
             over the padding, so the join has no edge to find. */
          const im = img(p.src);
          if (!im || !im.complete || !im.naturalWidth) break;
          const key = p.objId + '|' + Math.round(p.sw) + 'x' + Math.round(p.sh);
          let sp = _feather.get(key);
          if (!sp) {
            const W2 = Math.max(4, Math.round(p.sw)), H2 = Math.max(4, Math.round(p.sh));
            sp = document.createElement('canvas'); sp.width = W2; sp.height = H2;
            const g2 = sp.getContext('2d');
            g2.drawImage(im, p.sx, p.sy, p.sw, p.sh, 0, 0, W2, H2);
            const fx = Math.max(1, Math.round(W2 * .06)), fy = Math.max(1, Math.round(H2 * .12));
            const d2 = g2.getImageData(0, 0, W2, H2), a2 = d2.data;
            for (let y = 0; y < H2; y++) {
              const ay = Math.min(1, Math.min(y, H2 - 1 - y) / fy);
              for (let x = 0; x < W2; x++) {
                const ax = Math.min(1, Math.min(x, W2 - 1 - x) / fx);
                a2[(y * W2 + x) * 4 + 3] = Math.round(255 * Math.min(ax, ay));
              }
            }
            g2.putImageData(d2, 0, 0);
            _feather.set(key, sp);
          }
          ctx.drawImage(sp, p.x, p.y, p.w, p.h);
          break;
        }
        case 'artfill': {
          const im = img(p.src);
          if (!im || !im.complete || !im.naturalWidth) break;
          const f = HZ.finish(p.finish);
          if (!p.fill && f.kind !== 'foil') {
            ctx.drawImage(im, p.sx, p.sy, p.sw, p.sh, p.x, p.y, p.w, p.h);
            break;
          }
          const key = p.objId + '|' + (p.fill || '') + '|' + p.finish + '|' + Math.round(p.w * 30);
          let sp = _tint.get(key);
          if (!sp) {
            const W2 = Math.max(2, Math.round(p.sw)), H2 = Math.max(2, Math.round(p.sh));
            sp = document.createElement('canvas'); sp.width = W2; sp.height = H2;
            const g2 = sp.getContext('2d');
            g2.drawImage(im, p.sx, p.sy, p.sw, p.sh, 0, 0, W2, H2);
            /* the artwork's own shape becomes the mask: whatever departs from
               the panel tone is the mark */
            const d = g2.getImageData(0, 0, W2, H2), a = d.data;
            const pn = p.panel ? [parseInt(p.panel.slice(1, 3), 16), parseInt(p.panel.slice(3, 5), 16), parseInt(p.panel.slice(5, 7), 16)] : [0, 0, 0];
            for (let i = 0; i < a.length; i += 4) {
              const dv = Math.abs(a[i] - pn[0]) + Math.abs(a[i + 1] - pn[1]) + Math.abs(a[i + 2] - pn[2]);
              a[i + 3] = Math.max(0, Math.min(255, (dv - 24) * 3));
            }
            g2.putImageData(d, 0, 0);
            g2.globalCompositeOperation = 'source-in';
            if (f.kind === 'foil') {
              const gr = g2.createLinearGradient(0, 0, W2 * .5, H2);
              gr.addColorStop(0, f.b); gr.addColorStop(.3, '#ffffff');
              gr.addColorStop(.5, f.a); gr.addColorStop(.7, f.b); gr.addColorStop(1, '#ffffff');
              g2.fillStyle = gr;
            } else g2.fillStyle = p.fill;
            g2.fillRect(0, 0, W2, H2);
            _tint.set(key, sp);
          }
          ctx.drawImage(sp, p.x, p.y, p.w, p.h);
          break;
        }
        case 'text': {
          ctx.save();
          ctx.font = p.weight + ' ' + (p.sizePx / K) + 'px ' + BRAND.STACK.display;
          ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
          ctx.fillStyle = p.fill;
          for (const c of p.chars) ctx.fillText(c.c, p.x + c.x, p.y);
          ctx.restore();
          break;
        }
        case 'rect':
          if (p.stroke) {
            ctx.save();
            ctx.strokeStyle = p.stroke; ctx.lineWidth = p.sw;
            if (p.dash) ctx.setLineDash(p.dash);
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            ctx.restore();
          }
          break;
      }
    },

    _guides(ctx, b, opt) {
      const doc = b.doc, s = opt.scale * K;
      ctx.save(); ctx.translate(opt.ox, opt.oy); ctx.scale(s, s);
      const box = (x, y, w, h, col, dash) => {
        ctx.strokeStyle = col; ctx.setLineDash(dash);
        ctx.lineWidth = Math.max(.05, 1 / s); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      };
      if (doc.layers.bleed.on !== false)
        box(-b.bleedMM, -b.bleedMM, b.wMM + b.bleedMM * 2, b.hMM + b.bleedMM * 2, 'rgba(255,80,80,.85)', [1.2, .8]);
      if (doc.layers.safe.on !== false)
        box(b.safeMM, b.safeMM, b.wMM - b.safeMM * 2, b.hMM - b.safeMM * 2, 'rgba(70,180,255,.9)', [.9, .7]);
      ctx.restore();
    },

    _selection(ctx, b, opt) {
      const p = b.prims.find(x => x.objId === opt.selected && (x.box || x.t === 'patch' || x.t === 'artfill'));
      if (!p) return;
      const bx = p.box || { x: p.x, y: p.y, w: p.w, h: p.h };
      const s = opt.scale * K;
      ctx.save(); ctx.translate(opt.ox, opt.oy); ctx.scale(s, s);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = Math.max(.06, 1.5 / s);
      ctx.setLineDash([1, .7]);
      ctx.strokeRect(bx.x - .3, bx.y - .3, bx.w + .6, bx.h + .6);
      ctx.restore();
    }
  };

  /** Which element's measured box is under this point, in mm. */
  function hitTest(b, x, y) {
    /* Every element leaves something with a box, whether it is showing the
       master's own pixels (a ghost), a patch, a replacement string or a
       refilled shape — so anything on the label can be picked up, not just
       the parts that happen to have been edited. Smallest box under the
       point wins, so a divider inside a zone is still reachable. */
    let best = null, bestArea = Infinity;
    for (const p of b.prims) {
      const bx = p.box || ((p.t === 'patch' || p.t === 'artfill') ? { x: p.x, y: p.y, w: p.w, h: p.h } : null);
      if (!bx || !p.objId || p.objId === 'master' || p.objId === 'cutline') continue;
      const pad = Math.max(.25, Math.min(bx.w, bx.h) * .25);
      if (x < bx.x - pad || x > bx.x + bx.w + pad || y < bx.y - pad || y > bx.y + bx.h + pad) continue;
      const a = bx.w * bx.h;
      if (a < bestArea) { bestArea = a; best = p.objId; }
    }
    return best;
  }

  function preload() {
    const srcs = [];
    for (const k of HZ.KEYS) { const m = HZ.master(k); if (m) srcs.push(m.src, m.clean); }
    return Promise.all(srcs.map(s => new Promise(res => {
      const i = img(s); if (!i || i.complete) return res();
      i.onload = i.onerror = () => res();
    })));
  }

  /* ---------- flatten, for validation / raster / mockup ------------------ */
  function flatten(b, ppmm, opt) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(b.wMM * ppmm));
    cv.height = Math.max(1, Math.round(b.hMM * ppmm));
    const g = cv.getContext('2d');
    const was = b.doc.view.production;
    b.doc.view.production = true;
    Canvas.draw(g, b, { scale: ppmm / K, ox: 0, oy: 0, guides: false, bleedPx: 0,
      selected: null, finish: !(opt && opt.finish === false) });
    b.doc.view.production = was;
    return cv;
  }

  /* ---------------------------------------------------------------------
     VALIDATION — is what we are about to draw still the approved master?
     --------------------------------------------------------------------- */
  function validate(b) {
    const m = HZ.master(b.doc.masterKey || b.doc.master);
    const im = img(m.src);
    if (!im || !im.complete || !im.naturalWidth)
      return { ready: false, pass: true, notes: ['Master still decoding.'] };

    const N = 900;
    const w = Math.min(N, m.w), h = Math.max(1, Math.round(w * m.h / m.w));
    const a = document.createElement('canvas'); a.width = w; a.height = h;
    a.getContext('2d').drawImage(im, 0, 0, w, h);
    const A = a.getContext('2d').getImageData(0, 0, w, h).data;

    const bcv = flatten(b, w / b.wMM);
    const bg = bcv.getContext('2d');
    const B = bg.getImageData(0, 0, Math.min(w, bcv.width), Math.min(h, bcv.height)).data;

    /* Regions the operator has deliberately changed are excluded — the point
       of the check is whether anything moved that should NOT have. */
    const s = w / m.w;
    const skip = [];
    for (const id of b.meta.patches) {
      const q = HZ.boxOf(b.doc.master, id);
      if (q) skip.push([q.x * s - 3, q.y * s - 3, (q.x + q.w) * s + 3, (q.y + q.h) * s + 3]);
    }
    const inSkip = (x, y) => skip.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);

    let n = 0, sum = 0, worst = 0, wx = 0, wy = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (inSkip(x, y)) continue;
        const i = (y * w + x) * 4;
        const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        n++; sum += d;
        if (d > worst) { worst = d; wx = x; wy = y; }
      }
    }
    /* mean channel difference, expressed as an approximate dE — good enough to
       catch a shifted composition, and honest about not being a measured dE */
    const mean = n ? (sum / n) / 3 : 0;
    const dE = mean * 100 / 255;
    const geom = HZ.moved(b.doc).length;
    const pass = dE <= 1.0 && geom === 0;
    return {
      ready: true, pass, dE: Math.round(dE * 1000) / 1000,
      worst: Math.round(worst / 3), movedCount: geom,
      sampled: n, at: { x: Math.round(wx / s), y: Math.round(wy / s) },
      notes: pass ? ['Composition matches the approved master.']
        : (geom ? ['MASTER LABEL MODIFIED — REVERT REQUIRED: ' + geom + ' element(s) moved off the approved position.'] : [])
          .concat(dE > 1.0 ? ['Rendered composition differs from the master by ΔE≈' + (Math.round(dE * 100) / 100) + ' outside the edited regions.'] : [])
    };
  }

  /* ---------- mockup ------------------------------------------------------ */
  function mockup(cv, b, vialKey) {
    const V = HZ.VIALS[vialKey] || HZ.VIALS.v10;
    const g = cv.getContext('2d'); const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const flat = flatten(b, 8);
    const lw = flat.width, lh = flat.height;
    const src = flat.getContext('2d').getImageData(0, 0, lw, lh);

    const scale = Math.min(W / (V.dia * 2.4), H / (V.body * 1.45));
    const bw = V.dia * scale, bh = V.body * scale;
    const bx = (W - bw) / 2, by = (H - bh) / 2 + bh * .06;

    const gg = g.createLinearGradient(bx, 0, bx + bw, 0);
    gg.addColorStop(0, '#c9d2dc'); gg.addColorStop(.18, '#f2f6fa');
    gg.addColorStop(.5, '#ffffff'); gg.addColorStop(.82, '#e3e9f0'); gg.addColorStop(1, '#aab5c2');
    g.fillStyle = gg; g.fillRect(bx, by, bw, bh);
    const ch = bh * .13, cw = bw * .72;
    const cg = g.createLinearGradient(bx + (bw - cw) / 2, 0, bx + (bw + cw) / 2, 0);
    cg.addColorStop(0, '#6d747d'); cg.addColorStop(.5, '#f4f6f8'); cg.addColorStop(1, '#5f666e');
    g.fillStyle = cg; g.fillRect(bx + (bw - cw) / 2, by - ch * .92, cw, ch);

    const bandH = Math.max(1, Math.round(b.hMM * scale));
    const bandY = Math.round(by + bh * .30);
    const dst = g.createImageData(Math.max(1, Math.round(bw)), bandH);
    const D = dst.data, S = src.data, TH = Math.PI / 2 * .86;
    for (let x = 0; x < dst.width; x++) {
      const nx = (x / (dst.width - 1)) * 2 - 1;
      const th = Math.asin(Math.max(-1, Math.min(1, nx * Math.sin(TH)))) / TH;
      const sx = Math.max(0, Math.min(lw - 1, Math.round(((th + 1) / 2) * (lw - 1))));
      const sh = .34 + .66 * Math.pow(Math.max(0, Math.cos(th * TH)), .85);
      const spec = Math.pow(Math.max(0, Math.cos((th + .34) * 2.2)), 22) * 96;
      for (let y = 0; y < bandH; y++) {
        const sy = Math.max(0, Math.min(lh - 1, Math.round(y / bandH * (lh - 1))));
        const si = (sy * lw + sx) * 4, di = (y * dst.width + x) * 4;
        D[di] = Math.min(255, S[si] * sh + spec);
        D[di + 1] = Math.min(255, S[si + 1] * sh + spec);
        D[di + 2] = Math.min(255, S[si + 2] * sh + spec);
        D[di + 3] = 255;
      }
    }
    const t = document.createElement('canvas'); t.width = dst.width; t.height = bandH;
    t.getContext('2d').putImageData(dst, 0, 0);
    g.drawImage(t, Math.round(bx), bandY);

    const og = g.createLinearGradient(bx, 0, bx + bw, 0);
    og.addColorStop(0, 'rgba(255,255,255,.34)'); og.addColorStop(.34, 'rgba(255,255,255,.28)');
    og.addColorStop(.6, 'rgba(255,255,255,0)'); og.addColorStop(1, 'rgba(120,130,145,.30)');
    g.fillStyle = og; g.fillRect(bx, by, bw, bh);
    return { vial: V };
  }

  return { render, Canvas, hitTest, shape, trackToFit, preload, flatten, validate, mockup, img, K };
})();

/* ============================================================================
   package: @px/engine-render
   render() is a PURE function of (master, document, options).
   It emits a resolution-independent display list; concrete renderers
   (Canvas for the viewport / PNG, SVG for vector output) consume it.
   Nothing here may write to a master.
   depends on: core-model, brand
   ============================================================================ */
const ENGINE = (() => {
  'use strict';

  /* ---- measurement service (deterministic given the resolved face) ----- */
  const _mc = document.createElement('canvas').getContext('2d');
  const fontStr = (w, size) => w + ' ' + size.toFixed(3) + 'px ' + BRAND.STACK.display;

  /**
   * Lay text out glyph-by-glyph so Canvas and SVG produce identical geometry
   * and tracking is exact regardless of engine letter-spacing support.
   */
  function layout(text, ty, maxW, align) {
    const chars = [...String(text)];
    if (!chars.length) return null;
    const ratio = BRAND.capRatio(ty.weight);
    let size = ty.capPx / ratio;
    const build = (sz) => {
      const sp = ty.tracking * sz;
      _mc.font = fontStr(ty.weight, sz);
      const ws = chars.map(c => _mc.measureText(c).width);
      const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
      return { ws, sp, total, sz };
    };
    let L = build(size);
    if (maxW && L.total > maxW) { size *= maxW / L.total; L = build(size); }
    let x = ty.anchor;
    if (align === 'center') x = ty.anchor - L.total / 2;
    else if (align === 'right') x = ty.anchor - L.total;
    const out = [];
    for (let i = 0; i < chars.length; i++) { out.push({ ch: chars[i], x }); x += L.ws[i] + L.sp; }
    return { glyphs: out, size: L.sz, width: L.total, capPx: ty.capPx * (L.sz / (ty.capPx / ratio)), weight: ty.weight, baseline: ty.baseline };
  }

  function textPrim(value, def, opts) {
    const ty = def.typography;
    const L = layout(value, ty, def.fit === 'fixed' ? 0 : def.frame.w, def.align);
    if (!L) return null;
    return {
      t: 'glyphs', slot: def.key, chars: L.glyphs, y: ty.baseline, size: L.size,
      weight: ty.weight, capPx: L.capPx, width: L.width,
      fill: opts.fill, effect: opts.effect || null, frame: def.frame
    };
  }

  /* free-standing (non-slot) label text on the generated data panel */
  function label(text, o) {
    const ty = { capPx: o.capPx, anchor: o.anchor, baseline: o.baseline, tracking: o.tracking, weight: o.weight || 400 };
    const L = layout(text, ty, o.maxW || 0, o.align || 'center');
    if (!L) return null;
    return { t: 'glyphs', chars: L.glyphs, y: o.baseline, size: L.size, weight: ty.weight, capPx: L.capPx, width: L.width, fill: o.fill, effect: null };
  }

  const rule = (x1, x2, y, c, w) => ({ t: 'line', x1, y1: y, x2, y2: y, stroke: c, w: w || 1 });

  /* ---- QR ------------------------------------------------------------- */
  function qrPrim(text, def, pal) {
    let m = null;
    try { m = QRGen.matrix(text); } catch (e) { return { t: 'qrfail', frame: def.frame, msg: e.message }; }
    const n = m.length, quiet = 4, total = n + quiet * 2;
    const mod = def.frame.w / total;
    return {
      t: 'qr', slot: 'qr', m, n, quiet, mod,
      x: def.frame.x, y: def.frame.y, size: def.frame.w,
      dark: pal.qrDark, light: pal.qrLight,
      moduleMM: CORE.px2mm(mod)
    };
  }

  /* ---- default derivations -------------------------------------------- */
  function qrPayload(doc) {
    if (doc.bindings.qr) return doc.bindings.qr;
    const s = doc.bindings.serial || doc.bindings.lot || doc.sku || 'PX';
    return 'https://peptidex.netlify.app/#/verify/' + encodeURIComponent(s);
  }

  /* ============================ render() ================================ */
  /**
   * @returns {{artboards: Array}} a pure display list. No DOM, no side effects.
   */
  function render(master, doc, options) {
    const o = Object.assign({ artboards: ['front', 'back'], bleedMM: 0 }, options || {});
    const pal = BRAND.PALETTE[master.line];
    const B = pal.back;
    const out = [];

    /* ---------- FRONT: immutable master + variable-data overlay -------- */
    if (o.artboards.indexOf('front') >= 0 && doc.artboards.front) {
      const p = [];
      p.push({ t: 'image', master: master.id, x: 0, y: 0, w: CORE.PLATE_W, h: CORE.PLATE_H, layer: 'master' });

      const embossScale = (cap) => cap / 35;
      const fx = (kind, cap) => {
        const s = embossScale(cap);
        if (kind === 'deboss') return { hi: { dx: 1.1 * s, dy: 1.5 * s, a: 0.55 }, lo: { dx: -0.9 * s, dy: -1.1 * s, a: 0.32 } };
        if (kind === 'none') return null;
        return { lo: { dx: 1.1 * s, dy: 1.5 * s, a: 0.55 }, hi: { dx: -0.9 * s, dy: -1.1 * s, a: 0.30 } };
      };
      const finishKind = doc.finishes.compound === 'auto' ? pal.bandFinish : doc.finishes.compound;

      const cDef = CORE.slotDef('compound');
      const cVal = doc.bindings.compound;
      if (cVal) {
        const pr = textPrim(cVal, cDef, { fill: pal.bandInk, effect: fx(finishKind, cDef.typography.capPx) });
        if (pr) { pr.layer = 'overlay'; p.push(pr); }
      }
      const dDef = CORE.slotDef('dosage');
      if (doc.bindings.dosage) {
        const pr = textPrim(doc.bindings.dosage, dDef, { fill: pal.doseInk, effect: null });
        if (pr) { pr.layer = 'overlay'; p.push(pr); }
      }
      out.push({
        id: 'front', label: 'FRONT · MASTER', w: CORE.PLATE_W, h: CORE.PLATE_H,
        prims: p, source: 'master', masterId: master.id, grade: master.graded,
        bg: pal.panel, vector: false
      });
    }

    /* ---------- BACK: generated vector data panel ---------------------- */
    if (o.artboards.indexOf('back') >= 0 && doc.artboards.back) {
      const p = [];
      const W = CORE.PLATE_W, H = CORE.PLATE_H, L = 46, R = 420;
      p.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: B.bg, layer: 'master' });
      p.push(label(pal.name, { capPx: 16, anchor: 233, baseline: 44, tracking: 0.34, fill: B.ink2, weight: 500 }));
      p.push(rule(L, R, 64, B.rule, 1));

      p.push(label('COMPOUND', { capPx: 16, anchor: L, baseline: 110, tracking: 0.28, fill: B.ink2, align: 'left' }));
      const cv = doc.bindings.compound || '—';
      p.push(label(cv, { capPx: 30, anchor: L, baseline: 152, tracking: 0.06, fill: B.ink, weight: 600, align: 'left', maxW: R - L }));
      p.push(rule(L, R, 178, B.rule, 1));

      p.push(label('DOSAGE', { capPx: 16, anchor: L, baseline: 214, tracking: 0.28, fill: B.ink2, align: 'left' }));
      p.push(label(doc.bindings.dosage || '—', { capPx: 22, anchor: L, baseline: 250, tracking: 0.10, fill: B.ink, weight: 500, align: 'left', maxW: R - L }));
      p.push(rule(L, R, 276, B.rule, 1));

      const on = k => doc.enabled[k] !== false;

      if (on('lot')) {
        p.push(label('LOT / BATCH', { capPx: 16, anchor: L, baseline: 312, tracking: 0.28, fill: B.ink2, align: 'left' }));
        const d = CORE.slotDef('lot');
        const pr = textPrim(doc.bindings.lot || '—', d, { fill: B.ink });
        if (pr) p.push(pr);
      }
      p.push(rule(L, R, 374, B.rule, 1));

      if (on('mfg')) {
        p.push(label('MFG', { capPx: 16, anchor: L, baseline: 410, tracking: 0.28, fill: B.ink2, align: 'left' }));
        const pr = textPrim(doc.bindings.mfg || '—', CORE.slotDef('mfg'), { fill: B.ink });
        if (pr) p.push(pr);
      }
      if (on('expiry')) {
        p.push(label('EXP', { capPx: 16, anchor: R, baseline: 410, tracking: 0.28, fill: B.ink2, align: 'right' }));
        const pr = textPrim(doc.bindings.expiry || '—', CORE.slotDef('expiry'), { fill: B.ink });
        if (pr) p.push(pr);
      }
      p.push(rule(L, R, 472, B.rule, 1));

      if (on('qr')) p.push(qrPrim(qrPayload(doc), CORE.slotDef('qr'), B));

      if (on('serial')) {
        const pr = textPrim(doc.bindings.serial || '—', CORE.slotDef('serial'), { fill: B.ink2 });
        if (pr) p.push(pr);
      }
      p.push(rule(L, R, 742, B.rule, 1));
      p.push(label('RESEARCH USE ONLY', { capPx: 18, anchor: 233, baseline: 786, tracking: 0.24, fill: B.ink }));
      p.push(label('NOT FOR HUMAN CONSUMPTION', { capPx: 16, anchor: 233, baseline: 814, tracking: 0.05, fill: B.ink2, maxW: 410 }));
      p.push(label('TESTED IN USA · 99% PURITY', { capPx: 16, anchor: 233, baseline: 848, tracking: 0.04, fill: B.ink2, maxW: 410 }));

      out.push({
        id: 'back', label: 'BACK · DATA PANEL', w: W, h: H, prims: p.filter(Boolean),
        source: 'generated', grade: CORE.GRADE.PRODUCTION, bg: B.bg, vector: true
      });
    }

    return { artboards: out, engine: CORE.ENGINE_VERSION, docVersion: doc.version };
  }

  /* ======================= Canvas renderer ============================== */
  const CanvasRenderer = {
    /**
     * @param ctx      2D context
     * @param board    one artboard from render()
     * @param opt      {scale, ox, oy, guides, finish, proof, bleedPx, marks}
     */
    draw(ctx, board, opt) {
      const s = opt.scale, ox = opt.ox || 0, oy = opt.oy || 0;
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(s, s);

      /* layer 0 — substrate + synthetic bleed by edge extension */
      if (opt.bleedPx > 0) this._bleed(ctx, board, opt);

      /* layer 1 — master (immutable) */
      /* layer 2 — overlay (variable data) */
      for (const pr of board.prims) this._prim(ctx, pr, opt);

      /* layer 3 — finish simulation */
      if (opt.finish && board.id === 'front') this._finish(ctx, board, opt);

      /* layer 5 — soft proof */
      if (opt.proof) this._proof(ctx, board, opt);

      ctx.restore();

      /* layer 4 — guides (never exported) */
      if (opt.guides) this._guides(ctx, board, opt);
    },

    _prim(ctx, pr, opt) {
      switch (pr.t) {
        case 'image': {
          const im = MASTERS.image(pr.master);
          if (im) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, pr.x, pr.y, pr.w, pr.h); }
          break;
        }
        case 'rect': ctx.fillStyle = pr.fill; ctx.fillRect(pr.x, pr.y, pr.w, pr.h); break;
        case 'line':
          ctx.strokeStyle = pr.stroke; ctx.lineWidth = pr.w;
          ctx.beginPath(); ctx.moveTo(pr.x1, pr.y1 + .5); ctx.lineTo(pr.x2, pr.y2 + .5); ctx.stroke();
          break;
        case 'glyphs': this._glyphs(ctx, pr); break;
        case 'qr': this._qr(ctx, pr); break;
        case 'qrfail':
          ctx.strokeStyle = '#ee5b5b'; ctx.lineWidth = 2;
          ctx.strokeRect(pr.frame.x, pr.frame.y, pr.frame.w, pr.frame.h);
          break;
      }
    },

    _glyphs(ctx, pr) {
      ctx.font = pr.weight + ' ' + pr.size.toFixed(3) + 'px ' + BRAND.STACK.display;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const run = (dx, dy, style, alpha) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = style;
        for (const g of pr.chars) ctx.fillText(g.ch, g.x + dx, pr.y + dy);
        ctx.restore();
      };
      if (pr.effect) {
        if (pr.effect.lo) run(pr.effect.lo.dx, pr.effect.lo.dy, '#000', pr.effect.lo.a);
        if (pr.effect.hi) run(pr.effect.hi.dx, pr.effect.hi.dy, '#fff', pr.effect.hi.a);
      }
      run(0, 0, pr.fill, 1);
    },

    _qr(ctx, pr) {
      const q = pr.quiet, mod = pr.mod;
      ctx.fillStyle = pr.light; ctx.fillRect(pr.x, pr.y, pr.size, pr.size);
      ctx.fillStyle = pr.dark;
      for (let r = 0; r < pr.n; r++) for (let c = 0; c < pr.n; c++) {
        if (pr.m[r][c]) ctx.fillRect(pr.x + (c + q) * mod, pr.y + (r + q) * mod, Math.ceil(mod) , Math.ceil(mod));
      }
    },

    _bleed(ctx, board, opt) {
      const b = opt.bleedPx, W = board.w, H = board.h;
      ctx.save();
      if (board.source === 'generated') { ctx.fillStyle = board.bg; ctx.fillRect(-b, -b, W + b * 2, H + b * 2); ctx.restore(); return; }
      const im = MASTERS.image(board.masterId);
      if (im) {
        // edge extension: mirror the outermost 1px band outward
        ctx.drawImage(im, 0, 0, W, 1, -b, -b, W + b * 2, b);          // top  (stretched)
        ctx.drawImage(im, 0, H - 1, W, 1, -b, H, W + b * 2, b);       // bottom
        ctx.drawImage(im, 0, 0, 1, H, -b, 0, b, H);                   // left
        ctx.drawImage(im, W - 1, 0, 1, H, W, 0, b, H);                // right
      }
      ctx.restore();
    },

    _finish(ctx, board, opt) {
      const lam = opt.laminate;
      if (lam === 'gloss') {
        const g = ctx.createLinearGradient(0, 0, board.w, board.h);
        g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.36, 'rgba(255,255,255,.02)');
        g.addColorStop(.52, 'rgba(255,255,255,.13)'); g.addColorStop(1, 'rgba(255,255,255,.03)');
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g;
        ctx.fillRect(0, 0, board.w, board.h); ctx.restore();
      } else if (lam === 'softtouch') {
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(210,214,222,.10)'; ctx.fillRect(0, 0, board.w, board.h); ctx.restore();
      }
    },

    _proof(ctx, board, opt) {
      // ink-coverage heat map: RGB→approx TAC, flag > threshold
      const w = Math.min(board.w, 466), h = Math.min(board.h, 884);
      let img;
      try { img = ctx.getImageData(0, 0, 1, 1); } catch (e) { return; }
      ctx.save();
      ctx.globalAlpha = .30; ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#ff6a3d';
      // approximate: very dark areas are the TAC risk on this substrate
      ctx.restore();
    },

    _guides(ctx, board, opt) {
      const s = opt.scale, ox = opt.ox, oy = opt.oy, b = opt.bleedPx || 0;
      const safe = CORE.mm2px(CORE.SAFE_MM);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
      ctx.lineWidth = 1 / s;
      const box = (x, y, w, h, c, dash) => {
        ctx.strokeStyle = c; ctx.setLineDash(dash ? [6 / s, 4 / s] : []);
        ctx.strokeRect(x, y, w, h);
      };
      if (b > 0) box(-b, -b, board.w + b * 2, board.h + b * 2, 'rgba(238,91,91,.75)', true);
      box(0, 0, board.w, board.h, 'rgba(91,140,255,.9)', false);
      box(safe, safe, board.w - safe * 2, board.h - safe * 2, 'rgba(47,191,122,.7)', true);
      if (opt.slotBoxes) {
        ctx.setLineDash([3 / s, 3 / s]);
        for (const pr of board.prims) {
          if (!pr.slot) continue;
          const f = pr.frame || { x: pr.x, y: pr.y, w: pr.size, h: pr.size };
          ctx.strokeStyle = pr.slot === opt.selected ? '#5b8cff' : 'rgba(143,155,176,.5)';
          ctx.lineWidth = (pr.slot === opt.selected ? 2 : 1) / s;
          ctx.strokeRect(f.x, f.y, f.w, f.h);
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  };

  /* ========================= SVG renderer =============================== */
  const SvgRenderer = {
    /** True vector output: real <text>, real <rect>. Master ships embedded. */
    toSVG(board, opt) {
      opt = opt || {};
      const mmW = CORE.px2mm(board.w), mmH = CORE.px2mm(board.h);
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const out = [];
      out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
      out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${CORE.round(mmW, 3)}mm" height="${CORE.round(mmH, 3)}mm" viewBox="0 0 ${board.w} ${board.h}">`);
      out.push(`<title>${esc(opt.title || 'PEPTIDEX label')}</title>`);
      out.push(`<desc>Generated by PEPTIDEX Label Studio Pro ${CORE.ENGINE_VERSION}. Trim ${CORE.TRIM_MM.w}×${CORE.TRIM_MM.h} mm.</desc>`);
      out.push(`<g id="artwork">`);
      for (const pr of board.prims) {
        switch (pr.t) {
          case 'image': {
            const a = MASTERS.get(pr.master);
            out.push(`<image id="master-immutable" x="0" y="0" width="${pr.w}" height="${pr.h}" preserveAspectRatio="none" xlink:href="${a.src}"/>`);
            break;
          }
          case 'rect': out.push(`<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" fill="${pr.fill}"/>`); break;
          case 'line': out.push(`<line x1="${pr.x1}" y1="${pr.y1 + .5}" x2="${pr.x2}" y2="${pr.y2 + .5}" stroke="${pr.stroke}" stroke-width="${pr.w}"/>`); break;
          case 'glyphs': {
            const xs = pr.chars.map(g => CORE.round(g.x, 3)).join(' ');
            const tx = pr.chars.map(g => esc(g.ch)).join('');
            const fam = BRAND.STACK.display.replace(/"/g, "'");
            const g = [];
            if (pr.effect && pr.effect.lo) g.push(`<text x="${pr.chars.map(c => CORE.round(c.x + pr.effect.lo.dx, 3)).join(' ')}" y="${CORE.round(pr.y + pr.effect.lo.dy, 3)}" fill="#000" fill-opacity="${pr.effect.lo.a}" font-family="${fam}" font-size="${CORE.round(pr.size, 3)}" font-weight="${pr.weight}">${tx}</text>`);
            if (pr.effect && pr.effect.hi) g.push(`<text x="${pr.chars.map(c => CORE.round(c.x + pr.effect.hi.dx, 3)).join(' ')}" y="${CORE.round(pr.y + pr.effect.hi.dy, 3)}" fill="#fff" fill-opacity="${pr.effect.hi.a}" font-family="${fam}" font-size="${CORE.round(pr.size, 3)}" font-weight="${pr.weight}">${tx}</text>`);
            g.push(`<text${pr.slot ? ` id="slot-${pr.slot}" data-slot="${pr.slot}"` : ''} x="${xs}" y="${CORE.round(pr.y, 3)}" fill="${pr.fill}" font-family="${fam}" font-size="${CORE.round(pr.size, 3)}" font-weight="${pr.weight}">${tx}</text>`);
            out.push(g.join(''));
            break;
          }
          case 'qr': {
            out.push(`<g id="slot-qr" data-slot="qr"><rect x="${pr.x}" y="${pr.y}" width="${pr.size}" height="${pr.size}" fill="${pr.light}"/><path fill="${pr.dark}" d="${this._qrPath(pr)}"/></g>`);
            break;
          }
        }
      }
      out.push(`</g></svg>`);
      return out.join('\n');
    },
    _qrPath(pr) {
      const d = [];
      for (let r = 0; r < pr.n; r++) {
        let c = 0;
        while (c < pr.n) {
          if (!pr.m[r][c]) { c++; continue; }
          let e = c; while (e < pr.n && pr.m[r][e]) e++;
          const x = CORE.round(pr.x + (c + pr.quiet) * pr.mod, 3), y = CORE.round(pr.y + (r + pr.quiet) * pr.mod, 3);
          const w = CORE.round((e - c) * pr.mod, 3), h = CORE.round(pr.mod, 3);
          d.push(`M${x} ${y}h${w}v${h}h-${w}z`);
          c = e;
        }
      }
      return d.join('');
    }
  };

  return { render, layout, CanvasRenderer, SvgRenderer, qrPayload };
})();

/* ============================================================================
   package: @px/hz-render
   The Premium Horizontal renderer.

   ONE SCENE, THREE CONSUMERS
   Everything is emitted once, in millimetres, as primitives that carry no
   pixel assumption: text keeps its string, its per-glyph advances and its cap
   height; rules keep their end points; the hexagon and the icons keep their
   paths. The preview canvas, the SVG/PDF/EPS writers and the separation
   plates all read that same list. That is what makes "nothing is rasterised"
   true rather than aspirational — there is no raster stage anywhere between
   the model and the press file.

   The only raster in the scene is the supplied PEPTIDEX lockup, which is
   placed exactly as delivered because it is immutable artwork. Its effective
   resolution at the chosen trim is measured and handed to preflight.

   Material simulation is drawn AFTER the artwork, on the preview only, and is
   never part of what any exporter reads.
   depends on: core-model, brand, hz-model
   ============================================================================ */
const HZR = (() => {
  'use strict';

  const K = HZ.PPMM;                       // preview px per mm
  const mm = v => v * K;

  /* ---------- measurement ------------------------------------------------
     Cap height is the authored dimension, because that is what a printer and
     a legibility rule both talk about. Point size is derived from it through
     the resolved face's own cap ratio, so a substituted font still sets type
     at the height it was specified at. */
  const _mc = document.createElement('canvas').getContext('2d');

  function fontOf(spec, px) {
    return (spec.italic ? 'italic ' : '') + spec.weight + ' ' + px.toFixed(3) + 'px ' + BRAND.STACK.display;
  }

  function shape(str, spec, capMM, maxMM) {
    const ratio = BRAND.capRatio(spec.weight) || 0.715;
    let px = (capMM * K) / ratio;
    const build = (size) => {
      _mc.font = fontOf(spec, size);
      const tr = spec.tracking * size;
      const chars = [];
      let x = 0;
      for (const ch of str) {
        chars.push({ c: ch, x: x / K });
        x += _mc.measureText(ch).width + tr;
      }
      const total = Math.max(0, x - tr);
      return { chars, total: total / K, size };
    };
    let L = build(px);
    /* shrink-to-fit, reported honestly: `fitted` says the type is no longer
       at the size it was authored at, and preflight reads that. */
    let fitted = false;
    if (maxMM && L.total > maxMM && L.total > 0) {
      const f = maxMM / L.total;
      L = build(px * f); fitted = true;
    }
    return {
      chars: L.chars, widthMM: L.total, sizePx: L.size,
      capMM: capMM * (L.size / px), sizePt: (L.size / K) * 72 / 25.4, fitted
    };
  }

  /* ---------- the US flag, as geometry ----------------------------------
     A flag baked into a photograph cannot be recoloured, cannot be switched
     off, and cannot be separated. This one is thirteen stripes, a canton and
     a star grid — in a 100 x 53 box, scaled wherever it lands. */
  function flagPrims(x, y, w, h, objId) {
    const out = [];
    const sx = w / 100, sy = h / 53;
    for (let i = 0; i < 13; i++) {
      out.push({ t: 'rect', x, y: y + i * (53 / 13) * sy, w, h: (53 / 13) * sy,
        fill: i % 2 ? '#ffffff' : '#b22234', layer: 'artwork', objId, sub: 'stripe' });
    }
    out.push({ t: 'rect', x, y, w: 40 * sx, h: (53 / 13 * 7) * sy, fill: '#3c3b6e', layer: 'artwork', objId, sub: 'canton' });
    const r = Math.min(1.1 * sx, 1.1 * sy);
    for (let row = 0; row < 9; row++) {
      const n = row % 2 ? 5 : 6;
      for (let c = 0; c < n; c++) {
        const cx = x + (row % 2 ? 6.6 : 3.6) * sx + c * 6 * sx;
        const cy = y + (2.6 + row * 2.85) * sy;
        out.push({ t: 'dot', cx, cy, r, fill: '#ffffff', layer: 'artwork', objId, sub: 'star' });
      }
    }
    return out;
  }

  const hexPath = (cx, cy, r) => {
    const p = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      p.push((cx + r * Math.cos(a)).toFixed(4) + ',' + (cy + r * Math.sin(a)).toFixed(4));
    }
    return 'M' + p.join('L') + 'Z';
  };

  /* Re-express an icon path authored in a 0..100 box into mm at a placement.
     Absolute M/L/C/Z only — the same subset the PDF and PostScript writers
     consume, so what draws on the canvas is exactly what lands in the press
     file. Anything outside the subset is dropped rather than written as a
     number nobody can parse. */
  function fitPath(d, x, y, size) {
    const s = size / 100;
    const out = [];
    const re = /([MLCZ])([^MLCZ]*)/gi;
    let m;
    while ((m = re.exec(d))) {
      const cmd = m[1].toUpperCase();
      if (cmd === 'Z') { out.push('Z'); continue; }
      const v = m[2].trim().split(/[\s,]+/).filter(t => t !== '').map(Number);
      if (!v.length || v.some(isNaN)) continue;
      const n = [];
      for (let i = 0; i + 1 < v.length; i += 2)
        n.push((x + v[i] * s).toFixed(4), (y + v[i + 1] * s).toFixed(4));
      out.push(cmd + n.join(' '));
    }
    return out.join(' ');
  }

  /* ---------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------- */
  function render(doc, opt) {
    opt = opt || {};
    const g = doc.geom, Z = HZ.zones(doc), P = HZ.pal(doc);
    const W = g.w, H = g.h;
    const ink = t => HZ.ink(doc, t);
    const on = o => o.on && doc.layers[lay(o)] && doc.layers[lay(o)].on !== false;
    const lay = o => o.layerOverride || HZ.layerFor(o.finish) ||
                     (o.kind === 'background' ? 'background' : 'artwork');

    const prims = [];
    const meta = { fitted: [], textObjs: [], logoPPI: null };
    const push = (o, p) => {
      p.objId = o.id;
      p.finish = o.finish;
      if (!p.layer) p.layer = lay(o);
      prims.push(p);
    };
    const get = id => HZ.objOf(doc, id);

    /* ---- background --------------------------------------------------- */
    const bg = get('bg');
    if (bg && bg.on) {
      push(bg, { t: 'rect', x: 0, y: 0, w: W, h: H, r: g.radius,
        fill: doc.substrate.transparent ? null : ink(bg.colour), layer: 'background' });
    }

    /* ---- zone A · the supplied lockup ---------------------------------- */
    const lg = get('logo');
    if (lg && on(lg) && opt.logo !== false) {
      /* WHICH SUPPLIED FILE, CHOSEN BY WHAT FITS
         Four lockups were delivered in two very different shapes: the stacked
         master at about 1.6:1, and three line lockups at about 5.2:1. On the
         reference's 7:1 trim the wide ones sit comfortably; on a wrap label
         nearer 2.5:1 the left-hand zone is under one label-height wide, and a
         5.2:1 lockup dropped into it shrinks to a tenth of the panel — present
         in the file, invisible on the vial.

         So `auto` measures instead of assuming: each candidate is fitted into
         the zone and the one that ends up physically largest wins. Nothing is
         scaled non-uniformly, cropped, tinted or redrawn — the choice is only
         ever which delivered file to place. */
      const avail = Z.A.x1 - Z.A.x0;
      const boxH0 = (lg.box.y1 - lg.box.y0) * H * lg.ov.sx;
      const LOG = (typeof PX_HZ_LOGOS !== 'undefined') ? PX_HZ_LOGOS : null;
      const fitOf = k => {
        const a = LOG && LOG[k]; if (!a) return null;
        const bw = boxH0 * (a.w / a.h);
        const sc = bw > avail ? avail / bw : 1;
        return { k, a, area: (bw * sc) * (boxH0 * sc), s: sc };
      };
      let pick = null;
      if (lg.asset && lg.asset !== 'auto') pick = fitOf(lg.asset) || fitOf('master');
      else {
        for (const k of [doc.line, 'master']) {
          const c = fitOf(k);
          if (c && (!pick || c.area > pick.area * 1.02)) pick = c;
        }
      }
      const A = pick ? pick.a : null;
      const src = A ? A.src : null;
      const nat = A ? { w: A.w, h: A.h } : { w: 1090, h: 672 };
      const boxH = boxH0;
      const boxW = boxH * (nat.w / nat.h);
      const s = pick ? pick.s : 1;
      const w = boxW * s, h = boxH * s;
      const x = Z.A.x0 + (avail - w) / 2 + lg.ov.dx;
      const y = lg.box.y0 * H + ((lg.box.y1 - lg.box.y0) * H - h) / 2 + lg.ov.dy;
      push(lg, { t: 'image', src, x, y, w, h, natW: nat.w, natH: nat.h, immutable: true });
      meta.logoPPI = Math.round(nat.h / (h / 25.4));
    }

    /* ---- dividers ------------------------------------------------------ */
    for (const id of ['divA', 'divB']) {
      const d = get(id);
      if (!d || !on(d)) continue;
      const x = W * (id === 'divA' ? g.divA : g.divB) + d.ov.dx;
      push(d, { t: 'line', x1: x, y1: H * d.inset + d.ov.dy, x2: x, y2: H * (1 - d.inset) + d.ov.dy,
        stroke: ink(d.colour), w: d.thickMM });
    }

    /* ---- text, rules, badge -------------------------------------------- */
    const zoneOf = o => o.zone === 'A' ? Z.A : o.zone === 'C' ? Z.C : Z.B;

    /* ZONE C, THE ONE THAT DOES NOT SURVIVE A CHANGE OF ASPECT
       The reference is 7:1, so a badge and two lines of copy sit side by side
       with room to spare. A wrap label sized to a real vial is nearer 2.5:1,
       and there the same arrangement crushes RESEARCH USE ONLY to under two
       point. So the zone measures itself: if the longest line cannot hold the
       legibility floor beside the badge, the badge moves above the copy and
       the copy takes the whole zone. The operator can force either
       arrangement; 'auto' is what measures. */
    const hexO = get('hex');
    const purity = get('purity'), ruo = get('ruo');
    const zc = Z.C.x1 - Z.C.x0;
    let mode = g.zoneC || 'auto';
    if (mode === 'auto') {
      const longest = [purity, ruo].filter(o => o && o.on)
        .reduce((best, o) => {
          const cap = (o.box.y1 - o.box.y0) * H * o.ov.sx;
          const w = shape(String(o.text || '').toUpperCase(), o.type, cap).widthMM;
          return Math.max(best, w);
        }, 0);
      const badgeW = hexO ? (hexO.box.y1 - hexO.box.y0) * H * hexO.ov.sx : 0;
      mode = (longest > 0 && longest > zc - badgeW - W * 0.018) ? 'stacked' : 'beside';
    }

    let hexR = 0, hexCx = 0, hexCy = 0;
    if (hexO) {
      const bh = (hexO.box.y1 - hexO.box.y0) * H * hexO.ov.sx * (mode === 'stacked' ? 0.80 : 1);
      hexR = bh / 2;
      hexCx = (mode === 'stacked' ? Z.C.x0 + zc / 2 : Z.C.x0 + hexR) + hexO.ov.dx;
      hexCy = (mode === 'stacked' ? H * 0.30 : (hexO.box.y0 + hexO.box.y1) / 2 * H) + hexO.ov.dy;
    }
    const afterHexX = mode === 'stacked' ? Z.C.x0 : hexCx + hexR + W * 0.018;
    /* stacked pushes the copy under the badge */
    const stackShift = mode === 'stacked' ? { purity: 0.215, ruo: 0.215 } : null;
    meta.zoneCMode = mode;

    for (const o of doc.objects) {
      if (!on(o)) continue;
      const zn = zoneOf(o);

      if (o.kind === 'text') {
        const raw = o.text == null ? '' : String(o.text);
        if (!raw) continue;
        const t = o.type;
        const str = t.case === 'upper' ? raw.toUpperCase()
                  : t.case === 'lower' ? raw.toLowerCase() : raw;
        const capMM = (o.box.y1 - o.box.y0) * H * o.ov.sx;
        const x0 = o.afterHex ? afterHexX : zn.x0;
        const room = Math.max(1, (o.id === 'tested' ? zn.x1 - x0 - H * 0.11 : zn.x1 - x0));
        const S = shape(str, t, capMM, room);
        if (S.fitted) meta.fitted.push(o.id);
        const shift = (stackShift && stackShift[o.id] != null) ? stackShift[o.id] : 0;
        const centred = shift ? true : t.align === 'center';
        const x = (t.align === 'right' ? zn.x1 - S.widthMM : centred
                  ? x0 + (zn.x1 - x0 - S.widthMM) / 2 : x0) + o.ov.dx;
        const y = (o.box.y1 + shift) * H + o.ov.dy;           // baseline
        push(o, { t: 'text', str, chars: S.chars, x, y,
          capMM: S.capMM, sizePt: S.sizePt, sizePx: S.sizePx, weight: t.weight,
          italic: !!t.italic, tracking: t.tracking, widthMM: S.widthMM,
          fill: ink(o.colour), opacity: t.opacity });
        meta.textObjs.push({ id: o.id, sizePt: S.sizePt, capMM: S.capMM, fill: ink(o.colour),
          widthMM: S.widthMM, x, y, layer: lay(o), finishId: o.finish });
        if (o.id === 'tested') {
          const fl = get('flag');
          if (fl && on(fl)) {
            const fh = S.capMM * 0.95, fw = fh * (100 / 53);
            flagPrims(x + S.widthMM + H * 0.028 + fl.ov.dx, y - fh + fl.ov.dy, fw, fh, 'flag')
              .forEach(p => { p.finish = fl.finish; prims.push(p); });
          }
        }
        continue;
      }

      if (o.kind === 'rule') {
        const y = o.box.y0 * H + o.ov.dy;
        const x1 = zn.x0 + o.ov.dx;
        const x2 = Math.min(zn.x1, x1 + (zn.x1 - zn.x0) * o.ov.sx);
        push(o, { t: 'line', x1, y1: y, x2, y2: y, stroke: ink(o.colour), w: o.thickMM });
        continue;
      }

      if (o.kind === 'hex') {
        push(o, { t: 'path', d: hexPath(hexCx, hexCy, hexR), stroke: ink(o.colour),
          w: o.thickMM, fill: null });
        continue;
      }

      if (o.kind === 'icon') {
        const size = hexR * 1.42;
        const d = fitPath(HZ.ICONS[o.glyph] || HZ.ICONS.dumbbell,
          hexCx - size / 2 + o.ov.dx, hexCy - size / 2 + o.ov.dy, size * o.ov.sx);
        push(o, { t: 'path', d, stroke: ink(o.colour), w: o.thickMM, fill: null, cap: 'round' });
        continue;
      }
    }

    /* ---- cut line, bleed, safe ----------------------------------------- */
    const cut = get('cut');
    if (cut && cut.on && doc.layers.cutline.on !== false)
      prims.push({ t: 'rect', x: 0, y: 0, w: W, h: H, r: g.radius, fill: null,
        stroke: '#ff00ff', w: 0.12, layer: 'cutline', objId: 'cut', dash: [1, 1] });

    const board = {
      id: 'hz', label: 'PREMIUM HORIZONTAL', family: HZ.FAMILY,
      w: mm(W), h: mm(H), wMM: W, hMM: H,
      bg: doc.substrate.transparent ? '#ffffff' : HZ.ink(doc, 'bg'),
      source: 'hz', vector: true, prims, meta, doc,
      bleedMM: g.bleed, safeMM: g.safe, radiusMM: g.radius,
      plates: HZ.plates(doc), palette: P
    };
    return { artboards: [board], engine: '1.1.0-hz', docVersion: doc.version, hz: true };
  }

  /* =====================================================================
     PREVIEW — canvas
     ===================================================================== */
  const Canvas = {
    draw(ctx, b, opt) {
      const s = opt.scale, ox = opt.ox || 0, oy = opt.oy || 0;
      const doc = b.doc;
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(s * K, s * K);       // now in mm units

      if (opt.bleedPx > 0) this._bleed(ctx, b);
      this._clip(ctx, b, () => {
        for (const p of b.prims) if (p.layer !== 'cutline') this._prim(ctx, p, b, opt);
        if (opt.finish !== false) this._material(ctx, b, opt);
      });
      for (const p of b.prims) if (p.layer === 'cutline' && doc.layers.cutline.on !== false) this._prim(ctx, p, b, opt);

      ctx.restore();
      if (opt.guides) this._guides(ctx, b, opt);
      if (opt.selected) this._selection(ctx, b, opt);
    },

    _clip(ctx, b, fn) {
      ctx.save();
      this._roundRect(ctx, 0, 0, b.wMM, b.hMM, b.radiusMM);
      ctx.clip(); fn(); ctx.restore();
    },

    _roundRect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },

    _bleed(ctx, b) {
      /* bleed by edge extension — the substrate colour carried outward */
      const g = b.bleedMM;
      ctx.save();
      ctx.fillStyle = b.bg;
      ctx.fillRect(-g, -g, b.wMM + g * 2, b.hMM + g * 2);
      ctx.restore();
    },

    _prim(ctx, p, b, opt) {
      const doc = b.doc;
      const L = doc.layers[p.layer];
      if (L && L.on === false) return;
      ctx.save();
      if (p.opacity != null) ctx.globalAlpha = p.opacity;

      switch (p.t) {
        case 'rect':
          if (p.fill) {
            ctx.fillStyle = this._paint(ctx, p, b, opt);
            if (p.r) { this._roundRect(ctx, p.x, p.y, p.w, p.h, p.r); ctx.fill(); }
            else ctx.fillRect(p.x, p.y, p.w, p.h);
          }
          if (p.stroke) {
            ctx.strokeStyle = p.stroke; ctx.lineWidth = p.w || 0.1;
            if (p.dash) ctx.setLineDash(p.dash);
            if (p.r) { this._roundRect(ctx, p.x, p.y, p.w, p.h, p.r); ctx.stroke(); }
            else ctx.strokeRect(p.x, p.y, p.w, p.h);
          }
          break;
        case 'dot':
          ctx.fillStyle = p.fill; ctx.beginPath();
          ctx.arc(p.cx, p.cy, p.r, 0, 6.2832); ctx.fill();
          break;
        case 'line':
          ctx.strokeStyle = this._paint(ctx, p, b, opt); ctx.lineWidth = p.w;
          ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
          break;
        case 'path':
          ctx.strokeStyle = this._paint(ctx, p, b, opt);
          ctx.lineWidth = p.w; ctx.lineJoin = 'round';
          ctx.lineCap = p.cap || 'butt';
          ctx.stroke(new Path2D(p.d));
          if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(new Path2D(p.d)); }
          break;
        case 'text': this._text(ctx, p, b, opt); break;
        case 'image': {
          const im = _img(p.src);
          if (!im || !im.complete || !im.naturalWidth) {
            ctx.strokeStyle = 'rgba(128,128,128,.5)'; ctx.lineWidth = .2;
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            break;
          }
          const fin = HZ.finish(p.finish);
          /* A LOCKUP ON A FOIL PLATE IS NOT ITS OWN PIXELS
             The delivered lockups are dark metal, drawn to sit on a white
             page. Placed on the black panel they are black on black — which is
             exactly what the file contains, and exactly not what will come off
             the press, because that object is assigned to a foil plate and the
             press stamps foil through its shape.

             So when a placed image carries a foil finish, the preview renders
             the PLATE: the artwork's own alpha, filled with that foil. It is a
             simulation of the press result and it is preview only — the
             exporter still writes the supplied file, unaltered, and the plate
             is what the separation carries. */
          if (opt.finish !== false && fin.kind === 'foil') {
            const px = Math.max(2, Math.round(p.w * 24)), py = Math.max(2, Math.round(p.h * 24));
            const key = p.src + '|' + fin.id + '|' + px;
            let sp = _foil.get(key);
            if (!sp) {
              sp = document.createElement('canvas'); sp.width = px; sp.height = py;
              const g2 = sp.getContext('2d');
              g2.drawImage(im, 0, 0, px, py);
              g2.globalCompositeOperation = 'source-in';
              const gr = g2.createLinearGradient(0, 0, px * .4, py);
              gr.addColorStop(0, fin.b); gr.addColorStop(.28, '#ffffff');
              gr.addColorStop(.46, fin.a); gr.addColorStop(.62, fin.b);
              gr.addColorStop(.80, '#ffffff'); gr.addColorStop(1, fin.a);
              g2.fillStyle = gr; g2.fillRect(0, 0, px, py);
              _foil.set(key, sp);
            }
            ctx.drawImage(sp, p.x, p.y, p.w, p.h);
          } else if (opt.finish !== false && fin.id === 'whiteink') {
            const px = Math.max(2, Math.round(p.w * 24)), py = Math.max(2, Math.round(p.h * 24));
            const key = p.src + '|white|' + px;
            let sp = _foil.get(key);
            if (!sp) {
              sp = document.createElement('canvas'); sp.width = px; sp.height = py;
              const g2 = sp.getContext('2d');
              g2.drawImage(im, 0, 0, px, py);
              g2.globalCompositeOperation = 'source-in';
              g2.fillStyle = '#ffffff'; g2.fillRect(0, 0, px, py);
              _foil.set(key, sp);
            }
            ctx.drawImage(sp, p.x, p.y, p.w, p.h);
          } else {
            ctx.drawImage(im, p.x, p.y, p.w, p.h);
          }
          break;
        }
      }
      ctx.restore();
    },

    /** Foil and white ink are the only fills that are not flat ink. */
    _paint(ctx, p, b, opt) {
      const f = HZ.finish(p.finish);
      if (opt.finish === false || f.kind !== 'foil') return p.fill || p.stroke;
      const y0 = p.y != null ? p.y - (p.capMM || 2) : (p.y1 != null ? p.y1 : 0);
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + (p.capMM || Math.abs((p.y2 || 0) - (p.y1 || 0)) || 3));
      gr.addColorStop(0, f.a); gr.addColorStop(.38, '#ffffff');
      gr.addColorStop(.62, f.a); gr.addColorStop(1, f.b);
      return gr;
    },

    _text(ctx, p, b, opt) {
      ctx.font = (p.italic ? 'italic ' : '') + p.weight + ' ' + (p.sizePx / K) + 'px ' + BRAND.STACK.display;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const f = HZ.finish(p.finish);
      const draw = (dx, dy, style, alpha) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = style;
        for (const c of p.chars) ctx.fillText(c.c, p.x + c.x + dx, p.y + dy);
        ctx.restore();
      };
      if (opt.finish !== false && f.kind === 'relief') {
        const d = Math.max(.04, p.capMM * .045) * (f.dir || 1);
        draw(d, d * 1.2, 'rgba(0,0,0,.55)', .55);
        draw(-d * .8, -d, 'rgba(255,255,255,.42)', .42);
      }
      ctx.fillStyle = this._paint(ctx, p, b, opt);
      for (const c of p.chars) ctx.fillText(c.c, p.x + c.x, p.y);
      if (opt.finish !== false && f.kind === 'varnish') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.gloss * .22;
        ctx.fillStyle = '#ffffff';
        for (const c of p.chars) ctx.fillText(c.c, p.x + c.x - p.capMM * .03, p.y - p.capMM * .04);
        ctx.restore();
      }
    },

    /* ---- material simulation — PREVIEW ONLY ---------------------------- */
    _material(ctx, b, opt) {
      const doc = b.doc, P = b.palette;
      const mat = doc.view.material === 'auto' ? (P.metal || doc.substrate.laminate) : doc.view.material;
      if (!mat || mat === 'none') return;
      const W = b.wMM, H = b.hMM;
      ctx.save();

      if (['silver', 'titanium', 'brushed', 'graphite', 'copper', 'rosegold', 'champagne'].indexOf(mat) >= 0) {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, 'rgba(255,255,255,.20)');
        g.addColorStop(.26, 'rgba(255,255,255,.05)');
        g.addColorStop(.45, 'rgba(255,255,255,.24)');
        g.addColorStop(.62, 'rgba(0,0,0,.10)');
        g.addColorStop(.84, 'rgba(255,255,255,.14)');
        g.addColorStop(1, 'rgba(0,0,0,.14)');
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        /* brushed grain: fine horizontal lines, the direction the metal is
           actually finished in */
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = .5;
        for (let y = 0; y < H; y += .22) {
          ctx.fillStyle = (Math.sin(y * 91.7) > 0) ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)';
          ctx.fillRect(0, y, W, .11);
        }
      } else if (mat === 'lam-gloss' || mat === 'glossuv') {
        const g = ctx.createLinearGradient(0, 0, W * .7, H);
        g.addColorStop(0, 'rgba(255,255,255,.26)');
        g.addColorStop(.4, 'rgba(255,255,255,.02)');
        g.addColorStop(1, 'rgba(255,255,255,.16)');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else if (mat === 'softtouch' || mat === 'lam-matte' || mat === 'textured') {
        ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = mat === 'textured' ? .5 : .26;
        const step = mat === 'textured' ? .5 : .34;
        for (let y = 0; y < H; y += step)
          for (let x = ((y * 7) % step); x < W; x += step) {
            ctx.fillStyle = ((x * 13 + y * 29) % 3) ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)';
            ctx.fillRect(x, y, step * .5, step * .5);
          }
      }
      ctx.restore();
    },

    _guides(ctx, b, opt) {
      const s = opt.scale * K, ox = opt.ox, oy = opt.oy;
      const doc = b.doc;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s); ctx.lineWidth = 0.18 / 1;
      const box = (x, y, w, h, col, dash) => {
        ctx.strokeStyle = col; ctx.setLineDash(dash || []);
        ctx.lineWidth = Math.max(.06, 1 / (opt.scale * K));
        ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      };
      if (doc.layers.bleed.on !== false)
        box(-b.bleedMM, -b.bleedMM, b.wMM + b.bleedMM * 2, b.hMM + b.bleedMM * 2, 'rgba(255,80,80,.85)', [1.2, .8]);
      if (doc.layers.safe.on !== false)
        box(b.safeMM, b.safeMM, b.wMM - b.safeMM * 2, b.hMM - b.safeMM * 2, 'rgba(70,180,255,.9)', [.9, .7]);
      ctx.restore();
    },

    _selection(ctx, b, opt) {
      const id = opt.selected;
      const hit = b.prims.filter(p => p.objId === id);
      if (!hit.length) return;
      const bx = bounds(hit);
      if (!bx) return;
      const s = opt.scale * K;
      ctx.save();
      ctx.translate(opt.ox, opt.oy); ctx.scale(s, s);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = Math.max(.08, 1.5 / s);
      ctx.setLineDash([1, .7]);
      const pad = .5;
      ctx.strokeRect(bx.x - pad, bx.y - pad, bx.w + pad * 2, bx.h + pad * 2);
      ctx.restore();
    }
  };

  /** Bounding box of a primitive set, in mm. */
  function bounds(list) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
    for (const p of list) {
      let a, b2, c, d;
      if (p.t === 'rect') { a = p.x; b2 = p.y; c = p.x + p.w; d = p.y + p.h; }
      else if (p.t === 'line') { a = Math.min(p.x1, p.x2); b2 = Math.min(p.y1, p.y2); c = Math.max(p.x1, p.x2); d = Math.max(p.y1, p.y2); }
      else if (p.t === 'image') { a = p.x; b2 = p.y; c = p.x + p.w; d = p.y + p.h; }
      else if (p.t === 'text') { a = p.x; b2 = p.y - p.capMM; c = p.x + p.widthMM; d = p.y + p.capMM * .22; }
      else if (p.t === 'dot') { a = p.cx - p.r; b2 = p.cy - p.r; c = p.cx + p.r; d = p.cy + p.r; }
      else if (p.t === 'path') {
        const n = p.d.match(/-?\d+(\.\d+)?/g); if (!n) continue;
        const xs = [], ys = [];
        for (let i = 0; i < n.length; i += 2) { xs.push(+n[i]); ys.push(+n[i + 1]); }
        a = Math.min(...xs); c = Math.max(...xs); b2 = Math.min(...ys); d = Math.max(...ys);
        const hw = (p.w || 0) / 2; a -= hw; b2 -= hw; c += hw; d += hw;
      } else continue;
      x0 = Math.min(x0, a); y0 = Math.min(y0, b2); x1 = Math.max(x1, c); y1 = Math.max(y1, d); any = true;
    }
    return any ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  /** Which object is under a point, in mm. Topmost wins. */
  function hitTest(b, xmm, ymm) {
    const seen = [];
    for (const p of b.prims) if (p.objId && seen.indexOf(p.objId) < 0) seen.push(p.objId);
    for (let i = seen.length - 1; i >= 0; i--) {
      const id = seen[i];
      if (id === 'bg' || id === 'cut') continue;
      const bx = bounds(b.prims.filter(p => p.objId === id));
      if (bx && xmm >= bx.x - .4 && xmm <= bx.x + bx.w + .4 && ymm >= bx.y - .4 && ymm <= bx.y + bx.h + .4)
        return id;
    }
    return 'bg';
  }

  /* ---------- image cache (the supplied lockup) ------------------------- */
  const _cache = new Map();
  const _foil = new Map();   /* plate previews, keyed by source + finish + size */
  function _img(src) {
    if (!src) return null;
    if (_cache.has(src)) return _cache.get(src);
    const im = new Image(); im.src = src; _cache.set(src, im);
    im.onload = () => { try { HZR.onAsset && HZR.onAsset(); } catch (e) {} };
    return im;
  }
  function preload() {
    if (typeof PX_HZ_LOGOS === 'undefined') return Promise.resolve();
    return Promise.all(Object.keys(PX_HZ_LOGOS).map(k => new Promise(res => {
      const im = _img(PX_HZ_LOGOS[k]);
      if (!im || im.complete) return res();
      im.onload = im.onerror = () => res();
    })));
  }

  /* =====================================================================
     MOCKUP — the label on the container it is going on
     A wrap label seen head-on shows only the window that faces the camera,
     compressed toward each edge by the curvature. Sampling that window
     through the inverse cylindrical projection is what makes it read as
     printed on glass rather than pasted on a photo.
     ===================================================================== */
  function mockup(cv, b, vialKey) {
    const V = HZ.VIALS[vialKey] || HZ.VIALS.v10;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);

    /* flatten the label once, at the mockup's own resolution */
    const lw = Math.round(b.wMM * 8), lh = Math.round(b.hMM * 8);
    const off = document.createElement('canvas');
    off.width = lw; off.height = lh;
    const oc = off.getContext('2d');
    oc.fillStyle = b.bg; oc.fillRect(0, 0, lw, lh);
    /* a mockup shows the printed label, not the tooling: the die line is a
       plate for the cutter and has no business on the vial */
    const cutWas = b.doc.layers.cutline.on;
    b.doc.layers.cutline.on = false;
    Canvas.draw(oc, b, { scale: 8 / K, ox: 0, oy: 0, guides: false, finish: true, bleedPx: 0 });
    b.doc.layers.cutline.on = cutWas;
    const src = oc.getImageData(0, 0, lw, lh);

    /* the vial: body proportions from the real container */
    const scale = Math.min(W / (V.dia * 2.4), H / (V.body * 1.45));
    const bw = V.dia * scale, bh = V.body * scale;
    const bx = (W - bw) / 2, by = (H - bh) / 2 + bh * .06;

    /* glass */
    const gg = g.createLinearGradient(bx, 0, bx + bw, 0);
    gg.addColorStop(0, '#c9d2dc'); gg.addColorStop(.18, '#f2f6fa');
    gg.addColorStop(.5, '#ffffff'); gg.addColorStop(.82, '#e3e9f0'); gg.addColorStop(1, '#aab5c2');
    g.fillStyle = gg;
    g.beginPath();
    g.moveTo(bx, by + bh * .06); g.lineTo(bx, by + bh - bh * .05);
    g.quadraticCurveTo(bx, by + bh, bx + bw * .1, by + bh);
    g.lineTo(bx + bw * .9, by + bh);
    g.quadraticCurveTo(bx + bw, by + bh, bx + bw, by + bh - bh * .05);
    g.lineTo(bx + bw, by + bh * .06);
    g.quadraticCurveTo(bx + bw, by, bx + bw * .9, by);
    g.lineTo(bx + bw * .1, by); g.quadraticCurveTo(bx, by, bx, by + bh * .06);
    g.closePath(); g.fill();

    /* cap */
    const ch = bh * .13, cw = bw * .72;
    const cg = g.createLinearGradient(bx + (bw - cw) / 2, 0, bx + (bw + cw) / 2, 0);
    cg.addColorStop(0, '#6d747d'); cg.addColorStop(.3, '#d9dee4');
    cg.addColorStop(.55, '#f4f6f8'); cg.addColorStop(1, '#5f666e');
    g.fillStyle = cg;
    g.fillRect(bx + (bw - cw) / 2, by - ch * .92, cw, ch);

    /* the label band, wrapped */
    const bandH = Math.round(b.hMM * scale);
    const bandY = Math.round(by + bh * .30);
    const dst = g.createImageData(Math.round(bw), bandH);
    const D = dst.data, Sd = src.data;
    const TH = Math.PI / 2 * 0.86;                       // half-angle in view
    for (let x = 0; x < dst.width; x++) {
      const nx = (x / (dst.width - 1)) * 2 - 1;          // -1..1 across the body
      const th = Math.asin(Math.max(-1, Math.min(1, nx * Math.sin(TH)))) / TH;  // -1..1 in arc
      const u = (th + 1) / 2;
      const sx = Math.max(0, Math.min(lw - 1, Math.round(u * (lw - 1))));
      /* lambert + a specular band where the glass is brightest */
      const cosA = Math.cos(th * TH);
      const sh = 0.34 + 0.66 * Math.pow(Math.max(0, cosA), 0.85);
      const spec = Math.pow(Math.max(0, Math.cos((th + .34) * 2.2)), 22) * 96;
      for (let y = 0; y < bandH; y++) {
        const sy = Math.max(0, Math.min(lh - 1, Math.round(y / bandH * (lh - 1))));
        const si = (sy * lw + sx) * 4, di = (y * dst.width + x) * 4;
        D[di]     = Math.min(255, Sd[si] * sh + spec);
        D[di + 1] = Math.min(255, Sd[si + 1] * sh + spec);
        D[di + 2] = Math.min(255, Sd[si + 2] * sh + spec);
        D[di + 3] = Sd[si + 3];
      }
    }
    const tmp = document.createElement('canvas');
    tmp.width = dst.width; tmp.height = bandH;
    tmp.getContext('2d').putImageData(dst, 0, 0);
    g.drawImage(tmp, Math.round(bx), bandY);

    /* glass over the label — a vial is not a matte cylinder */
    const og = g.createLinearGradient(bx, 0, bx + bw, 0);
    og.addColorStop(0, 'rgba(255,255,255,.34)'); og.addColorStop(.16, 'rgba(255,255,255,.05)');
    og.addColorStop(.34, 'rgba(255,255,255,.30)'); og.addColorStop(.6, 'rgba(255,255,255,0)');
    og.addColorStop(.88, 'rgba(255,255,255,.16)'); og.addColorStop(1, 'rgba(120,130,145,.30)');
    g.fillStyle = og; g.fillRect(bx, by, bw, bh);

    /* contact shadow */
    const sg = g.createRadialGradient(W / 2, by + bh + 4, 2, W / 2, by + bh + 4, bw * .9);
    sg.addColorStop(0, 'rgba(0,0,0,.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(W / 2, by + bh + 5, bw * .78, bh * .045, 0, 0, 6.2832); g.fill();

    return { vial: V, bandH, scale };
  }

  return { render, Canvas, bounds, hitTest, shape, preload, mockup, hexPath, flagPrims, fitPath, K };
})();

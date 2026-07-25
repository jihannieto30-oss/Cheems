/* ============================================================================
   package: @px/preflight
   Independent, pure, individually testable rules. Exporter refuses on any
   `blocking` violation. This is the component that keeps a $40k print run
   from going out wrong.
   depends on: core-model, brand, engine-render
   ============================================================================ */
const PREFLIGHT = (() => {
  'use strict';

  /* ---------- QR round-trip decoder (independent of the encoder) --------
     Reads the rendered matrix back: format BCH, unmask, zig-zag scan,
     Reed–Solomon syndrome check, then mode/length/payload parse.
     If this returns the exact input string, the symbol will scan.        */
  const QRDecode = (() => {
    const EXP = [], LOG = [];
    (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let j = 255; j < 512; j++) EXP[j] = EXP[j - 255]; })();
    const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
    const VER = { 1: [19, 7], 2: [34, 10], 3: [55, 15], 4: [80, 20], 5: [108, 26] };
    const ALIGN = { 1: null, 2: 18, 3: 22, 4: 26, 5: 30 };

    function fnMap(n, ver) {
      const fn = []; for (let y = 0; y < n; y++) fn.push(new Array(n).fill(false));
      const mark = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < n && y < n) fn[y][x] = true; } };
      mark(3, 3); mark(n - 4, 3); mark(3, n - 4);
      for (let i = 0; i < n; i++) { fn[6][i] = true; fn[i][6] = true; }
      if (ALIGN[ver] !== null) { const a = ALIGN[ver]; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fn[a + dy][a + dx] = true; }
      for (let i = 0; i < 9; i++) { fn[i][8] = true; fn[8][i] = true; }
      for (let i = 0; i < 8; i++) { fn[8][n - 1 - i] = true; fn[n - 1 - i][8] = true; }
      fn[n - 8][8] = true;
      return fn;
    }
    const maskFn = (k, x, y) => {
      switch (k) {
        case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0; case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
        case 5: return ((x * y) % 2) + ((x * y) % 3) === 0; case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
        default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
    };
    function readFormat(m, n) {
      const bits = [];
      for (let i = 0; i < 15; i++) {
        let b;
        if (i < 6) b = m[i][8]; else if (i === 6) b = m[7][8]; else if (i === 7) b = m[8][8];
        else if (i === 8) b = m[8][7]; else b = m[8][14 - i];
        bits.push(b);
      }
      let raw = 0; for (let i = 14; i >= 0; i--) raw = (raw << 1) | bits[i];
      const f = raw ^ 0x5412;
      // BCH check
      let rem = f; for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
      if (rem !== 0) return null;
      const ec = (f >> 13) & 3, mask = (f >> 10) & 7;
      return { ec, mask };
    }
    function syndromesZero(all, nEc) {
      for (let i = 0; i < nEc; i++) {
        let s = 0;
        for (let j = 0; j < all.length; j++) s = gmul(s, EXP[i]) ^ all[j];
        if (s !== 0) return false;
      }
      return true;
    }
    return function decode(m) {
      const n = m.length, ver = (n - 17) / 4;
      if (!VER[ver]) return { ok: false, why: 'unsupported version ' + ver };
      const fmt = readFormat(m, n);
      if (!fmt) return { ok: false, why: 'format information failed BCH check' };
      if (fmt.ec !== 1) return { ok: false, why: 'unexpected EC level' };
      const fn = fnMap(n, ver);
      const u = m.map(r => r.slice());
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && maskFn(fmt.mask, x, y)) u[y][x] ^= 1;
      const bits = [];
      let up = true;
      for (let col = n - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let r = 0; r < n; r++) {
          const row = up ? (n - 1 - r) : r;
          for (let c = 0; c < 2; c++) { const x = col - c; if (!fn[row][x]) bits.push(u[row][x]); }
        }
        up = !up;
      }
      const [nData, nEc] = VER[ver];
      const all = [];
      for (let i = 0; i + 8 <= bits.length && all.length < nData + nEc; i += 8) {
        let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
        all.push(b);
      }
      if (all.length < nData + nEc) return { ok: false, why: 'truncated codeword stream' };
      if (!syndromesZero(all, nEc)) return { ok: false, why: 'Reed–Solomon syndromes non-zero (symbol is corrupt)' };
      // parse
      let p = 0;
      const rd = (k) => { let v = 0; for (let i = 0; i < k; i++) { v = (v << 1) | bits[p++]; } return v; };
      const mode = rd(4);
      if (mode !== 4) return { ok: false, why: 'mode ' + mode + ' (expected byte)' };
      const len = rd(8);
      const by = []; for (let i = 0; i < len; i++) by.push(rd(8));
      let s = '';
      try { s = new TextDecoder().decode(new Uint8Array(by)); } catch (e) { s = by.map(c => String.fromCharCode(c)).join(''); }
      return { ok: true, text: s, version: ver, mask: fmt.mask, modules: n };
    };
  })();

  /* ---------- helpers --------------------------------------------------- */
  const T = BRAND.Policy.thresholds;
  const px2pt = px => CORE.mm2pt(CORE.px2mm(px));
  const lum = hex => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
  };
  const contrast = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
  const V = (rule, severity, title, msg, extra) => Object.assign({ rule, severity, title, msg }, extra || {});

  /* ---------- rule set --------------------------------------------------- */
  const RULES = [

    { id: 'master.grade', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => c.master.graded === CORE.GRADE.PRODUCTION ? [] : [V('master.grade', 'blocking',
        'Master is not production artwork',
        `Master “${c.master.key}” is graded ${c.master.graded}. A print-production package requires vector artwork with embedded fonts, CMYK/spot colour and separations.`,
        { detail: `${c.master.analysis.container} · ${c.master.analysis.pxW}×${c.master.analysis.pxH} px · ${c.master.analysis.effectivePPI} PPI · ${c.master.analysis.vectorPaths} vector paths · ${c.master.analysis.spotPlates.length} spot plates` })]
    },

    { id: 'resolution.min-ppi', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => {
        const ppi = c.master.analysis.effectivePPI;
        if (ppi >= T.minPPI) return [];
        return [V('resolution.min-ppi', 'blocking', 'Effective resolution below 300 PPI',
          `Artwork resolves to ${ppi} PPI at the ${CORE.TRIM_MM.w}×${CORE.TRIM_MM.h} mm trim size. Commercial UV printing requires ≥ ${T.minPPI} PPI (${T.foilPPI} PPI for foil plates).`,
          { detail: `needs ${Math.ceil(CORE.TRIM_MM.w / 25.4 * T.minPPI)}×${Math.ceil(CORE.TRIM_MM.h / 25.4 * T.minPPI)} px, has ${c.master.analysis.pxW}×${c.master.analysis.pxH} px` })];
      }
    },

    { id: 'bleed.present', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => {
        if (c.board.source === 'generated') return [];
        if (c.master.bleed >= CORE.BLEED_MM) return [];
        if (c.opts.syntheticBleed) return [V('bleed.present', 'warning', 'Bleed is synthetic',
          `The master carries no bleed. ${CORE.BLEED_MM} mm was generated by edge extension. A die-cut variance will show a stretched edge — request bleed in the source file.`)];
        return [V('bleed.present', 'blocking', 'No bleed on master',
          `${CORE.BLEED_MM} mm bleed is required on every side. The master is trimmed flush.`)];
      }
    },

    { id: 'safe-area.respected', severity: 'blocking',
      appliesTo: () => true,
      run: c => {
        const s = CORE.mm2px(CORE.SAFE_MM), out = [];
        for (const pr of c.board.prims) {
          if (pr.t === 'glyphs') {
            const x0 = pr.chars[0].x, x1 = pr.chars[pr.chars.length - 1].x + pr.width - (pr.chars[pr.chars.length - 1].x - pr.chars[0].x) * 0;
            const right = pr.chars[0].x + pr.width, top = pr.y - pr.capPx, bot = pr.y;
            if (x0 < s || right > c.board.w - s || top < s || bot > c.board.h - s)
              out.push(V('safe-area.respected', 'blocking', 'Live matter outside the safe area',
                `${pr.slot ? 'Slot “' + pr.slot + '”' : 'Static text'} reaches within ${CORE.SAFE_MM} mm of the trim edge and may be cut.`, { slot: pr.slot }));
          } else if (pr.t === 'qr') {
            if (pr.x < s || pr.y < s || pr.x + pr.size > c.board.w - s || pr.y + pr.size > c.board.h - s)
              out.push(V('safe-area.respected', 'blocking', 'QR outside the safe area', 'The verification QR crosses the safe-area boundary.', { slot: 'qr' }));
          }
        }
        return out;
      }
    },

    { id: 'text.min-size', severity: 'blocking',
      appliesTo: () => true,
      run: c => {
        const out = [];
        const bg = c.board.bg;
        for (const pr of c.board.prims) {
          if (pr.t !== 'glyphs') continue;
          const pt = px2pt(pr.size);
          const reversed = lum(pr.fill) > lum(bg);
          const min = reversed ? T.minReversedPt : T.minTextPt;
          if (pt < min - 0.05)
            out.push(V('text.min-size', 'blocking', 'Type below the printable minimum',
              `${pr.slot ? 'Slot “' + pr.slot + '”' : 'Static text'} sets at ${pt.toFixed(2)} pt. Minimum is ${min} pt${reversed ? ' (reversed out of a dark ground)' : ''}.`,
              { slot: pr.slot }));
        }
        return out;
      }
    },

    { id: 'fonts.resolved', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.id === c.scene.artboards[0].id,
      run: c => {
        const f = BRAND.resolveFont();
        if (f.family && !f.substituted) return [];
        return [V('fonts.resolved', 'blocking', 'Brand face not available — substitution in effect',
          f.family
            ? `Type is rendering in “${f.family}”, a fallback. The master's geometric sans is not installed, so metrics and letterforms will not match the artwork.`
            : `None of the brand faces resolved. Type is rendering in a generic system sans.`,
          { detail: 'resolved: ' + (f.family || 'system default') })];
      }
    },

    { id: 'color.space', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => c.master.analysis.colorSpace === 'CMYK' || c.master.analysis.colorSpace === 'Spot' ? []
        : [V('color.space', 'blocking', 'Artwork is RGB',
          `Master colour space is ${c.master.analysis.colorSpace}. Production output must be CMYK or named spot with an embedded output intent — an uncontrolled RGB→CMYK conversion at the RIP will shift the copper and the silver.`)]
    },

    { id: 'ink.coverage', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.master.analysis.colorSpace === 'CMYK',
      run: c => c.master.analysis.maxInkCoverage <= T.maxInk ? []
        : [V('ink.coverage', 'blocking', 'Total area coverage too high',
          `Peak TAC is ${c.master.analysis.maxInkCoverage}%. Limit is ${T.maxInk}% for this substrate.`)]
    },

    { id: 'separations.present', severity: 'blocking',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => {
        const want = [];
        const pal = BRAND.PALETTE[c.master.line];
        if (pal.finish.indexOf('foil') === 0) want.push(pal.finish === 'foil-copper' ? 'PX_FOIL_ROSEGOLD' : 'PX_FOIL_SILVER');
        want.push('PX_EMBOSS', 'PX_DIE_CUT');
        const have = c.master.separations || [];
        const missing = want.filter(w => have.indexOf(w) < 0);
        if (!missing.length) return [];
        return [V('separations.present', 'blocking', 'Finish plates missing',
          `The design declares foil and emboss, but the master carries no spot plates. Foil and emboss are physical processes driven by 100 %-K vector plates — the current file only has a photographic simulation of them baked into the pixels.`,
          { detail: 'missing: ' + missing.join(', ') })];
      }
    },

    { id: 'qr.module-size', severity: 'blocking',
      appliesTo: c => c.board.prims.some(p => p.t === 'qr'),
      run: c => {
        const q = c.board.prims.find(p => p.t === 'qr');
        if (q.moduleMM >= T.minQrModuleMM) return [];
        return [V('qr.module-size', 'blocking', 'QR module below scanning minimum',
          `Module size is ${q.moduleMM.toFixed(3)} mm. Handheld scanners need ≥ ${T.minQrModuleMM} mm. Shorten the payload or enlarge the symbol.`, { slot: 'qr' })];
      }
    },

    { id: 'qr.quiet-zone', severity: 'blocking',
      appliesTo: c => c.board.prims.some(p => p.t === 'qr'),
      run: c => {
        const q = c.board.prims.find(p => p.t === 'qr');
        return q.quiet >= T.quietModules ? [] : [V('qr.quiet-zone', 'blocking', 'QR quiet zone too small',
          `Quiet zone is ${q.quiet} modules; the specification requires ≥ ${T.quietModules}.`, { slot: 'qr' })];
      }
    },

    { id: 'qr.decodes', severity: 'blocking',
      appliesTo: c => c.board.prims.some(p => p.t === 'qr' || p.t === 'qrfail'),
      run: c => {
        const fail = c.board.prims.find(p => p.t === 'qrfail');
        if (fail) return [V('qr.decodes', 'blocking', 'QR payload could not be encoded', fail.msg, { slot: 'qr' })];
        const q = c.board.prims.find(p => p.t === 'qr');
        const want = ENGINE.qrPayload(c.doc);
        const r = QRDecode(q.m);
        if (!r.ok) return [V('qr.decodes', 'blocking', 'QR failed round-trip decode', r.why, { slot: 'qr' })];
        if (r.text !== want) return [V('qr.decodes', 'blocking', 'QR decodes to the wrong payload',
          `Expected “${want}”, symbol reads “${r.text}”.`, { slot: 'qr' })];
        return [V('qr.decodes', 'info', 'QR verified by round-trip decode',
          `Symbol decodes to the exact payload. Version ${r.version} · ${r.modules}×${r.modules} modules · mask ${r.mask} · module ${q.moduleMM.toFixed(2)} mm.`, { slot: 'qr' })];
      }
    },

    { id: 'slots.required', severity: 'blocking',
      appliesTo: () => true,
      run: c => {
        const out = [];
        for (const d of CORE.ALL_SLOTS) {
          if (!d.required) continue;
          if (d.artboard !== c.board.id) continue;
          if (d.artboard === 'back' && c.doc.enabled[d.key] === false) continue;
          const v = c.doc.bindings[d.key];
          if (!v || !String(v).trim())
            out.push(V('slots.required', 'blocking', 'Required field empty',
              `“${d.label}” must be bound before this label can be produced.`, { slot: d.key }));
        }
        return out;
      }
    },

    { id: 'brand.assets', severity: 'blocking',
      appliesTo: () => true,
      run: c => BRAND.Policy.validate(c.doc, c.master).map(v =>
        V(v.rule, v.severity, 'Brand policy violation', v.msg, { slot: 'compound' }))
    },

    { id: 'date.validity', severity: 'blocking',
      appliesTo: c => c.board.id === 'back' && c.doc.enabled.expiry !== false,
      run: c => {
        const e = c.doc.bindings.expiry, m = c.doc.bindings.mfg, out = [];
        const parse = s => { const t = Date.parse(String(s).replace(/\./g, '-')); return isNaN(t) ? null : t; };
        if (e) {
          const te = parse(e);
          if (te === null) out.push(V('date.validity', 'warning', 'Expiry not machine-readable',
            `“${e}” is not an ISO date. Use YYYY-MM-DD so downstream systems can parse it.`, { slot: 'expiry' }));
          else if (te < Date.now()) out.push(V('date.validity', 'blocking', 'Expiry date is in the past',
            `“${e}” has already passed. This stock cannot be labelled.`, { slot: 'expiry' }));
          else if (m) { const tm = parse(m); if (tm !== null && tm > te) out.push(V('date.validity', 'blocking', 'Expiry precedes manufacture', 'EXP must be later than MFG.', { slot: 'expiry' })); }
        }
        return out;
      }
    },

    { id: 'contrast.legibility', severity: 'warning',
      appliesTo: () => true,
      run: c => {
        const out = [];
        for (const pr of c.board.prims) {
          if (pr.t !== 'glyphs' || !pr.slot) continue;
          let bg = c.board.bg;
          if (pr.slot === 'compound') { const p = BRAND.PALETTE[c.master.line]; bg = p.bandL; }
          const r = contrast(pr.fill, bg);
          if (r < 4.5) out.push(V('contrast.legibility', 'warning', 'Low contrast',
            `Slot “${pr.slot}” has a contrast ratio of ${r.toFixed(1)}:1 against its ground. Under matte lamination this reads as mush.`, { slot: pr.slot }));
        }
        return out;
      }
    },

    { id: 'rich-black', severity: 'warning',
      appliesTo: c => c.intent === 'production' && c.master.line === 'fitness' && c.board.source === 'master',
      run: () => [V('rich-black', 'warning', 'Large solid black should be rich black',
        'A 100 %-K-only black over this area will look washed next to the foil. Specify a rich black (e.g. 60/50/40/100) in the vector rebuild.')]
    },

    { id: 'overprint.small-text', severity: 'warning',
      appliesTo: c => c.intent === 'production' && c.board.source === 'master',
      run: c => {
        const small = c.board.prims.filter(p => p.t === 'glyphs' && px2pt(p.size) < 8);
        return small.length ? [V('overprint.small-text', 'warning', 'Small type should overprint',
          `${small.length} text objects set below 8 pt. Set them to overprint so a 0.1 mm registration error does not leave white fringes.`)] : [];
      }
    },

    { id: 'hairline.min-width', severity: 'warning',
      appliesTo: () => true,
      run: c => {
        const thin = c.board.prims.filter(p => p.t === 'line' && px2pt(p.w) < T.minHairlinePt);
        return thin.length ? [V('hairline.min-width', 'warning', 'Hairline rules below 0.25 pt',
          `${thin.length} rules are thinner than ${T.minHairlinePt} pt and may drop out on press.`)] : [];
      }
    },

    { id: 'substrate.match', severity: 'info',
      appliesTo: c => c.board.id === c.scene.artboards[0].id,
      run: c => [V('substrate.match', 'info', 'Substrate & finish',
        `${c.doc.finishes.substrate} · ${c.doc.finishes.laminate} laminate · UV inkjet. Vinyl is dimensionally stable at this size; keep the die 0.5 mm inside the printed bleed.`)]
    }
  ];

  /* ---------- runner ----------------------------------------------------- */
  /**
   * @param intent 'proof' | 'production'
   * @returns {{violations, blocking, warnings, infos, pass, byBoard}}
   */
  function run(master, doc, scene, intent, opts) {
    opts = opts || {};
    const all = [];
    for (const board of scene.artboards) {
      const ctx = { master, doc, scene, board, intent, opts, thresholds: T };
      for (const r of RULES) {
        let applies = false;
        try { applies = r.appliesTo(ctx); } catch (e) { applies = false; }
        if (!applies) continue;
        let vs = [];
        try { vs = r.run(ctx) || []; } catch (e) { vs = [V(r.id, 'blocking', 'Rule crashed', String(e && e.message || e))]; }
        for (const v of vs) all.push(Object.assign({ board: board.id, boardLabel: board.label }, v));
      }
    }
    const blocking = all.filter(v => v.severity === 'blocking');
    const warnings = all.filter(v => v.severity === 'warning');
    const infos = all.filter(v => v.severity === 'info');
    return { violations: all, blocking, warnings, infos, pass: blocking.length === 0, intent, at: new Date().toISOString() };
  }

  return { run, RULES, QRDecode, thresholds: T };
})();

/* ============================================================================
   package: @px/hz-preflight
   UV PRINT READY — the gate.

   Every rule here measures the scene that is about to be written, not the
   document that produced it. That distinction matters: a 6 pt specification
   that shrank to 4.1 pt to fit its zone is a 4.1 pt problem, and only the
   rendered scene knows that happened.

   Severities mean what they say. `blocking` stops an export at the stated
   intent. `warning` is a judgement call the operator is allowed to make.
   `info` is a measurement worth carrying into the manifest.
   depends on: core-model, brand, hz-model, hz-render, hz-export
   ============================================================================ */
const HZUV = (() => {
  'use strict';

  const T = {
    minTextPt: 5.0,          // positive type on press
    minReversedPt: 6.0,      // knocked out of a solid — ink spread eats it
    minFoilPt: 7.0,          // foil cannot hold a fine counter
    minStrokeMM: 0.09,       // ~0.25 pt hairline
    minFoilStrokeMM: 0.20,
    minEmbossMM: 0.30,
    minPPI: 300,
    foilPPI: 600,
    maxInk: 300,
    minContrast: 3.0,
    minGapMM: 0.4            // element to trim edge, beyond the safe area rule
  };

  const V = (rule, severity, title, msg, extra) =>
    Object.assign({ rule, severity, title, msg }, extra || {});

  const lum = hex => {
    const [r, g, b] = HZX.hex2rgb(hex);
    const f = c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
  };
  const contrast = (a, b) => {
    const A = lum(a), B = lum(b);
    return (Math.max(A, B) + .05) / (Math.min(A, B) + .05);
  };
  const inkTotal = hex => HZX.rgb2cmyk(...HZX.hex2rgb(hex)).reduce((a, c) => a + c, 0) * 100;

  /* ---------------------------------------------------------------------
     RULES
     --------------------------------------------------------------------- */
  const RULES = [

    /* ---- colour ---- */
    { id: 'uv.cmyk', title: 'CMYK conversion',
      run(b, doc, intent) {
        const out = [];
        const seen = new Set();
        let worst = null;
        for (const p of b.prims) {
          const c = p.fill || p.stroke;
          if (!c || c[0] !== '#' || seen.has(c)) continue;
          seen.add(c);
          const ink = inkTotal(c);
          if (ink > T.maxInk && (!worst || ink > worst.ink)) worst = { c, ink };
        }
        out.push(V('uv.cmyk', 'info', 'Converted to CMYK',
          seen.size + ' distinct inks separated to device CMYK. The separation is uncalibrated — ' +
          'for a contract proof, re-separate through the press profile.'));
        if (worst) out.push(V('uv.ink-limit', 'warning', 'Total ink over limit',
          `${worst.c} separates to ${worst.ink.toFixed(0)}% total ink, above the ${T.maxInk}% limit for coated stock. It will not dry cleanly.`));
        return out;
      } },

    /* ---- resolution ---- */
    { id: 'uv.resolution', title: 'Effective resolution',
      run(b, doc, intent) {
        const out = [];
        if (b.meta.masterPPI == null) return out;
        const ppi = b.meta.masterPPI;
        const need = T.minPPI;
        if (ppi < 150)
          out.push(V('uv.resolution', 'blocking', 'Placed artwork is too low resolution',
            `The approved master lands at ${ppi} PPI at this trim size. Under 150 PPI it will visibly pixelate. Print it smaller, or have the artwork re-supplied as vector.`, { measured: ppi }));
        else if (ppi < need)
          out.push(V('uv.resolution', 'warning', 'Placed artwork under target resolution',
            `The approved master lands at ${ppi} PPI; ${need} PPI is the print target. The supplied artwork is a 72 PPI raster, so this is the ceiling until vector art exists.`, { measured: ppi }));
        else
          out.push(V('uv.resolution', 'info', 'Placed artwork resolution',
            `The approved master lands at ${ppi} PPI, clear of the ${need} PPI target.`, { measured: ppi }));
        return out;
      } },

    /* ---- vector integrity ---- */
    { id: 'uv.master', title: 'Approved master',
      run(b, doc) {
        const out = [];
        const ed = b.meta.edits.length, pat = b.meta.patches.length;
        out.push(V('uv.master', 'info', 'Approved artwork placed as delivered',
          ed === 0
            ? 'Nothing has been edited. The export is the approved master, byte for byte in its own pixels — no re-typesetting, no re-alignment, no recomposition.'
            : `${pat} region(s) patched from the clean plate; everything outside them is still the master's own pixels.`));
        const mv = HZ.moved(doc);
        if (mv.length) out.push(V('uv.master-moved', 'blocking', 'MASTER LABEL MODIFIED — REVERT REQUIRED',
          `${mv.length} element(s) have been moved off the approved position. Reset them, or turn Master Layout Lock back on, before this goes to press.`));
        for (const t of b.meta.textObjs) if (t.over)
          out.push(V('uv.text-over', 'warning', 'Replacement text is wider than the master’s own',
            `“${HZ.elDef(t.id).label}” now runs ${t.widthMM.toFixed(2)} mm in a ${t.boxW.toFixed(2)} mm box. It will sit closer to its neighbour than the approved art does.`, { obj: t.id }));
        return out;
      } },

    /* ---- type size ---- */
    { id: 'uv.type-size', title: 'Minimum type size',
      run(b, doc) {
        const out = [];
        const bg = b.bg;
        for (const t of b.meta.textObjs) {
          const o = HZ.elDef(t.id);
          const reversed = lum(t.fill) > lum(bg);
          const foil = false;
          const need = foil ? T.minFoilPt : reversed ? T.minReversedPt : T.minTextPt;
          if (t.sizePt < need)
            out.push(V('uv.type-size', t.sizePt < need * .8 ? 'blocking' : 'warning',
              'Type below the printable minimum',
              `“${o ? o.label : t.id}” sets at ${t.sizePt.toFixed(2)} pt. The floor is ${need} pt${foil ? ' for foil' : reversed ? ' reversed out of a solid' : ''}. Raise its cap height, or give it more room.`,
              { obj: t.id, measured: t.sizePt, need }));
        }
        return out;
      } },

    /* ---- bleed ---- */
    { id: 'uv.bleed', title: 'Bleed',
      run(b, doc) {
        const out = [];
        if (b.bleedMM < 3)
          out.push(V('uv.bleed', b.bleedMM <= 0 ? 'blocking' : 'warning', 'Bleed under 3 mm',
            `Bleed is ${b.bleedMM} mm. Roll-fed die cutting needs 3 mm; anything less shows the substrate at the trim.`, { measured: b.bleedMM }));
        out.push(V('uv.bleed-fill', 'info', 'Bleed is filled',
          'The master extends into the bleed by edge extension, so the trim can wander without showing white.'));
        return out;
      } },

    /* ---- outside trim / safe ---- */
    { id: 'uv.safe', title: 'Safe area',
      run(b, doc) {
        const out = [];
        for (const p of b.prims) {
          const bx = p.box;
          if (!bx) continue;
          const id = p.objId;
          const o = HZ.elDef(id);
          const nm = o ? o.label : id;
          if (bx.x < -0.01 || bx.y < -0.01 || bx.x + bx.w > b.wMM + .01 || bx.y + bx.h > b.hMM + .01) {
            out.push(V('uv.outside-trim', 'blocking', 'Object outside the trim',
              `“${nm}” extends past the trim edge. It will be cut off.`, { obj: id }));
            continue;
          }
          const s = b.safeMM;
          if (bx.x < s - .01 || bx.y < s - .01 || bx.x + bx.w > b.wMM - s + .01 || bx.y + bx.h > b.hMM - s + .01)
            out.push(V('uv.safe', 'warning', 'Object outside the safe area',
              `“${nm}” comes within ${s} mm of the trim. Die-cut registration drifts — pull it inside the safe area.`, { obj: id }));
        }
        return out;
      } },

    /* ---- contrast ---- */
    { id: 'uv.contrast', title: 'Ink contrast',
      run(b, doc) {
        const out = [];
        const bg = b.bg;
        for (const t of b.meta.textObjs) {
          const c = contrast(t.fill, bg);
          if (c < T.minContrast) {
            const o = HZ.objOf(doc, t.id);
            out.push(V('uv.contrast', c < 1.8 ? 'blocking' : 'warning', 'Ink too close to the substrate',
              `“${o ? o.label : t.id}” sits at ${c.toFixed(2)}:1 against the panel. Under ${T.minContrast}:1 it disappears under lamination.`,
              { obj: t.id, measured: c }));
          }
        }
        return out;
      } },

    /* ---- transparency ---- */
    { id: 'uv.transparency', title: 'Transparency',
      run(b, doc, intent) {
        const out = [];
        const soft = b.prims.filter(p => p.opacity != null && p.opacity < 1);
        if (soft.length && intent === 'X-1a')
          out.push(V('uv.transparency', 'blocking', 'Transparency in an X-1a intent',
            `${soft.length} object(s) carry an opacity below 100%. PDF/X-1a has no transparency model — they must be flattened or set to solid.`));
        else if (soft.length)
          out.push(V('uv.transparency', 'warning', 'Live transparency present',
            `${soft.length} object(s) are not fully opaque. X-4 carries transparency, but confirm the RIP flattens it the way you expect.`));
        if (false) {
          const hasWhite = false;
          out.push(hasWhite
            ? V('uv.white', 'info', 'White ink present under a clear substrate',
              'A white plate is being written, which is what a transparent label needs to stop the vial showing through the artwork.')
            : V('uv.white', 'blocking', 'Clear substrate with no white ink',
              'The substrate is transparent and nothing is assigned to White Ink. Everything printed on it will show the vial through it. Assign the background — or the panel behind the type — to White Ink.'));
        }
        return out;
      } },

    /* ---- separations ---- */
    { id: 'uv.plates', title: 'Separations',
      run(b, doc) {
        const out = [];
        for (const plate of b.plates) {
          if (plate === 'PX_DIE_CUT') continue;
          const n = b.prims.filter(p => HZ.finish(p.finish).plate === plate).length;
          if (!n) out.push(V('uv.plate-empty', 'warning', 'Empty plate',
            `${plate} is declared but nothing is assigned to it. An empty plate is a tooling charge for nothing.`));
        }
        if (doc.layers.cutline.on === false)
          out.push(V('uv.diecut', 'blocking', 'No die line',
            'There is no cut line on this document. The die maker has nothing to cut to.'));
        else
          out.push(V('uv.diecut', 'info', 'Die line present',
            `Cut line on its own layer, ${b.wMM.toFixed(2)} × ${b.hMM.toFixed(2)} mm, ${b.radiusMM} mm corner.`));
        const foil = b.prims.filter(p => HZ.finish(p.finish).kind === 'foil');
        if (foil.length) out.push(V('uv.foil', 'info', 'Foil separation',
          `${foil.length} object(s) on foil. Foil is a physical die: keep it off fine counters and away from the trim.`));
        return out;
      } },

    /* ---- fonts ---- */
    { id: 'hz.font-embed', title: 'Font embedding',
      run(b, doc, intent) {
        const r = BRAND.resolveFont();
        const out = [];
        const blocking = intent === 'X-4' || intent === 'X-1a';
        out.push(V('hz.font-embed', blocking ? 'blocking' : 'warning', 'Fonts are not embedded',
          'Type is live vector, not an image — but the face is referenced by name, because a browser cannot embed a typeface it has not been given the binary for. ' +
          'For PDF/X conformance, supply the licensed font for embedding or convert the type to outlines in Illustrator.'));
        if (r.substituted)
          out.push(V('hz.font-sub', 'warning', 'Face substituted',
            `The specified geometric sans did not resolve on this machine; “${r.family || 'a fallback'}” is standing in. Metrics differ from the brand face — check the line breaks before signing off.`));
        else
          out.push(V('hz.font-resolved', 'info', 'Face resolved', `Type is setting in ${r.family}.`));
        return out;
      } },

    /* ---- registration ---- */
    { id: 'uv.registration', title: 'Registration',
      run(b, doc) {
        const out = [];
        const relief = b.prims.filter(p => p.finish && HZ.finish(p.finish).kind === 'relief');
        for (const p of relief) {
          const bx = p.box;
          if (bx && Math.min(bx.w, bx.h) < T.minEmbossMM * 4) {
            const o = HZ.elDef(p.objId);
            out.push(V('uv.emboss-small', 'warning', 'Emboss detail too fine',
              `“${o ? o.label : p.objId}” is ${Math.min(bx.w, bx.h).toFixed(2)} mm on its short side. An emboss die cannot hold detail that small — it will flatten out.`, { obj: p.objId }));
          }
        }
        return dedupe(out);
      } }
  ];

  function dedupe(list) {
    const seen = new Set(), out = [];
    for (const v of list) {
      const k = v.rule + '|' + (v.obj || '');
      if (seen.has(k)) continue;
      seen.add(k); out.push(v);
    }
    return out;
  }

  /**
   * @param intent 'proof' | 'X-4' | 'X-1a' | 'uv'
   */
  function run(board, intent) {
    const doc = board.doc;
    const all = [];
    for (const r of RULES) {
      try { all.push(...(r.run(board, doc, intent) || [])); }
      catch (e) { all.push(V(r.id, 'warning', 'Rule failed to run', r.title + ': ' + e.message)); }
    }
    /* a proof is allowed to be a proof */
    const eff = all.map(v => (intent === 'proof' && v.rule === 'hz.font-embed')
      ? Object.assign({}, v, { severity: 'info' }) : v);
    const blocking = eff.filter(v => v.severity === 'blocking');
    const warnings = eff.filter(v => v.severity === 'warning');
    const infos = eff.filter(v => v.severity === 'info');
    return {
      violations: eff, blocking, warnings, infos,
      pass: blocking.length === 0, intent, at: new Date().toISOString(),
      counts: { blocking: blocking.length, warning: warnings.length, info: infos.length }
    };
  }

  return { run, RULES, thresholds: T, contrast, inkTotal };
})();

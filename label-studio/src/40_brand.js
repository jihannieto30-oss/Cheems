/* ============================================================================
   package: @px/brand
   The brand system as CODE. Palettes, approved catalogue, typography locks
   and BrandPolicy — the gate that every command must pass.
   depends on: core-model
   ============================================================================ */
const BRAND = (() => {
  'use strict';

  /* Geometric-sans stack. The master artwork uses a wide-tracked geometric
     sans; these are the closest faces that ship on target machines.
     Whatever actually resolves is MEASURED at runtime and reported by
     preflight rule `fonts.resolved` — we never pretend it matched. */
  const STACK = {
    display: '"Futura","Futura PT","Century Gothic","Avenir Next","Avenir","Questrial","Jost","Montserrat","Helvetica Neue",Helvetica,Arial,sans-serif',
    mono: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace'
  };
  const PROBE_ORDER = ['Futura', 'Futura PT', 'Century Gothic', 'Avenir Next', 'Avenir', 'Questrial', 'Jost', 'Montserrat', 'Helvetica Neue', 'Helvetica', 'Arial'];

  /* Palettes measured off the master artwork — not invented. */
  const PALETTE = {
    fitness: {
      name: 'FITNESS', kind: 'black',
      panel: '#1b1b1b', bandL: '#040404', bandR: '#010101',
      bandInk: '#f9f9f9', doseInk: '#cfcfcf', accent: '#c9ced8',
      finish: 'foil-silver', bandFinish: 'emboss-light',
      back: { bg: '#101115', ink: '#e9ecf2', ink2: '#8b93a3', rule: '#2a2e38', qrDark: '#0b0d12', qrLight: '#ffffff' }
    },
    beauty: {
      name: 'BEAUTY', kind: 'white',
      panel: '#ececec', bandL: '#dba385', bandR: '#70412f',
      bandInk: '#0c0100', doseInk: '#8a6146', accent: '#c98a63',
      finish: 'foil-copper', bandFinish: 'deboss',
      back: { bg: '#f4f3f1', ink: '#191512', ink2: '#7c6a60', rule: '#d9d2cb', qrDark: '#0b0d12', qrLight: '#ffffff' }
    },
    longevity: {
      name: 'LONGEVITY', kind: 'silver',
      panel: '#aeaeae', bandL: '#023473', bandR: '#021c3d',
      bandInk: '#f6fdfe', doseInk: '#666667', accent: '#8f9bb0',
      finish: 'foil-silver', bandFinish: 'emboss-light',
      back: { bg: '#b9bcc1', ink: '#12151b', ink2: '#4d525c', rule: '#8e939c', qrDark: '#0b0d12', qrLight: '#ffffff' }
    }
  };

  const CATALOG = __CATALOG__;

  const LINE_OF_SKU = (() => {
    const m = {};
    for (const line of Object.keys(CATALOG))
      for (const [code, name, short, vars] of CATALOG[line])
        for (const [sku, mg] of vars) m[sku] = { line, code, name, short, mg };
    return m;
  })();

  const productsOf = line => CATALOG[line] || [];
  const skuInfo = sku => LINE_OF_SKU[sku] || null;
  const allSkus = () => Object.keys(LINE_OF_SKU);

  /* Approved compound strings for the band. Anything else is a policy
     violation in Production Mode; Designer Mode may override with a warning. */
  const APPROVED_COMPOUNDS = (() => {
    const s = new Set();
    for (const line of Object.keys(CATALOG))
      for (const [code, name, short, vars] of CATALOG[line]) {
        s.add(short);
        for (const [sku, mg] of vars) s.add((short + mg.replace(/(MG|IU|ML)$/, '')).toUpperCase());
      }
    return s;
  })();

  const LEGAL_LINE = 'RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION';

  /* ---- BrandPolicy ---------------------------------------------------- */
  /** Runs BEFORE a command is applied. Returns [] when the change is allowed. */
  const Policy = {
    thresholds: {
      minTextPt: 5.0, minReversedPt: 6.0, minPPI: 300, foilPPI: 600,
      minQrModuleMM: 0.4, quietModules: 4, maxInk: 300, minHairlinePt: 0.25
    },

    canEdit(slotKey, mode) {
      const d = CORE.slotDef(slotKey);
      if (!d) return false;
      return d.editableIn.indexOf(mode) >= 0;
    },

    /** Geometry, typography and master identity are only mutable in admin. */
    canMutate(scope, mode) {
      if (scope === 'binding') return true;
      if (scope === 'finish') return mode !== CORE.MODE.PRODUCTION;
      if (scope === 'typography') return mode === CORE.MODE.ADMIN;
      if (scope === 'geometry') return mode === CORE.MODE.ADMIN;
      if (scope === 'master') return mode === CORE.MODE.ADMIN;
      if (scope === 'policy') return mode === CORE.MODE.ADMIN;
      return false;
    },

    validate(doc, master) {
      const v = [];
      const c = doc.bindings.compound;
      if (c && !APPROVED_COMPOUNDS.has(c) && !/^[A-Z0-9][A-Z0-9+\-.]{0,11}$/.test(c))
        v.push({ rule: 'brand.compound-format', severity: 'blocking',
          msg: 'Compound must be A–Z, 0–9, + - . and at most 12 characters.' });
      return v;
    }
  };

  /* ---- runtime font resolution (honest reporting) ---------------------- */
  let _resolved = null, _capRatio = {};
  function resolveFont() {
    if (_resolved) return _resolved;
    const c = document.createElement('canvas').getContext('2d');
    const base = (f) => { c.font = '100px ' + f; return c.measureText('PEPTIDEX 10MG').width; };
    const mono = base('monospace'), serif = base('serif');
    let hit = null;
    for (const f of PROBE_ORDER) {
      const w = base('"' + f + '",monospace'), w2 = base('"' + f + '",serif');
      if (Math.abs(w - mono) > 0.5 && Math.abs(w - w2) < 0.5) { hit = f; break; }
    }
    _resolved = { family: hit, substituted: !hit || PROBE_ORDER.indexOf(hit) > 4, stack: STACK.display };
    return _resolved;
  }

  /** Cap-height ratio of the resolved face, so `capPx` is exact for any font. */
  function capRatio(weight) {
    const k = 'w' + weight;
    if (_capRatio[k]) return _capRatio[k];
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const c = cv.getContext('2d');
    c.font = weight + ' 200px ' + STACK.display;
    const m = c.measureText('H');
    let r = (m.actualBoundingBoxAscent || 140) / 200;
    if (!(r > 0.4 && r < 0.95)) r = 0.715;
    _capRatio[k] = r;
    return r;
  }

  return {
    STACK, PALETTE, CATALOG, productsOf, skuInfo, allSkus, APPROVED_COMPOUNDS,
    LEGAL_LINE, Policy, resolveFont, capRatio
  };
})();

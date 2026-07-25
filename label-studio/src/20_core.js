/* ============================================================================
   package: @px/core-model
   Pure data, geometry and schema. Depends on NOTHING.
   ============================================================================ */
const CORE = (() => {
  'use strict';

  const SCHEMA_VERSION = 3;
  const ENGINE_VERSION = '1.0.0';

  /* --- geometry ------------------------------------------------------- */
  const PLATE_W = 466, PLATE_H = 884;          // native master pixels
  const TRIM_MM = { w: 46.0, h: 87.0 };        // finished label size
  const BLEED_MM = 3.0;                         // required bleed
  const SAFE_MM = 2.0;                          // safe area inset
  const PPM = PLATE_W / TRIM_MM.w;              // plate px per mm  (10.130)
  const NATIVE_PPI = PPM * 25.4;                // 257.3

  const mm2px = mm => mm * PPM;
  const px2mm = px => px / PPM;
  const mm2pt = mm => mm * 72 / 25.4;
  const pt2mm = pt => pt * 25.4 / 72;
  const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

  /* --- master grading -------------------------------------------------- */
  const GRADE = { PRODUCTION: 'PRODUCTION', PROOF_ONLY: 'PROOF_ONLY', REJECTED: 'REJECTED' };

  /** Grade is DERIVED, never hand-set. See ARCHITECTURE.md §4.1 */
  function gradeMaster(a) {
    if (!a || a.corrupt) return GRADE.REJECTED;
    if (a.effectivePPI != null && a.effectivePPI < 150) return GRADE.REJECTED;
    if (a.maxInkCoverage > 320) return GRADE.REJECTED;
    const vectorOK = a.hasVectorText && a.missingFonts.length === 0;
    const resOK = a.effectivePPI == null || a.effectivePPI >= 300;
    const colorOK = a.colorSpace === 'CMYK' || a.colorSpace === 'Spot';
    const sepOK = a.spotPlates.length > 0;
    const bleedOK = a.bleedMM >= BLEED_MM;
    return (vectorOK && resOK && colorOK && sepOK && bleedOK) ? GRADE.PRODUCTION : GRADE.PROOF_ONLY;
  }

  /* --- modes ----------------------------------------------------------- */
  const MODE = { PRODUCTION: 'production', DESIGNER: 'designer', ADMIN: 'admin' };
  const MODE_META = {
    production: { label: 'Production', desc: 'Bind data to slots. Artwork and geometry are locked.' },
    designer:   { label: 'Designer',   desc: 'Typography, finishes and optional slots unlock. Master stays immutable.' },
    admin:      { label: 'Administrator', desc: 'Master registry, brand policy, slot geometry and preflight thresholds unlock.' }
  };

  /* --- slot definitions (authored once per master) ---------------------- */
  /* frames are in PLATE PIXELS — the master's own coordinate space.        */
  const SLOT_TYPE = { TEXT: 'text', QR: 'qr', BARCODE: 'barcode' };

  function slot(o) {
    return Object.freeze(Object.assign({
      type: SLOT_TYPE.TEXT, required: false, fit: 'shrink-to-fit',
      maxChars: 24, allowedValues: null, editableIn: [MODE.PRODUCTION, MODE.DESIGNER, MODE.ADMIN],
      align: 'center', transform: 'upper', artboard: 'front', optional: false, defaultOn: true
    }, o));
  }

  /* Typography locks measured off the master artwork (plate px). */
  const FRONT_SLOTS = [
    slot({
      key: 'compound', label: 'Compound', required: true, maxChars: 12,
      frame: { x: 60, y: 494, w: 346, h: 54 },
      typography: { capPx: 35, anchor: 233, baseline: 537, tracking: 0.140, weight: 500, family: 'display' },
      hint: 'Printed inside the accent band.'
    }),
    slot({
      key: 'dosage', label: 'Dosage', required: true, maxChars: 12,
      frame: { x: 100, y: 573, w: 266, h: 38 },
      typography: { capPx: 17, anchor: 233, baseline: 600, tracking: 0.300, weight: 300, family: 'display' },
      hint: 'Strength as printed, e.g. 10MG.'
    })
  ];

  /* The data panel is generated vector artwork — it is not part of the
     protected master, so it can legally carry variable regulatory data. */
  const BACK_SLOTS = [
    slot({ key: 'lot', label: 'Lot / Batch', artboard: 'back', maxChars: 16, required: true,
      frame: { x: 46, y: 318, w: 374, h: 38 },
      align: 'left',
      typography: { capPx: 18, anchor: 46, baseline: 348, tracking: 0.180, weight: 500, family: 'display' } }),
    slot({ key: 'mfg', label: 'Manufactured', artboard: 'back', maxChars: 12, align: 'left',
      frame: { x: 46, y: 418, w: 170, h: 34 },
      typography: { capPx: 16, anchor: 46, baseline: 446, tracking: 0.160, weight: 400, family: 'display' } }),
    slot({ key: 'expiry', label: 'Expiry', artboard: 'back', maxChars: 12, required: true, align: 'right',
      frame: { x: 250, y: 418, w: 170, h: 34 },
      typography: { capPx: 16, anchor: 420, baseline: 446, tracking: 0.160, weight: 400, family: 'display' } }),
    slot({ key: 'qr', label: 'Verification QR', artboard: 'back', type: SLOT_TYPE.QR, maxChars: 96,
      transform: 'none',
      frame: { x: 145, y: 500, w: 176, h: 176 },
      typography: null }),
    slot({ key: 'serial', label: 'Serial', artboard: 'back', maxChars: 22,
      frame: { x: 46, y: 692, w: 374, h: 26 },
      typography: { capPx: 16, anchor: 233, baseline: 716, tracking: 0.200, weight: 400, family: 'display' } })
  ];

  const ALL_SLOTS = FRONT_SLOTS.concat(BACK_SLOTS);
  const slotDef = key => ALL_SLOTS.find(s => s.key === key) || null;

  /* --- document -------------------------------------------------------- */
  function newDocument(masterId, seed) {
    seed = seed || {};
    return {
      id: 'doc_' + Math.random().toString(36).slice(2, 10),
      schemaVersion: SCHEMA_VERSION,
      name: seed.name || 'Untitled label',
      masterRef: masterId,
      sku: seed.sku || '',
      bindings: Object.assign({
        compound: '', dosage: '', lot: '', mfg: '', expiry: '', qr: '', serial: ''
      }, seed.bindings || {}),
      enabled: Object.assign({ lot: true, mfg: true, expiry: true, qr: true, serial: true }, seed.enabled || {}),
      artboards: { front: true, back: seed.back !== false },
      finishes: Object.assign({ compound: 'auto', laminate: 'matte', substrate: 'vinyl-white' }, seed.finishes || {}),
      overlay: [],
      meta: { createdAt: new Date().toISOString(), createdBy: seed.by || 'operator', updatedAt: new Date().toISOString() },
      version: 0
    };
  }

  /* --- value normalisation --------------------------------------------- */
  function normalise(def, raw) {
    let v = String(raw == null ? '' : raw);
    if (def.transform === 'upper') v = v.toUpperCase();
    v = v.replace(/\s+/g, ' ').trim();
    if (def.maxChars) v = v.slice(0, def.maxChars);
    return v;
  }

  /* --- deep helpers ----------------------------------------------------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* --- stable stringify (deterministic hashing / export) ----------------- */
  function stable(o) {
    if (o === null || typeof o !== 'object') return JSON.stringify(o);
    if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
    return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  }

  return {
    SCHEMA_VERSION, ENGINE_VERSION, PLATE_W, PLATE_H, TRIM_MM, BLEED_MM, SAFE_MM, PPM, NATIVE_PPI,
    mm2px, px2mm, mm2pt, pt2mm, round,
    GRADE, gradeMaster, MODE, MODE_META,
    SLOT_TYPE, FRONT_SLOTS, BACK_SLOTS, ALL_SLOTS, slotDef,
    newDocument, normalise, clone, deepEqual, stable
  };
})();

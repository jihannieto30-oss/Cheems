/* ============================================================================
   package: @px/hz-model
   PREMIUM HORIZONTAL — the approved master, made editable.

   THE CORRECTION
   The first build of this family rebuilt the label as parametric geometry and
   let the layout recompute itself. That moved things: proportions, alignment,
   spacing and the balance between the three zones all drifted from the
   approved art. It was the wrong model, and it is gone.

   The master IS the artwork now. `PX_HZ_MASTER` carries each approved label as
   its own pixels, at its own aspect, plus:

     · the measured pixel box of every editable element, in the master's own
       coordinate space — nothing here is placed by a layout engine,
     · a CLEAN PLATE, which is the same master with the six text regions
       carried over from their surroundings,
     · the ink colour measured out of each element.

   An untouched document draws the master and nothing else. That is what makes
   the default view identical to the approved file rather than merely close to
   it. A patch is drawn only where an operator has actually changed something,
   and only inside that element's own measured box.

   MASTER LAYOUT LOCK is on by default: text and colour are editable, geometry
   is not. Turned off, an element can be nudged — and the document records that
   it is no longer at the approved position, which validation then reports.
   depends on: core-model, brand
   ============================================================================ */
const HZ = (() => {
  'use strict';

  const SCHEMA = 2;
  const FAMILY = 'premium-horizontal';

  const M = (typeof PX_HZ_MASTER !== 'undefined') ? PX_HZ_MASTER : {};
  const KEYS = Object.keys(M);

  /* Physical trim. The master's aspect is fixed by the artwork; its printed
     size is not stated anywhere in the supplied file, so a default is chosen
     that keeps the smallest type printable, and the operator scales from
     there. Scaling is uniform — width and height never move independently. */
  const DEFAULT_W_MM = 3.10 * 25.4;   /* the 10 mL wrap, in inches */

  const master = k => M[k] || M[KEYS[0]] || null;
  const aspect = k => { const m = master(k); return m ? m.w / m.h : 7; };

  /* ---------------------------------------------------------------------
     ELEMENTS — the layer list, in the order the brief names them
     --------------------------------------------------------------------- */
  const E = (id, label, kind, o) => Object.assign({ id, label, kind }, o || {});
  const ELEMENTS = [
    E('px_logo',       'PX Logo',            'art'),
    E('wordmark',      'PEPTIDEX Wordmark',  'art'),
    E('tagline',       'Tagline',            'art'),
    E('compound',      'Compound Name',      'text', { align: 'left' }),
    E('line_name',     'Line Name',          'text', { align: 'left' }),
    E('mg_value',      'MG Value',           'text', { align: 'left' }),
    E('tested',        'Tested in USA',      'text', { align: 'left' }),
    E('flag',          'Flag',               'art'),
    E('divider_left',  'Divider Left',       'art'),
    E('divider_right', 'Divider Right',      'art'),
    E('rule',          'Rule',               'art'),
    E('icon',          'Icon',               'art'),
    E('hexagon',       'Hexagon',            'art'),
    E('purity',        'Purity Text',        'text', { align: 'left' }),
    E('research',      'Research Text',      'text', { align: 'left' })
  ];
  const elDef = id => ELEMENTS.find(e => e.id === id) || null;
  const TEXT_IDS = ELEMENTS.filter(e => e.kind === 'text').map(e => e.id);

  /** The elements this master actually carries a measured box for. */
  function present(k) {
    const m = master(k);
    if (!m) return [];
    return ELEMENTS.filter(e => m.elements[e.id]);
  }
  const boxOf = (k, id) => {
    const m = master(k);
    const b = m && m.elements[id];
    return b ? { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] } : null;
  };
  const inkOf = (k, id) => {
    const m = master(k);
    return (m && m.inks && m.inks[id]) || (m && m.panelInk) || '#000000';
  };

  /* ---------------------------------------------------------------------
     PRINT FINISHES — unchanged from the previous build; they name plates,
     they do not restyle anything.
     --------------------------------------------------------------------- */
  const F = (id, name, plate, kind, o) => Object.assign({ id, name, plate, kind }, o || {});
  const FINISHES = [
    F('none',        'None',              null,               'flat'),
    F('softtouch',   'Soft Touch',        null,               'surface'),
    F('foil-silver', 'Hot Foil Silver',   'PX_FOIL_SILVER',   'foil',    { a: '#f4f6f8', b: '#8f959d' }),
    F('foil-gold',   'Hot Foil Gold',     'PX_FOIL_GOLD',     'foil',    { a: '#ffe9a8', b: '#a8802c' }),
    F('foil-rose',   'Rose Gold Foil',    'PX_FOIL_ROSEGOLD', 'foil',    { a: '#f7d4c4', b: '#a9634a' }),
    F('foil-copper', 'Copper Foil',       'PX_FOIL_COPPER',   'foil',    { a: '#f0b48c', b: '#8c4a24' }),
    F('spotuv',      'Spot UV',           'PX_SPOT_UV',       'varnish'),
    F('glossuv',     'Gloss UV',          'PX_GLOSS_UV',      'varnish'),
    F('selectiveuv', 'Selective UV',      'PX_SELECTIVE_UV',  'varnish'),
    F('emboss',      'Emboss',            'PX_EMBOSS',        'relief',  { dir: 1 }),
    F('deboss',      'Deboss',            'PX_DEBOSS',        'relief',  { dir: -1 }),
    F('lam-matte',   'Matte Lamination',  null,               'surface'),
    F('lam-gloss',   'Gloss Lamination',  null,               'surface'),
    F('brushed',     'Brushed Metal',     null,               'surface'),
    F('textured',    'Textured Paper',    null,               'surface'),
    F('whiteink',    'White Ink',         'PX_WHITE',         'ink'),
    F('transparent', 'Transparent Label', null,               'substrate')
  ];
  const finish = id => FINISHES.find(f => f.id === id) || FINISHES[0];

  const LAYERS = [
    { id: 'background', name: 'Background Texture', prints: true },
    { id: 'artwork',    name: 'Artwork',            prints: true },
    { id: 'foil',       name: 'Foil',               prints: true },
    { id: 'spotuv',     name: 'Spot UV',            prints: true },
    { id: 'emboss',     name: 'Emboss',             prints: true },
    { id: 'deboss',     name: 'Deboss',             prints: true },
    { id: 'whiteink',   name: 'White Ink',          prints: true },
    { id: 'cutline',    name: 'Cut Line',           prints: true },
    { id: 'bleed',      name: 'Bleed',              prints: false },
    { id: 'safe',       name: 'Safe Area',          prints: false }
  ];
  const layer = id => LAYERS.find(l => l.id === id) || LAYERS[1];
  function layerFor(fid) {
    const f = finish(fid);
    if (f.kind === 'foil') return 'foil';
    if (f.kind === 'varnish') return 'spotuv';
    if (f.id === 'emboss') return 'emboss';
    if (f.id === 'deboss') return 'deboss';
    if (f.id === 'whiteink') return 'whiteink';
    return 'artwork';
  }

  function plates(doc) {
    const s = new Set();
    for (const id of Object.keys(doc.el)) {
      const e = doc.el[id];
      const f = finish(e.finish);
      if (f.plate && e.on !== false) s.add(f.plate);
    }
    s.add('PX_DIE_CUT');
    return [...s].sort();
  }

  /* ---------------------------------------------------------------------
     DOCUMENT
     --------------------------------------------------------------------- */
  function newDoc(seed) {
    seed = seed || {};
    const k = seed.master && M[seed.master] ? seed.master : (KEYS[0] || 'fitness');
    const el = {};
    for (const e of present(k)) {
      el[e.id] = {
        on: true, locked: false,
        text: null,          /* null = the master's own artwork, untouched */
        colour: null,        /* null = the measured ink */
        finish: 'none',
        ov: { dx: 0, dy: 0, sx: 1 }
      };
    }
    return {
      id: 'hz_' + Math.random().toString(36).slice(2, 10),
      family: FAMILY, schemaVersion: SCHEMA,
      name: seed.name || ('PEPTIDEX ' + k.toUpperCase() + ' — approved master'),
      master: k,
      lock: true,                       /* Master Layout Lock */
      trim: { w: seed.w || DEFAULT_W_MM, h: (seed.w || DEFAULT_W_MM) / aspect(k) },
      print: { bleed: 3, safe: 2 },
      el,
      layers: LAYERS.reduce((m2, l) => (m2[l.id] = { on: true, locked: false, exp: true }, m2), {}),
      view: { production: false, mockup: 'v10' },
      uv: { cols: 4, rows: 6, gap: 3.175, margin: 6.35, dpi: 720, marks: true, white: false },
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      version: 0
    };
  }

  const isHz = d => !!(d && d.family === FAMILY);
  const elOf = (doc, id) => doc.el[id] || null;

  /** Scale the whole label. Uniform, from the centre — the aspect never moves. */
  function setWidth(doc, mm) {
    const a = aspect(doc.master);
    doc.trim.w = Math.max(8, mm);
    doc.trim.h = doc.trim.w / a;
  }
  function setHeight(doc, mm) {
    const a = aspect(doc.master);
    doc.trim.h = Math.max(4, mm);
    doc.trim.w = doc.trim.h * a;
  }

  /** Has this document departed from the approved master at all? */
  function edits(doc) {
    const out = [];
    for (const id of Object.keys(doc.el)) {
      const e = doc.el[id];
      if (e.on === false) out.push({ id, kind: 'hidden' });
      if (e.text != null) out.push({ id, kind: 'text', value: e.text });
      if (e.colour) out.push({ id, kind: 'colour', value: e.colour });
      if (e.finish && e.finish !== 'none') out.push({ id, kind: 'finish', value: e.finish });
      if (e.ov && (e.ov.dx || e.ov.dy || e.ov.sx !== 1)) out.push({ id, kind: 'moved', value: e.ov });
    }
    return out;
  }
  /** Only the changes that alter geometry — what validation must never see
      while the layout is locked. */
  const moved = doc => edits(doc).filter(e => e.kind === 'moved');
  const pristine = doc => edits(doc).length === 0;

  /* The catalogue, flattened to the sellable SKUs.
     Built on first use, not at load: this module is concatenated ahead of the
     brand package, so reading BRAND.CATALOG here would touch a const that is
     still in its temporal dead zone and take the whole file down with it. */
  let _skus = null;
  function skus() {
    if (_skus) return _skus;
    const out = [];
    const C = (typeof BRAND !== 'undefined' && BRAND.CATALOG) ? BRAND.CATALOG : {};
    for (const line of Object.keys(C))
      for (const [code, name, short, vars] of C[line])
        for (const [sku, mg] of vars) out.push({ line, code, name, short, sku, mg });
    _skus = out;
    return out;
  }

  /* UV sheet geometry. Everything in millimetres internally; the panel talks
     inches because that is how the stock and the bed are specified. */
  function sheet(doc) {
    const u = doc.uv, t = doc.trim;
    const w = u.margin * 2 + u.cols * t.w + (u.cols - 1) * u.gap;
    const h = u.margin * 2 + u.rows * t.h + (u.rows - 1) * u.gap;
    const ppmm = u.dpi / 25.4;
    return { wMM: w, hMM: h, wIn: w / 25.4, hIn: h / 25.4, n: u.cols * u.rows,
      px: { w: Math.round(w * ppmm), h: Math.round(h * ppmm) }, ppmm };
  }

  /* Vial wraps, in inches. A label for a vial is specified by the body's
     circumference plus a seam, and that is what a converter quotes against —
     so these are the sizes to pick from, in the unit they are ordered in. */
  const WRAPS = [
    { name: '1 mL  ·  Ø0.46″', w: 1.57 }, { name: '2 mL  ·  Ø0.63″', w: 2.11 },
    { name: '3 mL  ·  Ø0.63″', w: 2.11 }, { name: '5 mL  ·  Ø0.87″', w: 2.85 },
    { name: '10 mL · Ø0.94″', w: 3.10 }, { name: '15 mL · Ø1.02″', w: 3.34 },
    { name: '20 mL · Ø1.18″', w: 3.84 }, { name: '30 mL · Ø1.30″', w: 4.21 },
    { name: '50 mL · Ø1.57″', w: 5.06 }
  ];

  /* Container sizes, for the mockup only. */
  const VIALS = {
    v1:  { ml: '1 mL',  dia: 11.6, body: 32 }, v2:  { ml: '2 mL',  dia: 16, body: 35 },
    v3:  { ml: '3 mL',  dia: 16,   body: 45 }, v5:  { ml: '5 mL',  dia: 22, body: 50 },
    v10: { ml: '10 mL', dia: 24,   body: 60 }, v15: { ml: '15 mL', dia: 26, body: 66 },
    v20: { ml: '20 mL', dia: 30,   body: 75 }, v30: { ml: '30 mL', dia: 33, body: 82 },
    v50: { ml: '50 mL', dia: 40,   body: 95 }
  };

  return {
    SCHEMA, FAMILY, KEYS, master, aspect, DEFAULT_W_MM,
    ELEMENTS, elDef, TEXT_IDS, present, boxOf, inkOf,
    FINISHES, finish, LAYERS, layer, layerFor, plates,
    newDoc, isHz, elOf, setWidth, setHeight, edits, moved, pristine, VIALS, WRAPS, skus, sheet,
    get SKUS() { return skus(); }
  };
})();

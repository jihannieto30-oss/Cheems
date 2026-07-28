/* ============================================================================
   package: @px/hz-model
   PREMIUM HORIZONTAL LABELS — the parametric, fully vector template family.

   WHY THIS IS AUTHORED GEOMETRY AND NOT AN EMBEDDED MASTER
   --------------------------------------------------------
   `PEPTIDEX_UV_Labels.pdf` was analysed the same way every master is: it is a
   ReportLab wrapper around ONE RGB raster, 1935 x 813 px at 72 PPI, with no
   embedded font, no vector path and no separation. Registering it as a master
   would grade PROOF_ONLY on ingest — correctly — and every capability asked
   for on top of it is impossible against a flat photograph: you cannot make
   the compound name editable, you cannot pull a foil plate out of pixels that
   only simulate foil, and you cannot emit PDF/X-4 with live text from a JPEG.

   So the supplied file is treated as what it is — a reference composition —
   and the label is rebuilt here as a parametric VECTOR document. Its
   proportions are measured off that file rather than guessed:

       zone divisions at 30.5% and 65.4% of the trim width
       lockup      y 0.133 -> 0.886      compound  y 0.133 -> 0.326
       line name   y 0.420 -> 0.498      dosage    y 0.584 -> 0.667
       tested line y 0.804 -> 0.894      hex badge y 0.255 -> 0.773

   The one thing that is NOT redrawn is the PEPTIDEX lockup. That artwork is
   supplied and immutable; it is placed as delivered, and preflight reports its
   effective PPI at whatever size it lands on, so nobody has to guess whether
   it will hold up on press.

   Nothing in the existing studio is touched. This is a second document family
   living beside the portrait masters, with its own model, renderer, preflight
   and exporters.
   depends on: core-model, brand
   ============================================================================ */
const HZ = (() => {
  'use strict';

  const SCHEMA = 1;
  const FAMILY = 'premium-horizontal';

  /* Working resolution of the preview board. Geometry is authored in mm and
     only ever converted at the edges, so nothing in this file carries a pixel
     assumption into an export. */
  const PPMM = 12;                       // preview px per mm (304.8 PPI)
  const mm2px = mm => mm * PPMM;
  const mm2pt = mm => mm * 72 / 25.4;
  const pt2mm = pt => pt * 25.4 / 72;

  /* ---------------------------------------------------------------------
     DOSAGE PRESETS
     Each preset sizes the label from the vial it actually goes on, not from
     an arbitrary ratio: width is that vial's circumference plus the overlap
     a wrap label needs, height is a band proportion of its body. The
     reference composition is 7:1, which is a screen ratio — at vial
     circumference it puts RESEARCH USE ONLY at about 1.6 pt, four times under
     the legibility floor. These proportions carry the same composition at a
     size that can be printed, and every one of them stays editable.
     --------------------------------------------------------------------- */
  const VIALS = {
    v1:  { ml: '1 mL',  dia: 11.6, body: 32 },
    v2:  { ml: '2 mL',  dia: 16.0, body: 35 },
    v3:  { ml: '3 mL',  dia: 16.0, body: 45 },
    v5:  { ml: '5 mL',  dia: 22.0, body: 50 },
    v10: { ml: '10 mL', dia: 24.0, body: 60 },
    v15: { ml: '15 mL', dia: 26.0, body: 66 },
    v20: { ml: '20 mL', dia: 30.0, body: 75 },
    v30: { ml: '30 mL', dia: 33.0, body: 82 },
    v50: { ml: '50 mL', dia: 40.0, body: 95 }
  };
  const OVERLAP_MM = 3;                   // wrap seam

  const wrapW = v => Math.round((Math.PI * VIALS[v].dia + OVERLAP_MM) * 10) / 10;

  function preset(mg, vial, bandFrac) {
    const w = wrapW(vial);
    const h = Math.round(VIALS[vial].body * bandFrac * 10) / 10;
    return { mg, vial, w, h, ml: VIALS[vial].ml };
  }

  const DOSES = [
    preset('2mg',   'v1',  0.56), preset('3mg',   'v1',  0.56),
    preset('5mg',   'v2',  0.56), preset('10mg',  'v2',  0.58),
    preset('15mg',  'v3',  0.53), preset('20mg',  'v3',  0.55),
    preset('30mg',  'v5',  0.54), preset('50mg',  'v10', 0.53),
    preset('100mg', 'v20', 0.52), preset('125mg', 'v20', 0.54),
    preset('250mg', 'v30', 0.52), preset('500mg', 'v50', 0.50)
  ];
  const doseByMg = mg => DOSES.find(d => d.mg === mg) || null;

  /* ---------------------------------------------------------------------
     COLOUR PRESETS
     Every value is a real substrate/ink pair. `metal` drives the preview's
     brushed sweep and nothing in the exported artwork — a simulated metal
     gradient is not a foil plate, and this system never confuses the two.
     --------------------------------------------------------------------- */
  const P = (id, line, name, o) => Object.assign({ id, line, name, metal: null }, o);

  const PALETTES = [
    /* FITNESS */
    P('fit-matte',    'fitness', 'Negro Mate',   { bg:'#0d0d0f', ink:'#f7f8fa', ink2:'#aeb4bf', accent:'#5b8dd6', rule:'#3a4150', hex:'#5b8dd6', logo:'silver' }),
    P('fit-graphite', 'fitness', 'Grafito',      { bg:'#26282d', ink:'#f2f4f7', ink2:'#b6bcc7', accent:'#7fa6dd', rule:'#4a505c', hex:'#7fa6dd', logo:'silver', metal:'graphite' }),
    P('fit-deepblue', 'fitness', 'Azul Profundo',{ bg:'#071429', ink:'#eef4fd', ink2:'#9db4d4', accent:'#4d9bff', rule:'#1d3557', hex:'#4d9bff', logo:'silver' }),
    /* BEAUTY */
    P('bea-white',    'beauty',  'Blanco',       { bg:'#f7f6f5', ink:'#141210', ink2:'#6f645c', accent:'#b5714a', rule:'#d8d2cc', hex:'#b5714a', logo:'copper' }),
    P('bea-rosegold', 'beauty',  'Rose Gold',    { bg:'#f3e7e1', ink:'#2a1b14', ink2:'#8a6250', accent:'#c0785c', rule:'#e0c6ba', hex:'#c0785c', logo:'rosegold', metal:'rosegold' }),
    P('bea-champagne','beauty',  'Champagne',    { bg:'#f4eddc', ink:'#241d10', ink2:'#8a7a55', accent:'#b39352', rule:'#e0d3b4', hex:'#b39352', logo:'champagne', metal:'champagne' }),
    P('bea-copper',   'beauty',  'Copper',       { bg:'#efe3dc', ink:'#20120b', ink2:'#7d5340', accent:'#a55c34', rule:'#dcc3b4', hex:'#a55c34', logo:'copper', metal:'copper' }),
    /* LONGEVITY */
    P('lon-silver',   'longevity','Silver',      { bg:'#d8dade', ink:'#111418', ink2:'#575d66', accent:'#20548f', rule:'#a8adb5', hex:'#20548f', logo:'silver', metal:'silver' }),
    P('lon-titanium', 'longevity','Titanium',    { bg:'#b9bcc0', ink:'#0f1216', ink2:'#4b515a', accent:'#1d4a80', rule:'#8f949c', hex:'#1d4a80', logo:'silver', metal:'titanium' }),
    P('lon-brushed',  'longevity','Brushed Steel',{bg:'#c6c9cd', ink:'#0d1014', ink2:'#4a5058', accent:'#1f4f88', rule:'#989ea6', hex:'#1f4f88', logo:'silver', metal:'brushed' }),
    P('lon-navy',     'longevity','Azul Marino', { bg:'#0b1c33', ink:'#eef3fa', ink2:'#93a8c4', accent:'#5fa8ff', rule:'#1e3552', hex:'#5fa8ff', logo:'silver' })
  ];
  const palette = id => PALETTES.find(p => p.id === id) || PALETTES[0];
  const palettesOf = line => PALETTES.filter(p => p.line === line);

  /* ---------------------------------------------------------------------
     PRINT FINISHES
     A finish is not a filter. Each one names the plate it separates onto and
     whether it is additive light (foil, gloss) or a surface deformation
     (emboss, deboss) — the preview needs that to lie convincingly, and the
     exporter needs it to lie not at all.
     --------------------------------------------------------------------- */
  const F = (id, name, plate, kind, o) => Object.assign({ id, name, plate, kind }, o || {});
  const FINISHES = [
    F('none',        'None',              null,               'flat'),
    F('softtouch',   'Soft Touch',        null,               'surface', { rough: .55 }),
    F('foil-silver', 'Hot Foil Silver',   'PX_FOIL_SILVER',   'foil',    { a: '#f4f6f8', b: '#8f959d' }),
    F('foil-gold',   'Hot Foil Gold',     'PX_FOIL_GOLD',     'foil',    { a: '#ffe9a8', b: '#a8802c' }),
    F('foil-rose',   'Rose Gold Foil',    'PX_FOIL_ROSEGOLD', 'foil',    { a: '#f7d4c4', b: '#a9634a' }),
    F('foil-copper', 'Copper Foil',       'PX_FOIL_COPPER',   'foil',    { a: '#f0b48c', b: '#8c4a24' }),
    F('spotuv',      'Spot UV',           'PX_SPOT_UV',       'varnish', { gloss: .85 }),
    F('glossuv',     'Gloss UV',          'PX_GLOSS_UV',      'varnish', { gloss: .70 }),
    F('selectiveuv', 'Selective UV',      'PX_SELECTIVE_UV',  'varnish', { gloss: .92 }),
    F('emboss',      'Emboss',            'PX_EMBOSS',        'relief',  { dir: 1 }),
    F('deboss',      'Deboss',            'PX_DEBOSS',        'relief',  { dir: -1 }),
    F('lam-matte',   'Matte Lamination',  null,               'surface', { rough: .35 }),
    F('lam-gloss',   'Gloss Lamination',  null,               'surface', { rough: .05 }),
    F('brushed',     'Brushed Metal',     null,               'surface', { rough: .22 }),
    F('textured',    'Textured Paper',    null,               'surface', { rough: .75 }),
    F('whiteink',    'White Ink',         'PX_WHITE',         'ink',     { a: '#ffffff' }),
    F('transparent', 'Transparent Label', null,               'substrate')
  ];
  const finish = id => FINISHES.find(f => f.id === id) || FINISHES[0];
  const plates = doc => {
    const s = new Set();
    for (const o of doc.objects) { const f = finish(o.finish); if (f.plate && o.on) s.add(f.plate); }
    if (doc.substrate.transparent) s.add('PX_WHITE');
    s.add('PX_DIE_CUT');
    return [...s].sort();
  };

  /* ---------------------------------------------------------------------
     LAYERS
     --------------------------------------------------------------------- */
  const LAYERS = [
    { id: 'background', name: 'Background', prints: true,  z: 10 },
    { id: 'artwork',    name: 'Artwork',    prints: true,  z: 20 },
    { id: 'foil',       name: 'Foil',       prints: true,  z: 30 },
    { id: 'spotuv',     name: 'Spot UV',    prints: true,  z: 40 },
    { id: 'emboss',     name: 'Emboss',     prints: true,  z: 50 },
    { id: 'deboss',     name: 'Deboss',     prints: true,  z: 55 },
    { id: 'whiteink',   name: 'White Ink',  prints: true,  z: 5  },
    { id: 'cutline',    name: 'Cut Line',   prints: true,  z: 90 },
    { id: 'bleed',      name: 'Bleed',      prints: false, z: 95 },
    { id: 'safe',       name: 'Safe Area',  prints: false, z: 96 }
  ];
  const layer = id => LAYERS.find(l => l.id === id) || LAYERS[1];

  /* Which layer a finish sends an object to, unless the operator overrides. */
  function layerFor(finishId) {
    const f = finish(finishId);
    if (f.kind === 'foil') return 'foil';
    if (f.kind === 'varnish') return 'spotuv';
    if (f.id === 'emboss') return 'emboss';
    if (f.id === 'deboss') return 'deboss';
    if (f.id === 'whiteink') return 'whiteink';
    return 'artwork';
  }

  /* ---------------------------------------------------------------------
     THE COMPOSITION
     Fractions measured off the supplied reference. Everything an operator can
     move is expressed against these, so the layout survives any trim size.
     --------------------------------------------------------------------- */
  const LAYOUT = {
    divA: 0.305, divB: 0.654,          // zone boundaries, fraction of trim width
    padX: 0.030, padY: 0.090,          // inner padding, fraction of W / H
    gap:  0.022,                       // gap between stacked rows, fraction of H
    logo:   { y0: 0.133, y1: 0.886 },
    comp:   { y0: 0.133, y1: 0.326 },
    line:   { y0: 0.420, y1: 0.498 },
    dose:   { y0: 0.584, y1: 0.667 },
    rule:   { y: 0.735 },
    tested: { y0: 0.804, y1: 0.894 },
    hex:    { y0: 0.255, y1: 0.773 }
  };

  /* Line-badge glyphs. Simple stroked geometry authored here — the reference
     shows an icon inside the hexagon, and the brief asks for icons as
     independently editable objects, which a flattened photograph can never
     be. Vector paths in a 100x100 box. */
  /* Authored in absolute M/L/C only, in a 0..100 box. No shorthand: the
     h/v/s/q operators are not in the subset the PDF and PostScript writers
     understand, and a path that renders on a canvas but writes NaN into a
     press file is worse than no path at all. */
  const ICONS = {
    dumbbell: 'M18 44L18 56 M28 34L28 66 M28 50L72 50 M72 34L72 66 M82 44L82 56',
    molecule: 'M50 30L50 44 M50 56L50 70 M36 38L46 46 M64 38L54 46 M36 62L46 54 M64 62L54 54 M50 44L50 56',
    hourglass:'M32 24L68 24 M32 76L68 76 M36 24L36 34L50 50L36 66L36 76 M64 24L64 34L50 50L64 66L64 76',
    shield:   'M50 24L70 32L70 50L50 76L30 50L30 32L50 24',
    dna:      'M38 24L38 34L62 46L62 56L38 68L38 76 M62 24L62 34L38 46L38 56L62 68L62 76 M41 40L59 40 M41 60L59 60',
    flask:    'M42 24L58 24 M46 24L46 44L32 74L68 74L54 44L54 24 M38 62L62 62',
    heart:    'M50 74C34 62 28 50 34 40C39 32 47 33 50 40C53 33 61 32 66 40C72 50 66 62 50 74',
    atom:     'M22 50C22 42 34 36 50 36C66 36 78 42 78 50C78 58 66 64 50 64C34 64 22 58 22 50 M36 26C44 22 56 32 62 44C68 56 68 68 60 74',
    drop:     'M50 22C50 22 30 46 30 58C30 69 39 77 50 77C61 77 70 69 70 58C70 46 50 22 50 22',
    leaf:     'M28 72C28 46 46 28 72 28C72 54 54 72 28 72 M28 72C40 60 52 52 66 46'
  };
  const ICON_KEYS = Object.keys(ICONS);
  const ICON_OF_LINE = { fitness: 'dumbbell', beauty: 'molecule', longevity: 'hourglass' };

  /* ---------------------------------------------------------------------
     OBJECTS
     Every mark on the label is one of these. Nothing is embedded: an object
     carries its own text, its own type spec, its own colour, its own finish
     and its own place in the layer stack, and any of them can be edited or
     switched off on its own.
     --------------------------------------------------------------------- */
  const TYPE = (o) => Object.assign({
    family: 'display', weight: 400, capMM: 2.2, tracking: 0.16,
    leading: 1.25, case: 'upper', align: 'left', italic: false, opacity: 1
  }, o || {});

  function obj(o) {
    return Object.assign({
      on: true, locked: false, finish: 'none', layerOverride: null,
      ov: { dx: 0, dy: 0, sx: 1 },        // operator nudge, in mm / factor
      colour: 'ink', text: '', type: null
    }, o);
  }

  /** The default object set — the supplied composition, as objects. */
  function defaultObjects(seed) {
    seed = seed || {};
    const L = LAYOUT;
    return [
      obj({ id: 'bg',      kind: 'background', label: 'Background',       colour: 'bg' }),
      obj({ id: 'logo',    kind: 'logo',       label: 'PEPTIDEX lockup',  zone: 'A',
            box: { y0: L.logo.y0, y1: L.logo.y1 }, align: 'center', finish: 'foil-silver',
            /* WHICH supplied file, never HOW it is coloured. Four lockups were
               delivered — the stacked master and one per line, each already in
               that line's own metal — and the operator picks between them.
               Nothing is tinted, recoloured or redrawn to make a set. */
            asset: 'auto' }),
      obj({ id: 'divA',    kind: 'divider',    label: 'Divider 1',        at: L.divA,
            colour: 'rule', thickMM: 0.25, inset: 0.16 }),
      obj({ id: 'divB',    kind: 'divider',    label: 'Divider 2',        at: L.divB,
            colour: 'rule', thickMM: 0.25, inset: 0.16 }),
      obj({ id: 'compound',kind: 'text',       label: 'Compound',         zone: 'B',
            box: { y0: L.comp.y0, y1: L.comp.y1 }, text: seed.compound || 'RT10',
            type: TYPE({ weight: 500, tracking: 0.02 }), colour: 'ink' }),
      obj({ id: 'line',    kind: 'text',       label: 'Line',             zone: 'B',
            box: { y0: L.line.y0, y1: L.line.y1 }, text: seed.line || 'FITNESS',
            type: TYPE({ weight: 400, tracking: 0.22 }), colour: 'accent' }),
      obj({ id: 'dose',    kind: 'text',       label: 'MG',               zone: 'B',
            box: { y0: L.dose.y0, y1: L.dose.y1 }, text: seed.dose || '10MG',
            type: TYPE({ weight: 400, tracking: 0.06 }), colour: 'ink' }),
      obj({ id: 'ruleB',   kind: 'rule',       label: 'Separator',        zone: 'B',
            box: { y0: L.rule.y, y1: L.rule.y }, colour: 'accent', thickMM: 0.3 }),
      obj({ id: 'tested',  kind: 'text',       label: 'Tested in USA',    zone: 'B',
            box: { y0: L.tested.y0, y1: L.tested.y1 }, text: 'TESTED IN USA',
            type: TYPE({ weight: 400, tracking: 0.03 }), colour: 'ink' }),
      obj({ id: 'flag',    kind: 'flag',       label: 'Flag',             zone: 'B',
            box: { y0: L.tested.y0, y1: L.tested.y1 }, after: 'tested' }),
      obj({ id: 'hex',     kind: 'hex',        label: 'Hexagon',          zone: 'C',
            box: { y0: L.hex.y0, y1: L.hex.y1 }, colour: 'hex', thickMM: 0.35 }),
      obj({ id: 'icon',    kind: 'icon',       label: 'Icon',             zone: 'C',
            box: { y0: L.hex.y0, y1: L.hex.y1 }, glyph: seed.icon || 'dumbbell',
            colour: 'hex', thickMM: 0.30 }),
      obj({ id: 'purity',  kind: 'text',       label: 'Purity',           zone: 'C',
            box: { y0: 0.36, y1: 0.455 }, text: '99% PURITY', afterHex: true,
            type: TYPE({ weight: 400, tracking: 0.07 }), colour: 'ink' }),
      obj({ id: 'ruo',     kind: 'text',       label: 'Research use only',zone: 'C',
            box: { y0: 0.575, y1: 0.665 }, text: 'RESEARCH USE ONLY', afterHex: true,
            type: TYPE({ weight: 400, tracking: 0.045 }), colour: 'ink' }),
      obj({ id: 'lot',     kind: 'text',       label: 'Lot code',         zone: 'B',
            box: { y0: 0.905, y1: 0.975 }, text: '', on: false,
            type: TYPE({ weight: 400, tracking: 0.12 }), colour: 'ink2' }),
      obj({ id: 'date',    kind: 'text',       label: 'Date',             zone: 'C',
            box: { y0: 0.905, y1: 0.975 }, text: '', on: false, afterHex: true,
            type: TYPE({ weight: 400, tracking: 0.12 }), colour: 'ink2' }),
      obj({ id: 'cut',     kind: 'cutline',    label: 'Cut line' })
    ];
  }

  /* ---------------------------------------------------------------------
     DOCUMENT
     --------------------------------------------------------------------- */
  function newDoc(seed) {
    seed = seed || {};
    const dose = doseByMg(seed.mg || '10mg') || DOSES[3];
    const line = seed.line || 'fitness';
    const pal = seed.palette || palettesOf(line)[0].id;
    return {
      id: 'hz_' + Math.random().toString(36).slice(2, 10),
      family: FAMILY,
      schemaVersion: SCHEMA,
      name: seed.name || ('Premium Horizontal · ' + dose.mg),
      line, palette: pal, dosePreset: dose.mg,
      geom: Object.assign({
        w: dose.w, h: dose.h,
        bleed: 3, safe: 2, radius: 1.5,
        padX: LAYOUT.padX, padY: LAYOUT.padY, gap: LAYOUT.gap
      }, balance(dose.w / dose.h), {
        lockRatio: true, ratio: dose.w / dose.h,
        zoneC: 'auto'          /* 'auto' | 'beside' | 'stacked' */
      }),
      substrate: { transparent: false, laminate: 'lam-matte', material: 'vinyl-white' },
      objects: defaultObjects({
        compound: seed.compound || 'RT10',
        line: (seed.lineName || line).toUpperCase(),
        dose: (seed.mg || '10mg').toUpperCase(),
        icon: ICON_OF_LINE[line] || 'dumbbell'
      }),
      layers: LAYERS.reduce((m, l) => (m[l.id] = { on: true, locked: false, exp: true }, m), {}),
      view: { material: 'auto', mockup: 'v10' },
      custom: [],                              // operator-made palettes
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      version: 0
    };
  }

  const isHz = d => !!(d && d.family === FAMILY);
  const objOf = (doc, id) => doc.objects.find(o => o.id === id) || null;

  /* The reference composition is 7:1 and its zone divisions assume that much
     room. A wrap label sized to a real vial is nearer 2.5:1, and at those
     proportions the right-hand zone is too narrow to hold a seventeen-
     character legal line beside a badge at any legible size. So the divisions
     move with the aspect: the reference numbers on a wide trim, and a wider
     right-hand zone on a narrow one. They remain plain editable numbers —
     this sets a starting point, it does not lock anything. */
  function balance(ratio) {
    return ratio >= 5.5 ? { divA: LAYOUT.divA, divB: LAYOUT.divB }
         : ratio >= 3.6 ? { divA: 0.290, divB: 0.600 }
                        : { divA: 0.255, divB: 0.545 };
  }

  /** Apply a dosage preset. Geometry only — nothing else is disturbed. */
  function applyDose(doc, mg) {
    const p = doseByMg(mg);
    if (!p) return false;
    doc.dosePreset = mg;
    doc.geom.w = p.w; doc.geom.h = p.h; doc.geom.ratio = p.w / p.h;
    Object.assign(doc.geom, balance(p.w / p.h));
    const d = objOf(doc, 'dose');
    if (d) d.text = mg.toUpperCase();
    return true;
  }

  /** Resolve a colour token against the active palette (or a literal hex). */
  function ink(doc, token) {
    if (!token) return '#000000';
    if (token[0] === '#') return token;
    const c = (doc.custom || []).find(p => p.id === doc.palette);
    const p = c || palette(doc.palette);
    return p[token] || p.ink || '#000000';
  }
  function pal(doc) {
    return (doc.custom || []).find(p => p.id === doc.palette) || palette(doc.palette);
  }

  /* ---------------------------------------------------------------------
     ZONES — computed, never stored
     --------------------------------------------------------------------- */
  function zones(doc) {
    const g = doc.geom, W = g.w, H = g.h;
    const px = W * g.padX, py = H * g.padY;
    return {
      W, H, px, py,
      A: { x0: px, x1: W * g.divA - px * 0.5 },
      B: { x0: W * g.divA + px * 0.9, x1: W * g.divB - px * 0.5 },
      C: { x0: W * g.divB + px * 0.9, x1: W - px },
      inner: { x0: px, y0: py, x1: W - px, y1: H - py }
    };
  }

  return {
    SCHEMA, FAMILY, PPMM, mm2px, mm2pt, pt2mm,
    VIALS, DOSES, doseByMg, wrapW,
    PALETTES, palette, palettesOf, pal, ink,
    FINISHES, finish, plates, LAYERS, layer, layerFor,
    LAYOUT, ICONS, ICON_KEYS, ICON_OF_LINE, TYPE, obj, defaultObjects,
    newDoc, isHz, objOf, applyDose, zones, balance
  };
})();

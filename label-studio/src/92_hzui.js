/* ============================================================================
   package: @px/hz-ui
   The Premium Horizontal workspace.

   ADDITIVE BY CONSTRUCTION
   Nothing existing is moved, renamed or replaced. The portrait masters, their
   slots, their command history, their preflight and their exporters are
   untouched and still the default on boot. This adds a second family that
   lives beside them: a template picker at the top of the left dock, its own
   inspector stack on the right, and its own exporters. Switching families
   swaps what the stage is showing and nothing else — the classic document is
   still in memory, still undoable, still exactly where it was left.

   Its own undo, too. The classic document's command stack is typed to slots
   and bindings that a horizontal label does not have, so pushing this
   family's edits through it would have meant changing that model. It gets a
   snapshot stack of its own instead, and the existing history keeps working
   the way it always did.
   depends on: everything
   ============================================================================ */
const HZUI = (() => {
  'use strict';

  let API = null, doc = null, board = null, report = null, active = false;
  let sel = 'compound';
  const undoStack = [], redoStack = [];
  const MAX_UNDO = 200;

  const el = (t, a, ...k) => API.el(t, a, ...k);
  const $ = s => document.querySelector(s);

  /* ---------- history ---------------------------------------------------- */
  const snap = () => JSON.stringify(doc);
  function commit(label) {
    undoStack.push({ s: snap(), label });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }
  function undo() {
    if (!undoStack.length) return API.toast('Nothing to undo', '', 'info');
    redoStack.push({ s: snap(), label: 'redo' });
    doc = JSON.parse(undoStack.pop().s);
    refresh(true);
  }
  function redo() {
    if (!redoStack.length) return API.toast('Nothing to redo', '', 'info');
    undoStack.push({ s: snap(), label: 'undo' });
    doc = JSON.parse(redoStack.pop().s);
    refresh(true);
  }

  /* ---------- change plumbing -------------------------------------------- */
  function edit(label, fn) {
    commit(label);
    fn(doc);
    doc.version++;
    doc.meta.updatedAt = new Date().toISOString();
    refresh();
  }
  function refresh(rebuild) {
    render();
    API.paint();
    if (rebuild !== false) { buildLeft(); buildRight(); }
    saveLocal();
  }
  function render() {
    board = HZR.render(doc).artboards[0];
    report = HZUV.run(board, 'proof');
    API.setScene({ artboards: [board], engine: '1.1.0-hz', docVersion: doc.version, hz: true });
    return board;
  }

  const KEY = 'px.hz.doc.v1';
  const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (e) {} };
  function loadLocal() {
    try {
      const s = localStorage.getItem(KEY);
      if (!s) return null;
      const d = JSON.parse(s);
      return (d && d.family === HZ.FAMILY && d.schemaVersion === HZ.SCHEMA) ? d : null;
    } catch (e) { return null; }
  }

  /* ---------- small builders --------------------------------------------- */
  function field(label, node, hint) {
    const f = el('div', { class: 'field' }, el('label', {}, label), node);
    if (hint) f.appendChild(el('div', { class: 'hint' }, hint));
    return f;
  }
  function num(val, step, fn, min, max, unit) {
    const i = el('input', {
      class: 'inp mono', type: 'number', value: String(val), step: String(step || 0.1),
      min: min == null ? null : String(min), max: max == null ? null : String(max),
      onchange: e => { const v = parseFloat(e.target.value); if (!isNaN(v)) fn(v); }
    });
    if (!unit) return i;
    return el('div', { class: 'hzunit' }, i, el('span', {}, unit));
  }
  function sel1(opts, value, fn) {
    const s = el('select', { class: 'inp', onchange: e => fn(e.target.value) });
    for (const o of opts) {
      const op = el('option', { value: o.v }, o.n);
      if (o.v === value) op.setAttribute('selected', 'selected');
      s.appendChild(op);
    }
    s.value = value;
    return s;
  }
  function seg(opts, value, fn) {
    const s = el('div', { class: 'seg' });
    for (const o of opts)
      s.appendChild(el('button', {
        'aria-selected': String(o.v === value), onclick: () => fn(o.v), title: o.t || o.n
      }, o.n));
    return s;
  }
  const btn = (label, fn, kind) => el('button', { class: 'btn' + (kind ? ' ' + kind : ''), onclick: fn }, label);
  function toggle(on, fn, title) {
    return el('button', {
      class: 'hztog' + (on ? ' on' : ''), title: title || '',
      onclick: e => { e.stopPropagation(); fn(!on); }
    }, on ? '●' : '○');
  }

  /* =====================================================================
     LEFT DOCK — template, geometry, palette
     ===================================================================== */
  function buildLeft() {
    const host = $('#hzLeft');
    if (!host) return;
    host.innerHTML = '';
    const P = API.panel;

    /* ---- family switch ---- */
    host.appendChild(P('Label family', null, b => {
      b.appendChild(seg([
        { v: 'portrait', n: 'Portrait master', t: 'The original 46 × 87 mm masters' },
        { v: 'hz', n: 'Premium Horizontal', t: 'Parametric vector template' }
      ], active ? 'hz' : 'portrait', v => setActive(v === 'hz')));
      b.appendChild(el('div', { class: 'hint' },
        active ? 'Fully vector. Every object below is live geometry — nothing is flattened.'
               : 'Immutable raster masters with variable-data slots.'));
    }, 'hzfamily', true));

    if (!active) return;

    /* ---- template ---- */
    host.appendChild(P('Premium Horizontal', null, b => {
      b.appendChild(field('Document name', el('input', {
        class: 'inp', value: doc.name,
        onchange: e => edit('Rename', d => d.name = e.target.value)
      })));

      b.appendChild(field('Line', seg(
        [{ v: 'fitness', n: 'Fitness' }, { v: 'beauty', n: 'Beauty' }, { v: 'longevity', n: 'Longevity' }],
        doc.line, v => edit('Line → ' + v, d => {
          d.line = v;
          d.palette = HZ.palettesOf(v)[0].id;
          const ln = HZ.objOf(d, 'line'); if (ln) ln.text = v.toUpperCase();
          const ic = HZ.objOf(d, 'icon'); if (ic) ic.glyph = HZ.ICON_OF_LINE[v];
          const lg = HZ.objOf(d, 'logo');
          if (lg) lg.finish = v === 'beauty' ? 'foil-copper' : 'foil-silver';
        }))));

      b.appendChild(field('Dosage template',
        sel1(HZ.DOSES.map(x => ({ v: x.mg, n: x.mg + '  ·  ' + x.ml + '  ·  ' + x.w + ' × ' + x.h + ' mm' })),
          doc.dosePreset, v => edit('Dose → ' + v, d => HZ.applyDose(d, v))),
        'Sets the trim from the vial the label wraps: circumference plus a 3 mm seam, by that vial’s body height. Every dimension stays editable underneath.'));

      const d = HZ.doseByMg(doc.dosePreset);
      if (d) b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, d.ml + ' vial'), el('b', {}, 'Ø ' + HZ.VIALS[d.vial].dia + ' mm'),
        el('span', {}, 'body'), el('b', {}, HZ.VIALS[d.vial].body + ' mm')));
    }, 'hztpl', true));

    /* ---- geometry ---- */
    host.appendChild(P('Geometry', null, b => {
      const g = doc.geom;
      const two = (l1, n1, l2, n2) => {
        const r = el('div', { class: 'row' });
        r.appendChild(el('div', { style: 'flex:1' }, field(l1, n1)));
        r.appendChild(el('div', { style: 'flex:1' }, field(l2, n2)));
        return r;
      };
      b.appendChild(two(
        'Width (mm)', num(g.w, 0.1, v => edit('Width', d => {
          if (d.geom.lockRatio) d.geom.h = Math.round(v / d.geom.ratio * 100) / 100;
          d.geom.w = v;
        }), 5, 400),
        'Height (mm)', num(g.h, 0.1, v => edit('Height', d => {
          if (d.geom.lockRatio) d.geom.w = Math.round(v * d.geom.ratio * 100) / 100;
          d.geom.h = v;
        }), 3, 400)));
      b.appendChild(el('label', { class: 'hzchk' },
        el('input', {
          type: 'checkbox', checked: g.lockRatio ? 'checked' : null,
          onchange: e => edit('Lock ratio', d => {
            d.geom.lockRatio = e.target.checked;
            if (e.target.checked) d.geom.ratio = d.geom.w / d.geom.h;
          })
        }), ' Keep proportion (' + (g.w / g.h).toFixed(3) + ':1)'));

      b.appendChild(two(
        'Bleed (mm)', num(g.bleed, 0.5, v => edit('Bleed', d => d.geom.bleed = v), 0, 10),
        'Safe area (mm)', num(g.safe, 0.5, v => edit('Safe', d => d.geom.safe = v), 0, 10)));
      b.appendChild(two(
        'Corner radius (mm)', num(g.radius, 0.1, v => edit('Radius', d => d.geom.radius = v), 0, 20),
        'Row gap', num(g.gap, 0.005, v => edit('Gap', d => d.geom.gap = v), 0, .3)));
      b.appendChild(two(
        'Padding X', num(g.padX, 0.005, v => edit('Padding X', d => d.geom.padX = v), 0, .3),
        'Padding Y', num(g.padY, 0.005, v => edit('Padding Y', d => d.geom.padY = v), 0, .4)));
      b.appendChild(two(
        'Divider 1', num(g.divA, 0.005, v => edit('Divider 1', d => d.geom.divA = v), .1, .9),
        'Divider 2', num(g.divB, 0.005, v => edit('Divider 2', d => d.geom.divB = v), .1, .95)));
      b.appendChild(el('div', { class: 'hint' },
        'Dividers are fractions of the trim width. The reference composition puts them at 0.305 and 0.654.'));
      b.appendChild(btn('Reset to the reference composition', () => edit('Reset layout', d => {
        Object.assign(d.geom, { padX: HZ.LAYOUT.padX, padY: HZ.LAYOUT.padY, gap: HZ.LAYOUT.gap, divA: HZ.LAYOUT.divA, divB: HZ.LAYOUT.divB });
        d.objects.forEach(o => o.ov = { dx: 0, dy: 0, sx: 1 });
      })));
    }, 'hzgeom', true));

    /* ---- palette ---- */
    host.appendChild(P('Colour preset', null, b => {
      const grid = el('div', { class: 'hzpal' });
      for (const p of HZ.palettesOf(doc.line).concat((doc.custom || []).filter(c => c.line === doc.line))) {
        grid.appendChild(el('button', {
          class: 'hzsw' + (p.id === doc.palette ? ' on' : ''), title: p.name,
          onclick: () => edit('Palette → ' + p.name, d => d.palette = p.id)
        },
          el('i', { style: 'background:' + p.bg }),
          el('u', { style: 'background:' + p.accent }),
          el('span', {}, p.name)));
      }
      b.appendChild(grid);

      const P0 = HZ.pal(doc);
      const swatch = (label, key) => field(label, el('div', { class: 'row' },
        el('input', {
          class: 'hzcol', type: 'color', value: P0[key] || '#000000',
          onchange: e => edit('Colour ' + key, d => {
            const cur = HZ.pal(d);
            let c = (d.custom || []).find(x => x.id === d.palette);
            if (!c) {
              c = Object.assign({}, cur, { id: 'custom-' + Math.random().toString(36).slice(2, 7), name: cur.name + ' (custom)', line: d.line });
              d.custom = (d.custom || []).concat([c]);
              d.palette = c.id;
            }
            c[key] = e.target.value;
          })
        }),
        el('input', { class: 'inp mono', value: P0[key] || '', readonly: 'readonly' })));
      b.appendChild(swatch('Substrate', 'bg'));
      b.appendChild(swatch('Primary ink', 'ink'));
      b.appendChild(swatch('Secondary ink', 'ink2'));
      b.appendChild(swatch('Accent', 'accent'));
      b.appendChild(swatch('Rules', 'rule'));
      b.appendChild(swatch('Badge', 'hex'));
      b.appendChild(el('div', { class: 'hint' },
        'Changing any colour forks the preset into a custom one, so the eleven brand presets can never be overwritten.'));
    }, 'hzpal', true));

    /* ---- substrate ---- */
    host.appendChild(P('Substrate', null, b => {
      b.appendChild(field('Material', sel1([
        { v: 'vinyl-white', n: 'White vinyl' }, { v: 'vinyl-clear', n: 'Clear vinyl' },
        { v: 'paper-matte', n: 'Matte paper' }, { v: 'paper-textured', n: 'Textured paper' },
        { v: 'foil-board', n: 'Metallised board' }
      ], doc.substrate.material, v => edit('Material', d => d.substrate.material = v))));
      b.appendChild(el('label', { class: 'hzchk' },
        el('input', {
          type: 'checkbox', checked: doc.substrate.transparent ? 'checked' : null,
          onchange: e => edit('Transparent', d => d.substrate.transparent = e.target.checked)
        }), ' Transparent label'));
      b.appendChild(el('div', { class: 'hint' },
        'A clear substrate needs a White Ink plate under the artwork, or the vial shows through it. Preflight will block the export until one exists.'));
    }, 'hzsub', false));
  }

  /* =====================================================================
     RIGHT DOCK — objects, inspector, layers, finishes, mockup, output
     ===================================================================== */
  function buildRight() {
    const host = $('#hzRight');
    if (!host) return;
    host.innerHTML = '';
    if (!active) return;
    const P = API.panel;

    /* ---- objects ---- */
    host.appendChild(P('Objects', doc.objects.length, b => {
      const list = el('div', { class: 'list' });
      for (const o of doc.objects) {
        const row = el('div', {
          class: 'item', 'aria-selected': String(o.id === sel),
          onclick: () => { sel = o.id; buildRight(); API.paint(); }
        },
          el('span', { class: 'hzkind' }, o.kind[0].toUpperCase()),
          el('span', { class: 'nm' }, o.label),
          o.finish !== 'none' ? el('span', { class: 'sub' }, HZ.finish(o.finish).name.replace(/^Hot Foil /, '')) : null,
          toggle(o.on, v => edit((v ? 'Show ' : 'Hide ') + o.label, d => HZ.objOf(d, o.id).on = v), 'Visible'),
          el('button', {
            class: 'hztog' + (o.locked ? ' lock' : ''), title: 'Lock',
            onclick: e => { e.stopPropagation(); edit('Lock ' + o.label, d => HZ.objOf(d, o.id).locked = !o.locked); }
          }, o.locked ? '🔒' : '🔓')
        );
        list.appendChild(row);
      }
      b.appendChild(list);
    }, 'hzobjs', true));

    /* ---- inspector ---- */
    const o = HZ.objOf(doc, sel);
    if (o) host.appendChild(P('Inspector · ' + o.label, null, b => inspector(b, o), 'hzinsp', true));

    /* ---- layers ---- */
    host.appendChild(P('Layers', HZ.LAYERS.length, b => {
      const list = el('div', { class: 'list' });
      for (const L of HZ.LAYERS) {
        const st = doc.layers[L.id];
        const n = board ? board.prims.filter(p => p.layer === L.id).length : 0;
        list.appendChild(el('div', { class: 'item' },
          el('span', { class: 'nm' }, L.name),
          el('span', { class: 'sub' }, n ? String(n) : '—'),
          toggle(st.on !== false, v => edit((v ? 'Show ' : 'Hide ') + L.name, d => d.layers[L.id].on = v), 'Visible'),
          el('button', {
            class: 'hztog' + (st.locked ? ' lock' : ''), title: 'Lock layer',
            onclick: () => edit('Lock ' + L.name, d => d.layers[L.id].locked = !st.locked)
          }, st.locked ? '🔒' : '🔓'),
          el('button', {
            class: 'hztog' + (st.exp !== false ? ' on' : ''), title: 'Include in export',
            onclick: () => edit('Export ' + L.name, d => d.layers[L.id].exp = st.exp === false)
          }, '⤓')
        ));
      }
      b.appendChild(list);
      b.appendChild(el('div', { class: 'hint' },
        'Bleed and Safe Area are guides — they are drawn on screen and never written to an export.'));
    }, 'hzlayers', true));

    /* ---- print production ---- */
    host.appendChild(P('Print production', board ? board.plates.length : 0, b => {
      b.appendChild(field('Preview material', sel1([
        { v: 'auto', n: 'Automatic (from preset)' }, { v: 'none', n: 'Flat — no simulation' },
        { v: 'silver', n: 'Brushed silver' }, { v: 'titanium', n: 'Titanium' },
        { v: 'graphite', n: 'Graphite' }, { v: 'copper', n: 'Copper' },
        { v: 'rosegold', n: 'Rose gold' }, { v: 'champagne', n: 'Champagne' },
        { v: 'softtouch', n: 'Soft touch' }, { v: 'lam-matte', n: 'Matte lamination' },
        { v: 'lam-gloss', n: 'Gloss lamination' }, { v: 'textured', n: 'Textured paper' }
      ], doc.view.material, v => edit('Material preview', d => d.view.material = v)),
        'Preview only. It is drawn over the artwork on screen and no exporter ever reads it.'));

      const pl = el('div', { class: 'hzplates' });
      for (const p of (board ? board.plates : []))
        pl.appendChild(el('span', { class: 'tag' }, p));
      b.appendChild(field('Separations that will be written', pl));

      b.appendChild(el('div', { class: 'hint' },
        'A plate appears here as soon as an object is assigned a finish that needs one. Assign finishes in the inspector above.'));
    }, 'hzprint', true));

    /* ---- mockup ---- */
    host.appendChild(P('Preview on container', null, b => {
      b.appendChild(field('Vial', sel1(Object.keys(HZ.VIALS).map(k => ({
        v: k, n: HZ.VIALS[k].ml + '  ·  Ø' + HZ.VIALS[k].dia + ' × ' + HZ.VIALS[k].body + ' mm'
      })), doc.view.mockup, v => edit('Mockup', d => d.view.mockup = v))));
      const cv = el('canvas', { class: 'hzmock', id: 'hzMock', width: '420', height: '360' });
      b.appendChild(cv);
      const V = HZ.VIALS[doc.view.mockup];
      const circ = Math.PI * V.dia;
      const fits = doc.geom.w >= circ - 1;
      b.appendChild(el('div', { class: 'note' + (fits ? ' ok' : ' err') },
        el('b', {}, fits ? 'Wraps.' : 'Too narrow.'),
        ' This vial’s circumference is ' + circ.toFixed(1) + ' mm and the label is ' +
        doc.geom.w.toFixed(1) + ' mm wide' +
        (fits ? ', so it closes with a ' + (doc.geom.w - circ).toFixed(1) + ' mm seam.'
              : ' — it will not meet. Widen it by ' + (circ - doc.geom.w).toFixed(1) + ' mm or pick a smaller vial.')));
      setTimeout(() => { try { HZR.mockup(cv, board, doc.view.mockup); } catch (e) {} }, 0);
    }, 'hzmock', true));

    /* ---- output ---- */
    host.appendChild(P('Output', null, b => {
      const r = report;
      b.appendChild(el('div', { class: 'note' + (r && r.pass ? ' ok' : ' err') },
        el('b', {}, r ? (r.pass ? 'Proof clean.' : r.counts.blocking + ' blocking') : '—'),
        r ? ' · ' + r.counts.warning + ' warnings · ' + r.counts.info + ' notes' : ''));
      b.appendChild(btn('UV PRINT READY — run preflight', () => dlgPreflight(), 'pri'));
      b.appendChild(el('div', { style: 'height:8px' }));
      const g2 = (a, b2) => el('div', { class: 'row' }, a, b2);
      b.appendChild(g2(btn('SVG', () => save('svg')), btn('PDF/X-4', () => save('x4'))));
      b.appendChild(g2(btn('PDF/X-1a', () => save('x1a')), btn('AI', () => save('ai'))));
      b.appendChild(g2(btn('EPS', () => save('eps')), btn('TIFF', () => save('tiff'))));
      b.appendChild(g2(btn('PNG 600', () => save('png600')), btn('PNG 1200', () => save('png1200'))));
      b.appendChild(g2(btn('PSD', () => save('psd')), btn('Separations', () => save('seps'))));
      b.appendChild(el('div', { style: 'height:8px' }));
      b.appendChild(btn('Production package (.zip)', () => save('pkg'), 'pri'));
      b.appendChild(el('div', { class: 'hint' },
        'The package carries every format, one file per plate, the manifest and the preflight report.'));
    }, 'hzout', true));
  }

  /* ---------- inspector -------------------------------------------------- */
  function inspector(b, o) {
    const upd = (label, fn) => edit(label, d => fn(HZ.objOf(d, o.id), d));

    if (o.locked) b.appendChild(el('div', { class: 'note' },
      el('b', {}, 'Locked.'), ' Unlock it in the object list to edit.'));

    /* text */
    if (o.kind === 'text') {
      b.appendChild(field('Text', el('input', {
        class: 'inp', value: o.text, disabled: o.locked ? 'disabled' : null,
        oninput: e => { const v = e.target.value; clearTimeout(inspector._t); inspector._t = setTimeout(() => upd('Text', x => x.text = v), 220); }
      })));
      const t = o.type;
      b.appendChild(field('Case', seg([
        { v: 'upper', n: 'ABC' }, { v: 'lower', n: 'abc' }, { v: 'none', n: 'As typed' }
      ], t.case, v => upd('Case', x => x.type.case = v))));
      b.appendChild(field('Alignment', seg([
        { v: 'left', n: 'Left' }, { v: 'center', n: 'Centre' }, { v: 'right', n: 'Right' }
      ], t.align, v => upd('Align', x => x.type.align = v))));
      b.appendChild(field('Weight', sel1(
        [200, 300, 400, 500, 600, 700, 800].map(w => ({ v: String(w), n: String(w) })),
        String(t.weight), v => upd('Weight', x => x.type.weight = +v))));
      const row2 = (l1, n1, l2, n2) => el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field(l1, n1)), el('div', { style: 'flex:1' }, field(l2, n2)));
      b.appendChild(row2(
        'Cap height (× H)', num(((o.box.y1 - o.box.y0)).toFixed(4), 0.002, v => upd('Cap height', x => {
          const c = (x.box.y0 + x.box.y1) / 2; x.box.y0 = c - v / 2; x.box.y1 = c + v / 2;
        }), 0.01, 0.6),
        'Tracking (em)', num(t.tracking, 0.005, v => upd('Tracking', x => x.type.tracking = v), -0.1, 1)));
      b.appendChild(row2(
        'Leading', num(t.leading, 0.05, v => upd('Leading', x => x.type.leading = v), 0.6, 3),
        'Opacity', num(t.opacity, 0.05, v => upd('Opacity', x => x.type.opacity = v), 0.05, 1)));
      const m = board && board.meta.textObjs.find(x => x.id === o.id);
      if (m) b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'sets at'), el('b', { class: m.sizePt < 5 ? 'bad' : '' }, m.sizePt.toFixed(2) + ' pt'),
        el('span', {}, 'cap'), el('b', {}, m.capMM.toFixed(2) + ' mm'),
        el('span', {}, 'width'), el('b', {}, m.widthMM.toFixed(2) + ' mm')));
    }

    if (o.kind === 'icon') {
      b.appendChild(field('Glyph', sel1(HZ.ICON_KEYS.map(k => ({ v: k, n: k })), o.glyph,
        v => upd('Icon', x => x.glyph = v))));
      b.appendChild(field('Stroke (mm)', num(o.thickMM, 0.02, v => upd('Stroke', x => x.thickMM = v), 0.05, 3)));
    }
    if (o.kind === 'hex' || o.kind === 'rule' || o.kind === 'divider')
      b.appendChild(field('Stroke (mm)', num(o.thickMM, 0.02, v => upd('Stroke', x => x.thickMM = v), 0.05, 3),
        (o.thickMM < 0.09 ? 'Under 0.09 mm this will break up on press.' : null)));
    if (o.kind === 'divider')
      b.appendChild(field('Inset (× H)', num(o.inset, 0.01, v => upd('Inset', x => x.inset = v), 0, .45)));

    if (o.kind === 'logo') {
      b.appendChild(field('Supplied lockup', sel1([
        { v: 'auto', n: 'Match the line (' + doc.line + ')' },
        { v: 'master', n: 'Master lockup — stacked' },
        { v: 'fitness', n: 'Fitness lockup' },
        { v: 'beauty', n: 'Beauty lockup' },
        { v: 'longevity', n: 'Longevity lockup' }
      ], o.asset || 'auto', v => upd('Lockup', x => x.asset = v)),
        'Four lockups were supplied, each already in its own metal. This chooses between the files — it never tints one to imitate another.'));
      b.appendChild(el('div', { class: 'note' },
        el('b', {}, 'Supplied artwork.'),
        ' Placed exactly as delivered and never redrawn. Position, size and finish are yours; the artwork is not.' +
        (board && board.meta.logoPPI ? ' It lands at ' + board.meta.logoPPI + ' PPI here.' : '')));
    }

    /* colour */
    if (o.kind !== 'logo' && o.kind !== 'flag' && o.kind !== 'cutline') {
      b.appendChild(field('Colour', sel1([
        { v: 'ink', n: 'Primary ink' }, { v: 'ink2', n: 'Secondary ink' },
        { v: 'accent', n: 'Accent' }, { v: 'rule', n: 'Rules' },
        { v: 'hex', n: 'Badge' }, { v: 'bg', n: 'Substrate' }
      ], o.colour, v => upd('Colour', x => x.colour = v))));
    }

    /* finish */
    if (o.kind !== 'cutline') {
      b.appendChild(field('Print finish', sel1(
        HZ.FINISHES.map(f => ({ v: f.id, n: f.name + (f.plate ? '  →  ' + f.plate : '') })),
        o.finish, v => upd('Finish', x => x.finish = v)),
        'A finish with a plate name behind it separates onto that plate on export. It is not a screen effect.'));
      b.appendChild(field('Layer', sel1(
        [{ v: '', n: 'Automatic (' + HZ.layerFor(o.finish) + ')' }].concat(
          HZ.LAYERS.filter(l => l.prints).map(l => ({ v: l.id, n: l.name }))),
        o.layerOverride || '', v => upd('Layer', x => x.layerOverride = v || null))));
    }

    /* nudge */
    b.appendChild(el('div', { class: 'row' },
      el('div', { style: 'flex:1' }, field('Nudge X (mm)', num(o.ov.dx, 0.1, v => upd('Move X', x => x.ov.dx = v)))),
      el('div', { style: 'flex:1' }, field('Nudge Y (mm)', num(o.ov.dy, 0.1, v => upd('Move Y', x => x.ov.dy = v)))),
      el('div', { style: 'flex:1' }, field('Scale', num(o.ov.sx, 0.02, v => upd('Scale', x => x.ov.sx = v), 0.1, 6)))));
    b.appendChild(btn('Reset this object', () => upd('Reset ' + o.label, x => x.ov = { dx: 0, dy: 0, sx: 1 })));
  }

  /* =====================================================================
     PREFLIGHT DIALOG
     ===================================================================== */
  function dlgPreflight() {
    const body = API.el('div');
    const wrap = API.el('div');
    let intent = 'X-4';
    const draw = () => {
      const r = HZUV.run(board, intent);
      wrap.innerHTML = '';
      wrap.appendChild(API.el('div', { class: 'note' + (r.pass ? ' ok' : ' err') },
        API.el('b', {}, r.pass ? 'PASS — nothing blocking at this intent.' : r.counts.blocking + ' blocking condition(s).'),
        ' ' + r.counts.warning + ' warnings, ' + r.counts.info + ' measurements.'));
      const list = API.el('div', { class: 'list', style: 'margin-top:10px' });
      const order = { blocking: 0, warning: 1, info: 2 };
      for (const v of r.violations.slice().sort((a, b2) => order[a.severity] - order[b2.severity])) {
        list.appendChild(API.el('div', { class: 'hzpf ' + v.severity },
          API.el('div', { class: 'hzpfh' },
            API.el('span', { class: 'hzsev ' + v.severity }, v.severity),
            API.el('b', {}, v.title),
            API.el('span', { class: 'sub' }, v.rule)),
          API.el('div', { class: 'hzpfm' }, v.msg)));
      }
      wrap.appendChild(list);
    };
    body.appendChild(API.el('div', { class: 'field' },
      API.el('label', {}, 'Output intent'),
      seg([{ v: 'proof', n: 'Proof' }, { v: 'uv', n: 'UV print' },
           { v: 'X-4', n: 'PDF/X-4' }, { v: 'X-1a', n: 'PDF/X-1a' }],
        intent, v => { intent = v; draw(); })));
    body.appendChild(wrap);
    draw();
    API.modal({ title: 'UV PRINT READY', sub: 'Preflight · Premium Horizontal', body, wide: true,
      buttons: [{ label: 'Close', kind: 'pri', action: () => {} }] });
  }

  /* =====================================================================
     EXPORT
     ===================================================================== */
  const dl = (data, name, mime) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  const base = () => (doc.name || 'label').replace(/[^\w.-]+/g, '_').slice(0, 48);

  function logoSize() {
    const im = board.prims.find(p => p.t === 'image');
    return { imgW: im ? im.natW : 1090, imgH: im ? im.natH : 672 };
  }

  function save(kind) {
    try {
      const L = logoSize();
      if (kind === 'svg') return dl(HZX.svg(board, { bleed: true }), base() + '.svg', 'image/svg+xml'), ok('SVG');
      if (kind === 'x4') return dl(HZX.pdf(board, Object.assign({ standard: 'X-4', space: 'cmyk', cutline: true }, L)), base() + '_X-4.pdf', 'application/pdf'), ok('PDF/X-4');
      if (kind === 'x1a') return dl(HZX.pdf(board, Object.assign({ standard: 'X-1a', space: 'cmyk', cutline: true }, L)), base() + '_X-1a.pdf', 'application/pdf'), ok('PDF/X-1a');
      if (kind === 'ai') return dl(HZX.pdf(board, Object.assign({ standard: 'plain', space: 'srgb', cutline: true }, L)), base() + '.ai', 'application/postscript'), ok('AI (PDF-compatible)');
      if (kind === 'eps') return dl(HZX.eps(board, { space: 'cmyk', cutline: true }), base() + '.eps', 'application/postscript'), ok('EPS');
      if (kind === 'tiff') return dl(HZX.tiff(board, 600, { bleed: true }), base() + '_600dpi.tif', 'image/tiff'), ok('TIFF 600 dpi');
      if (kind === 'psd') return dl(HZX.psd(board, 600, { bleed: true }), base() + '_600dpi.psd', 'image/vnd.adobe.photoshop'), ok('PSD 600 dpi');
      if (kind === 'png600' || kind === 'png1200') {
        const dpi = kind === 'png600' ? 600 : 1200;
        return HZX.raster(board, dpi, { bleed: true }).canvas.toBlob(bl => {
          dl(bl, base() + '_' + dpi + 'dpi.png', 'image/png'); ok('PNG ' + dpi + ' dpi');
        }, 'image/png');
      }
      if (kind === 'seps') {
        const files = board.plates.map(p => ({
          name: base() + '_' + p + '.pdf',
          data: HZX.pdf(board, { standard: 'X-1a', space: 'cmyk', plate: p, cutline: p === 'PX_DIE_CUT', images: false })
        }));
        return dl(EXPORTER.zip(files), base() + '_separations.zip', 'application/zip'), ok(files.length + ' separation plates');
      }
      if (kind === 'pkg') {
        const r = HZUV.run(board, 'X-4');
        const p = HZX.pkg(board, r, L);
        dl(EXPORTER.zip(p.files), p.base + '_production.zip', 'application/zip');
        return API.toast('Package written', p.files.length + ' files' +
          (r.pass ? '' : ' · ' + r.counts.blocking + ' blocking condition(s) recorded in the report'), r.pass ? 'ok' : 'warn');
      }
    } catch (e) {
      console.error(e);
      API.toast('Export failed', e.message, 'err');
    }
  }
  const ok = what => API.toast('Written', what + ' · vector, ' + board.wMM.toFixed(1) + ' × ' + board.hMM.toFixed(1) + ' mm', 'ok');

  /* =====================================================================
     STAGE INTERACTION — click to select, arrows to nudge
     ===================================================================== */
  function wireStage() {
    const stage = $('#stage');
    stage.addEventListener('pointerdown', e => {
      if (!active || !board) return;
      if (e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey) return;
      const S = API.S;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left - S.panX) / S.zoom / HZR.K;
      const y = (e.clientY - r.top - S.panY) / S.zoom / HZR.K;
      if (x < -6 || y < -6 || x > board.wMM + 6 || y > board.hMM + 6) return;
      const id = HZR.hitTest(board, x, y);
      if (id && id !== sel) { sel = id; buildRight(); API.paint(); }
    }, true);

    addEventListener('keydown', e => {
      if (!active) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      const o = HZ.objOf(doc, sel);
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); return e.shiftKey ? redo() : undo();
      }
      if (!o || o.locked) return;
      const step = e.shiftKey ? 1 : 0.1;
      const mv = (dx, dy) => { e.preventDefault(); edit('Nudge ' + o.label, d => { const t = HZ.objOf(d, o.id); t.ov.dx += dx; t.ov.dy += dy; }); };
      if (e.key === 'ArrowLeft') mv(-step, 0);
      else if (e.key === 'ArrowRight') mv(step, 0);
      else if (e.key === 'ArrowUp') mv(0, -step);
      else if (e.key === 'ArrowDown') mv(0, step);
    });
  }

  /* =====================================================================
     MOUNT
     ===================================================================== */
  function setActive(on) {
    active = !!on;
    try { localStorage.setItem('px.hz.active', active ? '1' : '0'); } catch (e) {}
    if (active) {
      render();
      API.S.selected = null;
    } else {
      API.recompute();
    }
    buildLeft(); buildRight();
    API.fit();
    API.paint();
  }

  function mount(api) {
    API = api;
    doc = loadLocal() || HZ.newDoc({ mg: '10mg', line: 'fitness', compound: 'RT10' });

    /* our own scroll hosts, prepended so nothing existing moves */
    const L = document.createElement('div'); L.id = 'hzLeft';
    const R = document.createElement('div'); R.id = 'hzRight';
    const ls = $('#leftScroll'), rs = $('#rightScroll');
    ls.parentNode.insertBefore(L, ls);
    rs.parentNode.insertBefore(R, rs);

    HZR.preload().then(() => { if (active) { render(); API.paint(); } buildLeft(); buildRight(); });
    wireStage();

    let was = '0';
    try { was = localStorage.getItem('px.hz.active') || '0'; } catch (e) {}
    buildLeft(); buildRight();
    if (was === '1') setActive(true);
    return { setActive };
  }

  return {
    mount, get active() { return active; }, isActive: () => active,
    getBoard: () => board, getDoc: () => doc, getReport: () => report,
    setActive, undo, redo, render, save, dlgPreflight,
    select: id => { sel = id; buildRight(); API.paint(); },
    selectedId: () => sel
  };
})();

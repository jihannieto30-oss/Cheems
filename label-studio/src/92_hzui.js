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

   MASTER LAYOUT LOCK
   On by default. While it is on, nothing can be moved, scaled or resized —
   only text and colour are editable, which is the whole point: the approved
   composition cannot drift. Turning it off exposes the nudge controls, and
   from that moment the validation panel reports the document as departed from
   the master until the element is reset.
   depends on: everything
   ============================================================================ */
const HZUI = (() => {
  'use strict';

  let API = null, doc = null, board = null, report = null, active = false, validation = null;
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
    validation = HZR.validate(board);
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

    host.appendChild(P('Label family', null, b => {
      b.appendChild(seg([
        { v: 'portrait', n: 'Portrait master', t: 'The original 46 × 87 mm masters' },
        { v: 'hz', n: 'Premium Horizontal', t: 'The approved horizontal masters' }
      ], active ? 'hz' : 'portrait', v => setActive(v === 'hz')));
      b.appendChild(el('div', { class: 'hint' },
        active ? 'The approved artwork, drawn as delivered. Editing a string patches only that element’s own box.'
               : 'Immutable raster masters with variable-data slots.'));
    }, 'hzfamily', true));

    if (!active) return;

    /* ---- master ---- */
    host.appendChild(P('Approved master', null, b => {
      b.appendChild(field('Label', seg(HZ.KEYS.map(k => ({ v: k, n: k[0].toUpperCase() + k.slice(1) })),
        doc.master, v => edit('Master → ' + v, d => {
          const keep = JSON.parse(JSON.stringify(d.el));
          const nd = HZ.newDoc({ master: v });
          d.master = v; d.el = nd.el; d.trim = nd.trim; d.name = nd.name;
          for (const id in d.el) if (keep[id]) {
            d.el[id].on = keep[id].on; d.el[id].colour = keep[id].colour;
            d.el[id].finish = keep[id].finish;
          }
        }))));
      b.appendChild(field('Document name', el('input', {
        class: 'inp', value: doc.name,
        onchange: e => edit('Rename', d => d.name = e.target.value)
      })));
      const m = HZ.master(doc.master);
      b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'artwork'), el('b', {}, m.w + ' × ' + m.h + ' px'),
        el('span', {}, 'aspect'), el('b', {}, (m.w / m.h).toFixed(4) + ':1'),
        el('span', {}, 'elements'), el('b', {}, String(HZ.present(doc.master).length))));
    }, 'hzmaster', true));

    /* ---- lock ---- */
    host.appendChild(P('Master Layout Lock', null, b => {
      b.appendChild(seg([{ v: 'on', n: 'ON — composition locked' }, { v: 'off', n: 'OFF' }],
        doc.lock ? 'on' : 'off', v => edit('Layout lock', d => d.lock = (v === 'on'))));
      b.appendChild(el('div', { class: 'note' + (doc.lock ? ' ok' : ' err') },
        el('b', {}, doc.lock ? 'Locked.' : 'Unlocked.'),
        doc.lock
          ? ' Text and colour are editable. Nothing can be moved, scaled or resized, so the approved composition cannot drift.'
          : ' Elements can be nudged off the approved position. Validation will report the document as modified until they are reset.'));
      const mv = HZ.moved(doc);
      if (mv.length) b.appendChild(el('div', { class: 'note err' },
        el('b', {}, 'MASTER LABEL MODIFIED — REVERT REQUIRED'),
        ' ' + mv.length + ' element(s) moved: ' + mv.map(x => HZ.elDef(x.id).label).join(', ') + '.'));
    }, 'hzlock', true));

    /* ---- size ---- */
    host.appendChild(P('Trim size', null, b => {
      const t = doc.trim;
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Width (mm)', num(t.w.toFixed(2), 0.5,
          v => edit('Width', d => HZ.setWidth(d, v)), 8, 400))),
        el('div', { style: 'flex:1' }, field('Height (mm)', num(t.h.toFixed(2), 0.25,
          v => edit('Height', d => HZ.setHeight(d, v)), 4, 400)))));
      b.appendChild(el('div', { class: 'hint' },
        'Uniform, from the centre. The aspect is the master’s and cannot move, so every relationship inside the label is preserved exactly — the layout is never recalculated.'));
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Bleed (mm)', num(doc.print.bleed, 0.5,
          v => edit('Bleed', d => d.print.bleed = v), 0, 10))),
        el('div', { style: 'flex:1' }, field('Safe (mm)', num(doc.print.safe, 0.5,
          v => edit('Safe', d => d.print.safe = v), 0, 10)))));
      if (board) b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'artwork lands at'),
        el('b', { class: board.meta.masterPPI < 300 ? 'bad' : '' }, board.meta.masterPPI + ' PPI')));
    }, 'hztrim', true));

    /* ---- view ---- */
    host.appendChild(P('View', null, b => {
      b.appendChild(seg([{ v: 'edit', n: 'Editing' }, { v: 'prod', n: 'Production' }],
        doc.view.production ? 'prod' : 'edit',
        v => edit('View', d => d.view.production = (v === 'prod'))));
      b.appendChild(el('div', { class: 'hint' },
        'Production shows the final art alone — no guides, no boxes, no die line, nothing on top of the artwork.'));
    }, 'hzview', true));

    /* ---- validation ---- */
    host.appendChild(P('Master validation', null, b => {
      const v = validation;
      if (!v) { b.appendChild(el('div', { class: 'hint' }, 'Not yet run.')); }
      else if (!v.ready) { b.appendChild(el('div', { class: 'hint' }, v.notes[0])); }
      else {
        b.appendChild(el('div', { class: 'note' + (v.pass ? ' ok' : ' err') },
          el('b', {}, v.pass ? 'MATCHES APPROVED MASTER' : 'MASTER LABEL MODIFIED — REVERT REQUIRED'),
          ' ' + v.notes.join(' ')));
        b.appendChild(el('div', { class: 'hzstat' },
          el('span', {}, 'ΔE≈'), el('b', { class: v.dE > 1 ? 'bad' : '' }, String(v.dE)),
          el('span', {}, 'moved'), el('b', { class: v.movedCount ? 'bad' : '' }, String(v.movedCount)),
          el('span', {}, 'patched'), el('b', {}, String(board ? board.meta.patches.length : 0))));
      }
      b.appendChild(btn('Compare against the master', () => { validation = HZR.validate(board); buildLeft(); }));
      b.appendChild(btn('Revert everything to the master', () => {
        edit('Revert to master', d => { const n = HZ.newDoc({ master: d.master, w: d.trim.w }); d.el = n.el; d.lock = true; });
        validation = HZR.validate(board); buildLeft();
      }));
    }, 'hzval', true));
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
    const els = HZ.present(doc.master);

    host.appendChild(P('Layers', els.length, b => {
      const list = el('div', { class: 'list' });
      for (const e of els) {
        const st = doc.el[e.id];
        const patched = board && board.meta.patches.indexOf(e.id) >= 0;
        list.appendChild(el('div', {
          class: 'item', 'aria-selected': String(e.id === sel),
          onclick: () => { sel = e.id; buildRight(); API.paint(); }
        },
          el('span', { class: 'hzkind' }, e.kind === 'text' ? 'T' : 'A'),
          el('span', { class: 'nm' }, e.label),
          patched ? el('span', { class: 'sub' }, 'edited') : null,
          toggle(st.on !== false, v => edit((v ? 'Show ' : 'Hide ') + e.label,
            d => d.el[e.id].on = v), 'Visible'),
          el('button', {
            class: 'hztog' + (st.locked ? ' lock' : ''), title: 'Lock',
            onclick: ev => { ev.stopPropagation(); edit('Lock ' + e.label, d => d.el[e.id].locked = !st.locked); }
          }, st.locked ? '🔒' : '🔓')));
      }
      b.appendChild(list);
      b.appendChild(el('div', { class: 'hint' },
        'Every layer sits on its own measured box from the approved artwork. Editing one patches that box and nothing else.'));
    }, 'hzlayers', true));

    const e = HZ.elDef(sel) && doc.el[sel] ? HZ.elDef(sel) : els[0];
    if (e) host.appendChild(P('Inspector · ' + e.label, null, b => inspector(b, e), 'hzinsp', true));

    host.appendChild(P('Print production', board ? board.plates.length : 0, b => {
      const pl = el('div', { class: 'hzplates' });
      for (const q of (board ? board.plates : [])) pl.appendChild(el('span', { class: 'tag' }, q));
      b.appendChild(field('Separations that will be written', pl));
      const pr = el('div', { class: 'list' });
      for (const L of HZ.LAYERS) {
        const st = doc.layers[L.id];
        pr.appendChild(el('div', { class: 'item' },
          el('span', { class: 'nm' }, L.name),
          toggle(st.on !== false, v => edit(L.name, d => d.layers[L.id].on = v), 'Visible'),
          el('button', { class: 'hztog' + (st.exp !== false ? ' on' : ''), title: 'Include in export',
            onclick: () => edit('Export ' + L.name, d => d.layers[L.id].exp = st.exp === false) }, '⤓')));
      }
      b.appendChild(pr);
    }, 'hzprint', false));

    host.appendChild(P('Preview on container', null, b => {
      b.appendChild(field('Vial', sel1(Object.keys(HZ.VIALS).map(k => ({
        v: k, n: HZ.VIALS[k].ml + '  ·  Ø' + HZ.VIALS[k].dia + ' × ' + HZ.VIALS[k].body + ' mm'
      })), doc.view.mockup, v => edit('Mockup', d => d.view.mockup = v))));
      const cv = el('canvas', { class: 'hzmock', width: '420', height: '360' });
      b.appendChild(cv);
      const V = HZ.VIALS[doc.view.mockup], circ = Math.PI * V.dia;
      const fits = doc.trim.w >= circ - 1;
      b.appendChild(el('div', { class: 'note' + (fits ? ' ok' : ' err') },
        el('b', {}, fits ? 'Wraps.' : 'Too narrow.'),
        ' Circumference ' + circ.toFixed(1) + ' mm, label ' + doc.trim.w.toFixed(1) + ' mm' +
        (fits ? ' — a ' + (doc.trim.w - circ).toFixed(1) + ' mm seam.' : '.')));
      setTimeout(() => { try { HZR.mockup(cv, board, doc.view.mockup); } catch (er) {} }, 0);
    }, 'hzmock', false));

    host.appendChild(P('Output', null, b => {
      const v = validation;
      b.appendChild(el('div', { class: 'note' + (v && v.pass ? ' ok' : (v ? ' err' : '')) },
        el('b', {}, v ? (v.pass ? 'Matches the approved master.' : 'MASTER LABEL MODIFIED') : 'Not validated'),
        v && v.ready ? ' ΔE≈' + v.dE : ''));
      b.appendChild(btn('UV PRINT READY — run preflight', () => dlgPreflight(), 'pri'));
      b.appendChild(el('div', { style: 'height:8px' }));
      const g2 = (a, c) => el('div', { class: 'row' }, a, c);
      b.appendChild(g2(btn('SVG', () => save('svg')), btn('PDF/X-4', () => save('x4'))));
      b.appendChild(g2(btn('AI', () => save('ai')), btn('EPS', () => save('eps'))));
      b.appendChild(g2(btn('PNG 600', () => save('png600')), btn('PNG 1200', () => save('png1200'))));
      b.appendChild(el('div', { style: 'height:8px' }));
      b.appendChild(btn('Production package (.zip)', () => save('pkg'), 'pri'));
      b.appendChild(el('div', { class: 'hint' },
        'The export is the approved master with your edits. Nothing is recomposed, reflowed or regenerated.'));
    }, 'hzout', true));
  }

  /* ---------- inspector -------------------------------------------------- */
  function inspector(b, e) {
    const st = doc.el[e.id];
    const upd = (label, fn) => edit(label, d => fn(d.el[e.id], d));
    const m = HZ.master(doc.master);
    const box = HZ.boxOf(doc.master, e.id);

    if (st.locked) b.appendChild(el('div', { class: 'note' },
      el('b', {}, 'Locked.'), ' Unlock it in the layer list to edit.'));

    if (e.kind === 'text') {
      const cur = st.text != null ? st.text : (m.strings[e.id] || '');
      b.appendChild(field('Text', el('input', {
        class: 'inp', value: cur, disabled: st.locked ? 'disabled' : null,
        oninput: ev => { const v = ev.target.value; clearTimeout(inspector._t);
          inspector._t = setTimeout(() => upd('Text', x => x.text = v), 260); }
      }), st.text == null
        ? 'Untouched — the master’s own artwork is showing. Type here and only this box is patched.'
        : 'Edited. This box is patched from the clean plate and re-set at the master’s cap height and baseline.'));
      if (st.text != null) b.appendChild(btn('Restore the master’s text',
        () => upd('Restore text', x => { x.text = null; x.tracking = null; x.weight = null; })));
      b.appendChild(field('Weight', sel1([200,300,400,500,600,700].map(w => ({ v: String(w), n: String(w) })),
        String(st.weight || 400), v => upd('Weight', x => x.weight = +v))));
      b.appendChild(field('Tracking (em)', num(st.tracking != null ? st.tracking : 0, 0.005,
        v => upd('Tracking', x => x.tracking = v), -0.06, 0.6),
        st.tracking == null ? 'Automatic: matched to the width the master sets this string at.' : null));
      const t = board && board.meta.textObjs.find(x => x.id === e.id);
      if (t) b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'sets at'), el('b', { class: t.sizePt < 5 ? 'bad' : '' }, t.sizePt.toFixed(2) + ' pt'),
        el('span', {}, 'width'), el('b', { class: t.over ? 'bad' : '' }, t.widthMM.toFixed(2) + ' mm'),
        el('span', {}, 'box'), el('b', {}, t.boxW.toFixed(2) + ' mm')));
    } else {
      b.appendChild(el('div', { class: 'note' },
        el('b', {}, 'Approved artwork.'),
        ' Placed exactly as delivered. Its shape is the master’s own — colour and finish are yours, the drawing is not.'));
    }

    b.appendChild(field('Colour', el('div', { class: 'row' },
      el('input', { class: 'hzcol', type: 'color',
        value: st.colour || HZ.inkOf(doc.master, e.id),
        onchange: ev => upd('Colour', x => x.colour = ev.target.value) }),
      el('input', { class: 'inp mono', readonly: 'readonly',
        value: st.colour || (HZ.inkOf(doc.master, e.id) + '  (measured)') })),
      st.colour ? null : 'This is the ink measured out of the approved artwork.'));
    if (st.colour) b.appendChild(btn('Restore the measured ink', () => upd('Restore colour', x => x.colour = null)));

    b.appendChild(field('Print finish', sel1(HZ.FINISHES.map(f =>
      ({ v: f.id, n: f.name + (f.plate ? '  →  ' + f.plate : '') })),
      st.finish, v => upd('Finish', x => x.finish = v)),
      'A finish with a plate behind it separates onto that plate on export.'));

    if (box) b.appendChild(el('div', { class: 'hzstat' },
      el('span', {}, 'master box'), el('b', {}, box.x + ',' + box.y),
      el('b', {}, box.w + '×' + box.h + ' px')));

    if (doc.lock) {
      b.appendChild(el('div', { class: 'note' },
        el('b', {}, 'Position locked.'), ' Turn Master Layout Lock off to move this element.'));
    } else {
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Nudge X (mm)', num(st.ov.dx, 0.1, v => upd('Move X', x => x.ov.dx = v)))),
        el('div', { style: 'flex:1' }, field('Nudge Y (mm)', num(st.ov.dy, 0.1, v => upd('Move Y', x => x.ov.dy = v)))),
        el('div', { style: 'flex:1' }, field('Scale', num(st.ov.sx, 0.02, v => upd('Scale', x => x.ov.sx = v), 0.2, 4)))));
      b.appendChild(btn('Reset to the approved position',
        () => upd('Reset ' + e.label, x => x.ov = { dx: 0, dy: 0, sx: 1 })));
    }
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

  function logoSize() { return {}; }

  function save(kind) {
    try {
      const L = logoSize();
      if (kind === 'svg') return dl(HZX.svg(board, { bleed: true }), base() + '.svg', 'image/svg+xml'), ok('SVG');
      if (kind === 'x4') return dl(HZX.pdf(board, Object.assign({ standard: 'X-4', space: 'cmyk', cutline: true }, L)), base() + '_X-4.pdf', 'application/pdf'), ok('PDF/X-4');
      if (kind === 'x1a') return dl(HZX.pdf(board, Object.assign({ standard: 'X-1a', space: 'cmyk', cutline: true }, L)), base() + '_X-1a.pdf', 'application/pdf'), ok('PDF/X-1a');
      if (kind === 'tiff') return dl(HZX.tiff(board, 600, { bleed: true }), base() + '_600dpi.tif', 'image/tiff'), ok('TIFF 600 dpi');
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
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); return e.shiftKey ? redo() : undo();
      }
      if (doc.lock) return;                       /* the lock means the lock */
      const def = HZ.elDef(sel);
      const st = doc.el[sel];
      if (!def || !st || st.locked) return;
      const step = e.shiftKey ? 1 : 0.1;
      const mv = (dx, dy) => { e.preventDefault(); edit('Nudge ' + def.label, d => { d.el[sel].ov.dx += dx; d.el[sel].ov.dy += dy; }); };
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
    doc = loadLocal() || HZ.newDoc({ master: HZ.KEYS[0] });
    sel = 'compound';

    /* our own scroll hosts, prepended so nothing existing moves */
    const L = document.createElement('div'); L.id = 'hzLeft';
    const R = document.createElement('div'); R.id = 'hzRight';
    const ls = $('#leftScroll'), rs = $('#rightScroll');
    ls.parentNode.insertBefore(L, ls);
    rs.parentNode.insertBefore(R, rs);

    HZR.preload().then(() => { render(); if (active) API.paint(); buildLeft(); buildRight(); });
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
    getValidation: () => validation,
    setActive, undo, redo, render, save, dlgPreflight,
    select: id => { sel = id; buildRight(); API.paint(); },
    selectedId: () => sel
  };
})();

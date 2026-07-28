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
  let skuQuery = '';
  let lastEdit = null, lastEditAt = 0;
  const COALESCE_MS = 900;   /* a pause this long ends the run */

  /* The whole catalogue, in the panel, searchable. 118 SKUs is too many for a
     dropdown and exactly the right number for a filtered list — picking one
     sets the three strings that identify the product and nothing else. */
  /* The list is drawn straight into the node, not looked up by id: panel()
     fills its body before the body is in the document, so a querySelector at
     build time finds nothing and the panel comes up empty. */
  function drawSkus(node, counter) {
    const host = node || $('#hzSkuList');
    if (!host) return;
    const q = skuQuery.trim().toLowerCase();
    const hits = HZ.SKUS.filter(x => !q ||
      (x.sku + ' ' + x.name + ' ' + x.short + ' ' + x.mg + ' ' + x.line).toLowerCase().indexOf(q) >= 0);
    host.innerHTML = '';
    const cur = (doc.el.compound && doc.el.compound.text) || null;
    for (const x of hits.slice(0, 400)) {
      host.appendChild(el('div', {
        class: 'item', 'aria-selected': String(cur === x.short && doc.master === x.line),
        title: x.name + ' · ' + x.sku,
        onclick: () => edit('SKU ' + x.sku, d => {
          d.master = x.line;
          const nd = HZ.newDoc({ master: x.line, w: d.trim.w });
          const keep = d.el;
          d.el = nd.el; d.trim = nd.trim;
          for (const id in d.el) if (keep[id]) {
            d.el[id].colour = keep[id].colour; d.el[id].finish = keep[id].finish;
            d.el[id].on = keep[id].on;
          }
          if (d.el.compound) d.el.compound.text = x.short;
          if (d.el.mg_value) d.el.mg_value.text = x.mg;
          if (d.el.line_name) d.el.line_name.text = x.line.toUpperCase();
          d.name = x.name + ' ' + x.mg;
        })
      },
        el('span', { class: 'hzkind' }, x.line[0].toUpperCase()),
        el('span', { class: 'nm' }, x.name),
        el('span', { class: 'sub' }, x.short + ' · ' + x.mg)));
    }
    const c = counter || $('#hzSkuCount');
    if (c) c.textContent = hits.length + ' of ' + HZ.SKUS.length + ' SKUs' +
      (hits.length > 400 ? ' — showing the first 400' : '');
  }
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

  /* ---------- change plumbing --------------------------------------------

     WHY EDITING FROZE
     Every edit used to rebuild both docks and run a full pixel comparison
     against the master. Two separate ways to make the editor unusable:

       rebuilding the docks destroys and recreates every input in them, so
       the field being typed into is gone by the next keystroke and the
       caret goes with it — which is what "nothing is editable" actually was;

       the comparison renders the label again at 900 px and walks every
       pixel against a skip list, which is fine once and ruinous sixty times
       a second.

     So an edit now does the smallest thing that is true: apply, re-render the
     board, repaint the canvas. The panels are left alone unless the change
     altered their structure, the live readouts are patched in place, and the
     comparison runs on idle after the typing stops. */
  function edit(label, fn, opts) {
    opts = opts || {};
    /* A run of keystrokes is one undo step. The snapshot to keep is the one
       taken BEFORE the run started, so a continuing run pushes nothing —
       popping instead would throw away the only state worth going back to
       and leave the caller one character short of where they began. */
    /* A run of keystrokes is one undo step. The snapshot to keep is the one
       taken BEFORE the run started, so a continuing run pushes nothing —
       popping instead would throw away the only state worth going back to
       and leave the caller one character short of where they began.

       A run ends when the typing stops. Without that, coming back to the same
       field an hour later would still count as the same run, and one undo
       would erase both sessions. */
    const now = Date.now();
    const same = opts.coalesce && lastEdit === opts.coalesce && (now - lastEditAt) < COALESCE_MS;
    if (same) redoStack.length = 0;
    else commit(label);
    lastEdit = opts.coalesce || null;
    lastEditAt = now;
    fn(doc);
    doc.version++;
    doc.meta.updatedAt = new Date().toISOString();
    render();
    API.paint();
    saveLocal();
    if (opts.struct) { buildLeft(); buildRight(); }
    else syncReadouts();
    scheduleValidate();
  }

  /** A full rebuild. Only from things that change what the panels contain. */
  function refresh() {
    render(); API.paint(); buildLeft(); buildRight(); saveLocal();
    scheduleValidate();
  }

  function render() {
    board = HZR.render(doc).artboards[0];
    report = HZUV.run(board, 'proof');
    API.setScene({ artboards: [board], engine: '2.0.0-hz-master', docVersion: doc.version, hz: true });
    return board;
  }

  /* the small live numbers, patched where they stand so no input is touched */
  function syncReadouts() {
    const t = doc.trim, IN = 25.4;
    const set = (id, txt) => { const n = document.getElementById(id); if (n) n.textContent = txt; };
    set('hzSizeIn', (t.w / IN).toFixed(3) + ' × ' + (t.h / IN).toFixed(3));
    set('hzSizeMM', t.w.toFixed(2) + ' × ' + t.h.toFixed(2));
    set('hzPPI', board ? String(board.meta.masterPPI) : '—');
    const sh = HZ.sheet(doc);
    set('hzSheetIn', sh.wIn.toFixed(2) + '″ × ' + sh.hIn.toFixed(2) + '″');
    set('hzSheetN', String(sh.n));
    set('hzSheetPx', sh.px.w + ' × ' + sh.px.h);
    const e = HZ.elDef(sel), st = e && doc.el[sel];
    if (st) {
      set('hzOvX', (st.ov.dx).toFixed(2));
      set('hzOvY', (st.ov.dy).toFixed(2));
      set('hzOvS', (st.ov.sx).toFixed(3));
    }
  }

  /* validation is expensive and nobody needs it mid-keystroke */
  let valT = 0;
  function scheduleValidate() {
    clearTimeout(valT);
    valT = setTimeout(() => {
      if (!board) return;
      validation = HZR.validate(board);
      const n = document.getElementById('hzValNote');
      if (n) {
        n.className = 'note' + (validation.pass ? ' ok' : ' err');
        n.innerHTML = '<b>' + (validation.pass ? 'MATCHES APPROVED MASTER'
          : 'MASTER LABEL MODIFIED — REVERT REQUIRED') + '</b> ' + esc(validation.notes.join(' '));
      }
      const d = document.getElementById('hzValDE');
      if (d) { d.textContent = String(validation.dE); d.className = validation.dE > 1 ? 'bad' : ''; }
      const m = document.getElementById('hzValMoved');
      if (m) { m.textContent = String(validation.movedCount); m.className = validation.movedCount ? 'bad' : ''; }
    }, 420);
  }
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
        }), { struct: true })));
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

    /* ---- catalogue ---- */
    host.appendChild(P('Catalogue', HZ.SKUS.length, b => {
      const list = el('div', { class: 'list hzsku', id: 'hzSkuList' });
      const count = el('div', { class: 'hint', id: 'hzSkuCount' }, '');
      b.appendChild(field('Search', el('input', {
        class: 'inp', placeholder: 'BPC, retatrutide, 10MG…', value: skuQuery,
        oninput: ev => { skuQuery = ev.target.value; drawSkus(list, count); }
      })));
      b.appendChild(list);
      b.appendChild(count);
      drawSkus(list, count);
    }, 'hzcat', true));

    /* ---- lock ---- */
    host.appendChild(P('Master Layout Lock', null, b => {
      b.appendChild(seg([{ v: 'on', n: 'ON — composition locked' }, { v: 'off', n: 'OFF' }],
        doc.lock ? 'on' : 'off', v => edit('Layout lock', d => d.lock = (v === 'on'), { struct: true })));
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
      const IN = 25.4;
      /* Inches, because a vial label is specified and ordered in inches.
         Millimetres are still what the geometry is carried in — they are the
         unit every one of these numbers is measured against — so the
         conversion happens at the field and nowhere else. */
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Width (in)', num((t.w / IN).toFixed(3), 0.01,
          v => edit('Width', d => HZ.setWidth(d, v * IN)), 0.3, 16))),
        el('div', { style: 'flex:1' }, field('Height (in)', num((t.h / IN).toFixed(3), 0.005,
          v => edit('Height', d => HZ.setHeight(d, v * IN)), 0.15, 16)))));
      b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'in'), el('b', { id: 'hzSizeIn' }, (t.w / IN).toFixed(3) + ' × ' + (t.h / IN).toFixed(3)),
        el('span', {}, 'mm'), el('b', { id: 'hzSizeMM' }, t.w.toFixed(2) + ' × ' + t.h.toFixed(2))));
      b.appendChild(field('Standard vial wrap', sel1(
        [{ v: '', n: 'Custom' }].concat(HZ.WRAPS.map(w => ({
          v: String(w.w), n: w.name + '  ·  ' + w.w.toFixed(2) + '″ wrap' }))),
        (HZ.WRAPS.find(w => Math.abs(w.w * IN - t.w) < 0.4) || {}).w != null
          ? String((HZ.WRAPS.find(w => Math.abs(w.w * IN - t.w) < 0.4) || {}).w) : '',
        v => { if (v) edit('Vial wrap', d => HZ.setWidth(d, parseFloat(v) * IN)); }),
        'Circumference of the vial body plus a ⅛″ seam, in inches. Height follows the master’s own aspect.'));
      b.appendChild(el('div', { class: 'hint' },
        'Uniform, from the centre. The aspect is the master’s and cannot move, so every relationship inside the label is preserved exactly — the layout is never recalculated.'));
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Bleed (in)', num((doc.print.bleed / 25.4).toFixed(3), 0.005,
          v => edit('Bleed', d => d.print.bleed = v * 25.4), 0, 0.5))),
        el('div', { style: 'flex:1' }, field('Safe (in)', num((doc.print.safe / 25.4).toFixed(3), 0.005,
          v => edit('Safe', d => d.print.safe = v * 25.4), 0, 0.5)))));
      if (board) b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'artwork lands at'),
        el('b', { id: 'hzPPI', class: board.meta.masterPPI < 300 ? 'bad' : '' }, String(board.meta.masterPPI))));
    }, 'hztrim', true));

    /* ---- view ---- */
    host.appendChild(P('View', null, b => {
      b.appendChild(seg([{ v: 'edit', n: 'Editing' }, { v: 'prod', n: 'Production' }],
        doc.view.production ? 'prod' : 'edit',
        v => edit('View', d => d.view.production = (v === 'prod'), { struct: true })));
      b.appendChild(el('div', { class: 'hint' },
        'Production shows the final art alone — no guides, no boxes, no die line, nothing on top of the artwork.'));
    }, 'hzview', true));

    /* ---- UV print ---- */
    host.appendChild(P('UV print', null, b => {
      const u = doc.uv;
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Across', num(u.cols, 1,
          v => edit('Columns', d => d.uv.cols = Math.max(1, Math.round(v))), 1, 40))),
        el('div', { style: 'flex:1' }, field('Down', num(u.rows, 1,
          v => edit('Rows', d => d.uv.rows = Math.max(1, Math.round(v))), 1, 60)))));
      b.appendChild(el('div', { class: 'row' },
        el('div', { style: 'flex:1' }, field('Gutter (in)', num((u.gap / 25.4).toFixed(3), 0.005,
          v => edit('Gutter', d => d.uv.gap = v * 25.4), 0, 1))),
        el('div', { style: 'flex:1' }, field('Margin (in)', num((u.margin / 25.4).toFixed(3), 0.01,
          v => edit('Margin', d => d.uv.margin = v * 25.4), 0, 2)))));
      b.appendChild(field('Resolution', sel1(
        [600, 720, 1200, 1440].map(d2 => ({ v: String(d2), n: d2 + ' dpi' })),
        String(u.dpi), v => edit('DPI', d => d.uv.dpi = +v)),
        'UV flatbeds are commonly 720 or 1440 native. Matching the native grid keeps the RIP from resampling and softening the edges.'));
      b.appendChild(el('label', { class: 'hzchk' }, el('input', {
        type: 'checkbox', checked: u.marks ? 'checked' : null,
        onchange: ev => edit('Marks', d => d.uv.marks = ev.target.checked)
      }), ' Registration and cut marks'));
      b.appendChild(el('label', { class: 'hzchk' }, el('input', {
        type: 'checkbox', checked: u.white ? 'checked' : null,
        onchange: ev => edit('White plate', d => d.uv.white = ev.target.checked)
      }), ' Also write the white underbase plate'));

      const sh = HZ.sheet(doc);
      b.appendChild(el('div', { class: 'hzstat' },
        el('span', {}, 'sheet'), el('b', { id: 'hzSheetIn' }, sh.wIn.toFixed(2) + '″ × ' + sh.hIn.toFixed(2) + '″'),
        el('span', {}, 'labels'), el('b', { id: 'hzSheetN' }, String(sh.n)),
        el('span', {}, 'pixels'), el('b', { id: 'hzSheetPx' }, sh.px.w + ' × ' + sh.px.h)));
      const heavy = sh.px.w * sh.px.h > 120e6;
      if (heavy) b.appendChild(el('div', { class: 'note err' },
        el('b', {}, 'Too large.'), ' ' + (sh.px.w * sh.px.h / 1e6).toFixed(0) +
        ' megapixels at ' + u.dpi + ' dpi is past what a browser canvas can hold. Drop the dpi or the row count.'));
      b.appendChild(btn('Print UV sheet', () => save('uvsheet'), 'pri'));
      b.appendChild(btn('UV sheet as PDF (1:1)', () => save('uvpdf')));
      b.appendChild(el('div', { class: 'hint' },
        'One PNG at the stated dpi, at the exact physical size, ready to drop straight into the flatbed RIP. Nothing is scaled at print time, so nothing is resampled.'));
    }, 'hzuvprint', true));

    /* ---- validation ---- */
    host.appendChild(P('Master validation', null, b => {
      const v = validation;
      if (!v) { b.appendChild(el('div', { class: 'hint' }, 'Not yet run.')); }
      else if (!v.ready) { b.appendChild(el('div', { class: 'hint' }, v.notes[0])); }
      else {
        b.appendChild(el('div', { id: 'hzValNote', class: 'note' + (v.pass ? ' ok' : ' err') },
          el('b', {}, v.pass ? 'MATCHES APPROVED MASTER' : 'MASTER LABEL MODIFIED — REVERT REQUIRED'),
          ' ' + v.notes.join(' ')));
        b.appendChild(el('div', { class: 'hzstat' },
          el('span', {}, 'ΔE≈'), el('b', { id: 'hzValDE', class: v.dE > 1 ? 'bad' : '' }, String(v.dE)),
          el('span', {}, 'moved'), el('b', { id: 'hzValMoved', class: v.movedCount ? 'bad' : '' }, String(v.movedCount)),
          el('span', {}, 'patched'), el('b', {}, String(board ? board.meta.patches.length : 0))));
      }
      b.appendChild(btn('Compare against the master', () => { validation = HZR.validate(board); buildLeft(); }));
      b.appendChild(btn('Revert everything to the master', () => {
        edit('Revert to master', d => { const n = HZ.newDoc({ master: d.master, w: d.trim.w }); d.el = n.el; }, { struct: true });
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
            d => d.el[e.id].on = v, { struct: true }), 'Visible'),
          el('button', {
            class: 'hztog' + (st.locked ? ' lock' : ''), title: 'Lock',
            onclick: ev => { ev.stopPropagation(); edit('Lock ' + e.label, d => d.el[e.id].locked = !st.locked, { struct: true }); }
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
          toggle(st.on !== false, v => edit(L.name, d => d.layers[L.id].on = v, { struct: true }), 'Visible'),
          el('button', { class: 'hztog' + (st.exp !== false ? ' on' : ''), title: 'Include in export',
            onclick: () => edit('Export ' + L.name, d => d.layers[L.id].exp = st.exp === false, { struct: true }) }, '⤓')));
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
    const upd  = (label, fn) => edit(label, d => fn(d.el[e.id], d));
    const updS = (label, fn) => edit(label, d => fn(d.el[e.id], d), { struct: true });
    const m = HZ.master(doc.master);
    const box = HZ.boxOf(doc.master, e.id);

    if (st.locked) b.appendChild(el('div', { class: 'note' },
      el('b', {}, 'Locked.'), ' Unlock it in the layer list to edit.'));

    if (e.kind === 'text') {
      const cur = st.text != null ? st.text : (m.strings[e.id] || '');
      b.appendChild(field('Text', el('input', {
        class: 'inp', value: cur, disabled: st.locked ? 'disabled' : null,
        /* Live. The panels are not rebuilt on an edit any more, so this input
           survives its own keystrokes and the caret stays where it was. The
           coalesce key folds a run of typing into one undo step. */
        oninput: ev => { const v = ev.target.value;
          edit('Text ' + e.id, d => d.el[e.id].text = v, { coalesce: 'text:' + e.id }); }
      }), st.text == null
        ? 'Untouched — the master’s own artwork is showing. Type here and only this box is patched.'
        : 'Edited. This box is patched from the clean plate and re-set at the master’s cap height and baseline.'));
      if (st.text != null) b.appendChild(btn('Restore the master’s text',
        () => updS('Restore text', x => { x.text = null; x.tracking = null; x.weight = null; })));
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
        onchange: ev => updS('Colour', x => x.colour = ev.target.value) }),
      el('input', { class: 'inp mono', readonly: 'readonly',
        value: st.colour || (HZ.inkOf(doc.master, e.id) + '  (measured)') })),
      st.colour ? null : 'This is the ink measured out of the approved artwork.'));
    if (st.colour) b.appendChild(btn('Restore the measured ink', () => updS('Restore colour', x => x.colour = null)));

    b.appendChild(field('Print finish', sel1(HZ.FINISHES.map(f =>
      ({ v: f.id, n: f.name + (f.plate ? '  →  ' + f.plate : '') })),
      st.finish, v => updS('Finish', x => x.finish = v)),
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
        () => updS('Reset ' + e.label, x => x.ov = { dx: 0, dy: 0, sx: 1 })));
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
      if (kind === 'uvsheet') {
        const cv = HZX.uvSheet(board, doc.uv);
        return cv.toBlob(bl => { dl(bl, base() + '_UV_' + doc.uv.dpi + 'dpi.png', 'image/png');
          API.toast('UV sheet written', HZ.sheet(doc).n + ' labels · ' + cv.width + ' × ' + cv.height + ' px at ' + doc.uv.dpi + ' dpi', 'ok'); }, 'image/png');
      }
      if (kind === 'uvpdf') {
        return dl(HZX.uvPdf(board, doc.uv), base() + '_UV_sheet.pdf', 'application/pdf'), ok('UV sheet PDF, 1:1');
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
  /* =====================================================================
     STAGE — click to select, drag to move, wheel to scale

     Editing the label at will means editing it where it is, not only through
     number fields in a panel. With the layout unlocked an element is dragged
     on the artboard and the drag folds into one undo step; with it locked the
     pointer still selects, and says why it will not move.
     ===================================================================== */
  let drag = null;

  function stageXY(e) {
    const S = API.S, r = $('#stage').getBoundingClientRect();
    return {
      x: (e.clientX - r.left - S.panX) / S.zoom / HZR.K,
      y: (e.clientY - r.top - S.panY) / S.zoom / HZR.K
    };
  }

  function wireStage() {
    const stage = $('#stage');

    stage.addEventListener('pointerdown', e => {
      if (!active || !board) return;
      if (e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const q = stageXY(e);
      if (q.x < -8 || q.y < -8 || q.x > board.wMM + 8 || q.y > board.hMM + 8) return;
      const id = HZR.hitTest(board, q.x, q.y);
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      if (id !== sel) { sel = id; buildRight(); API.paint(); }

      const st = doc.el[id];
      if (doc.lock || !st || st.locked) {
        if (doc.lock) API.toast('Layout locked',
          'Master Layout Lock is on, so the composition cannot move. Turn it off in the left dock to drag this.', 'warn');
        return;
      }
      drag = { id, q, dx: st.ov.dx, dy: st.ov.dy, moved: false };
      stage.setPointerCapture(e.pointerId);
      stage.style.cursor = 'grabbing';
    }, true);

    stage.addEventListener('pointermove', e => {
      if (!drag) return;
      const q = stageXY(e);
      const nx = drag.dx + (q.x - drag.q.x), ny = drag.dy + (q.y - drag.q.y);
      if (!drag.moved && Math.abs(nx - drag.dx) < .05 && Math.abs(ny - drag.dy) < .05) return;
      drag.moved = true;
      edit('Move ' + HZ.elDef(drag.id).label,
        d => { d.el[drag.id].ov.dx = nx; d.el[drag.id].ov.dy = ny; },
        { coalesce: 'move:' + drag.id });
    }, true);

    const end = e => {
      if (!drag) return;
      try { $('#stage').releasePointerCapture(e.pointerId); } catch (_) {}
      $('#stage').style.cursor = '';
      if (drag.moved) buildRight();
      drag = null;
    };
    stage.addEventListener('pointerup', end, true);
    stage.addEventListener('pointercancel', end, true);

    /* alt-wheel scales the selected element, which is the one gesture a
       number field is genuinely worse at */
    stage.addEventListener('wheel', e => {
      if (!active || !doc || doc.lock || !e.altKey) return;
      const st = doc.el[sel];
      if (!st || st.locked) return;
      e.preventDefault(); e.stopPropagation();
      const k = e.deltaY < 0 ? 1.04 : 1 / 1.04;
      edit('Scale ' + HZ.elDef(sel).label,
        d => { d.el[sel].ov.sx = Math.max(.15, Math.min(6, d.el[sel].ov.sx * k)); },
        { coalesce: 'scale:' + sel });
    }, { capture: true, passive: false });

    addEventListener('keydown', e => {
      if (!active) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); return e.shiftKey ? redo() : undo();
      }
      if (e.key === 'Tab') {
        const list = HZ.present(doc.master);
        const i2 = list.findIndex(x => x.id === sel);
        e.preventDefault();
        sel = list[(i2 + (e.shiftKey ? -1 : 1) + list.length) % list.length].id;
        buildRight(); API.paint();
        return;
      }
      if (doc.lock) return;
      const def = HZ.elDef(sel), st = doc.el[sel];
      if (!def || !st || st.locked) return;
      const step = e.shiftKey ? 1 : 0.1;
      const mv = (dx, dy) => {
        e.preventDefault();
        edit('Nudge ' + def.label,
          d => { d.el[sel].ov.dx += dx; d.el[sel].ov.dy += dy; },
          { coalesce: 'move:' + sel });
      };
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

    /* INSIDE the dock's scroller, not beside it.
       .dock is overflow:hidden and .dockscroll is the only thing in it that
       scrolls — mounting these as siblings put every new panel in a box that
       could never scroll, so anything past the fold was unreachable. They go
       in as the scroller's first children instead: the existing panels keep
       their order underneath, and the whole column scrolls as one. */
    const L = document.createElement('div'); L.id = 'hzLeft';
    const R = document.createElement('div'); R.id = 'hzRight';
    const ls = $('#leftScroll'), rs = $('#rightScroll');
    ls.insertBefore(L, ls.firstChild);
    rs.insertBefore(R, rs.firstChild);

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
    selectedId: () => sel,
    /* test seam: the same path the text field takes */
    editText: (id, v) => edit('Text ' + id, d => d.el[id].text = v, { coalesce: 'text:' + id })
  };
})();

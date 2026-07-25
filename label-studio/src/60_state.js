/* ============================================================================
   package: @px/state
   Command pattern. Every document mutation is a Command with an exact
   inverse — so undo is semantic, the history IS the audit log, and crash
   recovery is a replay. Session state (zoom, selection) is NOT undoable.
   depends on: core-model, brand
   ============================================================================ */
const STATE = (() => {
  'use strict';

  const bus = (() => {
    const m = new Map();
    return {
      on(k, f) { (m.get(k) || m.set(k, []).get(k)).push(f); return () => this.off(k, f); },
      off(k, f) { const a = m.get(k); if (a) a.splice(a.indexOf(f), 1); },
      emit(k, p) { (m.get(k) || []).forEach(f => { try { f(p); } catch (e) { console.error(e); } }); }
    };
  })();

  /* ---- session (not undoable) ---------------------------------------- */
  const session = {
    mode: CORE.MODE.PRODUCTION,
    theme: 'dark',
    zoom: 1, panX: 0, panY: 0,
    artboard: 'front',
    selected: 'compound',
    guides: true, slotBoxes: true, grid: false, finish: true, proof: false,
    bleed: true, stats: false,
    leftOpen: true, rightOpen: true, bottomOpen: false, bottomTab: 'versions',
    dirty: false
  };

  /* ---- document ------------------------------------------------------- */
  let doc = null;
  let master = null;
  const history = [];     // CommandRecord[]  (append-only; undone flagged)
  let cursor = -1;        // index of last applied record
  const MAX_HISTORY = 5000;

  const getDoc = () => doc;
  const getMaster = () => master;

  function setDocument(d, m, opts) {
    doc = d; master = m;
    if (!opts || !opts.keepHistory) { history.length = 0; cursor = -1; }
    session.dirty = false;
    bus.emit('doc:load', doc);
    bus.emit('doc:change', doc);
  }

  /* ---- command registry ----------------------------------------------- */
  const COMMANDS = {
    'slot.setValue': {
      scope: 'binding',
      label: p => `Set ${p.key} → “${p.value}”`,
      apply(d, p) { d.bindings[p.key] = p.value; },
      invert(d, p) { return { type: 'slot.setValue', payload: { key: p.key, value: d.bindings[p.key] } }; },
      coalesce(a, b) { return a.payload.key === b.payload.key ? b : null; }
    },
    'slot.toggle': {
      scope: 'binding',
      label: p => `${p.on ? 'Enable' : 'Disable'} ${p.key}`,
      apply(d, p) { d.enabled[p.key] = p.on; },
      invert(d, p) { return { type: 'slot.toggle', payload: { key: p.key, on: d.enabled[p.key] !== false } }; }
    },
    'artboard.toggle': {
      scope: 'binding',
      label: p => `${p.on ? 'Show' : 'Hide'} ${p.id} artboard`,
      apply(d, p) { d.artboards[p.id] = p.on; },
      invert(d, p) { return { type: 'artboard.toggle', payload: { id: p.id, on: !!d.artboards[p.id] } }; }
    },
    'finish.set': {
      scope: 'finish',
      label: p => `Finish ${p.key} → ${p.value}`,
      apply(d, p) { d.finishes[p.key] = p.value; },
      invert(d, p) { return { type: 'finish.set', payload: { key: p.key, value: d.finishes[p.key] } }; }
    },
    'doc.meta': {
      scope: 'binding',
      label: p => `Set ${p.key}`,
      apply(d, p) { d[p.key] = p.value; },
      invert(d, p) { return { type: 'doc.meta', payload: { key: p.key, value: d[p.key] } }; }
    },
    'doc.applySku': {
      scope: 'binding',
      label: p => `Apply SKU ${p.sku}`,
      apply(d, p) {
        d.sku = p.sku; d.bindings.compound = p.compound; d.bindings.dosage = p.dosage;
        if (p.name) d.name = p.name;
      },
      invert(d, p) {
        return { type: 'doc.applySku', payload: { sku: d.sku, compound: d.bindings.compound, dosage: d.bindings.dosage, name: d.name } };
      }
    },
    'doc.setMaster': {
      scope: 'master',
      label: p => `Switch master → ${p.key}`,
      apply(d, p) { d.masterRef = p.id; },
      invert(d, p) { return { type: 'doc.setMaster', payload: { id: d.masterRef, key: p.prevKey } }; }
    },
    'doc.bulk': {
      scope: 'binding',
      label: p => p.label || 'Bulk change',
      apply(d, p) { Object.keys(p.bindings || {}).forEach(k => d.bindings[k] = p.bindings[k]); },
      invert(d, p) {
        const b = {}; Object.keys(p.bindings || {}).forEach(k => b[k] = d.bindings[k]);
        return { type: 'doc.bulk', payload: { bindings: b, label: 'Undo ' + (p.label || 'bulk change') } };
      }
    }
  };

  /* ---- invoker -------------------------------------------------------- */
  let lastAt = 0;
  const COALESCE_MS = 700;

  /**
   * @returns {{ok:boolean, violations?:Array}}
   */
  function invoke(type, payload, opts) {
    opts = opts || {};
    const def = COMMANDS[type];
    if (!def) throw new Error('unknown command: ' + type);
    if (!doc) return { ok: false, violations: [{ msg: 'No document open.' }] };

    /* --- policy gate: runs BEFORE apply --- */
    if (!BRAND.Policy.canMutate(def.scope, session.mode))
      return { ok: false, violations: [{ rule: 'policy.mode', msg: `${CORE.MODE_META[session.mode].label} Mode cannot change ${def.scope}.` }] };
    if (type === 'slot.setValue' && !BRAND.Policy.canEdit(payload.key, session.mode))
      return { ok: false, violations: [{ rule: 'policy.slot', msg: `Slot “${payload.key}” is locked in this mode.` }] };

    const inverse = def.invert(doc, payload);
    if (CORE.deepEqual(inverse.payload, payload) && type === 'slot.setValue') return { ok: true, noop: true };

    def.apply(doc, payload);

    const brandV = BRAND.Policy.validate(doc, master);
    if (brandV.length && session.mode === CORE.MODE.PRODUCTION) {
      COMMANDS[inverse.type].apply(doc, inverse.payload);   // rollback
      return { ok: false, violations: brandV };
    }

    doc.version++; doc.meta.updatedAt = new Date().toISOString();

    /* --- history --- */
    if (cursor < history.length - 1) history.splice(cursor + 1);   // drop redo tail
    const now = Date.now();
    const prev = history[cursor];
    const rec = { type, payload: CORE.clone(payload), inverse, at: now, by: session.mode, label: def.label(payload) };
    if (!opts.noCoalesce && def.coalesce && prev && prev.type === type && now - lastAt < COALESCE_MS && def.coalesce(prev, rec)) {
      prev.payload = rec.payload; prev.at = now; prev.label = rec.label;   // keep the ORIGINAL inverse
    } else {
      history.push(rec); cursor = history.length - 1;
      if (history.length > MAX_HISTORY) { history.splice(0, 200); cursor -= 200; }
    }
    lastAt = now;
    session.dirty = true;
    bus.emit('doc:change', doc);
    bus.emit('history:change');
    return { ok: true };
  }

  function undo() {
    if (cursor < 0) return false;
    const rec = history[cursor];
    COMMANDS[rec.inverse.type].apply(doc, rec.inverse.payload);
    rec.undone = true; cursor--;
    doc.version++; session.dirty = true;
    bus.emit('doc:change', doc); bus.emit('history:change');
    return true;
  }

  function redo() {
    if (cursor >= history.length - 1) return false;
    cursor++;
    const rec = history[cursor];
    COMMANDS[rec.type].apply(doc, rec.payload);
    rec.undone = false;
    doc.version++; session.dirty = true;
    bus.emit('doc:change', doc); bus.emit('history:change');
    return true;
  }

  const canUndo = () => cursor >= 0;
  const canRedo = () => cursor < history.length - 1;
  const getHistory = () => history.map((r, i) => ({ ...r, undone: i > cursor }));

  /** The audit trail, in the shape a regulator expects. */
  function auditLog() {
    return history.slice(0, cursor + 1).map(r => ({
      at: new Date(r.at).toISOString(), actor: r.by, action: r.type, detail: r.label
    }));
  }

  return { bus, session, getDoc, getMaster, setDocument, invoke, undo, redo, canUndo, canRedo, getHistory, auditLog, COMMANDS };
})();

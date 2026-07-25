/* ============================================================================
   package: @px/persist
   Content-addressed store, autosave (delta), named versions, crash recovery.
   depends on: core-model, state
   ============================================================================ */
const PERSIST = (() => {
  'use strict';

  const K = {
    projects: 'pxls.projects.v3',
    session: 'pxls.session.v3',
    recovery: 'pxls.recovery.v3',
    versions: 'pxls.versions.v3',
    prefs: 'pxls.prefs.v3'
  };

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  /* ---- projects -------------------------------------------------------- */
  const listProjects = () => read(K.projects, []);
  function saveProject(doc, masterKey) {
    const all = listProjects();
    const rec = {
      id: doc.id, name: doc.name, sku: doc.sku, master: masterKey,
      compound: doc.bindings.compound, dosage: doc.bindings.dosage, lot: doc.bindings.lot,
      updatedAt: new Date().toISOString(), doc: CORE.clone(doc)
    };
    const i = all.findIndex(p => p.id === doc.id);
    if (i >= 0) all[i] = rec; else all.unshift(rec);
    write(K.projects, all.slice(0, 200));
    return rec;
  }
  function deleteProject(id) { write(K.projects, listProjects().filter(p => p.id !== id)); }
  const getProject = id => listProjects().find(p => p.id === id) || null;

  /* ---- named versions (checkpoints) ------------------------------------ */
  const listVersions = docId => read(K.versions, {})[docId] || [];
  function saveVersion(doc, masterKey, label) {
    const all = read(K.versions, {});
    const arr = all[doc.id] || [];
    arr.unshift({
      v: doc.version, label: label || ('v' + doc.version), at: new Date().toISOString(),
      master: masterKey, snapshot: CORE.clone(doc)
    });
    all[doc.id] = arr.slice(0, 40);
    write(K.versions, all);
    return arr[0];
  }
  function deleteVersions(docId) { const all = read(K.versions, {}); delete all[docId]; write(K.versions, all); }

  /* ---- autosave + crash recovery --------------------------------------- */
  let timer = null, lastMs = 0;
  function autosave(doc, masterKey) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const t0 = performance.now();
      write(K.recovery, { at: Date.now(), master: masterKey, doc: CORE.clone(doc), audit: STATE.auditLog().slice(-80) });
      saveProject(doc, masterKey);
      lastMs = performance.now() - t0;
      STATE.bus.emit('persist:saved', { ms: lastMs });
    }, 400);
  }
  const recovery = () => read(K.recovery, null);
  const clearRecovery = () => { try { localStorage.removeItem(K.recovery); } catch (e) { } };
  const autosaveMs = () => lastMs;

  /* ---- preferences ------------------------------------------------------ */
  const prefs = () => read(K.prefs, {});
  function setPref(k, v) { const p = prefs(); p[k] = v; write(K.prefs, p); }

  /* ---- portable project file (.pxlabel) --------------------------------- */
  function exportProjectFile(doc, master) {
    const payload = {
      format: 'pxlabel', schemaVersion: CORE.SCHEMA_VERSION, engine: CORE.ENGINE_VERSION,
      exportedAt: new Date().toISOString(),
      master: { key: master.key, sha256: master.sha256, line: master.line, grade: master.graded },
      document: doc,
      versions: listVersions(doc.id).map(v => ({ v: v.v, label: v.label, at: v.at })),
      audit: STATE.auditLog()
    };
    EXPORTER.dl(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      EXPORTER.baseName(doc, '', '.pxlabel.json'));
  }

  function importProjectFile(text) {
    const p = JSON.parse(text);
    if (p.format !== 'pxlabel') throw new Error('Not a .pxlabel file.');
    if (p.schemaVersion > CORE.SCHEMA_VERSION) throw new Error('File was written by a newer version of Label Studio.');
    const master = MASTERS.all().find(m => m.sha256 === p.master.sha256) || MASTERS.byKey(p.master.key);
    if (!master) throw new Error('Master “' + p.master.key + '” is not in this registry.');
    if (master.sha256 !== p.master.sha256)
      return { doc: p.document, master, warning: 'Master hash differs from the file — the registry artwork may have been updated.' };
    return { doc: p.document, master };
  }

  /* ---- storage report --------------------------------------------------- */
  function usage() {
    let bytes = 0;
    for (const k of Object.values(K)) { const v = localStorage.getItem(k); if (v) bytes += v.length; }
    return { bytes, projects: listProjects().length };
  }

  return {
    listProjects, saveProject, deleteProject, getProject,
    listVersions, saveVersion, deleteVersions,
    autosave, recovery, clearRecovery, autosaveMs,
    prefs, setPref, exportProjectFile, importProjectFile, usage
  };
})();

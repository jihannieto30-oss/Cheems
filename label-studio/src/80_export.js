/* ============================================================================
   package: @px/export
   Document ─▶ Preflight ─▶ [gate] ─▶ Scene ─▶ Renderer ─▶ Encoder ─▶ Package
   A blocking violation aborts BEFORE any bytes are produced.
   depends on: core-model, engine-render, preflight
   ============================================================================ */
const EXPORTER = (() => {
  'use strict';

  const dl = (blob, name) => {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };
  const slug = s => String(s || 'label').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'label';

  function baseName(doc, board, suffix) {
    const p = ['PEPTIDEX', slug(doc.sku || doc.bindings.compound || 'label'), board ? board.toUpperCase() : '', slug(doc.bindings.lot)];
    return p.filter(Boolean).join('_') + (suffix || '');
  }

  /* ---------- raster ---------------------------------------------------- */
  /** @param dpi 300 | 600 | 1200  @param bleed include 3 mm bleed */
  async function raster(master, doc, boardId, dpi, opts) {
    opts = opts || {};
    const scene = ENGINE.render(master, doc, { artboards: [boardId] });
    const board = scene.artboards[0];
    if (!board) throw new Error('artboard not enabled: ' + boardId);
    const bleedMM = opts.bleed ? CORE.BLEED_MM : 0;
    const wMM = CORE.TRIM_MM.w + bleedMM * 2, hMM = CORE.TRIM_MM.h + bleedMM * 2;
    const W = Math.round(wMM / 25.4 * dpi), H = Math.round(hMM / 25.4 * dpi);
    const scale = W / (board.w + CORE.mm2px(bleedMM) * 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = opts.transparent ? 'rgba(0,0,0,0)' : board.bg;
    if (!opts.transparent) ctx.fillRect(0, 0, W, H);
    ENGINE.CanvasRenderer.draw(ctx, board, {
      scale, ox: CORE.mm2px(bleedMM) * scale, oy: CORE.mm2px(bleedMM) * scale,
      guides: false, finish: opts.finish !== false, laminate: doc.finishes.laminate,
      bleedPx: CORE.mm2px(bleedMM), proof: false
    });
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return { blob, W, H, dpi, board: boardId, bleedMM };
  }

  /* ---------- vector ---------------------------------------------------- */
  function svg(master, doc, boardId) {
    const scene = ENGINE.render(master, doc, { artboards: [boardId] });
    const board = scene.artboards[0];
    if (!board) throw new Error('artboard not enabled: ' + boardId);
    return ENGINE.SvgRenderer.toSVG(board, { title: doc.name + ' · ' + boardId });
  }

  /* ---------- reports ---------------------------------------------------- */
  function validationReport(master, doc, report) {
    return {
      generator: 'PEPTIDEX Label Studio Pro ' + CORE.ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      intent: report.intent,
      result: report.pass ? 'PASS' : 'FAIL',
      document: { id: doc.id, name: doc.name, sku: doc.sku, version: doc.version, bindings: doc.bindings },
      master: {
        id: master.id, key: master.key, sha256: master.sha256, grade: master.graded,
        analysis: master.analysis, trim: master.trim
      },
      geometry: {
        trimMM: CORE.TRIM_MM, bleedMM: CORE.BLEED_MM, safeMM: CORE.SAFE_MM,
        nativePPI: CORE.round(CORE.NATIVE_PPI, 1)
      },
      counts: { blocking: report.blocking.length, warning: report.warnings.length, info: report.infos.length },
      violations: report.violations.map(v => ({ rule: v.rule, severity: v.severity, board: v.board, slot: v.slot || null, title: v.title, message: v.msg, detail: v.detail || null })),
      audit: STATE.auditLog()
    };
  }

  function manufacturingSpec(master, doc, report) {
    const p = BRAND.PALETTE[master.line];
    return `# PEPTIDEX — Manufacturing specification

Document      : ${doc.name}
SKU           : ${doc.sku || '—'}
Compound      : ${doc.bindings.compound || '—'}   Dosage: ${doc.bindings.dosage || '—'}
Lot           : ${doc.bindings.lot || '—'}        Exp: ${doc.bindings.expiry || '—'}
Line          : ${p.name}
Generated     : ${new Date().toISOString()}
Engine        : PEPTIDEX Label Studio Pro ${CORE.ENGINE_VERSION}
Master SHA-256: ${master.sha256}
Master grade  : ${master.graded}

## Geometry
Trim          : ${CORE.TRIM_MM.w} × ${CORE.TRIM_MM.h} mm (portrait)
Bleed         : ${CORE.BLEED_MM} mm all sides
Safe area     : ${CORE.SAFE_MM} mm inside trim
Die           : rounded rectangle, corner radius 2 mm, cut 0.5 mm inside the printed bleed
Artboards     : ${[doc.artboards.front && 'FRONT (master)', doc.artboards.back && 'BACK (data panel)'].filter(Boolean).join(' + ')}

## Substrate & press
Substrate     : ${doc.finishes.substrate}
Process       : UV inkjet on self-adhesive vinyl
Laminate      : ${doc.finishes.laminate}
Adhesive      : permanent acrylic, solvent & alcohol resistant (vials are wiped with IPA)
Resolution    : ${CORE.round(CORE.NATIVE_PPI, 0)} PPI supplied · 300 PPI minimum · 600 PPI for foil plates

## Finishes declared by the design
Accent band   : ${p.name === 'BEAUTY' ? 'rose-gold / copper foil' : p.name === 'FITNESS' ? 'silver foil' : 'silver foil'}
Compound text : ${doc.finishes.compound === 'auto' ? p.bandFinish : doc.finishes.compound}
Required spot plates (NOT PRESENT in the supplied master):
  PX_FOIL_${p.finish === 'foil-copper' ? 'ROSEGOLD' : 'SILVER'}   100 % of a named spot, overprint on
  PX_EMBOSS                    100 % of a named spot
  PX_DIE_CUT                   stroked path on its own layer, 0 % fill

## Preflight
Intent        : ${report.intent}
Result        : ${report.pass ? 'PASS' : 'FAIL — ' + report.blocking.length + ' blocking violation(s)'}
${report.violations.map(v => `  [${v.severity.toUpperCase().padEnd(8)}] ${v.rule.padEnd(26)} ${v.title}`).join('\n')}

## Notes to the printer
- The compound name and dosage are variable data. Every lot is a distinct file; do not reuse plates across SKUs.
- Do not re-scale, re-crop or re-colour the artwork. The trim size is fixed.
- Colour targets: band ${p.bandL} → ${p.bandR}; band ink ${p.bandInk}. Match to a supplied press proof, not to screen.
`;
  }

  /* ---------- ZIP (store, no compression — deterministic) ---------------- */
  function zip(files) {
    const enc = new TextEncoder();
    const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const parts = [], central = []; let off = 0;
    const now = new Date();
    const dosT = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    const dosD = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cSize = central.reduce((a, b) => a + b.length, 0);
    const eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
    eo.setUint32(12, cSize, true); eo.setUint32(16, off, true); eo.setUint16(20, 0, true);
    return new Blob([...parts, ...central, new Uint8Array(eo.buffer)], { type: 'application/zip' });
  }

  /* ---------- public API ------------------------------------------------- */
  /** Every export path goes through this gate. There is no bypass. */
  function gate(master, doc, intent, opts) {
    const scene = ENGINE.render(master, doc, {});
    const report = PREFLIGHT.run(master, doc, scene, intent, opts || { syntheticBleed: true });
    return { scene, report };
  }

  async function exportPNG(master, doc, boardId, dpi, opts) {
    const { report } = gate(master, doc, 'proof');
    if (!report.pass) return { ok: false, report };
    const r = await raster(master, doc, boardId, dpi, opts);
    dl(r.blob, baseName(doc, boardId, `_${dpi}dpi${opts && opts.bleed ? '_bleed' : ''}.png`));
    return { ok: true, report, info: r };
  }

  function exportSVG(master, doc, boardId) {
    const { report } = gate(master, doc, 'proof');
    if (!report.pass) return { ok: false, report };
    const s = svg(master, doc, boardId);
    dl(new Blob([s], { type: 'image/svg+xml' }), baseName(doc, boardId, '.svg'));
    return { ok: true, report };
  }

  /** Full print package. Refuses on any blocking production violation. */
  async function exportPackage(master, doc, opts) {
    opts = Object.assign({ intent: 'production', dpi: 600, force: false }, opts || {});
    const { report } = gate(master, doc, opts.intent, { syntheticBleed: true });
    if (!report.pass && !opts.force) return { ok: false, report };

    const files = [];
    const boards = [];
    if (doc.artboards.front) boards.push('front');
    if (doc.artboards.back) boards.push('back');

    for (const b of boards) {
      const r = await raster(master, doc, b, opts.dpi, { bleed: true, finish: false });
      files.push({ name: `artwork/${baseName(doc, b, `_${opts.dpi}dpi_bleed.png`)}`, data: new Uint8Array(await r.blob.arrayBuffer()) });
      files.push({ name: `artwork/${baseName(doc, b, '.svg')}`, data: svg(master, doc, b) });
    }
    files.push({ name: 'master/README.txt', data:
      `The master artwork is referenced by content hash and is NEVER modified.\n` +
      `sha256 : ${master.sha256}\nkey    : ${master.key}\ngrade  : ${master.graded}\n` +
      `bytes  : ${master.bytes}\n\nIf this hash does not match the file your studio holds, the artwork has been altered.\n` });
    files.push({ name: 'validation-report.json', data: JSON.stringify(validationReport(master, doc, report), null, 2) });
    files.push({ name: 'manufacturing-spec.md', data: manufacturingSpec(master, doc, report) });
    files.push({ name: 'document.pxlabel.json', data: JSON.stringify({ schemaVersion: CORE.SCHEMA_VERSION, doc, masterSha: master.sha256 }, null, 2) });
    if (!report.pass) files.push({ name: 'DO-NOT-PRINT.txt', data:
      `This package was force-exported with ${report.blocking.length} blocking violation(s).\n` +
      `It is a PROOF. It is not approved for production.\n\n` +
      report.blocking.map(v => `- [${v.rule}] ${v.title}: ${v.msg}`).join('\n') + '\n' });

    dl(zip(files), baseName(doc, '', report.pass ? '_PRINT-PACKAGE.zip' : '_PROOF-PACKAGE.zip'));
    return { ok: true, report, forced: !report.pass };
  }

  async function exportBatch(master, docs, dpi, boardId) {
    const files = []; const results = [];
    for (const d of docs) {
      const { report } = gate(master, d, 'proof');
      results.push({ doc: d, report });
      if (!report.pass) continue;
      const r = await raster(master, d, boardId, dpi, { bleed: true });
      files.push({ name: baseName(d, boardId, `_${dpi}dpi.png`), data: new Uint8Array(await r.blob.arrayBuffer()) });
    }
    files.push({ name: '_batch-report.json', data: JSON.stringify(results.map(r => ({
      sku: r.doc.sku, name: r.doc.name, pass: r.report.pass,
      blocking: r.report.blocking.map(v => v.rule)
    })), null, 2) });
    dl(zip(files), `PEPTIDEX_BATCH_${docs.length}_${dpi}dpi.zip`);
    return results;
  }

  return { raster, svg, exportPNG, exportSVG, exportPackage, exportBatch, gate, zip, dl, validationReport, manufacturingSpec, baseName };
})();

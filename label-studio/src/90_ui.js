/* ============================================================================
   package: @px/ui
   Workspace shell. The only module allowed to touch the DOM.
   depends on: everything above (never the reverse)
   ============================================================================ */
(() => {
  'use strict';
  const S = STATE.session;
  const $ = s => document.querySelector(s);
  const el = (t, a, ...k) => {
    const n = document.createElement(t);
    if (a) for (const p in a) {
      if (p === 'class') n.className = a[p];
      else if (p === 'html') n.innerHTML = a[p];
      else if (p.startsWith('on')) n.addEventListener(p.slice(2), a[p]);
      else if (a[p] != null && a[p] !== false) n.setAttribute(p, a[p]);
    }
    for (const c of k.flat()) if (c != null && c !== false) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ICO = {
    lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
    open: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 017.5-2"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17H2.5z"/><path d="M12 9v5M12 17h.01"/></svg>',
    err: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h9a7 7 0 010 14h-3"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9h-9a7 7 0 000 14h3"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 12l5 5 5-5M4 20h16"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-6h8v6"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>'
  };

  /* ---------- toasts ---------------------------------------------------- */
  function toast(title, msg, kind) {
    const t = el('div', { class: 'toast ' + (kind || '') }, el('b', {}, title), el('span', { html: esc(msg || '') }));
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s,transform .3s'; t.style.opacity = 0; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 320); }, kind === 'err' ? 6500 : 3400);
  }

  /* ---------- modal ------------------------------------------------------ */
  let modalStack = [];
  function modal(o) {
    const scrim = el('div', { class: 'scrim', onclick: e => { if (e.target === scrim) close(); } });
    const body = el('div', { class: 'mbody' });
    if (typeof o.body === 'string') body.innerHTML = o.body; else body.appendChild(o.body);
    const foot = el('div', { class: 'mfoot' });
    (o.buttons || [{ label: 'Close' }]).forEach(b => foot.appendChild(el('button', {
      class: 'btn ' + (b.kind || ''), onclick: () => { if (!b.action || b.action() !== false) close(); }
    }, b.label)));
    const m = el('div', { class: 'modal ' + (o.wide ? 'wide' : '') },
      el('div', { class: 'mhead' }, el('div', {}, el('h3', {}, o.title), o.sub ? el('p', { html: esc(o.sub) }) : null),
        el('button', { class: 'iconbtn x', onclick: () => close(), title: 'Close', html: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' })),
      body, foot);
    scrim.appendChild(m); $('#modals').appendChild(scrim);
    modalStack.push(scrim);
    function close() { scrim.remove(); modalStack = modalStack.filter(x => x !== scrim); }
    return { close, body };
  }

  /* ======================================================================
     CANVAS
     ====================================================================== */
  const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
  let scene = null, report = null, viewW = 0, viewH = 0, dpr = 1;

  function currentBoard() {
    if (!scene) return null;
    return scene.artboards.find(a => a.id === S.artboard) || scene.artboards[0] || null;
  }

  function fit() {
    const b = currentBoard(); if (!b) return;
    const pad = 56;
    const s = Math.min((viewW - pad) / b.w, (viewH - pad) / b.h);
    S.zoom = Math.max(0.02, Math.min(64, s));
    S.panX = (viewW - b.w * S.zoom) / 2;
    S.panY = (viewH - b.h * S.zoom) / 2;
    paint();
  }

  function zoomAt(factor, cx, cy) {
    const b = currentBoard(); if (!b) return;
    const z0 = S.zoom, z1 = Math.max(0.02, Math.min(64, z0 * factor));
    if (z1 === z0) return;
    S.panX = cx - (cx - S.panX) * (z1 / z0);
    S.panY = cy - (cy - S.panY) * (z1 / z0);
    S.zoom = z1; paint();
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    viewW = r.width; viewH = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(viewW * dpr)); cv.height = Math.max(1, Math.round(viewH * dpr));
    const rh = $('#rhc'), rv = $('#rvc');
    rh.width = Math.round(viewW * dpr); rh.height = Math.round(22 * dpr);
    rv.width = Math.round(22 * dpr); rv.height = Math.round(viewH * dpr);
    paint();
  }

  let lastFrameMs = 0;
  function paint() {
    const t0 = performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    const b = currentBoard();
    if (!b) { lastFrameMs = performance.now() - t0; return; }

    /* checkerboard-free workspace ground + artboard shadow */
    const z = S.zoom, ox = S.panX, oy = S.panY;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 26 * Math.min(z, 2); ctx.shadowOffsetY = 8;
    ctx.fillStyle = b.bg; ctx.fillRect(ox, oy, b.w * z, b.h * z);
    ctx.restore();

    /* the Premium Horizontal family draws itself — same stage, same zoom,
       its own vector renderer. Everything below is untouched. */
    if (b.source === 'hz') {
      HZR.Canvas.draw(ctx, b, {
        scale: z, ox, oy, guides: S.guides, finish: S.finish,
        bleedPx: S.bleed ? b.bleedMM : 0,
        selected: (typeof HZUI !== 'undefined' && HZUI.isActive()) ? HZUI.selectedId() : null
      });
    } else {
    const bleedPx = (S.bleed && b.source === 'master') ? CORE.mm2px(CORE.BLEED_MM) : (S.bleed ? CORE.mm2px(CORE.BLEED_MM) : 0);
    ENGINE.CanvasRenderer.draw(ctx, b, {
      scale: z, ox, oy, guides: S.guides, slotBoxes: S.slotBoxes, selected: S.selected,
      finish: S.finish, laminate: STATE.getDoc().finishes.laminate, bleedPx, proof: S.proof
    });
    }
    if (S.grid) drawGrid(b, z, ox, oy);
    drawRulers(b, z, ox, oy);
    lastFrameMs = performance.now() - t0;
    const zt = (z * 100 < 10 ? (z * 100).toFixed(1) : Math.round(z * 100)) + '%';
    $('#zVal').textContent = zt;
    const zfield = document.querySelector('.zoomfield');
    if (zfield && document.activeElement !== zfield) zfield.value = zt;
    if (S.stats) updStats(b);
  }

  function drawGrid(b, z, ox, oy) {
    const step = CORE.mm2px(5) * z;
    if (step < 6) return;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, b.w * z, b.h * z); ctx.clip();
    ctx.strokeStyle = 'rgba(143,155,176,.22)'; ctx.lineWidth = 1;
    for (let x = ox; x <= ox + b.w * z; x += step) { ctx.moveTo(x + .5, oy); ctx.lineTo(x + .5, oy + b.h * z); }
    for (let y = oy; y <= oy + b.h * z; y += step) { ctx.moveTo(ox, y + .5); ctx.lineTo(ox + b.w * z, y + .5); }
    ctx.stroke(); ctx.restore();
  }

  function drawRulers(b, z, ox, oy) {
    const cs = getComputedStyle(document.documentElement);
    const ink3 = cs.getPropertyValue('--ink3').trim() || '#5f6879';
    const acc = cs.getPropertyValue('--accent').trim() || '#5b8cff';
    const pxPerMM = (b && b.source === 'hz' ? HZR.K : CORE.PPM) * z;
    let stepMM = 1;
    for (const s of [1, 2, 5, 10, 20, 50, 100]) { if (s * pxPerMM >= 42) { stepMM = s; break; } stepMM = s; }
    const draw = (c, horiz, len) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, horiz ? viewW : 22, horiz ? 22 : viewH);
      c.fillStyle = ink3; c.strokeStyle = ink3; c.lineWidth = 1;
      c.font = '9px ' + BRAND.STACK.mono;
      const origin = horiz ? ox : oy;
      const mm0 = Math.floor(-origin / pxPerMM / stepMM) * stepMM;
      const mm1 = mm0 + (len / pxPerMM) + stepMM * 2;
      c.beginPath();
      for (let mm = mm0; mm <= mm1; mm += stepMM) {
        const p = origin + mm * pxPerMM;
        if (p < -30 || p > len + 30) continue;
        if (horiz) { c.moveTo(p + .5, 15); c.lineTo(p + .5, 22); c.fillText(String(mm), p + 2.5, 11); }
        else { c.moveTo(15, p + .5); c.lineTo(22, p + .5); c.save(); c.translate(11, p - 2.5); c.rotate(-Math.PI / 2); c.fillText(String(mm), 0, 0); c.restore(); }
      }
      c.stroke();
      /* trim highlight */
      c.strokeStyle = acc; c.lineWidth = 2; c.beginPath();
      if (horiz) { c.moveTo(ox, 21); c.lineTo(ox + b.w * z, 21); } else { c.moveTo(21, oy); c.lineTo(21, oy + b.h * z); }
      c.stroke();
    };
    draw($('#rhc').getContext('2d'), true, viewW);
    draw($('#rvc').getContext('2d'), false, viewH);
  }

  function updStats(b) {
    if (b.source === 'hz') {
      $('#stats').innerHTML =
        `frame  ${lastFrameMs.toFixed(1)} ms<br>` +
        `zoom   ${(S.zoom * 100).toFixed(1)} %<br>` +
        `trim   ${b.wMM.toFixed(2)}×${b.hMM.toFixed(2)} mm · vector<br>` +
        `bleed  ${b.bleedMM} mm · safe ${b.safeMM} mm<br>` +
        `prims  ${b.prims.length} (${b.prims.filter(p => p.t === 'image').length} placed raster)<br>` +
        `plates ${b.plates.join(' ')}`;
      return;
    }
    const m = STATE.getMaster();
    $('#stats').innerHTML =
      `frame  ${lastFrameMs.toFixed(1)} ms<br>` +
      `zoom   ${(S.zoom * 100).toFixed(1)} %<br>` +
      `board  ${b.w}×${b.h} px · ${b.source}<br>` +
      `ppi    ${CORE.round(CORE.NATIVE_PPI * 1, 1)} native / ${CORE.round(CORE.NATIVE_PPI * S.zoom, 1)} on screen<br>` +
      `prims  ${b.prims.length}<br>` +
      `hist   ${STATE.getHistory().length} cmd · autosave ${PERSIST.autosaveMs().toFixed(1)} ms<br>` +
      `master ${m.sha256.slice(0, 12)}…`;
  }

  /* ---- stage interaction ------------------------------------------------ */
  let panning = false, spaceDown = false, px0 = 0, py0 = 0;
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    if (e.ctrlKey || e.metaKey || !e.shiftKey) {
      zoomAt(Math.pow(0.9985, e.deltaY * (e.ctrlKey ? 3 : 1.4)), cx, cy);
    } else { S.panX -= e.deltaX; S.panY -= e.deltaY; paint(); }
  }, { passive: false });

  stage.addEventListener('pointerdown', e => {
    const r = stage.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    if (e.button === 1 || spaceDown || e.altKey) {
      panning = true; px0 = cx - S.panX; py0 = cy - S.panY;
      stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'; return;
    }
    /* hit-test slots */
    const b = currentBoard(); if (!b) return;
    const bx = (cx - S.panX) / S.zoom, by = (cy - S.panY) / S.zoom;
    let hit = null;
    for (const pr of b.prims) {
      if (!pr.slot) continue;
      const f = pr.frame || { x: pr.x, y: pr.y, w: pr.size, h: pr.size };
      if (bx >= f.x && bx <= f.x + f.w && by >= f.y && by <= f.y + f.h) hit = pr.slot;
    }
    if (hit) { S.selected = hit; buildRight(); paint(); const i = document.getElementById('sf-' + hit); if (i) i.focus(); }
  });
  stage.addEventListener('pointermove', e => {
    if (!panning) return;
    const r = stage.getBoundingClientRect();
    S.panX = e.clientX - r.left - px0; S.panY = e.clientY - r.top - py0; paint();
  });
  const endPan = () => { panning = false; stage.style.cursor = spaceDown ? 'grab' : 'default'; };
  stage.addEventListener('pointerup', endPan); stage.addEventListener('pointercancel', endPan);
  stage.addEventListener('dblclick', () => fit());

  /* ======================================================================
     MENUS + TOOLBAR
     ====================================================================== */
  function buildMenus() {
    const mb = $('#menubar'); mb.innerHTML = '';
    const admin = S.mode === CORE.MODE.ADMIN;
    const defs = [
      ['File', [
        ['New label…', 'N', () => dlgNew()],
        ['Open project…', 'O', () => dlgProjects()],
        ['Save', 'S', () => { PERSIST.saveProject(STATE.getDoc(), STATE.getMaster().key); S.dirty = false; toast('Saved', STATE.getDoc().name, 'ok'); buildStatus(); }],
        ['Save version…', '⇧S', () => dlgVersion()],
        null,
        ['Import .pxlabel…', '', () => importFile()],
        ['Export .pxlabel', '', () => PERSIST.exportProjectFile(STATE.getDoc(), STATE.getMaster())],
        null,
        ['Duplicate as new SKU…', 'D', () => dlgSku(true)]
      ]],
      ['Edit', [
        ['Undo', '⌘Z', () => { STATE.undo() && toast('Undo', ''); }, () => !STATE.canUndo()],
        ['Redo', '⇧⌘Z', () => { STATE.redo() && toast('Redo', ''); }, () => !STATE.canRedo()],
        null,
        ['Apply catalogue SKU…', 'K', () => dlgSku()],
        ['Auto-fill lot & dates', 'L', () => autoFill()],
        null,
        ['Restore reference values', '', () => restoreReference()]
      ]],
      ['View', [
        ['Fit to view', '⇧1', () => fit()],
        ['Actual size (100 %)', '⌘1', () => { S.zoom = 1; centre(); }],
        ['Print size (1:1 mm)', '', () => { S.zoom = (96 / 25.4) / CORE.PPM; centre(); }],
        ['Zoom to 6400 %', '', () => { S.zoom = 64; centre(); }],
        null,
        ['Guides', 'G', () => { S.guides = !S.guides; paint(); buildToolbar(); }],
        ['Slot outlines', 'B', () => { S.slotBoxes = !S.slotBoxes; paint(); buildToolbar(); }],
        ['Grid (5 mm)', '#', () => { S.grid = !S.grid; paint(); buildToolbar(); }],
        ['Bleed', '', () => { S.bleed = !S.bleed; paint(); buildToolbar(); }],
        ['Finish simulation', 'F', () => { S.finish = !S.finish; paint(); buildToolbar(); }],
        null,
        ['Render statistics', '', () => { S.stats = !S.stats; $('#stats').classList.toggle('on', S.stats); paint(); }],
        ['Left panel', '[', () => { S.leftOpen = !S.leftOpen; layout(); }],
        ['Right panel', ']', () => { S.rightOpen = !S.rightOpen; layout(); }],
        ['Bottom panel', '\\', () => { S.bottomOpen = !S.bottomOpen; layout(); }]
      ]],
      ['Artboard', [
        ['Front (master)', '1', () => { S.artboard = 'front'; buildRight(); fit(); }],
        ['Back (data panel)', '2', () => { S.artboard = 'back'; buildRight(); fit(); }],
        null,
        ['Toggle back panel', '', () => {
          const on = !STATE.getDoc().artboards.back;
          STATE.invoke('artboard.toggle', { id: 'back', on });
          if (!on && S.artboard === 'back') S.artboard = 'front';
        }]
      ]],
      ['Export', [
        ['PNG 300 DPI', '', () => doExport('png', 300)],
        ['PNG 600 DPI', '', () => doExport('png', 600)],
        ['PNG 1200 DPI', '', () => doExport('png', 1200)],
        ['PNG 600 DPI + bleed', '', () => doExport('png', 600, { bleed: true })],
        null,
        ['SVG (vector)', '', () => doExport('svg')],
        null,
        ['Print package…', '⌘E', () => dlgPackage()],
        ['Batch export…', '', () => dlgBatch()]
      ]],
      ['Admin', [
        ['Master registry…', '', () => dlgMasters(), () => !admin],
        ['Verify master integrity', '', () => verifyMasters(), () => !admin],
        ['Preflight thresholds…', '', () => dlgThresholds(), () => !admin],
        ['Audit log…', '', () => dlgAudit()],
        null,
        ['Storage & recovery…', '', () => dlgStorage(), () => !admin]
      ]],
      ['Help', [
        ['Keyboard shortcuts', '?', () => dlgShortcuts()],
        ['Architecture & limits', '', () => dlgAbout()],
        ['Font resolution report', '', () => dlgFonts()]
      ]]
    ];
    for (const [name, items] of defs) {
      const drop = el('div', { class: 'drop' });
      for (const it of items) {
        if (!it) { drop.appendChild(el('i')); continue; }
        const [label, key, fn, dis] = it;
        const b = el('button', { onclick: () => { fn(); closeMenus(); } }, el('span2', {}, label));
        b.innerHTML = '<span style="flex:1">' + esc(label) + '</span>' + (key ? '<span>' + esc(key) + '</span>' : '');
        if (dis && dis()) b.disabled = true;
        drop.appendChild(b);
      }
      const m = el('div', { class: 'menu' }, el('button', { onclick: e => { e.stopPropagation(); const o = m.classList.contains('open'); closeMenus(); m.classList.toggle('open', !o); } }, name), drop);
      mb.appendChild(m);
    }
  }
  const closeMenus = () => document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open'));
  document.addEventListener('click', closeMenus);
  const centre = () => { const b = currentBoard(); if (b) { S.panX = (viewW - b.w * S.zoom) / 2; S.panY = (viewH - b.h * S.zoom) / 2; paint(); } };

  function buildModePill() {
    const p = $('#modepill'); p.innerHTML = '';
    for (const k of [CORE.MODE.PRODUCTION, CORE.MODE.DESIGNER, CORE.MODE.ADMIN]) {
      p.appendChild(el('button', {
        role: 'tab', 'aria-selected': S.mode === k, title: CORE.MODE_META[k].desc,
        onclick: () => setMode(k)
      }, CORE.MODE_META[k].label));
    }
  }
  function setMode(k) {
    if (k === CORE.MODE.ADMIN && S.mode !== CORE.MODE.ADMIN) {
      const b = el('div');
      b.innerHTML = `<div class="note"><b>Administrator Mode</b> unlocks the master registry, brand policy and preflight thresholds. Changes here affect every label produced from this workstation.</div>
        <div class="field"><label>Administrator PIN</label><input class="inp mono" id="apin" type="password" autocomplete="off" placeholder="••••••••"></div>`;
      const m = modal({
        title: 'Enter Administrator Mode', sub: 'Elevated privileges', body: b,
        buttons: [{ label: 'Cancel' }, {
          label: 'Unlock', kind: 'pri', action: () => {
            if (b.querySelector('#apin').value !== ADMIN_PIN) { toast('Denied', 'Incorrect PIN.', 'err'); return false; }
            S.mode = k; applyMode(); toast('Administrator Mode', 'Elevated privileges active.', 'warn');
          }
        }]
      });
      setTimeout(() => b.querySelector('#apin').focus(), 60);
      return;
    }
    S.mode = k; applyMode();
  }
  function applyMode() {
    buildModePill(); buildMenus(); buildToolbar(); buildLeft(); buildRight(); buildStatus();
    $('#modeBanner').textContent = CORE.MODE_META[S.mode].label.toUpperCase() + ' MODE';
    PERSIST.setPref('mode', S.mode);
  }

  function buildToolbar() {
    if (!scene) return;
    const t = $('#toolbar'); t.innerHTML = '';
    const g = (...k) => { const d = el('div', { class: 'tgroup' }); k.flat().forEach(x => x && d.appendChild(x)); t.appendChild(d); };
    const tb = (label, on, fn, ico, title) => el('button', {
      class: 'tbtn', 'aria-pressed': on === true ? 'true' : (on === false ? 'false' : null),
      onclick: fn, title: title || label, html: (ico ? ico : '') + '<span>' + esc(label) + '</span>'
    });

    g(el('span', { class: 'tlabel' }, 'Artboard'),
      ...scene.artboards.map(a => tb(a.id === 'front' ? 'Front' : 'Back', S.artboard === a.id,
        () => { S.artboard = a.id; buildToolbar(); buildRight(); fit(); }, '', a.label)));

    g(tb('Undo', null, () => STATE.undo(), ICO.undo), tb('Redo', null, () => STATE.redo(), ICO.redo));
    t.querySelectorAll('.tgroup')[1].children[0].disabled = !STATE.canUndo();
    t.querySelectorAll('.tgroup')[1].children[1].disabled = !STATE.canRedo();

    g(el('span', { class: 'tlabel' }, 'View'),
      tb('Guides', S.guides, () => { S.guides = !S.guides; paint(); buildToolbar(); }),
      tb('Slots', S.slotBoxes, () => { S.slotBoxes = !S.slotBoxes; paint(); buildToolbar(); }),
      tb('Bleed', S.bleed, () => { S.bleed = !S.bleed; paint(); buildToolbar(); }),
      tb('Grid', S.grid, () => { S.grid = !S.grid; paint(); buildToolbar(); }, ICO.grid),
      tb('Finish', S.finish, () => { S.finish = !S.finish; paint(); buildToolbar(); }, ICO.eye));

    const zf = el('input', { class: 'zoomfield', value: Math.round(S.zoom * 100) + '%', onchange: e => {
      const v = parseFloat(e.target.value); if (v > 0) { S.zoom = Math.max(.02, Math.min(64, v / 100)); centre(); } buildToolbar();
    } });
    g(el('span', { class: 'tlabel' }, 'Zoom'), zf, tb('Fit', null, () => fit()), tb('1:1', null, () => { S.zoom = 1; centre(); }));

    g(tb('Save', null, () => { PERSIST.saveProject(STATE.getDoc(), STATE.getMaster().key); S.dirty = false; toast('Saved', STATE.getDoc().name, 'ok'); buildStatus(); }, ICO.save),
      tb('Package', null, () => dlgPackage(), ICO.box),
      tb('PNG 600', null, () => doExport('png', 600), ICO.down));
  }

  /* ======================================================================
     LEFT DOCK  — project explorer / brand library / master
     ====================================================================== */
  function panel(title, count, bodyFn, key, open) {
    const p = el('div', { class: 'panel' + (open === false ? ' closed' : '') });
    const h = el('div', { class: 'phead', onclick: () => { p.classList.toggle('closed'); PERSIST.setPref('p.' + key, !p.classList.contains('closed')); } },
      el('span', { class: 'chev' }), title);
    if (count != null) h.appendChild(el('span', { class: 'cnt' }, String(count)));
    const b = el('div', { class: 'pbody' });
    bodyFn(b);
    p.appendChild(h); p.appendChild(b);
    return p;
  }
  const prefOpen = (k, d) => { const p = PERSIST.prefs(); return p['p.' + k] == null ? d : p['p.' + k]; };

  function buildLeft() {
    const c = $('#leftScroll'); c.innerHTML = '';
    const doc = STATE.getDoc(), master = STATE.getMaster();

    /* --- document --- */
    c.appendChild(panel('Document', null, b => {
      b.appendChild(el('div', { class: 'field' },
        el('label', {}, 'Name'),
        el('input', { class: 'inp', value: doc.name, onchange: e => STATE.invoke('doc.meta', { key: 'name', value: e.target.value }) })));
      b.appendChild(el('div', { class: 'field' },
        el('label', {}, 'SKU'),
        el('input', { class: 'inp mono', value: doc.sku, placeholder: '—', onchange: e => STATE.invoke('doc.meta', { key: 'sku', value: e.target.value.toUpperCase() }) })));
      b.appendChild(el('button', { class: 'btn wide sm', onclick: () => dlgSku() }, 'Apply catalogue SKU…'));
      b.appendChild(el('div', { class: 'slotmeta' },
        el('span', {}, 'v' + doc.version), el('span', {}, doc.id),
        el('span', {}, new Date(doc.meta.updatedAt).toLocaleString())));
    }, 'doc', prefOpen('doc', true)));

    /* --- masters --- */
    c.appendChild(panel('Brand library · Masters', MASTERS.all().length, b => {
      const list = el('div', { class: 'list' });
      for (const m of MASTERS.all()) {
        const it = el('div', {
          class: 'item', 'aria-selected': m.id === doc.masterRef,
          onclick: () => {
            if (m.id === doc.masterRef) return;
            const r = STATE.invoke('doc.setMaster', { id: m.id, key: m.key, prevKey: master.key });
            if (!r.ok) { toast('Locked', r.violations[0].msg, 'err'); return; }
            STATE.setDocument(STATE.getDoc(), m, { keepHistory: true });
          }
        },
          el('div', { class: 'sw', style: 'background-image:url(' + m.src + ')' }),
          el('div', { style: 'flex:1;min-width:0' },
            el('div', { class: 'nm' }, m.name),
            el('div', { class: 'sub' }, m.analysis.pxW + '×' + m.analysis.pxH + ' · ' + m.analysis.effectivePPI + ' PPI')),
          el('span', { class: 'grade ' + m.graded, style: 'font-size:8.5px' }, m.graded === 'PRODUCTION' ? 'PROD' : m.graded === 'PROOF_ONLY' ? 'PROOF' : 'REJ'));
        list.appendChild(it);
      }
      b.appendChild(list);
      b.appendChild(el('button', { class: 'btn wide sm', style: 'margin-top:8px', onclick: () => dlgMasterInfo(master) }, 'Master details & integrity'));
    }, 'masters', prefOpen('masters', true)));

    /* --- palette --- */
    c.appendChild(panel('Brand palette', null, b => {
      const p = BRAND.PALETTE[master.line];
      const sw = (name, hex) => el('div', { style: 'display:flex;align-items:center;gap:8px;padding:3px 0' },
        el('div', { style: `width:20px;height:20px;border-radius:4px;border:1px solid var(--line2);background:${hex};flex:none` }),
        el('div', { class: 'nm', style: 'font-size:11.5px' }, name),
        el('div', { class: 'sub' }, hex.toUpperCase()));
      b.appendChild(sw('Panel', p.panel)); b.appendChild(sw('Band (light)', p.bandL));
      b.appendChild(sw('Band (dark)', p.bandR)); b.appendChild(sw('Band ink', p.bandInk));
      b.appendChild(sw('Dosage ink', p.doseInk)); b.appendChild(sw('Accent', p.accent));
      b.appendChild(el('div', { class: 'hint', style: 'margin-top:6px' }, 'Sampled from the master artwork. Locked — colours are not authored here.'));
    }, 'palette', prefOpen('palette', false)));

    /* --- projects --- */
    const projects = PERSIST.listProjects();
    c.appendChild(panel('Projects', projects.length, b => {
      if (!projects.length) { b.appendChild(el('div', { class: 'empty' }, 'No saved projects yet.')); return; }
      const list = el('div', { class: 'list' });
      for (const p of projects.slice(0, 40)) {
        list.appendChild(el('div', {
          class: 'item', 'aria-selected': p.id === doc.id, onclick: () => openProject(p.id)
        },
          el('div', { style: 'flex:1;min-width:0' },
            el('div', { class: 'nm' }, p.name),
            el('div', { class: 'sub' }, [p.compound, p.dosage, p.lot].filter(Boolean).join(' · ') || '—')),
          el('button', {
            class: 'iconbtn', title: 'Delete', onclick: e => {
              e.stopPropagation();
              if (p.id === doc.id) { toast('In use', 'Close this project before deleting it.', 'warn'); return; }
              PERSIST.deleteProject(p.id); buildLeft(); toast('Deleted', p.name);
            }, html: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>'
          })));
      }
      b.appendChild(list);
    }, 'projects', prefOpen('projects', true)));
  }

  /* ======================================================================
     RIGHT DOCK — slot inspector / finishes / preflight / history
     ====================================================================== */
  function buildRight() {
    const c = $('#rightScroll'); c.innerHTML = '';
    const doc = STATE.getDoc(), master = STATE.getMaster();
    const board = S.artboard;

    /* --- slot inspector --- */
    const slots = CORE.ALL_SLOTS.filter(s => s.artboard === board);
    c.appendChild(panel('Slots · ' + (board === 'front' ? 'front' : 'data panel'), slots.length, b => {
      if (board === 'back' && !doc.artboards.back) {
        b.appendChild(el('div', { class: 'empty' }, 'The data panel is disabled for this document.'));
        b.appendChild(el('button', { class: 'btn wide sm', onclick: () => STATE.invoke('artboard.toggle', { id: 'back', on: true }) }, 'Enable data panel'));
        return;
      }
      for (const d of slots) b.appendChild(slotCard(d, doc));
    }, 'slots', true));

    /* --- finishes --- */
    c.appendChild(panel('Finish & substrate', null, b => {
      const locked = S.mode === CORE.MODE.PRODUCTION;
      const sel = (label, key, opts) => {
        const s = el('select', {
          class: 'inp', disabled: locked, onchange: e => {
            const r = STATE.invoke('finish.set', { key, value: e.target.value });
            if (!r.ok) toast('Locked', r.violations[0].msg, 'err');
          }
        }, ...opts.map(([v, t]) => el('option', { value: v, selected: doc.finishes[key] === v }, t)));
        return el('div', { class: 'field' }, el('label', {}, label), s);
      };
      b.appendChild(sel('Compound relief', 'compound', [['auto', 'Auto (from line)'], ['emboss-light', 'Emboss'], ['deboss', 'Deboss'], ['none', 'Flat']]));
      b.appendChild(sel('Laminate', 'laminate', [['matte', 'Matte'], ['gloss', 'Gloss'], ['softtouch', 'Soft-touch']]));
      b.appendChild(sel('Substrate', 'substrate', [['vinyl-white', 'White vinyl'], ['vinyl-clear', 'Clear vinyl'], ['vinyl-metallic', 'Metallic vinyl'], ['pp-white', 'White PP']]));
      if (locked) b.appendChild(el('div', { class: 'hint' }, 'Locked in Production Mode. Switch to Designer Mode to change finishes.'));
      b.appendChild(el('div', { class: 'note' }, el('b', {}, 'UV inkjet on vinyl. '),
        'Foil, spot-UV and emboss shown here are screen simulations. They become real only when the vector rebuild ships the matching spot plates — preflight will keep telling you so.'));
    }, 'finish', prefOpen('finish', false)));

    /* --- preflight --- */
    c.appendChild(panel('Preflight', report ? report.violations.length : 0, b => {
      b.id = 'pfBody'; renderPreflight(b);
    }, 'pf', true));

    /* --- history --- */
    c.appendChild(panel('History', STATE.getHistory().length, b => {
      b.id = 'histBody'; renderHistory(b);
    }, 'hist', prefOpen('hist', false)));

    /* --- master --- */
    c.appendChild(panel('Master asset', null, b => {
      const a = master.analysis;
      const row = (k, v, cls) => el('div', { style: 'display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:11.5px' },
        el('span', { style: 'color:var(--ink3)' }, k), el('span', { class: cls || 'mono', style: 'font-family:var(--mono);font-size:10.5px;text-align:right' }, v));
      b.appendChild(el('div', { style: 'margin-bottom:8px' }, el('span', { class: 'grade ' + master.graded }, master.graded.replace('_', ' '))));
      b.appendChild(row('key', master.key));
      b.appendChild(row('sha-256', master.sha256.slice(0, 20) + '…'));
      b.appendChild(row('container', a.container + ' · ' + a.compression.split(' ')[0]));
      b.appendChild(row('pixels', a.pxW + ' × ' + a.pxH));
      b.appendChild(row('effective PPI', String(a.effectivePPI)));
      b.appendChild(row('vector paths', String(a.vectorPaths)));
      b.appendChild(row('embedded fonts', String(a.embeddedFonts.length)));
      b.appendChild(row('colour space', a.colorSpace));
      b.appendChild(row('spot plates', String(a.spotPlates.length)));
      b.appendChild(row('bleed', a.bleedMM + ' mm'));
      b.appendChild(el('button', { class: 'btn wide sm', style: 'margin-top:9px', onclick: () => dlgMasterInfo(master) }, 'Full analysis'));
    }, 'master', prefOpen('master', false)));
  }

  function slotCard(d, doc) {
    const editable = BRAND.Policy.canEdit(d.key, S.mode);
    const enabled = d.artboard === 'front' ? true : doc.enabled[d.key] !== false;
    const card = el('div', { class: 'slot' + (S.selected === d.key ? ' sel' : '') + (editable ? '' : ' locked') });
    const head = el('div', { class: 'slothead' }, el('b', {}, d.label));
    if (d.required) head.appendChild(el('span', { class: 'tag req' }, 'REQUIRED'));
    head.appendChild(el('span', { class: 'tag' }, d.type.toUpperCase()));
    head.appendChild(el('span', { class: 'lk', html: editable ? ICO.open : ICO.lock, title: editable ? 'Editable in this mode' : 'Locked in this mode' }));
    card.appendChild(head);

    if (d.artboard === 'back') {
      card.appendChild(el('label', { class: 'chk' },
        el('input', { type: 'checkbox', checked: enabled, onchange: e => STATE.invoke('slot.toggle', { key: d.key, on: e.target.checked }) }),
        'Include on the data panel'));
    }

    const val = doc.bindings[d.key] || '';
    const input = el('input', {
      class: 'inp mono', id: 'sf-' + d.key, value: val, disabled: !editable || !enabled,
      maxlength: d.maxChars, placeholder: d.key === 'qr' ? ENGINE.qrPayload(doc) : '—',
      onfocus: () => { S.selected = d.key; paint(); document.querySelectorAll('.slot').forEach(x => x.classList.remove('sel')); card.classList.add('sel'); },
      oninput: e => {
        const v = CORE.normalise(d, e.target.value);
        const r = STATE.invoke('slot.setValue', { key: d.key, value: v });
        if (!r.ok) { e.target.classList.add('err'); toast('Rejected', r.violations[0].msg, 'err'); }
        else e.target.classList.remove('err');
      }
    });
    card.appendChild(input);
    if (d.hint) card.appendChild(el('div', { class: 'hint' }, d.hint));

    if (d.typography) {
      const ty = d.typography;
      card.appendChild(el('div', { class: 'slotmeta' },
        el('span', {}, 'cap ' + ty.capPx + 'px / ' + CORE.round(CORE.px2mm(ty.capPx), 2) + 'mm'),
        el('span', {}, 'track ' + ty.tracking),
        el('span', {}, 'w' + ty.weight),
        el('span', {}, 'max ' + d.maxChars + ' ch')));
    } else if (d.type === 'qr') {
      const b = currentBoardPrim('qr');
      card.appendChild(el('div', { class: 'slotmeta' },
        el('span', {}, b ? b.n + '×' + b.n + ' modules' : 'not rendered'),
        el('span', {}, b ? 'module ' + b.moduleMM.toFixed(2) + ' mm' : ''),
        el('span', {}, 'EC-L')));
      card.appendChild(el('div', { class: 'hint' }, 'Leave empty to auto-derive a verification URL from the serial.'));
    }
    return card;
  }
  function currentBoardPrim(t) {
    if (!scene) return null;
    for (const a of scene.artboards) { const p = a.prims.find(x => x.t === t); if (p) return p; }
    return null;
  }

  function renderPreflight(b) {
    b.innerHTML = '';
    if (!report) return;
    const g = el('div', { class: 'gauge' },
      el('div', {}, el('b', { class: report.blocking.length ? 'b' : 'g' }, String(report.blocking.length)), el('s', {}, 'blocking')),
      el('div', {}, el('b', { class: report.warnings.length ? 'w' : '' }, String(report.warnings.length)), el('s', {}, 'warnings')),
      el('div', {}, el('b', {}, String(report.infos.length)), el('s', {}, 'info')));
    b.appendChild(g);
    b.appendChild(el('div', { class: 'note ' + (report.pass ? 'ok' : 'err'), style: 'margin-top:0' },
      el('b', {}, report.pass ? 'Proof export unlocked. ' : 'Export gate closed. '),
      report.pass
        ? 'No blocking violations for proof output. Production output still requires vector masters with separations.'
        : 'The exporter will not write a file while blocking violations remain.'));
    const order = { blocking: 0, warning: 1, info: 2 };
    for (const v of [...report.violations].sort((a, z) => order[a.severity] - order[z.severity])) {
      const row = el('div', { class: 'pf ' + v.severity },
        el('div', { class: 'ic', html: v.severity === 'blocking' ? ICO.err : v.severity === 'warning' ? ICO.warn : ICO.info }),
        el('div', { class: 'tx' }, el('b', {}, v.title), el('p', { html: esc(v.msg) }),
          el('code', {}, v.rule + ' · ' + (v.boardLabel || v.board) + (v.detail ? ' · ' + v.detail : ''))));
      if (v.slot) row.appendChild(el('button', {
        class: 'fix', onclick: () => {
          const d = CORE.slotDef(v.slot); if (!d) return;
          S.artboard = d.artboard; S.selected = v.slot; buildRight(); paint();
          const i = document.getElementById('sf-' + v.slot); if (i) { i.focus(); i.select && i.select(); }
        }
      }, 'Go'));
      b.appendChild(row);
    }
  }

  function renderHistory(b) {
    b.innerHTML = '';
    const h = STATE.getHistory();
    if (!h.length) { b.appendChild(el('div', { class: 'empty' }, 'No changes yet.')); return; }
    const list = el('div', { class: 'hist' });
    h.slice(-120).forEach(r => list.appendChild(el('div', { class: 'hrec' + (r.undone ? ' undone' : '') },
      el('span', { class: 't' }, new Date(r.at).toLocaleTimeString()),
      el('span', { class: 'd' }, r.label))));
    b.appendChild(list);
  }

  /* ======================================================================
     STATUS BAR
     ====================================================================== */
  function buildStatus() {
    const doc = STATE.getDoc(), m = STATE.getMaster();
    const s = $('#status'); s.innerHTML = '';
    const seg = (h) => { const d = el('span', { html: h }); s.appendChild(d); s.appendChild(el('span', { class: 'sep' })); };
    seg(`<span class="dot ${report && report.pass ? 'ok' : 'err'}"></span><b>${report ? (report.pass ? 'PREFLIGHT PASS' : report.blocking.length + ' BLOCKING') : '…'}</b>`);
    seg(`<span class="grade ${m.graded}" style="font-size:9px">${m.graded.replace('_', ' ')}</span>`);
    seg(`${CORE.TRIM_MM.w}×${CORE.TRIM_MM.h} mm · bleed ${CORE.BLEED_MM} · safe ${CORE.SAFE_MM}`);
    seg(`${CORE.round(CORE.NATIVE_PPI, 0)} PPI native`);
    seg(`${doc.bindings.compound || '—'} · ${doc.bindings.dosage || '—'}`);
    seg(`${S.dirty ? '<span class="dot warn"></span>unsaved' : '<span class="dot ok"></span>saved'}`);
    s.appendChild(el('span', { html: `engine ${CORE.ENGINE_VERSION} · schema ${CORE.SCHEMA_VERSION}`, style: 'margin-left:auto;opacity:.7' }));
  }

  /* ======================================================================
     RECOMPUTE PIPELINE
     ====================================================================== */
  let pending = false;
  function recompute() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (typeof HZUI !== 'undefined' && HZUI.isActive()) { HZUI.render(); paint(); return; }
      const doc = STATE.getDoc(), master = STATE.getMaster();
      if (!doc || !master) return;
      scene = ENGINE.render(master, doc, {});
      report = PREFLIGHT.run(master, doc, scene, 'proof', { syntheticBleed: true });
      paint();
      const pf = document.getElementById('pfBody'); if (pf) renderPreflight(pf);
      const hb = document.getElementById('histBody'); if (hb) renderHistory(hb);
      buildStatus();
      PERSIST.autosave(doc, master.key);
    });
  }

  STATE.bus.on('doc:change', () => recompute());
  STATE.bus.on('history:change', () => { buildToolbar(); });
  STATE.bus.on('doc:load', () => { buildLeft(); buildRight(); buildToolbar(); });

  /* ======================================================================
     DIALOGS
     ====================================================================== */
  function dlgNew() {
    const b = el('div');
    b.innerHTML = `<div class="field"><label>Product line (master)</label><div class="seg" id="ml"></div></div>
      <div class="field"><label>Document name</label><input class="inp" id="nn" value="New label"></div>
      <label class="chk"><input type="checkbox" id="nb" checked> Include the generated data panel (back)</label>`;
    const ml = b.querySelector('#ml'); let pick = STATE.getMaster().line;
    MASTERS.all().forEach(m => ml.appendChild(el('button', {
      'aria-selected': m.line === pick, onclick: e => { pick = m.line; [...ml.children].forEach(c => c.setAttribute('aria-selected', c === e.target)); }
    }, BRAND.PALETTE[m.line].name)));
    modal({
      title: 'New label', sub: 'A document is data bound to an immutable master', body: b,
      buttons: [{ label: 'Cancel' }, {
        label: 'Create', kind: 'pri', action: () => {
          const m = MASTERS.all().find(x => x.line === pick);
          const d = CORE.newDocument(m.id, { name: b.querySelector('#nn').value || 'New label', back: b.querySelector('#nb').checked });
          STATE.setDocument(d, m); S.artboard = 'front'; S.selected = 'compound';
          recompute(); fit(); toast('Created', d.name, 'ok');
        }
      }]
    });
  }

  function dlgSku(duplicate) {
    const b = el('div');
    b.innerHTML = `<div class="field"><input class="inp" id="q" placeholder="Search 56 compounds / 118 SKUs…" autocomplete="off"></div>
      <div id="res" style="max-height:44vh;overflow:auto"></div>`;
    const res = b.querySelector('#res');
    function paintList(q) {
      res.innerHTML = ''; q = (q || '').toLowerCase().trim();
      let n = 0;
      for (const line of ['fitness', 'beauty', 'longevity']) {
        const hits = [];
        for (const [code, name, short, vars] of BRAND.productsOf(line)) {
          for (const [sku, mg] of vars) {
            const hay = (code + ' ' + name + ' ' + short + ' ' + sku + ' ' + mg).toLowerCase();
            if (q && hay.indexOf(q) < 0) continue;
            hits.push({ code, name, short, sku, mg, line });
          }
        }
        if (!hits.length) continue;
        res.appendChild(el('div', { style: 'font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin:10px 0 5px' }, BRAND.PALETTE[line].name));
        const t = el('table', { class: 'tb' }, el('thead', {}, el('tr', {},
          el('th', {}, 'Compound'), el('th', {}, 'Band'), el('th', {}, 'Dosage'), el('th', {}, 'SKU'), el('th', {}, ''))));
        const tb = el('tbody');
        for (const h of hits.slice(0, 400)) {
          n++;
          tb.appendChild(el('tr', {},
            el('td', {}, h.name), el('td', { class: 'mono' }, h.short), el('td', { class: 'mono' }, h.mg),
            el('td', { class: 'mono' }, h.sku),
            el('td', { style: 'text-align:right' }, el('button', {
              class: 'btn sm', onclick: () => { apply(h); }
            }, duplicate ? 'Duplicate' : 'Apply'))));
        }
        t.appendChild(tb); res.appendChild(t);
      }
      if (!n) res.appendChild(el('div', { class: 'empty' }, 'No match.'));
    }
    function apply(h) {
      const master = MASTERS.all().find(m => m.line === h.line);
      if (duplicate) {
        const d = CORE.newDocument(master.id, {
          name: h.name + ' ' + h.mg, sku: h.sku,
          bindings: Object.assign({}, STATE.getDoc().bindings, { compound: h.short, dosage: h.mg })
        });
        STATE.setDocument(d, master); toast('Duplicated', d.name, 'ok');
      } else {
        if (master.id !== STATE.getDoc().masterRef) {
          const r = STATE.invoke('doc.setMaster', { id: master.id, key: master.key, prevKey: STATE.getMaster().key });
          if (!r.ok) { toast('Locked', r.violations[0].msg, 'err'); return; }
          STATE.setDocument(STATE.getDoc(), master, { keepHistory: true });
        }
        STATE.invoke('doc.applySku', { sku: h.sku, compound: h.short, dosage: h.mg, name: h.name + ' ' + h.mg }, { noCoalesce: true });
        toast('Applied', h.name + ' · ' + h.mg, 'ok');
      }
      buildLeft(); buildRight(); recompute();
      mm.close();
    }
    const mm = modal({ title: duplicate ? 'Duplicate as new SKU' : 'Apply catalogue SKU', sub: '56 compounds · 118 mg presentations', body: b, wide: true, buttons: [{ label: 'Close' }] });
    b.querySelector('#q').addEventListener('input', e => paintList(e.target.value));
    paintList('');
    setTimeout(() => b.querySelector('#q').focus(), 60);
  }

  function dlgProjects() {
    const ps = PERSIST.listProjects();
    const b = el('div');
    if (!ps.length) b.appendChild(el('div', { class: 'empty' }, 'No saved projects.'));
    else {
      const t = el('table', { class: 'tb' }, el('thead', {}, el('tr', {}, el('th', {}, 'Name'), el('th', {}, 'SKU'), el('th', {}, 'Lot'), el('th', {}, 'Updated'), el('th', {}, ''))));
      const tb = el('tbody');
      ps.forEach(p => tb.appendChild(el('tr', {},
        el('td', {}, p.name), el('td', { class: 'mono' }, p.sku || '—'), el('td', { class: 'mono' }, p.lot || '—'),
        el('td', { class: 'mono' }, new Date(p.updatedAt).toLocaleString()),
        el('td', { style: 'text-align:right' }, el('button', { class: 'btn sm', onclick: () => { openProject(p.id); mm.close(); } }, 'Open')))));
      t.appendChild(tb); b.appendChild(t);
    }
    const mm = modal({ title: 'Open project', sub: ps.length + ' saved', body: b, wide: true, buttons: [{ label: 'Close' }] });
  }

  function openProject(id) {
    const p = PERSIST.getProject(id); if (!p) return;
    const m = MASTERS.byKey(p.master) || MASTERS.get(p.doc.masterRef) || MASTERS.all()[0];
    STATE.setDocument(CORE.clone(p.doc), m);
    S.artboard = 'front'; recompute(); fit(); toast('Opened', p.name, 'ok');
  }

  function dlgVersion() {
    const b = el('div');
    b.innerHTML = `<div class="field"><label>Version label</label><input class="inp" id="vl" placeholder="e.g. approved-by-QA"></div>`;
    const list = el('div');
    const vs = PERSIST.listVersions(STATE.getDoc().id);
    if (vs.length) {
      const t = el('table', { class: 'tb' }, el('thead', {}, el('tr', {}, el('th', {}, 'Label'), el('th', {}, 'Doc v'), el('th', {}, 'Saved'), el('th', {}, ''))));
      const tb = el('tbody');
      vs.forEach(v => tb.appendChild(el('tr', {},
        el('td', {}, v.label), el('td', { class: 'mono' }, 'v' + v.v), el('td', { class: 'mono' }, new Date(v.at).toLocaleString()),
        el('td', { style: 'text-align:right' }, el('button', {
          class: 'btn sm', onclick: () => {
            STATE.setDocument(CORE.clone(v.snapshot), MASTERS.byKey(v.master) || STATE.getMaster());
            recompute(); toast('Restored', v.label, 'ok'); mm.close();
          }
        }, 'Restore')))));
      t.appendChild(tb); list.appendChild(el('div', { style: 'margin-top:14px' }, t));
    }
    b.appendChild(list);
    const mm = modal({
      title: 'Versions', sub: 'Named checkpoints of this document', body: b, wide: true,
      buttons: [{ label: 'Close' }, {
        label: 'Save version', kind: 'pri', action: () => {
          const v = PERSIST.saveVersion(STATE.getDoc(), STATE.getMaster().key, b.querySelector('#vl').value.trim());
          toast('Version saved', v.label, 'ok');
        }
      }]
    });
  }

  /* ---- export dialogs --------------------------------------------------- */
  async function doExport(kind, dpi, opts) {
    const doc = STATE.getDoc(), m = STATE.getMaster();
    const board = S.artboard;
    try {
      const r = kind === 'svg' ? EXPORTER.exportSVG(m, doc, board) : await EXPORTER.exportPNG(m, doc, board, dpi, opts);
      if (!r.ok) { gateBlocked(r.report); return; }
      toast('Exported', kind === 'svg' ? 'SVG · vector' : `PNG ${dpi} DPI · ${r.info.W}×${r.info.H} px`, 'ok');
    } catch (e) { toast('Export failed', e.message, 'err'); }
  }

  function gateBlocked(rep) {
    const b = el('div');
    b.appendChild(el('div', { class: 'note err' }, el('b', {}, 'Export refused. '),
      `${rep.blocking.length} blocking violation${rep.blocking.length > 1 ? 's' : ''}. No file was written.`));
    rep.blocking.forEach(v => b.appendChild(el('div', { class: 'pf blocking' },
      el('div', { class: 'ic', html: ICO.err }),
      el('div', { class: 'tx' }, el('b', {}, v.title), el('p', { html: esc(v.msg) }), el('code', {}, v.rule + ' · ' + v.board)))));
    modal({ title: 'Preflight gate', sub: 'The exporter refuses to write invalid production files', body: b, buttons: [{ label: 'Close', kind: 'pri' }] });
  }

  function dlgPackage() {
    const doc = STATE.getDoc(), m = STATE.getMaster();
    const prod = PREFLIGHT.run(m, doc, ENGINE.render(m, doc, {}), 'production', { syntheticBleed: true });
    const b = el('div');
    b.appendChild(el('div', { class: 'gauge' },
      el('div', {}, el('b', { class: prod.blocking.length ? 'b' : 'g' }, String(prod.blocking.length)), el('s', {}, 'blocking')),
      el('div', {}, el('b', { class: prod.warnings.length ? 'w' : '' }, String(prod.warnings.length)), el('s', {}, 'warnings')),
      el('div', {}, el('b', {}, String(prod.infos.length)), el('s', {}, 'info'))));
    b.appendChild(el('div', { class: 'note ' + (prod.pass ? 'ok' : 'err') },
      el('b', {}, prod.pass ? 'Production intent passes. ' : 'Production intent fails. '),
      prod.pass ? 'A print package can be written.' :
        'The supplied master is a 257 PPI RGB JPEG with no fonts, no vectors and no spot plates. It cannot produce a compliant print file — this is exactly what the gate exists to catch. You can still export a clearly-marked PROOF package.'));
    const list = el('div', { style: 'max-height:34vh;overflow:auto' });
    prod.violations.filter(v => v.severity !== 'info').forEach(v => list.appendChild(el('div', { class: 'pf ' + v.severity },
      el('div', { class: 'ic', html: v.severity === 'blocking' ? ICO.err : ICO.warn }),
      el('div', { class: 'tx' }, el('b', {}, v.title), el('p', { html: esc(v.msg) }), el('code', {}, v.rule + (v.detail ? ' · ' + v.detail : ''))))));
    b.appendChild(list);
    b.appendChild(el('div', { class: 'field' }, el('label', {}, 'Raster resolution inside the package'),
      el('select', { class: 'inp', id: 'pdpi' }, el('option', { value: 300 }, '300 DPI'), el('option', { value: 600, selected: true }, '600 DPI'), el('option', { value: 1200 }, '1200 DPI'))));
    modal({
      title: 'Print package', sub: 'artwork + SVG + validation report + manufacturing spec', body: b, wide: true,
      buttons: [{ label: 'Cancel' },
      {
        label: prod.pass ? 'Write package' : 'Write PROOF package', kind: 'pri', action: () => {
          const dpi = +b.querySelector('#pdpi').value;
          EXPORTER.exportPackage(STATE.getMaster(), STATE.getDoc(), { intent: 'production', dpi, force: true })
            .then(r => toast(r.forced ? 'Proof package written' : 'Print package written',
              r.forced ? 'Marked DO-NOT-PRINT — blocking violations recorded inside.' : 'Validated for production.', r.forced ? 'warn' : 'ok'))
            .catch(e => toast('Export failed', e.message, 'err'));
        }
      }]
    });
  }

  function dlgBatch() {
    const b = el('div');
    b.innerHTML = `<div class="note"><b>Batch export</b> generates one validated file per SKU in the selected line, reusing the current lot, dates and finishes.</div>
      <div class="field"><label>Line</label><div class="seg" id="bl"></div></div>
      <div class="row"><div class="field"><label>Artboard</label>
        <select class="inp" id="bb"><option value="front">Front (master)</option><option value="back">Back (data panel)</option></select></div>
      <div class="field"><label>Resolution</label>
        <select class="inp" id="bd"><option value="300">300 DPI</option><option value="600" selected>600 DPI</option><option value="1200">1200 DPI</option></select></div></div>
      <div id="bc" class="hint"></div>`;
    let line = STATE.getMaster().line;
    const bl = b.querySelector('#bl');
    ['fitness', 'beauty', 'longevity'].forEach(l => bl.appendChild(el('button', {
      'aria-selected': l === line, onclick: e => { line = l; [...bl.children].forEach(c => c.setAttribute('aria-selected', c === e.target)); count(); }
    }, BRAND.PALETTE[l].name)));
    const count = () => {
      const n = BRAND.productsOf(line).reduce((a, p) => a + p[3].length, 0);
      b.querySelector('#bc').textContent = n + ' SKUs will be generated.';
    };
    count();
    modal({
      title: 'Batch export', sub: 'One file per mg presentation', body: b, wide: false,
      buttons: [{ label: 'Cancel' }, {
        label: 'Run batch', kind: 'pri', action: () => {
          const master = MASTERS.all().find(m => m.line === line);
          const base = STATE.getDoc();
          const docs = [];
          for (const [code, name, short, vars] of BRAND.productsOf(line))
            for (const [sku, mg] of vars)
              docs.push(CORE.newDocument(master.id, {
                name: name + ' ' + mg, sku,
                bindings: Object.assign({}, base.bindings, { compound: short, dosage: mg }),
                back: base.artboards.back
              }));
          toast('Batch running', docs.length + ' documents…');
          EXPORTER.exportBatch(master, docs, +b.querySelector('#bd').value, b.querySelector('#bb').value)
            .then(rs => {
              const ok = rs.filter(r => r.report.pass).length;
              toast('Batch complete', ok + ' of ' + rs.length + ' passed preflight and were written.', ok === rs.length ? 'ok' : 'warn');
            });
        }
      }]
    });
  }

  /* ---- admin dialogs ---------------------------------------------------- */
  function dlgMasters() {
    const b = el('div');
    const t = el('table', { class: 'tb' }, el('thead', {}, el('tr', {},
      el('th', {}, 'Key'), el('th', {}, 'SHA-256'), el('th', {}, 'Pixels'), el('th', {}, 'PPI'), el('th', {}, 'Grade'), el('th', {}, ''))));
    const tb = el('tbody');
    MASTERS.all().forEach(m => tb.appendChild(el('tr', {},
      el('td', {}, m.key), el('td', { class: 'mono' }, m.sha256.slice(0, 16) + '…'),
      el('td', { class: 'mono' }, m.analysis.pxW + '×' + m.analysis.pxH),
      el('td', { class: 'mono' }, String(m.analysis.effectivePPI)),
      el('td', {}, el('span', { class: 'grade ' + m.graded, style: 'font-size:9px' }, m.graded.replace('_', ' '))),
      el('td', { style: 'text-align:right' }, el('button', { class: 'btn sm', onclick: () => dlgMasterInfo(m) }, 'Analyse')))));
    t.appendChild(tb); b.appendChild(t);
    b.appendChild(el('div', { class: 'note' }, el('b', {}, 'Masters are immutable. '),
      'They are keyed by the SHA-256 of their bytes and opened read-only. Ingesting a corrected vector rebuild creates a NEW master; it never overwrites this one, so every historical label stays reproducible.'));
    modal({ title: 'Master registry', sub: 'content-addressed · read-only', body: b, wide: true, buttons: [{ label: 'Close' }] });
  }

  function dlgMasterInfo(m) {
    const a = m.analysis;
    const b = el('div');
    b.innerHTML = `
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <img src="${m.src}" style="width:150px;border-radius:6px;border:1px solid var(--line2)">
        <div style="flex:1;min-width:260px">
          <div style="margin-bottom:10px"><span class="grade ${m.graded}">${m.graded.replace('_', ' ')}</span></div>
          <table class="tb">
            <tr><td>Key</td><td class="mono">${esc(m.key)}</td></tr>
            <tr><td>SHA-256</td><td class="mono" style="word-break:break-all">${m.sha256}</td></tr>
            <tr><td>Bytes</td><td class="mono">${m.bytes.toLocaleString()}</td></tr>
            <tr><td>Container</td><td class="mono">${a.container} · ${a.compression}</td></tr>
            <tr><td>Pixels</td><td class="mono">${a.pxW} × ${a.pxH}</td></tr>
            <tr><td>Trim</td><td class="mono">${m.trim.w} × ${m.trim.h} mm</td></tr>
            <tr><td>Effective PPI</td><td class="mono">${a.effectivePPI}</td></tr>
            <tr><td>Vector paths</td><td class="mono">${a.vectorPaths}</td></tr>
            <tr><td>Embedded fonts</td><td class="mono">${a.embeddedFonts.length}</td></tr>
            <tr><td>Colour space</td><td class="mono">${a.colorSpace}</td></tr>
            <tr><td>Spot plates</td><td class="mono">${a.spotPlates.length ? a.spotPlates.join(', ') : 'none'}</td></tr>
            <tr><td>Bleed</td><td class="mono">${a.bleedMM} mm</td></tr>
            <tr><td>Registered</td><td class="mono">${new Date(m.registeredAt).toLocaleString()}</td></tr>
          </table>
        </div>
      </div>
      <div class="note"><b>Why this grades ${m.graded.replace('_', ' ')}. </b>
        Production grade requires vector text with resolved fonts, CMYK or spot colour, at least one separation plate and ${CORE.BLEED_MM} mm of bleed.
        This asset is a ${a.effectivePPI} PPI ${a.colorSpace} ${a.container} — the foil and emboss you see are photographic simulations baked into the pixels,
        not plates a press can drive. It is fully valid for proofs, web, mockups and internal approval, and the studio will happily produce those.
        Point the registry at an Illustrator rebuild with <code>PX_FOIL_*</code>, <code>PX_EMBOSS</code> and <code>PX_DIE_CUT</code> plates and this same document exports a compliant package with no other change.</div>
      <div class="field"><button class="btn wide" id="vfy">Verify integrity now</button><div class="hint" id="vres"></div></div>`;
    const mm = modal({ title: 'Master analysis · ' + m.name, sub: 'measured at ingest, never declared', body: b, wide: true, buttons: [{ label: 'Close' }] });
    b.querySelector('#vfy').onclick = async () => {
      const ok = await MASTERS.verify(m);
      b.querySelector('#vres').innerHTML = ok
        ? '<span style="color:var(--ok)">✓ Bytes match the registered hash. The artwork has not been altered.</span>'
        : '<span style="color:var(--err)">✗ Hash mismatch — this asset has been modified.</span>';
    };
  }

  async function verifyMasters() {
    const rs = [];
    for (const m of MASTERS.all()) rs.push([m.key, await MASTERS.verify(m)]);
    const bad = rs.filter(r => !r[1]);
    toast('Integrity check', bad.length ? bad.length + ' master(s) FAILED' : rs.length + ' masters verified against their content hash.', bad.length ? 'err' : 'ok');
  }

  function dlgThresholds() {
    const T = PREFLIGHT.thresholds;
    const b = el('div');
    const rows = [['minTextPt', 'Minimum type size (pt)'], ['minReversedPt', 'Minimum reversed type (pt)'],
    ['minPPI', 'Minimum effective PPI'], ['foilPPI', 'Minimum PPI for foil plates'],
    ['minQrModuleMM', 'Minimum QR module (mm)'], ['quietModules', 'QR quiet zone (modules)'],
    ['maxInk', 'Maximum total area coverage (%)'], ['minHairlinePt', 'Minimum hairline (pt)']];
    rows.forEach(([k, l]) => b.appendChild(el('div', { class: 'field' }, el('label', {}, l),
      el('input', { class: 'inp mono', type: 'number', step: 'any', value: T[k], onchange: e => { T[k] = parseFloat(e.target.value); recompute(); } }))));
    b.appendChild(el('div', { class: 'note' }, el('b', {}, 'These are press tolerances, not preferences. '),
      'Lowering them does not make a file printable — it makes the studio stop telling you it is not. Change them only with a written spec from the printer.'));
    modal({ title: 'Preflight thresholds', sub: 'Administrator only', body: b, buttons: [{ label: 'Done', kind: 'pri' }] });
  }

  function dlgAudit() {
    const log = STATE.auditLog();
    const b = el('div');
    if (!log.length) b.appendChild(el('div', { class: 'empty' }, 'No changes recorded in this session.'));
    else {
      const t = el('table', { class: 'tb' }, el('thead', {}, el('tr', {}, el('th', {}, 'Timestamp'), el('th', {}, 'Actor'), el('th', {}, 'Action'), el('th', {}, 'Detail'))));
      const tb = el('tbody');
      log.slice().reverse().forEach(r => tb.appendChild(el('tr', {},
        el('td', { class: 'mono' }, new Date(r.at).toLocaleString()), el('td', { class: 'mono' }, r.actor),
        el('td', { class: 'mono' }, r.action), el('td', {}, r.detail))));
      t.appendChild(tb); b.appendChild(t);
    }
    b.appendChild(el('div', { class: 'note' }, 'The command history <b>is</b> the audit trail. Every export embeds it in <code>validation-report.json</code>.'));
    modal({
      title: 'Audit log', sub: log.length + ' recorded commands', body: b, wide: true,
      buttons: [{ label: 'Close' }, {
        label: 'Download JSON', action: () => EXPORTER.dl(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }), 'PEPTIDEX_audit_' + Date.now() + '.json')
      }]
    });
  }

  function dlgStorage() {
    const u = PERSIST.usage(), r = PERSIST.recovery();
    const b = el('div');
    b.innerHTML = `<table class="tb">
      <tr><td>Projects stored</td><td class="mono">${u.projects}</td></tr>
      <tr><td>Local storage used</td><td class="mono">${(u.bytes / 1024).toFixed(1)} KB</td></tr>
      <tr><td>Last autosave</td><td class="mono">${PERSIST.autosaveMs().toFixed(1)} ms</td></tr>
      <tr><td>Recovery snapshot</td><td class="mono">${r ? new Date(r.at).toLocaleString() : 'none'}</td></tr></table>
      <div class="note">Autosave writes a recovery snapshot plus the project record on every change, debounced to 400 ms and budgeted at &lt; 50 ms. Masters are never copied into a project — only referenced by hash.</div>`;
    modal({
      title: 'Storage & recovery', body: b, buttons: [{ label: 'Close' }, {
        label: 'Clear recovery snapshot', action: () => { PERSIST.clearRecovery(); toast('Cleared', 'Recovery snapshot removed.'); }
      }]
    });
  }

  function dlgFonts() {
    const f = BRAND.resolveFont();
    const b = el('div');
    b.innerHTML = `<table class="tb">
      <tr><td>Resolved family</td><td class="mono">${esc(f.family || 'system default')}</td></tr>
      <tr><td>Substitution</td><td class="mono">${f.substituted ? 'YES — metrics will differ from the master' : 'no'}</td></tr>
      <tr><td>Cap-height ratio (w600)</td><td class="mono">${BRAND.capRatio(600).toFixed(4)}</td></tr>
      <tr><td>Cap-height ratio (w300)</td><td class="mono">${BRAND.capRatio(300).toFixed(4)}</td></tr>
      <tr><td>Stack</td><td class="mono" style="word-break:break-all;font-size:9.5px">${esc(f.stack)}</td></tr></table>
      <div class="note"><b>Why this matters. </b>The master artwork ships zero embedded fonts, so the studio cannot reproduce its exact letterforms —
      it measures the cap height of whichever face resolves and scales to match, which keeps position and size correct even when the shapes differ.
      For production, license the real face and embed it, or have the rebuild converted to outlines.</div>`;
    modal({ title: 'Font resolution', sub: 'measured on this machine', body: b, buttons: [{ label: 'Close' }] });
  }

  function dlgAbout() {
    modal({
      title: 'PEPTIDEX Label Studio Pro', sub: 'Phase 1 · Proof Studio · engine ' + CORE.ENGINE_VERSION, wide: true,
      body: `<div class="note"><b>What this is.</b> A variable-data production system with a protected design system — not a vector editor.
        The master artwork is immutable and content-addressed; operators bind data to typed slots; the renderer composites master + overlay; preflight gates export.
        That is how packaging pre-press actually works, and it is why an operator cannot damage the brand.</div>
      <table class="tb">
        <tr><td>Immutable content-addressed master registry</td><td class="mono">yes</td></tr>
        <tr><td>Automatic ingest analysis &amp; grading</td><td class="mono">yes</td></tr>
        <tr><td>Slot model, binding, shrink-to-fit</td><td class="mono">yes</td></tr>
        <tr><td>Pure <code>render()</code> → display list</td><td class="mono">yes</td></tr>
        <tr><td>Command stack, semantic undo, audit log</td><td class="mono">unlimited</td></tr>
        <tr><td>Production / Designer / Administrator modes</td><td class="mono">policy-enforced</td></tr>
        <tr><td>Preflight rule engine + export gate</td><td class="mono">${PREFLIGHT.RULES.length} rules</td></tr>
        <tr><td>QR: generate <i>and</i> independently decode</td><td class="mono">round-trip verified</td></tr>
        <tr><td>PNG 300 / 600 / 1200 DPI, SVG (real vector text)</td><td class="mono">yes</td></tr>
        <tr><td>Print package (.zip) with validation report</td><td class="mono">yes</td></tr>
        <tr><td>Autosave, named versions, crash recovery</td><td class="mono">yes</td></tr>
        <tr><td>Canvas to 6400 %, rulers, bleed, safe area, grid</td><td class="mono">yes</td></tr>
      </table>
      <div class="note err"><b>Not implemented — and honestly out of reach for a single-file build.</b>
        PDF/X-4 writer with an output intent; ICC-accurate CMYK conversion and soft proofing; real separation plates;
        the Tauri desktop shell and multi-window workspace. Those are Phase 2 and they are specified in <code>ARCHITECTURE.md</code>.
        Everything the studio <i>does</i> emit is honest about what it is.</div>`,
      buttons: [{ label: 'Close', kind: 'pri' }]
    });
  }

  function dlgShortcuts() {
    const rows = [['⌘/Ctrl + Z', 'Undo'], ['⇧⌘/Ctrl + Z', 'Redo'], ['⌘/Ctrl + S', 'Save project'],
    ['⌘/Ctrl + E', 'Print package'], ['N', 'New label'], ['O', 'Open project'], ['K', 'Apply catalogue SKU'],
    ['L', 'Auto-fill lot & dates'], ['1 / 2', 'Front / back artboard'], ['⇧1', 'Fit to view'], ['⌘/Ctrl + 1', 'Actual size'],
    ['G', 'Guides'], ['B', 'Slot outlines'], ['#', 'Grid'], ['F', 'Finish simulation'], ['T', 'Theme'],
    ['[ / ] / \\', 'Left / right / bottom panel'], ['Space + drag', 'Pan'], ['Alt + drag', 'Pan'],
    ['Wheel', 'Zoom at pointer'], ['Double-click', 'Fit to view'], ['?', 'This dialog']];
    modal({
      title: 'Keyboard', sub: 'Workspace shortcuts',
      body: '<table class="tb">' + rows.map(r => `<tr><td><span class="kbd">${esc(r[0])}</span></td><td>${esc(r[1])}</td></tr>`).join('') + '</table>',
      buttons: [{ label: 'Close', kind: 'pri' }]
    });
  }

  function importFile() {
    const i = el('input', { type: 'file', accept: '.json,.pxlabel' });
    i.onchange = () => {
      const f = i.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const res = PERSIST.importProjectFile(r.result);
          STATE.setDocument(res.doc, res.master);
          recompute(); fit();
          toast('Imported', res.doc.name + (res.warning ? ' — ' + res.warning : ''), res.warning ? 'warn' : 'ok');
        } catch (e) { toast('Import failed', e.message, 'err'); }
      };
      r.readAsText(f);
    };
    i.click();
  }

  /* ---- helpers ---------------------------------------------------------- */
  function autoFill() {
    const d = STATE.getDoc();
    const now = new Date();
    const exp = new Date(now.getTime()); exp.setFullYear(exp.getFullYear() + 2);
    const iso = x => x.toISOString().slice(0, 10);
    const lot = 'PX' + iso(now).replace(/-/g, '').slice(2) + '-' + String(Math.floor(Math.random() * 900) + 100);
    const serial = (d.sku || 'PX') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    STATE.invoke('doc.bulk', { label: 'Auto-fill lot & dates', bindings: { lot, mfg: iso(now), expiry: iso(exp), serial } }, { noCoalesce: true });
    buildRight(); toast('Auto-filled', lot + ' · exp ' + iso(exp), 'ok');
  }

  function restoreReference() {
    const line = STATE.getMaster().line;
    const ref = { fitness: ['RT10', '10MG'], beauty: ['GHK', '10MG'], longevity: ['BPC', '10MG'] }[line];
    STATE.invoke('doc.bulk', { label: 'Restore reference values', bindings: { compound: ref[0], dosage: ref[1] } }, { noCoalesce: true });
    buildRight();
    toast('Reference restored', 'The front artboard now reproduces the supplied artwork exactly.', 'ok');
  }

  function layout() {
    $('#work').classList.toggle('nl', !S.leftOpen);
    $('#work').classList.toggle('nr', !S.rightOpen);
    setTimeout(resize, 20);
  }

  /* ---- keyboard --------------------------------------------------------- */
  addEventListener('keydown', e => {
    if (e.key === ' ' && !isField(e.target)) { spaceDown = true; stage.style.cursor = 'grab'; e.preventDefault(); }
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? STATE.redo() : STATE.undo(); return; }
    if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); PERSIST.saveProject(STATE.getDoc(), STATE.getMaster().key); S.dirty = false; toast('Saved', STATE.getDoc().name, 'ok'); buildStatus(); return; }
    if (meta && e.key.toLowerCase() === 'e') { e.preventDefault(); dlgPackage(); return; }
    if (meta && e.key === '1') { e.preventDefault(); S.zoom = 1; centre(); return; }
    if (isField(e.target) || modalStack.length) return;
    const k = e.key;
    if (k === '?') dlgShortcuts();
    else if (k === 'n' || k === 'N') dlgNew();
    else if (k === 'o' || k === 'O') dlgProjects();
    else if (k === 'k' || k === 'K') dlgSku();
    else if (k === 'l' || k === 'L') autoFill();
    else if (k === '1') { S.artboard = 'front'; buildRight(); buildToolbar(); fit(); }
    else if (k === '2') { if (STATE.getDoc().artboards.back) { S.artboard = 'back'; buildRight(); buildToolbar(); fit(); } }
    else if (k === '!' || (e.shiftKey && k === '1')) fit();
    else if (k === 'g' || k === 'G') { S.guides = !S.guides; paint(); buildToolbar(); }
    else if (k === 'b' || k === 'B') { S.slotBoxes = !S.slotBoxes; paint(); buildToolbar(); }
    else if (k === '#') { S.grid = !S.grid; paint(); buildToolbar(); }
    else if (k === 'f' || k === 'F') { S.finish = !S.finish; paint(); buildToolbar(); }
    else if (k === 't' || k === 'T') toggleTheme();
    else if (k === '[') { S.leftOpen = !S.leftOpen; layout(); }
    else if (k === ']') { S.rightOpen = !S.rightOpen; layout(); }
    else if (k === '+' || k === '=') zoomAt(1.25, viewW / 2, viewH / 2);
    else if (k === '-') zoomAt(0.8, viewW / 2, viewH / 2);
  });
  addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; stage.style.cursor = 'default'; } });
  const isField = t => t && /input|textarea|select/i.test(t.tagName);

  function toggleTheme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', S.theme);
    PERSIST.setPref('theme', S.theme);
    paint();
  }

  /* ---- bridge for the Premium Horizontal family --------------------------
     A named surface rather than reaching into this closure, so the new family
     can only use what is deliberately handed to it. */
  const PX_UI = {
    el, esc, toast, modal, panel, S, ICO,
    paint, fit, resize, recompute, buildStatus,
    setScene(s) { scene = s; },
    getScene() { return scene; }
  };
  window.PX_UI = PX_UI;

  /* ---- wiring ----------------------------------------------------------- */
  $('#btnTheme').onclick = toggleTheme;
  $('#btnHelp').onclick = dlgShortcuts;
  $('#zIn').onclick = () => zoomAt(1.25, viewW / 2, viewH / 2);
  $('#zOut').onclick = () => zoomAt(0.8, viewW / 2, viewH / 2);
  $('#zFit').onclick = fit;
  addEventListener('resize', resize);
  addEventListener('beforeunload', e => { if (S.dirty) { PERSIST.saveProject(STATE.getDoc(), STATE.getMaster().key); } });

  /* ======================================================================
     BOOT
     ====================================================================== */
  (async function boot() {
    const p = PERSIST.prefs();
    if (p.theme) { S.theme = p.theme; document.documentElement.setAttribute('data-theme', S.theme); }
    await MASTERS.boot();
    BRAND.resolveFont();

    const rec = PERSIST.recovery();
    const startFresh = () => {
      const m = MASTERS.byKey('fitness');
      const now = new Date(), exp = new Date(); exp.setFullYear(exp.getFullYear() + 2);
      const iso = x => x.toISOString().slice(0, 10);
      const d = CORE.newDocument(m.id, {
        name: 'Retatrutide 10 mg', sku: 'RT10',
        bindings: {
          compound: 'RT10', dosage: '10MG',
          lot: 'PX' + iso(now).replace(/-/g, '').slice(2) + '-001',
          mfg: iso(now), expiry: iso(exp),
          serial: 'RT10-' + Math.random().toString(36).slice(2, 8).toUpperCase(), qr: ''
        }
      });
      STATE.setDocument(d, m);
    };

    startFresh();
    scene = ENGINE.render(STATE.getMaster(), STATE.getDoc(), {});
    report = PREFLIGHT.run(STATE.getMaster(), STATE.getDoc(), scene, 'proof', { syntheticBleed: true });

    buildModePill(); buildMenus(); buildToolbar(); buildLeft(); buildRight(); buildStatus();
    $('#modeBanner').textContent = CORE.MODE_META[S.mode].label.toUpperCase() + ' MODE';
    layout(); resize(); fit();

    if (rec && rec.doc && Date.now() - rec.at < 1000 * 60 * 60 * 24 * 14) {
      const b = el('div');
      b.innerHTML = `<div class="note"><b>A recovery snapshot was found.</b> “${esc(rec.doc.name)}” was auto-saved on ${new Date(rec.at).toLocaleString()} and the session did not close cleanly.</div>`;
      modal({
        title: 'Restore your work?', sub: 'Crash recovery', body: b,
        buttons: [{ label: 'Start fresh', action: () => PERSIST.clearRecovery() }, {
          label: 'Restore', kind: 'pri', action: () => {
            const m = MASTERS.byKey(rec.master) || MASTERS.get(rec.doc.masterRef) || MASTERS.all()[0];
            STATE.setDocument(rec.doc, m); recompute(); fit();
            toast('Restored', rec.doc.name, 'ok');
          }
        }]
      });
    }

    if (typeof HZUI !== 'undefined') { try { HZUI.mount(PX_UI); } catch (e) { console.error('hz mount', e); } }

    toast('Label Studio Pro', 'Master registry verified · ' + MASTERS.all().length + ' masters · ' +
      (PREFLIGHT.RULES.length + (typeof HZUV !== 'undefined' ? HZUV.RULES.length : 0)) + ' preflight rules armed.', 'ok');
  })();
})();

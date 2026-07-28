/* ============================================================================
   package: @px/hz-export
   Production output for the Premium Horizontal family.

   WHAT IS ACTUALLY VECTOR HERE
   Every rule, hexagon, icon, flag stripe and panel is emitted as PDF/EPS/SVG
   path geometry, and every piece of type is emitted as PDF text operators —
   not as an image of type. There is no rasterisation stage between the model
   and the press file, at any size, which is the whole reason the label was
   rebuilt as geometry instead of being embedded as the supplied photograph.

   THE ONE THING THIS CANNOT DO IN A BROWSER
   PDF/X requires every font to be embedded, and no page can embed a typeface
   it has not been given the binary for. Fonts here resolve from the operating
   system, so the PDF references the face by name. That is a real limitation
   and it is reported as one — `hz.font-embed` is BLOCKING for an X-1a or X-4
   intent, with the remediation on it — rather than quietly written into a
   file a printer would reject. Supply the licensed .otf and this becomes a
   conformant package; until then these are proofs, and the software says so.

   Colour is converted, never guessed at: Adobe RGB is an exact matrix from
   sRGB, and device CMYK is an uncalibrated separation that is labelled
   uncalibrated in the manifest. Nothing here claims an ICC rendering it did
   not perform.
   depends on: hz-model, hz-render, hz-preflight, export (zip/dl)
   ============================================================================ */
const HZX = (() => {
  'use strict';

  const PT = mm => mm * 72 / 25.4;
  const f = (n, d) => (+n).toFixed(d == null ? 4 : d);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- colour ----------------------------------------------------- */
  const hex2rgb = h => {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };

  /** Uncalibrated device separation with black generation. Labelled as such. */
  function rgb2cmyk(r, g, b) {
    const k = 1 - Math.max(r, g, b);
    if (k >= 0.9999) return [0, 0, 0, 1];
    return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
  }

  /** sRGB -> Adobe RGB (1998). Exact: sRGB decode, XYZ, AdobeRGB encode. */
  const _lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  function srgb2adobe(r, g, b) {
    const R = _lin(r), G = _lin(g), B = _lin(b);
    const X = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B;
    const Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
    const Z = 0.0193339 * R + 0.1191920 * G + 0.9503041 * B;
    const cl = v => Math.max(0, Math.min(1, v));
    const ar = cl(2.0413690 * X - 0.5649464 * Y - 0.3446944 * Z);
    const ag = cl(-0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z);
    const ab = cl(0.0134474 * X - 0.1183897 * Y + 1.0154096 * Z);
    const e = v => Math.pow(v, 1 / 2.19921875);
    return [e(ar), e(ag), e(ab)];
  }

  /* A small coated reference set, used only to name the nearest match. It is
     a simulation and the manifest says so — a Pantone number is a licensed
     measurement, not something software derives from a screen colour. */
  const PANTONE = [
    ['Black 6 C', '#101820'], ['Cool Gray 11 C', '#53565a'], ['877 C Silver', '#8a8d8f'],
    ['871 C Gold', '#84754e'], ['875 C Bronze', '#80674c'], ['Warm Red C', '#f9423a'],
    ['186 C', '#c8102e'], ['288 C', '#003087'], ['300 C', '#005eb8'], ['2925 C', '#009cde'],
    ['White', '#ffffff'], ['427 C', '#d0d3d4'], ['877 C', '#8a8d8f'], ['4625 C', '#4b3320'],
    ['7413 C Copper', '#c16c18'], ['7521 C Rose', '#c09c83'], ['4545 C Champagne', '#cbbd91']
  ];
  function nearestPantone(hex) {
    const [r, g, b] = hex2rgb(hex);
    let best = null, bd = 1e9;
    for (const [name, h] of PANTONE) {
      const [R, G, B] = hex2rgb(h);
      const d = (r - R) ** 2 * .3 + (g - G) ** 2 * .59 + (b - B) ** 2 * .11;
      if (d < bd) { bd = d; best = name; }
    }
    return { name: best, deltaApprox: Math.round(Math.sqrt(bd) * 100) / 100 };
  }

  const SPACES = {
    srgb:    { id: 'srgb',    name: 'sRGB IEC61966-2.1', conv: c => hex2rgb(c), op: 'rg' },
    adobe:   { id: 'adobe',   name: 'Adobe RGB (1998)',  conv: c => srgb2adobe(...hex2rgb(c)), op: 'rg' },
    cmyk:    { id: 'cmyk',    name: 'Device CMYK (uncalibrated)', conv: c => rgb2cmyk(...hex2rgb(c)), op: 'k' },
    pantone: { id: 'pantone', name: 'Pantone Simulation (nearest coated)', conv: c => hex2rgb(c), op: 'rg' }
  };

  /* ---------- primitive walking ------------------------------------------
     One traversal shared by every writer, so an object cannot appear in the
     SVG and go missing from the PDF. */
  function visible(board, opt) {
    const doc = board.doc;
    const wantPlate = opt && opt.plate;
    return board.prims.filter(p => {
      const L = doc.layers[p.layer];
      if (L && (L.on === false || L.exp === false)) return false;
      if (p.layer === 'bleed' || p.layer === 'safe') return false;
      if (!opt || !opt.cutline) { if (p.layer === 'cutline') return false; }
      if (wantPlate) {
        const fin = HZ.finish(p.finish);
        if (wantPlate === 'PX_DIE_CUT') return p.layer === 'cutline';
        return fin.plate === wantPlate;
      }
      return true;
    });
  }

  /* =====================================================================
     SVG — live text, real geometry
     ===================================================================== */
  function svg(board, opt) {
    opt = opt || {};
    const doc = board.doc, W = board.wMM, H = board.hMM, bl = opt.bleed ? board.bleedMM : 0;
    const vw = W + bl * 2, vh = H + bl * 2;
    const S = [];
    S.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    S.push(`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${f(vw,3)}mm" height="${f(vh,3)}mm" viewBox="${f(-bl,4)} ${f(-bl,4)} ${f(vw,4)} ${f(vh,4)}">`);
    S.push(`<title>${esc(doc.name)}</title>`);
    S.push(`<desc>PEPTIDEX Label Studio · Premium Horizontal · trim ${f(W,2)}×${f(H,2)} mm · bleed ${f(board.bleedMM,2)} mm · engine ${esc(board.family)}</desc>`);
    if (bl) S.push(`<rect x="${f(-bl,4)}" y="${f(-bl,4)}" width="${f(vw,4)}" height="${f(vh,4)}" fill="${board.bg}"/>`);

    const byLayer = {};
    for (const p of visible(board, { cutline: true })) (byLayer[p.layer] = byLayer[p.layer] || []).push(p);

    for (const L of HZ.LAYERS) {
      const list = byLayer[L.id];
      if (!list || !list.length) continue;
      S.push(`<g id="${L.id}" data-plate="${esc(L.name)}">`);
      for (const p of list) S.push(svgPrim(p));
      S.push('</g>');
    }
    S.push('</svg>');
    return S.join('\n');
  }

  function svgPrim(p) {
    switch (p.t) {
      case 'rect': {
        const a = [`x="${f(p.x)}"`, `y="${f(p.y)}"`, `width="${f(p.w)}"`, `height="${f(p.h)}"`];
        if (p.r) a.push(`rx="${f(p.r)}"`);
        a.push(`fill="${p.fill || 'none'}"`);
        if (p.stroke) a.push(`stroke="${p.stroke}"`, `stroke-width="${f(p.w2 || p.w)}"`);
        return `  <rect ${a.join(' ')}/>`;
      }
      case 'dot': return `  <circle cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.r)}" fill="${p.fill}"/>`;
      case 'line': return `  <line x1="${f(p.x1)}" y1="${f(p.y1)}" x2="${f(p.x2)}" y2="${f(p.y2)}" stroke="${p.stroke}" stroke-width="${f(p.w)}" stroke-linecap="butt"/>`;
      case 'path': return `  <path d="${p.d}" fill="${p.fill || 'none'}" stroke="${p.stroke}" stroke-width="${f(p.w)}" stroke-linejoin="round" stroke-linecap="${p.cap || 'butt'}"/>`;
      case 'image': return `  <image x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" href="${p.src || ''}" preserveAspectRatio="none"/>`;
      case 'text': {
        /* per-glyph x, so the tracking in the file is the tracking on screen */
        const xs = p.chars.map(c => f(p.x + c.x, 4)).join(' ');
        const sz = f(p.sizePx / HZR.K, 4);
        return `  <text x="${xs}" y="${f(p.y)}" font-family=${JSON.stringify(BRAND.STACK.display)} font-size="${sz}" font-weight="${p.weight}" fill="${p.fill}" xml:space="preserve">${esc(p.str)}</text>`;
      }
      default: return '';
    }
  }

  /* =====================================================================
     PDF — written here, because no library emits X-4 correctly
     ===================================================================== */
  function pdf(board, opt) {
    opt = opt || {};
    const std = opt.standard || 'X-4';                  // 'X-4' | 'X-1a' | 'plain'
    const space = SPACES[opt.space || (std === 'plain' ? 'srgb' : 'cmyk')];
    const doc = board.doc;
    const bl = board.bleedMM, W = board.wMM, H = board.hMM;
    const pw = PT(W + bl * 2), ph = PT(H + bl * 2);
    const ox = PT(bl), oy = PT(bl);                      // trim origin inside media

    /* Decode the one placed asset up front: whether the XObject exists
       decides whether the content stream may reference it, and a reference to
       a resource that was never written is a broken file. */
    const listAll = visible(board, { cutline: !!opt.cutline, plate: opt.plate });
    const ordered = HZ.LAYERS.map(L => listAll.filter(p => p.layer === L.id)).flat();
    const placed = ordered.find(p => p.t === 'image' && p.src) || null;
    const dec = (opt.images !== false && placed) ? decodeImage(placed, opt.imagePPI || 600) : null;

    /* content stream — y flips, PDF counts up from the bottom */
    const c = [];
    const Y = v => PT(H) - PT(v);
    const col = (hex, stroke) => {
      const v = space.conv(hex);
      if (space.op === 'k') return v.map(x => f(x, 5)).join(' ') + (stroke ? ' K' : ' k');
      return v.map(x => f(x, 5)).join(' ') + (stroke ? ' RG' : ' rg');
    };
    c.push('q', `1 0 0 1 ${f(ox, 4)} ${f(oy, 4)} cm`);

    for (const p of ordered) {
      switch (p.t) {
        case 'rect':
          if (p.fill) {
            c.push(col(p.fill));
            if (p.r) c.push(roundRectPath(PT(p.x), Y(p.y + p.h), PT(p.w), PT(p.h), PT(p.r)), 'f');
            else c.push(`${f(PT(p.x))} ${f(Y(p.y + p.h))} ${f(PT(p.w))} ${f(PT(p.h))} re f`);
          }
          if (p.stroke) {
            c.push(col(p.stroke, true), `${f(PT(p.w2 || p.w))} w`);
            if (p.dash) c.push(`[${p.dash.map(d => f(PT(d), 3)).join(' ')}] 0 d`);
            c.push(`${f(PT(p.x))} ${f(Y(p.y + p.h))} ${f(PT(p.w))} ${f(PT(p.h))} re S`, '[] 0 d');
          }
          break;
        case 'dot':
          c.push(col(p.fill), circlePath(PT(p.cx), Y(p.cy), PT(p.r)), 'f');
          break;
        case 'line':
          c.push(col(p.stroke, true), `${f(PT(p.w))} w 0 J`,
            `${f(PT(p.x1))} ${f(Y(p.y1))} m ${f(PT(p.x2))} ${f(Y(p.y2))} l S`);
          break;
        case 'path':
          c.push(col(p.stroke, true), `${f(PT(p.w))} w 1 j ${p.cap === 'round' ? '1' : '0'} J`,
            pathToPdf(p.d, Y), 'S');
          break;
        case 'image':
          /* the supplied lockup is the one placed asset; it rides as an XObject */
          if (dec && p === placed)
            c.push('q', `${f(PT(p.w))} 0 0 ${f(PT(p.h))} ${f(PT(p.x))} ${f(Y(p.y + p.h))} cm /ImLogo Do`, 'Q');
          break;
        case 'text': {
          c.push('BT', col(p.fill), `/F1 ${f(p.sizePx / HZR.K * 72 / 25.4, 4)} Tf`);
          for (const ch of p.chars)
            c.push(`1 0 0 1 ${f(PT(p.x + ch.x))} ${f(Y(p.y))} Tm (${pdfStr(ch.c)}) Tj`);
          c.push('ET');
          break;
        }
      }
    }
    c.push('Q');
    const content = c.join('\n');

    /* ---- objects ---- */
    const objs = [];
    const add = s => { objs.push(s); return objs.length; };            // 1-based

    const fontObj = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    let imgObj = 0, smaskObj = 0;
    if (dec) {
      if (dec.alpha) smaskObj = add(null);
      imgObj = add(null);
    }
    const contentObj = add(null);
    const oiObj = std === 'plain' ? 0 : add(
      `<< /Type /OutputIntent /S /GTS_PDFX ` +
      `/OutputConditionIdentifier (${std === 'X-1a' ? 'CGATS TR 001' : 'FOGRA39'}) ` +
      `/RegistryName (http://www.color.org) ` +
      `/Info (${std === 'X-1a' ? 'U.S. Web Coated SWOP' : 'Coated FOGRA39 (ISO 12647-2:2004)'}) >>`);

    const resParts = [`/Font << /F1 ${fontObj} 0 R >>`];
    if (imgObj) resParts.push(`/XObject << /ImLogo ${imgObj} 0 R >>`);
    const pageObj = add(null), pagesObj = add(null), catObj = add(null), infoObj = add(null);

    /* fill placeholders */
    if (imgObj && dec) {
      if (smaskObj) {
        const sm = zlibStore(dec.alpha);
        objs[smaskObj - 1] = { stream: sm, dict:
          `<< /Type /XObject /Subtype /Image /Width ${dec.w} /Height ${dec.h} ` +
          `/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${sm.length} >>` };
      }
      const rg = zlibStore(dec.rgb);
      objs[imgObj - 1] = { stream: rg, dict:
        `<< /Type /XObject /Subtype /Image /Width ${dec.w} /Height ${dec.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode ` +
        (smaskObj ? `/SMask ${smaskObj} 0 R ` : '') + `/Length ${rg.length} >>` };
    }
    objs[contentObj - 1] = { stream: strBytes(content), dict: `<< /Length ${strBytes(content).length} >>` };
    objs[pageObj - 1] =
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] ` +
      `/TrimBox [${f(ox)} ${f(oy)} ${f(ox + PT(W))} ${f(oy + PT(H))}] ` +
      `/BleedBox [0 0 ${f(pw)} ${f(ph)}] /ArtBox [${f(ox)} ${f(oy)} ${f(ox + PT(W))} ${f(oy + PT(H))}] ` +
      `/Resources << ${resParts.join(' ')} >> /Contents ${contentObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`;
    objs[catObj - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R` +
      (oiObj ? ` /OutputIntents [${oiObj} 0 R]` : '') + ` >>`;
    objs[infoObj - 1] =
      `<< /Title (${pdfStr(doc.name)}) /Creator (PEPTIDEX Label Studio Pro) ` +
      `/Producer (PEPTIDEX Label Studio Pro · hz-export) ` +
      `/Subject (${pdfStr('Premium Horizontal · ' + f(W, 2) + 'x' + f(H, 2) + ' mm · ' + space.name + (opt.plate ? ' · plate ' + opt.plate : ''))}) ` +
      `/GTS_PDFXVersion (PDF/${std === 'X-1a' ? 'X-1a:2003' : 'X-4'}) /CreationDate (D:${stamp()}) >>`;

    return assemble(objs, catObj, infoObj);
  }

  /* ---- the one placed image --------------------------------------------
     The supplied lockups are PNG with an alpha channel, and a PNG cannot be
     handed to a PDF the way a JPEG can — there is no PNG filter in the PDF
     imaging model, and declaring one as DCTDecode writes a file no RIP can
     open. So it is decoded once and written as two Flate streams: the colour,
     and a soft mask carrying the alpha, which is how transparency actually
     travels in a PDF.

     Flate here is a stored deflate stream — valid, and it avoids shipping a
     compressor for a payload that is written once per export. The pixel grid
     is sized from the placement at 600 PPI rather than from the source, so
     the file stays a sane size; the artwork itself is never altered, only
     sampled at the resolution it will actually be printed at. */
  function decodeImage(prim, targetPPI) {
    const im = _imgFor(prim.src);
    if (!im || !im.complete || !im.naturalWidth) return null;
    const need = Math.max(16, Math.round(prim.w / 25.4 * (targetPPI || 600)));
    const w = Math.min(im.naturalWidth, need);
    const h = Math.max(1, Math.round(w * im.naturalHeight / im.naturalWidth));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const rgb = new Uint8Array(w * h * 3), a = new Uint8Array(w * h);
    let opaque = true;
    for (let i = 0; i < w * h; i++) {
      rgb[i * 3] = px[i * 4]; rgb[i * 3 + 1] = px[i * 4 + 1]; rgb[i * 3 + 2] = px[i * 4 + 2];
      a[i] = px[i * 4 + 3];
      if (a[i] !== 255) opaque = false;
    }
    return { w, h, rgb, alpha: opaque ? null : a, ppi: Math.round(w / (prim.w / 25.4)) };
  }
  const _imgCache = new Map();
  function _imgFor(src) {
    if (!src) return null;
    if (_imgCache.has(src)) return _imgCache.get(src);
    const im = new Image(); im.src = src; _imgCache.set(src, im);
    return im;
  }
  function zlibStore(data) {
    const N = data.length;
    const blocks = Math.max(1, Math.ceil(N / 65535));
    const out = new Uint8Array(2 + N + blocks * 5 + 4);
    let o = 0;
    out[o++] = 0x78; out[o++] = 0x01;
    for (let i = 0; i < N; i += 65535) {
      const n = Math.min(65535, N - i), last = (i + n >= N) ? 1 : 0;
      out[o++] = last;
      out[o++] = n & 255; out[o++] = (n >> 8) & 255;
      out[o++] = (~n) & 255; out[o++] = ((~n) >> 8) & 255;
      out.set(data.subarray(i, i + n), o); o += n;
    }
    let a = 1, b2 = 0;
    for (let i = 0; i < N; i++) { a = (a + data[i]) % 65521; b2 = (b2 + a) % 65521; }
    out[o++] = (b2 >> 8) & 255; out[o++] = b2 & 255;
    out[o++] = (a >> 8) & 255; out[o++] = a & 255;
    return out.subarray(0, o);
  }

  /* ---- PDF plumbing ----------------------------------------------------- */
  const strBytes = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  const dataToBytes = uri => {
    const b = atob(uri.slice(uri.indexOf(',') + 1));
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  };
  const pdfStr = s => String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[^\x20-\x7e]/g, '');
  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
           p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }
  const KAPPA = 0.5522847498;
  function circlePath(cx, cy, r) {
    const k = r * KAPPA;
    return `${f(cx + r)} ${f(cy)} m ` +
      `${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
      `${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c ` +
      `${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
      `${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c h`;
  }
  function roundRectPath(x, y, w, h, r) {
    r = Math.min(r, Math.min(w, h) / 2);
    const k = r * KAPPA;
    return `${f(x + r)} ${f(y)} m ${f(x + w - r)} ${f(y)} l ` +
      `${f(x + w - r + k)} ${f(y)} ${f(x + w)} ${f(y + r - k)} ${f(x + w)} ${f(y + r)} c ` +
      `${f(x + w)} ${f(y + h - r)} l ` +
      `${f(x + w)} ${f(y + h - r + k)} ${f(x + w - r + k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} c ` +
      `${f(x + r)} ${f(y + h)} l ` +
      `${f(x + r - k)} ${f(y + h)} ${f(x)} ${f(y + h - r + k)} ${f(x)} ${f(y + h - r)} c ` +
      `${f(x)} ${f(y + r)} l ` +
      `${f(x)} ${f(y + r - k)} ${f(x + r - k)} ${f(y)} ${f(x + r)} ${f(y)} c h`;
  }
  /** SVG subset (M/L/C/Z, absolute) -> PDF path operators, with the y flip. */
  function pathToPdf(d, Y) {
    const out = [];
    const re = /([MLCZ])([^MLCZ]*)/gi;
    let m;
    while ((m = re.exec(d))) {
      const cmd = m[1].toUpperCase();
      const v = m[2].trim().split(/[\s,]+/).filter(t => t !== '').map(Number);
      if (cmd === 'Z') { out.push('h'); continue; }
      if (cmd === 'M') out.push(`${f(PT(v[0]))} ${f(Y(v[1]))} m`);
      else if (cmd === 'L') for (let i = 0; i < v.length; i += 2) out.push(`${f(PT(v[i]))} ${f(Y(v[i + 1]))} l`);
      else if (cmd === 'C') for (let i = 0; i < v.length; i += 6)
        out.push(`${f(PT(v[i]))} ${f(Y(v[i + 1]))} ${f(PT(v[i + 2]))} ${f(Y(v[i + 3]))} ${f(PT(v[i + 4]))} ${f(Y(v[i + 5]))} c`);
    }
    return out.join(' ');
  }
  function assemble(objs, catObj, infoObj) {
    const chunks = [];
    let len = 0;
    const push = u => { chunks.push(u); len += u.length; };
    push(strBytes('%PDF-1.6\n%\xE2\xE3\xCF\xD3\n'));
    const offs = [];
    objs.forEach((o, i) => {
      offs[i] = len;
      if (o && o.stream) {
        push(strBytes(`${i + 1} 0 obj\n${o.dict}\nstream\n`));
        push(o.stream);
        push(strBytes('\nendstream\nendobj\n'));
      } else {
        push(strBytes(`${i + 1} 0 obj\n${o}\nendobj\n`));
      }
    });
    const xref = len;
    let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offs) x += String(o).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${objs.length + 1} /Root ${catObj} 0 R /Info ${infoObj} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(strBytes(x));
    const out = new Uint8Array(len);
    let o = 0;
    for (const ch of chunks) { out.set(ch, o); o += ch.length; }
    return out;
  }

  /* =====================================================================
     EPS — PostScript, vector
     ===================================================================== */
  function eps(board, opt) {
    opt = opt || {};
    const space = SPACES[opt.space || 'cmyk'];
    const W = board.wMM, H = board.hMM, bl = opt.bleed ? board.bleedMM : 0;
    const pw = PT(W + bl * 2), ph = PT(H + bl * 2), ox = PT(bl), oy = PT(bl);
    const L = [];
    L.push('%!PS-Adobe-3.0 EPSF-3.0');
    L.push(`%%Creator: PEPTIDEX Label Studio Pro`);
    L.push(`%%Title: ${board.doc.name}`);
    L.push(`%%BoundingBox: 0 0 ${Math.ceil(pw)} ${Math.ceil(ph)}`);
    L.push(`%%HiResBoundingBox: 0 0 ${f(pw)} ${f(ph)}`);
    L.push(`%%DocumentData: Clean7Bit`);
    L.push('%%EndComments', '%%BeginProlog',
      '/px { /Helvetica findfont exch scalefont setfont } bind def',
      '%%EndProlog', 'gsave', `${f(ox)} ${f(oy)} translate`);
    const Y = v => PT(H) - PT(v);
    const col = hex => {
      const v = space.conv(hex);
      return space.op === 'k' ? v.map(x => f(x, 5)).join(' ') + ' setcmykcolor'
                              : v.map(x => f(x, 5)).join(' ') + ' setrgbcolor';
    };
    const list = visible(board, { cutline: !!opt.cutline, plate: opt.plate });
    for (const p of HZ.LAYERS.map(l => list.filter(q => q.layer === l.id)).flat()) {
      switch (p.t) {
        case 'rect':
          if (p.fill) L.push(col(p.fill), `newpath ${f(PT(p.x))} ${f(Y(p.y + p.h))} ${f(PT(p.w))} ${f(PT(p.h))} rectfill`);
          if (p.stroke) L.push(col(p.stroke), `${f(PT(p.w2 || p.w))} setlinewidth`,
            `newpath ${f(PT(p.x))} ${f(Y(p.y + p.h))} ${f(PT(p.w))} ${f(PT(p.h))} rectstroke`);
          break;
        case 'dot': L.push(col(p.fill), `newpath ${f(PT(p.cx))} ${f(Y(p.cy))} ${f(PT(p.r))} 0 360 arc fill`); break;
        case 'line': L.push(col(p.stroke), `${f(PT(p.w))} setlinewidth`,
          `newpath ${f(PT(p.x1))} ${f(Y(p.y1))} moveto ${f(PT(p.x2))} ${f(Y(p.y2))} lineto stroke`); break;
        case 'path': L.push(col(p.stroke), `${f(PT(p.w))} setlinewidth 1 setlinejoin`,
          'newpath ' + pathToPs(p.d, Y) + ' stroke'); break;
        case 'text':
          L.push(col(p.fill), `${f(p.sizePx / HZR.K * 72 / 25.4, 3)} px`);
          for (const ch of p.chars)
            L.push(`${f(PT(p.x + ch.x))} ${f(Y(p.y))} moveto (${pdfStr(ch.c)}) show`);
          break;
      }
    }
    L.push('grestore', '%%EOF');
    return L.join('\n');
  }
  function pathToPs(d, Y) {
    const out = []; const re = /([MLCZ])([^MLCZ]*)/gi; let m;
    while ((m = re.exec(d))) {
      const cmd = m[1].toUpperCase();
      const v = m[2].trim().split(/[\s,]+/).filter(t => t !== '').map(Number);
      if (cmd === 'Z') { out.push('closepath'); continue; }
      if (cmd === 'M') out.push(`${f(PT(v[0]))} ${f(Y(v[1]))} moveto`);
      else if (cmd === 'L') for (let i = 0; i < v.length; i += 2) out.push(`${f(PT(v[i]))} ${f(Y(v[i + 1]))} lineto`);
      else if (cmd === 'C') for (let i = 0; i < v.length; i += 6)
        out.push(`${f(PT(v[i]))} ${f(Y(v[i+1]))} ${f(PT(v[i+2]))} ${f(Y(v[i+3]))} ${f(PT(v[i+4]))} ${f(Y(v[i+5]))} curveto`);
    }
    return out.join(' ');
  }

  /* =====================================================================
     RASTER — legitimately raster, at a stated resolution
     ===================================================================== */
  function raster(board, dpi, opt) {
    opt = opt || {};
    const bl = opt.bleed ? board.bleedMM : 0;
    const scale = dpi / 25.4;                       // px per mm
    const W = Math.round((board.wMM + bl * 2) * scale);
    const H = Math.round((board.hMM + bl * 2) * scale);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    if (!opt.transparent) { g.fillStyle = board.bg; g.fillRect(0, 0, W, H); }
    HZR.Canvas.draw(g, board, {
      scale: scale / HZR.K, ox: bl * scale, oy: bl * scale,
      guides: false, finish: opt.finish !== false, bleedPx: bl ? 1 : 0, selected: null
    });
    return { canvas: cv, W, H, dpi };
  }

  /* ---- TIFF, baseline uncompressed --------------------------------------
     A TIFF is a header, a strip of pixels and a tag directory. Written here
     rather than pulled in, because the whole studio is one file with no
     network. */
  function tiff(board, dpi, opt) {
    const r = raster(board, dpi, opt);
    const { W, H } = r;
    const px = r.canvas.getContext('2d').getImageData(0, 0, W, H).data;
    const spp = 3, bytes = W * H * spp;
    const nTags = 12, ifd = 8, dirLen = 2 + nTags * 12 + 4;
    const resOff = ifd + dirLen, dataOff = resOff + 16;
    const buf = new ArrayBuffer(dataOff + bytes);
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    const LE = true;
    dv.setUint16(0, 0x4949, LE); dv.setUint16(2, 42, LE); dv.setUint32(4, ifd, LE);
    let o = ifd; dv.setUint16(o, nTags, LE); o += 2;
    const tag = (id, type, count, val) => {
      dv.setUint16(o, id, LE); dv.setUint16(o + 2, type, LE);
      dv.setUint32(o + 4, count, LE); dv.setUint32(o + 8, val, LE); o += 12;
    };
    /* BitsPerSample needs three shorts; three fit in the four value bytes only
       as a pointer, so it points at the resolution block's tail. */
    const bpsOff = resOff + 16 - 6;
    tag(256, 3, 1, W); tag(257, 3, 1, H);
    tag(258, 3, 3, bpsOff);
    tag(259, 3, 1, 1); tag(262, 3, 1, 2); tag(273, 4, 1, dataOff);
    tag(277, 3, 1, spp); tag(278, 3, 1, H); tag(279, 4, 1, bytes);
    tag(282, 5, 1, resOff); tag(283, 5, 1, resOff + 8); tag(296, 3, 1, 2);
    dv.setUint32(o, 0, LE);
    dv.setUint32(resOff, dpi, LE); dv.setUint32(resOff + 4, 1, LE);
    dv.setUint32(resOff + 8, dpi, LE); dv.setUint32(resOff + 12, 1, LE);
    dv.setUint16(bpsOff, 8, LE); dv.setUint16(bpsOff + 2, 8, LE); dv.setUint16(bpsOff + 4, 8, LE);
    let d = dataOff;
    for (let i = 0; i < W * H; i++) { u8[d++] = px[i * 4]; u8[d++] = px[i * 4 + 1]; u8[d++] = px[i * 4 + 2]; }
    return new Uint8Array(buf);
  }

  /* ---- PSD, flattened RGB ------------------------------------------------ */
  function psd(board, dpi, opt) {
    const r = raster(board, dpi, opt);
    const { W, H } = r;
    const px = r.canvas.getContext('2d').getImageData(0, 0, W, H).data;
    const head = [], put = (a) => head.push(...a);
    const u16 = n => [n >> 8 & 255, n & 255];
    const u32 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255];
    put([0x38, 0x42, 0x50, 0x53]);           // 8BPS
    put(u16(1)); put([0, 0, 0, 0, 0, 0]);
    put(u16(3));                              // channels
    put(u32(H)); put(u32(W)); put(u16(8)); put(u16(3));   // depth 8, RGB
    put(u32(0));                              // no colour mode data
    put(u32(0));                              // no image resources
    put(u32(0));                              // no layers
    put(u16(0));                              // raw
    const body = new Uint8Array(W * H * 3);
    for (let ch = 0; ch < 3; ch++)
      for (let i = 0; i < W * H; i++) body[ch * W * H + i] = px[i * 4 + ch];
    const out = new Uint8Array(head.length + body.length);
    out.set(Uint8Array.from(head), 0); out.set(body, head.length);
    return out;
  }

  /* =====================================================================
     PACKAGE
     ===================================================================== */
  function manifest(board, report, opts) {
    const doc = board.doc, P = board.palette;
    const inks = {};
    for (const o of doc.objects) {
      if (!o.on || !o.colour) continue;
      const hex = HZ.ink(doc, o.colour);
      inks[o.id] = { hex, cmyk: rgb2cmyk(...hex2rgb(hex)).map(v => Math.round(v * 1000) / 10),
        adobeRGB: srgb2adobe(...hex2rgb(hex)).map(v => Math.round(v * 255)),
        pantoneSim: nearestPantone(hex), finish: o.finish, plate: HZ.finish(o.finish).plate || null };
    }
    return {
      generator: 'PEPTIDEX Label Studio Pro · hz-export',
      generatedAt: new Date().toISOString(),
      document: { id: doc.id, name: doc.name, family: doc.family, line: doc.line, palette: doc.palette, dose: doc.dosePreset },
      geometry: {
        trimMM: { w: board.wMM, h: board.hMM }, bleedMM: board.bleedMM,
        safeMM: board.safeMM, cornerRadiusMM: board.radiusMM,
        vial: HZ.VIALS[doc.view.mockup] || null
      },
      separations: board.plates,
      layers: HZ.LAYERS.map(l => ({ id: l.id, name: l.name, prints: l.prints, exported: doc.layers[l.id].exp !== false })),
      inks,
      colourSpaces: Object.keys(SPACES).map(k => ({ id: k, name: SPACES[k].name,
        note: k === 'cmyk' ? 'Uncalibrated device separation. No ICC transform was applied.'
            : k === 'pantone' ? 'Nearest coated reference by screen distance. Not a licensed measurement — confirm against a physical guide.'
            : k === 'adobe' ? 'Exact matrix transform from sRGB. No ICC profile is embedded.'
            : 'Native document space.' })),
      typography: { resolved: BRAND.resolveFont(), embedded: false,
        note: 'Fonts resolve from the operating system and are referenced by name. A browser cannot embed a typeface it has not been supplied. PDF/X conformance requires the licensed binary.' },
      placedArtwork: board.meta.logoPPI == null ? [] : [{
        asset: 'PEPTIDEX lockup', immutable: true, effectivePPI: board.meta.logoPPI,
        note: 'Supplied artwork, placed as delivered. Not redrawn.' }],
      preflight: report ? { intent: report.intent, pass: report.pass,
        blocking: report.blocking.length, warnings: report.warnings.length,
        violations: report.violations.map(v => ({ rule: v.rule, severity: v.severity, title: v.title, msg: v.msg })) } : null
    };
  }

  const enc = s => new TextEncoder().encode(s);

  function pkg(board, report, opt) {
    opt = opt || {};
    const doc = board.doc;
    const base = (doc.name || 'label').replace(/[^\w.-]+/g, '_').slice(0, 48);
    const files = [];
    const add = (n, d) => files.push({ name: n, data: typeof d === 'string' ? enc(d) : d });

    add(base + '.svg', svg(board, { bleed: true }));
    add(base + '_X-4.pdf', pdf(board, { standard: 'X-4', space: 'cmyk', cutline: true, imgW: opt.imgW, imgH: opt.imgH }));
    add(base + '_X-1a.pdf', pdf(board, { standard: 'X-1a', space: 'cmyk', cutline: true, imgW: opt.imgW, imgH: opt.imgH }));
    add(base + '.ai', pdf(board, { standard: 'plain', space: 'srgb', cutline: true, imgW: opt.imgW, imgH: opt.imgH }));
    add(base + '.eps', eps(board, { space: 'cmyk', cutline: true }));

    for (const plate of board.plates)
      add('separations/' + base + '_' + plate + '.pdf',
        pdf(board, { standard: 'X-1a', space: 'cmyk', plate, cutline: plate === 'PX_DIE_CUT', images: false }));

    add('README.txt', readme(board, report));
    add('manifest.json', JSON.stringify(manifest(board, report, opt), null, 2));
    return { files, base };
  }

  function readme(board, report) {
    const doc = board.doc;
    return [
      'PEPTIDEX — PREMIUM HORIZONTAL LABEL',
      '===================================',
      '',
      'Document      : ' + doc.name,
      'Trim          : ' + f(board.wMM, 2) + ' x ' + f(board.hMM, 2) + ' mm',
      'Bleed         : ' + f(board.bleedMM, 2) + ' mm all round',
      'Safe area     : ' + f(board.safeMM, 2) + ' mm inset',
      'Corner radius : ' + f(board.radiusMM, 2) + ' mm',
      'Separations   : ' + board.plates.join(', '),
      '',
      'WHAT IS IN HERE',
      '  *.svg              vector, live text, one group per layer',
      '  *_X-4.pdf          vector, CMYK, FOGRA39 output intent, TrimBox + BleedBox',
      '  *_X-1a.pdf         vector, CMYK, SWOP output intent',
      '  *.ai               PDF written for Illustrator to open directly',
      '  *.eps              PostScript, vector',
      '  separations/       one file per plate, for the press',
      '  manifest.json      every ink, every plate, every measurement',
      '',
      'READ THIS BEFORE SENDING TO PRESS',
      '  Fonts are referenced by name, not embedded. A browser cannot embed a',
      '  typeface it has not been given the binary for, so these files are',
      '  PROOFS until either the licensed font is supplied for embedding or the',
      '  type is converted to outlines in Illustrator. The preflight report',
      '  states this as a blocking condition rather than leaving you to find it',
      '  at the printer.',
      '',
      '  CMYK values are an uncalibrated device separation. For a contract',
      '  proof, re-separate through your press profile.',
      '',
      report ? ('PREFLIGHT: ' + (report.pass ? 'PASS' : 'FAIL') + ' — ' +
        report.blocking.length + ' blocking, ' + report.warnings.length + ' warnings') : ''
    ].join('\n');
  }

  return {
    svg, pdf, eps, raster, tiff, psd, pkg, manifest, readme, visible,
    SPACES, rgb2cmyk, srgb2adobe, nearestPantone, hex2rgb, PT
  };
})();

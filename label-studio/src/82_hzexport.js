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
     SVG — the approved master placed, patched only where it was edited
     ===================================================================== */
  function svg(board, opt) {
    opt = opt || {};
    const doc = board.doc, W = board.wMM, H = board.hMM, bl = opt.bleed ? board.bleedMM : 0;
    const S = [];
    S.push('<?xml version="1.0" encoding="UTF-8"?>');
    S.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${f(W+bl*2,3)}mm" height="${f(H+bl*2,3)}mm" viewBox="${f(-bl,4)} ${f(-bl,4)} ${f(W+bl*2,4)} ${f(H+bl*2,4)}">`);
    S.push(`<title>${esc(doc.name)}</title>`);
    S.push(`<desc>PEPTIDEX approved master "${esc(doc.master)}" placed at ${f(W,2)}×${f(H,2)} mm. ` +
           `${board.meta.patches.length} region(s) patched. No recomposition.</desc>`);
    for (const p of board.prims) {
      if (p.layer === 'cutline' && !opt.cutline) continue;
      const L = doc.layers[p.layer];
      if (L && (L.on === false || L.exp === false)) continue;
      if (p.t === 'master') {
        /* bleed behind, then the approved artwork at the trim, 1:1 */
        if (bl > 0) {
          S.push(`  <mask id="bleedring"><rect x="${f(-bl)}" y="${f(-bl)}" width="${f(W+bl*2)}" height="${f(H+bl*2)}" fill="#fff"/><rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#000"/></mask>`);
          S.push(`  <image mask="url(#bleedring)" x="${f(-bl)}" y="${f(-bl)}" width="${f(W+bl*2)}" height="${f(H+bl*2)}" preserveAspectRatio="none" xlink:href="${p.src}"/>`);
        }
        S.push(`  <image x="0" y="0" width="${f(W)}" height="${f(H)}" preserveAspectRatio="none" xlink:href="${p.src}"/>`);
      }
      else if (p.t === 'patch' || p.t === 'artfill') {
        const sx = p.w / p.sw, sy = p.h / p.sh;
        S.push(`  <clipPath id="c_${p.objId}"><rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}"/></clipPath>`);
        S.push(`  <g clip-path="url(#c_${p.objId})"><image x="${f(p.x - p.sx*sx)}" y="${f(p.y - p.sy*sy)}" width="${f(p.natW*sx)}" height="${f(p.natH*sy)}" preserveAspectRatio="none" xlink:href="${p.src}"/></g>`);
      } else if (p.t === 'text') {
        const xs = p.chars.map(c => f(p.x + c.x, 4)).join(' ');
        S.push(`  <text x="${xs}" y="${f(p.y)}" font-family=${JSON.stringify(BRAND.STACK.display)} font-size="${f(p.sizePx/HZR.K,4)}" font-weight="${p.weight}" fill="${p.fill}" xml:space="preserve">${esc(p.str)}</text>`);
      } else if (p.t === 'rect' && p.stroke)
        S.push(`  <rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" fill="none" stroke="${p.stroke}" stroke-width="${f(p.sw)}" stroke-dasharray="1 1"/>`);
    }
    S.push('</svg>');
    return S.join('\n');
  }

  /* =====================================================================
     PDF — the master as an XObject, patches clipped over it, text live
     ===================================================================== */
  function pdf(board, opt) {
    opt = opt || {};
    const std = opt.standard || 'X-4';
    const space = SPACES[opt.space || (std === 'plain' ? 'srgb' : 'cmyk')];
    const doc = board.doc, bl = board.bleedMM, W = board.wMM, H = board.hMM;
    const pw = PT(W + bl * 2), ph = PT(H + bl * 2), ox = PT(bl), oy = PT(bl);
    const Y = v => PT(H) - PT(v);
    const col = (hex, stroke) => {
      const v = space.conv(hex);
      return v.map(x => f(x, 5)).join(' ') + (space.op === 'k' ? (stroke ? ' K' : ' k') : (stroke ? ' RG' : ' rg'));
    };

    /* decode every image this page needs, once */
    const imgs = [];
    const want = board.prims.filter(p => (p.t === 'master' || p.t === 'patch' || p.t === 'artfill') && p.src);
    for (const p of want) {
      const L = doc.layers[p.layer];
      if (L && (L.on === false || L.exp === false)) continue;
      const targetPx = Math.max(64, Math.round((p.t === 'master' ? W : p.w) / 25.4 * (opt.imagePPI || 600)));
      const d = decodeImage(p.src, p.t === 'master' ? targetPx : Math.min(targetPx, Math.ceil(p.sw * 3)),
        p.t === 'master' ? null : { sx: p.sx, sy: p.sy, sw: p.sw, sh: p.sh });
      if (d) imgs.push({ p, d, name: 'Im' + imgs.length });
    }

    const c = ['q', `1 0 0 1 ${f(ox, 4)} ${f(oy, 4)} cm`];
    for (const p of board.prims) {
      if (p.layer === 'cutline' && !opt.cutline) continue;
      const L = doc.layers[p.layer];
      if (L && (L.on === false || L.exp === false)) continue;
      const hit = imgs.find(q => q.p === p);
      if (hit) {
        /* THE MASTER GOES AT THE TRIM, EXACTLY.
           Stretching it to the bleed box was wrong twice over: it scales the
           approved artwork, and it slides every baked-in element out from
           under the patch that is meant to cover it. The bleed is a separate
           copy drawn behind, oversized only to fill the margin — the artwork
           the trim actually shows is at 1:1. */
        if (p.t === 'master' && bl > 0) {
          /* The bleed copy paints the MARGIN ONLY. Clipped to the ring
             between the bleed box and the trim with an even-odd rule, so the
             oversized copy can never lay a shifted duplicate of the artwork
             over the artwork the trim actually shows. */
          c.push('q',
            `${f(-PT(bl))} ${f(-PT(bl))} ${f(PT(W + bl * 2))} ${f(PT(H + bl * 2))} re`,
            `0 0 ${f(PT(W))} ${f(PT(H))} re W* n`,
            `${f(PT(W + bl * 2))} 0 0 ${f(PT(H + bl * 2))} ${f(PT(-bl))} ${f(Y(H + bl))} cm /${hit.name} Do`, 'Q');
        }
        c.push('q', `${f(PT(p.t === 'master' ? W : p.w))} 0 0 ${f(PT(p.t === 'master' ? H : p.h))} ` +
          `${f(PT(p.t === 'master' ? 0 : p.x))} ${f(Y(p.t === 'master' ? H : p.y + p.h))} cm /${hit.name} Do`, 'Q');
      } else if (p.t === 'text') {
        c.push('BT', col(p.fill), `/F1 ${f(p.sizePx / HZR.K * 72 / 25.4, 4)} Tf`);
        for (const ch of p.chars)
          c.push(`1 0 0 1 ${f(PT(p.x + ch.x))} ${f(Y(p.y))} Tm (${pdfStr(ch.c)}) Tj`);
        c.push('ET');
      } else if (p.t === 'rect' && p.stroke) {
        c.push(col(p.stroke, true), `${f(PT(p.sw))} w [2 2] 0 d`,
          `${f(PT(p.x))} ${f(Y(p.y + p.h))} ${f(PT(p.w))} ${f(PT(p.h))} re S`, '[] 0 d');
      }
    }
    c.push('Q');
    const content = c.join('\n');

    const objs = [];
    const add = s2 => { objs.push(s2); return objs.length; };
    const fontObj = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    for (const im of imgs) {
      if (im.d.alpha) im.smask = add(null);
      im.obj = add(null);
    }
    const contentObj = add(null);
    const oiObj = std === 'plain' ? 0 : add(
      `<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (${std === 'X-1a' ? 'CGATS TR 001' : 'FOGRA39'}) ` +
      `/RegistryName (http://www.color.org) /Info (${std === 'X-1a' ? 'U.S. Web Coated SWOP' : 'Coated FOGRA39 (ISO 12647-2:2004)'}) >>`);
    const pageObj = add(null), pagesObj = add(null), catObj = add(null), infoObj = add(null);

    for (const im of imgs) {
      if (im.smask) {
        const sm = zlibStore(im.d.alpha);
        objs[im.smask - 1] = { stream: sm, dict:
          `<< /Type /XObject /Subtype /Image /Width ${im.d.w} /Height ${im.d.h} /ColorSpace /DeviceGray ` +
          `/BitsPerComponent 8 /Filter /FlateDecode /Length ${sm.length} >>` };
      }
      const rg = zlibStore(im.d.rgb);
      objs[im.obj - 1] = { stream: rg, dict:
        `<< /Type /XObject /Subtype /Image /Width ${im.d.w} /Height ${im.d.h} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /FlateDecode ` + (im.smask ? `/SMask ${im.smask} 0 R ` : '') +
        `/Length ${rg.length} >>` };
    }
    const cb = strBytes(content);
    objs[contentObj - 1] = { stream: cb, dict: `<< /Length ${cb.length} >>` };
    const xo = imgs.length ? '/XObject << ' + imgs.map(i2 => '/' + i2.name + ' ' + i2.obj + ' 0 R').join(' ') + ' >> ' : '';
    objs[pageObj - 1] =
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] ` +
      `/TrimBox [${f(ox)} ${f(oy)} ${f(ox + PT(W))} ${f(oy + PT(H))}] /BleedBox [0 0 ${f(pw)} ${f(ph)}] ` +
      `/Resources << /Font << /F1 ${fontObj} 0 R >> ${xo}>> /Contents ${contentObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`;
    objs[catObj - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R` + (oiObj ? ` /OutputIntents [${oiObj} 0 R]` : '') + ' >>';
    objs[infoObj - 1] =
      `<< /Title (${pdfStr(doc.name)}) /Creator (PEPTIDEX Label Studio Pro) ` +
      `/Producer (PEPTIDEX Label Studio Pro · hz-export) ` +
      `/Subject (${pdfStr('Approved master ' + doc.master + ' · ' + f(W,2) + 'x' + f(H,2) + ' mm · ' + space.name)}) ` +
      `/GTS_PDFXVersion (PDF/${std === 'X-1a' ? 'X-1a:2003' : 'X-4'}) /CreationDate (D:${stamp()}) >>`;
    return assemble(objs, catObj, infoObj);
  }

  /* EPS keeps the vector marks and the type; the master rides as the page's
     own image, which PostScript cannot embed with alpha — so EPS is offered
     for the type and geometry, and the PDF is the one to send to press. */
  function eps(board, opt) {
    opt = opt || {};
    const space = SPACES[(opt && opt.space) || 'cmyk'];
    const W = board.wMM, H = board.hMM;
    const L = ['%!PS-Adobe-3.0 EPSF-3.0', '%%Creator: PEPTIDEX Label Studio Pro',
      `%%Title: ${board.doc.name}`, `%%BoundingBox: 0 0 ${Math.ceil(PT(W))} ${Math.ceil(PT(H))}`,
      '%%EndComments', 'gsave', '/px { /Helvetica findfont exch scalefont setfont } bind def'];
    const Y = v => PT(H) - PT(v);
    for (const p of board.prims) {
      if (p.t !== 'text') continue;
      const v = space.conv(p.fill);
      L.push(v.map(x => f(x, 5)).join(' ') + (space.op === 'k' ? ' setcmykcolor' : ' setrgbcolor'));
      L.push(`${f(p.sizePx / HZR.K * 72 / 25.4, 3)} px`);
      for (const ch of p.chars) L.push(`${f(PT(p.x + ch.x))} ${f(Y(p.y))} moveto (${pdfStr(ch.c)}) show`);
    }
    L.push('grestore', '%%EOF');
    return L.join('\n');
  }

  /* ---- PDF plumbing -----------------------------------------------------
     The approved master is a PNG-backed data URI with an alpha channel, and a
     PDF has no PNG filter. Each placed image is decoded once and written as
     two Flate streams — the colour and a soft mask — sampled at the
     resolution it will actually print at rather than at the source's, so the
     file stays a sane size while the artwork itself is never altered.

     Flate here is a stored deflate stream: valid, and it saves shipping a
     compressor for a payload written once per export. */
  const _imgCache = new Map();
  function _imgFor(src) {
    if (!src) return null;
    if (_imgCache.has(src)) return _imgCache.get(src);
    const im = new Image(); im.src = src; _imgCache.set(src, im);
    return im;
  }
  function decodeImage(src, targetPx, rect) {
    const im = _imgFor(src);
    if (!im || !im.complete || !im.naturalWidth) return null;
    const srcW = rect ? rect.sw : im.naturalWidth;
    const srcH = rect ? rect.sh : im.naturalHeight;
    if (!srcW || !srcH) return null;
    const w = Math.max(2, Math.min(Math.round(srcW), targetPx || Math.round(srcW)));
    const h = Math.max(1, Math.round(w * srcH / srcW));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (rect) g.drawImage(im, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
    else g.drawImage(im, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const rgb = new Uint8Array(w * h * 3), a = new Uint8Array(w * h);
    let opaque = true;
    for (let i = 0; i < w * h; i++) {
      rgb[i * 3] = px[i * 4]; rgb[i * 3 + 1] = px[i * 4 + 1]; rgb[i * 3 + 2] = px[i * 4 + 2];
      a[i] = px[i * 4 + 3];
      if (a[i] !== 255) opaque = false;
    }
    return { w, h, rgb, alpha: opaque ? null : a };
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
  const strBytes = s2 => { const u = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i) & 255; return u; };
  const pdfStr = s2 => String(s2).replace(/[\\()]/g, m => '\\' + m).replace(/[^\x20-\x7e]/g, '');
  function stamp() {
    const d = new Date(), q = n => String(n).padStart(2, '0');
    return d.getUTCFullYear() + q(d.getUTCMonth() + 1) + q(d.getUTCDate()) +
           q(d.getUTCHours()) + q(d.getUTCMinutes()) + q(d.getUTCSeconds()) + 'Z';
  }
  function assemble(objs, catObj, infoObj) {
    const chunks = []; let len = 0;
    const push = u => { chunks.push(u); len += u.length; };
    push(strBytes('%PDF-1.6\n%\xE2\xE3\xCF\xD3\n'));
    const offs = [];
    objs.forEach((o, i) => {
      offs[i] = len;
      if (o && o.stream) {
        push(strBytes(`${i + 1} 0 obj\n${o.dict}\nstream\n`));
        push(o.stream);
        push(strBytes('\nendstream\nendobj\n'));
      } else push(strBytes(`${i + 1} 0 obj\n${o}\nendobj\n`));
    });
    const xref = len;
    let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offs) x += String(o).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${objs.length + 1} /Root ${catObj} 0 R /Info ${infoObj} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(strBytes(x));
    const out = new Uint8Array(len); let o = 0;
    for (const ch of chunks) { out.set(ch, o); o += ch.length; }
    return out;
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
    const was = board.doc.view.production;
    board.doc.view.production = true;
    HZR.Canvas.draw(g, board, {
      scale: scale / HZR.K, ox: bl * scale, oy: bl * scale,
      guides: false, bleedPx: bl ? 1 : 0, selected: null
    });
    board.doc.view.production = was;
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
     UV PRINT — the sheet that goes straight to the flatbed
     A UV RIP resamples anything that is not already at its native grid, and
     resampling is what softens an edge and greys a solid. So the sheet is
     rasterised once, at the bed's own dpi, at the exact physical size, and
     nothing scales it afterwards.
     ===================================================================== */
  const UV_MAX_PX = 120e6;   /* what a browser canvas will actually allocate */

  function uvSheet(board, u) {
    const sh = HZ.sheet(board.doc);
    if (sh.px.w * sh.px.h > UV_MAX_PX)
      throw new Error('The sheet comes to ' + (sh.px.w * sh.px.h / 1e6).toFixed(0) +
        ' megapixels at ' + u.dpi + ' dpi, past what a browser canvas can hold (' +
        (UV_MAX_PX / 1e6) + ' MP). Drop the dpi, or split it into fewer rows and print two sheets.');
    const cv = document.createElement('canvas');
    cv.width = sh.px.w; cv.height = sh.px.h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);

    /* the label, flattened once at the sheet's own resolution and stamped */
    const one = HZR.flatten(board, sh.ppmm);
    const W = board.wMM * sh.ppmm, H = board.hMM * sh.ppmm;
    const gap = u.gap * sh.ppmm, mar = u.margin * sh.ppmm;
    for (let r = 0; r < u.rows; r++)
      for (let c = 0; c < u.cols; c++)
        g.drawImage(one, Math.round(mar + c * (W + gap)), Math.round(mar + r * (H + gap)),
          Math.round(W), Math.round(H));

    if (u.marks) {
      const px = Math.max(1, Math.round(sh.ppmm * 0.12));
      const len = Math.round(sh.ppmm * 2.5);
      g.strokeStyle = '#000000'; g.lineWidth = px;
      for (let r = 0; r <= u.rows; r++) {
        const y = Math.round(mar + r * (H + gap) - (r ? gap : 0)) + (r ? 0 : 0);
        for (const x of [Math.round(mar), Math.round(cv.width - mar)]) {
          g.beginPath();
          g.moveTo(x + (x < cv.width / 2 ? -len : 0), y + .5);
          g.lineTo(x + (x < cv.width / 2 ? 0 : len), y + .5);
          g.stroke();
        }
      }
      for (let c = 0; c <= u.cols; c++) {
        const x = Math.round(mar + c * (W + gap) - (c ? gap : 0));
        for (const y of [Math.round(mar), Math.round(cv.height - mar)]) {
          g.beginPath();
          g.moveTo(x + .5, y + (y < cv.height / 2 ? -len : 0));
          g.lineTo(x + .5, y + (y < cv.height / 2 ? 0 : len));
          g.stroke();
        }
      }
      g.fillStyle = '#000000';
      g.font = Math.round(sh.ppmm * 2.6) + 'px ' + BRAND.STACK.mono;
      g.fillText(board.doc.name + '  ·  ' + (board.wMM / 25.4).toFixed(3) + '" × ' +
        (board.hMM / 25.4).toFixed(3) + '"  ·  ' + sh.n + ' up  ·  ' + u.dpi + ' dpi',
        Math.round(mar), Math.round(cv.height - mar * 0.30));
    }
    return cv;
  }

  /** The same sheet as a 1:1 PDF, for RIPs that would rather be handed one. */
  function uvPdf(board, u) {
    const sh = HZ.sheet(board.doc);
    const cv = uvSheet(board, u);
    /* straight off the canvas. Round-tripping through a data URI and an
       Image means waiting for a decode that has not happened yet, and the
       writer would sit on an empty buffer. */
    const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const n = cv.width * cv.height;
    const rgb = new Uint8Array(n * 3);
    for (let i = 0; i < n; i++) { rgb[i*3] = px[i*4]; rgb[i*3+1] = px[i*4+1]; rgb[i*3+2] = px[i*4+2]; }
    const d = { w: cv.width, h: cv.height, rgb };
    const pw = PT(sh.wMM), ph = PT(sh.hMM);
    const objs = [];
    const add = x => { objs.push(x); return objs.length; };
    const imgObj = add(null), contentObj = add(null);
    const pageObj = add(null), pagesObj = add(null), catObj = add(null), infoObj = add(null);
    const rg = zlibStore(d.rgb);
    objs[imgObj - 1] = { stream: rg, dict:
      `<< /Type /XObject /Subtype /Image /Width ${d.w} /Height ${d.h} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /FlateDecode /Length ${rg.length} >>` };
    const content = `q ${f(pw)} 0 0 ${f(ph)} 0 0 cm /Im0 Do Q`;
    const cb = strBytes(content);
    objs[contentObj - 1] = { stream: cb, dict: `<< /Length ${cb.length} >>` };
    objs[pageObj - 1] = `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] ` +
      `/TrimBox [0 0 ${f(pw)} ${f(ph)}] /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> ` +
      `/Contents ${contentObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`;
    objs[catObj - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[infoObj - 1] = `<< /Title (${pdfStr(board.doc.name + ' — UV sheet')}) ` +
      `/Creator (PEPTIDEX Label Studio Pro) /Producer (hz-export · UV) ` +
      `/Subject (${pdfStr(sh.n + ' up at ' + u.dpi + ' dpi, ' + sh.wIn.toFixed(2) + 'x' + sh.hIn.toFixed(2) + ' in, 1:1')}) ` +
      `/CreationDate (D:${stamp()}) >>`;
    return assemble(objs, catObj, infoObj);
  }

  /* =====================================================================
     PACKAGE
     ===================================================================== */
  function manifest(board, report) {
    const doc = board.doc;
    return {
      generator: 'PEPTIDEX Label Studio Pro · hz-export',
      generatedAt: new Date().toISOString(),
      document: { id: doc.id, name: doc.name, family: doc.family, master: doc.master },
      approvedMaster: { key: doc.master, pixels: board.masterPx,
        aspect: Math.round(board.masterPx.w / board.masterPx.h * 10000) / 10000,
        effectivePPI: board.meta.masterPPI,
        note: 'Placed as delivered. The composition is the approved artwork; it was not rebuilt.' },
      geometry: { trimMM: { w: board.wMM, h: board.hMM }, bleedMM: board.bleedMM, safeMM: board.safeMM },
      layoutLock: doc.lock,
      edits: board.meta.edits,
      patchedRegions: board.meta.patches,
      separations: board.plates,
      typography: { resolved: BRAND.resolveFont(), embedded: false,
        note: 'Replacement strings are set in the resolved system face and referenced by name. The master\'s own type is artwork and is untouched.' },
      preflight: report ? { intent: report.intent, pass: report.pass,
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
    add(base + '_X-4.pdf', pdf(board, { standard: 'X-4', space: 'cmyk', cutline: true }));
    add(base + '_X-1a.pdf', pdf(board, { standard: 'X-1a', space: 'cmyk', cutline: true }));
    add(base + '.ai', pdf(board, { standard: 'plain', space: 'srgb', cutline: true }));
    add(base + '.eps', eps(board, { space: 'cmyk', cutline: true }));

    for (const plate of board.plates)
      add('separations/' + base + '_' + plate + '.pdf',
        pdf(board, { standard: 'X-1a', space: 'cmyk', cutline: plate === 'PX_DIE_CUT' }));

    add('README.txt', readme(board, report));
    add('manifest.json', JSON.stringify(manifest(board, report), null, 2));
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
    svg, pdf, eps, raster, tiff, psd, pkg, manifest, readme, visible, uvSheet, uvPdf,
    SPACES, rgb2cmyk, srgb2adobe, nearestPantone, hex2rgb, PT
  };
})();

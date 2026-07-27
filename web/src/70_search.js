/* ============================================================================
   PEPTIDEX — SEARCH

   The catalogue is a hundred and thirty compounds across three lines, and the
   only way in was to pick a line and scroll. This is the other way in.

   It is built to be opened before you know what you want. With the field
   empty it does not sit blank — it offers the three lines, a handful of
   compounds drawn from a different part of the catalogue each time it opens,
   and the tools. Someone who opens it out of curiosity leaves knowing one more
   compound than they did, which is the whole point of putting it in the bar.

   Selecting a compound emits the same `data-product` the cards emit, so the
   site's own handler opens it. No second navigation path exists to drift.
   ============================================================================ */
(function(){
'use strict';

/* --------------------------------------------------------------------------
   The index, built once from the site's own data.
   -------------------------------------------------------------------------- */
let INDEX = null;

function build(){
  if(INDEX) return INDEX;
  const rows = [];

  Object.keys(LINES).forEach(k => {
    const L = LINES[k];
    rows.push({kind:'line', key:k, title:L.name, sub:L.tagline,
               hay:(L.name + ' ' + L.tagline + ' ' + L.desc + ' ' + L.category).toLowerCase(),
               go:'nav', href:'#/' + k});

    L.products.forEach((p, i) => {
      rows.push({kind:'compound', key:k, idx:i,
                 title:p[1], code:p[0], sub:L.name + ' · ' + p[2], note:p[3],
                 hay:(p[0] + ' ' + p[1] + ' ' + p[2] + ' ' + p[3] + ' ' + L.name).toLowerCase(),
                 go:'product', pid:k + ':' + i});
    });
  });

  [['/quality',  t('Quality & COA','Calidad y COA'),   t('How every batch is verified','Cómo se verifica cada lote')],
   ['/tools',    t('Tools','Herramientas'),            t('Reconstitution calculator, peptide dictionary','Calculadora de reconstitución, diccionario')],
   ['/track',    t('Track a request','Rastrear solicitud'), t('Follow a quotation by its code','Sigue una cotización por su código')],
   ['/account',  t('My account','Mi cuenta'),          t('Standing, requests, saved compounds','Posición, solicitudes, guardados')],
   ['/faq',      t('Questions','Preguntas'),           t('What researchers ask most','Lo que más preguntan')],
   ['/about',    t('About PEPTIDEX','Sobre PEPTIDEX'), t('Who makes this and how','Quién lo hace y cómo')]
  ].forEach(([href, title, sub]) => {
    rows.push({kind:'page', title, sub, hay:(title + ' ' + sub).toLowerCase(),
               go:'nav', href:'#' + href});
  });

  return (INDEX = rows);
}

/* --------------------------------------------------------------------------
   Scoring. A code typed in full wins outright, then the start of a name, then
   anything the row mentions — so "BPC" lands on BPC-157 and not on the four
   compounds whose note happens to contain the word.
   -------------------------------------------------------------------------- */
function rank(q){
  const s = q.trim().toLowerCase();
  if(!s) return [];
  return build().map(r => {
    const title = r.title.toLowerCase();
    let score = 0;
    if(r.code && r.code.toLowerCase() === s) score = 1000;
    else if(title === s)                     score = 900;
    else if(title.startsWith(s))             score = 700 - title.length;
    else if(r.code && r.code.toLowerCase().startsWith(s)) score = 600;
    else if(title.includes(s))               score = 400 - title.indexOf(s);
    else if(r.hay.includes(s))               score = 150;
    if(score && r.kind === 'line') score += 60;
    return {r, score};
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(x => x.r);
}

/* Something different to look at on every open, walked through the catalogue
   rather than drawn at random, so it never repeats itself twice running. */
let seed = Math.floor(Math.random() * 997);
function suggestions(){
  const all = build().filter(r => r.kind === 'compound');
  const out = [];
  for(let i = 0; i < 5; i++){
    out.push(all[(seed + i * 37) % all.length]);
  }
  seed = (seed + 5 * 37 + 11) % all.length;
  return out;
}

const IC = {
  find:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  vial:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3h6M10 3v5.2L6.6 18A2.4 2.4 0 0 0 8.9 21h6.2a2.4 2.4 0 0 0 2.3-3L14 8.2V3"/><path d="M7.6 15h8.8"/></svg>',
  line:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V8M10 20V4M16 20v-9M22 20V6"/></svg>',
  page:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>'
};

function mark(text, q){
  const s = q.trim();
  if(!s) return esc(text);
  const i = text.toLowerCase().indexOf(s.toLowerCase());
  if(i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + s.length)) + '</mark>' +
         esc(text.slice(i + s.length));
}

function row(r, q){
  const icon = r.kind === 'compound' ? IC.vial : r.kind === 'line' ? IC.line : IC.page;
  const attr = r.go === 'product' ? 'data-product="' + r.pid + '"'
                                  : 'data-nav data-href="' + r.href + '"';
  return '<button class="px-s-row" ' + attr + ' role="option">' +
         '<span class="i">' + icon + '</span>' +
         '<span class="m"><span class="t">' + mark(r.title, q) + '</span>' +
         '<span class="s">' + esc(r.sub || '') + '</span></span>' +
         (r.code ? '<span class="c">' + esc(r.code) + '</span>' : '') +
         '</button>';
}

function group(label, rows, q){
  if(!rows.length) return '';
  return '<div class="px-s-g"><div class="px-s-gh">' + label + '</div>' +
         rows.map(r => row(r, q)).join('') + '</div>';
}

/* --------------------------------------------------------------------------
   The panel.
   -------------------------------------------------------------------------- */
let el = null, input = null, list = null, open = false, sel = 0;

function shell(){
  if(el) return el;
  el = document.createElement('div');
  el.id = 'px-search';
  el.innerHTML =
    '<div class="px-s-veil"></div>' +
    '<div class="px-s-panel" role="dialog" aria-modal="true" aria-label="Search">' +
      '<div class="px-s-field">' + IC.find +
        '<input type="text" autocomplete="off" spellcheck="false" ' +
          'placeholder="' + t('Search compounds, lines, tools…','Busca compuestos, líneas, herramientas…') + '">' +
        '<kbd>ESC</kbd>' +
      '</div>' +
      '<div class="px-s-list" role="listbox"></div>' +
      '<div class="px-s-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ' + t('to move','moverse') + '</span>' +
        '<span><kbd>↵</kbd> ' + t('to open','abrir') + '</span>' +
        '<span class="px-s-count"></span></div>' +
    '</div>';
  document.body.appendChild(el);
  input = el.querySelector('input');
  list  = el.querySelector('.px-s-list');

  input.addEventListener('input', paint);
  el.querySelector('.px-s-veil').addEventListener('click', close);
  list.addEventListener('mousemove', e => {
    const r = e.target.closest('.px-s-row');
    if(r) setSel([...list.querySelectorAll('.px-s-row')].indexOf(r), false);
  });
  /* the site's own delegated handlers do the navigating; close on the way */
  list.addEventListener('click', e => { if(e.target.closest('.px-s-row')) close(); });
  return el;
}

function paint(){
  const q = input.value;
  if(!q.trim()){
    list.innerHTML =
      group(t('Start with a line','Empieza por una línea'), build().filter(r => r.kind === 'line'), '') +
      group(t('From the catalogue','Del catálogo'), suggestions(), '') +
      group(t('Elsewhere','En otra parte'), build().filter(r => r.kind === 'page').slice(0, 3), '');
    el.querySelector('.px-s-count').textContent = '';
  } else {
    const hits = rank(q);
    if(!hits.length){
      list.innerHTML = '<div class="px-s-none">' +
        t('Nothing matches','Nada coincide') + ' <b>' + esc(q) + '</b>.<br>' +
        '<span>' + t('Try a code like BPC, or a line.','Prueba un código como BPC, o una línea.') + '</span></div>';
    } else {
      list.innerHTML =
        group(t('Compounds','Compuestos'), hits.filter(r => r.kind === 'compound'), q) +
        group(t('Lines','Líneas'),         hits.filter(r => r.kind === 'line'), q) +
        group(t('Pages','Páginas'),        hits.filter(r => r.kind === 'page'), q);
    }
    el.querySelector('.px-s-count').textContent =
      hits.length ? hits.length + ' ' + t('results','resultados') : '';
  }
  setSel(0, true);
}

function rows(){ return [...list.querySelectorAll('.px-s-row')]; }

function setSel(i, scroll){
  const rs = rows();
  if(!rs.length) return;
  sel = Math.max(0, Math.min(rs.length - 1, i));
  rs.forEach((r, n) => r.classList.toggle('on', n === sel));
  if(scroll && rs[sel]) rs[sel].scrollIntoView({block:'nearest'});
}

function show(){
  shell();
  if(open) return;
  open = true;
  el.classList.add('on');
  document.documentElement.classList.add('px-search-open');
  input.value = '';
  paint();
  requestAnimationFrame(() => input.focus());
  if(window.lenis && lenis.stop) lenis.stop();
}

function close(){
  if(!open) return;
  open = false;
  el.classList.remove('on');
  document.documentElement.classList.remove('px-search-open');
  if(window.lenis && lenis.start && !document.getElementById('product').style.display) lenis.start();
}

/* --------------------------------------------------------------------------
   The way in.
   -------------------------------------------------------------------------- */
function button(){
  const host = document.querySelector('nav .navacc');
  if(!host || host.querySelector('.px-s-open')) return;
  const b = document.createElement('button');
  b.className = 'px-s-open';
  b.setAttribute('aria-label', t('Search','Buscar'));
  b.innerHTML = IC.find + '<span class="l">' + t('Search','Buscar') + '</span>' +
                '<kbd class="px-s-k"></kbd>';
  b.querySelector('.px-s-k').textContent =
    /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Ctrl K';
  b.addEventListener('click', show);
  host.insertBefore(b, host.firstChild);
}

addEventListener('keydown', e => {
  if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
    e.preventDefault(); open ? close() : show(); return;
  }
  if(!open) return;
  if(e.key === 'Escape'){ e.preventDefault(); close(); }
  else if(e.key === 'ArrowDown'){ e.preventDefault(); setSel(sel + 1, true); }
  else if(e.key === 'ArrowUp'){   e.preventDefault(); setSel(sel - 1, true); }
  else if(e.key === 'Enter'){
    const r = rows()[sel];
    if(r){ e.preventDefault(); r.click(); }
  }
});

const _render = render;
render = function(route, defer){ _render(route, defer); button(); };

button();

})();

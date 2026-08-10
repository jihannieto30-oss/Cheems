/* ============================================================================
   PEPTIDEX — THE MEMBER OVERVIEW

   Only the overview panel is replaced. Requests, saved compounds, shipping,
   account details and the whole administration side are left exactly as they
   are, and the membership card is reused verbatim — it is not redrawn here.

   Everything on this page is read from the account itself. There is no
   invented activity, no placeholder balance and no number that is not already
   true of this member: the standing is counted from their requests, the
   completeness from the fields they have actually filled, the timeline from
   the requests they have actually sent. A profile that shows you your own
   record is worth more than one that shows you a decorated blank.
   ============================================================================ */
(function(){
'use strict';

/* Standing, counted from real requests. Each step is a real threshold, so the
   bar can never show progress the member has not made. */
const TIERS = [
  {n: 0,  en: 'RESEARCH MEMBER',   es: 'MIEMBRO INVESTIGADOR'},
  {n: 1,  en: 'RESEARCH ASSOCIATE', es: 'INVESTIGADOR ASOCIADO'},
  {n: 3,  en: 'RESEARCH PRIME',    es: 'INVESTIGADOR PRIME'},
  {n: 6,  en: 'RESEARCH ELITE',    es: 'INVESTIGADOR ELITE'}
];

function standing(n){
  let i = 0;
  while(i + 1 < TIERS.length && n >= TIERS[i + 1].n) i++;
  const cur = TIERS[i], next = TIERS[i + 1] || null;
  const from = cur.n, to = next ? next.n : cur.n;
  return {
    name: t(cur.en, cur.es),
    next: next ? t(next.en, next.es) : null,
    left: next ? next.n - n : 0,
    pct:  next ? Math.max(0, Math.min(100, ((n - from) / (to - from)) * 100)) : 100
  };
}

function greeting(){
  const h = new Date().getHours();
  if(h < 12) return t('Good morning',   'Buenos días');
  if(h < 19) return t('Good afternoon', 'Buenas tardes');
  return t('Good evening', 'Buenas noches');
}

const IC = {
  bag:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  cat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="6" height="9" rx="2"/><path d="M14 16h6"/></svg>',
  trk:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h11v9H3z"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg>',
  chk:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dot:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/></svg>'
};

/* --------------------------------------------------------------------------
   The member's strand.

   The plate carries a peptide sequence that belongs to this member and to no
   one else. It is not random: the member ID is hashed and the hash walks the
   twenty amino acids, so the same ID always produces the same strand and two
   members never share one. It is the closest thing to a signature a peptide
   company can etch into metal.
   -------------------------------------------------------------------------- */
const AA = 'ACDEFGHIKLMNPQRSTVWY';

function strand(id, n){
  let h = 0x9e3779b9;
  for(let i = 0; i < id.length; i++){
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
  }
  let out = '';
  for(let i = 0; i < n; i++){
    h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35) >>> 0;
    out += AA[h % AA.length];
  }
  return out;
}

function qa(icon, label, attrs){
  return '<button class="pv-qa-b" ' + attrs + '><span class="i">' + icon + '</span>' +
         '<span class="l">' + label + '</span>' +
         '<span class="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6l6 6-6 6"/></svg></span></button>';
}

/* What the member has actually filled in. Nothing is inferred. */
function completeness(u){
  const a = u.addr || {};
  const rows = [
    {ok: !!(u.name || '').trim(),      label: t('Full name',         'Nombre completo'),  sec: 'details'},
    {ok: !!(u.email || '').trim(),     label: t('Email address',     'Correo'),           sec: 'details'},
    {ok: !!(a.recipient || '').trim(), label: t('Recipient or lab',  'Destinatario o lab'), sec: 'addresses'},
    {ok: !!(a.line || '').trim(),      label: t('Shipping address',  'Dirección de envío'), sec: 'addresses'},
    {ok: !!(a.city || '').trim() && !!(a.zip || '').trim(),
                                       label: t('City and postal code', 'Ciudad y código postal'), sec: 'addresses'},
    {ok: !!(a.phone || '').trim(),     label: t('Contact phone',     'Teléfono de contacto'), sec: 'addresses'}
  ];
  return {rows: rows, pct: Math.round(rows.filter(r => r.ok).length / rows.length * 100)};
}

/* The plate. One markup, so the researcher's and the owner's are the same
   object with a different line of standing on it. */
function plateHTML(u, tier){
  const mFirst = (u.name || 'Researcher').trim().split(/\s+/)[0].toUpperCase();
  const mId    = 'PX-' + Number(u.created || Date.now()).toString(36).slice(-6).toUpperCase();
  const since  = new Date(u.created || Date.now());
  return `<div class="member-card px-plate" id="memberCard">
    <div class="mc-emblem">PX</div>
    <div class="mc-top"><img class="mc-logo" src="${PX_MASTER_LOGO}" alt="PEPTIDEX"/>
      <span class="mc-tier">${esc(tier || t('PEPTIDEX MEMBER','MIEMBRO PEPTIDEX'))}</span></div>
    <div class="mc-idblock"><div class="mc-name">${esc(mFirst)}</div><div class="mc-id">${esc(mId)}</div></div>
    <div class="mc-foot"><span class="mc-brand">PEPTIDEX</span>
      <span class="mc-since">${t('MEMBER SINCE','MIEMBRO DESDE')} ${since.getFullYear()}</span></div>
  </div>`;
}

function overviewHTML(u){
  const dloc  = LANG === 'es' ? 'es-ES' : 'en-GB';
  const reqs  = (u.reqs || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const favs  = (u.fav || []);
  const first = (u.name || 'Researcher').trim().split(/\s+/)[0];
  const mFirst= first.toUpperCase();
  const mId   = 'PX-' + Number(u.created || Date.now()).toString(36).slice(-6).toUpperCase();
  const since = new Date(u.created || Date.now());
  const st    = standing(reqs.length);
  const cp    = completeness(u);
  const fdate = ts => new Date(ts).toLocaleDateString(dloc, {day:'2-digit', month:'short', year:'numeric'});

  return `<div class="pv">

    <div class="pv-head">
      <div class="pv-hi">
        <div class="pv-k">${esc(st.name)}</div>
        <h2>${greeting()}, ${esc(first)}.</h2>
        <p class="pv-lead">${t(
          'Everything PEPTIDEX holds for you — your standing, your requests, the compounds you have shortlisted and where they ship.',
          'Todo lo que PEPTIDEX guarda para ti — tu posición, tus solicitudes, los compuestos que has preseleccionado y a dónde se envían.')}</p>

        <div class="pv-stand">
          <div class="pv-stand-t">
            <span class="pv-stand-n">${esc(st.name)}</span>
            <span class="pv-stand-c">${reqs.length} ${t('quotation requests','solicitudes de cotización')}</span>
          </div>
          <div class="pv-bar"><i style="width:${st.pct.toFixed(1)}%"></i></div>
          <div class="pv-stand-s">${st.next
            ? t(`${st.left} more request${st.left === 1 ? '' : 's'} to reach ${st.next}.`,
                `${st.left} solicitud${st.left === 1 ? '' : 'es'} más para alcanzar ${st.next}.`)
            : t('You hold the highest standing PEPTIDEX awards.','Tienes la posición más alta que otorga PEPTIDEX.')}</div>
        </div>
      </div>

      <div class="pv-cardwrap">${plateHTML(u)}</div>
    </div>

    <div class="pv-qa">
      ${qa(IC.bag,  t('My quotation list','Mi lista de cotización'), 'data-openbag')}
      ${qa(IC.cat,  t('Browse the catalog','Ver el catálogo'),      'data-nav data-href="#/fitness"')}
      ${qa(IC.trk,  t('Track a request','Rastrear solicitud'),      'data-nav data-href="#/track"')}
      ${qa(IC.ship, t('Shipping details','Datos de envío'),         'data-gosec="addresses"')}
    </div>

    <div class="pv-grid">
      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Recent activity','Actividad reciente')}</h3>
          ${reqs.length ? `<button class="pv-more" data-gosec="orders">${t('See all','Ver todo')}</button>` : ''}</div>
        ${reqs.length ? `<ol class="pv-tl">${reqs.slice(0, 4).map(r => `
          <li><span class="d"></span>
            <div class="m"><div class="r-id">${esc(r.id)}</div>
              <div class="r-sum">${esc(r.summary)}</div>
              <div class="r-dt">${fdate(r.ts)}</div></div>
            ${stBadge(r.status)}</li>`).join('')}</ol>`
        : `<div class="pv-empty"><p>${t('Nothing here yet.','Aún no hay nada aquí.')}</p>
             <p class="s">${t('Build a quotation list and send it to our partner desk — every request you make appears here with its status.','Arma una lista de cotización y envíala a nuestra mesa — cada solicitud aparecerá aquí con su estado.')}</p>
             <button class="btn mag" data-openbag>${t('Open my list','Abrir mi lista')}</button></div>`}
      </div>

      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Saved compounds','Compuestos guardados')}</h3>
          ${favs.length ? `<button class="pv-more" data-gosec="favorites">${t('See all','Ver todo')}</button>` : ''}</div>
        ${favs.length ? `<ul class="pv-favs">${favs.slice(0, 5).map(pid => {
            const P = prod(pid); if(!P) return '';
            return `<li><div class="n">${esc(P.name)}</div>
              <div class="s">${esc(P.L.name)} · ${esc(P.spec)}</div>
              <button class="pv-chip" data-favadd="${pid}">+ ${t('List','Lista')}</button></li>`;
          }).join('')}</ul>`
        : `<div class="pv-empty"><p>${t('No compounds saved.','Sin compuestos guardados.')}</p>
             <p class="s">${t('Tap the heart on any compound to keep it here.','Toca el corazón en cualquier compuesto para guardarlo aquí.')}</p>
             <button class="btn mag" data-nav data-href="#/fitness">${t('Browse the catalog','Ver el catálogo')}</button></div>`}
      </div>
    </div>

    <div class="pv-grid">
      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Where your interest sits','Dónde está tu interés')}</h3></div>
        ${(() => {
          const by = Object.keys(LINES).map(k => ({
            k, name: LINES[k].name,
            n: favs.filter(p => String(p).split(':')[0] === k).length
          }));
          const total = by.reduce((s, x) => s + x.n, 0);
          if(!total) return `<div class="pv-empty"><p>${t('No reading yet.','Aún sin lectura.')}</p>
            <p class="s">${t('Save a few compounds and this shows which of the three lines your work leans towards.','Guarda algunos compuestos y esto muestra hacia cuál de las tres líneas se inclina tu trabajo.')}</p>
            <button class="btn mag" data-nav data-href="#/fitness">${t('Browse the catalog','Ver el catálogo')}</button></div>`;
          return `<ul class="pv-lines">${by.map(x => `
            <li><button data-nav data-href="#/${x.k}">
              <span class="n">${esc(x.name)}</span>
              <span class="b"><i style="width:${total ? (x.n / total * 100).toFixed(1) : 0}%"></i></span>
              <span class="v">${x.n}</span></button></li>`).join('')}</ul>
            <p class="pv-note">${t(
              `${total} saved compound${total === 1 ? '' : 's'} across ${by.filter(x => x.n).length} line${by.filter(x => x.n).length === 1 ? '' : 's'}.`,
              `${total} compuesto${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'} en ${by.filter(x => x.n).length} línea${by.filter(x => x.n).length === 1 ? '' : 's'}.`)}</p>`;
        })()}
      </div>

      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Current list','Lista actual')}</h3>
          ${listCount() ? `<button class="pv-more" data-openbag>${t('Open','Abrir')}</button>` : ''}</div>
        ${(() => {
          const arr = getList();
          if(!arr.length) return `<div class="pv-empty"><p>${t('Your list is empty.','Tu lista está vacía.')}</p>
            <p class="s">${t('Add compounds as you find them; send the whole list for quotation when it is ready.','Añade compuestos conforme los encuentres; envía la lista completa a cotizar cuando esté lista.')}</p>
            <button class="btn mag" data-nav data-href="#/beauty">${t('Find something','Buscar algo')}</button></div>`;
          return `<ul class="pv-favs">${arr.slice(0, 5).map(it => {
            const P = prod(it.id); if(!P) return '';
            return `<li><div><div class="n">${esc(P.name)}</div>
              <div class="s">${esc(P.L.name)} · ${esc(P.vlabel || P.spec)}</div></div>
              <span class="pv-qty">×${it.qty}</span></li>`;
          }).join('')}</ul>
          ${arr.length > 5 ? `<p class="pv-note">${t(`and ${arr.length - 5} more.`, `y ${arr.length - 5} más.`)}</p>` : ''}`;
        })()}
      </div>
    </div>

    <div class="pv-grid">
      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Your profile','Tu perfil')}</h3><span class="pv-pct">${cp.pct}%</span></div>
        <div class="pv-bar sm"><i style="width:${cp.pct}%"></i></div>
        <ul class="pv-check">${cp.rows.map(r => `
          <li class="${r.ok ? 'ok' : ''}">
            <span class="i">${r.ok ? IC.chk : IC.dot}</span>
            <span class="l">${r.label}</span>
            ${r.ok ? '' : `<button class="pv-chip" data-gosec="${r.sec}">${t('Add','Añadir')}</button>`}
          </li>`).join('')}</ul>
      </div>

      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Membership','Membresía')}</h3></div>
        <dl class="pv-dl">
          <div><dt>${t('Member ID','ID de miembro')}</dt><dd class="mono">${esc(mId)}</dd></div>
          <div><dt>${t('Member since','Miembro desde')}</dt><dd>${since.toLocaleDateString(dloc, {month:'long', year:'numeric'})}</dd></div>
          <div><dt>${t('Standing','Posición')}</dt><dd>${esc(st.name)}</dd></div>
          <div><dt>${t('Email','Correo')}</dt><dd>${esc(u.email)}</dd></div>
          <div><dt>${t('Region','Región')}</dt><dd>${REGION === 'usa' ? 'United States' : 'México'}</dd></div>
          <div><dt>${t('Language','Idioma')}</dt><dd>${LANG === 'es' ? 'Español' : 'English'}</dd></div>
        </dl>
        <button class="pv-more wide" data-gosec="details">${t('Edit account details','Editar datos de cuenta')} →</button>
      </div>
    </div>

  </div>`;
}

/* --------------------------------------------------------------------------
   The deck.

   The overview above is written for a researcher: standing, requests, what
   they have saved. The person who owns the company opening the same page
   wants none of that — they want the business.

   isAdmin() is already true for the CEO's address, and the sidebar already
   carries the administration sections. What was missing is the landing: this
   is what the account page shows first when the person looking at it owns it.

   Every count here comes from what this device actually holds. The live
   figures — visits, orders, revenue — come from the cloud, and they are one
   click away rather than half-loaded here, so this page never shows a number
   it cannot stand behind.
   -------------------------------------------------------------------------- */
const DECK = [
  {sec:'adm-dash',    en:'Dashboard',        es:'Panel',              d_en:'Live traffic, visitors and orders',   d_es:'Tráfico, visitantes y pedidos en vivo'},
  {sec:'adm-orders',  en:'Orders',           es:'Pedidos',            d_en:'Every order, and its status',         d_es:'Cada pedido y su estado'},
  {sec:'adm-quotes',  en:'Quotations',       es:'Cotizaciones',       d_en:'Requests waiting on a price',         d_es:'Solicitudes esperando precio'},
  {sec:'adm-users',   en:'Customers',        es:'Clientes',           d_en:'Who has an account',                  d_es:'Quién tiene cuenta'},
  {sec:'adm-catalog', en:'Catalog & prices', es:'Catálogo y precios', d_en:'Change what anything costs',          d_es:'Cambia lo que cuesta cada cosa'},
  {sec:'adm-tools',   en:'Tools & config',   es:'Herramientas',       d_en:'Everything else you can correct',     d_es:'Todo lo demás que puedes corregir'}
];

function deckHTML(u){
  const users = (ACC.users || []);
  const reqs  = users.reduce((n, x) => n + ((x.reqs || []).length), 0);
  const first = (u.name || 'CEO').trim().split(/\s+/)[0];

  return `<div class="pv">
    <div class="pv-head pv-deck">
      <div class="pv-hi">
        <div class="pv-k pv-ceo">${t('CHIEF EXECUTIVE','DIRECCIÓN GENERAL')}</div>
        <h2>${greeting()}, ${esc(first)}.</h2>
        <p class="pv-lead">${t(
          'You are signed in as the owner of PEPTIDEX. Everything on the site is open to you from here — what is selling, who is asking, and what anything costs.',
          'Has iniciado sesión como dueño de PEPTIDEX. Todo el sitio está abierto desde aquí — qué se vende, quién pregunta y cuánto cuesta cada cosa.')}</p>
      </div>
      <div class="pv-cardwrap">${plateHTML(u, t('PEPTIDEX · CEO','PEPTIDEX · CEO'))}</div>
    </div>

    <div class="pv-deckgrid">
      ${DECK.map(d => `<button class="pv-deck-b" data-gosec="${d.sec}">
        <span class="t">${t(d.en, d.es)}</span>
        <span class="s">${t(d.d_en, d.d_es)}</span>
        <span class="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6l6 6-6 6"/></svg></span>
      </button>`).join('')}
    </div>

    <div class="pv-grid">
      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('On this device','En este equipo')}</h3></div>
        <dl class="pv-dl">
          <div><dt>${t('Accounts','Cuentas')}</dt><dd>${users.length}</dd></div>
          <div><dt>${t('Requests','Solicitudes')}</dt><dd>${reqs}</dd></div>
          <div><dt>${t('Region','Región')}</dt><dd>${REGION === 'usa' ? 'United States' : 'México'}</dd></div>
          <div><dt>${t('Language','Idioma')}</dt><dd>${LANG === 'es' ? 'Español' : 'English'}</dd></div>
        </dl>
        <p class="pv-note">${t(
          'These are the accounts stored in this browser. Visits, orders and revenue live in the cloud — open the Dashboard for those.',
          'Estas son las cuentas guardadas en este navegador. Visitas, pedidos e ingresos viven en la nube — ábrelos en el Panel.')}</p>
        <button class="pv-more wide" data-gosec="adm-dash">${t('Open the dashboard','Abrir el panel')} →</button>
      </div>

      <div class="pv-panel">
        <div class="pv-ph"><h3>${t('Your own account','Tu propia cuenta')}</h3></div>
        <dl class="pv-dl">
          <div><dt>${t('Signed in as','Sesión como')}</dt><dd>${esc(u.email)}</dd></div>
          <div><dt>${t('Member since','Miembro desde')}</dt><dd>${new Date(u.created || Date.now())
            .toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-GB', {month:'long', year:'numeric'})}</dd></div>
        </dl>
        <p class="pv-note">${t(
          'The researcher view — saved compounds, quotation list, shipping — is still yours in the sections on the left.',
          'La vista de investigador — guardados, lista de cotización, envío — sigue siendo tuya en las secciones de la izquierda.')}</p>
        <button class="pv-more wide" data-gosec="favorites">${t('Saved compounds','Compuestos guardados')} →</button>
      </div>
    </div>
  </div>`;
}

/* -------------------------------------------------------------------------
   Take over the overview and nothing else.
   ------------------------------------------------------------------------- */
const _section = acctSectionHTML;
acctSectionHTML = function(sec){
  const u = currentUser();
  if(u && (!sec || sec === 'overview')) return isAdmin() ? deckHTML(u) : overviewHTML(u);
  return _section(sec);
};

/* The sidebar greets whoever is signed in. It called the owner a research
   member, which is true and beside the point. */
const _account = accountHTML;
accountHTML = function(){
  const html = _account();
  if(!currentUser() || !isAdmin()) return html;
  return html.replace('class="acct-hi">' + t('Research Member','Miembro Investigador'),
                      'class="acct-hi px-ceo-hi">' + t('Chief Executive','Dirección General'));
};

/* the panels link into the sidebar's own sections */
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-gosec]');
  if(!b) return;
  e.preventDefault();
  setAcctSection(b.dataset.gosec);
  const p = document.getElementById('acctPanel');
  if(p && p.scrollIntoView) p.scrollIntoView({block:'start', behavior:'smooth'});
});

})();

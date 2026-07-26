/* ============================================================================
   PEPTIDEX PLATFORM LAYER
   Experience, interface, motion, personalisation. Runs on top of the existing
   application — it reads the catalogue and the account store, and never
   rewrites content, branding, products or labels.
   ============================================================================ */
(function(){
'use strict';

/* ==========================================================================
   0 · STORE — preferences and profile, layered onto the existing user object
   ========================================================================== */
const PKEY='px-prefs';
const DEF_PREFS={motion:'full',density:'default',cursor:true,dockAI:true,dash:null};
let PREFS=(()=>{try{return Object.assign({},DEF_PREFS,JSON.parse(localStorage.getItem(PKEY)||'{}'))}catch(e){return Object.assign({},DEF_PREFS)}})();
function savePrefs(){try{localStorage.setItem(PKEY,JSON.stringify(PREFS))}catch(e){}}
function setPref(k,v){PREFS[k]=v;savePrefs();applyPrefs();}

const COUNTRIES=[['MX','México'],['US','United States'],['CA','Canada'],['ES','España'],['CO','Colombia'],
  ['AR','Argentina'],['CL','Chile'],['PE','Perú'],['BR','Brasil'],['GB','United Kingdom'],['DE','Deutschland'],
  ['FR','France'],['IT','Italia'],['AU','Australia'],['JP','日本'],['—','Other / Otro']];

/** Non-destructive profile block on the existing user record. */
function profile(u){
  if(!u)return null;
  if(!u.profile)u.profile={};
  const p=u.profile;
  if(!p.cid)p.cid=customerId(u);
  if(!p.avatar)p.avatar={mode:'gen',style:'mono',seed:u.id};
  if(!p.country)p.country=(REGION==='usa'?'US':'MX');
  if(p.lang==null)p.lang=LANG;
  if(!p.line)p.line='';
  if(!p.display)p.display=u.name||'';
  if(!u.notes)u.notes={};
  if(!u.collections)u.collections=[];
  if(!u.searches)u.searches=[];
  if(!u.notifs)u.notifs=null;      // seeded on first dashboard render
  if(!u.activity)u.activity=[];
  if(!u.sessions)u.sessions=[];
  if(!u.recent)u.recent=[];
  return p;
}
function customerId(u){
  let h=0x811c9dc5;const s=String(u.id||'')+String(u.email||'');
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  const a=(h>>>0).toString(36).toUpperCase().padStart(6,'0').slice(0,4);
  const b=((h*2654435761)>>>0).toString(36).toUpperCase().padStart(6,'0').slice(0,4);
  return 'PX-'+a+'-'+b;
}

/* --- membership: earned, never assigned ---------------------------------- */
const TIERS=[
  {k:'researcher',en:'Research Member',es:'Miembro Investigador',min:0},
  {k:'associate', en:'Associate',      es:'Asociado',            min:3},
  {k:'partner',   en:'Partner',        es:'Socio',               min:8},
  {k:'founding',  en:'Founding Circle',es:'Círculo Fundador',    min:16}
];
function tierScore(u){
  if(!u)return 0;
  const reqs=(u.reqs||[]).length, favs=(u.fav||[]).length, cols=(u.collections||[]).length;
  return reqs*3 + Math.min(favs,10) + cols*2 + (completion(u)>=90?4:0);
}
function tierOf(u){const s=tierScore(u);let r=TIERS[0];TIERS.forEach(x=>{if(s>=x.min)r=x});return r;}
function nextTier(u){const s=tierScore(u);return TIERS.find(x=>s<x.min)||null;}

function completion(u){
  if(!u)return 0;
  const p=u.profile||{};const a=u.addr||{};
  const checks=[!!u.name,!!u.email,!!(p.avatar&&(p.avatar.data||p.avatar.mode==='gen')),!!p.country,
    !!p.line,!!a.line,!!a.city,!!a.phone,(u.fav||[]).length>0,(u.reqs||[]).length>0];
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}

/* --- activity + notifications -------------------------------------------- */
function logActivity(type,detail,meta){
  const u=currentUser();if(!u)return;
  profile(u);
  u.activity.unshift({ts:Date.now(),type,detail:detail||'',meta:meta||null});
  u.activity=u.activity.slice(0,220);
  saveUser(u);
}
function notify(kind,title,body,href){
  const u=currentUser();if(!u)return;
  profile(u);
  if(!u.notifs)u.notifs=[];
  u.notifs.unshift({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    kind,title,body,href:href||'',ts:Date.now(),read:false});
  u.notifs=u.notifs.slice(0,60);
  saveUser(u);syncPlatformUI();
}
function seedNotifs(u){
  if(u.notifs)return;
  const now=Date.now(),d=86400000;
  u.notifs=[
    {id:'n_welcome',kind:'member',title:t('Welcome to PEPTIDEX','Bienvenido a PEPTIDEX'),
     body:t('Your researcher account is active. Complete your profile to unlock the full member dashboard.','Tu cuenta de investigador está activa. Completa tu perfil para desbloquear el panel completo.'),
     href:'#/account',ts:now-2*3600000,read:false},
    {id:'n_coa',kind:'doc',title:t('Certificates of Analysis updated','Certificados de Análisis actualizados'),
     body:t('Third-party COA and HPLC reports are available in your Download Center.','Los COA y reportes HPLC de terceros están disponibles en tu Centro de Descargas.'),
     href:'#/account',ts:now-1*d,read:false},
    {id:'n_stock',kind:'stock',title:t('Catalogue availability refreshed','Disponibilidad del catálogo actualizada'),
     body:t('Stock status has been recalculated across all 118 presentations.','Se recalculó el estado de stock de las 118 presentaciones.'),
     href:'#/fitness',ts:now-3*d,read:true}
  ];
  saveUser(u);
}
const unread=()=>{const u=currentUser();return u&&u.notifs?u.notifs.filter(n=>!n.read).length:0;};

/* --- session / device record --------------------------------------------- */
function recordSession(){
  const u=currentUser();if(!u)return;profile(u);
  const ua=navigator.userAgent||'';
  const dev=/iPhone|Android.*Mobile/.test(ua)?'Mobile':/iPad|Tablet/.test(ua)?'Tablet':'Desktop';
  const os=/Mac OS X/.test(ua)?'macOS':/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':
           /iPhone|iPad|iOS/.test(ua)?'iOS':/Linux/.test(ua)?'Linux':'Unknown';
  const br=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Chrome\//.test(ua)?'Chrome':
           /Safari\//.test(ua)?'Safari':/Firefox\//.test(ua)?'Firefox':'Browser';
  const fp=dev+'·'+os+'·'+br;
  u.sessions=(u.sessions||[]).map(s=>({...s,current:false}));
  const ex=u.sessions.find(s=>s.fp===fp);
  if(ex){ex.last=Date.now();ex.current=true;ex.n=(ex.n||1)+1;}
  else u.sessions.unshift({id:'s'+Date.now().toString(36),fp,dev,os,br,first:Date.now(),last:Date.now(),current:true,n:1});
  u.sessions=u.sessions.slice(0,12);
  saveUser(u);
}

/* ==========================================================================
   1 · APPEARANCE
   ========================================================================== */
const mqMotion=matchMedia('(prefers-reduced-motion:reduce)');
function applyPrefs(){
  const root=document.documentElement;
  /* White is the brand. There is no dark mode and no appearance switch. */
  root.setAttribute('data-theme','light');
  root.setAttribute('data-motion',(PREFS.motion==='reduced'||mqMotion.matches)?'reduced':'full');
  root.setAttribute('data-density',PREFS.density||'default');
  const mt=document.querySelector('meta[name="theme-color"]');
  if(mt)mt.setAttribute('content','#ffffff');
  const c=document.getElementById('px-cursor');
  if(c)c.style.display=(PREFS.cursor&&!reduced())?'':'none';
  const d=document.getElementById('px-ai-dock');
  if(d)d.classList.toggle('hide',!PREFS.dockAI);
  document.querySelectorAll('[data-pref]').forEach(b=>{
    const [k,v]=b.dataset.pref.split(':');
    if(b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed',String(PREFS[k]===v));
    if(b.hasAttribute('aria-checked'))b.setAttribute('aria-checked',String(!!PREFS[k]));
  });
}
const reduced=()=>PREFS.motion==='reduced'||mqMotion.matches;

/* ==========================================================================
   2 · TOASTS
   ========================================================================== */
const T_IC={ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  err:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'};
function toast(title,body,kind){
  const w=document.getElementById('px-toasts');if(!w)return;
  kind=kind||'info';
  const el=document.createElement('div');
  el.className='px-toast '+kind;
  el.innerHTML=`<div class="ti">${T_IC[kind]||T_IC.info}</div><div><b>${esc(title)}</b>${body?`<span>${esc(body)}</span>`:''}</div>`;
  w.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320);},kind==='err'?5200:3200);
}

/* ==========================================================================
   3 · AVATAR ENGINE — deterministic, generated locally, no network
   ========================================================================== */
function hash32(s){let h=0x811c9dc5;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function rng(seed){let a=hash32(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

const AV_STYLES=[
  {k:'mono', en:'Monochrome',  es:'Monocromo'},
  {k:'dark', en:'Dark Portrait',es:'Retrato Oscuro'},
  {k:'lux',  en:'Luxury Mark', es:'Marca Lujo'},
  {k:'illus',en:'Molecular',   es:'Molecular'}
];

function grain(ctx,S,amount){
  /* putImageData bypasses globalCompositeOperation and globalAlpha — it writes raw
     pixels. Composite the noise through an offscreen canvas instead. */
  const off=document.createElement('canvas');off.width=off.height=S;
  const oc=off.getContext('2d');
  const n=oc.createImageData(S,S),d=n.data;
  for(let i=0;i<d.length;i+=4){const v=(Math.random()*255)|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  oc.putImageData(n,0,0);
  ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=amount/255;
  ctx.drawImage(off,0,0);ctx.restore();
}
function bust(ctx,S,fill,r){
  /* a restrained head-and-shoulders silhouette — geometric, never cartoon */
  const cx=S*0.5, hy=S*0.40, hr=S*(0.146+r()*0.012);
  ctx.fillStyle=fill;
  ctx.beginPath();
  ctx.ellipse(cx,hy,hr*0.88,hr,0,0,Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx-hr*0.40,hy+hr*0.74);
  ctx.lineTo(cx+hr*0.40,hy+hr*0.74);
  ctx.lineTo(cx+hr*0.46,hy+hr*1.14);
  ctx.lineTo(cx-hr*0.46,hy+hr*1.14);
  ctx.closePath();ctx.fill();
  const sy=hy+hr*1.06, sw=S*(0.30+r()*0.03);
  ctx.beginPath();
  ctx.moveTo(cx-sw,S);
  ctx.bezierCurveTo(cx-sw,sy+S*0.05, cx-S*0.13,sy, cx,sy);
  ctx.bezierCurveTo(cx+S*0.13,sy, cx+sw,sy+S*0.05, cx+sw,S);
  ctx.closePath();ctx.fill();
}
function rimlight(ctx,S,c0,c1,side){
  ctx.save();
  const g=ctx.createLinearGradient(side>0?S*0.28:S*0.72,0,side>0?S:0,S);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.55,c0);g.addColorStop(1,c1);
  ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
  ctx.restore();
}
function vignette(ctx,S,a){
  const g=ctx.createRadialGradient(S/2,S*0.44,S*0.14,S/2,S/2,S*0.72);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+a+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
}

function drawAvatar(cv,style,seed,initial){
  const S=cv.width;const ctx=cv.getContext('2d');const r=rng(seed+'|'+style);
  ctx.clearRect(0,0,S,S);
  if(style==='mono'){
    const base=180+Math.floor(r()*38);
    const g=ctx.createLinearGradient(0,0,S*0.4,S);
    g.addColorStop(0,`rgb(${base+34},${base+35},${base+38})`);
    g.addColorStop(1,`rgb(${base-58},${base-56},${base-52})`);
    ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
    bust(ctx,S,`rgba(${28+r()*18|0},${29+r()*18|0},${33+r()*20|0},.93)`,r);
    rimlight(ctx,S,'rgba(255,255,255,.11)','rgba(255,255,255,.34)',r()>.5?1:-1);
    vignette(ctx,S,.34);grain(ctx,S,11);
  } else if(style==='dark'){
    const g=ctx.createRadialGradient(S*0.36,S*0.28,S*0.05,S*0.5,S*0.55,S*0.85);
    g.addColorStop(0,'#20242c');g.addColorStop(.55,'#0e1015');g.addColorStop(1,'#050609');
    ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
    bust(ctx,S,'#05060a',r);
    /* metallic rim on the silhouette edge */
    ctx.save();ctx.globalCompositeOperation='screen';
    const side=r()>.5?1:-1;
    const lg=ctx.createLinearGradient(side>0?S*0.34:S*0.66,S*0.16,side>0?S*0.86:S*0.14,S*0.92);
    lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(.42,'rgba(196,208,228,.30)');
    lg.addColorStop(.72,'rgba(232,240,255,.52)');lg.addColorStop(1,'rgba(120,140,175,.12)');
    ctx.fillStyle=lg;
    ctx.beginPath();ctx.arc(S/2,S/2,S/2,0,Math.PI*2);ctx.fill();
    ctx.restore();
    vignette(ctx,S,.5);grain(ctx,S,13);
  } else if(style==='lux'){
    const warm=[['#e9dcc2','#a98b52','#5d4926'],['#e6e6ea','#a7adb8','#4d525c'],['#eddcd2','#c08b6a','#6d4531']][Math.floor(r()*3)];
    const g=ctx.createLinearGradient(0,0,S,S);
    g.addColorStop(0,warm[0]);g.addColorStop(.52,warm[1]);g.addColorStop(1,warm[2]);
    ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
    /* engraved concentric rules */
    ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=S*0.004;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(S/2,S/2,S*(0.40-i*0.055),0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    const ini=(initial||'P').toUpperCase();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='300 '+Math.round(S*0.42)+'px '+getComputedStyle(document.body).fontFamily;
    ctx.save();ctx.globalCompositeOperation='multiply';
    ctx.fillStyle='rgba(40,26,10,.55)';ctx.fillText(ini,S/2+S*0.008,S/2+S*0.012);ctx.restore();
    ctx.save();ctx.globalCompositeOperation='screen';
    ctx.fillStyle='rgba(255,250,238,.72)';ctx.fillText(ini,S/2-S*0.006,S/2-S*0.008);ctx.restore();
    ctx.fillStyle='rgba(255,252,246,.30)';ctx.fillText(ini,S/2,S/2);
    vignette(ctx,S,.30);grain(ctx,S,10);
  } else {
    const g=ctx.createRadialGradient(S*0.32,S*0.3,S*0.04,S/2,S/2,S*0.82);
    g.addColorStop(0,'#182236');g.addColorStop(.6,'#0a0e17');g.addColorStop(1,'#05070c');
    ctx.fillStyle=g;ctx.fillRect(0,0,S,S);
    const N=7+Math.floor(r()*4),pts=[];
    for(let i=0;i<N;i++){
      const a=r()*Math.PI*2, d=S*(0.08+r()*0.30);
      pts.push({x:S/2+Math.cos(a)*d, y:S/2+Math.sin(a)*d, s:S*(0.018+r()*0.030)});
    }
    ctx.save();ctx.strokeStyle='rgba(150,180,240,.34)';ctx.lineWidth=S*0.007;
    for(let i=1;i<pts.length;i++){
      const j=Math.floor(r()*i);
      ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();
    }
    ctx.restore();
    pts.forEach((p,i)=>{
      const pg=ctx.createRadialGradient(p.x-p.s*0.3,p.y-p.s*0.3,0,p.x,p.y,p.s);
      const hot=i%3===0;
      pg.addColorStop(0,hot?'#9dc0ff':'#e8eef8');
      pg.addColorStop(.6,hot?'#2f66e0':'#96a1b4');
      pg.addColorStop(1,hot?'#10254f':'#3a4250');
      ctx.fillStyle=pg;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);ctx.fill();
    });
    ctx.save();ctx.globalCompositeOperation='screen';
    const bl=ctx.createRadialGradient(S*0.36,S*0.3,0,S*0.36,S*0.3,S*0.6);
    bl.addColorStop(0,'rgba(90,140,255,.20)');bl.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bl;ctx.fillRect(0,0,S,S);ctx.restore();
    vignette(ctx,S,.42);grain(ctx,S,12);
  }
}
function avatarDataURL(style,seed,initial,size){
  const cv=document.createElement('canvas');cv.width=cv.height=size||256;
  drawAvatar(cv,style,seed,initial);
  return cv.toDataURL('image/png');
}
function avatarSrc(u){
  if(!u)return null;
  const p=profile(u);
  if(p.avatar.mode==='photo'&&p.avatar.data)return p.avatar.data;
  if(!p.avatar.cache||p.avatar.cacheKey!==(p.avatar.style+'|'+p.avatar.seed)){
    p.avatar.cache=avatarDataURL(p.avatar.style,p.avatar.seed,(p.display||u.name||u.email||'P').charAt(0),256);
    p.avatar.cacheKey=p.avatar.style+'|'+p.avatar.seed;
    saveUser(u);
  }
  return p.avatar.cache;
}
function avatarHTML(u,size,ring){
  const s=avatarSrc(u);
  const ini=((u&&(u.profile&&u.profile.display||u.name||u.email))||'?').trim().charAt(0).toUpperCase();
  return `<div class="px-av s${size||40}">${s?`<img src="${s}" alt=""/>`:`<div class="ini">${esc(ini)}</div>`}
    ${ring?'<span class="tierring"></span>':''}<span class="pulse"></span></div>`;
}

/* ==========================================================================
   4 · CURSOR · MAGNETIC · SCROLL PROGRESS
   ========================================================================== */
const canHoverFine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let cur=null,curX=0,curY=0,ringX=0,ringY=0;
function initCursor(){
  if(!canHoverFine)return;
  cur=document.createElement('div');cur.id='px-cursor';
  cur.innerHTML='<div class="ring"></div><div class="dot"></div><div class="lbl"></div>';
  document.body.appendChild(cur);
  const ring=cur.querySelector('.ring'),dot=cur.querySelector('.dot'),lbl=cur.querySelector('.lbl');
  addEventListener('pointermove',e=>{
    curX=e.clientX;curY=e.clientY;cur.classList.add('on');
    dot.style.transform=`translate3d(${curX}px,${curY}px,0) translate(-50%,-50%)`;
    const el=e.target.closest('a,button,[data-nav],[role="button"],input,textarea,select,.pcard,.px-prow,.px-qa button,.px-avstyles button');
    cur.classList.toggle('hot',!!el&&!el.matches('input,textarea,select'));
    cur.classList.toggle('txt',!!el&&el.matches('input,textarea'));
    const big=e.target.closest('[data-cursor]');
    cur.classList.toggle('big',!!big);
    if(big){lbl.textContent=big.dataset.cursor;
      lbl.style.transform=`translate3d(${curX}px,${curY}px,0) translate(-50%,-50%)`;}
  },{passive:true});
  addEventListener('pointerleave',()=>cur.classList.remove('on'));
  addEventListener('mousedown',()=>ring.style.width=ring.style.height='22px');
  addEventListener('mouseup',()=>{ring.style.width='';ring.style.height='';});
  (function loop(){
    ringX+=(curX-ringX)*0.17;ringY+=(curY-ringY)*0.17;
    ring.style.transform=`translate3d(${ringX.toFixed(2)}px,${ringY.toFixed(2)}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
}
/* Magnetism is already owned by the base (gsap.to on .mag). A second writer
   on the same nodes fights it frame by frame — so this layer adds none. */
function initProgress(){
  const b=document.createElement('div');b.id='px-prog';document.body.appendChild(b);
  const upd=()=>{
    const h=document.documentElement.scrollHeight-innerHeight;
    const p=h>0?Math.min(1,(window.scrollY||pageScroll||0)/h):0;
    b.style.transform=`scaleX(${p.toFixed(4)})`;b.classList.toggle('on',p>0.005);
  };
  addEventListener('scroll',upd,{passive:true});
  try{lenis.on('scroll',upd);}catch(e){}
  upd();
}

/* --- architectural light -------------------------------------------------
   The only thing this layer moves is light. Geometry belongs to the base
   parallax and to the GSAP entrance timelines; a second writer on those
   nodes fights them every frame. */
function collectDepth(){}
function depthTick(){}
if(canHoverFine)addEventListener('pointermove',e=>{
  const f=document.querySelectorAll('.px-lightfield');
  if(!f.length)return;
  const x=(e.clientX/innerWidth*100).toFixed(1), y=(e.clientY/innerHeight*100).toFixed(1);
  f.forEach(l=>{l.style.setProperty('--lx',x+'%');l.style.setProperty('--ly',y+'%');});
},{passive:true});

/* ==========================================================================
   5 · COMMAND PALETTE
   ========================================================================== */
const KVA='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const K_IC={
  page:'<svg '+KVA+'><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  act:'<svg '+KVA+'><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  set:'<svg '+KVA+'><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 008.9 19a1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 8.9a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'
};
let kOpen=false,kIdx=0,kRows=[];
function cmdIndex(){
  const rows=[];
  const push=(g,ic,nm,sub,hint,run)=>rows.push({g,ic,nm,sub,hint,run,hay:(nm+' '+(sub||'')).toLowerCase()});
  /* pages */
  [['/','Home','Inicio'],['/fitness','Fitness','Fitness'],['/beauty','Beauty','Belleza'],
   ['/longevity','Longevity','Longevidad'],['/quality','Quality & COA','Calidad y COA'],
   ['/tools','Tools · PX Advisor','Herramientas · Asesor PX'],['/track','Track order','Consulta de pedido'],
   ['/about','About','Nosotros'],['/faq','FAQ','Preguntas'],['/contact','Contact','Contacto'],
   ['/account','My account','Mi cuenta'],['/terms','Terms','Términos'],['/privacy','Privacy','Privacidad']
  ].forEach(([r,en,es])=>push(t('Navigate','Navegar'),K_IC.page,t(en,es),r,'↵',()=>navigate(r)));
  /* catalogue */
  Object.keys(LINES).forEach(lk=>{
    LINES[lk].products.forEach((p,i)=>{
      const vs=(typeof PXVAR!=='undefined'&&PXVAR[p[0]])||[];
      push(t('Catalogue','Catálogo'),p[0],p[1],
        LINES[lk].name+' · '+p[2],vs.length?vs.length+'':'',
        ()=>{closeCmd();navigate('/'+lk);setTimeout(()=>openProduct(lk,i),1900);});
    });
  });
  /* actions */
  const acts=[
    [t('Open PX Assistant','Abrir Asesor PX'),t('Ask about compounds, protocols and orders','Pregunta por compuestos, protocolos y pedidos'),()=>openAI()],
    [t('My quotation list','Mi lista de cotización'),t('Review and send','Revisar y enviar'),()=>openBag()],
    [t('Request a quotation','Solicitar cotización'),'',()=>{const b=document.getElementById('wl');if(b)b.classList.add('on');document.querySelector('[data-wl]')&&document.querySelector('[data-wl]').click();}],
    [t('Notifications','Notificaciones'),'',()=>toggleNotif(true)],
    [t('Sign out','Cerrar sesión'),'',()=>{if(currentUser())logout();else openAuth('login');}]
  ];
  acts.forEach(([n,s,f])=>push(t('Actions','Acciones'),K_IC.act,n,s,'↵',f));
  /* settings */
  const sets=[
    [t('Motion · Full','Movimiento · Completo'),()=>setPref('motion','full')],
    [t('Motion · Reduced','Movimiento · Reducido'),()=>setPref('motion','reduced')],
    [t('Language · English','Idioma · Inglés'),()=>{if(LANG!=='en')document.getElementById('langTog').click();}],
    [t('Language · Español','Idioma · Español'),()=>{if(LANG!=='es')document.getElementById('langTog').click();}],
    [t('Region · PEPTIDEX USA','Región · PEPTIDEX USA'),()=>{if(REGION!=='usa')document.querySelector('[data-region-tog]').click();}],
    [t('Region · PEPTIDEX México','Región · PEPTIDEX México'),()=>{if(REGION!=='mex')document.querySelector('[data-region-tog]').click();}]
  ];
  sets.forEach(([n,f])=>push(t('Settings','Ajustes'),K_IC.set,n,'','↵',f));
  return rows;
}
let CMD_ROWS=null;
function score(row,q){
  if(!q)return 1;
  const h=row.hay;
  if(h.startsWith(q))return 100;
  const i=h.indexOf(q);
  if(i>=0)return 70-Math.min(i,30);
  /* subsequence */
  let j=0;for(let k=0;k<h.length&&j<q.length;k++)if(h[k]===q[j])j++;
  return j===q.length?26:0;
}
function renderCmd(q){
  const list=document.querySelector('#px-cmdk .k-list');
  q=(q||'').trim().toLowerCase();
  kRows=CMD_ROWS.map(r=>({r,s:score(r,q)})).filter(x=>x.s>0)
    .sort((a,b)=>b.s-a.s).slice(0,q?40:22).map(x=>x.r);
  if(!kRows.length){list.innerHTML=`<div class="k-empty">${t('Nothing matched','Sin resultados')}<br><span style="opacity:.6">${esc(q)}</span></div>`;return;}
  let html='',g=null;
  kRows.forEach((r,i)=>{
    if(r.g!==g){g=r.g;html+=`<div class="k-grp">${esc(g)}</div>`;}
    const ic=r.ic&&r.ic.startsWith('<svg')?r.ic:esc(r.ic||'');
    html+=`<div class="k-it" role="option" data-i="${i}" aria-selected="${i===kIdx}">
      <div class="k-ic">${ic}</div>
      <div class="k-t"><div class="k-nm">${esc(r.nm)}</div>${r.sub?`<div class="k-sub">${esc(r.sub)}</div>`:''}</div>
      ${r.hint?`<div class="k-hint">${esc(r.hint)}</div>`:''}</div>`;
  });
  list.innerHTML=html;
}
function moveCmd(d){
  if(!kRows.length)return;
  kIdx=(kIdx+d+kRows.length)%kRows.length;
  const list=document.querySelector('#px-cmdk .k-list');
  [...list.querySelectorAll('.k-it')].forEach((el,i)=>el.setAttribute('aria-selected',String(i===kIdx)));
  const sel=list.querySelector('[aria-selected="true"]');
  if(sel)sel.scrollIntoView({block:'nearest'});
}
function openCmd(){
  const box=document.getElementById('px-cmdk');if(!box)return;
  if(!CMD_ROWS)CMD_ROWS=cmdIndex();
  kOpen=true;kIdx=0;box.classList.add('on');
  const inp=box.querySelector('input');inp.value='';renderCmd('');
  setTimeout(()=>inp.focus(),40);
  try{lenis.stop();}catch(e){}
}
function closeCmd(){
  const box=document.getElementById('px-cmdk');if(!box)return;
  kOpen=false;box.classList.remove('on');
  try{if(!document.getElementById('bag').classList.contains('on'))lenis.start();}catch(e){}
}
function runCmd(i){
  const r=kRows[i!=null?i:kIdx];if(!r)return;
  const u=currentUser();
  if(u){profile(u);const q=document.querySelector('#px-cmdk input').value.trim();
    if(q){u.searches.unshift({q,ts:Date.now()});u.searches=u.searches.slice(0,24);saveUser(u);}}
  closeCmd();
  setTimeout(()=>{try{r.run()}catch(e){console.warn(e)}},60);
}

/* ==========================================================================
   6 · NOTIFICATION CENTRE
   ========================================================================== */
function toggleNotif(force){
  const p=document.getElementById('px-notif');if(!p)return;
  const on=force!=null?force:!p.classList.contains('on');
  if(on&&!currentUser()){openAuth('login',t('Sign in to see your notifications.','Inicia sesión para ver tus notificaciones.'));return;}
  p.classList.toggle('on',on);
  if(on)renderNotif();
}
function renderNotif(){
  const u=currentUser();if(!u)return;
  profile(u);seedNotifs(u);
  const l=document.querySelector('#px-notif .nl');
  const ns=u.notifs||[];
  l.innerHTML=ns.length?ns.map(n=>`<div class="ni${n.read?'':' unread'}" data-notif="${n.id}">
      <span class="dt"></span><div class="tx"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><i>${ago(n.ts)}</i></div></div>`).join('')
    :`<div class="px-empty" style="text-align:center;padding:36px">${t('No notifications yet.','Sin notificaciones.')}</div>`;
}
function ago(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return t('just now','ahora');
  const m=Math.floor(s/60);if(m<60)return m+t(' min ago',' min');
  const h=Math.floor(m/60);if(h<24)return h+t(' h ago',' h');
  const d=Math.floor(h/24);if(d<30)return d+t(' d ago',' d');
  return new Date(ts).toLocaleDateString(LANG==='es'?'es-MX':'en-US',{day:'numeric',month:'short'});
}

/* ==========================================================================
   7 · PLATFORM UI SYNC (nav avatar, badges)
   ========================================================================== */
function refreshSideAvatar(){
  const u=currentUser();if(!u)return;
  const s=avatarSrc(u);
  document.querySelectorAll('.acct-id .px-av img').forEach(im=>{if(s)im.src=s;});
}
function syncPlatformUI(){
  const u=currentUser();
  const acct=document.getElementById('acctNav');
  if(acct&&u){
    const s=avatarSrc(u);
    if(s){acct.classList.add('in');acct.innerHTML=`<img src="${s}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>`;
      acct.style.padding='0';acct.style.overflow='hidden';}
  } else if(acct){acct.style.padding='';acct.style.overflow='';}
  const nb=document.getElementById('px-nbadge');
  const n=unread();
  if(nb){nb.textContent=n>9?'9+':String(n);nb.classList.toggle('on',n>0);}
  const ab=document.querySelector('#px-ai-dock .nb');
  if(ab){ab.textContent=n>9?'9+':String(n);ab.classList.toggle('on',n>0&&!document.getElementById('px-ai').classList.contains('on'));}
}

/* ==========================================================================
   8 · MOUNT — nav controls, overlays
   ========================================================================== */
function mountChrome(){
  /* skip link */
  const skip=document.createElement('a');skip.className='px-skip';skip.href='#app';
  skip.textContent=t('Skip to content','Saltar al contenido');
  document.body.insertBefore(skip,document.body.firstChild);

  /* toasts, palette, notifications, assistant */
  document.body.insertAdjacentHTML('beforeend',`
  <div id="px-toasts" aria-live="polite"></div>
  <div id="px-cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="k-box">
      <div class="k-in">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>
        <input type="text" autocomplete="off" spellcheck="false" placeholder="${esc(t('Search compounds, pages, actions…','Busca compuestos, páginas, acciones…'))}" aria-label="Search"/>
        <span class="k-esc">ESC</span>
      </div>
      <div class="k-list" role="listbox"></div>
      <div class="k-foot">
        <span><b>↑↓</b> ${esc(t('navigate','navegar'))}</span>
        <span><b>↵</b> ${esc(t('open','abrir'))}</span>
        <span><b>⌘K</b> ${esc(t('anywhere','en cualquier lugar'))}</span>
      </div>
    </div>
  </div>
  <div id="px-notif" role="dialog" aria-label="Notifications">
    <div class="nh"><b>${esc(t('Notifications','Notificaciones'))}</b>
      <button id="px-nread">${esc(t('Mark all read','Marcar leídas'))}</button></div>
    <div class="nl"></div>
  </div>
  <button id="px-ai-dock" aria-label="PX Assistant">
    <span class="tag">${esc(t('Ask PX Assistant','Pregunta al Asesor PX'))}</span>
    <span class="orb"><i></i><u></u><b>PX</b><span class="nb"></span></span>
  </button>
  <div id="px-ai" role="dialog" aria-label="PX Assistant">
    <div class="ah">
      <div class="av">PX</div>
      <div class="nm"><b>PX Assistant</b><span id="px-ai-st">${esc(t('Online · private','En línea · privado'))}</span></div>
      <button id="px-ai-clr" title="${esc(t('Clear conversation','Limpiar conversación'))}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>
      <button id="px-ai-x" title="${esc(t('Close','Cerrar'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="abody" id="px-ai-body"></div>
    <div class="afoot">
      <textarea id="px-ai-in" rows="1" placeholder="${esc(t('Ask about a compound, dose or order…','Pregunta por un compuesto, dosis o pedido…'))}"></textarea>
      <button class="send" id="px-ai-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 8 6 8-16-8z"/></svg></button>
    </div>
  </div>`);

  /* nav: search + notifications, placed before the existing controls */
  const acc=document.querySelector('nav .navacc');
  if(acc){
    const kbd=document.createElement('button');
    kbd.className='px-kbd';kbd.id='px-kbtn';
    kbd.setAttribute('aria-label',t('Search','Buscar'));
    kbd.innerHTML=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>
      <span>${/Mac|iPhone|iPad/.test(navigator.platform||'')?'⌘':'Ctrl'} K</span>`;
    const bell=document.createElement('button');
    bell.className='iconbtn px-navbtn';bell.id='px-bell';
    bell.setAttribute('aria-label',t('Notifications','Notificaciones'));
    bell.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg><span class="badge2" id="px-nbadge">0</span>`;
    acc.insertBefore(kbd,acc.firstChild);
    acc.insertBefore(bell,acc.children[3]||null);
  }

  /* listeners */
  document.getElementById('px-kbtn')&&(document.getElementById('px-kbtn').onclick=openCmd);
  document.getElementById('px-bell')&&(document.getElementById('px-bell').onclick=e=>{e.stopPropagation();toggleNotif();});
  document.getElementById('px-nread').onclick=()=>{
    const u=currentUser();if(!u)return;(u.notifs||[]).forEach(n=>n.read=true);saveUser(u);renderNotif();syncPlatformUI();};
  document.addEventListener('click',e=>{
    const p=document.getElementById('px-notif');
    if(p&&p.classList.contains('on')&&!e.target.closest('#px-notif')&&!e.target.closest('#px-bell'))p.classList.remove('on');
    const ni=e.target.closest('[data-notif]');
    if(ni){const u=currentUser();const n=u&&(u.notifs||[]).find(x=>x.id===ni.dataset.notif);
      if(n){n.read=true;saveUser(u);renderNotif();syncPlatformUI();if(n.href)location.hash=n.href.replace('#','');}}
  });

  const box=document.getElementById('px-cmdk');
  box.addEventListener('click',e=>{
    if(e.target===box){closeCmd();return;}
    const it=e.target.closest('.k-it');if(it)runCmd(+it.dataset.i);
  });
  box.querySelector('input').addEventListener('input',e=>{kIdx=0;renderCmd(e.target.value);});
  box.querySelector('input').addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();moveCmd(1);}
    else if(e.key==='ArrowUp'){e.preventDefault();moveCmd(-1);}
    else if(e.key==='Enter'){e.preventDefault();runCmd();}
    else if(e.key==='Escape'){e.preventDefault();closeCmd();}
  });

  addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();kOpen?closeCmd():openCmd();return;}
    if(e.key==='Escape'){if(kOpen)closeCmd();
      const ai=document.getElementById('px-ai');if(ai&&ai.classList.contains('on'))closeAI();
      const np=document.getElementById('px-notif');if(np)np.classList.remove('on');}
    if(e.key==='/'&&!/input|textarea|select/i.test((e.target.tagName||''))&&!kOpen){e.preventDefault();openCmd();}
  });

  /* assistant */
  document.getElementById('px-ai-dock').onclick=()=>openAI();
  document.getElementById('px-ai-x').onclick=closeAI;
  document.getElementById('px-ai-clr').onclick=()=>{AI.log=[];saveAI();renderAI(true);};
  const ta=document.getElementById('px-ai-in');
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(100,ta.scrollHeight)+'px';
    document.getElementById('px-ai-send').disabled=!ta.value.trim();});
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI();}});
  document.getElementById('px-ai-send').onclick=sendAI;
  document.getElementById('px-ai-send').disabled=true;
  document.getElementById('px-ai').addEventListener('click',e=>{
    const c=e.target.closest('[data-aichip]');if(c){askAI(c.dataset.aichip);return;}
    const p=e.target.closest('[data-aiprod]');if(p){const [k,i]=p.dataset.aiprod.split(':');
      closeAI();navigate('/'+k);setTimeout(()=>openProduct(k,+i),1900);return;}
    const n=e.target.closest('[data-ainav]');if(n){closeAI();navigate(n.dataset.ainav);}
  });
}

/* ==========================================================================
   9 · PX ASSISTANT — a local knowledge engine over the real catalogue.
   No network, no model: deterministic intent matching + curated knowledge.
   ========================================================================== */
const AIKEY='px-ai-log';
let AI={log:[],ctx:{}};
try{AI=Object.assign(AI,JSON.parse(localStorage.getItem(AIKEY)||'{}'));}catch(e){}
function saveAI(){try{localStorage.setItem(AIKEY,JSON.stringify({log:AI.log.slice(-40),ctx:AI.ctx}))}catch(e){}}

const GLOSS={
  'peptide':[ 'A short chain of amino acids — typically under 50 — that acts as a signalling molecule. Peptides instruct cells rather than force them, which is why they are dosed in micrograms to milligrams.',
              'Cadena corta de aminoácidos —normalmente menos de 50— que actúa como molécula señalizadora. Los péptidos instruyen a la célula en vez de forzarla, por eso se dosifican en microgramos a miligramos.'],
  'lyophilized':['Freeze-dried. The compound is supplied as a stable powder and reconstituted with bacteriostatic water before use.',
              'Liofilizado. El compuesto se entrega como polvo estable y se reconstituye con agua bacteriostática antes de usarse.'],
  'reconstitution':['Adding solvent to a lyophilised vial. Concentration = mg in the vial ÷ mL of solvent added. The Tools page has a calculator for this.',
              'Añadir solvente a un vial liofilizado. Concentración = mg del vial ÷ mL de solvente. La página de Herramientas tiene calculadora.'],
  'bacteriostatic':['Sterile water with 0.9% benzyl alcohol. The preservative allows multiple withdrawals over ~28 days refrigerated.',
              'Agua estéril con 0.9% de alcohol bencílico. El conservador permite múltiples extracciones durante ~28 días en refrigeración.'],
  'coa':['Certificate of Analysis — the third-party laboratory document stating identity, purity and mass for a specific lot.',
              'Certificado de Análisis — documento de laboratorio externo que declara identidad, pureza y masa de un lote específico.'],
  'hplc':['High-Performance Liquid Chromatography. Separates the sample to quantify purity — our benchmark is ≥ 99%.',
              'Cromatografía Líquida de Alta Resolución. Separa la muestra para cuantificar pureza — nuestro estándar es ≥ 99%.'],
  'ms':['Mass Spectrometry. Confirms molecular weight, i.e. that the molecule is the one it claims to be.',
              'Espectrometría de Masas. Confirma el peso molecular, es decir, que la molécula es la que dice ser.'],
  'purity':['The percentage of the sample that is the target molecule. Below 98% the remainder is truncated sequences and salts.',
              'Porcentaje de la muestra que es la molécula objetivo. Bajo 98% el resto son secuencias truncadas y sales.'],
  'glp-1':['Glucagon-like peptide-1 receptor agonists — the metabolic class that includes Semaglutide, Tirzepatide and Retatrutide.',
              'Agonistas del receptor GLP-1 — la clase metabólica que incluye Semaglutida, Tirzepatida y Retatrutida.'],
  'secretagogue':['A compound that prompts the pituitary to release its own growth hormone, rather than supplying hormone directly.',
              'Compuesto que induce a la hipófisis a liberar su propia hormona de crecimiento, en vez de aportarla directamente.'],
  'half-life':['How long until half the compound has cleared. It sets dosing frequency — short half-life means more frequent administration.',
              'Tiempo hasta que se elimina la mitad del compuesto. Define la frecuencia de dosis — vida media corta implica administración más frecuente.'],
  'iu':['International Unit — a potency-based measure used for hormones such as HGH rather than a mass measure.',
              'Unidad Internacional — medida de potencia usada en hormonas como la HGH, en vez de una medida de masa.'],
  'stack':['Two or more compounds used together for complementary mechanisms. Our GLOW and KLOW blends are pre-formulated stacks.',
              'Dos o más compuestos usados juntos por mecanismos complementarios. Las mezclas GLOW y KLOW son stacks preformulados.'],
  'lot':['The production batch identifier. Every PEPTIDEX vial carries one, and every COA is tied to it.',
              'Identificador del lote de producción. Cada vial PEPTIDEX lo lleva y cada COA está ligado a él.'],
  'cold chain':['Temperature-controlled handling. Lyophilised powder is stable at room temperature in transit; reconstituted vials need refrigeration.',
              'Manejo con temperatura controlada. El polvo liofilizado es estable a temperatura ambiente en tránsito; los viales reconstituidos requieren refrigeración.'],
  'research use only':['These materials are supplied for laboratory research. They are not medicines and are not for human or veterinary use.',
              'Estos materiales se suministran para investigación de laboratorio. No son medicamentos ni son para uso humano o veterinario.']
};
const GOALS=[
  {k:'recovery',  en:['recovery','heal','injury','tendon','joint','repair'],es:['recuperación','recuperacion','lesión','lesion','tendón','tendon','articulación','sanar','reparar'],picks:['BC','TB','BB','RA']},
  {k:'fatloss',   en:['fat','weight','lean','cut','appetite','obesity','slim'],es:['grasa','peso','bajar','definir','apetito','obesidad','adelgazar'],picks:['RT','TR','SM','CGL','AD','AM']},
  {k:'muscle',    en:['muscle','mass','strength','anabolic','growth','bulk'],es:['músculo','musculo','masa','fuerza','anabólico','crecer','volumen'],picks:['IG','CP','IPA','TSM']},
  {k:'gh',        en:['growth hormone','gh','igf','pituitary'],es:['hormona de crecimiento','gh','igf','hipófisis','hipofisis'],picks:['CD','IPA','CP','SMO','TSM','H']},
  {k:'sleep',     en:['sleep','insomnia','rest','circadian'],es:['sueño','sueno','dormir','insomnio','descanso','circadiano'],picks:['DS','ML','ET']},
  {k:'skin',      en:['skin','collagen','wrinkle','glow','anti-aging face','firmness'],es:['piel','colágeno','colageno','arruga','luminosidad','firmeza'],picks:['CU','MX','GL','NP8','GT']},
  {k:'hair',      en:['hair','scalp','alopecia','follicle'],es:['cabello','pelo','cuero cabelludo','alopecia','folículo'],picks:['AC','CU']},
  {k:'cognition', en:['focus','memory','cognition','brain','nootropic','learning'],es:['concentración','concentracion','memoria','cognición','cerebro','nootrópico','aprendizaje'],picks:['SX','SK','DX','AX','PI']},
  {k:'immune',    en:['immune','immunity','defense','thymus'],es:['inmune','inmunidad','defensas','timo'],picks:['Ta1','TY','KP']},
  {k:'energy',    en:['energy','mitochondria','endurance','stamina','fatigue'],es:['energía','energia','mitocondria','resistencia','fatiga'],picks:['MS','2S','NJ','AR','B12']},
  {k:'libido',    en:['libido','desire','sexual','arousal'],es:['libido','deseo','sexual'],picks:['PT','MT2','OT','KS']},
  {k:'longevity', en:['longevity','aging','senescence','telomere','lifespan','healthspan'],es:['longevidad','envejecimiento','senescencia','telómero','telomero','vida'],picks:['ET','NJ','F4','CTL','PI']},
  {k:'tan',       en:['tan','tanning','melanin','sun'],es:['bronceado','broncear','melanina','sol'],picks:['MT1','MT2']}
];

function allProducts(){
  const out=[];
  Object.keys(LINES).forEach(k=>LINES[k].products.forEach((p,i)=>out.push({k,i,code:p[0],name:p[1],spec:p[2],note:p[3],line:LINES[k]})));
  return out;
}
function findProducts(q){
  const s=q.toLowerCase();
  const all=allProducts();
  const hits=all.map(p=>{
    const n=p.name.toLowerCase(),c=p.code.toLowerCase();
    let sc=0;
    if(n===s||c===s)sc=100;
    else if(n.startsWith(s)||c===s)sc=80;
    else if(n.indexOf(s)>=0)sc=60;
    else if(s.length>=3&&(p.note||'').toLowerCase().indexOf(s)>=0)sc=22;
    /* token overlap */
    if(!sc){const ts=s.split(/[\s,-]+/).filter(x=>x.length>2);
      if(ts.length&&ts.every(x=>n.indexOf(x)>=0))sc=50;}
    return {p,sc};
  }).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc);
  return hits.map(x=>x.p);
}
function prodLine(p){
  const vs=(typeof PXVAR!=='undefined'&&PXVAR[p.code])||[];
  const mg=vs.length?vs.map(v=>v.l).join(' · '):p.spec;
  let price='';
  if(REGION==='usa'){try{const pr=PRICE(p.code);if(pr)price=' · '+t('from','desde')+' $'+pr.u;}catch(e){}}
  return {mg,price};
}
function prodCard(p){
  const {mg,price}=prodLine(p);
  return `<div class="prodmini" data-aiprod="${p.k}:${p.i}">
    <span class="c">${esc(p.code)}</span>
    <span class="n">${esc(p.name)}<span class="s" style="display:block">${esc(mg)}${esc(price)}</span></span></div>`;
}
function chips(list){return `<div class="pchips">${list.map(c=>`<button data-aichip="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;}

function aiReply(qRaw){
  const q=String(qRaw||'').trim();const s=q.toLowerCase();
  const u=currentUser();
  const has=(...ws)=>ws.some(w=>s.indexOf(w)>=0);
  const name=(u&&(u.profile&&u.profile.display||u.name)||'').split(' ')[0];

  /* --- greeting ---------------------------------------------------------- */
  if(/^(hi|hey|hello|hola|buenas|buenos d|qué tal|que tal)\b/.test(s)||s==='ok'){
    return {ttl:'PX Assistant',
      html:t(`Good to see you${name?', '+esc(name):''}. I know the full PEPTIDEX catalogue — 56 compounds across 118 presentations — plus our quality protocol and your own account. What are you working on?`,
             `Qué gusto verte${name?', '+esc(name):''}. Conozco el catálogo completo de PEPTIDEX —56 compuestos en 118 presentaciones— además del protocolo de calidad y tu cuenta. ¿En qué estás trabajando?`),
      chips:[t('Recommend for recovery','Recomienda para recuperación'),t('Explain reconstitution','Explica la reconstitución'),
             t('Compare Retatrutide and Tirzepatide','Compara Retatrutida y Tirzepatida'),t('Track my order','Rastrear mi pedido')]};
  }

  /* --- help -------------------------------------------------------------- */
  if(has('help','ayuda','qué puedes','que puedes','what can you')){
    return {ttl:t('What I can do','Qué puedo hacer'),
      html:t('I work entirely on this device — nothing you type leaves your browser.','Trabajo completamente en este dispositivo — nada de lo que escribes sale de tu navegador.'),
      list:[t('Look up any compound and its mg presentations','Buscar cualquier compuesto y sus presentaciones en mg'),
        t('Recommend compounds for a research goal','Recomendar compuestos para un objetivo de investigación'),
        t('Compare two compounds side by side','Comparar dos compuestos lado a lado'),
        t('Explain terminology — HPLC, COA, half-life, GLP-1','Explicar terminología — HPLC, COA, vida media, GLP-1'),
        t('Do reconstitution maths','Hacer los cálculos de reconstitución'),
        t('Check an order and open the tracking page','Consultar un pedido y abrir la página de rastreo'),
        t('Take you anywhere on the platform','Llevarte a cualquier parte de la plataforma')],
      chips:[t('Recommend for skin','Recomienda para piel'),t('What is HPLC','Qué es HPLC'),t('Open my dashboard','Abrir mi panel')]};
  }

  /* --- navigation -------------------------------------------------------- */
  const navMap=[[['dashboard','panel','my account','mi cuenta'],'/account'],
    [['track','rastre','pedido','order status'],'/track'],[['tool','herramienta','calculator','calculadora','advisor','asesor'],'/tools'],
    [['quality','calidad','coa page'],'/quality'],[['contact','contacto'],'/contact'],[['faq','preguntas'],'/faq'],
    [['about','nosotros'],'/about'],[['checkout','pagar','carrito'],'/checkout'],
    [['fitness'],'/fitness'],[['beauty','belleza'],'/beauty'],[['longevity','longevidad'],'/longevity']];
  if(has('open','abre','abrir','go to','ir a','llévame','llevame','take me','show me the')){
    for(const [ws,r] of navMap) if(ws.some(w=>s.indexOf(w)>=0))
      return {ttl:t('Navigating','Navegando'),html:t('Opening that for you.','Te lo abro.'),nav:r,
        chips:[t('Stay here','Quedarme aquí')]};
  }

  /* --- order tracking ---------------------------------------------------- */
  if(has('order','pedido','track','rastre','shipment','envío','envio')){
    const reqs=(u&&u.reqs)||[];
    if(reqs.length){
      return {ttl:t('Your requests','Tus solicitudes'),
        html:t(`You have ${reqs.length} quotation request${reqs.length>1?'s':''} on file. The most recent is <b>${esc(reqs[0].id)}</b> — ${esc(reqs[0].interest||'—')}, ${esc(reqs[0].status||'sent')}.`,
               `Tienes ${reqs.length} solicitud${reqs.length>1?'es':''} registrada${reqs.length>1?'s':''}. La más reciente es <b>${esc(reqs[0].id)}</b> — ${esc(reqs[0].interest||'—')}, ${esc(reqs[0].status||'enviada')}.`),
        chips:[t('Open tracking page','Abrir rastreo'),t('Open my dashboard','Abrir mi panel')]};
    }
    return {ttl:t('Order tracking','Rastreo de pedidos'),
      html:t('Enter your order number on the tracking page and I will pull its status. If you have not ordered yet, start a quotation from any product.',
             'Ingresa tu número de pedido en la página de rastreo y traigo su estado. Si aún no has pedido, inicia una cotización desde cualquier producto.'),
      nav:'/track'};
  }

  /* --- reconstitution / dose maths --------------------------------------- */
  const mgm=s.match(/(\d+(?:\.\d+)?)\s*mg/), mlm=s.match(/(\d+(?:\.\d+)?)\s*ml/), mcgm=s.match(/(\d+(?:\.\d+)?)\s*(mcg|µg|ug)/);
  if((has('reconstitut','reconstituc','dilute','diluir','mix','mezcl','how much water','cuánta agua','cuanta agua','units','unidades','syringe','jeringa')||(mgm&&mlm))){
    if(mgm&&mlm){
      const mg=parseFloat(mgm[1]),ml=parseFloat(mlm[1]);
      const conc=mg/ml; const perUnit=conc/100;
      let extra='';
      if(mcgm){const mcg=parseFloat(mcgm[1]);const units=(mcg/1000)/conc*100;
        extra=t(`<br><br>For a <b>${mcg} mcg</b> dose you would draw <b>${units.toFixed(1)} units</b> on a U-100 insulin syringe (${(units/100).toFixed(3)} mL).`,
                `<br><br>Para una dosis de <b>${mcg} mcg</b> tomarías <b>${units.toFixed(1)} unidades</b> en jeringa de insulina U-100 (${(units/100).toFixed(3)} mL).`);}
      return {ttl:t('Reconstitution','Reconstitución'),
        html:t(`<b>${mg} mg</b> in <b>${ml} mL</b> gives <b>${conc.toFixed(2)} mg/mL</b> — that is <b>${(perUnit*1000).toFixed(0)} mcg</b> per insulin unit on a U-100 syringe.${extra}`,
               `<b>${mg} mg</b> en <b>${ml} mL</b> da <b>${conc.toFixed(2)} mg/mL</b> — es decir <b>${(perUnit*1000).toFixed(0)} mcg</b> por unidad de insulina en jeringa U-100.${extra}`),
        chips:[t('Open the calculator','Abrir la calculadora')]};
    }
    return {ttl:t('Reconstitution','Reconstitución'),
      html:t('Concentration is simply the vial strength divided by the solvent volume you add. Tell me the numbers — for example <i>"10 mg in 2 mL, 250 mcg dose"</i> — and I will do the arithmetic, or open the full calculator.',
             'La concentración es la potencia del vial dividida entre el volumen de solvente que agregas. Dime los números —por ejemplo <i>"10 mg en 2 mL, dosis de 250 mcg"</i>— y hago la aritmética, o abre la calculadora completa.'),
      chips:['10 mg + 2 mL','5 mg + 1 mL','Open the calculator']};
  }

  /* --- comparison -------------------------------------------------------- */
  const cmp=s.match(/(?:compare|compara|vs\.?|versus|contra)\s*(.+)/);
  if(cmp||(has(' vs ',' versus ',' contra '))){
    const raw=(cmp?cmp[1]:s).replace(/\b(vs\.?|versus|contra|and|y|con)\b/g,'|');
    const parts=raw.split('|').map(x=>x.trim()).filter(Boolean);
    const a=parts[0]?findProducts(parts[0])[0]:null, b=parts[1]?findProducts(parts[1])[0]:null;
    if(a&&b){
      const A=prodLine(a),B=prodLine(b);
      return {ttl:t('Side by side','Lado a lado'),
        html:t(`<b>${esc(a.name)}</b> — ${esc(a.note)}. ${esc(a.line.name)} line, ${esc(A.mg)}.<br><br><b>${esc(b.name)}</b> — ${esc(b.note)}. ${esc(b.line.name)} line, ${esc(B.mg)}.`,
               `<b>${esc(a.name)}</b> — ${esc(a.note)}. Línea ${esc(a.line.name)}, ${esc(A.mg)}.<br><br><b>${esc(b.name)}</b> — ${esc(b.note)}. Línea ${esc(b.line.name)}, ${esc(B.mg)}.`),
        cards:[a,b],
        chips:[t('Open full comparator','Abrir comparador completo')]};
    }
  }

  /* --- recommendation by goal -------------------------------------------- */
  const goal=GOALS.find(g=>(LANG==='es'?g.es:g.en).concat(LANG==='es'?g.en:g.es).some(w=>s.indexOf(w)>=0));
  if(goal&&(has('recommend','recomien','suggest','sugier','best','mejor','for ','para ','which','cuál','cual','help with','ayuda con')||has(...(LANG==='es'?goal.es:goal.en)))){
    const picks=goal.picks.map(c=>allProducts().find(p=>p.code===c)).filter(Boolean).slice(0,4);
    if(picks.length){
      if(u){profile(u);AI.ctx.goal=goal.k;saveAI();}
      return {ttl:t('Recommended','Recomendado'),
        html:t(`For that direction, these are the compounds in our catalogue with the most direct mechanism. Every one ships with a lot-specific COA.`,
               `Para esa dirección, estos son los compuestos de nuestro catálogo con el mecanismo más directo. Todos se envían con COA específico del lote.`),
        cards:picks,
        chips:[t('Add the first to my list','Agregar el primero a mi lista'),t('Explain the first one','Explica el primero')]};
    }
  }

  /* --- glossary ---------------------------------------------------------- */
  for(const k in GLOSS){
    if(s.indexOf(k)>=0){
      return {ttl:t('Terminology','Terminología'),html:GLOSS[k][LANG==='es'?1:0],
        chips:[t('Quality & COA page','Página de Calidad y COA'),t('Explain purity','Explica pureza')]};
    }
  }

  /* --- price ------------------------------------------------------------- */
  if(has('price','precio','cost','costo','cuánto','cuanto','how much')){
    const ps=findProducts(s.replace(/(price|precio|cost|costo|cuánto|cuanto|how much|of|de|the|el|la)/g,'').trim());
    if(REGION!=='usa'){
      return {ttl:t('Pricing','Precios'),
        html:t('Public pricing is shown in the <b>PEPTIDEX USA</b> region. In México we quote privately — add compounds to your quotation list and we respond within 24–48 h.',
               'El precio público se muestra en la región <b>PEPTIDEX USA</b>. En México cotizamos en privado — agrega compuestos a tu lista y respondemos en 24–48 h.'),
        chips:[t('Switch to PEPTIDEX USA','Cambiar a PEPTIDEX USA'),t('Open my quotation list','Abrir mi lista')]};
    }
    if(ps.length){
      const p=ps[0],vs=(PXVAR[p.code]||[]);
      const rows=vs.map(v=>{const pr=PRICE(p.code,v.s);return pr?`${v.l} — $${pr.u}`:v.l;});
      return {ttl:t('Pricing · PEPTIDEX USA','Precios · PEPTIDEX USA'),
        html:`<b>${esc(p.name)}</b>`,list:rows,cards:[p]};
    }
  }

  /* --- product lookup ---------------------------------------------------- */
  const found=findProducts(s.replace(/\b(what|is|the|explain|tell me about|qué|que|es|el|la|sobre|acerca de|dime)\b/g,' ').trim());
  if(found.length){
    const p=found[0];const {mg,price}=prodLine(p);
    const vs=(PXVAR[p.code]||[]);
    return {ttl:p.line.name+' · '+p.code,
      html:t(`<b>${esc(p.name)}</b> — ${esc(p.note)}.<br><br>Available in ${vs.length||1} presentation${vs.length>1?'s':''}: ${esc(mg)}${esc(price)}. Purity ≥ 99%, tested in the USA, lot-specific COA included.`,
             `<b>${esc(p.name)}</b> — ${esc(p.note)}.<br><br>Disponible en ${vs.length||1} presentación${vs.length>1?'es':''}: ${esc(mg)}${esc(price)}. Pureza ≥ 99%, probado en USA, COA del lote incluido.`),
      cards:found.slice(1,3),
      chips:[t('Open the product','Abrir el producto'),t('Add to my list','Agregar a mi lista'),
             t('Compare with something','Comparar con otro')],
      focus:p};
  }

  /* --- fallback ---------------------------------------------------------- */
  return {ttl:t('Not sure yet','Aún no lo tengo'),
    html:t('I did not find that in the catalogue or the glossary. Try a compound name, a research goal, or a term like <i>HPLC</i>, <i>COA</i> or <i>reconstitution</i>.',
           'No encontré eso en el catálogo ni en el glosario. Prueba con el nombre de un compuesto, un objetivo de investigación, o un término como <i>HPLC</i>, <i>COA</i> o <i>reconstitución</i>.'),
    chips:[t('What can you do','Qué puedes hacer'),t('Recommend for recovery','Recomienda para recuperación'),
           t('Explain COA','Explica COA')]};
}

function openAI(){
  const p=document.getElementById('px-ai');if(!p)return;
  p.classList.add('on');document.getElementById('px-ai-dock').classList.add('hide');
  renderAI();syncPlatformUI();
  setTimeout(()=>document.getElementById('px-ai-in').focus(),120);
}
function closeAI(){
  const p=document.getElementById('px-ai');if(!p)return;
  p.classList.remove('on');
  if(PREFS.dockAI)document.getElementById('px-ai-dock').classList.remove('hide');
  syncPlatformUI();
}
function renderAI(fresh){
  const b=document.getElementById('px-ai-body');if(!b)return;
  if(!AI.log.length||fresh){
    const u=currentUser();
    const name=(u&&(u.profile&&u.profile.display||u.name)||'').split(' ')[0];
    AI.log=[{r:'a',d:{ttl:'PX Assistant',
      html:t(`${name?esc(name)+', w':'W'}elcome. I run entirely inside your browser — I know the catalogue, the quality protocol and your account, and nothing you type is sent anywhere.`,
             `${name?esc(name)+', b':'B'}ienvenido. Funciono completamente dentro de tu navegador — conozco el catálogo, el protocolo de calidad y tu cuenta, y nada de lo que escribes se envía a ningún lado.`),
      chips:[t('Recommend for recovery','Recomienda para recuperación'),t('What is a COA','Qué es un COA'),
             t('10 mg in 2 mL','10 mg en 2 mL'),t('What can you do','Qué puedes hacer')]}}];
    saveAI();
  }
  b.innerHTML=AI.log.map(m=>m.r==='u'
    ? `<div class="msg u">${esc(m.d)}</div>`
    : `<div class="msg a"><div class="bub">${m.d.ttl?`<div class="ttl">${esc(m.d.ttl)}</div>`:''}${m.d.html||''}
        ${m.d.list?`<ul>${m.d.list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
        ${(m.d.cards||[]).map(prodCard).join('')}
        ${m.d.chips?chips(m.d.chips):''}</div></div>`).join('');
  b.scrollTop=b.scrollHeight;
}
function askAI(q){
  const ta=document.getElementById('px-ai-in');ta.value=q;sendAI();
}
function sendAI(){
  const ta=document.getElementById('px-ai-in');
  const q=ta.value.trim();if(!q)return;
  ta.value='';ta.style.height='auto';document.getElementById('px-ai-send').disabled=true;
  AI.log.push({r:'u',d:q});renderAI();
  const b=document.getElementById('px-ai-body');
  const tp=document.createElement('div');tp.className='msg a';tp.innerHTML='<div class="bub" style="padding:0"><div class="typing"><i></i><i></i><i></i></div></div>';
  b.appendChild(tp);b.scrollTop=b.scrollHeight;
  setTimeout(()=>{
    tp.remove();
    const d=aiReply(q);
    AI.log.push({r:'a',d});AI.log=AI.log.slice(-40);saveAI();renderAI();
    logActivity('assistant',q.slice(0,90));
    if(d.nav)setTimeout(()=>{closeAI();navigate(d.nav);},700);
    if(d.focus)AI.ctx.last=d.focus.k+':'+d.focus.i;
    saveAI();
  },380+Math.random()*280);
}


/* ==========================================================================
   MEMBERSHIP CARD — the member's identity as an object
   ========================================================================== */
function memberCardHTML(u,mini){
  if(!u)return '';
  const p=profile(u),tier=tierOf(u);
  const src=avatarSrc(u);
  const ini=((p.display||u.name||u.email)||'?').trim().charAt(0).toUpperCase();
  const joined=new Date(u.created||Date.now()).toLocaleDateString(LANG==='es'?'es-MX':'en-US',{month:'short',year:'numeric'});
  const cn=(COUNTRIES.find(c=>c[0]===p.country)||[p.country,p.country])[1];
  const line=p.line&&LINES[p.line]?LINES[p.line].name:t('All lines','Todas las líneas');
  return `<div class="pxm-card${mini?' mini':''}" data-tier="${esc(tier.k)}" data-mcard>
    <div class="pxm-head">
      <img class="pxm-mark" src="${LOGOS.hero}" alt="PEPTIDEX"/>
      <span class="pxm-tier">${esc(t(tier.en,tier.es))}</span>
    </div>
    <div class="pxm-body">
      <div class="pxm-av">${src?`<img src="${src}" alt=""/>`:`<div class="ini" style="width:100%;height:100%;display:grid;place-items:center;font-weight:600">${esc(ini)}</div>`}</div>
      <div class="pxm-id">
        <div class="pxm-name">${esc(p.display||u.name||u.email)}</div>
        <div class="pxm-num">${esc(p.cid)}</div>
      </div>
    </div>
    <div class="pxm-rail">
      <div class="pxm-cell"><div class="pxm-k">${esc(t('Country','País'))}</div><div class="pxm-v">${esc(cn)}</div></div>
      <div class="pxm-cell"><div class="pxm-k">${esc(t('Member since','Miembro desde'))}</div><div class="pxm-v">${esc(joined)}</div></div>
      <div class="pxm-cell"><div class="pxm-k">${esc(t('Line','Línea'))}</div><div class="pxm-v">${esc(line)}</div></div>
      <div class="pxm-cell"><div class="pxm-k">${esc(t('Status','Estado'))}</div>
        <div class="pxm-v pxm-status"><i></i>${esc(t('Active','Activa'))}</div></div>
    </div>
  </div>`;
}
/* the card carries light and weight — both track the pointer */
if(canHoverFine)addEventListener('pointermove',e=>{
  const cards=document.querySelectorAll('[data-mcard]');
  if(!cards.length)return;
  cards.forEach(c=>{
    const r=c.getBoundingClientRect();
    const ix=(e.clientX-r.left)/r.width, iy=(e.clientY-r.top)/r.height;
    c.style.setProperty('--mx',(Math.max(-20,Math.min(120,ix*100))).toFixed(1)+'%');
    c.style.setProperty('--my',(Math.max(-20,Math.min(120,iy*100))).toFixed(1)+'%');
    const near=ix>-.35&&ix<1.35&&iy>-.5&&iy<1.5;
    if(near&&!reduced())
      c.style.transform=`perspective(1200px) rotateX(${((.5-iy)*6.5).toFixed(2)}deg) rotateY(${((ix-.5)*8.5).toFixed(2)}deg)`;
    else if(c.style.transform) c.style.transform='';
  });
},{passive:true});

/* ==========================================================================
   NAVIGATION — regroup the existing controls, then let the bar breathe
   ========================================================================== */
function refineNav(){
  const acc=document.querySelector('nav .navacc');
  if(!acc||acc.dataset.pxNav)return;
  acc.dataset.pxNav='1';
  const sep=()=>{const s=document.createElement('span');s.className='nav-sep';s.setAttribute('aria-hidden','true');return s;};
  const q=id=>document.getElementById(id);
  const order=[q('px-kbtn'),sep(),acc.querySelector('[data-region-tog]'),q('langTog'),sep(),
               q('px-bell'),q('bagNav'),q('acctNav')];
  acc.innerHTML='';
  order.forEach(n=>n&&acc.appendChild(n));
}
let _navY=0,_navHidden=false;
function navScroll(y){
  const h=document.querySelector('header');if(!h)return;
  const blocked=kOpen||document.getElementById('mmenu').style.display==='block'||
    (document.getElementById('px-notif')||{classList:{contains:()=>0}}).classList.contains('on')||
    document.body.style.overflow==='hidden';
  const d=y-_navY;_navY=y;
  if(blocked||y<90){ if(_navHidden){h.classList.remove('px-nav-hide');_navHidden=false;} return; }
  if(d>5&&!_navHidden){h.classList.add('px-nav-hide');_navHidden=true;}
  else if(d<-7&&_navHidden){h.classList.remove('px-nav-hide');_navHidden=false;}
}
function initNav(){
  refineNav();
  addEventListener('scroll',()=>navScroll(window.scrollY||0),{passive:true});
  try{lenis.on('scroll',({scroll})=>navScroll(scroll||0));}catch(e){}
  /* reaching for the bar brings it back before you ask */
  addEventListener('pointermove',e=>{
    if(e.clientY<110&&_navHidden){document.querySelector('header').classList.remove('px-nav-hide');_navHidden=false;}
  },{passive:true});
}

/* ==========================================================================
   10 · MEMBER DASHBOARD + new account sections
   ========================================================================== */
const SVA='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const D_IC={
  bolt:'<svg '+SVA+'><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  heart:'<svg '+SVA+'><path d="M12 20s-7-4.5-9-9c-1.2-2.7.3-5.7 3.2-6C8 4.8 10 6 12 8c2-2 4-3.2 5.8-3 2.9.3 4.4 3.3 3.2 6-2 4.5-9 9-9 9Z"/></svg>',
  doc:'<svg '+SVA+'><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></svg>',
  box:'<svg '+SVA+'><path d="M3 8l9-5 9 5"/><path d="M3 8v8l9 5 9-5V8l-9 5z"/></svg>',
  chat:'<svg '+SVA+'><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 16 0Z"/></svg>',
  calc:'<svg '+SVA+'><path d="M9 3h6M10 3v5.5L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3"/><path d="M8 14h8"/></svg>',
  search:'<svg '+SVA+'><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  shield:'<svg '+SVA+'><path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  layers:'<svg '+SVA+'><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  gear:K_IC.set,
  pen:'<svg '+SVA+'><path d="M4 20h4l10-10a2.8 2.8 0 1 0-4-4L4 16z"/></svg>',
  clock:'<svg '+SVA+'><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  dl:'<svg '+SVA+'><path d="M12 4v11M8 11l4 4 4-4M4 20h16"/></svg>',
  user:'<svg '+SVA+'><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.4 3.2-5.2 7-5.2s7 1.8 7 5.2"/></svg>'
};

function dashHTML(){
  const u=currentUser();if(!u)return '';
  const p=profile(u);seedNotifs(u);
  const tier=tierOf(u),nx=nextTier(u),comp=completion(u);
  const hour=new Date().getHours();
  const hi=hour<12?t('Good morning','Buenos días'):hour<19?t('Good afternoon','Buenas tardes'):t('Good evening','Buenas noches');
  const first=(p.display||u.name||u.email).split(' ')[0];
  const favs=(u.fav||[]).map(prod).filter(Boolean).slice(0,6);
  const recents=(u.recent||[]).map(prod).filter(Boolean).slice(0,5);
  const reqs=(u.reqs||[]).slice(0,4);
  const acts=(u.activity||[]).slice(0,6);
  const recs=recommend(u).slice(0,4);
  const nOpen=(typeof PXVAR!=='undefined')?Object.keys(PXVAR).reduce((a,k)=>a+PXVAR[k].filter(v=>!v.h).length,0):0;
  const nAll=(typeof PXVAR!=='undefined')?Object.keys(PXVAR).reduce((a,k)=>a+PXVAR[k].length,0):118;
  const R=54,C=2*Math.PI*R;

  return `<div class="px-dhead px-stagger">
    <div class="who">
      <div class="eyebrow">${esc(hi)}</div>
      <h1>${esc(first)}</h1>
      <div class="sub">${esc(t('Your PEPTIDEX identity, and everything attached to it.','Tu identidad PEPTIDEX, y todo lo que va con ella.'))}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:var(--s-5);flex-wrap:wrap">
        <button class="btn ghost mag" data-dsec="profile" style="padding:11px 20px">${esc(t('Edit profile','Editar perfil'))}</button>
        <button class="btn mag" data-openai style="padding:11px 20px">${esc(t('Ask PX Assistant','Preguntar al Asesor'))}</button>
      </div>
    </div>
    <div class="card">${memberCardHTML(u)}</div>
  </div>

  <div class="px-grid">
    <div class="px-card w3"><div class="ch"><h3>${esc(t('Profile','Perfil'))}</h3></div>
      <div class="px-comp">
        <div class="px-ring"><svg viewBox="0 0 96 96"><circle class="bg" cx="48" cy="48" r="36"/><circle class="fg" cx="48" cy="48" r="36" stroke-dasharray="${(2*Math.PI*36).toFixed(1)}" stroke-dashoffset="${((2*Math.PI*36)*(1-comp/100)).toFixed(1)}"/></svg><div class="v">${comp}%</div></div>
        <div class="tx"><div class="cap">${esc(t('Profile completion','Perfil completo'))}</div>
          ${comp<100?`<button data-dsec="profile">${esc(t('Complete it','Completarlo'))} →</button>`:`<div style="font-size:11.5px;color:var(--ok);margin-top:6px">${esc(t('All set','Todo listo'))}</div>`}</div>
      </div></div>

    <div class="px-card w3"><div class="ch"><h3>${esc(t('Saved compounds','Compuestos guardados'))}</h3></div>
      <div class="big">${(u.fav||[]).length}</div><div class="cap">${esc(t('across your favourites','en tus favoritos'))}</div></div>

    <div class="px-card w3"><div class="ch"><h3>${esc(t('Requests','Solicitudes'))}</h3></div>
      <div class="big">${(u.reqs||[]).length}</div><div class="cap">${esc(t('quotation requests on file','solicitudes registradas'))}</div></div>

    <div class="px-card w3"><div class="ch"><h3>${esc(t('Catalogue availability','Disponibilidad'))}</h3></div>
      <div class="big">${nOpen}<span style="font-size:17px;color:var(--muted);font-weight:400">/${nAll}</span></div>
      <div class="cap">${esc(t('presentations in stock','presentaciones en stock'))}</div></div>

    <div class="px-card w8"><div class="ch"><h3>${esc(t('Quick actions','Acciones rápidas'))}</h3></div>
      <div class="px-qa">
        <button data-qa="cmdk">${D_IC.search}<b>${esc(t('Search','Buscar'))}</b><i>⌘K</i></button>
        <button data-qa="ai">${D_IC.chat}<b>${esc(t('PX Assistant','Asesor PX'))}</b><i>${esc(t('ask anything','pregunta lo que sea'))}</i></button>
        <button data-qa="calc">${D_IC.calc}<b>${esc(t('Reconstitution','Reconstitución'))}</b><i>${esc(t('calculator','calculadora'))}</i></button>
        <button data-qa="track">${D_IC.box}<b>${esc(t('Track order','Rastrear'))}</b><i>${esc(t('by number','por número'))}</i></button>
        <button data-qa="bag">${D_IC.bolt}<b>${esc(t('My list','Mi lista'))}</b><i>${esc(t('quotation','cotización'))}</i></button>
        <button data-qa="dl">${D_IC.dl}<b>${esc(t('Documents','Documentos'))}</b><i>${esc(t('COA & specs','COA y fichas'))}</i></button>
      </div></div>

    <div class="px-card w4"><div class="ch"><h3>${esc(t('Membership','Membresía'))}</h3></div>
      <div style="display:flex;align-items:baseline;gap:9px"><span class="px-tier">${esc(t(tier.en,tier.es))}</span></div>
      ${nx?`<div class="cap" style="margin-top:12px">${esc(t('Next','Siguiente'))}: <b style="color:var(--ink)">${esc(t(nx.en,nx.es))}</b></div>
      <div style="height:5px;border-radius:3px;background:var(--surface-3);margin-top:9px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100,Math.round(tierScore(u)/nx.min*100))}%;background:var(--tier);border-radius:3px"></div></div>
      <div class="cap" style="margin-top:7px;font-size:10.5px">${esc(t('Earned through requests, saved compounds and a complete profile.','Se gana con solicitudes, compuestos guardados y perfil completo.'))}</div>`
      :`<div class="cap" style="margin-top:12px">${esc(t('Highest tier reached.','Nivel máximo alcanzado.'))}</div>`}</div>

    <div class="px-card w6"><div class="ch"><h3>${esc(t('Recommended for you','Recomendado para ti'))}</h3>
      <button class="lnk" data-qa="ai">${esc(t('Why?','¿Por qué?'))}</button></div>
      ${recs.length?recs.map(P=>prowHTML(P)).join(''):`<div class="px-empty">${esc(t('Save a few compounds and recommendations will sharpen.','Guarda algunos compuestos y las recomendaciones se afinan.'))}</div>`}</div>

    <div class="px-card w6"><div class="ch"><h3>${esc(t('Saved compounds','Compuestos guardados'))}</h3>
      <button class="lnk" data-dsec="favorites">${esc(t('View all','Ver todo'))}</button></div>
      ${favs.length?favs.map(P=>prowHTML(P,true)).join(''):`<div class="px-empty">${esc(t('Nothing saved yet. Tap the heart on any compound.','Aún nada guardado. Toca el corazón en cualquier compuesto.'))}</div>`}</div>

    <div class="px-card w4"><div class="ch"><h3>${esc(t('Recently viewed','Vistos recientemente'))}</h3></div>
      ${recents.length?recents.map(P=>prowHTML(P)).join(''):`<div class="px-empty">${esc(t('Browse the catalogue and it will appear here.','Explora el catálogo y aparecerá aquí.'))}</div>`}</div>

    <div class="px-card w4"><div class="ch"><h3>${esc(t('Recent activity','Actividad reciente'))}</h3>
      <button class="lnk" data-dsec="activity">${esc(t('Full log','Registro'))}</button></div>
      ${acts.length?`<div class="px-tl">${acts.map(a=>`<div class="r"><span class="d"></span>
        <div class="tx"><b>${esc(actLabel(a.type))}</b><span>${esc(a.detail||'')}</span></div>
        <span class="ts">${esc(ago(a.ts))}</span></div>`).join('')}</div>`
        :`<div class="px-empty">${esc(t('Your activity will appear here.','Tu actividad aparecerá aquí.'))}</div>`}</div>

    <div class="px-card w4"><div class="ch"><h3>${esc(t('Announcements','Anuncios'))}</h3>
      <button class="lnk" data-qa="notif">${esc(t('All','Todas'))}</button></div>
      ${(u.notifs||[]).slice(0,3).map(n=>`<div class="px-tl"><div class="r" style="border:0;padding:8px 0">
        <span class="d" style="background:${n.read?'var(--muted)':'var(--accent)'};box-shadow:none"></span>
        <div class="tx"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div></div></div>`).join('')}</div>

    <div class="px-card w12"><div class="ch"><h3>${esc(t('Your requests','Tus solicitudes'))}</h3>
      <button class="lnk" data-dsec="orders">${esc(t('View all','Ver todo'))}</button></div>
      ${reqs.length?reqs.map(r=>`<div class="px-prow" style="cursor:default">
        <span class="cd">${esc(r.id)}</span>
        <span class="nm">${esc(r.interest||'—')}<span style="display:block;font-size:11px;color:var(--muted)">${esc(r.summary||'')}</span></span>
        <span class="sp">${esc(new Date(r.ts).toLocaleDateString(LANG==='es'?'es-MX':'en-US'))}</span>
        <span class="sp" style="color:var(--ok)">${esc(r.status||'sent')}</span></div>`).join('')
        :`<div class="px-empty">${esc(t('No requests yet. Add compounds to your quotation list to start one.','Sin solicitudes. Agrega compuestos a tu lista de cotización para empezar.'))}</div>`}</div>
  </div>`;
}
function prowHTML(P,rm){
  return `<div class="px-prow" data-open="${P.k}:${P.i}">
    <span class="cd">${esc(P.code)}</span>
    <span class="nm">${esc(P.name)}</span>
    <span class="sp">${esc(P.vlabel||P.spec)}</span>
    ${rm?`<button class="rm" data-favrm2="${P.k}:${P.i}" aria-label="${esc(t('Remove','Quitar'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`:''}</div>`;
}
function actLabel(k){
  const m={view:t('Viewed a page','Página vista'),product:t('Opened a compound','Compuesto abierto'),
    fav:t('Saved a compound','Compuesto guardado'),unfav:t('Removed a save','Guardado eliminado'),
    list:t('Added to quotation list','Agregado a la lista'),assistant:t('Asked PX Assistant','Consulta al Asesor'),
    profile:t('Updated the profile','Perfil actualizado'),avatar:t('Changed the avatar','Avatar cambiado'),
    login:t('Signed in','Inicio de sesión'),note:t('Saved a private note','Nota privada guardada'),
    collection:t('Updated a collection','Colección actualizada'),download:t('Downloaded a document','Documento descargado'),
    security:t('Security change','Cambio de seguridad'),search:t('Searched','Búsqueda')};
  return m[k]||k;
}
function recommend(u){
  const all=allProducts();
  const favCodes=(u.fav||[]).map(prod).filter(Boolean).map(P=>P.code);
  const lineWeight={};
  (u.fav||[]).map(prod).filter(Boolean).forEach(P=>lineWeight[P.k]=(lineWeight[P.k]||0)+2);
  if(u.profile&&u.profile.line)lineWeight[u.profile.line]=(lineWeight[u.profile.line]||0)+3;
  if(AI.ctx&&AI.ctx.goal){
    const g=GOALS.find(x=>x.k===AI.ctx.goal);
    if(g)g.picks.forEach(c=>{const p=all.find(x=>x.code===c);if(p)lineWeight['@'+c]=6;});
  }
  const scored=all.filter(p=>favCodes.indexOf(p.code)<0).map(p=>{
    let s=(lineWeight['@'+p.code]||0)+(lineWeight[p.k]||0);
    const vs=(typeof PXVAR!=='undefined'&&PXVAR[p.code])||[];
    if(vs.some(v=>!v.h))s+=1;
    s+=Math.min(2,vs.length*0.4);
    return {p,s};
  }).sort((a,b)=>b.s-a.s);
  return scored.map(x=>prod(x.p.k+':'+x.p.i)).filter(Boolean);
}

/* --- profile section ------------------------------------------------------ */
function profileHTML(){
  const u=currentUser();if(!u)return '';
  const p=profile(u);
  return `<div class="acct-head"><h2>${esc(t('Profile','Perfil'))}</h2>
    <p>${esc(t('How PEPTIDEX addresses you across the platform. Everything here stays on this device unless you send a request.','Cómo te trata PEPTIDEX en toda la plataforma. Todo esto se queda en este dispositivo salvo que envíes una solicitud.'))}</p></div>
  <div class="px-avstudio">
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
      ${avatarHTML(u,140,tierOf(u).k!=='researcher')}
      <div style="text-align:center">
        <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)">${esc(t('Customer ID','ID de cliente'))}</div>
        <div style="font-family:ui-monospace,monospace;font-size:13px;margin-top:4px">${esc(p.cid)}</div>
      </div>
      <label class="btn ghost" style="cursor:pointer;font-size:12px;padding:9px 16px">
        ${esc(t('Upload photo','Subir foto'))}<input type="file" accept="image/*" id="px-avup" style="display:none"></label>
      ${p.avatar.mode==='photo'?`<button class="lnk" id="px-avrm" style="background:none;border:0;color:var(--muted);font-size:11.5px">${esc(t('Remove photo','Quitar foto'))}</button>`:''}
    </div>
    <div>
      <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:11px">${esc(t('Generated styles','Estilos generados'))}</div>
      <div class="px-avstyles" id="px-avstyles">
        ${AV_STYLES.map(s=>`<button data-avstyle="${s.k}" aria-pressed="${p.avatar.mode==='gen'&&p.avatar.style===s.k}">
          <canvas width="168" height="168" data-avdraw="${s.k}"></canvas><span>${esc(t(s.en,s.es))}</span></button>`).join('')}
      </div>
      <div style="display:flex;gap:9px;margin-top:12px;flex-wrap:wrap">
        <button class="btn ghost" id="px-avshuffle" style="font-size:12px;padding:9px 16px">${esc(t('Regenerate','Regenerar'))}</button>
        <span style="font-size:11.5px;color:var(--muted);align-self:center;max-width:280px;line-height:1.5">${esc(t('Generated locally from your account ID — deterministic, private, no upload.','Generado localmente desde tu ID de cuenta — determinista, privado, sin subir nada.'))}</span>
      </div>

      <div class="px-sh" style="margin:34px 0 14px"><h2 style="font-size:15px">${esc(t('Details','Datos'))}</h2><span class="ln"></span></div>
      <form id="px-profform" class="acct-form">
        <label>${esc(t('Display name','Nombre visible'))}<input name="display" value="${esc(p.display||u.name||'')}" autocomplete="name"/></label>
        <label>${esc(t('Country','País'))}<select name="country">${COUNTRIES.map(c=>`<option value="${c[0]}"${p.country===c[0]?' selected':''}>${esc(c[1])}</option>`).join('')}</select></label>
        <label>${esc(t('Preferred product line','Línea preferida'))}<select name="line">
          <option value="">${esc(t('No preference','Sin preferencia'))}</option>
          ${Object.keys(LINES).map(k=>`<option value="${k}"${p.line===k?' selected':''}>${esc(LINES[k].name)}</option>`).join('')}</select></label>
        <label>${esc(t('Research focus (private)','Enfoque de investigación (privado)'))}<input name="focus" value="${esc(p.focus||'')}" placeholder="${esc(t('e.g. tissue repair, metabolic','ej. reparación tisular, metabólico'))}"/></label>
        <button class="btn mag" type="submit">${esc(t('Save profile','Guardar perfil'))}</button>
      </form>
    </div>
  </div>`;
}

/* --- settings ------------------------------------------------------------- */
function settingsHTML(){
  return `<div class="acct-head"><h2>${esc(t('Appearance & preferences','Apariencia y preferencias'))}</h2>
    <p>${esc(t('These follow you on this device. Nothing is transmitted.','Te siguen en este dispositivo. Nada se transmite.'))}</p></div>
  <div class="px-set"><div class="t"><b>${esc(t('Appearance','Apariencia'))}</b><span>${esc(t('White is part of the PEPTIDEX identity. The interface is always bright, architectural and cold-neutral — there is no dark mode.','El blanco es parte de la identidad PEPTIDEX. La interfaz siempre es clara, arquitectónica y de neutro frío — no hay modo oscuro.'))}</span></div>
    <span style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--titanium-ink);white-space:nowrap">${esc(t('Titanium · fixed','Titanio · fijo'))}</span></div>
  <div class="px-set"><div class="t"><b>${esc(t('Motion','Movimiento'))}</b><span>${esc(t('Reduced disables parallax, the custom cursor and long transitions.','Reducido desactiva el parallax, el cursor y las transiciones largas.'))}</span></div>
    <div class="px-seg">
      <button data-pref="motion:full" aria-pressed="false">${esc(t('Full','Completo'))}</button>
      <button data-pref="motion:reduced" aria-pressed="false">${esc(t('Reduced','Reducido'))}</button></div></div>
  <div class="px-set"><div class="t"><b>${esc(t('Density','Densidad'))}</b><span>${esc(t('How much air the layout carries.','Cuánto aire lleva el layout.'))}</span></div>
    <div class="px-seg">
      <button data-pref="density:compact" aria-pressed="false">${esc(t('Compact','Compacta'))}</button>
      <button data-pref="density:default" aria-pressed="false">${esc(t('Default','Normal'))}</button>
      <button data-pref="density:spacious" aria-pressed="false">${esc(t('Spacious','Amplia'))}</button></div></div>
  <div class="px-set"><div class="t"><b>${esc(t('Precision cursor','Cursor de precisión'))}</b><span>${esc(t('Desktop only.','Solo escritorio.'))}</span></div>
    <button class="px-sw" data-pref="cursor" role="switch" aria-checked="true"></button></div>
  <div class="px-set"><div class="t"><b>${esc(t('PX Assistant dock','Dock del Asesor PX'))}</b><span>${esc(t('Keep the assistant reachable from every page.','Mantén al asesor a mano en todas las páginas.'))}</span></div>
    <button class="px-sw" data-pref="dockAI" role="switch" aria-checked="true"></button></div>
  <div class="px-set"><div class="t"><b>${esc(t('Language','Idioma'))}</b><span>${esc(t('Also switchable from the top bar and ⌘K.','También se cambia desde la barra superior y ⌘K.'))}</span></div>
    <div class="px-seg">
      <button data-lang="en" aria-pressed="${LANG==='en'}">English</button>
      <button data-lang="es" aria-pressed="${LANG==='es'}">Español</button></div></div>
  <div class="px-set"><div class="t"><b>${esc(t('Region','Región'))}</b><span>${esc(t('Pricing and checkout are available in PEPTIDEX USA.','Precios y checkout están disponibles en PEPTIDEX USA.'))}</span></div>
    <div class="px-seg">
      <button data-reg="mex" aria-pressed="${REGION==='mex'}">MÉXICO</button>
      <button data-reg="usa" aria-pressed="${REGION==='usa'}">USA</button></div></div>`;
}

/* --- security -------------------------------------------------------------- */
function securityHTML(){
  const u=currentUser();if(!u)return '';
  profile(u);
  const ss=u.sessions||[];
  return `<div class="acct-head"><h2>${esc(t('Security centre','Centro de seguridad'))}</h2>
    <p>${esc(t('Your account lives in this browser. Passwords are stored only as a SHA-256 hash — never in plain text.','Tu cuenta vive en este navegador. Las contraseñas se guardan solo como hash SHA-256 — nunca en texto plano.'))}</p></div>
  <div class="px-sh" style="margin-top:0"><h2 style="font-size:15px">${esc(t('Password','Contraseña'))}</h2><span class="ln"></span></div>
  <form id="px-pwform" class="acct-form">
    <label>${esc(t('Current password','Contraseña actual'))}<input type="password" name="cur" autocomplete="current-password"/></label>
    <label>${esc(t('New password','Nueva contraseña'))}<input type="password" name="n1" autocomplete="new-password"/></label>
    <label>${esc(t('Confirm new password','Confirmar nueva'))}<input type="password" name="n2" autocomplete="new-password"/></label>
    <button class="btn mag" type="submit">${esc(t('Update password','Actualizar contraseña'))}</button>
  </form>
  <div class="px-sh"><h2 style="font-size:15px">${esc(t('Devices & sessions','Dispositivos y sesiones'))}</h2><span class="ln"></span>
    <span class="n">${ss.length}</span></div>
  ${ss.length?ss.map(s=>`<div class="px-doc">
      <div class="ic">${esc(s.dev.slice(0,3).toUpperCase())}</div>
      <div class="t"><b>${esc(s.br)} · ${esc(s.os)}${s.current?` <span style="color:var(--ok);font-size:11px;font-weight:500">· ${esc(t('this device','este dispositivo'))}</span>`:''}</b>
        <span>${esc(t('First seen','Primera vez'))} ${new Date(s.first).toLocaleDateString()} · ${esc(t('last active','última actividad'))} ${esc(ago(s.last))} · ${s.n} ${esc(t('sessions','sesiones'))}</span></div>
      ${s.current?'':`<button class="btn ghost" data-revoke="${s.id}" style="font-size:11.5px;padding:7px 13px">${esc(t('Revoke','Revocar'))}</button>`}
    </div>`).join(''):`<div class="px-empty">${esc(t('No devices recorded.','Sin dispositivos registrados.'))}</div>`}
  <div class="px-sh"><h2 style="font-size:15px">${esc(t('Data','Datos'))}</h2><span class="ln"></span></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn ghost" id="px-export" style="font-size:12px;padding:10px 18px">${esc(t('Export my data','Exportar mis datos'))}</button>
    <button class="btn ghost" id="px-wipe" style="font-size:12px;padding:10px 18px;color:var(--err);border-color:rgba(216,68,60,.4)">${esc(t('Erase local data','Borrar datos locales'))}</button>
  </div>`;
}

/* --- downloads ------------------------------------------------------------- */
function docsFor(u){
  const favs=(u.fav||[]).map(prod).filter(Boolean);
  const base=[
    {t:t('PEPTIDEX Quality Protocol','Protocolo de Calidad PEPTIDEX'),s:t('HPLC · MS · identity and purity methodology','HPLC · MS · metodología de identidad y pureza'),k:'protocol',x:'PDF'},
    {t:t('Handling & storage guide','Guía de manejo y almacenamiento'),s:t('Lyophilised powder, reconstitution, cold chain','Polvo liofilizado, reconstitución, cadena de frío'),k:'handling',x:'PDF'},
    {t:t('Research use statement','Declaración de uso en investigación'),s:t('Regulatory position and disclaimer','Postura regulatoria y aviso'),k:'legal',x:'PDF'}
  ];
  favs.slice(0,6).forEach(P=>base.push({t:t('Specification sheet','Ficha técnica')+' · '+P.name,
    s:P.L.name+' · '+(P.vlabel||P.spec),k:'spec:'+P.k+':'+P.i,x:'PDF'}));
  return base;
}
function downloadsHTML(){
  const u=currentUser();if(!u)return '';
  const ds=docsFor(u);
  return `<div class="acct-head"><h2>${esc(t('Download centre','Centro de descargas'))}</h2>
    <p>${esc(t('Documents are generated on this device from the live catalogue — always current, never stale.','Los documentos se generan en este dispositivo desde el catálogo vivo — siempre actuales.'))}</p></div>
    ${ds.map(d=>`<div class="px-doc"><div class="ic">${esc(d.x)}</div>
      <div class="t"><b>${esc(d.t)}</b><span>${esc(d.s)}</span></div>
      <button class="btn ghost" data-dl="${esc(d.k)}" style="font-size:11.5px;padding:8px 15px">${esc(t('Download','Descargar'))}</button></div>`).join('')}
    <div class="note" style="margin-top:20px;font-size:12px;color:var(--muted);line-height:1.6">
      ${esc(t('Lot-specific Certificates of Analysis are issued with each shipment and are tied to the lot printed on your vial.','Los Certificados de Análisis específicos del lote se emiten con cada envío y están ligados al lote impreso en tu vial.'))}</div>`;
}

/* --- collections / notes / searches / activity ------------------------------ */
function collectionsHTML(){
  const u=currentUser();if(!u)return '';profile(u);
  return `<div class="acct-head"><h2>${esc(t('Collections','Colecciones'))}</h2>
    <p>${esc(t('Group compounds into private working sets — a protocol, a client, a study.','Agrupa compuestos en conjuntos privados — un protocolo, un cliente, un estudio.'))}</p></div>
  <form id="px-colform" style="display:flex;gap:9px;margin-bottom:20px">
    <input name="nm" placeholder="${esc(t('New collection name','Nombre de la colección'))}" style="flex:1;padding:11px 14px;border:1px solid var(--hairline);border-radius:12px;background:var(--surface-2);color:var(--ink)"/>
    <button class="btn" type="submit" style="padding:11px 20px">${esc(t('Create','Crear'))}</button></form>
  ${u.collections.length?u.collections.map(c=>`<div class="px-card" style="grid-column:auto;margin-bottom:12px">
    <div class="ch"><h3>${esc(c.name)}</h3><span class="n" style="font-size:10px;color:var(--muted)">${c.items.length}</span>
      <button class="lnk" data-colrm="${c.id}" style="color:var(--err)">${esc(t('Delete','Eliminar'))}</button></div>
    ${c.items.length?c.items.map(prod).filter(Boolean).map(P=>`<div class="px-prow" data-open="${P.k}:${P.i}">
      <span class="cd">${esc(P.code)}</span><span class="nm">${esc(P.name)}</span>
      <button class="rm" data-colitem="${c.id}|${P.k}:${P.i}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('')
      :`<div class="px-empty">${esc(t('Empty — add compounds from the catalogue.','Vacía — agrega compuestos desde el catálogo.'))}</div>`}
    </div>`).join(''):`<div class="px-empty">${esc(t('No collections yet.','Sin colecciones.'))}</div>`}`;
}
function notesHTML(){
  const u=currentUser();if(!u)return '';profile(u);
  const keys=Object.keys(u.notes||{}).filter(k=>u.notes[k]&&u.notes[k].trim());
  const favs=(u.fav||[]).map(prod).filter(Boolean);
  const pool=[...new Set(keys.concat((u.fav||[])))].map(prod).filter(Boolean);
  return `<div class="acct-head"><h2>${esc(t('Private notes','Notas privadas'))}</h2>
    <p>${esc(t('Notes are stored only in this browser. They are never sent with a quotation.','Las notas se guardan solo en este navegador. Nunca se envían con una cotización.'))}</p></div>
  ${pool.length?pool.map(P=>`<div style="margin-bottom:18px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span class="cd" style="font-family:ui-monospace,monospace;font-size:10px;font-weight:700;padding:5px 8px;border-radius:6px;background:var(--surface-3)">${esc(P.code)}</span>
      <b style="font-size:13.5px">${esc(P.name)}</b></div>
    <textarea class="px-note" data-note="${P.k}:${P.i}" placeholder="${esc(t('Observations, protocol, supplier notes…','Observaciones, protocolo, notas de proveedor…'))}">${esc((u.notes||{})[P.k+':'+P.i]||'')}</textarea>
  </div>`).join(''):`<div class="px-empty">${esc(t('Save a compound first — notes attach to your saved list.','Guarda un compuesto primero — las notas se adjuntan a tu lista.'))}</div>`}`;
}
function activityHTML(){
  const u=currentUser();if(!u)return '';profile(u);
  const a=u.activity||[],srch=u.searches||[];
  return `<div class="acct-head"><h2>${esc(t('Activity log','Registro de actividad'))}</h2>
    <p>${esc(t('Everything this account has done on this device.','Todo lo que esta cuenta ha hecho en este dispositivo.'))}</p></div>
  ${srch.length?`<div class="px-sh" style="margin-top:0"><h2 style="font-size:15px">${esc(t('Saved searches','Búsquedas guardadas'))}</h2><span class="ln"></span></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px">
    ${srch.slice(0,14).map(x=>`<button class="btn ghost" data-search="${esc(x.q)}" style="font-size:11.5px;padding:7px 14px">${esc(x.q)}</button>`).join('')}</div>`:''}
  <div class="px-sh" style="margin-top:0"><h2 style="font-size:15px">${esc(t('Timeline','Línea de tiempo'))}</h2><span class="ln"></span><span class="n">${a.length}</span></div>
  ${a.length?`<div class="px-tl">${a.slice(0,80).map(x=>`<div class="r"><span class="d"></span>
    <div class="tx"><b>${esc(actLabel(x.type))}</b><span>${esc(x.detail||'')}</span></div>
    <span class="ts">${esc(ago(x.ts))}</span></div>`).join('')}</div>`
    :`<div class="px-empty">${esc(t('Nothing recorded yet.','Nada registrado aún.'))}</div>`}`;
}

/* ==========================================================================
   11 · DOCUMENT GENERATION (minimal, valid PDF — no library, no network)
   ========================================================================== */
function pdf(title,lines){
  const esc2=s=>String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
    .replace(/[^\x20-\x7E]/g,c=>({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n','Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ñ':'N','·':'-','–':'-','—':'-','≥':'>=','—':'-','“':'"','”':'"','’':"'"}[c]||'?'));
  let y=792-64;
  const ops=[];
  ops.push('BT /F2 18 Tf 56 '+y+' Td ('+esc2(title)+') Tj ET'); y-=10;
  ops.push('0.75 w 0.82 0.82 0.84 RG 56 '+y+' m 539 '+y+' l S'); y-=26;
  lines.forEach(l=>{
    if(y<70){return;}
    if(l===''){y-=9;return;}
    if(l.startsWith('##')){y-=8;ops.push('BT /F2 11 Tf 56 '+y+' Td ('+esc2(l.slice(2).trim())+') Tj ET');y-=16;return;}
    if(l.startsWith('- ')){ops.push('BT /F1 9.5 Tf 66 '+y+' Td (- '+esc2(l.slice(2))+') Tj ET');y-=14;return;}
    ops.push('BT /F1 9.5 Tf 56 '+y+' Td ('+esc2(l)+') Tj ET');y-=14;
  });
  ops.push('BT /F1 7.5 Tf 56 52 Td (PEPTIDEX - Research use only. Not for human or veterinary use. Generated '+new Date().toISOString().slice(0,10)+') Tj ET');
  const stream=ops.join('\n');
  const objs=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    '<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  let out='%PDF-1.4\n';const offs=[];
  objs.forEach((o,i)=>{offs.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
  const xref=out.length;
  out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
  offs.forEach(o=>out+=String(o).padStart(10,'0')+' 00000 n \n');
  out+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  const bytes=new Uint8Array(out.length);
  for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&0xFF;
  return new Blob([bytes],{type:'application/pdf'});
}
function dlBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function buildDoc(kind){
  const u=currentUser();
  if(kind==='protocol')return {n:'PEPTIDEX_Quality_Protocol.pdf',b:pdf('PEPTIDEX - Quality Protocol',[
    '##Identity and purity','Every lot is analysed by an independent laboratory before release.',
    '- HPLC (High-Performance Liquid Chromatography) quantifies purity. Release threshold: >= 99%.',
    '- MS (Mass Spectrometry) confirms molecular weight and therefore identity.',
    '- Appearance, solubility and residual moisture are recorded per lot.','',
    '##Documentation','- A lot-specific Certificate of Analysis accompanies every shipment.',
    '- The lot number printed on the vial is the key that ties product to COA.','',
    '##Manufacturing','- Lyophilised under controlled conditions and sealed under inert atmosphere.',
    '- Tested in the USA.','',
    '##Scope','These materials are supplied for laboratory research only.',
    'They are not medicines and are not intended for human or veterinary use.'])};
  if(kind==='handling')return {n:'PEPTIDEX_Handling_Storage.pdf',b:pdf('PEPTIDEX - Handling & Storage',[
    '##Before reconstitution','- Store the sealed lyophilised vial at 2-8 C for long-term stability.',
    '- Short transit at ambient temperature does not compromise lyophilised powder.',
    '- Keep away from direct light and moisture.','',
    '##Reconstitution','- Use sterile bacteriostatic water (0.9% benzyl alcohol).',
    '- Direct the stream against the vial wall. Do not inject forcefully into the powder.',
    '- Swirl gently until dissolved. Never shake.',
    '- Concentration (mg/mL) = vial strength in mg / solvent volume in mL.','',
    '##After reconstitution','- Refrigerate at 2-8 C. Typical working window is 28 days.',
    '- Do not freeze a reconstituted vial.',
    '- Record the reconstitution date on the vial.','',
    '##Records','- Keep the lot number and COA with your study documentation.'])};
  if(kind==='legal')return {n:'PEPTIDEX_Research_Use_Statement.pdf',b:pdf('PEPTIDEX - Research Use Statement',[
    'All materials supplied by PEPTIDEX are furnished strictly for laboratory research.',
    '',
    '- They are not medicines, dietary supplements, cosmetics or food.',
    '- They are not intended to diagnose, treat, cure or prevent any condition.',
    '- They are not for human or veterinary administration.',
    '- The purchaser is responsible for compliance with all applicable law in their jurisdiction.',
    '',
    '##Documentation','Each lot carries a Certificate of Analysis issued by an independent laboratory.',
    'The certificate states identity, purity and mass for that specific lot.',
    '',u?('Issued for account '+(u.profile&&u.profile.cid||'')):''])};
  if(kind.startsWith('spec:')){
    const P=prod(kind.slice(5));
    if(!P)return null;
    const vs=(typeof PXVAR!=='undefined'&&PXVAR[P.code])||[];
    const lines=['##Compound','Name: '+P.name,'Code: '+P.code,'Line: '+P.L.name+' ('+P.L.category+')','',
      '##Description',P.note+'.','',
      '##Presentations'];
    (vs.length?vs:[{l:P.spec}]).forEach(v=>{
      let row='- '+v.l;
      if(REGION==='usa'&&v.s){try{const pr=PRICE(P.code,v.s);if(pr)row+='   USD '+pr.u;}catch(e){}}
      if(v.h)row+='   (currently unavailable)';
      lines.push(row);
    });
    lines.push('','##Quality','- Purity >= 99% by HPLC','- Identity confirmed by MS','- Tested in the USA',
      '- Lot-specific Certificate of Analysis included','','##Handling',
      '- Supplied lyophilised. Store sealed at 2-8 C.','- Reconstitute with bacteriostatic water.',
      '- Refrigerate after reconstitution; typical window 28 days.');
    return {n:'PEPTIDEX_'+P.code.replace(/[^A-Za-z0-9]/g,'')+'_Spec.pdf',b:pdf('PEPTIDEX - '+P.name,lines)};
  }
  return null;
}

/* ==========================================================================
   12 · WIRING into the existing application
   ========================================================================== */
const NEW_SECTIONS={profile:profileHTML,settings:settingsHTML,security:securityHTML,
  downloads:downloadsHTML,collections:collectionsHTML,notes:notesHTML,activity:activityHTML};

/* -- extend the account sidebar ------------------------------------------- */
const _accountHTML=accountHTML;
accountHTML=function(){
  let h=_accountHTML();
  const u=currentUser();if(!u)return h;
  const p=profile(u);const tier=tierOf(u);
  /* richer identity block */
  h=h.replace(/<div class="acct-id">[\s\S]*?<\/div>\s*<\/div>\s*<div class="acct-nav">/,
    '<div class="acct-id">'+memberCardHTML(u,true)+'</div><div class="acct-nav">');
  /* new nav entries before the separator */
  const extra=`
    <button data-sec="profile">${D_IC.user}${t('Profile & avatar','Perfil y avatar')}</button>
    <button data-sec="collections">${D_IC.layers}${t('Collections','Colecciones')}</button>
    <button data-sec="notes">${D_IC.pen}${t('Private notes','Notas privadas')}</button>
    <button data-sec="downloads">${D_IC.dl}${t('Download centre','Descargas')}</button>
    <button data-sec="activity">${D_IC.clock}${t('Activity','Actividad')}</button>
    <button data-sec="security">${D_IC.shield}${t('Security','Seguridad')}</button>
    <button data-sec="settings">${D_IC.gear}${t('Appearance','Apariencia')}</button>
    <div class="sep"></div>`;
  h=h.replace('<div class="sep"></div>',extra);
  return h;
};

/* -- overview becomes the dashboard, plus the new sections ---------------- */
const _acctSectionHTML=acctSectionHTML;
acctSectionHTML=function(sec){
  if(sec==='overview')return dashHTML();
  if(NEW_SECTIONS[sec])return NEW_SECTIONS[sec]();
  return _acctSectionHTML(sec);
};


/* --------------------------------------------------------------------------
   Progressive enhancement of the existing markup. Adds motion and depth
   attributes only — never text, never structure, never a class the base
   sheet styles.
   -------------------------------------------------------------------------- */
function enhance(){
  /* Staggered reveal is applied only to surfaces this layer owns. Base
     grids are already choreographed by observeReveals() + pageEntrance;
     adding a second opacity owner there can leave content invisible. */
  document.querySelectorAll('.px-qa').forEach(g=>g.classList.add('px-stagger'));
  /* Cursor affordances carry no transform, so they are safe anywhere. */
  document.querySelectorAll('.pcard:not([data-cursor])').forEach(c=>c.dataset.cursor=t('View','Ver'));
  document.querySelectorAll('.px-prow:not([data-cursor])').forEach(c=>c.dataset.cursor=t('Open','Abrir'));
}

/* -- render hook ----------------------------------------------------------- */
const _render=render;
render=function(route,defer){
  _render(route,defer);
  const key=route.replace('/','');
  /* staggered reveal groups */
  document.querySelectorAll('.px-stagger').forEach(el=>{
    requestAnimationFrame(()=>el.classList.add('in'));
  });
  /* depth field on hero-like sections */
  ['#home-hero','.lhero','.qhero','.px-dash'].forEach(sel=>{
    const s=document.querySelector(sel);
    if(s&&!s.querySelector('.px-lightfield')){
      const l=document.createElement('div');l.className='px-lightfield';
      if(getComputedStyle(s).position==='static')s.style.position='relative';
      s.insertBefore(l,s.firstChild);
    }
  });
  enhance();
  collectDepth();requestAnimationFrame(depthTick);
  syncPlatformUI();
  if(key&&key!=='account')logActivity('view','#/'+key);
  const u=currentUser();
  if(u&&PREFS.dash!==false){/* keep the dock available */}
};

/* -- account UI sync ------------------------------------------------------- */
const _syncAccountUI=syncAccountUI;
syncAccountUI=function(){_syncAccountUI();syncPlatformUI();};

/* -- recently viewed ------------------------------------------------------- */
const _openProduct=openProduct;
openProduct=function(key,idx){
  _openProduct(key,idx);
  const u=currentUser();
  if(u){profile(u);
    const id=key+':'+idx;
    u.recent=[id].concat((u.recent||[]).filter(x=>x!==id)).slice(0,14);
    saveUser(u);
    const P=prod(id);logActivity('product',P?P.name:id);
  }
};

/* -- favourites + list activity ------------------------------------------- */
const _toggleFav=toggleFav;
toggleFav=function(pid){
  const before=isFav(pid);
  _toggleFav(pid);
  const P=prod(pid);
  if(currentUser()){logActivity(before?'unfav':'fav',P?P.name:pid);
    toast(before?t('Removed','Eliminado'):t('Saved','Guardado'),P?P.name:'',before?'info':'ok');}
};
const _addToList=addToList;
addToList=function(pid){
  _addToList(pid);
  const P=prod(pid);
  logActivity('list',P?P.name:pid);
  toast(t('Added to your list','Agregado a tu lista'),P?P.name:'','ok');
};

/* -- after login ----------------------------------------------------------- */
const _afterLogin=afterLogin;
afterLogin=function(){
  const u=currentUser();
  if(u){profile(u);seedNotifs(u);recordSession();saveUser(u);logActivity('login','');}
  _afterLogin();
  setTimeout(()=>{
    const uu=currentUser();
    if(uu)toast(t('Welcome back','Bienvenido de vuelta'),(uu.profile&&uu.profile.display||uu.name||'')+' · '+t(tierOf(uu).en,tierOf(uu).es),'ok');
  },900);
};

/* ==========================================================================
   13 · DELEGATED EVENTS for the new surfaces
   ========================================================================== */
document.addEventListener('click',e=>{
  /* dashboard nav */
  const ds=e.target.closest('[data-dsec]');
  if(ds){setAcctSection(ds.dataset.dsec);return;}
  const qa=e.target.closest('[data-qa]');
  if(qa){const k=qa.dataset.qa;
    if(k==='cmdk')openCmd();
    else if(k==='ai')openAI();
    else if(k==='calc'){navigate('/tools');setTimeout(()=>{const b=document.querySelector('[data-tool="calc"]');b&&b.click();},2100);}
    else if(k==='track')navigate('/track');
    else if(k==='bag')openBag();
    else if(k==='dl')setAcctSection('downloads');
    else if(k==='notif')toggleNotif(true);
    return;}
  if(e.target.closest('[data-openai]')){openAI();return;}
  const op=e.target.closest('[data-open]');
  if(op&&!e.target.closest('.rm')){const [k,i]=op.dataset.open.split(':');
    if(LINES[k]){navigate('/'+k);setTimeout(()=>openProduct(k,+i),1900);}return;}
  const fr=e.target.closest('[data-favrm2]');
  if(fr){e.stopPropagation();toggleFav(fr.dataset.favrm2);setAcctSection(ACCSEC);return;}

  /* avatar */
  const av=e.target.closest('[data-avstyle]');
  if(av){const u=currentUser();if(!u)return;const p=profile(u);
    p.avatar.mode='gen';p.avatar.style=av.dataset.avstyle;p.avatar.cacheKey='';
    saveUser(u);logActivity('avatar',av.dataset.avstyle);
    setAcctSection('profile');syncPlatformUI();refreshSideAvatar();
    toast(t('Avatar updated','Avatar actualizado'),'','ok');return;}
  if(e.target.closest('#px-avshuffle')){const u=currentUser();if(!u)return;const p=profile(u);
    p.avatar.mode='gen';p.avatar.seed=u.id+'|'+Date.now().toString(36);p.avatar.cacheKey='';
    saveUser(u);setAcctSection('profile');syncPlatformUI();refreshSideAvatar();return;}
  if(e.target.closest('#px-avrm')){const u=currentUser();if(!u)return;const p=profile(u);
    p.avatar.mode='gen';p.avatar.data=null;p.avatar.cacheKey='';saveUser(u);
    setAcctSection('profile');syncPlatformUI();refreshSideAvatar();return;}

  /* preferences */
  const pf=e.target.closest('[data-pref]');
  if(pf){const [k,v]=pf.dataset.pref.split(':');
    if(v===undefined)setPref(k,!PREFS[k]); else setPref(k,v);
    applyPrefs();return;}
  const lg=e.target.closest('[data-lang]');
  if(lg){if(LANG!==lg.dataset.lang){const b=document.getElementById('langTog');b&&b.click();}return;}
  const rg=e.target.closest('[data-reg]');
  if(rg){if(REGION!==rg.dataset.reg){const b=document.querySelector('[data-region-tog]');b&&b.click();}return;}

  /* documents */
  const dl=e.target.closest('[data-dl]');
  if(dl){const d=buildDoc(dl.dataset.dl);
    if(d){dlBlob(d.b,d.n);logActivity('download',d.n);toast(t('Document ready','Documento listo'),d.n,'ok');}
    return;}

  /* collections */
  const cr=e.target.closest('[data-colrm]');
  if(cr){const u=currentUser();if(!u)return;profile(u);
    u.collections=u.collections.filter(c=>c.id!==cr.dataset.colrm);saveUser(u);setAcctSection('collections');return;}
  const ci=e.target.closest('[data-colitem]');
  if(ci){e.stopPropagation();const u=currentUser();if(!u)return;profile(u);
    const [cid,pid]=ci.dataset.colitem.split('|');
    const c=u.collections.find(x=>x.id===cid);if(c)c.items=c.items.filter(x=>x!==pid);
    saveUser(u);setAcctSection('collections');return;}

  /* security */
  const rv=e.target.closest('[data-revoke]');
  if(rv){const u=currentUser();if(!u)return;profile(u);
    u.sessions=u.sessions.filter(s=>s.id!==rv.dataset.revoke);saveUser(u);
    logActivity('security',t('Revoked a device','Dispositivo revocado'));setAcctSection('security');
    toast(t('Device revoked','Dispositivo revocado'),'','ok');return;}
  if(e.target.closest('#px-export')){
    const u=currentUser();if(!u)return;
    const copy=JSON.parse(JSON.stringify(u));delete copy.pass;
    dlBlob(new Blob([JSON.stringify({exported:new Date().toISOString(),account:copy},null,2)],{type:'application/json'}),
      'PEPTIDEX_account_'+(u.profile&&u.profile.cid||'export')+'.json');
    toast(t('Export ready','Exportación lista'),t('Password hash excluded.','Sin el hash de contraseña.'),'ok');return;}
  if(e.target.closest('#px-wipe')){
    if(!confirm(t('Erase every PEPTIDEX preference, note, collection and activity record stored in this browser? Your account itself is kept.',
      '¿Borrar todas las preferencias, notas, colecciones y actividad guardadas en este navegador? La cuenta se conserva.')))return;
    const u=currentUser();if(u){u.notes={};u.collections=[];u.activity=[];u.searches=[];u.notifs=null;u.recent=[];saveUser(u);}
    try{localStorage.removeItem(AIKEY);}catch(e){}
    AI={log:[],ctx:{}};
    toast(t('Local data erased','Datos locales borrados'),'','ok');setAcctSection('security');return;}

  /* saved search */
  const sq=e.target.closest('[data-search]');
  if(sq){openCmd();setTimeout(()=>{const i=document.querySelector('#px-cmdk input');i.value=sq.dataset.search;
    kIdx=0;renderCmd(i.value);},80);return;}
});

document.addEventListener('submit',e=>{
  if(e.target.id==='px-profform'){
    e.preventDefault();const u=currentUser();if(!u)return;const p=profile(u);
    const f=e.target;
    p.display=(f.display.value||'').trim()||u.name;
    p.country=f.country.value;p.line=f.line.value;p.focus=(f.focus.value||'').trim();
    if(p.display&&!u.name)u.name=p.display;
    saveUser(u);logActivity('profile',p.display);
    syncPlatformUI();setAcctSection('profile');
    toast(t('Profile saved','Perfil guardado'),'','ok');return;
  }
  if(e.target.id==='px-pwform'){
    e.preventDefault();const u=currentUser();if(!u)return;const f=e.target;
    if(u.pass!==_sha256(f.cur.value)){toast(t('Incorrect password','Contraseña incorrecta'),'','err');return;}
    if(!f.n1.value||f.n1.value.length<6){toast(t('Too short','Muy corta'),t('Minimum 6 characters.','Mínimo 6 caracteres.'),'err');return;}
    if(f.n1.value!==f.n2.value){toast(t('They do not match','No coinciden'),'','err');return;}
    u.pass=_sha256(f.n1.value);saveUser(u);logActivity('security',t('Password changed','Contraseña cambiada'));
    f.reset();toast(t('Password updated','Contraseña actualizada'),'','ok');return;
  }
  if(e.target.id==='px-colform'){
    e.preventDefault();const u=currentUser();if(!u)return;profile(u);
    const nm=(e.target.nm.value||'').trim();if(!nm)return;
    u.collections.unshift({id:'c'+Date.now().toString(36),name:nm,items:[],ts:Date.now()});
    saveUser(u);logActivity('collection',nm);setAcctSection('collections');return;
  }
});

document.addEventListener('change',e=>{
  if(e.target.id==='px-avup'){
    const f=e.target.files&&e.target.files[0];if(!f)return;
    if(f.size>2.5*1024*1024){toast(t('Image too large','Imagen muy grande'),t('Maximum 2.5 MB.','Máximo 2.5 MB.'),'err');return;}
    const r=new FileReader();
    r.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        const S=320,cv=document.createElement('canvas');cv.width=cv.height=S;
        const c=cv.getContext('2d');
        const side=Math.min(im.width,im.height);
        c.drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,S,S);
        const u=currentUser();if(!u)return;const p=profile(u);
        p.avatar.mode='photo';p.avatar.data=cv.toDataURL('image/jpeg',0.86);p.avatar.cacheKey='';
        saveUser(u);logActivity('avatar',t('Uploaded a photo','Foto subida'));
        setAcctSection('profile');syncPlatformUI();refreshSideAvatar();
        toast(t('Avatar updated','Avatar actualizado'),'','ok');
      };
      im.src=r.result;
    };
    r.readAsDataURL(f);
  }
},true);

document.addEventListener('input',e=>{
  const n=e.target.closest('[data-note]');
  if(n){const u=currentUser();if(!u)return;profile(u);
    clearTimeout(n.__t);
    n.__t=setTimeout(()=>{u.notes[n.dataset.note]=n.value;saveUser(u);},600);}
});

/* after every account section render, paint the avatar previews + prefs */
const _setAcctSection=setAcctSection;
setAcctSection=function(sec){
  _setAcctSection(sec);
  requestAnimationFrame(()=>{
    applyPrefs();
    const u=currentUser();
    document.querySelectorAll('[data-avdraw]').forEach(cv=>{
      if(!u)return;const p=profile(u);
      drawAvatar(cv,cv.dataset.avdraw,p.avatar.seed,(p.display||u.name||'P').charAt(0));
    });
    document.querySelectorAll('.px-stagger').forEach(el=>requestAnimationFrame(()=>el.classList.add('in')));
    collectDepth();depthTick();
  });
};

/* ==========================================================================
   14 · BOOT
   ========================================================================== */
applyPrefs();
mountChrome();
initCursor();
initNav();
initProgress();
applyPrefs();
syncPlatformUI();
{
  const u=currentUser();
  if(u){profile(u);seedNotifs(u);recordSession();saveUser(u);}
}
/* the first render happened before this layer was installed — enhance it now */
enhance();
document.querySelectorAll('.px-stagger').forEach(el=>requestAnimationFrame(()=>el.classList.add('in')));
['#home-hero','.lhero','.qhero'].forEach(sel=>{
  const s=document.querySelector(sel);
  if(s&&!s.querySelector('.px-lightfield')){
    const l=document.createElement('div');l.className='px-lightfield';
    if(getComputedStyle(s).position==='static')s.style.position='relative';
    s.insertBefore(l,s.firstChild);
  }
});
collectDepth();requestAnimationFrame(depthTick);

/* expose a small surface for debugging and for the admin account */
window.PXP={prefs:()=>PREFS,setPref,toast,openCmd,openAI,avatarDataURL,buildDoc,tierOf,completion,memberCardHTML,
  notify,logActivity,version:'1.0.0'};
})();

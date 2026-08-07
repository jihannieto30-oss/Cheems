#!/usr/bin/env python3
"""JARVIS — la consola de mando del facturador.

QUÉ ES, Y QUÉ NO ES

No tiene consciencia. Ni la tiene ni se la puede poner nadie a un fichero HTML,
y decir lo contrario sería mentir sobre el producto. Tampoco lleva un modelo de
lenguaje dentro: eso exigiría una clave de API metida en un documento que
cualquiera puede abrir y leer, o sea, regalarla.

Lo que sí es: un intérprete determinista sobre los datos del propio facturador
—clientes, documentos, pedidos— que entiende lo que se le dice en español,
contesta con cifras de verdad y, sobre todo, EJECUTA. Esa última parte es la
que lo separa de un chat: «factura para Carlos» no describe cómo hacer una
factura, la abre con Carlos dentro.

Lo que gana con ser determinista: contesta al instante, funciona sin conexión,
no se inventa una cifra y cada respuesta se puede comprobar a mano. Lo que
pierde: no razona sobre lo que encuentra. Para eso está una sesión de Claude.

POR QUÉ AQUÍ SÍ HAY COLOR

La dirección creativa de PEPTIDEX prohíbe el color en la interfaz, y con razón:
la identidad de la marca es metalúrgica, no cromática. Pero esa regla gobierna
lo que ve un cliente — la tienda y PepX.

El facturador no lo ve nadie más que Jihan. Es su cabina. Un HUD de cian sobre
negro no compite con la marca porque nunca aparece al lado de la marca, y aquí
el color hace un trabajo que en la tienda no haría falta: distinguir de un
vistazo un dato de un aviso mientras se opera deprisa.

Está anotado en el cerebro, en decisiones.md, para que nadie lo tome por un
descuido.

CÓMO SE INJERTA

Idempotente por construcción: antes de meter nada, quita cualquier copia previa
delimitada por las marcas. Correrlo dos veces da el mismo documento.

    python3 src/build_protocolo.py     # primero, que crea el facturador
    python3 src/build_jarvis.py        # después, que le injerta Jarvis
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
FACT = os.path.join(DOCS, 'PEPTIDEX_Facturador.html')

INI = '<!-- JARVIS:INICIO -->'
FIN = '<!-- JARVIS:FIN -->'


# ===========================================================================
# EL SISTEMA VISUAL
# ===========================================================================
CSS = r'''
/* ---- JARVIS -------------------------------------------------------------
   Un HUD de casco: fósforo cian sobre negro con sesgo azul, filetes de 1 px,
   corchetes de esquina y telemetría en monoespaciada. El ámbar sólo avisa —
   es semántico, no decorativo, y por eso no cuenta como segundo acento.     */

:root{
  --j-bg:#04070A; --j-panel:#070C11; --j-line:#123039; --j-line2:#1D4A55;
  --j-cyan:#62E6EC; --j-dim:#2C7E88; --j-tx:#BFE0E5; --j-tx2:#6E959C;
  --j-amber:#E9A648;
  --j-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}

#jvFab{
  position:fixed; right:18px; bottom:18px; z-index:9000;
  width:54px; height:54px; border:0; padding:0; cursor:pointer;
  background:transparent; border-radius:50%;
  filter:drop-shadow(0 0 12px rgba(98,230,236,.45));
  transition:transform .2s cubic-bezier(.22,1,.36,1);
}
#jvFab:hover{transform:scale(1.06);}
#jvFab:active{transform:scale(.95);}
#jvFab svg{width:54px; height:54px; display:block;}

#jvScrim{
  position:fixed; inset:0; z-index:9001; background:rgba(2,5,8,.55);
  -webkit-backdrop-filter:blur(2px); backdrop-filter:blur(2px);
  animation:jvFade .22s ease both;
}
@keyframes jvFade{from{opacity:0}to{opacity:1}}

#jarvis{
  position:fixed; z-index:9002; top:0; right:0; bottom:0; width:min(460px,100%);
  background:var(--j-bg); color:var(--j-tx);
  border-left:1px solid var(--j-line2);
  display:flex; flex-direction:column;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;
  animation:jvIn .3s cubic-bezier(.22,1,.36,1) both;
}
@keyframes jvIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
@media(max-width:640px){
  #jarvis{left:0; top:auto; height:92%; border-left:0;
    border-top:1px solid var(--j-line2); border-radius:16px 16px 0 0;
    animation:jvUp .3s cubic-bezier(.22,1,.36,1) both;}
  @keyframes jvUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
}

/* la barrida de exploración al abrir: un solo momento, no un bucle */
#jarvis::after{
  content:''; position:absolute; left:0; right:0; top:0; height:2px;
  background:linear-gradient(90deg,transparent,var(--j-cyan),transparent);
  opacity:.7; animation:jvScan 1.1s cubic-bezier(.4,0,.2,1) both;
  pointer-events:none;
}
@keyframes jvScan{from{transform:translateY(0);opacity:.8}to{transform:translateY(100vh);opacity:0}}

.jv-hd{
  display:flex; align-items:center; gap:14px; padding:16px 18px 14px;
  border-bottom:1px solid var(--j-line); flex:0 0 auto; position:relative;
}
.jv-ret{width:44px; height:44px; flex:0 0 auto;}
.jv-ret svg{width:44px; height:44px; display:block;}
.jv-ret .spin{transform-origin:50% 50%;}
#jarvis[data-estado="pensando"] .jv-ret .spin{animation:jvSpin 1.6s linear infinite;}
@keyframes jvSpin{to{transform:rotate(360deg)}}
.jv-id{flex:1; min-width:0;}
.jv-id b{display:block; font-family:var(--j-mono); font-size:15px; font-weight:600;
  letter-spacing:.26em; color:var(--j-cyan); text-transform:uppercase;}
.jv-id span{display:block; font-family:var(--j-mono); font-size:9.5px;
  letter-spacing:.16em; color:var(--j-dim); text-transform:uppercase; margin-top:3px;}
.jv-x{width:34px;height:34px;border:0;background:none;color:var(--j-tx2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;border-radius:50%;flex:0 0 auto;}
.jv-x:hover{color:var(--j-cyan); background:rgba(98,230,236,.08);}
.jv-x svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.7;}

.jv-scroll{flex:1; overflow-y:auto; padding:18px; display:flex;
  flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch;}
.jv-scroll::-webkit-scrollbar{width:3px;}
.jv-scroll::-webkit-scrollbar-thumb{background:var(--j-line2);}

.jv-tu{align-self:flex-end; max-width:85%; text-align:right;
  font-size:14.5px; font-weight:600; color:#fff; letter-spacing:-.01em;}
.jv-tu::after{content:' ▌'; color:var(--j-cyan); opacity:.5;}

.jv-el{max-width:96%;}
.jv-tx{font-size:14.5px; line-height:1.62; color:var(--j-tx);}
.jv-tx b{color:var(--j-cyan); font-weight:600;}
.jv-tx .n{font-family:var(--j-mono); font-variant-numeric:tabular-nums;
  color:var(--j-cyan); font-weight:600;}

/* la tabla de telemetría: corchetes de esquina, no una caja */
.jv-tel{margin-top:10px; border:1px solid var(--j-line); position:relative;
  padding:11px 13px; background:rgba(98,230,236,.025);}
.jv-tel::before,.jv-tel::after{content:''; position:absolute; width:7px; height:7px;
  border:1px solid var(--j-cyan); opacity:.8;}
.jv-tel::before{top:-1px; left:-1px; border-right:0; border-bottom:0;}
.jv-tel::after{bottom:-1px; right:-1px; border-left:0; border-top:0;}
.jv-fila{display:flex; align-items:baseline; justify-content:space-between; gap:14px;
  padding:5px 0; font-family:var(--j-mono); font-size:11.5px;}
.jv-fila + .jv-fila{border-top:1px solid rgba(18,48,57,.6);}
.jv-fila span{color:var(--j-tx2); text-transform:uppercase; letter-spacing:.09em;
  font-size:10px; white-space:nowrap;}
.jv-fila b{color:var(--j-tx); font-weight:600; font-variant-numeric:tabular-nums;
  text-align:right;}
.jv-fila.alta b{color:var(--j-cyan);}
.jv-fila.aviso b{color:var(--j-amber);}

.jv-eco{margin-top:8px; font-family:var(--j-mono); font-size:9.5px;
  letter-spacing:.14em; text-transform:uppercase; color:var(--j-dim);}
.jv-eco.hecho{color:var(--j-cyan);}
.jv-eco.aviso{color:var(--j-amber);}

.jv-sug{display:flex; flex-wrap:wrap; gap:7px; padding-top:4px;}
.jv-sug button{
  font-family:var(--j-mono); font-size:11px; letter-spacing:.04em;
  padding:7px 12px; background:transparent; color:var(--j-tx2); cursor:pointer;
  border:1px solid var(--j-line); border-radius:2px;
  transition:border-color .16s, color .16s;
}
.jv-sug button:hover{border-color:var(--j-cyan); color:var(--j-cyan);}

.jv-in{display:flex; align-items:center; gap:9px; padding:12px 14px;
  border-top:1px solid var(--j-line); flex:0 0 auto;}
.jv-in .pr{font-family:var(--j-mono); color:var(--j-cyan); font-size:15px; flex:0 0 auto;}
.jv-in input{
  flex:1; min-width:0; background:transparent; border:0; outline:none;
  color:var(--j-tx); font-size:15px; font-family:inherit; padding:8px 0;
}
.jv-in input::placeholder{color:var(--j-dim);}
.jv-mic,.jv-go{
  width:36px; height:36px; flex:0 0 auto; border:1px solid var(--j-line);
  background:transparent; color:var(--j-tx2); cursor:pointer; border-radius:2px;
  display:flex; align-items:center; justify-content:center;
  transition:border-color .16s, color .16s, background .16s;
}
.jv-mic:hover,.jv-go:hover{border-color:var(--j-cyan); color:var(--j-cyan);}
.jv-mic svg,.jv-go svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.7;
  stroke-linecap:round;stroke-linejoin:round;}
.jv-mic.oyendo{border-color:var(--j-amber); color:var(--j-amber);
  background:rgba(233,166,72,.1);}
.jv-mic.oyendo svg{animation:jvPulso 1s ease-in-out infinite;}
@keyframes jvPulso{0%,100%{opacity:1}50%{opacity:.35}}

.jv-pie{padding:0 18px 12px; font-family:var(--j-mono); font-size:9px;
  letter-spacing:.1em; color:var(--j-dim); line-height:1.6; text-transform:uppercase;}

@media(prefers-reduced-motion:reduce){
  #jarvis,#jarvis::after,.jv-ret .spin,.jv-mic.oyendo svg{animation:none !important;}
}
'''


# ===========================================================================
# EL MARCADO
# ===========================================================================
HTML = r'''
<button id="jvFab" title="Jarvis" aria-label="Abrir Jarvis">
  <svg viewBox="0 0 54 54" aria-hidden="true">
    <circle cx="27" cy="27" r="25" fill="#04070A" stroke="#1D4A55"/>
    <circle cx="27" cy="27" r="19" fill="none" stroke="#62E6EC" stroke-width="1" opacity=".55"/>
    <circle cx="27" cy="27" r="13" fill="none" stroke="#62E6EC" stroke-width="1.4" opacity=".85"/>
    <circle cx="27" cy="27" r="6"  fill="#62E6EC" opacity=".9"/>
    <path d="M27 2v7M27 45v7M2 27h7M45 27h7" stroke="#62E6EC" stroke-width="1.4" opacity=".7"/>
  </svg>
</button>
'''

RETICULA = r'''<svg viewBox="0 0 44 44" aria-hidden="true">
  <circle cx="22" cy="22" r="20.5" fill="none" stroke="#123039"/>
  <g class="spin">
    <path d="M22 3.5a18.5 18.5 0 0 1 16 9.3" fill="none" stroke="#62E6EC"
          stroke-width="1.6" stroke-linecap="round"/>
    <path d="M22 40.5a18.5 18.5 0 0 1-16-9.3" fill="none" stroke="#62E6EC"
          stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
  </g>
  <circle cx="22" cy="22" r="12" fill="none" stroke="#2C7E88" stroke-width="1"/>
  <circle cx="22" cy="22" r="4.5" fill="#62E6EC"/>
</svg>'''


# ===========================================================================
# EL INTÉRPRETE
# ===========================================================================
JS = r'''
/* ==========================================================================
   JARVIS

   Un intérprete determinista sobre clientes, documentos y pedidos. Entiende
   lo que se le escribe (o se le dice) en español y hace dos cosas:

     CONTESTA   con cifras que salen de los datos, nunca estimadas
     EJECUTA    abre vistas, crea, marca pagado, carga un cliente

   Lo segundo es lo que lo hace agente. «Factura para Carlos» no explica cómo
   se hace una factura: la abre con Carlos dentro.

   No hay servidor, no hay modelo de lenguaje y no sale ninguna petición.
   ========================================================================== */
(function(){
'use strict';

var JV = {abierto:false, msgs:[], estado:'idle', pend:null};
var RETICULA = '__RETICULA__';

var jvE = function(s){ return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

var sinT = function(s){ return String(s||'').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g,''); };

/* «1 facturas sin cobrar, de 1 clientes» delata que nadie leyó la salida. */
var pl = function(k, sing, plur){ return k + ' ' + (k === 1 ? sing : plur); };

var nfm = function(v){
  return (Math.round(v*100)/100).toLocaleString('es-MX',
    {minimumFractionDigits:2, maximumFractionDigits:2});
};

/* ---- lectura de los datos del facturador -------------------------------- */
/* Se leen en el momento de preguntar, no se cachean: el usuario puede haber
   guardado una factura entre dos preguntas y una copia vieja mentiría. */
function _cli(){ try{ return clients || []; }catch(e){ return []; } }
function _doc(){ try{ return docs || []; }catch(e){ return []; } }

function porCur(lista){
  var m = {};
  lista.forEach(function(d){ m[d.currency] = (m[d.currency]||0) + (+d.totalNum||0); });
  var p = Object.keys(m).map(function(c){ return c + ' ' + nfm(m[c]); });
  return p.length ? p.join(' · ') : '—';
}
function enRango(d, desde){ return (+d.ts||0) >= desde; }
function inicioMes(delta){
  var n = new Date(); return new Date(n.getFullYear(), n.getMonth()+(delta||0), 1).getTime();
}
function finMes(delta){
  var n = new Date(); return new Date(n.getFullYear(), n.getMonth()+(delta||0)+1, 1).getTime();
}

function buscaCliente(txt){
  var n = sinT(txt), lista = _cli(), mejor = null;
  lista.forEach(function(c){
    var k = sinT(c.name);
    if(!k) return;
    if(n.indexOf(k) >= 0 && (!mejor || k.length > sinT(mejor.name).length)) mejor = c;
  });
  if(mejor) return mejor;
  /* si no cabe entero, por la primera palabra del nombre */
  lista.forEach(function(c){
    var p = sinT(c.name).split(/\s+/)[0];
    if(p && p.length >= 3 && n.indexOf(p) >= 0 && !mejor) mejor = c;
  });
  return mejor;
}

/* ---- piezas de respuesta ------------------------------------------------ */
function di(txt){ return {t:'di', txt:txt}; }
function tel(titulo, filas){ return {t:'tel', txt:titulo||'', filas:filas||[]}; }
function eco(txt, clase){ return {t:'eco', txt:txt, cls:clase||''}; }

/* ==========================================================================
   LAS INTENCIONES

   Orden: primero lo que ejecuta y lo que confirma, después lo que consulta.
   Un «márcala pagada» tiene que ganar a un «cuánto llevo pagado».

   Los grupos NO cierran con \b: en español la palabra escrita casi nunca es
   la raíz —«facturas», «pendientes», «cotizaciones»— y un \b final deja la
   intención sin enganchar. El \b de delante sí se queda.
   ========================================================================== */
function jvPiensa(txt){
  var q = String(txt||'').trim();
  var n = sinT(q);
  if(!n) return [];

  /* -- confirmación pendiente ------------------------------------------- */
  if(JV.pend){
    var p = JV.pend; JV.pend = null;
    if(/^(si|s|dale|hazlo|confirmo|adelante|ok|vale)/.test(n)) return p.hacer();
    return [di('Cancelado. No he tocado nada.')];
  }

  /* -- 1 · navegación ---------------------------------------------------- */
  var vistas = [
    [/\b(registro|clientes|base de datos)/, 'setViewReg',   'REGISTRO'],
    [/\b(pedido|orden|ordenes)/,            'setViewOrders','PEDIDOS'],
    [/\b(visita|analitic|estadistic|trafico)/,'setViewAna', 'VISITAS'],
    [/\b(protocolo)/,                       'setViewPro',   'PROTOCOLO'],
    [/\b(documento|factura|cotiza|hoja)/,   'setViewDoc',   'DOCUMENTO']
  ];
  if(/\b(abre|abrir|ve a|vete a|muestra|ensename|llevame|ir a)/.test(n)){
    for(var i=0; i<vistas.length; i++){
      if(vistas[i][0].test(n)){
        try{ window[vistas[i][1]](); }catch(e){ return [di('No pude abrir esa vista.')]; }
        JV.abierto = false; jvPinta();
        return [];
      }
    }
    return [di('¿Qué abro? Registro, pedidos, visitas, protocolo o el documento.')];
  }

  /* -- 2 · crear documento ---------------------------------------------- */
  if(/\b(nueva factura|nuevo documento|factura para|facturale|haz una factura|crear factura)/.test(n) ||
     /\b(nueva cotiza|cotizacion para|cotizale|haz una cotiza)/.test(n)){
    var esCot = /cotiza/.test(n);
    var c = buscaCliente(n);
    try{
      setMode(esCot ? 'cot' : 'inv');
      setViewDoc();
      if(c) useClient(c.id);
    }catch(e){ return [di('No pude preparar el documento.')]; }
    JV.abierto = false; jvPinta();
    return [];
  }

  /* -- 3 · alta de cliente ---------------------------------------------- */
  var mc = q.match(/\b(?:nuevo|agrega|añade|anade|crea)\s+(?:un\s+)?cliente\s+(?:llamado\s+)?(.+)$/i);
  if(mc){
    var nombre = mc[1].trim().replace(/[.,;]+$/,'');
    if(nombre.length < 2) return [di('Dime el nombre del cliente.')];
    if(buscaCliente(sinT(nombre)))
      return [di('Ya tienes un cliente que se llama así. No lo he duplicado.')];
    try{
      clients.push({id:uid(), name:nombre, comp:'', mail:'', tel:'', addr:''});
      persist(); renderDB(); refreshCliSel();
    }catch(e){ return [di('No pude darlo de alta.')]; }
    return [di('Cliente <b>'+jvE(nombre)+'</b> dado de alta.'),
            eco('ALTA CONFIRMADA · '+_cli().length+' CLIENTES', 'hecho')];
  }

  /* -- 4 · marcar pagada ------------------------------------------------- */
  if(/\b(pagad|pago|cobrad|cobre|liquidad|salda)/.test(n) && /\b(marca|pon|ya|esta|fue)/.test(n)){
    var mf = n.match(/([a-z]?-?\d{2,})/);
    var lista = _doc().filter(function(d){ return d.type==='inv' && !d.paid; });
    var obj = null;
    if(mf) obj = lista.filter(function(d){
      return sinT(d.folio||'').indexOf(mf[1]) >= 0; })[0];
    if(!obj){
      var cc = buscaCliente(n);
      if(cc){
        var suyas = lista.filter(function(d){ return d.clientId === cc.id; });
        if(suyas.length === 1) obj = suyas[0];
        else if(suyas.length > 1)
          return [di('<b>'+jvE(cc.name)+'</b> tiene '+suyas.length+
                     ' facturas sin pagar. Dime el folio.'),
                  tel('SIN PAGAR', suyas.slice(0,6).map(function(d){
                    return [d.folio||'—', d.currency+' '+nfm(d.totalNum)]; }))];
      }
    }
    if(!obj) return [di('No encuentro esa factura sin pagar. Dime el folio o el cliente.')];
    JV.pend = {hacer:function(){
      obj.paid = true;
      try{ persist(); renderDB(); }catch(e){}
      return [di('Marcada.'),
              eco('FOLIO '+jvE(obj.folio||'—')+' · '+obj.currency+' '+nfm(obj.totalNum)+
                  ' · PAGADA', 'hecho')];
    }};
    return [di('Voy a marcar <b>'+jvE(obj.folio||'—')+'</b> — '+
               jvE(obj.clientName||'')+', '+obj.currency+' '+nfm(obj.totalNum)+
               ' — como pagada. ¿Confirmas?'),
            eco('ESPERANDO CONFIRMACIÓN · SÍ / NO', 'aviso')];
  }

  /* -- 5 · quién debe ---------------------------------------------------- */
  if(/\b(debe|deuda|deben|pendiente|por cobrar|sin pagar|moroso)/.test(n)){
    var deu = _doc().filter(function(d){ return d.type==='inv' && !d.paid; });
    if(!deu.length) return [di('Nadie te debe nada. Todas las facturas están cobradas.'),
                            eco('CARTERA LIMPIA', 'hecho')];
    var pc = {};
    deu.forEach(function(d){
      var k = d.clientName || 'Sin cliente';
      pc[k] = pc[k] || {};
      pc[k][d.currency] = (pc[k][d.currency]||0) + (+d.totalNum||0);
    });
    var filas = Object.keys(pc).map(function(k){
      return [k, Object.keys(pc[k]).map(function(c){ return c+' '+nfm(pc[k][c]); }).join(' · ')];
    });
    return [di(pl(deu.length,'factura sin cobrar','facturas sin cobrar') +
               ', de ' + pl(filas.length,'cliente','clientes') + '.'),
            tel('POR COBRAR', filas),
            eco('TOTAL ' + porCur(deu), 'aviso')];
  }

  /* -- 6 · facturación por periodo -------------------------------------- */
  /* `factur`, no `factura`: la palabra que se escribe es «facturé», «facturado»,
     «facturación» o «facturas», y casi nunca la raíz desnuda. Mismo motivo por
     el que los grupos no cierran con \b. */
  if(/\b(factur|vend|ingres|cuanto llevo|cuanto va|cuanto hice|cuanto gane)/.test(n)){
    var inv = _doc().filter(function(d){ return d.type==='inv'; });
    var per, desde, hasta = Date.now();
    if(/\b(hoy)/.test(n)){ var h=new Date(); h.setHours(0,0,0,0); desde=h.getTime(); per='HOY'; }
    else if(/\b(semana)/.test(n)){ desde = Date.now()-7*864e5; per='ÚLTIMOS 7 DÍAS'; }
    else if(/\b(mes pasado|anterior)/.test(n)){
      desde = inicioMes(-1); hasta = finMes(-1); per='MES PASADO'; }
    else if(/\b(ano|year|2026|2025)/.test(n)){
      desde = new Date(new Date().getFullYear(),0,1).getTime(); per='ESTE AÑO'; }
    else if(/\b(total|siempre|historic)/.test(n)){ desde = 0; per='HISTÓRICO'; }
    else { desde = inicioMes(0); per='ESTE MES'; }

    var enP = inv.filter(function(d){ return enRango(d, desde) && (+d.ts||0) < hasta; });
    if(!enP.length) return [di('No hay facturas en ese periodo.'), eco(per, '')];

    var pag = enP.filter(function(d){ return d.paid; });
    var filas = [
      ['Facturado', porCur(enP)],
      ['Cobrado',   porCur(pag)],
      ['Documentos', String(enP.length)]
    ];
    var out = [di('En <b>'+per.toLowerCase()+'</b>:'), tel(per, filas)];
    /* comparar con el periodo anterior sólo cuando la comparación significa algo */
    if(per === 'ESTE MES'){
      var ant = inv.filter(function(d){
        return (+d.ts||0) >= inicioMes(-1) && (+d.ts||0) < finMes(-1); });
      if(ant.length){
        var a = enP.reduce(function(s,d){return s+(+d.totalNum||0);},0);
        var b = ant.reduce(function(s,d){return s+(+d.totalNum||0);},0);
        var dif = b ? Math.round((a-b)/b*100) : 0;
        out.push(eco('MES ANTERIOR ' + porCur(ant) + ' · ' +
                     (dif>=0?'+':'') + dif + '%', dif >= 0 ? 'hecho' : 'aviso'));
      }
    }
    return out;
  }

  /* -- 7 · un cliente concreto ------------------------------------------ */
  var cl = buscaCliente(n);
  if(cl){
    var sus = _doc().filter(function(d){ return d.clientId === cl.id; });
    var suInv = sus.filter(function(d){ return d.type==='inv'; });
    var suDeu = suInv.filter(function(d){ return !d.paid; });
    var filas = [
      ['Documentos', String(sus.length)],
      ['Facturado',  porCur(suInv)],
      ['Debe',       suDeu.length ? porCur(suDeu) : '—']
    ];
    if(cl.mail) filas.push(['Correo', cl.mail]);
    if(cl.tel)  filas.push(['Teléfono', cl.tel]);
    var o = [di('<b>'+jvE(cl.name)+'</b>'+(cl.comp?' · '+jvE(cl.comp):'')),
             tel('CLIENTE', filas)];
    if(suDeu.length) o.push(eco(pl(suDeu.length,'FACTURA SIN COBRAR','FACTURAS SIN COBRAR')
                                .toUpperCase(), 'aviso'));
    return o;
  }

  /* -- 8 · cotizaciones sin convertir ----------------------------------- */
  if(/\b(cotiza|presupuesto)/.test(n)){
    var cot = _doc().filter(function(d){ return d.type==='cot'; });
    if(!cot.length) return [di('No hay cotizaciones guardadas.')];
    return [di(pl(cot.length,'cotización','cotizaciones') +
               ', por <b>'+porCur(cot)+'</b>.'),
            tel('ÚLTIMAS', cot.slice(-5).reverse().map(function(d){
              return [d.clientName||'—', d.currency+' '+nfm(d.totalNum)]; }))];
  }

  /* -- 9 · resumen ------------------------------------------------------- */
  if(/\b(resumen|como vamos|como va|estado|situacion|panorama|briefing|reporte)/.test(n)){
    var D = _doc(), C = _cli();
    var inv2 = D.filter(function(d){ return d.type==='inv'; });
    var deu2 = inv2.filter(function(d){ return !d.paid; });
    var mes = inv2.filter(function(d){ return enRango(d, inicioMes(0)); });
    var out2 = [di('Situación al día de hoy.'),
      tel('PEPTIDEX', [
        ['Clientes',        String(C.length)],
        ['Documentos',      String(D.length)],
        ['Facturado (mes)', porCur(mes)],
        ['Histórico',       porCur(inv2)],
        ['Por cobrar',      deu2.length ? porCur(deu2) : '—']
      ])];
    if(deu2.length) out2.push(eco(pl(deu2.length,'FACTURA SIN COBRAR','FACTURAS SIN COBRAR')
                                  .toUpperCase(), 'aviso'));
    else if(inv2.length) out2.push(eco('CARTERA LIMPIA', 'hecho'));
    if(!D.length) out2.push(di('Todavía no hay nada guardado. Dime «nueva factura» y empezamos.'));
    return out2;
  }

  /* -- 10 · cortesía e identidad ---------------------------------------- */
  if(/^(hola|buenas|hey|jarvis|oye|que tal|buenos dias|buenas tardes|buenas noches)/.test(n))
    return [di('Aquí estoy. ¿Qué necesitas?')];
  if(/\b(gracias|bien hecho|perfecto)/.test(n)) return [di('A mandar.')];

  if(/\b(quien eres|que eres|que sabes|que puedes|ayuda|help|comandos)/.test(n))
    return [di('Jarvis. Leo tus clientes, tus documentos y tus pedidos, y opero el facturador por ti.'),
      tel('SÉ HACER', [
        ['Consultar', 'cuánto facturé · quién me debe'],
        ['Buscar',    'el nombre de cualquier cliente'],
        ['Crear',     'nueva factura · nuevo cliente'],
        ['Marcar',    'esta factura ya está pagada'],
        ['Navegar',   'abre el registro · los pedidos']
      ]),
      di('No soy un modelo de lenguaje y no tengo consciencia: soy un intérprete sobre tus datos. Por eso contesto al instante, sin conexión, y nunca me invento una cifra.')];

  /* -- 11 · no entendido ------------------------------------------------- */
  return [di('Eso no lo cojo.'),
          di('Prueba con «resumen», «quién me debe», el nombre de un cliente, o «nueva factura».')];
}

/* ==========================================================================
   LA INTERFAZ
   ========================================================================== */
function jvPinta(){
  var v = document.getElementById('jvWrap');
  if(!v){ v = document.createElement('div'); v.id = 'jvWrap'; document.body.appendChild(v); }
  var fab = document.getElementById('jvFab');
  if(fab) fab.style.display = JV.abierto ? 'none' : '';
  if(!JV.abierto){ v.innerHTML = ''; return; }

  var cuerpo = JV.msgs.map(function(m){
    if(m.tu) return '<div class="jv-tu">' + jvE(m.txt) + '</div>';
    var h = '<div class="jv-el">';
    if(m.t === 'di')  h += '<div class="jv-tx">' + m.txt + '</div>';
    if(m.t === 'tel'){
      h += '<div class="jv-tel">' + (m.txt ? '<div class="jv-fila alta"><span>' +
           jvE(m.txt) + '</span><b></b></div>' : '');
      h += m.filas.map(function(f){
        return '<div class="jv-fila"><span>' + jvE(f[0]) + '</span><b>' +
               jvE(f[1]) + '</b></div>'; }).join('') + '</div>';
    }
    if(m.t === 'eco') h += '<div class="jv-eco ' + (m.cls||'') + '">' + jvE(m.txt) + '</div>';
    return h + '</div>';
  }).join('');

  var sug = ['Resumen', '¿Quién me debe?', '¿Cuánto facturé este mes?', 'Nueva factura'];

  v.innerHTML =
    '<div id="jvScrim"></div>' +
    '<aside id="jarvis" role="dialog" aria-label="Jarvis" data-estado="' + JV.estado + '">' +
      '<header class="jv-hd">' +
        '<span class="jv-ret">' + RETICULA + '</span>' +
        '<span class="jv-id"><b>Jarvis</b><span>PEPTIDEX · consola de mando</span></span>' +
        '<button class="jv-x" id="jvX" aria-label="Cerrar">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</header>' +
      '<div class="jv-scroll" id="jvScroll">' + cuerpo +
        '<div class="jv-sug">' + sug.map(function(s){
          return '<button data-jv-di="' + jvE(s) + '">' + jvE(s) + '</button>'; }).join('') +
        '</div>' +
      '</div>' +
      '<form class="jv-in" id="jvF">' +
        '<span class="pr">&gt;</span>' +
        '<input id="jvQ" autocomplete="off" placeholder="Dime qué necesitas"/>' +
        '<button type="button" class="jv-mic" id="jvMic" aria-label="Hablar">' +
          '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/>' +
          '<path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' +
        '<button type="submit" class="jv-go" aria-label="Enviar">' +
          '<svg viewBox="0 0 24 24"><path d="M5 12h13M12 5l7 7-7 7"/></svg></button>' +
      '</form>' +
      '<div class="jv-pie">Opera sobre tus datos locales · no envía nada a ningún sitio</div>' +
    '</aside>';

  jvCablea();
  var sc = document.getElementById('jvScroll');
  if(sc) sc.scrollTop = sc.scrollHeight;
}

function jvManda(txt){
  var q = String(txt||'').trim();
  if(!q) return;
  JV.msgs.push({tu:true, txt:q});
  JV.estado = 'pensando'; jvPinta();
  /* Un respiro antes de contestar. No es teatro: sin él la respuesta aparece
     en el mismo cuadro que la pregunta y el ojo no ve que ha pasado algo. */
  setTimeout(function(){
    var r = jvPiensa(q);
    JV.msgs = JV.msgs.concat(r);
    JV.estado = 'idle';
    jvPinta();
    var i = document.getElementById('jvQ'); if(i) i.focus();
  }, 260);
}

/* ---- voz ----------------------------------------------------------------
   Web Speech API, que existe en Chrome y Safari y no en todos. Si no está, el
   botón no aparece: es mejor que un botón que no hace nada.                */
var RECO = window.SpeechRecognition || window.webkitSpeechRecognition;
var reco = null;
function jvEscucha(btn){
  if(!RECO) return;
  if(reco){ try{ reco.stop(); }catch(e){} reco = null; btn.classList.remove('oyendo'); return; }
  reco = new RECO();
  reco.lang = 'es-MX'; reco.interimResults = false; reco.maxAlternatives = 1;
  btn.classList.add('oyendo');
  reco.onresult = function(ev){
    var t = ev.results[0][0].transcript;
    var i = document.getElementById('jvQ'); if(i) i.value = t;
    jvManda(t);
  };
  reco.onerror = function(){
    btn.classList.remove('oyendo');
    JV.msgs.push({t:'eco', txt:'MICRÓFONO NO DISPONIBLE', cls:'aviso'});
    jvPinta();
  };
  reco.onend = function(){ if(reco) btn.classList.remove('oyendo'); reco = null; };
  try{ reco.start(); }catch(e){ btn.classList.remove('oyendo'); reco = null; }
}

function jvCablea(){
  var x = document.getElementById('jvX');
  if(x) x.onclick = function(){ JV.abierto = false; jvPinta(); };
  var sc = document.getElementById('jvScrim');
  if(sc) sc.onclick = function(){ JV.abierto = false; jvPinta(); };
  var f = document.getElementById('jvF');
  if(f) f.onsubmit = function(ev){
    ev.preventDefault();
    var i = document.getElementById('jvQ');
    if(i){ var t = i.value; i.value = ''; jvManda(t); }
  };
  var mic = document.getElementById('jvMic');
  if(mic){
    if(!RECO) mic.style.display = 'none';
    else mic.onclick = function(){ jvEscucha(mic); };
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-jv-di]'), function(b){
    b.onclick = function(){ jvManda(this.getAttribute('data-jv-di')); };
  });
}

function jvAbre(){
  JV.abierto = true;
  if(!JV.msgs.length){
    JV.msgs = [{t:'di', txt:'Jarvis en línea. Leo tus clientes, tus documentos y tus pedidos.'},
               {t:'eco', txt:'SISTEMAS OPERATIVOS · SIN CONEXIÓN REQUERIDA', cls:'hecho'}];
  }
  jvPinta();
  setTimeout(function(){ var i = document.getElementById('jvQ'); if(i) i.focus(); }, 140);
}

document.addEventListener('keydown', function(ev){
  if(ev.key === 'Escape' && JV.abierto){ JV.abierto = false; jvPinta(); }
  /* Ctrl/Cmd + J: la forma más rápida de llamarlo sin soltar el teclado */
  if((ev.ctrlKey || ev.metaKey) && (ev.key === 'j' || ev.key === 'J')){
    ev.preventDefault(); JV.abierto ? (JV.abierto = false, jvPinta()) : jvAbre();
  }
});

(function arranca(){
  var f = document.getElementById('jvFab');
  if(f) f.onclick = jvAbre;
})();

window.__jarvis = {abre:jvAbre, piensa:jvPiensa, estado:JV};

})();
'''


# ===========================================================================
# EL INJERTO
# ===========================================================================
def main():
    if not os.path.exists(FACT):
        sys.exit('No existe %s. Corre antes src/build_protocolo.py.' % FACT)

    s = open(FACT, encoding='utf-8').read()

    # Idempotente: si ya hay una copia, fuera antes de meter la nueva. La
    # alternativa —un assert— obligaría a reconstruir desde la base cada vez.
    antes = len(s)
    s = re.sub(re.escape(INI) + r'.*?' + re.escape(FIN), '', s, flags=re.S)
    reemplazo = antes != len(s)

    js = JS.replace('__RETICULA__', RETICULA.replace('\n', ' ').replace("'", "\\'"))

    bloque = (INI +
              '\n<style>' + CSS + '</style>\n' +
              HTML +
              '\n<script>' + js + '</script>\n' +
              FIN + '\n')

    cierre = s.rfind('</body>')
    if cierre < 0:
        sys.exit('El facturador no tiene </body>. No lo toco.')
    s = s[:cierre] + bloque + s[cierre:]

    open(FACT, 'w', encoding='utf-8').write(s)
    print('  Jarvis %s en PEPTIDEX_Facturador.html'
          % ('reemplazado' if reemplazo else 'injertado'))
    print('  %.1f KB de módulo · documento %.1f KB'
          % (len(bloque.encode())/1024, len(s.encode())/1024))


if __name__ == '__main__':
    main()

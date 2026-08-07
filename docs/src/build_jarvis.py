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
/* en guardia el flotante late: el micrófono está abierto y tiene que verse */
#jvFab.guardia{animation:jvGua 2.2s ease-in-out infinite;}
@keyframes jvGua{0%,100%{filter:drop-shadow(0 0 12px rgba(98,230,236,.45))}
                 50%{filter:drop-shadow(0 0 20px rgba(233,166,72,.75))}}
#jvFab svg{width:54px; height:54px; display:block;}

#jvScrim{
  position:fixed; inset:0; z-index:9001; background:rgba(2,5,8,.55);
  -webkit-backdrop-filter:blur(2px); backdrop-filter:blur(2px);
  animation:jvFade .22s ease both;
}
@keyframes jvFade{from{opacity:0}to{opacity:1}}

#jarvis{
  position:fixed; z-index:9002; top:0; right:0; bottom:0; width:min(520px,100%);
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
/* EL NÚCLEO

   Tres anillos concéntricos que giran en sentidos contrarios, con marcas de
   escala. Es la pieza que hace que esto se lea como JARVIS y no como un chat
   con el fondo oscuro, así que se lleva el sitio que merece: 132 px y arriba
   del todo.

   Los anillos giran SIEMPRE, despacio, porque un instrumento encendido no está
   quieto. Lo que cambia con el estado es la velocidad y el núcleo. */
.jv-nuc{width:132px; height:132px; margin:6px auto 2px; position:relative;}
.jv-nuc svg{width:132px; height:132px; display:block; overflow:visible;}
.jv-nuc .r1{transform-origin:50% 50%; animation:jvSpin 42s linear infinite;}
.jv-nuc .r2{transform-origin:50% 50%; animation:jvSpin 28s linear infinite reverse;}
.jv-nuc .r3{transform-origin:50% 50%; animation:jvSpin 15s linear infinite;}
@keyframes jvSpin{to{transform:rotate(360deg)}}
#jarvis[data-estado="pensando"] .jv-nuc .r3{animation-duration:2.4s;}
#jarvis[data-estado="pensando"] .jv-nuc .r2{animation-duration:6s;}
#jarvis[data-estado="hablando"] .jv-nuc .r1{animation-duration:12s;}

/* El núcleo late con el AUDIO DE VERDAD, no con un temporizador: la escala la
   escribe el analizador desde el micrófono. Cuando no hay micrófono, respira. */
.jv-nuc .core{transform-origin:50% 50%; transition:transform .06s linear;}
#jarvis[data-estado="hablando"] .jv-nuc .core{animation:jvResp 1.05s ease-in-out infinite;}
@keyframes jvResp{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}

/* las barras radiales del nivel de entrada */
.jv-nuc .lvl line{stroke:var(--j-cyan); stroke-width:2; stroke-linecap:round;
  opacity:0; transition:opacity .2s;}
#jarvis[data-estado="oyendo"] .jv-nuc .lvl line{opacity:.85;}

.jv-est{text-align:center; font-family:var(--j-mono); font-size:9.5px;
  letter-spacing:.22em; text-transform:uppercase; color:var(--j-dim);
  margin:2px 0 14px; min-height:12px;}
#jarvis[data-estado="oyendo"] .jv-est{color:var(--j-amber);}
#jarvis[data-estado="hablando"] .jv-est,
#jarvis[data-estado="pensando"] .jv-est{color:var(--j-cyan);}
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
.jv-voz{
  width:36px; height:36px; flex:0 0 auto; border:1px solid var(--j-line);
  background:transparent; color:var(--j-tx2); cursor:pointer; border-radius:2px;
  display:flex; align-items:center; justify-content:center;
  transition:border-color .16s, color .16s;
}
.jv-voz:hover{border-color:var(--j-cyan); color:var(--j-cyan);}
.jv-voz.on{border-color:var(--j-cyan); color:var(--j-cyan);}
.jv-voz svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.7;
  stroke-linecap:round;stroke-linejoin:round;}
/* Mientras habla, la retícula late. Refleja un estado real — no es adorno:
   es la única señal de que el silencio es «pensando» y no «se colgó». */
#jarvis[data-estado="hablando"] .jv-ret svg{animation:jvLate 1.1s ease-in-out infinite;}
@keyframes jvLate{0%,100%{opacity:1}50%{opacity:.5}}
#jarvis[data-estado="hablando"] .jv-ret .spin{animation:jvSpin 3s linear infinite;}
@keyframes jvPulso{0%,100%{opacity:1}50%{opacity:.35}}

.jv-pie{padding:0 18px 12px; font-family:var(--j-mono); font-size:9px;
  letter-spacing:.1em; color:var(--j-dim); line-height:1.6; text-transform:uppercase;}

@media(prefers-reduced-motion:reduce){
  #jarvis,#jarvis::after,.jv-nuc .r1,.jv-nuc .r2,.jv-nuc .r3,
  .jv-nuc .core,.jv-mic.oyendo svg{animation:none !important;}
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

import math


def _marcas(r, n, largo, ancho, op, cada=1):
    """Marcas de escala alrededor de un círculo.

    Escritas a mano serían sesenta líneas de coordenadas que nadie podría
    ajustar después. Generadas, cambiar el radio es cambiar un número."""
    out = []
    for i in range(n):
        if i % cada:
            continue
        a = 2 * math.pi * i / n
        c, s_ = math.cos(a), math.sin(a)
        out.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" '
                   'stroke="#62E6EC" stroke-width="%s" opacity="%s"/>'
                   % (66 + c*r, 66 + s_*r, 66 + c*(r+largo), 66 + s_*(r+largo),
                      ancho, op))
    return ''.join(out)


def _nivel():
    """Las 24 barras radiales del nivel de entrada. El JS les mueve el largo."""
    out = []
    for i in range(24):
        a = 2 * math.pi * i / 24
        c, s_ = math.cos(a), math.sin(a)
        out.append('<line data-l="%d" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"/>'
                   % (i, 66 + c*30, 66 + s_*30, 66 + c*34, 66 + s_*34))
    return ''.join(out)


def nucleo():
    """El núcleo: tres anillos concéntricos girando en sentidos contrarios."""
    return ('<svg viewBox="0 0 132 132" aria-hidden="true">'
            # anillo exterior, marcas largas cada 5
            '<g class="r1">'
            '<circle cx="66" cy="66" r="62" fill="none" stroke="#123039"/>'
            + _marcas(56, 60, 5, '1', '.55')
            + _marcas(54, 60, 7, '1.4', '.9', cada=5) +
            '</g>'
            # anillo medio: dos arcos abiertos, que es lo que da el giro visible
            '<g class="r2">'
            '<path d="M66 20a46 46 0 0 1 39.8 23" fill="none" stroke="#62E6EC" '
            'stroke-width="1.8" stroke-linecap="round"/>'
            '<path d="M66 112a46 46 0 0 1-39.8-23" fill="none" stroke="#62E6EC" '
            'stroke-width="1.8" stroke-linecap="round" opacity=".55"/>'
            '<circle cx="66" cy="66" r="46" fill="none" stroke="#123039" '
            'stroke-dasharray="2 6"/>'
            '</g>'
            # anillo interior
            '<g class="r3">'
            '<circle cx="66" cy="66" r="36" fill="none" stroke="#2C7E88" '
            'stroke-width="1" stroke-dasharray="34 12"/>'
            '</g>'
            '<g class="lvl">' + _nivel() + '</g>'
            # el núcleo
            '<g class="core">'
            '<circle cx="66" cy="66" r="22" fill="none" stroke="#1D4A55"/>'
            '<circle cx="66" cy="66" r="15" fill="none" stroke="#62E6EC" '
            'stroke-width="1.4" opacity=".8"/>'
            '<circle cx="66" cy="66" r="8" fill="#62E6EC" opacity=".92"/>'
            '<circle cx="66" cy="66" r="8" fill="none" stroke="#BFE0E5" '
            'stroke-width=".6" opacity=".5"/>'
            '</g>'
            '</svg>')


RETICULA = nucleo()


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

var JV = {abierto:false, msgs:[], estado:'idle', pend:null, conversa:false};
var RETICULA = '__RETICULA__';
var ESTADOS = {idle:'en línea', oyendo:'escuchando', pensando:'procesando',
               hablando:'respondiendo', guardia:'en guardia · di «Jarvis»'};

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
  if(fab){
    fab.style.display = JV.abierto ? 'none' : '';
    fab.classList.toggle('guardia', !!guardia);
  }
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
        '<span class="jv-id"><b>Jarvis</b><span>PEPTIDEX · consola de mando</span></span>' +
        '<button class="jv-x" id="jvX" aria-label="Cerrar">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</header>' +
      '<div class="jv-nuc">' + RETICULA + '</div>' +
      '<div class="jv-est">' + jvE(ESTADOS[JV.estado] || '') + '</div>' +
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
        '<button type="button" class="jv-mic' + (guardia ? ' oyendo' : '') + '" id="jvGua" ' +
          'aria-label="Guardia" title="Escuchar y esperar a «Jarvis»">' +
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/>' +
          '<path d="M6.5 6.5a7.8 7.8 0 0 0 0 11M17.5 6.5a7.8 7.8 0 0 1 0 11' +
          'M3.6 3.6a11.9 11.9 0 0 0 0 16.8M20.4 3.6a11.9 11.9 0 0 1 0 16.8"/></svg>' +
        '</button>' +
        '<button type="button" class="jv-voz' + (vozOn ? ' on' : '') + '" id="jvVoz" ' +
          'aria-label="Voz" title="Que Jarvis hable">' +
          (vozOn
            ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
              '<path d="M16 8.5a4.5 4.5 0 0 1 0 7M19 5.5a8.5 8.5 0 0 1 0 13"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
              '<path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>') +
        '</button>' +
        '<button type="submit" class="jv-go" aria-label="Enviar">' +
          '<svg viewBox="0 0 24 24"><path d="M5 12h13M12 5l7 7-7 7"/></svg></button>' +
      '</form>' +
      '<div class="jv-pie">' + (guardia
        ? 'Micrófono abierto esperando «Jarvis» · sólo mientras esta página esté abierta'
        : 'Opera sobre tus datos locales · no envía nada a ningún sitio') + '</div>' +
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
    /* Habla, y al terminar vuelve a abrir el micrófono: eso es lo que
       convierte dictar una orden en tener una conversación. */
    jvHabla(paraDecir(r), function(){
      if(vozOn && JV.abierto && JV.conversa){
        var m = document.getElementById('jvMic');
        if(m && !m.classList.contains('oyendo')) jvEscucha(m);
      }
    });
  }, 260);
}

/* ==========================================================================
   LA VOZ

   Dos mitades distintas de la Web Speech API, y conviene no confundirlas:

     SpeechRecognition   te oye.  Chrome y Safari. No está en todos.
     speechSynthesis     te habla. Está prácticamente en todos.

   Ninguna necesita servidor ni clave. La voz sale del sistema operativo, así
   que en un iPhone suena a iPhone y en un Mac suena a Mac.

   MODO CONVERSACIÓN

   Cuando la voz está encendida, al terminar de hablar Jarvis vuelve a abrir el
   micrófono solo. Eso es lo que convierte «dictar una orden» en «tener una
   conversación» — y es también por lo que hay que cerrarlo bien: un micrófono
   que se reabre para siempre es una batería vacía y un usuario asustado. Se
   corta en cuanto se cierra el panel, se pulsa el conmutador o pasa un turno
   sin que se diga nada.
   ========================================================================== */
var SINT = window.speechSynthesis || null;
var vozOn = false;
try{ vozOn = localStorage.getItem('jv-voz') === '1'; }catch(e){}

/* La voz española del sistema, si la hay. Sin esto un texto en español lo lee
   una voz inglesa y no se entiende nada. */
/* VOZ MASCULINA EN ESPAÑOL

   La API no dice el sexo de una voz: `SpeechSynthesisVoice` sólo trae nombre,
   idioma y poco más. Así que se va por el nombre, que es lo único que hay.

   La lista son las voces masculinas españolas que reparten los sistemas:
   Jorge y Juan en Apple, Pablo y Raúl en Microsoft, y las de Google. No están
   todas en todas partes — por eso hay orden de preferencia y por eso el
   usuario puede elegir a mano si la que sale no le gusta. */
var HOMBRES = /(jorge|juan|diego|pablo|raul|raúl|carlos|enrique|miguel|arnau|male|hombre)/i;
var MUJERES = /(monica|mónica|paulina|marisol|helena|laura|sabina|esperanza|female|mujer)/i;

function vocesES(){
  if(!SINT) return [];
  return (SINT.getVoices() || []).filter(function(v){ return /^es/i.test(v.lang); });
}
function vozES(){
  var vs = vocesES();
  if(!vs.length) return null;
  /* si el usuario eligió una, manda */
  var puesta = null;
  try{ puesta = localStorage.getItem('jv-voznom'); }catch(e){}
  if(puesta){
    var m = vs.filter(function(v){ return v.name === puesta; })[0];
    if(m) return m;
  }
  var varon = vs.filter(function(v){ return HOMBRES.test(v.name) && !MUJERES.test(v.name); });
  /* dentro de las masculinas, la del español de México antes que las demás */
  var pref = function(l){ return varon.filter(function(v){ return l.test(v.lang); }); };
  return pref(/^es[-_]MX/i)[0] || pref(/^es[-_]US/i)[0] || pref(/^es[-_]419/i)[0] ||
         varon[0] ||
         vs.filter(function(v){ return !MUJERES.test(v.name); })[0] || vs[0];
}
/* Chrome carga las voces tarde y de forma asíncrona. */
if(SINT && SINT.onvoiceschanged !== undefined) SINT.onvoiceschanged = function(){};

/* Lo que se dice en voz alta NO es lo que se ve.

   Una tabla de telemetría leída en alto es tortura: «CLIENTES dos DOCUMENTOS
   tres FACTURADO MES eme equis ene veintiún mil punto cero cero». Se lee la
   frase, y de la tabla sólo lo que tiene sentido oír. */
function paraDecir(msgs){
  var partes = [];
  msgs.forEach(function(m){
    if(m.tu) return;
    if(m.t === 'di') partes.push(m.txt.replace(/<[^>]+>/g, ''));
    if(m.t === 'tel' && m.filas.length <= 4)
      m.filas.forEach(function(f){ partes.push(f[0] + ', ' + f[1]); });
    if(m.t === 'eco' && m.cls === 'aviso')
      partes.push(m.txt.charAt(0) + m.txt.slice(1).toLowerCase());
  });
  return partes.join('. ')
    .replace(/\bMXN\b/gi, 'pesos').replace(/\bUSD\b/gi, 'dólares')
    /* «En este mes:. Facturado…» — la puntuación de pantalla no es la del
       habla. Se limpia antes de mandarla al sintetizador. */
    .replace(/[:;]\s*\./g, '.').replace(/\.{2,}/g, '.')
    .replace(/\s+([.,])/g, '$1').replace(/\s+/g, ' ').trim();
}

function jvHabla(txt, alTerminar){
  if(!SINT || !vozOn || !txt){ if(alTerminar) alTerminar(); return; }
  try{ SINT.cancel(); }catch(e){}
  var u = new SpeechSynthesisUtterance(txt);
  var v = vozES();
  if(v) u.voice = v;
  u.lang = v ? v.lang : 'es-MX';
  /* algo más grave y algo más lento: la voz de la película no corre */
  u.rate = 0.98; u.pitch = 0.82;
  JV.estado = 'hablando'; jvPinta();
  u.onend = function(){ JV.estado = 'idle'; jvPinta(); if(alTerminar) alTerminar(); };
  u.onerror = function(){ JV.estado = 'idle'; jvPinta(); if(alTerminar) alTerminar(); };
  try{ SINT.speak(u); }catch(e){ JV.estado = 'idle'; jvPinta(); if(alTerminar) alTerminar(); }
}
/* ==========================================================================
   EL NIVEL DE ENTRADA

   Las barras del núcleo se mueven con el micrófono DE VERDAD, leído con un
   AnalyserNode. Podrían moverse con un temporizador y nadie notaría la
   diferencia a simple vista — pero entonces el instrumento estaría mintiendo,
   y en cuanto te callas y sigue bailando, se nota.
   ========================================================================== */
var AC = null, ana = null, mic = null, datos = null, raf = 0;

function nivelArranca(){
  if(ana || !navigator.mediaDevices || !window.AudioContext) return;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
    mic = st;
    AC = new AudioContext();
    var src = AC.createMediaStreamSource(st);
    ana = AC.createAnalyser();
    ana.fftSize = 64; ana.smoothingTimeConstant = 0.75;
    src.connect(ana);
    datos = new Uint8Array(ana.frequencyBinCount);
    pintaNivel();
  }).catch(function(){ /* sin permiso: las barras se quedan quietas */ });
}
function nivelPara(){
  if(raf) cancelAnimationFrame(raf), raf = 0;
  if(mic){ mic.getTracks().forEach(function(t){ t.stop(); }); mic = null; }
  if(AC){ try{ AC.close(); }catch(e){} AC = null; }
  ana = null;
}
function pintaNivel(){
  if(!ana) return;
  raf = requestAnimationFrame(pintaNivel);
  ana.getByteFrequencyData(datos);
  var barras = document.querySelectorAll('.jv-nuc .lvl line');
  if(!barras.length) return;
  var med = 0;
  for(var i = 0; i < barras.length; i++){
    var v = (datos[i % datos.length] || 0) / 255;
    med += v;
    var largo = 4 + v * 22;
    var a = 2 * Math.PI * i / barras.length;
    barras[i].setAttribute('x2', (66 + Math.cos(a) * (30 + largo)).toFixed(2));
    barras[i].setAttribute('y2', (66 + Math.sin(a) * (30 + largo)).toFixed(2));
  }
  var core = document.querySelector('.jv-nuc .core');
  if(core) core.style.transform = 'scale(' + (1 + (med / barras.length) * 0.55).toFixed(3) + ')';
}

function jvCalla(){ if(SINT){ try{ SINT.cancel(); }catch(e){} } JV.estado = 'idle'; }

/* ---- escuchar -----------------------------------------------------------
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
    JV.conversa = true;          /* habló por voz: sigue la conversación */
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

/* ==========================================================================
   LA PALABRA DE ACTIVACIÓN

   Aquí hay que ser exacto, porque es fácil prometer de más.

   LO QUE SÍ: con la página abierta y el permiso de micrófono dado, el
   reconocimiento continuo escucha y espera a oír «Jarvis». Al oírlo, se activa.
   Si en la misma frase viene la orden —«Jarvis, quién me debe»— la ejecuta
   directamente. Si sólo viene el nombre, contesta y se queda escuchando.

   LO QUE NO: escuchar con la pestaña cerrada, con el navegador cerrado, o con
   el teléfono bloqueado. Eso lo hace Siri porque es del sistema operativo; una
   página web no tiene ese permiso y no debería tenerlo.

   Y va con dos frenos, porque un micrófono siempre abierto es una decisión
   seria y no un detalle:

     · se enciende A MANO. Nunca por defecto.
     · mientras está en guardia SE VE, con el estado y el botón en ámbar.

   Chrome corta el reconocimiento continuo cada pocos minutos por su cuenta.
   Por eso se rearranca en `onend`, y por eso hay una bandera que distingue
   «se paró solo» de «lo paró el usuario»: sin ella, apagar la guardia no
   apagaba nada.
   ========================================================================== */
var guardia = false, gReco = null, gRearranca = true;

function guardiaEnciende(){
  if(!RECO || guardia) return;
  guardia = true; gRearranca = true;
  try{ localStorage.setItem('jv-guardia', '1'); }catch(e){}
  nivelArranca();
  guardiaCiclo();
  if(!JV.abierto){ JV.estado = 'guardia'; }
  jvPinta();
}
function guardiaApaga(){
  guardia = false; gRearranca = false;
  if(gReco){ try{ gReco.stop(); }catch(e){} gReco = null; }
  nivelPara();
  try{ localStorage.setItem('jv-guardia', '0'); }catch(e){}
  if(JV.estado === 'guardia') JV.estado = 'idle';
  jvPinta();
}
function guardiaCiclo(){
  if(!guardia || !RECO) return;
  try{ gReco = new RECO(); }catch(e){ guardia = false; return; }
  gReco.lang = 'es-MX';
  gReco.continuous = true;
  gReco.interimResults = false;
  gReco.onresult = function(ev){
    for(var i = ev.resultIndex; i < ev.results.length; i++){
      if(!ev.results[i].isFinal) continue;
      var t = String(ev.results[i][0].transcript || '');
      var n = sinT(t);
      var m = n.match(/\b(jarvis|yarvis|charvis|jarbis|harvis)\b/);
      if(!m) continue;
      /* lo que venga DESPUÉS del nombre es la orden */
      var resto = t.slice(n.indexOf(m[0]) + m[0].length)
                   .replace(/^[\s,.:;¿¡]+/, '').trim();
      JV.conversa = true;
      if(!JV.abierto) jvAbre();
      if(resto.length > 2) jvManda(resto);
      else jvHabla('¿Sí?', function(){
        var b = document.getElementById('jvMic');
        if(b) jvEscucha(b);
      });
      return;
    }
  };
  gReco.onerror = function(ev){
    /* «not-allowed» es que el usuario dijo que no: no se insiste */
    if(ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')){
      gRearranca = false; guardia = false;
      JV.msgs.push({t:'eco', txt:'MICRÓFONO DENEGADO · GUARDIA APAGADA', cls:'aviso'});
      jvPinta();
    }
  };
  gReco.onend = function(){
    gReco = null;
    if(guardia && gRearranca) setTimeout(guardiaCiclo, 350);
  };
  try{ gReco.start(); }catch(e){}
}

function jvCablea(){
  /* Cerrar corta la voz Y el micrófono. Un micrófono que sigue abierto con el
     panel cerrado es una batería vacía y un susto. */
  /* Cerrar corta la voz y el micrófono de dictado, pero NO la guardia: la
     gracia de la guardia es justamente seguir esperando con el panel cerrado. */
  var cierra = function(){
    JV.abierto = false; JV.conversa = false;
    jvCalla();
    if(reco){ try{ reco.stop(); }catch(e){} reco = null; }
    JV.estado = guardia ? 'guardia' : 'idle';
    jvPinta();
  };
  var x = document.getElementById('jvX');
  if(x) x.onclick = cierra;
  var sc = document.getElementById('jvScrim');
  if(sc) sc.onclick = cierra;
  var f = document.getElementById('jvF');
  if(f) f.onsubmit = function(ev){
    ev.preventDefault();
    var i = document.getElementById('jvQ');
    if(i){ var t = i.value; i.value = ''; jvManda(t); }
  };
  var gu = document.getElementById('jvGua');
  if(gu){
    if(!RECO) gu.style.display = 'none';
    else gu.onclick = function(){
      if(guardia){ guardiaApaga(); jvHabla('Guardia apagada.'); }
      else{
        vozOn = true;
        try{ localStorage.setItem('jv-voz','1'); }catch(e){}
        guardiaEnciende();
        jvHabla('En guardia. Di Jarvis cuando me necesites.');
      }
    };
  }
  var vz = document.getElementById('jvVoz');
  if(vz){
    if(!SINT) vz.style.display = 'none';
    else vz.onclick = function(){
      vozOn = !vozOn;
      try{ localStorage.setItem('jv-voz', vozOn ? '1' : '0'); }catch(e){}
      if(!vozOn){ jvCalla(); JV.conversa = false; }
      jvPinta();
      if(vozOn) jvHabla('Voz activada.');
    };
  }
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
  if(ev.key === 'Escape' && JV.abierto){
    JV.abierto = false; JV.conversa = false; jvCalla();
    if(reco){ try{ reco.stop(); }catch(e){} reco = null; }
    jvPinta();
  }
  /* Ctrl/Cmd + J: la forma más rápida de llamarlo sin soltar el teclado */
  if((ev.ctrlKey || ev.metaKey) && (ev.key === 'j' || ev.key === 'J')){
    ev.preventDefault(); JV.abierto ? (JV.abierto = false, jvPinta()) : jvAbre();
  }
});

/* ==========================================================================
   LA PUERTA DE ATRÁS: ?jv=

   Ésta es la pieza que hace posible el «Oye Siri, Jarvis».

   Un atajo de iOS puede dictar una frase y abrir una URL con ella dentro. Si
   la página entiende `?jv=cuanto+facture+este+mes`, abre Jarvis, le hace la
   pregunta y —con la voz encendida— la contesta en alto. Desde fuera se ve
   como hablar con Siri; por dentro no hay nada más que un parámetro.

   Lo que NO se puede, y conviene saberlo antes de intentarlo: una página web
   no tiene palabra de activación. No hay «Oye Jarvis» escuchando de fondo.
   Quien escucha es Siri, y Jarvis recibe lo que Siri le pasa.

   `autoplay` obliga a hablar sin que el usuario haya tocado nada, que es justo
   lo que los navegadores bloquean. Se pide de todas formas: en un atajo de iOS
   el gesto de lanzarlo cuenta como interacción y sí suena. Si el navegador lo
   bloquea, la respuesta sigue estando escrita en pantalla.

   El parámetro se borra de la barra en cuanto se lee, para que recargar no
   vuelva a preguntar lo mismo. */
(function arranca(){
  var f = document.getElementById('jvFab');
  if(f) f.onclick = jvAbre;

  var url;
  try{ url = new URLSearchParams(location.search); }catch(e){ return; }
  var q = url.get('jv');
  if(q == null) return;

  if(url.get('voz') === '1' || url.get('hablar') === '1'){
    vozOn = true;
    try{ localStorage.setItem('jv-voz', '1'); }catch(e){}
  }
  try{ history.replaceState(null, '', location.pathname); }catch(e){}

  setTimeout(function(){
    jvAbre();
    q = String(q).trim();
    if(q) jvManda(q);
    else if(vozOn){
      /* «Oye Siri, Jarvis» sin nada más: abre y se pone a escuchar. */
      JV.conversa = true;
      jvHabla('Aquí estoy.', function(){
        var m = document.getElementById('jvMic');
        if(m && RECO) jvEscucha(m);
      });
    }
  }, 420);
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

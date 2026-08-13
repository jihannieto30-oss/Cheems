/* ============================================================================
   EE. UU. — EL CHECKOUT PIDE, NO COBRA

   Lo que había: un formulario que pedía número de tarjeta, caducidad y CVC,
   con un candado al lado y «256-bit SSL · Pago seguro · Garantía de
   reembolso» debajo. Y `PX_PAY` vacío entero —ni Zelle, ni PayPal, ni
   Stripe—, así que no había procesador detrás de nada. Los datos de la
   tarjeta se recogían y se tiraban: el pedido que se enviaba no los llevaba.

   Eso son dos problemas, y el segundo es peor que el primero. Recoger un CVC
   sin procesador es un riesgo que no hace falta correr. Pero decirle a alguien
   «pago seguro, transacción cifrada» mientras no se le cobra nada es
   prometerle algo que no está pasando, y eso se nota cuando el cargo nunca
   aparece en su banco.

   Lo que hay ahora, que es lo que se pidió: el cliente deja sus datos, y
   PEPTIDEX le manda las instrucciones para pagar por transferencia o PayPal.
   No se pide una tarjeta en ningún momento. La página no cobra y no dice que
   cobre.

   POR QUÉ EN EJECUCIÓN

   El checkout vive en `PEPTIDEX.base.html`, que no existe: `build_restore.py`
   no puede correr sin él. Se envuelven las funciones del sitio, que están en
   el mismo ámbito de módulo que esto. Cuando aparezca el fichero base, esto se
   integra y el fichero se borra.
   ============================================================================ */
(function(){
'use strict';

if(typeof checkoutBodyHTML !== 'function') return;

function T(en, es){ return (typeof t === 'function') ? t(en, es) : en; }

/* --------------------------------------------------------------------------
   1 · El formulario: fuera la tarjeta, y los métodos dicen lo que son
   -------------------------------------------------------------------------- */
var _body = checkoutBodyHTML;
checkoutBodyHTML = function(){
  var h = _body();

  /* La tarjeta entera: la opción, su caja y el logotipo de las marcas. */
  h = h.replace(
    /<label class="co-m"><input type="radio" name="pay" value="Card"[\s\S]*?<div class="co-mbox" id="co-mbox-card"><\/div>/,
    '');

  /* Transferencia primero y marcada por defecto: es la que deja más margen y
     la que Jihan ya opera. PayPal después, para quien prefiera no dar sus
     datos bancarios. */
  h = h.replace('<div class="co-methods" id="co-methods">',
    '<div class="co-methods" id="co-methods">' +
    '<label class="co-m"><input type="radio" name="pay" value="Wire" checked>' +
      '<span class="co-m-t">' + T('Bank transfer (wire)', 'Transferencia bancaria (wire)') + '</span>' +
      '<span class="co-m-s">' + T('We email you the account details and the exact amount.',
                                  'Te enviamos los datos de la cuenta y el monto exacto por correo.') + '</span></label>' +
    '<div class="co-mbox" id="co-mbox-wire"></div>');

  /* Zelle se queda: ya estaba, es una transferencia igual, y lleva su 5 %.
     El texto de PayPal decía «Rápido y seguro», que no dice nada de lo que va a
     pasar. Se busca el ampersand SIN escapar: la cadena la construye el propio
     sitio con `t()`, así que llega como `&` y no como `&amp;`. Con `&amp;` la
     sustitución no casaba y el texto viejo se quedaba puesto. */
  h = h.replace(/<span class="co-m-s">(Fast &(?:amp;)? secure|Rápido y seguro)<\/span>/,
                '<span class="co-m-s">' + T('We email you a payment link.',
                                            'Te enviamos un enlace de pago por correo.') + '</span>');

  /* La línea de debajo de «Pago» decía que la transacción va cifrada. Aquí no
     hay transacción: hay una solicitud. */
  h = h.replace(
    /<div class="co-sub2">[\s\S]*?<\/div>/,
    '<div class="co-sub2">' +
      T('No payment is taken on this page and no card details are requested. ' +
        'You place the order, we send you the payment instructions.',
        'En esta página no se cobra nada ni se piden datos de tarjeta. ' +
        'Tú haces el pedido y nosotros te enviamos las instrucciones de pago.') +
    '</div>');

  /* El botón deja de decir que se está pagando. */
  h = h.replace(/(<button class="btn mag co-place" id="co-place" type="submit">)[\s\S]*?(<\/button>)/,
    '$1' + T('Place order · get payment instructions',
             'Hacer pedido · recibir instrucciones') + '$2');

  /* Los sellos. «256-bit SSL», «Pago seguro» y «Garantía de reembolso»
     describían un cobro que no ocurre. Se sustituyen por tres cosas que sí son
     ciertas y que además importan más en este negocio. */
  h = h.replace(/<div class="co-badges">[\s\S]*?<\/div>/,
    '<div class="co-badges">' +
      '<span>' + T('No card details on this site', 'Sin datos de tarjeta en este sitio') + '</span>' +
      '<span>' + T('Reviewed before it ships', 'Revisado antes de enviarse') + '</span>' +
      '<span>' + T('Cold chain on every shipment', 'Cadena de frío en cada envío') + '</span>' +
    '</div>');

  return h;
};

/* --------------------------------------------------------------------------
   2 · Las cajas de cada método
   -------------------------------------------------------------------------- */
function caja(titulo, cuerpo){
  return '<div class="co-zelle"><div class="cz-h">' + titulo + '</div>' +
         '<div class="cz-foot">' + cuerpo + '</div></div>';
}

function cajaWire(no){
  return caja(
    T('Wire details are emailed to you', 'Los datos para la transferencia van por correo'),
    T('Place the order and we send the beneficiary, the account and the exact ' +
      'amount to your email. Your order number ' + (no || '') + ' goes in the ' +
      'transfer reference so we can match the payment to it.',
      'Haz el pedido y te enviamos el beneficiario, la cuenta y el monto exacto ' +
      'a tu correo. Tu número de pedido ' + (no || '') + ' va en la referencia ' +
      'de la transferencia, para poder identificar el pago.'));
}

function cajaPayPal(){
  var me = (typeof PX_PAY !== 'undefined' && PX_PAY.paypal && PX_PAY.paypal.me) || '';
  if(me) return caja(T('A PayPal link is emailed to you', 'Te enviamos un enlace de PayPal'),
    T('Place the order and the payment link opens right after, and also arrives by email.',
      'Haz el pedido y el enlace de pago se abre a continuación, y además te llega por correo.'));
  return caja(T('A PayPal link is emailed to you', 'Te enviamos un enlace de PayPal'),
    T('Place the order and we send the payment link to your email within minutes.',
      'Haz el pedido y te enviamos el enlace de pago a tu correo en minutos.'));
}

/* El sitio repinta las cajas cada vez que cambia el método; se engancha el
   mismo evento en vez de duplicar su lógica. */
var _wire = (typeof wireCheckout === 'function') ? wireCheckout : null;
if(_wire){
  wireCheckout = function(){
    _wire();
    var co = document.getElementById('co-form');
    if(!co) return;

    /* Escribe el contenido si hace falta y abre o cierra con la clase. */
    function abre(caja, si, hazContenido){
      if(!caja) return;
      if(si && !caja.firstElementChild) caja.innerHTML = hazContenido();
      caja.classList.toggle('px-abierta', !!si);
    }

    function pinta(){
      var sel = co.querySelector('input[name=pay]:checked');
      var v = sel ? sel.value : 'Wire';
      var w = document.getElementById('co-mbox-wire');
      var pp = document.getElementById('co-mbox-paypal');
      /* El contenido se escribe SIEMPRE y lo que cambia es la clase que la
         abre. Vaciar la caja al cerrarla mataba la animación de salida: se
         quedaba sin nada que encoger y desaparecía de golpe. */
      abre(w,  v === 'Wire',   function(){ return cajaWire(window.__coNo); });
      abre(pp, v === 'PayPal', cajaPayPal);
      /* Que el estado del sitio conozca el método nuevo: lo usa el resumen y
         viaja en el pedido. */
      try{ if(typeof coState === 'function') coState().method = v; }catch(e){}
      try{ if(typeof coRenderSummary === 'function') coRenderSummary(); }catch(e){}
    }
    co.addEventListener('change', function(e){
      if(e.target && e.target.name === 'pay') pinta();
    });
    pinta();
  };
}

/* --------------------------------------------------------------------------
   3 · La pantalla final: se recibió una solicitud, no un pago
   -------------------------------------------------------------------------- */
var _place = (typeof placeOrder === 'function') ? placeOrder : null;
if(_place){
  placeOrder = function(f, orderNo){
    var correo = '';
    try{ correo = (f.email.value || '').trim(); }catch(e){}
    var metodo = 'Wire';
    try{ metodo = coState().method || 'Wire'; }catch(e){}

    var r = _place(f, orderNo);

    /* El sitio ya pintó su pantalla; se corrige el texto, que es lo único que
       cambia. Reescribirla entera obligaría a duplicar el número de pedido, el
       enlace a Track y la animación. */
    requestAnimationFrame(function(){
      var d = document.querySelector('.co-done');
      if(!d) return;
      var h2 = d.querySelector('h2');
      if(h2) h2.textContent = T('Order received', 'Pedido recibido');

      var p = d.querySelector('p');
      if(p){
        var comoPaga = metodo === 'PayPal'
          ? T('a PayPal payment link', 'un enlace de pago de PayPal')
          : metodo === 'Zelle'
            ? T('the Zelle details', 'los datos de Zelle')
            : T('the wire details and the exact amount', 'los datos de la transferencia y el monto exacto');
        p.innerHTML = T('Nothing has been charged yet. We are sending ', 'Todavía no se ha cobrado nada. Te enviamos ') +
          comoPaga + T(' to ', ' a ') + '<b>' + (correo || '') + '</b>' +
          T('. Your order is held until the payment arrives.',
            '. Tu pedido queda apartado hasta que llegue el pago.');
      }
      d.classList.add('px-solicitud');
    });
    return r;
  };
}

window.__pxPago = {caja: cajaWire, activo: true};

})();

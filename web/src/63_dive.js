/* ============================================================================
   PEPTIDEX — THE DIVE

   The base timeline still runs the shutter, the mark and the caption. This adds
   the water it happens inside, and makes the page itself sink and surface.

   The water layers live inside #dive, which the timeline sets to display:block
   and back to none. A CSS animation cannot run on a node that is not displayed,
   so they restart on their own every time the dive opens — no timing to keep in
   sync with, and nothing running at rest.

   Only the page's own descent needs a signal, because #app is outside #dive.
   ============================================================================ */
(function(){
'use strict';

const SPAN = 2600;   /* the base timeline's own length, in ms */

function water(){
  const dive = document.getElementById('dive');
  if(!dive || dive.querySelector('.px-deep')) return;

  const deep = document.createElement('div');
  deep.className = 'px-deep';

  const caustic = document.createElement('div');
  caustic.className = 'px-caustic';
  caustic.innerHTML = '<i></i><i></i><i></i>';

  const surface = document.createElement('div');
  surface.className = 'px-surface';

  /* behind the centre, in front of the shutter */
  dive.insertBefore(surface, dive.firstChild);
  dive.insertBefore(caustic, dive.firstChild);
  dive.insertBefore(deep, dive.firstChild);
}

let clear = null;

const _dive = diveTransition;
diveTransition = function(route){
  water();
  const html = document.documentElement;

  /* a second dive before the first has finished restarts the descent rather
     than layering a second one on top of it */
  html.classList.remove('px-diving');
  void html.offsetWidth;
  html.classList.add('px-diving');

  clearTimeout(clear);
  clear = setTimeout(() => html.classList.remove('px-diving'), SPAN + 60);

  return _dive(route);
};

water();

})();

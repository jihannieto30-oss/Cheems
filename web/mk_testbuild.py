#!/usr/bin/env python3
"""Offline test build: swap the CDN libraries for local stubs so the page boots
in a sandbox without network. Never shipped — testing only."""
import re, os
HERE=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(HERE,'PEPTIDEX.html'),encoding='utf-8').read()

STUB = r"""<script>
/* offline test stubs — not part of the shipped file */
(function(){
  const mk=()=>new Proxy(function(){},{
    get(t,k){ if(k===Symbol.toPrimitive)return ()=>0; if(k===Symbol.iterator)return undefined;
      if(k==='then')return undefined; if(!(k in t))t[k]=mk(); return t[k]; },
    set(t,k,v){t[k]=v;return true;},
    apply(){return mk();}, construct(){return mk();}
  });
  window.__THREE_STUB=mk(); window.__ROOMENV=mk();

  const applyVars=(tg,v)=>{
    const els = typeof tg==='string' ? [...document.querySelectorAll(tg)]
      : (tg&&tg.nodeType?[tg]:(Array.isArray(tg)?tg:(tg&&tg.length?[...tg]:[])));
    els.forEach(el=>{ if(!el||!el.style)return;
      ['display','opacity','pointerEvents','width','height','filter','letterSpacing'].forEach(k=>{
        if(v[k]!=null)el.style[k]=(k==='opacity'?v[k]:v[k]);
      });
    });
    if(v.onUpdate){try{v.onUpdate()}catch(e){}}
    if(v.onComplete)setTimeout(()=>{try{v.onComplete()}catch(e){}},0);
  };
  const TL=()=>{const o={
    to(t,v){applyVars(t,v||{});return o;}, from(t,v){return o;},
    fromTo(t,a,b){applyVars(t,b||{});return o;}, set(t,v){applyVars(t,v||{});return o;},
    add(f){ if(typeof f==='function')setTimeout(()=>{try{f()}catch(e){console.error(e)}},0); return o;},
    call(f){return o.add(f);}, kill(){return o;}
  };return o;};
  window.gsap={ set:applyVars, to:applyVars, fromTo:(t,a,b)=>applyVars(t,b||{}),
    from:(t,v)=>{ if(v&&v.onComplete)setTimeout(v.onComplete,0); },
    timeline(o){ if(o&&o.onComplete)setTimeout(o.onComplete,0); return TL(); },
    ticker:{lagSmoothing(){}}, registerPlugin(){}, killTweensOf(){} };
  window.Lenis=function(){ this.raf=()=>{}; this.on=(e,f)=>{ if(e==='scroll')addEventListener('scroll',()=>f({scroll:scrollY,velocity:0}),{passive:true}); };
    this.stop=()=>{}; this.start=()=>{}; this.scrollTo=(y,o)=>{ try{window.scrollTo(0,typeof y==='number'?y:0)}catch(e){} }; };
})();
</script>"""

s=s.replace('<script src="https://unpkg.com/gsap@3.12.7/dist/gsap.min.js"></script>',STUB,1)
s=s.replace('<script src="https://unpkg.com/lenis@1.3.25/dist/lenis.min.js"></script>','',1)
s=re.sub(r'<script type="importmap">.*?</script>','',s,count=1,flags=re.S)
s=s.replace("import * as THREE from 'three';","const THREE=window.__THREE_STUB;",1)
s=s.replace("import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';",
            "const RoomEnvironment=window.__ROOMENV;",1)
open(os.path.join(HERE,'_test.html'),'w',encoding='utf-8').write(s)
print('_test.html',round(len(s.encode())/1024,1),'KB')

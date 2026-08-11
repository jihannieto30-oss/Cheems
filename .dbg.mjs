import { chromium } from 'playwright-core'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']})
const ctx=await b.newContext({viewport:{width:1440,height:900}}); const p=await ctx.newPage()
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>errs.push(m.type()+': '+m.text()))
await p.goto('http://localhost:4184/ows/',{waitUntil:'commit'})
await p.waitForTimeout(5000)
console.log(await p.evaluate(()=>({ weld: document.querySelectorAll('.weld').length,
  chapters: document.querySelectorAll('.ch').length, bodyLen: document.body.innerText.length,
  docH: document.documentElement.scrollHeight })))
await b.close()
console.log(errs.slice(0,10).join('\n')||'(no console output)')

/* Bake the three line vials from the site's own renderer.

   They have to exist before the page can paint, but they must not be drawn by
   a second implementation — a Python copy of the renderer would drift from the
   JavaScript one the moment either is touched. So the real renderer is run in a
   browser, headless, and its output is written out. One renderer, two moments. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const b   = await chromium.launch();
const p   = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('file://' + process.cwd() + '/_labtest.html');
await p.waitForFunction(() => window.__pxLabel && window.__pxLabel.buildVial, null, { timeout: 30000 });
await p.evaluate(() => window.__pxLabel.kitReady);

for (const line of ['fitness', 'beauty', 'longevity']) {
  const uri = await p.evaluate(k => window.__pxLabel.buildVial(k, null), line);
  const png = Buffer.from(uri.split(',')[1], 'base64');
  writeFileSync(`ls_master/line_${line}.png`, png);
  console.log(`  line_${line}.png  ${(png.length / 1024).toFixed(1)} KB`);
}

if (errs.length) console.log(errs.join('\n'));
await b.close();

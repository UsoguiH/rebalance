// Render chosen moments of the page to PNGs: node stills.js URL OUTDIR t1 t2 ...
const { chromium } = require('playwright');
(async () => {
  const [url, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url); await p.waitForFunction(() => window.READY, null, { timeout: 30000 });
  for (const t of ts) { await p.evaluate(t => render(+t), t); await (await p.$('#c')).screenshot({ path: `${out}/s_${t}.png` }); }
  await b.close();
})();

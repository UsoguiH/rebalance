// Contact sheet of one pose: node sheet.js URL OUT.png t1 t2 ...
const { chromium } = require('playwright');
(async () => {
  const [url, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url); await p.waitForFunction(() => window.READY, null, { timeout: 30000 });
  const shots = [];
  for (const t of ts) { await p.evaluate(t => render(+t), t); shots.push((await (await p.$('#c')).screenshot()).toString('base64')); }
  await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;width:${ts.length > 6 ? 1620 : 270 * ts.length}px">${shots.map((s, i) => `<div style="position:relative"><img src="data:image/png;base64,${s}" width=270><span style="position:absolute;top:4px;left:6px;color:red;font:14px sans-serif">${ts[i]}</span></div>`).join('')}</body>`);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();

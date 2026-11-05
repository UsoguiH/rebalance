// Full-resolution crops of moments: node zoom.js URL OUT.png x y w h t1 t2 ...
const { chromium } = require('playwright');
(async () => {
  const [url, out, x, y, w, h, ...ts] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto(url); await p.waitForFunction(() => window.READY);
  const shots = [];
  for (const t of ts) { await p.evaluate(t => render(+t), t); shots.push((await p.screenshot({ clip: { x: +x, y: +y, width: +w, height: +h } })).toString('base64')); }
  await p.setContent(`<body style="margin:0;display:flex">${shots.map(s => `<img src="data:image/png;base64,${s}" width=${Math.round(w * 0.75)}>`).join('')}</body>`);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();

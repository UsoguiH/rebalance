// Render the animation frame-by-frame with headless Chromium.
//
//   node motion/tools/capture.js --out frames/ [--fps 30] [--from 0] [--to 17.75] [--times 1.2,3.4]
//   ffmpeg -framerate 30 -i frames/%04d.png -pix_fmt yuv420p show-it.mp4
//
// Needs the `playwright` package (set PLAYWRIGHT_MODULE to its path if it is
// installed globally) and network access for the Outfit web font.
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const fps = +(args.fps || 30);
const out = path.resolve(args.out || 'frames');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?capture';
  await page.goto(url);
  await page.evaluate(() => window.motionReady);
  const times = args.times
    ? String(args.times).split(',').map(Number)
    : (() => {
      const from = +(args.from || 0), to = +(args.to || 17.75), list = [];
      for (let t = from; t < to - 1e-6; t += 1 / fps) list.push(+t.toFixed(5));
      return list;
    })();
  let i = 0;
  for (const t of times) {
    const data = await page.evaluate(tt => { window.renderAt(tt); return document.getElementById('stage').toDataURL('image/png'); }, t);
    i++;
    const name = args.times ? `t_${t.toFixed(3)}.png` : `${String(i).padStart(4, '0')}.png`;
    fs.writeFileSync(path.join(out, name), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`wrote ${i} frame(s) to ${out}`);
  await browser.close();
})();

// Dev helper: capture stills at given times into one contact sheet.
//   node tools/shots.mjs out.jpg final 0 0.5 1 ...   (or a range a:b:step)
import { chromium } from './pw.mjs';
import { serve } from './serve.mjs';
import fs from 'node:fs';
const [out, mode, ...ts] = process.argv.slice(2);
let times = [];
for (const s of ts) { if (s.includes(':')) { const [a, b, st] = s.split(':').map(Number); for (let v = a; v <= b + 1e-9; v += st) times.push(+v.toFixed(3)); } else times.push(Number(s)); }
const { server, port } = await serve();
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${port}/index.html?paused=1&s3=${process.env.S3 || 0.6}`);
await page.waitForFunction('window.promoReady', null, { timeout: 60000 });
const cols = Number(process.env.COLS) || Math.min(times.length, 4), tw = Number(process.env.TW) || 480, th = Math.round(tw * 9 / 16);
const t0 = Date.now();
const data = await page.evaluate(async ({ times, mode, cols, tw, th }) => {
  const sheet = document.createElement('canvas'); sheet.width = cols * tw; sheet.height = Math.ceil(times.length / cols) * th;
  const g = sheet.getContext('2d');
  times.forEach((t, i) => {
    const c = window.promo.renderAt(t, mode);
    const x = (i % cols) * tw, y = Math.floor(i / cols) * th;
    g.drawImage(c, x, y, tw, th);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x + 4, y + 4, 62, 20); g.fillStyle = '#ff0'; g.font = '14px monospace'; g.fillText(t.toFixed(2), x + 8, y + 19);
  });
  return sheet.toDataURL('image/jpeg', 0.9);
}, { times, mode, cols, tw, th });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(`${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
await browser.close(); server.close();

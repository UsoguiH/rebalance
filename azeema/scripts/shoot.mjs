// Dev helper: node scripts/shoot.mjs <url> <out.png> [width] [height] [full] [clickSelector]
import { chromium } from 'playwright';
const [url, out, w = 1280, h = 860, full = '1', click] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +w < 600 ? 2 : 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
if (click) { await p.click(click); await p.waitForTimeout(1500); }
await p.waitForTimeout(1800);
await p.screenshot({ path: out, fullPage: full === '1' });
if (errs.length) console.log('ERRORS:', errs);
await b.close();

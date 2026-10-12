// Screenshot pages at phone size. Usage: node scripts/shoot.mjs out-dir page1 [page2 …]
// Needs the static server (python3 -m http.server 4610 in molu/).
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../azeema/package.json', import.meta.url));
const { chromium } = require('playwright');
const [out, ...pages] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar-SA', reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce' });
const errs = [];
for (const p of pages) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${p}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${p}: ${m.text()}`));
  await page.goto(`http://localhost:4610/${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const name = p.replace(/[^a-z0-9]+/gi, '_');
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: process.env.FULL === '1' });
  await page.close();
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();

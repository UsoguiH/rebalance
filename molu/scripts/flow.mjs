// End-to-end booking flow with real motion, recorded. Usage: node scripts/flow.mjs <outdir>
// Needs the static server: python3 -m http.server 4610 (in molu/).
import { createRequire } from 'node:module';
import { renameSync } from 'node:fs';
const require = createRequire(new URL('../../azeema/package.json', import.meta.url));
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const B = 'http://localhost:4610/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, locale: 'ar-SA', recordVideo: { dir: out, size: { width: 390, height: 844 } } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
const step = async (label, fn) => { try { await fn(); console.log('✓', label); } catch (e) { errs.push(`${label}: ${e.message.split('\n')[0]}`); console.log('✗', label); } };

await step('gate: logo + whole picture + both doors visible', async () => { await p.goto(B + 'index.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(2200); await shot('01-gate'); const ok = await p.evaluate(() => { const inView = (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; }; return !!document.querySelector('.molu-logo') && inView(document.querySelector('#pic')) && [...document.querySelectorAll('.door2')].length === 2 && [...document.querySelectorAll('.door2')].every(inView); }); if (!ok) throw new Error('logo, picture or doors not fully visible'); });
await step('enter حواء', async () => { await p.click('.door2.eve'); await p.waitForURL(/explore/); await p.waitForTimeout(1200); await shot('03-explore'); });
await step('shortcut filter', async () => { await p.click('[data-sc="nails"]'); await p.waitForTimeout(900); await shot('04-filtered'); if (!(await p.locator('#reset').count())) throw new Error('no filter chip'); await p.click('#reset'); await p.waitForTimeout(600); });
await step('search', async () => { await p.fill('#q', 'استشوار'); await p.waitForTimeout(700); await shot('05-search'); await p.click('#clear'); await p.waitForTimeout(400); });
await step('map morph', async () => { await p.click('#map-fab'); await p.waitForTimeout(1100); await shot('06-map'); await p.locator('.map-full .pin').nth(2).click(); await p.waitForTimeout(700); await p.click('.map-full .round'); await p.waitForTimeout(800); });
await step('open salon', async () => { await p.locator('.sc-card .img').first().click(); await p.waitForURL(/salon/); await p.waitForTimeout(1200); await shot('07-salon'); });
await step('pick 2 services', async () => { await p.locator('.pop-card').first().click(); await p.waitForTimeout(500); await p.locator('.menu-sec .svc').nth(2).click(); await p.waitForTimeout(700); await shot('08-picked'); if (await p.locator('#cta.hide').count()) throw new Error('cta hidden'); });
await step('tabs scroll-spy', async () => { await p.locator('#tabs [data-tab]').nth(2).click(); await p.waitForTimeout(1000); await shot('09-tabs'); });
await step('booking sheet', async () => { await p.click('#cta-btn'); await p.waitForTimeout(900); await shot('10-sheet'); });
await step('choose time + confirm', async () => {
  await p.locator('#days .day').nth(1).click(); await p.waitForTimeout(500);
  await p.locator('#slots .slot:not([disabled])').nth(3).click(); await p.waitForTimeout(500); await shot('11-time');
  await p.click('#confirm'); await p.waitForTimeout(1900); await shot('12-done');
  if (!(await p.locator('.done').count())) throw new Error('no success state');
});
await step('appointments', async () => { await p.click('.done a[href="appointments.html"]'); await p.waitForURL(/appointments/); await p.waitForTimeout(1000); await shot('13-appts'); if ((await p.locator('.order').count()) < 1) throw new Error('no orders'); });
await step('manage sheet', async () => { await p.locator('[data-manage]').first().click(); await p.waitForTimeout(800); await shot('14-manage'); await p.mouse.click(195, 80); await p.waitForTimeout(700); });
await step('categories rail', async () => { await p.click('.nav-item[href="categories.html"]'); await p.waitForURL(/categories/); await p.waitForTimeout(900); await p.locator('#rail [data-rail]').nth(1).click(); await p.waitForTimeout(900); await shot('15-categories'); });
await step('account sign-in', async () => {
  await p.goto(B + 'account.html'); await p.waitForTimeout(700); await p.fill('#phone', '551234567'); await p.click('#next'); await p.waitForTimeout(1200);
  for (const d of '1234') await p.keyboard.type(d); await p.waitForTimeout(1100); await p.fill('#name', 'نورة'); await p.click('#finish'); await p.waitForTimeout(900); await shot('16-account');
});
const v = p.video();
await ctx.close(); await b.close();
renameSync(await v.path(), `${out}/flow.webm`);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');

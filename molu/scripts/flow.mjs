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

await step('start: home opens with the two sides big at the top (حواء left, آدم right — the whole picture, uncropped), the switch at the top left', async () => { await p.goto(B + 'index.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); await shot('01-start'); const ok = await p.evaluate(() => { const inView = (el) => { const b = el.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 1 && b.left >= -1 && b.right <= innerWidth + 1; }; const [e, a] = ['eve', 'adam'].map((k) => document.querySelector('.ch-go.' + k + ' img')); const re = e.getBoundingClientRect(), ra = a.getBoundingClientRect(); const whole = (img, r) => Math.abs(r.width / r.height - img.naturalWidth / img.naturalHeight) < 0.02; const sec = document.querySelector('#sec').getBoundingClientRect(); return !!document.querySelector('.brand-mark .brand-svg') && re.right <= ra.left && re.width > innerWidth * 0.4 && whole(e, re) && whole(a, ra) && [...document.querySelectorAll('.ch-go, .ch-go .ch-btn')].every(inView) && sec.left < innerWidth / 2 && document.documentElement.scrollWidth <= innerWidth; }); if (!ok) throw new Error('sides out of order, cropped, too small or hidden'); });
await step('choose حواء: the picture moves to the switch, home is for حواء, and stays chosen on return', async () => { await p.click('.ch-go.eve'); await p.waitForFunction(() => !document.querySelector('#chooser'), null, { timeout: 3000 }); await p.waitForTimeout(1000); await shot('03-explore'); const st = await p.evaluate(() => [document.body.dataset.section, document.querySelector('#sec [aria-pressed="true"]')?.dataset.k, !!document.querySelector('#feed .sec')].join()); if (st !== 'eve,eve,true') throw new Error('after choosing: ' + st); await p.goto(B + 'index.html', { waitUntil: 'networkidle' }); if (await p.locator('#chooser').count()) throw new Error('chooser shown again in the same visit'); });
await step('shortcut filter', async () => { await p.click('[data-sc="nails"]'); await p.waitForTimeout(900); await shot('04-filtered'); if (!(await p.locator('#reset').count())) throw new Error('no filter chip'); await p.click('#reset'); await p.waitForTimeout(600); });
await step('search', async () => { await p.fill('#q', 'استشوار'); await p.waitForTimeout(700); await shot('05-search'); await p.click('#clear'); await p.waitForTimeout(400); });
await step('switch حواء ↔ آدم (fast swap)', async () => {
  await p.click('#sec [data-k="adam"]'); await p.waitForTimeout(450); await shot('05b-switch-adam');
  if (!(await p.locator('[data-sc="beard"]').count())) throw new Error('آدم categories not shown');
  await p.click('#sec [data-k="eve"]'); await p.waitForTimeout(450);
  if (!(await p.locator('[data-sc="nails"]').count())) throw new Error('حواء categories not shown');
});
await step('real map: pins + card', async () => { await p.click('#map-fab'); await p.waitForSelector('.map-full .real-map .sal-pin .sp'); await p.waitForTimeout(900); await shot('06-map');
  const pin = p.locator('.map-full .sal-pin .sp').nth(2), name = await pin.innerText(); await pin.click(); await p.waitForTimeout(700);
  if (!(await p.locator('.map-full .map-card b').innerText()).includes(name)) throw new Error('map card did not follow the pin');
  await p.click('.map-full .round'); await p.waitForTimeout(800); });
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
await step('categories rail', async () => { await p.goto(B + 'categories.html'); await p.waitForTimeout(900); await p.locator('#rail [data-rail]').nth(1).click(); await p.waitForTimeout(900); await shot('15-categories'); });
await step('account sign-in', async () => {
  await p.goto(B + 'account.html'); await p.waitForTimeout(700); await p.fill('#phone', '551234567'); await p.click('#next'); await p.waitForTimeout(1200);
  for (const d of '1234') await p.keyboard.type(d); await p.waitForTimeout(1100); await p.fill('#name', 'نورة'); await p.click('#finish'); await p.waitForTimeout(900); await shot('16-account');
});
await step('bottom bar: home · favourites · account + appointments', async () => {
  const hrefs = await p.$$eval('.navbar .nav-item', (l) => l.map((a) => a.getAttribute('href')));
  if (hrefs.join() !== 'explore.html,favorites.html,account.html,appointments.html') throw new Error('nav: ' + hrefs.join());
});
await step('salon sign-up (join): 7 steps → page + map', async () => {
  await p.goto(B + 'join.html'); await p.waitForTimeout(600);
  await p.click('[data-pick="section"][data-v="eve"]'); await p.waitForTimeout(500);
  await p.click('[data-pick="kind"][data-v="home"]'); await p.waitForTimeout(500);
  await p.fill('#name', 'صالون جود'); await p.click('#next'); await p.waitForTimeout(500);
  await p.click('[data-area="حي الملقا"]'); await p.click('[data-area="حي حطين"]'); await p.click('#next'); await p.waitForTimeout(500);
  await p.click('[data-cat="hair"]'); await p.click('#next'); await p.waitForTimeout(500);
  await p.click('[data-pick="hours"][data-v="evening"]'); await p.click('#next'); await p.waitForTimeout(500);
  await p.fill('#owner', 'جود'); await p.fill('#phone', '512345678'); await p.click('#next'); await p.waitForTimeout(1000);
  for (const d of '1234') await p.keyboard.type(d); await p.waitForTimeout(1300); await shot('17-joined');
  if (!(await p.locator('.j-tick').count())) throw new Error('no done screen');
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('horizontal overflow');
  await p.goto(B + 'explore.html?s=eve'); await p.waitForTimeout(700);
  if (!(await p.locator('[data-id="mine"]').count())) throw new Error('new salon not in the feed');
});
await step('owner dashboard: walk-in booking, attendance, prices, QR', async () => {
  await p.goto(B + 'dashboard.html'); await p.waitForTimeout(800); await shot('18-dashboard');
  await p.click('#add'); await p.waitForTimeout(500); await p.fill('#c-name', 'هيا'); await p.locator('#c-day .chip').nth(1).click(); await p.locator('#c-time .chip').first().click(); await p.click('#c-save'); await p.waitForTimeout(600);
  if (!(await p.locator('#panel').innerText()).includes('هيا')) throw new Error('walk-in booking not on the list');
  await p.locator('.d-order').first().click({ position: { x: 200, y: 30 } }); await p.waitForTimeout(500); await p.click('[data-set="done"]'); await p.waitForTimeout(500);
  if (!(await p.locator('.d-order').first().getAttribute('class')).includes('st-done')) throw new Error('attendance not saved');
  await p.locator('.d-tabs [data-tab]').nth(3).click(); await p.waitForTimeout(1200);
  if (!(await p.locator('#qr svg, #qr .ms').count())) throw new Error('no QR');
});
const v = p.video();
await ctx.close(); await b.close();
renameSync(await v.path(), `${out}/flow.webm`);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');

// Captures every app screen (mobile) + a screen recording of the key interactions.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const shot = async (name, wait = 900) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${name}.png` }); };

// create a paid invitation with guests so every screen has real content
let r = await fetch(`${BASE}/api/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  data: { occasion: 'wedding', template: 'sage', name1: 'ناصر', name2: 'تهاني', verse: 'إن السرور إذا تشارك ضوعفت بسماته', inviteText: 'بكل الحب والود نتشرف بدعوتكم لحضور حفل زفاف', date: '2026-12-12', time: '20:00', venue: 'قاعة الفريدة', city: 'الرياض', notes: 'يمنع اصطحاب جوالات الكاميرا\nجنة الأطفال منازلهم' },
  contactPhone: '0500000000', contactName: 'ناصر' }) });
const { slug, key } = await r.json();
await fetch(`${BASE}/api/invitations/${slug}/pay?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"demo":true}' });
for (const g of [['أم خالد', 'yes', 4, 'الله يتمم بخير ويسعدكم'], ['سارة العتيبي', 'yes', 1, 'مبروك مقدماً 🤍'], ['نوف', 'no', 0, 'ألف مبروك، والله يعوضني بشوفتكم'], ['أبو فيصل', 'yes', 3, '']])
  await fetch(`${BASE}/api/i/${slug}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g[0], attending: g[1], companions: g[2], message: g[3] }) });

await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.evaluate(([s, k]) => localStorage.setItem('azeema_orders', JSON.stringify([{ slug: s, key: k }])), [slug, key]);
await p.reload({ waitUntil: 'networkidle' });
await shot('01-home', 1600);
await p.evaluate(() => scrollTo(0, 700)); await shot('02-home-cards', 1400);
await p.evaluate(() => document.querySelector('#designs').scrollIntoView()); await shot('03-home-designs', 1400);
await p.evaluate(() => document.querySelector('.xp.details').scrollIntoView({ block: 'center' })); await p.waitForTimeout(600);
await p.click('.xp.details .xp-head'); await shot('04-home-details', 1400);
await p.evaluate(() => document.querySelector('#pricing').scrollIntoView()); await shot('05-home-pricing', 1300);
await p.goto(BASE + '/designs', { waitUntil: 'networkidle' }); await shot('06-designs', 1300);
await p.click('.g-tile[data-theme=arch]'); await shot('07-design-sheet', 1200);
await p.goto(BASE + '/orders', { waitUntil: 'networkidle' }); await shot('08-orders', 1500);
await p.goto(BASE + '/create?template=lilac', { waitUntil: 'networkidle' }); await shot('09-builder', 1500);
await p.evaluate(() => document.querySelector('#s-when').scrollIntoView()); await shot('10-builder-when', 1200);
await p.goto(`${BASE}/host/${slug}?key=${key}`, { waitUntil: 'networkidle' }); await shot('11-dashboard', 1500);
await p.click('.xp.details .xp-head'); await shot('12-dashboard-details', 1500);
await p.evaluate(() => document.querySelector('#guests').scrollIntoView()); await shot('13-dashboard-guests', 1200);
await p.goto(`${BASE}/i/${slug}?to=${encodeURIComponent('أبو محمد')}`, { waitUntil: 'networkidle' }); await shot('14-guest-envelope', 1200);
await p.click('#open'); await shot('15-guest-invitation', 2600);
await p.evaluate(() => document.querySelector('.g-count').scrollIntoView({ block: 'start' })); await shot('16-guest-countdown', 1000);
await p.click('#map-pill'); await shot('17-guest-map', 2000);
await p.click('#map-close'); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('#rsvp').scrollIntoView()); await shot('18-guest-rsvp', 1000);
await ctx.close();

// ---- screen recording of interactions ----
const rctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: OUT + '/rec', size: { width: 390, height: 844 } } });
const q = await rctx.newPage();
const pause = (ms) => q.waitForTimeout(ms);
await q.goto(BASE + '/', { waitUntil: 'networkidle' }); await pause(3200);
await q.click('#occ-pick'); await pause(1000); await q.click('.menu button:nth-child(3)'); await pause(900);
for (let y = 0; y <= 1500; y += 50) { await q.evaluate((v) => scrollTo(0, v), y); await pause(30); }
await pause(600);
await q.evaluate(() => document.querySelector('.xp.details').scrollIntoView({ block: 'center' })); await pause(700);
await q.click('.xp.details .xp-head'); await pause(1700); await q.click('.xp.details .xp-head'); await pause(1500);
await q.goto(BASE + '/designs', { waitUntil: 'networkidle' }); await pause(1200);
await q.click('.group .xp-head'); await pause(1200); await q.click('.group .xp-head'); await pause(1000);
await q.click('.g-tile[data-theme=lilac]'); await pause(1800); await q.keyboard.press('Escape'); await pause(900);
await q.goto(`${BASE}/i/${slug}?to=${encodeURIComponent('أبو محمد')}`, { waitUntil: 'networkidle' }); await pause(1400);
await q.click('#open'); await pause(3000);
await q.evaluate(() => document.querySelector('.g-count').scrollIntoView({ behavior: 'smooth' })); await pause(1200);
await q.click('#map-pill'); await pause(2400); await q.click('#map-close'); await pause(1400);
await q.evaluate(() => document.querySelector('#rsvp').scrollIntoView({ behavior: 'smooth' })); await pause(1000);
await q.click('.segmented label:nth-child(3)'); await pause(900); await q.click('.segmented label:nth-child(2)'); await pause(900);
await q.click('[data-step="1"]'); await pause(400); await q.click('[data-step="1"]'); await pause(600);
await q.click('#rsvp-form button[type=submit]'); await pause(2200);
const vid = await q.video().path();
await rctx.close(); await b.close();
console.log('VIDEO', vid);

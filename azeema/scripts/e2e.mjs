// End-to-end flow against a running dev server (DEMO_MODE=1).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || '/tmp/claude-0';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${BASE}/create?template=sage`, { waitUntil: 'networkidle' });
await p.fill('[name=name1]', 'ناصر'); await p.fill('[name=name2]', 'تهاني');
await p.fill('[name=venue]', 'قاعة الفريدة'); await p.fill('[name=city]', 'الرياض');
await p.fill('[name=date]', '2026-12-12'); await p.fill('[name=time]', '20:00');
await p.fill('[name=notes]', 'يمنع اصطحاب جوالات الكاميرا\nجنة الأطفال منازلهم');
await p.fill('[name=contactName]', 'تجربة'); await p.fill('[name=contactPhone]', '0500000000');
await p.click('button[type=submit]');
await p.waitForURL(/checkout/); console.log('checkout:', p.url());
await p.screenshot({ path: `${OUT}/m_checkout.png`, fullPage: true });
await p.click('[data-pay]');
await p.waitForURL(/\/host\//); const hostUrl = p.url(); console.log('host:', hostUrl);
const slug = hostUrl.match(/host\/(\w+)/)[1];
// guest
const g = await ctx.newPage(); g.on('pageerror', (e) => errs.push(e.message));
await g.goto(`${BASE}/i/${slug}?to=${encodeURIComponent('أبو محمد')}`, { waitUntil: 'networkidle' });
await g.screenshot({ path: `${OUT}/m_cover.png` });
await g.click('#open'); await g.waitForTimeout(2600);
await g.screenshot({ path: `${OUT}/m_guest.png`, fullPage: true });
await g.click('[data-step="1"]'); await g.click('[data-step="1"]');
await g.fill('[name=message]', 'ألف مبروك، الله يتمم لكم على خير');
await g.click('#rsvp-form button[type=submit]'); await g.waitForSelector('.rsvp-done:not([hidden])');
await g.screenshot({ path: `${OUT}/m_rsvp_done.png` });
// a decline
await fetch(`${BASE}/api/i/${slug}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'نوف', attending: 'no', message: 'مبروك مقدماً' }) });
// wait for video
const t0 = Date.now();
for (;;) {
  const r = await (await fetch(`${BASE}/api/host/${slug}?key=${new URL(hostUrl).searchParams.get('key')}`)).json();
  if (r.video === 'ready' || r.video === 'failed') { console.log('video:', r.video, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(r.summary)); break; }
  await new Promise((r) => setTimeout(r, 2000));
}
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
await p.screenshot({ path: `${OUT}/m_host.png`, fullPage: true });
const dp = await b.newPage({ viewport: { width: 1280, height: 900 } });
await dp.goto(hostUrl, { waitUntil: 'networkidle' }); await dp.waitForTimeout(800);
await dp.screenshot({ path: `${OUT}/d_host.png`, fullPage: true });
console.log('slug', slug, 'errors:', errs);
await b.close();

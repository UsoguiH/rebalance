// Performance probe on a throttled mobile profile (CPU 4x slower, 390x844 @2x).
// Measures: load (FCP/LCP/long-task blocking), scroll smoothness, typing latency in the builder,
// idle animation cost on the guest page, and tap-to-paint latency for key interactions.
//   node scripts/perf.mjs [baseUrl] [--json out.json]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const THROTTLE = 4;
const b = await chromium.launch();

async function newPage() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await p.addInitScript(() => {
    window.__perf = { longTasks: [], lcp: 0, events: [], cls: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.events.push(e.duration))).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__perf.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  return { p, ctx };
}
// frame stats over a period while `action` runs
async function frames(p, ms, action) {
  await p.evaluate((ms) => {
    window.__f = []; let last = performance.now(); const end = last + ms;
    const tick = (t) => { window.__f.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, ms);
  if (action) await action();
  await p.waitForTimeout(ms + 200);
  return p.evaluate(() => {
    const f = window.__f.slice(1); const avg = f.reduce((a, b) => a + b, 0) / f.length;
    return { fps: +(1000 / avg).toFixed(1), jank: f.filter((x) => x > 50).length, worst: Math.round(Math.max(...f)) };
  });
}
async function load(p, url) {
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => ({
    fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
    lcp: Math.round(window.__perf.lcp),
    tbt: Math.round(window.__perf.longTasks.reduce((a, d) => a + Math.max(0, d - 50), 0)),
    bytes: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024)
      + Math.round((performance.getEntriesByType('navigation')[0]?.transferSize || 0) / 1024),
    domNodes: document.getElementsByTagName('*').length,
    cls: +window.__perf.cls.toFixed(3),
  }));
  return { ...m, loadWall: Date.now() - t0 };
}
const out = {};
// 1) home: load + scroll
{
  const { p, ctx } = await newPage();
  out.home = await load(p, BASE + '/');
  out.homeScroll = await frames(p, 3000, () => p.evaluate(() => window.scrollTo({ top: 3000, behavior: 'smooth' })));
  out.homeIdle = await frames(p, 2000);
  await ctx.close();
}
// 2) designs: load + sheet open latency
{
  const { p, ctx } = await newPage();
  out.designs = await load(p, BASE + '/designs');
  out.designsSheet = await frames(p, 1500, () => p.click('.g-tile[data-theme=lilac]'));
  await ctx.close();
}
// 3) builder: load + typing latency + design switch
{
  const { p, ctx } = await newPage();
  out.builder = await load(p, BASE + '/create');
  await p.click('[name=name1]');
  const lat = [];
  for (const ch of 'عبدالرحمن') {
    const t = await p.evaluate(() => performance.now());
    await p.keyboard.type(ch);
    lat.push(await p.evaluate((t) => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t)))), t));
  }
  const inp = await p.evaluate(() => Math.max(0, ...window.__perf.events));
  out.builderTyping = { avgMs: Math.round(lat.reduce((a, b) => a + b, 0) / lat.length), maxMs: Math.round(Math.max(...lat)), inpMs: Math.round(inp) };
  out.builderIdle = await frames(p, 2000);
  out.builderScroll = await frames(p, 2500, () => p.evaluate(() => window.scrollTo({ top: 2500, behavior: 'smooth' })));
  await ctx.close();
}
// 4) guest page (demo): load + idle cost after opening + scroll
{
  const { p, ctx } = await newPage();
  out.guest = await load(p, BASE + '/demo/sage');
  await p.click('#open'); await p.waitForTimeout(2500);
  out.guestIdle = await frames(p, 3000);
  out.guestScroll = await frames(p, 2500, () => p.evaluate(() => window.scrollTo({ top: 1600, behavior: 'smooth' })));
  out.guestMapMorph = await frames(p, 1200, () => p.click('#map-pill'));
  await ctx.close();
}
// 5) orders
{
  const { p, ctx } = await newPage();
  out.orders = await load(p, BASE + '/orders');
  await ctx.close();
}
await b.close();
console.table(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v])));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));

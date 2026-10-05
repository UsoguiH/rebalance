// Break down main-thread + raster time by trace event, for one scenario.  node scripts/trace.mjs <scenario>
import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const sc = process.argv[2] || 'home-load';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const cats = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink', 'cc', 'gpu'];
const run = async (fn) => { await b.startTracing(p, { categories: cats }); await fn(); return JSON.parse((await b.stopTracing()).toString()).traceEvents; };
let ev;
if (sc === 'home-load') ev = await run(async () => { await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(2000); });
if (sc === 'builder-type') { await p.goto(BASE + '/create', { waitUntil: 'networkidle' }); await p.click('[name=name1]'); ev = await run(async () => { await p.keyboard.type('عبدالرحمن', { delay: 60 }); await p.waitForTimeout(500); }); }
if (sc === 'guest-idle') { await p.goto(BASE + '/demo/sage', { waitUntil: 'networkidle' }); await p.click('#open'); await p.waitForTimeout(3000); ev = await run(() => p.waitForTimeout(3000)); }
if (sc === 'guest-load') ev = await run(async () => { await p.goto(BASE + '/demo/sage', { waitUntil: 'load' }); await p.waitForTimeout(2000); });
const sum = {};
for (const e of ev) if (e.ph === 'X' && e.dur) sum[e.name] = (sum[e.name] || 0) + e.dur / 1000;
const top = Object.entries(sum).filter(([n]) => !/^(ThreadControllerImpl::RunTask|RunTask|TaskQueueManager|MessageLoop|SequenceManager|Scheduler)/.test(n)).sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log(sc); for (const [n, d] of top) console.log(String(Math.round(d)).padStart(7), 'ms ', n);
await b.close();

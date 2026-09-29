// End-to-end smoke test: boots the real site in headless Chromium (software WebGL),
// on a desktop viewport and an emulated iPhone, drives the camel and checks the UI.
//   node tests/e2e.mjs         (screenshots land in tests/out/e2e-*.png)
import { serve } from '../tools/serve.mjs';
import { launch, collectErrors, PHONE } from './helpers.mjs';
import fs from 'node:fs';

const OUT = new URL('./out/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8123;
const srv = await serve(PORT);
const URL_ = `http://127.0.0.1:${PORT}/index.html?quality=low`;
const browser = await launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(ctxOpts, name) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = collectErrors(page);
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__drive && window.__drive.ui, null, { timeout: 60000 });
  await sleep(2500);
  await page.screenshot({ path: OUT + `e2e-${name}-1-title.png` });
  return { ctx, page, errs };
}

// ---------------- desktop ----------------
{
  const { ctx, page, errs } = await boot({ viewport: { width: 1280, height: 720 } }, 'desktop');
  check(await page.evaluate(() => document.documentElement.lang) === 'ar', 'desktop: Arabic by default');
  check(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'desktop: RTL by default');
  await page.waitForSelector('#ui-root button', { timeout: 20000 });
  // start button (first prominent button in the intro card)
  await page.evaluate(() => document.querySelector('.intro button, #ui-root .intro-start, #ui-root button')?.click());
  await sleep(3500);
  check(await page.evaluate(() => window.__drive.started), 'desktop: journey started (audio unlock gesture)');
  check(await page.evaluate(() => window.__drive.audio.unlocked), 'desktop: audio context unlocked');
  const p0 = await page.evaluate(() => ({ x: window.__drive.ride.state.x, z: window.__drive.ride.state.z }));
  await page.keyboard.down('ArrowUp');
  await sleep(3500);
  await page.screenshot({ path: OUT + 'e2e-desktop-2-riding.png' });
  await page.keyboard.down('Shift');
  await sleep(2500);
  const st = await page.evaluate(() => ({ ...window.__drive.ride.state }));
  await page.screenshot({ path: OUT + 'e2e-desktop-3-sprint.png' });
  await page.keyboard.up('Shift'); await page.keyboard.up('ArrowUp');
  check(Math.hypot(st.x - p0.x, st.z - p0.z) > 8, `desktop: camel moved ${Math.hypot(st.x - p0.x, st.z - p0.z).toFixed(1)} m`);
  check(st.gait === 'gallop' || st.gait === 'trot', `desktop: gait is ${st.gait}`);
  // teleport into the first zone and open its panel
  const z = await page.evaluate(() => window.__drive.world.zones[0]);
  await page.evaluate((z) => window.__drive.ride.reset(z.x, z.z - 1, 0), z);
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(1500);
  check(await page.evaluate(() => window.__drive.ui.isPanelOpen), 'desktop: zone panel opens with Enter');
  await page.screenshot({ path: OUT + 'e2e-desktop-4-panel.png' });
  await page.keyboard.press('Escape');
  await sleep(600);
  check(!(await page.evaluate(() => window.__drive.ui.isPanelOpen)), 'desktop: panel closes with Escape');
  const drawCalls = await page.evaluate(() => window.__drive.renderer.info.render.calls);
  const tris = await page.evaluate(() => window.__drive.renderer.info.render.triangles);
  console.log(`     render: ${drawCalls} draw calls, ${tris} triangles`);
  check(errs.length === 0, 'desktop: no console/page errors' + (errs.length ? '\n     ' + errs.slice(0, 5).join('\n     ') : ''));
  await ctx.close();
}

// ---------------- phone (portrait + landscape, touch) ----------------
for (const [name, vp] of [['phone-portrait', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }]]) {
  const { ctx, page, errs } = await boot({ ...PHONE, viewport: vp, screen: vp }, name);
  await page.evaluate(() => document.querySelector('.intro button, #ui-root .intro-start, #ui-root button')?.click());
  await sleep(3000);
  check(await page.evaluate(() => document.documentElement.dataset.input) === 'touch', `${name}: touch controls active`);
  const noScrollX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(noScrollX, `${name}: no horizontal overflow`);
  // drag the virtual joystick on the left half upward
  const cdp = await ctx.newCDPSession(page);
  const sx = Math.round(vp.width * 0.2), sy = Math.round(vp.height * 0.7);
  const p0 = await page.evaluate(() => ({ x: window.__drive.ride.state.x, z: window.__drive.ride.state.z }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - i * 10, id: 1 }] }); await sleep(60); }
  await sleep(3500);
  await page.screenshot({ path: OUT + `e2e-${name}-2-riding.png` });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const p1 = await page.evaluate(() => ({ x: window.__drive.ride.state.x, z: window.__drive.ride.state.z }));
  check(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 4, `${name}: joystick drives the camel (${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1)} m)`);
  check(errs.length === 0, `${name}: no console/page errors` + (errs.length ? '\n     ' + errs.slice(0, 5).join('\n     ') : ''));
  await ctx.close();
}

await browser.close();
srv.close();
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall e2e checks passed');
process.exit(failed ? 1 : 0);

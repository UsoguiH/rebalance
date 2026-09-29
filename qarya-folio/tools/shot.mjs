// Dev helper: headless screenshot of the running site.
//   node tools/shot.mjs <url> <out.png> [script]
// script (optional) is a sequence like "start|key:ArrowUp:2000|wait:500|eval:JS"
//   start          click through the title screen
//   key:K:MS       hold key K for MS milliseconds
//   wait:MS        wait
//   eval:JS        run JS in the page (window.__qarya is the game context)
//   shot:PATH      extra screenshot
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [url, out, script = 'start|wait:3000', w = '1280', h = '760'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
await page.goto(url, { timeout: 60000 });
await page.waitForFunction(() => window.__qaryaReady || document.querySelector('#load-bar')?.style.width === '100%', null, { timeout: 120000 }).catch(() => logs.push('timeout waiting for load'));
await page.waitForTimeout(800);
for (const step of script.split('|').filter(Boolean)) {
  const [cmd, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (cmd === 'start') {
    await page.mouse.click(+w / 2, +h / 2);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
  } else if (cmd === 'key') {
    const [k, ms] = arg.split(':');
    await page.keyboard.down(k); await page.waitForTimeout(+ms); await page.keyboard.up(k);
  } else if (cmd === 'wait') await page.waitForTimeout(+arg);
  else if (cmd === 'eval') logs.push('eval: ' + JSON.stringify(await page.evaluate(arg)));
  else if (cmd === 'shot') await page.screenshot({ path: arg });
}
await page.screenshot({ path: out });
console.log(logs.slice(0, 20).join('\n') || 'no errors');
await browser.close();

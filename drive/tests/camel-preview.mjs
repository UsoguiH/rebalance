import { serve } from '../tools/serve.mjs';
import { launch, collectErrors } from './helpers.mjs';
import fs from 'node:fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const srv = await serve(8123);
const br = await launch();
const page = await br.newPage({ viewport: { width: 800, height: 500 } });
const errs = collectErrors(page);
await page.goto('http://127.0.0.1:8123/tests/camel-preview.html');
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
const G = {
  idle: { state: { gait: 'idle' }, frames: 90 },
  walk: { state: { gait: 'walk', speed: 2.2 }, cycle: 2.8, frames: 100 },
  trot: { state: { gait: 'trot', speed: 5 }, cycle: 4.2, frames: 100 },
  gallop: { state: { gait: 'gallop', speed: 10 }, cycle: 6, frames: 100 },
  sprint: { state: { gait: 'gallop', speed: 12, sprint: true }, cycle: 6.5, frames: 120 },
  braking: { state: { gait: 'trot', speed: 4, braking: true }, cycle: 4, frames: 40 },
  call: { state: { gait: 'idle' }, frames: 60, call: true },
  turning: { state: { gait: 'trot', speed: 5, steer: 1 }, cycle: 4.2, frames: 100, yawRate: 1.0 },
};
const views = (process.argv[3] || 'side,q34,front').split(',');
fs.mkdirSync(new URL('./out/', import.meta.url).pathname, { recursive: true });
for (const [name, cfg] of Object.entries(G)) {
  if (only && !only.includes(name)) continue;
  for (const view of views) {
    const info = await page.evaluate(([c, v]) => window.snap({ ...c, view: v }), [cfg, view]);
    await page.screenshot({ path: new URL(`./out/camel_${name}_${view}.png`, import.meta.url).pathname });
    console.log(name, view, JSON.stringify(info));
  }
}
console.log('errors:', errs);
await br.close(); srv.close();

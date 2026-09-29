import { serve } from '../tools/serve.mjs';
import { launch, collectErrors } from './helpers.mjs';
const srv = await serve(8133); const b = await launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = collectErrors(p);
await p.goto('http://127.0.0.1:8133/index.html?quality=low', { waitUntil: 'load' });
await p.waitForSelector('.btn-start:not([disabled])', { timeout: 30000 });
await p.evaluate(() => document.querySelector('.btn-start').click());
await new Promise(r => setTimeout(r, 2500));
const zs = await p.evaluate(() => window.__drive.world.zones.map(z => ({ id: z.id, x: z.x, z: z.z, l: z.layout })));
for (const z of zs) {
  // stand on the spawn side of the pad facing the landmark
  const h = Math.atan2(-z.l.ox * -1, -z.l.oz * -1); // heading pointing outward (toward landmark)
  await p.evaluate(({ x, z, h }) => window.__drive.ride.reset(x - Math.sin(h) * 7, z - Math.cos(h) * 7, h), { x: z.x, z: z.z, h });
  await new Promise(r => setTimeout(r, 6500));
  await p.screenshot({ path: `tests/out/zone-${z.id}.png` });
  console.log('shot', z.id);
}
console.log('errors', errs);
await b.close(); srv.close();

import { serve } from '../tools/serve.mjs';
import { launch, collectErrors } from './helpers.mjs';
const srv = await serve(8131);
const b = await launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = collectErrors(p);
const t0 = Date.now();
await p.goto('http://127.0.0.1:8131/index.html?quality=low', { waitUntil: 'load' });
try { await p.waitForFunction(() => window.__drive && window.__drive.world, null, { timeout: 90000 }); } catch (e) { console.log('BOOT TIMEOUT'); }
console.log('boot ms', Date.now() - t0);
await new Promise(r => setTimeout(r, 4000));
await p.screenshot({ path: 'tests/out/shot-title.png' });
const info = await p.evaluate(() => window.__drive && { calls: window.__drive.renderer.info.render.calls, tris: window.__drive.renderer.info.render.triangles, zones: window.__drive.world.zones.length, props: window.__drive.world.props.length, colliders: window.__drive.world.colliders.length });
console.log(JSON.stringify(info));
console.log('errors:', errs.slice(0, 8));
await b.close(); srv.close();

import { serve } from '../tools/serve.mjs';
import { launch } from './helpers.mjs';
const srv = await serve(8132); const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
await p.goto('http://127.0.0.1:8132/index.html?quality=low', { waitUntil: 'load' });
await p.waitForSelector('.btn-start:not([disabled])', { timeout: 30000 });
await p.evaluate(() => document.querySelector('.btn-start').click());
await new Promise(r => setTimeout(r, 3000));
const fps = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 3000) res(n / 3); else requestAnimationFrame(f); }; f(); }));
console.log('fps (software GL, 1280x720):', fps.toFixed(1));
await p.keyboard.down('ArrowUp');
const t0 = Date.now(); let d = 0, x0 = await p.evaluate(() => [window.__drive.ride.state.x, window.__drive.ride.state.z]);
while (Date.now() - t0 < 20000) { await new Promise(r => setTimeout(r, 500)); const s = await p.evaluate(() => [window.__drive.ride.state.x, window.__drive.ride.state.z, window.__drive.ride.state.speed]); d = Math.hypot(s[0] - x0[0], s[1] - x0[1]); if (d > 10) { console.log('moved', d.toFixed(1), 'm after', ((Date.now() - t0) / 1000).toFixed(1), 's wall-clock, speed', s[2].toFixed(1)); break; } }
await b.close(); srv.close();

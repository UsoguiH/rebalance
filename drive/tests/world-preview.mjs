// Usage: node tests/world-preview.mjs [quality] [name1,name2...]
import { serve } from '../tools/serve.mjs';
import { launch, collectErrors } from './helpers.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const quality = process.argv[2] || 'med';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const ZS = { about: [10, 44], projects: [-46, 24], skills: [-58, -34], experience: [14, -62], contact: [58, -14] };
function towards(id, dist = 22, h = 5.5) {
  const [zx, zz] = ZS[id]; const d = Math.hypot(zx, zz); const ox = zx / d, oz = zz / d;
  const px = zx - ox * dist, pz = zz - oz * dist;
  return { pos: [px - oz * 0, h, pz], look: [zx + ox * 8, 4, zz + oz * 8], player: { x: px, y: 0, z: pz } };
}
const shots = {
  spawn: { pos: [0, 4.2, -9], look: [0, 3.2, 14], player: { x: 0, z: -2 } },
  spawn_dusk: { pos: [0, 4.2, -9], look: [0, 3.2, 14], player: { x: 0, z: -2 }, tod: 0.5 },
  about: towards('about'), projects: towards('projects'), skills: towards('skills'), experience: towards('experience'), contact: towards('contact'),
  overview: { pos: [0, 180, -120], look: [0, 0, 0], player: { x: 0, z: 0 }, fov: 60 },
  night: { pos: [0, 4.5, -9], look: [0, 3.5, 20], player: { x: 0, z: -2 }, tod: 0.75 },
  night_skills: { ...towards('skills'), tod: 0.72 },
  night_projects: { ...towards('projects'), tod: 0.72 },
  noon: { pos: [0, 4.5, -9], look: [0, 3.5, 20], player: { x: 0, z: -2 }, tod: 0.25 },
  dawn: { pos: [0, 4.5, -9], look: [0, 3.5, 20], player: { x: 0, z: -2 }, tod: 0.02 },
};
const srv = await serve(8123);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errs = collectErrors(page);
await page.goto(`http://127.0.0.1:8123/tests/world-preview.html?q=${quality}`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
console.log('build ms', await page.evaluate('window.buildMs'));
for (const [name, o] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  const info = await page.evaluate((o) => window.shot(o), o);
  await page.screenshot({ path: path.join(here, 'out', `${quality}_${name}.png`) });
  console.log(name, JSON.stringify(info));
}
console.log('errors:', errs.length ? errs : 'none');
await browser.close(); srv.close();

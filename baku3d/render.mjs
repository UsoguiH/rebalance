// Usage: node tools_render.mjs [outName=latest]   -> shots/<outName>.png (1156x1264) + shots/compare.png (ref | render)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || 'latest';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1156, height: 1264 } });
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
// optional camera override for extra angles: node tools_render.mjs name "x,y,z"
await page.goto(`http://localhost:${port}/index.html?shot=1`);
try { await page.waitForFunction('window.__ready === true', null, { timeout: 60000 }); } catch { errors.push('[timeout] window.__ready never set'); }
fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
await page.screenshot({ path: path.join(root, 'shots', out + '.png') });
// side-by-side: reference | render
const b64 = f => 'data:image/' + path.extname(f).slice(1).replace('jpg','jpeg') + ';base64,' + fs.readFileSync(f).toString('base64');
const cmp = await browser.newPage({ viewport: { width: 2312, height: 1264 } });
await cmp.setContent(`<body style="margin:0;display:flex;background:#222"><img src="${b64(path.join(root,'refs/ref_full.jpg'))}" style="width:1156px;height:1264px;object-fit:contain"><img src="${b64(path.join(root,'shots',out+'.png'))}" style="width:1156px;height:1264px"></body>`);
await cmp.screenshot({ path: path.join(root, 'shots', 'compare.png') });
await browser.close(); server.close();
console.log(errors.length ? 'CONSOLE ISSUES:\n' + errors.join('\n') : 'no console errors');
console.log('wrote shots/' + out + '.png and shots/compare.png (left = reference, right = your render)');

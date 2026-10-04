// node render_object.mjs name "az=0&pol=0&zoom=1&depth=0.55&light=0.9"  -> shots/<name>.png (1156x1264, same size as the reference)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'relief', q = process.argv[3] || '';
const mime = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.json':'application/json' };
const server = http.createServer((req,res)=>{ const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream','cache-control':'no-store'}); fs.createReadStream(p).pipe(res);}).listen(0);
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:{ width:1156, height:1264 } });
const errs=[]; page.on('console',m=>{ if(['error','warning'].includes(m.type())) errs.push(m.text()); }); page.on('pageerror',e=>errs.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html?shot=1&${q}`);
try { await page.waitForFunction('window.__ready===true',null,{timeout:60000}); } catch { errs.push('timeout'); }
fs.mkdirSync(path.join(root,'shots'),{recursive:true});
await page.screenshot({ path:path.join(root,'shots',name+'.png') });
await browser.close(); server.close();
console.log(errs.length?'ISSUES:\n'+errs.join('\n'):'no console errors', '-> shots/'+name+'.png');

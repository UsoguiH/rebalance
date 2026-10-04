// node export_glb.mjs  -> baku_madarame.glb (figure with projected panel + pedestal)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json'};
const server = http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(res);}).listen(0);
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg = await b.newPage({viewport:{width:600,height:700}});
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto(`http://localhost:${server.address().port}/index.html?shot=1`);
await pg.waitForFunction('window.__ready===true',null,{timeout:120000});
const b64 = await pg.evaluate('window.__exportGLB()');
fs.writeFileSync(path.join(root,'baku_madarame.glb'), Buffer.from(b64,'base64'));
console.log('wrote baku_madarame.glb', (fs.statSync(path.join(root,'baku_madarame.glb')).size/1e6).toFixed(1)+' MB');
await b.close(); server.close();

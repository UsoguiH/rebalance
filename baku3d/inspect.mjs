// node inspect.mjs <glb path rel to baku3d> <name> "az,az,..." [pol]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const [glb, name='insp', azs='0,90,180,-90', pol='0'] = process.argv.slice(2);
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json'};
const server = http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(res);}).listen(0);
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errs=[];
for (const az of azs.split(',')) {
  const pg = await b.newPage({viewport:{width:640,height:760}});
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${server.address().port}/inspect.html?glb=${glb}&az=${az}&pol=${pol}&mat=${process.env.MAT||''}`);
  await pg.waitForFunction('window.__ready===true',null,{timeout:60000}).catch(()=>errs.push('timeout'));
  await pg.screenshot({path:path.join(root,'shots',`${name}_${az}.png`)}); await pg.close();
}
await b.close(); server.close(); console.log(errs.length?errs.join('\n'):'ok');

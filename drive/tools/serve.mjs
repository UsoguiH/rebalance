// Tiny static server (no deps) for local dev and Playwright tests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ogg':'audio/ogg', '.mp3':'audio/mpeg', '.glb':'model/gltf-binary' };
export function serve(port = 8090) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || f.includes('node_modules')) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.env.PORT || 8090;
  await serve(port); console.log('http://127.0.0.1:' + port);
}

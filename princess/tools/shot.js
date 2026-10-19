// Headless screenshots for visual checks: node princess/tools/shot.js out.png "query" [width height wait]
// Serves the repo, opens princess/index.html?query in Chromium (SwiftShader WebGL) and saves a PNG.
const path = require('path');
const fs = require('fs');
const http = require('http');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
(async () => {
  const [out = 'shot.png', query = '', w = '1280', h = '720', wait = '1500'] = process.argv.slice(2);
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGE ERROR: ' + e.message + '\n' + e.stack));
  await page.addInitScript(() => {
    window.addEventListener('error', () => (window.__err = 1));
  });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/index.html?${query}`);
  try {
    await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 120000 });
  } catch (e) {
    logs.push('TIMEOUT waiting for __ready');
  }
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  console.log('rendered in', Date.now() - t0, 'ms');
  for (const l of logs.slice(0, 40)) console.log(l);
  await browser.close();
  server.close();
})();

// Renders the league promotion animation to a video:
//   node tools/render-league.js [out.mp4] [ranks|books] [new|classic]
// Serves the repo on a local port, steps league/index.html?frame=N in headless
// Chromium frame by frame (60 fps) and encodes the PNGs with ffmpeg.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { execFileSync } = require('child_process');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
(async () => {
  const root = path.join(__dirname, '..');
  const set = process.argv[3] || 'ranks';
  const style = process.argv[4] || 'new';
  const name = ['league', set === 'ranks' ? '' : set, style === 'new' ? '' : style].filter(Boolean).join('-');
  const out = path.resolve(process.argv[2] || path.join(root, 'league', name + '.mp4'));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };
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
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 884, height: 1520 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  await page.goto('http://127.0.0.1:' + server.address().port + '/league/index.html?frame=1&set=' + set + '&style=' + style);
  await page.waitForFunction(() => window.leagueReady);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'league-'));
  const canvas = await page.$('#stage');
  const end = await page.evaluate(() => window.leagueEnd);
  for (let f = 1; f <= end; f++) {
    await page.evaluate((n) => window.leagueFrame(n), f);
    await canvas.screenshot({ path: path.join(dir, 'f' + String(f).padStart(3, '0') + '.png') });
  }
  await browser.close();
  server.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '60', '-i', path.join(dir, 'f%03d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out]);
  console.log('wrote', out, '(frames in ' + dir + ')');
})();

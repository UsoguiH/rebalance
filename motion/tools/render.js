// Renders the piece offline, frame by frame, in headless Chromium.
//   node motion/tools/render.js --mp4 out.mp4            whole piece, 30 fps, 1080p
//   node motion/tools/render.js --out frames --times 1.2,3.4
//   node motion/tools/render.js --out frames --from 8 --to 10 --fps 30
// --mp4 needs ffmpeg on the PATH.
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawnSync } = require('child_process');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const nx = process.argv[i + 1];
    if (nx === undefined || nx.startsWith('--')) args[a.slice(2)] = true;
    else args[a.slice(2)] = process.argv[++i];
  }
}

(async () => {
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
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
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
  await page.goto(`http://127.0.0.1:${port}/index.html?render`);
  await page.waitForFunction(() => window.motionReady, null, { timeout: 30000 });

  const fps = parseFloat(args.fps || '30');
  let times;
  if (args.times) times = String(args.times).split(',').map(Number);
  else {
    const from = parseFloat(args.from || '0');
    const to = parseFloat(args.to || (await page.evaluate(() => M.DURATION)));
    times = [];
    for (let f = Math.round(from * fps); f / fps < to - 1e-6; f++) times.push(f / fps);
  }
  const out = path.resolve(args.out || path.join(root, 'frames'));
  fs.mkdirSync(out, { recursive: true });
  const fmt = args.jpeg ? 'image/jpeg' : 'image/png';
  const ext = args.jpeg ? 'jpg' : 'png';
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const data = await page.evaluate(
      ([t, f]) => {
        M.frame(t);
        return document.getElementById('screen').toDataURL(f, 0.92);
      },
      [times[i], fmt]
    );
    const name = args.times ? `t${times[i].toFixed(3)}.${ext}` : `f${String(i).padStart(4, '0')}.${ext}`;
    fs.writeFileSync(path.join(out, name), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 30 === 0) process.stdout.write(`\r${i + 1}/${times.length} frames`);
  }
  console.log(`\r${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
  await browser.close();
  server.close();

  if (args.mp4) {
    const r = spawnSync(
      'ffmpeg',
      ['-y', '-v', 'error', '-framerate', String(fps), '-i', path.join(out, `f%04d.${ext}`), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', path.resolve(args.mp4)],
      { stdio: 'inherit' }
    );
    if (r.status === 0) console.log('wrote', path.resolve(args.mp4));
  }
})();

// render.js: export every pose loop as MP4 and GIF (and optionally transparent WebM + PNG frames).
//
//   node mascot/tools/render.js                 # all loops → mascot/renders/
//   node mascot/tools/render.js jump wave       # just these
//   FPS=60 SIZE=900 BG=transparent FRAMES=1 node mascot/tools/render.js
//
// Needs Playwright (Chromium) and ffmpeg. The page is served from a tiny local server,
// because WebGL won't read textures from file:// URLs. MP4s are 60 fps by default;
// GIFs 30 fps. BG=transparent writes a transparent WebM (VP9 with alpha) instead of MP4.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'renders');
const FPS = +(process.env.FPS || 60);
const SIZE = +(process.env.SIZE || 800);
const H = Math.round(SIZE / 2) * 2, W = Math.round((SIZE * 0.75) / 2) * 2;
const BG = process.env.BG || '#faeddd';
const transparent = BG === 'transparent';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const port = server.address().port;

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://localhost:${port}/tools/frame.html`);
  await page.evaluate(() => window.ready);
  let list = await page.evaluate(() => window.clipList());
  const only = process.argv.slice(2);
  if (only.length) list = list.filter((c) => only.includes(c.id));

  for (const { id, dur } of list) {
    const dir = path.join(OUT, 'frames', id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const n = Math.round((dur / 1000) * FPS);
    for (let i = 0; i < n; i++) {
      const b64 = await page.evaluate(([id, t, w, h, bg]) => window.drawAt(id, t, w, h, bg), [id, (i * 1000) / FPS, W, H, transparent ? '' : BG]);
      fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.png'), Buffer.from(b64, 'base64'));
    }
    const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png')];
    if (transparent) {
      execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', path.join(OUT, id + '.webm')]);
    } else {
      execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', path.join(OUT, id + '.mp4')]);
    }
    const gw = Math.round((W * 0.6) / 2) * 2;
    execFileSync('ffmpeg', [...input, '-vf',
      `fps=30,scale=${gw}:-1:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=${transparent ? 1 : 0}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
      '-loop', '0', path.join(OUT, id + '.gif')]);
    if (!process.env.FRAMES) fs.rmSync(dir, { recursive: true, force: true });
    console.log(`${id}: ${n} frames`);
  }
  if (!process.env.FRAMES) fs.rmSync(path.join(OUT, 'frames'), { recursive: true, force: true });
  await browser.close();
  server.close();
})();

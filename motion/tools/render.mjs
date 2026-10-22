// Renders the reel with headless Chromium.
//   node tools/render.mjs                      -> out/reel.mp4 (silent, 30 fps)
//   node tools/render.mjs --audio audio/voice.mp3 --cues cues.voice.json
//   node tools/render.mjs --stills 1.5,6.2     -> out/still_1.50.png ...
//   node tools/render.mjs --from 10 --to 12    -> partial render
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const fps = +(args.fps || 30);
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1950 } });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[page]', e.message));
const q = new URLSearchParams({ render: '1', ...(args.cues ? { cues: args.cues } : {}) });
await page.goto(`http://localhost:${port}/index.html?${q}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const duration = await page.evaluate(() => window.duration);

async function frame(t, type = 'image/png') {
  const url = await page.evaluate(([t, fps, type]) => window.frameData(t, fps, type, 0.95), [t, fps, type]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

if (args.stills) {
  for (const s of String(args.stills).split(',')) {
    const t = +s;
    fs.writeFileSync(path.join(outDir, `still_${t.toFixed(2)}.png`), await frame(t));
    console.log('still', t);
  }
} else {
  const from = +(args.from || 0), to = +(args.to || duration);
  const n = Math.round((to - from) * fps);
  const out = path.join(outDir, args.out || (args.audio ? 'reel_voice.mp4' : 'reel.mp4'));
  const ff = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (args.audio) ff.push('-i', path.resolve(root, args.audio), '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', out);
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(from + i / fps, 'image/jpeg');
    if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
    if (args.verbose || i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  proc.stdin.end();
  await new Promise((r) => proc.on('close', r));
  console.log('wrote', out);
}
await browser.close();
server.close();

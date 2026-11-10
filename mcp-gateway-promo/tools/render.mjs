// Offline renderer: drives the page frame by frame in headless Chromium and encodes with ffmpeg.
//   node tools/render.mjs [--mode final|viewport|versus|all|audio] [--fps 30] [--workers 4] [--scale3d 1]
//                         [--from 0] [--to 25.6] [--out out] [--keep-frames]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] == null ? true : process.argv[i + 1]); };
const mode = arg('mode', 'final'), fps = Number(arg('fps', 30)), workers = Number(arg('workers', 4)), s3 = Number(arg('scale3d', 1));
const outDir = path.resolve(ROOT, arg('out', 'out')), framesRoot = path.join(outDir, 'frames');
fs.mkdirSync(framesRoot, { recursive: true });

const { server, port } = await serve();
const url = `http://127.0.0.1:${port}/index.html?paused=1&s3=${s3}`;
const launch = () => chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(url);
  await page.waitForFunction('window.promoReady', null, { timeout: 120000 });
  return page;
}

async function renderFrames(m) {
  const dir = path.join(framesRoot, m); fs.mkdirSync(dir, { recursive: true });
  const probe = await launch(), p0 = await open(probe);
  const duration = await p0.evaluate('window.promo.duration'); await probe.close();
  const f0 = Math.round(Number(arg('from', 0)) * fps), f1 = Math.round(Math.min(duration, Number(arg('to', duration))) * fps);
  const todo = []; for (let f = f0; f < f1; f++) if (!fs.existsSync(path.join(dir, `f_${String(f).padStart(5, '0')}.jpg`))) todo.push(f);
  console.log(`[${m}] ${todo.length} frames to render (${f0}..${f1 - 1}) with ${workers} workers`);
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const browser = await launch(), page = await open(browser);
    for (let i = w; i < todo.length; i += workers) {
      const f = todo[i];
      const data = await page.evaluate(({ t, m }) => window.promo.renderAt(t, m).toDataURL('image/jpeg', 0.94), { t: f / fps, m });
      fs.writeFileSync(path.join(dir, `f_${String(f).padStart(5, '0')}.jpg`), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
      if (++done % 50 === 0) console.log(`[${m}] ${done}/${todo.length}  ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
    }
    await browser.close();
  }));
  return { dir, f0, n: f1 - f0 };
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
}
const audio = path.join(outDir, 'soundtrack.wav');
const audioIn = () => (fs.existsSync(audio) ? ['-i', audio] : []);
const audioOut = () => (fs.existsSync(audio) ? ['-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []);
const x264 = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(arg('crf', 18)), '-preset', 'slow', '-movflags', '+faststart'];

async function encode(m) {
  const { dir, f0 } = await renderFrames(m);
  const out = path.join(outDir, `mcp-gateway-promo${m === 'final' ? '' : '-' + m}.mp4`);
  ffmpeg(['-framerate', String(fps), '-start_number', String(f0), '-i', path.join(dir, 'f_%05d.jpg'), ...audioIn(), ...x264, ...audioOut(), out]);
  console.log('wrote', path.relative(ROOT, out));
  return { dir, f0 };
}

async function versus() {
  const a = await renderFrames('final'), b = await renderFrames('viewport');
  const browser = await launch(), page = await open(browser);
  const { plate, layout } = await page.evaluate(() => ({ plate: window.promoVersus.plate(), layout: window.promoVersus.layout }));
  await browser.close();
  const platePng = path.join(outDir, 'versus-plate.png');
  fs.writeFileSync(platePng, Buffer.from(plate.slice(plate.indexOf(',') + 1), 'base64'));
  const { panel, topY, bottomY, w, h } = layout, out = path.join(outDir, 'mcp-gateway-final-vs-viewport.mp4');
  const fc = `color=c=black:s=${w}x${h}:r=${fps}[bg];[0:v]scale=${panel.w}:${panel.h}:flags=lanczos[a];[1:v]scale=${panel.w}:${panel.h}:flags=lanczos[b];` +
    `[bg][a]overlay=${panel.x}:${topY}:shortest=1[t1];[t1][b]overlay=${panel.x}:${bottomY}[t2];[t2][2:v]overlay=0:0[v]`;
  const hasAudio = fs.existsSync(audio);
  ffmpeg(['-framerate', String(fps), '-start_number', String(a.f0), '-i', path.join(a.dir, 'f_%05d.jpg'),
    '-framerate', String(fps), '-start_number', String(b.f0), '-i', path.join(b.dir, 'f_%05d.jpg'), '-i', platePng, ...audioIn(),
    '-filter_complex', fc, '-map', '[v]', ...(hasAudio ? ['-map', '3:a'] : []), ...x264, ...audioOut(), out]);
  console.log('wrote', path.relative(ROOT, out));
}

// soundtrack first, so every encode can mux it
if (!fs.existsSync(audio) || arg('audio', false)) {
  const browser = await launch(), page = await open(browser);
  fs.writeFileSync(audio, Buffer.from(await page.evaluate(() => window.promoAudio()), 'base64'));
  await browser.close();
  console.log('wrote', path.relative(ROOT, audio));
}
if (mode === 'audio') { server.close(); process.exit(0); }
if (mode === 'all') { await encode('final'); await encode('viewport'); await versus(); }
else if (mode === 'versus') await versus();
else await encode(mode);
if (!arg('keep-frames', false) && mode === 'all') fs.rmSync(framesRoot, { recursive: true, force: true });
server.close();

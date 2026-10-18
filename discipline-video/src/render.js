// Renders "The Line" to video frames and pipes them into ffmpeg.
//
//   node src/render.js                    full render -> out/video.mp4 (silent) + out/ink.json
//   node src/render.js --still 3,12.5     PNG stills -> out/still_<t>.png
//   node src/render.js --from 20 --to 30  render only part of the film

import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import fs from 'fs';
import opentype from 'opentype.js';
import { AutoCamera, makeTimeline } from './camera.js';
import { buildFilm } from './scenes.js';
import { clamp, ease, inv, noise2, rng } from './util.js';

export const W = 1080, H = 1920, FPS = 30;
export const LEAD = 0.8, GAP = 0.6;
export const CUTS = [9.0, 22.2, 32.75, 47.95, 60.6, 78.95, 91.05];
export const VOICE_END = 97.07;

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const root = new URL('..', import.meta.url).pathname;
fs.mkdirSync(`${root}out`, { recursive: true });

function loadFont(file) {
  const b = fs.readFileSync(`${root}node_modules/${file}`);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const fonts = {
  hand: loadFont('@fontsource/caveat/files/caveat-latin-700-normal.woff'),
  marker: loadFont('@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff'),
};

const words = JSON.parse(fs.readFileSync(`${root}audio/words.json`, 'utf8'));
const { P, vt } = makeTimeline(words, { lead: LEAD, gap: GAP, cuts: CUTS });
const film = buildFilm({ fonts, P, vt, voiceEnd: VOICE_END, cuts: CUTS });
const camera = new AutoCamera(film, FPS);

// ── Paper and grain ─────────────────────────────────────────────────────────
function makePaper() {
  const c = createCanvas(W, H), x = c.getContext('2d');
  const img = x.createImageData(W, H), d = img.data, r = rng(5);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const fib = (noise2(px * 0.012, py * 0.05) - 0.5) * 7 + (noise2(px * 0.05, py * 0.004) - 0.5) * 5;
      const blot = (noise2(px * 0.003 + 9, py * 0.003) - 0.5) * 10;
      const dx = (px - W / 2) / (W / 2), dy = (py - H / 2) / (H / 2);
      const vig = 1 - 0.09 * Math.pow(Math.min(1, Math.hypot(dx * 0.9, dy * 0.75)), 2.4);
      const n = fib + blot + (r() - 0.5) * 5;
      const i = (py * W + px) * 4;
      d[i] = (245 + n) * vig; d[i + 1] = (240 + n) * vig; d[i + 2] = (231 + n * 0.9) * vig; d[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function makeGrain(seed) {
  const c = createCanvas(W / 2, H / 2), x = c.getContext('2d');
  const img = x.createImageData(W / 2, H / 2), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const v = r() < 0.5 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = r() * 40;
  }
  x.putImageData(img, 0, 0);
  return c;
}

const paper = makePaper();
const grains = [1, 2, 3, 4].map(makeGrain);

// ── The pen ─────────────────────────────────────────────────────────────────
function drawPen(ctx, x, y, lift, scale, tilt) {
  ctx.save();
  ctx.translate(x + lift * 10, y - lift * 18);
  ctx.rotate(-0.98 + tilt);
  ctx.scale(scale * 0.82, scale * 0.82);
  const body = new Path2DLike();
  body.poly([[0, 0], [46, -8], [120, -10], [440, -12], [452, -6], [452, 6], [440, 12], [120, 10], [46, 8]]);
  ctx.shadowColor = 'rgba(50,35,20,0.30)';
  ctx.shadowBlur = 18 + lift * 14;
  ctx.shadowOffsetX = -10 - lift * 26;
  ctx.shadowOffsetY = 14 + lift * 30;
  ctx.fillStyle = '#fbf8f1';
  body.fill(ctx);
  ctx.shadowColor = 'transparent';
  // grip, nib, accent band
  ctx.fillStyle = '#2b2a28';
  new Path2DLike().poly([[46, -8], [120, -10], [120, 10], [46, 8]]).fill(ctx);
  ctx.fillStyle = '#1d1c1a';
  new Path2DLike().poly([[0, 0], [46, -8], [46, 8]]).fill(ctx);
  ctx.fillStyle = '#e4572e';
  new Path2DLike().poly([[300, -12], [326, -12], [326, 12], [300, 12]]).fill(ctx);
  ctx.strokeStyle = '#1d1c1a';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  body.stroke(ctx);
  ctx.beginPath(); ctx.moveTo(400, -12); ctx.lineTo(392, 26); ctx.lineTo(380, 26); ctx.lineTo(384, 12); ctx.stroke();
  ctx.restore();
}

class Path2DLike {
  poly(pts) { this.pts = pts; return this; }
  trace(ctx) { ctx.beginPath(); this.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  fill(ctx) { this.trace(ctx); ctx.fill(); }
  stroke(ctx) { this.trace(ctx); ctx.stroke(); }
}

// ── Frame ───────────────────────────────────────────────────────────────────
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const pen = { x: W + 300, y: H * 0.8, down: false, lastDown: -10, lastTip: null };

function worldToScreen(c, wx, wy) {
  const dx = wx - c.x, dy = wy - c.y, cs = Math.cos(c.r), sn = Math.sin(c.r);
  return [W / 2 + (dx * cs - dy * sn) * c.z, H / 2 + (dx * sn + dy * cs) * c.z];
}

function drawFrame(t, frame, smoothPen = true) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(paper, 0, 0);
  const c = camera.at(t);
  ctx.translate(W / 2, H / 2);
  ctx.rotate(c.r);
  ctx.scale(c.z, c.z);
  ctx.translate(-c.x, -c.y);

  const hw = (W / 2) / c.z + 80, hh = (H / 2) / c.z + 80;
  const view = [c.x - hw, c.y - hh, c.x + hw, c.y + hh];

  // Dot-grid journal page, fixed to the world so camera moves read as motion.
  const dotA = 0.16 * clamp((c.z - 0.4) / 0.35);
  if (dotA > 0.01) {
    ctx.fillStyle = `rgba(70,55,40,${dotA})`;
    const g = 64;
    for (let gx = Math.floor(view[0] / g) * g; gx < view[2]; gx += g)
      for (let gy = Math.floor(view[1] / g) * g; gy < view[3]; gy += g) ctx.fillRect(gx - 1.8, gy - 1.8, 3.6, 3.6);
  }

  const env = { step: Math.floor(t * 7.5), cam: c };
  let active = null;
  for (const el of film.els) {
    if (!el.visible(t)) continue;
    const b = el.bbox;
    if (b[2] < view[0] || b[0] > view[2] || b[3] < view[1] || b[1] > view[3]) continue;
    el.draw(ctx, t, env);
    if (el.active(t) && el.tip(t) && (!active || el.t0 >= active.t0)) active = el;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Moody graphite wash and rain for the "hard part".
  for (const f of film.fx) {
    if (f.type !== 'mood') continue;
    const m = ease.inOut(inv(f.t0, f.t0 + 0.8, t)) * (1 - ease.inOut(inv(f.t1 - 0.6, f.t1 + 0.4, t)));
    if (m <= 0) continue;
    ctx.fillStyle = `rgba(38,40,52,${0.2 * m})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(70,74,88,${0.22 * m})`;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const r = rng(99);
    for (let i = 0; i < 70; i++) {
      const sx = r() * (W + 300), sp = 1500 + r() * 700, len = 40 + r() * 50, ph = r() * (H + 200);
      const y = ((ph + t * sp) % (H + 200)) - 100;
      const x = sx - y * 0.2;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.2, y + len);
    }
    ctx.stroke();
  }

  // Pen: follows the active tip, lifts and drifts away when idle.
  let target, down = false, speed = 0;
  if (active) {
    const tip = active.tip(t);
    target = worldToScreen(c, tip[0], tip[1]);
    down = true;
    pen.lastDown = t;
    pen.lastTip = target;
  } else if (pen.lastTip && t - pen.lastDown < 1.0) {
    target = [pen.lastTip[0] + 40, pen.lastTip[1] + 30];
  } else {
    target = [W + 320, H * 0.78];
  }
  const ox = pen.x, oy = pen.y;
  if (!smoothPen || (down && Math.hypot(target[0] - pen.x, target[1] - pen.y) < 140)) { pen.x = target[0]; pen.y = target[1]; }
  else { pen.x += (target[0] - pen.x) * 0.3; pen.y += (target[1] - pen.y) * 0.3; }
  speed = Math.hypot(pen.x - ox, pen.y - oy);
  pen.lift = (pen.lift ?? 1) + ((down ? 0 : 1) - (pen.lift ?? 1)) * 0.35;
  const penScale = 0.62 + 0.38 * clamp((c.z - 0.3) / 0.6);
  if (pen.x < W + 250) drawPen(ctx, pen.x, pen.y, pen.lift, penScale, clamp((pen.x - ox) * 0.002, -0.08, 0.08));

  ctx.globalAlpha = 0.3;
  ctx.drawImage(grains[Math.floor(frame / 8) % 4], 0, 0, W, H);
  ctx.globalAlpha = 1;

  for (const f of film.fx) {
    if (f.type !== 'fadeout') continue;
    const a = ease.inOut(inv(f.t0, f.t1, t));
    if (a > 0) { ctx.fillStyle = `rgba(245,240,231,${a})`; ctx.fillRect(0, 0, W, H); }
  }
  return { down, speed, kind: active ? (active.glyphs ? 'text' : 'line') : null };
}

// Where the pen tip is at time t (world coords) and what it is drawing with.
function penAt(t) {
  let active = null;
  for (const el of film.els) if (el.active(t) && (!active || el.t0 >= active.t0) && el.tip(t)) active = el;
  if (!active) return null;
  return { tip: active.tip(t), sound: active.sound, text: !!active.glyphs, id: film.els.indexOf(active) };
}

// ── Main ────────────────────────────────────────────────────────────────────
if ('pen-data' in args) {
  // Pen motion at 240 Hz for the writing sound in mix.py: [down, x, y, kind, element],
  // kind 0 = line drawing, 1 = handwriting, 2 = marker lettering.
  const rate = 240, rows = [];
  for (let k = 0; k < film.duration * rate; k++) {
    const p = penAt(k / rate);
    rows.push(p ? [1, Math.round(p.tip[0] * 10) / 10, Math.round(p.tip[1] * 10) / 10, p.sound === 'marker' ? 2 : p.text ? 1 : 0, p.id] : [0, 0, 0, 0, -1]);
  }
  fs.writeFileSync(`${root}out/pen.json`, JSON.stringify({ rate, rows, sfx: film.sfx, duration: film.duration }));
  console.log('pen data written');
} else if (args.still) {
  for (const s of args.still.split(',').sort((a, b) => a - b)) {
    const t = parseFloat(s);
    drawFrame(t, Math.round(t * FPS), false);
    fs.writeFileSync(`${root}out/still_${s}.png`, await canvas.encode('png'));
  }
  console.log('stills written');
} else {
  const f0 = Math.round(parseFloat(args.from ?? 0) * FPS);
  const f1 = Math.round(parseFloat(args.to ?? film.duration) * FPS);
  const out = args.out ?? `${root}out/video.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const log = [];
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const info = drawFrame(f / FPS, f);
    log.push([info.down ? 1 : 0, Math.round(info.speed * 10) / 10, info.kind === 'text' ? 1 : 0]);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${f1} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  fs.writeFileSync(`${root}out/ink.json`, JSON.stringify({ fps: FPS, from: f0, frames: log, sfx: film.sfx, duration: film.duration }));
  console.log('done', out);
}

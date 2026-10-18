// Renders "Steve vs Herobrine" in one of the realistic looks.
//
//   node src/render.js --look 1            notebook + ballpoint  -> out/video_1.mp4 + out/pen_1.json
//   node src/render.js --look 4            whiteboard + marker   -> out/video_4.mp4 + out/pen_4.json
//   node src/render.js --look 1 --still 5,20.5   preview frames -> out/still_1_<t>.png

import { spawn } from 'child_process';
import fs from 'fs';
import { makeTimeline } from '../../discipline-video/src/camera.js';
import { createCanvas } from '../../discipline-video/src/deps.js';
import { drawTool, grainMaskImage, H, loadFont, LOOKS, SURFACES, W } from '../../discipline-video/src/looks.js';
import { clamp, ease, inv, lerp, rng } from '../../discipline-video/src/util.js';
import { buildStory } from './story.js';

const FPS = 30;
export const LEAD = 0.6, GAP = 0.9;
export const CUTS = [10.0, 21.9, 35.5, 42.85, 51.8, 62.2, 69.9];
const VOICE_END = 82.13;

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const root = new URL('..', import.meta.url).pathname;
fs.mkdirSync(`${root}out`, { recursive: true });

const LOOK_N = Number(args.look ?? 1);
const look = {
  1: { ...LOOKS[0], hatchGap: 9, transition: 'flip' },
  4: { ...LOOKS[3], w: 6.5, hatchGap: 15, transition: 'erase' },
}[LOOK_N];

const words = JSON.parse(fs.readFileSync(`${root}audio/words.json`, 'utf8'));
const { P, vt } = makeTimeline(words, { lead: LEAD, gap: GAP, cuts: CUTS });
const font = loadFont(look.font);
const { scenes, duration } = buildStory({ look, font, P, vt, cuts: CUTS, voiceEnd: VOICE_END });
const allEls = scenes.flatMap((s) => s.els);

// Transitions sit in the breath between two scenes.
const transitions = scenes.slice(0, -1).map((s, i) => {
  const end = Math.min(...scenes[i + 1].els.map((e) => e.t0)) - 0.02;
  const start = Math.min(Math.max(...s.els.map((e) => e.t1)) + 0.15, end - 0.85);
  return { from: i, start, end };
});

const surface = createCanvas(W, H);
SURFACES[look.surface](surface.getContext('2d'));
const mask = await grainMaskImage(look.grain[0], look.grain[1], 30 + LOOK_N);
const page = createCanvas(W, H), pc = page.getContext('2d');
const ink = createCanvas(W, H), ic = ink.getContext('2d');
const out = createCanvas(W, H), oc = out.getContext('2d');
const env = { step: 0 };

// ── Camera: eased moves per scene, never showing past the page edge ─────────
function camAt(s, t) {
  let { x, y, z } = s.cams[0];
  for (const m of s.cams.slice(1)) {
    if (t < m.t) break;
    const p = ease.inOut(inv(m.t, m.t + m.d, t));
    x = lerp(x, m.x, p); y = lerp(y, m.y, p); z = Math.exp(lerp(Math.log(z), Math.log(m.z), p));
  }
  z = Math.max(1, z * (1 + 0.012 * Math.sin(t * 0.5)));
  const hw = W / (2 * z), hh = H / (2 * z);
  return { x: clamp(x + Math.sin(t * 0.6) * 3, hw, W - hw), y: clamp(y + Math.cos(t * 0.5) * 3, hh, H - hh), z };
}

function blit(src, c) {
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.translate(W / 2, H / 2);
  oc.scale(c.z, c.z);
  oc.translate(-c.x, -c.y);
  oc.drawImage(src, 0, 0);
  oc.setTransform(1, 0, 0, 1, 0, 0);
}

// ── Ink ─────────────────────────────────────────────────────────────────────
function drawInk(s, t, target = ic) {
  target.globalCompositeOperation = 'source-over';
  target.clearRect(0, 0, W, H);
  if (look.bleed) { target.shadowColor = look.ink; target.shadowBlur = look.bleed; }
  for (const el of s.els) if (t >= el.t0) el.draw(target, Math.min(t, el.t1), env);
  target.shadowBlur = 0;
  target.globalCompositeOperation = 'destination-out';
  target.drawImage(mask, 0, 0);
  target.globalCompositeOperation = 'source-over';
}

function composite(ctx, inkCanvas, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = (look.alpha ?? 1) * alpha;
  ctx.globalCompositeOperation = look.blend;
  ctx.drawImage(inkCanvas, 0, 0);
  ctx.restore();
}

// ── Pen: writes on the active element, glides lifted to the next one ───────
const pen = { x: 1300, y: 1800, lift: 1 };
function activeAt(els, t) {
  let a = null;
  for (const el of els) if (el.active(t) && (!a || el.t0 >= a.t0) && el.tip(t)) a = el;
  return a;
}
function updatePen(s, t, hidden) {
  const a = hidden ? null : activeAt(s.els, t);
  let target, down = false;
  if (a) { target = a.tip(t); down = true; }
  else if (hidden) target = [1350, 1900];
  else {
    const next = s.els.filter((e) => e.t0 > t).sort((p, q) => p.t0 - q.t0)[0];
    if (next && next.t0 - t < 0.45) target = next.tip(next.t0 + 0.001);
    else if (next) target = [pen.x + 4, pen.y + 8];
    else target = [lerp(pen.x, 1250, 0.05), lerp(pen.y, 1750, 0.05)];
  }
  const px = pen.x;
  if (down && Math.hypot(target[0] - pen.x, target[1] - pen.y) < 120) { pen.x = target[0]; pen.y = target[1]; }
  else { pen.x += (target[0] - pen.x) * 0.25; pen.y += (target[1] - pen.y) * 0.25; }
  pen.lift += ((down ? 0 : 1) - pen.lift) * 0.3;
  pen.tilt = clamp((pen.x - px) * 0.0015, -0.04, 0.04);
}

function renderPage(s, t, withPen) {
  pc.globalCompositeOperation = 'source-over';
  pc.globalAlpha = 1;
  pc.drawImage(surface, 0, 0);
  drawInk(s, t);
  composite(pc, ink);
  if (withPen && pen.x < 1300) drawTool(pc, look.tool, [pen.x, pen.y], pen.lift, pen.tilt);
}

// ── Transitions ─────────────────────────────────────────────────────────────
const cache = {};
function finalOf(tr) {
  if (cache.tr === tr) return cache;
  const s = scenes[tr.from];
  renderPage(s, tr.start, false);
  const pageImg = createCanvas(W, H);
  pageImg.getContext('2d').drawImage(page, 0, 0);
  const inkImg = createCanvas(W, H);
  drawInk(s, tr.start, inkImg.getContext('2d'));
  Object.assign(cache, { tr, pageImg, inkImg, cam: camAt(s, tr.start) });
  return cache;
}

// Notebook: the page turns over the binding on the left, revealing the next one.
function pageFlip(tr, t) {
  const u = ease.inOut(inv(tr.start, tr.end, t));
  const next = scenes[tr.from + 1];
  renderPage(next, t, false);
  blit(page, camAt(next, t));
  const f = finalOf(tr);
  const old = createCanvas(W, H), o2 = old.getContext('2d');
  o2.translate(W / 2, H / 2); o2.scale(f.cam.z, f.cam.z); o2.translate(-f.cam.x, -f.cam.y);
  o2.drawImage(f.pageImg, 0, 0);
  const sx = Math.cos(u * Math.PI / 2);
  if (sx > 0.01) {
    const edge = W * sx;
    const sh = oc.createLinearGradient(edge, 0, edge + 90, 0);
    sh.addColorStop(0, `rgba(30,20,10,${0.35 * (1 - u)})`); sh.addColorStop(1, 'rgba(30,20,10,0)');
    oc.fillStyle = sh; oc.fillRect(edge, 0, 90, H);
    oc.save();
    oc.transform(sx, -0.06 * (1 - sx), 0, 1, 0, 0);
    oc.drawImage(old, 0, 0);
    const lg = oc.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, `rgba(0,0,0,${0.3 * u})`);
    oc.fillStyle = lg; oc.fillRect(0, 0, W, H);
    oc.restore();
  }
}

// Whiteboard: an eraser sweeps the old drawing away, leaving faint ghosts.
const ERASER = { w: 300, h: 120 };
function eraserPath(cam) {
  const hw = W / (2 * cam.z), hh = H / (2 * cam.z), pts = [];
  const x1 = cam.x - hw + 60, x2 = cam.x + hw - 60, y1 = cam.y - hh * 0.75, y2 = cam.y + hh * 0.62;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const y = lerp(y1, y2, r / (rows - 1));
    pts.push(r % 2 ? [x2, y] : [x1, y], r % 2 ? [x1, y + 30] : [x2, y + 30]);
  }
  return pts;
}
function pointOnPath(pts, u) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let L = u * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (L <= lens[i]) { const f = L / lens[i]; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f), Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])]; }
    L -= lens[i];
  }
  const p = pts[pts.length - 1];
  return [p[0], p[1], 0];
}
function drawEraser(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(a) * 0.08);
  const { w, h } = ERASER;
  ctx.save(); ctx.filter = 'blur(12px)'; ctx.fillStyle = 'rgba(20,25,30,0.3)'; ctx.fillRect(-w / 2 + 18, -h / 2 + 22, w, h); ctx.restore();
  ctx.fillStyle = '#d9d6cf'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#3a3d42'); g.addColorStop(0.35, '#1d1f22'); g.addColorStop(1, '#0d0e10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 4, w - 12, h - 16, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-w / 2 + 20, -h / 2 + 12, w - 40, 6);
  ctx.restore();
}
function erase(tr, t) {
  const u = inv(tr.start, tr.end, t);
  const f = finalOf(tr);
  const path = eraserPath(f.cam);
  pc.globalCompositeOperation = 'source-over';
  pc.globalAlpha = 1;
  pc.drawImage(surface, 0, 0);
  pc.save(); pc.globalAlpha = 0.07; pc.filter = 'blur(3px)'; pc.drawImage(f.inkImg, 0, 0); pc.restore();
  ic.globalCompositeOperation = 'source-over';
  ic.clearRect(0, 0, W, H);
  ic.drawImage(f.inkImg, 0, 0);
  ic.globalCompositeOperation = 'destination-out';
  ic.fillStyle = '#000';
  for (let k = 0; k <= 160; k++) {
    const v = (k / 160) * ease.sine(u);
    const [x, y, a] = pointOnPath(path, v);
    ic.save(); ic.translate(x, y); ic.rotate(Math.sin(a) * 0.08); ic.fillRect(-ERASER.w / 2, -ERASER.h / 2, ERASER.w, ERASER.h); ic.restore();
  }
  ic.globalCompositeOperation = 'source-over';
  composite(pc, ink);
  const [x, y, a] = pointOnPath(path, ease.sine(u));
  if (u < 1) drawEraser(pc, x, y, a);
  blit(page, f.cam);
  return Math.hypot(...[0, 1].map((i) => pointOnPath(path, ease.sine(inv(tr.start, tr.end, t + 1 / FPS)))[i] - [x, y][i]));
}

// ── Frames ──────────────────────────────────────────────────────────────────
function sceneAt(t) {
  let i = 0;
  while (i < transitions.length && t >= transitions[i].end) i++;
  return i;
}

function drawFrame(t) {
  const tr = transitions.find((x) => t >= x.start && t < x.end);
  oc.setTransform(1, 0, 0, 1, 0, 0);
  let rub = 0;
  if (tr) {
    updatePen(scenes[tr.from + 1], t, true);
    if (look.transition === 'flip') pageFlip(tr, t); else rub = erase(tr, t);
  } else {
    const s = scenes[sceneAt(t)];
    updatePen(s, t, false);
    renderPage(s, t, true);
    blit(page, camAt(s, t));
  }
  const fade = ease.inOut(inv(duration - 0.9, duration, t));
  if (fade > 0) { oc.globalAlpha = fade; oc.drawImage(surface, 0, 0); oc.globalAlpha = 1; }
  return rub;
}

if (args.still) {
  for (const s of args.still.split(',').sort((a, b) => a - b)) {
    const t = parseFloat(s);
    for (let k = 20; k >= 0; k--) drawFrame(Math.max(0, t - k / FPS)); // settle the pen
    fs.writeFileSync(`${root}out/still_${LOOK_N}_${s}.png`, out.toBuffer('image/png'));
  }
  console.log('stills written');
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', `${root}out/video_${LOOK_N}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const rubs = [];
  const t0 = Date.now();
  for (let f = 0; f < duration * FPS; f++) {
    rubs.push(Math.round(drawFrame(f / FPS)));
    const buf = Buffer.from(out.data());
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`look ${LOOK_N}: frame ${f}/${Math.ceil(duration * FPS)} (${((Date.now() - t0) / 1000).toFixed(0)}s, ${(process.memoryUsage().rss / 1e9).toFixed(1)} GB)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));

  // Pen motion at 240 Hz for the writing sound, plus the transition sounds.
  const rate = 240, rows = [];
  for (let k = 0; k < duration * rate; k++) {
    const t = k / rate;
    const s = scenes[sceneAt(t)];
    const inTr = transitions.some((x) => t >= x.start && t < x.end);
    const el = inTr ? null : activeAt(s.els, t);
    const tip = el && el.tip(t);
    rows.push(el ? [1, Math.round(tip[0] * 10) / 10, Math.round(tip[1] * 10) / 10, el.glyphs ? 1 : 0, allEls.indexOf(el)] : [0, 0, 0, 0, -1]);
  }
  const sfx = transitions.map((x) => ({ type: look.transition, t: x.start, d: x.end - x.start }));
  fs.writeFileSync(`${root}out/pen_${LOOK_N}.json`, JSON.stringify({ rate, rows, sfx, rubs, fps: FPS, duration, style: look.sound }));
  console.log('done', `out/video_${LOOK_N}.mp4`);
}

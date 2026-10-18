// Short animated previews of the realistic looks: the opening scene (about 11 s)
// written in real time against the narration.
//
//   node src/lookanim.js 1,2,4,5   -> out/look_anim_<n>.mp4 (silent) + out/look_pen_<n>.json
//   python3 src/mix.py --look <n>  -> out/look_<n>.mp4 (with voice and writing sound)

import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import fs from 'fs';
import { makeTimeline } from './camera.js';
import * as G from './geom.js';
import { Strokes, Text } from './ink.js';
import { drawTool, grainMask, H, loadFont, LOOKS, SURFACES, W } from './looks.js';
import { clamp, ease, inv } from './util.js';

const FPS = 30, DURATION = 11;
const root = new URL('..', import.meta.url).pathname;
const words = JSON.parse(fs.readFileSync(`${root}audio/words.json`, 'utf8'));
const { P } = makeTimeline(words, { lead: 0.8, gap: 0.6, cuts: [9.0, 22.2, 32.75, 47.95, 60.6, 78.95, 91.05] });

function sceneOne(look, font) {
  const a = P('every single day'), b = P('write one line'), c = P('of your story'), d = P('whether you mean to');
  const e = P('or not'), f = P('most people never notice'), g = P('holding the pen');
  return [
    new Text(font, 'Every single day,', 560, 480, look.size, a.s - 0.05, a.e + 0.1, { color: look.ink }),
    new Strokes(G.line(200, 600, 940, 600, { wob: 3 }), b.s - 0.1, b.e + 0.3, { w: look.w * 2.2, color: look.ink }),
    new Text(font, 'of your story.', 560, 720, look.size * 0.72, c.s, c.e + 0.15, { color: look.soft }),
    new Strokes(G.figure(500, 1300, 1.4, 'hold'), d.s - 0.1, d.e + 0.3, { w: look.w * 1.3, color: look.ink }),
    new Strokes(G.penDoodle(582, 1094, 145, -1.0, 20), e.s - 0.1, e.e + 0.1, { w: look.w * 1.3, color: look.ink }),
    new Text(font, 'most people never notice...', 560, 1520, look.size * 0.62, f.s, f.e + 0.3, { color: look.soft }),
    new Strokes(G.ellipse(622, 1030, 105, 118, { wob: 2 }), g.s, g.e + 0.35, { w: look.w * 1.4, color: look.accent }),
  ];
}

function activeAt(els, t) {
  let active = null;
  for (const el of els) if (el.active(t) && (!active || el.t0 >= active.t0) && el.tip(t)) active = el;
  return active;
}

async function renderClip(n) {
  const look = LOOKS[n - 1];
  const font = loadFont(look.font);
  const els = sceneOne(look, font);
  const surface = createCanvas(W, H);
  SURFACES[look.surface](surface.getContext('2d'));
  const mask = grainMask(look.grain[0], look.grain[1], 30 + n - 1);
  const page = createCanvas(W, H), pc = page.getContext('2d');
  const ink = createCanvas(W, H), ic = ink.getContext('2d');
  const out = createCanvas(W, H), oc = out.getContext('2d');
  const env = { step: 0 }; // real ink holds still: no boil
  const pen = { x: 1250, y: 1700, lift: 1 };

  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', `${root}out/look_anim_${n}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < DURATION * FPS; f++) {
    const t = f / FPS;
    ic.globalCompositeOperation = 'source-over';
    ic.clearRect(0, 0, W, H);
    if (look.bleed) { ic.shadowColor = look.ink; ic.shadowBlur = look.bleed; }
    for (const el of els) if (t >= el.t0) el.draw(ic, Math.min(t, el.t1), env);
    ic.shadowBlur = 0;
    ic.globalCompositeOperation = 'destination-out';
    ic.drawImage(mask, 0, 0);

    pc.globalCompositeOperation = 'source-over';
    pc.globalAlpha = 1;
    pc.drawImage(surface, 0, 0);
    pc.save();
    pc.globalAlpha = look.alpha ?? 1;
    pc.globalCompositeOperation = look.blend;
    pc.drawImage(ink, 0, 0);
    pc.restore();
    if (look.surface === 'chalkboard') { pc.save(); pc.globalAlpha = 0.25; pc.filter = 'blur(6px)'; pc.drawImage(ink, 0, 0); pc.restore(); }

    // The pen writes on the active element, glides (lifted) to the next one, and rests off to the side.
    const active = activeAt(els, t);
    let target, down = false;
    if (active) { target = active.tip(t); down = true; }
    else {
      const next = els.filter((e) => e.t0 > t).sort((x, y) => x.t0 - y.t0)[0];
      if (next && next.t0 - t < 0.5) target = next.tip(next.t0 + 0.001);
      else if (next) target = [pen.x + 6, pen.y + 10];
      else target = [pen.x + (1250 - pen.x) * 0.06, pen.y + (1750 - pen.y) * 0.06];
    }
    const px = pen.x;
    if (down && Math.hypot(target[0] - pen.x, target[1] - pen.y) < 120) { pen.x = target[0]; pen.y = target[1]; }
    else { pen.x += (target[0] - pen.x) * 0.22; pen.y += (target[1] - pen.y) * 0.22; }
    pen.lift += ((down ? 0 : 1) - pen.lift) * 0.3;
    drawTool(pc, look.tool, [pen.x, pen.y], pen.lift, clamp((pen.x - px) * 0.0015, -0.04, 0.04));

    // A slow push-in keeps the frame alive.
    const z = 1 + 0.05 * ease.sine(inv(0, DURATION, t));
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.translate(W / 2, H / 2 + 40);
    oc.scale(z, z);
    oc.translate(-W / 2, -H / 2 - 40);
    oc.drawImage(page, 0, 0);
    const buf = Buffer.from(oc.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));

  // Pen motion at 240 Hz for the writing sound (same format as render.js --pen-data).
  const rate = 240, rows = [];
  for (let k = 0; k < DURATION * rate; k++) {
    const el = activeAt(els, k / rate);
    const tip = el && el.tip(k / rate);
    rows.push(el ? [1, Math.round(tip[0] * 10) / 10, Math.round(tip[1] * 10) / 10, el.glyphs ? 1 : 0, els.indexOf(el)] : [0, 0, 0, 0, -1]);
  }
  fs.writeFileSync(`${root}out/look_pen_${n}.json`, JSON.stringify({ rate, rows, sfx: [], duration: DURATION, style: look.sound }));
  console.log(`look ${n} rendered`);
}

for (const n of (process.argv[2] ?? '1,2,4,5').split(',').map(Number)) await renderClip(n);

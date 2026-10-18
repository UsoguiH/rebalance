// Style frames for choosing a realistic look: the same moment of scene 1 drawn on
// five different surfaces with five different writing tools.
//
//   node src/looks.js     -> out/look_1.png … out/look_5.png and out/looks_sheet.png

import { createCanvas, Path2D } from '@napi-rs/canvas';
import fs from 'fs';
import opentype from 'opentype.js';
import * as G from './geom.js';
import { Strokes, Text } from './ink.js';
import { noise2, rng } from './util.js';

const W = 1080, H = 1920;
const root = new URL('..', import.meta.url).pathname;

function loadFont(file) {
  const b = fs.readFileSync(`${root}node_modules/@fontsource/${file}`);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}

// ── Surfaces ────────────────────────────────────────────────────────────────
function pixels(fn) {
  const c = createCanvas(W, H), x = c.getContext('2d');
  const img = x.createImageData(W, H), d = img.data;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const [r, g, b, a = 255] = fn(px, py);
    const i = (py * W + px) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  x.putImageData(img, 0, 0);
  return c;
}

const fbm = (x, y) => noise2(x, y) * 0.5 + noise2(x * 2.1, y * 2.1) * 0.3 + noise2(x * 4.3, y * 4.3) * 0.2;

function paper(base, { fiber = 6, tooth = 4, seed = 1 } = {}) {
  const r = rng(seed);
  return pixels((x, y) => {
    const n = (fbm(x * 0.01, y * 0.01) - 0.5) * fiber + (noise2(x * 0.35, y * 0.35) - 0.5) * tooth + (r() - 0.5) * 3;
    return [base[0] + n, base[1] + n, base[2] + n * 0.95];
  });
}

function lighting(ctx, strength = 0.16) {
  const g = ctx.createRadialGradient(W * 0.25, H * 0.15, 100, W * 0.5, H * 0.55, H * 0.9);
  g.addColorStop(0, `rgba(255,250,235,${strength * 0.6})`);
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(20,15,10,${strength * 1.6})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

const SURFACES = {
  notebook(ctx) {
    ctx.drawImage(paper([250, 250, 245], { seed: 2 }), 0, 0);
    ctx.strokeStyle = 'rgba(90,140,200,0.45)';
    ctx.lineWidth = 2;
    for (let y = 240; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,70,70,0.55)';
    ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, H); ctx.moveTo(156, 0); ctx.lineTo(156, H); ctx.stroke();
    for (const y of [380, 960, 1540]) {
      const g = ctx.createRadialGradient(62, y - 4, 4, 62, y, 30);
      g.addColorStop(0, '#5b4a3a'); g.addColorStop(0.8, '#3a2f25'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(62, y, 30, 0, Math.PI * 2); ctx.fill();
    }
    lighting(ctx, 0.14);
  },
  journal(ctx) {
    ctx.drawImage(paper([242, 233, 213], { fiber: 8, seed: 3 }), 0, 0);
    ctx.fillStyle = 'rgba(120,95,60,0.28)';
    for (let x = 70; x < W; x += 54) for (let y = 40; y < H; y += 54) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    const g = ctx.createLinearGradient(0, 0, 160, 0);
    g.addColorStop(0, 'rgba(60,40,20,0.45)'); g.addColorStop(0.35, 'rgba(60,40,20,0.12)'); g.addColorStop(1, 'rgba(60,40,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 160, H);
    ctx.fillStyle = '#4a2c1a'; ctx.fillRect(W - 26, 0, 26, H);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#efe3c8' : '#ddd0b2'; ctx.fillRect(W - 40 + k * 2, 0, 2, H); }
    lighting(ctx, 0.2);
  },
  sketchbook(ctx) {
    ctx.drawImage(paper([247, 246, 241], { fiber: 5, tooth: 11, seed: 4 }), 0, 0);
    lighting(ctx, 0.12);
  },
  whiteboard(ctx) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#f7f8f8'); g.addColorStop(0.45, '#eef0f1'); g.addColorStop(0.5, '#fbfcfc'); g.addColorStop(0.58, '#eceef0'); g.addColorStop(1, '#e4e7e9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // ghosts of old, erased writing
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.strokeStyle = 'rgba(120,130,140,0.07)'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    const r = rng(9);
    for (let i = 0; i < 9; i++) { ctx.beginPath(); const x = r() * W, y = r() * H; ctx.moveTo(x, y); ctx.bezierCurveTo(x + 200, y - 80, x + 300, y + 90, x + 480, y + 10); ctx.stroke(); }
    ctx.restore();
    const f = ctx.createLinearGradient(0, 0, 0, 40);
    f.addColorStop(0, '#c9cdd1'); f.addColorStop(0.5, '#f1f3f4'); f.addColorStop(1, '#9aa0a6');
    ctx.fillStyle = f; ctx.fillRect(0, 0, W, 40);
    lighting(ctx, 0.08);
  },
  chalkboard(ctx) {
    const r = rng(6);
    ctx.drawImage(pixels((x, y) => {
      const n = (fbm(x * 0.004, y * 0.004) - 0.5) * 16 + (noise2(x * 0.4, y * 0.4) - 0.5) * 7 + (r() - 0.5) * 6;
      return [34 + n, 46 + n, 40 + n];
    }), 0, 0);
    ctx.save(); ctx.filter = 'blur(18px)'; ctx.strokeStyle = 'rgba(230,235,225,0.07)'; ctx.lineWidth = 120; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); const x = r() * W, y = r() * H; ctx.moveTo(x - 300, y); ctx.bezierCurveTo(x - 100, y - 120, x + 100, y + 120, x + 300, y - 20); ctx.stroke(); }
    ctx.restore();
    const f = ctx.createLinearGradient(0, 0, 0, 56);
    f.addColorStop(0, '#6b4528'); f.addColorStop(0.5, '#8a5a35'); f.addColorStop(1, '#4b2f1a');
    ctx.fillStyle = f; ctx.fillRect(0, 0, W, 56);
    lighting(ctx, 0.18);
  },
};

// Speckle mask that eats into the ink where the paper's tooth stops the tool.
function grainMask(amount, scale, seed) {
  const r = rng(seed);
  return pixels((x, y) => {
    const n = noise2(x * scale, y * scale) * 0.6 + r() * 0.4;
    return [0, 0, 0, Math.max(0, Math.min(255, (n - (1 - amount)) * 255 / amount))];
  });
}

// ── Realistic writing tools ─────────────────────────────────────────────────
// Each tool is a list of sections from the tip backwards; each section is shaded as a cylinder.
function cylFill(ctx, x0, len, w0, w1, colors, hex = false) {
  const wm = Math.max(w0, w1);
  ctx.beginPath();
  ctx.moveTo(x0, -w0 / 2); ctx.lineTo(x0 + len, -w1 / 2); ctx.lineTo(x0 + len, w1 / 2); ctx.lineTo(x0, w0 / 2); ctx.closePath();
  if (hex) {
    ctx.save(); ctx.clip();
    [[-0.5, -0.17, colors[2]], [-0.17, 0.17, colors[1]], [0.17, 0.5, colors[0]]].forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(x0, a * wm, len, (b - a) * wm); });
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2;
    for (const k of [-0.17, 0.17]) { ctx.beginPath(); ctx.moveTo(x0, k * wm); ctx.lineTo(x0 + len, k * wm); ctx.stroke(); }
    ctx.restore();
    return;
  }
  const g = ctx.createLinearGradient(0, -wm / 2, 0, wm / 2);
  const [edge, base, hi] = colors;
  g.addColorStop(0, edge); g.addColorStop(0.18, base); g.addColorStop(0.32, hi); g.addColorStop(0.44, base); g.addColorStop(0.82, edge); g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.fill();
}

const TOOLS = {
  ballpoint: {
    angle: 0.9, sections: [
      [0, 14, 3, 7, ['#777', '#bbb', '#fff']], [14, 42, 7, 26, ['#6d7278', '#b9bec4', '#ffffff']],
      [56, 170, 30, 34, ['#0b0b0d', '#26272b', '#6a6c72'], 'grip'], [226, 640, 34, 34, ['#0b1a3a', '#1f3f86', '#7f9fe0']],
      [866, 70, 34, 28, ['#091530', '#18346f', '#6a88cc']],
    ], clip: [700, 330, 9, ['#5c6168', '#c9ced4', '#ffffff']],
  },
  fountain: {
    angle: 0.92, nib: true, sections: [
      [78, 95, 26, 32, ['#050505', '#151515', '#8a8a8a']], [173, 9, 34, 34, ['#7a5a12', '#d4a93a', '#fff3c4']],
      [182, 560, 36, 38, ['#030303', '#121212', '#9a9a9a']], [742, 9, 38, 38, ['#7a5a12', '#d4a93a', '#fff3c4']],
      [751, 160, 40, 38, ['#030303', '#121212', '#9a9a9a']],
    ], clip: [760, 200, 10, ['#7a5a12', '#d4a93a', '#fff3c4']],
  },
  pencil: {
    angle: 0.88, sections: [
      [0, 22, 1, 9, ['#2b2b2e', '#4b4b50', '#9a9aa2']], [22, 88, 9, 42, ['#b9874f', '#e8c08a', '#f7dcb3']],
      [110, 760, 42, 42, ['#f6cf46', '#e3ac16', '#bd8a08'], 'hex'], [870, 56, 44, 44, ['#6c6f73', '#c3c6ca', '#ffffff'], 'ferrule'],
      [926, 46, 40, 40, ['#b9545a', '#e58a8f', '#f7c3c5']],
    ],
  },
  marker: {
    angle: 0.86, sections: [
      [0, 26, 9, 18, ['#000', '#1b1b1b', '#555']], [26, 34, 26, 40, ['#8a8f94', '#c8ccd0', '#f4f6f7']],
      [60, 470, 54, 56, ['#a7adb3', '#e6e9ec', '#ffffff']], [210, 120, 56, 56, ['#050505', '#1c1c1c', '#5a5a5a']],
      [530, 190, 60, 60, ['#050505', '#191919', '#666']],
    ], clip: [560, 180, 14, ['#050505', '#262626', '#777']],
  },
  chalk: { angle: 0.82, chalk: true },
};

function toolSilhouette(ctx, tool) {
  ctx.beginPath();
  if (tool.chalk) { ctx.rect(0, -22, 300, 44); return; }
  for (const [x0, len, w0, w1] of tool.sections) { ctx.rect(x0, -Math.max(w0, w1) / 2, len, Math.max(w0, w1)); }
  if (tool.nib) { ctx.moveTo(0, 0); ctx.lineTo(80, -17); ctx.lineTo(80, 17); ctx.closePath(); }
}

function drawTool(ctx, tool, tip) {
  ctx.save();
  ctx.translate(tip[0], tip[1]);
  ctx.rotate(tool.angle);
  ctx.scale(tool.chalk ? 1.5 : 1.65, tool.chalk ? 1.5 : 1.65);
  // Cast shadow: touches the paper at the tip and falls away as the pen rises.
  ctx.save();
  ctx.transform(1.0, 0.16, 0, 1, 0, 0);
  ctx.translate(26, 22);
  ctx.filter = 'blur(14px)';
  ctx.fillStyle = 'rgba(25,18,10,0.30)';
  toolSilhouette(ctx, tool);
  ctx.fill();
  ctx.restore();
  ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(4, 3, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  if (tool.chalk) {
    const r = rng(12);
    ctx.beginPath(); ctx.moveTo(4, -14);
    for (let x = 10; x <= 300; x += 10) ctx.lineTo(x, -21 - r() * 3);
    ctx.lineTo(304, 0);
    for (let x = 300; x >= 10; x -= 10) ctx.lineTo(x, 21 + r() * 3);
    ctx.lineTo(4, 14); ctx.quadraticCurveTo(-4, 0, 4, -14); ctx.closePath();
    const g = ctx.createLinearGradient(0, -24, 0, 24);
    g.addColorStop(0, '#bdbab0'); g.addColorStop(0.3, '#fbfaf5'); g.addColorStop(0.7, '#e9e6dc'); g.addColorStop(1, '#a9a69c');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(120,115,105,0.35)';
    for (let i = 0; i < 260; i++) ctx.fillRect(r() * 300, (r() - 0.5) * 40, 2, 2);
    ctx.restore();
    return;
  }

  for (const [x0, len, w0, w1, colors, kind] of tool.sections) {
    cylFill(ctx, x0, len, w0, w1, colors, kind === 'hex');
    if (kind === 'grip' || kind === 'ferrule') {
      ctx.strokeStyle = kind === 'grip' ? 'rgba(0,0,0,0.5)' : 'rgba(60,60,60,0.45)'; ctx.lineWidth = 2;
      for (let x = x0 + 8; x < x0 + len - 4; x += kind === 'grip' ? 9 : 12) { ctx.beginPath(); ctx.moveTo(x, -Math.max(w0, w1) / 2); ctx.lineTo(x, Math.max(w0, w1) / 2); ctx.stroke(); }
    }
    if (len > 60 && kind !== 'hex') {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x0 + 6, -Math.max(w0, w1) * 0.24, len - 12, Math.max(2, Math.max(w0, w1) * 0.06));
    }
  }
  if (tool.nib) {
    const g = ctx.createLinearGradient(0, -17, 0, 17);
    g.addColorStop(0, '#6e5110'); g.addColorStop(0.3, '#e9c25a'); g.addColorStop(0.45, '#fff2bf'); g.addColorStop(0.6, '#d4a93a'); g.addColorStop(1, '#6e5110');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, -6, 82, -17); ctx.lineTo(82, 17); ctx.quadraticCurveTo(40, 6, 0, 0); ctx.fill();
    ctx.strokeStyle = '#3a2a06'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(46, 0); ctx.stroke();
    ctx.fillStyle = '#3a2a06'; ctx.beginPath(); ctx.arc(50, 0, 3.6, 0, Math.PI * 2); ctx.fill();
  }
  if (tool.clip) {
    const [x0, len, w, colors] = tool.clip;
    ctx.save(); ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 4, -w / 2 + 3, len, w); ctx.restore();
    cylFill(ctx, x0, len, w, w, colors);
  }
  ctx.restore();
}

// ── The five looks ──────────────────────────────────────────────────────────
const LOOKS = [
  { name: 'Notebook · blue ballpoint', surface: 'notebook', tool: TOOLS.ballpoint, font: 'nothing-you-could-do/files/nothing-you-could-do-latin-400-normal.woff', size: 92,
    ink: '#1f3d93', soft: 'rgba(31,61,147,0.75)', accent: '#c4302b', w: 4.2, blend: 'multiply', grain: [0.18, 0.9] },
  { name: 'Journal · fountain pen', surface: 'journal', tool: TOOLS.fountain, font: 'homemade-apple/files/homemade-apple-latin-400-normal.woff', size: 68,
    ink: '#16161f', soft: 'rgba(22,22,31,0.7)', accent: '#8b1e2d', w: 4.6, blend: 'multiply', grain: [0.06, 0.9], bleed: 1.4 },
  { name: 'Sketchbook · graphite pencil', surface: 'sketchbook', tool: TOOLS.pencil, font: 'shadows-into-light/files/shadows-into-light-latin-400-normal.woff', size: 100,
    ink: '#3f3f42', soft: 'rgba(63,63,66,0.65)', accent: '#b8352a', w: 4.4, blend: 'multiply', grain: [0.5, 0.45], alpha: 0.9 },
  { name: 'Whiteboard · marker', surface: 'whiteboard', tool: TOOLS.marker, font: 'kalam/files/kalam-latin-700-normal.woff', size: 92,
    ink: '#141414', soft: 'rgba(20,20,20,0.6)', accent: '#d42a2a', w: 10, blend: 'source-over', grain: [0.08, 0.2], alpha: 0.94 },
  { name: 'Chalkboard · chalk', surface: 'chalkboard', tool: TOOLS.chalk, font: 'gloria-hallelujah/files/gloria-hallelujah-latin-400-normal.woff', size: 84,
    ink: '#f1efe6', soft: 'rgba(241,239,230,0.7)', accent: '#f2c14e', w: 8, blend: 'source-over', grain: [0.55, 0.5], alpha: 0.92 },
];

function renderLook(look, i) {
  const font = loadFont(look.font);
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  SURFACES[look.surface](ctx);

  // The opening scene, caught while the pen writes its last line.
  const els = [
    new Text(font, 'Every single day,', 560, 480, look.size, 0, 1, { color: look.ink }),
    new Strokes(G.line(200, 600, 940, 600, { wob: 3 }), 0, 1, { w: look.w * 2.2, color: look.ink }),
    new Text(font, 'of your story.', 560, 720, look.size * 0.72, 0, 1, { color: look.soft }),
    new Strokes([...G.figure(500, 1300, 1.4, 'hold'), ...G.penDoodle(582, 1094, 145, -1.0, 20)], 0, 1, { w: look.w * 1.3, color: look.ink }),
    new Strokes(G.ellipse(622, 1030, 105, 118, { wob: 2 }), 0, 1, { w: look.w * 1.4, color: look.accent }),
  ];
  const writing = new Text(font, 'most people never notice...', 560, 1520, look.size * 0.62, 0, 1, { color: look.soft });
  const T = 0.62;

  const ink = createCanvas(W, H), ic = ink.getContext('2d');
  if (look.bleed) { ic.shadowColor = look.ink; ic.shadowBlur = look.bleed; }
  const env = { step: 0 };
  for (const el of els) el.draw(ic, 1, env);
  writing.draw(ic, T, env);
  ic.shadowBlur = 0;
  ic.globalCompositeOperation = 'destination-out';
  ic.drawImage(grainMask(look.grain[0], look.grain[1], 30 + i), 0, 0);

  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  ctx.globalCompositeOperation = look.blend;
  ctx.drawImage(ink, 0, 0);
  ctx.restore();
  if (look.surface === 'chalkboard') {
    ctx.save(); ctx.globalAlpha = 0.25; ctx.filter = 'blur(6px)'; ctx.drawImage(ink, 0, 0); ctx.restore();
  }

  drawTool(ctx, look.tool, writing.tip(T));
  fs.writeFileSync(`${root}out/look_${i + 1}.png`, canvas.toBuffer('image/png'));
  return canvas;
}

fs.mkdirSync(`${root}out`, { recursive: true });
const frames = LOOKS.map(renderLook);

// A side-by-side sheet with the names, for picking one.
const tw = 360, th = 640, sheet = createCanvas(tw * 5 + 60, th + 130), sc = sheet.getContext('2d');
sc.fillStyle = '#1b1b1d'; sc.fillRect(0, 0, sheet.width, sheet.height);
const label = loadFont('kalam/files/kalam-latin-700-normal.woff');
frames.forEach((f, i) => {
  const x = 10 + i * (tw + 12);
  sc.drawImage(f, x, 10, tw, th);
  sc.fillStyle = '#f2f2f2';
  sc.fill(new Path2D(label.getPath(`${i + 1}. ${LOOKS[i].name}`, x + 6, th + 60, 26).toPathData(1)));
});
fs.writeFileSync(`${root}out/looks_sheet.png`, sheet.toBuffer('image/png'));
console.log('looks written');

// One-to-five-frame hand-drawn impact flashes that punctuate the cuts.
import { C, text, hatch, scribbleLine } from '../draw2d.js';
import { rng, TAU, prog, E, lerp } from '../util.js';

// Radial spikes around (cx, cy).
export function burst(g, cx, cy, n, r0, r1, color, seed = 1, rot = 0, width = 0.5) {
  const r = rng(seed);
  g.save(); g.fillStyle = color; g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU + (r() - 0.5) * 0.12, w = (TAU / n) * width * (0.5 + r());
    const inner = r0 * (0.6 + r() * 0.8), outer = r1 * (0.55 + r() * 0.6);
    g.moveTo(cx + Math.cos(a - w / 2) * outer, cy + Math.sin(a - w / 2) * outer);
    g.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g.lineTo(cx + Math.cos(a + w / 2) * outer, cy + Math.sin(a + w / 2) * outer);
  }
  g.fill(); g.restore();
}

export function dots(g, x, y, w, h, color, cell = 16, seed = 1) {
  g.save(); g.fillStyle = color;
  for (let j = 0; j * cell < h; j++) for (let i = 0; i * cell < w; i++) {
    const d = Math.hypot((i * cell) / w - 0.5, (j * cell) / h - 0.5) * 2;
    const rad = Math.max(0, 1 - d) * cell * 0.5;
    if (rad > 0.6) { g.beginPath(); g.arc(x + i * cell + (j % 2) * cell * 0.5, y + j * cell, rad, 0, TAU); g.fill(); }
  }
  g.restore();
}

export function scribbles(g, W, H, color, seed, n = 14) {
  const r = rng(seed);
  g.save(); g.strokeStyle = color; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, w = 80 + r() * 260, h = 50 + r() * 160;
    g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 1.2);
    g.lineWidth = 2 + r() * 3; g.strokeRect(-w / 2, -h / 2, w, h);
    hatch(g, -w / 2, -h / 2, w, h, r, 9, color);
    g.restore();
  }
  g.restore();
}

export default function flashScenes(ctx) {
  const { W, H } = ctx;

  // 9.05–9.5: speed lines -> brush smear -> hot pink impact
  function impact(lt) {
    const g = ctx.g, f = Math.min(2, Math.floor(lt / 0.1)); // three beats
    if (f <= 0) { // white-out with hairline rays and a small smear at the centre
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      burst(g, W * 0.5, H * 0.52, 110, 120, 1300, 'rgba(70,50,110,.45)', 12, 0.2, 0.07);
      burst(g, W * 0.5, H * 0.52, 40, 90, 900, 'rgba(240,60,170,.35)', 9, 0, 0.12);
      g.save(); g.translate(W * 0.44, H * 0.56); g.rotate(-0.12);
      g.fillStyle = '#f08ae0'; g.fillRect(-120, -22, 230, 44); g.fillStyle = '#6a3df0'; g.fillRect(90, -60, 16, 120); g.restore();
      ctx.layers.add(W * 0.34, H * 0.44, W * 0.26, H * 0.22);
    } else if (f === 1) { // a fat violet brush stroke across magenta halftone
      g.fillStyle = '#f7a8ee'; g.fillRect(0, 0, W, H);
      dots(g, -W * 0.1, -H * 0.1, W * 0.8, H * 1.2, 'rgba(226,40,190,.55)', 17);
      dots(g, W * 0.4, H * 0.1, W * 0.8, H * 1.1, 'rgba(255,255,255,.6)', 17);
      scribbles(g, W, H, 'rgba(190,20,150,.5)', 33, 8);
      g.save(); g.translate(W * 0.47, H * 0.5); g.rotate(-0.42);
      const grd = g.createLinearGradient(-900, 0, 900, 0);
      grd.addColorStop(0, '#3a1aa8'); grd.addColorStop(0.5, '#5a2be0'); grd.addColorStop(1, '#7a45ea');
      g.fillStyle = grd;
      const r = rng(8); g.beginPath(); g.moveTo(-820, -80);
      for (let x = -820; x <= 760; x += 50) g.lineTo(x, -100 - r() * 30);
      g.quadraticCurveTo(880, 0, 760, 120);
      for (let x = 760; x >= -820; x -= 50) g.lineTo(x, 104 + r() * 36);
      g.closePath(); g.fill(); g.restore();
      ctx.layers.add(W * 0.08, H * 0.3, W * 0.8, H * 0.4, { rot: -0.42 });
    } else {
      g.fillStyle = '#ff4fc0'; g.fillRect(0, 0, W, H);
      burst(g, W * 0.5, H * 0.52, 44, 120, 1500, '#ffc4ee', 21, 0.1, 0.55);
      burst(g, W * 0.5, H * 0.52, 30, 60, 900, '#b8189a', 22, 0.3, 0.3);
      burst(g, W * 0.5, H * 0.52, 26, 30, 520, '#ffffff', 23, 0.6, 0.4);
      dots(g, W * 0.3, H * 0.2, W * 0.4, H * 0.64, 'rgba(184,24,154,.55)', 18);
      scribbles(g, W, H, 'rgba(160,10,120,.75)', 31, 12);
      g.fillStyle = '#5a2be0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H * 0.06); g.quadraticCurveTo(W * 0.55, H * 0.3, 0, H * 0.14); g.closePath(); g.fill();
      ctx.layers.add(W * 0.2, H * 0.12, W * 0.6, H * 0.76);
    }
    return { glow: 0.25, grain: 0.14, mark: f >= 2 ? 1 : 0.5, markColor: f >= 2 ? 'rgba(255,255,255,.9)' : 'rgba(60,40,90,.5)' };
  }

  // 11.37–11.67: marker silhouette on magenta, then on pale blue, then a white burst
  function sketch(lt) {
    const g = ctx.g, f = Math.min(2, Math.floor(lt / 0.1));
    if (f === 2) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      burst(g, W * 0.52, H * 0.52, 80, 150, 1400, 'rgba(120,110,150,.35)', 71, 0.3, 0.16);
      burst(g, W * 0.52, H * 0.52, 30, 100, 900, 'rgba(255,90,150,.25)', 72, 0.1, 0.2);
      g.save(); g.translate(W * 0.52, H * 0.56); g.rotate(1.25); g.fillStyle = '#ff2d7a'; g.fillRect(-90, -16, 180, 32); g.restore();
      ctx.layers.add(W * 0.46, H * 0.44, W * 0.12, H * 0.26);
      return { glow: 0.2, grain: 0.12, markColor: 'rgba(60,40,120,.4)' };
    }
    const grd = g.createLinearGradient(0, 0, W, H);
    if (f === 0) { grd.addColorStop(0, '#ff8fe6'); grd.addColorStop(0.5, '#ffd0f4'); grd.addColorStop(1, '#f45ad6'); }
    else { grd.addColorStop(0, '#eaf2ff'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#cfe0ff'); }
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = f === 0 ? '#ffffff' : '#9ab6ff';
    for (let i = 0; i < 5; i++) { g.save(); g.translate(W * 0.42 + i * 70, H * 0.5); g.rotate(-1.05); g.fillRect(-18, -900, 36 + i * 8, 1800); g.restore(); }
    g.restore();
    scribbles(g, W, H, f === 0 ? 'rgba(200,20,160,.8)' : 'rgba(226,40,170,.85)', 51 + f, 16);
    g.save(); g.translate(W * 0.6, H * 0.45); g.rotate(-0.42);
    g.fillStyle = f === 0 ? '#b21cf0' : '#7a3df0'; g.fillRect(-340, -44, 760, 88);
    g.beginPath(); g.moveTo(-340, -44); g.lineTo(-420, -30); g.lineTo(-470, 0); g.lineTo(-420, 30); g.lineTo(-340, 44); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-250, -44, 14, 88);
    g.restore();
    ctx.layers.add(W * 0.3, H * 0.3, W * 0.56, H * 0.3, { rot: -0.42 });
    return { glow: 0.2, grain: 0.14, markColor: 'rgba(60,40,120,.6)' };
  }

  // 15.57–15.77: hot-pink wireframe umbrella, then a magenta burst on white
  function umbrellaFlash(lt) {
    const g = ctx.g, f = lt < 0.1 ? 0 : 1;
    const umb = (cx, cy, s, stroke, fill) => {
      g.save(); g.translate(cx, cy); g.rotate(-0.1); g.scale(s, s);
      g.beginPath(); g.moveTo(-210, 10); g.bezierCurveTo(-150, -90, 150, -90, 210, 10);
      for (let i = 4; i >= -4; i -= 2) g.quadraticCurveTo(i * 52 - 26, -18, (i - 1) * 52, 12);
      g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); }
      g.strokeStyle = stroke; g.lineWidth = 5 / s; g.stroke();
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, -70); g.quadraticCurveTo(i * 40, -50, i * 60, 8); g.stroke(); }
      g.beginPath(); g.moveTo(0, -78); g.lineTo(0, 170); g.arc(22, 170, 22, Math.PI, 0, true); g.stroke(); g.restore();
    };
    if (f === 0) {
      const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#ff5aa0'); grd.addColorStop(0.5, '#ff2d86'); grd.addColorStop(1, '#ffc0dc');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      dots(g, -100, H * 0.3, W * 0.5, H * 0.8, 'rgba(255,255,255,.3)', 16);
      scribbles(g, W, H, 'rgba(255,255,255,.55)', 64, 9);
      umb(W * 0.5, H * 0.36, 1.25, 'rgba(255,255,255,.95)', 'rgba(170,40,200,.35)');
      ctx.layers.add(W * 0.34, H * 0.2, W * 0.32, H * 0.42);
      return { glow: 0.3, grain: 0.14 };
    }
    g.fillStyle = '#fdf7fa'; g.fillRect(0, 0, W, H);
    burst(g, W * 0.5, H * 0.46, 54, 60, 1050, '#f23ad0', 61, 0.2, 0.34);
    burst(g, W * 0.5, H * 0.46, 30, 40, 520, '#ff8fe0', 62, 0.5, 0.3);
    umb(W * 0.5, H * 0.36, 0.62, '#e8a070', '#f7b58a');
    ctx.layers.add(W * 0.4, H * 0.24, W * 0.2, H * 0.3);
    return { glow: 0.25, grain: 0.12, markColor: 'rgba(120,90,130,.4)' };
  }

  return [
    { id: 'impact', start: 9.07, end: 9.37, render: impact, flat: true },
    { id: 'sketch', start: 11.37, end: 11.67, render: sketch, flat: true },
    { id: 'umbrellaFlash', start: 15.57, end: 15.77, render: umbrellaFlash, flat: true },
  ];
}

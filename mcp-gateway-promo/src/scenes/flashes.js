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
    const g = ctx.g, f = Math.floor(lt * 30 / 4.5); // three beats
    if (f <= 0) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      const r = rng(4);
      g.fillStyle = '#17121f';
      for (let i = 0; i < 26; i++) {
        const y = r() * H, len = 300 + r() * 900, th = 6 + r() * 26, x0 = -40;
        g.beginPath(); g.moveTo(x0, y - th / 2); g.lineTo(x0 + len, y + (H / 2 - y) * 0.25); g.lineTo(x0, y + th / 2); g.fill();
      }
      burst(g, W * 0.62, H * 0.5, 60, 340, 1500, 'rgba(240,60,170,.25)', 9, 0, 0.35);
      ctx.layers.add(40, 80, W * 0.6, H - 160);
    } else if (f === 1) {
      g.fillStyle = '#fbf6ff'; g.fillRect(0, 0, W, H);
      burst(g, W * 0.52, H * 0.52, 90, 180, 1300, 'rgba(40,20,70,.55)', 12, 0.2, 0.12);
      g.save(); g.translate(W * 0.5, H * 0.5); g.rotate(-0.32);
      const grd = g.createLinearGradient(-800, 0, 800, 0);
      grd.addColorStop(0, '#c9a5f2'); grd.addColorStop(0.55, '#a05cf0'); grd.addColorStop(0.8, '#6a2be0'); grd.addColorStop(1, '#ff3a6e');
      g.fillStyle = grd;
      const r = rng(8); g.beginPath(); g.moveTo(-900, -110);
      for (let x = -900; x <= 760; x += 60) g.lineTo(x, -130 - r() * 40);
      g.quadraticCurveTo(900, 0, 760, 150);
      for (let x = 760; x >= -900; x -= 60) g.lineTo(x, 140 + r() * 46);
      g.closePath(); g.fill(); g.restore();
      ctx.layers.add(W * 0.12, H * 0.3, W * 0.76, H * 0.4, { rot: -0.32 });
    } else {
      g.fillStyle = '#ff4fc0'; g.fillRect(0, 0, W, H);
      burst(g, W * 0.5, H * 0.52, 44, 120, 1500, '#ffc4ee', 21, 0.1, 0.55);
      burst(g, W * 0.5, H * 0.52, 30, 60, 900, '#b8189a', 22, 0.3, 0.3);
      burst(g, W * 0.5, H * 0.52, 26, 30, 520, '#ffffff', 23, 0.6, 0.4);
      dots(g, W * 0.3, H * 0.2, W * 0.4, H * 0.64, 'rgba(184,24,154,.55)', 18);
      scribbles(g, W, H, 'rgba(160,10,120,.75)', 31, 12);
      ctx.layers.add(W * 0.2, H * 0.12, W * 0.6, H * 0.76);
    }
    return { glow: 0.25, grain: 0.14, mark: f >= 2 ? 1 : 0.5, markColor: f >= 2 ? 'rgba(255,255,255,.9)' : 'rgba(60,40,90,.5)' };
  }

  // 11.5–11.67: sketchy marker frame
  function sketch() {
    const g = ctx.g;
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#eaf2ff'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#cfe0ff');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#9ab6ff';
    for (let i = 0; i < 5; i++) { g.save(); g.translate(W * 0.42 + i * 70, H * 0.5); g.rotate(-1.05); g.fillRect(-18, -900, 36 + i * 8, 1800); g.restore(); }
    g.restore();
    scribbles(g, W, H, 'rgba(226,40,170,.85)', 51, 16);
    g.save(); g.translate(W * 0.55, H * 0.5); g.rotate(-0.42);
    g.fillStyle = '#7a3df0'; g.fillRect(-340, -44, 700, 88);
    g.beginPath(); g.moveTo(-340, -44); g.lineTo(-420, -30); g.lineTo(-470, 0); g.lineTo(-420, 30); g.lineTo(-340, 44); g.fill();
    g.fillStyle = '#a77bff'; g.fillRect(-250, -44, 14, 88);
    g.restore();
    ctx.layers.add(W * 0.28, H * 0.36, W * 0.52, H * 0.28, { rot: -0.42 });
    return { glow: 0.2, grain: 0.14, markColor: 'rgba(60,40,120,.6)' };
  }

  // 15.67–15.83: violet + cyan burst with an umbrella silhouette
  function violet() {
    const g = ctx.g;
    g.fillStyle = '#6d5cf5'; g.fillRect(0, 0, W, H);
    burst(g, W * 0.5, H * 0.56, 46, 90, 1250, '#35d6f0', 61, 0.2, 0.5);
    burst(g, W * 0.5, H * 0.56, 30, 60, 620, '#aef3ff', 62, 0.5, 0.3);
    dots(g, 0, H * 0.45, W * 0.3, H * 0.55, 'rgba(255,255,255,.22)', 16);
    g.save(); g.translate(W * 0.5, H * 0.54); g.rotate(-0.08);
    g.fillStyle = '#4a1f3a'; g.beginPath(); g.moveTo(-210, 10);
    g.bezierCurveTo(-150, -80, 150, -80, 210, 10);
    for (let i = 4; i >= -4; i -= 2) g.quadraticCurveTo(i * 52 - 26, -18, (i - 1) * 52, 12);
    g.closePath(); g.fill();
    g.strokeStyle = '#4a1f3a'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 150); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(W * 0.42, H * 0.2); g.quadraticCurveTo(W * 0.6, H * 0.14, W * 0.72, H * 0.3); g.stroke();
    ctx.layers.add(W * 0.36, H * 0.4, W * 0.28, H * 0.32);
    return { glow: 0.25, grain: 0.14 };
  }

  return [
    { id: 'impact', start: 9.05, end: 9.5, render: impact, flat: true },
    { id: 'sketch', start: 11.5, end: 11.67, render: sketch, flat: true },
    { id: 'violet', start: 15.67, end: 15.83, render: violet, flat: true },
  ];
}

'use strict';
// Island's own pieces: Bloub (the mascot), the agent colours and the black
// island shape. Colours and copy come from the dynamic-island-windows README.

const AGENTS = [
  { name: 'aurora-web', body: [74, 142, 255] },
  { name: 'pixel-api', body: [240, 82, 98] },
  { name: 'notes-cli', body: [142, 104, 246] },
  { name: 'orbit-landing', body: [246, 104, 182] },
];
const BLUE = [10, 132, 255], VIOLET = [94, 92, 230], ORANGE = [255, 159, 10], GREEN = [48, 209, 88];

function blinkAt(t, times, d = 0.16) {
  for (const b of times) { const k = t - b; if (k >= 0 && k < d) return Math.sin((k / d) * Math.PI); }
  return 0;
}
// Bloub: a shaded sphere with two black pill eyes
function bloub(ctx, cx, cy, r, o = {}) {
  const body = o.body || [236, 236, 242];
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05);
  g.addColorStop(0, rgb(mix(body, [255, 255, 255], 0.75)));
  g.addColorStop(0.45, rgb(body));
  g.addColorStop(1, rgb(mix(body, [70, 70, 90], 0.35)));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, r * (o.sx || 1), r * (o.sy || 1), 0, 0, TAU); ctx.fill();
  const [lx, ly] = o.look || [0, 0];
  const blink = clamp(o.blink || 0);
  const eh = r * 0.42 * (1 - blink * 0.9), ew = r * 0.17;
  ctx.fillStyle = o.eye || '#141418';
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.24 + lx * r * 0.18, ey = cy + ly * r * 0.15;
    rrect(ctx, ex - ew / 2, ey - eh / 2, ew, eh, ew / 2); ctx.fill();
  }
  ctx.restore();
}
// the black island with Bloub's eyes on the left and an optional label
function islandPill(ctx, cx, cy, w, h, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.shadowColor = 'rgba(20,10,40,0.25)'; ctx.shadowBlur = h * 0.5; ctx.shadowOffsetY = h * 0.12;
  ctx.fillStyle = '#050506'; rrect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(h / 2, o.r ?? h / 2)); ctx.fill();
  ctx.restore();
  if (o.eyes !== false && h > 8) pauseBars(ctx, cx - w / 2 + h / 2 + 3, cy, h * 0.22, h * 0.1, h * 0.38, [246, 246, 250], o.blink || 0);
  if (o.label) text(ctx, o.label, cx + w / 2 - h * 0.6, cy + h * 0.13, { size: h * 0.32, color: [170, 170, 180], align: 'right', alpha: o.alpha ?? 1 });
  if (o.dots) o.dots.forEach((c, i) => bloub(ctx, cx + w / 2 - h * 0.55 - i * h * 0.34, cy, h * 0.2, { body: c, blink: 0 }));
}

import * as THREE from 'three';

export const FONT_DISPLAY = '"Reem Kufi", "Cairo", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';
export const FONT_BODY = '"Cairo", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

let maxAniso = 4;
export function setAnisotropy(n) { maxAniso = n; }

function canvasTexture(canvas, { repeat = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Draws right-to-left text; the browser does the Arabic shaping.
function rtlText(ctx, text, x, y, font, maxWidth) {
  ctx.direction = 'rtl';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, maxWidth);
}

// Text "painted" into the sand: transparent background, used on ground decals.
export function groundText(lines, { width = 2048, height = 512, color = 'rgba(122, 72, 34, 0.9)' } = {}) {
  const [c, ctx] = makeCanvas(width, height);
  ctx.fillStyle = color;
  const total = lines.reduce((s, l) => s + l.size * 1.25, 0);
  let y = (height - total) / 2;
  for (const l of lines) {
    y += (l.size * 1.25) / 2;
    ctx.globalAlpha = l.alpha ?? 1;
    rtlText(ctx, l.text, width / 2, y, `${l.weight || 700} ${l.size}px ${l.font || FONT_DISPLAY}`, width * 0.95);
    y += (l.size * 1.25) / 2;
  }
  return canvasTexture(c);
}

// Sand albedo with wind ripples and grain, tiled across the ground.
export function sandTexture(size = 512) {
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#e9c48f';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Tileable ripples: integer frequencies across the tile.
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const r = Math.sin(v * 9 + Math.sin(u * 2) * 1.6 + Math.sin(u * 3 + v) * 0.6);
      const ripple = Math.pow((r + 1) / 2, 4) * 7;
      const grain = (Math.random() - 0.5) * 12;
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, d[i] - ripple + grain));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] - ripple * 1.05 + grain));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] - ripple * 1.1 + grain));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, { repeat: true });
}

// Soft round sprite for dust.
export function dotTexture() {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}

// Two-hoof footprint, used by the instanced footprint decals.
export function hoofTexture() {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = 'rgba(120, 72, 32, 1)';
  for (const dx of [-9, 9]) {
    ctx.beginPath();
    ctx.ellipse(32 + dx, 32, 9, 20, dx > 0 ? 0.08 : -0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(c);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawIcon(ctx, icon, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = ctx.lineJoin = 'round';
  if (icon === 'tent') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, s * 0.4);
    ctx.lineTo(0, -s * 0.45);
    ctx.lineTo(s * 0.6, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.4);
    ctx.lineTo(0, s * 0.02);
    ctx.lineTo(s * 0.12, s * 0.4);
    ctx.fill();
  } else if (icon === 'pen') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.25);
    ctx.bezierCurveTo(-s * 0.2, -s * 0.5, s * 0.1, s * 0.5, s * 0.5, -s * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-s * 0.1, s * 0.45, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? s * 0.22 : s * 0.5;
      const a = (i / 16) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'bag') {
    roundRect(ctx, -s * 0.4, -s * 0.15, s * 0.8, s * 0.6, s * 0.08);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.2, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

// Face of a project board.
export function boardTexture(p) {
  const W = 1024, H = 640;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#f7ead2';
  ctx.fillRect(0, 0, W, H);
  // Illustration band.
  ctx.fillStyle = p.color;
  roundRect(ctx, 40, 40, W - 80, 340, 28);
  ctx.fill();
  // Arabesque dots on the band.
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = 70; y < 370; y += 44) for (let x = 70 + ((y / 44) % 2) * 22; x < W - 60; x += 44) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  drawIcon(ctx, p.icon, W / 2, 210, 200, p.accent);
  ctx.fillStyle = '#2b1d14';
  rtlText(ctx, p.title, W / 2, 460, `700 110px ${FONT_DISPLAY}`, W - 100);
  ctx.fillStyle = '#6b4b33';
  rtlText(ctx, p.subtitle, W / 2, 565, `400 50px ${FONT_BODY}`, W - 100);
  return canvasTexture(c);
}

// Generic wooden sign with a label.
export function signTexture(text, { bg = '#8a5a34', fg = '#fbeed6', sub = '', w = 1024, h = 384 } = {}) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Wood grain.
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 3;
  for (let y = 12; y < h; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.01 + y) * 4);
    ctx.stroke();
  }
  ctx.fillStyle = fg;
  if (sub) {
    rtlText(ctx, text, w / 2, h * 0.4, `700 ${Math.floor(h * 0.36)}px ${FONT_DISPLAY}`, w - 60);
    ctx.globalAlpha = 0.85;
    rtlText(ctx, sub, w / 2, h * 0.78, `400 ${Math.floor(h * 0.15)}px ${FONT_BODY}`, w - 60);
    ctx.globalAlpha = 1;
  } else {
    rtlText(ctx, text, w / 2, h / 2 + h * 0.03, `700 ${Math.floor(h * 0.48)}px ${FONT_DISPLAY}`, w - 60);
  }
  return canvasTexture(c);
}

// Crate face stencilled with a skill name.
export function crateTexture(label, tint = '#c8894f') {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(60,30,10,0.55)';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, S - 16, S - 16);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(16, 16);
  ctx.lineTo(S - 16, S - 16);
  ctx.stroke();
  ctx.fillStyle = 'rgba(250,236,210,0.95)';
  ctx.fillRect(22, S / 2 - 40, S - 44, 80);
  ctx.fillStyle = '#3a2412';
  const latin = /^[\x00-\x7F]+$/.test(label);
  rtlText(ctx, label, S / 2, S / 2 + 2, `700 ${latin ? 38 : 50}px ${latin ? FONT_BODY : FONT_DISPLAY}`, S - 56);
  return canvasTexture(c);
}

// Diamond/geometric tile pattern used for rugs and the saddle blanket.
export function rugTexture(c1 = '#b5473a', c2 = '#2f6f73', c3 = '#f2c14e') {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = c3;
  ctx.fillRect(0, 0, S, 18);
  ctx.fillRect(0, S - 18, S, 18);
  ctx.fillStyle = c2;
  for (let i = 0; i < 4; i++) {
    const cx = 32 + i * 64;
    ctx.beginPath();
    ctx.moveTo(cx, 60);
    ctx.lineTo(cx + 26, 128);
    ctx.lineTo(cx, 196);
    ctx.lineTo(cx - 26, 128);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = c3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(32 + i * 64, 128, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(c, { repeat: true });
}

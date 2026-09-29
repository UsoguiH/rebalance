// world-textures.js - procedural canvas textures (signs, lattice, rugs, glow). DOM required.
import * as THREE from 'three';
import { mulberry32 } from './world-util.js';

export const DISPLAY_FONT = `"Aref Ruqaa", Cairo, Tajawal, "Noto Naskh Arabic", "Noto Sans Arabic", serif`;
export const UI_FONT = `Cairo, Tajawal, "Noto Naskh Arabic", "Noto Sans Arabic", sans-serif`;

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { repeat = false, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Wait (with timeout) for the display fonts, then call cb. Fonts already loaded -> cb fires next microtask. */
export function whenFontsReady(cb, timeout = 2500) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const sample = 'عنّي أهلًا';
  const loads = ['700 64px "Aref Ruqaa"', '700 64px Cairo', '400 64px "Aref Ruqaa"'].map((f) => document.fonts.load(f, sample).catch(() => {}));
  const to = new Promise((r) => setTimeout(r, timeout));
  Promise.race([Promise.all(loads), to]).then(cb);
  document.fonts.ready.then(cb);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function star8(c, cx, cy, R, r) {
  c.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r : R; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  c.closePath();
}

/** Big title sign. Returns { texture, draw() } - call draw() again once fonts load. */
export function makeSignTexture(text, accent = '#ffb347', { w = 1024, h = 384, font = DISPLAY_FONT, sub = null } = {}) {
  const cv = canvas(w, h); const c = cv.getContext('2d');
  const texture = tex(cv, { aniso: 8 });
  function draw() {
    c.clearRect(0, 0, w, h);
    const m = 14;
    // plate
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a2a52'); g.addColorStop(0.55, '#101c3c'); g.addColorStop(1, '#0a1428');
    roundRect(c, m, m, w - 2 * m, h - 2 * m, 46); c.fillStyle = g; c.fill();
    // inner glow
    const rg = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.55);
    rg.addColorStop(0, accent + '55'); rg.addColorStop(1, accent + '00');
    roundRect(c, m, m, w - 2 * m, h - 2 * m, 46); c.fillStyle = rg; c.fill();
    // borders
    c.lineWidth = 9; c.strokeStyle = '#f2c76b'; roundRect(c, m, m, w - 2 * m, h - 2 * m, 46); c.stroke();
    c.lineWidth = 3; c.strokeStyle = accent; roundRect(c, m + 22, m + 22, w - 2 * m - 44, h - 2 * m - 44, 32); c.stroke();
    // corner stars
    c.fillStyle = '#f2c76b';
    for (const [sx, sy] of [[m + 22, m + 22], [w - m - 22, m + 22], [m + 22, h - m - 22], [w - m - 22, h - m - 22]]) { star8(c, sx, sy, 20, 9); c.fill(); }
    // top/bottom ornaments
    c.fillStyle = accent;
    for (const yy of [m + 22, h - m - 22]) { star8(c, w / 2, yy, 15, 6); c.fill(); for (const dx of [-60, 60, -110, 110]) { c.beginPath(); c.arc(w / 2 + dx, yy, 5, 0, 7); c.fill(); } }
    // text
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = h * 0.56;
    c.font = `700 ${size}px ${font}`;
    const maxW = w - 190;
    const mw = c.measureText(text).width;
    if (mw > maxW) { size *= maxW / mw; c.font = `700 ${size}px ${font}`; }
    const ty = h * (sub ? 0.46 : 0.53);
    c.shadowColor = accent; c.shadowBlur = 34; c.fillStyle = accent; c.fillText(text, w / 2, ty);
    c.shadowBlur = 12; c.fillStyle = '#fff3d6'; c.fillText(text, w / 2, ty);
    c.shadowBlur = 0;
    const gr = c.createLinearGradient(0, ty - size * 0.5, 0, ty + size * 0.5);
    gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(242,199,107,0.35)');
    c.fillStyle = gr; c.fillText(text, w / 2, ty);
    if (sub) { c.font = `700 ${h * 0.14}px ${UI_FONT}`; c.fillStyle = '#cfe0ff'; c.fillText(sub, w / 2, h * 0.8); }
    texture.needsUpdate = true;
  }
  draw();
  return { texture, draw };
}

/** Star lattice (mashrabiya) with alpha. White lines; tint with material.color. */
export function makeMashrabiyaTexture() {
  const S = 256; const cv = canvas(S, S); const c = cv.getContext('2d');
  c.clearRect(0, 0, S, S);
  c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
  const cell = S / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const cx = i * cell + cell / 2, cy = j * cell + cell / 2;
    c.lineWidth = 9;
    star8(c, cx, cy, cell * 0.44, cell * 0.24); c.stroke();
    c.lineWidth = 5;
    c.beginPath(); c.arc(cx, cy, cell * 0.11, 0, 7); c.stroke();
    // links to neighbours
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(cx - cell * 0.44, cy); c.lineTo(cx - cell / 2, cy); c.moveTo(cx + cell * 0.44, cy); c.lineTo(cx + cell / 2, cy);
    c.moveTo(cx, cy - cell * 0.44); c.lineTo(cx, cy - cell / 2); c.moveTo(cx, cy + cell * 0.44); c.lineTo(cx, cy + cell / 2); c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx - cell / 2, cy - cell / 2); c.lineTo(cx - cell * 0.32, cy - cell * 0.32);
    c.moveTo(cx + cell / 2, cy - cell / 2); c.lineTo(cx + cell * 0.32, cy - cell * 0.32);
    c.moveTo(cx - cell / 2, cy + cell / 2); c.lineTo(cx - cell * 0.32, cy + cell * 0.32);
    c.moveTo(cx + cell / 2, cy + cell / 2); c.lineTo(cx + cell * 0.32, cy + cell * 0.32); c.stroke();
  }
  const t = tex(cv, { repeat: true });
  return t;
}

/** Kilim rug. */
export function makeKilimTexture(w = 512, h = 768, pal = ['#8f2d2a', '#e9c98c', '#1f4a5c', '#d9822b', '#2b1b1b']) {
  const cv = canvas(w, h); const c = cv.getContext('2d'); const rng = mulberry32(3);
  c.fillStyle = pal[0]; c.fillRect(0, 0, w, h);
  const B = 30;
  // borders
  const band = (inset, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.strokeRect(inset + wd / 2, inset + wd / 2, w - 2 * inset - wd, h - 2 * inset - wd); };
  band(0, 16, pal[4]); band(16, 26, pal[1]); band(42, 10, pal[2]); band(52, 34, pal[0]);
  // zig-zag in the wide band
  c.fillStyle = pal[3];
  for (let x = 62; x < w - 62; x += 22) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 11, 76); c.lineTo(x + 22, 60); c.fill(); c.beginPath(); c.moveTo(x, h - 60); c.lineTo(x + 11, h - 76); c.lineTo(x + 22, h - 60); c.fill(); }
  for (let y = 62; y < h - 62; y += 22) { c.beginPath(); c.moveTo(60, y); c.lineTo(76, y + 11); c.lineTo(60, y + 22); c.fill(); c.beginPath(); c.moveTo(w - 60, y); c.lineTo(w - 76, y + 11); c.lineTo(w - 60, y + 22); c.fill(); }
  band(86, 8, pal[1]);
  // field with nested diamonds
  const cx = w / 2, cy = h / 2;
  const cols = [pal[2], pal[1], pal[3], pal[4], pal[1], pal[0]];
  for (let i = 0; i < 6; i++) {
    const rx = (w / 2 - 110) * (1 - i * 0.16), ry = (h / 2 - 130) * (1 - i * 0.16);
    c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(cx, cy - ry); c.lineTo(cx + rx, cy); c.lineTo(cx, cy + ry); c.lineTo(cx - rx, cy); c.closePath(); c.fill();
  }
  c.fillStyle = pal[3]; star8(c, cx, cy, 44, 20); c.fill();
  // small motifs
  c.fillStyle = pal[1];
  for (const [sx, sy] of [[cx, 130], [cx, h - 130], [120, cy], [w - 120, cy]]) { star8(c, sx, sy, 20, 9); c.fill(); }
  // weave noise
  const im = c.getImageData(0, 0, w, h); const d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rng() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(im, 0, 0);
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
  for (let y = 0; y < h; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  return tex(cv);
}

/** Atlas of calligraphy tiles: cols x rows, returns { texture, draw, cols, rows } */
export function makeTileAtlas(words, accent = '#7be495', cols = 4, rows = 2) {
  const cw = 256, ch = 160; const cv = canvas(cw * cols, ch * rows); const c = cv.getContext('2d');
  const texture = tex(cv, { aniso: 8 });
  function draw() {
    c.clearRect(0, 0, cv.width, cv.height);
    words.forEach((wd, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      const g = c.createLinearGradient(cx, cy, cx, cy + ch);
      g.addColorStop(0, '#15304a'); g.addColorStop(1, '#0b1c2e');
      roundRect(c, cx + 6, cy + 6, cw - 12, ch - 12, 26); c.fillStyle = g; c.fill();
      c.lineWidth = 5; c.strokeStyle = '#f2c76b'; c.stroke();
      c.lineWidth = 2; c.strokeStyle = accent; roundRect(c, cx + 16, cy + 16, cw - 32, ch - 32, 18); c.stroke();
      c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
      let size = 78; c.font = `700 ${size}px ${DISPLAY_FONT}`;
      const mw = c.measureText(wd).width; if (mw > cw - 60) { size *= (cw - 60) / mw; c.font = `700 ${size}px ${DISPLAY_FONT}`; }
      c.shadowColor = accent; c.shadowBlur = 16; c.fillStyle = '#fff3d6'; c.fillText(wd, cx + cw / 2, cy + ch / 2 + 4); c.shadowBlur = 0;
    });
    texture.needsUpdate = true;
  }
  draw();
  return { texture, draw, cols, rows };
}

/** Soft radial glow (white, alpha). */
export function makeGlowTexture(size = 128, inner = 0.0) {
  const cv = canvas(size, size); const c = cv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  return tex(cv, { srgb: false });
}

/** Camel hoof print: alpha mask. */
export function makeHoofTexture() {
  const cv = canvas(64, 80); const c = cv.getContext('2d');
  c.clearRect(0, 0, 64, 80);
  const g = c.createRadialGradient(32, 40, 4, 32, 40, 34);
  g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(32, 40, 26, 34, 0, 0, 7); c.fill();
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.5)';
  c.beginPath(); c.ellipse(32, 44, 9, 15, 0, 0, 7); c.fill();
  c.fillRect(30, 8, 4, 16);
  return tex(cv, { srgb: false });
}

export function makeStripeTexture() { // simple woven stripes for cloth details
  const cv = canvas(64, 8); const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 8); c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 64; i += 4) c.fillRect(i, 0, 2, 8);
  return tex(cv, { repeat: true });
}

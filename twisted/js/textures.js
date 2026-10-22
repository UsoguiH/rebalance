// Procedural canvas textures: brick and siding facades, storefronts, roofs, concrete,
// grass, rock, signs, clock faces. Everything is painted in code.
import * as THREE from 'three';
import { rng, fbm, noise2, clamp } from './core.js';

export let maxAniso = 8;
export function setAniso(a) {
  maxAniso = a;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTex(c, { repeat = true, srgb = true, aniso = true, mip = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso ? maxAniso : 1;
  if (!mip) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  t.needsUpdate = true;
  return t;
}

const cache = new Map();
export function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function hex(c) {
  return '#' + new THREE.Color(c).getHexString();
}
export function shade(c, f) {
  const col = new THREE.Color(c);
  col.multiplyScalar(f);
  return '#' + col.getHexString();
}
function mix(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

// sprinkle grime: darker blotches and drips, used on almost every surface
export function grime(ctx, w, h, seed, amount = 0.35, dripTop = true) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const sx = 6 / w, sy = 6 / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * sx + seed, y * sy, 4);
      const fine = noise2(x * 0.7, y * 0.7);
      let f = 1 - amount * clamp((n - 0.45) * 2.2, 0, 1) - (fine - 0.5) * 0.12;
      if (dripTop) f -= amount * 0.5 * clamp(1 - y / (h * 0.25), 0, 1) * fbm(x * 0.08 + seed, 3, 2);
      const i = (y * w + x) * 4;
      d[i] *= f;
      d[i + 1] *= f;
      d[i + 2] *= f;
    }
  }
  ctx.putImageData(img, 0, 0);
  // vertical drips
  ctx.globalAlpha = 0.12 * amount * 3;
  ctx.fillStyle = '#000';
  for (let i = 0; i < w / 10; i++) {
    const x = r() * w;
    const len = r() * h * 0.6;
    ctx.fillRect(x, 0, 1 + r() * 2, len);
  }
  ctx.globalAlpha = 1;
}

// ---------- brick ----------
export function bricks(ctx, x0, y0, w, h, base, seed, scale = 1) {
  const r = rng(seed);
  const bh = 5 * scale, bw = 15 * scale;
  ctx.fillStyle = shade(base, 0.55);
  ctx.fillRect(x0, y0, w, h);
  const col = new THREE.Color(base);
  for (let row = 0, y = y0; y < y0 + h; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = x0 - off; x < x0 + w; x += bw) {
      const f = 0.82 + r() * 0.3;
      const c = col.clone().multiplyScalar(f);
      if (r() < 0.06) c.lerp(new THREE.Color('#3a2a22'), 0.4);
      ctx.fillStyle = '#' + c.getHexString();
      ctx.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
    }
  }
}

function windowGlass(ctx, x, y, w, h, r, lit = false) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  if (lit) {
    g.addColorStop(0, '#d9a45a');
    g.addColorStop(1, '#7a4e22');
  } else {
    g.addColorStop(0, '#5c5a58');
    g.addColorStop(0.45, '#2a2a2c');
    g.addColorStop(1, '#151417');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // sky reflection streak
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = 0.18 + r() * 0.12;
  ctx.fillStyle = '#e8b47a';
  ctx.beginPath();
  const s = x + r() * w * 0.5;
  ctx.moveTo(s, y);
  ctx.lineTo(s + w * 0.35, y);
  ctx.lineTo(s - w * 0.2, y + h);
  ctx.lineTo(s - w * 0.55, y + h);
  ctx.fill();
  // blinds / curtains
  if (r() < 0.5) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = r() < 0.5 ? '#bfae8c' : '#6d5a44';
    ctx.fillRect(x, y, w, h * (0.15 + r() * 0.4));
  }
  ctx.restore();
}

// one window bay of an upper floor. 256x256 px covers metersX x metersY
export function facadeTex(style, seed = 1) {
  return cached('facade-' + style.name + seed, () => {
    const W = 256, H = 256;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed * 31 + 7);
    if (style.kind === 'brick') bricks(ctx, 0, 0, W, H, style.color, seed, 1.15);
    else if (style.kind === 'stucco') {
      ctx.fillStyle = style.color;
      ctx.fillRect(0, 0, W, H);
    } else if (style.kind === 'siding') {
      ctx.fillStyle = style.color;
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 11) {
        ctx.fillStyle = shade(style.color, 0.72);
        ctx.fillRect(0, y + 9, W, 2);
        ctx.fillStyle = shade(style.color, 1.08);
        ctx.fillRect(0, y, W, 2);
      }
    } else if (style.kind === 'concrete') {
      ctx.fillStyle = style.color;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = shade(style.color, 0.8);
      ctx.fillRect(0, H - 6, W, 2);
      ctx.fillRect(W - 3, 0, 2, H);
    }
    if (style.noWindow) {
      grime(ctx, W, H, seed * 13 + 3, style.dirt ?? 0.35);
      return toTex(c);
    }
    // window
    const ww = style.winW || 80, wh = style.winH || 120;
    const wx = (W - ww) / 2, wy = style.winY || 62;
    const trim = style.trim || '#d8cfbf';
    if (style.arch) {
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(W / 2, wy + 4, ww / 2 + 8, Math.PI, 0);
      ctx.lineTo(wx + ww + 8, wy + 8);
      ctx.lineTo(wx - 8, wy + 8);
      ctx.fill();
    } else {
      ctx.fillStyle = trim;
      ctx.fillRect(wx - 8, wy - 12, ww + 16, 10); // lintel
    }
    ctx.fillStyle = trim;
    ctx.fillRect(wx - 6, wy + wh, ww + 12, 9); // sill
    ctx.fillStyle = shade(trim, 0.8);
    ctx.fillRect(wx - 4, wy - 3, ww + 8, wh + 4);
    const lit = r() < 0.08;
    windowGlass(ctx, wx, wy, ww, wh, r, lit);
    if (style.arch) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, wy + 2, ww / 2, Math.PI, 0);
      ctx.clip();
      windowGlass(ctx, wx, wy - ww / 2, ww, ww / 2 + 4, r);
      ctx.restore();
    }
    // mullions
    ctx.fillStyle = shade(trim, 0.9);
    ctx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    ctx.fillRect(W / 2 - 2, wy, 4, wh);
    // broken window
    if (r() < 0.12) {
      ctx.fillStyle = '#0a0908';
      ctx.beginPath();
      ctx.moveTo(wx + r() * ww, wy);
      ctx.lineTo(wx + ww, wy + r() * wh);
      ctx.lineTo(wx + r() * ww * 0.6, wy + wh * 0.7);
      ctx.fill();
    }
    // boarded up
    if (r() < 0.07) {
      ctx.fillStyle = '#7a6040';
      for (let i = 0; i < 4; i++) ctx.fillRect(wx - 4, wy + 10 + i * (wh / 4), ww + 8, wh / 6);
    }
    grime(ctx, W, H, seed * 13 + 3, style.dirt ?? 0.35);
    return toTex(c);
  });
}

// ground floor storefront, 512x384 covering 6m x 4.4m
export function storefrontTex(seed, opt = {}) {
  return cached('store-' + seed + (opt.color || ''), () => {
    const W = 512, H = 384;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed * 17 + 3);
    const frame = opt.color || r.pick(['#5a2a22', '#2f3b33', '#3b3328', '#5b4a32', '#1f2a36', '#6b2f2a']);
    if (opt.brick) bricks(ctx, 0, 0, W, H, opt.brick, seed, 1.4);
    else {
      ctx.fillStyle = frame;
      ctx.fillRect(0, 0, W, H);
    }
    // sign band area (top 22%) stays as frame color with a trim
    ctx.fillStyle = shade(frame, 0.7);
    ctx.fillRect(0, H * 0.2, W, 6);
    // bulkhead
    ctx.fillStyle = shade(frame, 0.85);
    ctx.fillRect(0, H - 52, W, 52);
    ctx.fillStyle = shade(frame, 0.6);
    for (let x = 14; x < W; x += 92) ctx.strokeRect(x, H - 44, 76, 34);
    // glass
    const doorX = r() < 0.5 ? 30 : W - 130;
    const panes = [];
    for (let x = 12; x < W - 12; x += 125) panes.push(x);
    for (const px of panes) {
      if (px + 110 > doorX && px < doorX + 100) continue;
      windowGlass(ctx, px, H * 0.24, 112, H * 0.62 - 52 + 20, r, r() < 0.15);
      ctx.fillStyle = shade(frame, 0.9);
      ctx.fillRect(px - 3, H * 0.24, 4, H * 0.62);
    }
    // door
    ctx.fillStyle = shade(frame, 0.55);
    ctx.fillRect(doorX, H * 0.26, 96, H * 0.74);
    windowGlass(ctx, doorX + 12, H * 0.3, 72, H * 0.4, r);
    ctx.fillStyle = '#c9b37a';
    ctx.fillRect(doorX + 76, H * 0.62, 10, 4);
    // posters / for lease
    if (r() < 0.5) {
      ctx.fillStyle = r() < 0.5 ? '#e2d8b8' : '#c33';
      ctx.fillRect(panes[1] + 20, H * 0.4, 40, 30);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(r.pick(['FOR LEASE', 'SALE', 'CLOSED', 'OPEN']), panes[1] + 22, H * 0.4 + 18);
    }
    grime(ctx, W, H, seed * 7 + 1, 0.4, false);
    return toTex(c);
  });
}

export function signTex(text, opt = {}) {
  const key = 'sign-' + text + JSON.stringify(opt);
  return cached(key, () => {
    const W = opt.w || 512, H = opt.h || 128;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = opt.bg || '#d9cfb3';
    ctx.fillRect(0, 0, W, H);
    if (opt.border !== false) {
      ctx.strokeStyle = opt.borderColor || shade(opt.bg || '#d9cfb3', 0.6);
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, W - 8, H - 8);
    }
    ctx.fillStyle = opt.fg || '#7a1a12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = opt.size || H * 0.62;
    ctx.font = `${opt.weight || '700'} ${size}px ${opt.font || 'Oswald, Arial Narrow, sans-serif'}`;
    while (ctx.measureText(text).width > W * 0.9 && size > 10) {
      size -= 2;
      ctx.font = `${opt.weight || '700'} ${size}px ${opt.font || 'Oswald, Arial Narrow, sans-serif'}`;
    }
    if (opt.shadow) {
      ctx.fillStyle = opt.shadow;
      ctx.fillText(text, W / 2 + 3, H / 2 + 4);
      ctx.fillStyle = opt.fg || '#7a1a12';
    }
    ctx.fillText(text, W / 2, H / 2 + 2);
    if (opt.dirt !== 0) grime(ctx, W, H, text.length * 13, opt.dirt ?? 0.3, false);
    return toTex(c, { repeat: false });
  });
}

export function clockTex() {
  return cached('clock', () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#e9dfc4';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2b2118';
    ctx.stroke();
    ctx.fillStyle = '#2b2118';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(nums[i], S / 2 + Math.cos(a) * S * 0.34, S / 2 + Math.sin(a) * S * 0.34);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.lineTo(S / 2 + 40, S / 2 - 28);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.lineTo(S / 2 - 18, S / 2 - 70);
    ctx.stroke();
    grime(ctx, S, S, 99, 0.3, false);
    return toTex(c, { repeat: false });
  });
}

export function roofTex() {
  return cached('roof', () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const x = i % S, y = (i / S) | 0;
      const n = fbm(x / 40, y / 40, 4) * 0.6 + noise2(x * 0.9, y * 0.9) * 0.4;
      const v = 60 + n * 60;
      img.data[i * 4] = v * 1.02;
      img.data[i * 4 + 1] = v * 0.98;
      img.data[i * 4 + 2] = v * 0.92;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 6; i++) ctx.strokeRect(i * 47, i * 31, 120, 90);
    return toTex(c);
  });
}

export function shingleTex(color = '#4a3d36') {
  return cached('shingle' + color, () => {
    const W = 256, H = 256;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(5);
    ctx.fillStyle = shade(color, 0.6);
    ctx.fillRect(0, 0, W, H);
    for (let row = 0, y = 0; y < H; row++, y += 16) {
      for (let x = row % 2 ? -12 : 0; x < W; x += 24) {
        ctx.fillStyle = shade(color, 0.75 + r() * 0.45);
        ctx.fillRect(x + 1, y + 1, 22, 15);
      }
    }
    grime(ctx, W, H, 77, 0.35, false);
    return toTex(c);
  });
}

export function concreteTex(tint = '#9a9184', joints = 64) {
  return cached('concrete' + tint + joints, () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const base = new THREE.Color(tint);
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const x = i % S, y = (i / S) | 0;
      const n = fbm(x / 30, y / 30, 4) * 0.25 + noise2(x * 1.3, y * 1.3) * 0.12 + 0.82;
      img.data[i * 4] = base.r * 255 * n;
      img.data[i * 4 + 1] = base.g * 255 * n;
      img.data[i * 4 + 2] = base.b * 255 * n;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (joints) {
      ctx.fillStyle = 'rgba(30,25,20,0.45)';
      for (let p = 0; p < S; p += joints) {
        ctx.fillRect(p, 0, 2, S);
        ctx.fillRect(0, p, S, 2);
      }
    }
    // stains
    ctx.fillStyle = 'rgba(20,15,10,0.12)';
    const r = rng(9);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, 6 + r() * 20, 4 + r() * 12, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTex(c);
  });
}

// generic grain used to add close-up detail on top of painted ground/terrain
export function detailTex() {
  return cached('detail', () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const x = i % S, y = (i / S) | 0;
      const n =
        noise2(x * 0.9, y * 0.9) * 0.35 +
        noise2(x * 0.23 + 50, y * 0.23) * 0.35 +
        fbm(x / 32, y / 32, 3) * 0.3;
      const v = 128 + (n - 0.5) * 150;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // hairline cracks
    ctx.strokeStyle = 'rgba(40,40,40,0.55)';
    ctx.lineWidth = 1;
    const r = rng(3);
    for (let i = 0; i < 10; i++) {
      let x = r() * S, y = r() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.5) * 30;
        y += (r() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return toTex(c, { srgb: false });
  });
}

export function terrainTex() {
  return cached('terrain', () => {
    const S = 512;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const dry = new THREE.Color('#a08a58');
    const green = new THREE.Color('#6d6a3c');
    const dirt = new THREE.Color('#7d6448');
    const tmp = new THREE.Color();
    for (let i = 0; i < S * S; i++) {
      const x = i % S, y = (i / S) | 0;
      const n = fbm(x / 60, y / 60, 4);
      const m = fbm(x / 20 + 9, y / 20, 3);
      tmp.copy(dry).lerp(green, clamp((n - 0.45) * 3, 0, 1));
      tmp.lerp(dirt, clamp((m - 0.6) * 4, 0, 1));
      const g = 0.8 + noise2(x * 1.7, y * 1.7) * 0.4;
      img.data[i * 4] = tmp.r * 255 * g;
      img.data[i * 4 + 1] = tmp.g * 255 * g;
      img.data[i * 4 + 2] = tmp.b * 255 * g;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // grass blades
    const r = rng(11);
    for (let i = 0; i < 4000; i++) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(60,55,25,0.5)' : 'rgba(200,180,120,0.35)';
      const x = r() * S, y = r() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4);
      ctx.stroke();
    }
    return toTex(c);
  });
}

export function rockTex() {
  return cached('rock', () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const x = i % S, y = (i / S) | 0;
      const n = fbm(x / 24, y / 48, 5);
      const strata = Math.sin(y * 0.18 + n * 6) * 0.08;
      const v = 0.55 + n * 0.45 + strata;
      img.data[i * 4] = 150 * v;
      img.data[i * 4 + 1] = 128 * v;
      img.data[i * 4 + 2] = 100 * v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c);
  });
}

export function barkTex() {
  return cached('bark', () => {
    const W = 64, H = 256;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3f3226';
    ctx.fillRect(0, 0, W, H);
    const r = rng(2);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = r() < 0.5 ? '#2a2018' : '#5a4836';
      ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 10 + r() * 40);
    }
    return toTex(c);
  });
}

// soft foliage card texture (alpha)
export function leafTex(color = '#4f5a2a') {
  return cached('leaf' + color, () => {
    const S = 256;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const r = rng(color.length * 7);
    const base = new THREE.Color(color);
    // irregular clump of small leaves: darker inside, sun-bleached tips at the top
    for (let i = 0; i < 1400; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * S * 0.47;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.92;
      const edge = d / (S * 0.47);
      const f = 0.45 + r() * 0.5 + edge * 0.25 - (y / S) * 0.35;
      const col = base.clone().multiplyScalar(f);
      if (r() < 0.15) col.lerp(new THREE.Color('#9a8a3a'), 0.5);
      ctx.fillStyle = '#' + col.getHexString();
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + r() * 4, 1.2 + r() * 2.4, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTex(c, { repeat: false });
  });
}

export function fieldTex() {
  return cached('field', () => {
    const W = 512, H = 1024;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 ? '#5d6430' : '#666c36';
      ctx.fillRect(0, (i * H) / 20, W, H / 20);
    }
    ctx.strokeStyle = 'rgba(235,230,215,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(20, 20 + (i * (H - 40)) / 10);
      ctx.lineTo(W - 20, 20 + (i * (H - 40)) / 10);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(235,230,215,0.85)';
    ctx.font = 'bold 34px Oswald, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 1; i < 10; i++) {
      const yd = Math.min(i, 10 - i) * 10;
      ctx.save();
      ctx.translate(70, 20 + (i * (H - 40)) / 10);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(String(yd), 0, 0);
      ctx.restore();
    }
    // end zones
    ctx.fillStyle = 'rgba(120,20,20,0.7)';
    ctx.fillRect(22, 22, W - 44, 60);
    ctx.fillStyle = 'rgba(20,40,110,0.7)';
    ctx.fillRect(22, H - 82, W - 44, 60);
    grime(ctx, W, H, 4, 0.35, false);
    return toTex(c, { repeat: false });
  });
}

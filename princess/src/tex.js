// Canvas-painted textures: wood planks, stained glass, log ends, blood splats, smoke
// puffs, sparks, faces and icons. Everything is drawn in code at start-up.
import * as THREE from 'three';
import { makeCanvas, rng, TAU } from './util.js';

const cache = new Map();
function canvasTex(key, w, h, draw, opts = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.nearest) t.magFilter = THREE.NearestFilter;
  cache.set(key, t);
  t.userData.canvas = c;
  return t;
}

// Light wood planks (tinted by the material colour).
export function planksTex() {
  return canvasTex('planks', 256, 256, (g, w, h) => {
    const r = rng(5);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = (i * w) / n;
      const v = 225 + r() * 30;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, w / n, h);
      // grain
      g.strokeStyle = 'rgba(0,0,0,0.10)';
      g.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const gx = x + 8 + r() * (w / n - 16);
        g.moveTo(gx, 0);
        for (let y = 0; y <= h; y += 16) g.lineTo(gx + Math.sin(y * 0.05 + k) * 3, y);
        g.stroke();
      }
      // highlight edge + dark seam
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x + 3, 0, 4, h);
      g.fillStyle = 'rgba(40,18,6,0.9)';
      g.fillRect(x, 0, 3, h);
      // knot
      if (r() < 0.6) {
        g.strokeStyle = 'rgba(60,30,10,0.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(x + w / n / 2, r() * h, 5, 9, 0, 0, TAU);
        g.stroke();
      }
    }
  }, { repeat: true });
}

export function stainedGlassTex() {
  return canvasTex('glass', 128, 256, (g, w, h) => {
    const cols = ['#f04a3a', '#f6c443', '#4fb3ef', '#ef8bd0', '#6ad06a', '#ffffff', '#f07d2d'];
    const r = rng(9);
    g.fillStyle = '#2a1408';
    g.fillRect(0, 0, w, h);
    // arch window shape
    g.save();
    g.beginPath();
    g.moveTo(10, h - 6);
    g.lineTo(10, 60);
    g.arc(w / 2, 60, w / 2 - 10, Math.PI, 0);
    g.lineTo(w - 10, h - 6);
    g.closePath();
    g.clip();
    for (let y = 0; y < h; y += 26)
      for (let x = 0; x < w; x += 22) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.beginPath();
        g.moveTo(x + r() * 6, y + r() * 6);
        g.lineTo(x + 22 + r() * 6, y + r() * 6);
        g.lineTo(x + 22 + r() * 6, y + 26 + r() * 6);
        g.lineTo(x + r() * 6, y + 26 + r() * 6);
        g.fill();
      }
    g.strokeStyle = '#2a1408';
    g.lineWidth = 4;
    for (let y = 0; y < h; y += 26) {
      g.beginPath();
      g.moveTo(0, y + 3);
      g.lineTo(w, y + 6);
      g.stroke();
    }
    for (let x = 0; x < w; x += 22) {
      g.beginPath();
      g.moveTo(x + 3, 0);
      g.lineTo(x + 6, h);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(14, 30, 10, h - 50);
    g.restore();
  });
}

// Tree-ring end of a log.
export function logEndTex() {
  return canvasTex('logend', 128, 128, (g, w) => {
    g.fillStyle = '#9a5a2a';
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2, 0, TAU);
    g.fill();
    g.fillStyle = '#efc27a';
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2 - 10, 0, TAU);
    g.fill();
    g.strokeStyle = '#d29a52';
    g.lineWidth = 5;
    for (let r = 12; r < w / 2 - 12; r += 13) {
      g.beginPath();
      g.arc(w / 2 + 2, w / 2 - 1, r, 0, TAU);
      g.stroke();
    }
  });
}

// Bark: vertical dark grooves on a tintable base.
export function barkTex() {
  return canvasTex('bark', 128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    g.strokeStyle = 'rgba(70,30,10,0.35)';
    g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x = r() * w;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.6, x + 2, h);
      g.stroke();
    }
  }, { repeat: true });
}

// Blood splats: a bold blob with satellite drops and a streak.
export function bloodTex(variant = 0) {
  return canvasTex('blood' + variant, 256, 256, (g, w, h) => {
    const r = rng(100 + variant * 17);
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#ffffff';
    const blob = (x, y, rad, spikes = 0) => {
      g.beginPath();
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        let rr = rad * (0.78 + r() * 0.35);
        if (spikes && r() < spikes) rr *= 1.5 + r() * 0.6;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py);
        else g.quadraticCurveTo(x + Math.cos(a - 0.12) * rr * 1.1, y + Math.sin(a - 0.12) * rr * 1.1, px, py);
      }
      g.fill();
    };
    blob(cx, cy, 52 + r() * 18, 0.25);
    const drops = 10 + Math.floor(r() * 8);
    for (let i = 0; i < drops; i++) {
      const a = r() * TAU, d = 60 + r() * 55;
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4 + r() * 10);
    }
    // streak
    const a = r() * TAU;
    g.lineCap = 'round';
    g.strokeStyle = '#ffffff';
    for (let i = 0; i < 2; i++) {
      g.lineWidth = 14 - i * 6;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a + i * 0.4) * (90 + r() * 25), cy + Math.sin(a + i * 0.4) * (90 + r() * 25));
      g.stroke();
    }
  });
}

// Cartoon smoke puff: a pale disc with a curling spiral (the "poof" clouds).
export function puffTex() {
  return canvasTex('puff', 128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.arc(c, c, c - 6, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(150,150,160,0.9)';
    g.lineWidth = 5;
    g.beginPath();
    for (let t = 0; t < 2.6 * Math.PI; t += 0.1) {
      const rr = 6 + t * 7.5;
      const x = c + Math.cos(t) * rr, y = c + Math.sin(t) * rr;
      if (t === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = 'rgba(120,120,135,0.85)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(c, c, c - 8, 0, TAU);
    g.stroke();
  });
}

export function sparkTex() {
  return canvasTex('spark', 128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#ffffff';
    g.beginPath();
    const n = 8;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU - Math.PI / 2;
      const rr = i % 2 === 0 ? c - 4 : c * 0.36;
      g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
    }
    g.fill();
  });
}

export function glowTex() {
  return canvasTex('glow', 128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  });
}

export function shadowTex() {
  return canvasTex('shadow', 128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)');
    grd.addColorStop(0.6, 'rgba(0,0,0,0.38)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  });
}

// Fire flame sprite (tintable white core + transparent edge).
export function flameTex() {
  return canvasTex('flame', 128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(c, 6);
    g.bezierCurveTo(c + 30, 40, c + 46, 70, c + 34, 98);
    g.bezierCurveTo(c + 22, 124, c - 22, 124, c - 34, 98);
    g.bezierCurveTo(c - 46, 70, c - 30, 40, c, 6);
    g.fill();
  });
}

// Faces for the chibi heads: big green eyes, heavy brows, small mouth.
// mood: 'angry' | 'hurt' | 'dead' | 'happy' | 'shout' | 'sad'
export function faceTex(skin = '#f6d2b8', iris = '#41b46a', mood = 'angry', key = '') {
  return canvasTex(`face|${skin}|${iris}|${mood}|${key}`, 256, 256, (g, w) => {
    g.fillStyle = skin;
    g.fillRect(0, 0, w, w);
    const eye = (cx, cy, side) => {
      if (mood === 'dead') {
        g.strokeStyle = '#1b0e08';
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx - 20, cy - 20);
        g.lineTo(cx + 20, cy + 20);
        g.moveTo(cx + 20, cy - 20);
        g.lineTo(cx - 20, cy + 20);
        g.stroke();
        return;
      }
      if (mood === 'hurt') {
        g.strokeStyle = '#1b0e08';
        g.lineWidth = 10;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx - 22, cy - 12 * side * 0 - 10);
        g.lineTo(cx + 18 * side, cy);
        g.lineTo(cx - 22, cy + 12);
        g.stroke();
        return;
      }
      g.fillStyle = '#1b0e08';
      g.beginPath();
      g.ellipse(cx, cy, 33, 31, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx, cy, 28, 26, 0, 0, TAU);
      g.fill();
      g.fillStyle = iris;
      g.beginPath();
      g.ellipse(cx + side * 2, cy + 2, 20, 20, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#1b0e08';
      g.beginPath();
      g.ellipse(cx + side * 2, cy + 2, 10, 10, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx - 6 + side * 2, cy - 7, 6, 5, 0, 0, TAU);
      g.fill();
      if (mood === 'angry' || mood === 'shout') {
        // slanted eyelid: low on the nose side, high on the outside
        const inner = cx - side * 40, outer = cx + side * 40;
        g.fillStyle = skin;
        g.beginPath();
        g.moveTo(outer, cy - 50);
        g.lineTo(inner, cy - 50);
        g.lineTo(inner, cy - 6);
        g.lineTo(outer, cy - 30);
        g.closePath();
        g.fill();
        g.strokeStyle = '#1b0e08';
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(inner + side * 10, cy - 8);
        g.lineTo(outer - side * 12, cy - 28);
        g.stroke();
      }
    };
    const ey = 128;
    eye(84, ey, -1);
    eye(172, ey, 1);
    // brows
    if (mood !== 'dead') {
      g.strokeStyle = '#2a170c';
      g.lineWidth = 15;
      g.lineCap = 'round';
      const tilt = mood === 'angry' || mood === 'shout' ? 18 : mood === 'sad' || mood === 'hurt' ? -14 : -4;
      g.beginPath();
      g.moveTo(52, ey - 52 - tilt);
      g.lineTo(108, ey - 44 + tilt * 0.4);
      g.moveTo(204, ey - 52 - tilt);
      g.lineTo(148, ey - 44 + tilt * 0.4);
      g.stroke();
    }
    // nose
    g.strokeStyle = 'rgba(120,60,40,0.55)';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(128, ey + 22);
    g.lineTo(122, ey + 46);
    g.lineTo(132, ey + 48);
    g.stroke();
    // mouth
    g.strokeStyle = '#3a160c';
    g.fillStyle = '#5a1a12';
    g.lineWidth = 7;
    g.beginPath();
    if (mood === 'shout' || mood === 'hurt') {
      g.ellipse(128, ey + 78, 22, 16, 0, 0, TAU);
      g.fill();
      g.stroke();
    } else if (mood === 'happy') {
      g.arc(128, ey + 62, 22, 0.2, Math.PI - 0.2);
      g.stroke();
    } else if (mood === 'dead') {
      g.moveTo(104, ey + 78);
      g.lineTo(152, ey + 74);
      g.stroke();
    } else {
      g.moveTo(108, ey + 80);
      g.quadraticCurveTo(128, ey + 70, 150, ey + 80);
      g.stroke();
    }
    // cheek blush
    g.fillStyle = 'rgba(240,120,110,0.22)';
    g.beginPath();
    g.ellipse(50, ey + 52, 20, 12, 0, 0, TAU);
    g.ellipse(206, ey + 52, 20, 12, 0, 0, TAU);
    g.fill();
  });
}

// Round emblem decals used on shields and outpost crests.
export function crestTex(color = '#e6452a', kind = 'shield') {
  return canvasTex(`crest|${color}|${kind}`, 128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = color;
    g.strokeStyle = '#2a140a';
    g.lineWidth = 8;
    g.beginPath();
    if (kind === 'shield') {
      g.moveTo(c - 44, 18);
      g.lineTo(c + 44, 18);
      g.lineTo(c + 44, 62);
      g.quadraticCurveTo(c + 40, 100, c, 118);
      g.quadraticCurveTo(c - 40, 100, c - 44, 62);
      g.closePath();
    } else {
      g.arc(c, c, c - 8, 0, TAU);
    }
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(c - 16, 46, 12, 18, -0.3, 0, TAU);
    g.fill();
  });
}

export function texCanvas(t) {
  return t.userData.canvas;
}

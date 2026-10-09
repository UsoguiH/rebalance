'use strict';
// Pixel-art props (heart, coin, controller, cat, cap, cash, camera, vinyl,
// clapperboard, skateboard, book, plant), their colour variants, and a
// voxel-style extrude renderer for the 3D spins.

class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); }
  px(x, y, col) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null; }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col); }
  disc(cx, cy, r, col, test) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r && (!test || test(x, y, Math.atan2(dy, dx), Math.hypot(dx, dy)))) this.px(x, y, col);
    }
  }
  ascii(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) this.px(ox + x, oy + y, pal[ch]); }));
  }
  outline(col) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.px(x, y, col));
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d');
    for (let i = 0; i < this.c.length; i++) if (this.c[i]) { g.fillStyle = this.c[i]; g.fillRect(i % this.w, (i / this.w) | 0, 1, 1); }
    return cv;
  }
}
const asciiGrid = (rows, pal) => {
  const w = Math.max(...rows.map(r => r.length));
  const g = new Grid(w, rows.length);
  g.ascii(rows, pal);
  return g;
};

const SPRITE_DEFS = {
  heart: () => asciiGrid([
    '..dddd...dddd..',
    '.dpooodd.drrrd.',
    'dpooooodrrrrrrd',
    'dooooooorrrrrrd',
    'doooooorrrrrrrd',
    'drrrrrrrrrrrrrd',
    '.drrrrrrrrrrrd.',
    '..drrrrrrrrrd..',
    '...drrrrrrrd...',
    '....drrrrrd....',
    '.....drrrd.....',
    '......drd......',
    '.......d.......',
  ], { d: '#b0021d', r: '#dc0c24', o: '#ee6b3b', p: '#f5925c' }),

  coin: () => asciiGrid([
    '....kkkkkk....',
    '..kkwwwyyykk..',
    '.kwwwyyyyyyyk.',
    '.kwwywwwwkyyk.',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    'kwwyywyyykyyyk',
    '.kwyywkkkkyyk.',
    '.kwyyyyyyyyYk.',
    '..kkyyyyyYkk..',
    '....kkkkkk....',
  ], { k: '#15110d', w: '#fbf7ea', y: '#f2c21b', Y: '#cf930e' }),

  controller: () => asciiGrid([
    '..kkkkkkk.......kkkkkkk..',
    '.kwwwwwwwkkkkkkkwwwwwwwk.',
    'kwwwwkwwwwwwwwwwwwwbbwwwk',
    'kwwwkkkwwKKwKKwwwgg.rrwwk',
    'kwwwwkwwwwwwwwwwwwwyywwwk',
    'kwwwwwwwwwwwwwwwwwwwwwwwk',
    'ksswwwwwwwwwwwwwwwwwwwssk',
    'ksssswwwkkkkkkkkkwwwssssk',
    '.ksssskk.........kkssssk.',
    '..kkkk.............kkkk..',
  ], { k: '#1b1515', w: '#f7f5f0', s: '#cfc9c2', K: '#3a3434', b: '#3eb3f0', g: '#4cc13a', r: '#e8303a', y: '#f2d82a', '.': null }),

  cat: () => asciiGrid([
    '........k...........',
    '.......kk...........',
    '.......k........k..k',
    '........k......kk.kk',
    '........k.....kkkkkk',
    '.........k...kkkkkkk',
    '.........kkkkkekkekk',
    '.........kkkkkekkekk',
    '........kkkkkkkkkkkk',
    '.......kkkkkkkkkkkk.',
    '.......kkkkkkkkkkk..',
    '......kkkkkkkkkkkk..',
    '......kk.kk..kk.kk..',
    '.....kk..k...k...kk.',
    '.....k...k...k....k.',
  ], { k: '#161414', e: '#cfcfcf' }),

  cap: () => asciiGrid([
    '..........kkkkkk......',
    '........kkwwwwwwkk....',
    '......kkwwwwwwwwwwk...',
    '.....kwwwwwwwwwwwwsk..',
    '....kwwwwwwwwwwwwwssk.',
    '...kwwwwwwwwwwwwwwwssk',
    '...kwwwmwwwwwwwwwwwssk',
    '..kwwwwwmmmmmwwwwwwssk',
    '..kwwwwwwwwwmmwwwwsssk',
    '..kwwwwwwwwwwwwwwssssk',
    '.kkkkkkkkkkkkkkkkkkkk.',
    'kwwwwwwwwwwwwssssk....',
    'kswwwwwwwwwssssk......',
    '.kssssssssssssk.......',
    '..kkkkkkkkkkkk........',
  ], { k: '#1f1915', w: '#f3f0e8', s: '#cdc6ba', m: '#1f1915' }),

  cash: () => {
    const g = new Grid(28, 13);
    const G = '#5ca83b', D = '#3f8a2c', L = '#83c74e', T = '#d2c197', t = '#ab9a70', S = '#367a26';
    g.rect(1, 1, 26, 7, G);
    g.rect(1, 1, 26, 1, L);
    g.rect(11, 1, 6, 7, T);
    g.rect(1, 8, 26, 3, D);
    g.rect(1, 9, 26, 1, '#4e9a34');
    g.rect(11, 8, 6, 3, t);
    // "$" marks
    for (const ox of [4, 20]) {
      g.rect(ox, 2, 3, 1, S); g.px(ox, 3, S); g.rect(ox, 4, 3, 1, S); g.px(ox + 2, 5, S); g.rect(ox, 6, 3, 1, S); g.px(ox + 1, 2, S);
    }
    g.outline('#2b5220');
    return g;
  },

  camera: () => {
    const g = new Grid(28, 18);
    const k = '#141416';
    g.rect(3, 1, 6, 2, '#d6d6da'); g.rect(4, 1, 1, 2, '#6a6a70'); g.rect(6, 1, 1, 2, '#6a6a70');
    g.rect(1, 3, 26, 5, '#c7c7cc');
    g.rect(1, 3, 26, 1, '#ececf0');
    g.rect(1, 7, 26, 1, '#94949a');
    g.rect(1, 8, 26, 8, '#38383c');
    for (let y = 9; y < 16; y++) for (let x = 1; x < 27; x++) if ((x * 7 + y * 13) % 5 === 0) g.px(x, y, '#444448');
    g.rect(1, 16, 26, 1, '#a3a3a8');
    g.rect(2, 5, 1, 2, '#88888e'); g.rect(3, 4, 1, 3, '#88888e');
    g.rect(6, 4, 2, 2, '#d0202a');
    g.rect(10, 4, 7, 3, '#2a2a2e'); g.rect(11, 5, 5, 1, '#dcdcdc');
    g.rect(20, 3, 5, 4, '#18181a'); g.rect(21, 5, 2, 1, '#f2f2f2');
    g.px(27, 5, '#8a8a90');
    g.disc(12.5, 11.5, 6.2, '#c9c9ce');
    g.disc(12.5, 11.5, 5.3, '#1b1b1d');
    g.disc(12.5, 11.5, 4.0, '#6c6c72');
    g.disc(12.5, 11.5, 3.1, '#111113');
    g.rect(11, 12, 3, 1, '#8b6a4e'); g.px(12, 10, '#9a9aa0');
    g.outline(k);
    return g;
  },

  vinyl: () => {
    const g = new Grid(22, 22);
    const c = 11;
    g.disc(c, c, 10.4, '#2b303b');
    g.disc(c, c, 9.6, '#3a414f');
    const wedge = (a0, a1) => (x, y, a) => {
      let d = ((a * 180) / Math.PI + 360) % 360;
      return d >= a0 && d <= a1;
    };
    g.disc(c, c, 8.8, '#8e8aa9', wedge(200, 250));
    g.disc(c, c, 8.8, '#8e8aa9', wedge(20, 70));
    g.disc(c, c, 7.4, '#b4b0cb', wedge(210, 240));
    g.disc(c, c, 7.4, '#b4b0cb', wedge(30, 60));
    g.disc(c, c, 5.2, '#3a414f');
    g.disc(c, c, 4.6, '#2b303b');
    g.disc(c, c, 3.9, '#e2333f');
    g.disc(c, c, 2.6, '#ec4a52');
    g.px(10, 10, '#ffffff'); g.px(11, 10, '#ffd0d0'); g.px(10, 11, '#ffd0d0'); g.px(9, 10, '#ffd0d0'); g.px(10, 9, '#ffd0d0');
    return g;
  },

  clapper: () => {
    const g = new Grid(22, 19);
    const nav = '#1e2152';
    for (let y = 1; y <= 5; y++) for (let x = 1; x <= 20; x++) {
      const yy = y - Math.round((x - 1) * 0.12);
      if (yy < 0) continue;
      g.px(x, yy + 1, (x + y * 2) % 6 < 3 ? '#f2f3fb' : '#4f57c9');
    }
    for (let x = 1; x <= 20; x++) g.px(x, 7, (x + 1) % 6 < 3 ? '#f2f3fb' : '#4f57c9');
    for (let x = 1; x <= 20; x++) g.px(x, 8, (x + 3) % 6 < 3 ? '#e0e2f6' : '#3f46b0');
    g.rect(1, 6, 2, 2, '#ee6a3e');
    g.rect(1, 9, 20, 8, '#262a7c');
    g.rect(2, 11, 18, 1, '#8c98e6'); g.rect(2, 14, 12, 1, '#8c98e6'); g.rect(15, 13, 4, 3, '#3a40a0');
    g.rect(2, 10, 18, 1, '#30358e');
    g.outline(nav);
    return g;
  },

  skateboard: () => {
    const g = new Grid(32, 9);
    g.rect(3, 1, 26, 3, '#2a2a2b');
    g.rect(1, 2, 2, 1, '#2a2a2b'); g.rect(29, 2, 2, 1, '#2a2a2b');
    for (let x = 3; x < 29; x++) if ((x * 5) % 3 === 0) g.px(x, 2, '#5c5c5e');
    for (let x = 4; x < 28; x += 4) g.px(x, 1, '#4a4a4c');
    g.rect(3, 4, 26, 1, '#141414');
    g.rect(7, 5, 3, 1, '#8c8c90'); g.rect(22, 5, 3, 1, '#8c8c90');
    g.rect(6, 6, 2, 2, '#d3252b'); g.rect(9, 6, 2, 2, '#d3252b'); g.rect(21, 6, 2, 2, '#d3252b'); g.rect(24, 6, 2, 2, '#d3252b');
    g.outline('#111');
    return g;
  },

  book: () => {
    const g = new Grid(18, 13);
    g.rect(1, 1, 16, 11, '#b7262d');
    g.rect(1, 1, 16, 1, '#cf3a3e');
    g.rect(1, 11, 16, 1, '#8c1b22');
    g.rect(1, 1, 2, 11, '#9a1d24');
    g.rect(5, 3, 9, 5, '#8fa25b');
    g.rect(5, 3, 9, 1, '#a9bd72');
    g.rect(7, 5, 5, 1, '#7a8c48');
    g.outline('#5a0f14');
    return g;
  },

  plant: () => {
    const g = new Grid(20, 24);
    const leaf = (cx, cy, r, d = 0) => g.disc(cx, cy, r, '#58a63a');
    leaf(6, 9, 3.6); leaf(13.5, 8, 3.6); leaf(10, 4.5, 3.4); leaf(4.5, 13, 2.6); leaf(15.5, 12.5, 2.6); leaf(10, 10.5, 3);
    for (let y = 0; y < 17; y++) for (let x = 0; x < 20; x++) {
      if (!g.get(x, y)) continue;
      if (!g.get(x - 1, y - 1) || !g.get(x, y - 1)) g.px(x, y, '#a3d64f');
      else if (!g.get(x + 1, y + 1) || !g.get(x, y + 2)) g.px(x, y, '#2f6e2a');
    }
    g.px(9, 6, '#cbe86a'); g.px(5, 8, '#cbe86a'); g.px(13, 7, '#cbe86a');
    g.rect(9, 12, 2, 4, '#2f6e2a');
    g.rect(3, 15, 14, 2, '#e1e8f7');
    g.rect(4, 17, 12, 5, '#b9c6e8');
    g.rect(13, 17, 3, 5, '#8d9bc9');
    g.rect(5, 17, 1, 4, '#dde5f7');
    g.outline('#16204a');
    return g;
  },
};

const Sprites = (() => {
  const cache = {};
  const SIDE_K = { camera: 0.78, vinyl: 0.55, heart: 0.6 };
  function variant(base, kind, name) {
    const cv = document.createElement('canvas');
    cv.width = base.width; cv.height = base.height;
    const g = cv.getContext('2d');
    g.drawImage(base, 0, 0);
    const id = g.getImageData(0, 0, cv.width, cv.height), d = id.data;
    const w = cv.width, h = cv.height;
    const alphaAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
    const out = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      const L = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      let c;
      if (kind === 'black') c = [17, 15, 15];
      else if (kind === 'side') {
        // slab walls take the colour just inside the outline, so the
        // 1-px outline does not turn every extruded edge black
        const k = SIDE_K[name] ?? 0.42;
        let j = i;
        const edge = !alphaAt(x - 1, y) || !alphaAt(x + 1, y) || !alphaAt(x, y - 1) || !alphaAt(x, y + 1);
        if (edge && SIDE_K[name]) {
          const ix = x + Math.sign(w / 2 - x), iy = y + Math.sign(h / 2 - y);
          if (alphaAt(ix, iy)) j = (iy * w + ix) * 4;
        }
        c = [d[j] * k, d[j + 1] * k, d[j + 2] * k];
      }
      else if (kind === 'gray') { const v = 70 + L * 120; c = [v, v - 2, v - 1]; }
      else if (kind === 'thermal') c = ramp([[0, [70, 8, 12]], [0.3, [176, 20, 24]], [0.55, [226, 70, 26]], [0.75, [242, 150, 46]], [1, [250, 236, 200]]], 0.15 + L * 0.95);
      else if (kind === 'white') {
        const edge = !alphaAt(x - 1, y) || !alphaAt(x + 1, y) || !alphaAt(x, y - 1) || !alphaAt(x, y + 1);
        const v = edge ? 238 : 70 + L * 90;
        c = [v, v, v];
      }
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
    }
    g.putImageData(new ImageData(out, w, h), 0, 0);
    return cv;
  }
  function get(name, kind = 'base') {
    let s = cache[name];
    if (!s) {
      const grid = SPRITE_DEFS[name]();
      s = cache[name] = { w: grid.w, h: grid.h, v: { base: grid.canvas() } };
    }
    if (!s.v[kind]) s.v[kind] = variant(s.v.base, kind, name);
    return { w: s.w, h: s.h, cv: s.v[kind] };
  }
  // Flat sprite, centred at (x, y); size = rendered width in px.
  function draw(ctx, name, x, y, size, o = {}) {
    const s = get(name, o.variant || 'base');
    const k = size / s.w;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 30; }
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(k * (o.flip ? -1 : 1) * (o.sx ?? 1), k * (o.sy ?? 1));
    ctx.drawImage(s.cv, -s.w / 2, -s.h / 2);
    ctx.restore();
  }
  // Voxel-style extrusion: the sprite is a slab `depth` cells thick, rotated in 3D.
  function draw3D(ctx, name, x, y, size, o = {}) {
    const s = get(name, o.variant || 'base');
    const side = get(name, o.sideVariant || 'side');
    const k = size / s.w;
    const rx = o.rx || 0, ry = o.ry || 0, rz = o.rz || 0;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // M = Rz * Rx * Ry
    const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
    const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
    const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
    const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
    const M = mul(Rz, mul(Rx, Ry));
    const ex = [M[0][0], M[1][0], M[2][0]], ey = [M[0][1], M[1][1], M[2][1]], ez = [M[0][2], M[1][2], M[2][2]];
    const depth = o.depth ?? 2;
    const proj = Math.hypot(ez[0], ez[1]) * depth * k;
    const n = Math.max(2, Math.min(70, Math.ceil(proj * 1.2) + 1));
    const layers = [];
    for (let i = 0; i < n; i++) {
      const z = lerp(-depth / 2, depth / 2, i / (n - 1));
      layers.push({ z, view: ez[2] * z, face: i === 0 ? 'back' : i === n - 1 ? 'front' : 'side' });
    }
    layers.sort((a, b) => a.view - b.view);
    if (o.blur > 0.3) {
      // blur the finished slab once instead of every layer
      const cv = ctx.canvas;
      const [lc, lg] = Layers.get(`d3_${cv.width}x${cv.height}`, cv.width, cv.height);
      lg.setTransform(ctx.getTransform());
      draw3D(lg, name, x, y, size, { ...o, blur: 0, alpha: 1 });
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= o.alpha ?? 1;
      ctx.filter = `blur(${o.blur}px)`;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    const base = ctx.getTransform();
    for (const L of layers) {
      const a = ex[0] * k, b = ex[1] * k, c = ey[0] * k, d = ey[1] * k;
      const e = x + ez[0] * L.z * k - (s.w / 2) * a - (s.h / 2) * c;
      const f = y + ez[1] * L.z * k - (s.w / 2) * b - (s.h / 2) * d;
      ctx.setTransform(base.multiply(new DOMMatrix([a, b, c, d, e, f])));
      const img = L.face === 'front' ? s.cv : L.face === 'back' ? (o.backVariant ? get(name, o.backVariant).cv : side.cv) : (o.sideFn ? o.sideFn(L, side, s) : side.cv);
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  }
  return { get, draw, draw3D };
})();

// Book walls for the extruded book: cream page edges, bookmark ribbons and a
// tan spine (no outline, so the extruded walls read as pages).
const BookSide = (() => {
  let cv = null;
  return () => {
    if (cv) return cv;
    const g = new Grid(18, 13);
    g.rect(0, 0, 18, 13, '#efe6d2');
    for (let y = 0; y < 13; y += 2) g.rect(3, y, 15, 1, '#e0d6bf');
    g.rect(17, 3, 1, 3, '#d63aa0'); g.rect(17, 6, 1, 2, '#9bd04a');
    g.rect(3, 11, 14, 2, '#a8222a');   // front edge reads as red cover board
    g.rect(0, 0, 3, 13, '#c9a77a');    // tan spine on the left end
    cv = g.canvas();
    return cv;
  };
})();
function drawBook3D(ctx, x, y, size, o = {}) {
  Sprites.draw3D(ctx, 'book', x, y, size, {
    depth: 5, ...o,
    sideFn: (L, side) => (Math.abs(L.z) > 2.0 ? side.cv : BookSide()),
  });
}

// Music notes (smooth vector, red).
function noteShape(ctx, kind, x, y, s, rot = 0, col = '#e3262b', alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = col;
  const head = (hx, hy) => { ctx.beginPath(); ctx.ellipse(hx, hy, 11, 8, -0.45, 0, TAU); ctx.fill(); };
  if (kind === 'eighth') {
    head(0, 0);
    ctx.fillRect(7, -62, 4, 62);
    ctx.beginPath(); ctx.moveTo(11, -62); ctx.bezierCurveTo(16, -44, 34, -40, 26, -16); ctx.bezierCurveTo(30, -36, 18, -42, 11, -46); ctx.fill();
  } else if (kind === 'beamed') {
    head(0, 0); head(36, -6);
    ctx.fillRect(7, -60, 4, 60); ctx.fillRect(43, -66, 4, 60);
    ctx.beginPath(); ctx.moveTo(7, -60); ctx.lineTo(47, -66); ctx.lineTo(47, -56); ctx.lineTo(7, -50); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -46); ctx.lineTo(47, -52); ctx.lineTo(47, -45); ctx.lineTo(7, -39); ctx.fill();
  } else { // quarter-ish with curl
    head(0, 0);
    ctx.fillRect(7, -64, 4, 64);
  }
  ctx.restore();
}

import * as THREE from 'three';
import { G, mix, shade, rng, quadGeo, fitText, triangleBorder } from './kit.js';
import { house, doorLeaf, lantern } from './houses.js';

const lerp = (a, b, t) => a + (b - a) * t;

// Sign board: wooden frame + a label plane. `k` frame; board centred at
// (x, y, z) facing local +z, tilted back by `tilt`.
function board(k, P, labels, slot, w, h, x, y, z, { tilt = 0, frame = P.wood, posts = 0 } = {}) {
  const bk = k.at(x, y, z, 0);
  bk.box([w + 0.16, h + 0.16, 0.08], frame, { rotation: [-tilt, 0, 0] });
  labels.plane(bk, slot, w, h, { position: [0, Math.sin(tilt) * 0.05, Math.cos(tilt) * 0.05], rotation: [-tilt, 0, 0] });
  if (posts) for (const sx of [-1, 1]) k.cyl(0.06, 0.07, posts, P.wood, { position: [x + sx * (w / 2 - 0.1), y - posts / 2, z - 0.06] }, 5);
}

// ---------------------------------------------------------------- souq stall
const GOODS = ['rugs', 'pots', 'brass', 'spice'];

export function stall(k, P, labels, proj, i, props) {
  const rnd = rng(40 + i);
  const col = proj.color;
  const W = 3.6;
  const wallC = mix(P.mud, P.mudLight, 0.25);

  // back wall and low side walls
  k.taper([W + 0.3, 2.7, 0.35], wallC, { position: [0, 1.2, -1.2] }, 0.95);
  k.box([W + 0.36, 0.16, 0.42], P.mudLight, { position: [0, 2.5, -1.2] });
  for (let j = 0; j < 5; j++) k.add(G.tri(0.4, 0.38, 0.22), P.mudLight, { position: [-1.6 + j * 0.8, 2.58, -1.2] });
  for (const sx of [-1, 1]) {
    k.box([0.3, 1.0, 2.2], wallC, { position: [sx * (W / 2 + 0.05), 0.4, -0.1] });
    k.box([0.34, 0.1, 2.24], P.mudLight, { position: [sx * (W / 2 + 0.05), 0.92, -0.1] });
  }
  // posts, beam
  for (const sx of [-1, 1]) k.cyl(0.08, 0.1, 2.8, P.wood, { position: [sx * 1.72, 1.3, 1.15] }, 6);
  k.box([W + 0.3, 0.14, 0.14], P.wood, { position: [0, 2.62, 1.15] });
  // counter with a draped rug
  k.box([3.2, 0.9, 0.6], P.wood, { position: [0, 0.45, 0.8] });
  k.box([3.34, 0.08, 0.72], P.woodLight, { position: [0, 0.94, 0.8] });
  k.box([2.7, 0.72, 0.03], col, { position: [0, 0.56, 1.12] });
  for (const y of [0.32, 0.56, 0.8]) k.box([2.7, 0.06, 0.035], P.cream, { position: [0, y, 1.125] });
  for (let j = 0; j < 9; j++) k.add(G.tri(0.3, 0.14, 0.03), j % 2 ? P.saffron : P.cream, { position: [-1.2 + j * 0.3, 0.2, 1.13], rotation: [0, 0, Math.PI] });
  // shelves on the back wall
  for (const y of [1.2, 1.8]) k.box([3.2, 0.06, 0.38], P.woodLight, { position: [0, y, -0.85] });

  // awning: stripes of the project colour and cream, fluttering at the front
  const zb = -1.35, yb = 2.95, zf = 1.6, yf = 2.5;
  const n = 8;
  for (let j = 0; j < n; j++) {
    const x0 = -W / 2 - 0.2 + (W + 0.4) * (j / n), x1 = -W / 2 - 0.2 + (W + 0.4) * ((j + 1) / n);
    const mid = 0.08;
    const zm = (zb + zf) / 2, ym = (yb + yf) / 2 - mid;
    const c = j % 2 ? P.cream : col;
    const flap = (x, y, z) => [0, 0.06 * Math.max(0, (z - zb) / (zf - zb)), 0];
    k.add(quadGeo([x0, yb, zb], [x0, ym, zm], [x1, ym, zm], [x1, yb, zb]), c, { layer: 'fab', attr: flap });
    k.add(quadGeo([x0, ym, zm], [x0, yf, zf], [x1, yf, zf], [x1, ym, zm]), c, { layer: 'fab', attr: flap });
    // valance
    k.add(G.tri(x1 - x0, 0.38, 0.01), j % 2 ? col : P.cream, {
      layer: 'fab', position: [(x0 + x1) / 2, yf + 0.01, zf], rotation: [0, 0, Math.PI],
      attr: (x, y, z) => [0, 0, Math.max(0, -y) * 0.3],
    });
  }

  // goods
  const kind = GOODS[i % GOODS.length];
  const potC = [P.mudDark, P.mud, '#b5653a', P.cream];
  const potGeo = G.lathe('smallpot', [[0, 0], [0.12, 0.02], [0.17, 0.12], [0.12, 0.26], [0.07, 0.3], [0.09, 0.34], [0, 0.34]], 7);
  for (const y of [1.23, 1.83]) {
    for (let j = 0; j < 5; j++) {
      const x = -1.3 + j * 0.65;
      if (kind === 'brass' || (kind === 'rugs' && y > 1.5)) k.cyl(0.2, 0.2, 0.03, P.brass, { position: [x, y + 0.2, -0.98], rotation: [Math.PI / 2 - 0.2, 0, 0] }, 10);
      else if (kind === 'spice') k.box([0.34, 0.26, 0.26], [P.orange, P.saffron, P.red, P.woodLight][j % 4], { position: [x, y + 0.14, -0.85] });
      else k.add(potGeo, potC[(j + (y > 1.5 ? 1 : 0)) % potC.length], { position: [x, y + 0.03, -0.85] });
    }
  }
  const top = 0.98;
  if (kind === 'spice') {
    const cs = [P.orange, P.saffron, P.red, '#7a8a3a', P.woodLight, P.crimson];
    for (let j = 0; j < 6; j++) {
      const x = -1.25 + j * 0.5;
      k.cyl(0.22, 0.17, 0.12, P.woodLight, { position: [x, top + 0.06, 0.8] }, 8);
      k.cone(0.2, 0.26, cs[j], { position: [x, top + 0.24, 0.8] }, 7);
    }
  } else if (kind === 'rugs') {
    const cs = [col, P.saffron, P.crimson, P.cream, P.teal];
    for (let j = 0; j < 5; j++) k.box([1.2, 0.07, 0.55], cs[j], { position: [-0.7, top + 0.04 + j * 0.075, 0.8], rotation: [0, j * 0.07, 0] });
    for (let j = 0; j < 3; j++) k.cyl(0.12, 0.12, 1.5, cs[(j + 2) % 5], { position: [1.95 + 0.25 * j, 0.75, -0.8 + j * 0.3], rotation: [0.15, 0, 0.12] }, 6);
    k.cyl(0.13, 0.13, 1.0, cs[1], { position: [0.8, top + 0.14, 0.8], rotation: [0, 0, Math.PI / 2] }, 6);
  } else if (kind === 'brass') {
    for (let j = 0; j < 3; j++) dallah(k, P, -1.0 + j * 0.9, top, 0.8, 1.0);
  } else {
    for (let j = 0; j < 4; j++) k.add(G.lathe('pot2', [[0, 0], [0.16, 0.02], [0.22, 0.16], [0.16, 0.34], [0.09, 0.4], [0.12, 0.45], [0, 0.45]], 7), potC[j], { position: [-1.1 + j * 0.72, top, 0.8] });
  }
  // lanterns hanging from the beam
  const lx = kind === 'brass' ? [-1.2, -0.4, 0.4, 1.2] : [-1.1, 1.1];
  lx.forEach((x, j) => lantern(k, P, x, 2.1 - (j % 2) * 0.15, 1.15, i * 3.1 + j * 1.3, { hang: 0.45 }));

  k.solid([W + 0.4, 2.8, 2.5], [0, 1.1, -0.05]);

  // Title sign on the roof, turned to face the south (the camera).
  const sk = k.at(0, 0, -0.1, -k.rotY);
  const slot = labels.slot(620, 220, (g, w, h) => {
    g.fillStyle = col; g.fillRect(-4, -4, w + 8, h + 8);
    g.strokeStyle = '#fbf0dc'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
    triangleBorder(g, 22, w - 22, h - 18, 22, ['#fbf0dc', '#f0b12e'], true);
    fitText(g, proj.title, '"Aref Ruqaa", "Reem Kufi", serif', 128, w - 80, w / 2, h / 2 - 8, '#fbf0dc', { shadow: 'rgba(0,0,0,0.35)' });
  });
  for (const sx of [-1, 1]) sk.cyl(0.05, 0.05, 1.2, P.wood, { position: [sx * 1.0, 3.3, -0.05] }, 5);
  board(sk, P, labels, slot, 2.3, 0.82, 0, 3.9, 0, { tilt: 0.28 });

  // knockable stuff beside the stall
  const a = k.point(-W / 2 - 0.75, 0, 0.6), b = k.point(W / 2 + 0.75, 0, 0.4);
  props.add(i % 2 ? 'basket' : 'crate', a.x, a.z);
  props.add(i % 2 ? 'pot' : 'basket', b.x, b.z);
}

// Coffee pot (دلة).
export function dallah(k, P, x, y, z, s = 1, ry = 0) {
  const dk = k.at(x, y, z, ry);
  dk.add(G.lathe('dallah', [[0, 0], [0.13, 0], [0.14, 0.05], [0.13, 0.12], [0.075, 0.2], [0.07, 0.27], [0.1, 0.31], [0.09, 0.34], [0.05, 0.4], [0.02, 0.46], [0, 0.47]], 8), P.brass, { scale: s });
  dk.cone(0.035 * s, 0.26 * s, P.brass, { position: [0.14 * s, 0.25 * s, 0], rotation: [0, 0, -0.9] }, 5);
  dk.add(G.torus(0.09 * s, 0.015 * s, 3, 6, Math.PI), shade(P.brass, -0.1), { position: [-0.1 * s, 0.22 * s, 0], rotation: [0, 0, Math.PI / 2 + 0.2] });
}

// ---------------------------------------------------------------- my house
export function home(k, P, labels) {
  const w = 9, d = 6;
  house(k, P, { w, d, floors: 2, style: 'step', door: 'none', seed: 91, color: mix(P.mud, P.mudLight, 0.3), upper: null });
  const fz = d / 2 + 0.02;
  // painted frieze of triangles along the front, at the floor line and top
  const cs = [P.teal, P.saffron, P.red, P.cream];
  for (const y of [3.3, 5.35]) for (let j = 0; j < 22; j++) {
    k.add(G.tri(0.36, 0.3, 0.04), cs[j % 4], { position: [-w / 2 + 0.45 + j * 0.385, y, fz + 0.05 - (y > 4 ? 0.1 : 0.03)], rotation: [0, 0, y > 4 ? Math.PI : 0] });
  }
  // grand door: plaster surround with stepped top, painted leaf
  k.box([2.4, 3.2, 0.12], P.plaster, { position: [0, 1.45, fz] });
  for (let j = 0; j < 3; j++) k.box([2.4 - j * 0.6, 0.22, 0.12], P.plaster, { position: [0, 3.15 + j * 0.22, fz] });
  k.box([1.7, 2.6, 0.1], P.wood, { position: [0, 1.2, fz + 0.06] });
  const door = labels.slot(260, 400, (g, W, H) => paintedDoor(g, W, H));
  labels.plane(k, door, 1.5, 2.4, { position: [0, 1.2, fz + 0.12] });
  // «بيتي» plaque
  const slot = labels.slot(440, 190, (g, W, H) => {
    g.fillStyle = '#f4e4c6'; g.fillRect(-4, -4, W + 8, H + 8);
    g.strokeStyle = '#1f8a8a'; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24);
    triangleBorder(g, 20, W - 20, H - 18, 20, ['#1f8a8a', '#e8742a', '#c43b2e'], true);
    fitText(g, 'بيتي', '"Aref Ruqaa", "Reem Kufi", serif', 132, W - 80, W / 2, H / 2 - 12, '#1f5f6a');
  });
  board(k, P, labels, slot, 1.7, 0.74, 0, 4.25, fz + 0.1, { frame: P.teal });
  // clay benches (دكّة) with cushions either side of the door
  for (const sx of [-1, 1]) {
    k.box([2.2, 0.5, 0.7], P.mudLight, { position: [sx * 2.6, 0.2, fz + 0.35] });
    k.box([2.0, 0.14, 0.6], sx > 0 ? P.crimson : P.teal, { position: [sx * 2.6, 0.5, fz + 0.35] });
    k.box([0.5, 0.35, 0.18], P.saffron, { position: [sx * 2.6 - 0.5, 0.72, fz + 0.12] });
    k.box([0.5, 0.35, 0.18], P.cream, { position: [sx * 2.6 + 0.5, 0.72, fz + 0.12] });
    k.solid([2.2, 0.9, 0.8], [sx * 2.6, 0.3, fz + 0.4]);
    // potted plants at the corners
    const px = sx * 4.05;
    k.add(G.lathe('planter', [[0, 0], [0.25, 0], [0.33, 0.5], [0.36, 0.55], [0, 0.55]], 7), '#b5653a', { position: [px, 0, fz + 0.45] });
    for (let j = 0; j < 5; j++) k.cone(0.14, 0.8, j % 2 ? P.palmLeaf : P.palmLeafDark, { position: [px + Math.sin(j * 1.3) * 0.12, 0.9, fz + 0.45 + Math.cos(j * 1.3) * 0.12], rotation: [Math.sin(j * 2.1) * 0.4, 0, Math.cos(j * 2.1) * 0.4] }, 4);
    k.solidCyl(0.36, 1.0, [px, 0.5, fz + 0.45]);
    lantern(k, P, sx * 1.55, 2.55, fz + 0.3, 5 + sx, { hang: 0 });
    k.box([0.06, 0.06, 0.35], P.ink, { position: [sx * 1.55, 2.78, fz + 0.15] });
  }
}

function paintedDoor(g, W, H) {
  g.fillStyle = '#7a4a2a'; g.fillRect(-4, -4, W + 8, H + 8);
  const pad = 14;
  g.fillStyle = '#1f8a8a'; g.fillRect(pad, pad, W - pad * 2, H - pad * 2);
  // panels of triangles and diamonds
  const cols = ['#f0b12e', '#c43b2e', '#fbf0dc', '#2e3f7f'];
  const rows = 6, cw = (W - pad * 2) / 4, rh = (H - pad * 2) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
    const x = pad + c * cw, y = pad + r * rh;
    g.fillStyle = cols[(r + c) % 4];
    g.beginPath();
    if ((r + c) % 2) { g.moveTo(x, y + rh); g.lineTo(x + cw / 2, y + 4); g.lineTo(x + cw, y + rh); }
    else { g.moveTo(x + cw / 2, y + 4); g.lineTo(x + cw - 4, y + rh / 2); g.lineTo(x + cw / 2, y + rh - 4); g.lineTo(x + 4, y + rh / 2); }
    g.closePath(); g.fill();
  }
  // central rosette and studs
  g.strokeStyle = '#2a1a12'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(W / 2, pad); g.lineTo(W / 2, H - pad); g.stroke();
  g.fillStyle = '#d8a336';
  for (let y = pad + 20; y < H - pad; y += 40) for (const x of [pad + 10, W - pad - 10]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(W / 2, H * 0.5, 26, 0, Math.PI * 2); g.fillStyle = '#fbf0dc'; g.fill();
  g.beginPath(); g.arc(W / 2, H * 0.5, 14, 0, Math.PI * 2); g.fillStyle = '#c43b2e'; g.fill();
}

// ---------------------------------------------------------------- tent + skills
export function tent(k, P, props) {
  const X0 = -5, X1 = 5;
  const poleX = [-4.5, -1.5, 1.5, 4.5];
  const yz = (z) => (z <= 0 ? lerp(1.8, 3.35, (z + 3) / 3) : z <= 3 ? lerp(3.35, 2.85, z / 3) : lerp(2.85, 2.55, (z - 3) / 0.6));
  const sag = (x) => (Math.abs(x) > 4.5 ? 0.3 + (Math.abs(x) - 4.5) * 1.1 : 0.3 * Math.abs(Math.sin(Math.PI * (x + 4.5) / 3)));
  const y = (x, z) => yz(z) - sag(x) * (z < -2.5 ? 0.4 : 1);
  const black = '#2b211c', brown = '#4f3524', cream = '#cdb58c', rust = '#7a3b24';
  const band = [black, black, brown, black, cream, black, brown, black, rust, black, black, brown, black];
  const xs = [], zs = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.625) xs.push(x);
  for (let z = -3; z <= 3.6 + 1e-6; z += 0.55) zs.push(z);
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
      k.add(quadGeo([x0, y(x0, z0), z0], [x0, y(x0, z1), z1], [x1, y(x1, z1), z1], [x1, y(x1, z0), z0]), band[j % band.length], {
        layer: 'fab', attr: (px, py, pz) => [0, 0.035 * Math.max(0, pz - 1) + 0.02, 0],
      });
    }
  }
  // back curtain and side walls down to the sand
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i], x1 = xs[i + 1];
    k.add(quadGeo([x0, -0.1, -3.35], [x0, y(x0, -3), -3], [x1, y(x1, -3), -3], [x1, -0.1, -3.35]), i % 3 === 1 ? brown : black, { layer: 'fab', attr: [0, 0, 0] });
  }
  for (const sx of [-1, 1]) {
    for (let j = 0; j < 7; j++) {
      const z0 = zs[j], z1 = zs[j + 1];
      k.add(quadGeo([sx * 5.25, -0.1, z0], [sx * 5, y(5, z0), z0], [sx * 5, y(5, z1), z1], [sx * 5.25, -0.1, z1]), j % 2 ? brown : black, { layer: 'fab', attr: [0.03 * sx, 0, 0] });
    }
  }
  // poles
  for (const x of poleX) {
    for (const z of [3, 0]) {
      const h = y(x, z) + 0.15;
      k.cyl(0.07, 0.09, h, P.woodLight, { position: [x, h / 2, z] }, 6);
      k.solidCyl(0.15, 3, [x, 1.5, z]);
    }
  }
  // guy ropes and stakes
  const rope = '#e2cfa4';
  const ropes = [
    [[-4.5, y(-4.5, 3.4), 3.5], [-6.6, 0.1, 5.6]], [[4.5, y(4.5, 3.4), 3.5], [6.6, 0.1, 5.6]],
    [[-5, y(-5, -1.5), -1.5], [-7.4, 0.1, -2]], [[5, y(5, -1.5), -1.5], [7.4, 0.1, -2]],
    [[-5, y(-5, 1), 1], [-7.4, 0.1, 1.6]], [[5, y(5, 1), 1], [7.4, 0.1, 1.6]],
    [[-3, y(-3, -3), -3], [-3.4, 0.1, -5.2]], [[0, y(0, -3), -3], [0, 0.1, -5.3]], [[3, y(3, -3), -3], [3.4, 0.1, -5.2]],
  ];
  for (const [a, b] of ropes) {
    k.rod(a, b, 0.025, rope);
    k.cyl(0.04, 0.03, 0.4, P.wood, { position: [b[0], 0.1, b[2]] }, 4);
  }
  k.solid([10.6, 2.4, 0.5], [0, 1.1, -3.15]);
  for (const sx of [-1, 1]) k.solid([0.5, 2.4, 3.8], [sx * 5.1, 1.1, -1.2]);

  // inside: rugs, cushions, a painted divider
  k.box([9.4, 0.04, 5.6], P.crimson, { position: [0, 0.03, 0] });
  for (const z of [-2.4, 2.4]) k.box([9.4, 0.045, 0.2], P.saffron, { position: [0, 0.035, z] });
  for (let i = 0; i < 6; i++) k.box([0.6, 0.05, 0.6], i % 2 ? P.cream : P.indigo, { position: [-3.75 + i * 1.5, 0.04, 0], rotation: [0, Math.PI / 4, 0] });
  const cc = [P.red, P.teal, P.saffron, P.crimson, P.indigo, P.orange];
  for (let i = 0; i < 7; i++) {
    const x = -4.1 + i * 1.37;
    k.box([1.25, 0.32, 0.65], cc[i % cc.length], { position: [x, 0.18, -2.45] });
    k.box([1.2, 0.55, 0.22], cc[(i + 2) % cc.length], { position: [x, 0.55, -2.82], rotation: [-0.12, 0, 0] });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) {
    k.box([0.65, 0.32, 1.25], cc[(i + (sx > 0 ? 3 : 0)) % 6], { position: [sx * 4.45, 0.18, -1.3 + i * 1.4] });
  }
  k.solid([9.6, 0.9, 1.2], [0, 0.3, -2.55]);
  // a lantern from the middle pole
  lantern(k, P, 0, 2.5, 0.2, 9.2, { hang: 0.6 });
  lantern(k, P, -1.5, 2.3, 2.85, 7.7, { hang: 0.4 });
  lantern(k, P, 1.5, 2.3, 2.85, 3.3, { hang: 0.4 });

  // coffee corner outside: fire pit, dallahs, cups on a tray
  const fx = -3.8, fz = 4.7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.ball(0.17, i % 2 ? P.rock : P.rockDark, { position: [fx + Math.sin(a) * 0.55, 0.08, fz + Math.cos(a) * 0.55], scale: [1, 0.7, 1] });
  }
  k.cyl(0.42, 0.45, 0.06, '#3a2a20', { position: [fx, 0.03, fz] }, 8);
  for (let i = 0; i < 4; i++) k.cone(0.12, 0.22, i % 2 ? '#ff8a2a' : '#ffc34a', { position: [fx + Math.sin(i * 1.7) * 0.18, 0.13, fz + Math.cos(i * 1.7) * 0.18], layer: 'glow', attr: 11 + i }, 5);
  for (let i = 0; i < 3; i++) k.cyl(0.05, 0.05, 0.7, P.wood, { position: [fx, 0.12, fz], rotation: [Math.PI / 2, i * 1.05, 0, 'YXZ'] }, 5);
  k.solidCyl(0.72, 0.5, [fx, 0.25, fz]);
  dallah(k, P, fx + 0.45, 0.02, fz - 0.15, 1.3, 0.4);
  const rx = -5.6, rz = 5.2;
  k.box([1.8, 0.04, 1.3], P.red, { position: [rx, 0.03, rz] });
  k.box([1.8, 0.045, 0.12], P.cream, { position: [rx, 0.035, rz - 0.45] });
  k.cyl(0.4, 0.4, 0.04, P.brass, { position: [rx + 0.2, 0.07, rz] }, 10);
  dallah(k, P, rx + 0.05, 0.09, rz - 0.05, 1.1, -0.5);
  for (let i = 0; i < 5; i++) k.cyl(0.05, 0.035, 0.07, P.cream, { position: [rx + 0.3 + Math.sin(i * 1.25) * 0.24, 0.12, rz + Math.cos(i * 1.25) * 0.24] }, 6);
  for (const sx of [-1, 1]) k.box([0.7, 0.2, 0.5], sx > 0 ? P.teal : P.saffron, { position: [rx + sx * 0.6, 0.12, rz + 0.55] });

  const a = k.point(6.1, 0, 3.6), b = k.point(-6.2, 0, 2.8);
  props.add('crate', a.x, a.z, 0.3);
  props.add('basket', b.x, b.z);
}

// Wooden signpost with one skill on it, facing south (+z).
export function skillSign(k, P, labels, text, i) {
  const slot = labels.slot(470, 140, (g, w, h) => {
    g.fillStyle = '#c89a64'; g.fillRect(-4, -4, w + 8, h + 8);
    g.fillStyle = '#b8864f';
    for (let y = 0; y < h; y += 34) g.fillRect(0, y + 30, w, 3);
    g.strokeStyle = '#6a3e22'; g.lineWidth = 7; g.strokeRect(9, 9, w - 18, h - 18);
    fitText(g, text, '"Reem Kufi", "Cairo", sans-serif', 76, w - 60, w / 2, h / 2 + 2, '#2a1a12');
  });
  k.cyl(0.07, 0.09, 1.75, P.wood, { position: [0, 0.8, -0.12] }, 5);
  k.cone(0.1, 0.18, P.wood, { position: [0, 1.76, -0.12] }, 4);
  board(k, P, labels, slot, 1.62, 0.48, 0, 1.36, 0, { tilt: 0.3, frame: '#6a3e22' });
  if (i % 3 === 0) {
    k.box([0.55, 0.45, 0.45], P.woodLight, { position: [0.45, 0.2, -0.45], rotation: [0, 0.3, 0] });
  }
  k.solidCyl(0.14, 1.8, [0, 0.9, -0.12]);
}

// ---------------------------------------------------------------- post tower
export function postTower(k, P, labels, props) {
  // k: door (local +z) faces the contact zone; world axes via `wk`.
  const rb = 2.0, rt = 1.55, h = 10.5, ap = Math.cos(Math.PI / 8);
  const rAt = (y) => rb + (rt - rb) * (y + 0.3) / (h + 0.3);
  const oct = { rotation: [0, Math.PI / 8, 0] };
  k.cyl(rt, rb, h + 0.3, mix(P.mud, P.mudLight, 0.15), { ...oct, position: [0, (h + 0.3) / 2 - 0.3, 0] }, 8);
  k.cyl(rb + 0.1, rb + 0.14, 0.55, mix(P.rock, P.mudDark, 0.4), { ...oct, position: [0, 0, 0] }, 8);
  for (const y of [3.5, 7.1]) k.cyl(rAt(y) + 0.07, rAt(y) + 0.07, 0.24, P.mudLight, { ...oct, position: [0, y, 0] }, 8);
  k.cyl(rt + 0.2, rt + 0.12, 0.6, P.mudLight, { ...oct, position: [0, h + 0.1, 0] }, 8);
  k.cyl(rt + 0.3, rt + 0.3, 0.2, P.mudLight, { ...oct, position: [0, h + 0.5, 0] }, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = (rt + 0.2) * ap;
    k.add(G.tri(0.55, 0.6, 0.18), P.mudLight, { position: [Math.sin(a) * r, h + 0.58, Math.cos(a) * r], rotation: [0, a, 0] });
    for (const y of [2.6, 6.2, 9.3]) {
      const rr = rAt(y) * ap;
      if (i === 0 && y < 3) continue;
      for (let j = -1; j <= 1; j++) k.add(G.tri(0.18, 0.24, 0.06), P.ink, { position: [Math.sin(a) * rr + Math.cos(a) * j * 0.26, y, Math.cos(a) * rr - Math.sin(a) * j * 0.26], rotation: [0, a, 0] });
    }
    const y = 7.6, rr = rAt(y) * ap;
    k.cyl(0.07, 0.07, 0.5, P.palmTrunk, { position: [Math.sin(a + 0.4) * rr, y, Math.cos(a + 0.4) * rr], rotation: [Math.PI / 2, a + 0.4, 0, 'YXZ'] }, 5);
  }
  // door facing the zone
  const dz = rAt(1) * ap + 0.02;
  k.box([1.6, 2.55, 0.1], P.plaster, { position: [0, 1.1, dz] });
  k.add(G.tri(1.6, 0.5, 0.1), P.plaster, { position: [0, 2.37, dz] });
  doorLeaf(k, P, 0, dz + 0.04, P.teal);
  lantern(k, P, 1.05, 2.6, dz + 0.3, 2.2, { hang: 0 });
  k.box([0.06, 0.06, 0.35], P.ink, { position: [1.05, 2.82, dz + 0.15] });
  // post box on a stand beside the door, and a satchel of letters
  const pk = k.at(-1.55, 0, dz + 0.45, 0);
  pk.cyl(0.07, 0.08, 1.1, P.wood, { position: [0, 0.55, 0] }, 5);
  pk.box([0.6, 0.55, 0.45], P.red, { position: [0, 1.35, 0] });
  pk.box([0.66, 0.1, 0.5], P.crimson, { position: [0, 1.66, 0] });
  pk.box([0.36, 0.05, 0.02], P.ink, { position: [0, 1.45, 0.23] });
  pk.box([0.3, 0.2, 0.02], P.cream, { position: [0, 1.53, 0.26], rotation: [0.4, 0, 0] });
  pk.solidCyl(0.35, 1.8, [0, 0.9, 0]);
  const lk = k.at(1.5, 0, dz + 0.4, 0.3);
  lk.cyl(0.3, 0.24, 0.35, '#d6b06a', { position: [0, 0.17, 0] }, 8);
  for (let j = 0; j < 5; j++) lk.box([0.34, 0.02, 0.22], j % 2 ? P.cream : P.plaster, { position: [0, 0.37 + j * 0.03, 0], rotation: [0, j * 0.5, 0.15] });
  lk.ball(0.04, P.red, { position: [0.05, 0.5, 0.02] });

  // World-aligned frame for the roof and the south-facing sign.
  const wk = k.at(0, 0, 0, -k.rotY);
  // pigeon coop on the roof
  wk.box([1.3, 0.85, 0.8], P.woodLight, { position: [0.1, h + 0.45, -0.35] });
  wk.add(G.tri(1.5, 0.45, 1.0), P.wood, { position: [0.1, h + 0.87, -0.35] });
  for (let j = 0; j < 3; j++) wk.cyl(0.11, 0.11, 0.05, P.ink, { position: [-0.3 + j * 0.4, h + 0.5, 0.06], rotation: [Math.PI / 2, 0, 0] }, 8);
  wk.box([1.3, 0.05, 0.25], P.wood, { position: [0.1, h + 0.2, 0.15] });
  for (let j = 0; j < 3; j++) pigeon(wk, P, [-0.35 + j * 0.45, h + 0.24 + (j === 1 ? 0.0 : 0), 0.18], j * 1.2 - 0.6, j === 1 ? '#9aa0a8' : '#eef0ee');
  pigeon(wk, P, [0.1, h + 1.1, -0.35], 2.4, '#eef0ee');
  // flag
  wk.cyl(0.05, 0.06, 4.2, P.wood, { position: [-0.9, h + 2.1, 0.3] }, 5);
  wk.ball(0.1, P.brass, { position: [-0.9, h + 4.25, 0.3] });
  const fy = h + 3.6, fx = -0.88;
  const flap = (x) => [0, 0, Math.max(0, x - fx) * 0.22];
  wk.add(new THREE.PlaneGeometry(1.9, 1.1, 5, 2).translate(0.95, 0, 0), P.teal, { layer: 'fab', position: [fx + 0.3, fy, 0.3], attr: flap });
  wk.add(new THREE.PlaneGeometry(0.3, 1.1, 1, 2).translate(0.15, 0, 0), P.saffron, { layer: 'fab', position: [fx, fy, 0.3], attr: flap });
  wk.add(G.tri(0.5, 0.4, 0.004), P.cream, { layer: 'fab', position: [fx + 1.25, fy - 0.2, 0.31], attr: flap });

  // «تواصل معي» sign on the south face
  const slot = labels.slot(640, 200, (g, w, h2) => {
    g.fillStyle = '#1f8a8a'; g.fillRect(-4, -4, w + 8, h2 + 8);
    g.strokeStyle = '#fbf0dc'; g.lineWidth = 8; g.strokeRect(12, 12, w - 24, h2 - 24);
    triangleBorder(g, 20, w - 20, h2 - 18, 22, ['#f0b12e', '#fbf0dc'], true);
    fitText(g, 'تواصل معي', '"Reem Kufi", "Cairo", sans-serif', 104, w - 80, w / 2, h2 / 2 - 10, '#fbf0dc', { shadow: 'rgba(0,0,0,0.3)' });
  });
  const sy = 4.6;
  board(wk, P, labels, slot, 2.5, 0.78, 0, sy, rAt(sy) * ap + 0.12, { frame: P.wood });

  k.solidCyl(rb, h + 0.6, [0, (h + 0.6) / 2 - 0.3, 0]);
  const p1 = k.point(2.2, 0, 2.2), p2 = k.point(-2.4, 0, 1.6);
  props.add('crate', p1.x, p1.z, 0.5);
  props.add('basket', p2.x, p2.z);
}

function pigeon(k, P, p, ry, c) {
  const pk = k.at(p[0], p[1], p[2], ry);
  pk.ball(0.1, c, { position: [0, 0.1, 0], scale: [0.8, 0.8, 1.3] });
  pk.ball(0.06, c, { position: [0, 0.2, 0.1] });
  pk.cone(0.025, 0.06, P.orange, { position: [0, 0.2, 0.17], rotation: [Math.PI / 2, 0, 0] }, 4);
  pk.add(G.tri(0.12, 0.14, 0.02), shade(c, -0.15), { position: [0, 0.1, -0.12], rotation: [-Math.PI / 2 - 0.3, 0, 0] });
}

// ---------------------------------------------------------------- well + plaza
export function plaza(k, P, heightAt, cx, cz, B, props) {
  const rnd = rng(5);
  const tileC = [P.path, P.sandLight, mix(P.rock, P.sandLight, 0.5), mix(P.path, P.rock, 0.3)];
  for (const r of [2.1, 3.05, 4.0, 4.95, 5.9]) {
    const n = Math.round((2 * Math.PI * r) / 1.0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      const y = heightAt(cx + x, cz + z) - k.point(0, 0, 0).y;
      k.box([(2 * Math.PI * r) / n - 0.1, 0.1, 0.84], tileC[Math.floor(rnd() * tileC.length)], { position: [x, y + 0.02, z], rotation: [0, a, 0] });
    }
  }
  // well ring
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    k.box([0.64, 0.95, 0.34], i % 3 === 0 ? P.rockDark : i % 3 === 1 ? P.rock : mix(P.rock, P.plaster, 0.4), { position: [Math.sin(a) * 1.1, 0.4, Math.cos(a) * 1.1], rotation: [0, a, 0] });
    k.box([0.66, 0.14, 0.4], P.plaster, { position: [Math.sin(a) * 1.1, 0.94, Math.cos(a) * 1.1], rotation: [0, a, 0] });
  }
  k.cyl(0.95, 0.95, 0.05, P.waterDeep, { position: [0, 0.55, 0] }, 12);
  k.solidCyl(1.3, 1.2, [0, 0.5, 0]);
  // posts, beam, pulley
  for (const sx of [-1, 1]) {
    k.cyl(0.1, 0.12, 2.9, P.wood, { position: [sx * 1.1, 1.45, 0] }, 6);
    k.box([0.3, 0.1, 0.3], P.wood, { position: [sx * 1.1, 2.9, 0] });
  }
  k.cyl(0.07, 0.07, 2.5, P.woodLight, { position: [0, 2.72, 0], rotation: [0, 0, Math.PI / 2] }, 6);
  k.cyl(0.24, 0.24, 0.1, P.wood, { position: [0, 2.72, 0], rotation: [0, 0, Math.PI / 2] }, 8);
  lantern(k, P, 1.1, 2.35, 0.25, 4.4, { hang: 0.45 });
  // trough next to the well
  k.box([2.0, 0.55, 0.7], P.rock, { position: [0, 0.27, -2.3] });
  k.box([1.8, 0.05, 0.5], P.water, { position: [0, 0.5, -2.3] });
  k.solid([2.0, 0.8, 0.7], [0, 0.3, -2.3]);

  // swinging rope + bucket (own mesh)
  const b = new B();
  b.cyl(0.015, 0.015, 1.2, '#e2cfa4', { position: [0.22, -0.6, 0] }, 4);
  b.cyl(0.2, 0.15, 0.32, P.wood, { position: [0.22, -1.32, 0] }, 7);
  b.cyl(0.205, 0.205, 0.04, P.ink, { position: [0.22, -1.22, 0] }, 7);
  b.cyl(0.155, 0.155, 0.04, P.ink, { position: [0.22, -1.44, 0] }, 7);
  b.add(G.torus(0.18, 0.012, 3, 8, Math.PI), P.ink, { position: [0.22, -1.16, 0] });
  const bucket = b.build();
  bucket.position.copy(k.point(0, 2.72, 0));

  // props around the plaza
  const around = [['pot', 2.3, 0.6], ['basket', 2.4, -1.7], ['pot', -2.3, 1.2], ['pot', -2.45, 0.55], ['crate', -1.8, -1.9], ['basket', 1.5, 2.5], ['crate', 5.3, 3.6]];
  for (const [t, x, z] of around) { const p = k.point(x, 0, z); props.add(t, p.x, p.z, rnd() * 3); }
  return bucket;
}

// ---------------------------------------------------------------- oasis
export function oasisBits(root, P, heightAt, zone, pond, labels) {
  const dx = pond.x - zone.x, dz = pond.z - zone.z;
  const len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  const ry = Math.atan2(ux, uz);
  // find the shore
  let t = 0;
  while (t < len && heightAt(zone.x + ux * t, zone.z + uz * t) > pond.water + 0.05) t += 0.25;
  const sx = zone.x + ux * (t - 1.6), sz = zone.z + uz * (t - 1.6);
  const deckY = Math.max(heightAt(sx, sz) + 0.12, pond.water + 0.5);
  const jk = root.at(sx, deckY, sz, ry);
  const L = 5.2;
  for (let i = 0; i < 13; i++) jk.box([1.7, 0.08, 0.36], i % 2 ? P.woodLight : shade(P.woodLight, -0.06), { position: [0, 0, 0.2 + i * 0.4] });
  for (const x of [-0.8, 0.8]) {
    jk.box([0.1, 0.12, L], P.wood, { position: [x, -0.1, L / 2] });
    for (const z of [0.4, 2.6, L - 0.2]) {
      const gy = heightAt(...(() => { const p = jk.point(x, 0, z); return [p.x, p.z]; })()) - deckY;
      const hh = Math.max(0.6, -gy + 0.5);
      jk.cyl(0.08, 0.08, hh + 0.5, P.wood, { position: [x, -hh / 2 + 0.25, z] }, 5);
    }
  }
  jk.cyl(0.07, 0.08, 1.8, P.wood, { position: [0.8, 0.9, L - 0.2] }, 5);
  jk.box([0.5, 0.06, 0.06], P.wood, { position: [0.6, 1.7, L - 0.2] });
  lantern(jk, P, 0.4, 1.35, L - 0.2, 6.6, { hang: 0.3 });
  jk.solid([1.8, 0.3, L], [0, -0.1, L / 2]);

  // bench on the bank, looking at the water
  const px = -uz, pz = ux;
  const bx = zone.x + px * 3.9 - ux * 0.3, bz = zone.z + pz * 3.9 - uz * 0.3;
  const bk = root.at(bx, heightAt(bx, bz), bz, ry);
  bk.box([2.2, 0.1, 0.55], P.woodLight, { position: [0, 0.5, 0] });
  bk.box([2.2, 0.45, 0.08], P.woodLight, { position: [0, 0.85, -0.3], rotation: [-0.15, 0, 0] });
  for (const x of [-0.95, 0.95]) {
    bk.box([0.12, 0.55, 0.5], P.wood, { position: [x, 0.25, 0] });
    bk.box([0.1, 0.6, 0.1], P.wood, { position: [x, 0.75, -0.3] });
  }
  bk.box([0.5, 0.12, 0.4], P.teal, { position: [-0.5, 0.6, 0] });
  bk.solid([2.3, 1.2, 0.8], [0, 0.5, -0.05]);
}

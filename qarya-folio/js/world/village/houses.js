import { G, mix, shade, rng, fitText, triangleBorder } from './kit.js';

// البيوت الطينية: Najdi-style mud-brick houses. Walls lean in slightly, a
// whitewashed band runs under a parapet crowned with triangular or stepped
// merlons, rows of palm-trunk beams poke out at each floor, wooden spouts
// throw rain off the roof, and small triangular vents pierce the upper wall.

const FLOOR = 3.1;
const TAPER = 0.965;

// One face of a building. `k` is at the foot of the face, local +z outward,
// `half` = half the building's depth along that normal, `fw` = face width.
function face(k, P, s, fw, half, H, rnd, opts) {
  const inset = (y) => -half * (1 - TAPER) * (y + 0.3) / (H + 0.3);
  const margin = 0.55;

  // Palm-trunk beam ends at every floor line.
  const floors = s.floors === 2 ? [FLOOR - 0.15, H - 0.1] : [H - 0.1];
  for (const y of floors) {
    const n = Math.max(2, Math.floor((fw - margin * 2) / 0.85));
    for (let i = 0; i <= n; i++) {
      const x = -fw / 2 + margin + (fw - margin * 2) * (i / n);
      if (opts.door && Math.abs(x - opts.doorX) < 0.9 && y < 3) continue;
      k.cyl(0.075, 0.075, 0.42, P.palmTrunk, { position: [x, y, inset(y) + 0.12], rotation: [Math.PI / 2, 0, 0] }, 5);
    }
  }

  // Rain spouts (مرازيم) near the top.
  const spouts = fw > 4.5 ? [-fw / 3, fw / 3] : [fw * (rnd() - 0.5) * 0.6];
  for (const x of spouts) {
    k.box([0.16, 0.13, 0.95], P.wood, { position: [x, H + 0.05, inset(H) + 0.32], rotation: [0.2, 0, 0] });
  }

  // Triangular vents under each ceiling.
  const tops = s.floors === 2 ? [FLOOR - 0.75, H - 0.75] : [H - 0.75];
  for (const y of tops) {
    const groups = fw > 5 ? [-fw / 4, fw / 4] : [0];
    for (const gx of groups) {
      if (opts.door && Math.abs(gx - opts.doorX) < 1.2 && y < 3) continue;
      const n = 3;
      for (let i = 0; i < n; i++) {
        const x = gx + (i - (n - 1) / 2) * 0.34;
        k.add(G.tri(0.2, 0.26, 0.06), P.ink, { position: [x, y, inset(y) + 0.02] });
      }
    }
  }

  // Small shuttered windows on the upper floor.
  if (s.floors === 2 && fw > 3.6) {
    const xs = fw > 6 ? [-fw / 4, fw / 4] : [0];
    for (const x of xs) {
      const y = FLOOR + 1.2;
      k.box([0.75, 0.85, 0.06], P.plaster, { position: [x, y, inset(y) + 0.02] });
      k.box([0.55, 0.65, 0.08], P.woodLight, { position: [x, y, inset(y) + 0.03] });
      k.box([0.05, 0.65, 0.1], P.wood, { position: [x, y, inset(y) + 0.04] });
    }
  }

  // Door.
  if (opts.door) {
    const x = opts.doorX, z = inset(1) + 0.02;
    k.box([1.6, 2.55, 0.08], P.plaster, { position: [x, 1.1, z] });
    k.add(G.tri(1.6, 0.55, 0.08), P.plaster, { position: [x, 2.37, z] });
    doorLeaf(k, P, x, z + 0.03, opts.doorColor);
  }
}

export function doorLeaf(k, P, x, z, accent) {
  k.box([1.12, 2.1, 0.08], P.wood, { position: [x, 0.9, z] });
  for (let i = 0; i < 3; i++) k.box([0.3, 2.0, 0.06], i === 1 ? P.woodLight : shade(P.wood, 0.04), { position: [x + (i - 1) * 0.34, 0.9, z + 0.04] });
  if (accent) {
    // painted band of triangles across the top
    for (let i = 0; i < 4; i++) k.add(G.tri(0.26, 0.24, 0.03), i % 2 ? P.saffron : accent, { position: [x - 0.39 + i * 0.26, 1.62, z + 0.08] });
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) k.box([0.06, 0.06, 0.04], P.brass, { position: [x - 0.35 + c * 0.7, 0.35 + r * 0.6, z + 0.08] });
  k.box([0.06, 0.2, 0.06], P.ink, { position: [x + 0.4, 0.95, z + 0.09] });
}

// Parapet + merlons around a (w × d) roof at height H.
function parapet(k, P, w, d, H, style, color) {
  const t = 0.22, ph = 0.5;
  const y = H + ph / 2;
  k.box([w, ph, t], color, { position: [0, y, d / 2 - t / 2] });
  k.box([w, ph, t], color, { position: [0, y, -d / 2 + t / 2] });
  k.box([t, ph, d - t * 2], color, { position: [w / 2 - t / 2, y, 0] });
  k.box([t, ph, d - t * 2], color, { position: [-w / 2 + t / 2, y, 0] });
  const top = H + ph;
  const edge = (len, place) => {
    const n = Math.max(2, Math.round((len - 1.0) / 0.62));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + 0.5 + (len - 1.0) * ((i + 0.5) / n);
      place(u);
    }
  };
  const merlon = (x, z, ry) => {
    if (style === 'step') {
      k.box([0.44, 0.16, 0.2], color, { position: [x, top + 0.08, z], rotation: [0, ry, 0] });
      k.box([0.28, 0.16, 0.2], color, { position: [x, top + 0.24, z], rotation: [0, ry, 0] });
      k.box([0.12, 0.16, 0.2], color, { position: [x, top + 0.4, z], rotation: [0, ry, 0] });
    } else {
      k.add(G.tri(0.44, 0.5, 0.2), color, { position: [x, top, z], rotation: [0, ry, 0] });
    }
  };
  edge(w, (u) => merlon(u, d / 2 - t / 2, 0));
  edge(w, (u) => merlon(u, -d / 2 + t / 2, 0));
  edge(d, (u) => merlon(w / 2 - t / 2, u, Math.PI / 2));
  edge(d, (u) => merlon(-w / 2 + t / 2, u, Math.PI / 2));
  // Stepped corner pillars.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - 0.2), z = sz * (d / 2 - 0.2);
    k.box([0.5, 0.35, 0.5], color, { position: [x, top + 0.17, z] });
    k.box([0.34, 0.3, 0.34], color, { position: [x, top + 0.5, z] });
    k.cone(0.16, 0.35, color, { position: [x, top + 0.82, z], rotation: [0, Math.PI / 4, 0] }, 4);
  }
}

// A house: `k` at ground centre, front = local +z.
// s = { w, d, floors, style: 'tri'|'step', door: 'front'|'right'|'left'|'back', doorX, upper: {w, d, x, z, door}, roof: bool, seed, doorColor }
export function house(k, P, s, { collide = true, base = true } = {}) {
  const rnd = rng(s.seed || 7);
  const H = s.floors === 2 ? FLOOR * 2 - 0.2 : FLOOR;
  const wall = s.color || mix(P.mud, P.mudLight, 0.1 + rnd() * 0.3);
  const band = mix(P.mudLight, P.plaster, 0.4 + rnd() * 0.3);

  k.taper([s.w, H + 0.3, s.d], wall, { position: [0, (H + 0.3) / 2 - 0.3, 0] }, TAPER);
  if (base) k.box([s.w + 0.14, 0.45, s.d + 0.14], mix(P.rock, P.mudDark, 0.4), { position: [0, 0.0, 0] });
  // Plaster band under the parapet and at the floor line.
  const tw = s.w * (1 - (1 - TAPER) * 0.97), td = s.d * (1 - (1 - TAPER) * 0.97);
  k.box([tw + 0.06, 0.34, td + 0.06], band, { position: [0, H - 0.2, 0] });
  if (s.floors === 2) k.box([s.w * 0.985 + 0.05, 0.14, s.d * 0.985 + 0.05], band, { position: [0, FLOOR - 0.05, 0] });
  parapet(k, P, tw, td, H, s.style || 'tri', band);

  const faces = [
    ['front', k.at(0, 0, s.d / 2, 0), s.w, s.d / 2],
    ['right', k.at(s.w / 2, 0, 0, Math.PI / 2), s.d, s.w / 2],
    ['back', k.at(0, 0, -s.d / 2, Math.PI), s.w, s.d / 2],
    ['left', k.at(-s.w / 2, 0, 0, -Math.PI / 2), s.d, s.w / 2],
  ];
  for (const [name, fk, fw, half] of faces) {
    const door = name === (s.door || 'front');
    face(fk, P, s, fw, half, H, rnd, { door, doorX: s.doorX || 0, doorColor: s.doorColor });
  }

  // Roof life: a hatch, sometimes a water jar or a drying mat of dates.
  k.box([0.8, 0.25, 0.8], shade(wall, -0.05), { position: [s.w * 0.2, H + 0.12, -s.d * 0.2] });
  if (rnd() < 0.6) {
    k.add(G.lathe('jar', [[0, 0], [0.22, 0.05], [0.3, 0.3], [0.2, 0.6], [0.12, 0.66], [0.14, 0.72], [0, 0.72]], 7), P.mudDark, { position: [-s.w * 0.25, H, s.d * 0.15] });
  }
  if (rnd() < 0.5) {
    const mx = -s.w * 0.15, mz = -s.d * 0.18;
    k.box([1.4, 0.04, 1.0], P.saffron, { position: [mx, H + 0.02, mz] });
    for (let i = 0; i < 10; i++) k.ball(0.07, P.date, { position: [mx - 0.55 + rnd() * 1.1, H + 0.08, mz - 0.4 + rnd() * 0.8] });
  }

  if (s.upper) {
    const u = s.upper;
    house(k.at(u.x, H, u.z, 0), P, { w: u.w, d: u.d, floors: 1, style: s.style, door: u.door || 'front', seed: (s.seed || 7) + 11, color: wall }, { collide: false, base: false });
  }
  if (collide) k.solid([s.w, H + 0.8, s.d], [0, (H + 0.8) / 2 - 0.3, 0]);
  return H;
}

// Low mud wall between two local points (xz), with merlons along the top.
export function wall(k, P, a, b, h = 2.1, t = 0.6, { merlons = true } = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const ry = Math.atan2(-dz, dx);
  const wk = k.at((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, ry);
  wk.taper([len, h + 0.3, t], P.mud, { position: [0, (h + 0.3) / 2 - 0.3, 0] }, 0.9);
  wk.box([len + 0.02, 0.18, t * 0.95], P.mudLight, { position: [0, h - 0.05, 0] });
  if (merlons) {
    const n = Math.max(1, Math.floor(len / 0.8));
    for (let i = 0; i < n; i++) wk.add(G.tri(0.42, 0.42, t * 0.7), P.mudLight, { position: [-len / 2 + (i + 0.5) * (len / n), h + 0.04, 0] });
  }
  // a few beam ends for texture
  for (let x = -len / 2 + 0.8; x < len / 2 - 0.4; x += 1.6) {
    wk.cyl(0.06, 0.06, t + 0.3, P.palmTrunk, { position: [x, h - 0.45, 0], rotation: [Math.PI / 2, 0, 0] }, 5);
  }
  wk.solid([len, h + 0.6, t], [0, (h + 0.6) / 2 - 0.3, 0]);
}

// Round tapered watchtower (مرقب).
export function watchtower(k, P, { r = 1.9, h = 8.5, seed = 3, collide = true } = {}) {
  const rt = r * 0.76;
  k.cyl(rt, r, h + 0.3, P.mud, { position: [0, (h + 0.3) / 2 - 0.3, 0] }, 10);
  k.cyl(r + 0.08, r + 0.1, 0.5, mix(P.rock, P.mudDark, 0.4), { position: [0, 0, 0] }, 10);
  const rAt = (y) => r + (rt - r) * (y + 0.3) / (h + 0.3);
  // bands
  for (const y of [h * 0.45, h - 0.2]) k.cyl(rAt(y) + 0.06, rAt(y) + 0.06, 0.28, P.mudLight, { position: [0, y, 0] }, 10);
  // parapet ring with merlons
  k.cyl(rt + 0.12, rt + 0.1, 0.55, P.mudLight, { position: [0, h + 0.27, 0] }, 10);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.add(G.tri(0.5, 0.55, 0.2), P.mudLight, { position: [Math.sin(a) * (rt + 0.05), h + 0.54, Math.cos(a) * (rt + 0.05)], rotation: [0, a, 0] });
  }
  // vents and beam ends in rings
  const rnd = rng(seed);
  for (const y of [h * 0.3, h * 0.62, h - 0.9]) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.2 + y;
      const rr = rAt(y);
      k.add(G.tri(0.2, 0.28, 0.08), P.ink, { position: [Math.sin(a) * (rr + 0.0), y, Math.cos(a) * (rr + 0.0)], rotation: [0, a, 0] });
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const y = h * 0.45 - 0.4, rr = rAt(y);
    k.cyl(0.07, 0.07, 0.5, P.palmTrunk, { position: [Math.sin(a) * rr, y, Math.cos(a) * rr], rotation: [Math.PI / 2, a, 0, 'YXZ'] }, 5);
  }
  if (collide) k.solidCyl(r, h + 0.6, [0, (h + 0.6) / 2 - 0.3, 0]);
}

// Hanging brass lantern: frame into `stat`, glass into `glow`.
export function lantern(k, P, x, y, z, phase = 0, { hang = 0.3, s = 1 } = {}) {
  if (hang > 0) k.rod([x, y + hang, z], [x, y + 0.28 * s, z], 0.012, P.ink);
  k.cone(0.2 * s, 0.2 * s, P.brass, { position: [x, y + 0.2 * s, z] }, 6);
  k.cyl(0.14 * s, 0.14 * s, 0.05 * s, P.brass, { position: [x, y - 0.18 * s, z] }, 6);
  k.cyl(0.13 * s, 0.1 * s, 0.3 * s, '#ffd58a', { position: [x, y - 0.02 * s, z], layer: 'glow', attr: phase }, 6);
  k.ball(0.04 * s, P.brass, { position: [x, y + 0.33 * s, z] });
}

// The village gate: arched mud gateway with a welcome sign.
export function gate(k, P, labels) {
  const W = 9.2, Hh = 7.6, hw = 2.45, sh = 3.7, D = 2.2;
  k.add(G.arch(W, Hh, hw, sh, D), P.mud, { position: [0, -0.2, 0] });
  // plaster trim around the arch, both faces
  for (const z of [D / 2 + 0.03, -D / 2 - 0.03]) k.add(G.archRing(hw, sh - 0.2, 0.35, 0.1), P.plaster, { position: [0, -0.2, z] });
  // stone threshold and plinth
  const pw = W / 2 - hw + 0.1;
  for (const sx of [-1, 1]) k.box([pw, 0.5, D + 0.2], mix(P.rock, P.mudDark, 0.3), { position: [sx * (hw - 0.05 + pw / 2), 0, 0] });
  k.box([hw * 2, 0.06, D + 1.2], P.rock, { position: [0, 0.0, 0] });
  // top band + parapet
  k.box([W + 0.1, 0.3, D + 0.1], P.mudLight, { position: [0, Hh - 0.35, 0] });
  parapet(k, P, W, D, Hh - 0.2, 'step', P.mudLight);
  // flanking buttress towers
  for (const sx of [-1, 1]) {
    const bk = k.at(sx * (W / 2 + 0.55), 0, 0, 0);
    bk.taper([1.6, 9.1, 2.6], P.mud, { position: [0, 4.35, 0] }, 0.86);
    bk.box([1.55, 0.3, 2.5], P.mudLight, { position: [0, 8.3, 0] });
    bk.box([1.2, 0.35, 2.1], P.mudLight, { position: [0, 8.9, 0] });
    bk.box([0.8, 0.35, 1.5], P.mudLight, { position: [0, 9.2, 0] });
    bk.cone(0.3, 0.6, P.mudLight, { position: [0, 9.65, 0], rotation: [0, Math.PI / 4, 0] }, 4);
    for (const y of [2.2, 5.4]) for (let i = 0; i < 3; i++) bk.add(G.tri(0.2, 0.28, 0.06), P.ink, { position: [(i - 1) * 0.32, y, 1.23] });
    for (let i = 0; i < 3; i++) bk.cyl(0.07, 0.07, 0.4, P.palmTrunk, { position: [(i - 1) * 0.45, 6.6, 1.2], rotation: [Math.PI / 2, 0, 0] }, 5);
    // pennant on a pole
    bk.cyl(0.04, 0.04, 2.2, P.wood, { position: [0, 10.6, 0] }, 5);
    bk.add(G.tri(0.7, 1.4, 0.02), sx > 0 ? P.teal : P.red, {
      layer: 'fab', position: [sx * 0.02, 11.35, 0], rotation: [0, 0, -Math.PI / 2],
      attr: (x, y, z) => [0, 0, Math.max(0, x) * 0.22],
    });
    bk.solid([1.6, 9, 2.6], [0, 4.2, 0]);
    // lantern bracket beside the arch
    const lx = -sx * (W / 2 + 0.55 - hw - 0.35 - 0.8);
    k.box([0.08, 0.08, 0.6], P.ink, { position: [lx, 3.6, D / 2 + 0.3] });
    lantern(k, P, lx, 3.15, D / 2 + 0.55, sx * 1.7, { hang: 0.45 });
  }
  // opened door leaves, folded back against the inner (north) face
  for (const sx of [-1, 1]) {
    const dk = k.at(sx * (hw + 1.2), 0, -D / 2 - 0.1, Math.PI);
    dk.box([2.3, 3.6, 0.14], P.wood, { position: [0, 1.8, 0] });
    for (let i = 0; i < 5; i++) dk.box([0.08, 3.5, 0.18], shade(P.wood, -0.05), { position: [-0.95 + i * 0.475, 1.8, 0] });
    for (const y of [0.7, 2.9]) dk.box([2.2, 0.12, 0.2], P.ink, { position: [0, y, 0] });
  }
  // colliders: the two piers and the span above the arch
  const pier = W / 2 - hw;
  for (const sx of [-1, 1]) k.solid([pier, Hh, D], [sx * (hw + pier / 2), Hh / 2 - 0.2, 0]);
  k.solid([hw * 2, Hh - sh - hw + 0.2, D], [0, (sh + hw + Hh) / 2 - 0.2, 0]);

  // Welcome sign on the south face, above the arch.
  const sw = 6.2, shh = 1.18, sy = 6.75;
  k.box([sw + 0.3, shh + 0.3, 0.14], P.wood, { position: [0, sy, D / 2 + 0.08] });
  for (const x of [-sw / 2 - 0.05, sw / 2 + 0.05]) k.box([0.12, 0.12, 0.5], P.ink, { position: [x, sy, D / 2 + 0.25] });
  const slot = labels.slot(1400, 266, (g, w, h) => {
    g.fillStyle = '#5a3520'; g.fillRect(-4, -4, w + 8, h + 8);
    g.fillStyle = '#6e4428'; g.fillRect(14, 14, w - 28, h - 28);
    g.strokeStyle = '#e9c08c'; g.lineWidth = 5; g.strokeRect(24, 24, w - 48, h - 48);
    triangleBorder(g, 34, w - 34, h - 30, 26, ['#f0b12e', '#c43b2e', '#1f8a8a'], true);
    triangleBorder(g, 34, w - 34, 30, 26, ['#1f8a8a', '#c43b2e', '#f0b12e'], false);
    fitText(g, 'أهلاً بكم في قرية الواحة', '"Reem Kufi", "Cairo", sans-serif', 124, w - 140, w / 2, h / 2 + 4, '#fbf0dc', { shadow: 'rgba(0,0,0,0.45)' });
  });
  labels.plane(k, slot, sw, shh * (sw / sw), { position: [0, sy, D / 2 + 0.16] });
}

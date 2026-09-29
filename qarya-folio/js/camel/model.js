import * as THREE from 'three';

// The camel's body plan. Every rigid part is its own Group (so it can pivot)
// holding one merged, vertex-coloured, flat-shaded mesh made with ctx.Builder.
//
//   group (placed by the player)          origin = feet centre, faces +Z
//    └ rig          squash & stretch from the feet
//       ├ torso     body, hump, blanket, saddle, bell, tassels, tail
//       │  └ neckBase → n1 → n2 → n3 → head → jaw / eyes / ears
//       └ legs ×4   root (at hip) → upper → knee → foot   (2-bone IK)
//
// Left is +X (the camel faces +Z).

export const DIM = {
  torsoY: 1.55,
  hipF: [0.22, -0.2, 0.6],
  hipH: [0.23, -0.16, -0.62],
  L1: 0.66,
  L2: 0.62,
  PAD: 0.1,
  neckLen: [0.5, 0.45, 0.38],
  neckRest: [1.95, -0.95, -0.75],
  blanketBottom: 1.95,
};

const ico = (d = 1) => new THREE.IcosahedronGeometry(1, d);
const oct = () => new THREE.OctahedronGeometry(1, 0);

// A tapered tube from y=0 to y=len (len<0 hangs downward).
function tube(b, r0, r1, len, color, segs = 7, opts = {}) {
  const g = new THREE.CylinderGeometry(len > 0 ? r1 : r0, len > 0 ? r0 : r1, Math.abs(len), segs);
  g.translate(0, len / 2, 0);
  if (opts.rotation || opts.position) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(opts.position || [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(opts.rotation || [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
  }
  b.add(g, color);
  g.dispose();
}

// Cloth that wraps the body's cylindrical middle.
// bands: [[a0, a1, colour, segments]], a = angle from the top of the back.
function cloth(b, bands, z0, z1, zSegs, sx, sy, radiusAt) {
  for (const [a0, a1, color, segs = 1] of bands) {
    const pos = [];
    for (const side of [1, -1]) {
      for (let i = 0; i < segs; i++) {
        const aa = a0 + (a1 - a0) * (i / segs), ab = a0 + (a1 - a0) * ((i + 1) / segs);
        for (let j = 0; j < zSegs; j++) {
          const za = z0 + (z1 - z0) * (j / zSegs), zb = z0 + (z1 - z0) * ((j + 1) / zSegs);
          const p = (a, z) => { const k = radiusAt(z); return [side * sx * k * Math.sin(a), sy * k * Math.cos(a), z]; };
          const A = p(aa, za), Bz = p(aa, zb), C = p(ab, za), D = p(ab, zb);
          const tris = side > 0 ? [A, Bz, C, C, Bz, D] : [A, C, Bz, C, D, Bz];
          for (const v of tris) pos.push(...v);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    b.add(g, color);
    g.dispose();
  }
}

export function buildCamel(ctx) {
  const { P, Builder } = ctx;
  const meshes = [];
  const bake = (b, parent) => {
    const m = b.build();
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const grp = (parent, pos = [0, 0, 0]) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    return g;
  };

  const group = new THREE.Group();
  group.name = 'camel';
  const rig = grp(group);
  const torso = grp(rig, [0, DIM.torsoY, 0]);

  // ---------- torso ----------
  let b = new Builder();
  const cap = new THREE.CapsuleGeometry(0.44, 0.9, 2, 8);
  b.add(cap, P.camel, { rotation: [Math.PI / 2, 0, 0], scale: [0.92, 1, 1] });
  cap.dispose();
  // chest, shoulders, haunches: chunky toy volumes
  b.add(ico(1), P.camel, { position: [0, -0.06, 0.52], scale: [0.4, 0.42, 0.4] });
  for (const sx of [1, -1]) {
    b.add(ico(0), P.camel, { position: [sx * 0.22, -0.14, 0.58], scale: [0.18, 0.26, 0.2] });
    b.add(ico(0), P.camel, { position: [sx * 0.2, -0.06, -0.58], scale: [0.2, 0.32, 0.27] });
  }
  b.add(ico(1), P.camel, { position: [0, 0.02, -0.62], scale: [0.36, 0.38, 0.3] });
  // pale belly and the dark chest pad camels kneel on
  b.add(ico(0), P.camelLight, { position: [0, -0.3, 0.02], scale: [0.3, 0.16, 0.62] });
  b.add(ico(0), P.camelDark, { position: [0, -0.42, 0.44], scale: [0.12, 0.06, 0.12] });
  // the one big hump
  b.add(ico(1), P.camel, { position: [0, 0.4, -0.06], scale: [0.33, 0.44, 0.5] });
  b.add(ico(0), P.camelDark, { position: [0, 0.62, -0.08], scale: [0.2, 0.2, 0.3] });

  // woven saddle blanket: stripes running along the body
  const R = 0.44, CYL = 0.45;
  const radiusAt = (z) => {
    const over = Math.max(0, Math.abs(z) - CYL);
    return Math.sqrt(Math.max(0.01, R * R - over * over)) / R;
  };
  cloth(b, [
    [0.0, 0.5, P.crimson, 1],
    [0.5, 0.98, P.indigo, 1],
    [0.98, 1.12, P.saffron],
    [1.12, 1.36, P.red],
    [1.36, 1.48, P.cream],
    [1.48, 1.72, P.indigo],
    [1.72, DIM.blanketBottom, P.red],
  ], -0.66, 0.5, 4, 0.92 * R + 0.025, R + 0.025, radiusAt);
  // saffron diamonds woven into the indigo band
  for (const sx of [1, -1]) {
    for (const z of [-0.4, -0.08, 0.24]) {
      const a = 1.6;
      const x = sx * (0.92 * R + 0.04) * Math.sin(a), y = (R + 0.04) * Math.cos(a);
      b.add(new THREE.OctahedronGeometry(0.05, 0), P.saffron, { position: [x, y, z], scale: [0.35, 1, 1], rotation: [0, 0, sx * -0.05] });
    }
  }

  // saddle on the hump: cushion, side bars, front pommel and back cantle
  b.add(ico(0), P.red, { position: [0, 0.8, -0.06], scale: [0.3, 0.08, 0.38] });
  b.add(ico(0), P.indigo, { position: [0, 0.86, -0.06], scale: [0.2, 0.06, 0.24] });
  tube(b, 0.03, 0.025, 0.3, P.wood, 6, { position: [0, 0.78, 0.24], rotation: [0.25, 0, 0] });
  b.add(ico(0), P.brass, { position: [0, 1.08, 0.315], scale: 0.055 });
  tube(b, 0.03, 0.025, 0.2, P.wood, 6, { position: [0, 0.78, -0.36], rotation: [-0.3, 0, 0] });
  b.add(ico(0), P.brass, { position: [0, 0.99, -0.42], scale: 0.045 });
  b.box([0.34, 0.05, 0.05], P.wood, { position: [0, 0.94, 0.28] });
  b.box([0.3, 0.05, 0.05], P.wood, { position: [0, 0.9, -0.39] });
  bake(b, torso);

  const pommel = new THREE.Object3D();
  pommel.position.set(0, 1.04, 0.31);
  torso.add(pommel);

  // ---------- pendulums (tassels, bell) ----------
  const pendulums = [];
  const pend = (parent, pos, len, build, damp = 0.9) => {
    const pivot = grp(parent, pos);
    const bb = new Builder();
    build(bb);
    bake(bb, pivot);
    pendulums.push({ pivot, len, damp, bob: null, prev: null });
    return pivot;
  };
  const tassel = (color, len) => (bb) => {
    tube(bb, 0.009, 0.009, -len + 0.06, P.cream, 3);
    bb.add(oct(), P.brass, { position: [0, -len + 0.07, 0], scale: 0.026 });
    bb.cylinder(0.012, 0.05, 0.11, color, { position: [0, -len + 0.01, 0] }, 5);
  };
  const aB = DIM.blanketBottom;
  const sxB = 0.92 * R + 0.03, syB = R + 0.03;
  const tasselZ = [-0.52, -0.2, 0.12, 0.42];
  tasselZ.forEach((z, i) => {
    for (const sx of [1, -1]) {
      const k = radiusAt(z);
      const col = i % 2 ? P.saffron : P.red;
      pend(torso, [sx * sxB * k * Math.sin(aB), syB * k * Math.cos(aB), z], 0.2, tassel(col, 0.2));
    }
  });

  const bell = (bb) => {
    tube(bb, 0.01, 0.01, -0.06, P.ink, 4);
    bb.cylinder(0.035, 0.075, 0.1, P.brass, { position: [0, -0.1, 0] }, 7);
    bb.cylinder(0.08, 0.08, 0.015, P.brass, { position: [0, -0.15, 0] }, 7);
    bb.add(ico(0), P.ink, { position: [0, -0.16, 0], scale: 0.025 });
    bb.add(oct(), P.brass, { position: [0, -0.045, 0], scale: 0.035 });
  };

  // ---------- tail (three knobbly segments and a tuft) ----------
  const tail = [];
  let tp = grp(torso, [0, 0.16, -0.9]);
  for (let i = 0; i < 3; i++) {
    const seg = grp(tp, i === 0 ? [0, 0, 0] : [0, -0.17, 0]);
    const tb = new Builder();
    tb.add(ico(0), i ? P.camel : P.camelDark, { scale: 0.06 - i * 0.008 });
    tube(tb, 0.042 - i * 0.006, 0.034 - i * 0.006, -0.17, P.camel, 5);
    if (i === 2) {
      // shaggy tuft
      tb.add(ico(0), P.camelDark, { position: [0, -0.24, 0], scale: [0.06, 0.12, 0.05] });
      tb.add(ico(0), P.ink, { position: [0.025, -0.3, 0.01], scale: [0.035, 0.08, 0.035], rotation: [0, 0, 0.3] });
      tb.add(ico(0), P.ink, { position: [-0.025, -0.29, -0.01], scale: [0.035, 0.08, 0.035], rotation: [0, 0, -0.3] });
    }
    bake(tb, seg);
    tail.push(seg);
    tp = seg;
  }

  // ---------- neck ----------
  const neckBase = grp(torso, [0, 0.2, 0.8]);
  const neck = [];
  const neckR = [[0.23, 0.17], [0.17, 0.13], [0.13, 0.115]];
  let np = neckBase;
  for (let i = 0; i < 3; i++) {
    const seg = grp(np, i === 0 ? [0, 0, 0] : [0, DIM.neckLen[i - 1], 0]);
    const nb = new Builder();
    nb.add(ico(0), P.camel, { scale: neckR[i][0] * 1.05 });
    tube(nb, neckR[i][0], neckR[i][1], DIM.neckLen[i], P.camel, 7);
    // shaggy throat & mane bumps
    if (i < 2) {
      nb.add(ico(0), P.camelLight, { position: [0, DIM.neckLen[i] * 0.5, neckR[i][0] * 0.75], scale: [neckR[i][0] * 0.55, DIM.neckLen[i] * 0.4, 0.07] });
    }
    if (i === 0) {
      // beaded collar
      const collar = new THREE.TorusGeometry(0.205, 0.028, 4, 9);
      nb.add(collar, P.red, { position: [0, 0.2, 0], rotation: [Math.PI / 2, 0, 0] });
      collar.dispose();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        nb.add(oct(), k % 2 ? P.saffron : P.teal, { position: [Math.cos(a) * 0.225, 0.2, Math.sin(a) * 0.225], scale: 0.035 });
      }
    }
    bake(nb, seg);
    seg.rotation.x = DIM.neckRest[i];
    if (i === 0) pend(seg, [0, 0.2, 0.23], 0.13, bell, 0.94);
    neck.push(seg);
    np = seg;
  }

  // ---------- head ----------
  const head = grp(neck[2], [0, DIM.neckLen[2], 0]);
  b = new Builder();
  b.add(ico(1), P.camel, { position: [0, 0.1, 0.02], scale: [0.16, 0.15, 0.19] });
  tube(b, 0.125, 0.1, 0.32, P.camel, 7, { position: [0, 0.06, 0.1], rotation: [Math.PI / 2 + 0.12, 0, 0] });
  b.add(ico(1), P.camel, { position: [0, 0.03, 0.41], scale: [0.105, 0.09, 0.08] });
  // split, droopy upper lip
  for (const sx of [1, -1]) b.add(ico(0), P.camelLight, { position: [sx * 0.045, -0.035, 0.44], scale: [0.055, 0.05, 0.05] });
  // nostrils
  for (const sx of [1, -1]) b.box([0.018, 0.04, 0.012], P.ink, { position: [sx * 0.05, 0.075, 0.47], rotation: [0.3, 0, sx * 0.6] });
  // mouth inside (shows when the jaw opens)
  b.box([0.1, 0.02, 0.2], P.crimson, { position: [0, -0.05, 0.3] });
  // tuft on top of the head
  b.add(ico(0), P.camelDark, { position: [0, 0.24, -0.02], scale: [0.08, 0.05, 0.08] });
  b.add(ico(0), P.camelDark, { position: [0.03, 0.26, 0.04], scale: [0.05, 0.04, 0.05] });
  // beaded bridle: noseband, cheek straps, brass rings
  const band = new THREE.TorusGeometry(0.128, 0.017, 4, 9);
  b.add(band, P.red, { position: [0, 0.05, 0.3], rotation: [0.12, 0, 0] });
  band.dispose();
  for (const sx of [1, -1]) {
    b.box([0.018, 0.028, 0.24], P.red, { position: [sx * 0.132, -0.01, 0.13] });
    b.box([0.018, 0.29, 0.028], P.red, { position: [sx * 0.158, 0.11, -0.03], rotation: [-0.22, 0, sx * 0.08] });
    const ring = new THREE.TorusGeometry(0.03, 0.01, 3, 6);
    b.add(ring, P.brass, { position: [sx * 0.135, 0.0, 0.3], rotation: [0, Math.PI / 2, 0] });
    ring.dispose();
  }
  b.box([0.3, 0.025, 0.035], P.red, { position: [0, 0.24, -0.07] });
  for (let i = -2; i <= 2; i++) b.add(oct(), i % 2 ? P.teal : P.saffron, { position: [i * 0.045, 0.18 + 0.01 * (2 - Math.abs(i)), 0.43 - 0.13 + 0.005], scale: 0.026 });
  bake(b, head);
  head.scale.setScalar(1.2);

  const bits = [1, -1].map((sx) => {
    const o = new THREE.Object3D();
    o.position.set(sx * 0.14, 0.0, 0.3);
    head.add(o);
    return o;
  });

  // tiny tassel dangling under the chin
  pend(head, [0, -0.1, 0.1], 0.1, tassel(P.saffron, 0.1));

  // lower jaw with the droopy lip
  const jaw = grp(head, [0, -0.04, 0.12]);
  b = new Builder();
  b.add(ico(0), P.camel, { position: [0, -0.03, 0.14], scale: [0.085, 0.045, 0.16] });
  b.add(ico(1), P.camelLight, { position: [0, -0.035, 0.29], scale: [0.08, 0.045, 0.08] });
  bake(b, jaw);

  // big eyes with heavy lids and lashes
  const eyes = [1, -1].map((sx) => {
    const e = grp(head, [sx * 0.12, 0.14, 0.12]);
    e.rotation.set(0, sx * 0.6, 0);
    const eb = new Builder();
    eb.add(ico(1), '#fbf6ea', { scale: [0.07, 0.075, 0.06] });
    eb.add(ico(0), P.ink, { position: [0, -0.008, 0.042], scale: [0.045, 0.05, 0.03] });
    eb.add(oct(), '#ffffff', { position: [sx * -0.012, 0.016, 0.07], scale: 0.016 });
    eb.add(ico(0), P.camelDark, { position: [0, 0.045, 0.005], scale: [0.08, 0.042, 0.07] });
    for (const i of [-1, 0.2, 1.2]) {
      eb.box([0.012, 0.055, 0.008], P.ink, { position: [i * 0.03 * -sx, 0.075, 0.04], rotation: [-0.5, 0, i * 0.5 * sx] });
    }
    bake(eb, e);
    return e;
  });

  // ears
  const ears = [1, -1].map((sx) => {
    const e = grp(head, [sx * 0.12, 0.21, -0.06]);
    e.rotation.set(-0.3, 0, sx * -0.9);
    const eb = new Builder();
    eb.add(new THREE.ConeGeometry(0.05, 0.13, 5), P.camel, { position: [0, 0.06, 0], scale: [1, 1, 0.6] });
    eb.add(new THREE.ConeGeometry(0.03, 0.09, 5), P.camelLight, { position: [0, 0.05, 0.02], scale: [1, 1, 0.4] });
    bake(eb, e);
    e.userData.rest = e.rotation.clone();
    return e;
  });

  // ---------- legs ----------
  const legs = [];
  const mkLeg = (front, sx) => {
    const root = grp(rig);
    const upper = grp(root);
    const knee = grp(upper, [0, -DIM.L1, 0]);
    const foot = grp(knee, [0, -DIM.L2, 0]);
    let lb = new Builder();
    if (front) {
      lb.add(ico(0), P.camel, { position: [0, -0.04, 0], scale: [0.14, 0.2, 0.16] });
      tube(lb, 0.135, 0.085, -DIM.L1, P.camel, 6);
    } else {
      lb.add(ico(0), P.camel, { position: [0, -0.12, 0], scale: [0.17, 0.29, 0.21] });
      tube(lb, 0.15, 0.085, -DIM.L1, P.camel, 6);
    }
    bake(lb, upper);
    lb = new Builder();
    lb.add(ico(0), P.camelDark, { position: [0, 0, front ? 0.02 : -0.02], scale: [0.1, 0.1, 0.1] });
    tube(lb, 0.078, 0.06, -DIM.L2, P.camel, 6);
    bake(lb, knee);
    lb = new Builder();
    lb.add(ico(0), P.camel, { scale: 0.075 });
    lb.cylinder(0.12, 0.145, DIM.PAD * 0.7, P.camelDark, { position: [0, -DIM.PAD * 0.65, 0.03], scale: [1, 1, 1.15] }, 7);
    for (const tx of [1, -1]) lb.add(oct(), P.camelLight, { position: [tx * 0.058, -DIM.PAD * 0.55, 0.16], scale: [0.06, 0.045, 0.06] });
    bake(lb, foot);
    const h = front ? DIM.hipF : DIM.hipH;
    legs.push({ front, side: sx, root, upper, knee, foot, hip: new THREE.Vector3(sx * h[0], h[1], h[2]), home: h[2] + (front ? 0.04 : -0.02) });
  };
  // order: LF, RF, LH, RH (left = +X)
  mkLeg(true, 1); mkLeg(true, -1); mkLeg(false, 1); mkLeg(false, -1);

  // ---------- reins (updated every frame, in group space) ----------
  const reinMat = ctx.mat(P.red);
  const reinGeo = new THREE.CylinderGeometry(0.013, 0.013, 1, 4);
  const reins = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(reinGeo, reinMat);
    m.castShadow = true;
    group.add(m);
    reins.push(m);
    meshes.push(m);
  }

  let tris = 0;
  for (const m of meshes) {
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }

  return { group, rig, torso, neckBase, neck, head, jaw, eyes, ears, tail, legs, pendulums, reins, bits, pommel, tris };
}

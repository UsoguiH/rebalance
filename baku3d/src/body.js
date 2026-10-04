// OWNER: Builder A. Origin = floor centre under the throne seat. Units ~ metres, +Z toward camera.
// Matched to the reference assuming camera fov32 at (0,0.85,2.2) looking at (0,0.85,0) (see bodyA_util.js).
// group.userData.neck = Vector3 (body-local) where the head attaches
// group.userData.cheekTarget = Vector3 (body-local) where the propping fist ends up
import { makeUtil } from './bodyA_util.js';
import { buildHand } from './bodyA_hand.js';
import { buildThrone } from './bodyA_throne.js';

export function buildBody(THREE, style) {
  const U = makeUtil(THREE);
  const { P, V3, prof, fbm, loft, ribbon, orient, sm } = U;
  const g = new THREE.Group();
  g.name = 'body';

  const mat = (hex, role, dbl = false) => {
    const m = style.toon(hex, { role });
    if (dbl) m.side = THREE.DoubleSide;
    return m;
  };
  const add = (geo, m, parent = g) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  const ell = (r, p, sc, m, parent = g) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
    o.position.copy(p); o.scale.set(sc[0], sc[1], sc[2]); parent.add(o); return o;
  };

  const SUIT = 0xf2f0ec, SUIT2 = 0xe8e6e4;
  const suitM = () => mat(SUIT, 'suit', true);
  const trouserM = () => mat(0xf0eeea, 'suit', true);
  const shirtM = () => mat(0x58101a, 'shirt', true);
  const skinM = () => mat(0xf1c7a0, 'skin');
  const nailM = () => mat(0xf6dcc4, 'skin');

  // ================= THRONE & WALL =================
  g.add(buildThrone(THREE, style, U));

  // ================= TORSO =================
  // spine from pelvis (bottom) to neck base (top)
  const spine = [P(600, 870, -0.05), P(598, 770, -0.05), P(590, 650, -0.04), P(584, 530, -0.02), P(580, 420, -0.02), P(576, 362, -0.03)];
  const tilt = (t) => -0.12 * sm(Math.min(1, Math.max(0, (t - 0.45) / 0.5)));
  const jrx = prof([[0, 0.205], [0.2, 0.19], [0.5, 0.2], [0.78, 0.222], [0.9, 0.238], [0.96, 0.17], [1, 0.1]]);
  const jry = prof([[0, 0.15], [0.3, 0.135], [0.6, 0.14], [0.85, 0.115], [1, 0.08]]);
  const gap = prof([[0, 0.22], [0.45, 0.3], [0.72, 0.5], [0.9, 1.0], [1, 1.3]]);
  const cloth = (amp, sx, sy, sz, seed = 0) => (t, phi, p) => {
    const n = fbm(p.x * sx + seed, p.y * sy, p.z * sz + seed * 0.7) - 0.5;
    const crease = Math.sin(p.y * 38 + p.x * 17 + seed) * 0.35 + Math.sin(p.y * 21 - p.x * 25 + seed * 2) * 0.3;
    return 1 + amp * (n * 2 + crease * 0.5);
  };

  // skin chest (visible through the V)
  const chestSpec = {
    pts: spine, rings: 22, sides: 24, ref: V3(0, 0, 1), tilt,
    rx: (t) => jrx(t) * 0.82, ry: (t) => jry(t) * 0.84, capStart: 3, capEnd: 5,
  };
  add(loft(chestSpec), skinM());

  // maroon shirt with deep V
  const shirtGap = prof([[0, 0], [0.7, 0], [0.76, 0.12], [1, 0.9]]);
  const shirtSpec = {
    pts: spine, rings: 28, sides: 28, ref: V3(0, 0, 1), tilt,
    rx: (t) => jrx(t) * 0.9, ry: (t) => jry(t) * 0.92,
    phi0: (t) => Math.PI / 2 + shirtGap(t), phi1: (t) => Math.PI * 2.5 - shirtGap(t),
    noise: cloth(0.03, 7, 5, 7, 3),
  };
  add(loft(shirtSpec), shirtM());

  // white jacket (open front, loose, crumpled)
  const jacketSpec = {
    pts: spine, rings: 40, sides: 40, ref: V3(0, 0, 1), tilt,
    rx: jrx, ry: jry,
    phi0: (t) => Math.PI / 2 + gap(t), phi1: (t) => Math.PI * 2.5 - gap(t),
    noise: cloth(0.07, 7, 5, 7, 0),
  };
  const jacketGeo = loft(jacketSpec);
  add(jacketGeo, suitM());
  const curve = jacketGeo._curve;

  // lapels: raised surface patch beside the opening, widest near the shoulder (pointed/notched)
  const axisPt = P(580, 600, -0.12);
  const lapelW = prof([[0.28, 0.0], [0.5, 0.18], [0.75, 0.42], [0.9, 0.5], [0.98, 0.3], [1, 0.1]]);
  for (const s of [-1, 1]) {
    const A = [], B = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = 0.28 + (0.965 - 0.28) * (i / n);
      const edge = s < 0 ? Math.PI / 2 + gap(t) : Math.PI / 2 - gap(t);
      const dphi = lapelW(t) * (s < 0 ? 1 : -1);
      // pointed notch: cut the lapel in near the top
      A.push(U.ringPoint(jacketSpec, curve, t, edge, 1.0, 0.012));
      B.push(U.ringPoint(jacketSpec, curve, t, edge + dphi, 1.0, 0.02 + 0.015 * Math.sin(i / n * 3)));
    }
    add(ribbon(A, B, axisPt), mat(SUIT2, 'suit', true));
    // lapel front edge roll (thin tube along the opening edge)
    const edgePts = A.map((p) => p.clone());
    const edgeCurve = new THREE.CatmullRomCurve3(edgePts);
    add(new THREE.TubeGeometry(edgeCurve, 30, 0.011, 6, false), mat(SUIT, 'suit'));
  }
  // jacket edge below the lapels (front hem tube)
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = 0.02 + 0.28 * (i / 12);
      pts.push(U.ringPoint(jacketSpec, curve, t, s < 0 ? Math.PI / 2 + gap(t) : Math.PI / 2 - gap(t), 1.0, 0.006));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.011, 6, false), mat(SUIT, 'suit'));
  }

  // collar: red shirt collar flaps lying over the lapels + a standing jacket collar band
  {
    const redM = mat(0x9a1620, 'shirt', true);
    const flap = (s, tipPx, topPx, innerPx) => {
      const tip = P(tipPx[0], tipPx[1], 0.14), top = P(topPx[0], topPx[1], 0.07), inner = P(innerPx[0], innerPx[1], 0.13);
      const base = P(topPx[0] + s * 30, topPx[1] + 40, 0.1);
      const geoF = ribbon([top, base, tip], [top.clone().add(V3(0, 0.02, 0.01)), inner, tip.clone().add(V3(0, 0.015, 0.012))], axisPt);
      add(geoF, redM);
    };
    flap(-1, [438, 398], [556, 308], [520, 408]);
    flap(1, [676, 446], [600, 332], [646, 420]);
  }

  // pelvis / lap filler under the jacket hem
  ell(0.17, P(590, 868, -0.02), [1.25, 0.7, 1.0], trouserM());

  // belt
  add(new THREE.TorusGeometry(0.205, 0.012, 8, 36, Math.PI * 1.3), mat(0x2b1a14, 'leather')).position.copy(P(590, 800, -0.05));

  // ================= RIGHT ARM (viewer's right): elbow out, forearm up, fist props cheek =================
  const shoulderR = P(790, 445, -0.06), elbowR = P(942, 600, 0.16), wristR = P(808, 410, 0.26);
  const sleeveNoise = (amp, k, seed) => (t, phi, p) => {
    const n = fbm(p.x * 14 + seed, p.y * 14, p.z * 14 + seed) - 0.5;
    const bunch = Math.sin(t * Math.PI * k + phi * 2 + seed) * 0.5;
    return 1 + amp * (n * 2 + bunch * (0.4 + t));
  };
  {
    const up = {
      pts: [shoulderR, P(865, 505, 0.03), elbowR], rings: 18, sides: 20, ref: V3(0, 0, 1),
      rx: prof([[0, 0.085], [0.5, 0.072], [1, 0.07]]), ry: prof([[0, 0.085], [0.5, 0.072], [1, 0.07]]),
      capStart: 4, capEnd: 4, noise: sleeveNoise(0.075, 9, 1),
    };
    add(loft(up), suitM());
    ell(0.074, elbowR, [1, 1, 1], suitM());
    const fore = {
      pts: [elbowR, P(880, 500, 0.23), wristR], rings: 20, sides: 20, ref: V3(0.3, 0, 1),
      rx: prof([[0, 0.07], [0.5, 0.064], [1, 0.054]]), ry: prof([[0, 0.07], [0.5, 0.064], [1, 0.054]]),
      capStart: 2, noise: sleeveNoise(0.07, 11, 4),
    };
    add(loft(fore), suitM());
    // cuff
    const cuffEnd = wristR.clone();
    const cuffDir = wristR.clone().sub(P(880, 500, 0.23)).normalize();
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.06, 0.03, 18), mat(0xfafafa, 'suit'));
    cuff.position.copy(cuffEnd).addScaledVector(cuffDir, -0.012);
    orient(cuff, cuffDir, V3(0, 0, 1));
    g.add(cuff);

    // propping fist
    const hand = buildHand(THREE, U, skinM(), nailM(), {
      side: -1, // thumb on viewer's-left side of the hand (toward the face)
      curl: [[1.4, 1.75, 1.05], [1.5, 1.8, 1.05], [1.5, 1.8, 1.0], [1.45, 1.7, 0.95]],
      spread: 0,
      thumb: { dir: V3(-0.6, 0.45, -0.7), bend: [0.5, 0.6], len: [0.034, 0.028, 0.024] },
      scale: 1.15,
    });
    hand.position.copy(wristR);
    const kn = P(745, 338, 0.2);
    orient(hand, kn.clone().sub(wristR), V3(0.6, 0.2, 0.75));
    g.add(hand);
    g.userData.cheekTarget = kn.clone().add(V3(-0.01, 0.0, -0.005));
  }

  // ================= LEFT ARM (viewer's left): straight down, hand draped over the armrest =================
  {
    const shoulderL = P(372, 398, -0.04), wristL = P(252, 790, 0.32);
    const spec = {
      pts: [shoulderL, P(300, 520, 0.02), P(240, 650, 0.14), P(243, 735, 0.25), wristL],
      rings: 28, sides: 22, ref: V3(0, 0, 1),
      rx: prof([[0, 0.088], [0.4, 0.074], [0.7, 0.07], [1, 0.056]]), ry: prof([[0, 0.088], [0.4, 0.076], [0.7, 0.072], [1, 0.056]]),
      capStart: 4, noise: sleeveNoise(0.07, 12, 7),
    };
    add(loft(spec), suitM());
    const dir = wristL.clone().sub(P(243, 735, 0.25)).normalize();
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.063, 0.03, 18), mat(0xfafafa, 'suit'));
    cuff.position.copy(wristL).addScaledVector(dir, -0.012);
    orient(cuff, dir, V3(0, 0, 1));
    g.add(cuff);

    const hand = buildHand(THREE, U, skinM(), nailM(), {
      side: -1,
      curl: [[1.15, 0.45, 0.3], [1.28, 0.5, 0.3], [1.35, 0.55, 0.35], [1.45, 0.6, 0.35]],
      spread: 0.12, scale: 1.25,
      thumb: { dir: V3(0.7, 0.7, 0.1), bend: [0.15, 0.2], len: [0.034, 0.028, 0.024] },
    });
    hand.position.copy(wristL);
    orient(hand, V3(-0.3, -0.42, 0.7), V3(0.1, 0.8, 0.55));
    g.add(hand);
  }

  // ================= LEGS =================
  const legNoise = (amp, seed) => (t, phi, p) => {
    const n = (fbm(p.x * 9 + seed, p.y * 9, p.z * 9 + seed) - 0.5) + (fbm(p.x * 4 + seed, p.y * 4, p.z * 4) - 0.5) * 1.2;
    const crease = Math.sin(t * 34 + phi * 2 + seed) * 0.5 + Math.sin(phi * 3 - t * 9 + seed) * 0.5;
    return 1 + amp * (n * 2 + crease * 0.9);
  };
  // leg A: thigh out to viewer's right (knee up on the armrest), shin back across the lap, boot at left
  const hipA = P(640, 835, -0.04), kneeA = P(1020, 778, 0.24), ankleA = P(385, 1040, 0.55);
  {
    const thigh = {
      pts: [hipA, P(830, 805, 0.1), kneeA], rings: 18, sides: 22, ref: V3(0, 1, 0),
      rx: prof([[0, 0.115], [1, 0.088]]), ry: prof([[0, 0.11], [1, 0.088]]), capStart: 3, capEnd: 4, noise: legNoise(0.1, 2),
    };
    add(loft(thigh), trouserM());
    const shin = {
      pts: [kneeA, P(900, 880, 0.3), P(700, 955, 0.38), P(520, 1020, 0.43), ankleA], rings: 34, sides: 24, ref: V3(0, 1, 0),
      rx: prof([[0, 0.088], [0.5, 0.082], [1, 0.1]]), ry: prof([[0, 0.088], [0.5, 0.078], [1, 0.095]]),
      capStart: 3, noise: legNoise(0.11, 5),
    };
    add(loft(shin), trouserM());
  }
  // leg B: thigh toward camera, shin straight down to the floor
  {
    const hipB = P(540, 850, -0.04), kneeB = P(520, 1070, 0.33), ankleB = P(545, 1700, 0.5);
    const thigh = {
      pts: [hipB, P(510, 960, 0.12), kneeB], rings: 14, sides: 22, ref: V3(1, 0, 0),
      rx: prof([[0, 0.11], [1, 0.088]]), ry: prof([[0, 0.11], [1, 0.088]]), capStart: 3, capEnd: 4, noise: legNoise(0.09, 9),
    };
    add(loft(thigh), trouserM());
    const shin = {
      pts: [kneeB, P(535, 1260, 0.42), ankleB], rings: 22, sides: 22, ref: V3(1, 0, 0),
      rx: prof([[0, 0.085], [1, 0.095]]), ry: prof([[0, 0.085], [1, 0.095]]), capStart: 3, noise: legNoise(0.09, 11),
    };
    add(loft(shin), trouserM());
    ell(0.07, P(500, 1650, 0.7), [1, 0.6, 1.8], mat(0x1a1210, 'leather'));
  }

  // ================= BOOT (brown lace-up) =================
  {
    const leather = mat(0x7d4220, 'leather');
    const leatherD = mat(0x3c1c0c, 'leather');
    const toe = P(128, 1135, 0.6);
    const heel = ankleA.clone().add(V3(0.04, -0.075, -0.05));
    const shaftTop = ankleA.clone().add(V3(0.17, 0.06, -0.07));
    add(loft({
      pts: [ankleA.clone().add(V3(-0.01, -0.04, 0.01)), shaftTop], rings: 8, sides: 18, ref: V3(0, 1, 0),
      rx: () => 0.062, ry: () => 0.062, capStart: 3, noise: legNoise(0.03, 4),
    }), leather);
    const mid = heel.clone().lerp(toe, 0.38).add(V3(-0.01, 0.01, 0.02));
    const footSpec = {
      pts: [heel, mid, heel.clone().lerp(toe, 0.72), toe], rings: 18, sides: 20, ref: V3(0, 1, 0),
      rx: prof([[0, 0.05], [0.4, 0.058], [0.72, 0.062], [1, 0.04]]), ry: prof([[0, 0.065], [0.4, 0.066], [0.72, 0.05], [1, 0.038]]),
      capStart: 4, capEnd: 5, noise: legNoise(0.03, 8),
    };
    const footGeo = loft(footSpec);
    add(footGeo, leather);
    const soleSpec = {
      pts: footSpec.pts.map((p) => p.clone().add(V3(0, -0.055, 0))), rings: 14, sides: 18, ref: V3(0, 1, 0),
      rx: prof([[0, 0.052], [0.72, 0.066], [1, 0.044]]), ry: () => 0.014, capStart: 3, capEnd: 4,
    };
    add(loft(soleSpec), leatherD);
    // laces across the instep
    const gc = footGeo._curve;
    for (let i = 0; i < 6; i++) {
      const t = 0.12 + i * 0.075;
      const f = U.frameAt(footSpec, gc, t);
      const top = U.ringPoint(footSpec, gc, t, Math.PI / 2, 1.0, 0.004);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), mat(0xd2b070, 'leather'));
      bar.position.copy(top);
      orient(bar, f.B, f.N);
      g.add(bar);
    }
    // tongue
    const tg = ell(0.03, U.ringPoint(footSpec, gc, 0.1, Math.PI / 2, 1.0, 0.02), [1.2, 0.6, 1.6], mat(0x8a4c26, 'leather'));
  }

  // neck: slightly inside the collar so the head can sink into the V
  g.userData.neck = P(605, 428, -0.02);
  if (!g.userData.cheekTarget) g.userData.cheekTarget = P(745, 338, 0.2);
  return g;
}

// OWNER: Builder A. Origin = floor centre under the throne seat. Units ~ metres, +Z toward camera.
// Matched to the reference with camera fov32 at (0,0.85,2.2) looking at (0,0.85,0) (see bodyA_util.js; style.js uses the same).
// group.userData.neck = Vector3 (body-local) where the head attaches
// group.userData.cheekTarget = Vector3 (body-local) where the propping fist ends up
import { makeUtil } from './bodyA_util.js';
import { buildHand } from './bodyA_hand.js';
import { buildThrone } from './bodyA_throne.js';
import { buildHead } from './head.js';

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
  const ridged = (x, y, z) => 1 - Math.abs(2 * fbm(x, y, z, 2) - 1); // sharp crease peaks, 0..1

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const vmat = (hex, role) => { const m = mat(hex, role, true); m.vertexColors = true; return m; };
  // fold shading baked into vertex colours: valleys (m<1) go grey-blue / dark, ridges stay light
  const suitShade = (m) => { const k = sm(clamp01((m - 0.9) / 0.15)); const c = 0.66 + 0.34 * k; return [c * 0.93, c * 0.96, c]; };
  const shirtShade = (m) => { const k = sm(clamp01((m - 0.92) / 0.13)); const c = 0.36 + 0.64 * k; return [c, c * 0.88, c * 0.92]; };
  const SUIT = 0xf2f0ec, SUIT2 = 0xe6e4e6;
  const suitM = () => mat(SUIT, 'suit', true);
  const suitVM = () => vmat(SUIT, 'suit');
  const trouserM = () => mat(0xf0eeea, 'suit', true);
  const trouserVM = () => vmat(0xf0eeea, 'suit');
  const trouserVM2 = () => mat(0xf0eeea, 'suit');
  const trouserBM = () => vmat(0xdedde4, 'suit');
  const shirtM = () => mat(0x58101a, 'shirt', true);
  const shirtVM = () => vmat(0x6a1420, 'shirt');
  const skinM = () => mat(0xf1c7a0, 'skin');
  const nailM = () => mat(0xf6dcc4, 'skin');

  // ---- where does the head's cheek land? (head hangs from `neck`) ----
  const neck = P(572, 432, -0.02);
  let cheekOff = null;
  try { const h = buildHead(THREE, style); if (h.userData.cheek) cheekOff = h.userData.cheek.clone(); } catch (e) { /* head not ready */ }
  const cheek = cheekOff ? neck.clone().add(cheekOff) : P(742, 338, 0.18);

  // ================= THRONE & WALL =================
  g.add(buildThrone(THREE, style, U));

  // ================= TORSO (leaning toward viewer's left, right shoulder dropped) =================
  const spine = [P(645, 875, -0.05), P(628, 775, -0.05), P(606, 655, -0.04), P(580, 540, -0.02), P(556, 440, -0.02), P(542, 388, -0.03)];
  const tilt = (t) => -0.1 * sm(Math.min(1, Math.max(0, (t - 0.4) / 0.5)));
  const jrx = prof([[0, 0.205], [0.2, 0.19], [0.5, 0.2], [0.72, 0.205], [0.85, 0.215], [0.95, 0.15], [1, 0.09]]);
  const jry = prof([[0, 0.15], [0.3, 0.135], [0.6, 0.14], [0.85, 0.115], [1, 0.08]]);
  const gap = prof([[0, 0.22], [0.45, 0.3], [0.72, 0.5], [0.9, 1.0], [1, 1.3]]);
  // crumpled cloth: fbm + ridged creases + diagonal drag folds
  const cloth = (amp, sx, sy, sz, seed = 0) => (t, phi, p) => {
    const n = fbm(p.x * sx + seed, p.y * sy, p.z * sz + seed * 0.7) - 0.5;
    const rg = ridged(p.x * sx * 0.9 + seed, p.y * sy * 0.8, p.z * sz * 0.9) - 0.45;
    const diag = Math.sin(p.y * 30 + p.x * 22 + n * 5 + seed) * 0.5 + Math.sin(p.y * 17 - p.x * 24 + seed * 2) * 0.35;
    return 1 + amp * (n * 1.6 + rg * 2.2 + diag * 0.7);
  };

  // shirt: soft diagonal pull-folds toward the belt + horizontal creases
  const shirtCloth = (amp) => (t, phi, p) => {
    const n = fbm(p.x * 9 + 3, p.y * 6, p.z * 9) - 0.5;
    const rg = ridged(p.x * 8, p.y * 5, p.z * 8 + 2) - 0.45;
    const hz = Math.sin(p.y * 52 + p.x * 14 + n * 6) * 0.5 * (1 - t) + Math.sin(p.y * 28 - p.x * 30 + n * 4) * 0.4;
    return 1 + amp * (n * 1.4 + rg * 1.8 + hz * 0.9);
  };
  // skin chest (visible through the V)
  const chestSpec = {
    pts: spine, rings: 22, sides: 24, ref: V3(0, 0, 1), tilt,
    rx: (t) => jrx(t) * 0.82, ry: (t) => jry(t) * 0.84, capStart: 3, capEnd: 5,
  };
  add(loft(chestSpec), skinM());

  // maroon shirt with deep V (reaches ~ y 550)
  const shirtGap = prof([[0, 0], [0.68, 0], [0.78, 0.07], [0.88, 0.15], [0.95, 0.2], [1, 0.34]]);
  const shirtSpec = {
    pts: spine, rings: 28, sides: 28, ref: V3(0, 0, 1), tilt,
    rx: (t) => jrx(t) * 0.9, ry: (t) => jry(t) * 0.92,
    phi0: (t) => Math.PI / 2 + shirtGap(t) * 0.7, phi1: (t) => Math.PI * 2.5 - shirtGap(t) * 0.95,
    noise: shirtCloth(0.07), shade: shirtShade,
  };
  add(loft(shirtSpec), shirtVM());

  // white jacket (open front, loose, crumpled)
  const jacketSpec = {
    pts: spine, rings: 56, sides: 48, ref: V3(0, 0, 1), tilt,
    rx: jrx, ry: jry,
    phi0: (t) => Math.PI / 2 + gap(t), phi1: (t) => Math.PI * 2.5 - gap(t),
    noise: cloth(0.075, 6, 4.5, 6, 0), shade: suitShade,
  };
  const jacketGeo = loft(jacketSpec);
  add(jacketGeo, suitVM());
  const curve = jacketGeo._curve;
  const axisPt = P(560, 600, -0.14);

  // notched lapels: a long pointed lapel + a separate collar piece with a V notch between them
  const edgeOf = (s, t) => (s < 0 ? Math.PI / 2 + gap(t) : Math.PI / 2 - gap(t));
  const strip = (s, t0, t1, wFn, outset, colour, n = 26) => {
    const A = [], B = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, t = t0 + (t1 - t0) * u;
      const e = edgeOf(s, t);
      const w = wFn(u) * (s < 0 ? 1 : -1);
      A.push(U.ringPoint(jacketSpec, curve, t, e, 1.0, outset));
      B.push(U.ringPoint(jacketSpec, curve, t, e + w, 1.0, outset + 0.012 + 0.012 * Math.sin(u * 3)));
    }
    add(ribbon(A, B, axisPt), mat(colour, 'suit', true));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(A), 40, 0.0095, 6, false), mat(SUIT, 'suit'));
    return A;
  };
  for (const s of [-1, 1]) {
    // lapel: width grows linearly to a sharp point reaching toward the shoulder
    strip(s, 0.3, 0.9, (u) => 0.02 + 0.82 * Math.pow(u, 1.15) * (u < 0.96 ? 1 : (1 - u) / 0.04), 0.012, SUIT2);
    // collar piece above the notch
    strip(s, 0.86, 0.985, (u) => 0.32 * (1 - u * 0.7) * (u < 0.1 ? u / 0.1 : 1), 0.02, SUIT);
  }
  // front hem edge below the lapels
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = 0.02 + 0.28 * (i / 12);
      pts.push(U.ringPoint(jacketSpec, curve, t, edgeOf(s, t), 1.0, 0.006));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.011, 6, false), mat(SUIT, 'suit'));
  }

  // red shirt collar flaps lying over the lapels
  {
    const redM = mat(0x9a1620, 'shirt', true);
    const flap = (s, tipPx, topPx, innerPx) => {
      const tip = P(tipPx[0], tipPx[1], 0.15), top = P(topPx[0], topPx[1], 0.05), inner = P(innerPx[0], innerPx[1], 0.14);
      const base = P(topPx[0] + s * 26, topPx[1] + 36, 0.1);
      add(ribbon([top, base, tip], [top.clone().add(V3(0, 0.02, 0.01)), inner, tip.clone().add(V3(0, 0.015, 0.012))], axisPt), redM);
    };
    // left collar: kite whose base runs along the shirt's V edge and whose point lies over the lapel
    {
      const se = (t) => Math.PI / 2 + shirtGap(t) * 0.7;
      const A = [0.995, 0.93, 0.84].map((t) => U.ringPoint(shirtSpec, curve, t, se(t), 1.0, 0.014));
      const apex = U.ringPoint(jacketSpec, curve, 0.93, Math.PI / 2 + 0.8, 1.0, 0.04);
      const apex2 = U.ringPoint(jacketSpec, curve, 0.88, Math.PI / 2 + 0.7, 1.0, 0.035);
      add(ribbon([A[0], A[1], A[2]], [A[0].clone(), apex, A[2].clone()], axisPt), redM);
      add(ribbon([A[1], A[2], A[2].clone().add(V3(0, -0.01, 0))], [apex, apex2, apex2.clone().add(V3(0, -0.01, 0))], axisPt), redM);
    }
  }

  // pelvis / lap filler under the jacket hem
  ell(0.17, P(615, 868, -0.02), [1.25, 0.7, 1.0], trouserM());
  add(new THREE.TorusGeometry(0.205, 0.012, 8, 36, Math.PI * 1.3), mat(0x2b1a14, 'leather')).position.copy(P(620, 805, -0.05));

  // ================= RIGHT ARM (viewer's right): elbow out, forearm up, fist props the cheek =================
  const bunch = (k, c0, wdt, seed) => (t) => Math.exp(-(((t - c0) / wdt) ** 2));
  const sleeveNoise = (amp, k, seed, centres = [0.5, 0.9]) => (t, phi, p) => {
    const n = fbm(p.x * 9 + seed, p.y * 9, p.z * 9 + seed) - 0.5;
    const rg = ridged(p.x * 7 + seed, p.y * 7, p.z * 7) - 0.45;
    let w = 0;
    for (const c of centres) w = Math.max(w, Math.exp(-(((t - c) / 0.12) ** 2)));
    const acc = Math.sin(t * 50 + phi * 1.3 + n * 5 + seed) * w;
    return 1 + amp * (n * 1.2 + rg * 1.2 + acc * 1.3 + Math.sin(t * Math.PI * k + phi * 2 + seed) * 0.3);
  };
  const fistDir = V3(-0.62, 0.74, -0.2).normalize();
  const FS = 1.2;
  const kn = cheek.clone().add(V3(0.026, 0.05, 0.03));
  const wristR = kn.clone().addScaledVector(fistDir, -0.1 * FS);
  const shoulderR = P(785, 470, -0.06), elbowR = P(985, 628, 0.17);
  {
    const up = {
      pts: [shoulderR, P(885, 540, 0.05), elbowR], rings: 22, sides: 22, ref: V3(0, 0, 1),
      rx: prof([[0, 0.088], [0.5, 0.074], [1, 0.072]]), ry: prof([[0, 0.088], [0.5, 0.074], [1, 0.072]]),
      capStart: 4, capEnd: 4, noise: sleeveNoise(0.09, 9, 1, [0.6, 0.92]), shade: suitShade,
    };
    add(loft(up), suitVM());
    ell(0.078, elbowR, [1, 1, 1], suitM());
    const mid = elbowR.clone().lerp(wristR, 0.5).add(V3(0.02, 0.0, 0.03));
    const fore = {
      pts: [elbowR, mid, wristR], rings: 26, sides: 22, ref: V3(0.3, 0, 1),
      rx: prof([[0, 0.074], [0.5, 0.066], [1, 0.054]]), ry: prof([[0, 0.074], [0.5, 0.066], [1, 0.054]]),
      capStart: 2, noise: sleeveNoise(0.09, 11, 4, [0.1, 0.25, 0.9]), shade: suitShade,
    };
    add(loft(fore), suitVM());
    const cuffDir = wristR.clone().sub(mid).normalize();
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.061, 0.03, 18), mat(0xfafafa, 'suit'));
    cuff.position.copy(wristR).addScaledVector(cuffDir, -0.012);
    orient(cuff, cuffDir, V3(0, 0, 1));
    g.add(cuff);

    // propping fist: four knuckle bumps on the cheek side, thumb tucked under
    const hand = buildHand(THREE, U, skinM(), nailM(), {
      side: -1, scale: FS, knuckle: 1.4, fingerLen: 0.6, gaps: true, lineMat: mat(0x8a5640, 'skin'),
      curl: [[1.5, 1.8, 1.2], [1.55, 1.85, 1.2], [1.55, 1.8, 1.15], [1.5, 1.7, 1.1]],
      spread: 0,
      // thumb folded across/under the index finger, on the palm side
      thumbPts: [[-0.034, 0.02, -0.004], [-0.037, 0.046, -0.03], [-0.02, 0.062, -0.052], [0.004, 0.068, -0.056]], thumbR: 0.0105,
    });
    hand.position.copy(wristR);
    orient(hand, fistDir, V3(0.2, 0.25, -0.95));
    g.add(hand);
  }

  // ================= LEFT ARM (viewer's left): straight down, back of hand to camera, fingers hang over the armrest =================
  {
    const shoulderL = P(372, 424, -0.04), wristL = P(250, 782, 0.3);
    const spec = {
      pts: [shoulderL, P(296, 525, 0.02), P(232, 648, 0.14), P(238, 728, 0.24), wristL],
      rings: 34, sides: 22, ref: V3(0, 0, 1),
      rx: prof([[0, 0.076], [0.4, 0.072], [0.7, 0.07], [1, 0.056]]), ry: prof([[0, 0.076], [0.4, 0.074], [0.7, 0.072], [1, 0.056]]),
      capStart: 4, noise: sleeveNoise(0.085, 12, 7, [0.55, 0.92]), shade: suitShade,
    };
    add(loft(spec), suitVM());
    const dir = wristL.clone().sub(P(238, 728, 0.24)).normalize();
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.063, 0.03, 18), mat(0xfafafa, 'suit'));
    cuff.position.copy(wristL).addScaledVector(dir, -0.012);
    orient(cuff, dir, V3(0, 0, 1));
    g.add(cuff);

    // wrist bent down: hand slopes toward the camera, back of the hand faces camera/up, fingers curl over the rail
    const hand = buildHand(THREE, U, skinM(), nailM(), {
      side: -1, scale: 1.2, knuckle: 1.6, fingerLen: 0.72, tendons: true,
      curl: [[1.0, 1.4, 1.0], [1.1, 1.45, 1.0], [1.15, 1.5, 1.0], [1.25, 1.5, 1.0]],
      spread: 0.03, thumbR: 0.0085,
      thumb: { dir: V3(0.1, 0.3, -1.0), bend: [0.9, 0.9], len: [0.022, 0.016, 0.012] },
    });
    hand.position.copy(wristL);
    orient(hand, V3(-0.22, -0.55, 0.8), V3(0.12, 0.8, 0.5));
    g.add(hand);
  }

  // ================= LEGS =================
  const legNoise = (amp, seed, hem = false, knee = 0) => (t, phi, p) => {
    const n = (fbm(p.x * 8 + seed, p.y * 8, p.z * 8 + seed) - 0.5) + (fbm(p.x * 3.5 + seed, p.y * 3.5, p.z * 3.5) - 0.5) * 1.2;
    const rg = ridged(p.x * 7 + seed, p.y * 7, p.z * 7) - 0.45;
    const drag = Math.sin(phi * 2.5 - t * 16 + n * 4 + seed) * 0.6 + Math.sin(t * 36 + phi * 2 + seed) * 0.4;
    const kneeF = knee ? Math.sin(phi * 6 + n * 4) * Math.exp(-(((t - (knee === 1 ? 0.04 : 0.96)) / 0.14) ** 2)) * 0.9 : 0;
    const pool = hem ? Math.sin(phi * 5 + n * 3) * sm(clamp01((t - 0.8) / 0.2)) * 0.9 : 0;
    return 1 + amp * (n * 1.6 + rg * 2.0 + drag * 0.9 + pool + kneeF);
  };
  // leg A: thigh runs up-right to the raised knee (~x1040), shin drops down-left to the hem over the boot
  const hipA = P(625, 845, -0.04), kneeA = P(950, 808, 0.26), hemA = P(430, 1022, 0.58);
  {
    const thigh = {
      pts: [hipA, P(790, 815, 0.12), kneeA], rings: 20, sides: 22, ref: V3(0, 1, 0),
      rx: prof([[0, 0.115], [1, 0.088]]), ry: prof([[0, 0.11], [1, 0.088]]), capStart: 3, capEnd: 4, noise: legNoise(0.1, 2, false, 2), shade: suitShade,
    };
    const thighGeo = loft(thigh);
    add(thighGeo, trouserVM());
    // diagonal fold ridges from the knee toward the hip (spiralling over the thigh top)
    {
      const rm = mat(0xf0eeea, 'suit');
      for (const [p0, p1, w] of [[1.5, 1.05, 0.0], [1.7, 1.2, 0.35], [1.35, 0.95, -0.3]]) {
        const pts = [];
        for (let k = 0; k <= 10; k++) {
          const t = 0.12 + 0.82 * (k / 10);
          pts.push(U.ringPoint(thigh, thighGeo._curve, t, p0 + (p1 - p0) * (k / 10) * 1.6 + w * 0.3, 1.0, 0.004));
        }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0105, 6, false), rm);
      }
    }
    const shin = {
      pts: [kneeA, P(850, 870, 0.34), P(670, 935, 0.46), P(540, 982, 0.53), hemA], rings: 36, sides: 24, ref: V3(0, 1, 0),
      rx: prof([[0, 0.086], [0.5, 0.074], [0.82, 0.088], [1, 0.12]]), ry: prof([[0, 0.086], [0.5, 0.07], [0.82, 0.084], [1, 0.112]]),
      capStart: 3, noise: legNoise(0.12, 5, true, 1), shade: suitShade,
    };
    const shinGeo = loft(shin);
    add(shinGeo, trouserVM());
    // sharp shin edge ridges along the top of the crossing leg
    {
      const rm = mat(0xf0eeea, 'suit');
      for (const [ph, wid] of [[Math.PI / 2 + 0.25, 0.012], [Math.PI / 2 - 0.35, 0.009]]) {
        const pts = [];
        for (let k = 0; k <= 14; k++) {
          const t = 0.08 + 0.84 * (k / 14);
          pts.push(U.ringPoint(shin, shinGeo._curve, t, ph + Math.sin(k * 0.9) * 0.08, 1.0, 0.004));
        }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, wid, 6, false), rm);
      }
    }
  }
  // leg B: wide white leg falling from behind the crossed shin to the bottom centre, pooled at a pointed hem
  {
    const hipB = P(560, 855, -0.04), kneeB = P(520, 990, 0.3), ankleB = P(535, 1750, 0.5);
    const thigh = {
      pts: [hipB, P(520, 930, 0.2), kneeB], rings: 14, sides: 22, ref: V3(1, 0, 0),
      rx: prof([[0, 0.11], [1, 0.1]]), ry: prof([[0, 0.11], [1, 0.1]]), capStart: 3, capEnd: 4, noise: legNoise(0.09, 9), shade: suitShade,
    };
    add(loft(thigh), trouserBM());
    const shin = {
      pts: [kneeB, P(515, 1250, 0.4), P(525, 1500, 0.45), ankleB], rings: 26, sides: 24, ref: V3(1, 0, 0),
      rx: prof([[0, 0.105], [0.4, 0.115], [1, 0.14]]), ry: prof([[0, 0.1], [0.4, 0.105], [1, 0.12]]), capStart: 3, noise: legNoise(0.12, 11, true), shade: suitShade,
    };
    add(loft(shin), trouserBM());
    ell(0.07, P(540, 1700, 0.62), [1, 0.6, 1.8], mat(0x1a1210, 'leather'));
  }

  // ================= BOOT: short chunky lace-up with distinct toe cap, sole and heel =================
  {
    const leather = mat(0x4a2410, 'leather');
    const leatherD = mat(0x120804, 'leather');
    const capM = mat(0x2e1408, 'leather');
    // shaft continues the shin axis out of the hem down to the ankle
    const hemC = P(436, 1018, 0.52), ank = P(338, 1052, 0.53);
    add(loft({
      pts: [hemC, hemC.clone().lerp(ank, 0.5), ank], rings: 8, sides: 18, ref: V3(0, 1, 0),
      rx: prof([[0, 0.062], [1, 0.058]]), ry: prof([[0, 0.062], [1, 0.058]]), capEnd: 4, noise: legNoise(0.03, 4),
    }), leather);
    // foot: short and thick, instep rising into the shaft
    const heel = P(318, 1092, 0.53), mid = P(254, 1118, 0.56), ball = P(190, 1146, 0.59), toe = P(148, 1168, 0.6);
    const footSpec = {
      pts: [heel, mid, ball, toe], rings: 20, sides: 20, ref: V3(0.2, 0.2, 1),
      rx: prof([[0, 0.056], [0.4, 0.06], [0.8, 0.064], [1, 0.05]]),
      ry: prof([[0, 0.062], [0.4, 0.058], [0.8, 0.052], [1, 0.044]]),
      capStart: 5, capEnd: 4, noise: legNoise(0.025, 8),
    };
    const footGeo = loft(footSpec);
    add(footGeo, leather);
    // rounded toe cap: separate darker bulge forward-down-left
    ell(0.056, toe.clone().lerp(ball, 0.15), [1.0, 0.9, 1.1], capM);
    // thick dark sole (welt wider than the upper) and a heel block
    add(loft({
      pts: footSpec.pts.map((p) => p.clone().add(V3(0.004, -0.054, -0.01))), rings: 16, sides: 14, ref: V3(0.2, 0.2, 1),
      rx: prof([[0, 0.062], [0.8, 0.07], [1, 0.056]]), ry: () => 0.022, capStart: 3, capEnd: 4,
    }), leatherD);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.085), leatherD);
    hb.position.copy(heel).add(V3(0.016, -0.075, -0.012));
    hb.rotation.set(0, 0.5, 0.32);
    g.add(hb);
    // dark band where the shaft meets the foot
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 20), capM);
    band.position.copy(ank).add(V3(-0.004, -0.02, 0));
    band.quaternion.setFromUnitVectors(V3(0, 0, 1), ank.clone().sub(hemC).normalize());
    g.add(band);
    // laces: bold crossings up the instep onto a tongue
    const gc = footGeo._curve;
    const tongue = ell(0.034, U.ringPoint(footSpec, gc, 0.06, Math.PI / 2, 1.0, 0.018), [1.1, 0.5, 2.4], mat(0x5a2e14, 'leather'));
    for (let i = 0; i < 4; i++) {
      const t = 0.04 + i * 0.1;
      const f = U.frameAt(footSpec, gc, t);
      for (const sgn of [-1, 1]) {
        const top = U.ringPoint(footSpec, gc, t, Math.PI / 2, 1.0, 0.012);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.085, 6), leatherD);
        bar.position.copy(top);
        orient(bar, f.B, f.N);
        bar.rotateZ(sgn * 0.6);
        g.add(bar);
      }
    }
    // trouser cuff ring pooled over the boot top
    const tan = hemA.clone().sub(P(540, 982, 0.53)).normalize();
    const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.016, 8, 28), mat(0xf0eeea, 'suit'));
    cuffRing.position.copy(hemA);
    cuffRing.quaternion.setFromUnitVectors(V3(0, 0, 1), tan);
    cuffRing.scale.set(1, 0.92, 1);
    g.add(cuffRing);
  }

  g.userData.neck = neck.clone();
  g.userData.cheekTarget = kn.clone();
  return g;
}

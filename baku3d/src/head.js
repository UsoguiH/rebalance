// OWNER: Builder B. Origin = base of neck. Faces +Z. Units metres, head (chin..hair crown) ~0.26 tall.
// userData.cheek = head-local (group-local) Vector3 where the propped hand's knuckles touch.
import { makeField, ribbon, fill, clipPoly, mergeGeos } from './headB_geo.js';
import { buildHair } from './headB_hair.js';

const FACE_Y = 0.168;          // eye-line height above the neck base
const PIVOT_Y = 0.07;         // head tilts about here

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function buildHead(THREE, style) {
  const V3 = THREE.Vector3;
  const root = new THREE.Group(); root.name = 'baku-head';
  const field = makeField(THREE);

  // ---- materials
  const SKIN = 0xffeedb;
  const skinMat = style.toon(SKIN, { role: 'skin', hatch: 0.22 });
  const ink = (hex = 0x1c1217, role = 'eye', lay = 1) => {
    const m = style.toon(hex, { role, side: THREE.DoubleSide, outline: false, spec: 0 });
    m.polygonOffset = true; m.polygonOffsetFactor = -lay; m.polygonOffsetUnits = -lay * 2; return m;
  };
  const decal = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = 1; return m; };

  // ======================= NECK =======================
  const neckGroup = new THREE.Group(); neckGroup.name = 'neck'; root.add(neckGroup);
  {
    const ny = 40, nth = 48, pos = [], idx = [];
    for (let j = 0; j <= ny; j++) {
      const y = -0.012 + 0.158 * j / ny;
      const flare = 1 + 0.55 * Math.pow(Math.max(0, 1 - (y + 0.012) / 0.045), 2);
      const rx = 0.0410 * flare, rz = 0.050 * (1 + 0.15 * (flare - 1));
      for (let i = 0; i < nth; i++) {
        const th = i / nth * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        let x = rx * c, z = rz * s - 0.004;
        if (s > 0) {
          // Adam's apple + throat hollow + SCM ridges
          const aa = Math.exp(-(((y - 0.066) / 0.011) ** 2 + (x / 0.0075) ** 2)) * 0.0075;
          const hollow = -Math.exp(-(((y - 0.018) / 0.014) ** 2 + (x / 0.012) ** 2)) * 0.003;
          const scm = Math.exp(-(((Math.abs(x) - 0.020 + (y - 0.04) * 0.25) / 0.006) ** 2)) * 0.0035 * Math.min(1, (y + 0.01) / 0.04);
          z += (aa + hollow + scm) * s;
        }
        pos.push(x, y, z);
      }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nth; i++) {
      const a = j * nth + i, b = j * nth + (i + 1) % nth, c = (j + 1) * nth + i, d = (j + 1) * nth + (i + 1) % nth;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const neck = new THREE.Mesh(geo, skinMat); neck.name = 'neckMesh'; neckGroup.add(neck);
    // ink lines on the neck: SCM tendons, adam's apple arc, clavicle hint
    const line = (pts, w, hex = 0x2a1a1c) => {
      const p = pts.map(q => new V3(...q));
      const curveP = new THREE.CatmullRomCurve3(p).getPoints(20);
      const n = curveP.length, pos2 = [], idx2 = [];
      for (let i = 0; i < n; i++) {
        const a = curveP[Math.max(0, i - 1)], b = curveP[Math.min(n - 1, i + 1)];
        const t = new V3().subVectors(b, a).normalize();
        const side = new V3(0, 0, 1).cross(t).normalize();
        const hw = w * Math.sin(Math.PI * (0.1 + 0.8 * i / (n - 1))) / 2 + 0.0001;
        pos2.push(curveP[i].x + side.x * hw, curveP[i].y + side.y * hw, curveP[i].z + side.z * hw + 0.0006,
          curveP[i].x - side.x * hw, curveP[i].y - side.y * hw, curveP[i].z - side.z * hw + 0.0006);
        if (i < n - 1) idx2.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3)); g.setIndex(idx2); g.computeVertexNormals();
      const m = new THREE.Mesh(g, ink(hex, 'eye', 1)); neckGroup.add(m);
    };
    const zN = (x, y) => { // surface z of neck front
      const flare = 1 + 0.55 * Math.pow(Math.max(0, 1 - (y + 0.012) / 0.045), 2);
      const rx = 0.0410 * flare, rz = 0.050 * (1 + 0.15 * (flare - 1));
      const r = Math.min(0.999, Math.abs(x) / rx); return rz * Math.sqrt(1 - r * r) - 0.004 + 0.0025;
    };
    line([[-0.0235, 0.090, zN(-0.0235, 0.090)], [-0.018, 0.060, zN(-0.018, 0.060)], [-0.0125, 0.032, zN(-0.0125, 0.032)], [-0.008, 0.008, zN(-0.008, 0.008)]], 0.0014);
    line([[0.0245, 0.085, zN(0.0245, 0.085)], [0.019, 0.060, zN(0.019, 0.060) + 0.001], [0.013, 0.032, zN(0.013, 0.032)], [0.009, 0.006, zN(0.009, 0.006)]], 0.0011);
    line([[-0.0065, 0.070, zN(-0.0065, 0.070) + 0.006], [-0.0010, 0.062, zN(0, 0.062) + 0.0085], [0.0065, 0.071, zN(0.0065, 0.071) + 0.006]], 0.0012);
    { const R = rng(9), geosN = [];
      for (let k = 0; k < 230; k++) {
        const x = (R() * 2 - 1) * 0.034, y = 0.074 + R() * 0.050, z = zN(x, y) + 0.0006, L = 0.0035 + R() * 0.003, w = 0.0004, a = (R() - 0.5) * 0.5;
        const dx = Math.sin(a) * L, dy = -Math.cos(a) * L;
        geosN.push([x - w, y, z, x + w, y, z, x + dx - w, y + dy, z, x + dx + w, y + dy, z]);
      }
      const pos = [], idx = [];
      geosN.forEach((q, i) => { pos.push(...q); const b = i * 4; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      neckGroup.add(new THREE.Mesh(g, ink(0x4a3030, 'eye', 1)));
    }
    { const pos = [], idx = [], rowsN = 6, colsN = 14;
      for (let j = 0; j <= rowsN; j++) for (let i = 0; i <= colsN; i++) {
        const x = -0.040 + 0.080 * i / colsN, y = 0.122 + 0.030 * j / rowsN - 0.012 * Math.abs(x) / 0.04;
        pos.push(x, y, zN(x, y) + 0.0005);
      }
      for (let j = 0; j < rowsN; j++) for (let i = 0; i < colsN; i++) { const a = j * (colsN + 1) + i; idx.push(a, a + 1, a + colsN + 1, a + 1, a + colsN + 2, a + colsN + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      neckGroup.add(new THREE.Mesh(g, ink(0xe2a984, 'eye', 1)));
    }
    // clavicles
    line([[-0.012, 0.030, 0.062], [-0.034, 0.026, 0.054], [-0.070, 0.030, 0.032]], 0.0034);
    line([[0.012, 0.030, 0.062], [0.034, 0.026, 0.054], [0.070, 0.030, 0.032]], 0.0034);
  }
  neckGroup.rotation.set(0.12, 0, -0.20);
  const HS = 1.15; neckGroup.scale.setScalar(HS);

  // ======================= HEAD (tilt group) =======================
  const tilt = new THREE.Group(); tilt.name = 'headTilt';
  tilt.position.set(0, PIVOT_Y * HS, 0); tilt.scale.setScalar(HS);
  tilt.rotation.order = 'ZXY';
  tilt.rotation.set(0.28, -0.25, -0.50);
  tilt.position.x += 0.043; tilt.position.y -= 0.024;
  root.add(tilt);
  const face = new THREE.Group(); face.name = 'face';
  face.position.set(0, FACE_Y - PIVOT_Y, 0.004);
  face.scale.set(1.05, 0.92, 1.0);
  tilt.add(face);

  { // aim the neck at the underside of the chin
    root.updateMatrixWorld(true);
    const p = face.localToWorld(new V3(0, -0.078, -0.012));
    neckGroup.rotation.z = -Math.atan2(p.x, p.y);
    neckGroup.scale.set(HS, Math.max(HS, Math.hypot(p.x, p.y) / 0.140), HS);
  }
  const skullGeo = field.skullGeometry();
  const skull = new THREE.Mesh(skullGeo, skinMat); skull.name = 'skull'; face.add(skull);

  // ---- ears
  for (const sg of [-1, 1]) {
    const g = new THREE.SphereGeometry(1, 20, 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      y *= 0.028 * (y > 0 ? 1.15 : 0.95); x *= 0.0055; z *= 0.016;
      z += y * (y > 0 ? 0.0 : -0.2) - 0.0; x += (y > 0 ? y * 0.2 * sg : 0);
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    const ear = new THREE.Mesh(g, skinMat); ear.position.set(sg * 0.0765, 0.004, -0.024); ear.rotation.set(0, 0, sg * -0.12);
    ear.name = 'ear'; face.add(ear);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0009, 5, 18, Math.PI * 1.35), ink(0x5a3a30, 'skin'));
    r.position.set(sg * 0.0806, 0.003, -0.024); r.rotation.set(0, sg * Math.PI / 2, 0.5); r.scale.set(1, 1.5, 1); face.add(r);
  }

  const add = (geo, hex, role, name, lay = 1) => { const m = decal(geo, ink(hex, role, lay), name); face.add(m); return m; };

  // ---- EYE (visible: viewer's left)
  function eyeAt(ex, ey, side, phi) {
    const hw = 0.0150, hu = 0.0038, hl = 0.0020;
    const cs = Math.cos(phi), sn = Math.sin(phi);
    // canonical u along +x; for side=-1 (viewer's left) inner corner is +u; mirror for the other
    const T = (u, v) => { const uu = u * (side < 0 ? 1 : -1); const x = uu * cs + v * sn * 1, y = -uu * sn + v * cs; return [ex + x, ey + y]; };
    const up = u => hu * Math.pow(Math.max(0, 1 - (u / hw) ** 2), 0.62) * (1 + 0.28 * (u / hw));
    const lo = u => -hl * Math.pow(Math.max(0, 1 - (u / hw) ** 2), 0.9);
    const n = 16, almond = [];                      // CCW in canonical coords
    for (let i = 0; i <= n; i++) { const u = -hw + 2 * hw * i / n; almond.push([u, lo(u)]); }
    for (let i = n - 1; i >= 1; i--) { const u = -hw + 2 * hw * i / n; almond.push([u, up(u)]); }
    const toFace = poly => poly.map(p => T(p[0], p[1]));
    add(fill(THREE, field, toFace(almond), 0.0007, 3), 0xe8dfd2, 'eye', 'sclera', 1);
    const circle = (cx, cy, r, m = 28) => { const a = []; for (let i = 0; i < m; i++) { const t = i / m * Math.PI * 2; a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return a; };
    const ic = [0.0010, 0.0009];
    const irisP = clipPoly(circle(ic[0], ic[1], 0.0078), almond);
    const lightP = clipPoly(circle(ic[0] + 0.0004, ic[1] - 0.0006, 0.0044), almond);
    const pupP = clipPoly(circle(ic[0], ic[1] + 0.0004, 0.0030), almond);
    if (irisP.length > 2) add(fill(THREE, field, toFace(irisP), 0.0010, 3), 0x14131a, 'eye', 'iris', 2);
    if (lightP.length > 2) add(fill(THREE, field, toFace(lightP), 0.0013, 3), 0x2a2a38, 'eye', 'irisLight', 3);
    if (pupP.length > 2) add(fill(THREE, field, toFace(pupP), 0.0016, 2), 0x07070b, 'eye', 'pupil', 4);
    
    // lid lines
    const upper = [], lower = [], crease = [], bag = [];
    for (let i = -1; i <= n + 2; i++) { const u = -hw + 2 * hw * i / n; const uc = Math.max(-hw, Math.min(hw, u)); upper.push(T(u + (i > n ? 0.002 * (i - n) * (side < 0 ? -1 : 1) * (side < 0 ? 1 : 1) * 0 : 0), up(uc) + (i > n ? 0.0016 * (i - n) : 0) + 0.0002)); }
    for (let i = 0; i <= n; i++) { const u = -hw + 2 * hw * i / n; lower.push(T(u, lo(u) - 0.0002)); }
    for (let i = 1; i < n; i++) { const u = -hw * 0.95 + 1.9 * hw * i / n; crease.push(T(u, up(u) + 0.0042 + 0.0010 * Math.sin((u / hw + 1) * Math.PI / 2))); }
    for (let i = 2; i < n - 1; i++) { const u = -hw * 0.9 + 1.8 * hw * i / n; bag.push(T(u, lo(u) - 0.0050 - 0.0010 * Math.sin((u / hw + 1) * Math.PI / 2))); }
    add(ribbon(THREE, field, upper, t => 0.0014 + 0.0040 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.8, 0.0020), 0x060304, 'eye', 'upperLid', 6);
    { const lid = []; for (let i = 0; i <= n; i++) { const u = -hw + 2 * hw * i / n; lid.push(T(u, up(u) + 0.0003)); }
      for (let i = n; i >= 0; i--) { const u = -hw + 2 * hw * i / n; lid.push(T(u, up(u) + 0.0042 + 0.0016 * Math.sin((u / hw + 1) * Math.PI / 2))); }
      add(fill(THREE, field, lid, 0.0011, 2), 0xd9a283, 'eye', 'heavyLid', 3); }
    const shade = []; for (let i = 0; i <= n; i++) { const u = -hw + 2 * hw * i / n; shade.push(T(u, up(u) + 0.0022)); }
    add(ribbon(THREE, field, shade, t => 0.0070 * Math.sin(Math.PI * Math.min(1, 0.05 + 0.9 * t)) ** 0.8 + 0.0004, 0.0014), 0x6a3a30, 'eye', 'lidShade', 2);
    add(ribbon(THREE, field, lower, t => 0.0004 + 0.0009 * Math.sin(Math.PI * t), 0.0020), 0x2a1a1c, 'eye', 'lowerLid', 6);
    add(ribbon(THREE, field, crease, t => 0.0004 + 0.0011 * Math.sin(Math.PI * t), 0.0012), 0x6a4034, 'skin', 'crease', 2);
    add(ribbon(THREE, field, bag, t => 0.0014 + 0.0042 * Math.sin(Math.PI * t), 0.0012), 0x7a4638, 'eye', 'bag', 2);
  }
  eyeAt(-0.0345, 0.0005, -1, 0.26);

  // ---- BROWS
  const browL = [[-0.066, 0.0440], [-0.058, 0.0440], [-0.048, 0.0400], [-0.038, 0.0335], [-0.028, 0.0265], [-0.018, 0.0205], [-0.0095, 0.0150]];
  add(ribbon(THREE, field, browL, t => 0.0012 + 0.0052 * Math.sin(Math.PI * Math.min(1, 0.12 + 0.85 * t)) ** 0.5 * (1 - 0.15 * t) * (0.5 + 0.5 * t), 0.0018), 0x0c0709, 'hair', 'browL', 5);
  const browR = [[0.020, 0.0320], [0.030, 0.0430], [0.043, 0.0490], [0.057, 0.0470], [0.068, 0.0395]];
  add(ribbon(THREE, field, browR, t => 0.0008 + 0.0026 * Math.sin(Math.PI * t) ** 0.7, 0.0018), 0x1a1013, 'hair', 'browR', 5);

  // ---- NOSE lines
  add(ribbon(THREE, field, [[-0.0100, 0.008], [-0.0096, -0.006], [-0.0092, -0.020], [-0.0104, -0.033], [-0.0125, -0.040]], t => 0.0009 * Math.sin(Math.PI * (0.1 + 0.8 * t)) + 0.0003, 0.0012), 0x7a4a3a, 'skin', 'noseSide', 2);
  add(ribbon(THREE, field, [[-0.0135, -0.0445], [-0.0105, -0.0505], [-0.0050, -0.0525], [0, -0.0505], [0.0050, -0.0525], [0.0105, -0.0505], [0.0135, -0.0445]], t => 0.0011 * Math.sin(Math.PI * t) + 0.0003, 0.0016), 0x3a2224, 'eye', 'noseBase', 4);
  for (const sg of [-1, 1]) {
    add(fill(THREE, field, [[sg * 0.0045, -0.0495], [sg * 0.0085, -0.0502], [sg * 0.0100, -0.0478], [sg * 0.0060, -0.0472]], 0.0016, 2), 0x2a181a, 'eye', 'nostril', 5);
    add(ribbon(THREE, field, [[sg * 0.0150, -0.0345], [sg * 0.0172, -0.0405], [sg * 0.0150, -0.0460], [sg * 0.0112, -0.0488]], t => 0.0010 * Math.sin(Math.PI * t) + 0.0003, 0.0014), 0x6a3e34, 'skin', 'ala', 3);
  }
  add(ribbon(THREE, field, [[-0.010, 0.017], [-0.006, 0.020], [0, 0.021], [0.006, 0.020], [0.010, 0.017]], t => 0.0008 * Math.sin(Math.PI * t) + 0.0002, 0.0012), 0x8a5a48, 'skin', 'glabella', 2);

  // ---- MOUTH: closed lopsided smirk
  const mouth = [[-0.0250, -0.0715], [-0.0200, -0.0735], [-0.0130, -0.0745], [-0.0050, -0.0748], [0.0040, -0.0745], [0.0130, -0.0735], [0.0210, -0.0708], [0.0290, -0.0655], [0.0345, -0.0600]];
  add(ribbon(THREE, field, mouth, t => 0.0004 + 0.0008 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)) ** 0.7, 0.0016), 0x3a1a1c, 'eye', 'mouthLine', 5);
  add(ribbon(THREE, field, mouth.slice(1, 7).map(q => [q[0], q[1] + 0.0027]), t => 0.0030 * Math.sin(Math.PI * t) ** 0.7, 0.0010), 0xdc9c84, 'eye', 'upperLipShape', 2);
  add(ribbon(THREE, field, mouth.slice(1, 7).map(q => [q[0] * 0.9, q[1] - 0.0045]), t => 0.0036 * Math.sin(Math.PI * t) ** 0.7, 0.0010), 0xc88870, 'eye', 'lowerLipShadow', 2);
  add(ribbon(THREE, field, [[-0.0250, -0.0715], [-0.0272, -0.0690], [-0.0268, -0.0668]], t => 0.0007 * (1 - t) + 0.0002, 0.0016), 0x3a1a1c, 'eye', 'mouthCurl', 5);
  add(fill(THREE, field, [[-0.020, -0.0830], [0.022, -0.0830], [0.018, -0.0955], [-0.016, -0.0960]], 0.0009, 3), 0xe0ab8a, 'eye', 'chinShade', 1);
  add(ribbon(THREE, field, [[-0.010, -0.0775], [0.000, -0.0785], [0.010, -0.0775]], t => 0.0006 * Math.sin(Math.PI * t) + 0.0002, 0.0010), 0xb87868, 'eye', 'lowerLipLine', 3);
  add(ribbon(THREE, field, [[-0.0330, -0.0655], [-0.0345, -0.0700], [-0.0320, -0.0735]], t => 0.0007 * Math.sin(Math.PI * t) + 0.0002, 0.0012), 0x9a6252, 'eye', 'dimpleL', 3);
  add(ribbon(THREE, field, [[-0.0090, -0.0560], [-0.0020, -0.0548], [0.0080, -0.0560]], t => 0.0007 * Math.sin(Math.PI * t) + 0.0002, 0.0010), 0x8a5a48, 'skin', 'philtrum', 2);
  add(ribbon(THREE, field, [[-0.012, -0.0900], [-0.004, -0.0925], [0.008, -0.0915], [0.014, -0.0890]], t => 0.0010 * Math.sin(Math.PI * t) + 0.0002, 0.0010), 0x8a5a48, 'skin', 'chinCrease', 2);

  // ---- FACE SHADING STROKES (ink hatching): nasolabial, cheek hollows, jaw contour, temple
  const stroke = (pts, w, hex = 0x4a2e2c, name = 'hatch') => add(ribbon(THREE, field, pts, t => w * Math.sin(Math.PI * (0.06 + 0.88 * t)) ** 0.7 + 0.0002, 0.0012), hex, 'eye', name, 2);
  stroke([[-0.0320, -0.0320], [-0.0370, -0.0440], [-0.0385, -0.0545], [-0.0350, -0.0650]], 0.0026, 0x4a2a28, 'nasolabialL');
  stroke([[0.0300, -0.0340], [0.0385, -0.0440], [0.0430, -0.0540], [0.0420, -0.0600]], 0.0024, 0x4a2a28, 'nasolabialR');
  for (let i = 0; i < 3; i++) stroke([[-0.063 + i * 0.002, -0.026 - i * 0.0045], [-0.058 + i * 0.002, -0.038 - i * 0.0045], [-0.052 + i * 0.0015, -0.050 - i * 0.0045]], 0.0010, 0x5a3a34, 'cheekHatchL');
  const jc = (sg, ys) => ys.map(y => [sg * field.Wf(y) * 0.90, y]);
  stroke(jc(-1, [0.0, -0.022, -0.045, -0.062, -0.078, -0.090]), 0.0020, 0x3a2224, 'jawContourL');
  stroke(jc(1, [-0.010, -0.030, -0.050, -0.066, -0.080, -0.091]), 0.0016, 0x3a2224, 'jawContourR');

  // ---- warm shadow modelling decals
  add(fill(THREE, field, [[-0.0072, 0.012], [-0.0115, -0.010], [-0.0145, -0.032], [-0.0120, -0.0415], [-0.0085, -0.039], [-0.0068, -0.015]], 0.0009, 3), 0xe6b690, 'eye', 'noseShade', 1);
  add(fill(THREE, field, [[-0.062, 0.027], [-0.045, 0.0205], [-0.020, 0.0125], [-0.012, 0.0045], [-0.030, 0.0105], [-0.052, 0.0150], [-0.064, 0.0200]], 0.0009, 3), 0xe9bb94, 'eye', 'browShadeL', 1);
  add(fill(THREE, field, [[-0.068, -0.016], [-0.052, -0.025], [-0.038, -0.030], [-0.046, -0.044], [-0.056, -0.050], [-0.064, -0.036]], 0.0009, 3), 0xeab890, 'eye', 'cheekboneShadeL', 1);

  // ---- STUBBLE strokes on jaw, chin, upper lip, sideburn area
  {
    const R = rng(42), geos = [];
    const place = (x, y, len, ang) => {
      const dx = Math.sin(ang) * len, dy = -Math.cos(ang) * len;
      geos.push(ribbon(THREE, field, [[x, y], [x + dx * 0.5, y + dy * 0.5], [x + dx, y + dy]], t => 0.00050 * (1 - 0.7 * t), 0.0010));
    };
    for (let k = 0; k < 150; k++) {
      const y = -0.108 + R() * 0.030, x = (R() * 2 - 1) * field.Wf(y) * 0.90;
      const edge = Math.abs(x) / field.Wf(y);
      if (!(edge > 0.78)) continue;
      place(x, y, 0.0028 + R() * 0.0024, (R() - 0.5) * 0.5 + (x > 0 ? 0.3 : -0.3) * edge);
    }
    for (let k = 0; k < 110; k++) { const y = -0.052 + R() * 0.060, x = -(0.70 + R() * 0.22) * field.Wf(y); place(x, y, 0.0035 + R() * 0.003, (R() - 0.5) * 0.3); }
    const m = decal(mergeGeos(THREE, geos), ink(0x3b2a2c, 'eye', 1), 'stubble'); face.add(m);
  }

  // ---- EYEPATCH STRAP + GOLD MONOCLE DISC
  const gold = style.toon(0xe8c040, { role: 'gold', side: THREE.DoubleSide });
  const goldLight = style.toon(0xf6d460, { role: 'gold' });
  const goldDark = style.toon(0xa8741a, { role: 'gold' });
  const C = [0.050, 0.006], RING = 0.0225, RY = 0.72;
  {
    const goldStrap = style.toon(0xf8e79a, { role: 'eye', side: THREE.DoubleSide, spec: 0, outline: false, opacity: 0.8, transparent: true });
    const E = [C[0] - RING * 0.72, C[1] + RING * RY * 0.72];
    const ctrl = [];
    const x0 = -0.058, ySl = -0.36;
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i <= 8; i++) {
      const x = E[0] + (-0.072 - E[0]) * i / 8, y = E[1] + (x - E[0]) * ySl;
      ctrl.push(field.P(x, y, 0.0040));
    }
    const curveS = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5);
    const pts = curveS.getPoints(60);
    const cen = new V3(0, 0.05, -0.012), hw = 0.0095, th = 0.0016;
    const pos = [], idx = [], tt = new V3(), nn = new V3(), bb = new V3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      tt.subVectors(b, a).normalize();
      nn.copy(field.normal(pts[i].x, pts[i].y));
      nn.addScaledVector(tt, -nn.dot(tt)).normalize(); bb.crossVectors(tt, nn).normalize();
      for (const [bw, nh] of [[-hw, 0], [hw, 0], [hw, th], [-hw, th]]) { const p = pts[i].clone().addScaledVector(bb, bw).addScaledVector(nn, nh); pos.push(p.x, p.y, p.z); }
      if (i < pts.length - 1) { const k = i * 4; for (let s2 = 0; s2 < 4; s2++) { const a0 = k + s2, a1 = k + (s2 + 1) % 4, b0 = k + 4 + s2, b1 = k + 4 + (s2 + 1) % 4; idx.push(a0, a1, b0, a1, b1, b0); } }
    }
    const n0 = pos.length / 3 - 4; idx.push(0, 1, 2, 0, 2, 3, n0, n0 + 2, n0 + 1, n0, n0 + 3, n0 + 2);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const strap = new THREE.Mesh(geo, goldStrap); strap.name = 'eyepatchStrap'; face.add(strap);
  }
  {
    const nn = field.normal(C[0], C[1]), cp = field.P(C[0], C[1], 0.0070);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), nn);
    const disc = new THREE.Group(); disc.name = 'monocle'; disc.position.copy(cp); disc.quaternion.copy(q);
    disc.rotateY(0.45); disc.rotateX(-0.12); disc.rotateZ(-0.3);
    const inner = new THREE.Group(); inner.scale.set(1, RY, 1); disc.add(inner);
    const rimM = style.toon(0xe0b030, { role: 'eye', side: THREE.DoubleSide, outline: false });
    const lensGold = style.toon(0xf9e47e, { role: 'eye', side: THREE.DoubleSide, outline: false, opacity: 0.6, transparent: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.0016, 8, 48), rimM); ring.name = 'monocleRing'; inner.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(RING - 0.0006, 40), lensGold); lens.position.z = -0.0006; lens.name = 'monocleLens'; inner.add(lens);
    const lensHi = new THREE.Mesh(new THREE.RingGeometry(RING * 0.55, RING * 0.66, 24, 1, 2.2, 1.4), style.toon(0xfffbe0, { role: 'eye', side: THREE.DoubleSide, outline: false })); lensHi.position.z = 0.0003; inner.add(lensHi);
    const back = new THREE.Mesh(new THREE.CircleGeometry(RING, 40), rimM); back.position.z = -0.0030; back.name = 'monocleBack'; inner.add(back);
    face.add(disc);
  }

  // ======================= HAIR =======================
  face.add(buildHair(THREE, style, field, skullGeo));

  // ======================= cheek contact point (group-local) =======================
  root.updateMatrixWorld(true);
  const cheekFace = field.P(0.074, -0.046, 0.016);
  const cheekWorld = face.localToWorld(cheekFace.clone());
  root.userData.cheek = root.worldToLocal(cheekWorld);
  root.userData.faceOrigin = face.localToWorld(new V3());
  return root;
}

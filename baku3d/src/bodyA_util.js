// Builder A helpers: image->world mapping, noise, lofting, ribbons.
// The reference picture is matched assuming this camera (fov 32, looking along -Z):
//   position (0, CAM_Y, CAM_D), target (0, CAM_Y, 0), viewport 1156x1264.
export const CAM_D = 2.2;
export const CAM_Y = 0.85;
const F = 632 / Math.tan((16 * Math.PI) / 180); // focal length in reference pixels

export function makeUtil(THREE) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // reference pixel (px,py) at world depth z -> world point
  function P(px, py, z = 0) {
    const d = CAM_D - z;
    return V3(((px - 578) * d) / F, CAM_Y - ((py - 632) * d) / F, z);
  }

  // ---------- noise ----------
  const hash = (i, j, k) => {
    const h = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + 13.37) * 43758.5453;
    return h - Math.floor(h);
  };
  const sm = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
  }
  const fbm = (x, y, z, o = 3) => {
    let a = 0.5, s = 0, f = 1;
    for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
    return s / 0.875; // ~0..1
  };

  // piecewise profile with smooth easing: keys = [[t,v],...]
  function prof(keys) {
    return (t) => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) {
          const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
          const u = sm((t - t0) / (t1 - t0));
          return v0 + (v1 - v0) * u;
        }
      }
      return keys[keys.length - 1][1];
    };
  }

  // ---------- loft ----------
  // spec: { pts:[Vector3], rings, sides, rx(t), ry(t), ref:Vector3, roll(t), noise(t,phi,pos)->mult,
  //         phi0(t), phi1(t) (open surface when given), capStart, capEnd (dome ring count), closed }
  function frameAt(spec, curve, t) {
    const c = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let ref = spec.ref || V3(0, 0, 1);
    let N = ref.clone().sub(T.clone().multiplyScalar(ref.dot(T)));
    if (N.lengthSq() < 1e-4) N = V3(1, 0, 0).sub(T.clone().multiplyScalar(T.x));
    N.normalize();
    if (spec.roll) N.applyAxisAngle(T, spec.roll(t));
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    return { c, T, N, B };
  }

  function ringPoint(spec, curve, t, phi, scale = 1, outset = 0) {
    const f = frameAt(spec, curve, t);
    const rx = spec.rx(t) * scale + outset, ry = spec.ry(t) * scale + outset;
    const p = f.c.clone().addScaledVector(f.B, Math.cos(phi) * rx).addScaledVector(f.N, Math.sin(phi) * ry);
    if (spec.tilt) p.addScaledVector(f.T, Math.cos(phi) * rx * spec.tilt(t));
    return p;
  }

  function loft(spec) {
    const curve = new THREE.CatmullRomCurve3(spec.pts, false, 'centripetal');
    const rings = spec.rings || 24;
    const sides = spec.sides || 20;
    const open = !!spec.phi0;
    const cols = open ? sides + 1 : sides;
    const list = []; // {t, scale, shift}
    const capS = spec.capStart || 0, capE = spec.capEnd || 0;
    for (let i = 0; i < capS; i++) {
      const a = (Math.PI / 2) * (i / capS);
      list.push({ t: 0, s: Math.sin(a), shift: -Math.cos(a) });
    }
    for (let i = 0; i <= rings; i++) list.push({ t: i / rings, s: 1, shift: 0 });
    for (let i = capE - 1; i >= 0; i--) {
      const a = (Math.PI / 2) * (i / capE);
      list.push({ t: 1, s: Math.sin(a), shift: Math.cos(a) });
    }
    const pos = [], col = [];
    for (const it of list) {
      const f = frameAt(spec, curve, it.t);
      const rx0 = spec.rx(it.t), ry0 = spec.ry(it.t);
      const capLen = Math.min(rx0, ry0) * (spec.capLen || 1);
      for (let j = 0; j < cols; j++) {
        const u = j / (open ? sides : sides);
        const p0 = open ? spec.phi0(it.t) : 0, p1 = open ? spec.phi1(it.t) : Math.PI * 2;
        const phi = p0 + (p1 - p0) * u;
        const ca = Math.cos(phi), sa = Math.sin(phi);
        let m = 1;
        const base = f.c.clone().addScaledVector(f.B, ca * rx0).addScaledVector(f.N, sa * ry0);
        if (spec.noise) m = spec.noise(it.t, phi, base);
        const v = f.c.clone()
          .addScaledVector(f.B, ca * rx0 * it.s * m)
          .addScaledVector(f.N, sa * ry0 * it.s * m)
          .addScaledVector(f.T, it.shift * capLen + (spec.tilt ? ca * rx0 * it.s * m * spec.tilt(it.t) : 0));
        pos.push(v.x, v.y, v.z);
        if (spec.shade) col.push(...spec.shade(m, it.t, phi, base));
      }
    }
    const idx = [];
    const nR = list.length;
    for (let i = 0; i < nR - 1; i++) {
      const lim = open ? cols - 1 : cols;
      for (let j = 0; j < lim; j++) {
        const j2 = (j + 1) % cols;
        const a = i * cols + j, b = i * cols + j2, c = (i + 1) * cols + j, d = (i + 1) * cols + j2;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    if (spec.shade) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    let out = g;
    if (spec.flat) { out = g.toNonIndexed(); }
    out.computeVertexNormals();
    out._curve = curve;
    return out;
  }

  // ribbon between two equally long point lists (double-sided surface)
  function ribbon(A, B, outPoint) {
    const pos = [], idx = [];
    if (outPoint) { // flip winding so the face normal points away from outPoint
      const k = Math.floor(A.length / 2);
      const n = B[k].clone().sub(A[k]).cross(A[k + 1].clone().sub(A[k]));
      if (n.dot(A[k].clone().sub(outPoint)) < 0) { A = A.slice().reverse(); B = B.slice().reverse(); }
    }
    for (let i = 0; i < A.length; i++) pos.push(A[i].x, A[i].y, A[i].z, B[i].x, B[i].y, B[i].z);
    for (let i = 0; i < A.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // orient an object so local +Y -> yDir and local +Z -> (approximately) zDir
  function orient(obj, yDir, zHint) {
    const y = yDir.clone().normalize();
    const x = new THREE.Vector3().crossVectors(y, zHint).normalize();
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }

  // capsule/cylinder-like segment between two points
  function seg(a, b, r0, r1, sides = 10) {
    const d = b.clone().sub(a);
    const len = d.length();
    const geo = new THREE.CylinderGeometry(r1, r0, len, sides, 1, false);
    const m = { geo, pos: a.clone().add(b).multiplyScalar(0.5), dir: d.normalize() };
    return m;
  }

  return { V3, P, vnoise, fbm, prof, sm, loft, ribbon, orient, frameAt, ringPoint, seg };
}

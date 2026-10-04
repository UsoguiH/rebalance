// Builder A: procedural hand. Local frame: origin = wrist, +Y = fingers extended, +Z = back of hand,
// thumb on the +X*side. Fingers are chained cylinders with sphere joints (stylised, slightly chunky).
export function buildHand(THREE, util, mat, nailMat, spec) {
  const g = new THREE.Group();
  const side = spec.side || 1;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const S = spec.scale || 1;
  const FL = spec.fingerLen || 1;

  const sphere = (r, p, sc = [1, 1, 1], m = mat) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
    s.position.copy(p);
    s.scale.set(sc[0], sc[1], sc[2]);
    g.add(s);
    return s;
  };
  const cyl = (a, b, r0, r1) => {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 10, 1), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    util.orient(m, d, V(0, 0, 1).cross(d).lengthSq() > 1e-6 ? V(0, 0, 1) : V(1, 0, 0));
    g.add(m);
  };

  // palm + back of hand
  sphere(0.04, V(0, 0.05, 0), [0.95, 1.25, 0.46]);
  sphere(0.032, V(side * 0.004, 0.012, 0.0), [1, 0.9, 0.62]);
  // heel of the thumb
  sphere(0.02, V(side * 0.03, 0.03, -0.006), [1, 1.2, 0.8]);

  const fingers = [
    { x: 0.027, y: 0.095, len: [0.04, 0.025, 0.021], r: 0.0088, splay: 0.06 },
    { x: 0.009, y: 0.099, len: [0.045, 0.028, 0.022], r: 0.0092, splay: 0.0 },
    { x: -0.009, y: 0.096, len: [0.041, 0.026, 0.021], r: 0.0088, splay: -0.05 },
    { x: -0.026, y: 0.088, len: [0.033, 0.02, 0.018], r: 0.0078, splay: -0.12 },
  ];
  const tips = [];
  fingers.forEach((f, i) => {
    const curl = (spec.curl && spec.curl[i]) || [0, 0, 0];
    const spread = (spec.spread || 0) * (1.5 - i) * 0.5;
    let p = V(side * f.x, f.y, 0.003);
    sphere(f.r * (spec.knuckle || 1.25), p.clone().add(V(0, 0, 0.007)), [1.1, 0.95, 0.95]); // knuckle bump
    if (spec.tendons) cyl(V(side * f.x * 0.55, 0.012, 0.018), p.clone().add(V(0, 0, 0.012)), 0.0045, 0.0055);
    let cum = 0;
    const axis = V(1, 0, 0);
    for (let k = 0; k < 3; k++) {
      cum += curl[k];
      const q = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), side * (f.splay + spread));
      const q2 = new THREE.Quaternion().setFromAxisAngle(axis, -cum);
      const dir = V(0, 1, 0).applyQuaternion(q2).applyQuaternion(q);
      const r0 = f.r * (1 - k * 0.1), r1 = f.r * (1 - (k + 1) * 0.1);
      const e = p.clone().addScaledVector(dir, f.len[k] * FL);
      cyl(p, e, r0, r1);
      sphere(r1, e);
      if (k === 2) {
        // nail on dorsal side
        const dors = V(0, 0, 1).applyQuaternion(q2).applyQuaternion(q);
        const n = new THREE.Mesh(new THREE.SphereGeometry(r1 * 0.95, 10, 8), nailMat);
        n.position.copy(p).addScaledVector(dir, f.len[k] * FL * 0.62).addScaledVector(dors, r1 * 0.55);
        n.scale.set(1, 1.5, 0.35);
        util.orient(n, dir, dors);
        n.scale.set(1.0, 1.55, 0.38);
        g.add(n);
        tips.push(e.clone());
      }
      p = e;
    }
  });

  // thumb
  const t = spec.thumb || { dir: V(0.5, 0.8, 0.1), bend: [0.2, 0.3], len: [0.034, 0.028, 0.024] };
  {
    let p = V(side * 0.03, 0.026, 0.0);
    const base = t.dir.clone().normalize();
    base.x *= side;
    let dir = base.clone();
    const bendAxis = V(0, 0, 1).cross(base).normalize(); // curls toward -Z-ish (palm) when rotating negatively
    let r = 0.0115;
    for (let k = 0; k < 3; k++) {
      if (k > 0) dir.applyAxisAngle(bendAxis, -(t.bend[k - 1] || 0)).normalize();
      const e = p.clone().addScaledVector(dir, t.len[k]);
      cyl(p, e, r, r * 0.9);
      sphere(r * 0.9, e);
      if (k === 2) {
        const n = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 10, 8), nailMat);
        n.position.copy(p).addScaledVector(dir, t.len[k] * 0.6).add(V(0, 0, r * 0.55));
        util.orient(n, dir, V(0, 0, 1));
        n.scale.set(1, 1.45, 0.38);
        g.add(n);
      }
      p = e;
      r *= 0.9;
    }
  }

  g.scale.setScalar(S);
  g.userData.tips = tips;
  return g;
}

// Builder A: gold throne, red velvet backing, cream brick wall.
export function buildThrone(THREE, style, util) {
  const g = new THREE.Group();
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const gold = () => style.toon(0xa8741a, { role: 'gold' });
  const goldDark = () => style.toon(0x6e450f, { role: 'gold' });
  const M = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // ---- turned post profile (radius, height); knob = {y, R} with absolute max radius ----
  function postProfile(h, r, knobs = [], ringEvery = 0.2) {
    const pts = [];
    const add = (rr, y) => pts.push(V2(rr, y));
    add(0.001, 0);
    add(r * 1.9, 0); add(r * 1.9, 0.04); add(r * 1.25, 0.08); add(r, 0.11);
    const ring = (y, k = 1.35) => { add(r, y - 0.013); add(r * k, y - 0.006); add(r * k, y + 0.006); add(r, y + 0.013); };
    const knob = (y, R) => { add(r, y - 0.05); add(R * 0.75, y - 0.03); add(R, y); add(R * 0.75, y + 0.03); add(r, y + 0.05); };
    for (let y = 0.3; y < h - 0.2; y += ringEvery) ring(y);
    knobs.forEach((k) => knob(k.y, k.R));
    add(r, h - 0.1); add(r * 1.5, h - 0.07); add(r, h - 0.04); add(0.001, h);
    pts.sort((a, b) => a.y - b.y);
    for (let i = 1; i < pts.length; i++) if (pts[i].y <= pts[i - 1].y) pts[i].y = pts[i - 1].y + 1e-4;
    return pts;
  }

  // slender outer posts with a small node + thin inner posts (behind the sitter)
  for (const s of [-1, 1]) {
    const thick = new THREE.LatheGeometry(postProfile(2.3, 0.012, [{ y: 1.22, R: 0.026 }, { y: 0.8, R: 0.02 }, { y: 1.62, R: 0.02 }]), 16);
    M(thick, gold(), s * 0.415, 0, -0.42);
    const thin = new THREE.LatheGeometry(postProfile(2.3, 0.008, [], 0.3), 10);
    M(thin, goldDark(), s * 0.368, 0, -0.42);
  }
  M(new THREE.CylinderGeometry(0.012, 0.012, 0.84, 10), gold(), 0, 0.62, -0.42).rotation.z = Math.PI / 2;

  // ---- red velvet back panel with draped vertical folds ----
  {
    const w = 0.72, h = 2.3, nx = 36, ny = 40;
    const pos = [], col = [], idx = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny;
      const x = (u - 0.5) * w, y = 0.45 + v * h;
      const fold = Math.sin(x * 38 + Math.sin(y * 1.7) * 2.5) * 0.012 + (util.fbm(x * 6, y * 2.2, 3.1) - 0.5) * 0.05;
      pos.push(x, y, -0.45 + fold);
      // darker at the bottom and in the folds, warm glow near top-right
      const b = 0.62 + 0.38 * Math.min(1, v * 1.6) + fold * 6;
      col.push(0.85 * b, 0.22 * b * b, 0.28 * b * b);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = style.toon(0x9a1428, { role: 'velvet' });
    mat.side = THREE.DoubleSide;
    try { mat.vertexColors = true; } catch (e) { /* ignore */ }
    M(geo, mat);
  }

  // ---- seat: one dark crimson block + soft pillow (no stepped dais) ----
  M(new THREE.BoxGeometry(0.7, 0.42, 0.8), style.toon(0x3a0813, { role: 'velvet' }), 0, 0.22, -0.02);
  // pleated velvet drape hanging from the seat front, deep shadow toward the floor
  {
    const nx = 44, ny = 14, pos = [], col = [], idx = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny, x = (u - 0.5) * 0.78, y = 0.46 - v * 0.44;
      const pleat = Math.sin(x * 46 + Math.sin(y * 9) * 1.2) * (0.012 + 0.03 * v) + (util.fbm(x * 5, y * 4, 7.7) - 0.5) * 0.04;
      const z = 0.43 + pleat + v * v * 0.07;
      const edge = Math.min(u, 1 - u);
      const zz = edge < 0.03 ? z - (0.03 - edge) * 2.5 : z;
      pos.push(x, y, zz);
      const b = (0.95 - 0.55 * v) * (0.85 + pleat * 6);
      col.push(0.75 * b, 0.16 * b, 0.22 * b);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const dm = style.toon(0x7a1222, { role: 'velvet' });
    dm.side = THREE.DoubleSide;
    try { dm.vertexColors = true; } catch (e) { /* ignore */ }
    M(geo, dm);
  }
  const pillow = M(new THREE.SphereGeometry(0.4, 24, 12), style.toon(0x701020, { role: 'velvet' }), 0, 0.43, -0.02);
  pillow.scale.set(0.93, 0.13, 1.1);

  // ---- ornate armrests: chunky grooved gold blocks ----
  for (const s of [-1, 1]) {
    const x = s * 0.345;
    // stacked, grooved block running front-to-back
    const bands = [[0.58, 0.088, 0.09, gold()], [0.6, 0.098, 0.07, goldDark()], [0.62, 0.088, 0.09, gold()], [0.64, 0.096, 0.07, goldDark()]];
    for (const [y, w, hh, m] of bands) {
      const b = M(new THREE.BoxGeometry(w, 0.02, 0.64), m, x, y, 0.0);
      b.scale.y = 1;
    }
    // carved scroll ends: horizontal cylinders across the front and back
    for (const z of [0.33, -0.33]) {
      const c = M(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 18), gold(), x, 0.615, z);
      c.rotation.z = Math.PI / 2;
      M(new THREE.SphereGeometry(0.044, 14, 10), goldDark(), x + s * 0.052, 0.615, z).scale.set(0.5, 1, 1);
      M(new THREE.SphereGeometry(0.044, 14, 10), goldDark(), x - s * 0.052, 0.615, z).scale.set(0.5, 1, 1);
    }
    // turned front/back support posts
    M(new THREE.LatheGeometry(postProfile(0.57, 0.024, [{ y: 0.3, R: 0.044 }], 0.15), 14), gold(), x, 0.0, 0.32);
    M(new THREE.LatheGeometry(postProfile(0.57, 0.02, [{ y: 0.3, R: 0.036 }], 0.15), 12), goldDark(), x, 0.0, -0.32);
  }

  // ---- cream brick wall ----
  {
    const wallMat = style.toon(0xfbf1da, { role: 'throne' });
    const wall = M(new THREE.PlaneGeometry(4.2, 3.6), wallMat, 0, 1.0, -0.95);
    wall.name = 'wall';
    const pos = [], idx = [];
    const quad = (x0, y0, x1, y1) => {
      const n = pos.length / 3;
      pos.push(x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0);
      idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    };
    const bh = 0.16, bw = 0.36, lw = 0.006;
    let row = 0;
    for (let y = -0.8; y < 2.8; y += bh, row++) {
      quad(-2.1, y - lw, 2.1, y + lw);
      const off = (row % 2) * bw * 0.5;
      for (let x = -2.1 + off; x < 2.1; x += bw) quad(x - lw, y, x + lw, y + bh);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const lines = M(geo, style.toon(0xe2d0ad, { role: 'throne' }), 0, 0.0, -0.945);
    lines.position.y = 0.0;
  }

  return g;
}

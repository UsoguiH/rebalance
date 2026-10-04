// Builder A: gold throne, red velvet backing, cream brick wall.
export function buildThrone(THREE, style, util) {
  const g = new THREE.Group();
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const gold = () => style.toon(0xe0a41a, { role: 'gold' });
  const goldDark = () => style.toon(0xb57a10, { role: 'gold' });
  const M = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // ---- turned post profile (radius, height) ----
  function postProfile(h, r, knobAt = []) {
    const pts = [V2(0.001, 0)];
    const add = (rr, y) => pts.push(V2(rr, y));
    // base
    add(r * 1.7, 0); add(r * 1.7, 0.05); add(r * 1.2, 0.09); add(r, 0.12);
    const bead = (y, rr) => {
      add(r * 0.85, y - rr * 1.3); add(r * 1.35, y - rr * 0.8); add(r * 1.6 * (rr / 0.03), y);
      add(r * 1.35, y + rr * 0.8); add(r * 0.85, y + rr * 1.3);
    };
    const ring = (y) => { add(r, y - 0.012); add(r * 1.3, y - 0.006); add(r * 1.3, y + 0.006); add(r, y + 0.012); };
    for (let y = 0.3; y < h - 0.2; y += 0.17) ring(y);
    knobAt.forEach((k) => bead(k.y, k.r));
    // finial
    add(r, h - 0.12); add(r * 1.6, h - 0.09); add(r * 1.1, h - 0.05); add(0.001, h);
    pts.sort((a, b) => a.y - b.y);
    // remove duplicate y values by tiny offset
    for (let i = 1; i < pts.length; i++) if (pts[i].y <= pts[i - 1].y) pts[i].y = pts[i - 1].y + 1e-4;
    return pts;
  }

  // thick outer posts + thin inner posts (behind the sitter)
  for (const s of [-1, 1]) {
    const thick = new THREE.LatheGeometry(postProfile(2.3, 0.032, [{ y: 1.22, r: 0.06 }, { y: 0.82, r: 0.032 }, { y: 1.62, r: 0.032 }]), 20);
    M(thick, gold(), s * 0.415, 0, -0.42);
    const thin = new THREE.LatheGeometry(postProfile(2.3, 0.014, []), 12);
    M(thin, goldDark(), s * 0.365, 0, -0.42);
  }
  // gold cross rail at the back of the seat
  M(new THREE.CylinderGeometry(0.018, 0.018, 0.84, 12), gold(), 0, 0.62, -0.42).rotation.z = Math.PI / 2;

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
      col.push(0.9 * b, 0.55 * b * b, 0.6 * b * b);
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

  // ---- seat cushion + skirt ----
  M(new THREE.BoxGeometry(0.76, 0.12, 0.9), style.toon(0x701020, { role: 'velvet' }), 0, 0.39, -0.02);
  M(new THREE.BoxGeometry(0.8, 0.4, 0.94), style.toon(0x4a0a16, { role: 'velvet' }), 0, 0.2, -0.02);
  

  // ---- ornate armrests ----
  for (const s of [-1, 1]) {
    const x = s * 0.345;
    // top rail (flattened capsule along z)
    const rail = M(new THREE.CapsuleGeometry(0.036, 0.62, 8, 16), gold(), x, 0.615, 0.0);
    rail.rotation.x = Math.PI / 2;
    rail.scale.set(1.15, 1, 0.8);
    // front scroll: big round pommel + ring
    M(new THREE.SphereGeometry(0.048, 20, 14), gold(), x, 0.6, 0.345).scale.set(1.15, 0.9, 1);
    
    // front support posts (turned)
    const fp = new THREE.LatheGeometry(postProfile(0.56, 0.026, [{ y: 0.3, r: 0.04 }]), 16);
    M(fp, gold(), x, 0.0, 0.32);
    const rp = new THREE.LatheGeometry(postProfile(0.56, 0.022, [{ y: 0.3, r: 0.034 }]), 14);
    M(rp, goldDark(), x, 0.0, -0.32);
    // side apron panel
    M(new THREE.BoxGeometry(0.02, 0.1, 0.62), gold(), x + s * 0.02, 0.5, 0);
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

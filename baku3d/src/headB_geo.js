// Builder B helper: analytic face height-field + decal/ribbon builders.
// FACE SPACE: origin at the eye-line centre, +x = viewer's right, +y up, +z toward camera. Units metres.

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function curve(ks, vs) {
  const n = ks.length;
  const m = vs.map((v, i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return (vs[b] - vs[a]) / (ks[b] - ks[a]); });
  return y => {
    if (y <= ks[0]) return vs[0];
    if (y >= ks[n - 1]) return vs[n - 1];
    let i = 0; while (y > ks[i + 1]) i++;
    const h = ks[i + 1] - ks[i], t = (y - ks[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

const YK = [-0.109, -0.101, -0.088, -0.064, -0.040, -0.015, 0.012, 0.045, 0.078, 0.106, 0.128, 0.143, 0.152, 0.156];
export const Wf = (() => { const f = curve(YK, [0, 0.015, 0.027, 0.041, 0.056, 0.069, 0.077, 0.075, 0.073, 0.067, 0.054, 0.036, 0.016, 0]); return y => Math.max(0, f(y)); })();
export const ZF = curve(YK, [0.040, 0.047, 0.053, 0.059, 0.067, 0.078, 0.083, 0.082, 0.076, 0.064, 0.047, 0.028, 0.012, -0.006]);
export const ZB = curve(YK, [0.034, 0.008, -0.026, -0.056, -0.078, -0.090, -0.097, -0.099, -0.096, -0.085, -0.066, -0.040, -0.016, -0.006]);
export const YLO = YK[0], YHI = YK[YK.length - 1];
const N = 2.5;

const g = (x, y, cx, cy, sx, sy, A) => { const dx = (x - cx) / sx, dy = (y - cy) / sy; return A * Math.exp(-(dx * dx + dy * dy)); };

// z displacement of the front surface (feature sculpt)
function disp(x, y) {
  const ax = Math.abs(x), sg = x < 0 ? -1 : 1;
  let d = 0;
  // brow ridge (slanted: outer high, inner low on viewer's left; the raised right brow sits higher)
  d += g(ax, y, 0.034, 0.026, 0.028, 0.0075, 0.0085);
  d += g(x, y, 0, 0.020, 0.014, 0.012, 0.004);
  // eye sockets
  d += g(x, y, -0.034, 0.002, 0.021, 0.0095, -0.0075);
  d += g(x, y, 0.033, -0.004, 0.019, 0.010, -0.0065);
  // heavy upper lid shelf & under-eye
  d += g(x, y, -0.033, 0.010, 0.016, 0.004, 0.003);
  d += g(ax, y, 0.052, -0.022, 0.018, 0.010, 0.0095);          // cheekbones (sharp)
  d += g(ax, y, 0.064, -0.016, 0.010, 0.016, 0.004);
  // nose
  d += g(x, y, 0, 0.004, 0.0066, 0.024, 0.0150);               // bridge
  d += g(x, y, 0, -0.016, 0.006, 0.014, 0.0045);
  d += g(x, y, 0, -0.038, 0.0082, 0.0070, 0.0300);             // tip
  d += g(ax, y, 0.0125, -0.0420, 0.0050, 0.0055, 0.0115);      // alae
  d += g(x, y, 0, -0.0505, 0.0105, 0.0035, -0.0055);           // under nose
  // lips / chin
  d += g(x, y, 0, -0.0625, 0.019, 0.0050, 0.0040);
  d += g(x, y, 0, -0.0745, 0.016, 0.0042, 0.0042);
  d += g(x, y, 0, -0.0860, 0.016, 0.0040, -0.0040);
  d += g(x, y, 0, -0.0990, 0.013, 0.0095, 0.0075);
  d += g(ax, y, 0.030, -0.067, 0.010, 0.009, -0.0020);
  // cheek hollows & nasolabial
  d += g(ax, y, 0.050, -0.050, 0.016, 0.020, -0.0125);
  d += g(ax, y, 0.026, -0.052, 0.005, 0.016, -0.0030);
  // jaw angle & masseter edge
  d += g(ax, y, 0.062, -0.045, 0.006, 0.020, 0.0030);
  // temples
  d += g(ax, y, 0.066, 0.035, 0.012, 0.020, -0.0040);
  // forehead flatten/bump slightly under hairline
  d += g(x, y, 0, 0.072, 0.050, 0.018, 0.0030);
  return d;
}

export function makeField(THREE) {
  const zm = y => (ZF(y) + ZB(y)) / 2, dh = y => (ZF(y) - ZB(y)) / 2;
  function z(x, y) {
    const W = Wf(y);
    const r = Math.min(1, Math.abs(x) / Math.max(W, 1e-6));
    const f = Math.pow(Math.max(0, 1 - Math.pow(r, N)), 1 / N);
    const wgt = sm(0.05, 0.5, f);
    return zm(y) + dh(y) * f + disp(x, y) * wgt;
  }
  const E = 0.0005;
  function normal(x, y, out) {
    const nx = -(z(x + E, y) - z(x - E, y)) / (2 * E), ny = -(z(x, y + E) - z(x, y - E)) / (2 * E);
    return (out || new THREE.Vector3()).set(nx, ny, 1).normalize();
  }
  const _n = new THREE.Vector3();
  function P(x, y, off = 0, out) {
    normal(x, y, _n);
    return (out || new THREE.Vector3()).set(x + _n.x * off, y + _n.y * off, z(x, y) + _n.z * off);
  }
  // full-head loft geometry (skull + face + jaw)
  function skullGeometry(nth = 168, ny = 160) {
    const pos = [], idx = [];
    for (let j = 0; j <= ny; j++) {
      const y = YLO + (YHI - YLO) * (j / ny);
      const W = Wf(y), zmid = zm(y), d = dh(y);
      for (let i = 0; i < nth; i++) {
        const th = (i / nth) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const x = W * Math.sign(c) * Math.pow(Math.abs(c), 2 / N);
        const sp = Math.sign(s) * Math.pow(Math.abs(s), 2 / N);
        let zz = zmid + d * sp;
        if (s > 0) {
          const f = Math.max(0, sp);
          zz += disp(x, y) * sm(0.05, 0.5, f);
        }
        pos.push(x, y, zz);
      }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nth; i++) {
      const a = j * nth + i, b = j * nth + (i + 1) % nth, c = (j + 1) * nth + i, e = (j + 1) * nth + (i + 1) % nth;
      idx.push(a, c, b, b, c, e);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  return { z, normal, P, skullGeometry, Wf, ZF, ZB, zm, dh, disp };
}

// ribbon lying on the face surface; pts = [[x,y],...], w = width (number or fn(t)), off = normal offset
export function ribbon(THREE, field, pts, w, off = 0.0006, opts = {}) {
  const n = pts.length, pos = [], nor = [], idx = [];
  const wf = typeof w === 'function' ? w : () => w;
  const tmp = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const hw = wf(i / (n - 1)) / 2, px = -ty * hw, py = tx * hw;
    for (const sgn of [1, -1]) {
      field.P(pts[i][0] + sgn * px, pts[i][1] + sgn * py, off, tmp);
      pos.push(tmp.x, tmp.y, tmp.z);
      field.normal(pts[i][0] + sgn * px, pts[i][1] + sgn * py, nn);
      nor.push(nn.x, nn.y, nn.z);
    }
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

// filled star-shaped polygon draped on the surface
export function fill(THREE, field, poly, off = 0.0006, K = 4) {
  let cx = 0, cy = 0; for (const p of poly) { cx += p[0]; cy += p[1]; } cx /= poly.length; cy /= poly.length;
  const n = poly.length, pos = [], nor = [], idx = [];
  const tmp = new THREE.Vector3(), nn = new THREE.Vector3();
  const add = (x, y) => { field.P(x, y, off, tmp); pos.push(tmp.x, tmp.y, tmp.z); field.normal(x, y, nn); nor.push(nn.x, nn.y, nn.z); };
  add(cx, cy);
  for (let k = 1; k <= K; k++) for (let i = 0; i < n; i++) add(cx + (poly[i][0] - cx) * k / K, cy + (poly[i][1] - cy) * k / K);
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + (i + 1) % n);
  for (let k = 1; k < K; k++) for (let i = 0; i < n; i++) {
    const a = 1 + (k - 1) * n + i, b = 1 + (k - 1) * n + (i + 1) % n, c = 1 + k * n + i, d = 1 + k * n + (i + 1) % n;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

// Sutherland-Hodgman: clip subject polygon by convex CCW clip polygon
export function clipPoly(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inp = out; out = [];
    const side = p => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    if (!out.length) break;
  }
  return out;
}

export function mergeGeos(THREE, geos) {
  let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    P.set(g.attributes.position.array, ov * 3); Nn.set(g.attributes.normal.array, ov * 3);
    for (let i = 0; i < g.index.count; i++) I[oi + i] = g.index.array[i] + ov;
    ov += g.attributes.position.count; oi += g.index.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  return geo;
}

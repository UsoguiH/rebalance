/* Face lock: the AI may only change the hair (and the beard area when a beard was picked).
   Everything else (eyes, nose, mouth, skin, ears, clothes, background) is put back from the
   customer's own photo, pixel for pixel.

   1. Find face landmarks in the original and in the AI picture.
   2. Line the AI picture up with the original (a similarity transform from the eyes and nose).
      If the AI moved, turned or reshaped the head too much, refuse: the caller redraws.
   3. Build the "allowed to change" mask: hair in either picture (so new hair can appear and
      old hair can go), the scalp above the forehead, and the beard area if asked for; minus
      the locked part of the face.
   4. Original everywhere, the AI picture only inside the soft-edged mask. */
(function () {
  const W = 960, H = 1280;
  const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const BROWS = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];
  const ALIGN = [33, 133, 362, 263, 168, 6, 197, 195, 5, 4, 1, 98, 327];
  const SHAPE = [33, 133, 159, 145, 362, 263, 386, 374, 1, 4, 5, 6, 168, 98, 327, 61, 291];
  const LIMITS = { scale: [0.85, 1.18], angle: 10, drift: 0.12 };

  function canvas(w = W, h = H) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function load(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
  async function toCanvas(src) {
    const img = typeof src === "string" ? await load(src) : src;
    const c = canvas(), s = Math.max(W / img.width, H / img.height);
    c.getContext("2d").drawImage(img, (W - img.width * s) / 2, (H - img.height * s) * 0.3, img.width * s, img.height * s);
    return c;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Least-squares similarity transform mapping points a onto points b.
  function similarity(a, b) {
    const n = a.length;
    let ax = 0, ay = 0, bx = 0, by = 0;
    for (let i = 0; i < n; i++) { ax += a[i].x; ay += a[i].y; bx += b[i].x; by += b[i].y; }
    ax /= n; ay /= n; bx /= n; by /= n;
    let p = 0, q = 0, ss = 0;
    for (let i = 0; i < n; i++) {
      const x = a[i].x - ax, y = a[i].y - ay, u = b[i].x - bx, v = b[i].y - by;
      p += x * u + y * v; q += x * v - y * u; ss += x * x + y * y;
    }
    const c = p / ss, s = q / ss;
    return { c, s, tx: bx - (c * ax - s * ay), ty: by - (s * ax + c * ay), scale: Math.hypot(c, s), angle: Math.atan2(s, c) * 180 / Math.PI };
  }
  const apply = (t, p) => ({ x: t.c * p.x - t.s * p.y + t.tx, y: t.s * p.x + t.c * p.y + t.ty });

  function path(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); }
  function scaled(pts, k, kx = k) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return pts.map((p) => ({ x: cx + (p.x - cx) * kx, y: cy + (p.y - cy) * k }));
  }
  // Soft edges: shrink and grow back with smoothing.
  function feather(src, px) {
    const k = Math.max(1, px);
    const small = canvas(Math.max(8, Math.round(W / k)), Math.max(8, Math.round(H / k)));
    const s = small.getContext("2d");
    s.imageSmoothingQuality = "high";
    s.drawImage(src, 0, 0, small.width, small.height);
    const out = canvas(), o = out.getContext("2d");
    o.imageSmoothingQuality = "high";
    o.drawImage(small, 0, 0, W, H);
    return out;
  }
  // Grows a mask by d pixels in every direction.
  function dilate(src, d) {
    const out = canvas(), g = out.getContext("2d");
    for (let a = 0; a < 16; a++) g.drawImage(src, Math.cos(a * Math.PI / 8) * d, Math.sin(a * Math.PI / 8) * d);
    g.drawImage(src, 0, 0);
    return out;
  }

  // Face measurements the masks are built from.
  function regions(L) {
    const oval = OVAL.map((i) => L[i]);
    const browY = Math.min(...BROWS.map((i) => L[i].y));
    const chin = L[152], top = L[10];
    return { oval, browY, chin, top, faceH: chin.y - top.y, faceW: dist(L[234], L[454]), noseBase: L[2].y, cx: (L[234].x + L[454].x) / 2 };
  }

  // White where the AI may change the picture, soft-edged.
  function buildMask(F, L, { hairO, hairR, hair, beard, beardLength }) {
    const { oval, browY, chin, top, faceH, faceW, noseBase, cx } = F;
    const mask = canvas(), g = mask.getContext("2d");
    g.fillStyle = "#fff";

    if (hair) {
      // Hair in either picture, grown a little so no stray old strands are left at the edge.
      const both = canvas(), b = both.getContext("2d");
      b.drawImage(hairO, 0, 0); b.drawImage(hairR, 0, 0);
      g.drawImage(dilate(both, W * 0.012), 0, 0);
      // The scalp above the hairline, so very short cuts on bald heads still show.
      g.beginPath();
      g.ellipse(cx, top.y, faceW * 0.62, faceH * 0.5, 0, Math.PI, 2 * Math.PI);
      g.fill();
      if (!beard) { // the customer's own beard stays, even if the hair model calls it hair
        g.globalCompositeOperation = "destination-out";
        path(g, scaled(oval.filter((p) => p.y > noseBase - faceH * 0.04), 1.05, 1.12)); g.fill();
        g.beginPath(); g.ellipse(cx, chin.y, faceW * 0.5, faceH * 0.6, 0, 0, Math.PI); g.fill();
        g.globalCompositeOperation = "source-over";
      }
    }
    if (beard) {
      // Cheeks from the cheekbones down, around the jaw, and room below the chin for the beard's length.
      const cheekY = (L[1].y + L[168].y) / 2;
      path(g, scaled(oval.filter((p) => p.y > cheekY), 1.04, 1.08)); g.fill();
      // Sideburns up to the top of the ears.
      for (const [a, b] of [[127, 234], [356, 454]]) {
        g.beginPath();
        g.ellipse((L[a].x + L[b].x) / 2, (L[a].y + L[b].y) / 2 + faceH * 0.1, faceW * 0.05, faceH * 0.15, 0, 0, 2 * Math.PI);
        g.fill();
      }
      g.beginPath();
      g.ellipse(cx, chin.y, faceW * 0.42, faceH * beardLength, 0, 0, Math.PI);
      g.fill();
    }

    // Locked, always the original: the face below the brows (hair only), or eyes and nose (beard).
    const lock = canvas(), l = lock.getContext("2d");
    l.fillStyle = "#fff";
    if (beard) {
      l.beginPath();
      l.ellipse(cx, (browY + noseBase) / 2, faceW * 0.4, (noseBase - browY) * 0.58, 0, 0, 2 * Math.PI);
      l.fill();
    } else {
      l.save();
      l.beginPath(); l.rect(0, browY + faceH * 0.01, W, H); l.clip();
      path(l, scaled(oval, 0.97, 0.94)); l.fill();
      l.restore();
    }
    g.globalCompositeOperation = "destination-out";
    g.drawImage(feather(lock, W * 0.012), 0, 0);
    g.globalCompositeOperation = "source-over";
    return feather(mask, W * 0.01);
  }

  // Gives the AI picture the original's colours and brightness, measured where nothing
  // was meant to change, so the new hair blends in without a seam.
  function matchColours(R, O, mask) {
    const w = 96, h = 128, sample = (c) => { const s = canvas(w, h); s.getContext("2d").drawImage(c, 0, 0, w, h); return s.getContext("2d").getImageData(0, 0, w, h).data; };
    const r = sample(R), o = sample(O), m = sample(mask);
    const sum = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; // mean R, mean O, sq R, sq O
    let n = 0;
    for (let i = 0; i < r.length; i += 4) {
      if (m[i + 3] > 40 || r[i + 3] < 250) continue; // only unchanged, covered pixels
      n++;
      for (let c = 0; c < 3; c++) { sum[0][c] += r[i + c]; sum[1][c] += o[i + c]; sum[2][c] += r[i + c] ** 2; sum[3][c] += o[i + c] ** 2; }
    }
    if (n < 200) return R;
    const gain = [], off = [];
    for (let c = 0; c < 3; c++) {
      const mr = sum[0][c] / n, mo = sum[1][c] / n;
      const sr = Math.sqrt(Math.max(1, sum[2][c] / n - mr * mr)), so = Math.sqrt(Math.max(1, sum[3][c] / n - mo * mo));
      gain[c] = Math.min(1.25, Math.max(0.8, so / sr));
      off[c] = mo - gain[c] * mr;
    }
    const g = R.getContext("2d"), img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = gain[c] * d[i + c] + off[c];
    g.putImageData(img, 0, 0);
    return R;
  }

  function coverage(mask) {
    const s = canvas(96, 128), g = s.getContext("2d");
    g.drawImage(mask, 0, 0, 96, 128);
    const d = g.getImageData(0, 0, 96, 128).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) n += d[i] > 127;
    return n / (96 * 128);
  }

  /* original, result: data URLs. Returns { ok, url, reason, metrics }. */
  async function lock({ original, result, hair, beard, beardLength = 0.5 }) {
    const O = await toCanvas(original), Rraw = await toCanvas(result);
    const [fo, fr] = await Promise.all([Vision.faces(O), Vision.faces(Rraw)]);
    if (!fo.length) return { ok: false, reason: "no_face_original" };
    if (!fr.length) return { ok: false, reason: "no_face_result" };
    const Lo = fo[0], Lr = fr[0];

    const t = similarity(ALIGN.map((i) => Lr[i]), ALIGN.map((i) => Lo[i]));
    const iod = dist(Lo[33], Lo[263]);
    const shape = SHAPE.concat(beard ? [] : [152, 172, 397]);
    const drift = shape.reduce((s, i) => s + dist(apply(t, Lr[i]), Lo[i]), 0) / shape.length / iod;
    const metrics = { scale: +t.scale.toFixed(3), angle: +t.angle.toFixed(1), drift: +drift.toFixed(3) };
    if (t.scale < LIMITS.scale[0] || t.scale > LIMITS.scale[1] || Math.abs(t.angle) > LIMITS.angle || drift > LIMITS.drift) {
      return { ok: false, reason: "moved", metrics };
    }

    // The AI picture, lined up with the original.
    const R = canvas(), rg = R.getContext("2d");
    rg.setTransform(t.c, t.s, -t.s, t.c, t.tx, t.ty);
    rg.drawImage(Rraw, 0, 0);
    rg.setTransform(1, 0, 0, 1, 0, 0);

    const [hairO, hairR] = hair ? await Promise.all([Vision.hairMask(O), Vision.hairMask(R)]) : [canvas(), canvas()];
    const mask = buildMask(regions(Lo), Lo, { hairO, hairR, hair, beard, beardLength });
    metrics.changed = +coverage(mask).toFixed(3);
    matchColours(R, O, mask);

    // Original everywhere; the AI picture only where the mask allows.
    const cut = canvas(), cg = cut.getContext("2d");
    cg.drawImage(R, 0, 0);
    cg.globalCompositeOperation = "destination-in";
    cg.drawImage(mask, 0, 0);
    const out = canvas(), og = out.getContext("2d");
    og.drawImage(O, 0, 0);
    og.drawImage(cut, 0, 0);
    return { ok: true, url: out.toDataURL("image/jpeg", 0.92), metrics, mask };
  }

  // Quick local photo check before anything is sent: one face, big enough, looking at the camera.
  async function inspect(photo) {
    const c = await toCanvas(photo);
    const f = await Vision.faces(c);
    if (!f.length) return "no_face";
    if (f.length > 1) return "several_faces";
    const L = f[0];
    const faceW = dist(L[234], L[454]);
    if (faceW / W < 0.2) return "face_too_small";
    const mid = { x: (L[33].x + L[263].x) / 2 };
    if (Math.abs(L[1].x - mid.x) / dist(L[33], L[263]) > 0.38) return "face_turned_away";
    return "none";
  }

  window.FaceLock = { lock, inspect, LIMITS };
})();

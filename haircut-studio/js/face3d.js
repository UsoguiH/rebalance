/* A dot-cloud 3D model of the customer's face. Real landmarks come from
   MediaPipe Face Landmarker (vision.js); if that can't load, an egg-shaped head stands in.
   Drag to spin it; it settles back into a gentle sway on its own. */
(function () {
  function pixels(img) {
    const c = document.createElement("canvas");
    c.width = 160; c.height = Math.round(160 * img.height / img.width);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    return (x, y) => { // x, y in 0..1
      const i = (Math.min(c.height - 1, Math.max(0, y * c.height | 0)) * c.width + Math.min(c.width - 1, Math.max(0, x * c.width | 0))) * 4;
      return (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    };
  }

  // Back and sides of the skull, so the face reads as a whole head.
  function shell(out, rx, ry, rz, cz, n) {
    for (let i = 0; i < n; i++) {
      const u = Math.acos(1 - 2 * (i + 0.5) / n), v = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(u) * Math.cos(v), y = Math.cos(u), z = Math.sin(u) * Math.sin(v);
      if (z < -0.25 && y > -0.55) continue; // front belongs to the face
      if (y < -0.8) continue;
      out.push({ x: x * rx, y: -y * ry - ry * 0.1, z: z * rz + cz, l: 0.25, shell: 1 });
    }
  }

  function fromLandmarks(L, edges, lum, aspect) {
    const P = L.map((p) => ({ x: (p.x - 0.5) * aspect, y: p.y - 0.5, z: p.z * aspect }));
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, cx = 0, cy = 0, cz = 0;
    for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); cx += p.x; cy += p.y; cz += p.z; }
    cx /= P.length; cy /= P.length; cz /= P.length;
    const s = 2 / Math.max(maxX - minX, maxY - minY);
    const pt = (p, q) => ({ x: (p.x - cx) * s, y: (p.y - cy) * s, z: (p.z - cz) * s });
    const out = [];
    const add = (a, b, t) => {
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      out.push({ x, y, z, l: lum((x / s + cx) / aspect + 0.5, y / s + cy + 0.5) });
    };
    const N = P.map((p) => pt(p));
    for (const e of edges) {
      const a = N[e.start], b = N[e.end];
      for (let t = 0; t < 1; t += 0.34) add(a, b, t);
    }
    const w = (maxX - minX) * s, h = (maxY - minY) * s;
    shell(out, w * 0.56, h * 0.62, w * 0.62, w * 0.5, 900);
    return out;
  }

  function fallback(lum) {
    const out = [];
    for (let i = 0; i < 4200; i++) {
      const u = Math.acos(1 - 2 * (i + 0.5) / 4200), v = Math.PI * (1 + Math.sqrt(5)) * i;
      let x = Math.sin(u) * Math.cos(v), y = Math.cos(u), z = Math.sin(u) * Math.sin(v);
      if (z > 0.1) continue;
      const nose = Math.exp(-((x * x) / 0.012 + ((y + 0.05) ** 2) / 0.09)) * 0.25;
      x *= 0.78; y *= 1.0; z = z * 0.8 - nose;
      out.push({ x, y: -y, z, l: lum(0.5 + x * 0.42, 0.45 - y * 0.42) });
    }
    shell(out, 0.78, 1.0, 0.8, 0, 700);
    return out;
  }

  function create(canvas) {
    const g = canvas.getContext("2d");
    let pts = [], born = 0, raf = 0, running = false;
    let yaw = 0, pitch = 0, vy = 0, vp = 0, dragging = false, lastX = 0, lastY = 0, idleAt = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setPoints(list) {
      for (const p of list) {
        const r = 2.4 + Math.random() * 2.5, a = Math.random() * 6.283, b = Math.random() * 3.1416;
        p.sx = Math.sin(b) * Math.cos(a) * r; p.sy = Math.cos(b) * r; p.sz = Math.sin(b) * Math.sin(a) * r;
        p.d = (p.y + 1) * 0.25 + Math.random() * 0.25;
      }
      pts = list; born = performance.now();
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dpr = Math.min(2, devicePixelRatio || 1);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      const t = now / 1000;
      if (!dragging) {
        vy *= 0.94; vp *= 0.9;
        yaw += vy; pitch += vp;
        if (now - idleAt > 1400) { // drift back to a slow sway
          const target = reduce ? 0 : Math.sin(t * 0.6) * 0.55;
          yaw += (target - yaw) * 0.025;
        }
        pitch += (0 - pitch) * 0.06;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const S = Math.min(W * 0.5, H * 0.5) * 0.78, f = 3.2;
      const scanY = ((t * 0.45) % 1.6) - 0.8; // sweeps top to bottom
      const age = (now - born) / 1700;
      const hot = [];

      for (const p of pts) {
        let k = reduce ? 1 : Math.min(1, Math.max(0, (age - p.d) / 0.6));
        k = 1 - Math.pow(1 - k, 3);
        const X = p.sx + (p.x - p.sx) * k, Y = p.sy + (p.y - p.sy) * k, Z = p.sz + (p.z - p.sz) * k;
        const x1 = X * cy - Z * sy, z1 = X * sy + Z * cy;
        const y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
        const q = f / (f + z2);
        const px = W / 2 + x1 * S * q, py = H / 2 + y2 * S * q;
        const front = Math.max(0, Math.min(1, 0.6 - z2 * 0.7));
        let a = (p.shell ? 0.2 : 0.22 + p.l * 0.75) * (0.25 + front * 0.75) * (0.3 + k * 0.7);
        const r = (p.shell ? 0.9 : 1.05 + p.l * 0.6) * q;
        if (!p.shell && Math.abs(Y - scanY) < 0.035) { hot.push(px, py, r); continue; }
        g.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
        g.fillRect(px - r, py - r, r * 2, r * 2);
      }
      g.fillStyle = "#ff4a1c";
      for (let i = 0; i < hot.length; i += 3) {
        const r = hot[i + 2] * 1.5;
        g.fillRect(hot[i] - r, hot[i + 1] - r, r * 2, r * 2);
      }
    }

    function down(e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.parentElement.classList.add("touched");
    }
    function move(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      vy = dx * 0.012; vp = dy * 0.008;
      yaw += vy; pitch = Math.max(-0.6, Math.min(0.6, pitch + vp));
      if (Math.abs(dx) > 6 && navigator.vibrate) navigator.vibrate(2);
    }
    function up() { dragging = false; idleAt = performance.now(); }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    let job = 0;
    return {
      // Shows the stand-in head at once, then swaps in the real face when found.
      async load(img) {
        const id = ++job;
        const lum = pixels(img);
        setPoints(fallback(lum));
        try {
          const { lm, edges } = await Promise.race([
            Vision.landmarker(), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 15000)),
          ]);
          const r = lm.detect(img);
          const L = r.faceLandmarks && r.faceLandmarks[0];
          if (L && id === job) setPoints(fromLandmarks(L, edges, lum, img.width / img.height));
        } catch (e) { /* keep the stand-in */ }
      },
      start() { if (!running) { running = true; idleAt = 0; born = performance.now(); raf = requestAnimationFrame(frame); } },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }

  window.Face3D = { create };
})();

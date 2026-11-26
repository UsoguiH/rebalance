// Loader: full-screen loading screen shown while the game's scripts and fonts load.
// A little pointer flits around a navy screen; once the game has booted it dives
// off the left edge and swoops back across, dragging a fan of patterned ribbons
// whose middle opens up and wipes the screen away to reveal the game.
// Self-contained (runs before core.js), drawn on its own canvas.
(function () {
  const root = document.getElementById('loader');
  if (!root) return;
  const cv = root.querySelector('canvas');
  const c = cv.getContext('2d');

  const NAVY = '#0d324f';
  const CURSOR_COLORS = ['#3ddc6a', '#c58cf5', '#35a7ff', '#ff6a2b'];
  const SPARK_COLORS = ['#ff5a1f', '#35a7ff', '#c58cf5', '#ff5a1f', '#35a7ff'];
  const MIN_IDLE = 0.9; // seconds the idle cursor shows before the exit, even if the game is ready
  const MAX_WAIT = 9; // never hold the game behind the loader longer than this
  const DIVE = 0.28; // cursor dashes to the left edge
  const SWEEP = 0.95; // ribbon wipe
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, u = 1, dpr = 1;
  let pats = null;

  // ---------- sizing + pattern tiles ----------
  function tile(w, h, draw) {
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(w * dpr));
    t.height = Math.max(1, Math.round(h * dpr));
    const g = t.getContext('2d');
    g.scale(dpr, dpr);
    draw(g, w, h);
    return t;
  }
  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else g.rect(x, y, w, h);
    g.fill();
  }
  function makePatterns() {
    const s = u;
    // bricks: rounded orange bars on rust
    const brick = tile(112 * s, 40 * s, (g, w, h) => {
      g.fillStyle = '#7d2e14';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ff5a1f';
      const bh = 14 * s, r = 5 * s;
      rrect(g, 6 * s, 3 * s, 88 * s, bh, r);
      rrect(g, -50 * s, 23 * s, 88 * s, bh, r);
      rrect(g, 62 * s, 23 * s, 88 * s, bh, r);
    });
    // green with a dot grid
    const dots = tile(16 * s, 16 * s, (g, w, h) => {
      g.fillStyle = '#0e6a35';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2fc964';
      g.beginPath();
      g.arc(w / 2, h / 2, 1.6 * s, 0, Math.PI * 2);
      g.fill();
    });
    // blue graph paper with fat purple diagonal stripes
    const grid = tile(96 * s, 96 * s, (g, w, h) => {
      g.fillStyle = '#2b97f2';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#9a3db0';
      for (const o of [-w, 0, w]) {
        g.beginPath();
        g.moveTo(o, 0);
        g.lineTo(o + 40 * s, 0);
        g.lineTo(o + 40 * s + w, h);
        g.lineTo(o + w, h);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = '#1d4fe0';
      g.lineWidth = Math.max(1, 1.1 * s);
      g.beginPath();
      for (let i = 0; i <= 3; i++) {
        const p = (i * w) / 3;
        g.moveTo(p, 0);
        g.lineTo(p, h);
        g.moveTo(0, p);
        g.lineTo(w, p);
      }
      g.stroke();
    });
    pats = {};
    for (const [k, t] of Object.entries({ brick, dots, grid })) pats[k] = c.createPattern(t, 'repeat');
  }
  function placePattern(p, ox, oy) {
    if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().translate(ox, oy).scale(1 / dpr));
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    u = Math.max(0.6, Math.min(W / 960, H / 540));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    makePatterns();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- easing ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // ---------- the pointer ----------
  // classic arrow cursor, tip at (0,0) pointing up-left; drawn at size `sz`
  const ARROW = [[0, 0], [0, 17], [4.2, 13.2], [7, 19.4], [9.6, 18.2], [6.9, 12.2], [12.4, 12.2]];
  function drawPointer(x, y, rot, color, sz) {
    const k = sz / 19.4;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(k, k);
    c.beginPath();
    ARROW.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.lineJoin = 'round';
    c.lineWidth = 2.4;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  // idle: hop between random spots like a paper plane, turning to face where it goes
  const idle = { from: null, to: null, t: 0, dur: 0.45, rot: 0, color: 0 };
  function pickSpot() {
    return { x: W * (0.25 + Math.random() * 0.5), y: H * (0.25 + Math.random() * 0.5) };
  }
  idle.from = { x: W * 0.5, y: H * 0.55 };
  idle.to = pickSpot();
  // the arrow's natural heading (tip direction) is up-left, i.e. -135deg from +x
  const ARROW_HEADING = Math.atan2(-1, -0.62);
  function headingTo(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) - ARROW_HEADING;
  }
  idle.rot = headingTo(idle.from, idle.to);
  function idlePos() {
    const e = easeInOut(clamp(idle.t / idle.dur, 0, 1));
    return { x: lerp(idle.from.x, idle.to.x, e), y: lerp(idle.from.y, idle.to.y, e) };
  }
  function updateIdle(dt) {
    idle.t += dt;
    if (idle.t >= idle.dur + 0.08) {
      idle.from = idle.to;
      idle.to = pickSpot();
      idle.t = 0;
      idle.dur = 0.35 + Math.random() * 0.2;
      idle.color = (idle.color + 1) % CURSOR_COLORS.length;
    }
    const target = headingTo(idle.from, idle.to);
    let d = target - idle.rot;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    idle.rot += d * Math.min(1, dt * 14);
  }

  // ---------- ribbon geometry ----------
  // For a point `d` px behind the tip, how far the hole has opened and how thick the bands are.
  function tipAt(p) {
    const e = Math.pow(p, 1.25);
    return { x: lerp(-0.04 * W, 2.3 * W, e), y: H * (0.47 - 0.03 * Math.sin(p * Math.PI)) };
  }
  function fan(p) {
    const tip = tipAt(p);
    const spread = 1 + 2.4 * Math.pow(Math.max(0, p - 0.3) / 0.7, 2);
    const ref = Math.max(W, 600);
    const pts = [];
    const step = Math.max(5, W / 180);
    for (let x = Math.min(tip.x, W + 40); x >= -40; x -= step) {
      const d = Math.max(0, tip.x - x);
      const n = d / ref;
      // swallow-tail: the hole opens slowly at the tip, then fast
      const open = spread * ref * (0.08 * n + 0.46 * n * n);
      const grow = 1 - Math.exp(-d / (0.11 * ref));
      // the whole ribbon ripples as it flies, so it bends like cloth instead of a wedge
      const wave = H * 0.07 * grow * Math.sin(n * 4.2 - p * 3.4);
      const y = tip.y + wave;
      const u0 = y - open,
        l0 = y + open * 0.9;
      const u1 = u0 - 24 * u * grow,
        l1 = l0 + 24 * u * grow;
      const u2 = u1 - 92 * u * grow,
        l2 = l1 + 150 * u * grow;
      pts.push({ x, u0, u1, u2, l0, l1, l2 });
    }
    // close the fan exactly at the tip if it is on screen
    if (tip.x <= W + 40) pts.unshift({ x: tip.x, u0: tip.y, u1: tip.y, u2: tip.y, l0: tip.y, l1: tip.y, l2: tip.y });
    return { tip, pts };
  }
  // fill the band between edge `a` and edge `b`
  function band(pts, a, b, style) {
    if (pts.length < 2) return;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0][a]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i][a]);
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i].x, pts[i][b]);
    c.closePath();
    c.fillStyle = style;
    c.fill();
  }

  // ---------- sparkles ----------
  const sparks = [];
  function spawnSpark(pts, tip) {
    if (pts.length < 4) return;
    const i = 2 + Math.floor(Math.random() * Math.min(pts.length - 2, 40));
    const q = pts[i];
    const upper = Math.random() < 0.5;
    const y = upper ? lerp(q.u2, q.u0, Math.random()) : lerp(q.l0, q.l2, Math.random() * 0.7);
    if (y < -20 || y > H + 20 || q.x < 0) return;
    sparks.push({
      x: q.x,
      y,
      vx: (Math.random() - 0.3) * 60 * u,
      vy: (upper ? -1 : 1) * (20 + Math.random() * 50) * u,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 6,
      size: (5 + Math.random() * 7) * u,
      life: 0,
      max: 0.7 + Math.random() * 0.6,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    });
  }
  function drawSpark(s) {
    const k = s.life / s.max;
    const sc = k < 0.2 ? easeOut(k / 0.2) : 1 - Math.pow((k - 0.2) / 0.8, 2);
    const r = s.size * sc,
      w = r * 0.28;
    c.save();
    c.translate(s.x, s.y);
    c.rotate(s.rot);
    c.fillStyle = s.color;
    c.beginPath();
    // four tapered arms
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const cb = Math.cos(ang + Math.PI / 4), sb = Math.sin(ang + Math.PI / 4);
      if (a === 0) c.moveTo(ca * r, sa * r);
      else c.lineTo(ca * r, sa * r);
      c.lineTo(cb * w, sb * w);
    }
    c.closePath();
    c.fill();
    c.restore();
  }

  // ---------- main loop ----------
  let phase = 'idle'; // idle -> dive -> sweep -> done
  let t = 0, pt = 0, last = 0, spawnT = 0, fade = 1;
  let diveFrom = null;
  const ready = () => (window.G && window.G.started) || t > MAX_WAIT;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    pt += dt;

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    if (reduce) {
      // no motion: hold, then fade out
      if (ready() && t > 0.3) fade -= dt * 3;
      root.style.opacity = String(Math.max(0, fade));
      c.fillStyle = NAVY;
      c.fillRect(0, 0, W, H);
      if (fade <= 0) return finish();
      return requestAnimationFrame(frame);
    }

    if (phase === 'idle') {
      updateIdle(dt);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, W, H);
      const p = idlePos();
      drawPointer(p.x, p.y, idle.rot, CURSOR_COLORS[idle.color], 30 * u);
      if (t > MIN_IDLE && ready() && idle.t > idle.dur) {
        phase = 'dive';
        pt = 0;
        diveFrom = { x: p.x, y: p.y, rot: idle.rot };
      }
    } else if (phase === 'dive') {
      c.fillStyle = NAVY;
      c.fillRect(0, 0, W, H);
      const e = easeInOut(clamp(pt / DIVE, 0, 1));
      const start = tipAt(0);
      const x = lerp(diveFrom.x, -40 * u, e),
        y = lerp(diveFrom.y, start.y, e);
      const rot = lerp(diveFrom.rot, headingTo({ x: 1, y: 0 }, { x: 0, y: 0.1 }), Math.min(1, e * 1.5));
      drawPointer(x, y, rot, CURSOR_COLORS[1], 30 * u);
      if (pt >= DIVE) {
        phase = 'sweep';
        pt = 0;
      }
    } else if (phase === 'sweep') {
      const p = clamp(pt / SWEEP, 0, 1);
      const { tip, pts } = fan(p);
      // navy everywhere, then punch out the hole so the game shows through
      c.fillStyle = NAVY;
      c.fillRect(0, 0, W, H);
      if (pts.length > 1) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        band(pts, 'u0', 'l0', '#000');
        c.restore();
        const ox = tip.x * 0.35;
        placePattern(pats.brick, ox, tip.y);
        placePattern(pats.dots, ox, tip.y);
        placePattern(pats.grid, ox * 0.8, tip.y);
        band(pts, 'u2', 'u1', pats.brick);
        band(pts, 'u1', 'u0', pats.dots);
        band(pts, 'l0', 'l1', pats.dots);
        band(pts, 'l1', 'l2', pats.grid);
      }
      spawnT -= dt;
      if (p < 0.75 && spawnT <= 0) {
        spawnT = 0.035;
        spawnSpark(pts, tip);
      }
      if (tip.x < W + 60) drawPointer(tip.x + 2 * u, tip.y + 2 * u, -0.35, CURSOR_COLORS[1], 30 * u);
      if (p >= 1) {
        phase = 'done';
        root.style.pointerEvents = 'none';
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.max) {
        sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy *= 1 - dt * 2;
      s.rot += s.vr * dt;
      drawSpark(s);
    }

    if (phase === 'done' && !sparks.length) return finish();
    requestAnimationFrame(frame);
  }

  function finish() {
    window.removeEventListener('resize', resize);
    root.remove();
    const screen = document.getElementById('screen');
    if (screen) screen.focus();
  }

  requestAnimationFrame(frame);
})();

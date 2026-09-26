// FX: particles, screen shake, iris wipes, and the old-film post-process
// (grain, flicker, gate weave, scratches, dust, vignette, sepia tint).
(function () {
  const K = G.ink;
  const F = (G.fx = { parts: [], shake: 0, hitStop: 0, scratches: [], flash: 0, flashColor: '#fff' });

  F.init = () => {
    // grain plates
    F.grain = [];
    for (let k = 0; k < 4; k++) {
      const cv = document.createElement('canvas');
      cv.width = 480;
      cv.height = 270;
      const c = cv.getContext('2d');
      const img = c.createImageData(480, 270);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 150;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      F.grain.push(cv);
    }
    // vignette plate
    const v = document.createElement('canvas');
    v.width = G.W;
    v.height = G.H;
    const vc = v.getContext('2d');
    const g = vc.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.38, G.W / 2, G.H / 2, G.W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(25,12,4,0.25)');
    g.addColorStop(1, 'rgba(15,6,0,0.75)');
    vc.fillStyle = g;
    vc.fillRect(0, 0, G.W, G.H);
    F.vignette = v;
  };

  // ---------- particles ----------
  F.add = (p) => {
    F.parts.push(Object.assign({ t: 0, life: 0.5, vx: 0, vy: 0, g: 0, r: 6, seed: Math.random() * 1000 }, p));
  };
  // dusty "poof" cloud, the staple of rubber-hose cartoons
  F.poof = (x, y, n = 6, color = K.C.cream, spread = 60) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = spread * (0.5 + Math.random() * 0.7);
      F.add({ kind: 'poof', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, r: 7 + Math.random() * 8, life: 0.45 + Math.random() * 0.25, color });
    }
  };
  F.spark = (x, y, color = K.C.yellow, n = 5) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 160;
      F.add({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5 + Math.random() * 4, life: 0.3, color });
    }
  };
  F.hitStar = (x, y, color = K.C.white) => F.add({ kind: 'star', x, y, r: 16, life: 0.18, color });
  F.popText = (x, y, str, color = K.C.yellow, size = 22) =>
    F.add({ kind: 'text', x, y, vy: -50, str, color, size, life: 1.0 });
  F.coinBurst = (x, y, n = 5) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
      F.add({ kind: 'coin', x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 200, g: 600, r: 6, life: 0.7 });
    }
  };
  F.ring = (x, y, r = 40, color = K.C.white, life = 0.35) => F.add({ kind: 'ring', x, y, r, life, color });
  F.smoke = (x, y) => F.add({ kind: 'smoke', x, y, vy: -40, vx: (Math.random() - 0.5) * 20, r: 8, life: 1.2, color: '#6d625a' });

  F.update = (dt) => {
    F.shake = Math.max(0, F.shake - dt * 30);
    F.flash = Math.max(0, F.flash - dt * 4);
    for (let i = F.parts.length - 1; i >= 0; i--) {
      const p = F.parts[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.vx *= p.kind === 'poof' ? 0.9 : 1;
      p.vy *= p.kind === 'poof' ? 0.9 : 1;
      if (p.t >= p.life) F.parts.splice(i, 1);
    }
  };

  F.draw = () => {
    const c = G.ctx;
    F.parts.forEach((p) => {
      const k = p.t / p.life;
      K.seed(p.seed);
      if (p.kind === 'poof') {
        const r = p.r * (1 - k * 0.8);
        K.blob(p.x, p.y, r, r * 0.9, p.color, { lw: 2.2 });
      } else if (p.kind === 'spark') {
        K.star(p.x, p.y, p.r * (1 - k), p.color, 4, p.t * 8, { lw: 1.6 });
      } else if (p.kind === 'star') {
        K.star(p.x, p.y, p.r * (0.6 + k), p.color, 6, p.seed, { lw: 2 });
      } else if (p.kind === 'text') {
        K.text(p.str, p.x, p.y, p.size, { fill: p.color, alpha: 1 - Math.max(0, k - 0.6) / 0.4 });
      } else if (p.kind === 'coin') {
        K.coin(p.x, p.y, p.r);
      } else if (p.kind === 'ring') {
        c.save();
        c.globalAlpha = 1 - k;
        c.lineWidth = 4 * (1 - k) + 1;
        c.strokeStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.r * (0.3 + k), 0, Math.PI * 2);
        c.stroke();
        c.restore();
      } else if (p.kind === 'smoke') {
        c.save();
        c.globalAlpha = 0.6 * (1 - k);
        K.blob(p.x, p.y, p.r * (1 + k * 1.5), p.r * (1 + k * 1.2), p.color, { lw: 1.5 });
        c.restore();
      }
    });
  };

  F.clear = () => {
    F.parts.length = 0;
  };

  // ---------- film post-process ----------
  let gateY = 0,
    flick = 0,
    lastFilmFrame = -1;
  F.post = () => {
    const c = G.ctx;
    const W = G.W,
      H = G.H;
    const frame = Math.floor(G.t * 24);
    if (frame !== lastFilmFrame) {
      lastFilmFrame = frame;
      flick = Math.random() * 0.05;
      gateY = Math.random() < 0.05 ? (Math.random() - 0.5) * 3 : 0;
      if (Math.random() < 0.06) F.scratches.push({ x: Math.random() * W, life: 2 + Math.floor(Math.random() * 10), w: Math.random() < 0.3 ? 2 : 1, dark: Math.random() < 0.6 });
      F.dust = [];
      const nd = Math.random() < 0.5 ? Math.floor(Math.random() * 4) : 0;
      for (let i = 0; i < nd; i++)
        F.dust.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, hair: Math.random() < 0.3, a: Math.random() * 6 });
      F.scratches.forEach((s) => {
        s.life--;
        s.x += (Math.random() - 0.5) * 3;
      });
      F.scratches = F.scratches.filter((s) => s.life > 0);
      F.grainIdx = Math.floor(Math.random() * 4);
      F.gx = Math.random() * 40;
      F.gy = Math.random() * 40;
    }
    c.save();
    // warm sepia wash
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = 'rgb(255,236,206)';
    c.fillRect(0, 0, W, H);
    // lifted blacks, faded print
    c.globalCompositeOperation = 'screen';
    c.fillStyle = 'rgb(30,20,12)';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    if (G.settings.film) {
      // grain
      c.globalCompositeOperation = 'overlay';
      c.globalAlpha = 0.22;
      c.drawImage(F.grain[F.grainIdx || 0], -F.gx, -F.gy, W + 80, H + 80);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      // scratches
      F.scratches.forEach((s) => {
        c.strokeStyle = s.dark ? 'rgba(30,20,10,0.45)' : 'rgba(255,250,235,0.5)';
        c.lineWidth = s.w;
        c.beginPath();
        c.moveTo(s.x, 0);
        c.lineTo(s.x + 4, H);
        c.stroke();
      });
      // dust and hairs
      c.fillStyle = 'rgba(25,15,8,0.7)';
      c.strokeStyle = 'rgba(25,15,8,0.6)';
      (F.dust || []).forEach((d) => {
        if (d.hair) {
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(d.x, d.y);
          c.quadraticCurveTo(d.x + 10, d.y + Math.sin(d.a) * 14, d.x + 18 * Math.cos(d.a), d.y + 18 * Math.sin(d.a));
          c.stroke();
        } else {
          c.beginPath();
          c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          c.fill();
        }
      });
      // flicker
      c.fillStyle = `rgba(0,0,0,${flick})`;
      c.fillRect(0, 0, W, H);
    }
    c.drawImage(F.vignette, 0, 0);
    if (F.flash > 0) {
      c.globalAlpha = Math.min(1, F.flash) * 0.6;
      c.fillStyle = F.flashColor;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }
    c.restore();
  };
  F.gateOffset = () => (G.settings.film ? gateY : 0);

  // ---------- iris wipe ----------
  F.drawIris = (r, cx = G.W / 2, cy = G.H / 2) => {
    const c = G.ctx;
    if (r > 1200) return;
    c.save();
    c.fillStyle = K.INK;
    c.beginPath();
    c.rect(-10, -10, G.W + 20, G.H + 20);
    if (r > 0) c.arc(cx, cy, r, 0, Math.PI * 2, true);
    c.fill('evenodd');
    c.restore();
  };
})();

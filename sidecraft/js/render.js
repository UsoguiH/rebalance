// Renderer: sky, parallax hills, clouds, walls, blocks, fluids, entities and
// the smooth light map that is blended over everything (Terraria-style).
(function () {
  const SC = window.SC;
  const B = SC.B;
  const blocks = SC.blocks;
  const ZOOMS = [1, 1.5, 2, 2.5, 3, 4];

  class Renderer {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.layer = document.createElement('canvas');
      this.lctx = this.layer.getContext('2d');
      this.lightCv = document.createElement('canvas');
      this.lightCtx = this.lightCv.getContext('2d');
      this.zoomI = 3;
      this.cracks = [];
      const r = SC.rng(99);
      for (let s = 0; s < 10; s++) {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const g = c.getContext('2d');
        if (s > 0) g.drawImage(this.cracks[s - 1], 0, 0);
        g.fillStyle = 'rgba(0,0,0,0.6)';
        for (let k = 0; k < 3 + s; k++) {
          let x = 8 + (r() - 0.5) * (2 + s), y = 8 + (r() - 0.5) * (2 + s);
          const dx = r() - 0.5, dy = r() - 0.5;
          for (let t = 0; t < 2 + s; t++) {
            g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
            x += Math.sign(dx) * (r() < 0.7 ? 1 : 0);
            y += Math.sign(dy) * (r() < 0.7 ? 1 : 0);
          }
        }
        this.cracks.push(c);
      }
      this.stars = Array.from({ length: 160 }, () => [Math.random(), Math.random() * 0.7, Math.random() * 0.8 + 0.2]);
      this.clouds = Array.from({ length: 22 }, () => ({ x: Math.random() * 4000, y: Math.random() * 120, w: 3 + Math.floor(Math.random() * 7), h: 1 + Math.floor(Math.random() * 2) }));
      this.hillN = new SC.Noise(4242);
      this.shake = 0;
      this.resize();
    }
    get zoom() {
      return ZOOMS[this.zoomI];
    }
    setZoomFor(width) {
      const want = width / (16 * 40);
      let best = 0;
      ZOOMS.forEach((z, i) => {
        if (Math.abs(z - want) < Math.abs(ZOOMS[best] - want)) best = i;
      });
      this.zoomI = best;
    }
    zoomBy(d) {
      this.zoomI = SC.clamp(this.zoomI + d, 0, ZOOMS.length - 1);
      SC.options.zoom = ZOOMS[this.zoomI];
      SC.saveOptions();
      this.resize();
    }
    applyZoomOption() {
      const z = SC.options.zoom;
      if (z && ZOOMS.includes(z)) this.zoomI = ZOOMS.indexOf(z);
      else this.setZoomFor(innerWidth);
      this.resize();
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
      if (this.cv.width !== w || this.cv.height !== h) {
        this.cv.width = w;
        this.cv.height = h;
        this.layer.width = w;
        this.layer.height = h;
      }
      this.S = Math.max(8, Math.round(16 * this.zoom * dpr));
      this.vw = w / this.S;
      this.vh = h / this.S;
    }
    toWorld(mx, my, cam) {
      return [(mx + Math.round(cam.x * this.S)) / this.S, (my + Math.round(cam.y * this.S)) / this.S];
    }

    // ---------- sky ----------
    skyColors(t, dayF) {
      const day = [[105, 160, 255], [175, 210, 255]];
      const night = [[6, 8, 22], [20, 28, 56]];
      const dusk = [[70, 80, 160], [250, 150, 90]];
      const s = Math.sin(t * Math.PI * 2);
      const duskF = Math.max(0, 1 - Math.abs(s) * 4);
      const f = SC.clamp((dayF - 0.2) / 0.8, 0, 1);
      const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
      let top = mix(night[0], day[0], f), bot = mix(night[1], day[1], f);
      top = mix(top, dusk[0], duskF * 0.5);
      bot = mix(bot, dusk[1], duskF * 0.7);
      return [top, bot, f, duskF];
    }
    drawSky(g, game) {
      const ctx = this.ctx;
      const W = this.cv.width, H = this.cv.height, S = this.S;
      const t = game.world.time;
      const dayF = game.dayFactor();
      const [top, bot, f, duskF] = this.skyColors(t, dayF);
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, SC.rgb(top));
      grd.addColorStop(1, SC.rgb(bot));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // stars
      if (f < 0.6) {
        for (const [sx, sy, a] of this.stars) {
          ctx.fillStyle = `rgba(255,255,255,${(1 - f / 0.6) * a * (0.7 + 0.3 * Math.sin(performance.now() / 700 + sx * 50))})`;
          const s = Math.max(1, Math.round(this.dpr * 1.5));
          ctx.fillRect(((sx * W + game.cam.x * 0.5) % W + W) % W, sy * H, s, s);
        }
      }
      // sun and moon (square, of course)
      const horizon = H * 0.62;
      const body = (ang, size, colr, glow) => {
        const x = W / 2 - Math.cos(ang) * W * 0.42;
        const y = horizon - Math.sin(ang) * H * 0.55;
        if (glow) {
          ctx.fillStyle = glow;
          ctx.fillRect(x - size, y - size, size * 2, size * 2);
        }
        ctx.fillStyle = colr;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        return [x, y];
      };
      const sz = S * 2.2;
      body(t * Math.PI * 2, sz, '#fff6c8', 'rgba(255,240,170,0.18)');
      const [mx, my] = body(t * Math.PI * 2 + Math.PI, sz * 0.8, '#e6e8f0', null);
      ctx.fillStyle = 'rgba(160,165,185,0.8)';
      ctx.fillRect(mx - sz * 0.25, my - sz * 0.15, sz * 0.15, sz * 0.15);
      ctx.fillRect(mx + sz * 0.05, my + sz * 0.05, sz * 0.12, sz * 0.12);

      // parallax hills: far then near
      const camPx = game.cam.x * S, camPy = game.cam.y * S;
      const hillY = (92 - game.cam.y) * S;
      const layers = [
        [0.12, 0.35, [120, 150, 190], 70, 0.9],
        [0.3, 0.6, [80, 125, 90], 45, 1.4],
      ];
      for (const [px, py, c, amp, freq] of SC.options.graphics === 'fancy' ? layers : []) {
        const base = hillY * py + H * (1 - py) * 0.55;
        const cc = c.map((v, i) => v * (0.25 + 0.75 * f) + (i === 2 ? 10 : 0) * (1 - f));
        ctx.fillStyle = SC.rgb(cc);
        const step = Math.max(2, Math.round(S / 4));
        for (let x = 0; x < W + step; x += step) {
          const wx = (x + camPx * px) / S;
          const hh = (this.hillN.f1(wx / (40 * freq), 3) * 0.5 + 0.5) * amp * this.dpr * (this.zoom / 2);
          const y = Math.round(base - hh);
          ctx.fillRect(x, y, step, H - y);
        }
      }
      // clouds
      ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * f})`;
      const cw = S * 1.2;
      const time = performance.now() / 1000;
      for (const c of SC.options.clouds ? this.clouds : []) {
        const x = ((((c.x + time * 6) * this.dpr - camPx * 0.35) % (4000 * this.dpr)) + 4000 * this.dpr) % (4000 * this.dpr) - 300 * this.dpr;
        const y = (c.y * this.dpr + 30) - camPy * 0.15 + (40 - 92) * S * 0.15 + H * 0.12;
        if (x > W || x + c.w * cw < 0) continue;
        ctx.fillRect(x, y, c.w * cw, c.h * cw * 0.6);
        ctx.fillRect(x + cw, y - cw * 0.4, (c.w - 2) * cw, cw * 0.4);
      }
      return duskF;
    }

    // ---------- world ----------
    render(game) {
      this.resize();
      const ctx = this.ctx, lctx = this.lctx;
      const W = this.cv.width, H = this.cv.height, S = this.S;
      const world = game.world;
      const cam = game.cam;
      let sx = 0, sy = 0;
      if (game.shakeT > 0) {
        sx = (Math.random() - 0.5) * game.shakeAmt * this.dpr;
        sy = (Math.random() - 0.5) * game.shakeAmt * this.dpr;
      }
      const camPx = Math.round(cam.x * S + sx), camPy = Math.round(cam.y * S + sy);
      this.camPx = camPx;
      this.camPy = camPy;
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;

      this.drawSky(ctx, game);

      lctx.clearRect(0, 0, W, H);
      const tx0 = Math.floor(camPx / S), ty0 = Math.floor(camPy / S);
      const tx1 = Math.ceil((camPx + W) / S), ty1 = Math.ceil((camPy + H) / S);
      const fg = world.fg, bg = world.bg, meta = world.meta, WW = world.W;
      const tex = SC.tex, wallTex = SC.wallTex, backTex = SC.backTex;
      for (let y = ty0; y <= ty1; y++) {
        if (y < 0 || y >= world.H) continue;
        const py = y * S - camPy;
        for (let x = tx0; x <= tx1; x++) {
          if (x < 0 || x >= WW) continue;
          const i = y * WW + x;
          const id = fg[i];
          const d = blocks[id];
          const px = x * S - camPx;
          if (!d.opaque || (d.tree && meta[i] & 1)) {
            const b = bg[i];
            if (b) lctx.drawImage(wallTex[b], px, py, S, S);
            else if (y > world.surface[x] + 2) lctx.drawImage(backTex[y > world.surface[x] + 12 ? B.STONE : B.DIRT], px, py, S, S);
          }
          if (id && !d.fluid) lctx.drawImage(tex[id], px, py, S, S);
        }
      }
      // world edges
      lctx.fillStyle = '#000';
      if (tx0 < 0) lctx.fillRect(0, 0, -camPx, H);
      if (tx1 >= WW) lctx.fillRect(WW * S - camPx, 0, W, H);

      // entities
      for (const e of game.entities) {
        const ex = e.x * S - camPx, ey = e.y * S - camPy;
        if (ex < -S * 3 || ex > W + S * 3 || ey < -S * 3 || ey > H + S * 4) continue;
        e.draw(lctx, ex, ey, S);
      }
      if (game.player && !game.player.dead) game.player.draw(lctx, game.player.x * S - camPx, game.player.y * S - camPy, S);

      // fluids on top so things look submerged
      const now = performance.now() / 1000;
      for (let y = ty0; y <= ty1; y++) {
        if (y < 0 || y >= world.H) continue;
        const py = y * S - camPy;
        for (let x = tx0; x <= tx1; x++) {
          if (x < 0 || x >= WW) continue;
          const i = y * WW + x;
          const id = fg[i];
          if (id !== B.WATER && id !== B.LAVA) continue;
          const lvl = meta[i] || 8;
          const above = y > 0 ? fg[i - WW] : 0;
          let h = above === id ? S : Math.max(2, Math.round((lvl / 8) * S * 0.92));
          let top = py + S - h;
          if (above !== id && lvl === 8) {
            const wave = Math.round(Math.sin(now * 2 + x * 0.9) * S * 0.04);
            top += wave;
            h -= wave;
          }
          const px = x * S - camPx;
          lctx.globalAlpha = id === B.WATER ? 0.62 : 0.97;
          lctx.drawImage(tex[id], 0, 16 - (h / S) * 16, 16, (h / S) * 16, px, top, S, h);
          if (above !== id) {
            lctx.fillStyle = id === B.WATER ? 'rgba(170,205,255,0.5)' : 'rgba(255,220,120,0.7)';
            lctx.fillRect(px, top, S, Math.max(1, Math.round(S / 16)));
          }
        }
      }
      lctx.globalAlpha = 1;

      // particles
      for (const p of SC.particles) {
        const s = Math.max(1, Math.round(p.size * S));
        const a = SC.clamp(p.life / (p.max * 0.5), 0, 1);
        lctx.fillStyle = `rgba(${p.col[0] | 0},${p.col[1] | 0},${p.col[2] | 0},${a})`;
        lctx.fillRect(Math.round(p.x * S - camPx - s / 2), Math.round(p.y * S - camPy - s / 2), s, s);
      }

      // breaking cracks
      const m = game.player && game.player.mine;
      if (m && m.p > 0) {
        const stage = SC.clamp(Math.floor(m.p * 10), 0, 9);
        lctx.drawImage(this.cracks[stage], m.x * S - camPx, m.y * S - camPy, S, S);
      }

      // light map
      this.drawLight(game, tx0, ty0, tx1, ty1, camPx, camPy);

      ctx.drawImage(this.layer, 0, 0);
    }

    drawLight(game, tx0, ty0, tx1, ty1, camPx, camPy) {
      const world = game.world, S = this.S;
      const M = 15;
      const lx0 = tx0 - 1, ly0 = ty0 - 1;
      const lw = tx1 - tx0 + 3, lh = ty1 - ty0 + 3;
      const dyn = [];
      const p = game.player;
      if (p && !p.dead) {
        const h = p.held();
        const e = h && SC.blocks[h.id] && h.id < 256 ? SC.blocks[h.id].light : 0;
        if (e) dyn.push([p.x, p.y - 1.2, e - 1]);
      }
      for (const e of game.entities) {
        if (e.kind === 'item' && e.id < 256 && blocks[e.id].light) dyn.push([e.x, e.y - 0.2, blocks[e.id].light - 2]);
        if (e.burn > 0) dyn.push([e.x, e.y - 1, 10]);
        if (e.kind === 'tnt') dyn.push([e.x, e.y - 0.5, 8]);
      }
      const L = world.light(lx0 - M, ly0 - M, lw + M * 2, lh + M * 2, dyn);
      this.lastLight = { L, x0: lx0 - M, y0: ly0 - M, w: lw + M * 2 };
      const fullW = lw + M * 2;
      if (this.lightCv.width !== lw || this.lightCv.height !== lh) {
        this.lightCv.width = lw;
        this.lightCv.height = lh;
        this.img = this.lightCtx.createImageData(lw, lh);
      }
      const data = this.img.data;
      const dayF = game.dayFactor();
      const nightTint = 1 - SC.clamp((dayF - 0.2) / 0.8, 0, 1);
      const bright = SC.options.brightness;
      const gammaPow = 1.35 - bright * 0.55, gammaMin = bright * 0.07;
      for (let y = 0; y < lh; y++)
        for (let x = 0; x < lw; x++) {
          const j = (y + M) * fullW + x + M;
          const s = L.sky[j] * dayF, b = L.blk[j];
          const v = Math.max(s, b) / 15;
          const br = Math.max(gammaMin, Math.pow(v, gammaPow));
          const o = (y * lw + x) * 4;
          // torchlight is warm, moonlight is blue
          const warm = b > s ? 1 : 0;
          data[o] = warm ? 14 : 4;
          data[o + 1] = warm ? 7 : 6 + nightTint * 6;
          data[o + 2] = warm ? 0 : 18 + nightTint * 20;
          data[o + 3] = Math.round((1 - br) * 255);
        }
      this.lightCtx.putImageData(this.img, 0, 0);
      const lctx = this.lctx;
      lctx.save();
      lctx.globalCompositeOperation = 'source-atop';
      lctx.imageSmoothingEnabled = !!SC.options.smooth;
      lctx.imageSmoothingQuality = 'high';
      lctx.drawImage(this.lightCv, lx0 * S - camPx, ly0 * S - camPy, lw * S, lh * S);
      lctx.restore();
    }

    // brightness 0..1 at a tile from the last light pass (for UI tints)
    lightAt(x, y, dayF) {
      const ll = this.lastLight;
      if (!ll) return 1;
      const i = (Math.floor(y) - ll.y0) * ll.w + Math.floor(x) - ll.x0;
      if (i < 0 || i >= ll.L.n) return 1;
      return Math.max(ll.L.sky[i] * dayF, ll.L.blk[i]) / 15;
    }
  }
  Renderer.ZOOMS = ZOOMS;
  SC.Renderer = Renderer;
})();

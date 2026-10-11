// Core: namespace, math, seeded RNG, Perlin noise, input state.
(function () {
  const SC = (window.SC = {});

  SC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SC.lerp = (a, b, t) => a + (b - a) * t;
  SC.smooth = (a, b, v) => {
    const t = SC.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // seeded rng (mulberry32)
  SC.rng = (seed) => {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.chance = (p) => r() < p;
    return r;
  };
  SC.R = SC.rng((Math.random() * 1e9) | 0);

  // integer hash -> [0, 1)
  SC.hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 0x27d4eb2d);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  SC.seedFromString = (str) => {
    str = String(str).trim();
    if (/^-?\d+$/.test(str)) return Number(str) | 0;
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    return h;
  };

  // ---------- Perlin noise ----------
  SC.Noise = function (seed) {
    const r = SC.rng(seed);
    const perm = new Uint8Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const G2 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

    this.n1 = (x) => {
      const xi = Math.floor(x);
      const xf = x - xi;
      const a = perm[xi & 255] & 1 ? 1 : -1;
      const b = perm[(xi + 1) & 255] & 1 ? 1 : -1;
      const ga = a * xf * (0.5 + (perm[(xi + 7) & 255] / 255) * 0.5);
      const gb = b * (xf - 1) * (0.5 + (perm[(xi + 8) & 255] / 255) * 0.5);
      return (ga + (gb - ga) * fade(xf)) * 2;
    };
    this.n2 = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const X = xi & 255;
      const Y = yi & 255;
      const g = (h, dx, dy) => {
        const v = G2[h & 7];
        return v[0] * dx + v[1] * dy;
      };
      const aa = g(perm[X + perm[Y]], xf, yf);
      const ba = g(perm[X + 1 + perm[Y]], xf - 1, yf);
      const ab = g(perm[X + perm[Y + 1]], xf, yf - 1);
      const bb = g(perm[X + 1 + perm[Y + 1]], xf - 1, yf - 1);
      const u = fade(xf);
      const v = fade(yf);
      const x1 = aa + (ba - aa) * u;
      const x2 = ab + (bb - ab) * u;
      return (x1 + (x2 - x1) * v) * 0.9;
    };
    this.f1 = (x, oct = 4) => {
      let s = 0, a = 1, f = 1, n = 0;
      for (let i = 0; i < oct; i++) {
        s += this.n1(x * f + i * 31.7) * a;
        n += a;
        a *= 0.5;
        f *= 2;
      }
      return s / n;
    };
    this.f2 = (x, y, oct = 3) => {
      let s = 0, a = 1, f = 1, n = 0;
      for (let i = 0; i < oct; i++) {
        s += this.n2(x * f + i * 17.3, y * f - i * 11.1) * a;
        n += a;
        a *= 0.5;
        f *= 2;
      }
      return s / n;
    };
  };

  // ---------- input ----------
  const I = (SC.input = {
    down: {},
    pressed: {},
    mx: 0,
    my: 0,
    lmb: false,
    rmb: false,
    lpress: false,
    rpress: false,
    wheel: 0,
    tapTime: {},
    doubleTap: {},
  });
  SC.inputEndFrame = () => {
    I.pressed = {};
    I.doubleTap = {};
    I.lpress = false;
    I.rpress = false;
    I.wheel = 0;
  };
  SC.bindInput = (canvas) => {
    addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      // menus and text boxes get the keys first
      if (SC.gui && SC.gui.screen) {
        if (SC.gui.keyDown(e) && !['F5', 'F11', 'F12'].includes(e.code) && !((e.ctrlKey || e.metaKey) && ['KeyV', 'KeyC', 'KeyR'].includes(e.code))) e.preventDefault();
        return;
      }
      if (SC.ui && SC.ui.keyDown && SC.ui.keyDown(e)) {
        e.preventDefault();
        return;
      }
      if (['F1', 'F2', 'F3', 'Slash', 'Quote', 'Backquote'].includes(e.code)) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && ['KeyD', 'KeyS', 'KeyA', 'KeyF', 'KeyQ', 'KeyE'].includes(e.code)) e.preventDefault();
      if (!I.down[e.code]) {
        I.pressed[e.code] = true;
        const now = performance.now();
        if (now - (I.tapTime[e.code] || 0) < 280) I.doubleTap[e.code] = true;
        I.tapTime[e.code] = now;
      }
      I.down[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => {
      I.down[e.code] = false;
    });
    addEventListener('blur', () => {
      I.down = {};
      I.lmb = I.rmb = false;
    });
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      I.mx = ((e.clientX - r.left) / r.width) * canvas.width;
      I.my = ((e.clientY - r.top) / r.height) * canvas.height;
    };
    canvas.addEventListener('mousemove', pos);
    canvas.addEventListener('mousedown', (e) => {
      pos(e);
      if (e.button === 1) e.preventDefault();
      if (SC.audio) SC.audio.unlock();
      const code = 'Mouse' + e.button;
      if (e.button === 0) I.lmb = true;
      if (SC.gui && SC.gui.screen) {
        SC.gui.mouseDown(I.mx, I.my, e.button);
        return;
      }
      I.down[code] = true;
      I.pressed[code] = true;
      if (e.button === 0) {
        I.lmb = true;
        I.lpress = true;
      } else if (e.button === 2) {
        I.rmb = true;
        I.rpress = true;
      }
      if (SC.audio) SC.audio.unlock();
    });
    addEventListener('mouseup', (e) => {
      I.down['Mouse' + e.button] = false;
      if (e.button === 0) I.lmb = false;
      else if (e.button === 2) I.rmb = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('paste', (e) => SC.gui && SC.gui.paste((e.clipboardData && e.clipboardData.getData('text')) || ''));
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (SC.gui && SC.gui.screen) SC.gui.wheel(Math.sign(e.deltaY));
        else I.wheel += Math.sign(e.deltaY);
      },
      { passive: false },
    );
  };
})();

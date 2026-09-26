// Core: namespace, math helpers, clock, input, save data.
(function () {
  const G = (window.G = {});
  G.W = 960;
  G.H = 540;
  G.t = 0; // seconds since start
  G.dt = 0;
  G.boil = 0; // line-boil frame (10 fps), drives the hand-drawn wobble
  G.animT = 0; // time quantised to 24 fps, like a real cel cartoon

  // ---------- math ----------
  G.hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  G.ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  G.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  G.easeIn = (t) => t * t * t;
  G.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  G.easeBack = (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  };

  // seeded rng (mulberry32)
  G.rng = (seed) => {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.range = (lo, hi) => lo + r() * (hi - lo);
    return r;
  };
  G.R = G.rng((Math.random() * 1e9) | 0);

  // ---------- input ----------
  const I = (G.input = {
    down: {},
    pressed: {},
    mouse: { x: 480, y: 270, down: false, pressed: false, rdown: false, rpressed: false, lastMove: -99 },
    anyPressed: false,
    lastDevice: 'key',
  });
  const MAP = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    shoot: ['KeyJ'],
    dodge: ['Space', 'KeyK', 'ShiftLeft', 'ShiftRight'],
    ex: ['KeyL'],
    interact: ['KeyE', 'Enter'],
    confirm: ['Enter', 'KeyE', 'Space', 'KeyJ'],
    back: ['Escape', 'Backspace', 'KeyX'],
    bag: ['KeyI', 'Tab'],
    potion: ['KeyQ'],
    hook: ['KeyR'],
    swap: ['KeyC'],
    pause: ['Escape', 'KeyP'],
    mute: ['KeyM'],
  };
  G.MAP = MAP;
  I.is = (act) => MAP[act].some((k) => I.down[k]) || (act === 'shoot' && I.mouse.down) || (act === 'ex' && I.mouse.rdown);
  I.hit = (act) =>
    MAP[act].some((k) => I.pressed[k]) || (act === 'shoot' && I.mouse.pressed) || (act === 'ex' && I.mouse.rpressed);
  I.axis = () => {
    let x = 0,
      y = 0;
    if (I.is('left')) x -= 1;
    if (I.is('right')) x += 1;
    if (I.is('up')) y -= 1;
    if (I.is('down')) y += 1;
    return { x, y };
  };
  I.endFrame = () => {
    I.pressed = {};
    I.mouse.pressed = false;
    I.mouse.rpressed = false;
    I.anyPressed = false;
  };
  const block = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace']);
  window.addEventListener('keydown', (e) => {
    if (block.has(e.code)) e.preventDefault();
    if (!I.down[e.code]) I.pressed[e.code] = true;
    I.down[e.code] = true;
    I.anyPressed = true;
    I.lastDevice = 'key';
    G.audio && G.audio.unlock();
  });
  window.addEventListener('keyup', (e) => {
    I.down[e.code] = false;
  });
  window.addEventListener('blur', () => {
    I.down = {};
    I.mouse.down = I.mouse.rdown = false;
  });
  G.bindMouse = (canvas) => {
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      I.mouse.x = ((e.clientX - r.left) / r.width) * G.W;
      I.mouse.y = ((e.clientY - r.top) / r.height) * G.H;
    };
    canvas.addEventListener('mousemove', (e) => {
      pos(e);
      I.mouse.lastMove = G.t;
    });
    canvas.addEventListener('mousedown', (e) => {
      pos(e);
      if (e.button === 2) {
        I.mouse.rdown = true;
        I.mouse.rpressed = true;
      } else {
        I.mouse.down = true;
        I.mouse.pressed = true;
      }
      I.mouse.lastMove = G.t;
      I.anyPressed = true;
      I.lastDevice = 'mouse';
      G.audio && G.audio.unlock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) I.mouse.rdown = false;
      else I.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  // ---------- save data ----------
  const SAVE_KEY = 'wick-lost-reels-save-v1';
  G.newState = () => ({
    day: 1,
    phase: 'morning', // morning -> evening -> night
    gold: 60,
    potions: 1,
    hpLevel: 0, // bonus max HP
    dmgLevel: 1,
    weapons: ['flicker'],
    weapon: 'flicker',
    bag: [], // {id, n}
    chest: [
      { id: 'sugar', n: 3 },
      { id: 'spoon', n: 1 },
    ],
    shelves: [null, null, null, null], // {id, n, price}
    ledger: {}, // id -> [{price, mood}]
    cleared: [false, false, false, false],
    keys: [],
    seen: {}, // cutscene/dialog flags
    stats: { sold: 0, earned: 0, deaths: 0 },
    shopOpenedToday: false,
  });
  G.state = G.newState();
  G.hasSave = () => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  };
  G.save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(G.state));
    } catch (e) {
      /* storage unavailable: play on without saving */
    }
  };
  G.load = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      G.state = Object.assign(G.newState(), JSON.parse(raw));
      return true;
    } catch (e) {
      return false;
    }
  };
  G.settings = { music: 0.6, sfx: 0.8, film: true };
  try {
    Object.assign(G.settings, JSON.parse(localStorage.getItem('wick-settings') || '{}'));
  } catch (e) {
    /* defaults */
  }
  G.saveSettings = () => {
    try {
      localStorage.setItem('wick-settings', JSON.stringify(G.settings));
    } catch (e) {
      /* ignore */
    }
  };
})();

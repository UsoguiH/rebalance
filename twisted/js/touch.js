// Touch controls for phones and tablets: a floating steering stick on the left (touch and
// steer drives forward, pull back to brake/reverse) and a cluster of buttons on the right,
// laid out like a handheld: machine gun and fire under the right thumb, turbo and alt special
// above them, then jump and the energy moves. In menus every touch becomes a tap the UI
// hit-tests against what it drew.
import { clamp, G } from './core.js';
import { weaponIcon } from './hud.js';

const BTN = [
  // id, hold, label
  ['mg', true, 'MG'],
  ['fire', true, 'FIRE'],
  ['turbo', true, 'TURBO'],
  ['alt', false, 'ALT'],
  ['jump', false, 'JUMP'],
  ['rear', true, 'REAR'],
  ['freeze', false, 'FRZ'],
  ['shield', false, 'SHLD'],
  ['mine', false, 'MINE'],
  ['pause', false, 'II'],
];
const COST = { freeze: 45, shield: 50, mine: 25, jump: 20 };

export class TouchControls {
  constructor() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    // phones/tablets start in touch mode; touchscreen laptops switch on their first touch
    this.enabled = !!coarse;
    this.mode = 'menu';
    this.pointers = new Map();
    this.held = {};
    this.pressed = {};
    this.taps = [];
    this.stick = { id: null, cx: 0, cy: 0, x: 0, y: 0, nx: 0, ny: 0 };
    this.state = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.buttons = [];
    this.inset = { l: 0, r: 0, t: 0, b: 0 };
    this.w = 1;
    this.h = 1;
    this.regionHit = null; // (x, y) => bool, set by the HUD for tappable things in play
    const opts = { passive: false };
    window.addEventListener('pointerdown', (e) => this.down(e), opts);
    window.addEventListener('pointermove', (e) => this.move(e), opts);
    window.addEventListener('pointerup', (e) => this.up(e), opts);
    window.addEventListener('pointercancel', (e) => this.up(e), opts);
    // stop the browser from scrolling, zooming or long-press selecting while playing
    for (const ev of ['touchstart', 'touchmove', 'touchend']) window.addEventListener(ev, (e) => e.cancelable && e.preventDefault(), opts);
  }
  get portrait() {
    return this.enabled && this.h > this.w;
  }
  layout(w, h, inset) {
    this.w = w;
    this.h = h;
    this.inset = inset;
    const u = (this.u = clamp(Math.min(w, h) / 390, 0.75, 1.35));
    const R = w - inset.r - 14 * u, B = h - inset.b - 14 * u;
    const at = (id, x, y, r) => ({ id, x, y, r, hold: BTN.find((b) => b[0] === id)[1], label: BTN.find((b) => b[0] === id)[2] });
    this.buttons = [
      at('mg', R - 48 * u, B - 52 * u, 47 * u),
      at('fire', R - 152 * u, B - 36 * u, 40 * u),
      at('turbo', R - 40 * u, B - 152 * u, 29 * u),
      at('alt', R - 126 * u, B - 122 * u, 25 * u),
      at('jump', R - 206 * u, B - 104 * u, 22 * u),
      at('rear', R - 215 * u, B - 196 * u, 20 * u),
      at('freeze', R - 162 * u, B - 206 * u, 20 * u),
      at('shield', R - 109 * u, B - 214 * u, 20 * u),
      at('mine', R - 56 * u, B - 212 * u, 20 * u),
      at('pause', w - inset.r - 26 * u, inset.t + 26 * u, 18 * u),
    ];
    this.stickHome = { x: inset.l + 100 * u, y: B - 88 * u, r: 62 * u };
  }
  isTouch(e) {
    return e.pointerType === 'touch' || e.pointerType === 'pen';
  }
  down(e) {
    if (!this.isTouch(e)) return;
    this.enabled = true;
    const x = e.clientX, y = e.clientY;
    if (this.mode !== 'play' || this.portrait) {
      this.taps.push({ x, y });
      return;
    }
    for (const b of this.buttons) {
      if ((x - b.x) ** 2 + (y - b.y) ** 2 < (b.r * 1.18) ** 2) {
        this.pointers.set(e.pointerId, { role: b.id });
        this.held[b.id] = true;
        this.pressed[b.id] = true;
        return;
      }
    }
    if (this.regionHit && this.regionHit(x, y)) return;
    if (x < this.w * 0.45 && y > this.h * 0.28 && this.stick.id === null) {
      this.pointers.set(e.pointerId, { role: 'stick' });
      Object.assign(this.stick, { id: e.pointerId, cx: x, cy: y, x, y, nx: 0, ny: 0 });
      return;
    }
    this.taps.push({ x, y });
  }
  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || p.role !== 'stick') return;
    const s = this.stick;
    const r = this.stickHome.r;
    let dx = e.clientX - s.cx, dy = e.clientY - s.cy;
    const l = Math.hypot(dx, dy);
    // drag the base along when the thumb overshoots, like most mobile sticks
    if (l > r) {
      s.cx += (dx / l) * (l - r);
      s.cy += (dy / l) * (l - r);
      dx = e.clientX - s.cx;
      dy = e.clientY - s.cy;
    }
    s.x = e.clientX;
    s.y = e.clientY;
    s.nx = clamp(dx / r, -1, 1);
    s.ny = clamp(dy / r, -1, 1);
  }
  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.role === 'stick') {
      this.stick.id = null;
      this.stick.nx = this.stick.ny = 0;
    } else this.held[p.role] = false;
  }
  takeTaps() {
    const t = this.taps;
    this.taps = [];
    return t;
  }
  // per-frame: stick -> driving state. Touching the stick drives; pulling it back brakes and reverses
  update() {
    const s = this.stick, st = this.state;
    if (s.id === null || this.mode !== 'play') {
      st.throttle = st.brake = st.steer = 0;
      st.handbrake = false;
      return;
    }
    const ax = Math.abs(s.nx);
    st.steer = ax < 0.1 ? 0 : Math.sign(s.nx) * Math.min(1, (ax - 0.1) / 0.75);
    const back = s.ny > 0.38;
    st.throttle = back ? 0 : 1;
    st.brake = back ? Math.min(1, (s.ny - 0.2) / 0.5) : 0;
    st.handbrake = back && ax > 0.65;
  }
  endFrame() {
    for (const k in this.pressed) this.pressed[k] = false;
  }
  releaseAll() {
    this.pointers.clear();
    this.held = {};
    this.stick.id = null;
    this.stick.nx = this.stick.ny = 0;
  }

  // ---------- drawing (on the HUD canvas, CSS pixel space) ----------
  draw(ctx) {
    if (!this.enabled || this.mode !== 'play' || this.portrait) return;
    const p = G.player;
    const u = this.u;
    ctx.save();
    // stick
    const s = this.stick;
    const home = this.stickHome;
    const bx = s.id !== null ? s.cx : home.x, by = s.id !== null ? s.cy : home.y;
    ctx.globalAlpha = s.id !== null ? 0.9 : 0.55;
    ring(ctx, bx, by, home.r, 'rgba(10,8,6,0.35)', 'rgba(232,224,206,0.55)', 2.5 * u);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.fillStyle = 'rgba(232,224,206,0.45)';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * home.r * 0.92, by + Math.sin(a) * home.r * 0.92);
      ctx.lineTo(bx + Math.cos(a + 0.12) * home.r * 0.78, by + Math.sin(a + 0.12) * home.r * 0.78);
      ctx.lineTo(bx + Math.cos(a - 0.12) * home.r * 0.78, by + Math.sin(a - 0.12) * home.r * 0.78);
      ctx.fill();
    }
    const kx = bx + s.nx * home.r, ky = by + s.ny * home.r;
    ring(ctx, kx, ky, home.r * 0.42, 'rgba(60,52,44,0.85)', 'rgba(242,236,222,0.9)', 2 * u);
    if (s.id === null) label(ctx, 'STEER', bx, by + home.r + 12 * u, 11 * u, 'rgba(232,224,206,0.7)');
    ctx.globalAlpha = 1;
    // buttons
    for (const b of this.buttons) {
      const on = !!this.held[b.id];
      let ok = true;
      if (p && COST[b.id] !== undefined) ok = p.energy >= COST[b.id];
      ctx.globalAlpha = ok ? (on ? 0.95 : 0.72) : 0.32;
      const fill = on ? 'rgba(168,30,22,0.75)' : b.id === 'mg' || b.id === 'fire' ? 'rgba(20,14,10,0.55)' : 'rgba(10,8,6,0.45)';
      const rim = b.id === 'fire' ? 'rgba(242,194,42,0.9)' : b.id === 'turbo' ? 'rgba(242,194,42,0.75)' : COST[b.id] !== undefined || b.id === 'rear' ? 'rgba(122,192,255,0.85)' : 'rgba(232,224,206,0.75)';
      ring(ctx, b.x, b.y, b.r, fill, rim, (b.r > 30 ? 3 : 2) * u);
      const c = '#f2ece0';
      if (b.id === 'mg') {
        weaponIcon(ctx, 'mg', b.x, b.y - 6 * u, 30 * u, c);
        if (p) label(ctx, String(Math.floor(p.mgAmmo)), b.x, b.y + 18 * u, 12 * u, '#ffffff');
      } else if (b.id === 'fire') {
        const sel = p ? p.selected : 'special';
        if (sel === 'special') label(ctx, 'S', b.x, b.y - 4 * u, 28 * u, '#f2c22a', 'Rye, serif');
        else weaponIcon(ctx, sel, b.x, b.y - 4 * u, 28 * u, '#ff8ab0');
        const cnt = p ? (sel === 'special' ? (p.def.special.fuel ? Math.round(p.fuel) : p.special) : p.weapons[sel]) : 0;
        label(ctx, String(cnt), b.x, b.y + 22 * u, 11 * u, '#ffffff');
      } else if (b.id === 'pause') {
        ctx.fillStyle = c;
        ctx.fillRect(b.x - 5 * u, b.y - 7 * u, 3.5 * u, 14 * u);
        ctx.fillRect(b.x + 1.5 * u, b.y - 7 * u, 3.5 * u, 14 * u);
      } else label(ctx, b.label, b.x, b.y, (b.r > 26 ? 12 : 10) * u, c);
    }
    ctx.restore();
  }
}

function ring(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}
function label(ctx, t, x, y, size, color, font = 'Oswald, "Arial Narrow", sans-serif') {
  ctx.font = `600 ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.18);
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

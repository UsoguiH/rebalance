// Keyboard + gamepad input mapped onto Twisted Metal (2012) "classic" style actions.
// Gamepad layout follows the PS3 tutorial: X gas, Square brake/reverse, double-tap X turbo,
// L2 sidearm, R2 fire, L1/R1 cycle, L1+R1 jump, d-pad energy (up freeze, right shield,
// down mine, left rear fire), Triangle alt special, Circle tight turn, R3 look back.
const keys = {};
const pressedNow = {};
let anyKey = false;

const KB = {
  gas: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  turbo: ['ShiftLeft', 'ShiftRight'],
  handbrake: ['Space'],
  mg: ['KeyJ'],
  fire: ['KeyK'],
  alt: ['KeyL'],
  prev: ['KeyQ'],
  next: ['KeyE'],
  jump: ['KeyC'],
  freeze: ['Digit1'],
  shield: ['Digit2'],
  mine: ['Digit3'],
  rear: ['KeyR'],
  look: ['KeyV'],
  pause: ['Escape', 'KeyP'],
  score: ['Tab'],
  confirm: ['Enter', 'Space', 'KeyK'],
  back: ['Escape', 'Backspace'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  navLeft: ['KeyA', 'ArrowLeft'],
  navRight: ['KeyD', 'ArrowRight'],
  mute: ['KeyM'],
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (!keys[e.code]) pressedNow[e.code] = true;
  keys[e.code] = true;
  anyKey = true;
  input.lastDevice = 'key';
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
});

const mouse = { down: false, rdown: false, pressed: false, rpressed: false };
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    mouse.down = true;
    mouse.pressed = true;
  }
  if (e.button === 2) {
    mouse.rdown = true;
    mouse.rpressed = true;
  }
  anyKey = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.down = false;
  if (e.button === 2) mouse.rdown = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

const kbDown = (a) => KB[a].some((c) => keys[c]);
const kbPressed = (a) => KB[a].some((c) => pressedNow[c]);

// gamepad state
let padPrev = [];
let lastGasTap = -1;
let turboLatch = false;
// actions injected by touch taps on menus / HUD, applied on the next update
const injected = new Set();

export const input = {
  lastDevice: 'key',
  // continuous
  throttle: 0,
  brake: 0,
  steer: 0,
  turbo: false,
  handbrake: false,
  mg: false,
  fireHeld: false,
  rear: false,
  look: false,
  score: false,
  // edge-triggered (true for one frame)
  fire: false,
  alt: false,
  prev: false,
  next: false,
  jump: false,
  freeze: false,
  shield: false,
  mine: false,
  pause: false,
  confirm: false,
  back: false,
  up: false,
  down: false,
  navLeft: false,
  navRight: false,
  mute: false,
  any: false,
  time: 0,
  touch: null, // TouchControls, set by main.js
  inject(action) {
    injected.add(action);
  },

  update(dt) {
    this.time += dt;
    const pad = getPad();
    const b = pad ? pad.buttons.map((x) => x.pressed) : [];
    const bv = pad ? pad.buttons.map((x) => x.value) : [];
    const ax = pad ? pad.axes : [0, 0, 0, 0];
    const bp = (i) => b[i] && !padPrev[i];
    if (pad && b.some((x) => x)) this.lastDevice = 'pad';

    // gas: X (0) or R2 analog fallback is fire, so gas stays on X like the PS3 default
    const padGas = b[0] ? 1 : 0;
    const padBrake = b[2] ? 1 : 0;
    let stick = Math.abs(ax[0]) > 0.15 ? ax[0] : 0;
    if (b[14]) stick = stick; // d-pad left is energy, not steering
    if (bp(0)) {
      if (this.time - lastGasTap < 0.28) turboLatch = true;
      lastGasTap = this.time;
    }
    if (!b[0]) turboLatch = false;

    this.throttle = Math.max(kbDown('gas') ? 1 : 0, padGas);
    this.brake = Math.max(kbDown('brake') ? 1 : 0, padBrake, ax[3] > 0.6 ? 1 : 0);
    this.steer = (kbDown('right') ? 1 : 0) - (kbDown('left') ? 1 : 0) + stick;
    this.steer = Math.max(-1, Math.min(1, this.steer));
    this.turbo = kbDown('turbo') || turboLatch;
    this.handbrake = kbDown('handbrake') || !!b[1];
    this.mg = kbDown('mg') || mouse.down || (bv[6] || 0) > 0.3;
    this.fireHeld = kbDown('fire') || mouse.rdown || (bv[7] || 0) > 0.3;
    this.fire = kbPressed('fire') || mouse.rpressed || ((bv[7] || 0) > 0.3 && !padPrev.r2);
    this.alt = kbPressed('alt') || bp(3);
    const l1 = b[4], r1 = b[5];
    this.jump = kbPressed('jump') || (l1 && r1 && (bp(4) || bp(5)));
    this.prev = kbPressed('prev') || (bp(4) && !r1);
    this.next = kbPressed('next') || (bp(5) && !l1);
    this.freeze = kbPressed('freeze') || bp(12);
    this.shield = kbPressed('shield') || bp(15);
    this.mine = kbPressed('mine') || bp(13);
    this.rear = kbDown('rear') || !!b[14];
    this.look = kbDown('look') || !!b[11];
    this.score = kbDown('score') || !!b[8];
    this.pause = kbPressed('pause') || bp(9);
    this.confirm = kbPressed('confirm') || bp(0) || mouse.pressed;
    this.back = kbPressed('back') || bp(1);
    this.up = kbPressed('up') || bp(12) || (ax[1] < -0.6 && !padPrev.ay);
    this.down = kbPressed('down') || bp(13) || (ax[1] > 0.6 && !padPrev.ay);
    this.navLeft = kbPressed('navLeft') || bp(14) || (ax[0] < -0.6 && !padPrev.ax);
    this.navRight = kbPressed('navRight') || bp(15) || (ax[0] > 0.6 && !padPrev.ax);
    this.mute = kbPressed('mute');
    this.any = anyKey || b.some((x, i) => x && !padPrev[i]);

    // touch controls (phones / tablets)
    const t = this.touch;
    if (t && t.enabled) {
      t.update();
      const ts = t.state, h = t.held, pr = t.pressed;
      this.throttle = Math.max(this.throttle, ts.throttle);
      this.brake = Math.max(this.brake, ts.brake);
      this.steer = Math.max(-1, Math.min(1, this.steer + ts.steer));
      this.handbrake = this.handbrake || ts.handbrake;
      this.turbo = this.turbo || !!h.turbo;
      this.mg = this.mg || !!h.mg;
      this.fireHeld = this.fireHeld || !!h.fire;
      this.fire = this.fire || !!pr.fire;
      this.alt = this.alt || !!pr.alt;
      this.jump = this.jump || !!pr.jump;
      this.freeze = this.freeze || !!pr.freeze;
      this.shield = this.shield || !!pr.shield;
      this.mine = this.mine || !!pr.mine;
      this.rear = this.rear || !!h.rear;
      this.pause = this.pause || !!pr.pause;
      if (Object.values(pr).some((v) => v)) this.lastDevice = 'touch';
      t.endFrame();
    }
    for (const a of injected) {
      this[a] = true;
      this.any = true;
    }
    if (injected.size) this.lastDevice = 'touch';
    injected.clear();

    padPrev = b.slice();
    padPrev.r2 = (bv[7] || 0) > 0.3;
    padPrev.ax = Math.abs(ax[0]) > 0.6;
    padPrev.ay = Math.abs(ax[1]) > 0.6;
    for (const k in pressedNow) delete pressedNow[k];
    mouse.pressed = mouse.rpressed = false;
    anyKey = false;
  },
  // key name hints for on-screen prompts
  hint(action) {
    if (this.lastDevice === 'touch' || (this.touch && this.touch.enabled && this.lastDevice !== 'pad' && this.lastDevice !== 'key')) {
      return { confirm: 'TAP', back: 'BACK', nav: '\u25C2 \u25B8', pause: 'II' }[action] || action;
    }
    const pad = this.lastDevice === 'pad';
    const map = pad
      ? { confirm: 'X', back: 'O', fire: 'R2', mg: 'L2', alt: '△', nav: 'D-PAD', pause: 'START' }
      : { confirm: 'ENTER', back: 'ESC', fire: 'K', mg: 'J', alt: 'L', nav: '← →', pause: 'ESC' };
    return map[action] || action;
  },
};

function getPad() {
  if (!navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

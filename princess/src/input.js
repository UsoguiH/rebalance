// Keyboard, mouse and gamepad, folded into one per-frame control state.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, nx: 0, ny: 0, left: false, right: false, leftPressed: false, leftReleased: false, rightPressed: false, moved: false };
    this.usingPad = false;
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      this.pressed.add(k);
      this.usingPad = false;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = false;
    });
    canvas.addEventListener('mousemove', (e) => this.move(e));
    canvas.addEventListener('mousedown', (e) => {
      canvas.focus();
      this.move(e);
      if (e.button === 0) {
        this.mouse.left = true;
        this.mouse.leftPressed = true;
      }
      if (e.button === 2) {
        this.mouse.right = true;
        this.mouse.rightPressed = true;
      }
      this.usingPad = false;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.mouse.left) {
        this.mouse.left = false;
        this.mouse.leftReleased = true;
      }
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.padPrev = {};
  }
  move(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.nx = (this.mouse.x / r.width) * 2 - 1;
    this.mouse.ny = -(this.mouse.y / r.height) * 2 + 1;
    this.mouse.moved = true;
  }
  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }
  hit(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }
  // Gamepad snapshot: returns null when no pad.
  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find((q) => q && q.connected);
    if (!p) return null;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const st = {
      lx: dz(p.axes[0]), ly: dz(p.axes[1]), rx: dz(p.axes[2] || 0), ry: dz(p.axes[3] || 0),
      a: b(0), b: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), lt: b(6), rt: b(7), start: b(9), back: b(8),
    };
    const prev = this.padPrev;
    st.hit = (k) => st[k] && !prev[k];
    st.released = (k) => !st[k] && prev[k];
    this.padPrev = { ...st };
    if (st.lx || st.ly || st.rx || st.ry || st.a || st.b || st.x || st.y || st.rt || st.lt) this.usingPad = true;
    return st;
  }
  endFrame() {
    this.pressed.clear();
    this.mouse.leftPressed = false;
    this.mouse.leftReleased = false;
    this.mouse.rightPressed = false;
    this.mouse.moved = false;
  }
}

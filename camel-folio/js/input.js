// Keyboard uses e.code so controls work on Arabic (and any other) keyboard layouts.
const KEYS = {
  up: ['ArrowUp', 'KeyW', 'KeyZ'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA', 'KeyQ'],
  right: ['ArrowRight', 'KeyD'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
};

export class Input {
  constructor(canvas, joyEl) {
    this.down = new Set();
    this.stick = { x: 0, y: 0, run: false, active: false };
    this.jumpQueued = false;
    this.zoom = 1;
    this.enabled = false;
    this.handlers = {};
    this.joyEl = joyEl;
    this.knob = joyEl.querySelector('.knob');

    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.repeat && e.code === 'Space') { e.preventDefault(); return; }
      this.down.add(e.code);
      if (KEYS.jump.includes(e.code)) { this.jumpQueued = true; e.preventDefault(); }
      if (e.code.startsWith('Arrow')) e.preventDefault();
      this.emit('key', e);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());

    // Pointer drag anywhere on the canvas steers (touch, pen or mouse).
    this.pointers = new Map();
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    addEventListener('pointerup', (e) => this.onUp(e));
    addEventListener('pointercancel', (e) => this.onUp(e));

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.min(1.7, Math.max(0.55, this.zoom * (1 + Math.sign(e.deltaY) * 0.08)));
    }, { passive: false });
  }

  on(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name, arg) { (this.handlers[name] || []).forEach((f) => f(arg)); }

  onDown(e) {
    if (!this.enabled) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (this.pointers.size === 2) {
      // Second finger: switch to pinch.
      this.releaseStick();
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom };
    } else if (this.pointers.size === 1) {
      this.stickId = e.pointerId;
      this.stick.active = true;
      this.joyEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.joyEl.classList.add('on');
      this.knob.style.transform = 'translate(-50%, -50%)';
    }
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoom = Math.min(1.7, Math.max(0.55, this.pinch.zoom * (this.pinch.d / Math.max(20, d))));
      return;
    }
    if (e.pointerId === this.stickId) {
      const R = 56;
      let dx = p.x - p.sx, dy = p.y - p.sy;
      const d = Math.hypot(dx, dy);
      this.stick.x = Math.max(-1, Math.min(1, dx / R));
      this.stick.y = Math.max(-1, Math.min(1, -dy / R));
      const m = Math.hypot(this.stick.x, this.stick.y);
      if (m > 1) { this.stick.x /= m; this.stick.y /= m; }
      // Dragging well past the ring means run.
      this.stick.run = d > R * 1.6;
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joyEl.classList.toggle('run', this.stick.run);
    }
  }

  onUp(e) {
    this.pointers.delete(e.pointerId);
    if (e.pointerId === this.stickId) this.releaseStick();
    if (this.pointers.size < 2) this.pinch = null;
  }

  releaseStick() {
    this.stickId = null;
    this.stick = { x: 0, y: 0, run: false, active: false };
    this.joyEl.classList.remove('on', 'run');
  }

  has(action) { return KEYS[action].some((k) => this.down.has(k)); }

  // Screen-space movement: x right, y up.
  read() {
    if (!this.enabled) return { x: 0, y: 0, run: false, jump: false };
    let x = 0, y = 0;
    if (this.has('up')) y += 1;
    if (this.has('down')) y -= 1;
    if (this.has('left')) x -= 1;
    if (this.has('right')) x += 1;
    let run = this.has('run');
    if (this.stick.active) { x += this.stick.x; y += this.stick.y; run = run || this.stick.run; }
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return { x, y, run, jump };
  }
}

// التحكم: keyboard (arrows / WASD) plus a floating touch joystick.
//
// Keyboard steers like a vehicle: up/down for speed, left/right to turn.
// The joystick is camera-relative: push toward where you want to go and the
// camel turns and walks that way, faster the further you push.
//
// Other modules read the state each frame:
//   input.forward   -1..1   input.turn  -1..1   input.boost  bool
//   input.stick     null | { x, z, mag }  (world-space direction, mag 0..1)
//   input.take('jump' | 'interact' | 'grunt')  → true once per press
//   input.zoom      accumulated zoom delta (camera consumes and resets it)

export function createInput({ events, canvas }) {
  const keys = new Set();
  const pressed = new Set();
  let unlocked = false;

  const state = {
    forward: 0,
    turn: 0,
    boost: false,
    stick: null,
    zoom: 0,
    enabled: false,
    take(name) {
      if (pressed.has(name)) { pressed.delete(name); return true; }
      return false;
    },
    press(name) { pressed.add(name); },
  };

  function first() {
    if (unlocked) return;
    unlocked = true;
    events.emit('input:first');
  }

  const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '');

  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    first();
    const k = e.code;
    if (!keys.has(k)) {
      if (k === 'Space') pressed.add('jump');
      if (k === 'Enter' || k === 'KeyE') pressed.add('interact');
      if (k === 'KeyH') pressed.add('grunt');
      if (k === 'KeyM') events.emit('audio:toggle');
      if (k === 'Escape') events.emit('ui:escape');
      if (k === 'KeyR') events.emit('player:reset');
    }
    keys.add(k);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  canvas.addEventListener('wheel', (e) => {
    state.zoom += Math.sign(e.deltaY) * 0.08;
    e.preventDefault();
  }, { passive: false });

  // Floating joystick: appears where the finger (or mouse) goes down.
  const joy = document.createElement('div');
  joy.id = 'joy';
  joy.innerHTML = '<div class="ring"></div><div class="knob"></div>';
  document.body.appendChild(joy);
  const knob = joy.querySelector('.knob');
  const RADIUS = 56;
  let active = null; // { id, x0, y0 }
  const pinch = new Map();
  let pinchDist = 0;

  canvas.addEventListener('pointerdown', (e) => {
    first();
    if (e.pointerType === 'touch') {
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        active = null;
        joy.classList.remove('on');
        state.stick = null;
        return;
      }
    }
    if (active || !state.enabled) return;
    active = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
    joy.style.left = `${e.clientX}px`;
    joy.style.top = `${e.clientY}px`;
    knob.style.transform = 'translate(-50%, -50%)';
    joy.classList.add('on');
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pinch.has(e.pointerId)) {
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        state.zoom += (pinchDist - d) * 0.004;
        pinchDist = d;
        return;
      }
    }
    if (!active || e.pointerId !== active.id) return;
    let dx = e.clientX - active.x0, dy = e.clientY - active.y0;
    const len = Math.hypot(dx, dy);
    const mag = Math.min(1, len / RADIUS);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // Screen → world: the camera looks north (-Z) from the south, so screen
    // up is -Z and screen right is +X.
    state.stick = mag < 0.15 ? null : { x: dx / (len || 1), z: dy / (len || 1), mag };
  });

  const end = (e) => {
    pinch.delete(e.pointerId);
    if (active && e.pointerId === active.id) {
      active = null;
      state.stick = null;
      joy.classList.remove('on');
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  state.update = () => {
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    state.forward = state.enabled ? (up ? 1 : 0) - (down ? 1 : 0) : 0;
    state.turn = state.enabled ? (left ? 1 : 0) - (right ? 1 : 0) : 0;
    state.boost = state.enabled && (keys.has('ShiftLeft') || keys.has('ShiftRight') || (state.stick?.mag ?? 0) > 0.92);
    if (!state.enabled) { state.stick = null; pressed.delete('jump'); }
  };

  return state;
}

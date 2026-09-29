/* controls.js — unified input: keyboard, gamepad, and a floating-joystick touch layer.
 *
 *   const input = createInput(canvas);
 *   const { throttle, steer, sprint, brake, call, reset } = input.read();   // once per frame
 *
 * `call` and `reset` are one-shot pulses: true for exactly one read() after they were triggered.
 * The touch overlay is mounted into #ui-root (or <body>) and only shown when the device is touch
 * (pointer:coarse, or after the first real touch). No dependency on three.js.
 */

const TOUCH_LABELS = {
  ar: { sprint: 'عدو', call: 'نداء', brake: 'فرملة' },
  en: { sprint: 'SPRINT', call: 'CALL', brake: 'BRAKE' },
};

const ICONS = {
  sprint:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor"/></svg>',
  call:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h3.5L12 19V5L7.5 9z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  brake:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dz = (v, d) => {
  const a = Math.abs(v);
  return a < d ? 0 : Math.sign(v) * ((a - d) / (1 - d));
};

export function createInput(domElement) {
  const root = document.documentElement;
  const doc = document;
  const disposers = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    disposers.push(() => target.removeEventListener(type, fn, opts));
  };

  /* ---------------------------------------------------------------- state */
  const keys = new Set();
  let kbCall = false;
  let kbReset = false;
  let padCall = false;
  let padReset = false;
  let padWasCall = false;
  let padWasReset = false;
  let touchCall = false;

  const touch = { throttle: 0, steer: 0, sprint: false, brake: false, active: false };
  let sawTouch = false;
  const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : { matches: false };
  const setInputMode = (m) => {
    if (root.dataset.input !== m) root.dataset.input = m;
  };
  const isTouchDevice = () => coarse.matches || sawTouch;
  setInputMode(isTouchDevice() ? 'touch' : 'kbm');

  const modalOpen = () => root.hasAttribute('data-modal');

  /* ------------------------------------------------------------- keyboard */
  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ShiftLeft', 'ShiftRight', 'Space', 'KeyH', 'KeyE', 'KeyR',
  ]);
  const typing = (t) =>
    t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  on(window, 'keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!GAME_KEYS.has(e.code) || typing(e.target) || modalOpen()) return;
    if (!coarse.matches) setInputMode('kbm');
    // Space would otherwise scroll the page or click a focused button.
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) {
      if (e.code === 'KeyH' || e.code === 'KeyE') kbCall = true;
      else if (e.code === 'KeyR') kbReset = true;
    }
    keys.add(e.code);
  });
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => keys.clear());
  on(doc, 'visibilitychange', () => { if (doc.hidden) keys.clear(); });

  /* -------------------------------------------------------------- gamepad */
  let padState = { throttle: 0, steer: 0, sprint: false, brake: false, on: false };
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) {
      padState = { throttle: 0, steer: 0, sprint: false, brake: false, on: false };
      padWasCall = padWasReset = false;
      return;
    }
    const ax = (i) => gp.axes[i] || 0;
    const bt = (i) => (gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0);
    const pr = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    let sx = ax(0), sy = ax(1);
    const mag = Math.hypot(sx, sy);
    const m = dz(mag, 0.16);
    if (mag > 0) { sx = (sx / mag) * m; sy = (sy / mag) * m; } else { sx = sy = 0; }
    let steer = sx;
    let throttle = -sy;
    if (pr(12)) throttle = 1; else if (pr(13)) throttle = -1;
    if (pr(14)) steer = -1; else if (pr(15)) steer = 1;
    const rt = bt(7), lt = bt(6);
    if (Math.abs(throttle) < 0.05 && (rt > 0.05 || lt > 0.05)) throttle = clamp(rt - lt, -1, 1);
    padState = {
      throttle, steer,
      sprint: pr(0) || pr(5) || rt > 0.85,
      brake: pr(1) || (lt > 0.85 && Math.abs(throttle) < 0.05 && rt < 0.05) ,
      on: mag > 0.16 || pr(0) || pr(1) || rt > 0.05 || lt > 0.05,
    };
    const c = pr(2), r = pr(3) || pr(9);
    if (c && !padWasCall) padCall = true;
    if (r && !padWasReset) padReset = true;
    padWasCall = c; padWasReset = r;
  }

  /* ---------------------------------------------------------- touch layer */
  const host = doc.getElementById('ui-root') || doc.body;
  const layer = doc.createElement('div');
  layer.className = 'touch-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    '<div class="tl-zone"></div><div class="tl-hint"></div>' +
    '<div class="tl-stick" hidden><div class="tl-base"></div><div class="tl-knob"></div></div>' +
    '<div class="tl-buttons">' +
    '<button type="button" class="tl-btn tl-brake" data-btn="brake" tabindex="-1">' + ICONS.brake + '<span></span></button>' +
    '<button type="button" class="tl-btn tl-call" data-btn="call" tabindex="-1">' + ICONS.call + '<span></span></button>' +
    '<button type="button" class="tl-btn tl-sprint" data-btn="sprint" tabindex="-1">' + ICONS.sprint + '<span></span></button>' +
    '</div>';
  host.appendChild(layer);
  disposers.push(() => layer.remove());

  const zone = layer.querySelector('.tl-zone');
  const stick = layer.querySelector('.tl-stick');
  const base = layer.querySelector('.tl-base');
  const knob = layer.querySelector('.tl-knob');
  const buttons = {
    sprint: layer.querySelector('.tl-sprint'),
    call: layer.querySelector('.tl-call'),
    brake: layer.querySelector('.tl-brake'),
  };

  function setLabels() {
    const lang = (root.lang || 'ar').slice(0, 2);
    const l = TOUCH_LABELS[lang] || TOUCH_LABELS.ar;
    for (const k of Object.keys(buttons)) {
      buttons[k].querySelector('span').textContent = l[k];
      buttons[k].setAttribute('aria-label', l[k]);
    }
  }
  setLabels();
  const mo = new MutationObserver(setLabels);
  mo.observe(root, { attributes: true, attributeFilter: ['lang'] });
  disposers.push(() => mo.disconnect());

  // Any real touch flips the UI into touch mode (hybrid laptops).
  on(window, 'pointerdown', (e) => {
    if (e.pointerType === 'touch') { sawTouch = true; setInputMode('touch'); }
  }, { capture: true, passive: true });

  // Kill browser gestures on the game surface.
  const stop = (e) => e.preventDefault();
  on(doc, 'gesturestart', stop);
  on(doc, 'gesturechange', stop);
  on(layer, 'contextmenu', stop);
  on(layer, 'dblclick', stop);
  on(layer, 'touchmove', stop, { passive: false });
  on(layer, 'touchstart', stop, { passive: false });

  // Floating joystick ------------------------------------------------------
  let stickId = null;
  let cx = 0, cy = 0;       // base centre (client px)
  let radius = 60;
  const DEAD = 0.14;

  function stickRadius() {
    return clamp(Math.min(innerWidth, innerHeight) * 0.13, 44, 74);
  }
  function placeStick() {
    stick.style.setProperty('--x', cx + 'px');
    stick.style.setProperty('--y', cy + 'px');
    stick.style.setProperty('--r', radius + 'px');
  }
  function moveStick(px, py) {
    let dx = px - cx, dy = py - cy;
    const d = Math.hypot(dx, dy);
    if (d > radius) {
      // dynamic base: the base follows the thumb so it never runs out of travel
      const k = (d - radius) / d;
      cx += dx * k; cy += dy * k;
      dx = px - cx; dy = py - cy;
      placeStick();
    }
    const nx = clamp(dx / radius, -1, 1);
    const ny = clamp(dy / radius, -1, 1);
    knob.style.transform = `translate(${nx * radius}px, ${ny * radius}px)`;
    // radial dead zone, then a gentle curve for finer control near the centre
    const m = Math.hypot(nx, ny);
    const mm = dz(m, DEAD);
    const sx = m > 0 ? (nx / m) * mm : 0;
    const sy = m > 0 ? (ny / m) * mm : 0;
    touch.steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.15);
    touch.throttle = -Math.sign(sy) * Math.pow(Math.abs(sy), 1.1);
    // straight-up thumbs: suppress accidental tiny steering
    if (Math.abs(touch.steer) < 0.08) touch.steer = 0;
  }
  function endStick() {
    stickId = null;
    touch.steer = 0;
    touch.throttle = 0;
    stick.hidden = true;
    knob.style.transform = '';
  }
  on(zone, 'pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (stickId !== null || modalOpen()) return;
    stickId = e.pointerId;
    layer.classList.add('used');
    try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    radius = stickRadius();
    cx = e.clientX; cy = e.clientY;
    // keep the whole base on screen
    cx = clamp(cx, radius + 8, innerWidth - radius - 8);
    cy = clamp(cy, radius + 8, innerHeight - radius - 8);
    stick.hidden = false;
    placeStick();
    moveStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  on(zone, 'pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    moveStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  const upStick = (e) => { if (e.pointerId === stickId) endStick(); };
  on(zone, 'pointerup', upStick);
  on(zone, 'pointercancel', upStick);
  on(zone, 'lostpointercapture', upStick);

  // Round buttons ------------------------------------------------------------
  const held = { sprint: null, brake: null, call: null }; // pointerId per button
  for (const [name, el] of Object.entries(buttons)) {
    on(el, 'pointerdown', (e) => {
      if (held[name] !== null || modalOpen()) return;
      held[name] = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      el.classList.add('is-down');
      if (name === 'sprint') touch.sprint = true;
      else if (name === 'brake') touch.brake = true;
      else if (name === 'call') touchCall = true;
      if (navigator.vibrate) { try { navigator.vibrate(name === 'call' ? 18 : 8); } catch (_) { /* ignore */ } }
      e.preventDefault();
    });
    const release = (e) => {
      if (e.pointerId !== held[name]) return;
      held[name] = null;
      el.classList.remove('is-down');
      if (name === 'sprint') touch.sprint = false;
      else if (name === 'brake') touch.brake = false;
    };
    on(el, 'pointerup', release);
    on(el, 'pointercancel', release);
    on(el, 'lostpointercapture', release);
  }

  function releaseAllTouch() {
    if (stickId !== null) endStick();
    for (const [name, el] of Object.entries(buttons)) {
      held[name] = null;
      el.classList.remove('is-down');
    }
    touch.sprint = touch.brake = false;
  }

  /* ----------------------------------------------------------------- read */
  const out = { throttle: 0, steer: 0, sprint: false, brake: false, call: false, reset: false };
  function read() {
    if (modalOpen()) {
      releaseAllTouch();
      keys.clear();
      kbCall = kbReset = padCall = padReset = touchCall = false;
      out.throttle = 0; out.steer = 0; out.sprint = false; out.brake = false; out.call = false; out.reset = false;
      return out;
    }
    pollGamepad();
    if (padState.on && !coarse.matches) setInputMode('kbm');

    let kt = 0, ks = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) kt += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) kt -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ks += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ks -= 1;
    if (kt !== 0 && ks !== 0) { kt *= 0.9; }   // slight softening on diagonals

    const pick = (a, b, c) => {
      let best = a;
      if (Math.abs(b) > Math.abs(best)) best = b;
      if (Math.abs(c) > Math.abs(best)) best = c;
      return best;
    };
    out.throttle = clamp(pick(kt, padState.throttle, touch.throttle), -1, 1);
    out.steer = clamp(pick(ks, padState.steer, touch.steer), -1, 1);
    out.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || padState.sprint || touch.sprint;
    out.brake = keys.has('Space') || padState.brake || touch.brake;
    out.call = kbCall || padCall || touchCall;
    out.reset = kbReset || padReset;
    kbCall = kbReset = padCall = padReset = touchCall = false;
    return out;
  }

  function dispose() {
    for (const d of disposers.splice(0)) d();
    keys.clear();
  }

  return {
    read,
    dispose,
    get isTouch() { return isTouchDevice(); },
    /** Optional: force-hide/show the touch layer (main normally never needs this). */
    setTouchVisible(v) { layer.style.display = v ? '' : 'none'; },
  };
}

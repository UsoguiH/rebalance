// anim.js: brings the ORIGINAL character art to life.
// The pixels are the reference sheet's own, cut into layers at their pivots by
// tools/build_layers.py (body, head, hands/arms, crown, sparks). Nothing is redrawn,
// except the live eyes, which repaint the art's own eye white and pupil so they can glance and blink.
//
// Every channel = key poses (flow) + idle waves + follow-through (a delayed read) + accents.
import { flow, track, seg, win, wave, loop, bell, seeded, mix, clamp, blinks, keepVolume, EASE_OUT } from './motion.js';

const F = (keys) => (t) => flow(t, keys);
const back = (p) => { const c = 1.9; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; }; // pop-in with overshoot
const pop = (t, a, b, inMs = 320, outMs = 220) => (t < a || t > b ? 0 : t < a + inMs ? back(clamp((t - a) / inMs)) : t > b - outMs ? 1 - seg(t, b - outMs, b, 'in') : 1);

// ───────────── effects (stage space: 400 × 540, floor at y = 512, character centred on x = 200)
const star = (x, y, s, rot = 0, fill = '#ffc800') => s <= 0.01 ? '' :
  `<path transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(3)})" d="M0,-12 Q2,-2 12,0 Q2,2 0,12 Q-2,2 -12,0 Q-2,-2 0,-12 Z" fill="${fill}"/>`;
function twinkles(t, pts, period = 1500) {
  return pts.map(([x, y, sz], i) => { const p = loop(t, period, seeded(i, 7)); return star(x, y, bell(clamp(p * 2.2)) * sz, p * 90, i % 2 ? '#ffe066' : '#ffc800'); }).join('');
}
function confetti(t, t0, x0, y0, n = 24, salt = 0) {
  const s = (t - t0) / 1000;
  if (s < 0 || s > 1.8) return '';
  const cols = ['#58cc02', '#1cb0f6', '#ff4b4b', '#ffc800', '#ce82ff', '#ff9600'];
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (seeded(i, salt + 1) - 0.5) * 2.6, v = 190 + seeded(i, salt + 2) * 190;
    const x = x0 + Math.cos(a) * v * s + 14 * Math.sin(s * 6 + i), y = y0 + Math.sin(a) * v * s + 360 * s * s;
    const k = s > 1.4 ? 1 - (s - 1.4) / 0.4 : Math.min(1, s / 0.08), c = cols[i % 6];
    o += i % 3 === 0 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.5 * k).toFixed(2)}" fill="${c}"/>`
      : `<rect x="-6" y="-3.5" width="12" height="7" rx="2" fill="${c}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${((s * 600 * (i % 2 ? 1 : -1)) % 360).toFixed(0)}) scale(${k.toFixed(3)},${(k * Math.abs(Math.cos(s * 9 + i))).toFixed(3)})"/>`;
  }
  return o;
}
function zzz(t, x, y) {
  let o = '';
  for (let i = 0; i < 3; i++) {
    const p = loop(t, 2700, i / 3);
    o += `<text x="${(x + p * 40 + 7 * Math.sin(p * 7)).toFixed(1)}" y="${(y - p * 80).toFixed(1)}" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="${(20 + p * 22).toFixed(1)}" fill="#7c3aed" opacity="${bell(p).toFixed(2)}">z</text>`;
  }
  return o;
}
function drop(x, y, s, fill = '#7dd3fc') {
  return s <= 0.02 ? '' : `<path transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})" d="M0,-12 C5,-4 9,0 9,6 A9,9 0 0 1 -9,6 C-9,0 -5,-4 0,-12 Z" fill="${fill}"/>`;
}
function puff(x, y, p, n = 3, size = 10) {
  if (p <= 0 || p >= 1) return '';
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 0.95, d = 6 + p * 30;
    o += `<circle cx="${(x + Math.sin(a) * d * 1.5).toFixed(1)}" cy="${(y - p * 8 - Math.abs(Math.cos(a)) * d * 0.2).toFixed(1)}" r="${(size * (0.5 + p * 0.7)).toFixed(1)}" fill="#e7d6c1" opacity="${(1 - p).toFixed(2)}"/>`;
  }
  return o;
}
function speedLines(x, y, p, ang = -90) {
  if (p <= 0 || p >= 1) return '';
  let o = '';
  [-30, 0, 30].forEach((d) => {
    const r = ((ang + d) * Math.PI) / 180, r0 = 14 + 22 * clamp((p - 0.3) * 1.6), r1 = 16 + 26 * clamp(p * 2.2);
    if (r1 - r0 > 0.5) o += `<path d="M${(x + Math.cos(r) * r0).toFixed(1)},${(y + Math.sin(r) * r0).toFixed(1)} L${(x + Math.cos(r) * r1).toFixed(1)},${(y + Math.sin(r) * r1).toFixed(1)}" stroke="#ffc800" stroke-width="5" stroke-linecap="round"/>`;
  });
  return o;
}

// ───────────── a fresh set of channels
const base = () => ({
  x: 0, lift: 0, sx: 1, sy: 1, rot: 0, // whole body, around the feet
  hx: 0, hy: 0, tilt: 0, // head, around the neck
  lookX: 0, lookY: 0, lid: 0, // live eyes
  parts: {}, // name → { rot, x, y, s }
  fxBack: '', fxFront: '',
});
function breathe(t, c, period = 3000, k = 1) {
  c.sy *= 1 + 0.011 * k * wave(t, period);
  c.sx *= 1 - 0.006 * k * wave(t, period);
  c.hy += -1.2 * k * wave(t, period, -0.08); // the head rides the breath a beat later
}

// ═════════════════════════════ the ten poses ═════════════════════════════
export const POSES = [
  { id: 'idle', ar: 'وقفة هادئة', en: 'Idle', period: 6000, frame(t) {
    const c = base();
    breathe(t, c);
    c.rot = 0.7 * wave(t, 6000, 0.1);
    const turn = F([[0, 0], [1700, 0], [2100, -1], [3400, -1], [3800, 0.25], [4200, 0], [6000, 0]]);
    c.tilt = 2.2 * wave(t, 6000, 0.3) + 2.5 * turn(t) - 0.45 * c.rot;
    c.lookX = 0.7 * F([[0, 0], [1600, 0], [1850, -1], [3350, -1], [3650, 0.6], [4400, 0.6], [4700, 0], [6000, 0]])(t);
    c.lookY = F([[0, 0], [1850, -0.4], [3350, -0.4], [3650, 0], [6000, 0]])(t);
    c.lid = blinks(t, [1700, 3550, 5300, 5520]);
    c.hx = -1.5 * turn(t);
    return c;
  } },

  { id: 'wave', ar: 'أهلاً!', en: 'Hello wave', period: 3600, frame(t) {
    const c = base();
    breathe(t, c, 1800, 0.7);
    const on = win(t, 150, 3300, 260);
    const w = wave(t, 640);
    c.parts.hand = { rot: 16 * on * w + 3 * wave(t, 1800) };
    const bounce = Math.abs(wave(t, 1280, 0.1)) * on;
    c.lift = 0; c.sy *= 1 - 0.025 * bounce; c.sx *= keepVolume(1 - 0.025 * bounce);
    c.rot = -1.5 * on + 1 * wave(t, 1280, 0.35) * on;
    c.tilt = -4 * on + 2.4 * wave(t, 1280, 0.6) * on;
    c.lookX = -0.2 * on; c.lookY = -0.15 * on;
    c.lid = blinks(t, [60, 2300]);
    c.hy += 2 * bounce;
    return c;
  } },

  { id: 'jump', ar: 'فرحة النجاح', en: 'Celebrate', period: 2400, frame(t) {
    // He's mid-jump in the art: he lands, squashes, and springs up again, arms pumping.
    const c = base();
    const L = 900, U = 1150, TOP = 1750; // land, take-off, peak
    let lift;
    if (t < L) { const p = (t + 2400 - TOP) / (2400 - TOP + L); lift = 46 * (1 - p * p); } // falling from the peak
    else if (t < U) lift = 0;
    else if (t < TOP) { const p = (t - U) / (TOP - U); lift = 46 * (1 - (1 - p) * (1 - p)); } // rising, slowing
    else { const p = (t - TOP) / (2400 - TOP + L); lift = 46 * (1 - p * p); }
    c.lift = lift + 10;
    const sq = F([[0, 0], [L - 120, -0.06], [L, 0], [L + 70, 1], [U - 70, 0.75], [U, -0.25], [U + 160, -0.1], [TOP, 0], [2400, 0]])(t);
    c.sy = 1 - 0.17 * sq; c.sx = keepVolume(c.sy);
    const pump = wave(t, 600);
    c.parts.armL = { rot: -10 * pump - 6 * sq };
    c.parts.armR = { rot: 10 * pump + 6 * sq };
    c.tilt = 3 * wave(t, 1200) - 4 * sq;
    c.hy = 6 * sq + 2 * (lift > 2 ? -1 : 0);
    c.rot = 2 * wave(t, 2400, 0.2);
    c.fxBack = confetti(t, TOP - 200, 180, 60, 30, 1) + confetti(t + 2400, TOP - 200, 180, 60, 30, 1) + twinkles(t, [[40, 120, 1.2], [320, 90, 1], [300, 250, 0.8], [50, 260, 0.7], [180, 20, 0.9]], 1200) + puff(180, 452, seg(t, L, L + 650), 3, 9);
    c.shadowK = 1 - lift / 150;
    return c;
  } },

  { id: 'proud', ar: 'واثق', en: 'Proud', period: 5000, frame(t) {
    const c = base();
    breathe(t, c, 2500, 1.4);
    const nod = F([[0, 0], [1100, 0], [1350, 1], [1600, 0.1], [1850, 0.85], [2150, 0], [5000, 0]]);
    const puffUp = F([[0, 0], [2700, 0], [3200, 1], [4200, 1], [4700, 0], [5000, 0]])(t);
    c.sy *= 1 + 0.03 * puffUp; c.sx *= 1 + 0.015 * puffUp;
    c.rot = -1.4 + 0.8 * wave(t, 5000);
    c.tilt = -3 * puffUp + 5 * nod(t) + 1.2 * wave(t, 2500, 0.2);
    c.hy += 4 * nod(t) - 2 * puffUp;
    c.fxBack = twinkles(t, [[30, 70, 1], [320, 60, 0.9], [330, 200, 0.7]], 1700) + star(250, 60, bell(seg(t, 3150, 3700, 'lin')) * 1.8, 0);
    return c;
  } },

  { id: 'determined', ar: 'حماس وجدّية', en: 'Determined', period: 4000, frame(t) {
    const c = base();
    breathe(t, c, 2000, 0.8);
    const S = 1300; // stomp
    const sq = F([[0, 0], [800, 0], [1150, -1], [S, 0], [S + 70, 1], [S + 260, -0.25], [S + 450, 0.08], [S + 650, 0], [4000, 0]])(t);
    c.sy *= 1 - 0.09 * sq; c.sx *= keepVolume(1 - 0.09 * sq);
    c.lift = 16 * Math.max(0, -F([[0, 0], [800, 0], [1150, 1], [S, 0], [4000, 0]])(t));
    c.tilt = 3 * sq + 1.5 * wave(t, 2000);
    c.hy += 5 * sq;
    c.rot = 0.6 * wave(t, 4000);
    c.x = 1.6 * wave(t, 90) * win(t, S + 40, S + 420, 80); // a rumble
    c.lookX = 0.15 * wave(t, 760) * win(t, 2200, 3400, 200);
    c.lid = Math.max(0.12, blinks(t, [S - 80, 3500], 0.12));
    c.fxBack = puff(110, 452, seg(t, S + 30, S + 700), 3, 10) + puff(250, 452, seg(t, S + 30, S + 700), 3, 10);
    c.fxFront = speedLines(64, 286, seg(t, S + 20, S + 420, 'lin'), -150);
    return c;
  } },

  { id: 'teach', ar: 'الشرح', en: 'Teaching', period: 4200, frame(t) {
    const c = base();
    breathe(t, c, 2100, 0.8);
    const taps = [600, 1050, 2600];
    let tap = 0;
    for (const k of taps) if (t > k - 240 && t < k + 280) tap += track(t, [[k - 240, 0], [k - 40, 1], [k + 60, -0.3], [k + 280, 0, 'out']]);
    const reach = F([[0, 0], [400, 1], [1400, 1], [1900, 0], [2300, 1], [3000, 1], [3500, 0], [4200, 0]])(t);
    c.parts.pointer = { rot: -5 * reach + 9 * tap };
    let sp = 0;
    for (const k of taps) sp = Math.max(sp, t > k - 40 && t < k + 380 ? bell((t - k + 40) / 420) : 0);
    c.parts.sparks = { s: 0.25 + 0.95 * sp, rot: -8 * sp, o: clamp(sp * 3) };
    c.rot = -1.2 * reach + 0.6 * tap;
    c.tilt = -4 * reach + 1.5 * wave(t, 2100, 0.3);
    c.lookX = -0.9 * reach; c.lookY = -0.55 * reach;
    c.lid = blinks(t, [280, 1600, 3300]);
    c.hy += 1.5 * tap;
    return c;
  } },

  { id: 'oops', ar: 'أوه لا!', en: 'Oops!', period: 4200, frame(t) {
    const c = base();
    const S = 350;
    const startle = F([[0, 0], [S - 60, 0], [S + 140, 1], [2800, 1], [3400, 0], [4200, 0]])(t);
    const hop = t > S - 40 && t < S + 330 ? track(t, [[S - 40, 0], [S + 130, 1, 'out'], [S + 330, 0]]) : 0;
    c.lift = 18 * hop;
    const land = F([[0, 0], [S + 300, 0], [S + 360, 1], [S + 520, -0.2], [S + 700, 0], [4200, 0]])(t);
    c.sy = 1 - 0.08 * land + 0.05 * hop; c.sx = keepVolume(c.sy);
    c.x = -10 * startle;
    const shake = wave(t, 120) * win(t, S + 350, 1700, 160);
    c.parts.hand = { rot: 7 * shake - 6 * startle };
    c.rot = -2.5 * startle + 0.5 * shake;
    c.tilt = 5 * startle + 1.2 * shake;
    const relief = win(t, 2900, 3900, 250);
    breathe(t, c, 1000, 2.2 * relief + 0.5);
    c.lookX = mix(0.6 * startle, -0.6, win(t, 1500, 2600, 220));
    c.lookY = -0.2 * startle;
    c.lid = Math.max(blinks(t, [S - 80, 2050, 3950]), 0.55 * relief);
    const dp = seg(t, S + 300, 2800, 'lin');
    c.fxFront = drop(258 + c.x - dp * 3, 120 + dp * 50, startle * (1 - seg(t, 2550, 2800, 'in'))) + puff(196 + c.x, 215, seg(t, 3050, 3800), 2, 7);
    return c;
  } },

  { id: 'read', ar: 'القراءة', en: 'Reading', period: 6000, frame(t) {
    // his eyes are half-closed in the art, so the head does the reading: line by line, right to left
    const c = base();
    breathe(t, c, 3000, 0.9);
    const line = (t % 1250) / 1250;
    const scan = t < 3750 ? (line < 0.8 ? mix(1, -1, line / 0.8) : mix(-1, 1, EASE_OUT((line - 0.8) / 0.2))) : 1;
    c.tilt = -2.2 * scan * (t < 3750 ? 1 : 1 - seg(t, 3750, 4100)) + 3 * win(t, 4300, 5600, 400);
    c.hy += t < 3750 ? (Math.floor(t / 1250) * 1.2) * (1 - seg(t, 3600, 3750)) : 0;
    const aha = win(t, 4300, 5600, 300);
    c.hy -= 4 * aha; c.sy *= 1 + 0.02 * aha;
    c.fxFront = star(258, 70, bell(seg(t, 4350, 4900, 'lin')) * 1.9, 0) + star(286, 104, bell(seg(t, 4420, 4980, 'lin')) * 1.1, 20);
    return c;
  } },

  { id: 'sleep', ar: 'نعسان', en: 'Sleepy', period: 5600, frame(t) {
    const c = base();
    breathe(t, c, 2800, 2.4);
    const droop = F([[0, 0], [2500, 1], [2900, 1.15], [3120, -0.25], [3500, 0.05], [5600, 0]])(t);
    c.tilt = 7 * droop; c.hy += 7 * droop;
    c.rot = 0.6 * wave(t, 5600);
    c.hx = 2 * droop;
    c.fxFront = zzz(t, 232, 92);
    return c;
  } },

  { id: 'champion', ar: 'البطل', en: 'Champion', period: 4400, frame(t) {
    const c = base();
    breathe(t, c, 2200, 0.8);
    // the crown hops off his hair and lands again with a squash, then wobbles
    const D0 = 300, D1 = 650;
    const hop = t > D0 && t < D1 ? Math.sin(Math.PI * (t - D0) / (D1 - D0)) : 0;
    const land = F([[0, 0], [D1, 0], [D1 + 70, 1], [D1 + 220, -0.45], [D1 + 380, 0.15], [D1 + 540, 0], [4400, 0]])(t);
    const wob = win(t, D1 + 300, 2600, 300) * wave(t, 700);
    c.parts.crown = { y: -12 * hop + 1.5 * land, rot: -9 * hop + 4 * land + 5 * wob, sx: 1 + 0.12 * land, sy: 1 - 0.16 * land + 0.06 * hop };
    const cheer = win(t, D1 + 100, 3700, 300);
    c.parts.book = { rot: -12 * cheer * Math.abs(wave(t, 900)) + 4 * land };
    c.sy *= 1 - 0.05 * land; c.sx *= keepVolume(1 - 0.05 * land);
    c.tilt = 3 * land + 2 * wave(t, 2200, 0.3) - 2 * cheer;
    c.hy += 3 * land;
    c.lookX = 0.5 * cheer; c.lookY = -0.6 * cheer;
    c.lid = Math.max(blinks(t, [2700]), 0.35 * Math.max(0, land));
    c.fxBack = twinkles(t, [[40, 110, 1.1], [330, 70, 1], [340, 210, 0.8], [30, 250, 0.7], [270, 10, 0.9], [70, 20, 0.9]], 1500);
    c.fxFront = star(220, 50, bell(seg(t, D1, D1 + 520, 'lin')) * 1.8) + star(186, 40, bell(seg(t, D1 + 60, D1 + 540, 'lin')) * 1.1, 20) + star(256, 40, bell(seg(t, D1 + 30, D1 + 500, 'lin')) * 1.2, -10);
    return c;
  } },
];

// ═════════════════════════════ the player ═════════════════════════════
// One stage per pose: 360 × 480 stage units = the sheet's own pixels. Floor at y = 452.
export const STAGE = { w: 400, h: 540, floor: 512 };
const PARTS_BEHIND_HEAD = new Set(); // all parts are drawn over the head (they sit beside it in the art)

export function mountStage(el, pose, L, base = 'img/') {
  const m = L[pose.id];
  const left = Math.min(Math.max(STAGE.w / 2 - m.foot[0], 4), STAGE.w - m.w - 4), top = STAGE.floor - m.foot[1];
  el.innerHTML = `
    <div class="tw-stage" dir="ltr" style="position:absolute;left:0;top:0;width:${STAGE.w}px;height:${STAGE.h}px;transform-origin:0 0">
      <div class="tw-shadow" style="position:absolute;left:${STAGE.w / 2 - 82}px;top:${STAGE.floor - 9}px;width:164px;height:18px;border-radius:50%;background:rgba(80,50,110,.14)"></div>
      <svg class="tw-fxb" viewBox="0 0 ${STAGE.w} ${STAGE.h}" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"></svg>
      <div class="tw-char" style="position:absolute;left:${left}px;top:${top}px;width:${m.w}px;height:${m.h}px;transform-origin:${m.foot[0]}px ${m.foot[1]}px">
        ${m.headBehind ? headHTML(pose, m, base) : ''}
        <img src="${base}${pose.id}-body.png" style="position:absolute;inset:0" alt="" draggable="false">
        ${m.headBehind ? '' : headHTML(pose, m, base)}
        ${Object.entries(m.parts).filter(([n]) => n !== 'crown').map(([n, p]) => `<img class="tw-p" data-p="${n}" src="${base}${pose.id}-${n}.png" style="position:absolute;inset:0;transform-origin:${p.pivot[0]}px ${p.pivot[1]}px" alt="" draggable="false">`).join('')}
      </div>
      <svg class="tw-fxf" viewBox="0 0 ${STAGE.w} ${STAGE.h}" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"></svg>
    </div>`;
  const q = (s) => el.querySelector(s);
  const S = {
    el, pose, m, stage: q('.tw-stage'), char: q('.tw-char'), head: q('.tw-head'), shadow: q('.tw-shadow'),
    fxb: q('.tw-fxb'), fxf: q('.tw-fxf'), parts: {}, eyes: [...el.querySelectorAll('.tw-eye')], lids: [...el.querySelectorAll('.tw-lids')],
  };
  el.querySelectorAll('[data-p]').forEach((n) => (S.parts[n.dataset.p] = n));
  fit(S);
  return S;
}

function headHTML(pose, m, base) {
  const crown = m.parts.crown ? `<img data-p="crown" src="${base}${pose.id}-crown.png" style="position:absolute;inset:0;transform-origin:${m.parts.crown.pivot[0]}px ${m.parts.crown.pivot[1]}px" alt="" draggable="false">` : '';
  // live eyes, drawn UNDER the head layer (which has the eyes punched out), so the original glasses and
  // eye outline stay on top; the art's own white and pupil colours, so the pupil can travel and the lid can close
  const ids = m.eyes.map((e, i) => `${pose.id}${i}${Math.random().toString(36).slice(2, 7)}`);
  const eyes = m.eyes.map((e, i) => `<g class="tw-eye">
      <clipPath id="c${ids[i]}"><circle cx="${e.cx}" cy="${e.cy}" r="${e.r + 0.6}"/></clipPath>
      <circle cx="${e.cx}" cy="${e.cy}" r="${e.r + 0.4}" fill="#f9f9fa"/>
      <circle class="tw-pupil" clip-path="url(#c${ids[i]})" cx="${e.px}" cy="${e.py}" r="${e.pr + 0.6}" fill="${e.pupil}"/>
    </g>`).join('');
  // the lids go ABOVE the head layer (they must cover the eye's soft edge when closed)
  const lids = m.eyes.map((e, i) => `<g class="tw-lids">
      <clipPath id="l${ids[i]}"><circle cx="${e.cx}" cy="${e.cy}" r="${e.r + 2.8}"/></clipPath>
      <g clip-path="url(#l${ids[i]})">
        <path class="tw-lid" d="" fill="${e.skin}"/>
        <path class="tw-lash" d="" fill="none" stroke="#3b2417" stroke-width="2.2" stroke-linecap="round"/>
      </g>
    </g>`).join('');
  const svg = (inner) => `<svg viewBox="0 0 ${m.w} ${m.h}" style="position:absolute;inset:0;width:${m.w}px;height:${m.h}px;overflow:visible">${inner}</svg>`;
  return `<div class="tw-head" style="position:absolute;inset:0;transform-origin:${m.neck[0]}px ${m.neck[1]}px">
    ${eyes ? svg(eyes) : ''}
    <img src="${base}${pose.id}-head.png" style="position:absolute;inset:0" alt="" draggable="false">
    ${lids ? svg(lids) : ''}
    ${crown}
  </div>`;
}

export function fit(S) {
  const w = S.el.clientWidth || STAGE.w;
  S.stage.style.transform = `scale(${w / STAGE.w})`;
  S.el.style.height = `${(w / STAGE.w) * STAGE.h}px`;
}

const n2 = (v) => (Math.round(v * 100) / 100).toString();
export function render(S, ms) {
  const P = S.pose, t = ((ms % P.period) + P.period) % P.period;
  const c = P.frame(t);
  S.char.style.transform = `translate(${n2(c.x)}px,${n2(-c.lift)}px) rotate(${n2(c.rot)}deg) scale(${n2(c.sx)},${n2(c.sy)})`;
  S.head.style.transform = `translate(${n2(c.hx)}px,${n2(c.hy)}px) rotate(${n2(c.tilt)}deg)`;
  const k = c.shadowK ?? 1 - c.lift / 260;
  S.shadow.style.transform = `translateX(${n2(c.x)}px) scale(${n2(Math.max(0.4, k))})`;
  for (const [n, el] of Object.entries(S.parts)) {
    const p = c.parts[n] || {};
    el.style.transform = `translate(${n2(p.x || 0)}px,${n2(p.y || 0)}px) rotate(${n2(p.rot || 0)}deg) scale(${n2(p.sx ?? p.s ?? 1)},${n2(p.sy ?? p.s ?? 1)})`;
    if (p.o !== undefined) el.style.opacity = n2(p.o);
  }
  S.eyes.forEach((g, i) => {
    const e = S.m.eyes[i];
    const reach = Math.max(1.5, (e.r - e.pr) * 0.5);
    const pu = g.querySelector('.tw-pupil');
    pu.setAttribute('cx', n2(e.px + c.lookX * reach));
    pu.setAttribute('cy', n2(e.py + c.lookY * reach * 0.8));
    // upper lid comes down, the lower lid rises 15% to meet it (the eye closes near its middle)
    const top = e.cy - e.r - 2, yc = e.cy + e.r * 0.15;
    const yl = top + (yc - top) * c.lid, sag = 3 + 2 * c.lid;
    const low = e.cy + e.r + 2 - (e.cy + e.r + 2 - yc) * Math.min(1, c.lid * 1.2) * 0.999;
    const x0 = e.cx - e.r - 2, x1 = e.cx + e.r + 2;
    S.lids[i].querySelector('.tw-lid').setAttribute('d', c.lid < 0.01 ? '' :
      `M${n2(x0)},${n2(top - 4)} H${n2(x1)} V${n2(yl)} Q${n2(e.cx)},${n2(yl + sag * 2)} ${n2(x0)},${n2(yl)} Z M${n2(x0)},${n2(e.cy + e.r + 4)} H${n2(x1)} V${n2(low)} Q${n2(e.cx)},${n2(low - 2)} ${n2(x0)},${n2(low)} Z`);
    const lash = S.lids[i].querySelector('.tw-lash');
    lash.setAttribute('d', c.lid < 0.55 ? '' : `M${n2(x0 + 3)},${n2(yl)} Q${n2(e.cx)},${n2(yl + sag * 2)} ${n2(x1 - 3)},${n2(yl)}`);
    lash.setAttribute('opacity', n2(clamp((c.lid - 0.55) * 3)));
  });
  S.fxb.innerHTML = `<g transform="translate(20,60)">${c.fxBack}</g>`; // effects are authored for a 360×480 frame
  S.fxf.innerHTML = `<g transform="translate(20,60)">${c.fxFront}</g>`;
}

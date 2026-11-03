// clips.js: the teacher's poses (وضعيات), as data.
//
// A clip is a loop: `keys` are key poses [ms, {channels}] read with `flow` (poses pass
// through each other and never stop dead). A key only names the channels it changes;
// the rest hold. The last key returns to the first, so every loop closes cleanly.
// On top of the keys every clip gets:
//   idle life     breathing, sway, arm drift, gaze drift (periods divide the loop)
//   follow-through hands trail their targets 90 ms, the head rights itself after a lean,
//                  the afro and the crown wobble a beat behind the body
//   blinks         on the head turns, never shorter than ~110 ms
//   accents        `fx(t, P)` adds a wave inside a window: waving, talking, shaking
//
// Bouncy brand: these are Duolingo-style reactions, so landings squash 15–20 % and
// overshoot once, badges pop past full size, and the body keeps volume (w = 1/h^0.6).
(function (root) {
  'use strict';
  const M = root.Motion;
  const { flow, track, seg, lin, wave, bell, lw, blinks, mix, clamp } = M;
  const BASE = root.Rig.BASE;

  // ── reusable bits ─────────────────────────────────────────────────────────
  /** Rest arms: cane in the left hand, book in the right. */
  const REST_ARMS = { aLx: -50, aLy: -100, aRx: 40, aRy: -111, palmL: 0, palmR: 0 };
  /** The cane tucked under the book arm, freeing the left hand. */
  const TUCKED = { stickH: 1, stickA: 22, stickPlant: 0 };
  /** Sitting on the stack of books. */
  const SIT = { seat: 14, stack: 1, fLx: -32, fRx: 32, stickW: 1, stickWx: -104, stickWa: 13 };
  /** Arms folded low with the book hugged above them, against the chest. */
  const HUG = { aLx: -7, aLy: -120, aRx: 10, aRy: -123, bookH: -1, bookX: -12, bookY: -26, bookR: -6, bookS: 0.86 };

  /** A pop for a badge or prop: 0 → 1.22 → 0.94 → 1, held, then out. */
  function pop(t, a, out, outEnd) {
    return track(t, [[0, 0], [a, 0], [a + 130, 1.22, 'out'], [a + 240, 0.94], [a + 340, 1], [out, 1], [outEnd, 0], [1e9, 0]]);
  }
  /** Syllables: an open-close every ~170 ms, varied, closed at both ends of the window. */
  function talk(t, a, b, amt) {
    if (t <= a || t >= b) return 0;
    const k = Math.floor((t - a) / 170);
    const s = Math.abs(Math.sin(((t - a) / 170) * Math.PI));
    const env = Math.min(1, (t - a) / 150, (b - t) / 150);
    return (amt || 0.55) * s * (0.55 + 0.45 * M.seeded(k, 7)) * env;
  }
  /** A parabola for a jump between take-off a and contact b, top height h. */
  function hop(t, a, b, h) {
    if (t <= a || t >= b) return 0;
    const p = (t - a) / (b - a);
    return h * 4 * p * (1 - p);
  }
  /** A window that fades in and out over `edge` ms (for accents). */
  function win(t, a, b, edge) {
    const e = edge || 160;
    return clamp(Math.min((t - a) / e, (b - t) / e), 0, 1);
  }

  // ── the clips ─────────────────────────────────────────────────────────────
  const CLIPS = [
    {
      id: 'idle', ar: 'وقفة الأستاذ', en: 'Idle', dur: 6000, still: 0,
      keys: [
        [0, {}],
        [1300, {}],
        [1750, { lookX: 0.9, lookY: 0.15, yaw: 0.22, tilt: 4 }],
        [2900, { lookX: 0.8, yaw: 0.2, tilt: 4 }],
        [3350, { lookX: 0, lookY: 0, yaw: 0, tilt: 0 }],
        [3900, { x: -3, lean: -1.5 }],
        [4250, { sy: 0.97, smile: 0.9 }],
        [4450, { sy: 1.025, lift: 2 }],
        [4650, { sy: 1, lift: 0 }],
        [4900, { x: -3 }],
        [5500, { x: 0, lean: 0, smile: 0.7 }],
      ],
      blinks: [1650, 3300, 5300, 5560],
    },
    {
      id: 'wave', ar: 'أهلاً!', en: 'Hello', dur: 3400, still: 1100,
      base: { ...TUCKED, smile: 0.9 },
      keys: [
        [0, { mouth: 0.12 }],
        [200, { sy: 0.95, aLy: -106 }],
        [430, { sy: 1.05, lift: 5, aLx: -86, aLy: -214, palmL: 1, mouth: 0.75, smile: 1, brow: -4, tilt: -6, cheek: 0.35, blush: 0.5, lean: -2 }],
        [570, { sy: 0.98, lift: 0 }],
        [720, { sy: 1 }],
        [2500, { aLx: -86, aLy: -214, mouth: 0.6, tilt: -4 }],
        [2900, { ...REST_ARMS, mouth: 0.12, smile: 0.9, brow: 0, tilt: 0, cheek: 0, blush: 0, lean: 0 }],
      ],
      blinks: [400, 1900],
      fx(t, P) {
        const w = win(t, 520, 2550, 140);
        P.aLx += 12 * wave(t, 425) * w;
        P.aLy += 3 * wave(t, 212.5, 0.25) * w;
        P.sy += 0.012 * wave(t, 425, 0.25) * w;
        P.tilt += 2.5 * wave(t, 850, 0.1) * w;
      },
    },
    {
      id: 'jump', ar: 'احتفال', en: 'Celebrate', dur: 2400, still: 700,
      base: { stickPlant: 0, stickA: 192, smile: 1 },
      keys: [
        [0, { aLx: -56, aLy: -112, aRx: 46, aRy: -118, mouth: 0.3 }],
        [260, { sy: 0.8, aLx: -52, aLy: -96, aRx: 44, aRy: -100, brow: 2, mouth: 0.2, stickA: 232 }],
        [400, { sy: 1.14, aLx: -84, aLy: -238, aRx: 76, aRy: -246, stickA: 334, bookX: -24, bookY: -42, bookR: 12, lid: 1, shut: 1, mouth: 1, brow: -5, cheek: 1, blush: 0.7, stars: 1 }],
        [520, { hang: 1 }],
        [700, { sy: 1.03 }],
        [960, { sy: 1.08, hang: 0.5 }],
        [1040, { sy: 0.8, hang: 0, aLx: -92, aLy: -200, aRx: 86, aRy: -208 }],
        [1170, { sy: 1.06 }],
        [1290, { sy: 0.98 }],
        [1450, { sy: 1, aLx: -56, aLy: -112, aRx: 46, aRy: -118, stickA: 192, bookX: -28, bookY: -20, bookR: 4, lid: 0, mouth: 0.5, cheek: 0.3, stars: 0 }],
        [2150, { mouth: 0.3, blush: 0.3 }],
      ],
      blinks: [1900],
      fx(t, P) {
        P.lift += hop(t, 400, 1040, 82);
        P.dust = lin(t, 1040, 1500);
      },
    },
    {
      id: 'confident', ar: 'واثق', en: 'Confident', dur: 4400, still: 1800,
      base: { ...HUG, stickH: 1, stickA: 44, stickPlant: 0, lid: 0.42, smile: 0.85, browR: -2, lookX: 0.25 },
      keys: [
        [0, {}],
        [600, { tilt: -6, lean: -3, headY: -2 }],
        [1400, { tilt: -6 }],
        [1700, { browR: -7, lookX: 0.65, yaw: 0.15, smile: 1 }],
        [1950, { browR: -1 }],
        [2150, { browR: -7 }],
        [2450, { browR: -2, lookX: 0.25 }],
        [3000, { tilt: 4, lean: -1, yaw: -0.1, lookX: -0.4, headY: 0 }],
        [3250, { headY: 3 }], [3420, { headY: 0 }], [3600, { headY: 3 }], [3780, { headY: 0 }],
        [4100, { tilt: 0, lean: 0, yaw: 0, lookX: 0.25, smile: 0.85 }],
      ],
      blinks: [2950],
      blinkRest: 0.42,
      fx(t, P) {
        P.fRy += 5 * Math.max(0, wave(t, 340, 0.75)) * win(t, 3000, 4000, 100);
      },
    },
    {
      id: 'determined', ar: 'جاهز للتحدي', en: 'Determined', dur: 3400, still: 1300,
      base: { angry: 1, lid: 0.18, smile: 0.05, mw: 0.85, lean: 2, stickPx: -64 },
      keys: [
        [0, {}],
        [500, {}],
        [800, { aLy: -126, aLx: -54, stickPlant: 0, stickA: 186, sy: 1.03, headY: -1 }],
        [1000, { aLy: -96, aLx: -50, stickPlant: 1, sy: 0.9, headY: 3, mouth: 0.22, mw: 0.7 }],
        [1150, { sy: 1.04, headY: -1 }],
        [1300, { sy: 1, headY: 0, mouth: 0, mw: 0.85 }],
        [1900, { lookX: -0.55, yaw: -0.15 }],
        [2450, { lookX: 0, yaw: 0 }],
        [2750, { headY: 3, sy: 0.98 }],
        [2950, { headY: 0, sy: 1 }],
      ],
      blinks: [1850, 2450],
      blinkRest: 0.18,
      fx(t, P) { P.dust = lin(t, 1000, 1450); },
    },
    {
      id: 'teaching', ar: 'يشرح الدرس', en: 'Teaching', dur: 4400, still: 1300,
      base: { stickH: -1, stickPlant: 0, stickA: 318, aLx: -96, aLy: -200, open: 1, aRx: 30, aRy: -120, bookX: -18, bookY: -22, bookR: -6, brow: -2 },
      keys: [
        [0, {}],
        [900, { aLx: -100, aLy: -206 }],
        [1100, { aLx: -92, aLy: -196 }], [1250, { aLx: -104, aLy: -210 }],
        [1450, { aLx: -92, aLy: -196 }], [1600, { aLx: -104, aLy: -210 }],
        [2150, { lookX: -0.9, lookY: -0.6, yaw: -0.22, tilt: -4 }],
        [2650, { lookX: 0, lookY: 0, yaw: 0, tilt: 3, brow: -4 }],
        [3400, { tilt: 0, brow: -2, aLx: -96, aLy: -200 }],
      ],
      blinks: [2100, 2650],
      fx(t, P) {
        P.mouth += talk(t, 500, 2000) + talk(t, 2700, 3900);
        P.spark = bell(lin(t, 1230, 1520)) + bell(lin(t, 1580, 1870));
        P.headY += 1.3 * Math.abs(wave(t, 680)) * (win(t, 500, 2000) + win(t, 2700, 3900));
      },
    },
    {
      id: 'worried', ar: 'أوه لا!', en: 'Uh-oh', dur: 3200, still: 900,
      base: { ...TUCKED },
      keys: [
        [0, { angry: -0.3, mouth: 0.05, smile: 0.3 }],
        [250, { sy: 1.05, aLx: -82, aLy: -178, palmL: 1, angry: -1, brow: -4, mouth: 0.45, round: 0.85, smile: -0.3, lean: -4, x: -4, pupil: 0.8 }],
        [400, { sy: 0.97 }],
        [520, { sy: 1 }],
        [1800, { lookX: -0.6, yaw: -0.15 }],
        [2100, { lookX: 0.6, yaw: 0.15 }],
        [2400, { lookX: 0, yaw: 0 }],
        [2800, { ...REST_ARMS, angry: -0.3, mouth: 0.05, round: 0, smile: 0.3, lean: 0, x: 0, pupil: 1, brow: 0 }],
      ],
      blinks: [1750, 2100],
      fx(t, P) {
        P.sweat = lin(t, 350, 1800);
        P.bang = pop(t, 240, 1600, 1760);
        const w = win(t, 300, 2500, 120);
        P.aLx += 1.4 * wave(t, 100) * w;
        P.sy += 0.006 * wave(t, 100, 0.3) * w;
      },
    },
    {
      id: 'reading', ar: 'يقرأ', en: 'Reading', dur: 5600, still: 400, sit: true,
      base: { ...SIT, open: 1, aLx: -34, aLy: -128, aRx: 34, aRy: -126, bookX: -34, bookY: -24, bookR: 0, lid: 0.25, smile: 0.4, palmL: 0 },
      keys: [
        [0, { lookX: -0.6, lookY: 0.5 }],
        [900, { lookX: 0.6, lookY: 0.5, tilt: 1 }],
        [1050, { lookX: -0.6, lookY: 0.75, tilt: -1 }],
        [1950, { lookX: 0.6, lookY: 0.75, tilt: 1 }],
        [2100, { lookX: -0.6, lookY: 1, tilt: -1 }],
        [3000, { lookX: 0.6, lookY: 1, tilt: 0 }],
        [3250, { lookX: 0, lookY: -0.2, lid: 0, brow: -4, smile: 0.9, mouth: 0.25, tilt: -5, yaw: 0.1 }],
        [3700, { mouth: 0.1 }],
        [3850, { lookX: 0.5, lookY: 0.4, lid: 0.15, tilt: 0, yaw: 0 }],
        [4450, { lookX: -0.5, lookY: 0.4 }],
        [4800, { lookX: -0.6, lookY: 0.5, lid: 0.25, brow: 0, smile: 0.4, mouth: 0 }],
      ],
      blinks: [1000, 3200, 4500],
      blinkRest: 0.25,
      fx(t, P) { P.flip = seg(t, 3850, 4450, 'inOut'); },
    },
    {
      id: 'sleeping', ar: 'نائم', en: 'Sleeping', dur: 5000, still: 1250, sit: true,
      base: { ...SIT, ...HUG, lid: 1, shut: -1, zzz: 1, smile: 0.2, mouth: 0.12, round: 0.6, mw: 0.7, tilt: 10, headY: 4, lean: 3, stickOn: 1 },
      keys: [
        [0, { sy: 1 }],
        [1250, { sy: 1.035, mouth: 0.05 }],
        [2500, { sy: 1, mouth: 0.15, tilt: 14, headY: 6 }],
        [3300, { tilt: 19, headY: 9, sy: 0.99 }],
        [3420, { tilt: 5, headY: 0, sy: 1.03, lid: 0.7, brow: -3 }],
        [3800, { tilt: 10, headY: 4, sy: 1.02, lid: 1, brow: 0 }],
      ],
      blinks: [],
      idle: 0.6,
    },
    {
      id: 'champion', ar: 'البطل', en: 'Champion', dur: 3800, still: 1100,
      base: { crown: 1, smile: 1 },
      keys: [
        [0, { mouth: 0.3 }],
        [300, { sy: 0.94, aRy: -104 }],
        [520, { sy: 1.06, lift: 6, aRx: 70, aRy: -250, bookX: -26, bookY: -44, bookR: 12, stars: 1, mouth: 0.85, brow: -4, cheek: 0.5, blush: 0.5, lean: -3, tilt: -4 }],
        [680, { sy: 0.97, lift: 0 }],
        [820, { sy: 1 }],
        [2700, { aRx: 70, aRy: -250 }],
        [3200, { aRx: 40, aRy: -111, bookX: -28, bookY: -20, bookR: 4, stars: 0, mouth: 0.3, brow: 0, cheek: 0.2, blush: 0.2, lean: 0, tilt: 0 }],
      ],
      blinks: [1500, 3300],
      fx(t, P) {
        const w = win(t, 700, 2650, 200);
        P.bookR += 9 * wave(t, 520) * w;
        P.aRx += 4 * wave(t, 520, 0.1) * w;
        P.sy += 0.012 * wave(t, 520, 0.3) * w;
      },
    },
    {
      id: 'correct', ar: 'إجابة صحيحة', en: 'Correct!', dur: 2600, still: 1000,
      base: { stickPlant: 0, stickA: 190 },
      keys: [
        [0, {}],
        [180, { sy: 0.88, aRy: -102, aLx: -52 }],
        [320, { sy: 1.1, aRx: 60, aRy: -228, aLx: -64, aLy: -112, lid: 1, shut: 1, mouth: 0.9, cheek: 1, smile: 1, brow: -4, blush: 0.6, bookY: -40, bookX: -26, bookR: 10 }],
        [430, { hang: 0.45 }],
        [640, { hang: 0.2 }],
        [760, { sy: 0.86, hang: 0 }],
        [880, { sy: 1.05, aRy: -200 }],
        [1000, { sy: 1, aRy: -228 }],
        [1150, { aRy: -198 }],
        [1300, { aRy: -222 }],
        [1700, { lid: 0, mouth: 0.45, cheek: 0.3 }],
        [2200, { ...REST_ARMS, bookX: -28, bookY: -20, bookR: 4, brow: 0, blush: 0.2, mouth: 0.2 }],
      ],
      blinks: [2000],
      fx(t, P) {
        P.lift += hop(t, 320, 760, 30);
        P.badge = pop(t, 320, 2000, 2250);
      },
    },
    {
      id: 'wrong', ar: 'إجابة خاطئة', en: 'Wrong', dur: 3600, still: 1600,
      keys: [
        [0, {}],
        [300, { sy: 1.03, lean: -1, angry: -0.5 }],
        [700, { sy: 0.965, lean: 5, headY: 5, lookY: 0.7, lookX: -0.2, angry: -1, brow: 2, smile: -0.8, mouth: 0, lid: 0.35, aLx: -46, aLy: -94, aRx: 38, aRy: -104 }],
        [1100, { yaw: -0.35 }], [1400, { yaw: 0.35 }], [1700, { yaw: -0.3 }], [1950, { yaw: 0.2 }], [2200, { yaw: 0 }],
        [2300, { lookY: 0.5 }],
        [2900, { sy: 0.97 }],
        [3300, { sy: 1, lean: 0, headY: 0, lookY: 0, lookX: 0, angry: 0, brow: 0, smile: 0.7, lid: 0, ...REST_ARMS }],
      ],
      blinks: [1050, 3250],
      fx(t, P) { P.sweat = lin(t, 1000, 2600); },
    },
    {
      id: 'thinking', ar: 'يفكّر', en: 'Thinking', dur: 5200, still: 1500,
      base: { ...TUCKED },
      keys: [
        [0, { aLx: -48, aLy: -104 }],
        [500, { aLx: 4, aLy: -176, lookX: -0.6, lookY: -0.8, yaw: -0.12, smile: 0, mw: 0.7, browL: -5, browR: 1 }],
        [2000, { lookX: 0.6, lookY: -0.7, yaw: 0.12 }],
        [2850, { lookX: 0, lookY: 0, yaw: 0 }],
        [3100, { aLx: -66, aLy: -204, palmL: 1, brow: -6, browL: 0, browR: 0, mouth: 0.7, smile: 1, sy: 1.05, lift: 4, mw: 1 }],
        [3250, { sy: 0.97, lift: 0 }],
        [3400, { sy: 1 }],
        [4400, { aLx: -66, aLy: -204 }],
        [4800, { aLx: -48, aLy: -104, palmL: 0, brow: 0, mouth: 0.12, smile: 0.7 }],
      ],
      blinks: [1950, 2850],
      idleHead: 0.3,
      fx(t, P) {
        P.aLy += 3.2 * wave(t, 700) * win(t, 650, 2900, 150);
        P.bubble = pop(t, 900, 2850, 3000);
        P.bulb = pop(t, 3000, 4300, 4500);
      },
    },
    {
      id: 'talking', ar: 'يتكلم', en: 'Talking', dur: 4800, still: 900,
      base: { ...TUCKED },
      keys: [
        [0, {}],
        [300, { aLx: -74, aLy: -156, palmL: 0.85, brow: -2, tilt: -3 }],
        [900, { aLx: -64, aLy: -170, tilt: 2 }],
        [1500, { aLx: -82, aLy: -150, brow: -4, yaw: -0.1 }],
        [2100, { aLx: -60, aLy: -176, brow: 0, yaw: 0.1, tilt: -2 }],
        [2700, { aLx: -78, aLy: -158 }],
        [3300, { aLx: -68, aLy: -170, brow: -3, tilt: 3 }],
        [3900, { aLx: -48, aLy: -104, palmL: 0, brow: 0, tilt: 0, yaw: 0 }],
      ],
      blinks: [1450, 3050],
      fx(t, P) {
        P.mouth += talk(t, 300, 3800, 0.6);
        P.headY += 1.4 * Math.abs(wave(t, 1200)) * win(t, 300, 3800);
      },
    },
    {
      id: 'dance', ar: 'يرقص', en: 'Dancing', dur: 2400, still: 300,
      base: { lid: 1, shut: 1, mouth: 0.7, smile: 1, blush: 0.6, cheek: 1, notes: 1, stickPlant: 0, stickA: 330, bookX: -24, bookY: -42 },
      keys: [[0, { aLx: -72, aLy: -214, aRx: 66, aRy: -226 }]],
      blinks: [],
      idle: 0.4,
      fx(t, P) {
        const s = wave(t, 1200);
        P.lean += 7 * s;
        P.x += 8 * s;
        P.tilt += -6 * wave(t, 1200, 0.12);
        P.lift += 9 * Math.abs(Math.sin((Math.PI * t) / 600));
        P.sy += -0.08 * Math.pow(Math.cos((Math.PI * t) / 600), 10) + 0.03 * Math.abs(Math.sin((Math.PI * t) / 600));
        P.aLx += 7 * wave(t, 1200, 0.25); P.aRx += 7 * wave(t, 1200, 0.3);
        P.aLy += 6 * wave(t, 600, 0.1); P.aRy += 6 * wave(t, 600, 0.4);
        P.bookR = 12 * wave(t, 1200, 0.15);
        P.stickA += 14 * wave(t, 1200, 0.2);
        P.fLy += (11 + 9) * Math.max(0, s) ; P.fRy += (11 + 9) * Math.max(0, -s);
        P.fLy += P.lift * 0; // feet stay with the floor when not kicked up
        P.mouth += 0.15 * wave(t, 600);
      },
    },
    {
      id: 'surprised', ar: 'مندهش', en: 'Surprised', dur: 3000, still: 600,
      keys: [
        [0, {}],
        [150, { sy: 0.95 }],
        [300, { sy: 1.15, aLx: -88, aLy: -178, aRx: 86, aRy: -170, palmL: 1, brow: -9, mouth: 0.9, round: 1, mw: 0.9, pupil: 0.62, puff: 1.14, lean: -4, x: -3, stickPlant: 0, stickA: 222, smile: 0 }],
        [380, { hang: 0.5 }],
        [470, { sy: 0.9, hang: 0 }],
        [600, { sy: 1.04 }],
        [750, { sy: 1 }],
        [1500, { puff: 1.1, pupil: 0.66 }],
        [2100, { sy: 0.97, mouth: 0.2, round: 0.3, brow: -2, pupil: 1, puff: 1, ...REST_ARMS, stickPlant: 1, stickA: 180, lean: 0, x: 0, smile: 0.4 }],
        [2500, { sy: 1, smile: 0.7, mouth: 0, round: 0, brow: 0 }],
      ],
      blinks: [1600, 1850],
      fx(t, P) {
        P.lift += hop(t, 300, 470, 16);
        P.bang = pop(t, 280, 1700, 1900);
        P.dust = lin(t, 470, 900);
      },
    },
    {
      id: 'laughing', ar: 'يضحك', en: 'Laughing', dur: 3000, still: 1200,
      keys: [
        [0, {}],
        [250, { lid: 1, shut: 1, mouth: 1, teeth: 1, cheek: 1, smile: 1, blush: 0.7, lean: -6, tilt: -8, aRx: 6, aRy: -118, brow: -3 }],
        [1200, { lean: 8, tilt: 6, headY: 3 }],
        [2000, { lean: -4, tilt: -6, headY: 0 }],
        [2600, { lid: 0, mouth: 0.35, teeth: 0, cheek: 0.3, lean: 0, tilt: 0, aRx: 40, aRy: -111, blush: 0.3, brow: 0 }],
      ],
      blinks: [],
      fx(t, P) {
        const w = win(t, 250, 2500, 150);
        P.sy += 0.025 * wave(t, 170) * w;
        P.mouth += 0.15 * wave(t, 170) * w;
        P.headY += 1.6 * wave(t, 170, 0.25) * w;
        P.aRy += 2 * wave(t, 170, 0.5) * w;
      },
    },
  ];

  // ── compile: keys → one flow track per channel ─────────────────────────────
  function compile(clip) {
    const start = Object.assign({}, BASE, clip.base || {}, clip.keys[0][1]);
    const snaps = [[0, start]];
    let cur = start;
    for (let i = 1; i < clip.keys.length; i++) {
      cur = Object.assign({}, cur, clip.keys[i][1]);
      snaps.push([clip.keys[i][0], cur]);
    }
    if (snaps[snaps.length - 1][0] < clip.dur) snaps.push([clip.dur, start]);
    const tracks = {};
    const consts = {};
    for (const ch of Object.keys(BASE)) {
      const ks = snaps.map(([t, s]) => [t, s[ch]]);
      if (ks.every((k) => k[1] === ks[0][1])) consts[ch] = ks[0][1];
      else tracks[ch] = ks;
    }
    clip._tracks = tracks;
    clip._consts = consts;
    clip._blink = blinks(clip.blinks || [], clip.dur, 0);
    return clip;
  }
  CLIPS.forEach(compile);

  function raw(clip, t) {
    const P = Object.assign({}, clip._consts);
    for (const ch in clip._tracks) P[ch] = flow(t, clip._tracks[ch]);
    return P;
  }
  const wrap = (t, d) => ((t % d) + d) % d;

  /** The full pose of `clip` at time t (ms, any value; it loops). */
  function pose(clip, tIn) {
    const d = clip.dur;
    const t = wrap(tIn, d);
    const P = raw(clip, t);
    const tr = clip._tracks;
    const lagAt = (ch, ms) => (tr[ch] ? flow(wrap(t - ms, d), tr[ch]) : P[ch]);

    // follow-through: hands trail their targets, the head rights itself after a lean
    for (const ch of ['aLx', 'aLy', 'aRx', 'aRy']) P[ch] = mix(P[ch], lagAt(ch, 90), 0.4);
    P.tilt -= 0.45 * lagAt('lean', 110);
    P.bookR = mix(P.bookR, lagAt('bookR', 80), 0.35);

    // accents
    if (clip.fx) clip.fx(t, P);

    // idle life: never a frozen frame
    const k = clip.idle == null ? 1 : clip.idle;
    const kh = clip.idleHead == null ? 1 : clip.idleHead;
    P.sy += 0.012 * lw(t, d, 2600) * k;
    P.x += 1.2 * lw(t, d, 5000, 0.2) * k;
    P.lean += 0.8 * lw(t, d, 4000, 0.35) * k;
    P.tilt += 1.8 * lw(t, d, 4500, 0.5) * k * kh;
    P.yaw += 0.035 * lw(t, d, 5200, 0.1) * k * kh;
    P.aLx += 1.4 * lw(t, d, 3000, 0.3) * k; P.aLy += 1.6 * lw(t, d, 1900, 0.6) * k;
    P.aRx += 1.2 * lw(t, d, 3400, 0.8) * k; P.aRy += 1.5 * lw(t, d, 2200, 0.1) * k;
    P.lookX += 0.06 * lw(t, d, 3700, 0.4) * k;

    // blinks add on top of the expression's own lid
    // (a blink closes with a plain line, not the happy ^ of a squeezed-shut grin)
    const b = track(t, clip._blink);
    P.shut = mix(P.shut, 0.15, b * (1 - clamp(P.lid, 0, 1)));
    P.lid = P.lid + (1 - P.lid) * b;

    // the afro and the crown wobble a beat behind the body
    const liftNow = P.lift, liftLag = lagAt('lift', 80) + (clip.fx ? fxLift(clip, wrap(t - 80, d)) : 0);
    const syLag = lagAt('sy', 100);
    P.jig = clamp(0.004 * (liftLag - liftNow) + 0.55 * (syLag - raw1(clip, 'sy', t)), -0.12, 0.12);
    P.crownR = 0.6 * (lagAt('tilt', 150) - P.tilt) + 0.25 * (liftLag - liftNow) + 2 * lw(t, d, 1800);
    return P;
  }
  function raw1(clip, ch, t) { return clip._tracks[ch] ? flow(t, clip._tracks[ch]) : clip._consts[ch]; }
  /** The procedural part of the lift (jumps added in fx), for the hair's follow-through. */
  function fxLift(clip, t) {
    const P = { lift: 0 };
    for (const ch of Object.keys(BASE)) if (!(ch in P)) P[ch] = 0;
    P.sy = 1;
    clip.fx(t, P);
    return P.lift;
  }

  /** Blend two poses (continuity when switching clips: never teleport). */
  function blend(A, Bp, p) {
    const out = {};
    for (const ch in Bp) out[ch] = A[ch] == null ? Bp[ch] : mix(A[ch], Bp[ch], p);
    return out;
  }

  root.Clips = { list: CLIPS, pose, blend, byId: Object.fromEntries(CLIPS.map((c) => [c.id, c])) };
})(window);

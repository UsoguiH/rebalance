// rig.js: the Qudrat teacher, drawn in code on a <canvas>.
//
// World units: the floor is y = 0 under the feet, y grows downward, and the face is
// 100 units wide. Layers, each turning around its real pivot:
//   legs (2-bone IK, feet planted on the floor or hanging under the hips)
//   → body (squash about the floor, lean about the hips)
//     → pelvis, torso, head (tilt about the neck; 2.5D yaw slides the features)
//     → props (book in a hand, cane/pointer in a hand, planted or leaning)
//     → arms (2-bone IK in torso space) and hands on top of the props
//   → effects (sparkles, Zzz, sweat, crown, badges) in world space.
//
// Palette sampled from the reference sheet's pixels (tools: sample_colors).
(function (root) {
  'use strict';
  const { clamp, mix, seeded, loop, bell, wave } = root.Motion;

  const C = {
    skin: '#fdb277', skinLid: '#f6a46b', lidLine: '#d9844d', ear: '#f9a66c', earIn: '#e2874e',
    nose: '#c4844f', lipLine: '#9c5a2e',
    hair: '#1d1d20', hairHi: '#56565c',
    beard: '#232324', goatee: '#676869', goateeHi: '#8e8e90', goateeDk: '#4c4c4e',
    eye: '#ffffff', pupil: '#1b0e07', shut: '#3b2418',
    brow: '#242425',
    glass: 'rgba(248,206,176,0.95)', glassHi: 'rgba(255,255,255,0.6)', lens: 'rgba(255,255,255,0.12)',
    shirt: '#fefdfc', shirtEdge: '#e4e0ea', shirtShade: '#efecf2',
    vest: '#b3885c', vestRib: '#a27850', vestDark: '#8c6440',
    pants: '#46443b', pantsCuff: '#37362f', shoe: '#151515', shoeHi: '#3b3b3d',
    book: '#6a22c9', bookDark: '#53169e', bookPages: '#ebe6f6', bookLine: '#cbb6f4', bookStack2: '#7a35dc',
    stick: '#2a1f18', stickHi: '#5a463a',
    mouth: '#a8191f', mouthIn: '#6e0d12', tongue: '#ff7676', teeth: '#ffffff',
    shadow: 'rgba(96,88,110,0.17)',
    gold: '#fbc85f', goldDk: '#eba23a', spark: '#ffc443',
    blush: 'rgba(255,120,110,0.32)', sweat: '#8fd6ff', zzz: '#8a5ce6', green: '#58cc02', greenDk: '#46a302',
  };

  /** The build, in face widths (face = 100). Change the body in one place. */
  const B = {
    hipY: -98, hipX: 20, thigh: 41, shin: 41, legW: 40, ankle: 12,
    shoulderX: 39, shoulderY: -166, upper: 34, fore: 32, sleeveW: 25, handR: 13.5,
    neckY: -180, headDY: -58,
    stickLen: 104, stickBack: 14,
    seatTop: -70,
  };

  /** Every channel a pose has, at rest. Clips override only what they act with. */
  const BASE = {
    x: 0, lift: 0, sy: 1, lean: 0, seat: 0, stack: 0,
    tilt: 0, yaw: 0, headY: 0, puff: 1, jig: 0,
    lookX: 0, lookY: 0, lid: 0, lidL: 0, lidR: 0, cheek: 0, shut: 1, pupil: 1,
    brow: 0, browL: 0, browR: 0, angry: 0, blush: 0,
    mouth: 0, smile: 0.7, round: 0, mw: 1, teeth: 0,
    aLx: -50, aLy: -100, aRx: 40, aRy: -112, palmL: 0, palmR: 0, elL: 1, elR: 1,
    fLx: -22, fLy: 0, fRx: 22, fRy: 0, hang: 0,
    bookH: 1, bookX: -28, bookY: -20, bookR: 4, open: 0, flip: 0, bookS: 1, bookOn: 1,
    stickH: -1, stickA: 180, stickPlant: 1, stickPx: -60, stickOn: 1,
    stickW: 0, stickWx: -84, stickWa: -12,
    spark: 0, sweat: 0, zzz: 0, crown: 0, crownR: 0, stars: 0, badge: 0, bubble: 0, bulb: 0, bang: 0,
    notes: 0, dust: 0, heart: 0,
  };

  // ── small drawing helpers ──────────────────────────────────────────────────
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, fill, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function rrectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r, fill) { rrectPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function stroke(ctx, pts, w, color, cap) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = cap || 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (m, x, y) => { const p = m.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };

  /** Two-bone IK. Returns [elbow, wrist]. `side` picks the elbow that sticks out that way. */
  function ik(sx, sy, tx, ty, l1, l2, side, maxStretch) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy) || 0.001;
    const reach = l1 + l2;
    if (d >= reach * 0.999) {
      const k = Math.min(d / reach, maxStretch || 1.25);
      const ux = dx / d, uy = dy / d;
      const ex = sx + ux * l1 * k, ey = sy + uy * l1 * k;
      return [[ex, ey], [sx + ux * reach * k, sy + uy * reach * k]];
    }
    d = Math.max(d, Math.abs(l1 - l2) + 2);
    const base = Math.atan2(dy, dx);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const e1 = [sx + Math.cos(base + a) * l1, sy + Math.sin(base + a) * l1];
    const e2 = [sx + Math.cos(base - a) * l1, sy + Math.sin(base - a) * l1];
    const pick = side * e1[0] > side * e2[0] ? e1 : e2;
    return [pick, [tx, ty]];
  }

  // ── head ───────────────────────────────────────────────────────────────────
  function facePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-50, -28);
    ctx.quadraticCurveTo(-50, -57, -22, -57);
    ctx.lineTo(22, -57);
    ctx.quadraticCurveTo(50, -57, 50, -28);
    ctx.lineTo(50, 16);
    ctx.bezierCurveTo(50, 52, 26, 64, 0, 64);
    ctx.bezierCurveTo(-26, 64, -50, 52, -50, 16);
    ctx.closePath();
  }

  const HAIR_BACK = [
    [0, -66, 38], [-44, -56, 29], [-20, -80, 30], [18, -82, 31], [46, -62, 28],
    [-60, -30, 19], [60, -30, 19], [-57, -8, 13], [57, -8, 13], [-34, -84, 22], [36, -80, 22],
  ];
  const HAIR_FRONT = [[-37, -60, 15], [-13, -66, 16], [12, -66, 16], [36, -60, 15], [-46, -46, 9], [46, -46, 9]];

  function drawHair(ctx, P, layer, yaw) {
    const lumps = layer === 'back' ? HAIR_BACK : HAIR_FRONT;
    const sh = layer === 'back' ? -yaw * 5 : yaw * 3;
    ctx.save();
    // The afro is a soft volume: it squashes and stretches a beat behind the body.
    const j = P.jig;
    ctx.translate(0, -30);
    ctx.scale(P.puff * (1 - j * 0.6), P.puff * (1 + j));
    ctx.translate(0, 30);
    for (const [x, y, r] of lumps) circle(ctx, x + sh, y, r, C.hair);
    if (layer === 'back') {
      ctx.lineCap = 'round'; ctx.strokeStyle = C.hairHi; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.arc(-44 + sh, -56, 19, rad(195), rad(245)); ctx.stroke();
      ctx.beginPath(); ctx.arc(46 + sh, -62, 18, rad(290), rad(335)); ctx.stroke();
      ctx.beginPath(); ctx.arc(2 + sh, -92, 13, rad(160), rad(250)); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6 + sh, -74, 13, rad(-30), rad(60)); ctx.stroke();
    }
    ctx.restore();
  }

  function drawEye(ctx, cx, cy, side, P) {
    const r = 12.5;
    circle(ctx, cx, cy, r, C.eye);
    // pupil glides, clipped to the white
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const pr = 7.6 * P.pupil;
    const px = cx + clamp(P.lookX, -1.2, 1.2) * 4.8, py = cy + clamp(P.lookY, -1.2, 1.2) * 4.4;
    circle(ctx, px, py, pr, C.pupil);
    circle(ctx, px + pr * 0.36, py - pr * 0.4, pr * 0.3, '#ffffff');
    ctx.restore();

    const lid = clamp(Math.max(P.lid, side < 0 ? P.lidL : P.lidR), 0, 1);
    const cheek = clamp(P.cheek, 0, 1);
    if (lid > 0.002 || cheek > 0.002) {
      ctx.save();
      // Clip to a shape 2 units LARGER than the white, so no ring leaks round a closed eye.
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.clip();
      const span = 2 * r + 4;
      const lowRise = lid * 0.15 + cheek * 0.42 * (1 - lid);
      const yU = cy - r - 2 + Math.min(lid, 1) * span * (1 - 0.15);
      const yL = cy + r + 2 - lowRise * span;
      // upper lid (edge sags a little)
      ctx.beginPath();
      ctx.moveTo(cx - r - 4, cy - r - 4); ctx.lineTo(cx + r + 4, cy - r - 4);
      ctx.lineTo(cx + r + 4, yU - 3); ctx.quadraticCurveTo(cx, yU + 5, cx - r - 4, yU - 3);
      ctx.closePath(); ctx.fillStyle = C.skinLid; ctx.fill();
      // lower lid / happy cheek (edge bows up)
      ctx.beginPath();
      ctx.moveTo(cx - r - 4, cy + r + 4); ctx.lineTo(cx + r + 4, cy + r + 4);
      ctx.lineTo(cx + r + 4, yL + 4); ctx.quadraticCurveTo(cx, yL - 6 * (0.3 + cheek), cx - r - 4, yL + 4);
      ctx.closePath(); ctx.fillStyle = C.skinLid; ctx.fill();
      if (lid > 0.05 && lid < 0.97) {
        ctx.beginPath(); ctx.moveTo(cx - r - 4, yU - 3); ctx.quadraticCurveTo(cx, yU + 5, cx + r + 4, yU - 3);
        ctx.lineWidth = 2.2; ctx.strokeStyle = C.lidLine; ctx.stroke();
      }
      ctx.restore();
    }
    if (lid > 0.8) {
      // the closed eye: ^ when happy (shut = 1), a sleepy smile when shut = -1
      const a = clamp((lid - 0.8) / 0.2, 0, 1);
      const s = P.shut;
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 3 + s * 2);
      ctx.quadraticCurveTo(cx, cy + 3 - s * 10, cx + 9, cy + 3 + s * 2);
      ctx.lineWidth = 3.3; ctx.strokeStyle = C.shut; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
  }

  function drawBrow(ctx, cx, cy, side, raise, angry) {
    // inner end is the one toward the nose; angry pulls it down, worried pushes it up
    const inner = cx - side * 11, outer = cx + side * 11;
    const yi = cy + raise + angry * 4.5, yo = cy + raise - angry * 2.2;
    ctx.beginPath();
    ctx.moveTo(inner, yi); ctx.quadraticCurveTo(cx, Math.min(yi, yo) - 3.2, outer, yo);
    ctx.lineWidth = 8.6; ctx.lineCap = 'round'; ctx.strokeStyle = C.brow; ctx.stroke();
  }

  function drawMouth(ctx, mx, my, P) {
    const open = clamp(P.mouth, 0, 1.3);
    const w = 12.5 * P.mw * (1 - P.round * 0.45);
    const smile = P.smile;
    if (open < 0.04) {
      ctx.beginPath();
      ctx.moveTo(mx - w, my - smile * 2.5);
      ctx.quadraticCurveTo(mx, my + smile * 8, mx + w, my - smile * 2.5);
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = C.lipLine; ctx.stroke();
      return;
    }
    const depth = 3 + open * 17;
    const top = my - 3 - smile * 1.5;
    ctx.save();
    ctx.beginPath();
    const r = P.round;
    // a D-shaped grin (flat top under the moustache) that rounds into an O
    ctx.moveTo(mx - w, top + r * depth * 0.45 - smile * 2);
    ctx.bezierCurveTo(mx - w * (1 - r * 0.5), top - r * depth * 0.25, mx + w * (1 - r * 0.5), top - r * depth * 0.25, mx + w, top + r * depth * 0.45 - smile * 2);
    ctx.bezierCurveTo(mx + w * (0.9 - r * 0.1), top + depth * (0.9 + smile * 0.15), mx - w * (0.9 - r * 0.1), top + depth * (0.9 + smile * 0.15), mx - w, top + r * depth * 0.45 - smile * 2);
    ctx.closePath();
    ctx.fillStyle = C.mouthIn; ctx.fill();
    ctx.clip();
    ellipse(ctx, mx, top + depth * 0.95, w * 0.75, depth * 0.45, C.tongue);
    if (P.teeth > 0.01) rrect(ctx, mx - w, top - 4, w * 2, 4 + 4 * P.teeth, 2, C.teeth);
    ctx.restore();
  }

  function drawHead(ctx, P) {
    const yaw = clamp(P.yaw, -1, 1);
    drawHair(ctx, P, 'back', yaw);
    // ears: the far one tucks behind, the near one slides out
    for (const s of [-1, 1]) {
      const ex = s * 55 - yaw * 7, ey = 6;
      const k = 1 - Math.max(0, s * yaw) * 0.35;
      ellipse(ctx, ex, ey, 13 * k, 14, C.ear);
      ctx.beginPath(); ctx.arc(ex + s * 1.5, ey, 6.5 * k, rad(s > 0 ? -70 : 110), rad(s > 0 ? 70 : 250));
      ctx.lineWidth = 3; ctx.strokeStyle = C.earIn; ctx.lineCap = 'round'; ctx.stroke();
    }
    facePath(ctx); ctx.fillStyle = C.skin; ctx.fill();

    const fx = yaw * 10; // eyes, mouth
    const nx = yaw * 13; // the nose sticks out the most

    // blush
    if (P.blush > 0.01) {
      ctx.save(); ctx.globalAlpha = clamp(P.blush, 0, 1);
      ellipse(ctx, -31 + fx, 9, 9, 5, C.blush); ellipse(ctx, 31 + fx, 9, 9, 5, C.blush);
      ctx.restore();
    }

    // beard: a soft stubble edge, then the solid jaw
    ctx.save();
    facePath(ctx); ctx.clip();
    ctx.globalAlpha = 0.28;
    beardPath(ctx, fx, -9); ctx.fillStyle = C.beard; ctx.fill();
    ctx.globalAlpha = 1;
    beardPath(ctx, fx, 0); ctx.fillStyle = C.beard; ctx.fill();
    ctx.restore();
    // the beard spills a little under the chin
    ctx.beginPath(); ctx.moveTo(-44, 36); ctx.bezierCurveTo(-38, 62, -14, 70, 0, 70); ctx.bezierCurveTo(14, 70, 38, 62, 44, 36); ctx.closePath();
    ctx.fillStyle = C.beard; ctx.fill();

    // the mouth patch, the grey goatee, then the mouth
    const mOpen = clamp(P.mouth, 0, 1.3);
    ellipse(ctx, fx, 35 + mOpen * 3, 17 * (0.9 + P.mw * 0.1), 8.5 + mOpen * 7, C.skin);
    const gy = 56 + mOpen * 8;
    ctx.beginPath();
    ctx.moveTo(fx - 13, gy - 9); ctx.quadraticCurveTo(fx, gy - 14, fx + 13, gy - 9);
    ctx.quadraticCurveTo(fx + 14, gy + 10, fx, gy + 15); ctx.quadraticCurveTo(fx - 14, gy + 10, fx - 13, gy - 9);
    ctx.fillStyle = C.goatee; ctx.fill();
    stroke(ctx, [[fx - 4, gy - 6], [fx - 5, gy + 9]], 2.6, C.goateeHi);
    stroke(ctx, [[fx + 4, gy - 5], [fx + 4.5, gy + 8]], 2.2, C.goateeDk);
    stroke(ctx, [[fx + 0.5, gy - 3], [fx + 0.5, gy + 12]], 2, C.goateeHi);
    drawMouth(ctx, fx, 33 + mOpen * 1.5, P);
    // moustache: lifts with a wide-open mouth
    const my = 21 - mOpen * 2.5 - Math.max(0, P.smile) * 1.2;
    ctx.beginPath();
    ctx.moveTo(fx - 27, 42);
    ctx.bezierCurveTo(fx - 28, my + 1, fx - 13, my - 4, fx, my + 1);
    ctx.bezierCurveTo(fx + 13, my - 4, fx + 28, my + 1, fx + 27, 42);
    ctx.lineWidth = 10.5; ctx.lineCap = 'round'; ctx.strokeStyle = C.beard; ctx.stroke();

    // nose
    ctx.beginPath();
    ctx.moveTo(nx - 7, 15); ctx.quadraticCurveTo(nx - 6, 6, nx, 6); ctx.quadraticCurveTo(nx + 6, 6, nx + 7, 15);
    ctx.quadraticCurveTo(nx, 19, nx - 7, 15); ctx.fillStyle = C.nose; ctx.fill();

    // eyes, brows, glasses
    drawEye(ctx, -20 + fx, -7, -1, P);
    drawEye(ctx, 20 + fx, -7, 1, P);
    drawBrow(ctx, -21 + fx * 0.9, -31, -1, P.brow + P.browL, P.angry);
    drawBrow(ctx, 21 + fx * 0.9, -31, 1, P.brow + P.browR, P.angry);
    drawGlasses(ctx, fx);

    drawHair(ctx, P, 'front', yaw);
  }

  function beardPath(ctx, fx, up) {
    ctx.beginPath();
    ctx.moveTo(-52, -10 + up);
    ctx.lineTo(-45, -10 + up);
    ctx.bezierCurveTo(-44 + fx * 0.3, 14 + up * 0.5, -32 + fx * 0.6, 27 + up * 0.3, -22 + fx, 28);
    ctx.lineTo(22 + fx, 28);
    ctx.bezierCurveTo(32 + fx * 0.6, 27 + up * 0.3, 44 + fx * 0.3, 14 + up * 0.5, 45, -10 + up);
    ctx.lineTo(52, -10 + up);
    ctx.lineTo(52, 70); ctx.lineTo(-52, 70);
    ctx.closePath();
  }

  function drawGlasses(ctx, fx) {
    ctx.save();
    for (const s of [-1, 1]) {
      const cx = s * 21 + fx;
      rrectPath(ctx, cx - 18.5, -22, 37, 30, 11);
      ctx.fillStyle = C.lens; ctx.fill();
      ctx.lineWidth = 4.4; ctx.strokeStyle = C.glass; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 11, -19.5); ctx.lineTo(cx - 3, -19.5);
      ctx.lineWidth = 1.6; ctx.strokeStyle = C.glassHi; ctx.lineCap = 'round'; ctx.stroke();
      // temples run back to the ears
      stroke(ctx, [[cx + s * 18.5, -13], [s * 53 - fx * 0.6, -9]], 3.6, C.glass);
    }
    ctx.beginPath(); ctx.moveTo(-3 + fx, -12); ctx.quadraticCurveTo(fx, -16, 3 + fx, -12);
    ctx.lineWidth = 3.6; ctx.strokeStyle = C.glass; ctx.stroke();
    ctx.restore();
  }

  // ── body ───────────────────────────────────────────────────────────────────
  function drawPelvis(ctx) {
    rrect(ctx, -42, -110, 84, 26, 10, C.pants);
  }

  function drawTorso(ctx) {
    // shirt
    ctx.beginPath();
    ctx.moveTo(-20, -184); ctx.lineTo(-38, -179); ctx.quadraticCurveTo(-48, -175, -47, -160);
    ctx.lineTo(-44, -108); ctx.quadraticCurveTo(-44, -100, -36, -100); ctx.lineTo(36, -100);
    ctx.quadraticCurveTo(44, -100, 44, -108); ctx.lineTo(47, -160); ctx.quadraticCurveTo(48, -175, 38, -179);
    ctx.lineTo(20, -184); ctx.closePath(); ctx.fillStyle = C.shirt; ctx.fill();
    // a V of skin at the open collar
    ctx.beginPath(); ctx.moveTo(-9, -186); ctx.lineTo(0, -170); ctx.lineTo(9, -186); ctx.closePath(); ctx.fillStyle = C.skin; ctx.fill();
    // sweater vest
    ctx.beginPath();
    ctx.moveTo(-16, -182); ctx.lineTo(-30, -179); ctx.quadraticCurveTo(-43, -175, -43, -160);
    ctx.lineTo(-42, -112); ctx.quadraticCurveTo(-42, -99, -30, -98); ctx.lineTo(30, -98);
    ctx.quadraticCurveTo(42, -99, 42, -112); ctx.lineTo(43, -160); ctx.quadraticCurveTo(43, -175, 30, -179);
    ctx.lineTo(16, -182); ctx.lineTo(0, -144); ctx.closePath();
    ctx.fillStyle = C.vest; ctx.fill();
    // ribbed V trim and hem
    stroke(ctx, [[-16, -181], [0, -145], [16, -181]], 5.5, C.vestRib);
    ctx.save();
    rrectPath(ctx, -42, -114, 84, 16, 7); ctx.fillStyle = C.vestRib; ctx.fill(); ctx.clip();
    ctx.globalAlpha = 0.45;
    for (let x = -39; x <= 39; x += 6) stroke(ctx, [[x, -113], [x, -99]], 1.5, C.vestDark, 'butt');
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.45;
    for (let i = 1; i < 6; i++) {
      const p = i / 6;
      stroke(ctx, [[-16 + 16 * p - 2.2, -181 + 36 * p], [-16 + 16 * p + 2.2, -181 + 36 * p + 1.5]], 1.2, C.vestDark, 'butt');
      stroke(ctx, [[16 - 16 * p + 2.2, -181 + 36 * p], [16 - 16 * p - 2.2, -181 + 36 * p + 1.5]], 1.2, C.vestDark, 'butt');
    }
    ctx.restore();
    // collar points
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 7, -188); ctx.lineTo(s * 21, -183); ctx.lineTo(s * 17, -170); ctx.closePath();
      ctx.fillStyle = C.shirt; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.shirtEdge; ctx.lineJoin = 'round'; ctx.stroke();
    }
  }

  function drawLeg(ctx, hip, foot, side, hang, sit) {
    // Seated, the thighs point at the viewer: they foreshorten and the knees read as caps.
    const thigh = mix(B.thigh, 14, sit), shin = mix(B.shin, 50, sit);
    const [knee, ankle] = ik(hip[0], hip[1], foot[0], foot[1], thigh, shin, side, 1.12);
    stroke(ctx, [hip, knee, ankle], B.legW, C.pants, 'butt');
    if (sit > 0.02) circle(ctx, knee[0], knee[1], (B.legW / 2 + 2) * sit, C.pants);
    // cuff
    const dx = ankle[0] - knee[0], dy = ankle[1] - knee[1], dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl;
    stroke(ctx, [[ankle[0] - ux * 9, ankle[1] - uy * 9], [ankle[0], ankle[1]]], B.legW + 1, C.pantsCuff, 'butt');
    // shoe: flat on the floor, or toe-down when hanging
    const ang = Math.atan2(uy, ux) - Math.PI / 2;
    const w = mix(48, 36, hang), h = mix(18, 27, hang);
    ctx.save();
    ctx.translate(ankle[0] + ux * mix(3, 9, hang) + side * mix(4, 1, hang), ankle[1] + uy * mix(3, 9, hang));
    ctx.rotate(ang * mix(0.35, 1, hang));
    rrect(ctx, -w / 2, -h / 2, w, h, h / 2, C.shoe);
    ctx.beginPath(); ctx.ellipse(-side * w * 0.1, -h * 0.18, w * 0.22, h * 0.16, 0, Math.PI * 1.05, Math.PI * 1.85);
    ctx.lineWidth = 2.2; ctx.strokeStyle = C.shoeHi; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  }

  function drawHand(ctx, x, y, ux, uy, palm, side) {
    const cx = x + ux * 4, cy = y + uy * 4;
    const px = -uy, py = ux; // perpendicular
    if (palm > 0.02) {
      const L = 4 + palm * 8;
      for (let i = 0; i < 4; i++) {
        const sp = (i - 1.5) * 0.3 * palm;
        const c = Math.cos(sp), s = Math.sin(sp);
        const fx = ux * c - uy * s, fy = ux * s + uy * c;
        const bx = cx + px * (i - 1.5) * 5.2, by = cy + py * (i - 1.5) * 5.2;
        stroke(ctx, [[bx, by], [bx + fx * (L + 6 - Math.abs(i - 1.3) * 1.6), by + fy * (L + 6 - Math.abs(i - 1.3) * 1.6)]], 7.4, C.skin);
      }
    }
    circle(ctx, cx, cy, B.handR - palm * 0.8, C.skin);
    // thumb, toward the body
    const tside = -side;
    circle(ctx, cx + px * tside * (9 + palm * 3) - ux * (2 - palm * 4), cy + py * tside * (9 + palm * 3) - uy * (2 - palm * 4), 5.6, C.skin);
  }

  function drawArm(ctx, sh, el, wr, palm, side) {
    stroke(ctx, [sh, el, wr], B.sleeveW + 3, C.shirtEdge);
    stroke(ctx, [sh, el, wr], B.sleeveW, C.shirt);
    const dx = wr[0] - el[0], dy = wr[1] - el[1], dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl;
    stroke(ctx, [[wr[0] - ux * 7, wr[1] - uy * 7], [wr[0] - ux * 2, wr[1] - uy * 2]], B.sleeveW + 1, C.shirtShade, 'butt');
    drawHand(ctx, wr[0], wr[1], ux, uy, palm, side);
  }

  // ── props ──────────────────────────────────────────────────────────────────
  /** The book, origin at the spine's centre. open 0..1 swings the left cover out. */
  function drawBook(ctx, open, flip) {
    const o = clamp(open, 0, 1);
    if (o < 0.5) {
      rrect(ctx, -1, -32, 48, 64, 6, C.bookPages);
    }
    if (o > 0.01) {
      // left cover, growing out of the spine; pages peek above
      ctx.beginPath();
      ctx.moveTo(0, -30); ctx.quadraticCurveTo(-24 * o, -37 - 4 * o, -46 * o, -32);
      ctx.lineTo(-46 * o, -26); ctx.lineTo(0, -24); ctx.closePath(); ctx.fillStyle = C.bookPages; ctx.fill();
      rrect(ctx, -48 * o, -31, 48 * o + 2, 64, 6 * o, C.bookDark);
      ctx.beginPath();
      ctx.moveTo(0, -30); ctx.quadraticCurveTo(24, -37 - 4 * o, 46, -32);
      ctx.lineTo(46, -26); ctx.lineTo(0, -24); ctx.closePath(); ctx.fillStyle = C.bookPages; ctx.fill();
    }
    rrect(ctx, 3 - 3 * o, -33, 46 + 2 * o, 66, 6, C.book);
    rrect(ctx, 3 - 3 * o, -33, 7, 66, 3, C.bookDark);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px Tajawal, "Noto Sans Arabic", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText('قدرات', 28, -13);
    ctx.restore();
    rrect(ctx, 14, 1, 28, 4.5, 2.25, C.bookLine);
    rrect(ctx, 14, 10, 20, 4.5, 2.25, C.bookLine);
    // a page turning over the top edge
    if (flip > 0.01 && flip < 0.99) {
      const th = Math.PI * flip;
      const tx = Math.cos(th) * 44, ty = -30 - Math.sin(th) * 30;
      ctx.beginPath();
      ctx.moveTo(0, -29);
      ctx.quadraticCurveTo(tx * 0.5, ty - 10 * Math.sin(th), tx, ty);
      ctx.lineTo(tx * 0.95, ty + 8);
      ctx.quadraticCurveTo(tx * 0.45, -26, 0, -24);
      ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = C.bookLine; ctx.stroke();
    }
  }

  function drawStick(ctx, a, b) {
    stroke(ctx, [a, b], 6.6, C.stick);
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const px = -dy / d * 1.4, py = dx / d * 1.4;
    stroke(ctx, [[a[0] + px + dx * 0.08, a[1] + py + dy * 0.08], [a[0] + px + dx * 0.5, a[1] + py + dy * 0.5]], 1.4, C.stickHi);
  }

  function drawStack(ctx, k) {
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = clamp(k * 1.6, 0, 1);
    const s = 0.9 + 0.1 * k;
    ctx.scale(s, s);
    const books = [[-76, -24, 152, 24, C.book], [-70, -46, 142, 22, C.bookStack2], [-74, -68, 146, 22, C.book]];
    for (const [x, y, w, h, col] of books) {
      rrect(ctx, x, y, w, h, 7, col);
      rrect(ctx, x + w - 26, y + 5, 22, h - 10, 4, C.bookPages);
      ctx.save(); ctx.globalAlpha *= 0.5;
      stroke(ctx, [[x + w - 22, y + h / 2 - 2], [x + w - 8, y + h / 2 - 2]], 1, C.bookLine, 'butt');
      stroke(ctx, [[x + w - 22, y + h / 2 + 2], [x + w - 8, y + h / 2 + 2]], 1, C.bookLine, 'butt');
      ctx.restore();
      rrect(ctx, x + 12, y + h / 2 - 2.5, 30, 5, 2.5, C.bookLine);
    }
    ctx.restore();
  }

  // ── effects ────────────────────────────────────────────────────────────────
  function star4(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 ? r * 0.32 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  function popScale(v) { return Math.max(0, v); }

  function drawEffects(ctx, P, ref, t) {
    const head = ref.head; // matrix of the head
    // crown sits on the afro, wobbling a beat behind the head
    if (P.crown > 0.01) {
      ctx.save();
      ctx.setTransform(head);
      ctx.translate(14, -104);
      ctx.rotate(rad(12 + P.crownR));
      const s = popScale(P.crown);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(-22, 8); ctx.lineTo(-25, -16); ctx.lineTo(-11, -4); ctx.lineTo(0, -22); ctx.lineTo(11, -4); ctx.lineTo(25, -16); ctx.lineTo(22, 8);
      ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill();
      rrect(ctx, -23, 2, 46, 9, 4, C.goldDk);
      circle(ctx, -25, -17, 3.6, C.gold); circle(ctx, 0, -23, 3.6, C.gold); circle(ctx, 25, -17, 3.6, C.gold);
      ctx.restore();
    }
    ctx.save();
    ctx.setTransform(ref.base);
    // sparkles round the book
    if (P.stars > 0.01 && ref.book) {
      for (let i = 0; i < 5; i++) {
        const ph = loop(t, 1300 + seeded(i) * 500, seeded(i, 3));
        const a = seeded(i, 1) * Math.PI * 2;
        const d = 42 + seeded(i, 2) * 26;
        const r = (6 + seeded(i, 4) * 6) * bell(ph) * P.stars;
        star4(ctx, ref.book[0] + Math.cos(a) * d, ref.book[1] + Math.sin(a) * d * 0.9, r, i % 2 ? C.gold : '#ffffff');
      }
    }
    // spark lines at the pointer's tip
    if (P.spark > 0.01 && ref.stickTip) {
      const [tx, ty] = ref.stickTip, ang = ref.stickAng;
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.75;
        const r0 = 8 + 4 * P.spark, r1 = r0 + 12 * P.spark;
        ctx.globalAlpha = clamp(P.spark * 1.5, 0, 1);
        stroke(ctx, [[tx + Math.cos(a) * r0, ty + Math.sin(a) * r0], [tx + Math.cos(a) * r1, ty + Math.sin(a) * r1]], 3.4, C.spark);
      }
      ctx.globalAlpha = 1;
    }
    // dust puffs at the feet
    if (P.dust > 0.01 && P.dust < 0.99) {
      const p = P.dust;
      ctx.globalAlpha = bell(p) * 0.9;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = s * (40 + p * 34 + i * 10), y = -4 - i * 5 - p * 8;
        circle(ctx, x + ref.x, y, (5 + i * 1.5) * (0.5 + p), '#efe3d3');
      }
      ctx.globalAlpha = 1;
    }
    // music notes rise and drift
    if (P.notes > 0.01) {
      for (let i = 0; i < 3; i++) {
        const p = loop(t, 1500, i / 3);
        const x = (i % 2 ? 1 : -1) * (88 + seeded(i) * 20) + Math.sin(p * 6) * 6;
        const y = -210 - p * 90;
        ctx.globalAlpha = bell(p) * P.notes;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p * 5 + i) * 0.25);
        ctx.fillStyle = i === 1 ? C.book : C.zzz;
        ctx.beginPath(); ctx.ellipse(-4, 6, 6, 4.5, -0.4, 0, Math.PI * 2); ctx.fill();
        stroke(ctx, [[1.5, 5], [1.5, -14], [9, -10]], 3, ctx.fillStyle);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // a green check badge
    if (P.badge > 0.01) {
      ctx.save(); ctx.translate(96, -300); const s = popScale(P.badge); ctx.scale(s, s);
      circle(ctx, 0, 3, 23, C.greenDk); circle(ctx, 0, 0, 23, C.green);
      stroke(ctx, [[-10, 1], [-3, 8], [11, -8]], 6, '#ffffff');
      ctx.restore();
    }
    ctx.restore();

    // head-anchored: Zzz, sweat, bubble, bulb, bang, heart
    ctx.save();
    ctx.setTransform(head);
    if (P.zzz > 0.01) {
      for (let i = 0; i < 3; i++) {
        const p = loop(t, 2400, i / 3);
        ctx.save();
        ctx.translate(48 + p * 40 + Math.sin(p * 5) * 5, -60 - p * 70);
        ctx.rotate(-0.2 + Math.sin(p * 4) * 0.12);
        ctx.globalAlpha = bell(p) * P.zzz;
        ctx.fillStyle = C.zzz;
        ctx.font = `900 ${14 + p * 14}px Tajawal, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('z', 0, 0);
        ctx.restore();
      }
    }
    if (P.sweat > 0.01 && P.sweat < 0.99) {
      const p = P.sweat;
      ctx.save(); ctx.globalAlpha = bell(p);
      ctx.translate(56 + p * 4, -34 + p * 22);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(7, 0, 6, 4); ctx.arc(0, 4, 6, 0, Math.PI); ctx.quadraticCurveTo(-7, 0, 0, -11);
      ctx.fillStyle = C.sweat; ctx.fill(); circle(ctx, -2, 3, 1.8, '#ffffff');
      ctx.restore();
    }
    if (P.bubble > 0.01) {
      const s = popScale(P.bubble);
      ctx.save(); ctx.translate(-82, -104); ctx.scale(s, s);
      circle(ctx, 38, 44, 5, '#ffffff'); circle(ctx, 28, 30, 8, '#ffffff');
      ellipse(ctx, 0, 0, 30, 25, '#ffffff');
      ctx.fillStyle = C.book; ctx.font = '900 32px Tajawal, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      ctx.fillText('؟', 0, 2);
      ctx.restore();
    }
    if (P.bulb > 0.01) {
      const s = popScale(P.bulb);
      ctx.save(); ctx.translate(-6, -150); ctx.scale(s, s);
      ctx.globalAlpha = clamp(P.bulb, 0, 1);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        stroke(ctx, [[Math.cos(a) * 26, Math.sin(a) * 26], [Math.cos(a) * 36, Math.sin(a) * 36]], 3.6, C.spark);
      }
      circle(ctx, 0, -2, 17, '#ffe066');
      circle(ctx, -6, -8, 5, '#fff6c4');
      rrect(ctx, -8, 12, 16, 11, 3, '#b9b6c4');
      stroke(ctx, [[-7, 16], [7, 16]], 1.6, '#8f8c9c');
      ctx.restore();
    }
    if (P.bang > 0.01) {
      const s = popScale(P.bang);
      ctx.save(); ctx.translate(72, -96); ctx.rotate(0.18); ctx.scale(s, s);
      stroke(ctx, [[0, -20], [0, 4]], 9, '#ff4b4b');
      circle(ctx, 0, 16, 5, '#ff4b4b');
      ctx.restore();
    }
    if (P.heart > 0.01) {
      const s = popScale(P.heart);
      ctx.save(); ctx.translate(70, -96); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-22, -2, -12, -22, 0, -10); ctx.bezierCurveTo(12, -22, 22, -2, 0, 12);
      ctx.fillStyle = '#ff4b6e'; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── the character ─────────────────────────────────────────────────────────
  /** Draws pose P with the floor at the current origin. `t` drives looping effects. */
  function draw(ctx, P, t) {
    const base = ctx.getTransform();
    const sy = P.sy, sx = 1 / Math.pow(Math.max(0.3, sy), 0.6);

    // shadow: stays on the floor and shrinks as the body rises
    const sk = clamp(1 - P.lift / 260, 0.45, 1.1);
    ellipse(ctx, P.x * 0.6, -1, mix(66, 92, clamp(P.stack, 0, 1)) * sk, 10.5 * sk, C.shadow);

    // the seat: a stack of books
    if (P.stack > 0.01) drawStack(ctx, P.stack);

    // body matrix: shift + lift, squash about the floor, lean about the hips
    const M = new DOMMatrix()
      .translate(P.x, -P.lift + P.seat)
      .scale(sx, sy)
      .translate(0, B.hipY).rotate(P.lean).translate(0, -B.hipY);
    const W = base.multiply(M);

    // legs (world)
    for (const s of [-1, 1]) {
      const hip = pt(M, s * B.hipX, B.hipY + 4);
      const fx = s < 0 ? P.fLx : P.fRx, fy = s < 0 ? P.fLy : P.fRy;
      const planted = [fx, -fy - B.ankle];
      const hangAt = [hip[0] + s * 5, hip[1] + (B.thigh + B.shin) * 0.9];
      drawLeg(ctx, hip, [mix(planted[0], hangAt[0], P.hang), mix(planted[1], hangAt[1], P.hang)], s, P.hang, clamp(P.seat / 14, 0, 1));
    }

    ctx.setTransform(W);
    drawPelvis(ctx);
    drawTorso(ctx);

    // head on the neck pivot
    ctx.save();
    ctx.translate(0, B.neckY + P.headY);
    ctx.rotate(rad(P.tilt));
    ctx.translate(0, B.headDY);
    drawHead(ctx, P);
    const headM = ctx.getTransform();
    ctx.restore();

    // arms (torso space)
    const arms = {};
    for (const s of [-1, 1]) {
      const shx = s * B.shoulderX, shy = B.shoulderY;
      const tx = s < 0 ? P.aLx : P.aRx, ty = s < 0 ? P.aLy : P.aRy;
      const el = s < 0 ? P.elL : P.elR;
      const [e, w] = ik(shx, shy, tx, ty, B.upper, B.fore, s * el, 1.28);
      arms[s] = { sh: [shx, shy], el: e, wr: w };
    }
    const handPos = (h) => {
      const k = (clamp(h, -1, 1) + 1) / 2;
      return [mix(arms[-1].wr[0], arms[1].wr[0], k), mix(arms[-1].wr[1], arms[1].wr[1], k)];
    };

    const ref = { base, head: headM, x: P.x };

    // the stick: in a hand (free or planted on the floor), or leaning in the world
    if (P.stickOn > 0.01) {
      const gT = handPos(P.stickH);
      const g = pt(W, gT[0], gT[1]); // grip in canvas px
      const gw = pt(M, gT[0], gT[1]); // grip in world units
      let A = rad(P.stickA + P.lean);
      if (P.stickPlant > 0.001) {
        const dx = P.stickPx - gw[0], dy = 0 - gw[1];
        let Ap = Math.atan2(dx, -dy);
        while (Ap - A > Math.PI) Ap -= 2 * Math.PI;
        while (A - Ap > Math.PI) Ap += 2 * Math.PI;
        A = mix(A, Ap, P.stickPlant);
      }
      let a = [gw[0] - Math.sin(A) * B.stickBack, gw[1] + Math.cos(A) * B.stickBack];
      let b = [gw[0] + Math.sin(A) * B.stickLen, gw[1] - Math.cos(A) * B.stickLen];
      if (P.stickW > 0.001) {
        const Aw = rad(P.stickWa);
        const wb = [P.stickWx, -2];
        const wa = [wb[0] + Math.sin(Aw) * (B.stickLen + B.stickBack), wb[1] - Math.cos(Aw) * (B.stickLen + B.stickBack)];
        a = [mix(a[0], wa[0], P.stickW), mix(a[1], wa[1], P.stickW)];
        b = [mix(b[0], wb[0], P.stickW), mix(b[1], wb[1], P.stickW)];
      }
      ctx.setTransform(base);
      drawStick(ctx, a, b);
      ref.stickTip = b; ref.stickAng = Math.atan2(b[1] - a[1], b[0] - a[0]);
      void g;
    }

    // the book, held by a hand
    ctx.setTransform(W);
    if (P.bookOn > 0.01) {
      const h = handPos(P.bookH);
      ctx.save();
      ctx.translate(h[0] + P.bookX, h[1] + P.bookY);
      ctx.rotate(rad(P.bookR));
      ctx.scale(P.bookS, P.bookS);
      drawBook(ctx, P.open, P.flip);
      const bm = ctx.getTransform();
      ctx.restore();
      const bc = base.inverse().multiply(bm).transformPoint(new DOMPoint(24 - 24 * clamp(P.open, 0, 1), 0));
      ref.book = [bc.x, bc.y];
    }

    // arms on top, back-to-front order chosen so crossed arms read
    const order = P.aLx > P.aRx ? [1, -1] : [-1, 1];
    for (const s of order) drawArm(ctx, arms[s].sh, arms[s].el, arms[s].wr, s < 0 ? P.palmL : P.palmR, s);

    ctx.setTransform(base);
    drawEffects(ctx, P, ref, t);
    ctx.setTransform(base);
  }

  root.Rig = { draw, BASE, B, C };
})(window);

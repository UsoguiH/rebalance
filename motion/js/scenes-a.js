'use strict';
// Scenes 0.00s – 4.07s: big "how do", type-on + pixel collapse, the
// handwritten sentence build, the "change" flash frames and the cyan star.

const INK = C.ink, PEN = [52, 34, 30];

// --- shared jitter for hand-drawn boil (re-drawn at 12 fps) ---
function boil(pts, t, amt = 1.4, seed = 1) {
  const f = Math.floor(t * 12);
  const r = mulberry32(seed * 1000 + f);
  return pts.map(([x, y]) => [x + (r() - 0.5) * amt * 2, y + (r() - 0.5) * amt * 2]);
}

// =================== A: "how do" -> pixel collapse =====================
const BIG = { size: 290, weight: 700, base: 497, xh: 355, doRight: 775 };

function bigText(ctx, str, x, o = {}) {
  text(ctx, str, x, BIG.base, { size: BIG.size, weight: 700, color: INK, tracking: -0.025, ...o });
}
function guideDashes(ctx, fromX = -20, alpha = 0.85) {
  ctx.save();
  ctx.strokeStyle = rgb([118, 72, 56], alpha);
  ctx.lineWidth = 2;
  ctx.setLineDash([27, 21]);
  for (const y of [BIG.xh, BIG.base]) {
    ctx.beginPath(); ctx.moveTo(fromX, y); ctx.lineTo(W + 20, y); ctx.stroke();
  }
  ctx.restore();
}
const SKETCH_TOP = [[497, 317], [600, 307], [720, 295], [836, 284]];
const SKETCH_RIGHT = [[834, 282], [838, 360], [843, 440], [850, 503]];
const SKETCH_BOTTOM = [[853, 505], [740, 509], [560, 516], [380, 524], [212, 532]];

function sceneHowDo(ctx, t) {
  paperBG(ctx);
  const wHow = measure(ctx, 'how do', BIG.size, 700, -0.025);
  const x0 = BIG.doRight - wHow;
  const full = 'how do you communicate';

  if (t < 0.567) {
    guideDashes(ctx);
    bigText(ctx, 'how do', x0);
    const o = { width: 6.5, color: rgb([28, 18, 16]), taper: 0.12, minWidth: 2 };
    stroke(ctx, catmull(boil(SKETCH_TOP, t, 1.2, 1), 8), 0, 1, { ...o, width: 6 });
    stroke(ctx, catmull(boil(SKETCH_RIGHT, t, 1.2, 2), 8), 0, 1, { ...o, taper: 0.05 });
    stroke(ctx, catmull(boil(SKETCH_BOTTOM, t, 1.2, 3), 8), 0, 1, { ...o, width: 7, taper: 0.3 });
    return;
  }
  if (t < 0.6) { // black block types "you"
    const sh = -43;
    guideDashes(ctx);
    bigText(ctx, full, x0 + sh, { color: [70, 66, 66] });
    bigText(ctx, 'how do', x0 + sh);
    ctx.fillStyle = rgb([40, 37, 37]);
    ctx.fillRect(708, 296, 384, 207);
    stroke(ctx, catmull([[1090, 120], [1084, 200], [1080, 255], [1068, 272]], 6), 0, 1, { width: 3, color: rgb(PEN) });
    stroke(ctx, catmull([[1060, 520], [900, 524], [700, 530], [556, 545]], 6), 0, 1, { width: 5, color: rgb([28, 18, 16]), taper: 0.4 });
    return;
  }
  if (t < 0.733) {
    const sh = t < 0.667 ? -289 : -462;
    guideDashes(ctx);
    // white out guides under the text (letters sit on a paper card)
    const wYou = measure(ctx, 'how do you', BIG.size, 700, -0.025);
    bigText(ctx, 'how do you', x0 + sh);
    if (t < 0.667) {
      ctx.fillStyle = rgb([60, 40, 34]);
      ctx.fillRect(x0 + sh + wYou + 16, 296, 3, 212);
    }
    return;
  }
  if (t < 0.8) { // pixelated mosaic
    const [lc, lg] = Layers.get('mosaic', Math.ceil(W / 9), Math.ceil(H / 9));
    lg.setTransform(1 / 9, 0, 0, 1 / 9, 0, 0);
    text(lg, 'how do you communicate', x0 - 462 - (t > 0.767 ? 20 : 0), BIG.base, { size: BIG.size, weight: 700, color: INK, tracking: -0.025 });
    lg.setTransform(1, 0, 0, 1, 0, 0);
    const id = lg.getImageData(0, 0, lc.width, lc.height), d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 90 ? 255 : 0;
    lg.putImageData(id, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(lc, 0, 0, lc.width * 9, lc.height * 9); ctx.restore();
    return;
  }
  if (t < 0.833) { // tiny blurred collapse
    const [lc, lg] = Layers.get('mosaic2', Math.ceil(W / 3), Math.ceil(H / 3));
    lg.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0);
    lg.translate(460, 433); lg.scale(0.21, 0.13); lg.translate(-460, -433);
    text(lg, 'how do you communicate', 140, BIG.base - 70, { size: 230, weight: 700, color: INK });
    lg.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.filter = 'blur(2px)'; ctx.drawImage(lc, 0, 0, W, H); ctx.restore();
    return;
  }
  // morse dashes + brackets (0.833 – 0.967)
  const k = seg(t, 0.833, 0.967);
  withLayer(ctx, 'morse', g => {
    g.fillStyle = rgb([40, 36, 36]);
    const r = mulberry32(5);
    let x = lerp(150, 120, k);
    while (x < 600) {
      const len = r() < 0.4 ? 22 + r() * 18 : 6;
      if (r() < 0.82) g.fillRect(x, 429, len, 6);
      x += len + 10 + r() * 14;
    }
    const bx = lerp(880, 650, E.outC(k));
    for (let y = 380; y < 470; y += 16) g.fillRect(bx, y, 6, 10);
    if (k > 0.5) {
      g.fillRect(bx - 8, 376, 22, 5);
      for (let y = 380; y < 470; y += 16) g.fillRect(4, y, 4, 10);
    }
  }, { blur: 1 });
}

// ================== B: handwritten sentence build ======================
const SENT = [
  { s: 'how', t: 0.967 }, { s: 'do', t: 0.967 }, { s: 'you', t: 0.967 }, { s: 'communicate', t: 0.967 },
  { s: 'that', t: 1.067 }, { s: 'you’re', t: 1.533 }, { s: 'going', t: 1.8 }, { s: 'through', t: 2.0 },
  { s: 'a', t: 2.1 }, { s: 'change?', t: 2.3 },
];
const sentX = t => kf(t, [[0.967, 70], [1.067, 62, E.outC], [1.33, 49, E.lin], [2.0, 38, E.lin], [2.67, 34, E.lin], [4.0, 30, E.lin]]);
const sentSize = t => kf(t, [[0.967, 41.5], [1.067, 41.3, E.lin], [1.33, 40.2, E.lin], [2.0, 39.6, E.lin], [2.67, 39.2, E.lin], [4.0, 39, E.lin]]);
const SENT_Y = 443;

// signature-like cursive used under the sentence (and its blurred ghost)
const SIGNATURE = catmull([
  [300, 566], [252, 571], [205, 598], [178, 636], [184, 668], [215, 676], [255, 660], [282, 645],
  [292, 652], [300, 640], [310, 655], [320, 640], [332, 654], [344, 640], [356, 652], [368, 638],
  [380, 652], [394, 640], [404, 650], [420, 640], [452, 560], [446, 548], [432, 590], [440, 660],
  [452, 694], [470, 640], [492, 548], [480, 552], [470, 620], [486, 650], [520, 636], [570, 622],
], 8);
const ZIGZAG = catmull([[240, 662], [290, 612], [310, 640], [330, 560], [350, 606], [372, 520], [392, 640], [420, 598], [450, 612], [470, 560], [490, 604], [540, 590], [600, 582], [694, 598]], 6);

function sentenceStrokes(ctx, t) {
  const pen = { color: rgb(PEN), width: 2.6, taper: 0.25, minWidth: 0.8 };
  // ghost of the signature, huge and out of focus, top right
  if (t < 1.36) {
    ctx.save();
    ctx.globalAlpha = 0.33 * (1 - seg(t, 1.25, 1.36));
    ctx.translate(430, -330); ctx.scale(1.55, 1.05);
    writeOn(ctx, t, SIGNATURE, 0.95, 1.12, 1.5, 1.6, { ...pen, width: 12, blur: 9, color: 'rgb(70,64,64)' });
    ctx.restore();
  }
  writeOn(ctx, t, SIGNATURE, 0.97, 1.13, 1.15, 1.27, { ...pen, width: 3 });
  writeOn(ctx, t, ZIGZAG, 1.19, 1.27, 1.29, 1.36, pen);
  // in-box editing ticks
  writeOn(ctx, t, catmull([[322, 388], [326, 410], [334, 418]], 4), 0.99, 1.02, 1.05, 1.07, pen);
  writeOn(ctx, t, catmull([[30, 494], [300, 476], [590, 462]], 4), 1.0, 1.04, 1.04, 1.07, { ...pen, width: 1.6 });
  writeOn(ctx, t, catmull([[490, 470], [486, 500], [480, 520]], 4), 1.0, 1.03, 1.05, 1.07, pen);
  // pen line dropping from the top onto "that"
  writeOn(ctx, t, catmull([[495, 170], [480, 250], [462, 330], [446, 380], [438, 404], [446, 400]], 6), 1.03, 1.1, 1.12, 1.2, { ...pen, width: 3.2 });
  writeOn(ctx, t, catmull([[72, 790], [74, 830], [76, 880]], 4), 1.03, 1.08, 1.1, 1.16, pen);
  // big swoop around the right
  writeOn(ctx, t, catmull([[766, -10], [824, 173], [844, 376], [809, 491], [737, 563], [665, 592], [621, 613], [640, 600], [660, 610], [680, 598], [700, 606]], 8), 1.285, 1.335, 1.355, 1.41, pen);
  writeOn(ctx, t, catmull([[578, 87], [586, 150], [594, 190], [607, 202]], 5), 1.27, 1.32, 1.34, 1.39, pen);
  // ticks after "that"
  writeOn(ctx, t, catmull([[600, 350], [604, 395], [612, 420]], 4), 1.36, 1.4, 1.43, 1.47, pen);
  writeOn(ctx, t, catmull([[607, 436], [640, 446], [660, 470], [694, 478]], 5), 1.37, 1.42, 1.44, 1.48, pen);
  writeOn(ctx, t, ellipsePts(540, 368, 13, 10, 0.5, -2.8, 2.6, 30), 1.43, 1.47, 1.49, 1.52, pen);
  // lightning stroke into "you're"
  writeOn(ctx, t, [[590, 373], [572, 470], [560, 545], [553, 570], [536, 562], [494, 674]], 1.49, 1.54, 1.55, 1.6, { ...pen, width: 3.4, taper: 0.15 });
  // lasso around "that you're" with a tail
  writeOn(ctx, t, ellipsePts(607, 421, 122, 36, -0.06, Math.PI * 0.9, Math.PI * 0.9 + TAU * 1.02, 90), 1.545, 1.6, 1.63, 1.71, { ...pen, width: 4.2 });
  writeOn(ctx, t, [[725, 425], [690, 470], [640, 520], [575, 575]], 1.58, 1.61, 1.62, 1.68, { ...pen, width: 3.6 });
  // vertical drop at the start of the line
  if (t > 1.68 && t < 1.84) {
    const k = E.outQ(seg(t, 1.68, 1.73)) - E.inQ(seg(t, 1.74, 1.83)) * 0.92;
    stroke(ctx, catmull([[101, -10], [100, 150], [100, 300], [102, 370], [110, 384]], 6), 0, k, { ...pen, width: 3.2 });
  }
}

function sentenceBox(ctx, t) {
  if (t >= 1.067) return;
  ctx.save();
  ctx.filter = `blur(${lerp(4, 0, seg(t, 0.967, 1.0))}px)`;
  ctx.strokeStyle = 'rgba(60,52,52,0.8)';
  ctx.fillStyle = 'rgba(60,52,52,0.85)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(22, 353, 572, 148);
  ctx.setLineDash([]);
  ctx.strokeRect(30, 360, 556, 134);
  for (const x of [14, 594]) { ctx.fillRect(x, 352, 5, 151); ctx.fillRect(x - 6, 350, 17, 4); ctx.fillRect(x - 6, 501, 17, 4); }
  ctx.restore();
}

function sceneSentence(ctx, t) {
  paperBG(ctx);
  wordsLine(ctx, t, sentX(t), SENT_Y, SENT.slice(0, 9), { size: sentSize(t), weight: 600, color: INK, blur: t < 1.0 ? lerp(3, 0, seg(t, 0.967, 1.0)) : 0 });
  sentenceBox(ctx, t);
  sentenceStrokes(ctx, t);
}

// =============== C: "change" flash + cyan star + spotlight ==============
function changeFlash(ctx, t) {
  if (t < 2.267) { // red frame
    solid(ctx, C.flashRed);
    vignette(ctx, 0.25, 0.4);
    const sp = starPath(1035, 433, 170, 470, 0.0, 0, [0.4, 1, 1, 1]);
    const g = ctx.createRadialGradient(1035, 433, 10, 1035, 433, 300);
    g.addColorStop(0, '#f6e45a'); g.addColorStop(1, '#e4a823');
    ctx.fillStyle = g; ctx.fill(sp);
    // white lightning scribbles
    const z1 = [[985, 245], [945, 262], [930, 210], [905, 255], [880, 222], [858, 258], [800, 182], [770, 250], [705, 226], [655, 238], [690, 268], [770, 282], [830, 300], [880, 294], [905, 318], [950, 300], [985, 330]];
    z1.forEach(p => { p[1] += 45; });
    const z2 = z1.map(([x, y]) => [x, 866 - y]);
    stroke(ctx, z1, 0, 1, { width: 5, color: '#f8f2ea', taper: 0.05 });
    stroke(ctx, z2, 0, 1, { width: 5, color: '#f8f2ea', taper: 0.05 });
    wordsLine(ctx, 3, sentX(t), SENT_Y, SENT.slice(0, 8), { size: sentSize(t), weight: 600, color: [40, 26, 24] });
    // vertical "change"
    ctx.save();
    ctx.translate(1018, 433); ctx.rotate(Math.PI / 2); ctx.scale(1.18, 0.7);
    text(ctx, 'change', 0, 42, { size: 128, weight: 800, color: [20, 14, 14], align: 'center', tracking: -0.04 });
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,20,20,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1125, 250); ctx.lineTo(1125, 690); ctx.moveTo(1112, 250); ctx.lineTo(1138, 250); ctx.moveTo(1112, 690); ctx.lineTo(1138, 690);
    ctx.moveTo(995, 255); ctx.lineTo(1125, 255); ctx.stroke();
    // little blue pixel globe
    const g2 = new Grid(7, 7);
    g2.disc(3.5, 3.5, 3.4, '#4fb0f0'); g2.rect(1, 3, 5, 1, '#d8f2ff'); g2.rect(3, 1, 1, 5, '#d8f2ff');
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(g2.canvas(), 965, 412, 42, 42); ctx.restore();
    return;
  }
  if (t < 2.3) { // yellow smear
    solid(ctx, C.yellow);
    withLayer(ctx, 'yflash', g => {
      g.fillStyle = '#f7f03c'; g.fill(starPath(506, 409, 380, 520, 0.02, 0.15));
      floatingIcons(g, 2.3, 0);
      for (let i = 0; i < 6; i++) stroke(g, [[180 + i * 40, 160 + i * 70], [900 + i * 30, 300 + i * 50]], 0, 1, { width: 14, color: 'rgba(255,250,230,0.8)' });
      g.save(); g.translate(1040, 433); g.rotate(Math.PI / 2); g.scale(1.18, 0.95);
      text(g, 'change', 0, 52, { size: 150, weight: 800, color: [40, 30, 20], align: 'center' }); g.restore();
      wordsLine(g, 3, 34, SENT_Y, SENT.slice(0, 8), { size: 39, weight: 600, color: [70, 50, 30] });
    }, { blur: 9 });
    return;
  }
  // light, blurred settle (2.30 – 2.33)
  withLayer(ctx, 'settle', g => {
    paperBG(g);
    for (let i = 0; i < 7; i++) {
      const r = mulberry32(40 + i);
      const x = r() * W, y = r() * H;
      stroke(g, [[x, y], [x + 260, y - 90]], 0, 1, { width: 4, color: 'rgba(40,40,40,0.7)' });
    }
    floatingIcons(g, 2.3, 0);
    wordsLine(g, 3, 34, SENT_Y, SENT, { size: 39.2, weight: 600, color: INK });
  }, { blur: 6 });
}

const FLOATERS = [
  { n: 'book', a: [676, 313], b: [592, 286], size: 78, rot: -0.28, d3: true },
  { n: 'clapper', a: [867, 313], b: [850, 292], size: 74, rot: -0.32 },
  { n: 'coin', a: [814, 506], b: [773, 522], size: 62, rot: 0.08 },
  { n: 'camera', a: [915, 626], b: [897, 683], size: 76, rot: 0.06 },
];
function floatingIcons(ctx, t, blur) {
  const k = E.outC(seg(t, 2.3, 3.0));
  for (const f of FLOATERS) {
    if (t > 3.53) continue;
    const x = lerp(f.a[0], f.b[0], k), y = lerp(f.a[1], f.b[1], k);
    const glitch = seg(t, 3.4, 3.53);
    const rot = f.rot + Math.sin(t * 1.3 + f.size) * 0.04;
    if (glitch > 0) {
      // pixel shatter: draw in strips with random offsets
      const r = mulberry32(Math.floor(t * 30) + f.size);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x - f.size, y - f.size + i * f.size * 0.4, f.size * 2, f.size * 0.4); ctx.clip();
        const dx = (r() - 0.5) * 30 * glitch, dy = (r() - 0.5) * 12 * glitch;
        Sprites.draw(ctx, f.n, x + dx, y + dy, f.size, { rot, alpha: 1 - glitch * 0.8 });
        ctx.restore();
      }
      continue;
    }
    if (f.d3) drawBook3D(ctx, x, y, f.size * 0.85, { rx: 0.6, ry: -0.5, rz: rot, blur, depth: 5 });
    else Sprites.draw(ctx, f.n, x, y, f.size, { rot, blur });
  }
}

function cyanStar(ctx, t) {
  const k = seg(t, 2.4, 3.9);
  // measured: centre just off the left edge, arms swing from (-55°, 28°) to (-43°, 40°)
  const cx = kf(t, [[2.333, 10], [2.4, -60, E.outC], [3.9, -90, E.lin]]), cy = kf(t, [[2.333, 415], [2.4, 432]]);
  const rot = kf(t, [[2.333, -0.18], [2.4, -1.02, E.outC], [3.9, -0.8, E.lin]]);
  const arms = [lerp(1, 0.97, k), lerp(1.07, 1.0, k), 1, 1];
  const R = kf(t, [[2.333, 430], [2.4, 545, E.outC], [3.9, 565, E.lin]]);
  const sp = starPath(cx, cy, R, R, 0.0, rot, arms);
  ctx.save();
  // outer glow
  ctx.shadowColor = 'rgba(70,240,230,0.55)';
  ctx.shadowBlur = 30;
  const blue = mix([160, 240, 236], [40, 100, 238], E.outQ(seg(t, 2.4, 3.1)));
  ctx.fillStyle = rgb(blue);
  ctx.fill(sp);
  ctx.restore();
  // interior noise + cyan rim
  ctx.save();
  ctx.clip(sp);
  Grain.draw(ctx, t * 3, 0.25);
  ctx.strokeStyle = rgb([70, 245, 228], 0.95);
  ctx.lineWidth = lerp(34, 18, k);
  ctx.filter = 'blur(6px)';
  ctx.stroke(sp);
  ctx.restore();
}

function spotlight(ctx, t) {
  // dark falloff that closes in from the corners (2.33 – 3.97)
  const k = E.ioQ(seg(t, 2.33, 3.85));
  const cx = lerp(800, 700, k), cy = 425;
  const inner = lerp(540, 330, k), outer = lerp(1100, 720, k);
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  const dark = [38, 34, 34], fin = E.outQ(seg(t, 2.36, 2.55));
  g.addColorStop(0, rgb(dark, 0));
  g.addColorStop(0.55, rgb(dark, lerp(0.3, 0.6, k) * fin));
  g.addColorStop(1, rgb(dark, lerp(0.7, 0.9, k) * fin));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // warm tint of the lit area right before the cut (3.88 – 3.97)
  const warm = seg(t, 3.87, 3.97);
  if (warm > 0) {
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    g2.addColorStop(0, rgb(mix([235, 205, 190], [230, 120, 70], E.inQ(warm)), 0.75 * warm));
    g2.addColorStop(0.6, rgb(mix([200, 140, 140], [200, 50, 40], warm), 0.7 * warm));
    g2.addColorStop(1, rgb([60, 30, 30], 0));
    ctx.fillStyle = g2;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function starStrokes(ctx, t) {
  const red = { color: '#e3262c', width: 9, taper: 0.4 };
  const gray = { color: 'rgba(40,40,40,0.75)', width: 3, taper: 0.4 };
  // flying streaks right after the flash
  for (let i = 0; i < 9; i++) {
    const r = mulberry32(300 + i);
    const x = 200 + r() * 900, y = 60 + r() * 760, L = 80 + r() * 260, a = -0.45 + r() * 0.3;
    const t0 = 2.31 + r() * 0.05;
    writeOn(ctx, t, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], t0, t0 + 0.04, t0 + 0.05, t0 + 0.13, i % 3 === 0 ? { ...red, width: 7 } : gray);
  }
  writeOn(ctx, t, catmull([[566, 150], [650, 230], [760, 380], [830, 500]], 6), 2.3, 2.325, 2.35, 2.4, { ...red, width: 13 });
  writeOn(ctx, t, catmull([[760, 600], [860, 560], [960, 520]], 6), 2.3, 2.325, 2.35, 2.41, { ...red, width: 10 });
  writeOn(ctx, t, catmull([[980, 640], [1010, 560], [1030, 650], [1080, 590]], 6), 2.3, 2.325, 2.35, 2.41, red);
  writeOn(ctx, t, [[700, 250], [735, 268]], 2.3, 2.32, 2.34, 2.38, red);
  writeOn(ctx, t, [[602, 72], [820, 230], [1035, 409]], 2.3, 2.325, 2.34, 2.4, gray);
  writeOn(ctx, t, [[361, 674], [662, 602]], 2.3, 2.325, 2.34, 2.4, gray);
  writeOn(ctx, t, [[722, 722], [867, 626]], 2.3, 2.325, 2.34, 2.4, gray);
  writeOn(ctx, t, catmull([[600, 220], [680, 200], [760, 250]], 6), 2.35, 2.38, 2.4, 2.45, { ...gray, width: 5, color: 'rgba(40,40,40,0.85)' });
  writeOn(ctx, t, ellipsePts(470, 255, 60, 20, -0.15, Math.PI * 1.1, Math.PI * 2.7, 40), 2.37, 2.4, 2.43, 2.48, { ...red, width: 8 });
  writeOn(ctx, t, catmull([[720, 160], [620, 300], [560, 560], [520, 700], [500, 820]], 6), 2.38, 2.41, 2.43, 2.5, { ...gray, width: 3 });
  writeOn(ctx, t, catmull([[600, 840], [720, 770], [860, 740]], 6), 2.4, 2.43, 2.44, 2.5, gray);
  writeOn(ctx, t, ellipsePts(1180, 340, 70, 50, 0.4, Math.PI * 0.9, Math.PI * 2.2, 40), 2.44, 2.47, 2.48, 2.52, gray);
  writeOn(ctx, t, catmull([[255, 160], [520, 125], [800, 115], [1080, 165], [1060, 210]], 8), 2.47, 2.5, 2.52, 2.58, { ...red, width: 8 });
  writeOn(ctx, t, catmull([[1040, 330], [1000, 300], [970, 330], [990, 360]], 6), 2.47, 2.5, 2.51, 2.55, red);
  writeOn(ctx, t, catmull([[740, 790], [760, 760], [770, 800], [790, 780]], 6), 2.49, 2.52, 2.53, 2.56, gray);
  writeOn(ctx, t, catmull([[365, 205], [372, 192], [380, 210]], 3), 2.6, 2.63, 2.64, 2.68, gray);
  // red loop before the cut
  writeOn(ctx, t, catmull([[361, 100], [480, 80], [640, 110], [760, 190], [800, 260], [780, 300], [770, 270], [790, 240]], 8), 3.93, 3.98, 4.0, 4.04, { ...red, width: 6 });
}

function sceneStar(ctx, t) {
  if (t < 2.333) { changeFlash(ctx, t); return; }
  if (t >= 3.995) { sceneOrb(ctx, t); return; }
  paperBG(ctx);
  spotlight(ctx, t);
  // sentence
  const words = SENT.map(w => ({ ...w }));
  const whiteYou = seg(t, 3.72, 3.75);
  if (whiteYou > 0) words[2].color = mix(INK, [250, 246, 240], whiteYou);
  const blurT = kf(t, [[2.333, 0], [2.37, 3.2], [2.5, 2.6], [2.62, 0]]);
  // "how do" gets swallowed by the star, so draw the line before the star…
  wordsLine(ctx, t, sentX(t), SENT_Y, words, { size: sentSize(t), weight: 600, color: INK, blur: blurT, fresh: INK });
  floatingIcons(ctx, t, lerp(5, 0, seg(t, 2.333, 2.55)));
  cyanStar(ctx, t);
  // …then re-draw "you" on top once it turns white
  if (whiteYou > 0) {
    const x = sentX(t) + measure(ctx, 'how do ', sentSize(t), 600, -0.01);
    text(ctx, 'you', x, SENT_Y, { size: sentSize(t), weight: 700, color: mix(INK, [252, 248, 244], whiteYou) });
  }
  starStrokes(ctx, t);
  // red specks
  const sp = kf(t, [[2.5, [905, 168]], [3.9, [860, 190]]]);
  if (t > 2.5 && t < 3.88) { ctx.fillStyle = '#d9252a'; ctx.beginPath(); ctx.arc(sp[0], sp[1], 4, 0, TAU); ctx.fill(); }
  if (t > 3.88 && t < 3.96) stroke(ctx, [[818, 216], [834, 200]], 0, 1, { width: 6, color: '#d9252a', taper: 0 });
  // selection box flicker on "change?"
  if (t < 2.4) {
    ctx.save(); ctx.strokeStyle = 'rgba(60,60,60,0.7)'; ctx.setLineDash([3, 3]); ctx.strokeRect(978, 410, 158, 50);
    ctx.fillStyle = 'rgba(60,60,60,0.8)'; for (const [x, y] of [[975, 407], [1133, 407], [975, 457], [1133, 457]]) ctx.fillRect(x, y, 6, 6); ctx.restore();
  }
}

function sceneOrb(ctx, t) {
  nightBG(ctx, [36, 30, 30]);
  const k = seg(t, 4.0, 4.033);
  const cx = lerp(505, 330, k), r = lerp(350, 190, E.outQ(k));
  // purple-red star remnants
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = rgb([170, 30, 50]);
  ctx.fill(starPath(lerp(-150, -60, k), 433, 700, 700, 0.0, -0.9));
  ctx.restore();
  const g = ctx.createRadialGradient(cx, 433, 0, cx, 433, r);
  g.addColorStop(0, '#f08a3a'); g.addColorStop(0.45, '#e8541e'); g.addColorStop(0.8, '#c41c22'); g.addColorStop(1, 'rgba(120,10,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // ring at the orb edge
  ctx.save(); ctx.strokeStyle = 'rgba(230,40,40,0.8)'; ctx.lineWidth = 6; ctx.filter = 'blur(2px)';
  ctx.beginPath(); ctx.arc(cx, 433, r * 0.72, 0, TAU); ctx.stroke(); ctx.restore();
  const words = SENT.map(w => ({ ...w })); words[2].color = [252, 248, 244];
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cx + r * 0.9, H); ctx.clip();
  wordsLine(ctx, t, 30, SENT_Y, words, { size: 39, weight: 600, color: [60, 30, 26], fresh: [60, 30, 26] });
  ctx.restore();
  if (k < 0.5) {
    stroke(ctx, ellipsePts(cx - 60, 433, 70, 160, 0.25, 0, TAU, 60), 0, 1, { width: 4, color: '#1e1414', taper: 0.2 });
    stroke(ctx, ellipsePts(cx - 30, 470, 110, 70, -0.6, 0, TAU * 0.8, 60), 0, 1, { width: 5, color: '#e01e2a', taper: 0.2 });
  }
}

'use strict';
// The film's soft "silk" gradient images, painted procedurally: a base
// gradient plus long blurred folds of colour. Each look is cached as a canvas
// and drawn at whatever size a scene needs.

const GRAD_LOOKS = {
  // pale blue-grey with indigo/violet folds sweeping up from the bottom left
  violet: { base: [[0, [200, 212, 220]], [1, [176, 196, 206]]], ang: 0.9, folds: [
    [0.15, 0.95, 0.55, 0.12, -0.75, [40, 28, 90], 0.95], [0.3, 0.75, 0.6, 0.1, -0.8, [90, 80, 160], 0.8],
    [0.05, 1.0, 0.3, 0.12, -0.6, [70, 20, 50], 0.8], [0.55, 0.45, 0.5, 0.08, -0.85, [150, 150, 200], 0.5]] },
  // deep teal-blue sweeping to a pale cloud on the lower right
  teal: { base: [[0, [44, 92, 122]], [0.55, [110, 160, 178]], [1, [214, 226, 228]]], ang: 0.75, folds: [
    [0.85, 0.75, 0.5, 0.22, -0.5, [225, 234, 236], 0.9], [0.1, 0.1, 0.45, 0.3, 0.6, [30, 74, 104], 0.8],
    [0.6, 0.45, 0.6, 0.06, -0.6, [170, 205, 214], 0.7]] },
  // blush pink with a deep magenta bloom on the left
  magenta: { base: [[0, [232, 196, 214]], [1, [224, 206, 220]]], ang: 0.4, folds: [
    [0.12, 0.35, 0.32, 0.3, 0.3, [130, 0, 70], 1], [0.2, 0.75, 0.4, 0.12, -0.6, [180, 40, 120], 0.7],
    [0.95, 0.1, 0.2, 0.2, 0.2, [196, 70, 150], 0.7], [0.6, 0.7, 0.55, 0.1, -0.8, [246, 228, 238], 0.8]] },
  // sand and pale sky
  peach: { base: [[0, [222, 216, 202]], [0.55, [222, 204, 170]], [1, [214, 190, 146]]], ang: 1.57, folds: [
    [0.85, 0.1, 0.4, 0.25, 0, [206, 212, 210], 0.55], [0.4, 0.75, 0.7, 0.05, 0.05, [230, 214, 182], 0.5]] },
  // pale blue with a violet band across the top
  sky: { base: [[0, [186, 204, 212]], [1, [184, 202, 210]]], ang: 1.57, folds: [
    [0.45, 0.0, 0.7, 0.08, 0.06, [80, 50, 140], 0.95], [0.75, 0.05, 0.4, 0.06, 0.1, [130, 120, 200], 0.7],
    [0.9, 0.75, 0.15, 0.15, 0, [200, 210, 220], 0.5]] },
  // dusty rose, darker toward the bottom
  rose: { base: [[0, [210, 170, 196]], [1, [178, 104, 140]]], ang: 1.57, folds: [
    [0.5, 0.15, 0.7, 0.2, 0, [220, 186, 210], 0.6]] },
  // lavender-grey wash with a pale diagonal light
  lilac: { base: [[0, [150, 150, 190]], [1, [205, 214, 222]]], ang: 0.55, folds: [
    [0.6, 0.45, 0.9, 0.09, -0.85, [222, 230, 234], 0.8], [0.15, 0.8, 0.5, 0.2, -0.7, [140, 130, 180], 0.6]] },
  // pale blue-grey mist with a violet bloom low on the right
  mist: { base: [[0, [182, 200, 204]], [1, [176, 194, 202]]], ang: 1.2, folds: [
    [0.85, 0.95, 0.35, 0.18, -0.3, [120, 110, 170], 0.75], [0.6, 1.0, 0.3, 0.1, -0.2, [150, 140, 190], 0.5]] },
  // the prompt backdrop: steel blue with long violet and maroon diagonals
  streak: { base: [[0, [176, 196, 212]], [0.5, [150, 160, 200]], [1, [190, 206, 214]]], ang: 0.3, folds: [
    [0.3, 0.75, 0.75, 0.09, -0.95, [70, 50, 110], 0.85], [0.55, 0.85, 0.5, 0.07, -0.95, [100, 30, 50], 0.85],
    [0.2, 0.3, 0.5, 0.1, -0.9, [200, 214, 222], 0.7], [0.85, 0.35, 0.4, 0.08, -0.95, [210, 220, 228], 0.7],
    [0.05, 0.9, 0.3, 0.1, -0.9, [60, 60, 110], 0.6]] },
  // warm beige paper
  beige: { base: [[0, [238, 232, 220]], [1, [232, 224, 210]]], ang: 1.0, folds: [
    [0.85, 0.15, 0.3, 0.3, 0, [226, 228, 224], 0.6]] },
};
const gradCache = {};
function gradImage(look, w = 300, h = 300) {
  const key = `${look}:${w}x${h}`;
  if (gradCache[key]) return gradCache[key];
  const L = GRAD_LOOKS[look];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const dx = Math.cos(L.ang) * w, dy = Math.sin(L.ang) * h;
  const lg = g.createLinearGradient(w / 2 - dx / 2, h / 2 - dy / 2, w / 2 + dx / 2, h / 2 + dy / 2);
  for (const [s, col] of L.base) lg.addColorStop(s, rgb(col));
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.filter = `blur(${Math.round(Math.min(w, h) * 0.08)}px)`;
  for (const [x, y, rx, ry, rot, col, a] of L.folds) {
    g.save(); g.globalAlpha = a; g.translate(x * w, y * h); g.rotate(rot);
    g.fillStyle = rgb(col); g.beginPath(); g.ellipse(0, 0, rx * w, ry * h, 0, 0, TAU); g.fill(); g.restore();
  }
  gradCache[key] = c;
  return c;
}
// draw a gradient image into a rounded rect
function gradTile(ctx, look, x, y, w, h, r = 4, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  rrect(ctx, x, y, w, h, r); ctx.clip();
  ctx.drawImage(gradImage(look), x, y, w, h);
  ctx.restore();
}

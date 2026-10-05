// M3 Expressive loading-indicator shapes. Every shape is sampled with the same number of points,
// so SVG <animate> can morph between them smoothly (works in Chrome, Safari and Firefox).
const N = 72;
const polar = (fn) => {
  const pts = [];
  let max = 0;
  for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; const r = fn(t); max = Math.max(max, r); pts.push([t, r]); }
  return 'M' + pts.map(([t, r]) => { const k = 44 / max; return `${(50 + Math.cos(t) * r * k).toFixed(1)} ${(50 + Math.sin(t) * r * k).toFixed(1)}`; }).join('L') + 'Z';
};
const poly = (n, round = 0.35) => (t) => {
  const seg = (Math.PI * 2) / n, a = ((t % seg) + seg) % seg - seg / 2;
  return (1 - round) * (Math.cos(Math.PI / n) / Math.cos(a)) + round;
};
export const SHAPES = [
  polar((t) => 1 + 0.085 * Math.cos(9 * t)),                       // cookie 9
  polar(poly(5)),                                                    // soft pentagon
  polar((t) => 1 / Math.sqrt((Math.cos(t + 0.8) / 1) ** 2 + (Math.sin(t + 0.8) / 0.6) ** 2)), // pill
  polar((t) => 1 + 0.13 * Math.cos(8 * t)),                        // sunny
  polar((t) => 1 + 0.24 * Math.cos(4 * t)),                        // clover
  polar((t) => 1 + 0.17 * Math.cos(6 * t)),                        // flower
  polar(poly(3, 0.5)),                                               // soft triangle
];

export function loadingIndicator({ size = '', contained = false, label = 'جارٍ التحميل' } = {}) {
  const values = [...SHAPES, SHAPES[0]].join(';');
  const n = SHAPES.length;
  const keyTimes = Array.from({ length: n + 1 }, (_, i) => (i / n).toFixed(3)).join(';');
  const splines = Array.from({ length: n }, () => '0.45 0 0.15 1').join(';');
  return `<span class="loading-indicator ${size}${contained ? ' contained' : ''}" role="progressbar" aria-label="${label}">
    <svg viewBox="0 0 100 100"><path fill="currentColor" d="${SHAPES[0]}"><animate attributeName="d" dur="${n * 0.65}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}" values="${values}"/></path></svg>
  </span>`;
}

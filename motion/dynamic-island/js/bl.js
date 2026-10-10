'use strict';
// The bottom-left (Base 44) beats, taken from the Island film in ../island/,
// which already rebuilds them frame for frame. Each wrapper maps film time to
// that film's own clock (ISL = seconds in ../island).

const at = (T0, ISL0) => t => ISL0 + (t - T0);
const CARDS_T = at(12.4, F(177));        // card slam and orbit
const PAGE_T = at(14.867, F(251));       // Claude Code window, dive onto Allow, click, iris
const WORDS_T = at(17.75, F(337.5));     // native. local. alive.
const SUN_T = at(20.133, F(409));        // Bloub mark and the name typing in

// The Base 44 card slam starts over the fading file tree; here it comes out of
// the dark tile instead, so the tree overlay is left out.
function blCards(ctx, t) {
  const tree = window.sceneTreeFaded;
  window.sceneTreeFaded = () => {};
  try { sceneCards(ctx, CARDS_T(t)); } finally { window.sceneTreeFaded = tree; }
}
function blPage(ctx, t) {
  const u = PAGE_T(t);
  if (u < F(331.5)) scenePage(ctx, u); else { darkBG(ctx); sceneIris(ctx, u); }
}
function blWords(ctx, t) { sceneWords(ctx, WORDS_T(t)); }

// The closing mark from ../island/js/scene-end.js, with the name's letters
// landing on the typing passage's clicks instead of their own timing.
function blSun(ctx, t) {
  const u = SUN_T(t);
  if (u < F(412)) { sceneSun(ctx, u); return; }
  sunBG(ctx, u);
  const cx = kf(u, SUN_X), r = kf(u, SUN_R), cy = r > 31 ? 130 + r : 132 + r;
  sunMark(ctx, u, cx, cy, r, 0.6 * (1 - seg(u, F(412), F(412.8))));
  const ts = CUE_TIMES.name, word = cueOf('name').text;
  let x = cx + 37.5;
  for (let i = 0; i < word.length; i++) {
    const adv = measure(ctx, word[i], baseFont, 'Inter Tight', 800, -0.02);
    const k = seg(t, ts[i], ts[i] + 0.12);
    if (k > 0) text(ctx, word[i], x, 176, { size: baseFont, family: 'Inter Tight', weight: 800, color: mix([196, 190, 226], [22, 20, 36], E.ioQ(k)), alpha: clamp(k * 2.5), tracking: -0.02 });
    x += adv;
  }
}

// Template main: the master timeline, the letterbox curve, the type weights and the
// soundtrack. M.renderAt(t) draws any frame on demand; ../js/player.js drives it.
// The scene boundaries are the original film's, so the voice can follow its
// delivery beat for beat (see template/beats.json for the phrase slots).
(function () {
  const S = M.scenes;
  const T = M.tpl;
  const { W, H } = M;
  M.DURATION = 26.6;
  // voice + music, made by tools/mix.js; the piece plays silently without it
  M.AUDIO = 'audio/soundtrack.mp3';
  // a lighter cut of every weight: regular and medium go Light, bold goes Medium
  const LIGHTER = { 400: 300, 500: 300, 600: 400, 700: 500, 800: 600 };
  M.weight = (w) => LIGHTER[w] || w;
  M.EXTRA_FONTS = ['300 40px Inter', '500 40px Caveat', '400 40px Caveat'];

  // [start, scene, timing]: timing is an offset into the scene's own clock (T.OFF),
  // or [from, to] to stretch the slot over that span of it
  const TIMELINE = [
    [0, S.intro, T.OFF.intro],
    [3.345, S.montage, T.OFF.montage],
    [7.613, S.but, T.OFF.but],
    [9.904, S.reveal, [10.25, 13.4]],
    [12.74, S.noMore, T.OFF.noMore],
    [15.135, S.arch, T.OFF.arch],
    [17.056, S.once, T.OFF.once],
    [18.714, S.ring, T.OFF.ring],
    [20.082, S.wall, T.OFF.wall],
    [23.05, S.end, T.OFF.end],
  ];

  // letterbox bar height per side (the original's curve)
  const BARS = [
    [0, 0], [2.85, 0], [3.1, 22, 'inQuad'], [3.345, 51, 'outQuad'],
    [7.98, 51], [8.21, 62, 'inQuad'], [8.39, 93, 'inQuad'], [8.52, 155, 'linear'], [8.74, 198, 'outQuad'], [8.95, 206, 'outQuad'],
    [9.55, 206], [9.74, 190, 'inQuad'], [9.87, 144, 'inQuad'], [9.94, 90, 'linear'], [10.08, 57, 'outQuad'], [10.36, 43, 'outQuad'],
    [13.86, 44], [14.54, 51, 'inQuad'], [14.94, 66, 'inQuad'], [15.13, 80, 'linear'],
    [15.135, 105], [15.36, 131, 'outQuad'], [15.7, 147, 'outQuad'], [16.5, 157, 'outQuad'],
    [16.95, 157], [17.06, 122, 'inQuad'], [17.25, 95, 'outQuad'], [17.66, 69, 'outQuad'], [18.18, 52, 'outQuad'], [18.84, 42, 'outQuad'],
    [25.5, 42],
  ];

  // the scene playing at t, and t on that scene's own clock
  const sceneAt = (t) => {
    let i = TIMELINE.length - 1;
    while (i > 0 && t < TIMELINE[i][0]) i--;
    const [start, scene, timing] = TIMELINE[i];
    if (!Array.isArray(timing)) return [scene, t + timing];
    const end = i < TIMELINE.length - 1 ? TIMELINE[i + 1][0] : M.DURATION;
    return [scene, M.lerp(timing[0], timing[1], (t - start) / (end - start))];
  };

  M.renderAt = (c, t) => {
    M.releaseAll();
    c.save();
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    const [scene, local] = sceneAt(t);
    if (scene) scene(c, local);
    c.restore();
    const b = M.key(t, BARS);
    M.bars(c, b, b);
  };
})();

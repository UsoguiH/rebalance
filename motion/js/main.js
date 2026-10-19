// Main: the master timeline and the letterbox. M.renderAt(t) draws any frame
// on demand; js/player.js drives it.
(function () {
  const S = M.scenes;
  const { W, H } = M;
  M.DURATION = 26.6;

  // [start, scene] in seconds; each scene runs until the next one starts
  const TIMELINE = [
    [0, S.intro],
    [3.345, S.montage],
    [7.613, S.but],
    [9.904, S.lifeSaver],
    [12.74, S.noMore],
    [15.135, S.costs],
    [17.056, S.payOnce],
    [18.714, S.video],
    [20.082, S.image],
    [23.05, S.allInOne],
  ];

  // letterbox bar height per side, measured off the original
  const BARS = [
    [0, 0], [1.75, 0], [2.01, 20, 'inQuad'], [2.28, 45, 'linear'], [2.6, 51, 'outQuad'],
    [7.98, 51], [8.21, 62, 'inQuad'], [8.39, 93, 'inQuad'], [8.52, 155, 'linear'], [8.74, 198, 'outQuad'], [8.95, 206, 'outQuad'],
    [9.55, 206], [9.74, 190, 'inQuad'], [9.87, 144, 'inQuad'], [9.94, 90, 'linear'], [10.08, 57, 'outQuad'], [10.36, 43, 'outQuad'],
    [13.86, 44], [14.54, 51, 'inQuad'], [14.94, 66, 'inQuad'], [15.13, 80, 'linear'],
    [15.135, 105], [15.36, 131, 'outQuad'], [15.7, 147, 'outQuad'], [16.5, 157, 'outQuad'],
    [16.95, 157], [17.06, 122, 'inQuad'], [17.25, 95, 'outQuad'], [17.66, 69, 'outQuad'], [18.18, 52, 'outQuad'], [18.84, 42, 'outQuad'],
    [25.5, 42],
  ];

  const sceneAt = (t) => {
    let i = TIMELINE.length - 1;
    while (i > 0 && t < TIMELINE[i][0]) i--;
    return TIMELINE[i][1];
  };

  M.renderAt = (c, t) => {
    M.releaseAll();
    c.save();
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    const scene = sceneAt(t);
    if (scene) scene(c, t);
    c.restore();
    const b = M.key(t, BARS);
    M.bars(c, b, b);
  };
})();

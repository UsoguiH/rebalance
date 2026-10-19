// Jira main: the master timeline, the letterbox curve, and the soundtrack.
// M.renderAt(t) draws any frame on demand; ../js/player.js drives it.
(function () {
  const S = M.scenes;
  const { W, H } = M;
  M.DURATION = 27.0;
  // ElevenLabs voiceover, made by tools/voice.js; the piece plays silently without it
  M.AUDIO = 'audio/vo.mp3';
  M.EXTRA_FONTS = ['700 40px Caveat', '600 40px Caveat'];

  // [start, scene] in seconds; each scene runs until the next one starts
  const TIMELINE = [
    [0, S.intro],
    [3.4, S.montage],
    [7.6, S.but],
    [10.25, S.meetJira],
    [13.4, S.noMore],
    [15.3, S.arch],
    [17.2, S.planOnce],
    [18.85, S.boards],
    [20.2, S.automation],
    [23.1, S.end],
  ];

  // letterbox bar height per side
  const BARS = [
    [0, 0], [2.9, 0], [3.15, 22, 'inQuad'], [3.4, 51, 'outQuad'],
    [7.98, 51], [8.21, 62, 'inQuad'], [8.39, 93, 'inQuad'], [8.52, 155, 'linear'], [8.74, 198, 'outQuad'], [8.95, 206, 'outQuad'],
    [9.75, 206], [9.95, 190, 'inQuad'], [10.1, 144, 'inQuad'], [10.2, 90, 'linear'], [10.32, 57, 'outQuad'], [10.6, 43, 'outQuad'],
    [14.2, 44], [14.9, 51, 'inQuad'], [15.15, 66, 'inQuad'], [15.3, 80, 'linear'],
    [15.305, 105], [15.5, 131, 'outQuad'], [15.9, 147, 'outQuad'], [16.7, 157, 'outQuad'],
    [17.1, 157], [17.21, 122, 'inQuad'], [17.4, 95, 'outQuad'], [17.8, 69, 'outQuad'], [18.3, 52, 'outQuad'], [18.95, 42, 'outQuad'],
    [27, 42],
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

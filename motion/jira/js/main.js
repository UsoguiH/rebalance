// Jira main: the master timeline, the letterbox curve, and the soundtrack.
// M.renderAt(t) draws any frame on demand; ../js/player.js drives it.
(function () {
  const S = M.scenes;
  const { W, H } = M;
  M.DURATION = 26.6;
  // ElevenLabs voiceover, made by tools/voice.js; the piece plays silently without it
  M.AUDIO = 'audio/vo.mp3';
  M.EXTRA_FONTS = ['700 40px Caveat', '600 40px Caveat'];

  // [start, scene, timing] in seconds, on the original's scene boundaries so the
  // voiceover can follow its delivery beat for beat. timing is an offset into the
  // scene's own clock, or [from, to] to stretch the slot over that span of it.
  const TIMELINE = [
    [0, S.intro, 0],
    [3.345, S.montage, 0],
    [7.613, S.but, 0],
    [9.904, S.meetJira, [10.25, 13.4]],
    [12.74, S.noMore, 0.66],
    [15.135, S.arch, 0.165],
    [17.056, S.planOnce, 0.144],
    [18.714, S.boards, 0.136],
    [20.082, S.automation, 0.118],
    [23.05, S.end, 0.05],
  ];

  // letterbox bar height per side: the original's curve, except the bars arrive
  // with this piece's later intro zoom
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

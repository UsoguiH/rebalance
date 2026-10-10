'use strict';
// Typing sound for any motion page: the reference launch video's own typing,
// four passages cut from it untouched (see passages.json for the click times
// inside each). Use it for every typed line so all pieces share the sound.
//
//   const sfx = TypingSFX('../sfx/typing/');
//   await sfx.ready;                              // after a user gesture
//   const s = sfx.schedule('Right now,', 0.28);   // s.times: when each letter appears
//   sfx.play(s, audioCtx.currentTime);
//
// schedule() picks the passage whose number of clicks suits the line and shares
// the letters out over its clicks, so every burst of letters lands on a click.
function TypingSFX(base = './') {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buffers = {};
  let passages = [];
  const ready = fetch(base + 'passages.json').then(r => r.json()).then(list => {
    passages = list;
    return Promise.all(list.map(p => fetch(base + p.file).then(r => r.arrayBuffer())
      .then(b => ac.decodeAudioData(b)).then(buf => { buffers[p.file] = buf; })));
  });

  function schedule(text, start) {
    const want = text.length / 2.4;
    const p = passages.reduce((a, q) => (Math.abs(q.clicks.length - want) < Math.abs(a.clicks.length - want) ? q : a));
    const clicks = p.clicks.map(c => start + c);
    const times = [...text].map((_, i) => clicks[Math.min(clicks.length - 1, Math.floor((i * clicks.length) / text.length))]);
    return { times, file: p.file, at: start - p.clicks[0], end: clicks[clicks.length - 1] };
  }

  // Play a schedule; its times are measured from `at0` (an AudioContext time).
  function play(s, at0 = ac.currentTime) {
    if (ac.state === 'suspended') ac.resume();
    const src = ac.createBufferSource();
    src.buffer = buffers[s.file];
    src.connect(ac.destination);
    const when = at0 + s.at;
    src.start(Math.max(ac.currentTime, when), Math.max(0, ac.currentTime - when));
    return () => { try { src.stop(); } catch (e) { /* already ended */ } };
  }

  return { ready, schedule, play, context: ac };
}

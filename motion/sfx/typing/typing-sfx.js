'use strict';
// Typing clicks for any motion page. The twelve samples in this folder were cut
// from the reference launch video's typewriter captions; use them for every
// typed line so all pieces share the same sound.
//
//   const sfx = TypingSFX('../sfx/typing/');
//   await sfx.ready;                         // after a user gesture
//   const { times, clicks } = sfx.schedule('Right now,', 0.28);
//   sfx.play(clicks, audioCtx.currentTime);  // or mix offline from `clicks`
//
// schedule() reveals one character per 32–62 ms (longer after spaces and
// punctuation) and clicks on roughly every second or third keystroke, never
// closer than 50 ms, which matches the rhythm in the reference.
function TypingSFX(base = './', seed = 7) {
  let rnd = (s => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(seed);
  const uni = (a, b) => a + (b - a) * rnd();
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buffers = [];
  const ready = Promise.all(Array.from({ length: 12 }, (_, i) =>
    fetch(`${base}key${String(i + 1).padStart(2, '0')}.wav`).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b))
      .then(buf => { buffers[i] = buf; })));

  function schedule(text, start) {
    const times = [], clicks = [];
    let t = start, last = -1;
    for (let i = 0; i < text.length; i++) {
      times.push(t);
      if ((i === 0 || text[i - 1] === ' ' || rnd() < 0.38) && t - last > 0.05) {
        clicks.push({ t, key: Math.floor(rnd() * 12), gain: uni(0.62, 1) });
        last = t;
      }
      t += uni(0.032, 0.062) + (text[i] === ' ' ? uni(0.01, 0.04) : 0) + (',.'.includes(text[i]) ? 0.1 : 0);
    }
    return { times, clicks, end: t };
  }

  // Play `clicks` with click.t measured from `at` (an AudioContext time).
  function play(clicks, at = ac.currentTime, volume = 0.8) {
    if (ac.state === 'suspended') ac.resume();
    const nodes = clicks.map(c => {
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buffers[c.key]; g.gain.value = c.gain * volume;
      src.connect(g).connect(ac.destination);
      src.start(Math.max(ac.currentTime, at + c.t));
      return src;
    });
    return () => nodes.forEach(n => { try { n.stop(); } catch (e) { /* already ended */ } });
  }

  return { ready, schedule, play, context: ac };
}

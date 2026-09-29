// Audio: everything is synthesized with the Web Audio API at runtime.
//   lib.js      noise buffers, Karplus–Strong plucks, self-cleaning voices
//   ambience.js wind, birds, oasis, souq murmur, campfire
//   music.js    generative maqam Hijaz loop (oud, qanun, darbuka, drone)
//   sfx.js      camel steps/bells/grunt/jump/land, prop hits, UI
// Contract (ARCHITECTURE.md): createAudio(ctx) → { unlock(), update(dt, t) }.
// Extras: toggle(), muted, stats() for debugging.

import { createKit } from './lib.js';
import { createAmbience } from './ambience.js';
import { createMusic } from './music.js';
import { createSfx } from './sfx.js';

const KEY = 'qarya.muted';

function readMuted() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function saveMuted(m) {
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* private mode */ }
}

export function createAudio(ctx) {
  const { events } = ctx;
  let muted = readMuted();
  let ac = null, kit = null, outGain = null, analyser = null, peakBuf = null;
  let amb = null, music = null, sfx = null;
  let started = false, panelOpen = false, suspendTimer = 0, failed = false;
  let peakHold = 0, peakAcc = 0, errors = 0;

  // Stereo position of a world point as seen by the camera (−1 left … 1 right).
  const panFor = (pos) => {
    const cam = ctx.camera;
    if (!cam || !pos) return 0;
    const e = cam.matrixWorld.elements;
    const dx = pos.x - cam.position.x, dz = pos.z - cam.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const rl = Math.hypot(e[0], e[2]) || 1;
    return Math.max(-1, Math.min(1, (dx * e[0] + dz * e[2]) / (len * rl)));
  };

  function build() {
    kit = createKit(ac);
    // buses → mix → compressor → out (mute fades) → speakers
    const mix = ac.createGain();
    mix.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    outGain = ac.createGain();
    outGain.gain.value = muted ? 0 : 1;
    mix.connect(comp); comp.connect(outGain); outGain.connect(ac.destination);
    analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    peakBuf = new Float32Array(analyser.fftSize);
    comp.connect(analyser);

    const reverb = ac.createConvolver();
    reverb.buffer = kit.impulse;
    const wet = ac.createGain();
    wet.gain.value = 0.3;
    reverb.connect(wet); wet.connect(mix);

    const ambBus = ac.createGain(); ambBus.gain.value = 0.9; ambBus.connect(mix);
    const musicBus = ac.createGain(); musicBus.gain.value = 0.75; musicBus.connect(mix);
    const sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(mix);

    amb = createAmbience(kit, ambBus, reverb, ctx, panFor);
    music = createMusic(kit, musicBus, reverb);
    sfx = createSfx(kit, sfxBus, mix, reverb, ctx, panFor);
    if (panelOpen) music.setDuck(true);
  }

  function unlock() {
    if (failed) return;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { failed = true; return; }
      try {
        ac = new AC({ latencyHint: 'interactive' });
        build();
      } catch (err) {
        console.warn('audio unavailable:', err);
        failed = true; ac = null;
        return;
      }
    }
    if (!muted && !document.hidden && ac.state !== 'running') ac.resume().catch(() => {});
    if (muted && ac.state === 'running') ac.suspend().catch(() => {});
    if (started && !muted) music.start();
  }

  function toggle() {
    muted = !muted;
    saveMuted(muted);
    events.emit('audio:state', { muted });
    if (!ac) return;
    clearTimeout(suspendTimer);
    const g = outGain.gain;
    if (muted) {
      g.cancelScheduledValues(ac.currentTime);
      g.setTargetAtTime(0, ac.currentTime, 0.08);
      // Once faded, stop the clock entirely to save CPU.
      suspendTimer = setTimeout(() => { if (muted) ac.suspend().catch(() => {}); }, 500);
    } else {
      ac.resume().catch(() => {}).then(() => {
        g.cancelScheduledValues(ac.currentTime);
        g.setValueAtTime(0, ac.currentTime);
        g.setTargetAtTime(1, ac.currentTime, 0.25);
      });
      if (started) music.start();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (!muted) ac.resume().catch(() => {});
  });

  const safe = (fn) => (data) => {
    if (!ac || ac.state !== 'running') return;
    try { fn(data); } catch (err) { errors++; console.warn('audio:', err); }
  };

  events.on('audio:toggle', toggle);
  events.on('game:start', () => {
    started = true;
    events.emit('audio:state', { muted });
    if (ac && !muted) music.start();
  });
  events.on('panel:open', (d) => { panelOpen = true; music?.setDuck(true); });
  events.on('panel:closed', (d) => { panelOpen = false; music?.setDuck(false); safe(() => sfx.close())(d); });
  events.on('camel:grunt', safe(() => sfx.grunt()));
  events.on('player:jump', safe(() => sfx.jump()));
  events.on('player:land', safe(() => sfx.land()));
  events.on('prop:hit', safe((d) => sfx.propHit(d)));
  events.on('ui:click', safe(() => sfx.click()));
  events.on('zone:enter', safe(() => sfx.chime()));
  events.on('zone:open', safe(() => sfx.openGliss()));

  function update(dt, t) {
    if (!ac || ac.state !== 'running') return;
    try {
      amb.update(dt, t);
      sfx.update(dt, t);
      music.update();
      peakAcc += dt;
      if (peakAcc > 0.2) {
        peakAcc = 0;
        analyser.getFloatTimeDomainData(peakBuf);
        let p = 0;
        for (let i = 0; i < peakBuf.length; i++) { const a = Math.abs(peakBuf[i]); if (a > p) p = a; }
        peakHold = Math.max(peakHold * 0.98, p);
      }
    } catch (err) {
      errors++;
      if (errors < 5) console.warn('audio update:', err);
    }
  }

  return {
    unlock,
    update,
    toggle,
    get muted() { return muted; },
    get context() { return ac; },
    // Debug snapshot: window.__qarya.audio.stats()
    stats() {
      return {
        state: ac ? ac.state : 'none',
        muted, started, panelOpen, errors,
        time: ac ? +ac.currentTime.toFixed(2) : 0,
        voices: kit?.stats.active ?? 0,
        voicesCreated: kit?.stats.created ?? 0,
        peakVoices: kit?.stats.peakActive ?? 0,
        peak: +peakHold.toFixed(3),
        music: music ? { ...music.stats, running: music.running } : null,
        ambience: amb ? { ...amb.stats } : null,
        sfx: sfx ? { ...sfx.stats } : null,
      };
    },
  };
}

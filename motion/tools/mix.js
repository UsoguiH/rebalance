// Builds a piece's soundtrack: cuts the voice take into phrases and places each
// on its beat, lays the music under it (back-timed to an anchor, with a filtered
// dip), ducks the music under the voice, and masters the mix.
//   node motion/tools/mix.js --piece motion/jira
// Reads <piece>/audio/mix.json; writes <piece>/audio/vo.mp3 and soundtrack.mp3.
// Stems are measured (EBU R128) and gained to their targets, so swapping the take
// or the track keeps the balance. Needs ffmpeg on the PATH.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
}
const piece = path.resolve(args.piece || path.join(__dirname, '..', 'jira'));
const dir = path.join(piece, 'audio');
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'mix.json'), 'utf8'));
const D = cfg.duration;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-'));
const ms = (s) => Math.max(0, Math.round(s * 1000));
const ffmpeg = (argv) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...argv], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
};
// integrated loudness (LUFS) of a file, or of a window of it
const loudness = (file, ss = 0, t = 0) => {
  const win = t ? ['-ss', String(ss), '-t', String(t)] : [];
  const r = spawnSync('ffmpeg', ['-hide_banner', ...win, '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  // the last "I:" is the summary; earlier ones are running values
  const all = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return all.length ? parseFloat(all[all.length - 1][1]) : -70;
};

// ---- voice: each phrase trimmed with a little air, faded, and delayed to its beat
const PRE = 0.04;
const POST = 0.12;
const segs = cfg.voice.segments;
const parts = segs.map((s, i) => {
  const from = Math.max(0, s.from - PRE);
  const dur = s.to + POST - from;
  return (
    `[0:a]atrim=start=${from}:end=${from + dur},asetpts=PTS-STARTPTS,` +
    `afade=t=in:d=0.015,afade=t=out:st=${(dur - 0.06).toFixed(3)}:d=0.06,` +
    `adelay=delays=${ms(s.at - (s.from - from))}:all=1[v${i}]`
  );
});
const voRaw = path.join(tmp, 'vo.wav');
ffmpeg([
  '-i', path.join(dir, cfg.voice.take),
  '-filter_complex', `${parts.join(';')};${segs.map((_, i) => `[v${i}]`).join('')}amix=inputs=${segs.length}:normalize=0,apad=whole_dur=${D},aformat=channel_layouts=stereo[vo]`,
  '-map', '[vo]', '-ar', '44100', '-t', String(D), voRaw,
]);
const voGain = cfg.voice.lufs - loudness(voRaw);
const voWav = path.join(tmp, 'vo-level.wav');
ffmpeg(['-i', voRaw, '-af', `volume=${voGain.toFixed(2)}dB`, voWav]);
ffmpeg(['-i', voWav, '-b:a', '192k', path.join(dir, 'vo.mp3')]);

// ---- music: back-timed to the anchor, a low-passed dip, fades, ducked under the voice
const m = cfg.music;
const musicFile = path.join(dir, m.file);
const off = m.anchor.track - m.anchor.at;
const muGain = m.lufs - loudness(musicFile, off, D);
const [d0, d1] = m.dip;
const [f0, f1] = m.fade_out;
const k = m.duck;
const graph =
  `[1:a]atrim=start=${off}:end=${off + D},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,volume=${muGain.toFixed(2)}dB,asplit=3[ma][mb][mc];` +
  `[ma]atrim=start=0:end=${d0},asetpts=PTS-STARTPTS[m1];` +
  `[mb]atrim=start=${d0}:end=${d1},asetpts=PTS-STARTPTS,lowpass=f=650,lowpass=f=650,volume=-4dB[m2];` +
  `[mc]atrim=start=${d1}:end=${D},asetpts=PTS-STARTPTS[m3];` +
  `[m1][m2][m3]concat=n=3:v=0:a=1,afade=t=in:d=${m.fade_in},afade=t=out:st=${f0}:d=${f1 - f0},apad=whole_dur=${D}[mus];` +
  `[0:a]asplit=2[voice][key];` +
  `[mus][key]sidechaincompress=threshold=${k.threshold}:ratio=${k.ratio}:attack=${k.attack_ms}:release=${k.release_ms}[duck];` +
  `[duck][voice]amix=inputs=2:normalize=0:duration=longest[out]`;
const mixRaw = path.join(tmp, 'mix.wav');
ffmpeg(['-i', voWav, '-i', musicFile, '-filter_complex', graph, '-map', '[out]', '-ar', '44100', '-t', String(D), mixRaw]);

// ---- master: gain to the target loudness, then a true-peak limiter
const gain = cfg.master.lufs - loudness(mixRaw);
const ceiling = Math.pow(10, cfg.master.true_peak / 20).toFixed(3);
ffmpeg([
  '-i', mixRaw,
  '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${ceiling}:attack=2:release=60:level=disabled`,
  '-ar', '44100', '-b:a', '192k', '-t', String(D), path.join(dir, 'soundtrack.mp3'),
]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`voice ${voGain.toFixed(1)} dB, music ${muGain.toFixed(1)} dB, master ${gain.toFixed(1)} dB`);
console.log('wrote', path.join(dir, 'vo.mp3'), 'and', path.join(dir, 'soundtrack.mp3'));

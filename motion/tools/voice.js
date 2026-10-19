// Voices a piece's script with ElevenLabs and lays the lines on its timeline.
//   ELEVENLABS_API_KEY=... node motion/tools/voice.js --piece motion/jira
//   options: --voice <voice_id>  --model <model_id>  --force (re-voice every line)
// Reads <piece>/voice/script.json, writes one MP3 per line to <piece>/audio/lines/,
// then mixes them at their cue times into <piece>/audio/vo.mp3 (plus vo.json with
// the measured durations). Lines are cached by text + voice + settings, so editing
// one line only re-voices that line. Needs ffmpeg/ffprobe on the PATH.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const nx = process.argv[i + 1];
  if (nx === undefined || nx.startsWith('--')) args[a.slice(2)] = true;
  else args[a.slice(2)] = process.argv[++i];
}

const piece = path.resolve(args.piece || path.join(__dirname, '..', 'jira'));
const script = JSON.parse(fs.readFileSync(path.join(piece, 'voice', 'script.json'), 'utf8'));
const voiceId = args.voice || process.env.ELEVENLABS_VOICE_ID || script.voice_id;
const modelId = args.model || script.model_id;
const outDir = path.join(piece, 'audio');
const lineDir = path.join(outDir, 'lines');
fs.mkdirSync(lineDir, { recursive: true });
const manifestFile = path.join(lineDir, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

// one TTS request; previous/next text keep the delivery continuous across lines
const tts = (text, previous, next) =>
  new Promise((resolve, reject) => {
    const key = process.env.ELEVENLABS_API_KEY;
    const body = JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: script.voice_settings,
      previous_text: previous || undefined,
      next_text: next || undefined,
    });
    const req = https.request(
      {
        method: 'POST',
        host: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) reject(new Error(`ElevenLabs ${res.statusCode}: ${buf.toString('utf8').slice(0, 300)}`));
          else resolve(buf);
        });
      }
    );
    req.on('error', reject);
    req.end(body);
  });

const duration = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(r.stdout);
};

(async () => {
  const lines = script.lines;
  const need = lines.filter((l, i) => {
    const hash = crypto.createHash('sha1').update(JSON.stringify([l.text, voiceId, modelId, script.voice_settings])).digest('hex');
    l.file = path.join(lineDir, `${String(i).padStart(2, '0')}.mp3`);
    l.hash = hash;
    return args.force || manifest[path.basename(l.file)] !== hash || !fs.existsSync(l.file);
  });
  if (need.length && !process.env.ELEVENLABS_API_KEY) {
    console.error(`ELEVENLABS_API_KEY is not set; ${need.length} line(s) still need voicing.`);
    process.exit(1);
  }
  for (const l of need) {
    const i = lines.indexOf(l);
    process.stdout.write(`voicing ${i}: ${l.text}\n`);
    const audio = await tts(l.text, i > 0 ? lines[i - 1].text : '', i < lines.length - 1 ? lines[i + 1].text : '');
    fs.writeFileSync(l.file, audio);
    manifest[path.basename(l.file)] = l.hash;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  }

  // check each line fits before the next cue
  const report = lines.map((l, i) => {
    const dur = duration(l.file);
    const slot = (i < lines.length - 1 ? lines[i + 1].t : script.duration) - l.t;
    if (dur > slot + 0.1) console.warn(`line ${i} runs ${(dur - slot).toFixed(2)}s past its slot: "${l.text}"`);
    return { t: l.t, dur: +dur.toFixed(3), text: l.text };
  });

  // mix every line at its cue into one track the length of the piece
  const inputs = lines.flatMap((l) => ['-i', l.file]);
  const delays = lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.t * 1000)}:all=1[a${i}]`).join(';');
  const mix = `${delays};${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:${script.duration}[out]`;
  const vo = path.join(outDir, 'vo.mp3');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', mix, '-map', '[out]', '-ar', '44100', '-b:a', '192k', vo], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  fs.writeFileSync(path.join(outDir, 'vo.json'), JSON.stringify({ voice_id: voiceId, model_id: modelId, lines: report }, null, 1));
  console.log('wrote', vo);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

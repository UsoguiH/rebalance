# The Connector — motion reel

A recreation of a 9:16 explainer reel: monochrome 3D capsule crowd, a dark
square-headed "connector" character, an outlined white protagonist, and
condensed kinetic captions with yellow highlight wipes. It is built with
Three.js plus a 2D canvas overlay, and rendered to MP4 with headless Chromium.

- `out/reel.mp4`: 1080×1920, 30 fps, silent, timed to the original read
- `SCRIPT.md`: the voice-over text for ElevenLabs

## Add your voice-over

```sh
npm install                      # three.js
pip install faster-whisper       # word timestamps
python3 tools/retime.py audio/voice.mp3
node tools/render.mjs --cues cues.voice.json --audio audio/voice_padded.wav
# -> out/reel_voice.mp4
```

Optional quiet music bed (synthesized, royalty-free), ducked under the voice:

```sh
python3 tools/music.py 36.27 audio/music.wav     # length = video duration
ffmpeg -i out/reel_voice.mp4 -i audio/voice_padded.wav -i audio/music.wav -filter_complex \
  "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][sc];[2:a]volume=-29dB[m];\
   [m][sc]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=600[md];\
   [v][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest out/reel_voice_music.mp4
```

`retime.py` transcribes the file, matches each word to the script, and writes
`cues.voice.json`. Every caption, highlight, character action and camera move
is keyed to a word id, so the whole piece follows the new read.

## Preview in a browser

```sh
npx http-server -p 8090 -c-1 .   # then open http://localhost:8090
```

Drop the voice file at `audio/voice.mp3` to hear it while scrubbing.

## Layout

| File | What it does |
|---|---|
| `src/world.js` | figures (lathe body, sphere/rounded-cube head, inverted-hull outlines), floor grid, podium, `?`, glass panel |
| `src/shots.js` | the Director: camera orbit keys, character poses and lines as functions of time |
| `src/overlay.js` | captions (masked rise, zoom entries, highlight and underline wipes), name card, "Hey." bubble, cards |
| `src/main.js` | renderer, motion-blur accumulation on whips, preview player |
| `cues.json` | word timings (reel seconds) that drive everything |
| `tools/render.mjs` | `--stills 1.5,6` for frames, `--from/--to` for a range, otherwise the full MP4 |

## Fonts

- **Le Murmure** (Velvetyne, SIL OFL 1.1) is drawn condensed to 80% to match the
  reference headline face, which is likely a commercial font. To use the
  original, drop it in `fonts/` and change the `FontFace` in `src/main.js`.
- **Montserrat** (SIL OFL 1.1) is used for the card, bubble and "You're thinking,".

# The Line

A 1:47 vertical (1080×1920) discipline video in a hand-drawn ink style. Every word and
doodle is written by a pen in sync with the ElevenLabs narration. The whole film is one
journal page joined by a single line, and in the climax the tally marks become a staircase.

## Build

```sh
npm install
node src/render.js              # -> out/video.mp4 (silent)
node src/render.js --pen-data   # -> out/pen.json (pen motion at 240 Hz, for the writing sound)
python3 src/mix.py              # -> out/the-line.mp4 (voice + writing sounds, -14 LUFS)
```

Preview frames without rendering everything: `node src/render.js --still 12,48.5,90`.

## Files

| | |
|---|---|
| `audio/voice.mp3` | ElevenLabs narration |
| `audio/words.json` | word timings of the narration (from Whisper), which drive every animation |
| `src/scenes.js` | the eight scenes: what gets drawn, where, and on which words |
| `src/ink.js` | handwriting (glyph-by-glyph pen reveal), stroke drawing, line "boil" |
| `src/geom.js` | hand-drawn shapes: stick figures, clocks, seats, mirror, stairs… |
| `src/camera.js` | auto-framing camera and the transcript → video-time mapping |
| `src/render.js` | paper, grain, pen, mood effects; streams frames into ffmpeg |
| `src/mix.py` | soundtrack: voice plus a writing sound synthesised from the pen's motion |

A 0.6 s breath is added at each scene change (`CUTS` in `render.js` and `mix.py`), so
the timings in `words.json` are mapped to video time in `makeTimeline`.

## Sound

There is no music. The writing sound is generated from the pen's motion, so it always
matches the picture:
- **Friction noise:** shaped to a pencil-on-paper spectrum, with a softer felt-tip
  sound and a slight squeak for the marker lettering.
- **Rhythm:** handwriting pulses with every up- and downstroke, and drawn lines swell
  with the pen's speed.
- **Detail:** paper-tooth crackle, a low body from the table, and a small tap whenever
  the pen touches down.
- **Mix:** the pen dips 4 dB under the voice and comes forward in the pauses.

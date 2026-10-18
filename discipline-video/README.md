# The Line

A 1:47 vertical (1080×1920) discipline video in a hand-drawn ink style. Every word and
doodle is written by a pen in sync with the ElevenLabs narration. The whole film is one
journal page joined by a single line, and in the climax the tally marks become a staircase.

## Build

```sh
npm install
./fetch-music.sh          # "Reign" by Kevin MacLeod (CC BY 4.0)
node src/render.js        # -> out/video.mp4 (silent) + out/ink.json (pen activity for the sound)
python3 src/mix.py        # -> out/the-line.mp4 (voice + music + pencil sounds, -14 LUFS)
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
| `src/mix.py` | soundtrack mix and final mux |

A 0.6 s breath is added at each scene change (`CUTS` in `render.js` and `mix.py`), so
the timings in `words.json` are mapped to video time in `makeTimeline`.

## Music credit (required in the post description)

"Reign" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

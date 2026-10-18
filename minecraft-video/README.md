# Steve vs Herobrine

A vertical (1080×1920) hand-drawn story video with the emotional Eleven v3 narration
(`audio/voice.mp3`). It is rendered in two realistic looks from the same story:

| | Look | Scene change |
|---|---|---|
| `--look 1` | ruled notebook, blue ballpoint pen, red highlights | the page turns |
| `--look 4` | whiteboard, black marker, red highlights | an eraser wipes the board |

It reuses the renderer in `../discipline-video` (ink, fonts, paper and tools, pen sound);
run `npm install` there first.

```sh
node src/render.js --look 1      # -> out/video_1.mp4 + out/pen_1.json
python3 src/mix.py 1             # -> out/steve_vs_herobrine_notebook.mp4
node src/render.js --look 4      # whiteboard
python3 src/mix.py 4             # -> out/steve_vs_herobrine_whiteboard.mp4
node src/render.js --look 1 --still 12,36.5   # preview frames
```

- `audio/words.json`: word timings from Whisper, which drive every drawing.
- `src/story.js`: the eight pages and what is drawn on which words.
- `src/blocks.js`: blocky Minecraft-style doodles (Steve, Herobrine, trees, torches…).
- `src/render.js`: pages, page-turn and eraser transitions, pen and camera.
- `src/mix.py`: voice, writing sound, page flip / eraser sounds.

A 0.9 s breath is added at each scene change (`CUTS`) to make room for the transition.

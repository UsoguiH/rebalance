# Motion pieces

Canvas motion pieces drawn entirely in code: type, UI, cursor, transitions and
backdrops. Brand logos come from Simple Icons. There is no build step.

| Piece | Page | Render |
|---|---|---|
| **One Button**: a frame-by-frame recreation of a 26-second promo | `index.html` | `renders/one-button.mp4`, plus `renders/side-by-side.mp4` (original on top) |
| **Jira**: a 27-second promo in the same visual language, with a voiceover script | `jira/index.html` | `renders/jira.mp4` |

## Play

Serve the folder and open a page:

```sh
npx http-server motion -p 8080   # then visit http://localhost:8080 or /jira/
```

| Key | Action |
|---|---|
| Space | Play / pause |
| ← → | Step one frame |
| Shift + ← → | Step one second |
| Home | Restart |

Add `?t=12.5` to the URL to open at a given second, `&paused` to hold there, or
`&loop` to loop. If a piece has a voiceover track, it plays in sync. Browsers only
allow sound after a click, so press Play.

## Render to video

```sh
node motion/tools/render.js --mp4 out.mp4                                  # One Button
node motion/tools/render.js --page jira/index.html --audio motion/jira/audio/vo.mp3 --mp4 jira.mp4
node motion/tools/render.js --out frames --from 8 --to 10                  # a range, as PNGs
node motion/tools/render.js --out frames --times 1.9,3.2                   # single frames
```

The tool needs Playwright (Chromium) and, for `--mp4`, ffmpeg.

## Real brand icons

`js/icons.js` is generated from [Simple Icons](https://simpleicons.org) (CC0) at a
pinned version. To add a mark, put its slug in `tools/icons.js` and run:

```sh
node motion/tools/icons.js
```

Pieces draw a mark with `M.icon(ctx, slug, x, y, size, color?)`. The marks are
trademarks of their owners. Some brands asked Simple Icons to remove their logos
(Slack, OpenAI, Microsoft and others), so those are still drawn by hand.

## Voiceover (ElevenLabs)

The Jira script lives in `jira/voice/script.json`: one entry per line, with the
second it starts on the timeline, plus the voice and its settings (default voice:
Brian). To voice it:

```sh
ELEVENLABS_API_KEY=... node motion/tools/voice.js --piece motion/jira
# options: --voice <voice_id>   --model <model_id>   --force
```

The tool voices each line through the ElevenLabs API and mixes the lines at their
cue times into `jira/audio/vo.mp3`, loudness-normalised. It also warns about any line that
runs past its slot. Lines are cached, so editing one line only re-voices that line.
After that, the player plays the voiceover, and re-running the render command
above muxes it into the MP4.

## How One Button was matched

The source was a phone screen recording (1156x2510, variable frame rate around
62 fps) with the 16:9 clip in the middle. It holds 808 unique frames, about 30 fps
of real content. Each one was cropped out and studied:

- **Timing:** scene cuts, letter entrances and keystrokes were read from
  frame-to-frame differences and the recording's own timestamps.
- **Motion paths:** the cursor fingertip, the "Life saver" button box, the letterbox
  bars, the caret, the heart bubble and the word positions were tracked numerically
  per frame. They are stored as keyframe tracks (`M.key`, `M.track`).
- **Easing:** words settle with an exponential ease. The "But" letters use a
  spring rise with one overshoot. The zoom onto "Button" is a fast in-quad whip
  with a soft landing.
- **Color and layout:** sampled from the frames (backgrounds, button fills, text
  inks) and measured in 1920x1080 space.

The original is set in SF Pro. Inter stands in for it, condensed by 7% (`M.COND`)
so word widths match. Photographic plates (the meadow, the Sistine hands, the
collage photos) are painted procedurally as stand-ins.

## Code map

| File | What it does |
|---|---|
| `js/kit.js` | Shared: easing, keyframe tracks, layers, motion blur, text, brand icons, the hand cursor, letterbox |
| `js/icons.js` | Generated Simple Icons paths and brand colours |
| `js/player.js` | Shared player: transport, scrubbing, frame stepping, voiceover sync |
| `js/art.js` | One Button: procedural plates, reaching hands, collage photos, brand glyphs |
| `js/scenes-a.js` | One Button: meadow intro, the "Button" whip-zoom and click, the button montage |
| `js/scenes-b.js` | One Button: "But…", the typed caret line, "Life saver" and its restyles, "No more endless…" |
| `js/scenes-c.js` | One Button: "unnecessary costs" arch, "Pay once", Video/Voice, Image/Motion/Creation, end card |
| `js/main.js` | One Button: master timeline and letterbox curve |
| `jira/js/art.js` | Jira: sky plate, app tiles, the Jira tile, the board UI kit, clutter props |
| `jira/js/scenes-a.js` | Jira: "Your team's work is everywhere", the clutter montage, "But…" into the caret line |
| `jira/js/scenes-b.js` | Jira: "Meet Jira" and the live board, "No more chasing updates", the "From backlog… to launch" arch |
| `jira/js/scenes-c.js` | Jira: "Plan once, Ship faster", Boards to Timeline, Automation to "All connected", end card |
| `jira/js/main.js` | Jira: master timeline, letterbox curve, soundtrack |
| `jira/voice/script.json` | Jira voiceover lines and their cue times |
| `tools/render.js` | Headless frame renderer and MP4 export (with optional soundtrack) |
| `tools/icons.js` | Regenerates `js/icons.js` from Simple Icons |
| `tools/voice.js` | Voices a script with ElevenLabs and mixes it to the timeline |

# One Button: a motion recreation

A frame-by-frame recreation of a 26-second promo animation, built as a single
`<canvas>` piece. Everything is drawn in code: type, buttons, cursor, hands,
backdrops and transitions. There are no image or video assets and no build step.

- `renders/one-button.mp4`: the recreation, 1920x1080 at 30 fps
- `renders/side-by-side.mp4`: the original (top) against the recreation (bottom), frame-synced

## Play

Serve the folder and open `index.html`:

```sh
npx http-server motion -p 8080   # then visit http://localhost:8080
```

| Key | Action |
|---|---|
| Space | Play / pause |
| ← → | Step one frame |
| Shift + ← → | Step one second |
| Home | Restart |

Add `?t=12.5` to the URL to open at a given second, `&paused` to hold there, or
`&loop` to loop.

## Render to video

```sh
node motion/tools/render.js --mp4 out.mp4                # whole piece
node motion/tools/render.js --out frames --from 8 --to 10  # a range, as PNGs
node motion/tools/render.js --out frames --times 1.9,3.2   # single frames
```

The tool needs Playwright (Chromium) and, for `--mp4`, ffmpeg.

## How it was matched

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
| `js/kit.js` | Easing, keyframe tracks, layers, motion blur, text, the hand cursor, letterbox |
| `js/art.js` | Procedural plates, reaching hands, collage photos, brand glyphs |
| `js/scenes-a.js` | Meadow intro, the "Button" whip-zoom and click, the button montage |
| `js/scenes-b.js` | "But…", the typed caret line, "Life saver" and its restyles, "No more endless…" |
| `js/scenes-c.js` | "unnecessary costs" arch, "Pay once", Video/Voice, Image/Motion/Creation, end card |
| `js/main.js` | Master timeline, letterbox curve, player |
| `tools/render.js` | Headless frame renderer and MP4 export |

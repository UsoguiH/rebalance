# Sara loading screen and hero

Slate's loading screen (slateteams.com), played from Slate's own Rive file on black, with its
cursor replaced by a flat pointer with a name pill, shaped after the reference image. The cursor
turns and changes colour with Slate's own, and every colour change switches to the next name,
women and men in turn, in IBM Plex Sans Arabic (the page's one font); the loader then reveals a placeholder hero
section, whose second button replays it.

## Run it

Slate's file is not in this repo. Fetch it once (Node 18+):

```sh
node demo/agent-cursors/tools/fetch-slate-assets.js   # writes demo/agent-cursors/slate-assets/ (git-ignored)
```

Then open `demo/agent-cursors/index.html`, straight from disk or through any local server.

## How it works

- `tools/fetch-slate-assets.js` downloads the loader, turns its navy ground black, and recolours
  its `cursor` artboard to marker colours, in place (only colour bytes change).
  `tools/rive-format.json` is the property table it needs, generated from Rive's MIT runtime headers.
- `slate-loader.js` ports Slate's `<c-preloader>` script. So the first second is never dead while the
  player loads, it draws the cursor itself from the first frame, flowing round a figure-eight in
  the middle like a juggled ball, then hands its position and speed to Slate's cursor the moment
  that appears. Everything runs through a soft, fully damped spring (`AgentCursor.smooth`), so the
  motion flows like honey; it tightens during the opening sweep to stay on the ribbons' tip. The player (Rive's
  canvas-lite, as Slate uses for this loader) is preloaded in the background, and the site opens
  as soon as it can, after at least 1.6s. `MonikaLoader.replay()` plays it again.
- `monika.js` patches `CanvasRenderingContext2D.fill/stroke`. When the cursor's marker colour is
  painted, it skips Slate's cursor and draws this one with the same transform and colour, with the
  upright pill trailing on a spring. `CREW` and `FONT` at the top set the names and font; `data-monika-scale`
  on the canvas sets the size (2.6 on the loader).

`vendor/rive-canvas-lite/` is `@rive-app/canvas-lite` 2.45.0 (MIT): `rive.wasm` for served pages,
`rive-wasm.js` (the same, inlined) for opening the page from disk.

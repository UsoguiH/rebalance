# Monika loading screen

Slate's loading screen (slateteams.com), played from Slate's own Rive file on black, with its
cursor replaced by Monika: the glowing blue arrow and "Monika" name pill from the reference
image. It loops.

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
- `slate-loader.js` ports Slate's `<c-preloader>` script and replays it in a loop.
- `monika.js` patches `CanvasRenderingContext2D.fill/stroke`. When the cursor's marker colour is
  painted, it skips Slate's cursor and draws Monika at the same spot, upright and blue, with the
  pill trailing on a spring. `data-monika-scale` on the canvas sets her size (1.9 on the loader).

`vendor/rive-canvas/` is `@rive-app/canvas` 2.45.0 (MIT).

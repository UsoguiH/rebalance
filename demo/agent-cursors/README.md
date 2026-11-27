# Monika agent cursors

Slate's interactive scenes (slateteams.com: Collaborate, Move/resize/rotate, Drag and drop,
and the "cursor magic" footer), played from Slate's own Rive files with every cursor replaced
by Monika: a glowing arrow with a spring-rigged name pill. Your own mouse becomes Monika too.

## Run it

Slate's files are not in this repo. Fetch them once (Node 18+):

```sh
node demo/agent-cursors/tools/fetch-slate-assets.js   # writes demo/agent-cursors/slate-assets/ (git-ignored)
```

Then open `demo/agent-cursors/index.html`, straight from disk or through any local server.

## How it works

- `tools/fetch-slate-assets.js` downloads the scenes and recolours each file's shared `cursor`
  artboard to marker colours, in place (only colour bytes change). `tools/rive-format.json` is
  the property table it needs, generated from Rive's MIT-licensed runtime headers.
- `slate-scenes.js` ports Slate's `<c-rive>` player and its scene controllers line for line,
  using Rive's Canvas2D player instead of WebGL.
- `monika.js` patches `CanvasRenderingContext2D.fill/stroke`. When a marker colour is painted,
  it skips Slate's cursor and draws Monika with the same transform and layer depth, so every
  movement, click and fade stays Slate's. On top of that the name pill trails on a spring,
  leans into motion and tucks away while a teammate's comment bubble types in.
  `MonikaCursor.page()` drives the visitor's own pointer; `MonikaCursor.CREW` holds the names
  and colours (Slate blue is Monika).

`vendor/rive-canvas/` is `@rive-app/canvas` 2.45.0 (MIT).

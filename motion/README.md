# Show It: motion study

This is a frame-by-frame recreation of a 17.75-second kinetic-type and pixel-art motion piece:

> how do you communicate that you're going through a change? you dont. you just show it.
> action. intention. curiosity. through ones own ability to L O V E

It is drawn entirely in code on a 1156×867 (4:3) `<canvas>`. There are no image or video files, and the only external asset is the Outfit web font.

## Run

Open `motion/index.html` in a browser, or serve the repository root:

```sh
npx http-server -p 8080   # then open http://localhost:8080/motion/
```

| Control | Action |
|---|---|
| Space / Play button | Play or pause (the animation loops) |
| Scrub bar | Jump to any time |
| ← / → | Step one frame (1/30 s) |
| `?t=5.2` in the URL | Open paused on that time |

## Export to video

`render(t)` is a pure function of time, so the animation can be rendered offline at any frame rate:

```sh
node motion/tools/capture.js --out frames --fps 30          # needs playwright
ffmpeg -framerate 30 -i frames/%04d.png -vf pad=1156:868 -pix_fmt yuv420p show-it.mp4
```

Pass `--times 2.3,6.8` to render only specific times. If Playwright is installed globally, set `PLAYWRIGHT_MODULE`.

## How it was matched

The reference was a phone screen recording. The 4:3 video area was cropped out at 1156×867 and sampled at 30 fps (532 frames). Every scene below was then tuned by rendering the same frame numbers and comparing them side by side with the reference.

| Time (s) | Scene | Notes |
|---|---|---|
| 0.00 – 0.97 | "how do" | 290 px Outfit Bold on dashed type guides with a boiling hand-drawn box. A black block types "you", then the line pixelates into a mosaic and collapses into morse dashes |
| 0.97 – 2.20 | Sentence build | Words pop in grey and settle to ink. Tapered pen strokes write on and erase: a signature, a lightning stroke, a lasso around "that you're" |
| 2.20 – 2.33 | Flash frames | A red frame with a yellow astroid star, a vertical "change", and white zigzags, then a blurred yellow smear |
| 2.33 – 4.07 | Cyan star | A noisy blue star with a cyan rim swings in from the left. Pixel props float in and glitch out, a dark spotlight closes in, "you" turns white, and a red orb finishes the shot |
| 4.07 – 6.50 | Thermal head | A traced profile silhouette coloured as a heat map (purple → banded red → orange), with orbit rings and an ember. "you dont." becomes "you just show it.", and the head burns away from the edges to a grey silhouette |
| 6.50 – 6.80 | Whip | A vertical whip-pan, a fire band, then pixelated thermal and depth-map versions of the icon ring |
| 6.80 – 8.53 | Icon ring | Twelve pixel props on a rotating ellipse. A black ink blob ricochets around and lights up the cap, heart, cash and plant. The ring then flattens and zooms onto the coin |
| 8.53 – 9.35 | "action." | A voxel-extruded camera spins through 3D with a red star stuck to its corner |
| 9.35 – 10.10 | Belt | The ring is seen edge-on as a conveyor, with red speed lines |
| 10.10 – 10.80 | "intention." | An extruded book with page walls, sweeping red ribbons |
| 10.80 – 11.25 | Belt | Second pass with a blurred whip-out |
| 11.25 – 12.05 | "curiosity." | A vinyl record, a dotted red ring, and red music notes that pop in |
| 12.05 – 14.03 | Ring → ink | A negative glitch frame and a second, evenly spaced ring that breaks apart. Ink drops turn props black, then everything converges on "through" |
| 14.03 – 16.12 | Thermal hand | A traced hand rises through orbit rings and shifts from red to pale yellow. "through ones / own ability (to)" appear, then the hand pinches and flicks off |
| 16.12 – 17.45 | L O V E | A heart, camera, book and vinyl each spin in, with a background cut per letter (paper, black, red, black) |
| 17.45 – 17.75 | Outro | Giant blurred handwriting that breaks into ink fragments |

The head, hand and pinch outlines in `js/outlines.js` were traced from single reference frames with OpenCV. The heat colouring is procedural: a blurred depth field is mapped through ramps sampled from the footage. The pixel props in `js/sprites.js` are hand-authored grids. The 3D spins render each sprite as a stack of offset layers, which gives a voxel slab.

## Files

```
motion/
  index.html        player page (canvas + controls)
  js/core.js        math, easing, keyframes, tapered strokes, text, grain
  js/outlines.js    traced silhouettes
  js/sprites.js     pixel-art props, colour variants, voxel extrude
  js/thermal.js     heat-map silhouettes and the burn-away effect
  js/scenes-a.js    0 – 4.07 s
  js/scenes-b.js    4.07 – 9.35 s
  js/scenes-c.js    9.35 – 17.75 s
  js/main.js        timeline and player
  tools/capture.js  headless frame exporter
```

## Also here

`base44/` is a second recreation, of a 16-second product-launch piece (prompt box, file tree, dashboard cards, Publish, BASE 44). See `base44/README.md`.

`perplexity/` is a third recreation, of a 16-second Perplexity finance ad (3D mark, prompt, light burst, finance cards, Spending Overview heatmap, end card). See `perplexity/README.md`.

`dynamic-island/` is a 25-second Island launch film that mixes the grid's bottom-left (Base 44) and bottom-right (Suno) pieces beat for beat, with no footage and only the reference typing sound. See `dynamic-island/README.md`.

`teaser/` is a 17-second Island teaser cut from real stock footage with typed captions. `sfx/typing/` holds the reference video's own typing passages, which every typed line uses. See `teaser/README.md`.

`island/` is a launch film for [Island](https://github.com/UsoguiH/dynamic-island-windows) built on the Base 44 choreography, beat for beat. See `island/README.md`.

## Known differences

- The source's head and hand are real thermal/depth footage. Here they are traced outlines with a procedural heat field, so their internal texture is simpler.
- The pixel art is redrawn, not copied, so individual pixels differ. The cap uses a generic curved mark rather than a brand logo.
- The source has a voice-over and music track. This recreation is silent.

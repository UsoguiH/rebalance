# Logo replica

A frame-exact vector rebuild of the animated "slaace" wordmark shown on
logosystem.co. Open `index.html` to play it. Space plays and pauses, and the
arrow keys step one frame.

The slaace logo and its animation belong to their owners. This folder exists to
study the animation; don't publish it as your own branding.

## How it was rebuilt

The page on logosystem.co plays a short MP4 (`cdn.logosystem.co/animated/slaace.mp4`):
1280 × 736, 25 fps, 57 frames, 2.28 s, looped. The animation is flat colour, so
every pixel is the background plus some amount of two inks:

| Role | Colour |
|---|---|
| Background | `#022713` |
| Green fragments and the wave | `#18C76B` (the wave runs at about 83% opacity) |
| Cream letters | `#CDE4B1` (the grey-green fragments are cream at partial opacity) |

`tools/trace_video.py` turns each frame into vectors:

1. **Split the inks.** Least squares gives each pixel's green and cream opacity.
   These are converted to the alpha each layer needs when the browser paints
   green first and cream on top.
2. **Find each shape's opacity.** Each separate shape gets the opacity levels its
   solid interior uses, so a fading fragment never adds stray outlines to solid ones.
   Thin strokes such as the wave use the opacity of their core.
3. **Trace.** Edges are found with sub-pixel marching squares on a 2× upsampled
   map, aligned to pixel edges, and fitted with smooth cubic Béziers that keep
   real corners sharp (`tools/bezier_fit.py`).
4. **Hold frames.** The last 15 frames barely change. They are averaged and traced
   once, which removes the video's compression noise from the final logo.
5. **The ® mark** is too fine to trace (9 px across). It is drawn as a vector, and
   its opacity is recorded for each frame (it fades in over frames 25 to 42).

Rendered back at the source size, the vector frames differ from the video by 1.8
levels out of 255 on average. What remains is mostly the video's slightly softer
edges; flat areas match to within the video's own compression noise.

## Rebuild the data

```sh
curl -L -o slaace.mp4 https://cdn.logosystem.co/animated/slaace.mp4
python3 tools/trace_video.py slaace.mp4 slaace.frames.js --name SLAACE \
  --bg 022713 --ink 18C76B --ink CDE4B1 \
  --detail 916,307,933,324
```

Needs ffmpeg, numpy, scipy and scikit-image. The same command works for other
flat-colour logo animations: pass the background colour and the inks from bottom
to top.

## Any word

`any-word.html` plays the animation for any word you type.

- **The word "slaace"** in the original letterforms plays the frame-exact vector
  trace above, so it matches the source to within about 1% per pixel.
- **Any other word** replays the original's measured motion. `motion.data.js`
  holds a rotoscope of the source: in each of the 57 frames, every coloured
  piece was matched to a copy of one of the six letters, moved by a rotation,
  scale and shift, and clipped to the angular slices around the copy's centre
  where the piece shows. There are faint cream ghosts, green copies and cream
  copies, painted in that order, as in the original.
  - Each letter of the typed word takes the pieces of the original letter
    nearest to it in position.
  - It is shifted in time by 20.8 frames per word width, which is how the
    original staggers its letters.
  - Shifts and sizes are stored in x-heights, so the motion scales to any font.
- **The wave** is a sine stroke fitted to every frame of the source. Its height,
  amplitude and wavelength are in x-heights; its start, end and crest are
  relative to the word's width.
- **Playback** draws on one `<canvas>`. Each piece is linked to the piece it
  becomes in the next frame, so the player interpolates between the original's
  25 frames per second and runs at the screen's refresh rate. A draw takes well
  under a millisecond. The exact "slaace" trace keeps the original's 25 frames
  per second, since there is nothing to interpolate between traced frames.
- **Clean-ups for other letters:**
  - A piece that lands on another letter's place is given to that letter; the
    fit sometimes explained the second "a" with the first one moved over.
  - Angles where the original letter has no ink (most of the "l") take the
    state of the nearest inked angle, so wide letters are not left half hidden.
  - From the frame each original letter is fully green, and later fully cream,
    the typed letter gets a base of that colour under its moving copies. In the
    original those gaps are already filled.
- **Letterforms:** words made only of s, l, a, c and e use the original
  letterforms, taken from the trace of the final frame. Other words use a
  Google Font, Anybody by default.

How close the replay is, measured on "slaace" against the source frames (mean
error out of 255; a blank frame scores 8 at frame 10 and 32 when finished):
4.1 at frame 10, 4.9 at frame 20, 4.3 at frame 30 and 2.9 once the word has
settled. The settled error is edge anti-aliasing. The first 15 frames match
least well, because their faint pieces are the hardest to rotoscope. On other
words the build-up also looks more fragmented, because the slices were measured
on the original's letter shapes.

The tools that produced the data are in `tools/`: `rotoscope.py` (the piece
fits), `fit_wave.py` (the wave) and `export_motion.py` (writes `motion.data.js`).

```html
<div id="logo" style="width:800px;height:300px"></div>
<script src="slaace.frames.js"></script>   <!-- optional: exact playback of "slaace" -->
<script src="motion.data.js"></script>
<script src="assemble.js"></script>
<script>
  const anim = LogoAssemble.create(document.getElementById('logo'), { word: 'lace' });
  anim.ready.then(() => anim.play());   // also: pause(), replay(), seek(frame), set({...})
</script>
```

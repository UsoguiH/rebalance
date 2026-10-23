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

`any-word.html` plays the same animation for any word you type. It is a rebuild
of the motion, not a trace, so it works with any text. `assemble.js` holds the
generator, and every timing in it comes from measuring the original frames:

- **Chunks.** Each letter is cut into two or three chunks by circles, so the cut
  edges are curved like the original's. The chunks rise from below (now and then
  from above) while rotating and flipping, and fade up to half-opacity cream. The
  odd chunk arrives solid green. A letter sets off at frame `-1 + 15c`, where `c`
  is its centre as a fraction of the word's width, and flies for 9 frames.
- **Colour.** At frame `2 + 20c` two growing circles lay down green patches, and
  three more sweep cream over the letter. Each cream circle is sized to cover the
  whole letter from its own centre, so every letter ends fully cream. This gives
  the original's green and cream patchwork, which lasts until about frame 35.
- **Wave.** A sine stroke: amplitude 0.24 x-heights, wavelength 1.54 x-heights,
  thickness 0.107 x-heights, green at 80% opacity, round ends. Its head and tail
  follow keyframes measured from the original, as fractions of the word width.
  Its crests drift left, slowing exponentially (time constant 2.75 frames), and
  past the last letter it bends down and fades.
- **Loop.** The loop is 57 frames at 25 fps (2.28 s), as in the original. The ®
  fades in over frames 25 to 42.

The cuts are seeded from the word, so a word always plays the same way. Shuffle
picks new cuts. The slaace typeface is custom, so the closest Google Font is the
default: Anybody, semi-expanded, weight 880. Four other fonts are offered.

```html
<div id="logo" style="width:800px;height:300px"></div>
<script src="assemble.js"></script>
<script>
  const anim = LogoAssemble.create(document.getElementById('logo'), { word: 'matcha' });
  anim.ready.then(() => anim.play());   // also: pause(), replay(), seek(frame), set({...})
</script>
```

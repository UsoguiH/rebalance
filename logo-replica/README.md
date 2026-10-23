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

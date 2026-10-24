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

## The font

`font.data.js` is a complete font in the logo's style: a to z, 0 to 9 and
`. , : ; ! ? - '`. Capitals are drawn as lowercase, as in the logo.

- **s, l, a, c and e** are the letterforms traced from the logo's last frame,
  unchanged.
- **Every other glyph** is built from their parts by `font/build_font.py`:
  - the bowls and counters measured on c and e (rounded squares, with 33-unit
    stems and 24-unit horizontal strokes on a 106-unit x-height);
  - the l's leaf top and flared foot (b, d, h, k, t, f, 1);
  - the c's upper terminal (r);
  - the a's arch and spur (2, 3, ?);
  - the s's spur tail (g, j, y, 3, 5, 9).
- **Spacing:** letters of the logo keep its own spacing. Other pairs sit as close
  as their ink allows with a 3-unit gap, within 14 units of their boxes.

The shapes are combined with shapely and fitted with smooth cubic Béziers that keep
spur tips and slit points sharp.

```sh
python3 font/build_font.py motion.data.js font.data.js   # needs numpy, scipy, shapely
```

## Any word

`any-word.html` plays the animation for any word you type.

- **The word "slaace"** in the original letterforms plays the frame-exact vector
  trace above, so it matches the source to within about 1% per pixel.
- **Any other word** is built letter by letter, and every letter has its own
  animation. `motion.data.js` holds a rotoscope of the source: in each of the
  57 frames, every coloured piece was matched to a copy of one of the six letters,
  moved by a rotation, scale and shift, and clipped to the angular slices around
  the copy's centre where the piece shows. There are faint cream ghosts, green
  copies and cream copies, painted in that order, as in the original.
  - **Clips.** Each of the six original letters (s, l, both a's, c, e) gives a
    clip: all of its own pieces, from the frame it first appears until its cream
    copy has settled.
  - **Which clip a letter plays.** Each glyph is assigned a clip, mirrored or
    not and played up to 10% faster or slower (`CLIP_OF` in `assemble.js`). So
    an "o" always builds the same way, wherever it stands. A letter repeated
    straight after itself plays an alternate, as the two a's of "slaace" do.
  - **Stagger.** Each letter starts 3.94 frames per x-height after the first
    one. That is the original's stagger of 20.8 frames per word width. Each clip
    keeps its own lead in front of that slot, so "slaace" built letter by letter
    keeps the original's timing (the **Exact slaace** button switches between
    that and the trace). A long word just takes longer.
  - Shifts and sizes are stored in x-heights, so the motion scales to any font.
- **The wave** is a sine stroke fitted to every frame of the source. Its height,
  amplitude, wavelength, start and end are in x-heights from the start of the word.
  - On a longer word, the tail keeps sweeping right at the letters' stagger speed,
    and the head stays ahead of it.
  - On a shorter word, the sweep is compressed to fit.
- **All letters** shows every glyph of the font at once, each looping its own
  animation. To stay smooth on phones, these small players redraw 30 times a
  second (the `maxFps` option), take turns rather than all drawing on the same
  refresh, and pause while scrolled out of view.
- **Playback** draws on one `<canvas>`. Each piece is linked to the piece it
  becomes in the next frame, so the player interpolates between the original's
  25 frames per second and redraws on every screen refresh (unless `maxFps` caps
  it). The exact "slaace" trace keeps the original's 25 frames per second, since
  there is nothing to interpolate between traced frames.
- **Kept light for phones:**
  - The canvas covers only the box the word's pieces can reach, not the whole
    container.
  - Each piece's slice clip only reaches the corners of its own letter.
  - Nothing is redrawn once the word has settled.
  - All players on a page share one animation loop.
  - With the CPU slowed 6× at phone size, "hello world" drops 2 frames in 300,
    where the previous version dropped 32 in 267.
- **Clean-ups for other letters:**
  - A piece that lands on another letter's place is given to that letter; the
    fit sometimes explained the second "a" with the first one moved over.
  - Angles where the original letter has no ink (most of the "l") take the
    state of the nearest inked angle, so wide letters are not left half hidden.
  - From the frame each original letter is fully cream, the typed letter gets
    a cream base under its settling copies. In the original those gaps are
    already filled. There is no green base: it would show as green rims round
    the springing cream copy, which the original does not have.
- **Letterforms:** the font above by default. Four Google Fonts are offered
  too; they play the same per-letter animation.

How close the replay is, measured on "slaace" against the source frames (mean
error out of 255; a blank frame scores 8 at frame 10 and 32 when finished):
4.1 at frame 10, 4.9 at frame 20, 4.3 at frame 30 and 2.9 once the word has
settled. The settled error is edge anti-aliasing. The first 15 frames match
least well, because their faint pieces are the hardest to rotoscope. Every glyph
of the font, alone and doubled, ends exactly on its still letterform.

The original letters keep the logo's spacing, measured by fitting each letter to
the trace's last frame to a hundredth of a unit. So the built "slaace" lies on
the trace, and switching **Exact slaace** does not move it. The one difference
left is the second "a": the logo's two a's are drawn slightly differently, and
the font has a single "a".

The tools that produced the data are in `tools/`: `rotoscope.py` (the piece
fits), `fit_wave.py` (the wave) and `export_motion.py` (writes `motion.data.js`).

```html
<div id="logo" style="width:800px;height:300px"></div>
<script src="slaace.frames.js"></script>   <!-- optional: exact playback of "slaace" -->
<script src="motion.data.js"></script>
<script src="font.data.js"></script>
<script src="assemble.js"></script>
<script>
  const anim = LogoAssemble.create(document.getElementById('logo'), { word: 'hello' });
  anim.ready.then(() => anim.play());   // also: pause(), replay(), seek(frame), set({...}), frames
  // The container sets the size. The word is fitted so that no flying piece is
  // cut: across, pieces stay inside the container; above and below, they may
  // spill out by up to a quarter of its height, into room the screen has
  // there (none if the container clips its overflow). Without a height it takes the word's proportions;
  // without a width (inline-block, a flex item) it is 300 px wide. Use a block or
  // inline-block element, not an inline one such as a bare <span>, and give the
  // player the container to itself.
</script>
```

# WordMotion

Type a word and it gets drawn like a pen-written wordmark, stroke by stroke,
with a tall looped first letter. This recreates the letter animation of the
"More" intro (looped M, stroke-by-stroke reveal) and makes it work for any word.

Open `index.html` in a browser to use the board. There is no build step and
no dependency besides `wordmotion.js`.

## The board

- **Word**: type anything (a–z, figures, `. , ! ? - & '`). Enter replays.
- **Swash first letter**: the first letter of the word is replaced by a tall,
  looped capital, like the M in the original. There is one for every letter A–Z.
- **Colour**: six presets (Matcha is the reference) or your own background and ink.
- **Timing**: speed, letter stagger and letter duration. "Use the recorded
  timing" restores the values fitted to the recording.
- **Strokes**: a timeline of every letter with a playhead. Click or drag it to scrub.
- **Export**: an animated SVG that plays with CSS only, a static SVG, or an
  embed snippet.
- **Specimen**: every swash capital and lowercase glyph. Hover to watch it
  draw; click to use it in the word.

## Using the library

```html
<div id="word" style="width:640px;aspect-ratio:16/9;position:relative"></div>
<script src="wordmotion.js"></script>
<script>
  const player = WordMotion.player(document.getElementById('word'), {
    word: 'Matcha',
    theme: 'matcha',          // matcha, berry, ocean, citrus, night, paper
    // colors: { bg: '#AEC49B', ink: '#1E4A1A' },
    // loop: true, speed: 1, grain: true,
  });
  player.play();              // also: pause(), replay(), seek(seconds), set({...}), timeline()
</script>
```

The player fills its container and keeps the word centred.

Just the word, in any SVG, driven by your own clock:

```js
const handle = WordMotion.wordmark(svgGroup, { word: 'Hello', color: '#1E4A1A' });
handle.seek(0.4);             // handle.duration is the draw time
```

`WordMotion.animatedSVG(word, opts)` returns a standalone animated SVG string and
`WordMotion.staticSVG(word, opts)` returns the finished paths.

## How it matches the recording

The reference is a 1156 × 2510 screen recording, and the library uses its
pixels as units, so every measurement carries over.

- **Glyphs** are single monoline centrelines, 52 px wide with flat (butt) ends.
  The x-height is 206 and round letters overshoot by 7. The e's crossbar is
  thinner (38 px), as in the original.
- **M, o, r and e** were fitted to a finished frame of the video by an optimiser
  that moves the Bézier control points to maximise pixel overlap, with tangents
  kept smooth. Overlap with the video frame: M 98.3%, o 99.1%, r 99.3%, e 97.2%.
  The rest of the alphabet is built from the same skeleton.
- **Stroke order** follows the video: the M is one continuous stroke (left leg,
  arch, loop, second hump), the o starts at 10 o'clock and runs counter-clockwise,
  the r draws its stem bottom-up and then the arm, and the e draws its crossbar
  and bowl at the same time.
- **Draw timing** was measured per letter from the 60 fps frames: 126 ms between
  letters, 712 ms per letter, and the curve `cubic-bezier(0.207, 0.225, 0.223, 1)`.
  The model stays within 0.06 of the measured progress at every sampled frame.
- **Colours** are sampled from the frames: background `#AEC49B`, ink `#1E4A1A`.
  A light grain sits on top, as in the original.

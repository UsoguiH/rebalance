# WordMotion

Type a word and it gets drawn like a pen-written wordmark, then the hero page
builds around it. This is a recreation of the "More" hero intro (looped M,
stroke-by-stroke reveal, word rises, nav and "Buy now" fade in, product tub
rises inside a white ring), made to work for any word.

Open `index.html` in a browser to use the board. There is no build step and
no dependency besides `wordmotion.js`.

## The board

- **Word**: type anything (a–z, figures, `. , ! ? - & '`). Enter replays.
- **Swash first letter**: the first letter of the word is replaced by a tall,
  looped capital, like the M in the original. There is one for every letter A–Z.
- **Scene**: the full hero page (as in the recording) or the wordmark alone.
- **Colour**: six presets (Matcha is the reference) or your own background and ink.
- **Page**: button text, top-right link text, product label, and toggles for
  the product and the nav.
- **Timing**: speed, letter stagger, letter duration and a hold before the rise.
  "Use the recorded timing" restores the values fitted to the recording.
- **Strokes**: a timeline of every letter and scene event with a playhead.
  Click or drag it to scrub.
- **Export**: an animated SVG that plays with CSS only, a static SVG, or an
  embed snippet for the full hero.
- **Specimen**: every swash capital and lowercase glyph. Hover to watch it
  draw; click to use it in the word.

## Using the library

```html
<div id="hero" style="width:390px;aspect-ratio:1156/2054;position:relative"></div>
<script src="wordmotion.js"></script>
<script>
  const hero = WordMotion.hero(document.getElementById('hero'), {
    word: 'Matcha',
    theme: 'matcha',          // matcha, berry, ocean, citrus, night, paper
    button: 'Buy now',
    shop: 'Shop all',
    label: 'PLANT\nPROTEIN\nBLEND',
  });
  hero.play();                // also: pause(), replay(), seek(seconds), set({...}), timeline()
</script>
```

Just the word, in any SVG:

```js
const handle = WordMotion.wordmark(svgGroup, { word: 'Hello', color: '#1E4A1A' });
handle.seek(0.4);             // drive it from your own clock; handle.duration is the draw time
```

`WordMotion.animatedSVG(word, opts)` returns a standalone animated SVG string and
`WordMotion.staticSVG(word, opts)` returns the finished paths.

## How it matches the recording

The reference is a 1156 × 2510 screen recording. The web viewport is 1156 × 2054,
and the library uses those pixels as its units, so every measurement carries over.

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
- **The rise** moves the word up 626 px over 550 ms with
  `cubic-bezier(0.334, 0.706, 0.027, 0.978)` (1.2 px RMS error against the video).
  It starts when the last letter is 553 ms into its stroke.
- **Scene**: the nav fades in 120 ms after the rise starts, the button rises from
  140 px below 160 ms after, and the ring sweeps and the tub rises from 300 ms.
- **Colours** are sampled from the frames: background `#AEC49B`, ink `#1E4A1A`,
  pills `#E7EDE3`. A light grain sits on top, as in the original.

The product is a stylised vector tub. It carries your word on its label in place
of the original packshot.

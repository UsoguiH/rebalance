# Custom scenes

Content covers most products. When one needs something the template can't show (a design
tool's canvas, a camera app, a map), override a single scene and keep the rest. Don't
copy the template; a fork stops getting fixes.

## How a piece overrides a scene

Each piece's `index.html` loads the shared kit, then `content.js` and `timing.js`, then the
template's art and scenes, then `main.js`. Between the scenes and `main.js` there is a
marked spot for the piece's own script:

```html
<script src="../template/js/scenes-c.js"></script>
<!-- a piece can override or add scenes here, e.g. <script src="js/custom.js"></script> -->
<script src="../template/js/main.js"></script>
```

Uncomment it, and in `motion/<slug>/js/custom.js` replace a scene, or one hero screen:

```js
(function () {
  const T = M.tpl;      // palette (T.C), art kit, helpers
  const C = T.C;
  // a new product screen for the reveal: draw(ctx, t, theme), burst() -> [x, y] for the
  // confetti, cursor(t) -> [x, y], press(t) -> boolean
  T.HERO.canvas = {
    draw(c, t, th) { /* ... */ },
    burst: () => [960, 560],
    cursor: (t) => [1200, 700],
    press: (t) => false,
  };
})();
```

Then set `reveal: { type: 'canvas', ... }` in `content.js`. To replace a whole scene, assign
`M.scenes.<name> = (c, t) => { ... }` instead. The names are `intro`, `montage`, `but`,
`reveal`, `noMore`, `arch`, `once`, `ring`, `wall`, `end`. `main.js` reads the scenes when
it loads, so the override must come before it.

## Scene clocks

A scene gets `t` on its own clock, not the piece's: local time = piece time + `T.OFF[scene]`.
The offsets are `intro 0, montage 0, but 0, noMore 0.66, arch 0.165, once 0.144, ring 0.136,
wall 0.118, end 0.05`. The reveal is stretched instead: piece 9.904-12.74 s maps to
local 10.25-13.4 s. Inside the reveal, the beats are:

| local s | beat |
|---|---|
| 10.27-10.85 | tile pops, wordmark slides out (drawn by the scene, not the hero) |
| 11.0-11.42 | tile pulls into the panel's corner (270, 206), and the panel fades in |
| 11.4 | the hero element arrives |
| 12.0-12.42 | first action |
| 12.56-12.94 | second action; done at 12.94 |
| 12.95 | confetti from `burst()` |
| 13.08 / 13.16 / 13.24 | theme flips: dark, brand, light (`th.dark`, `th.brand`) |
| 13.26-13.4 | white-out |

To sync something to the voice, use `T.cues(slot, words, defaults, scene)`. It returns
each word's local entrance time from `timing.js`, or the defaults when there is no take.

## The kit

`motion/js/kit.js` (shared by every piece) gives you:

| Function | What it does |
|---|---|
| `M.key(t, [[t, v, ease], ...])` | Keyframe tracks: a value at time t |
| `M.track(t, [[t, x, y], ...])` | A Catmull-Rom path, for cursors |
| `M.prog(t, a, b)` | 0-1 progress over a span |
| `M.ease.*` | outCubic, outBack(p, s), inOutCubic and the rest |
| `M.text(c, s, x, y, {size, weight, color, align, track, alpha})` | Draws text and returns its width (Inter, condensed 7%) |
| `M.measure(...)` | Measures text the same way |
| `M.blurWord(c, s, x, y, p, o)` | A word that blurs in |
| `M.wordLine(c, words, t, o)` | A centred line whose words slide in and re-centre |
| `M.withLayer(c, fn, {blur, alpha})` | Draws into a layer and composites it blurred or faded |
| `M.motionBlur` | Motion blur |
| `M.fillRR` / `M.strokeRR` / `M.rr` | Rounded rectangles |
| `M.vgrad` / `M.hgrad` / `M.rgrad` | Gradients |
| `M.icon(c, slug, x, y, size, color?)` | A Simple Icons brand mark |
| `M.cursor(c, x, y, scale, {press, rot})` | The macOS hand cursor |
| `M.cursorSmear` | A motion-blurred cursor |
| `M.pic(name, w, h, fn)` | A cached offscreen plate |
| `M.rng(seed)` | A seeded random generator, so frames stay deterministic |

`motion/template/js/art.js` adds (under `M.tpl`):
- the palette `T.C`;
- `T.appTile`, `T.brandTile`, `T.mark`;
- `T.card`, `T.check`, `T.avatar`, `T.lozenge`;
- `T.window`, `T.chatBubble`, `T.sticky`, `T.confetti`;
- the plates `T.sky()` and `T.pastel()`;
- `T.fit(c, s, size, weight, maxW)`, the largest size that fits;
- `T.words(line)`, which splits a line into words and marks the accents.

Every frame must be a pure function of `t`, with no state carried between frames. The
renderer jumps to any time, so randomness must come from `M.rng(seed)`, never
`Math.random`. Check a custom scene by rendering stills across its span:
`node tools/render.js --page <slug>/index.html --times ...`.

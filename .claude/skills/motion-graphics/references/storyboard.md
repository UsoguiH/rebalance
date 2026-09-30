# Storyboard: `src/video.json` and the scene library

Everything the video shows and says lives in one file, `src/video.json`. The scripts read and update it
(tts.py adds voice timings and stretches scenes, music.py sets the track, sfx.py turns on whooshes).
Durations are in **seconds**; the template converts to frames.

## Contents
1. File shape
2. Scene types and their props
3. Coordinates, sizes, timing
4. Writing a custom scene
5. Example storyboard (30 s SaaS launch)

## 1. File shape

```jsonc
{
  "meta": { "title": "Acme launch", "fps": 30, "width": 1920, "height": 1080 },
  "brand": {
    "name": "Acme", "url": "https://acme.com",
    "logo": "brand/logo-1.svg",        // for light backgrounds (public/ path)
    "logoDark": "brand/logo-white.svg",// for dark backgrounds (optional)
    "icon": "brand/icon-3.png",        // square app icon (optional, used in logoCloud centre)
    "colors": { "bg": "#F4F2EC", "fg": "#141414", "accent": "#D9623B", "accent2": "#F2B45A", "muted": "#7A7A74", "dark": "#101114" },
    "font": "Inter", "displayFont": "Instrument Serif",   // run fetch_fonts.py after changing
    "rtl": false                                          // true for Arabic
  },
  "audio": { "music": "music/track.mp3", "musicVolume": 0.55, "duckTo": 0.2, "musicTrimBefore": 0, "fadeOut": 1.5 },
  "captions": true,        // subtitles from the voice timings
  "autoWhoosh": true,      // whoosh on every transition (needs sfx.py)
  "scenes": [ /* see below */ ]
}
```

Scene fields (all scenes):

| field | meaning |
|---|---|
| `id` | short unique name (also the voice file name) |
| `type` | `kinetic`, `logo`, `endCard`, `image`, `stat`, `device`, `cards`, `cursor`, `logoCloud`, `features`, `custom` |
| `duration` | seconds on screen (includes the transition out) |
| `vo` | the narration for this scene; tts.py turns it into `voice`, `voiceDuration`, `captions` |
| `voiceDelay` | seconds before the line starts (default 0.3) |
| `background` | `brand` (brand bg + soft light), `dark`, `gradient` (moving accent blobs), `grid` (dot grid), `accent`, `none` |
| `transition` | into the next scene: `{ "type": "fade"|"slide"|"zoom"|"wipe"|"whip"|"blur"|"none", "duration": 0.5, "direction": "left"|"right"|"up"|"down" }` |
| `sfx` | extra sounds: `[{ "at": 1.2, "name": "pop", "volume": 0.5 }]` (whoosh, swoosh-short, click, pop, tick, riser, impact, shimmer, type) |
| `props` | per-type settings below |

## 2. Scene types

### `kinetic`: headline animated word by word
`lines` (array, one per line) · `highlight` (words in accent) · `style` rise|blur|scale|type|mask ·
`marker` (true = accent marker swipes behind highlighted words) · `eyebrow` (small caps label above) ·
`sub` (smaller line below) · `size` (px at 1080; default 120 / 110 portrait) · `stagger` (frames, default 3)
Keep each line ≤ 4 words in landscape, ≤ 3 in portrait.

### `logo`: logo reveal
`tagline` · `logoHeight` (default 140) · `logo` (override path). Spring-in + de-blur + light sweep.

### `endCard`: logo, tagline, CTA button, URL
`tagline` · `cta` · `url` (defaults to brand.url) · `logoHeight`.

### `image`: full-bleed real photo with Ken Burns
`src` · `lines` · `highlight` · `align` bottom|center · `zoom` (0.08) · `panX` (-1.5 %).

### `stat`: number counting up
`value` · `prefix` · `suffix` · `decimals` · `label` · `bars` (e.g. [0.2,0.4,0.7,1] grows a mini chart) · `size`.

### `device`: real screens in code-drawn devices
`device` iphone|ipad|ipad-landscape|macbook|browser · `src` (screenshot or .mp4/.webm) · `width` ·
`scrollFrom`/`scrollTo` (0-1: scroll a tall full-page capture inside the screen) ·
`lines` `highlight` `eyebrow` `size` (text beside the device) · `side` right|left|none (portrait forces none) ·
`tiltFrom`/`tiltTo` [rx, ry, rz] degrees · `enter` rise|spin|zoom ·
`second` { device, src, width, scrollFrom, scrollTo } (e.g. phone next to laptop) · `cursor` [steps].
Use `shots/*-full.jpg` for scrolling, `shots/*-hero.png` for still screens.

### `cards`: many screenshots as floating 3D cards
`images` [] · `layout` helix (orbiting spiral) | scatter (fly-through) | grid (tilted wall panning) | fan ·
`lines` `highlight` (headline in front) · `focus` (index to pop forward) · `focusAt` (s) · `cardWidth` · `textDelay` (frames).
Good material: `shots/section-*.jpg`, extra page captures.

### `cursor`: product demo on a real screenshot
`src` · `frame` browser|none · `aspect` (default 1.6) ·
`camera` [{ t, zoom, x, y }]: t seconds, zoom 1-4, x/y the point (0-1 of the screenshot) to centre ·
`cursor` [{ t, x, y, click?, hand? }]: pointer path; clicks draw a ripple and play `click` ·
`prompt` { text, placeholder, at, until, x, y, width, button, pressAt, cps, typeAt }: typing box overlay (screen coords 0-1) ·
`callouts` [{ t, x, y, text }]: accent labels that pop on the UI.
Find x/y by opening the screenshot with Read and estimating fractions (button at 30% across, 64% down → 0.30, 0.64).
Zoom where the cursor goes: camera key at the click time with the same x/y and zoom 1.6-2.2.
In 9:16 a desktop screenshot is small: keep the camera at zoom ≥ 1.6 most of the time, or use the mobile screenshots.

### `logoCloud`: integration / customer logos
`logos` [] (public paths from logos.py) · `layout` orbit|grid|row · `center` (defaults to brand icon/logo) ·
`lines` `highlight` · `tile` (px).

### `features`: 2-4 feature tiles
`lines` · `items` [{ title, text, image?, icon? }] · `stagger`.

## 3. Coordinates, sizes, timing
- Sizes are "px at 1080 short side": the theme's `u` scales them, so one storyboard renders in 16:9, 9:16, 1:1, 4:5.
- `Launch` uses `meta.width/height`; `Launch-9x16`, `Launch-1x1`, `Launch-4x5`, `Launch-16x9` re-flow the same scenes.
- A scene's first ~0.5 s is its entrance; hold readable text ≥ 1.2 s after it lands; reading speed ≈ 3 words/s.
- Transitions overlap the two scenes (total = Σ durations − Σ transitions). Keep transitions 0.3-0.6 s.
- After tts.py, scenes already fit their lines. To land cuts on beats, nudge `duration`s so cumulative cut
  times fall on `music.json` beats (`beats` list; a bar = 4 beats).

## 4. Writing a custom scene

When the references need something the library does not do (a globe, a particle logo, a chat thread
building up, a before/after split, a redrawn UI moment), write it. That is where videos stop looking
templated.

```tsx
// src/scenes/custom/ChatThread.tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../../motion";
import { useTheme } from "../../theme";
import type { SceneProps } from "../../types";

export const ChatThread: React.FC<SceneProps> = ({ props }) => {
  const frame = useCurrentFrame();           // 0 at this scene's start
  const { fps } = useVideoConfig();
  const t = useTheme();                      // t.u, t.colors, t.fonts, t.portrait, t.rtl
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 18 * t.u, flexDirection: "column" }}>
      {(props.messages as string[]).map((m, i) => {
        const s = pop(frame, fps, i * 12);
        return <div key={i} style={{ transform: `scale(${s})`, fontFamily: t.fonts.body, fontSize: 34 * t.u,
          background: i % 2 ? t.colors.accent : "#fff", color: i % 2 ? "#fff" : "#111", padding: `${14 * t.u}px ${22 * t.u}px`, borderRadius: 22 * t.u }}>{m}</div>;
      })}
    </AbsoluteFill>
  );
};
```
Register it in `src/scenes/custom/index.ts` (`export const custom = { ChatThread };`) and use
`{ "type": "custom", "component": "ChatThread", "props": { "messages": ["…"] } }`.

Helpers you can import: `motion.ts` (`ease`, `prog`, `pop`, `keyframes`, `rand`, `exitFade`),
`components/` (`KineticText`, `Device`, `Card`, `Cursor`, `PromptBox`, `Logo`, `Media`, `Background`),
`theme.tsx` (`useTheme`, `alpha`, `onColor`). Remotion basics: everything is a function of `frame`;
never use CSS transitions/animations or `Math.random()` (use `rand(seed)`); use `<Img>`/`staticFile()` for files.

## 5. Example: 30 s SaaS launch (landscape)

| # | type | s | picture | voice |
|---|---|---|---|---|
| 1 | kinetic (blur, eyebrow "Introducing") | 2.5 | "Plan less. **Ship** more." | "Product teams move fast." |
| 2 | cursor (browser, zoom to button, click, callout) | 5 | real hero screenshot | "Acme turns every idea into shipped work." |
| 3 | device macbook + side text, scroll full page | 4 | "One system. **Every** team." | "Planning, building and review, in one place." |
| 4 | device iphone, spin in, side left | 3.5 | "Anywhere you work." | "In your pocket, too." |
| 5 | cards helix, section screenshots | 3.5 | "Built for **agents**" | "With AI agents built in." |
| 6 | logoCloud orbit, real integration logos | 3.5 | "Works with your **stack**" | "Works with the tools you already use." |
| 7 | stat 25,000+ with bars | 3 | "teams build with Acme" | "Trusted by thousands of teams." |
| 8 | endCard | 3.5 | logo, tagline, CTA, URL | "Acme. Start building today." |

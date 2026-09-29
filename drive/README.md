# رحلة الصحراء — Arabic 3D camel-ride portfolio

An original interactive portfolio: ride a camel (with a rider in thobe + ghutra) across a golden-hour
desert, and enter five glowing zones — **عنّي / أعمالي / مهاراتي / خبراتي / تواصل معي** — to open
Arabic (RTL) content panels. Arabic by default, English toggle in the settings.

Inspired by the *genre* of "drive around a 3D portfolio" sites. Nothing is copied: every model is
built from Three.js primitives in code, every sound is synthesized with Web Audio, fonts are OFL
(Cairo, Aref Ruqaa) and shipped locally.

## Run
```sh
npm install          # three + playwright (dev)
npm start            # http://127.0.0.1:8090/index.html   (any static server works)
npm test             # Playwright e2e: desktop + iPhone portrait/landscape
node tests/physics.test.mjs
```
`?quality=low|med|high` and `?lang=en` are supported. Edit `js/content.js` to make it yours.

## Controls
| Desktop | Phone |
|---|---|
| WASD / arrows: ride · Shift: gallop · Space: brake · H: call · R: reset · Enter: enter a zone · Esc: close | Left thumb: floating joystick · buttons: run / call / brake · tap the prompt to enter a zone |
Gamepad works too (left stick, triggers, A/B).

## Layout
| File | What |
|---|---|
| `js/main.js` | renderer, follow camera, game loop, adaptive resolution, zone triggers |
| `js/physics.js` | fixed-step arcade camel dynamics, collisions, pushable props (node-tested) |
| `js/camel.js` | procedural camel + rider, IK legs, gait blending, reins, scarf |
| `js/world*.js` | dunes, sky/day-night, zone landmarks, palms/rocks/props, hoof-print trail |
| `js/audio.js` | synthesized hoofbeats, wind, camel call, bells, generative Hijaz music |
| `js/ui.js`, `js/controls.js`, `js/content.js`, `css/style.css` | RTL UI, HUD, minimap, touch/keyboard/gamepad input |
| `ARCHITECTURE.md` | module contracts |

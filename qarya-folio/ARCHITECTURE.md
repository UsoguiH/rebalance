# قرية الواحة — architecture

An Arabic (RTL) 3D portfolio: the visitor rides a camel around a desert village
(قرية) and each landmark opens a section. No build step: ES modules, an import
map, three.js r186 and cannon-es vendored in `vendor/`.

Everything here is original. Art style: low-poly, faceted (flat shading),
vertex-coloured shapes from one warm palette, soft sun shadows, a playful toy
feel with physics props you can knock over.

## Layout (metres, +X east, −Z north)

`js/core/terrain.js` → `LAYOUT`, `heightAt(x, z)`:

| Place | Where |
|---|---|
| Spawn | (0, 30), facing north |
| Village plateau (flat) | centre (0,0), radius 40 |
| Oasis pond | centre (36, −34), radius 12, water level −0.9 |
| Dunes | outside the village, growing to a dune wall past r = 100 |

Section zones and landmark spots are in `js/content.js` (`zones`, `spots`).

## Files and owners

| File | Owner | What |
|---|---|---|
| `js/main.js`, `js/core/*`, `js/content.js`, `css/base.css`, `index.html` | core | loop, renderer, lights, terrain, physics, input, player controller, camera, zones |
| `js/camel/*` | camel | the camel model + procedural animation |
| `js/world/village.js` (+ `js/world/village/*`) | village | buildings, souq stalls, landmarks, gate, walls, knockable props |
| `js/world/nature.js` (+ `js/world/nature/*`) | nature | sky, sun colour, fog, oasis water, palms, rocks, shrubs, dust, birds, clouds |
| `js/ui/*`, `css/ui.css` | ui | loader/title screen, HUD, prompts, panels, menu, help, touch buttons |
| `js/audio/*` | audio | Web Audio synthesis: ambience, music, footsteps, SFX |
| `js/core/reveal.js`, `js/world/storm.js` | core | start island: world clipped to a circle round the spawn, inside a sandstorm; grows open on start |
| `js/world/pads.js` | core | glowing ring + floating Arabic name at every section zone |
| `js/world/camp.js` | core | the little camp on the start island |
| `js/core/postfx.js` | core | sunny grade pass: warm highlights, cool shadows, glow, vignette |

## The shared context `ctx`

Every module's factory receives `ctx`:

- `THREE`, `CANNON`, `P` (palette, `js/core/palette.js`), `content` (the `content.js` module)
- `scene`, `renderer`, `sun` (DirectionalLight, follows the player), `sunOffset` (Vector3), `hemi` (HemisphereLight)
- `heightAt(x, z)`, `normalAt(x, z, out?)`, `noise(x, z)` (0..1), `LAYOUT`
- `Builder` — merge many coloured primitives into one faceted mesh (`js/core/builder.js`)
- `mat(color, opts?)` — cached flat `MeshLambertMaterial`
- `physics` — `addBox({ size:[w,h,d], position:[x,y,z], rotationY?, mass?, mesh?, kind? })`,
  `addCylinder({ radius, height, position, mass?, mesh?, kind? })`, `addSphere(...)`,
  `sync(body, mesh)`, `world` (cannon World), `material`.
  `mass: 0` = static collider. `mass > 0` = dynamic prop; its `mesh` (already added to the scene,
  geometry centred on the body) follows it. `kind` ('wood' | 'pot' | 'metal' | 'fabric') tags hit sounds.
- `events` — `on(name, fn)`, `emit(name, data)`
- `input` — `forward`, `turn`, `boost`, `stick`, `enabled`, `take(name)`, `press(name)`
- `onUpdate(fn(dt, t))` — register a per-frame callback
- `mobile`, `touch` — booleans
- Set later (available by the time `update` runs, and in `ui.attach(ctx)`): `player`, `camel`, `camera`, `rig`, `audio`, `ui`,
  `reveal` (`progress` 0..1, `storm` 1..0, `started`, `done`)

New materials are clipped by the start island automatically (`applyReveal` in main.js patches every
built-in material). Hand-written `ShaderMaterial`s can use `REVEAL_GLSL` / `revealUniforms()` from
`js/core/reveal.js`; any that don't are simply hidden until the growing circle reaches them.

`player`: `position` (Vector3, feet), `heading` (rad; forward = (sin h, 0, cos h)), `speed` (m/s, signed),
`forwardVec`, `grounded`, `boost`, `maxSpeed`, `body`.

## Module contracts

```js
// js/camel/camel.js
export function createCamel(ctx) → {
  group,              // THREE.Group; origin at the feet centre, faces +Z, ~2.4 m tall at the hump
  update(dt, s),      // s = { t, speed, maxSpeed, turn (-1..1), grounded, jumping, vy, boost }
  grunt(),            // play a head-toss/grunt animation (sound is the audio module's job)
}

// js/world/village.js
export function createVillage(ctx) → { update?(dt, t) }

// js/world/nature.js
export function createNature(ctx) → { update?(dt, t) }

// js/ui/ui.js
export function createUI(ctx) → {
  setProgress(k),     // 0..1 during loading
  ready(),            // Promise resolved when the visitor starts (click / tap / key)
  attach?(ctx),       // called once the world, player and camera exist
  update?(dt, t),
  noWebGL?(),
}

// js/audio/audio.js
export function createAudio(ctx) → {
  unlock(),           // called on the first user gesture; create/resume the AudioContext here
  update?(dt, t),     // read ctx.player for footsteps and motion layers
}
```

## Events

| Event | Data | Sent by |
|---|---|---|
| `input:first` | — | input, first key/pointer |
| `game:start` | — | main, after the title screen |
| `audio:toggle` | — | input (M key) / ui (sound button) |
| `audio:state` | `{ muted }` | audio, after toggling |
| `ui:escape` | — | input (Esc) |
| `player:reset` | — | input (R) / ui |
| `player:teleport` | `{ x, z, heading? }` | ui (menu) |
| `player:jump`, `player:land` | — | player |
| `camel:grunt` | — | main (H key) / ui (touch button) |
| `zone:enter`, `zone:leave` | zone | zones |
| `zone:progress` | `{ zone, progress 0..1 }` | zones, every frame inside a zone |
| `zone:open` | zone | zones (Enter or dwell) |
| `zone:request-open` | — | ui (prompt clicked) |
| `panel:open` | `{ zone }` | ui |
| `panel:closed` | — | ui |
| `prop:hit` | `{ kind, speed, position }` | physics (dynamic props) |
| `ui:click` | — | ui (for a click sound) |
| `reveal:done` | — | reveal, when the island has grown into the whole world |

## Testing

```sh
python3 -m http.server 8090   # from qarya-folio/
node tools/shot.mjs http://localhost:8090/ out.png "start|wait:2000|key:ArrowUp:2000"
```

`window.__qarya` is the `ctx` object once the game starts (`window.__qaryaReady` too).

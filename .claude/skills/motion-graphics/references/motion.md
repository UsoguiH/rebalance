# Motion direction: making it look amazing

The basic scenes (kinetic, device, cards…) make a clean video. **Amazing** comes from choreography:
every shot has a hero move, the camera never stops, fast things blur, and moments flow into each
other. This file is the playbook. Use it when you plan the storyboard (step 5) and when you judge the stills (step 7).

## The bar
- **One signature move every ~4 seconds.** A 30 s video should have at least 5 of the moves below, and never
  two identical moves back to back.
- **Never static.** Every scene drifts (automatic 3.5% push-in; `"drift": false` only for text-mask shots).
  Things float, breathe and orbit slowly after they land.
- **Physics, not tweens.** Springs with slight overshoot for things landing, ease-in for things leaving,
  motion blur on anything fast (`Moving` does it from the real velocity).
- **Depth.** Foreground chips, midground device, background glow, each moving at its own speed (parallax).
  Far objects are soft (depth of field is automatic in `cards`).
- **Continuity.** Use the transition to *carry* the eye: zoom through the thing you just showed, iris open from
  where the cursor clicked, panels sweeping in the direction of the movement.
- **Hierarchy of energy:** calm hook, then a rising middle with the biggest moves, then a clean resolved ending (particles → logo → CTA).
- **Always light** (see SKILL.md): white/off-white, dark text, brand accent. Energy comes from motion, not darkness.

## Signature moves (scene types)

| type | what it does | use it for |
|---|---|---|
| `heroDevice` | Device flies in on a curved 3D path with motion blur, lands with overshoot, a light sheen sweeps the glass, then it breathes (orbit + float) with a floor shadow. Chips float around it at different depths. Optional AI glow, second device behind. | The product reveal; mobile app; any "here it is" moment |
| `promptGlow` | Prompt box with rotating AI-glow border; text types, cursor presses Send, glow speeds up while "thinking", shimmer text, then result cards burst out into a 3D fan. | AI products, "describe it → get it" |
| `explode` | Real screenshot tilts into isometric space and splits into floating layers with shadows and labels, orbits, then snaps back. | "Everything in one place", architecture, features of one screen |
| `textMask` | Giant word with a photo/screenshot inside the letters, zooming out; optional dive back through into the full image. | Brand-name moment, emotional beat, section break |
| `particleLogo` | Logo assembles from a swirl of brand-coloured particles, resolves crisp, confetti burst, light leak, tagline. | Opening or closing logo |
| `morph` | Cursor clicks a button; the button morphs into a card, the card grows into a full-screen product shot. | Call to action, "one click to…" |
| `cards` (helix / scatter / grid / fan) | Real screens in 3D with depth of field. | Breadth, "built for every team" |
| `cursor` | Real UI, camera zooms to the exact button, cursor clicks with ripple, callouts pop. | Demoing a specific flow |

Upgrades on basic scenes:
- `kinetic` + `"chars": "flip3d" | "rise" | "blurIn" | "scramble" | "slam" | "cascade" | "shine"`: letter-by-letter
  animation (per word in Arabic). flip3d = elegant; scramble = tech/AI; slam = bold ads; shine = premium.
- `stat` + `"roll": true`: rolling-digit odometer instead of a counting number.
- `endCard` + `"particles": true`: particle logo + confetti on the CTA.

## Transitions (the glue)

| type | feel | tip |
|---|---|---|
| `zoomThrough` (x, y) | dive into a point, next scene grows out of it | point at the thing you want to "enter" (a card, the prompt box) |
| `iris` (x, y) | circle opens from a point | put x/y where the cursor clicked |
| `panels` (direction, colors) | brand-colour panels sweep across | between chapters; 0.7-0.9 s |
| `cube` (direction) | 3D cube turn | switching surface (desktop → layered view) |
| `whip` (direction) | fast push with motion blur | high energy, on the beat |
| `zoom`, `blur`, `fade` | soft | calm moments, before the ending |
| `slide`, `wipe` | clean | lists, sequences |

Match direction to motion: if the device flew in from the right, leave with a whip/panels to the left.

## Building your own moves (custom scenes)

The effects library in `src/fx/` is for writing new, bespoke moves quickly:
- `Moving` (fx/Moving.tsx): `<Moving pose={(f) => ({x, y, z, s, rx, ry, rz, o})}>`: any path as a function of the frame,
  with automatic directional motion blur from the velocity. Use `pop()` springs inside the pose.
- `GlowBorder`, `Sheen`, `LightLeak` (fx/Glow.tsx): AI edge glow, glass reflection sweep, coloured bloom.
- `CharText`, `Odometer` (fx/Text.tsx): letter animations, rolling numbers.
- `ParticleLogo`, `Burst` (fx/Particles.tsx): image → particles, confetti.
- `useBeat()` (fx/beat.ts): 0-1 pulse on every music beat (music.py writes the beats). Scale bumps of 1-3%
  on the beat make motion feel locked to the music.
- `Chip` (scenes/signature.tsx): floating badge (text + icon/logo).

Ideas that land well: a notification stack sliding in with springs; a chart drawing itself; a map/globe
with arcs; before/after split with a dragging divider; UI elements "pouring" into a device; a timeline
scrubbing; a checklist ticking with strike-through; keyboard keys pressing; a cursor drag-and-drop.

## Judging the stills
For each scene ask: What is the hero move? Is something moving in the 80% frame too (not only the entrance)?
Is there depth (foreground/background)? Would a designer screenshot this frame for Dribbble? If not,
add a chip, a glow, a second layer, or switch the scene to a signature type.

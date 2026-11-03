# MOTION.md: living illustrations in this project

> The motion notes for the Qudrat teacher mascot. Part 1 is the rossark-motion-skill method, unchanged. Part 2 is this project, and it overrides Part 1 where they disagree.

---

## Part 1. The method

**The goal:** anything drawn (a character, a plant, a flame, a street, a logo, a chart) feels alive and calm. Nothing teleports, nothing bounces, nothing shouts.

### Principles
1. **Never teleport:** interpolate everything; never swap drawings.
2. **Calm by default:** strong curves, no bouncy overshoot.
3. **Small amplitudes:** when unsure, halve it.
4. **Arcs and pivots:** each moving part is a layer rotating around its joint (stem base, hinge, neck, hook).
5. **Overlap and follow-through:** tips and trailing parts move later and further; give each part the same wave with a growing phase delay.
6. **Variety without chaos:**
   - repeated items get a seeded phase, speed and size;
   - nothing moves in sync, and there's no random value per frame.
7. **One main action per scene, plus two or three idle loops.** Side things stay quiet.
8. **Opacity only to appear or disappear.**
9. **The layout never moves:** motion lives inside the drawing.
10. **Reduced motion:** loops freeze on a good frame 0, and one-shots show their final frame.
11. **Nothing runs unseen:** pause off screen, when hidden and in the background.
12. **Enough frames:** anything under ~100 ms flickers at 30 fps; render and export at 60 when you can. Blinks close in ~110 ms and reopen in ~190 ms.
13. **Interface rules:**
    - frequency decides how much (often seen = barely moves; rare moments get the delight);
    - every motion has a purpose;
    - shared elements travel, never teleport;
    - interface moves stay under 300 ms;
    - exits are faster than entrances;
    - nothing appears from scale 0;
    - interruptions continue from the current value.

### The engine
- **Clocks:** a loop clock for idle life, a one-shot clock for a scene that tells an action. One per character, group or scene.
- **Tracks:** keyframes `[ms, value, 'out'?]` read with `track(t, keys)`. The last key equals the first. `track` stops at every key, so use it for one move (a blink, a lid). For acting (a chain of poses), use `flow(t, keys)`, which passes through the keys without stopping and never overshoots.
- **Helpers:**
  - `wave` (−1 to 1), for sway and breathing;
  - `loop` (0 to 1), for drift and falling;
  - `bell`, to fade in and out;
  - `seg`, for one beat of a one-shot;
  - `seeded(i)`, for per-item variety.
- **Curves:**
  - travel uses ease-in-out `(0.77, 0, 0.175, 1)`;
  - open and arrive use ease-out `(0.23, 1, 0.32, 1)`;
  - leaving uses ease-in;
  - endless loops are linear.

### Quick recipes
| Subject | Recipe |
|---|---|
| Character | breathing 1–2 units over 3–5 s; a blink every 3–4 s; pupils glide; head tilt 3–6° |
| Waiting to be tapped | a jiggle every ~270 ms: squash 2%, widen 2%, the bulge trading sides |
| Floating figure | rises in from 30% of its height below, drifts 5% down and up, leaves rising |
| Tail, hair, ears | rotation around the root, phase delayed along the chain, 4–10° |
| Plant | sway 1.5–4° around the base over 3–6 s; leaves on seeded phases |
| Cloth, flag | a wave that travels along the length, growing away from the fixed edge |
| Fire | a lean of 2–4° and a 3–6% stretch on two waves of different periods |
| Smoke, steam | rises 8–14 units and fades in and out with `bell` |
| Water | ripples grow and fade; floating things bob 1–2 units and rock 2° |
| Rain, snow | seeded `loop`s; snow sways sideways |
| Sky | clouds drift over 20–60 s with parallax; sun rays take 30–60 s per turn |
| Lights | a glow of 2–5% over 2–4 s; stars twinkle at seeded times |
| Machines | gears turn linearly by ratio; a clock hand steps with ease-out |
| Phone | ±3° bursts, then a pause |
| Icon, logo | plays once on appear, then rests |
| Chart | a one-shot draw-on, with bars staggered 40–80 ms |

### Acting (a whole character)
- **Every channel:** key pose (`flow`) + idle (`wave`s, never off while on stage) + follow-through (the parent read 90–140 ms earlier) + accents (a `wave` inside a `seg` window).
- **Arms:** an upper arm and a forearm share a round elbow; the forearm points at shoulder angle + elbow bend.
- **Head turns:** slide the face toward the turn (eyes 10, nose 13 in a 100-wide head) and the ears the other way. Blink on the turn.
- **Weight:** the hips shift and carry the upper body, and the legs angle to keep the feet under it.
- **Landing:** hover, then fall with gravity and stretch; squash hard (0.8) on contact and keep the volume (`width = 1 / height^0.6`).
- **In the air:** limp feet (toes down, one knee folded, trading slowly). The shadow stays on the floor and scales with the height.
- **Props:** enter from off screen already moving and roll by distance / radius. The eyes follow them. A kick hits at the middle of the swing; the prop leaves as a throw, spinning, with a short squash.
- **Asymmetry:** the arms never mirror each other.
- **Camera:** a view from a little above is a whole build, not a tweak: the head is 40–50% of the height, the torso is short and narrower than the head, the legs are short, the feet are round from above, and the shadow is a wide oval with the feet in its lower half. Keep it in one `build` object. A flat view keeps a thin pill shadow.
- **Framing:** on a phone, as big as the screen allows, with the feet low.

### From a reference video
- Contact sheets at the full frame rate (`tools/sheet.sh`).
- Measure motion with numbers (`tools/track_edges.py`): a 2% jiggle or a 5% float doesn't show to the eye.
- Sample colors from pixels (`tools/sample_colors.py`).
- Go part by part: feet, shadow, hands, head.
- Compare proportions as ratios of one unit (head widths). "Stretched" means a ratio is far off.
- Compare your render with the reference at the same moments.
- Don't publish a copy of someone else's art.

### Performance
- Everything is a function of one clock's time.
- Draw many items in one SVG or `Canvas`.
- Reset repeating animations to 0 before starting, and cancel them on cleanup.
- Declare curves at the top of the module.

### Workflow
1. Read Part 2 and the art file's header comments.
2. List what could live in the drawing.
3. Pick one main action and two or three idle loops.
4. Split the art into layers at their pivots.
5. Put the numbers in tokens.
6. Check frame 0, the final frames and the loop seams. For a character, look at a contact sheet of every 4th frame of your own render.
7. Run the checks.
8. Hand off: what moves, and what hasn't been seen on a real device.

---

## Part 2. This project

### Where the code is
- **Platform:** web, plain JS on `<canvas>`, no build step. Open `mascot/index.html`.
- **Motion engine:** `mascot/js/motion.js`, a port of the skill's `motion.ts` (`track`, `flow`, `seg`, `wave`, `loop`, `bell`, `seeded`, `blinks`), plus `lw` (a wave whose period divides the loop) and `boing` (a damped spring accent).
- **The rig:** `mascot/js/rig.js`. World units: the floor is `y = 0` under the feet, `y` grows down, the face is 100 wide. The `B` object holds the build (hips at −98, neck at −180, face centre 58 above the neck, arms 34 + 32, legs 41 + 41). The `C` object holds the palette, sampled from the reference sheet's pixels.
- **Layers and pivots:** legs (2-bone IK to planted or hanging feet) → body (squash about the floor, lean about the hips) → pelvis, torso → head (tilt about the neck, 2.5D `yaw` slides the features) → cane and book → arms (2-bone IK in torso space) with hands on top → effects.
- **The poses:** `mascot/js/clips.js`. One object per clip: key poses `[ms, {channels}]` read with `flow`, then idle life, follow-through, blinks and `fx` accents. Every channel and its rest value is in `Rig.BASE`.
- **The page:** `mascot/js/app.js` (one clock per canvas, paused off screen and in hidden tabs; switching poses blends from the pose on screen over 380 ms).
- **Checking and export:** `mascot/tools/sheet.html` (contact sheet of a clip), `mascot/tools/render.js` (MP4 and GIF of every clip, see the README).

### The owner's rules
- 2026-11-03: "create lot of وضعيات like duolingo animation … recreate it exactly like duolingo animations." So this project **wants the bouncy brand**: Part 1's "calm, no overshoot" does not apply to the acting. Landings and take-offs squash and stretch 10–20 % and overshoot once; badges and props pop to about 1.22× and settle; reactions are snappy (anticipation 150–260 ms, action 120–200 ms).
- The character must match the reference sheet: black afro with grey highlights, clear peach glasses, black beard with a grey goatee, white shirt, tan sweater vest, dark trousers, black shoes, the purple «قدرات» book and the black cane/pointer.

### Rig limits
- Arms are short (Duolingo proportions), so truly crossed arms can't reach: "arms folded" is done low, elbows out, hands meeting under the hugged book (`HUG` in clips.js).
- Front view only. Head turns are 2.5D slides (`yaw`, up to about ±0.35 reads well).
- Seated poses foreshorten the thighs (the knees read as caps); set `seat: 14` with `stack: 1`.
- Hands are mittens that grow fingers with `palmL`/`palmR` (0 → 1).
- When a hand touches the face (thinking), head tilt is damped (`idleHead: 0.3`).

### How changes are checked
- Contact sheets: open `mascot/tools/sheet.html#clip=jump&n=12&cols=6` (served or as a file) and read every frame.
- Loop seams and frame steps: every clip's last frame equals its first (the effects that differ at the seam, such as dust and sweat, are invisible at both ends).
- Renders: `node mascot/tools/render.js` writes MP4s (60 fps) and GIFs (30 fps) to `mascot/renders/`.
- Not yet seen on a real phone; checked in headless Chromium at desktop and 390 px widths, light and dark.

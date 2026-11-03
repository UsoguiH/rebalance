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

### The owner's rules
- 2026-11-03: "i want exactly like this photo and this exact character, exactly this one, dont create another one." **Never redraw the teacher.** Every frame shows the original drawings (`mascot/art/poseNN.png`), only moved and blinked. New poses need new drawings in the same style.
- 2026-11-03: "recreate it exactly like duolingo animations." The project **wants the bouncy brand**: squash and stretch 5–10 % (volume kept), pops overshoot once, hops have hang time, the afro trails the body.
- 2026-11-03 (after seeing the phone): "Why is he like this … make him move right and not have this fault poses." Smeared hair, bent glasses, a book cut off by the frame and blur are **bugs**. The rules below exist to prevent them.

### Rules learned from that round (they override Part 1 where they differ)
1. **Parts are rigid.** The head (hair, face, glasses, beard), each hand and each prop move as one piece. Soft blending is allowed only across flat colour: the collar under the beard, a white sleeve, the trousers at the hips.
2. **Never slide features inside the head** (no 2.5D face slide on a flat drawing): it bends the glasses. A glance is the pupils leading, then a small head tilt and shift, with a blink on the turn.
3. **Put a hinge at the contact point.** Where a moving part touches a still one (the waving thumb by the ear, the book's edge against the afro), pivot right there, so the part swings away instead of sliding across and smearing the gap.
4. **Small amplitudes:** head ±4°, hands ±10°, props ±6°, mouth ≤ +22 %, brows ≤ 3 units.
5. **Frame every pose by its own bounding box**, with one shared scale and floor, so nothing (the raised book, the cane, the pointer) leaves the stage.
6. **Sharp art:** the sheet is sharpened 2x (`tools/upscale.py`, Real-ESRGAN anime model) and colour-matched back to the original before cutting. Rig units stay the original sheet's pixels.

### Where the code is
- **Platform:** web, plain JS, no build step. Serve `mascot/` (WebGL won't read textures from `file://`) and open `index.html`.
- **Art pipeline:** `tools/upscale.py` (2x sharpen) → colour match → `tools/extract.py SHARP.png art/ 2 ORIGINAL.png` (paper flood-filled from outside, drop shadows removed, 2 px matte, the open books' pages sealed, pose 6's spark strokes lifted so they can be redrawn live). Crops use `art/boxes.json` (original-sheet pixels), so rig points never move.
- **Motion engine:** `js/motion.js` (port of the skill's `motion.ts`, plus `lw`, a wave whose period divides the loop).
- **The rig:** `js/sprite-rig.js`: a 3-unit triangle mesh per drawing, deformers with weight maps (`Wt.poly` rigid outlines, `Wt.hinge`, ellipses for pupils/brows/mouth), applied local → root. Blinks reveal an eyes-closed copy of the same drawing in the shader. One shared WebGL context renders every canvas.
- **Rig points and loops:** `js/poses.js`: outlines traced on 10-unit grids over each drawing; `keepOffHead` lists things above the neck that are not the head (canes, books). A loop is `flow` key poses + `fx` accents + idle life + follow-through.
- **Stage and page:** `js/stage.js` (shadow, effects, framing), `js/app.js` (one clock per canvas, paused off screen; pose switches are a squash-pop).

### Rig limits
- Only the 10 drawn poses exist; switching between them is a pop, not an in-between.
- Mouths open and close a little; they can't change shape. Half-lidded poses (4, 8) keep their drawn lids.
- Parts that overlap in the drawing can't move far apart: nothing is drawn behind them.

### How changes are checked
- Contact sheets: `mascot/tools/sheet.html#clip=teaching&n=12&cols=6` (served).
- Loop seams: every loop's last frame equals its first (checked numerically on every deformer).
- Renders: `node mascot/tools/render.js` writes MP4s (60 fps) and GIFs (30 fps) to `mascot/renders/`; `BG=transparent` gives transparent WebM.
- Close-ups at full size of every seam where a moving part touches a still one (book/afro, thumb/ear, stick/hair).
- Checked in headless Chromium at desktop and a 390 px phone width at 3x, light and dark.

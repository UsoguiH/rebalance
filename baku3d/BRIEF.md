# Goal
A 3D (Three.js) model of Baku Madarame (Usogui), rendered so that the default camera view looks like
the manga panel in `refs/ref_full.jpg` (close-up of the face/upper body: `refs/ref_crop.jpg`):
same POSE, same FACE, same manga ink + cel-shaded colour look and the same mood
(cocky, lazy-menacing, "top authority").  Ignore the speech boxes, the grey bar and the camera-icon overlay in the reference.

# What is in the picture (look at the images yourself - they are the ground truth)
- Seated slouched/diagonal on a tall gold throne: gold posts + ornate gold armrests, deep red velvet backing,
  pale cream brick wall behind (cream/white either side of the red).
- Torso leans toward viewer's left; shoulders tilted; open collar, dark maroon shirt, deep V.
- White suit, loose, with crumpled ink-hatched folds; wide pointed lapels, a red collar edge visible at his neck.
- Viewer's-RIGHT arm: elbow bent, forearm up, hand propping his cheek/jaw, fist loosely curled, knuckles against cheek.
- Viewer's-LEFT arm: straight down, resting on the throne armrest, hand draped over its front edge, fingers hanging.
- Legs crossed: one ankle on the opposite knee, big wide white trouser leg across the lap; brown lace-up leather boot
  at lower-left; other white-trouser leg goes down to bottom centre.
- Head tilted toward viewer's right, chin slightly lowered, looking at the viewer from under the brow (half-lidded, smug smirk).
- White/silver slicked-back hair, long bangs-strands hanging over the viewer's-right side, hatched like ink.
- Gold eyepatch strap runs diagonally across the forehead over his viewer's-left eye; a gold monocle-like eye disc sits at
  his viewer's-right eye under the knuckles. Stubble/ink hatching on jaw, sharp cheekbones, narrow eyebrows, one raised.

# Shared contract (so nothing breaks) - DO NOT edit files you don't own
| file | owner | job |
|---|---|---|
| src/body.js | Builder A | torso, suit, shirt, both arms+hands, legs, boot, THRONE + pose. export `buildBody(THREE, style)`; set `group.userData.neck` (body-local Vector3) and `group.userData.cheekTarget` (body-local Vector3 = where the propping fist ends up) |
| src/head.js | Builder B | neck, head, face, hair, eyepatch, monocle. export `buildHead(THREE, style)`; origin = base of neck; set `userData.cheek` (head-local Vector3). main.js adds it at body.userData.neck. Head rotation (tilt) is done INSIDE buildHead on an inner group. |
| src/style.js | Style agent | `toon(hex, opts)` materials, `createStage()` (camera, lights, backdrop, post FX), `finalize()` (ink outlines, hatching, halftone). Keep the exported API. |
| (read-only) | Reviewer | compares & writes `REVIEW.md`; may edit nothing but REVIEW.md |

Every surface MUST be created through `style.toon(hex, opts)` (opts may include `role: 'skin'|'hair'|'suit'|'shirt'|'gold'|'leather'|'throne'|'velvet'|'eye'` so the style agent can customise per role).
Units: metres, +Y up, +Z toward camera, camera looks roughly at the character's chest, character origin = floor centre.
Three.js is r170 in node_modules (import only via `THREE` param in body/head; style.js may import from 'three' and 'three/addons/').
No external assets, no network: everything procedural (geometries, canvas textures are OK).

# Tools
`node render.mjs [name]` (run from baku3d/) -> `shots/<name>.png` and `shots/compare.png` (left = reference, right = your render, 2312x1264).
Read the PNG with the Read tool to *see* it. Always check the console-error line it prints.
Use `render.mjs` only with your own `name` (e.g. `builderA`) to avoid overwriting other agents' shots; `compare.png` is shared/last-writer-wins, so view `shots/<name>.png` and `refs/` directly.

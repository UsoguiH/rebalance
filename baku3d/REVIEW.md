VERDICT: REDO (round 6, overall 6.6/10; round 5 was 6.4, round 4 6.5, round 3 6.4, round 2 5.9, round 1 4.9)

Scores (0-10 vs reference). Round 5 scores are in brackets.
(1) pose/lean/silhouette/framing 7.5 [7.5]
(2) head, face likeness, hair, strap, monocle 6.5 [5.5]
(3) propping hand + armrest hand 6 [6.5]
(4) legs, trousers, boot 6 [6]
(5) throne/backdrop/wall 7 [7]
(6) art style, ink, cel colour, mood, grade 6.5 [6.5]

Coordinates are in the 1156x1264 render frame, and refs/ref_full.jpg is the same size, so they compare directly. They are approximate. Zoomed face crops were compared (scratchpad face.png).

Improved vs round 5:
- The skin is now pale cream, and the face looks like the reference's lighter palette. The face is no longer grim.
- A visible smirk with a raised corner appears at ~(595-640,325-350).
- The hair is cream, not a mesh.
- The fist is compact and attached to the cheek.
- The boot is much shorter and chunkier.
- The hem cuff and suit shading are better.

Regressed or still wrong:
- The red collar became a flat right-angled slab.
- The boot geometry is glitchy.
- The hair reads as a smooth cap with ruled horizontal lines.
- The hand is now small and half hidden.

## Builder A (src/body.js)

1. **Red collar is a flat hard-edged slab, and the neck still shows a bare shoulder.** The collar polygon at (395-565,368-462) is a large right-angled red parallelogram with a stray black fleck at (430,468). It does not look like a collar. Above it is a bare round shoulder blob at (465-580,325-400) and a peach wedge V (520-600,380-520). In the reference the red collar is a narrow, pointed lapel edge along the viewer's-left neck at ~(430-520,300-400), 25-30px wide, folded over the jacket lapel, and there is no bare shoulder: the maroon shirt covers the shoulder up to the neck. Rebuild: a thin folded collar band that follows the neck, with the shirt filling up to the collarbones, and a V ~100px wide starting at ~(560,400).
2. **Boot geometry is broken.** The boot is now short (80-440,950-1220), but it is made of disconnected-looking pieces: a toe disc at (85-200,1100-1200) with a lighter ring, a heel/shaft lobe at (300-450,955-1060), and a flat brown oval (300-395,1060-1110) with black comb bars (245-360,1030-1150) that read as a glitch, not laces. The reference is one solid, dark brown, rounded boot with a continuous silhouette: a toe cap, a lace panel with 5 thin crossing laces and an ankle shaft. Merge the parts into a single smooth form (lofted/capsule), make the laces thin crisp crossing lines on the instep, point the toe down-left, and add a dark sole.
3. **Propping fist is small and half hidden.** The hand at (730-855,295-395) is now ~60% of the reference fist (735-810,310-420, ~100px). Its fingers point at the ear, like a hand holding the ear, and a hair lock covers the knuckles. Scale up ~1.4x, orient the knuckle row against the cheek just below the monocle, curl the fingers into the palm so a fist shape (not a pointing hand) reads, and bring the wrist in from lower right with a visible cuff at ~(800,400).
4. **Thigh/shin.** The cuff is good, and the thigh now has a diagonal crease, but the knee (1000-1060,740-900) is still a lumpy white blob, and the shin is a tube. Add a sharp knee crease and make the shin cross clearly over the other thigh.
5. **Left shoulder.** The shoulder (270-440,320-430) is still a pad-like hump ~30px too high. Lower and slope it.
6. **Armrest hand (155-320,765-935).** Orientation is good, but the fingers are long and equal. Shorten and curl them.
7. **Right sleeve.** Still a smooth tube from elbow (1040,620) to cuff. Add creases at the elbow.
8. **Shirt.** Flat maroon slab with a stray dark smudge at (610-660,665-695). Add fold lines and a darker shadow under the jacket.

## Builder B (src/head.js)

1. **Hair reads as a smooth cap with ruled horizontal lines.** The mass at (590-860,70-300) is a cream bald-cap shape; the lines on the right side (730-860,150-290) are straight horizontal, like ruled paper, and do not follow the flow of the hair. The reference hair is voluminous and slicked back with lines that sweep from the forehead up and back over the crown, with long locks hanging at the viewer's-right temple and a wavy, ragged lower edge near the ear and nape (~(560-610,240-310)). Make the strokes follow the head curvature (forehead to crown, curving), add thickness to the silhouette at the back, and add 4-5 hanging locks with curled tips at the ear. Remove the dark spiky fringe at (545-590,195-250), which reads as a broken comb.
2. **Face likeness improved but still off.** The nose is now a small bridge and the smirk reads. But the eyes: the visible eye (590-620,240-255) is a small dark slit with a flat brown lid patch below it. The reference has an open half-lid showing a dark iris and white highlight under a heavy angled brow with dark bags. Open the eye ~3px, add a catchlight, and put dark under-eye shading.
3. **Cheek and jaw hatching.** The vertical hatching across the cheek (640-700,270-350) is OK but mechanical. Concentrate it along the jawline and under the cheekbone, and soften the cheek.
4. **Monocle.** In the right area now at (675-720,285-320). Still a flat solid ring and sitting on the cheek, in front of the face rather than in the eye socket. Tilt it ~35 deg with the head, make it translucent pale yellow, and tuck its lower edge behind the knuckles.
5. **Strap.** Good diagonal, translucent. It could be a little narrower at its start (590-610,185-215).
6. **Forehead.** Large bare forehead with a hard hairline. Add a hanging lock or two over the forehead (as in the reference) to break the shape.
7. **Neck.** The neck/collarbone has no collarbone line or tendon, and the chin stubble is a flat grey patch. Add a collarbone and a neck tendon.
8. **Head position.** Centre ~(700,225); matches the reference well.

## Style (src/style.js)

1. **Hair line art.** See B1. The hair shader's hatching direction is horizontal in screen space, not along the surface. Use the surface flow, or draw the strands as geometry strokes. Increase contrast of strands (dark lines #2a2a30 on cream fill).
2. **Spot blacks.** The suit cracks now appear in the whites (e.g. (330-370,470-560), (600-700,900-1000)), and they look better. But they are blobby grey-black patches rather than crisp ink. Make them sharper, with angular edges and solid black.
3. **Shirt/collar fill.** The maroon shirt and red collar are flat fills with a faint gradient. Add dark fold hatching and a darker fabric tone under the jacket.
4. **Boot shading.** Brown with blob highlights. Add a harder 3-step ramp, a near-black shadow side, and a thin rim highlight.
5. **Skin.** Pale now and good. The hand skin is still slightly orange and flat. Add a warm shadow band.
6. **Outline weight.** Good on silhouettes. Interior hand lines are thin and fine now. OK.
7. **Backdrop.** Good: soft glow, cream wall. Reduce corner darkening slightly.
8. **Gold.** Throne gold is saturated and glossy; darken the shadow side and add dark carved lines.

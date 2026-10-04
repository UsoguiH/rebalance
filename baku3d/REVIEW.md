VERDICT: REDO (round 4, overall 6.5/10; round 3 was 6.4, round 2 was 5.9, round 1 was 4.9)

Scores (0-10 vs reference). Round 3 scores are in brackets.
(1) pose/lean/silhouette/framing 7.5 [7.5]
(2) head, face likeness, hair, strap, monocle 6 [5.5]
(3) propping hand + armrest hand 5.5 [6.5]
(4) legs, trousers, boot 6 [5.5]
(5) throne/backdrop/wall 7 [7]
(6) art style, ink, cel colour, mood, grade 7 [6.5]

Coordinates are in the 1156x1264 render frame, and refs/ref_full.jpg is the same size, so they compare directly. They are approximate. Zoomed face/hand/boot crops were compared against the reference (scratchpad face.png, hand.png, boot.png).

Improved since round 3:
- More of the face is visible: eye, nose, mouth and chin at ~(560-700,200-370).
- The hair is whiter, with comb lines.
- The strap is now diagonal and runs across the brow to the monocle.
- The red collar is attached at the neck.
- The boot is rounder and has crossed laces, and the trouser hem now wraps the ankle with a white cuff loop (~(390-500,1080-1160)).
- The whites carry more ink hatching.
- The shirt neckline is higher.

## Builder A (src/body.js)

1. **Propping hand now reads as a pointing hand.** The hand at (690-840,245-410) has a raised cylindrical thumb standing straight up at (740-780,245-290), plus long extended fingers lying along the cheek. In the reference the fist is a loose, curled fist: the four fingers are curled in, and the first knuckles press into the cheek just under the monocle. The thumb is tucked under, not raised, and the fist is ~100px wide at (735-810,310-420). Curl all four fingers to ~90 deg at both joints so the fingertips tuck into the palm and only the knuckle row and the back of the fingers face the face. Fold the thumb down along the index finger. Shorten the hand ~15%. The wrist should come in from the lower right, with the cuff at ~(800,400).
2. **Boot is a long sausage.** The boot at (90-500,940-1225) is a tube, with a shaft ~400px long ending in a rounded cap, like a sock or a sausage. The reference boot is shorter (~(95-330,980-1200)): a chunky foot with a defined toe cap that points down-left, a visible heel and sole edge, a short ankle shaft hidden in the trouser, and tight laces on the instep. Cut the length ~35%, add a distinct toe-box bulge, an ankle step, a heel block and a thicker dark sole. The crossed laces (~(255-330,985-1045)) are a good start but are tiny. Scale up ~1.5x.
3. **Bare skin at the neck/shoulder still wrong.** There is a peach wedge (495-600,325-470) between the collar and the V, and a bare patch at (440-515,330-385) beside the red collar, so the neck looks like a naked triangle with a hard vertical edge at x~500. The reference has a narrower neck, with the maroon shirt up to the collarbone at both sides, the red collar edge against the neck, and the skin V narrower (~100px). Fill the wedge on the viewer's-left with shirt and collar fabric, and make the V a clean narrow V starting at ~(560,400).
4. **Crossed-leg readability.** Better, with the cuff, but the thigh/knee still merges into the big white mass at (400-1060,700-1100) and has a lumpy knee. The knee line needs to be sharper, with creases radiating, and the shin should clearly cross over in front of the other thigh. The reference thigh has diagonal folds from hip to knee.
5. **Torso/left shoulder.** The left shoulder hump at (270-440,320-430) is still higher than the neck base by ~40px, like a pad. Lower it ~35px and slope it.
6. **Armrest hand.** Good orientation at (155-320,765-935). Fingers are still too long and equal; the thumb stub at (290-320,850-885) is a spike. Shorten the fingers ~15% and curl them more.
7. **Right sleeve.** Better shading, but the tube is still smooth from the elbow (1040,620) to the cuff. Add 3-4 elbow creases and a cuff bulge.
8. **Armrest/throne spikes.** The gold teardrops under the armrests (140-210,960-1060 and 950-1030,960-1110) do not exist in the reference, which has carved block armrests. Replace with a stacked carved base or remove.

## Builder B (src/head.js)

1. **Monocle is still a coin floating on the cheek.** The disc at (640-690,270-305) sits in front of the nose-side of the face, below the strap, not in the eye socket, and is flat and solid. In the reference the lens is at the viewer's-right eye ~(735,305), tilted ~35 deg to follow the head, partly hidden under the knuckles, and pale translucent gold with a glow. Move it ~50px right and ~5px down so it is half covered by the fist, tilt it, make it translucent, and thin its rim.
2. **Eye, brow, mouth need character.** The left eye (~(595,248)) is a small blue almond with a thin lid. The reference is a dark, hooded, half-lidded eye with a heavy angled brow and dark bags, and an upward glance. Darken the iris (#2a2a38), thicken the brow at the inner end and angle it ~30 deg down toward the nose, and add a heavy upper lid and bags. The mouth is a faint dash at (590-625,320-335). Add the smirk with a raised corner and a visible lower lip.
3. **Face shape.** The head is now long and narrow. The chin with its tuft of white stubble at (575-600,345-365) is pointy and the jaw is a thin line. The reference has a broader cheekbone and a strong angular jaw. Widen the lower face ~12% and add a cheekbone plane and a sunken cheek.
4. **Head size and tilt vs fist.** The head spans ~(540-835,60-375). The tilt (~35 deg) is OK now. The fist overlaps the right side of the face OK. But the head sits ~25px too far left relative to the reference (centre ~(690,235) vs ref ~(705,250)). Shift right ~15px and down ~15px.
5. **Hair.** Now near-white with comb lines, but the shape is a smooth helmet with a single big hump. The reference has a more voluminous mass with a ragged outline, wavy lock tips curling at the ear (~(555-600,250-300) in the frame) and nape, and long locks falling over the viewer's-right temple. Add the curl tips and 3-4 hanging locks on the right side and at the ear. The dark spiky lock at the left (545-585,195-235) looks messy; replace with thin white wavy strands.
6. **Strap.** Much better. It now crosses the forehead diagonally at (590-665,185-235). It still starts too high and is too opaque. Make it a pale translucent yellow (as the reference) and continue it more clearly down across the brow toward the lens.
7. **Neck.** The neck/collarbone area is flat peach, with no collarbone line or neck tendon. Add a collarbone line at ~(520,380)-(660,395) and a neck tendon.
8. **Stubble.** The hatching on the jaw/cheek (585-690,300-370) is OK but over the nose side and under the lens is noisy; restrict it to the jawline band.

## Style (src/style.js)

1. **Spot blacks still missing in the whites.** The reference has solid black creases and shadow fills (under the lapel, between the thighs, behind the shin). The render has hatching but few solid fills. Threshold the darkest 10% to solid black, and add black fold lines at crease edges.
2. **Skin cel shading is flat.** The face is peach and cream with a light hatch; the neck/chest is a flat peach. Add a warm orange mid-shadow band and strong shadow on the left side of the face, under the brow and under the jaw, for the menacing mood.
3. **Boot shading.** Smoother than before but still a plain brown gradient with orange highlights. The reference leather has near-black shadows and a few sharp highlights. Add a harder cel ramp, a darker shadow side, and ink hatching.
4. **Shirt flat.** The maroon shirt is a flat fill with a faint gradient. Add dark fold hatching and a darker shadow below the jacket.
5. **Hair line art.** The comb lines are better, but the hair reads as a flat grey block on the right side (700-830,110-290). Add more white highlight lines and dark gaps between strands.
6. **Outline weight.** Good on silhouettes. Interior lines on the hand are too heavy and uniform; taper them.
7. **Backdrop.** The glow is soft and good. The wall is a warm cream/brown vignette, which is acceptable. Reduce the brown corner darkening a bit, and add faint mortar grunge.
8. **Gold.** The throne gold is saturated and glossy. The reference gold is warmer brown with carved darkness. Darken the shadow side of the gold.

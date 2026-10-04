VERDICT: REDO (round 5, overall 6.4/10; round 4 was 6.5, round 3 was 6.4, round 2 was 5.9, round 1 was 4.9)

Scores (0-10 vs reference). Round 4 scores are in brackets.
(1) pose/lean/silhouette/framing 7.5 [7.5]
(2) head, face likeness, hair, strap, monocle 5.5 [6]
(3) propping hand + armrest hand 6.5 [5.5]
(4) legs, trousers, boot 6 [6]
(5) throne/backdrop/wall 7 [7]
(6) art style, ink, cel colour, mood, grade 6.5 [7]

Coordinates are in the 1156x1264 render frame, and refs/ref_full.jpg is the same size, so they compare directly. They are approximate. Zoomed face crops were compared (scratchpad face.png).

Improved since round 4:
- The propping hand is now a curled fist with fingers curled against the cheek (~(720-860,300-410)). The pointing thumb is gone.
- The monocle has moved to the viewer's-right eye socket (~(680-720,285-315)) and has a glassy highlight.
- The eye is darker and hooded.
- The strap is translucent.
- The jaw is broader.
- Skin shading now has real planes and the shirt has folds.

Regressions:
- The face is now far too dark and over-hatched, and it looks grim, not smug.
- The hair has turned into a white mesh of cross-hatched scribbles.
- The overall face likeness went down.

## Builder A (src/body.js)

1. **Boot is still a sausage.** The boot spans (85-450,925-1225) as a long smooth tube from the hem to a round toe with a brown blob highlight. The reference is a shorter, chunkier foot at ~(95-330,980-1200): a clear toe-cap, a heel and a dark sole, a short ankle shaft, and tight laces. The new laces (255-345,990-1100) are a small cross-hatch patch of thin lines. Shorten the foot by ~30%, add an ankle step plus a heel block and a thick near-black sole edge. Make the toe cap a separate rounded bulge (not a continuous tube), and add 5 bold crossing laces at ~(270-380,975-1060).
2. **Neck and chest.** Better than round 4, but a peach wedge remains at (500-590,330-470) between the red collar and the V. The reference has the shirt reaching the collarbones with a narrow V (~100px). The red collar spike at (430-520,365-410) floats on the left, detached from the shirt. Join the collar to the shirt and neckline, and narrow the V ~30%.
3. **Fist shape.** Much better, but it is a long hand: the fingers extend ~100px along the cheek, and the fingertips reach the jaw at (700-720,380). The reference fist is a compact ~100px ball, with the first knuckles pressing the cheek. Shorten the fingers ~20%, make the knuckle row more prominent, and bring the whole fist ~15px up so it supports the lower edge of the monocle.
4. **Crossed legs.** The cuff loop is good, but the thigh and knee are still a smooth lumpy mass at (400-1060,700-1100), with weak fold structure. Add diagonal creases from hip to knee, and a sharp knee edge.
5. **Left shoulder hump.** The shoulder (270-440,320-430) is still ~35px too tall and pad-like. Lower and slope it.
6. **Armrest hand.** Orientation is good at (155-320,765-935). The fingers are too long and straight, equal in length. Curl them more.
7. **Right sleeve.** There is still no elbow creasing on (800-1060,400-700). Add 3-4 creases and a cuff.
8. **Armrest base spikes.** Replaced by gold blocks (115-215,980-1100 and 940-1040,980-1110), but they look like plain boxes. Add carved ridges.

## Builder B (src/head.js)

1. **Face is too dark, brown and grim.** The skin is deep tan-brown (#b06a45-ish) with heavy hatching across the whole face (580-720,200-380). The reference skin is pale warm cream-yellow (#f5d8a8) with only light orange shadow, and its mood is smug and half-lidded. Lighten the face base by ~35%, make the shadow terminator crisp at the nose side and under the brow only, and cut the hatching on the cheek and forehead to a few strokes at the jaw and temple.
2. **Hair is a white mesh.** The hair at (590-850,75-300) is crossed white scribbles on a white fill; it reads as netting, with no volume or form. The reference has cream hair with thin black comb lines flowing back, and grey shadow clumps. Replace the cross-hatching with single-direction thin dark comb lines (#2a2a30) on a cream (#efe6d0) fill, and add 3 grey shadow clumps. Add curled lock tips at the ear (~(560-600,240-300)) and the nape. The messy white sticks at (545-590,190-250) must go.
3. **Expression.** The mouth is a flat slab (585-640,305-350) and the jaw has a harsh white stubble line. There is no smirk. Draw a thin dark lip line with the left corner raised ~6px, a light lower lip, and soft stubble only under the jaw.
4. **Eye and brow.** The visible eye (~(595,245)) is dark, but it is a squinting slit with a thick heavy line through the temple. The reference has an open half-lid with the iris visible, looking up at the viewer from under a heavy angled brow. Open the lid ~3px more and show the iris and a white highlight. The brow should be one clean wedge.
5. **Nose.** The nose is a large angular wedge with a harsh white/peach plane at (620-650,300-340). Soften it and reduce the contrast. The reference nose is small, with a straight bridge.
6. **Monocle.** In the right place now. Make it ~30% more translucent, pale yellow instead of a solid gold coin, and tilt it with the head. Tuck its lower edge under the knuckles.
7. **Strap.** Translucent, good, but it sits slightly too high on the forehead and is too wide at the start. It should reach the lens centre from the upper-left.
8. **Head position.** Centre ~(700,230), very close to the reference. Keep.

## Style (src/style.js)

1. **Skin is too dark (face and hand).** The shadow tone is brown. The reference skin is yellow-cream lit, with orange-peach mid-shadow. Lighten the skin ramp so the lit tone is ~#f6d7aa and the shadow ~#d9966a, and cap the shadow darkness.
2. **Hatching overdone on the face and hair.** The skin hatching covers the whole face and the hair gets a mesh of crossing lines. Limit the hatch angle to one direction per surface, lower the density on hair/skin ~50%, and keep the dense hatch for the suit shadows and jaw.
3. **Spot blacks.** Still missing in the whites (under the lapel, between the thighs, behind the shin). Add a solid-black threshold for the darkest 10%.
4. **Boot shading.** Smooth brown with blob highlights. The reference leather has a near-black shadow side and sharp highlights. Add a harder 3-step cel ramp.
5. **Shirt.** The folds help but the shirt is still mostly a flat maroon slab (385-740,400-780). Add dark fold hatching and a darker shadow under the jacket.
6. **Outline weight.** Good on silhouettes; interior hand lines are still a bit heavy.
7. **Backdrop.** Good. Soft glow, cream wall with mortar lines. Reduce corner darkening slightly.
8. **Gold.** The throne gold is saturated and glossy. The reference is a warmer brown-gold with dark carved lines. Darken the shadow side.

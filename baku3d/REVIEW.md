VERDICT: REDO (round 3, overall 6.4/10; round 2 was 5.9, round 1 was 4.9)

Scores (0-10 vs reference). Round 2 scores are in brackets.
(1) pose/lean/silhouette/framing 7.5 [7]
(2) head, face likeness, hair, strap, monocle 5.5 [5]
(3) propping hand + armrest hand 6.5 [6]
(4) legs, trousers, boot 5.5 [5.5]
(5) throne/backdrop/wall 7 [6.5]
(6) art style, ink, cel colour, mood, grade 6.5 [6]

Coordinates are in the 1156x1264 render frame, and refs/ref_full.jpg is the same size, so they compare directly. They are approximate. Zoomed face/boot crops were compared (scratchpad face.png, boot.png).

Improved since round 2:
- The collar spike no longer cuts across the mouth.
- The fist is now big, with knuckles on the cheek (~(690-840,290-410)).
- The monocle is a visible gold disc of about the right size.
- The hair is a creamy light grey with ink strands.
- The whites are cooler, with real hatching in the shadows.
- The throne has a red cushion instead of the stepped dais.
- The stray artifacts are gone.

## Builder A (src/body.js)

1. **Bare-skin neck/chest is a huge flat peach wedge.** Skin fills (470-720,300-540), including a bare shoulder blob at (465-545,300-390) left of the neck, with a red triangle and a white notch stuck on it at (430-520,370-430). The reference has a narrow neck, with the dark-red shirt coming up to the collarbone and the deep V only ~110px wide at the top. The shirt collar and red lapel edge frame the neck at (430-540,300-400), and there is no bare shoulder. Raise the shirt neckline: make the V ~35% narrower, start it at ~y 400 below the collarbones, put the red collar around the neck base (not a floating triangle), and remove the bare shoulder blob by moving the jacket/shirt collar up over it.
2. **Boot is crude and faceted.** It spans (90-500,940-1225) as a low-poly wedge with visible polygon steps (a tan rectangle highlight at (230-440,1000-1100), a staircase shape at (320-400,960-1000), flat-shaded planes). The reference boot is an organic, rounded, lace-up boot with a thick toe cap, a shaft ending in the trouser hem, 4-5 thin crossed laces and heavy black shadow. Increase the segments and smooth the normals (a rounded toe cap and a rounded ankle), replace the blocky highlight with a thin curved rim light, and make laces thin dark crossing lines on the instep. The toe should point down-left at ~210 deg, which it roughly does.
3. **Crossed-leg readability is still weak.** The thigh and the crossing shin read as one big white mass at (400-1050,700-1100), and the knee is a smooth rounded ball. The reference has a clear shin line: from the knee (1000,840) steeply down-left over the other thigh, with the cuff pooling at ~(380-480,1000-1100), and fold lines from the knee. Add a visible trouser cuff (hem opening ~60px wide) at the ankle where it meets the boot, and creases radiating from the knee and hip.
4. **Torso/jacket shape.** The left shoulder is a tall white hump (270-440,310-420) that rises higher than the neck base, like a pauldron. The reference shoulder slopes down from the neck at ~25 deg. Lower the left shoulder peak ~45px and soften the hump. The lapels are flat white slabs: add a lapel notch and a clear lapel roll.
5. **Right sleeve and elbow.** The propping sleeve (770-1030,380-700) is a smooth tube with a notched outline. Add 3-4 crumple creases at the elbow, a more bent elbow (a sharper angle, with the elbow lower, ~(1010,620)) and a cuff that shows at the wrist ~(800,400).
6. **Fist details.** The fist is good in size, but a grey hair lock hangs over it (700-725,330-410), and the fingers are a blob of 4 similar bumps. Add finger separation lines, a thumb tucked under the chin and a visible curled index finger. The knuckles should press the cheek with the monocle partly under the fingers.
7. **Armrest hand.** Now acceptable at (155-320,765-935). The fingers are still too straight, and the thumb at (290-320,850-885) looks like a spike. Curl and shorten.
8. **Shirt.** Still a flat maroon slab (385-740,400-780), with a stray red triangle at ~(440,650). Add chest wrinkles and a lower hem, and remove the red triangle.

## Builder B (src/head.js)

1. **The face is hidden and distorted.** The face is visible only as a narrow sliver (570-690,200-370), as the fist and a heavy hair lock cover the right half. The reference shows most of the face: forehead, nose bridge, left eye, cheek, mouth and chin at ~(600-740,215-380) with the fist below the monocle. Move the head ~25px left/up relative to the fist, or lower the fist, so that the nose, mouth and jaw are visible. Remove the grey lock that hangs across the knuckles (700-725,330-410); locks must hang beside the face, not over the hand.
2. **Eye, brow and mouth.** The left eye is a small blue almond with a single brow line. It needs a darker iris, a heavy lid, dark under-eye bags and a sharper angry brow ~30px long. The brow (thin, near (595,248)) is OK in angle but too light. The mouth is a faint line with white stubble at the chin (585-610,350-365). Add a clear smirk (corner up), a darker upper lip line and the lower lip. The reference smirk is at ~(615-680,335).
3. **Monocle.** The disc at (645-700,275-305) is now a flat gold coin pasted on the face, in front of the eye socket, with a black rim. The reference lens is a pale translucent-yellow disc that hugs the eye socket, ~45x30px, tilted with the head and partly hidden by the knuckles at ~(735,305). Tilt it with the head (~35 deg), make it translucent pale gold, and tuck its lower edge behind the fingers. Move it ~40px right, to the viewer's-right eye (currently it is sitting at the middle of the face).
4. **Eyepatch strap.** The strap is now a wide, pale band (600-660,150-250) running down and across the brow, but it is nearly vertical and too wide (~40px), and has a stray white highlight patch. The reference strap is ~25px wide, running diagonally (~35 deg from horizontal) from the upper-left forehead to the monocle across the viewer's-right eye. Rotate ~35 deg more toward horizontal, narrow, and run it to the monocle.
5. **Head scale and shape.** The head spans ~(545-840,65-390), but the skull is too tall and the jaw too long and narrow (chin at ~(600,365)). The reference has a rounder skull and a strong angular jaw. Shorten the face length ~10% and widen the jaw/cheek.
6. **Hair.** Better colour. But the hair is a smooth helmet with a ragged flick at the left (545-590,215-260) and large dark spiky strokes. The reference has a wavy, voluminous mass with comb lines and curly tips at the ear and nape (~(565-600,270-310)), and white/cream, not grey. Brighten it ~15%, add the wavy lock tips, and thin the dark strokes.
7. **Neck and skin.** The neck is a flat wedge (with A1). The skin is flat peach with hatching on the cheek/jaw. Add a collarbone line (~(540,390)-(690,405)), a neck tendon, and warm cel shadow under the jaw.
8. **Ear and temple.** There is no visible ear or sideburn. The reference has the ear partly covered with locks and a sideburn running down the jaw (stubble). Add a sideburn along the left jaw (580-600,260-350).

## Style (src/style.js)

1. **Spot blacks and ink weight.** Better hatching, but the reference whites have sharp, dense black ink creases (under the lapel, between the thighs, in the cuffs) as solid fills. The render has only pale blue-grey tone with light hatch lines. Add a hard threshold so the darkest 10% turn solid black, and add 1-2px black fold lines at crease edges.
2. **Shirt and skin are flat fills.** The shirt is a flat maroon polygon and the skin a flat peach. The reference shirt has darker folds and a gradient, with skin in a two-tone cel with a warm orange mid-shadow and a bright highlight. Add a subtle noise/gradient to the maroon, and a second shadow band on the skin.
3. **Boot shading.** Hard-faceted brown steps (see A2). Use a smooth cel ramp (3 steps, soft terminator, thin rim highlight), a deep near-black shadow and a hint of orange.
4. **Backdrop colour.** The red is now fine and the glow is soft. The cream wall has a brown vignette that reads sepia. The reference wall is pale cream with an orange warmth near the throne and cooler white away from it. Reduce the brown corner darkening to 50%.
5. **Gold materials.** The throne gold is glossy and saturated; the reference is a warmer brown-gold with dark carved lines. Darken the shadow side of the gold (#7a4a08) and add small engraved detail lines.
6. **Mood.** The scene is closer, but the face is not lit dramatically. Add a stronger shadow on the left side of the face and under the brow, and a warm rim light on the hair's right edge, for the lazy-menacing feel.
7. **Outline weight.** Silhouette lines are good. Interior lines on the hand and face are still a bit heavy (the fist). Taper them.
8. **Hair line art.** The strands are drawn as noisy dark scribbles. Replace with consistent thin parallel ink lines, matching the reference comb lines.

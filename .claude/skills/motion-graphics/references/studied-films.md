# Studied films: what they did, how, and why

Two professional launch films studied frame by frame (every frame measured, 12-frame strips across
every key move, soundtrack analysed). Each move below has a scene in `src/scenes/studio.tsx` that
reproduces it in the always-light style. Use this file to plan pacing and to pick moves.

## The numbers

| | Dexatel promo (Burnwe) | Showreel 2025 (Bohdan Martovskyi) |
|---|---|---|
| Shots | 5 in 18 s, but every shot has 2-4 internal "beats" | 17 in 15 s |
| Median shot | 2.9 s (internal change every ~0.6 s) | 0.8 s |
| Cuts on the beat | 50 % (chance 26 %) | 50 % (chance 24 %) |
| Music | 112 BPM, F major, bright, dynamic (13.5 dB), punchy pop-electronic | 103 BPM, A minor, dense and compressed (7.7 dB), groove |
| Transitions | Hard cuts + one light-bloom flash + one frame-to-logo morph | Almost all hard cuts on the beat |
| Palette | White/very light grey + one saturated brand blue (#0353F4) | Changes every shot: each idea gets its own world |

**The lesson:** neither film uses fancy transitions. The energy comes from something new happening
**every beat** (a word swaps, a card lands, a colour flips), with hard cuts on the music. Our first
videos held each idea for 4-6 s with soft transitions, which is why they felt slow.

## Moves (what → how → why)

### 1. Weight-contrast headline (Dexatel "Bots are **getting smarter**")
- **What:** a light-weight line and a heavy line in the same rounded sans; lines rise in through a mask one after another.
- **How:** each line clipped, translateY 110 % → 0 with ease-out, 6-frame stagger. Font weight 300 vs 800.
- **Why:** the weight change *is* the emphasis. No colour needed, and it reads instantly.
- **Scene:** `feed` (lines use `**bold**`), and `WeightLine` in any custom scene.

### 2. Accumulating feed (Dexatel notifications)
- **What:** while the headline holds, message cards keep landing on the right, faster and faster, older ones fading. A pill's phone number keeps changing.
- **How:** a new card every ~0.22 s, spring from +120 px, cards at staggered columns; opacity decays with age; ticker text swaps every 0.28 s.
- **Why:** it shows *volume* (the problem growing) without a single word.
- **Scene:** `feed`.

### 3. Word swap (Dexatel "Fake users? → accounts? → everything")
- **What:** "Fake" stays put in light weight; the bold word replaces itself on each beat; the line re-centres; the last one is the punchline.
- **How:** hard switch on the beat (1 s each), the width change eases so the line re-centres smoothly; faint phone skeleton behind with a shimmer.
- **Why:** three beats of escalation with only one word changing. The rhythm does the storytelling.
- **Scene:** `wordSwap` (`prefix`, `words`, `each`, `phone`).

### 4. Light-bloom flash
- **What:** from the navy scene to white, the frame blooms to white with a blue glow at the edges, and the logo sits in the middle.
- **Why:** it resets the viewer's eye and marks "here's the answer".
- **Use:** `zoomThrough`/`blur` transitions or `LightLeak`. (Always-light: go from a tinted frame to pure white.)

### 5. Lockup + typing (Dexatel logo → "Verify **humans across any channel**")
- **What:** the symbol lands with a sweep of light, the wordmark slides out from behind it while the lockup re-centres, then a sentence types itself in mixed weights; the logo leaves and the sentence stays.
- **How:** clip-path reveal of the wordmark + translateX of half the hidden width (keeps it centred); typewriter ~26 chars/s with caret.
- **Why:** brand and message in one continuous motion, with no cut between "who" and "what".
- **Scene:** `lockup` (`markRatio`, `type`, `typeAt`).

### 6. Marquee wall (Dexatel "any channel")
- **What:** the key line holds still in the centre; above and below, rows of channel names, icons, avatars and "API" pills slide past in alternating directions.
- **Why:** "any channel" becomes *visible*: the breadth surrounds the claim.
- **Scene:** `marquee` (`line`, `items`: text, image paths, `"[pill]"`).

### 7. Notification cycle (Dexatel phone: SMS → Viber → WhatsApp → Call)
- **What:** a phone outline, one notification card; every ~0.6 s the card changes to the next app, its icon pops out over the card edge, and the whole background tints to that app's colour.
- **Why:** each beat equals one channel. Colour tint makes each change unmistakable, even at a glance.
- **Scene:** `notifyCycle` (`items: [{icon, title, body, tint}]`, `each`).

### 8. Frame to logo (Dexatel "Instantly")
- **What:** full-bleed brand colour with one italic word; the word straightens (italic → upright) on the beat; the full frame shrinks into a rounded tile; the tile becomes the logo symbol; the wordmark follows.
- **How:** skewX −12° → 0 in 10 frames; frame w/h/radius tween to a tile in 16 frames; crossfade + spring into the symbol.
- **Why:** the whole screen *becomes* the brand. The strongest possible ending in 1.5 s.
- **Scene:** `frameToLogo` (`word`, `icon`, `shrinkAt`, `iconAt`).

### 9. Warped typography (showreel "SHOWREEL", "2025")
- **What:** one huge heavy word; every beat it snaps into a new lens warp (flat → bulge tunnel → flag wave → pinch) and the colours invert; tiny mono credits sit in the four corners.
- **How:** per-letter scaleY/scaleX/skew/rotate as a function of the letter's position across the word; springs with overshoot; variant changes exactly on the beat.
- **Why:** typography as image, pure rhythm. It sets the energy before any content appears.
- **Scene:** `warpText` (`text`, `variants`, `each` = one beat, `corners`). (Always-light: the "invert" is a brand gradient, never black.)

### 10. Click with ripple rings (showreel "Create")
- **What:** a glossy gradient pill with glow; a big cursor glides in and clicks; concentric rings ripple; cut into the product.
- **Scene:** `clickButton`, then a `zoomThrough` transition at the click point.

### 11. Carousel → collage (showreel #BIKELIFE)
- **What:** photos, profile card, stickers and a label start spread around a 3D cylinder; the carousel whips round ~110° and flattens into a layered collage in ~0.8 s, then drifts with parallax.
- **Why:** a lot of content arrives as one satisfying gesture instead of eight separate entrances.
- **Scene:** `collage` (`items: [{src|text|sticker, x, y, w, rot, z}]`).

### 12. Logo vortex (showreel "Smooth")
- **What:** integration logos spiral in from past the camera (big, blurred), settle on a ring and keep orbiting; the word's letters fly in from scattered positions in different colours.
- **Scene:** `vortex` (`logos`, `word`).

### 13. Resize (showreel design-tool moment)
- **What:** grid paper, a selected frame with handles; the cursor drags the corner and the frame grows with a spring; at the peak the content swaps (😐 → 🤯).
- **Why:** shows *creation* (a tool in use) in 1.5 s. The emoji swap is the punchline.
- **Scene:** `resize` (`a`, `b` = emoji or image, `from`, `to`, `swapAt`).

### 14. Tags drop (showreel "Design System")
- **What:** coloured pills fall with gravity, bounce and pile up.
- **Why:** physicality. A list becomes a satisfying object.
- **Scene:** `tagsDrop` (`tags`, `lines`).

### 15. Waveform (showreel VAPI)
- **What:** the logo in the centre, dotted multi-colour audio bars pulsing outward to the beat.
- **Scene:** `waveform` (voice/AI/audio products).

## How to apply
1. Pick a tempo (100-115 BPM) and time **every scene in whole beats** (1 beat ≈ 0.55 s): 2-8 beats per scene.
2. Default transition: `"none"` (hard cut on the beat). Use at most 1-2 designed transitions per video.
3. Inside long scenes, change something every 1-2 beats (a word swap, a card landing, a tint change).
4. Keep voice lines short (2-6 words); the typography carries the message, so turn captions off.
5. Choose music by *feel*: compare candidates to the reference soundtrack (tempo, brightness, density,
   dynamics) and start the track at its most energetic 30 s, aligned to a beat.

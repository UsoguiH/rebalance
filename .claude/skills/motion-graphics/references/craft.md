# Craft: what makes a launch video good

## Structure (30 s; scale proportionally)
| Time | Beat | Job |
|---|---|---|
| 0-3 s | Hook | One bold idea or a tension ("Plan less. Ship more."). No logo yet: earn attention first. |
| 3-8 s | Reveal | The product appears for real: real UI, cursor, prompt typed, result lands. |
| 8-20 s | Proof by showing | 2-3 features, each = one visual idea + one short line. Devices, zooms, cards. |
| 20-25 s | Breadth / trust | Wall of screens, integrations orbit, a number that counts up, customer logos. |
| 25-30 s | Brand + CTA | Logo reveal (music hit), tagline, button, URL. Hold 2+ s so people can read the URL. |

15 s: hook → hero shot → logo+CTA. 60 s: add problem (before) → solution (after), and 1-2 more features.

## Script
- Write for the ear: short sentences, 5-10 words, one idea each. Verbs over adjectives.
- English ≈ 2.3-2.6 words/s in a launch read; Arabic ≈ 1.8-2.1 words/s. 30 s ≈ 55-70 English words total,
  and leave some scenes voice-free (let music breathe on reveals).
- Screen text ≠ voice. Screen: 2-4 punchy words. Voice: the sentence around them.
- Use the product's own words from `brand.json` → `content` (h1, h2, CTAs): it keeps claims true.
- Never invent numbers, customers or awards. Use stats only if the site or user states them.
- Arabic Gulf: natural but clean (e.g. "خلّ فريقك يشتغل أسرع" not heavy slang); keep brand names in Latin
  script if that is how the brand writes them; numbers in Western digits unless the brand uses Arabic-Indic.

## Motion principles
- **Everything eases.** Entrances ease-out (fast start, soft land); exits ease-in; camera moves ease-in-out.
  Springs (`pop`) for UI elements and logos give a tiny overshoot that feels alive.
- **Stagger** 2-4 frames between sibling elements (words, cards, logos). Never all at once.
- **One focal point per moment.** If the cursor is clicking, the headline waits.
- **Hold** readable text ≥ 1.2 s after it lands (≈ 3 words/s + 0.5 s).
- **Depth**: layered shadows, slight 3D tilt (5-20°), parallax between foreground and background.
- **Continuity**: carry an element across a cut (the card that pops becomes the next scene's screen,
  the accent colour wipes into the next scene). Match cuts feel expensive.
- **Contrast of pace**: fast section → one slow, spacious moment → fast again. Constant speed is boring.
- **Camera**: slow push-ins (1.00 → 1.05) keep static shots alive; macro zooms (2-4×) on the exact button being clicked.
- 30 fps default; 24 fps for a cinematic look (set `meta.fps`); 60 fps only for very fast UI motion.

## Typography
- Max 2 families: a sans for UI/body + optionally a display face (serif italic or bold grotesk) for 1-2 words.
- Headline 90-140 px at 1080 short side; captions 38 px (46 portrait); minimum readable text 26 px.
- Tight tracking on big headlines (-0.02 em), never on Arabic. Arabic: animate per word (never per letter),
  RTL alignment, fonts with Arabic glyphs (IBM Plex Sans Arabic, Tajawal, Cairo, Noto Kufi Arabic, Almarai).
- Accent colour on 1 word per line at most.

## Colour
- Take the brand palette from the site. One accent. Backgrounds: brand bg for most scenes, one or two
  dark (or accent) scenes for contrast at big moments. Check text contrast on each still.

## Sound
- Music bed -18 to -22 LUFS under voice (the template ducks it to `duckTo` while the voice speaks).
- Voice is the loudest thing. Final mix normalised to -14 LUFS, true peak ≤ -1.5 dBTP (render.mjs does this).
- Put a music accent (impact/riser) on the logo reveal; whoosh on transitions (autoWhoosh); click on cursor clicks; pop on logos/cards appearing.
- Cut on beats: scene cuts on the beat (or bar) feel intentional. `music.json` has the beat times.

## Formats
- 16:9 1920×1080 YouTube/web; 9:16 1080×1920 Reels/TikTok/Shorts (captions on, text bigger, safe area:
  keep text out of the top 12% and bottom 20%); 4:5 1080×1350 feed; 1:1 1080×1080.
- Render each as its own composition; check stills for each format, since layouts re-flow.

## QA checklist (look at the stills sheet and the final QA sheets)
- [ ] Logo is the real one, crisp, correct colours for the background
- [ ] Every screenshot is real and readable where it matters; no cookie banners or popups in shots
- [ ] No text cut off, overlapping, or too small; nothing important in platform UI zones (9:16)
- [ ] Voice fits its scene; no line runs into the next scene; subtitles match the words
- [ ] Music starts cleanly, ducks under voice, ends on the logo (fade out), no silence gaps
- [ ] Numbers/claims come from the site or the user
- [ ] Pacing matches the style DNA (cuts/min, shot lengths) within ~25%
- [ ] Credits file lists every third-party asset and its license

---
name: motion-graphics
description: Make a professional motion-graphics product launch video (MP4) from reference videos and a product website. Studies the reference videos frame by frame, downloads the brand's real logo, colours, fonts and screenshots plus real partner logos and photos, animates them with optional iPhone/iPad/MacBook mockups, and adds music, sound effects, a voice-over (English or Arabic, including Gulf accents) and subtitles. Starts with a short clickable interview. Use this whenever someone wants a launch video, promo, product teaser, SaaS/app ad, explainer, announcement video, motion graphics or animated video for a product or brand, or says "make a video like this one" with YouTube/X/Vimeo links, even if they never say "motion graphics". Also covers re-cutting an existing launch video into 9:16 / 1:1 formats.
compatibility: Needs Node 18+, Python 3.9+, internet access and a Chromium (found automatically or downloaded by Remotion). Optional keys ELEVENLABS_API_KEY, OPENAI_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY.
---

# Motion-graphics launch video

You are the director, designer, editor and sound mixer. The output is a finished MP4 (plus other
aspect ratios if asked) that looks like a studio made it: real brand assets, deliberate motion, a
voice and music that fit.

The machinery is ready-made so your effort goes into taste and decisions:
- `assets/template/`: a Remotion (React) project. Every scene is driven by `src/video.json`, and there is
  a library of scenes (kinetic type, logo reveal, devices, 3D cards, cursor demo, logo orbit, stats, photos, end card).
- `scripts/`: studying reference videos, the brand kit from the website, logos, photos, music, voice, SFX, fonts, rendering and QA.
- `references/`: read each one when its step comes up (listed below).

Set these once and use them in every command:
```bash
SKILL=<absolute path of this skill folder>     # the folder containing this SKILL.md
P=<absolute path of the new video project>     # e.g. ./launch-acme (inside the user's working directory)
```

## Workflow

### 1. Interview (clickable)
Read `references/interview.md`. If the product URL or reference links are missing, ask for them in one
plain sentence first. Then run the rounds with **AskUserQuestion**: what and where, then look and assets,
then sound and words. Skip anything already answered, and write in the user's language. Save the answers as `$P/brief.md`
(create `$P` first if needed). If AskUserQuestion is not available, ask the same questions as a short numbered list.

### 2. Create the project
```bash
bash "$SKILL/scripts/new_project.sh" "$P"
```
This copies the template, installs Node and Python dependencies and downloads the default fonts (~1 min).

### 3. Study the references frame by frame
Read `references/style-study.md`, then:
```bash
python "$SKILL/scripts/fetch_reference.py" --out "$P/public/ref" <url-or-file> [...] [--transcribe]
```
Open **every** `sheets/*.jpg` and `timeline.png` with Read and go through `report.md`. Then write
`$P/style_dna.md` with measurable targets (length, cuts/min, shot lengths, palette, type, moves,
transitions, sound). If a download is blocked, follow the printed fixes: search the web for the title (the
same video is often on X, Vimeo or the studio's site), or ask the user for the file. Never skip the study
silently. If no references were given, use the style the user picked plus `references/craft.md`.

### 4. Brand kit: real logo, colours, fonts, screenshots
```bash
node "$SKILL/scripts/brand_kit.mjs" --url <product-url> --project "$P" [--pages "/features,/pricing"] [--record]
```
Look at `$P/public/brand/preview.png` and decide:
- **Logo:** pick the real product logo. Customer logos also appear as candidates, so check the name.
  `logo-shot.png` is the pixel-exact header logo. Videos are light, so you need a dark logo: if the site
  only has a white one, set `brand.logoInvert: true`.
- **Colours:** a light bg (white or off-white, even if the site is dark), dark fg, and one accent from the brand.
  The detected accent can be wrong when buttons are neutral, so choose it by eye.
- **Fonts:** use the site's font if it is on Google Fonts; otherwise the closest match (Inter, Geist, Manrope…).
- **Screens:** which screenshots show the product best. The best screens are often behind a login, so if the site
  is only marketing, ask the user for app screenshots or screen recordings and put them in `public/shots/`.

Then fetch everything else the brief needs:
```bash
python "$SKILL/scripts/logos.py"  --project "$P" "Slack" "Notion" "HubSpot=hubspot.com"     # partner / customer logos
python "$SKILL/scripts/images.py" --project "$P" --query "founder working late office" --count 4   # real photos
```
Check `public/logos/preview.png` and `public/images/preview.jpg` by eye. Only use customer logos and numbers the user
or the site actually states.

### 5. Script and storyboard (get approval before rendering)
Read `references/craft.md` and `references/storyboard.md`. Write the script and storyboard straight into
`$P/src/video.json`: brand block, scenes with `vo`, props and transitions. Base the pacing on the style DNA and the
screen copy on `brand.json` content. Show the user a compact table (scene · seconds · what we see · what we
hear) and ask for approval with AskUserQuestion. Only continue once they approve.

**Pace it like the pros.** Read `references/studied-films.md`: time every scene in whole music beats (2-8 beats),
hard-cut on the beat, change something inside each scene every 1-2 beats, keep voice lines to a few words, and let
weight-contrast typography carry the message. Slow 4-6 s scenes with soft fades are what make a video feel amateur.

**Make the motion amazing.** Read `references/motion.md` and choreograph like a motion designer: a signature move
roughly every 4 seconds (`heroDevice`, `promptGlow`, `explode`, `textMask`, `particleLogo`, `morph`, 3D `cards`), letter
animations (`"chars"`) for headlines, and transitions that carry the eye (`zoomThrough`, `iris` from the click point,
`panels`, `cube`, `whip`). Never plan a stretch of plain fades and static slides.

Where the references do something the library can't (a redrawn UI moment, a globe, a chat building up,
a before/after), **write a custom scene** in `src/scenes/custom/` with the effects in `src/fx/` (`Moving` for
motion-blurred paths, `GlowBorder`, `Sheen`, `CharText`, `ParticleLogo`, `Burst`, `useBeat`). That is the
difference between "template" and "studio".

### 6. Fonts, voice, music, SFX
```bash
python "$SKILL/scripts/fetch_fonts.py" --project "$P" --from-spec
python "$SKILL/scripts/tts.py"   --project "$P" --voice en-male        # or ar-sa-male, ar-ae-female, en-female…; stretches scenes to fit
python "$SKILL/scripts/music.py" --project "$P" --search "uplifting electronic tech"   # or --file, --synth --mood bright, --elevenlabs "prompt"
python "$SKILL/scripts/sfx.py"   --project "$P"
```
Order matters: run the voice first (it sets scene lengths), then music (it sizes to the video). If the style
cuts on the beat, nudge scene durations so cuts land on `music.json` beats. The template ducks the music under
the voice automatically. If the user said "no voice", skip tts.py and set `"captions": false`.

### 7. Stills, look, fix, repeat
```bash
node "$SKILL/scripts/render.mjs" --project "$P" --stills
```
Open `$P/renders/stills/sheet.jpg` with Read. It shows two frames per scene plus the middle of each transition.
Check it against the QA checklist in `craft.md`: real logo, readable text, nothing clipped or overlapping,
contrast, one focal point, consistency with the style DNA. Fix `video.json` or the scene code, then render the stills again.
Two or three rounds is normal. When it looks right, show the sheet to the user (SendUserFile if available)
and get a click to continue.

### 8. Render, QA, deliver
```bash
node "$SKILL/scripts/render.mjs" --project "$P" --video [--comp Launch-9x16] [--scale 0.5 for a quick draft]
python "$SKILL/scripts/analyze_reference.py" "$P/renders/Launch.mp4" --out "$P/renders/qa"
```
render.mjs normalises loudness to -14 LUFS. Compare `renders/qa/report.md` with the style DNA (pacing,
brightness, cuts on beat) and look at `renders/qa/sheets/*.jpg`. Re-render if something is off.

Deliver:
- **The video:** `renders/Launch.mp4`, plus other formats if asked (`Launch-9x16`, `Launch-1x1`, `Launch-4x5`).
- **`credits.md`** (run `python "$SKILL/scripts/credits.py" --project "$P"`), with every third-party asset, its source and licence, and the CC BY lines
  to paste into the video description.
- **One line on how to edit:** change `src/video.json` and re-run render, or `npm run studio` in `$P` for a live preview.
- **Licensing notes, in one line each:** Remotion is free for individuals and teams of up to 3 people. The Edge voices are for drafts; use ElevenLabs or OpenAI voices for paid ads.

## Principles
- **Always light.** Every video uses a light or white look: white / off-white backgrounds, dark text,
  the brand's accent colour for highlights. Never dark themes or dark scenes, even when the brand's
  website or the reference videos are dark: translate them to light (keep their pacing, moves and
  accent colour, not their darkness). The template enforces this (a dark `brand.colors.bg` becomes white,
  `dark`/`accent` scene backgrounds render light); don't work around it. If the only logo is white,
  set `brand.logoInvert: true` (renders it black) or find a dark version.
- **Real beats generic.** Real logos, real screenshots, real product copy. Never draw a fake logo, never
  invent customers, testimonials or numbers. If something real is missing, ask for it or leave it out.
- **Look at every picture you produce.** Brand preview, logo preview, stills and QA sheets: the numbers
  cannot tell you a logo is wrong or a headline overlaps.
- **Measure the references, then match them.** The style DNA gives targets; the QA report checks them.
- **The user approves the plan and the stills** before the long render. Clicks, not essays.
- **Keep the project editable.** Everything lives in `video.json` and small scene files.

## Reference files
| File | Read it when |
|---|---|
| `references/interview.md` | Step 1: the exact clickable questions and how answers map to settings |
| `references/style-study.md` | Step 3: how to study references, the style-DNA template, patterns from studied launch videos |
| `references/storyboard.md` | Step 5: `video.json` format, every scene type and prop, custom scenes, an example |
| `references/motion.md` | Step 5 and 7: signature moves, transitions, effects library, how to judge motion |
| `references/studied-films.md` | Step 3 and 5: two professional launch films studied frame by frame; the beat-driven pacing and 15 studio moves (`warpText`, `wordSwap`, `lockup`, `frameToLogo`, `feed`, `marquee`, `notifyCycle`, `collage`, `vortex`, `resize`, `tagsDrop`, `waveform`, `clickButton`) |
| `references/craft.md` | Step 5 and 7: structure, script-writing, motion, type, sound, formats, QA checklist |
| `references/assets.md` | Any time assets, licences, keys or errors come up (blocked downloads, proxies, fonts) |

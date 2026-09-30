# Studying reference videos (frame by frame)

The user wants the new video to feel like the references. "Feel like" is made of things you can
measure (pacing, colour, motion amount, beat sync) and things you can only see (the moves, the
compositions, the typography). Get both, write them down as a **style DNA**, and later check your own
render against it with the same tool.

## 1. Measure

```bash
python "$SKILL/scripts/fetch_reference.py" --out "$P/public/ref" URL1 URL2 ... [--transcribe]
```

For each video you get `study/<name>/`:
- `report.md`: duration, shots and cuts per minute, shot-length spread, palette with shares,
  brightness/saturation/motion, music BPM, loudness, % of cuts on the beat vs chance.
- `timeline.png`: motion (blue), brightness (white), saturation (pink), audio loudness (green),
  beats (green ticks), cuts (red lines). Shows rhythm at a glance: where it breathes, where it hits.
- `sheets/sheet_NN.jpg`: **every shot**, 4 frames each (8%, 38%, 68%, 94% of the shot), labelled with
  time and length. Four frames per shot show how things move inside the shot, not only what it shows.
- `analysis.json`: all numbers, per-shot palettes, 10 Hz frame metrics, beat times, transcript (optional).

The cut detector is conservative: a long "shot" can hold camera moves, zooms and UI changes with no
hard cut (Claude Design's 23 s shot 7 is one continuous camera move). Look at the sheets to see those.

## 2. Look (open every sheet and the timeline with the Read tool)

For each reference, write down:

| Aspect | Questions |
|---|---|
| Story | What happens first 3 s (the hook)? When does the product appear? How does it end (logo, CTA, URL)? |
| Structure | List the beats: e.g. hook → prompt typed → result → feature zooms → breadth wall → logo |
| Camera | Static? Slow push-in? Macro zoom on a button? Pans across UI? 3D tilt? Orbit? |
| Transitions | Hard cut, fade, zoom-through, whip, match cut (same element carries over), wipe? |
| Typography | Serif or sans? Weight? Size relative to frame? Word-by-word or line reveal? Mixed fonts (e.g. sans + italic serif)? |
| Colour | Background (light/dark/brand), how many accents, where accent is used (buttons only? highlights?) |
| UI treatment | Real UI or redrawn? Floating cards with shadow? Devices? Cursor? Callouts? |
| Motion feel | Snappy spring overshoot or soft ease? Stagger between elements? Hold time on readable text? |
| Sound | Music style and BPM, voice or not, whooshes/clicks, where the music hits (logo, reveals) |

## 3. Write the style DNA

Save `$P/style_dna.md`. Keep it concrete enough to build from. Template:

```markdown
# Style DNA (from: <reference names>)
Targets: 30 s · 12-15 cuts/min · median shot 2.5 s (min 0.6, max 6) · cuts on beat ≥ 60%
Palette: bg #F4F2EC (60%) · text #141414 · accent #D9623B (buttons, highlights only) · dark scenes #0A0F13 for contrast
Type: sans (Inter 600) for UI and headlines, italic serif (Instrument Serif) for 1-2 emotional words
Moves: 1) typewriter prompt in a white rounded box, orange Send → 2) "Designing…" spinner → 3) macro zoom 1.9× on a button then click ripple → 4) wall of 8-12 real screens tilted 25° panning slowly → 5) logo: icon + wordmark, then parent brand
Transitions: mostly hard cuts on beats, zoom-through into the product, fade to white before the logo
Motion feel: ease-out (0.16,1,0.3,1), 12-18 frame entrances, 2-3 frame stagger, hold readable text ≥ 1.2 s
Sound: calm electronic ~100 BPM, no VO in ref (we add VO), soft clicks on every cursor click, whoosh on zooms
Don't: gradients everywhere, more than 1 accent colour, text over busy UI without a card behind it
```

## 4. Check your render against it

After rendering, run the same analysis on your own video and compare the numbers with the targets:

```bash
python "$SKILL/scripts/analyze_reference.py" "$P/renders/Launch.mp4" --out "$P/renders/qa"
```

If cuts/min, shot length or brightness are far off, or cuts miss the beat, adjust scene durations and
re-render. Then look at `renders/qa/sheets/*.jpg` the same way you looked at the references.

---

## Patterns already studied (examples of good launch videos)

### "Introducing Claude Design" (Anthropic, 81 s, 1080p24)
- 19 shots, 13 cuts/min, median shot 2.75 s but long continuous camera moves (one 23.7 s).
- Palette: warm off-white `#EDECE6`/`#F7F6F3` (~65%), near-black `#0A0F13` for "wow" scenes, one coral
  accent (#D97757-like) only on primary buttons and the logo.
- Story told by a **cursor through the real product**: title card "Design" with cursor → empty prompt box
  → text typed → Send → "Designing…" loader → result appears on a dark globe → toolbar zoom (Tweaks)
  → prompt → "Soldering…" loader → checklist ticks off with strikethrough → **macro zooms** on single
  buttons (Comment, Edit text, Knobs) at ~4× → **wall of many screens** to show range → export menu
  → end: product icon + "Design", then parent logo "Claude".
- Transitions: mostly hard cuts and continuous camera; the loaders are the "transitions".
- Music: calm, steady (~70-100 BPM), no voice; clicks are the sound design.
- Lesson: real UI + cursor + zooms reads as *honest*; loaders build anticipation; one accent colour.

### Zelios agency SaaS launch films (LangEase, Lovio; 3 s previews studied)
- Light lavender/white backgrounds, UI as **rounded cards with soft blue glow**, tilted in 3D.
- A **hand cursor clicks a card → the card pops forward** and straightens → the others fly away in 3D →
  **kinetic headline in brand blue** ("Multiple Languages") appears where the cards were.
- Many screens **orbit in a spiral / helix**, camera flies through them; motion is constant but smooth.
- Lesson: every UI element is an actor; cards enter/exit with depth; headline words are short (2-3 words).

### BIASafe AI (ObiN Studio) and similar "AI SaaS" launch ads
Could not be downloaded here (YouTube blocked the server). Typical of the genre: dark UI, neon accent,
kinetic type between product shots, fast cuts on the beat. Study it properly if the user provides the file.

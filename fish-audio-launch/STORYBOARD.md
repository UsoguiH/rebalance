# Fish Audio launch video — storyboard

30.0 s · 1920 × 1080 · 60 fps · 1800 frames

| # | Scene | Role | Time | Frames | Length |
|---|-------|------|------|--------|--------|
| 1 | Flatline | hook | 0:00–0:04 | 0–240 | 240 |
| 2 | Regenerate loop | problem | 0:04–0:10 | 240–600 | 360 |
| 3 | Tag it, hear it | fix | 0:10–0:19 | 600–1140 | 540 |
| 4 | Doesn't sound like AI | payoff | 0:19–0:25 | 1140–1500 | 360 |
| 5 | Logo + CTA | logo | 0:25–0:30 | 1500–1800 | 300 |
| | **Total** | | **30.0 s** | | **1800** |

All event frames live in `src/timeline.json`; all copy and colours live in `src/config.ts`.

---

**Scene 1 · Flatline (hook)** — 0:00–0:04, frames 0–240
- On screen: warm-black background. Chip "GENERIC TTS". A row of 56 identical grey bars pulsing on a mechanical metronome. Readout top-right: "pitch variance 0.00 · emotion none". Headline word by word: "Most AI voices sound / exactly like this."
- Motion: bars rise in with a stagger, then pulse in lockstep (deliberately robotic). Headline words spring up 4 frames apart.
- Camera: slow push-in 100% → 106%.

**Scene 2 · Regenerate loop (problem)** — 0:04–0:10, frames 240–600
- On screen: script card with the line "I can't believe you actually came back." and a Regenerate button. Cursor clicks Regenerate three times; each click drops a take card onto a stack: "Take 1 · flat", "Take 2 · flat", "Take 3 · still flat". Counter "Takes" runs 3 → 47. Headline: "47 takes. Still zero emotion."
- Motion: cursor on arcs, button press on every click, take cards drop with overshoot. Counter ~1 s ease-out.
- Camera: easy-ease pan left → right, following the cursor from the script to the stack.

**Scene 3 · Tag it, hear it (fix)** — 0:10–0:19, frames 600–1140
- On screen: the Fish Audio text-to-speech editor (Text To Speech / Voice Cloning / Speech To Text tabs, voice "Sarah", "Drama 3" model pill). The same line types in. Cursor opens Tags; emotion chips stagger in; `[whispering]`, `[sobbing]`, `[laughing]` drop into the script one by one. Cursor clicks "Generate & play". The waveform draws in and plays: soft blue whisper, trembling violet sob, bursting amber laugh, with a playhead and karaoke highlight on the words.
- Motion: window springs up, UI rows offset 3 frames. Tag tokens pop in. Generate button press. Waveform bars stagger in, live bars bounce near the playhead.
- Camera: zoom toward the Generate button on the click (≈130%), then ease back to 100% for playback.

**Scene 4 · Doesn't sound like AI (payoff)** — 0:19–0:25, frames 1140–1500
- On screen: headline "Voice AI that doesn't sound like an AI voice." Four stat cards: "2,000,000+ voices", "15 s to clone any voice", "30+ languages", "8M+ creators".
- Motion: headline word by word; cards staggered 4 frames apart with overshoot; every number counts up over ~1 s. Hold ≥ 1.5 s.
- Camera: pull back 108% → 100%.

**Scene 5 · Logo + CTA (logo)** — 0:25–0:30, frames 1500–1800
- On screen: the Fish Audio fish builds bar by bar, then breathes like a live waveform. Wordmark "Fish Audio". Badge "Introducing Drama 3". Tagline "The most expressive AI speech." CTA pill "Try it free · fish.audio".
- Motion: bars grow from their centres 2 frames apart; wordmark wipes in; tagline and CTA follow with offset; slow drift to the end.
- Camera: gentle push-in.

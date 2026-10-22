# Fish Audio — 30 s launch video

A 30-second launch video for Fish Audio (Drama 3), animated entirely in code with
[Remotion](https://www.remotion.dev). It follows the `launch-motion` Claude skill from
Sanji Chien's *"How to Make SaaS Launch Videos With Claude: Motion Skill + Prompts"*:
brief → storyboard → one component per scene → stills → full render. There is no
After Effects and no hand-set keyframes: every frame is a pure function of the frame number.

- `BRIEF.md`: the client brief (product, audience, one message, must-shows).
- `STORYBOARD.md`: the scene list with frame ranges (source of truth).
- `renders/`: the rendered MP4s.

## Story (30.0 s, 1800 frames @ 60 fps)

| Scene | Time | What happens |
|-------|------|--------------|
| Flatline (hook) | 0–4 s | Identical grey bars pulse on a metronome. "Most AI voices sound exactly like this." |
| Regenerate loop (problem) | 4–10 s | Cursor hits Regenerate three times, takes stack up, counter runs to 47. "47 takes. Still zero emotion." |
| Tag it, hear it (fix) | 10–19 s | Fish Audio TTS editor. The line types in, `[whispering]` `[sobbing]` `[laughing]` drop in, camera pushes into **Generate & play**, the waveform comes alive by emotion. |
| Payoff | 19–25 s | "Voice AI that doesn't sound like an AI voice." 2,000,000+ voices · 15 s cloning · 30+ languages · 8M+ creators. |
| Logo + CTA | 25–30 s | The fish mark builds bar by bar. "Introducing Drama 3", "The most expressive AI speech.", "Try it free · fish.audio". |

## Project layout

```
src/
  timeline.json      every scene range and event frame (also read by the soundtrack script)
  config.ts          brand colours, fonts, all on-screen copy, easing constants
  lib/motion.ts      enter (spring, damping 14), exit (ease-in, 60%), press, drift, noise
  components/        Camera, Cursor (arc paths), Counter, KineticText, Bars, FishLogo, Background
  scenes/            Hook, Problem, Fix, Payoff, Logo (one <Sequence> each)
  Video.tsx          sequences + font gate (delayRender until fonts are loaded) + soundtrack
  Root.tsx           16:9 master plus 1:1 and 9:16 cutdowns of the same timeline
scripts/
  make_soundtrack.py music bed + SFX synthesised with numpy, cued from timeline.json
  render-stills.mjs  key-frame stills for checking layout before a full render
```

Client revisions are one-line changes: copy and colours live in `src/config.ts`, timings
in `src/timeline.json`. After changing timings, run `npm run sound` so the SFX stay in sync.

## Commands

```bash
npm install
npm run studio                 # live preview
npm run sound                  # regenerate public/soundtrack.wav (needs python3 + numpy)
npm run stills                 # key-frame PNGs in out/stills
npm run render                 # renders/fish-audio-launch-16x9.mp4 (1920×1080, 60 fps, H.264 CRF 16)
npm run render:square          # 1080×1080 cutdown
npm run render:vertical        # 1080×1920 cutdown
```

To use an existing headless Chrome instead of Remotion's download, set `REMOTION_BROWSER`
to its path (for example Playwright's `chromium_headless_shell`).

Brand references (logo bars, palette, Onest / Geist Mono, product copy and stats) are taken
from fish.audio. The editor UI is rebuilt as vector DOM rather than screenshots, so it stays
sharp under the camera zoom. Swap in the real Figma SVG exports if you have them.

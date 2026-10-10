# Island Features: launch film

This is a 32-second feature film for [Island](https://github.com/UsoguiH/dynamic-island-windows), the living Dynamic Island for Windows. It uses the design language of the ElevenAgents study: a film panel above an editor timeline, silk gradients, mono labels that decode, corner guides, the bulging tile grid and typed lines. There is no storyline. Each section is one Island feature, built from Island's own UI: the island shape, Bloub, the agent team, the permission alert, limit rings, tabs and the media player. It's drawn entirely in code, with no footage.

The only sound is typing: every typed line plays one of the reference typing passages (`../sfx/typing/`, untouched), with its letters landing on the clicks.

## Run

Open `motion/island-features/index.html`. The page opens on **Play with sound**, Space plays and pauses, ← → step one frame, and `?t=12` opens the page paused at that time.

```sh
node motion/tools/capture.js --page island-features --out frames --fps 30 --to 32
ffmpeg -framerate 30 -i frames/%04d.png -i motion/island-features/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest island-features.mp4
```

## Sections

| Time (s) | Feature | What's on screen | Typed line |
|---|---|---|---|
| 0.0 – 3.0 | The island | Bloub's eyes blink, slide apart, and the black island springs open with three working agents. Labels: C# + Direct3D 11, 144 Hz spring physics, no Electron, local only | |
| 3.0 – 5.6 | Wordmark | **Island for Windows** over the bulging tile grid | *A living Dynamic Island for Windows* |
| 5.6 – 9.6 | 01 Agents | The island opens into the team: four coloured Bloubs with live activity, and pixel-api turns orange (*Needs you*). Labels: reads `~/.claude/sessions`, live activity, plan, files changed | *Every Claude Code session, as a team.* |
| 9.6 – 12.6 | 02 Permissions | The glowing alert *aurora-web wants to run `npm run build`*; the pointer clicks **Allow**, and it shrinks to *Allowed · building…* | *Allow or deny, right from the island.* |
| 12.6 – 15.4 | 03 Celebrations | Bloub leaps out of the island, lands with confetti, a check and *I'm done!*, then flies home to the *aurora-web is done* banner | *Bloub tells you when it's done.* |
| 15.4 – 18.6 | 04 Plan limits | The 5-hour (82%, orange past 80%) and weekly (63%) rings count up on dark, and the 80% heads-up drops in | *Your real plan limits.* |
| 18.6 – 21.8 | 05 Tabs | Servers, Battery, Calendar, Network, Tasks, Notes, Focus and Downloads pop in; a tap pins Notes and its colour spreads | *17 tabs. Pin the ones you use.* |
| 21.8 – 24.6 | 06 Now playing | The island opens into the media player (*Midnight City*, M83) over a moving waveform | *Your music, one glance away.* |
| 24.6 – 27.6 | 07 Auto-retract | A browser slides under it, the island folds into a thin line over the tabs, and hovering brings it back. Labels: click-through, never steals focus, hides in fullscreen games | *Never in your way.* |
| 27.6 – 32.0 | Outro | A recap grid of every feature collapses into a pink tile that rounds into a sphere and opens its eyes: Bloub. **Island for Windows** lands | *github.com/UsoguiH/dynamic-island-windows* |

## Files

```
js/core.js, frame.js, grad.js   engine, timeline frame and silk gradients (from ../elevenagents/)
js/island.js                    Bloub and the agent colours
js/kit.js                       typed lines, decoding labels, guides, pointer, springs, tile grid, wordmark
js/cues.js                      typed lines and their typing passages
js/scenes.js                    the ten sections
js/main.js                      timeline and player
tools/mix.py                    typing-only soundtrack from js/cues.js
```

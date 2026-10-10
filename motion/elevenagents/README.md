# ElevenAgents: motion study

This is a frame-by-frame recreation of a 34-second ElevenAgents (Architect) launch piece, drawn entirely in code on a `<canvas>`. The composition is a film panel sitting above an editor-style timeline (Intro · Demo · Features · Build · Outro, with a playhead and waveform). Inside the panel, it runs as follows:

- a pause button splits into *Your agents*
- a square flips through silk-gradient tiles with agent status labels
- the **ElevenAgents Architect** wordmark appears over a bulging tile grid
- a support-agent prompt types and sends
- the agent's dark workspace assembles, then it reports back and gets a reply
- a procedure builds step by step, and the change is approved
- a live call with the agent's notes, then a drifting collage of calls
- the *Scanning conversations…* loader
- the proposed configuration change and the proposals table
- a mosaic of test runs, and a closing sphere

There is no footage. The fonts are Inter and DM Mono from Google Fonts.

## Run

Open `motion/elevenagents/index.html`. The page opens on **Play with sound**, Space plays and pauses, **Sound** toggles the typing sound, ← → step one frame, and `?t=12` opens the page paused at that time.

```sh
node motion/tools/capture.js --page elevenagents --out frames --fps 30 --to 34.2
ffmpeg -framerate 30 -i frames/%04d.png -i motion/elevenagents/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest elevenagents.mp4
```

## How it was matched

The reference was a 60 fps phone screen recording. Its 884×632 composition (the white page, the panel and the timeline) was cropped out and sampled at 30 fps, which gave 1,026 frames. Scenes are written in that coordinate space with `FR(n)` = reference frame *n*, and render at 2×. The playhead moves at a constant 11.09 px/s, as measured. Each scene was compared side by side with the reference on matching frames and adjusted.

| Frames | Time (s) | Scene |
|---|---|---|
| 1 – 72 | 0.0 – 2.4 | Pause bars split into dots around *Your agents*, which collapses from both ends into a growing block |
| 72 – 144 | 2.4 – 4.8 | Gradient tiles (violet, teal, magenta, sand, sky) grow and swap while mono status labels decode around them, then fill the panel behind a pause button |
| 145 – 238 | 4.8 – 7.9 | A bulging rounded-tile grid. The wordmark types in and *Architect* resolves, then a lilac gradient sweeps it away |
| 238 – 330 | 7.9 – 11.0 | Zoomed prompt card: *Why do customers ask to talk to a person?* types (fresh letters grey), the camera pulls back over violet streaks, and the pointer sends |
| 324 – 388 | 10.8 – 12.9 | Workspace: workflow nodes, system-tool toggles, the transcript and a *Gathering data* checklist slide in, then out |
| 388 – 469 | 12.9 – 15.6 | *Thought for 1s*, the finding and *Proposed fix*, then the reply types with @mentions and app chips |
| 469 – 541 | 15.6 – 18.0 | Step icons framed by guides line up, then become the procedure (Tell, Ask, Tool, If, Say, Else if) as it types out |
| 541 – 580 | 18.0 – 19.3 | Close on **Reject / Approve**; the pointer clicks Approve |
| 580 – 633 | 19.3 – 21.1 | The call: caller portrait, call tile, mono notes, and the agent's bubble with *Checking pricing* typing |
| 633 – 694 | 21.1 – 23.1 | A magenta-washed cut into a drifting collage of calls and UI snippets, which darkens |
| 694 – 780 | 23.1 – 26.0 | Dark stage: *Scanning conversations…* with a shimmer and an orbiting ring of dots |
| 780 – 853 | 26.0 – 28.4 | A framed slot opens and the *Alternate verification* diff fills in (struck-out old values in red) |
| 853 – 905 | 28.4 – 30.1 | The card shrinks into the *Proposals* table |
| 905 – 985 | 30.1 – 32.8 | A mosaic of gradients and dark test-run panels (*Evaluation succeeded*, *Passed*, *Improve response*) that clears to the magenta tile |
| 985 – 1027 | 32.8 – 34.2 | The tile rounds into a sphere in its frame, then the tile grid returns with dots scattering outward |

## Sound

The only sound is typing. Every typed line plays one of the reference typing passages from `../sfx/typing/` (untouched), with its letters landing on that passage's clicks: the prompt, the reply, and *Checking pricing*. `tools/mix.py --out soundtrack.wav` rebuilds `audio/` from `js/cues.js`.

## Files

```
index.html            player page
js/core.js            engine helpers (shared with the other studies)
js/frame.js           page, panel, chapter timeline, playhead, waveform
js/grad.js            procedural silk-gradient images
js/cues.js            typed lines and their typing passages
js/scenes-intro.js    pause → Your agents → tiles → wordmark
js/scenes-demo.js     prompt, workspace, reply, steps, approve
js/scenes-features.js call, collage, loader, verification, proposals, mosaic, sphere
js/main.js            timeline and player
tools/mix.py          builds the typing-only soundtrack
```

## Known differences

- **People:** the reference's people are filmed photographs. Here they are soft painted stand-ins, since copying the footage isn't possible in code.
- **Gradients:** the silk gradients are procedural approximations of the reference's rendered images.
- **Small UI text:** the workflow nodes, transcripts and test-run IDs are close but not letter-exact; the reference's text is too small to read reliably.

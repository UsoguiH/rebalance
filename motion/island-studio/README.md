# Island Studio: launch film

This is a 36.6-second launch film for [Island](https://github.com/UsoguiH/dynamic-island-windows), the living Dynamic Island for Windows. It uses the UI design language and motion of the ElevenAgents study (`../elevenagents/`) beat for beat: a film panel above an editor timeline (Intro · Agents · Island · Limits · Outro), silk gradients, mono status labels, a typed prompt, a plan builder, an approve click, a scanning loader, a settings diff, a table, a mosaic and a closing sphere. Every scene is re-cast as Island. It's drawn entirely in code, with no footage.

The only sound is typing: each typed line plays one of the reference typing passages (`../sfx/typing/`, untouched), with its letters landing on the clicks.

## Run

Open `motion/island-studio/index.html`. The page opens on **Play with sound**, Space plays and pauses, ← → step one frame, and `?t=20` opens the page paused at that time.

```sh
node motion/tools/capture.js --page island-studio --out frames --fps 30 --to 36.6
ffmpeg -framerate 30 -i frames/%04d.png -i motion/island-studio/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest island-studio.mp4
```

## Shot list

| Time (s) | ElevenAgents beat | Island version |
|---|---|---|
| 0.0 – 2.4 | Pause bars, *Your agents*, a block grows | The pause bars are **Bloub's eyes**: they blink, split around *Your island*, and close into the black island |
| 2.4 – 4.8 | Gradient tiles with status labels | Tiles flip while Island's live states decode around them: *Watching sessions*, *aurora-web needs you*, *pixel-api running npm test*, *5-hour limit 47%*, *Now playing*, *Battery 62%*, *Focus 24:06*. The full-panel pause is Bloub's face |
| 4.8 – 7.9 | Wordmark over a bulging tile grid | A small island with eyes, then **Island** for Windows, and *Agents* resolves |
| 7.9 – 10.8 | Prompt card types and sends | **New agent · aurora-web**: *Add a dark mode toggle to the settings page* types and the pointer launches it |
| 10.8 – 12.9 | Dark workspace | The agent's plan nodes, live activity log, the *Your agents* list with each Bloub, a *Working on it* checklist, and the island watching from the top edge |
| 12.9 – 15.6 | Thought + reply | *aurora-web asked*: should the toggle follow the system theme? The reply types: *Go ahead. Match the colours in @theme.ts and ping me on the @island when it's done* |
| 15.6 – 18.0 | Icon column → procedure | The plan builds itself: Read, Ask, Edit, If build fails, If npm test passes → **Bloub** says I'm done, Run island_banner |
| 18.0 – 19.3 | Reject / Approve | **Deny / Allow**: the pointer clicks Allow (Island blue) |
| 19.3 – 21.1 | The call | Bloub leaps out with a check and *I'm done!*, a now-playing tile, notes, and the bubble *aurora-web is done!* with *Opening the diff* typing |
| 21.1 – 23.1 | Collage | Agent Bloubs, the media island, a battery tab and a permission card drift, then the stage darkens |
| 23.1 – 26.0 | Scanning loader | *Watching your sessions…* with the orbiting dots |
| 26.0 – 28.4 | Verification diff | **Island settings**: Tabs (notes pinned), Limits (heads-up 90% → 80%, weekly → 95%), auto-retract on, telemetry none, `~/.claude` read only |
| 28.4 – 30.1 | Proposals table | **Sessions**: aurora-web *Done*, pixel-api *Needs you*, notes-cli *Working* |
| 30.1 – 32.8 | Test mosaic | *npm test passed*, *Plan 5 of 5*, the agent's last message, *Open the diff*, *Now playing* |
| 32.8 – 36.6 | Sphere | The magenta sphere opens its eyes: it's Bloub. It rises, **Island for Windows** lands, and *A living Dynamic Island for Windows.* types out |

## Files

Same engine and layout as `../elevenagents/`, plus:

```
js/island.js        Bloub, agent colours, the island shape
js/island-late.js   Island stand-ins for the study's photos, call tile and snippets, and the ending
tools/mix.py        typing-only soundtrack from js/cues.js
```

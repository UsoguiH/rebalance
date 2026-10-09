# Island: launch film

This is a 16-second launch video for [**Island**](https://github.com/UsoguiH/dynamic-island-windows), the living Dynamic Island for Windows that watches your Claude Code agents. It reuses the **Base 44** recreation (`../base44/`) beat for beat: every cut, camera move and easing curve is the same, and the content is swapped for Island's product and brand. It's drawn entirely in code on a canvas, with no images or video files.

## Run

Open `motion/island/index.html`. Space plays and pauses, ← → step one frame, and the scrub bar seeks.

To export a video:

```sh
node motion/tools/capture.js --page island --out frames --fps 30 --to 16.07
ffmpeg -framerate 30 -i frames/%04d.png -pix_fmt yuv420p island-launch.mp4
```

## Shot list

| Time (s) | Base 44 beat | Island version |
|---|---|---|
| 0.0 – 2.0 | Prompt card unfolds through an orange → magenta → cyan sweep | The **new-agent composer** unfolds through periwinkle → violet → pink → mint and settles into the island's black |
| 2.0 – 4.2 | Types *"Build a creator storefront…"*, clicks Send | Types the showcase task *"Add a dark mode toggle to the settings page and remember the choice."* and clicks the violet send button |
| 4.1 – 6.0 | File tree builds itself | The agent's working tree, Island's own source: `Island.Lab/` → `Mascot/` (`BloubEngine.cs`, `BloubFace.cs`, `BloubGaze.cs`), `Island/` (`AgentTeam.cs`, `ClaudeSessions.cs`), `Render/` (`FrameRenderer.cs`, `Gpu.cs`) |
| 5.9 – 8.3 | Revenue, course and chart cards; revenue counts to $14,250 | **5-hour limit** counts up to 47% (with weekly 63% and reset time), the **aurora-web** agent card with a working blue Bloub, and a **Tokens this week** chart. The cards go from glass to violet to black |
| 8.3 – 10.0 | CreatorHub window over marble, sky and sunset backdrops | The **Claude Code · 1 needs you** window over pastel wallpapers in Island's palette |
| 10.0 – 11.2 | Dive onto **Publish**, click, ripples, iris | Dive onto the permission prompt's **Allow** (with Deny), click, ripples, iris |
| 11.2 – 13.6 | *fast. secure. live.* | ***native. local. alive.*** (C# + Direct3D, no telemetry, a living island), with Bloub as the bullet cycling through the agent colours and blinking |
| 13.6 – 16.1 | Blob becomes the sun mark and **BASE 44** types out | The blob becomes **Bloub** (the app icon), who glances over and blinks as **Island** types out |

## Brand references

The palette, the Bloub design (pale sphere, grey rim, two black pill eyes), the agent colours, the "1 needs you" orange, the Allow blue (`#0A84FF`) and the violet `#5E5CE6` all come from the repo's README banner, GIF captures and app icon (`src/Island.Lab/Assets/bloub.ico`). The text on screen uses the README's own showcase data: aurora-web, "Dark mode for the settings page", 4 of 5, opus, 82k context.

## Files

Same layout as `../base44/`. The scene files keep their Base 44 names so the two pieces can be compared side by side:

```
js/core.js          engine helpers + Island wallpaper (studioBG) + Bloub
js/band-data.js     composer card geometry + Island colour band
js/scene-prompt.js  new-agent composer
js/scene-tree.js    Island.Lab source tree
js/cards.js         plan limit / agent / usage cards
js/scene-dash.js    card choreography, Claude Code window, Allow, iris
js/scene-end.js     native. local. alive., Bloub mark, Island wordmark
js/main.js          timeline and player
```

Island is an independent project and isn't affiliated with Apple or Anthropic. "Claude" and "Claude Code" are used only to say what it works with, as in the repo's README.

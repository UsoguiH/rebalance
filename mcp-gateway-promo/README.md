# MCP Gateway — promo film

A 25.6-second motion-design promo for [Secure MCP Gateway](https://github.com/UsoguiH/MCP-Gateway),
built as a shot-for-shot study of a "Final vs. Viewport" 3D/2D product reel: same beats, same
camera moves, same pastel look — with the gateway's own story, copy and mark.

Everything is generated in code. The 3D scenes are modelled from primitives in three.js, the 2D
scenes and all textures are painted on `<canvas>`, and the soundtrack is synthesised with the Web
Audio API. There are no image, model or audio assets.

## Watch

| File | What |
|---|---|
| `out/mcp-gateway-promo.mp4` | The film, 1920×1080, 30 fps, with sound |
| `out/mcp-gateway-promo-viewport.mp4` | The same film in clay "viewport" shading with layer handles |
| `out/mcp-gateway-final-vs-viewport.mp4` | 1080×1920 reel: final on top, viewport underneath |

Or play it live in a browser (it needs a local server because it uses ES modules):

```sh
node tools/serve.mjs 8080     # then open http://127.0.0.1:8080/
```

The player has play/pause, a scrubber, a Final/Viewport switch and a sound toggle.
`?t=7.3` opens on a paused frame, `?mode=viewport` starts in viewport shading.

## Storyboard

| Time | Beat |
|---|---|
| 0.00 | A desk from above. A phone buzzes and unchecked AI tool calls burst out of it as cards |
| 3.35 | Whip to the room; the pointer flies to the laptop |
| 5.35 | Letterboxed macro: the 3D **Connect** pill is pressed |
| 7.65 | "IT'S LIVE!!!!" — everything on the desk is blown into the air |
| 9.05 | Three hand-drawn impact frames |
| 9.50 | A marker inks the policy line across the page |
| 11.67 | Top-down: the mark is drawn in glossy red, then peels off as a ribbon |
| 13.50 | The ribbon tears through sticky-note questions, knots, and inflates into **many** |
| 15.83 | Blue sky: an umbrella over **Secured** · zero-trust · on-prem |
| 17.45 | Panel: "One gateway Guards Every Tool Call" + what it enforces |
| 18.67 | **everything** — the folder opens: `policy.yaml`, `audit.log`, `config.yaml` |
| 20.55 | Console UI: "Go beyond API keys." Connectors and control tags pop in |
| 21.67 | start!!!! / Securing / **Real** / tool calls |
| 23.33 | The shield mark is drawn in one stroke over the name and repo |

## Render

Requires Node 18+, `ffmpeg`, and Playwright with Chromium
(`npm i -D playwright && npx playwright install chromium` if you don't have it).

```sh
node tools/render.mjs --mode all          # final + viewport + versus, into out/
node tools/render.mjs --mode final --from 5 --to 8   # just a range
node tools/render.mjs --mode audio        # only out/soundtrack.wav
```

Frames are rendered deterministically (`renderAt(t)` is a pure function of time), so a re-render
reproduces the same picture. Fast moves get real motion blur by averaging sub-frames. Rendering
is software WebGL in headless Chromium, roughly 1–2 s per frame at 1080p.

## Layout

```
index.html            player page
src/main.js           timeline + compositor (motion blur, glow, halftone, grain, letterbox)
src/kit3d.js          three.js renderer, materials, builders, viewport override
src/props.js          modelled props: phone, laptop, marker, umbrella, folder, ribbon ...
src/textures.js       canvas-painted textures and all on-screen copy (COPY)
src/draw2d.js         2D helpers, the logo stroke, viewport layer handles
src/scenes/*.js       one file per sequence
src/audio.js          procedural soundtrack
src/versus.js         9:16 comparison plate
tools/render.mjs      offline renderer (Playwright frames -> ffmpeg)
vendor/               three.js r170 (MIT) and Outfit / Inter / Caveat fonts (OFL)
```

To change the wording, edit `COPY` in `src/textures.js` and the strings in the scene files.

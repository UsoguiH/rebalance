# MCP Gateway — promo film

A 25.6-second motion-design promo for [Secure MCP Gateway](https://github.com/UsoguiH/MCP-Gateway),
built as a shot-for-shot study of a "Final vs. Viewport" 3D/2D product reel: every cut lands on
the same frame as the reference, the camera set-ups and object moves are blocked against it, and
the look is the same pastel studio — with the gateway's own story, copy and mark.

The devices and stationery are real 3D models (MacBook, iPhone, marker, pen holder, headphones,
chair, mug, scissors, paper clips, umbrella, folder; credits in `assets/CREDITS.md`) lit with a
studio HDRI. Paper, cards, UI, type and the ribbon are generated in code, and the soundtrack is
synthesised with the Web Audio API.

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

Cut times are the reference's, to the frame (30 fps).

| Time | Beat |
|---|---|
| 0.00 | Desk from above: the phone buzzes, the kill-switch button slides in, tool-call cards burst out |
| 1.53 / 2.33 | Two more set-ups of the desk: wider and rotated, then low and oblique for "Who approved that?!" |
| 3.23 | Whip to the room; wide, then (4.07) a dutch angle as the pointer drops past the lens |
| 5.20 | Push in on the laptop; letterbox closes; (5.95) macro on the 3D **Connect** pill |
| 6.87 | The click. Label lights up, sparks |
| 7.53 | "IT'S LIVE!!!!" — props blown into the air; (8.33) wider; whip out |
| 9.07 | Three impact frames |
| 9.37 | Marker macro, five set-ups: the stroke is inked and hooks back on itself |
| 11.37 | Three sketch frames |
| 11.67 | Top-down: the mark is drawn in glossy red, then peels off as a ribbon |
| 13.43 | Ribbon and sticky-note questions; knot; (14.73) inflated **many**; the umbrella rises |
| 15.57 | Two umbrella flash frames |
| 15.77 | Blue sky: **Secured** · zero-trust · on-prem |
| 17.30 | Panel: "One gateway Guards Every Tool Call" + what it enforces |
| 18.65 | **everything** — the folder opens: `policy.yaml`, `audit.log`, `config.yaml`; cards fly out |
| 20.30 | Console UI: "Go beyond API keys." Connectors and control tags pop in |
| 21.60 | start!!!! (five beats) / 22.17 Securing / 22.57 **Real** / 23.17 tool calls |
| 23.27 | The shield mark is drawn in one stroke over the name and repo |

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
is software WebGL in headless Chromium, roughly 2 s per frame at 1080p.

## Layout

```
index.html            player page
src/main.js           timeline + compositor (motion blur, glow, halftone, grain, letterbox)
src/kit3d.js          three.js renderer, materials, builders, viewport override
src/models.js         loads the glTF models + HDRI and normalises them into props
src/props.js          code-built props: paper, cards, pill button, ribbon ...
src/textures.js       canvas-painted textures and all on-screen copy (COPY)
src/draw2d.js         2D helpers, the logo stroke, viewport layer handles
src/scenes/*.js       one file per sequence
src/audio.js          procedural soundtrack
src/versus.js         9:16 comparison plate
tools/render.mjs      offline renderer (Playwright frames -> ffmpeg)
assets/               glTF models and HDRI (see assets/CREDITS.md for authors and licences)
vendor/               three.js r170 (MIT) and Outfit / Inter / Caveat fonts (OFL)
```

To change the wording, edit `COPY` in `src/textures.js` and the strings in the scene files.

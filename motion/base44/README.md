# Base 44: motion study

This is a frame-by-frame recreation of a 16-second product-launch motion piece, drawn entirely in code on a `<canvas>`. A prompt box types out a request, a file tree builds itself, dashboard cards fly together, the camera dives onto **Publish**, and the piece ends on *fast.secure.live.* and the BASE 44 sun mark.

There are no images or video files. The fonts come from Google Fonts: Inter, Inter Tight, Figtree, Instrument Serif and DM Mono.

## Run

Open `motion/base44/index.html`, or serve the repo root and visit `/motion/base44/`. Space plays and pauses, **Sound** turns the soundtrack on (browsers need a click before playing audio), ← → step one frame, the scrub bar seeks, and `?t=8.9` opens the page paused at that time.

To export a video:

```sh
node motion/tools/capture.js --page base44 --out frames --fps 30 --to 16.07
ffmpeg -framerate 30 -i frames/%04d.png -i motion/base44/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a copy -shortest base44.mp4
```

## How it was matched

The reference was the bottom-left tile of a 2×2 grid in a phone screen recording. That tile (578×325) was cropped out and sampled at 30 fps, which gave 482 frames before the feed scrolls away. Scenes are written in that 578×325 coordinate space, so measurements go straight into code, and they render at 2× (1156×650). Each scene was compared side by side with the reference on matching frame numbers and adjusted.

| Time (s) | Scene | Notes |
|---|---|---|
| 0.00 – 2.00 | Prompt box | A pill unfolds into a card while a colour band sweeps through it from orange to magenta, cyan and then white. The card's size and six colour stops come from the reference, one key per frame (`js/band-data.js`) |
| 2.00 – 4.20 | Typing | The prompt types with a leading caret. The camera punches in about 1.6×, the pointer clicks Send, the button heats to orange, and the card lifts away |
| 4.13 – 6.00 | File tree | Letters drop into place, folders flash mint then turn manila, each folder's first file flashes cyan then pink then grey, connector lines run ahead of the content, and the view scrolls with it |
| 5.87 – 8.33 | Cards | Glass cards with yellow rims turn orange and then dark. Revenue counts from $1,072 to $14,250 using the reference's own sequence of values, the chart line draws, code glyphs drift past, and the cards orbit and stack behind the course card |
| 8.33 – 10.00 | CreatorHub | The cards fan into a row over marble, sky and sunset-cloud backdrops (procedural fBm noise). The window frames in and the Publish button cycles orange, magenta, cyan and pink |
| 10.00 – 11.20 | Publish | The camera dives onto the button, the label resolves, the pointer clicks, rings ripple out, and an iris closes down into a dot |
| 11.23 – 13.60 | fast.secure.live. | A gradient bullet with words that land spread out and soft, then snap together, plus a text-box frame. The separators drop out, the letters bunch up, and a blob crosses them |
| 13.60 – 16.07 | BASE 44 | A grey flash, then the blob becomes the striped sun mark and BASE 44 fades in letter by letter as the mark slides left |

## Files

```
motion/base44/
  index.html            player page
  js/core.js            math, easing, keyframes, layers, noise textures, pointer
  js/band-data.js       per-frame samples of the opening colour band
  js/scene-prompt.js    prompt box, typing, click
  js/scene-tree.js      file tree
  js/cards.js           revenue / course / chart card artwork
  js/scene-dash.js      card choreography, CreatorHub window, Publish, iris
  js/scene-end.js       wordmark, blob, sun mark, BASE 44
  js/main.js            timeline and player
```

## Known differences

- The course thumbnail in the reference is a 3D render. Here it is a flat vector stand-in: white plinth, tilted panels and an orange play triangle.
- The cards in the reference have a slight 3D perspective tilt. Here they use 2D rotation only.
- The marble, sky and sunset backdrops are procedural noise tuned to the reference's colours, not the original footage.
- Sound: `audio/soundtrack.m4a` (plus an Opus `.webm` copy) is the reference post's own soundtrack, cut to this clip's 0–16.07 s and kept within a frame of the picture. It is not a recreation.

# Perplexity Finance: motion study

This is a frame-by-frame recreation of a 16-second Perplexity finance ad, drawn entirely in code on a `<canvas>`. A glowing 3D Perplexity mark rises into a prompt box, the request fires off in a cyan light burst, the box becomes **Connect Accounts**, finance cards fly past *SECURED BY PLAID*, a laptop bubble floats over a flower field, a Spending Overview heatmap fills in under *Your finances. Finally understood.*, and the piece ends on a glass Perplexity mark and the wordmark.

There are no images or video files. The fonts come from Google Fonts: Inter, Figtree and Instrument Serif. The piece is silent.

## Run

Open `motion/perplexity/index.html`, or serve the repo root and visit `/motion/perplexity/`. Space plays and pauses, ← → step one frame, the scrub bar seeks, and `?t=10` opens the page paused at that time.

To export a video:

```sh
node motion/tools/capture.js --page perplexity --out frames --fps 30 --to 16.37
ffmpeg -framerate 30 -i frames/%04d.png -c:v libx264 -pix_fmt yuv420p perplexity.mp4
```

## How it was matched

The reference was the top-left tile of the same 2×2 phone recording the Base 44 study came from. That tile (578×325) was cropped out and sampled at 30 fps, giving 492 frames. Scenes are written in that coordinate space and render at 2× (1156×650). Each scene was compared side by side with the reference on matching frame numbers and adjusted.

| Time (s) | Scene | Notes |
|---|---|---|
| 0.00 – 1.50 | 3D mark | The Perplexity mark rises from below with glowing white edges and turns slowly while the camera pushes in. The flat mark is split into panels (upper triangles, wings and pages), and each panel is folded about the spine at its own angle (`js/logo3d.js`) |
| 1.33 – 3.20 | Prompt | A pill opens and grows. *Build me a spending heatmap for this month* types centred in the space left of the button, the send arrow swings round, and the pointer clicks |
| 3.20 – 3.92 | Burst | The pill flips and spins while three cyan beams rotate out from behind it. It then collapses into a mottled cyan ball that squeezes into a capsule |
| 3.92 – 5.32 | Connect Accounts | The capsule stretches into a cyan gel button that types its label. A glitch pass turns it dark, then it flashes mint |
| 5.32 – 7.10 | Cards | Spending, net worth, donut and bar cards slide past scanlines while the serif *SECURED BY PLAID* scrolls behind |
| 7.10 – 9.52 | Field | A glass bubble with a laptop face floats up from a flower meadow, out of focus. The words *perplexity* and *computer* drift through and the camera dives into the bubble |
| 9.52 – 12.38 | Overview | The Spending Overview card sharpens out of blur. The figures roll in, a 27×7 heatmap fills column by column with a soft bloom, shrubs grow behind, the headline types and deletes, and the card tilts away |
| 12.38 – 16.37 | End card | A smoked-glass mark spins in from edge-on and settles near frontal, slides left, and *perplexity* types in with teal-tinted fresh letters and a bloom |

## Files

```
motion/perplexity/
  index.html        player page
  js/core.js        math, easing, keyframes, layers, grain (shared with base44)
  js/logo3d.js      3D Perplexity mark: panels, perspective, neon and glass looks
  js/scenes-a.js    mark, prompt, burst, Connect Accounts
  js/scenes-b.js    cards, field and bubble, Spending Overview, end card
  js/main.js        timeline and player
```

## Known differences

- The reference's mark and glass are true 3D renders with refraction. Here the mark is flat panels in perspective with gradient fills, so it has no thickness or refraction.
- The flower meadow, shrubs and bubble reflections are procedural stand-ins for filmed footage.
- The heatmap values are procedural, so individual cells don't match the reference.
- The reference has music. This study is silent.

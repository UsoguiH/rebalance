# Traveme onboarding

A browser rebuild of a three-slide travel-app onboarding animation, studied frame by frame
from a screen recording (60 fps).

- **Slide 1 · Welcome to Traveme!** — a holographic suitcase floats while "TRAVEL LIKE NEVER
  BEFORE" screws down a helix around it, with motion blur.
- **Slide 2 · Pack The Possibility** — the helix screws off, the lid swings open on its left
  hinge and the packed items settle; the title blurs in line by line.
- **Slide 3 · Let's get ready!** — the arrow chip morphs into a pink "Get started" pill, a
  baggage carousel with a scanner and other bags slides in, the case closes onto the belt and
  "LET'S GET READY!" winds in around it.

Everything is drawn in code: the 3D scene is Three.js (loaded from jsDelivr), and the iOS
chrome, copy, pagination and CTA are HTML/CSS layered on top. No build step.

## Run

```sh
npx http-server -p 8080   # from the repo root, then open http://localhost:8080/traveme/
```

It autoplays with the same timing as the recording and loops. Tap the arrow to advance,
**Skip** to jump to the last slide, and **Get started** to replay.

URL options:

- `?auto=0` — no autoplay; advance with the arrow.
- `?t=<seconds>&auto=0` — render a single deterministic frame of the autoplay timeline
  (used to compare against the reference frames).

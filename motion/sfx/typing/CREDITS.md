# Typing sound

`typing-1.wav` – `typing-4.wav` are the typing passages from the launch video the project owner supplied as the reference sound (recorded 2026-10-10). They are cut sample-exact from its audio track with nothing changed: no filtering, no level change, only a 3 ms fade at each edge so the cut doesn't pop.

| File | Typed line in the reference | Source (s) | Clicks |
|---|---|---|---|
| typing-1.wav | when was the last time | 4.063 – 4.680 | 7 |
| typing-2.wav | someone walked into your home | 5.011 – 6.080 | 12 |
| typing-3.wav | where did you | 9.576 – 9.970 | 6 |
| typing-4.wav | it's been too long. | 16.984 – 17.780 | 9 |

`passages.json` lists each click's time inside its passage. Use these for every typed line in these motion pieces: `typing-sfx.js` plays them in a browser, and `motion/teaser/build.py` mixes them offline.

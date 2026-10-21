# Hand assets / أصول الأيدي

Five open-licensed hand sets picked for إشارتي, ranked by how useful they are for a sign-language app.
Open `preview.html` through a local server (`python3 -m http.server`) to see every file.
Run `python3 download.py` to fetch everything again from the original sources.

| # | Set | What it gives us | Files | License |
|---|-----|------------------|-------|---------|
| 1 | [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) | Soft 3D hands with the same playful look as the app, in 6 skin tones, plus flat SVGs | 38 gestures × 6 tones (PNG 256px) + 38 SVG | MIT |
| 2 | [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) | Moving gestures (wave, clap, thumbs up…) as Lottie animations, for "new sign" and reward moments | 38 Lottie JSON | CC BY 4.0 |
| 3 | [Sutton SignWriting, ISWA 2010](https://www.sutton-signwriting.io/) | Real sign-language handshapes used to write any sign language, including Arabic signs | 254 handshape SVGs | MIT |
| 4 | [OpenMoji](https://openmoji.org/) | Color and black-outline hands; the outlines suit a kids' coloring/tracing mode | 38 color + 38 outline SVG | CC BY-SA 4.0 |
| 5 | [MediaPipe hand models](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) | On-device models that find 21 points on the hand and recognize basic gestures, for checking the learner's sign with the camera | `hand_landmarker.task`, `gesture_recognizer.task` | Apache 2.0 |

## What each license asks of us

- **MIT / Apache 2.0** (sets 1, 3, 5): keep the `LICENSE` file that sits next to the files.
- **CC BY 4.0** (set 2): credit "Noto Emoji Animation by Google, CC BY 4.0" on an about/credits screen.
- **CC BY-SA 4.0** (set 4): credit OpenMoji, and any edited versions of these images must be shared under CC BY-SA 4.0 too. Use them as they are, or pick another set for artwork we want to keep private.

## Limits

- Emoji hands show general gestures, not the official signs of Saudi Sign Language. The lesson videos for each sign still need to be recorded with a certified interpreter.
- SignWriting handshapes are named by their ISWA key (for example `S14c00`). Fill 0 and rotation 0 means right hand, palm facing the viewer.
- Fluent Emoji has the handshake in one tone only.

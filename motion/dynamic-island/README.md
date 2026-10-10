# Dynamic Island: launch film

This is a 25-second launch film for [Island](https://github.com/UsoguiH/dynamic-island-windows), the living Dynamic Island for Windows. It mixes the two bottom tiles of the 2×2 reference grid, beat for beat: the **bottom-right** (Suno) piece's glass prompt, ringed sphere, glossy waveform bars, track cards, stacked tiles and neon-ring finale, and the **bottom-left** (Base 44) piece's card slam, dive onto a button, kinetic words and typed-out mark. It's drawn entirely in code on a canvas, with no footage.

The only sound is typing: every typed line plays one of the reference video's own typing passages (`../sfx/typing/`, untouched), with its letters landing on that passage's key clicks. There is no music.

## Run

Open `motion/dynamic-island/index.html`. The page opens on **Play with sound**, Space plays and pauses, **Sound** toggles the audio, ← → step one frame, and the scrub bar seeks. The page loads the Base 44 beats from `../island/js/`, so keep the folders together.

To export a video:

```sh
node motion/tools/capture.js --page dynamic-island --out frames --fps 30 --to 25
ffmpeg -framerate 30 -i frames/%04d.png -i motion/dynamic-island/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest dynamic-island.mp4
```

`tools/mix.py --out soundtrack.wav` rebuilds the soundtrack from `js/cues.js`. Pass `--music FILE --start S` to lay a track under the typing.

## Shot list

`BR` is a bottom-right reference frame (30 fps, film time = (BR − 30) / 30), and `BL` is the Base 44 beat as rebuilt in `../island/`.

| Time (s) | From | What happens | Typing |
|---|---|---|---|
| 0.00 – 3.87 | BR30–146 | A dark glass bar opens over the churning gradient into the prompt card. The headline blurs in letter by letter, the task types, the camera eases in 1.17×, the white pointer clicks **+ Launch**, and the card snaps shut into the black island | *Bring your agents to life* · *Add a dark mode toggle to the settings page* |
| 3.87 – 5.20 | BR146–186 | The island drops a spark that swells into a glossy ringed sphere as the stage goes dark with light streaks. It opens its eyes and blinks: it's Bloub | |
| 5.20 – 9.00 | BR186–300 | Bloub slices into discs, then glossy waveform bars that pulse, thin out and squeeze into a single bar | |
| 9.00 – 11.55 | BR300–386 | The bar becomes a violet slab, then glass with a dotted line, then splits into three agent "tracks" (aurora-web, pixel-api, notes-cli) whose names type in over their live activity waveforms | the three agent names |
| 11.55 – 12.40 | BR386–450 | The tracks shrink into avatar tiles, stack, and merge into one | |
| 12.40 – 14.87 | BL 5.9–8.3 s | Card slam: the 5-hour limit, agent and tokens cards fly together and orbit | |
| 14.87 – 17.75 | BL 8.3–11.2 s | The *Claude Code · 1 needs you* window. The camera dives onto **Allow**, the pointer clicks, ripples spread, and an iris closes | |
| 17.75 – 20.13 | BL 11.2–13.6 s | *native. local. alive.* with the Bloub bullet | |
| 20.13 – 22.43 | BL 13.6–15.9 s | Bloub becomes the mark and **Island** types out beside him | *Island* |
| 22.43 – 25.00 | BR450–490 | On dark, **Island** assembles from glowing fragments and a neon waveform ring in Island's violet, pink and mint bursts outward | |

## Files

```
index.html        player page (also loads ../island/js/ for the Base 44 beats)
js/core.js        engine helpers, Island wallpaper, Bloub
js/cues.js        typed lines, their typing passages and letter timing
js/ui.js          island shape, springs, pointer, ripples and other shared pieces
js/suno.js        the bottom-right beats
js/bl.js          the bottom-left beats, mapped from ../island/ onto this timeline
js/main.js        timeline and player (keeps the soundtrack within a frame)
tools/mix.py      builds the typing-only soundtrack
audio/            soundtrack.m4a / .webm (typing only)
```

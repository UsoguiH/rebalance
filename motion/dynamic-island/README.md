# Dynamic Island: launch film

This is a 24-second launch film for [Island](https://github.com/UsoguiH/dynamic-island-windows), the living Dynamic Island for Windows. It's an original piece in the art style of the 2×2 reference grid that the Base 44 and Perplexity studies came from: soft studio gradients, black glass UI, spring motion, kinetic waveform bars, a ring of orbiting tiles, typed captions and a bold wordmark. There is no real-life footage; everything is drawn in code on a canvas.

Music plays the whole way through. Every caption types over one of the reference video's own typing passages (`../sfx/typing/`, untouched), with its letters landing on that passage's key clicks.

## Run

Open `motion/dynamic-island/index.html`. The page opens on **Play with sound**, Space plays and pauses, **Sound** toggles the audio, ← → step one frame, and the scrub bar seeks.

To export a video:

```sh
node motion/tools/capture.js --page dynamic-island --out frames --fps 30 --to 24
ffmpeg -framerate 30 -i frames/%04d.png -i motion/dynamic-island/audio/soundtrack.m4a \
       -c:v libx264 -pix_fmt yuv420p -c:a copy -shortest dynamic-island.mp4
```

To put different music under it, rebuild the soundtrack. `--start` is where in the track the film begins, and the typing is placed from `js/cues.js` automatically:

```sh
python3 motion/dynamic-island/tools/mix.py your-music.mp3 --start 12.5 --out soundtrack.wav
```

## Shot list

Every cut sits on a bar line of the music (one bar is 2.43 s), and the end card lands on the track's big hit at 19.0 s.

| Time (s) | Ability | What happens | Typed caption |
|---|---|---|---|
| 0.00 – 1.71 | The island | The black pill drops in with spring physics, showing Bloub's face and four agent dots | Your agents are working. |
| 1.71 – 4.14 | Agent team | The pill springs open into the team: aurora-web, pixel-api, notes-cli and orbit-landing as coloured Bloubs, until aurora-web gets the orange needs-you badge | |
| 4.14 – 6.57 | Allow / Deny | The panel becomes the glowing permission alert (*aurora-web wants to run `npm run build`*). The pointer clicks **Allow**, ripples spread, and it shrinks to *Allowed · building…* | One needs you. |
| 6.57 – 9.00 | Done celebration | Bloub leaps out of the island, lands with confetti, a check and *I'm done!*, then flies home and the island shows the *aurora-web is done* banner | One just finished. |
| 9.00 – 11.43 | Now Playing | The expanded media island (*Midnight City*, M83) over kinetic waveform bars pulsing on the beat | Your music, right there. |
| 11.43 – 13.86 | Plan limits | The usage panel: the 5-hour ring counts to 82% and the weekly ring to 63%, with today's tokens, files and commands. The 80% heads-up banner pops on top | Your real limits. |
| 13.86 – 16.29 | 17 tabs | Bloub in his orb with two moons, while Servers, Battery, Calendar, Network, Tasks, Notes, Focus and Downloads tiles orbit. A tap pins Battery and Bloub winks | 17 tabs. Your way. |
| 16.29 – 18.72 | Auto-retract | A browser slides up under the island, which folds into a thin line over its tabs and pops back on hover. Then the island swells to fill the frame | Never in your way. |
| 18.72 – 24.00 | End card | On the hit, Bloub pops in and **Island** wipes in beside him | A living Dynamic Island for Windows. |

## Files

```
index.html        player page
js/core.js        engine helpers, Island wallpaper, Bloub (shared with ../island/)
js/cues.js        captions, their typing passages and letter timing
js/ui.js          the island shape, springs, captions, pointer, ripples, confetti, rings
js/scenes.js      the nine scenes
js/main.js        timeline and player (keeps the soundtrack within a frame)
tools/mix.py      builds the soundtrack: music + typing passages, -14 LUFS
audio/            soundtrack.m4a / .webm and CREDITS.md
```

The UI copy, colours and states (agent names, *npm run build*, *Midnight City*, the 5-hour and weekly rings, the 17-tab library, auto-retract) come from the Island README and its GIF captures.

# Motion pieces

Canvas motion pieces drawn entirely in code: type, UI, cursor, transitions and
backdrops. Brand logos come from Simple Icons. There is no build step. Both pieces are set
in a light cut of Inter (`M.weight` maps every weight one step lighter).

| Piece | Page | Render |
|---|---|---|
| **One Button**: a frame-by-frame recreation of a 26-second promo | `index.html` | `renders/one-button.mp4`, plus `renders/side-by-side.mp4` (original on top) |
| **Jira**: a 26.6-second promo in the same visual language, with an ElevenLabs voiceover | `jira/index.html` | `renders/jira.mp4` |

## Play

Serve the folder and open a page:

```sh
npx http-server motion -p 8080   # then visit http://localhost:8080 or /jira/
```

| Key | Action |
|---|---|
| Space | Play / pause |
| ← → | Step one frame |
| Shift + ← → | Step one second |
| Home | Restart |

Add `?t=12.5` to the URL to open at a given second, `&paused` to hold there, or
`&loop` to loop. If a piece has a voiceover track, it plays in sync. Browsers only
allow sound after a click, so press Play.

## Render to video

```sh
node motion/tools/render.js --audio motion/audio/soundtrack.mp3 --mp4 out.mp4   # One Button
node motion/tools/render.js --page jira/index.html --audio motion/jira/audio/soundtrack.mp3 --mp4 jira.mp4
node motion/tools/render.js --out frames --from 8 --to 10                  # a range, as PNGs
node motion/tools/render.js --out frames --times 1.9,3.2                   # single frames
```

The tool needs Playwright (Chromium) and, for `--mp4`, ffmpeg.

## Real brand icons

`js/icons.js` is generated from [Simple Icons](https://simpleicons.org) (CC0) at a
pinned version. To add a mark, put its slug in `tools/icons.js` and run:

```sh
node motion/tools/icons.js
```

Pieces draw a mark with `M.icon(ctx, slug, x, y, size, color?)`. The marks are
trademarks of their owners. Some brands asked Simple Icons to remove their logos
(Slack, OpenAI, Microsoft and others), so those are still drawn by hand.

## Soundtrack (voiceover and music)

Both pieces play the original video's own music bed, with the voice removed
(`audio/music/original-bed.mp3`, supplied by the project owner). It lines up with the
original recording, whose clip starts 0.288 s in, so both pieces play it from there.
Its hits, quiet pockets and fade into the logo already sit on the original's cuts,
and the Jira cut is built on those same scene boundaries.

The Jira script lives in `jira/voice/script.json`. It mirrors the original's narration
beat for beat: the same silences (none over the montage), the same pauses, and
the same rise and fall. It is tagged for Eleven v3 (`[curious]`, `[softly]`, …).
The voice was recorded as one ElevenLabs take (`jira/audio/take.mp3`).

`tools/mix.js` builds each soundtrack from the piece's `audio/mix.json`:

- **Voice** (Jira only): each phrase is cut from the take at its pauses and placed
  on its beat (`segments`: where it sits in the take, and when it starts in the piece).
- **Music:** timed to an anchor (`track` seconds plays at `at`), faded, gently
  ducked under the voice, with an optional low-passed `dip`.
- **Master:** stems are measured (EBU R128) and gained to their targets, then
  mastered to -14 LUFS with a -1 dBTP limiter.

```sh
node motion/tools/mix.js --piece motion          # One Button: music only -> audio/soundtrack.mp3
node motion/tools/mix.js --piece motion/jira     # Jira: voice + music   -> jira/audio/soundtrack.mp3
```

To re-voice the script through the API instead, run
`ELEVENLABS_API_KEY=... node motion/tools/voice.js --piece motion/jira`. It voices
each line, caches it, and mixes the lines to their cue times as `jira/audio/vo.mp3`.

## How One Button was matched

The source was a phone screen recording (1156x2510, variable frame rate around
62 fps) with the 16:9 clip in the middle. It holds 808 unique frames, about 30 fps
of real content. Each one was cropped out and studied:

- **Timing:** scene cuts, letter entrances and keystrokes were read from
  frame-to-frame differences and the recording's own timestamps.
- **Motion paths:** the cursor fingertip, the "Life saver" button box, the letterbox
  bars, the caret, the heart bubble and the word positions were tracked numerically
  per frame. They are stored as keyframe tracks (`M.key`, `M.track`).
- **Easing:** words settle with an exponential ease. The "But" letters use a
  spring rise with one overshoot. The zoom onto "Button" is a fast in-quad whip
  with a soft landing.
- **Color and layout:** sampled from the frames (backgrounds, button fills, text
  inks) and measured in 1920x1080 space.

The original is set in SF Pro. Inter stands in for it, condensed by 7% (`M.COND`)
so word widths match. Photographic plates (the meadow, the Sistine hands, the
collage photos) are painted procedurally as stand-ins.

## Code map

| File | What it does |
|---|---|
| `js/kit.js` | Shared: easing, keyframe tracks, layers, motion blur, text, brand icons, the hand cursor, letterbox |
| `js/icons.js` | Generated Simple Icons paths and brand colours |
| `js/player.js` | Shared player: transport, scrubbing, frame stepping, voiceover sync |
| `js/art.js` | One Button: procedural plates, reaching hands, collage photos, brand glyphs |
| `js/scenes-a.js` | One Button: meadow intro, the "Button" whip-zoom and click, the button montage |
| `js/scenes-b.js` | One Button: "But…", the typed caret line, "Life saver" and its restyles, "No more endless…" |
| `js/scenes-c.js` | One Button: "unnecessary costs" arch, "Pay once", Video/Voice, Image/Motion/Creation, end card |
| `js/main.js` | One Button: master timeline, letterbox curve, weight map, soundtrack |
| `audio/mix.json` | One Button soundtrack: music timing and levels |
| `jira/js/art.js` | Jira: sky plate, app tiles, the Jira tile, the board UI kit, clutter props |
| `jira/js/scenes-a.js` | Jira: "Your team's work is everywhere", the clutter montage, "But…" into "what if one board" |
| `jira/js/scenes-b.js` | Jira: "Meet Jira" and the live board, "No more chasing updates", the "No more pointless meetings" arch |
| `jira/js/scenes-c.js` | Jira: "Plan once, And ship (:", Boards to Timeline, Automation to "Reports" and "Pure focus.", end card |
| `jira/js/main.js` | Jira: master timeline, letterbox curve, soundtrack |
| `jira/voice/script.json` | Jira voiceover script, with Eleven v3 tags and cue times |
| `jira/audio/mix.json` | Jira soundtrack: where each voice phrase lands, music timing, levels |
| `tools/render.js` | Headless frame renderer and MP4 export (with optional soundtrack) |
| `tools/icons.js` | Regenerates `js/icons.js` from Simple Icons |
| `tools/voice.js` | Voices a script with ElevenLabs and mixes it to the timeline |
| `tools/mix.js` | Builds the soundtrack: cuts and places the voice, back-times and ducks the music, masters |

# "The Line": a discipline video

A hand-drawn motion graphics video about discipline. The whole film takes place on one
continuous notebook page, and a pen writes and sketches everything in time with the
narration.

**Core metaphor:** each day you write one line of your story. Discipline means writing
that line even on the days it comes out shaky. Tally marks (one line a day) build up
through the video, and in the climax they turn into a staircase.

---

## 1. Specs

| | |
|---|---|
| Length | about 2:45 to 3:00 (full); about 50s (Shorts cut) |
| Format | 1920×1080, 30 fps (main). 1080×1920 vertical for the Shorts cut |
| Build | Code-driven (Remotion / React → MP4), so every stroke is synced to the voice |
| Voice | ElevenLabs, one file per scene (see §5) |

## 2. Art direction: "ink on paper"

- **Paper:** warm off-white `#F4EFE6` with a fine paper-fibre texture, soft vignette and light grain.
- **Ink:** near-black `#1B1B1B` for writing and doodles. Graphite grey `#6B6B6B` for shading and crossed-out words.
- **One accent colour:** red-orange `#E4572E`, used only on the most important words ("you", "write it anyway", "proof", "today's line"). If it shows up rarely, it hits harder.
- **Fonts (Google Fonts, OFL):** *Caveat* for narration words, *Permanent Marker* for punch words, *Gochi Hand* for small labels.
- **Line quality:** every stroke "boils" slightly: the line wobbles a little every 3 frames, like hand-drawn animation.
- **Text reveal:** words are written stroke by stroke (glyph outlines turned into SVG paths, stroke-dash reveal, then the ink fill), with a pen tip following the stroke.
- **Camera:** one huge page. The camera glides, pans and zooms from scene to scene and never cuts. In the finale it pulls all the way out, and the viewer sees that the whole video was one page.
- **Character:** a simple, expressive stick figure ("you") with a round head and no face details, so anyone can see themselves in it.

## 3. Scene-by-scene storyboard

| # | Scene | Approx. | Visuals |
|---|---|---|---|
| 1 | **The Pen** (hook) | 0:00 to 0:14 | Blank page. A pen tip draws one horizontal line. "1 line / day" is written. On "holding the pen", the camera pulls back to show a hand-drawn hand holding the pen. |
| 2 | **The Lie of Motivation** | 0:14 to 0:36 | The stick figure waits at a sketched station sign "MOTIVATION →". A clock doodle spins. On "weather", sun, cloud and rain scribbles appear above the figure; the rain smudges the ink. |
| 3 | **What Discipline Is** | 0:36 to 0:56 | "DISCIPLINE" is written big. "punishment" and "being hard on yourself" are written and then scribbled out in graphite. A mirror doodle with the figure inside. "you." is circled in the accent colour. |
| 4 | **Small & Boring** | 0:56 to 1:20 | A fast rhythm: book → "10 pages", dumbbell → "1 set", clock → "1 hour". A tally mark lands on each beat. "One line. Then another." Tallies keep ticking in the corner for the rest of the film. |
| 5 | **The Shaky Line** | 1:20 to 1:46 | The page gets darker with graphite smudge and rain streaks. A trembling, broken line is drawn. "WRITE IT ANYWAY" in heavy marker (accent). Split frame: a shaky line with a ✓ and a blank page with a ✗. |
| 6 | **Nobody Watching** | 1:46 to 2:14 | An alarm clock reads 5:00. Rows of empty audience seats. One lamp, one figure working. "proof" is stamped in accent. "louder than any excuse" is written while "excuse" shrinks. |
| 7 | **The Staircase** (climax) | 2:14 to 2:40 | The camera pulls back. Every tally mark from the video lifts off the page and swings into place as a staircase. The figure climbs. "You didn't find a new life. You wrote one." Music peaks. |
| 8 | **Pick Up the Pen** (CTA) | 2:40 to 3:00 | Back to a clean page. The hand lifts the pen. "Write today's line." is written slowly. The video ends on a single fresh tally mark, "Day 1". |

## 4. Audio plan

- **Voice:** see the script in `SCRIPT.md`.
- **Music:** slow, sparse piano with low strings. Quiet until scene 5, builds through scene 6, peaks in scene 7, and falls back to a single piano note for scene 8. Duck it about 12 dB under the voice.
- **SFX** (can be generated with ElevenLabs Sound Effects):
  - `pencil scratching on paper, close-up, short stroke` (writing)
  - `felt marker squeak on paper, single bold stroke` (punch words)
  - `paper rustle, page slide` (camera moves)
  - `soft rain on a window, muffled` (scene 5)
  - `old analog alarm clock tick` (scene 6)
  - `pen cap click` (final frame)

## 5. ElevenLabs settings

- **Model:** Eleven Multilingual v2. It gives the most consistent narration and supports `<break time="x.xs" />` pause tags (max 3s each).
- **Voice:** a deep, calm, slightly gravelly male narrator. Search the Voice Library for "deep narrator" or "documentary". It should sound like a mentor, not a hype man.
- **Settings:** Stability 50%, Similarity 75%, Style 20%, Speaker Boost on, Speed 0.92.
- **Generate one file per scene**, named `s01.mp3` … `s08.mp3`. Regenerate any take you don't like (2 to 3 takes per scene is normal) and pick the best one.
- **Export:** MP3 44.1 kHz at 192 kbps, or WAV.

## 6. Build pipeline (after the voice files arrive)

1. Put the audio in `discipline-video/audio/`.
2. Get word-level timestamps for each scene file through forced alignment, so every word is written on screen when it is spoken.
3. Build the Remotion project:
   - `Paper` (texture, grain, vignette)
   - `InkText` (stroke-by-stroke writing from glyph paths, plus the pen tip)
   - `Doodle` (SVG path reveal with the boil effect)
   - `Camera` (one big page, eased pans and zooms)
   - `TallyCounter` (shared state that carries into the staircase)
4. Lay scenes out on the timeline from the audio durations, add music and SFX, and render to MP4.
5. Render the vertical Shorts cut from the same components.

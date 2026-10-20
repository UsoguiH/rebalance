---
name: launch-promo
description: Make a 26.6-second launch promo film for any product, in the exact style, timing, music and sound levels of the One Button and Jira pieces in motion/ (canvas motion graphics, real brand marks, the original film's music bed, an ElevenLabs voiceover). You write the ElevenLabs script, the user generates it and sends the take, and you do everything else (cutting the voice onto the beats, mixing at the original's levels, rendering the MP4). Use this whenever the user asks for a promo, launch video, product ad, teaser or motion piece "like the One Button / Jira one" for a product, app, brand or feature, wants ElevenLabs text for such a video, or sends back an ElevenLabs voice file for one, even if they don't say "skill" or "template".
---

# Launch promo

Every promo is the same 26.6-second film as the One Button original, beat for beat, with
new content: the same scene cuts, camera moves, letterbox, typography and the original
film's own music bed. A promo is only data: a `content.js` (words, colours, brand marks,
product screen) and a `voice/script.json` (the voiceover). The engine lives in
`motion/template/`, and the tools live in `motion/tools/`.

The film's structure, which the content fills:

| Time (s) | Scene | Script slot |
|---|---|---|
| 0-3.3 | the problem line over floating app tiles | `intro` |
| 3.4-7.6 | clutter montage (nine cards, then a repeated phrase) | (music only) |
| 7.6-9.9 | a giant "But...", then "But, what if one <thing>" typed | `but`, `whatIf` |
| 9.9-12.7 | brand tile and name, then the product's screen in action | (`whatIf` runs on) |
| 12.7-15.1 | "No more <pain>." with a check bubble | `noMore1` |
| 15.1-17.0 | "No more <pain>" on a 3D arch | `noMore2` |
| 17.0-18.7 | "<Verb> once, And <verb> (:" | `once1`, `once2` |
| 18.7-23.0 | four features (ring, panel, wall, card), then the payoff | `feature1`, `feature2`, `feature34`, `payoff` |
| 23.0-26.6 | tagline, then the brand lockup on dark | `tag1`, `tag2`, `name` |

## Workflow

### 1. Brief

You need the product's name, what it does, who it is for and the pain it removes. Its
brand colour and logo are usually knowable. If the user only names the product, fill the
rest from what you know and say what you assumed. Ask only for what you can't infer.
Check the logo exists by running `node motion/tools/icons.js <slug>`. It fetches the
mark from Simple Icons, or warns "no Simple Icons mark". Some big brands (Slack, OpenAI,
Microsoft) asked to be removed. Without a mark, the brand tile shows a monogram.

### 2. Scaffold

```sh
node motion/tools/new-piece.js --slug <slug> --name "<Product>"
```

This makes `motion/<slug>/`: `index.html`, `content.js`, an empty `timing.js`,
`voice/script.json`, and `audio/mix.json`, already set to the original film's levels.
`content.js` and `script.json` start as copies of the Jira example. Replace every field,
including `brand.icon`, `brand.color` and `brand.key`, or Jira leaks into the film.

### 3. Write the content and the script

Read `references/content.md`, then rewrite `content.js` for the product: the problem
line, nine clutter cards in the product's world, the product screen (`board`,
`dashboard` or `chat`), the two pains, the "once" line, four features, the payoff and the
tagline.

Read `references/script.md`, then write `voice/script.json`: 14 phrases on the 14 slots,
with Eleven v3 tags. The spoken words and the on-screen words are written together,
because the voice is cut onto the same beats the words appear on.

Then:

```sh
node motion/tools/icons.js                         # fetch any new brand marks the content uses
node motion/tools/script.js --piece motion/<slug>  # the ElevenLabs block, plus a timing check
```

`script.js` estimates each phrase's spoken length against its slot. Rewrite anything it
flags as TOO LONG. "tight" is usually fine.

### 4. Check stills, then preview without a voice

Iterate on stills first; they take seconds:

```sh
motion/tools/qa.sh motion/<slug> [out-dir]   # 32 stills tiled 4 across, in time order
```

It renders every montage card, each beat of the reveal and every scene into one contact
sheet (`motion/frames/<slug>-qa/sheet.jpg` by default; pass a scratch directory if the
session has one). Look at the sheet with the Read tool, fix the content, and run it
again. Look for:
- text running off the frame or into other elements (shorten the copy rather than fight it);
- accents (`*word*`) on the right words;
- every tile showing a real mark (a purple chat bubble on a tile you didn't set to
  `'chat'` means a missing slug);
- copy that reads as this product, not Jira (keys like `JRA-101`, and Jira-only
  integrations on the wall).

When the stills are right, render the whole film once:

```sh
motion/tools/build.sh motion/<slug> --preview
```

This renders `motion/renders/<slug>.mp4` with the music only (about 2 minutes). With no
voice it reads about -28.7 LUFS, the music at its own level in the original. That is
expected; with the voice the film lands near -17.

### 5. Hand over the ElevenLabs text

Give the user the block that `script.js` printed, in one code block, and the settings:
- voice: **Hope** (the voice used so far; another voice works if they prefer);
- model: **Eleven v3**;
- stability: **Natural**.

Ask them to generate it as one take and send the file back. Tell them to keep the tags
and the "..." pauses: the pauses are where the take gets cut into phrases. Also send the
preview MP4, so they can see the film while they record.

### 6. When the take arrives

```sh
motion/tools/build.sh motion/<slug> /path/to/the/take.mp3
```

A take the user attaches arrives as a file path in their message (often under
`~/.claude/uploads/`). Pass that path. `build.sh` copies the take to `audio/take.<ext>`
and does the rest:

1. `align.py` transcribes the take (faster-whisper), finds each phrase, trims it at its
   real pauses, and places it on its beat. It writes the segments to `audio/mix.json`
   and each word's spoken time to `timing.js`. The film's words then land with the
   voice.
2. `mix.js` builds the soundtrack at the original film's levels (see below).
3. `render.js` renders the MP4 with the sound and prints its loudness.

Read the aligner's report:
- **"sped up N%" or "starts early"** means a phrase ran long and was fitted. Up to about
  8% is inaudible.
- **"STILL OVER"** means a phrase is too long for its slot. Shorten that phrase and ask
  the user for a new take, or accept a small overlap if it sounds fine.
- **"heard differently"** is normal for brand names. If ordinary words differ, check
  the take matches the script (ad-libs, a skipped line).
- **"not in the take"** stops the build. The take is missing a phrase, so ask for a new
  one.

Then run `qa.sh` again and check the frames where words should meet the voice: the
intro line (about 0.4-2.6 s), "once" (17.2-18.6 s) and the tagline (23.2-25 s). The
loudness should read about -17 LUFS.

### 7. Deliver

Send `motion/renders/<slug>.mp4` to the user. Commit the piece on the working branch and
push it. Include:
- the piece: `content.js`, `timing.js`, `voice/`, and `audio/` with the take, `mix.json`
  and `soundtrack.mp3`;
- the render;
- `motion/js/icons.js`.

`icons.js` is shared. `tools/icons.js` rebuilds it from the marks every piece uses, so a
commit without it leaves the new marks as generic tiles on another checkout.

## The sound: the original film's levels

The user asked for the music and levels to be exactly the original's. `mix.json` is
scaffolded that way, and `mix.js` follows it:

- **Music:** `audio/music/original-bed.mp3` is the original film's music with the voice
  removed, aligned to the original recording, so it plays from 0.288 s. It plays at
  `gain_db: 0`, which is its level inside the original mix. It gets no ducking, because
  the original's moves under the narration are already in the bed.
- **Voice:** gained to the original narration's loudness (-16.7 LUFS). Each script line
  is then matched to the same line of the original narration
  (`audio/original-levels.json`), which keeps the original's contour, such as the soft
  sign-off.
- **Master:** no loudness normalisation; the mix lands near -16.7 LUFS like the
  original. A -1 dBTP limiter is only a safety.

Don't change these levels or swap the music unless the user asks. They are the point.

## Setup (once per machine)

The tools need ffmpeg, Node with Playwright's Chromium, and Python with faster-whisper:

```sh
python3 -m venv motion/.venv && motion/.venv/bin/pip install faster-whisper numpy
```

`build.sh` finds `motion/.venv` by itself, or set `MOTION_PY` to another interpreter. The
first transcription downloads the Whisper "small" model (about 460 MB). `render.js` finds
the Chromium that Playwright installs; in Claude Code cloud sessions it is already
there.

## When the template isn't enough

Content covers most products. For a product whose screen is none of
board/dashboard/chat, or a scene that needs a custom prop, add a scene override; don't
fork the template. `references/custom-scenes.md` explains the scene clocks, the kit API
and how a piece's `js/custom.js` replaces a scene.

## Files

| Path | What it is |
|---|---|
| `motion/template/js/*.js` | The engine: art kit and palette, scenes, timeline |
| `motion/template/beats.json` | The 14 phrase slots: start time, max length, script line |
| `motion/template/example/` | The Jira content and script, a complete worked example |
| `motion/stripe/` | A second worked example (dashboard screen, purple palette) |
| `motion/tools/new-piece.js` | Scaffolds a piece |
| `motion/tools/script.js` | Prints the ElevenLabs block and checks phrase lengths |
| `motion/tools/icons.js` | Fetches brand marks (Simple Icons) that content uses |
| `motion/tools/align.py` | Cuts a take into phrases and places them on the beats |
| `motion/tools/mix.js` | Builds the soundtrack at the original's levels |
| `motion/tools/render.js` | Renders frames or the MP4 |
| `motion/tools/qa.sh` | Renders QA stills into one contact sheet |
| `motion/tools/build.sh` | align, then mix, then render, in one go |

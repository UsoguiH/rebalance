# qudrati.xyz short: edit report

**Output:** `final.mp4`: 1080×1920, 30 fps, H.264 + AAC 48 kHz, **40.3 s**, **-14.0 LUFS**, peak -1.4 dBFS.
`cover_frame0.png` is frame 0 (cover title). `captions.srt` holds the caption text and timings.

## What it is
Arabic talking-head short. Cover title "كيف تجيب 99 في القدرات الكمي؟" is on frame 0 and
lifts the speaker's own "99 in Qudurat quant" line into a question hook (title written by me, since none was supplied).
Story: what the app is → interactive daily questions → leaderboard → mock exam → beginner path → stats → CTA card («العب مجانًا من المتصفح», qudrati.xyz; "free / no sign-up" is from the repo README).

## Deliverables
- `final.mp4`
- `stems/voice.wav`, `stems/music.wav`, `stems/sfx.wav`: 48 kHz 24-bit stereo, 40.3 s, all at final mix level. They sum to `stems/master.wav` (the pre-AAC mix).
- `hf/proj/`: the HyperFrames composition (`index.html`, generated from `hf/index.tpl.html` + `timeline.json`).
- `plan.py`, `build_base.py`, `audio/synth.py`, `audio/mix.py`: cut list, video/voice build, music and SFX synthesis, mixing.

## Judgement calls (please read)
1. **No separate "clean audio" file was in the project.** Only the two camera videos. I used each video's own audio track, then cleaned it (high-pass, FFT denoise, EQ, compression, loudness).
2. **Two takes, different content, not two versions of one line.** Take A (`033826`, 35.8 s) is the intro / what the app is. Take B (`033502`, 27.4 s) is leaderboard / mock test / adaptive levels. I used both in that order. Cuts are only at pauses (≥0.45 s pauses shortened to ~0.2 s). Dropped: the greeting, a false start/repeated "عبارة عن" in A (16.5–19.9 s), A's tail after "تخليك تذاكر كل يوم" (it repeated B's adaptive-difficulty point), and a stray 0.2 s blip in B. Alternating 1.00×/1.08× punch-ins hide the jump cuts. Grade: mild contrast, less yellow, light vignette.
3. **Product screens are real, but captured locally, not from the live site.** qudrati.xyz stayed blocked by the sandbox egress proxy (403 / EGRESS_BLOCKED, even after the domain was added, most likely because the setting only applies to new sessions). Instead I cloned the public repo `UsoguiH/-qudrati` (commit `d481b3f`), served it locally (`node tools/serve.js`) and screenshotted it with Chromium (430×875 @3x) through the repo's own `preview.html#<screen>` dev harness, with its Baloo Bhaijaan 2 font loaded from npm (Google Fonts is blocked). Screens used: value screen with the mascot (`#intro`), lesson question + correct-answer feedback (`#lesson`, `#fbgood`), league/«المجلس» (`#league`), mock-exam home + a mock question (`#mock`, `#mocktest`), lesson path with the start card (`#pop`), stats (`#stats`). The outro uses the real app icon. Files are in `shots/` (with `capture.mjs`). **Caveats:** the harness seeds demo data (user «سارة», 527 gems, 12-day streak, 43-day exam countdown, ghost league names), and I can't confirm the deployed site is at exactly that commit. The first version of this video used rebuilt mock-ups; those are gone.
4. **Captions are my reading, not verified transcription.** The only speech-to-text I could run offline is Whisper-small (from an npm mirror; Hugging Face is blocked), and it is weak on this dialect. I used its word timings and wrote cleaned Arabic captions from what it heard. Least certain: "أسئلة تفاعلية تلعبها" (12.4–14.7 s), "وإن كان متقدم جدا" (30.1–31.4 s, one word inferred), "يفهم القوانين ويعرفها" (31.5–33.4 s) and "فكل طالب على شيء يناسبه" (last line). **Please proofread the Arabic; edit `timeline.json` → `python3 hf/build.py` → re-render.** Raw ASR is in `transcript_edit_asr.json`. Per-word highlight timing inside a caption is spread by word length (approximate).
5. The claim "99" is the speaker's own; I didn't add any other claims. The CTA card says "جرّب التطبيق الآن" ("try the app now") and nothing about price or free access.
6. Caption position sits in the lower third but above the platform UI safe zone (bottom ~170 px stays clear).

## Sound
All synthesized in code (numpy/scipy): lo-fi C-major loop at 100 BPM (pad, plucks, bass, kick/clap/hats), sidechain-ducked under the voice; SFX are an intro hit, whooshes/swipe on every cutaway, pops, correct-answer chimes, timer ticks and a logo sting. Voice -14.3 LUFS, music -27.0, SFX -21.9, master -14.0 LUFS / -1.5 dBTP.

## Tools
ffmpeg 7.0.2 (pip `imageio-ffmpeg`, local venv), ffprobe (npm `@ffprobe-installer`), HyperFrames 0.8.86 (`npx hyperframes render`, 30 fps, quality high, Chromium headless shell from the preinstalled Playwright), GSAP, Cairo font (npm `@fontsource/cairo`), Whisper-small ONNX (npm `sts-whisper-small`) via transformers.js. Everything installed inside `edit/`; nothing system-wide.

## Known limits
- Source is 720p, upscaled 1.5× (soft in punch-ins).
- Chin overlaps the caption line slightly in a few punched-in shots.
- HyperFrames lint: 0 errors, 9 "nested structure" style warnings (scenes kept in one file on purpose).

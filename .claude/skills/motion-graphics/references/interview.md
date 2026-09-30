# The interview (clickable questions)

Ask with the **AskUserQuestion** tool so the user can click answers. The tool shows at most
4 questions per call and 2-4 options per question, and always adds an "Other" box for free text.
Put the recommended option first and add "(Recommended)" to its label.

Rules that keep it simple:
- **Skip anything the user already told you** (product, links, language, length…). Never ask twice.
- Ask **round 1**, wait, then round 2, then round 3. Three short rounds beat one wall of questions.
- If the user says "just do it" or seems impatient, stop asking and use the recommended defaults.
- Reply in the user's language. If they write in Arabic, write the questions and options in Arabic
  (the JSON keys stay English). A Gulf-dialect user should get Gulf-friendly wording.
- Free-text things (website URL, reference links, product name) do not fit clickable options.
  If they are missing, ask for them in one plain sentence *before* round 1:
  "Send me the product's website (or App Store link) and 1-4 videos whose style you like."

---

## Round 1: what and where

```json
{"questions": [
  {"header": "Product", "question": "What are we launching?", "multiSelect": false, "options": [
    {"label": "Web app / SaaS", "description": "I'll screenshot your real website and product and animate them"},
    {"label": "Mobile app", "description": "Phone mockups front and centre, App Store feel"},
    {"label": "AI tool or agent", "description": "Prompt typing, 'generating…' moments, results appearing"},
    {"label": "Physical product / service", "description": "Real photos, fewer UI screens"}]},
  {"header": "Length", "question": "How long should the video be?", "multiSelect": false, "options": [
    {"label": "30 seconds (Recommended)", "description": "Hook → reveal → 3 features → call to action"},
    {"label": "15 seconds", "description": "Teaser for ads and stories: hook, one hero shot, logo"},
    {"label": "60 seconds", "description": "Launch film with problem, demo, proof and CTA"},
    {"label": "90+ seconds", "description": "Full story or explainer"}]},
  {"header": "Format", "question": "Where will it be posted? (pick all)", "multiSelect": true, "options": [
    {"label": "YouTube / website (16:9)", "description": "1920×1080 landscape"},
    {"label": "Reels / TikTok / Shorts (9:16)", "description": "1080×1920 vertical, bigger text, captions on"},
    {"label": "Instagram / LinkedIn feed", "description": "1080×1350 (4:5) or 1080×1080 square"},
    {"label": "X / Twitter", "description": "16:9 or 1:1, first second must hook"}]},
  {"header": "Message", "question": "What should people remember after watching?", "multiSelect": false, "options": [
    {"label": "It's new: a capability that didn't exist", "description": "Reveal-driven, 'Introducing…'"},
    {"label": "It's fast / saves time", "description": "Before vs after, speed moments, numbers"},
    {"label": "It's easy", "description": "One-click flows, calm pacing, friendly tone"},
    {"label": "It's powerful for teams", "description": "Scale, integrations, trust logos"}]}
]}
```

## Round 2: look and assets

```json
{"questions": [
  {"header": "Style", "question": "Which visual style?", "multiSelect": false, "options": [
    {"label": "Match my reference videos (Recommended)", "description": "I study every frame of the links you sent and follow their pacing, colours and moves"},
    {"label": "Clean & premium", "description": "Apple-like: calm, lots of space, soft shadows, elegant easing"},
    {"label": "Bold kinetic", "description": "Big type, fast cuts on the beat, punchy transitions"},
    {"label": "Product demo", "description": "Cursor moving through the real UI, zooms on key buttons (like Claude Design)"}]},
  {"header": "Devices", "question": "Which device mockups should appear? (pick all)", "multiSelect": true, "options": [
    {"label": "iPhone", "description": "Your mobile site / app scrolling inside a phone"},
    {"label": "MacBook / browser", "description": "Desktop product inside a laptop or browser window"},
    {"label": "iPad", "description": "Tablet view"},
    {"label": "No devices", "description": "Floating screens and cards only"}]},
  {"header": "Logos", "question": "Which logos should appear? (pick all)", "multiSelect": true, "options": [
    {"label": "Only ours", "description": "Your logo reveal at the start/end"},
    {"label": "Integrations", "description": "Tools it works with (e.g. Slack, Notion, GitHub), real logos"},
    {"label": "Customers ('trusted by')", "description": "Real customer logos. Tell me which ones"},
    {"label": "Press / investors", "description": "'As seen in' row"}]},
  {"header": "Theme", "question": "Light or dark look?", "multiSelect": false, "options": [
    {"label": "Match our website (Recommended)", "description": "Colours and fonts taken from your site"},
    {"label": "Light", "description": "Off-white backgrounds, dark text, one accent colour"},
    {"label": "Dark", "description": "Near-black backgrounds with glowing accent"},
    {"label": "Brand-colour backgrounds", "description": "Bold full-colour scenes"}]}
]}
```

## Round 3: sound and words

```json
{"questions": [
  {"header": "Voice", "question": "Voice-over language?", "multiSelect": false, "options": [
    {"label": "English", "description": "Native English narrator"},
    {"label": "Arabic, Gulf accent", "description": "Saudi / Emirati / Kuwaiti voice, right-to-left text on screen"},
    {"label": "Arabic, Modern Standard", "description": "فصحى, formal and pan-Arab"},
    {"label": "No voice", "description": "Music and on-screen text only"}]},
  {"header": "Narrator", "question": "What kind of narrator?", "multiSelect": false, "options": [
    {"label": "Confident male", "description": "Clear, warm, trustworthy"},
    {"label": "Warm female", "description": "Friendly, smiling, approachable"},
    {"label": "Energetic", "description": "Upbeat, social-ad energy"},
    {"label": "Calm documentary", "description": "Slow, cinematic, premium"}]},
  {"header": "Music", "question": "Music mood?", "multiSelect": false, "options": [
    {"label": "Upbeat electronic (Recommended)", "description": "Modern tech-launch pulse, ~110-128 BPM"},
    {"label": "Cinematic inspiring", "description": "Builds up to a big logo reveal"},
    {"label": "Chill minimal", "description": "Soft, premium, lets the voice lead"},
    {"label": "I'll send a track", "description": "Use your own music file"}]},
  {"header": "Script", "question": "Who writes the script?", "multiSelect": false, "options": [
    {"label": "You write it (Recommended)", "description": "From your website copy; you approve it before any rendering"},
    {"label": "I'll give key points", "description": "Send 3-5 bullet points, I turn them into a script"},
    {"label": "I have the exact script", "description": "Paste it and I'll time the video to it"}]}
]}
```

Skip "Narrator" when the answer to Voice is "No voice" (ask about call-to-action instead, below).

## Optional round 4: finishing (only if they did not say)

```json
{"questions": [
  {"header": "CTA", "question": "What should the final screen ask people to do?", "multiSelect": false, "options": [
    {"label": "Try it free", "description": "Button + website"},
    {"label": "Download the app", "description": "App Store / Google Play badges"},
    {"label": "Book a demo", "description": "Sales-led"},
    {"label": "Join the waitlist", "description": "Pre-launch"}]},
  {"header": "Captions", "question": "Burn subtitles into the video?", "multiSelect": false, "options": [
    {"label": "Yes (Recommended for social)", "description": "Most social video is watched muted"},
    {"label": "No", "description": "Clean picture"}]}
]}
```

## Approval checkpoints (also clickable)

1. **Script + storyboard** (text table: scene, seconds, what we see, what we hear):
   options "Looks good, continue", "Change the words", "Change the scenes", "Shorter / longer".
2. **Stills sheet** (renders/stills/sheet.jpg, sent to the user with SendUserFile if available):
   options "Render the video", "Change visuals", "Change voice or music", "Change timing".
3. **Final video**: options "Perfect", "Small tweaks", "Make other formats (9:16, 1:1)".

## Mapping answers to settings

| Answer | Setting |
|---|---|
| Length 15 / 30 / 60 / 90 s | 4-5 / 7-9 / 12-16 / 18-24 scenes; ~2.3 words per second of voice in English, ~2 in Arabic |
| Format 9:16 | render `Launch-9x16`; captions on; text size ×1.15; keep key content in the middle 80% |
| Style "Product demo" | lead with `cursor` scenes on real screenshots, `PromptBox` for AI tools |
| Style "Bold kinetic" | shot length 0.8-1.6 s, `kinetic` with `marker`, whip/zoom transitions, cuts on beats |
| Style "Clean & premium" | shot length 2.5-4 s, fade/blur transitions, lots of empty space, soft easing |
| Arabic | `brand.rtl: true`, Arabic-capable font (IBM Plex Sans Arabic, Tajawal, Cairo, Noto Kufi Arabic), edge voice `ar-sa-*` / `ar-ae-*` / `ar-kw-*` or ElevenLabs multilingual |
| Narrator | edge presets `en-male`, `en-female`, `en-energetic`, `en-narrator`, `en-british` (see `tts.py --list-voices`) |
| Music mood | `music.py --search "<mood words>"`; fallback `--synth --mood bright/chill/epic/dark` |

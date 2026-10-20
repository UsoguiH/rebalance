# Writing the voiceover script

The voiceover follows the original One Button narration beat for beat: the same
silences, the same pauses, and the same rise and fall. The user generates it in
ElevenLabs as one take. `align.py` then cuts the take at its pauses into 14 phrases and
puts each on its slot, so the film's words land with the voice.

## The original, as the model

The original narration (voice about 200 Hz, unhurried, warm), in piece seconds:

| Line | Words | Delivery |
|---|---|---|
| 1 | "We've all pressed this button before." (0.41-2.75) | calm, matter-of-fact, the problem |
| (montage) | silence, 3.3-7.5 | music only; never write over the montage |
| 2 | "But..." (7.47) "what if one button could *actually*... save your life?" (8.23-12.55) | "But" drawn out and thoughtful; curious rise; stress on "actually"; a small hang before the payoff |
| 3 | "No more endless AI subscriptions," (12.85-14.69) | confident, a list beat |
| 4 | "no more unnecessary costs." (15.33-16.89) | firmer, it lands |
| 5 | "Pay once... and done." (17.23-18.47) | playful, a little smile |
| 6 | "Video, voice, image, motion, pure creation," (18.89-22.57) | upbeat list, items about 0.7 s apart, then softer on the payoff |
| 7 | "all in one place." (23.01-24.77) | warm, settling |
| 8 | "Higgsfield." (25.73-26.33) | a soft sign-off after a pause |

## The slots

Every script has exactly these 14 phrases, in order (`motion/template/beats.json`).
"max" is the time before the next beat. "syl" is a safe syllable budget at Hope's pace
(about 0.22 s + 0.25 s a syllable).

| slot | line | starts | max (s) | syl | What it says | Jira | Stripe |
|---|---|---|---|---|---|---|---|
| `intro` | 1 | 0.41 | 2.75 | ≤10 | the problem; the same words as `intro.line` | Your team's work is everywhere. | Your payments are everywhere. |
| `but` | 2 | 7.47 | 1.15 | 1 | "But..." | But... | But... |
| `whatIf` | 2 | 8.71 | 3.95 | ≤14 | "what if one <thing> could actually... <promise>?" | what if one board could actually... save your sprint? | what if one dashboard could actually... get you paid? |
| `noMore1` | 3 | 12.85 | 2.15 | ≤7 | "No more <pain>," | No more chasing updates, | No more chasing invoices, |
| `noMore2` | 4 | 15.15 | 1.9 | ≤6 | "no more <pain>." | no more pointless meetings. | no more failed payments. |
| `once1` | 5 | 17.15 | 0.85 | 2 | "<Verb> once..." | Plan once... | Build once... |
| `once2` | 5 | 18.04 | 0.76 | 2 | "and <verb>!" | and ship! | and scale! |
| `feature1` | 6 | 18.85 | 0.66 | 1-2 | feature 1 | Boards. | Payments. |
| `feature2` | 6 | 19.55 | 0.73 | ≤2 | feature 2 | Timelines. | Billing. |
| `feature34` | 6 | 20.32 | 1.63 | ≤5 | features 3 and 4 | Automation. Reports. | Connect. Payouts. |
| `payoff` | 6 | 22.0 | 1.2 | ≤3 | the payoff | Pure focus, | Pure growth, |
| `tag1` | 7 | 23.25 | 1.0 | ≤3 | the tagline's first half | your whole team... | your money... |
| `tag2` | 7 | 24.3 | 1.38 | ≤4 | its second half | in one place. | in one place. |
| `name` | 8 | 25.73 | 0.8 | ≤2 | the name | Jira. | Stripe. |

If a phrase must run long, `align.py` moves it up to 0.3 s earlier (when the phrase
before leaves room) and speeds it up by up to 12%. Beyond that it is reported as over.
Write to the budget, not to the rescue.

## Rules that make the take cut cleanly

- **A pause at every slot boundary inside a line:** "But... what if", "Plan once... and
  ship!", "Boards. Timelines. Automation. Reports.", "your whole team... in one place."
  Without one, the two phrases run together and can't be placed on their beats.
  `script.js` checks for this.
- **No extra words.** No ad-libs, no "introducing", no website. Every spoken word must be
  in a slot.
- **Spell numbers out** ("twenty-four seven", not "24/7"). TTS reads digits unpredictably
  and they eat syllables.
- **A name TTS mispronounces** can be spelt the way it sounds in the script (e.g.
  "Jeera"). The aligner tolerates it, and the screen keeps the real name.
- **The spoken words of `intro`, `once1`/`once2`, `tag1`/`tag2` and the first word of
  `payoff`** should be the on-screen words (see `content.md`). That is how they sync.

## Tags (Eleven v3)

Square-bracket audio tags shape the delivery. Use this arc. It is the original's, and the
music is cut to it:

| slot | tag | why |
|---|---|---|
| `intro` | `[calm]` | the problem, stated plainly |
| `but` | `[thoughtful]` | the drawn-out "But..." |
| `whatIf` | `[curious]` | the rising question; the "..." before the promise is the hang |
| `noMore1` | `[confident]` | the first pain, swept away |
| `noMore2` | `[firmly]` | the second, landing |
| `once1` | `[playful]` | the light turn |
| `feature1` | `[upbeat]` | the list (once, for all four) |
| `payoff` | `[softly]` | the payoff drops in level |
| `tag1` | `[warmly]` | the tagline settles |
| `name` | `[softly]` | the sign-off |

Other v3 tags (`[excited]`, `[whispers]`, `[sighs]`, `[laughs]`) exist, but this arc is the
original's. Change it only if the user asks for a different mood.

## script.json

```json
{
  "voice": { "name": "Hope", "model": "Eleven v3", "settings": "Stability: Natural (50) · Similarity: 75 · Speaker boost: on", "note": "..." },
  "phrases": [
    { "slot": "intro", "text": "[calm] Your payments are everywhere." },
    { "slot": "but", "text": "[thoughtful] But..." },
    { "slot": "whatIf", "text": "[curious] what if one dashboard could actually... get you paid?" },
    "... one entry per slot, in order ..."
  ]
}
```

`node motion/tools/script.js --piece motion/<slug>` joins the phrases into the 8-line
block for ElevenLabs (the phrases of a line run together), prints it with the settings,
checks each phrase against its slot, and saves it as `voice/elevenlabs.txt`.

## What to send the user

The block from `script.js` in one code block, then:
- **Voice:** Hope (or the voice they used before);
- **Model:** Eleven v3;
- **Stability:** Natural;
- generate it as **one** take, keeping the tags and the "..." pauses;
- send the file back (MP3 or WAV).

If a phrase comes back rushed, swallowed or mispronounced, ask for the whole block to be
regenerated, not just that line. A line generated on its own comes out in a different
tone from the rest of the take.

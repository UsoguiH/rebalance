# content.js reference

`motion/<slug>/content.js` sets `M.CONTENT`, which holds everything the film shows. Two
complete examples: `motion/template/example/content.js` (Jira, board screen) and
`motion/stripe/content.js` (Stripe, dashboard screen).

**Accents:** in any line, `*stars*` mark the accent word or words. Accents are set bold
and in the brand colour (on the arch, in red). Put the stars around whole words:
`'No more *chasing* updates.'`, `'Plan once, *And ship (:*'`.

**Voice sync:** words in `intro.line`, `once`, `end.tagline` and the first word of
`features.payoff` enter when the voice says them. The aligner writes those times to
`timing.js`. A word syncs when it matches a spoken word in its slot, so keep these lines'
words the same as the script's (punctuation and case don't matter). Unmatched words keep
the template's rhythm, shifted with their neighbours.

**Fitting:** long text shrinks to fit, but shrunk text looks weak. Keep to the lengths
below.

## brand

```js
brand: { name: 'Stripe', icon: 'stripe', color: '#635BFF', key: 'PAY' },
```

| Field | Notes |
|---|---|
| `name` | The wordmark on the reveal and the end lockup. Up to about 12 characters reads big. |
| `icon` | A [Simple Icons](https://simpleicons.org) slug (lowercase, no spaces; `+` becomes `plus`, `.` becomes `dot`), or `null` for a monogram of the first letter. After editing, run `node motion/tools/icons.js`, which fetches every slug content uses and warns about unknown ones. |
| `color` | The brand colour. The whole palette is derived from it: sky, haze, accents, dark card, night end card. |
| `key` | 2-4 letters for the item keys on cards (`PAY-101`). Defaults to the name's first three letters. |
| `monogram` | The monogram letter when there is no icon. |
| `markColor` | The colour of the mark inside the brand tile (default white). |
| `colors` | Overrides for derived colours, e.g. `{ text: '#1a1a1a' }`. Keys: `brand light lighter tint wash text onDark navy ink sub line page` (hex), `sky` (4 hex, top to bottom), `deep` (2 hex), `night` ([r,g,b]), `haze` (3 hex). Use this when the brand colour is very light (yellow) or near black, and the accents look wrong. |

## intro (0-3.3 s)

```js
intro: { line: 'Your payments are *everywhere.*', tiles: ['gmail', 'googlesheets', 'paypal', 'quickbooks', 'shopify', 'xero', 'googlecalendar', 'wise', 'chat'] },
```

- `line`: the problem, in 3-6 words (up to about 34 characters), with the last word as
  the accent. It is spoken by the `intro` slot, word for word.
- `tiles`: 9 Simple Icons slugs for the tools the problem is scattered across. Notification
  badges climb on them. `'chat'` draws a generic team-chat tile (use it for Slack, Teams
  or WhatsApp, which have no marks).

## montage (3.4-7.6 s, music only)

```js
montage: { cards: [ /* nine cards */ ], phrase: 'did they pay?' },
```

`cards` is nine cards, each a full-screen vignette of the mess the product removes. They
cut every 0.2-0.5 s. The first card comes back, closer, as the tenth. Then `phrase` (the
nagging question, up to about 16 characters) fills three last cards, ending in a pile of
it. Every card takes a `cap` (the small `[ caption ]` under it). Any field left out falls
back to the Jira copy, so give every field the product's own words.

| type | Fields |
|---|---|
| `notes` | `notes`: 9 sticky-note scribbles (`\n` breaks a line; up to about 10 characters a line) |
| `sheet` | `title` (a messy file name), `icon` (slug, default `googlesheets`; `null` hides it), `columns` (4 headers), `rows` (up to 9 × `[item, owner, status]`), `notes` (cycled down the last column). A status is coloured by its words: block, fail, late, overdue, declined or error turn red; wip, pending, waiting, progress or `??` turn yellow; done, paid, ok, live, sent or ship turn green; anything else is grey. |
| `inbox` | `title` (`'Inbox (61)'`), `icon` (default `gmail`), `mails`: 7 × `[from, subject, time]` |
| `chat` | `messages`: 4 × `[who, text]` (the first speaker's messages are the nagging ones) |
| `calendar` | `title`, `icon` (default `googlecalendar`), `blocks`: 15 meeting labels |
| `call` | `icon` (default `zoom`), `people`: 5 initials, `banner` (`'You are muted'`) |
| `whiteboard` | `title` (`'PRICING??'`), `lines`: 3 scrawled lines, `circled`: the circled word |
| `doc` | `title`, `lines` (up to 6), `struck`: indices of lines struck through (default first and last) |
| `notifications` | `items`: 4 × `[app, message]` |

Use a variety of types, nine in all. The Jira and Stripe examples use every type once,
in this order: notes, sheet, inbox, chat, calendar, call, whiteboard, doc, notifications.

## whatIf (8.1-9.9 s)

```js
whatIf: { typed: 'what if one dashboard', bold: 'one dashboard' },
```

Typed after `But,` in one huge line that scrolls: 15-25 characters. `bold` is the ending
to set heavy in the brand colour, normally "one <thing>". The voice says this and runs on
("...could actually get you paid?") over the reveal.

## reveal (9.9-12.7 s)

The brand tile springs in, the wordmark slides out, then both pull into the corner of
the product's screen. The screen lives through three beats:
1. the hero element arrives;
2. a first action;
3. a second action that ends in a green tick and confetti.

Then it flips dark, brand and light, and whites out. Common fields: `title`, `subtitle`,
`button` (the header's button).

| type | For | Fields |
|---|---|---|
| `board` | task, project or issue tools | `columns` (3), `cards` (9: eight on the board; the ninth is the hero card that drops in and is dragged to the last column) |
| `dashboard` | money, analytics, sales or ops | `kpis` (3 × `[label, number, prefix, delta]`; they count up), `chart` (optional, 12 values 0-1), `chartLabel`, `listLabel`, `rows` (4 × `[name, detail]`; the newest flips from `status[0]` to `status[1]`), `status` (`['Pending', 'Paid']`) |
| `chat` | AI assistants and copilots | `prompt` (up to about 40 characters, typed and sent), `reply` (up to 3 lines of up to about 48 characters, streamed in), `result` (`[title, detail]`, a card that lands and is ticked), `placeholder` |

For a product none of these fit (a design tool, a camera app), see `custom-scenes.md`.

## items

```js
items: ['Invoice #1042', 'Refund #77', /* ... nine short titles */],
```

Nine short titles for the cards in the feature ring and the blurred cards behind the
arch. A `board` reveal uses its `cards` instead, so `items` is only needed for the other
types.

## noMore (12.7-17.0 s)

```js
noMore: ['No more *chasing* invoices.', 'No more *failed* payments'],
```

- `noMore[0]`: "No more *<pain>* <thing>." in up to about 30 characters. A check bubble pops
  after the last word.
- `noMore[1]`: the second pain, laid on a 3D arch, in up to about 28 characters (longer
  lines shrink). The accent is set letter by letter in glowing red, so a short, punchy
  word works best. Usually it has no full stop.

## once (17.0-18.7 s)

```js
once: 'Build once, *And scale (:*',
```

Two plain words, then the accent: "And <verb>" and a `(:` smile. The swoosh underlines the
first half. Spoken as `once1` ("Build once...") and `once2` ("and scale!").

## features (18.7-23.0 s)

```js
features: {
  ring: 'Payments',
  panel: { word: 'Billing', type: 'list', rows: [['Invoice sent'], ['Reminder scheduled'], ['Card charged'], ['Receipt emailed']] },
  wall: { word: 'Connect', tiles: ['shopify', 'quickbooks', 'xero', 'paypal', 'gmail', 'googlesheets', 'wise', 'hubspot', 'woocommerce'] },
  card: 'Payouts',
  payoff: 'Pure *growth.*',
},
```

Four features, one word each, said in a quick list, then the payoff:
1. `ring`: one word (up to about 9 characters) inside a spinning ring of cards.
2. `panel.word`: typed above a panel that unfolds. `type` is one of:
   - `timeline`: 4 × `[name, from 0-1, to 0-1]` bars, plus `ticks` (4 labels);
   - `chart`: 5-8 × `[label, value 0-1]` bars;
   - `list`: 4 × `[label]`, ticked in turn.
3. `wall.word`: a big word on a wall of 9 integration tiles, wired to the centre.
4. `card`: one word (up to about 9 characters) on the dark brand card.
5. `payoff`: two words that replace `card` on the dark card: a small one, then a big
   white accent (`'Pure *focus.*'`). Spoken as the `payoff` slot.

## end (23.0-26.6 s)

```js
end: { tagline: 'Your money, in one *place.*' },
```

The tagline is split at its comma: the first half lands with `tag1`, the second with
`tag2`. Each half is 2-4 words, and the last word is the accent. Then the brand tile and
the name lock up on the brand's night colour, and the voice says the name.

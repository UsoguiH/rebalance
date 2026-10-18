# Revolut app: design, motion and type study

A study of the **Revolut mobile app** (not the marketing website), written as a spec
you can build from. The goal-tracking app in [`goals/`](goals/) is built on it.

## Where this comes from

The native iOS/Android app can't run in a cloud container, so the study uses the
closest first-party sources of real app UI, captured with Playwright:

| Source | What it gave | Files |
|---|---|---|
| App Store and Google Play listings | 13 official app screenshots (home, savings, invest, security, chat transfers, accounts carousel, card editor) | [`design/revolut-app/screens/`](design/revolut-app/screens/) |
| A 16 s in-app screen recording (1124×2436, 25 fps) embedded on revolut.com | Real transition timings, read frame by frame | [`design/revolut-app/motion/`](design/revolut-app/motion/) |
| The `--rui-*` CSS tokens from app.revolut.com (Revolut's web app, which uses the same "RUI" design system) | Exact easing curves, durations, radii, spacing, type scale | quoted below |

Every value below is labelled:
- **measured**: sampled from pixels or video frames;
- **token**: read from RUI;
- **inferred**: my reading of the visuals.

Capture scripts: `design/revolut-app/capture-*.mjs`.

---

## 1. Principles

1. **Black canvas, content as light.** The app's default surface is pure `#000`. Hierarchy
   comes from brightness, not borders: white numbers, then translucent-white controls,
   then dim-grey cards.
2. **One number per screen.** Every account home is built around a single huge balance,
   centred, with tiny decimals. Everything else is smaller and quieter.
3. **The hero is a mood.** Above the fold sits a full-bleed photo or colour gradient
   (teal for Invest, a room photo for a savings goal, black for the main account). It
   fades into black, and the widgets sit on that black.
4. **Controls are translucent white, never coloured.** Search pill, icon buttons, action
   circles and the "Accounts" pill are all white at 13–20 % opacity, so they work on any
   hero.
5. **Motion is a blur-dissolve, not a slide.** Screens defocus, dim and swap. New content
   comes into focus and rises a few pixels on a long, soft deceleration.

---

## 2. Colour

### Dark UI (the app's default look in every store screenshot)

| Role | Value | Source |
|---|---|---|
| Canvas | `#000000` | measured |
| Card / widget | `#29282B` (video) to `#2F3336` (store shots) | measured |
| Chat bubble (user) | `#3D3D3D` | measured |
| Search pill, small icon buttons | `#333333` = `rgba(255,255,255,.20)` on black | measured |
| Action circles (Add money, Move…) | `#222222` = `rgba(255,255,255,.13)` on black | measured |
| Primary text | `#FFFFFF` | measured |
| Secondary text | about `rgba(255,255,255,.6)` | inferred |
| Primary button (dark) | white fill with black label (the "Send" pill) | measured |
| Positive delta | `#09BE67` (`--rui-color-up`); chart line is a green-teal | token / measured |
| Negative delta | `#F54C3E` (`--rui-color-down`) | token |
| Invest hero gradient | `#2494AA` → `#092531` → `#171C20` → `#000` (top to bottom) | measured |
| Assistant bottom "fog" | teal-grey haze, about `#192326` at the bottom edge | measured |
| Press glow | warm beige radial, about `rgba(214,196,160,.35)` | measured / inferred |

### Accent palette (RUI, for icons and per-item colour)

`blue #494FDF · deep-purple #7C57F4 · teal #00A87E · cyan #08A4AF · light-blue #007BC2 ·
pink #DE1B87 · deep-pink #E61E49 · orange #D67200 · action-blue #0666EB` (token).

Icons in list rows sit on a 40 px circle filled with the accent colour. The glyph is white.

---

## 3. Typography

| Use | Font | Size / weight | Notes |
|---|---|---|---|
| Hero balance | Aeonik Pro (brand) | about 48 px / 500–600, tight tracking | Decimals at about 45 % size, baseline-aligned (`£3,126.39` → `.39` small) |
| Screen heading (e.g. "How can I help you today?") | Aeonik Pro | 24–28 px / 500, centred | |
| Body, list titles | Inter | 16 px / 500 (title), 14 px / 400 (subtitle) | `--rui-font-brand: Inter` |
| Labels ("Personal · GBP", action labels) | Inter | 12–13 px / 400–500 | |
| Letter spacing | | body1 `-0.18em/16`, body2 `-0.1em/14`, headings tighter | token |
| Line heights | | body1 1.375, body2 1.43, heading 1.25 | token |

**Substitution:** Aeonik Pro is proprietary. Use **Inter** for everything. Inter 4 has an
optical-size axis, so large balances automatically get the tighter "Display" cut. Add
`font-feature-settings: "tnum"` to any number that animates.

---

## 4. Layout and components (from the store screenshots)

```
┌──────────────────────────────┐
│ (●) [🔍 Search      ] (▥)(▭) │  top bar: 32px avatar, search pill, two 32px icon buttons
│                              │
│        Personal · GBP        │  12px label
│        £3,126.39             │  balance, decimals small
│        ( Accounts )          │  translucent pill, 32px tall
│                              │  ← hero gradient/photo behind all of this
│   (+)    (⇄)    (i)   (···)  │  four 44px action circles
│ Add money Move  Info   More  │  12px labels
│ ┌──────────────────────────┐ │
│ │ (%) Est. daily interest  +£0.56 │  widget: radius 20–24, rows 64px
│ │ (🇬🇧) Personal → Savings  +£150 │
│ │          See all           │ │
│ └──────────────────────────┘ │
│ ┌───────────┐ ┌────────────┐ │  two-up stat cards
│ │Saved/month│ │Earned/month│ │
│ │£59.52 ▲   │ │£10.37      │ │
└──────────────────────────────┘
```

- **Accounts carousel:** swipe sideways between balances. Neighbours peek at the edges
  and the hero background changes with the account.
- **Radii** (token): pill `9999px`, widget `16px` (`--rui-radius-widget`), popup or sheet
  `24px`. The store shots show cards close to 20–24.
- **Spacing** (token): 4-pt scale (`4 8 12 16 20 24 32 40 48…`). Screen gutter 16. Gap
  between widgets 12–16.
- **Buttons** (token): heights 30 / 40 / 52 px. A primary CTA is a full-width 52 px pill.
- **Lists:** 40 px icon circle, title and subtitle stacked, amount right-aligned, no
  dividers. A centred "See all" closes the widget.
- **Chat (transfers, assistant):** right-aligned user bubbles in `#3D3D3D`, radius about
  18 px. Assistant bubbles sit on the left, followed by a "•••" typing bubble. Rich cards
  (chart, amount) appear inline.
- **Assistant orb:** a small metallic sphere (radial white → grey) in the top-right of
  the AIR screen.

---

## 5. Motion

### 5.1 Tokens (RUI)

```css
--rui-duration-xs: 100ms;  --rui-duration-sm: 200ms;  --rui-duration-md: 300ms;
--rui-duration-lg: 450ms;  --rui-duration-xl: 900ms;  --rui-duration-skeleton: 1500ms;
--rui-easing-default: cubic-bezier(0.15, 0.5, 0.5, 1);    /* fast start, very long tail */
--rui-easing-shadow:  cubic-bezier(0.4, 0.3, 0.8, 0.6);
--rui-easing-toast:   cubic-bezier(0.175, 0.885, 0.21, 1.65); /* overshoot */
```

RUI also ships `@keyframes` for a blur-in (`opacity 0, blur(8px)` → `1, blur(0)`) and
its reverse. That is the same primitive seen in the app recording below.

### 5.2 Measured from the in-app recording: long-press balance → AIR assistant

See `motion/01-home-to-assistant-blur-dissolve.jpg` and `home-to-assistant.mp4`
(frames are 40 ms apart).

| t (ms, from touch) | What happens |
|---|---|
| 0–240 | Finger rests on the balance. A white touch capsule appears. The screen **pushes in** slightly, about 2–3 px of downward drift, roughly `scale(.985)`. |
| 240–400 | The whole home screen **defocuses and dims** (blur about 20 px, brightness about 30 %) while scaling slightly **up**: the top bar and action row drift outward. |
| 400–700 | A **warm radial glow** blooms under the finger. The screen is almost black and the glow is the only light. |
| 550–960 | The glow **travels down** with the finger and fades. The new screen's header, title and input come in heavily blurred and sharpen. |
| 960–1360 | Everything is sharp. The bottom input chip **rises about 24 px** and settles on a long tail. A teal-grey fog stays at the bottom edge. |

**Total: about 1.0 s from press to settled. About 450 ms of that is the cross-blur.**

### 5.3 Chart card arriving (`motion/02-chart-card-rise.jpg`)

The user bubble blur-dissolves in first. The chart card follows **about 120 ms later**,
starting at about 50 % opacity, blurred, and **18–24 px low**. It reaches full focus by
about 360 ms, then keeps creeping up for another **about 500 ms**. That is the
`cubic-bezier(.15,.5,.5,1)` tail at the `xl` 900 ms duration.

### 5.4 Chat reply (`motion/03-press-glow-and-chat-bubbles.jpg`)

User bubble, then assistant bubble, then a "•••" typing bubble, each blur-in about 120 ms
apart. The leaving screen's text fades to about 30 % **before** it blurs, so the hand-off
never shows two sharp screens at once.

### 5.5 Rules to reproduce the feel

1. **Screen change** = outgoing `blur(20px) brightness(.3) scale(1.03)` + incoming
   `blur(16px)→0, opacity 0→1, scale(1.02)→1`. 450 ms, default easing, incoming starts
   about 150 ms late.
2. **Content entry** = `opacity 0, translateY(16–24px), blur(8px)` → rest. 900 ms
   default easing, about 40–120 ms stagger.
3. **Press** = `scale(.97)` over 100 ms. Release over 200 ms.
4. **Numbers** count to their new value over 900 ms with default easing. Use tabular
   figures.
5. **Toasts and confirmations** use the overshoot toast curve, 450 ms.
6. **Never slide whole screens sideways** except in swipe carousels that follow the finger.
7. Honour `prefers-reduced-motion`: drop blur, scale and translate, and keep ≤150 ms
   opacity fades.

---

## 6. How the Goals app uses this

| Revolut pattern | Goals app |
|---|---|
| Account balance hero + accounts carousel | Swipe between **All goals** and each goal. Saved amount is the balance; the hero gradient takes the goal's accent colour. |
| "Accounts" pill | "of £5,000 · 25%" pill opens goal details |
| Add money / Move / Info / More | **Add money · Withdraw · New goal · More** |
| Transactions widget | **Goals** list widget (with progress bars) and a **Recent activity** widget |
| Saved / Earned this month cards | **Saved this month** (▲/▼ vs last month) and **Completed** |
| Long-press balance → AIR | Long-press the balance (or tap the chart icon) → **Insights**: the same glow + blur-dissolve, chat bubbles, and a rising chart card |
| Amount entry | Bottom sheet with huge amount, quick chips, keypad and a white pill CTA |

# Wick & the Lost Reels

A 1930s rubber-hose cartoon game for the browser. It uses the classic cel-animation
look (boiling ink lines, pie-cut eyes, white gloves, film grain, iris wipes, a
film-leader countdown) with a Moonlighter-style loop: **run a curio shop by day,
raid living cartoon dungeons by night.**

All art is drawn in code on a `<canvas>`, and all music and sound effects are
synthesized with the Web Audio API. There are no image or audio files and no build step.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
npx http-server -p 8080   # then visit http://localhost:8080
```

## The story

Flickerton's Picture House hides Grandpa Tallow's **Lost Reels**: four cartoons that
came to life. The greedy Projectionist, Mr. Sprocket, stole them and is squeezing the
Tallow family's Flicker Emporium for rent. Wick, a young candle, and Granny Tallow
decide to delve into the reels by night and sell the curios they find by day.

It is told through flipping storybook cutscenes (intro, one after each boss, the
final door, the ending) plus in-game dialog with portraits.

## The loop

| Day: the Flicker Emporium | Night: the Lost Reels |
|---|---|
| Place curios on 4 display tables and set a price per item | 3 procedurally generated floors per reel, then a boss |
| Customers react: ♥ too cheap · $ just right · ~ pricey · ✗ too much | Rooms lock until cleared; find treasure chests and healing fountains |
| Granny's **ledger** remembers every reaction, so you can find the best price | 16-slot bag. If you get snuffed you keep only the top-row **safe pocket** |
| Ring customers up at the register before they get impatient | The **Stage Hook** (R) yanks you home with all your loot, for a fee |
| Sleep in the back room to start a new day | The boss grade card rates time, HP, parries and EX shots |

Spend the gold at **The Forge** (damage levels, new weapons, extra HP; these need
materials from the reels) and at **Dr. Fizzwater's Apothecary** (health tonics).

### Reels and bosses

1. **The Pantry Picture**: Boilin' Bartholomew, a crooning kettle
2. **Big Top Blowout**: Jangles the Jack, a jack-in-the-box
3. **Tick-Tock Tower**: Grandfather Tock, a clock that can stop time
4. **The Final Cut**: Mr. Sprocket, the Projectionist himself

Each boss has three phases, and **pink** projectiles can be parried.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move, navigate menus |
| J / Left click | Shoot (mouse aims; otherwise you fire the way you face) |
| Space / K / Shift | Dodge roll. Roll into **pink** shots to **parry** |
| L / Right click | EX shot (costs one full super card) |
| E / Enter | Interact, talk, confirm |
| Q | Drink a health tonic |
| R | Stage Hook (escape the dungeon with your loot) |
| C | Swap weapon |
| I / Tab | Bag (in the shop: bag plus storage chest). Z drops a stack |
| Esc / P | Pause, options, how to play |
| M | Mute |

## Sprite sheets

The hero is a top-hatted plague-doctor crow drawn in a clean cel-animation style:
tapered brush outlines, flat colors with hard shadow shapes, and follow-through on
the cloak, scarf and hat. His frames are painted in code and baked to a sprite sheet:

- `assets/hero.png` plus `assets/hero.json`: 164 frames (TexturePacker-style JSON with
  frames and named animations)
- `assets/atlas.js`: the same data in a compact form the game loads at runtime

The animations are idle, run, dash and shoot (5 aim angles), run-and-shoot, hurt,
death, ghost, cheer, parry and talk. Each comes in down, side and up views where
that applies; side frames are mirrored for left.

To rebake after editing `js/art/*.js`, run `node tools/bake.js`. It needs Playwright.
Open `tools/viewer.html` (served over http) to play each animation.

## Code map

| File | What it does |
|---|---|
| `js/core.js` | Namespace, math, seeded RNG, input, save data |
| `js/ink.js` | The drawing kit: boiling blobs, hoses, gloves, pie eyes, cartoon text |
| `js/fx.js` | Particles, iris wipes, and the film post-process (grain, scratches, flicker, vignette, sepia) |
| `js/audio.js` | Synth jazz band (stride bass, banjo, clarinet/trumpet, brushes), record crackle, SFX |
| `js/chars.js` | Wick, Granny, townsfolk, shopkeepers, Mr. Sprocket, portraits, emotes |
| `js/items.js` | Curio database, bag helpers, customer mood and ledger logic, item icons |
| `js/ui.js` | HUD cards, dialog, menus, bag/chest, pricing, store and pause panels |
| `js/player.js` | Movement, roll, parry, shooting, EX, collision |
| `js/title.js` | Film leader, studio card, title screen |
| `js/cutscene.js` | Storybook cutscenes and credits |
| `js/town.js` | The town hub, forge and apothecary goods, reel select |
| `js/shop.js` | The Emporium: displays, customers, register, sleeping |
| `js/enemies.js` | Sixteen enemy types (four per reel) and enemy bullets |
| `js/bosses.js` | The four bosses and their hazards |
| `js/dungeon.js` | Floor generation, rooms, loot, minimap, boss flow, death and results cards |
| `js/game.js` | Canvas setup, main loop, scene transitions |
| `js/cel.js` | Clean cel-style drawing kit used to paint the sprite sheets |
| `js/art/wick.js`, `js/art/hero.js` | The pose and animation library, and the crow hero's painter |
| `js/sprites.js` | Loads the baked sheets and plays the hero's animations in game |
| `tools/bake.js`, `tools/bake.html` | Bakes the sprite sheets to `assets/` |

Progress saves automatically to `localStorage`.

---

# Orbit (`orbit/`)

A personal dashboard built on a recreation of a "Navigation Test (E.27)" micro-interaction:
circles on a large wheel, a rotary dial of eight dots around a thumb-friendly semicircle,
and a knob that melts into the semicircle (an SVG goo filter). Every circle is a live
window into its own world; opening one dives through the circle into that world.
Motion runs on GSAP (core, SplitText, ScrambleText) loaded from jsDelivr.

Open `orbit/index.html` in a browser. It opens with a short sequence: a heartbeat dot and a
greeting with today's summary, a ring that draws itself into the first world, the other worlds
fanning out along the wheel, and the knob pulled out of the rising dial. Tap or press any key
to skip it.

Seven worlds, each with its own interaction:

1. **My goals: gravity.** Goals orbit a sun; the closer the orbit, the more progress.
   Drag a planet inward to log progress, all the way in to finish it (it becomes a ring),
   or fling it past the edge to let it go.
2. **Exercise: pulse.** The week is an ECG strip. Press and hold anywhere to charge
   today's heartbeat and log the session; tap a past day to change it.
3. **My agents: cells.** Claude Code subagents are gooey metaball cells. Tap one to read
   it; drag it into the dial to "summon" it, which copies a prompt that calls it.
   Adding an agent splits a new cell off an existing one.
4. **Habits: harp.** Each habit is a string with seven beads for the last seven days.
   Pull a string sideways and let go to check in (it plays a note); strum to play.
5. **Reading: vessels.** Each book is a glass tube of liquid. Tap to pour in ten pages,
   or drag the level.
6. **Journal: ink.** Ink blooms from the caret as you type. Old entries float as stains;
   tap one to reread it.
7. **Sleep: moon.** Last night's hours are the moon's phase (full moon = 8 hours).
   Drag up or down or turn the dial to set it; tap a small moon for another night.

Everywhere: turn the dial, swipe the circles, scroll, or use ← → to move between worlds.
Tap the knob or the centre circle to open, and the knob again (or Esc) to close.
Long-press an item to remove it; the + button adds one. Data starts with sample entries
and is saved in `localStorage` on your device. All artwork is drawn on canvas.

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

Progress saves automatically to `localStorage`.

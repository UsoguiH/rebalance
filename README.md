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

# Twisted Metal: Sunsprings (fan remake)

An unofficial browser fan recreation of **Twisted Metal (2012)** car combat, in `twisted/`.
It's built with three.js (vendored in `twisted/lib/`). Every model, texture, sound and the
metal soundtrack is generated in code, and there is no build step. Twisted Metal is a
trademark of Sony Interactive Entertainment; this project is not affiliated with Sony.

Serve the repo folder and open `twisted/index.html`:

```sh
npx http-server -p 8080   # then visit http://localhost:8080/twisted/
```

## What's in it

- **Sunsprings, CA:**
  - Downtown and buildings: a brick main street, the freestanding clock tower roundabout,
    the county courthouse with its cupola, a gothic church, the water tower and the
    hospital with its helipad.
  - Garage: Bruner's Foodsource, with a drive-in health bay.
  - Rival high schools: Sunsprings High's stadium (drive up the bleachers) and East
    High's concrete pylons.
  - On the edges: destructible radar dishes on the ridge, a wind farm on the hills,
    suburbs, pedestrians and smoke columns.
  - Atmosphere: an orange smog sky with lightning.
- **12 vehicles:** Sweet Tooth, Roadkill, Kamikaze, Outlaw, Meat Wagon, Axel, Crimson Fury,
  Reaper, Darkside, Vermin, Shadow and Junkyard Dog. Each has its own stats, special and
  alternate special.
- **Weapons:** machine gun; fire, homing, power and stalker missiles; napalm; ricochet;
  remote bombs; shotgun; sniper. Energy moves are freeze, shield, drop mine, jump and rear
  fire. Health and turbo pickups are scattered around town.
- **Modes:** Death Match, Last Man Standing, Hunted and Endurance against AI drivers.
- **HUD:** laid out after the PS3 game. It has a rotating minimap, "Opponents: N", damage
  callouts, the 7-segment timer, the energy d-pad, the weapon carousel, health and turbo
  bars, the lock-on reticle and off-screen arrows.

## Controls

| Key | Action |
|---|---|
| W/S, A/D (or arrows) | Gas, brake/reverse, steer |
| Shift | Turbo |
| Space | Tight turn (handbrake) |
| J / left mouse | Machine gun |
| K / right mouse | Fire weapon (hold to charge stalker, sniper and some specials) |
| Q / E | Cycle weapons |
| L | Alternate special |
| C | Jump |
| 1 / 2 / 3 | Freeze / shield / drop mine |
| R (hold) | Rear fire |
| V (hold) | Look back |
| Tab | Scoreboard |
| Esc / P | Pause |

A gamepad works too, with a PS-style layout.

Dev URL flags: `#auto=<vehicle>` jumps straight into a match, `#nointro` skips the
flyover, `#lowq` is a low-cost renderer and `#ts=N` speeds up time.

| File | What it does |
|---|---|
| `twisted/js/world.js` | Layout, terrain, curbs/platforms, colliders, AI road graph, painted ground, minimap |
| `twisted/js/town.js` | Buildings and landmarks |
| `twisted/js/props.js` | Trees, breakable street furniture, parked cars, gas pumps |
| `twisted/js/vehicles.js` | Roster, stats and procedural models with painted liveries |
| `twisted/js/car.js` | Vehicle physics, damage, status effects |
| `twisted/js/weapons.js` | Weapons, specials, targeting, pickups |
| `twisted/js/ai.js` | AI drivers |
| `twisted/js/match.js` | Game modes, scoring, respawns, per-car effects |
| `twisted/js/hud.js`, `twisted/js/ui.js` | HUD and menus |
| `twisted/js/fx.js`, `twisted/js/post.js`, `twisted/js/sky.js` | Particles, post-processing, sky |
| `twisted/js/audio.js` | Synthesized engines, SFX and music |
| `twisted/js/peds.js` | Pedestrians |

# Sidecraft

A Minecraft-style survival sandbox seen from the side, the way Terraria is. The
interface follows Minecraft's: the same menus, inventory layouts, HUD, fonts and
controls. Everything (textures, font, logo, sounds and music) is drawn or
synthesized in code. There are no asset files and no build step.

This is a fan-made tribute. It is not affiliated with Mojang or Microsoft, and it
uses none of their files.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
npx http-server sidecraft -p 8080   # then visit http://localhost:8080
```

Worlds and options save to `localStorage`.

## What's in it

- **Worlds**: a 1600x256 seeded world with plains, forest, snowy, desert, mountain
  and ocean biomes, caves, lava, ore veins (coal, iron, gold, diamond), deepslate,
  lakes, and dungeons with loot chests. Superflat, structures and a bonus chest are
  options on the Create New World screen.
- **Survival**: health, hunger with saturation, air, fall damage, armor, experience
  and levels, day/night (20 minutes), beds, and death with dropped items.
- **Building**: mine and place blocks with tool tiers, background walls
  (Shift + click), doors, ladders, torches, falling sand and gravel, and flowing
  water and lava (they make cobblestone and obsidian when they meet).
- **Crafting**: 2x2 and 3x3 shaped recipes, furnaces with fuel and smelting
  experience, chests, and iron, gold and diamond armor.
- **Mobs**: zombies and skeletons (they burn in daylight), creepers that explode,
  plus pigs and sheep.
- **Game modes**: Survival, Hardcore (one life, then spectator) and Creative (tabbed
  item menu and flying). Difficulty runs from Peaceful to Hard.
- **Interface**: title screen, Select World (with world icons, edit, delete and
  re-create), Options, Music & Sounds, Video Settings, Controls (rebindable),
  Chat Settings, Statistics, chat with commands, F1 to hide the HUD, F2 for
  screenshots, F3 for the debug screen, and F3 + H for advanced tooltips.

## Controls (defaults, rebindable)

| Key | Action |
|---|---|
| A / D | Walk (double tap or hold Left Ctrl to sprint) |
| Space | Jump (W / S climb ladders) |
| Left Shift | Sneak |
| Left click | Mine / attack |
| Right click | Place, use, eat, draw a bow, put on armor |
| Middle click | Pick block |
| E | Inventory |
| Q | Drop (Ctrl + Q drops the stack) |
| F | Swap item with offhand |
| 1-9 / wheel | Hotbar |
| T or / | Chat / command |
| = / - | Zoom |

In inventories, click picks up or puts down a stack, right click splits it, Shift
click moves it across, dragging spreads a stack over several slots, a double click
gathers a stack, and 1-9 swaps with the hotbar.

## Commands

Commands work when **Allow Cheats** is on (it is on by default in Creative):
`/gamemode`, `/time`, `/give`, `/tp`, `/kill`, `/summon`, `/clear`,
`/spawnpoint`, `/difficulty`, `/xp`, `/gamerule keepInventory`, `/seed`, `/say`
and `/help`.

## Code map

| File | What it does |
|---|---|
| `js/core.js` | Namespace, seeded RNG, Perlin noise, input |
| `js/font.js` | Bitmap font with drop shadows and § colour codes |
| `js/blocks.js` | Block and item registry, procedural textures and icons, smelting |
| `js/recipes.js` | Shaped crafting recipes |
| `js/world.js` | Generation, block updates, fluids, random ticks, lighting, saving |
| `js/entities.js` | Physics, player, mobs, items, XP orbs, arrows, TNT, particles, explosions |
| `js/play.js` | Mining, placing, using items, combat, mob spawning, furnaces |
| `js/render.js` | Sky, parallax, tiles, walls, fluids and the smooth light map |
| `js/gui.js` | Buttons, sliders, text fields and every menu screen |
| `js/ui.js` | HUD and the inventory, crafting, chest, furnace and creative screens |
| `js/audio.js` | Synthesized sound effects and generative piano music |
| `js/main.js` | Main loop, worlds and saves, controls, death, stats, commands |

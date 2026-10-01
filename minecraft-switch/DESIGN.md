# Blockcraft design guide: Minecraft UI, Valheim-style world

**Look and UI:** Minecraft, plus the style of high-quality Minecraft mob mods.
**Story, progression and survival:** Valheim-style, with our own names and story.
The reference images were mod showcases. This file only describes their style; don't copy their art.

---

## 1. Mob art style (from the mod references)

### Rules every mob follows
1. **Cubes only.** Every part is a box on a pivot, textured at 16 px per block. Nothing is smooth or round.
2. **Silhouette first.** Each mob must be recognizable as a black shape at 30 blocks: horns, huge shoulder plates, a hunched back, long arms, wings, tails.
3. **Scale varies a lot.** Small (0.5 blocks: imps, critters), normal (2 blocks: humanoids), big (3–4 blocks: brutes, golems), boss (6–12 blocks: dragons, tree giants).
4. **Palette: 2–3 base colors plus 1 glowing accent.** Examples: dark steel with teal glow; black and brass with green runes; nether red and ember orange; bone white with red eyes.
5. **Glow is for eyes, runes, cracks and visors.** Render glowing parts unlit and full-bright, with a faint additive halo.
6. **Pixel shading inside the texture.** Light top-left edge and dark bottom-right edge on each plate, 1 px trim lines, a gold or brass border on armor plates, rivets.
7. **Layers stick out.** Pauldrons, belts, cloth strips, chains, spikes and fire hair sit 1–2 px outside the base box, as extra small boxes.
8. **Readable faces.** Simple 8x8-style faces with 1–2 px eyes. Bosses get glowing eyes or a visor slit.
9. **Animation is pivot swings,** like the base game: walk swing, an attack wind-up then a slam, a 6-frame hit flash in red tint, a death tip-over with smoke puffs.
10. **Particles match the theme:** soul flames, embers, spores, frost, bone chips.

### Mob archetypes seen in the references
| Archetype | Look | Use in our game |
|---|---|---|
| Dark knight boss | Black armor, teal visor glow, big sword | Final dungeon boss and stone-hall guardians |
| Armored golem | Huge shoulder plates, hammer gauntlet, brass and green runes | Plains guardian, mini-boss |
| Brute | Wide body, spiked shoulders, rusty red cloth | Mountain or fortress grunt |
| Fire-headed golem | Netherbrick body, burning hair | Ashland enemies |
| Flesh maw | Big mouth, hanging chains, red glow | Swamp or ash boss |
| Ghost, wraith | Floating robe, no legs, pale glow | Night swamp enemy |
| Mummy or bandaged giant | Cream wrapped stripes, yellow eyes | Desert or crypt brute |
| Manta or phantom | Flat wide wings, glowing green spots | Flying night enemy, sea threat |
| Plant dryad | Leaf body, big flowers | Forest spirit, friendly or hostile |
| Spider-ghast | White blocky body, dangling legs, red eyes | Cave or mountain horror |
| Cultist, witch | Hood, staff, patterned robe | Swamp caster, raid leader |
| Bull, bear | Horns, shaggy textured hide | Tameable or neutral beasts |
| Character variants | Mob-themed hoodies or armor | Cosmetics and NPC traders (keep them non-sexualized) |

### Boss scene recipe (from the deep-dark knight image)
- A symmetrical arena with a long walkway and a glowing floor strip (teal water or lava).
- Bone piles and lanterns placed symmetrically on both sides.
- A dramatic low camera on the intro, then subtitle text in the Minecraft font at the bottom, white with shadow (for example "I've slain its kind before.").
- A boss bar at the top centre in the Minecraft style, coloured to the boss's accent.

---

## 2. UI: exact Minecraft style

### Panels (inventory, crafting, chests)
- Panel: `#C6C6C6` with a 2 px bevel: white `#FFFFFF` on the top and left, `#555555` on the bottom and right, and a 2 px black outer border with rounded pixel corners.
- Slot: 18x18 px (shown at 2x). Inner fill `#8B8B8B`, top and left edge `#373737`, bottom and right edge `#FFFFFF`.
- Hovered slot: a white overlay at 50% opacity.
- Inventory layout: 9x3 storage, 9x1 hotbar below with a 4 px gap, armor column of 4 on the left, player preview, 2x2 crafting grid.
- Workbench: 3x3 grid, arrow, result slot.
- Labels in `#404040`, no shadow (inside panels).
- Item counts: white with shadow, bottom-right of the slot.
- Durability bar: 13x2 px at the slot bottom, going from green to red.

### Tooltips
- Background `#100010` at 94% opacity.
- 1 px border with a gradient from `#5000FF` (top) to `#28007F` (bottom).
- Name line uses the rarity colour: white common, yellow `#FFFF55` uncommon, aqua `#55FFFF` rare, light purple `#FF55FF` epic, gold `#FFAA00` boss item.
- Stat lines in gray `#AAAAAA`, damage in blue `#5555FF`. Valheim-style extras: "Durability", "Weight", "Block power", "Food: +25 health, +20 stamina, 20 min".

### HUD
- Hotbar, hearts, hunger and XP stay as they are now.
- Add a **stamina bar** (yellow, Valheim-style) above hunger.
- Add **status icons** at the top-left in Minecraft potion-icon style: Rested, Wet, Cold, Poisoned, Shelter.
- Add a **boss bar** at the top centre.
- Add a **raid warning** in red title text.

### Fonts
Minecraft-style pixel font for all UI, with a 2 px dark drop shadow `#3F3F3F` on the HUD.

---

## 3. Valheim-style progression (our own names)
| Stage | Biome | Boss (summoned with trophies at an altar) | Unlocks |
|---|---|---|---|
| 1 | Meadows | **Stormhorn**, a lightning stag | Pickaxe |
| 2 | Dark Forest | **The Old Root**, a tree giant | Swamp access (bronze) |
| 3 | Swamp | **Rotmaw**, the flesh maw | Iron, crypt keys |
| 4 | Mountains | **Frostwing**, a dragon | Silver, cold resistance |
| 5 | Plains | **The Brass Colossus**, an armored golem | Black metal |
| 6 | Deep Halls | **The Hollow Knight**, a dark teal knight | Endgame gear |

- **Story:** two ravens guide the player through rune stones. Each boss's trophy opens the next path.
- **Items:** Valheim-style tiers (wood, flint, bronze, iron, silver, black metal), shown as Minecraft-style 16x16 pixel icons in Minecraft slots.

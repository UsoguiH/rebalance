# Minecraft features Blockcraft is missing

Compared against Minecraft Java Edition 1.21, with Bedrock (phone) notes where they matter. Checked against the Minecraft Wiki pages Inventory, Heads-up display, Controls, Options, Crafting Table, Breaking, Hunger and Item (entity), plus knowledge of the game. Statuses were checked against `index.html` (the `js/*.js` modules are still empty stubs).

**Status:** **M** = missing · **P** = partial (exists but not like Minecraft) · **WIP** = another agent is building it now (items/inventory/crafting, combat/survival, Valheim content/day-night, mobile controls). WIP rows are not verified yet, because those modules have no code so far.

**Priority:** **P1** = core to feeling like Minecraft · **P2** = important · **P3** = nice to have.

**GUI sizes** are in Minecraft "GUI pixels". On screen, 1 GUI pixel = GUI scale × CSS pixels. Blockcraft's HUD currently draws at a fixed 2× scale.

**What Blockcraft already has (checked in the code):**
- **World:** a 160×160×64 island with about 22 block types, chunk meshing with AO and face shading.
- **Views:** first person and two third-person views (F5), sprint FOV zoom and view bobbing.
- **Movement:** walk 4.3, sprint 5.6 and sneak 1.3 m/s; sprint with double-tap W or Ctrl; jump; rise in water by holding jump.
- **Blocks:** 5-block reach. Holding the button breaks blocks instantly, one every 0.25 s. Right-click places once per click. Middle-click selects a block only if it is already in the hotbar. Black block outline. 16 flat-colored break cubes.
- **Hotbar:** a fixed 9-slot hotbar of unlimited blocks.
- **Health:** hearts go down when the Troll hits you, with a red screen flash, camera shake and knockback. At 0 you respawn at once and a death message appears in chat. Hunger and XP are drawn but never change.
- **Chat and HUD:** chat shows system messages only (6 lines, they fade after 8 s). F3 shows 8 lines. F1 hides the HUD. One custom toast.
- **Menus:** title screen (Singleplayer, Controls, splash text, a live rotating panorama, version and disclaimer) and a "Game Menu" (Back to Game, Controls).
- **Creatures:** pigs and sheep that only wander and cannot be hit, and a Forest Troll with a boss bar.
- **Sky:** fixed daytime with a square sun and flat scrolling clouds.
- **Sound:** synthesized sounds that are not positional, plus random piano notes.
- **Touch:** floating joystick with auto-jump, jump, sneak toggle, view, pause and full-screen buttons, tap to place, hold to break, tap a hotbar slot.
- **Extra:** a GTA-style character switch (Tab/Q).

**Key conflicts with Minecraft:** Q and Tab open the character wheel; in Minecraft, Q drops the held item and Tab shows the player list. M toggles music, which is not a Minecraft key.

---

## 1. Player inventory screen
| # | Requirement | Status | Priority |
|---|---|---|---|
| 1.1 | E opens and closes the inventory, and Esc also closes it. Opening frees the mouse cursor. The game keeps running behind it. | WIP | P1 |
| 1.2 | Panel 176×166 GUI px, color #C6C6C6, with a 2 px bevel (white top and left, #555555 bottom and right), a black outline with rounded pixel corners, and the world dimmed behind it | WIP | P1 |
| 1.3 | Slot art 18×18: #8B8B8B fill, #373737 top and left edge, #FFFFFF bottom and right edge. Items are drawn 16×16 at offset (1,1). | WIP | P1 |
| 1.4 | Layout: 27 storage slots (9×3) from (8,84) and a hotbar row (9×1) at (8,142) with a 4 px gap. The hotbar row mirrors the HUD hotbar. | WIP | P1 |
| 1.5 | 4 armor slots in a column from (8,8). Empty slots show helmet, chestplate, leggings and boots outlines. Each slot accepts only its own piece. Curse of Binding stops removal. | WIP | P1 |
| 1.6 | Offhand slot at (77,62) with a shield outline | WIP | P2 |
| 1.7 | Player model in a black frame from (26,8) to (75,78), drawn with the current skin and armor. Its head and body turn toward the mouse cursor. | M | P2 |
| 1.8 | 2×2 crafting grid at (98,18), arrow, result slot at (154,28), and the label "Crafting" in #404040 with no shadow | WIP | P1 |
| 1.9 | Items left in the 2×2 grid go back to the inventory when it closes, or drop on the ground if it is full | WIP | P1 |
| 1.10 | Active status effects listed to the left of the panel: icon, name with level ("Speed II") and time left ("1:30"). Icons only when the screen is narrow. | M | P3 |
| 1.11 | Green recipe-book button (20×18) at (104,61). Opening the book shifts the panel 77 px right. | WIP | P2 |
| 1.12 | The held stack follows the cursor and is drawn above everything. The hovered slot gets a white highlight at 50% opacity. | WIP | P1 |
| 1.13 | Left-click picks up or places a whole stack, swaps it with the held stack, or merges the same items | WIP | P1 |
| 1.14 | Right-click picks up half a stack (rounded up) or places one item | WIP | P1 |
| 1.15 | Left-drag splits the held stack evenly across the slots dragged over, with a live count preview. Right-drag places one item per slot. Middle-drag in creative fills full stacks. | WIP | P2 |
| 1.16 | Double-click gathers all items of that kind into the held stack, up to the stack limit | WIP | P2 |
| 1.17 | Shift-click quick-moves a stack between hotbar and storage, into armor slots, or into an open container. Shift + double-click moves every stack of that kind. | WIP | P1 |
| 1.18 | Keys 1–9 over a slot swap it with that hotbar slot. F over a slot swaps it with the offhand. | WIP | P2 |
| 1.19 | Q over a slot drops one item and Ctrl+Q drops the stack. Clicking outside the panel drops the held stack (right-click outside drops one). | WIP | P2 |
| 1.20 | Middle-click in creative copies a full stack | M | P3 |
| 1.21 | Closing the screen with a stack on the cursor puts it back in the inventory, or drops it if there is no room | WIP | P1 |
| 1.22 | Stack limits: 64 for most items. 16 for eggs, snowballs, ender pearls, signs, banners, empty buckets and honey bottles. 1 for tools, weapons, armor, potions, filled buckets, beds, boats, minecarts, saddles, music discs and cake. | WIP | P1 |
| 1.23 | Item count at the slot's bottom right, white with shadow, hidden when the count is 1 | WIP | P1 |
| 1.24 | Durability bar 13×2 px at the bottom of the slot on a black background. Its color goes from green to red, and it shows only when the item is damaged. | WIP | P1 |
| 1.25 | White cooldown sweep over an item while it cannot be used: ender pearl 1 s, shield 5 s after an axe hit, chorus fruit, goat horn, wind charge | M | P3 |
| 1.26 | Enchantment glint: an animated purple shimmer on icons, the held item and worn armor | M | P2 |
| 1.27 | Tooltip box: background #100010 at 94% opacity, 1 px border fading from #5000FF to #28007F, drawn 12 px right of and above the cursor and flipped to stay on screen | WIP | P1 |
| 1.28 | Tooltip content: name in its rarity color (white, yellow, aqua, light purple), enchantments in gray with Roman numerals, then "When in Main Hand:" with attack damage and speed in dark green, armor lines in blue. With advanced tooltips (F3+H): "Durability: 250 / 250" and the item id. | WIP | P2 |
| 1.29 | Renamed items show their name in italics | M | P3 |
| 1.30 | Bundle: holds mixed items up to 64 "weight", with a fill bar. Scroll in the tooltip to choose the item to take out. | M | P3 |
| 1.31 | Saved hotbars in creative: C+1–9 saves the hotbar and X+1–9 loads it | M | P3 |
| 1.32 | Creative inventory: 195×136 panel. Tabs: Building Blocks, Colored Blocks, Natural Blocks, Functional Blocks, Redstone Blocks, Saved Hotbars, Search, Tools & Utilities, Combat, Food & Drinks, Ingredients, Spawn Eggs, Survival Inventory. 9×5 item grid, scroll bar, a search box that takes focus when you type, and a destroy-item slot (shift-click it to clear the inventory). | M | P2 |

## 2. Recipe book and recipe unlocking
| # | Requirement | Status | Priority |
|---|---|---|---|
| 2.1 | Recipe book panel (147×166) left of the crafting screen. Crafting tabs: All (compass), Tools/Weapons/Armor, Building Blocks, Food/Miscellaneous, Redstone. Furnace tabs: All, Food, Blocks, Miscellaneous. | WIP | P2 |
| 2.2 | Search box that filters recipes by name | WIP | P2 |
| 2.3 | Filter button that switches between "Showing Craftable" and "Showing All" | WIP | P2 |
| 2.4 | Recipe buttons with a normal frame when craftable and a red frame when not. Recipes with variants (planks, beds) cycle through their outputs each second. Right-click shows a popup of the variants. | WIP | P2 |
| 2.5 | Clicking a recipe moves its ingredients into the grid, and shift-click fills as many as possible. Missing ingredients appear as red ghost items in the grid. | WIP | P2 |
| 2.6 | 20 recipes per page, with arrows and "1/3" page text | WIP | P3 |
| 2.7 | Recipes unlock when you first get an ingredient, and only unlocked recipes appear. New ones are highlighted until hovered. Toast "New Recipes Unlocked!" / "Check your recipe book" with the item icon. | M | P2 |
| 2.8 | The book's open or closed state and its filter are remembered for each screen | M | P3 |

## 3. Crafting rules and recipes
| # | Requirement | Status | Priority |
|---|---|---|---|
| 3.1 | Shaped recipes: the pattern can sit anywhere in the grid, and its left-right mirror also works | WIP | P1 |
| 3.2 | Shapeless recipes, such as flint and steel, dyes, book and mushroom stew | WIP | P1 |
| 3.3 | Ingredient groups: any planks, any log, any wool, any stone-tool material (cobblestone, blackstone, cobbled deepslate), any coal (coal or charcoal) | WIP | P1 |
| 3.4 | Result slot: a click takes one craft, and more clicks add to the held stack. Shift-click crafts the most possible straight into the inventory. Q drops a craft. Each craft uses one of each ingredient. Containers stay behind: crafting a cake returns empty buckets, honey bottles return glass bottles. | WIP | P1 |
| 3.5 | Starter recipe set: planks (4 from 1 log), sticks (4 from 2 planks), crafting table, torches (4), chest, furnace, all wooden, stone, iron, gold and diamond tools, armor, bow, arrows, fishing rod, shears, bucket, flint and steel, ladder (3), door (3), trapdoor (2), fence (3), fence gate, sign (3), boat, bed, bowl, bread, stairs (4), slab (6), glass pane (16), bookshelf, TNT, mineral blocks and back to ingots, nuggets, paper, book, compass, clock, map, rails, minecart, lever, button, pressure plate, redstone torch | P/WIP | P1 |
| 3.6 | The full vanilla recipe list (about 1,200 recipes in 1.21) | M | P3 |
| 3.7 | Smelting recipes: raw ore or ore to ingot, sand to glass, cobblestone to stone, stone to smooth stone, clay ball to brick, log to charcoal, raw meat and fish to cooked, potato to baked potato, cactus to green dye, wet sponge to sponge, kelp to dried kelp, netherrack to nether brick | M | P1 |
| 3.8 | Stonecutter recipes: 1 block to 1 stairs or 2 slabs, plus walls and chiseled and cut variants | M | P3 |
| 3.9 | Smithing recipes: netherite upgrade with a template, and armor trims (template + material) | M | P3 |

## 4. Crafting table and other functional blocks (each with its exact GUI)
| # | Requirement | Status | Priority |
|---|---|---|---|
| 4.1 | Crafting table block: recipe is 4 planks in a 2×2. Hardness 2.5, axe is fastest. Top texture shows a grid, front shows a saw and hammer, sides show tools. | WIP | P1 |
| 4.2 | Right-click opens the "Crafting" screen (176×166). Title "Crafting" at (29,6) in #404040. 3×3 grid at (30,17). Big arrow. Result slot in a 26×26 frame at (124,35). Label "Inventory" at (8,72). Player inventory at (8,84) with the hotbar at (8,142). | WIP | P1 |
| 4.3 | Recipe book button left of the grid. The book starts closed in Java and open in Bedrock. | WIP | P2 |
| 4.4 | Any container screen closes when the block is broken, when the player is more than about 8 blocks away, or on Esc or E. Items in a crafting grid go back to the inventory, or drop if it is full. | WIP | P1 |
| 4.5 | Sneak + right-click with a block in hand places it against a functional block instead of opening it | M | P1 |
| 4.6 | Furnace screen: title "Furnace" centered. Input slot (56,17), fuel slot (56,53), output slot (116,35). A 14×14 flame at (56,36) burns down to show fuel left, and a 24×17 arrow at (79,34) fills over the 10 s each item takes. "Inventory" label. Recipe book for smelting. | M | P1 |
| 4.7 | Furnace logic: keeps working with the screen closed. 200 ticks (10 s) per item. Fuel times: coal and charcoal 80 s (8 items), planks and logs 15 s (1.5 items), stick 5 s, block of coal 800 s, dried kelp block 200 s, blaze rod 120 s, lava bucket 1,000 s (100 items). Stops when the output is full or holds a different item. XP is stored and paid out when you take the result (iron 0.7, gold and diamond 1.0, cooked food 0.35, glass and stone 0.1 per item). | M | P1 |
| 4.8 | Lit furnace: lit front texture, light level 13, flame and smoke particles at the front, crackle sound. Hoppers feed input from the top and fuel from the side, and pull output from the bottom. | M | P2 |
| 4.9 | Blast furnace (ores, plus tools and armor into nuggets) and smoker (food) at twice the speed (100 ticks). Titles "Blast Furnace" and "Smoker". | M | P3 |
| 4.10 | Campfire and soul campfire: cooks 4 items on top in 30 s each, rising smoke, light 15 or 10, hurts you when you stand on it, put out with a shovel or water. Hay underneath makes a tall signal smoke. | M | P3 |
| 4.11 | Chest: 27 slots. Title "Chest" at (8,6), 3 rows of slots from (8,18), "Inventory" label at (8,72). | M | P1 |
| 4.12 | Double chest: two chests side by side join into one. Title "Large Chest", 6 rows, panel 176×222. | M | P1 |
| 4.13 | Chest block: lid opens while anyone is viewing it, with open and close sounds. Faces the player when placed. Will not open with a solid block on top. Drops its contents when broken. Trapped chest gives a redstone signal. | M | P1 |
| 4.14 | Ender chest: "Ender Chest", 27 slots shared by every ender chest for that player. Drops obsidian unless mined with Silk Touch. Portal-style particles. | M | P3 |
| 4.15 | Barrel ("Barrel", 27 slots, opens even with a block on top). Shulker box ("Shulker Box", keeps its contents as an item with a tooltip list, 16 colors, opens with a shell animation). | M | P3 |
| 4.16 | Enchanting table: "Enchant" screen with an item slot, a lapis slot and 3 offers. Each offer shows Standard Galactic text, a level requirement and a lapis cost of 1–3. Hovering shows one guaranteed enchantment ("Sharpness II . . . ?"). A floating book opens when a player is near. | M | P2 |
| 4.17 | Bookshelves: up to 15 placed 2 blocks away with an air gap raise offers to level 30. Glyph particles fly from the shelves to the table. | M | P3 |
| 4.18 | Anvil: "Repair & Name" screen with two inputs and a rename text box. Cost text "Enchantment Cost: N" in green, or red when you cannot afford it, and "Too Expensive!" at 40 levels or more. Anvil gets chipped and then damaged, and falls like sand. | M | P2 |
| 4.19 | Grindstone ("Repair & Disenchant"): removes enchantments, gives back some XP, combines two damaged tools | M | P3 |
| 4.20 | Smithing table ("Upgrade Gear"): template, base and material slots, plus an armor preview | M | P3 |
| 4.21 | Stonecutter ("Stonecutter"): one input slot and a scrolling grid of buttons for the results | M | P3 |
| 4.22 | Loom (banner patterns), cartography table (copy, zoom and lock maps) | M | P3 |
| 4.23 | Brewing stand: "Brewing Stand" screen with a blaze-powder fuel bar (20 brews), an ingredient slot, 3 bottle slots, rising bubbles and an arrow animation. Brewing takes 20 s. | M | P3 |
| 4.24 | Potions: awkward base from nether wart. Redstone makes them last longer and glowstone makes them stronger. Fermented spider eye corrupts them. Gunpowder turns them into splash potions and dragon's breath into lingering ones. | M | P3 |
| 4.25 | Hopper ("Item Hopper", 5 slots, moves 2.5 items per second). Dropper and dispenser ("Dropper", "Dispenser", 3×3). Crafter (1.21): 3×3 grid with slots you can switch off, crafts on a redstone pulse. | M | P3 |
| 4.26 | Bed: 16 colors, 2 blocks long. Right-click at night or in a thunderstorm to sleep: the screen fades and a "Leave Bed" button appears. Sleeping skips to morning and clears the weather. Messages "Respawn point set", "You can sleep only at night or during thunderstorms", "You may not rest now; there are monsters nearby", "You may not rest now; the bed is too far away". Beds explode in the Nether and the End. | M | P1 |
| 4.27 | Lectern (books for others to read), composter (7 levels give bone meal), bee nest and beehive (honey, honeycomb), cauldron (water, lava or powder snow; washes dyed leather and banners), jukebox (music discs with note particles), note block (instrument depends on the block below, 25 pitches), bell, lodestone, beacon (pyramid, 6 effects, own GUI), conduit, respawn anchor | M | P3 |

## 5. Items, tools and dropped items
| # | Requirement | Status | Priority |
|---|---|---|---|
| 5.1 | Tool tiers wood, stone, iron, gold, diamond and netherite, with durability 59, 131, 250, 32, 1,561 and 2,031 | WIP | P1 |
| 5.2 | Pickaxe, axe, shovel, hoe and sword in each tier, each with its own attack damage and attack speed | WIP | P1 |
| 5.3 | Harvest levels: a wood or gold pickaxe mines stone and coal; stone adds iron, copper and lapis; iron adds gold, diamond, redstone and emerald; diamond adds obsidian and ancient debris | WIP | P1 |
| 5.4 | Durability: tools lose 1 per block mined and 2 per hit when used as a weapon; swords lose 2 per block. A break sound plays and particles appear when a tool breaks, and the item disappears. | WIP | P1 |
| 5.5 | Tool right-click uses: an axe strips logs (and scrapes wax or rust off copper); a shovel makes dirt paths and puts out campfires; a hoe turns dirt and grass into farmland | M | P2 |
| 5.6 | Shears: shear sheep, collect leaves, vines and cobwebs, carve pumpkins | M | P2 |
| 5.7 | Flint and steel: lights fire, nether portals, TNT, candles and campfires | M | P2 |
| 5.8 | Bucket, water bucket, lava bucket, milk bucket, bucket of fish or axolotl, powder snow bucket | M | P1 |
| 5.9 | Fishing rod: cast a bobber, a bite shows a splash and a particle trail, reel in to get fish, junk or treasure; it can also pull mobs | M | P2 |
| 5.10 | Compass (points to world spawn or a lodestone), recovery compass (points to your last death), clock (shows the time of day), spyglass (zoom view with a scope overlay) | M | P3 |
| 5.11 | Maps: an empty map is crafted from paper and a compass. It fills in as you explore at 1:1, can be zoomed out (1:2 to 1:16) at a cartography table, shows your position arrow and banner markers, and is held in both hands as a big map. | M | P3 |
| 5.12 | Food: apple 4/2.4 (hunger/saturation), bread 5/6, cooked porkchop and steak 8/12.8, cooked chicken 6/7.2, cooked mutton 6/9.6, cooked cod 5/6, baked potato 5/6, carrot 3/3.6, golden carrot 6/14.4, melon slice 2/1.2, cookie 2/0.4, pumpkin pie 8/4.8, stews 6/7.2 (bowl returned), sweet and glow berries, dried kelp. Cake is placed as a block and has 7 slices of 2 hunger each. | WIP | P1 |
| 5.13 | Food with side effects: rotten flesh (80% chance of Hunger), raw chicken (30% chance of Hunger), spider eye (Poison), pufferfish, poisonous potato, chorus fruit (random teleport), golden apple (Regeneration II and Absorption), enchanted golden apple, honey bottle (cures Poison), milk bucket (clears all effects), suspicious stew | WIP | P2 |
| 5.14 | Eating: hold use for 1.6 s (32 ticks; dried kelp takes half that). The item bobs at your mouth with crumb particles and a munch sound, then a burp. You walk at 20% speed while eating. You cannot eat at full hunger, except golden apples, chorus fruit, milk and suspicious stew. | WIP | P1 |
| 5.15 | Armor: leather (dyeable), chainmail, iron, gold, diamond and netherite, plus a turtle shell helmet. Full-set armor points: leather 7, gold 11, chain 12, iron 15, diamond and netherite 20. Toughness: diamond 2, netherite 3. Equip by right-clicking, with an equip sound for each material. | WIP | P1 |
| 5.16 | Materials: coal, charcoal, raw iron, gold and copper, ingots, nuggets, diamond, emerald, lapis, redstone, quartz, netherite scrap and ingot, amethyst shard, flint, clay ball, brick, bone, bone meal, gunpowder, leather, feather, string, slimeball, ender pearl, blaze rod, ghast tear, phantom membrane, 16 dyes, paper, book | M | P1 |
| 5.17 | Bone meal: grows crops, saplings, grass and flowers, with green sparkle particles | M | P2 |
| 5.18 | Other items: torches as items, firework rockets and stars, bottle o' enchanting, book and quill (an "Edit Book" screen with pages and a Sign button), written book, music discs, goat horn, totem, nether star, eye of ender, elytra, lead, name tag, saddle, spawn eggs | M | P3 |
| 5.19 | Item looks: flat items (tools, food, ingots) are drawn as 16×16 sprites pushed out 1 pixel thick in 3D, in the hand, in item frames and on the ground. Blocks are drawn as small cubes. Tools are held at a diagonal. | M | P1 |
| 5.20 | Dropped items are real entities, a quarter block in size. They spin about 57° per second and bob between 0.06 and 0.26 blocks. A stack shows 1–5 copies (1; 2–16; 17–32; 33–48; 49+). | WIP | P1 |
| 5.21 | Item pickup: anything within 1 block sideways and 0.5 block up is picked up. Delay before pickup: 10 ticks for mined drops, 40 ticks for items you throw. The item flies into the player with a pop sound at a random pitch. It goes into the hotbar first, then storage. | WIP | P1 |
| 5.22 | Dropping with Q throws the item forward from the eyes with a small random spread. Ctrl+Q throws the whole stack. | WIP | P1 |
| 5.23 | Item entities merge with matching stacks nearby (0.5 block) and despawn after 6,000 ticks (5 minutes). They float up in water, burn in fire and lava (except netherite), are destroyed by cacti and explosions, and are pushed by water currents. | WIP | P1 |

## 6. Breaking and placing blocks
| # | Requirement | Status | Priority |
|---|---|---|---|
| 6.1 | Survival break time: base time = hardness × 1.5 s with a tool that can harvest the block, or × 5 s without one. Divide by the tool speed: hand 1, wood 2, stone 4, iron 6, diamond 8, netherite 9, gold 12. Efficiency adds level² + 1. Haste adds 20% per level. Mining Fatigue multiplies by 0.3^level. Breaking is 5× slower with your head underwater (unless you have Aqua Affinity) and 5× slower when you are not on the ground. | WIP | P1 |
| 6.2 | Hardness values: dirt and sand 0.5, grass block and gravel 0.6, stone 1.5, cobblestone, logs and planks 2, ores and deepslate 3, obsidian 50, leaves 0.2, glass 0.3, flowers and tall grass 0 (instant). Bedrock cannot be broken. | WIP | P1 |
| 6.3 | A block breaks instantly when the speed is more than hardness × 30. Otherwise there is a 6-tick (0.3 s) pause before the next block starts. Creative breaks everything instantly with 0.3 s between blocks, but swords, tridents, maces and the debug stick cannot break blocks in creative. | P (instant, 0.25 s apart) | P1 |
| 6.4 | Crack overlay in 10 stages over the targeted block. Progress resets if you look away or let go. | WIP | P1 |
| 6.5 | While mining: small texture chips fly off the face you are hitting, a hit sound plays every 4 ticks (0.2 s), and the hand or tool keeps swinging | M | P1 |
| 6.6 | Break particles: about 64 small pieces cut from the block's own texture (grass and leaves keep their tint). They fall with gravity and land on blocks. | P (16 flat-colored cubes) | P2 |
| 6.7 | Drops: stone gives cobblestone; grass block gives dirt; glass, ice and glass panes give nothing without Silk Touch. Leaves drop saplings 5%, sticks 2%, apples 0.5% (oak, dark oak). Tall grass drops wheat seeds 12.5%. Gravel drops flint 10%. Coal ore drops coal and 0–2 XP. Iron, gold and copper ore drop raw metal. Diamond ore drops a diamond and 3–7 XP. Redstone ore drops 4–5 dust and lapis ore drops 4–9 lapis. | WIP | P1 |
| 6.8 | Reach: blocks within 4.5 blocks in survival and 5 in creative; entities within 3 in survival and 5 in creative | P (5 blocks, 4.2 entities) | P2 |
| 6.9 | Holding use places blocks again every 4 ticks (0.2 s) | P (once per click) | P1 |
| 6.10 | Placing is blocked only where an entity's hitbox would overlap (players, mobs, boats; dropped items do not block). Placing replaces air, water, lava, tall grass, ferns, dead bushes, one snow layer, vines and fire. | P (checks players only) | P2 |
| 6.11 | Each block placed is taken from the stack in survival. A place sound plays for the material and the hand swings. | WIP | P1 |
| 6.12 | Sneak + use places against chests, doors and tables instead of using them | M | P1 |
| 6.13 | Logs, pillars, basalt and hay follow the axis of the face you click | M | P1 |
| 6.14 | Stairs face away from the player, flip upside down when you click the top half of a face, and form inner and outer corners next to other stairs | M | P2 |
| 6.15 | Slabs: bottom or top half depending on where you click, and a second slab of the same type joins into a double slab | M | P1 |
| 6.16 | Doors: 2 blocks tall. The hinge side is chosen from the blocks next to them. Wooden doors open by hand with open and close sounds, and double doors open together. | M | P1 |
| 6.17 | Trapdoors: top or bottom half, flip open by hand, can be climbed like ladders when placed over one | M | P2 |
| 6.18 | Furnaces, chests, pumpkins, dispensers, observers and other directional blocks face the player when placed | M | P1 |
| 6.19 | Torches stand on top of a block or lean against a wall, depending on the face you click | M | P1 |
| 6.20 | Signs: standing signs turn in 16 steps; wall signs and hanging signs. Placing one opens the sign editor (4 lines, front and back sides). Dye colors the text, glow ink sac makes it glow, honeycomb waxes the sign so it cannot be edited. | M | P2 |
| 6.21 | Connecting blocks: fences link to neighbors and solid faces and are 1.5 blocks tall to collide with; fence gates; walls with posts; glass panes and iron bars link to neighbors | M | P2 |
| 6.22 | Support: torches, flowers, saplings, crops, rails, carpets, buttons, ladders, doors and signs pop off as items when the block holding them is removed. Flowers grow only on dirt and grass, sugar cane only next to water, and cactus only with no block beside it. | P (the plant above vanishes, no drop) | P1 |
| 6.23 | Pick block (middle-click): in survival, selects the matching hotbar slot or moves the item from storage into the selected slot. In creative it creates the item, and Ctrl + middle-click copies its contents. | P (only if already in the hotbar) | P2 |
| 6.24 | The outline follows the block's real shape (slab, stairs, flower box) with black lines at 40% opacity. A high-contrast outline option exists. | P (always a full cube) | P3 |
| 6.25 | Adventure mode: blocks can be broken or placed only with items allowed to do so | M | P3 |

## 7. Block catalog
| # | Requirement | Status | Priority |
|---|---|---|---|
| 7.1 | Natural ground: grass block (biome-tinted top and side overlay), dirt, coarse dirt, podzol, mycelium, rooted dirt, mud, clay, gravel, sand, red sand, snow layer, snow block, ice, packed ice, blue ice | P (grass, dirt, sand) | P1 |
| 7.2 | Stone: stone, cobblestone, mossy cobblestone, granite, diorite and andesite (plus polished), deepslate (cobbled, polished, tiles, bricks), tuff, calcite, dripstone, smooth stone, obsidian, crying obsidian, bedrock | P (stone, cobble, bedrock) | P1 |
| 7.3 | Ores in stone and deepslate versions: coal, copper, iron, gold, redstone (glows when touched), lapis, diamond, emerald. Nether gold ore, nether quartz ore, ancient debris. | P (coal and iron only) | P1 |
| 7.4 | Mineral blocks: coal, iron (exists), gold, diamond, emerald, lapis, redstone, raw ore blocks, amethyst. Copper with 4 rust stages, waxed and cut copper. | P | P3 |
| 7.5 | Full oak set: log, stripped log, wood, planks, stairs, slab, fence, fence gate, door, trapdoor, button, pressure plate, sign, hanging sign, boat, leaves, sapling | P (log, planks, leaves) | P1 |
| 7.6 | The other 10 wood sets: spruce, birch, jungle, acacia, dark oak, mangrove, cherry, bamboo, crimson, warped | M | P2 |
| 7.7 | 16-color blocks: wool, carpet, concrete, concrete powder, terracotta, glazed terracotta, stained glass and panes, beds, banners, candles, shulker boxes | P (gray concrete only) | P2 |
| 7.8 | Building blocks: bricks (exist), stone bricks (mossy, cracked, chiseled), sandstone and red sandstone (cut, chiseled, smooth), quartz variants, prismarine, nether bricks, end stone bricks, purpur, mud bricks, tuff bricks | P | P2 |
| 7.9 | Plants: grass and tall grass (2 tall), ferns, dead bush, the flowers (dandelion and poppy exist; blue orchid, allium, azure bluet, 4 tulips, oxeye daisy, cornflower, lily of the valley, sunflower, lilac, rose bush, peony, torchflower, pitcher plant), mushrooms, sugar cane, vines, lily pad, sweet berry bush, bamboo, kelp, seagrass, coral, moss, azalea, glow lichen, spore blossom, dripleaf | P | P2 |
| 7.10 | Cactus model: 14/16 wide with the top inset. It hurts on touch and breaks if any block is placed beside it. | P (full cube, harmless) | P2 |
| 7.11 | Light blocks: torch, soul torch, lantern, glowstone, sea lantern, jack o'lantern, shroomlight, end rod, redstone lamp, froglight, candles | M | P1 |
| 7.12 | Utility blocks: ladder, scaffolding, cobweb, hay bale, sponge, slime block, honey block, TNT, bookshelf, chiseled bookshelf, flower pot, item frame, painting (random size and motif), armor stand, banner, mob heads | M | P2 |
| 7.13 | Waterlogging: slabs, stairs, fences, walls, leaves, signs and similar blocks can hold water | M | P3 |
| 7.14 | Nether and End blocks: netherrack, soul sand, soul soil, basalt, blackstone, magma block, nether wart block, glowstone, nylium, end stone, purpur, chorus plant | M | P3 |
| 7.15 | Textures: 16×16 pixel art in Minecraft's style, with the right top, side and bottom per block. Animated textures for water, lava, fire, nether portal, sea lantern, magma and prismarine. | P (drawn in code, nothing animated) | P2 |
| 7.16 | Non-cube block models: slabs, stairs, fences, panes, torches, crops (drawn as a # shape), flat ladders and rails, carpets (1/16 tall), snow layers (1–8), cake, chests (14/16), lanterns, buttons, doors, beds | M (only cubes and X-shaped plants) | P1 |

## 8. Block behavior and world simulation
| # | Requirement | Status | Priority |
|---|---|---|---|
| 8.1 | Random ticks: 3 random blocks per 16×16×16 section every tick (randomTickSpeed 3). They drive growth, spreading, decay and melting. | M | P1 |
| 8.2 | Falling blocks: sand, red sand, gravel, concrete powder, anvils and scaffolding fall as entities when unsupported. They break into an item when they land on a torch or slab, and they suffocate players. | M | P1 |
| 8.3 | Water flow: source blocks plus 7 flow levels. Water spreads up to 7 blocks on flat ground and falls without limit. It heads for the nearest drop within 4 blocks and updates every 5 ticks. The surface slopes, and the current pushes players, mobs and items. | M (holes fill at once from neighbors) | P1 |
| 8.4 | Two water sources with a gap between them make a new source (infinite water) | M | P2 |
| 8.5 | Lava flow: spreads 3 blocks in the Overworld and 7 in the Nether, updates every 30 ticks, light 15. It sets fire to things nearby and burns items. | M | P2 |
| 8.6 | Lava meeting water: a lava source becomes obsidian, flowing lava becomes cobblestone, and lava flowing onto water makes stone. Basalt forms from lava next to soul soil and blue ice. | M | P2 |
| 8.7 | Using buckets: pick up and place water and lava sources, milk cows | M | P1 |
| 8.8 | Leaves decay: leaves more than 6 blocks from a log decay on random ticks and drop saplings, sticks and apples. Leaves placed by the player never decay. | M | P2 |
| 8.9 | Saplings grow into trees on random ticks with light 9 or more and enough room. 2×2 saplings make big spruce, jungle and dark oak trees. Bone meal gives a 45% chance of growth per use. | M | P2 |
| 8.10 | Farmland: a hoe tills dirt or grass. Farmland within 4 blocks of water is hydrated (darker texture); otherwise it dries back to dirt. Jumping or falling on it tramples it. | M | P1 |
| 8.11 | Crops grow in stages: wheat 8 stages from seeds, carrots, potatoes and beetroot 4 visible stages. They need light 9 or more and grow on random ticks. Grown crops drop more, and Fortune adds more. | M | P1 |
| 8.12 | Pumpkin and melon stems (8 stages) grow fruit onto a free block next to them. Shears carve a pumpkin, and a torch with it makes a jack o'lantern. | M | P2 |
| 8.13 | Sugar cane grows to 3 tall next to water. Cactus grows to 3 and deals 1 damage per 0.5 s. Bamboo grows to 12–16. Also kelp, sweet berries (they hurt and slow), cocoa beans, and nether wart on soul sand. | M | P2 |
| 8.14 | Grass spreads to nearby dirt in light 9 or more. Grass under an opaque block turns to dirt. Mycelium spreads the same way. | M | P2 |
| 8.15 | In cold biomes, snow layers build up while it snows and water freezes to ice. Ice and snow melt near light 12 or more. Broken ice turns into water if a block is below it. | M | P3 |
| 8.16 | Fire spreads to flammable blocks (planks, logs, leaves, wool, grass), burns them away and then dies out. Rain puts it out. Netherrack burns forever, and soul fire burns on soul sand. | M | P2 |
| 8.17 | TNT: lit by flint and steel, fire, redstone or a burning arrow. It flashes white for a 4 s (80-tick) fuse, then explodes with power 4, breaking blocks (some drop), hurting and knocking back entities, and setting off nearby TNT with short random fuses. | M | P2 |
| 8.18 | Explosions in general: creeper (power 3, or 6 when charged), bed in the Nether, ghast fireball, end crystal. Explosion and smoke particles, loud sound, block drops. | M | P2 |
| 8.19 | Redstone dust: power 0–15, losing 1 per block. It connects in lines and corners and gets brighter with more power. | M | P3 |
| 8.20 | Redstone power sources: lever, buttons (stone 1 s, wood 1.5 s, arrows press wooden ones), pressure plates (stone, wood, weighted), redstone torch (inverter), block of redstone, daylight detector, target block, tripwire hook, trapped chest, observer, sculk sensor | M | P3 |
| 8.21 | Redstone parts: repeater (1–4 tick delay, locking), comparator (compare and subtract, reads containers), piston and sticky piston (push limit 12, slime and honey blocks), redstone lamp, powered doors, trapdoors and fence gates, rails (powered, detector, activator) | M | P3 |
| 8.22 | Iron doors and iron trapdoors open only with redstone. Wooden ones open by hand too. | M | P2 |
| 8.23 | Mob griefing: endermen pick up blocks, creepers blow up blocks, zombies break doors on Hard, sheep eat grass into dirt, rabbits eat carrots, villagers farm | M | P3 |
| 8.24 | Simulation distance: blocks and entities tick only in chunks within the simulation distance (default 12 chunks) | M | P3 |

## 9. Lighting and rendering
| # | Requirement | Status | Priority |
|---|---|---|---|
| 9.1 | Light engine: sky light 0–15 from the open sky downward and block light from light sources. Both drop by 1 per block and flood through transparent blocks. Water and leaves dim light by 1. | M | P1 |
| 9.2 | Light levels of sources: torch 14, lantern, glowstone, sea lantern, jack o'lantern, lava, fire and campfire 15, end rod 14, lit furnace 13, soul torch 10, redstone torch 7, glow lichen 7, magma block 3 | M | P1 |
| 9.3 | Brightness curve: level 0 is dark but not pure black, controlled by the Brightness option (Moody to Bright). Block light is warm and flickers slightly. | M | P1 |
| 9.4 | Smooth lighting: light and AO averaged at each corner of a face (only AO today) | P | P2 |
| 9.5 | Sky light follows the time of day (it sinks to level 4 at night), and lightning flashes the sky | M | P1 |
| 9.6 | Leaves: Fancy shows see-through cutout leaves with inner faces; Fast shows solid dark leaves | P | P3 |
| 9.7 | Translucent blocks (water, stained glass, ice, slime, honey) are drawn back to front. The underside of the water surface is visible from below. | P | P2 |
| 9.8 | Water look: animated still and flowing textures, biome water color (default #3F76E4), surface at 14/16 height (matches today), sloped flowing water | P | P2 |
| 9.9 | Biome colors for grass, leaves and water from a colormap, blended over 5×5 blocks | M | P2 |
| 9.10 | Fog that starts near the edge of render distance and fades into the sky color. Thick blue fog underwater, orange in lava, white in powder snow, denser in rain. | P (fixed distance fog) | P2 |
| 9.11 | Sky color by time of day, an orange sunrise and sunset band at the horizon, and a dark lower sky when you are below sea level | WIP | P1 |
| 9.12 | Sun (exists, fixed) and moon follow one east-to-west arc. The moon has 8 phases, one per night. Stars come out at night. | WIP | P1 |
| 9.13 | Clouds at about y 192. Fast = one flat layer (as today); Fancy = 3D boxes 4 blocks thick with shaded sides. Clouds drift slowly and can be turned off. | P | P3 |
| 9.14 | Round shadow blobs under mobs, players and dropped items | M | P3 |
| 9.15 | Render distance in chunks with a chunk fade-in. Chunks are built bit by bit without freezing the game. | M | P1 |
| 9.16 | Mipmaps (0–4) so distant textures don't shimmer | M | P3 |
| 9.17 | Entity effects: red tint for 0.5 s when hurt. On death the body tips 90° onto its side over 20 ticks, then vanishes in a puff of white smoke. Name tags float above. A sneaking player's name tag is faded and hidden behind walls. | P (Troll red tint only) | P1 |
| 9.18 | Particle system with 8×8 sprite particles: block chips, smoke, flame, explosion, splash, bubbles, water and lava drips, rain splash, hearts, angry and happy villager, crit stars, enchanted hit, damage hearts, notes, portal, totem, sweep, campfire smoke, falling leaves, spores, ash, snowflakes, redstone dust | M (only cube bursts) | P2 |
| 9.19 | First-person hand: your right arm in your skin shows when the hand is empty. Each item type is held its own way. When you switch slots, the item dips down and comes back up. The swing takes 6 ticks. The hand bobs while walking and lags slightly when you turn. | P (always a block; swing and bob exist) | P1 |
| 9.20 | Screen overlays: underwater tint, the block's texture when your head is inside a block, flames at the bottom of the screen while burning, pumpkin mask, powder snow frost, purple nether-portal swirl, spyglass scope, nausea wobble, darkness pulsing | M | P2 |
| 9.21 | Vignette: screen edges darken more when it is darker around you | M | P3 |
| 9.22 | Damage tilt: when hurt, the camera rolls briefly toward the side the hit came from. Minecraft has no full-screen red flash. | P (red flash and shake instead) | P2 |
| 9.23 | FOV changes: sprint (+15%), Speed and Slowness effects, zooming in while drawing a bow. FOV slider 30–110 and an "FOV Effects" strength slider. | P (sprint only) | P2 |
| 9.24 | The crosshair is hidden in the third-person views | M (always shown) | P3 |

## 10. World generation and dimensions
| # | Requirement | Status | Priority |
|---|---|---|---|
| 10.1 | Infinite world: chunks load and unload around the player within the render distance | M (fixed 160×160) | P1 |
| 10.2 | Seeds: a number or text gives the same world every time. Shown by /seed and set on the Create World screen. | M | P2 |
| 10.3 | World height −64 to 320, deepslate below y 0, a rough bedrock floor 5 layers thick at −64, sea level 63 | M (0–64, sea at 7) | P2 |
| 10.4 | 3D noise terrain shaped by continentalness, erosion, and peaks and valleys: mountains up to about y 256, overhangs, cliffs, plateaus | M | P2 |
| 10.5 | Biomes: plains, sunflower plains, forest, flower forest, birch forest, dark forest, taiga, snowy plains and taiga, desert (exists), savanna, jungle, swamp, mangrove swamp, badlands, mushroom fields, ocean types, rivers, beaches, stony shore, cherry grove, meadow, groves and peaks | P (grass and desert) | P1 |
| 10.6 | Biome features: tree types per biome (oak, birch, spruce, jungle, acacia, dark oak, mangrove, cherry), flowers per biome, cactus and dead bushes in deserts, snow cover, temperature and rainfall | P | P1 |
| 10.7 | Caves: cheese, spaghetti and noodle caves, carved tunnels and ravines, aquifers, lava pools below y −55, cave mouths at the surface | M | P1 |
| 10.8 | Cave biomes: lush caves (azalea, moss, glow berries, axolotls), dripstone caves, deep dark (sculk, ancient city) | M | P3 |
| 10.9 | Ore heights: coal 0–320 (most around 96), iron (peaks at 16 and 232), copper (48), gold (−16), redstone (deep), lapis (0), diamond (most below −50), emerald (mountains only). Veins of 4–17 ores, and large copper and iron veins. | P (coal and iron on cliffs) | P1 |
| 10.10 | Surface features: pumpkins, sweet berry bushes, mossy boulders in taiga, ice spikes, fossils, amethyst geodes, lava lakes, single water and lava springs in cliffs | P | P2 |
| 10.11 | Villages: 5 styles (plains, desert, savanna, taiga, snowy), houses, paths, farms, workstation blocks, bells, villagers, iron golem | M | P2 |
| 10.12 | Small structures: dungeons (spawner and 2 chests), mineshafts (rails, cave spider spawners, chest minecarts), desert temple (TNT trap), jungle temple, igloo, swamp hut, ruined portals, shipwrecks, ocean ruins, buried treasure | M | P2 |
| 10.13 | Large structures: pillager outpost, woodland mansion, ocean monument, stronghold (End portal), ancient city, trail ruins, trial chambers (1.21, vaults and trial spawners) | M | P3 |
| 10.14 | Loot chests in structures, filled from loot tables the first time they are opened | M | P2 |
| 10.15 | World spawn on land near the world center. Players appear within 10 blocks of it (spawnRadius) on a safe block. | P (fixed home spots) | P2 |
| 10.16 | Oceans: normal and deep; warm, lukewarm, cold and frozen. Kelp, seagrass, coral reefs, icebergs. | M (one flat sea plane) | P2 |
| 10.17 | Rivers and beaches between biomes | M | P2 |
| 10.18 | World types: Default, Superflat (custom layers and presets), Large Biomes, Amplified, Single Biome. Bonus chest option. | M | P3 |
| 10.19 | Nether portal: an obsidian frame (4×5 up to 23×23) lit with fire. Purple swirling portal with a 4 s wait and a whoosh sound. Links to the Nether at 8:1 distance. | M | P2 |
| 10.20 | Nether: no sky, red fog, lava sea at 31, biomes (nether wastes, crimson and warped forests, soul sand valley, basalt deltas), fortresses, bastions, netherite | M | P3 |
| 10.21 | The End: eyes of ender, stronghold, End portal frames, Ender Dragon fight, exit portal, end gateways, End cities with elytra, credits screen | M | P3 |
| 10.22 | World border: a visible striped wall, default about 30 million blocks | P (invisible stop at the island edge) | P3 |

## 11. Player movement and physics
| # | Requirement | Status | Priority |
|---|---|---|---|
| 11.1 | Exact speeds: walk 4.317 m/s, sprint 5.612, sneak 1.295, sprint-jumping about 7.1. Physics runs on 20 ticks per second with smoothing between ticks (ground friction 0.6 × 0.91, air 0.91, gravity 0.08 blocks/tick², drag 0.98). | P (close, frame-based) | P2 |
| 11.2 | Jump height 1.25 blocks. A sprint-jump adds a forward boost. | P (about 1.35) | P2 |
| 11.3 | Hitbox 0.6×1.8, eyes at 1.62. Sneaking lowers the hitbox to 1.5 and the eyes to 1.27, so you fit under 1.5-block gaps. | P (eyes drop 0.15, hitbox stays the same) | P2 |
| 11.4 | You can walk up 0.6-block steps (slabs, carpets, paths) without jumping | M | P2 |
| 11.5 | Sneaking stops you from walking off edges, so you can lean out to build below | M | P1 |
| 11.6 | Sprinting: double-tap W within 7 ticks (0.35 s) or hold Ctrl. It stops when you hit a wall, sneak, use an item, have 6 hunger or less, or are blinded. Block dust kicks up from your feet. Option to toggle sprint instead of holding it. | P (no stop rules, no dust) | P1 |
| 11.7 | Fall damage: 1 per block fallen beyond 3. Feather Falling and hay bales (−80%) reduce it. Landing in water, cobweb, powder snow, on a ladder or vines, or bouncing on a bed or slime block cancels it. Dust particles and "small fall" or "big fall" sounds on landing. | WIP | P1 |
| 11.8 | Swimming: hold jump to rise and bob at the surface. Sprint in water to swim in a flat 1-block-tall pose, faster, and steer up and down with the camera. Water slows walking. Depth Strider and Dolphin's Grace speed you up. | P (rise only) | P2 |
| 11.9 | Splash particles and sound when entering water, bubble particles while underwater, swim sounds | M | P2 |
| 11.10 | Moving in lava is very slow and you sink | M | P2 |
| 11.11 | Climbing ladders, vines, scaffolding and twisting or weeping vines: walk into them to climb at about 2.35 m/s, sneak to hold still, slow controlled fall | M | P1 |
| 11.12 | Special surfaces: ice is slippery (blue ice most), soul sand slows you, honey slows you and stops jumps, slime bounces and cancels fall damage, cobweb slows you heavily, sweet berry bushes slow and hurt, powder snow makes you sink (leather boots walk on it), magma burns unless you sneak, dirt paths are 15/16 tall | M | P2 |
| 11.13 | Crawling in a 1-block-tall pose when squeezed under a trapdoor or into a 1-high gap | M | P3 |
| 11.14 | Boats: place on water, paddle with oars and a paddle sound, carry 2 (or 1 plus a chest), drop as an item when broken | M | P2 |
| 11.15 | Other riding: minecarts on rails, horses (tame, saddle, jump bar), pigs with a carrot on a stick, striders, camels (2 riders), llama caravans | M | P3 |
| 11.16 | Elytra gliding with firework rocket boosts | M | P3 |
| 11.17 | Creative flying: double-tap jump to start and stop, jump to rise, sneak to sink, 10.9 m/s (21.8 m/s when sprinting), no fall damage. Touching the ground ends flight. | M | P1 |
| 11.18 | Spectator mode: fly through blocks, see the world from a mob's eyes | M | P3 |
| 11.19 | Knockback from hits and explosions. Players and mobs push each other apart. | P (Troll knockback only) | P2 |
| 11.20 | Void: below y −128 you take 4 damage every 0.5 s until you die, instead of being teleported | P (teleport at y −30) | P2 |
| 11.21 | Footsteps: one step sound per block or so walked, using the block under your feet (or carpet or snow on top of it) | P | P2 |

## 12. Health, hunger and survival
| # | Requirement | Status | Priority |
|---|---|---|---|
| 12.1 | Game modes: Survival, Creative (flying, unlimited blocks, instant breaking, no hunger or damage, no health HUD), Adventure, Spectator. Switch with /gamemode or F3+F4. | M (a creative/survival mix) | P1 |
| 12.2 | Difficulty: Peaceful (no hostile mobs, health refills, no hunger loss), Easy, Normal, Hard (mob damage roughly ×0.5+1, ×1, ×1.5), Hardcore (one life, Hard locked, different hearts). Difficulty lock button. | M | P1 |
| 12.3 | Health 20 (10 hearts). Natural regeneration: 1 HP every 4 s when hunger is 18 or more (costs 6 exhaustion). At full hunger with saturation, 1 HP every 0.5 s. | WIP (Troll damage already lowers hearts) | P1 |
| 12.4 | After taking damage you are protected for 10 ticks (0.5 s); during that time only a bigger hit does the difference | WIP | P1 |
| 12.5 | Hunger 20 with hidden saturation (never above hunger). Every 4.0 exhaustion uses 1 saturation, or 1 hunger once saturation is gone. Exhaustion costs: sprint 0.1 per meter, jump 0.05, sprint-jump 0.2, swim 0.01 per meter, mining 0.005 per block, attack 0.1, damage taken 0.1, healing 6. | WIP | P1 |
| 12.6 | Starvation at 0 hunger: 1 damage every 4 s, stopping at 10 HP on Easy and 1 HP on Normal; on Hard it kills | WIP | P1 |
| 12.7 | Drowning: 300 ticks (15 s) of air shown as 10 bubbles. When they run out, 2 damage per second. Air refills fast at the surface. Respiration, Water Breathing, conduits and the turtle helmet help. | WIP | P1 |
| 12.8 | Burning: fire sets you alight for 8 s and lava for 15 s, 1 damage per second, a burning look on entities and flames in first person. Water and rain put it out. Fire Resistance blocks it. | M | P2 |
| 12.9 | Lava: 4 damage every 0.5 s on top of burning | M | P2 |
| 12.10 | Suffocation inside a solid block: 1 damage every 0.5 s, with the block-texture overlay | M | P2 |
| 12.11 | Touch damage: cactus 1, sweet berry bush 1, magma block 1, campfire 1. Freezing in powder snow: 1 damage every 2 s after 7 s, with blue hearts. | M | P2 |
| 12.12 | Lightning strike: 5 damage and fire | M | P3 |
| 12.13 | Death screen: "You died!" ("Game over!" in Hardcore) over a red tint, the death message, "Score: N" (number in yellow), and buttons "Respawn" and "Title Screen" that work after 1 s. The player model tips over. | P (chat message, instant respawn) | P1 |
| 12.14 | On death all items and armor drop and scatter around, and XP drops as orbs (7 × level, at most 100). The keepInventory rule keeps both. | WIP | P1 |
| 12.15 | Respawn at your bed if it is set and not blocked. Otherwise world spawn, with the message "You have no home bed or charged respawn anchor, or it was obstructed". Health and hunger are refilled. | WIP | P1 |
| 12.16 | About 40 death messages, such as "fell from a high place", "drowned", "tried to swim in lava", "starved to death", "hit the ground too hard", "was blown up by Creeper", "was shot by Skeleton" | P (one message) | P2 |
| 12.17 | XP orbs: green and yellow, they merge and fly to the player, with an "orb" pickup sound at a random pitch. Sources: mobs 1–5, breeding 1–7, ores, smelting, fishing, trading, bottles. | M | P1 |
| 12.18 | XP level curve: 2×level+7 points per level up to 15, 5×level−38 up to 30, 9×level−158 beyond. A "level up" chime every 5 levels. | P (bar drawn, never changes) | P1 |
| 12.19 | Status effects (about 39: Speed, Slowness, Haste, Mining Fatigue, Strength, Instant Health and Damage, Jump Boost, Nausea, Regeneration, Resistance, Fire Resistance, Water Breathing, Invisibility, Blindness, Night Vision, Hunger, Weakness, Poison, Wither, Absorption, Saturation, Glowing, Levitation, Slow Falling, Darkness, and others). Each shows colored swirl particles on the entity. Milk removes them. | WIP (food buffs only) | P2 |
| 12.20 | Absorption shows as gold hearts after the red ones. Health Boost adds extra heart rows. | M | P3 |

## 13. Combat
| # | Requirement | Status | Priority |
|---|---|---|---|
| 13.1 | Attack cooldown: each weapon has an attack speed (hand 4, sword 1.6, axes 0.8–1.0 per second). Damage is scaled by 0.2 + 0.8 × charge². The indicator under the crosshair fills up, and a sword icon shows when an attack is fully charged. | WIP | P1 |
| 13.2 | Base damage: fist 1; swords wood 4, stone 5, iron 6, diamond 7, netherite 8; axes 7, 9, 9, 9, 10 | P (a punch does 6, or 9 while sprinting) | P1 |
| 13.3 | Critical hit while falling (not on ground, not sprinting, not in water): ×1.5 damage, star particles and a crit sound | WIP | P1 |
| 13.4 | Sweep attack with a sword (on the ground, not sprinting, fully charged) hits nearby mobs, with a sweep particle and sound | WIP | P2 |
| 13.5 | Sprint hit: extra knockback with a "knockback" sound, and it ends the sprint | WIP | P2 |
| 13.6 | Knockback on every hit, for mobs and players | P (Troll and player only) | P1 |
| 13.7 | Attack sounds: strong, weak, crit, sweep, knockback, and "no damage" (during invulnerability) | M | P2 |
| 13.8 | Shield: hold use to raise it (5-tick delay) and block attacks from the front. An axe hit disables it for 5 s. It loses durability, can carry a banner pattern, and plays a block sound. | WIP | P2 |
| 13.9 | Armor: damage × (1 − min(20, max(armor/5, armor − 4×damage/(toughness/4 + 2)))/25). Armor wears down when you are hit, shows on the player model, and fills the armor bar. | WIP | P1 |
| 13.10 | Bow: hold to draw (full in 1 s) with an FOV zoom. Arrows arc with gravity and stick in blocks and mobs (stuck arrows show on the player). Fired arrows can be picked up. A full draw makes a critical arrow with a particle trail. | M | P2 |
| 13.11 | Crossbow (1.25 s load, stays loaded, Multishot, Piercing, fires fireworks) | M | P3 |
| 13.12 | Trident: throw, Loyalty, Riptide, Channeling, Impaling | M | P3 |
| 13.13 | Thrown items: snowball (knockback, 3 damage to blazes), egg (1 in 8 hatches a chick), ender pearl (teleport, 5 fall damage), splash and lingering potions, wind charge (1.21) | M | P3 |
| 13.14 | Mace (1.21): smash attack that grows with fall height; Density, Breach and Wind Burst | M | P3 |
| 13.15 | Tool enchantments: Efficiency, Unbreaking, Fortune, Silk Touch, Mending | M | P2 |
| 13.16 | Weapon enchantments: Sharpness, Smite, Bane of Arthropods, Knockback, Fire Aspect, Looting, Sweeping Edge | M | P2 |
| 13.17 | Armor enchantments: Protection, Fire, Blast and Projectile Protection, Thorns, Feather Falling, Respiration, Aqua Affinity, Depth Strider, Frost Walker, Soul Speed, Swift Sneak. Curses of Binding and Vanishing. | M | P3 |
| 13.18 | Bow, crossbow, trident and fishing rod enchantments: Power, Punch, Flame, Infinity, Quick Charge, Multishot, Piercing, Loyalty, Riptide, Channeling, Impaling, Lure, Luck of the Sea | M | P3 |
| 13.19 | Splash and lingering potions used in combat (Harming, Healing, Poison, Weakness, Slowness) | M | P3 |
| 13.20 | Totem of Undying: when held, it stops death and leaves 1 HP, gives Regeneration, Absorption and Fire Resistance, with a full-screen totem animation and green-yellow particles | M | P3 |
| 13.21 | Damage particles: dark red hearts burst from a mob when it is hit | M | P3 |

## 14. Mobs and entities
| # | Requirement | Status | Priority |
|---|---|---|---|
| 14.1 | Pathfinding: mobs walk around obstacles, jump up 1-block steps, avoid water, lava, cactus and drops of more than 3 blocks, and open or break doors | P (turn back at steep steps or water) | P1 |
| 14.2 | Hostile spawning: in block light 0 on solid blocks, 24–128 blocks from the player. Cap of 70 hostile mobs. Mobs more than 128 blocks away despawn at once; mobs 32–128 blocks away despawn at random. | M | P1 |
| 14.3 | Animals spawn in groups on grass with light 9 or more, mostly when chunks are generated. Cap of 10 animals. | P (12 placed at start) | P1 |
| 14.4 | Zombie: slow, burns in daylight, groans, calls for help. Breaks doors on Hard. Baby zombies are fast. Drops rotten flesh and sometimes iron, carrots or potatoes. Variants: husk, drowned, zombie villager (can be cured). | M | P1 |
| 14.5 | Skeleton: shoots arrows, strafes, hides from the sun, burns in daylight, rattles. Drops bones and arrows. Variants: stray, bogged. | M | P1 |
| 14.6 | Creeper: silent approach, hisses and swells for 1.5 s, explodes with power 3. Charged by lightning. Scared of cats. Drops gunpowder. | M | P1 |
| 14.7 | Spider: climbs walls, leaps at you, neutral in daylight, glowing red eyes. Drops string and spider eyes. The cave spider poisons. | M | P1 |
| 14.8 | Enderman: neutral, becomes hostile when you look at its face, teleports, carries blocks, gets hurt by water, makes static noise. Drops ender pearls. | M | P2 |
| 14.9 | Slime (splits into smaller slimes, spawns in swamps and slime chunks) and phantom (attacks after 3 nights without sleep) | M | P2 |
| 14.10 | Other hostiles: witch, silverfish, pillager, vindicator, evoker, vex, ravager, guardian, elder guardian, shulker, warden, breeze, plus the Nether mobs (blaze, ghast, piglin, hoglin, wither skeleton, magma cube) | M | P3 |
| 14.11 | Cow (leather, beef, milk with a bucket), chicken (drops an egg every 5–10 minutes, feathers, flaps to fall slowly), pig (porkchop, can be ridden with a saddle), sheep (shears give 1–3 wool, eating grass regrows it, 16 colors, can be dyed, rare pink sheep) | P (pig and sheep wander only) | P1 |
| 14.12 | Wolf: tame with bones, sit and follow commands, colored collar, fights for you | M | P2 |
| 14.13 | Other animals: cat, rabbit, fox, parrot, bee, turtle, axolotl, frog, goat, camel, sniffer, armadillo, llama, panda, polar bear, dolphin, squid, glow squid, fish, bat, and horses, donkeys and mules | M | P3 |
| 14.14 | Villagers: 13 jobs from workstation blocks, beds and gossip, a trading screen (trade list on the left, level bar from Novice to Master, offers that unlock), restocking, breeding, and turning into a witch when struck by lightning. Wandering trader. Iron golem defends the village. Raids. | M | P2 |
| 14.15 | Breeding: feed two animals their food to show love hearts, a baby is born, 1–7 XP, 5-minute wait before breeding again. Babies grow up in 20 minutes, faster if fed. | M | P2 |
| 14.16 | Animals follow a player who holds their food (wheat, carrots, seeds) | M | P2 |
| 14.17 | Animals run around in a panic after being hit | M | P1 |
| 14.18 | Mobs turn their heads to look at nearby players, separately from the body | M | P2 |
| 14.19 | Zombies, skeletons and phantoms burn in daylight unless they wear a helmet or stand in water or shade | M | P1 |
| 14.20 | Mob gear: zombies and skeletons sometimes spawn with armor or weapons and can pick up items | M | P3 |
| 14.21 | Mob health and damage: zombie 20 HP (2.5/3/4.5 damage on Easy/Normal/Hard), skeleton 20, creeper 20, spider 16, cow 10, pig 10, sheep 8, chicken 4 | M | P1 |
| 14.22 | Mob drops: pork, beef, mutton, chicken, leather, feathers, wool, bones, arrows, string, spider eye, gunpowder, rotten flesh, ender pearls. Cooked meat if the mob died burning. Looting adds more. Rare drops when killed by a player. | M | P1 |
| 14.23 | Hurt flash, knockback, tip-over death and smoke puff for every mob | P (Troll only) | P1 |
| 14.24 | Name tags (rename at an anvil, stops despawning), leads (leash knot on fences), saddles | M | P3 |
| 14.25 | Mob spawners: a small mob spins inside a cage with flames. It spawns mobs within 4 blocks while a player is within 16 blocks. | M | P2 |
| 14.26 | Mobs float and swim in water, take fall damage and drown | M | P2 |
| 14.27 | Bosses: Ender Dragon, Wither, Elder Guardian, Warden | M | P3 |

## 15. Day, night, weather and environment
| # | Requirement | Status | Priority |
|---|---|---|---|
| 15.1 | 20-minute day (24,000 ticks): about 10 min day, 1.5 min sunset, 7 min night, 1.5 min sunrise. Time 0 = sunrise. Day counter. | WIP | P1 |
| 15.2 | Rain: falling streaks within about 10 blocks, splashes on the ground, rain sound (muffled indoors), darker sky and light. Rain comes and goes on its own cycle. It puts out fire and burning mobs, fills cauldrons and waters farmland. | M | P2 |
| 15.3 | Thunderstorms: darker (mobs can spawn by day), lightning (flash, thunder sound arriving after it, fire, charged creepers, villager to witch, skeleton horse traps), lightning rods | M | P3 |
| 15.4 | Snow falls instead of rain in cold biomes and high up. It never rains in deserts, savannas or badlands. | M | P3 |
| 15.5 | Underwater view: blue fog, short view distance, bubbles, muffled sound | M | P2 |
| 15.6 | Ambient particles: water and lava dripping from ceilings, campfire smoke, lava pops, falling cherry leaves, spore blossoms, ash, crimson spores | M | P3 |
| 15.7 | Ambience: cave sounds triggered by darkness, underwater loop, Nether biome loops | P (wind at height only) | P2 |

## 16. HUD
| # | Requirement | Status | Priority |
|---|---|---|---|
| 16.1 | GUI scale (Auto or 1–4) applied to every HUD element and screen, using whole-number pixels | M (fixed 2×, 1.5× on small screens) | P1 |
| 16.2 | Hotbar 182×22 centered at the bottom, selection frame 24×23. The offhand slot appears to the left (right if left-handed) when it holds something. | P (no offhand) | P1 |
| 16.3 | Heart effects: hearts flash white for 0.5 s after damage, showing the lost half in white. Hearts jitter when health is 4 or less. A wave runs through them with Regeneration. Special hearts for poison (green), wither (black), freezing (blue), absorption (gold) and hardcore. | M | P2 |
| 16.4 | Hunger shanks shake when saturation is 0 and turn green with the Hunger effect | M | P1 |
| 16.5 | Armor bar: 10 chestplate icons above the hearts, shown only when armor is more than 0 | WIP | P1 |
| 16.6 | Air bubbles above the hunger bar, shown only while air is below full, with a pop as each one empties | WIP | P1 |
| 16.7 | XP bar 182×5. The level number is green (#80FF20) with a black outline, centered above the bar, and shown only when the level is above 0. | P (always shown, static) | P2 |
| 16.8 | Mount health hearts replace the hunger bar while riding, and a jump-charge bar replaces the XP bar on horses | M | P3 |
| 16.9 | Attack indicator: under the crosshair (a 16×4 bar) or next to the hotbar (an 18×18 sword). Option: Off, Crosshair or Hotbar. | WIP | P1 |
| 16.10 | Action bar text just above the hotbar, for messages like "Respawn point set", "You can sleep only at night" and "Now Playing: …" (rainbow text) | M | P2 |
| 16.11 | Titles: a big centered title (4× scale) and subtitle (2×) that fade in for 10 ticks, stay 70 and fade out over 20 | M | P3 |
| 16.12 | Subtitles: a box at the bottom right listing nearby sounds with direction arrows "<" and ">" | M | P2 |
| 16.13 | Status effect icons at the top right: good effects in the top row, bad ones below. Each sits in a 24×24 frame and blinks in its last 10 s. | WIP | P2 |
| 16.14 | Toasts at the top right (160×32) that slide in and out, stay 5 s and stack: advancement, recipe, tutorial and system toasts | P (one custom toast) | P2 |
| 16.15 | Tutorial hints for new worlds: "Move with W A S D", "Look around: use your mouse", "Punch a tree: hold left-click to gather wood", "Open your inventory: press E", "Craft a new item". Touch versions name the joystick and buttons. | M | P1 |
| 16.16 | Boss bar: 182×5 at the top center (y 12) with the name 9 px above it, several bars stacked 19 px apart, 7 colors, notched styles | P (Troll bar exists, different size) | P3 |
| 16.17 | Chat on the HUD: bottom left, 320 px wide, 9 px lines on 50% black, messages fade after 10 s. 10 lines when closed and 20 when open, 100 lines of history. | P (6 lines, fade after 8 s) | P2 |
| 16.18 | "Saving world" indicator at the bottom right during autosave | M | P3 |
| 16.19 | Player list (Tab) with heads and ping, and a scoreboard sidebar | M | P3 |
| 16.20 | Creative and spectator HUD: no hearts, hunger, armor or XP | M | P1 |
| 16.21 | Bedrock "Show coordinates" option: Position x, y, z at the top left | M | P2 |
| 16.22 | Bedrock paper doll: a small player model at the top left while sprinting, sneaking or flying (can be hidden) | M | P3 |

## 17. Screens and menus
| # | Requirement | Status | Priority |
|---|---|---|---|
| 17.1 | Title screen: logo and edition line. 200×20 buttons: Singleplayer, Multiplayer, Minecraft Realms, then "Options..." and "Quit Game" side by side (98 wide each). Small square Language (globe) and Accessibility buttons on the sides. Version at the bottom left and copyright at the bottom right. | P (Singleplayer and Controls only) | P1 |
| 17.2 | Buttons: 200×20 stone-gray texture with white shadowed text. Hover shows a white frame. Disabled buttons have gray text (#A0A0A0). Every press plays the click sound. | P (style close, no disabled state) | P1 |
| 17.3 | Sliders: textured track and knob, with the value inside ("Music: 100%") | M | P1 |
| 17.4 | Text fields: black box with a gray border, white text, blinking "_" cursor, select, copy and paste | M | P2 |
| 17.5 | Select World screen: title "Select World", search box, and a list of worlds. Each row shows a 32×32 picture, the name, the folder and last-played date, and a line with game mode, cheats and version; a play arrow appears on hover. Buttons: Play Selected World, Create New World, Edit, Delete, Re-Create, Cancel. Double-click a world to play. | M | P1 |
| 17.6 | Create New World screen with tabs Game, World and More. Game: World Name, Game Mode (Survival, Hardcore, Creative), Difficulty, Allow Commands. World: World Type with Customize, Seed ("Leave blank for a random seed"), Generate Structures, Bonus Chest. More: Game Rules, Data Packs. Buttons "Create New World" and "Cancel". | M | P1 |
| 17.7 | Delete confirmation: "Are you sure you want to delete this world?" and "'Name' will be lost forever! (A long time!)" | M | P2 |
| 17.8 | Edit World: rename, reset icon, make backup | M | P3 |
| 17.9 | Loading screens: "Loading terrain..." / "Preparing spawn area: N%" with a colored chunk-progress square. "Saving world" when quitting. | M | P2 |
| 17.10 | Game Menu: title "Game Menu". Back to Game (full width); Advancements and Statistics; Give Feedback and Report Bugs; Options... and Open to LAN; Save and Quit to Title. In singleplayer the game really pauses (time, mobs, furnaces). | P (Back to Game and Controls; the world keeps running) | P1 |
| 17.11 | F3+Esc pauses without showing the menu. The game pauses when the window loses focus. | P (pauses when the pointer lock is lost) | P3 |
| 17.12 | Options screen: FOV slider, Online..., Difficulty with a lock, Skin Customization..., Music & Sounds..., Video Settings..., Controls..., Language..., Chat Settings..., Resource Packs..., Accessibility Settings..., Credits & Attribution, Done | M | P1 |
| 17.13 | Every sub-screen has a "Done" button at the bottom, and Esc goes back one screen | M | P1 |
| 17.14 | In-game menus show the world blurred or dimmed behind them | P (dark overlay) | P3 |
| 17.15 | Keyboard navigation: Tab and the arrow keys move between buttons and Enter presses them | M | P3 |
| 17.16 | Advancements screen (L): tabs Minecraft, Nether, The End, Adventure, Husbandry. A tree you can drag, with icons in task, goal and challenge frames, hover descriptions and progress. | M | P2 |
| 17.17 | About 120 advancements, each with a toast and sound ("Advancement Made!", "Goal Reached!", "Challenge Complete!" with a fanfare), and a chat line "Name has made the advancement [Stone Age]" | M | P2 |
| 17.18 | Statistics screen: General (distance walked, jumps, time played, deaths, mob kills), Items (mined, crafted, used, broken, picked up, dropped), Mobs (killed, killed by) | M | P3 |
| 17.19 | Language selection | M | P3 |
| 17.20 | Credits and the End poem, scrolling | M | P3 |

## 18. Options and settings
| # | Requirement | Status | Priority |
|---|---|---|---|
| 18.1 | Render distance 2–32 chunks | M | P1 |
| 18.2 | Simulation distance 5–32 chunks | M | P3 |
| 18.3 | Graphics: Fast, Fancy, Fabulous | M | P2 |
| 18.4 | Smooth lighting on or off | M | P3 |
| 18.5 | Max framerate, VSync, lower FPS when idle | M | P3 |
| 18.6 | GUI scale: Auto or 1–4 | M | P1 |
| 18.7 | Brightness from Moody (0%) to Bright (100%) | M | P1 |
| 18.8 | Clouds: Off, Fast, Fancy | M | P3 |
| 18.9 | Particles: All, Decreased, Minimal | M | P2 |
| 18.10 | Mipmap levels, biome blend, entity shadows, entity distance, chunk fade time | M | P3 |
| 18.11 | Fullscreen toggle in options and on F11 | P (touch button only) | P2 |
| 18.12 | View bobbing on or off | M (always on) | P2 |
| 18.13 | Attack indicator: Off, Crosshair, Hotbar | M | P2 |
| 18.14 | Show autosave indicator, show vignette | M | P3 |
| 18.15 | Volume sliders: Master, Music, Jukebox/Note Blocks, Weather, Blocks, Hostile Creatures, Friendly Creatures, Players, Ambient/Environment, Voice | M (M key toggles music only) | P1 |
| 18.16 | Show subtitles, directional audio, music frequency | M | P3 |
| 18.17 | Key Binds screen: grouped into Movement, Gameplay, Inventory, Creative, Multiplayer, Miscellaneous and Debug. Click a key to rebind it. Clashing keys turn red. "Reset Keys" button. | M | P2 |
| 18.18 | Sneak and sprint can be set to Hold or Toggle | M (touch sneak is always toggle) | P1 |
| 18.19 | Auto-jump on or off (off by default in Java, on for touch in Bedrock) | P (always on with the joystick, never with keys) | P1 |
| 18.20 | Mouse: sensitivity 0–200%, invert Y (and X), scroll sensitivity, discrete scrolling | M | P1 |
| 18.21 | Main hand: left or right | M | P3 |
| 18.22 | Skin layer toggles: cape, jacket, sleeves, trouser legs, hat | M | P3 |
| 18.23 | Chat settings: shown / commands only / hidden, colors, text opacity, background opacity, size, line spacing, delay, width, heights, command suggestions | M | P3 |
| 18.24 | Narrator that reads menus and chat (Ctrl+B) | M | P3 |
| 18.25 | High-contrast UI and high-contrast block outlines | M | P3 |
| 18.26 | Comfort sliders: distortion effects, FOV effects, darkness pulsing, damage tilt, glint speed and strength. Also hide lightning flashes, monochrome logo, panorama scroll speed, hide splash texts, notification time. | M | P2 |
| 18.27 | Language and Force Unicode Font | M | P3 |
| 18.28 | Resource packs (custom textures and sounds), with Programmer Art as an option | M | P3 |
| 18.29 | Options and key binds are saved and come back next session | M | P1 |

## 19. Chat, commands and game rules
| # | Requirement | Status | Priority |
|---|---|---|---|
| 19.1 | T opens chat and / opens it with "/" already typed. Input box at the bottom, 256 characters, Enter sends, Esc closes. Up and Down recall what you sent before. Page Up and Page Down scroll. | M | P2 |
| 19.2 | Message format "<Name> text". System messages in gray or yellow ("joined the game" is yellow, as now). Formatting codes for color and bold. | P | P3 |
| 19.3 | Command suggestions: a popup lists matching commands and arguments, and Tab completes them. Errors in red, such as "Unknown or incomplete command". | M | P2 |
| 19.4 | Core commands: /gamemode, /time set day, night, noon or midnight, /time add, /weather clear, rain or thunder, /give, /tp, /kill, /effect, /xp, /clear, /difficulty, /gamerule, /seed, /spawnpoint, /setworldspawn, /help | M | P2 |
| 19.5 | Builder and advanced commands: /summon, /enchant, /locate, /fill, /setblock, /clone, /title, /playsound, /particle, /say, /me, /tell, /execute, /scoreboard | M | P3 |
| 19.6 | Commands work only when "Allow Commands" is on for the world. Open to LAN can turn it on. | M | P3 |
| 19.7 | Game rules: keepInventory, doDaylightCycle, doWeatherCycle, doMobSpawning, mobGriefing, doFireTick, naturalRegeneration, showDeathMessages, doImmediateRespawn, fallDamage, fireDamage, drowningDamage, freezeDamage, randomTickSpeed, spawnRadius, playersSleepingPercentage, doInsomnia, announceAdvancements, doEntityDrops, doTileDrops, doMobLoot, reducedDebugInfo, maxEntityCramming | M | P2 |
| 19.8 | Game rules editor under Create World > More, grouped as Player, Mobs, Spawning, Drops, World Updates, Chat, Misc | M | P3 |

## 20. Debug screen and developer keys
| # | Requirement | Status | Priority |
|---|---|---|---|
| 20.1 | F3 left side, in full: version, fps, chunk counts, XYZ, Block (with position inside the chunk), Chunk, "Facing: north (Towards negative Z) (yaw / pitch)", Client Light (sky and block), biome ("minecraft:plains"), Local Difficulty with the day number | P (8 lines) | P2 |
| 20.2 | F3 right side: memory, CPU, GPU, and the targeted block, fluid and entity with their states and tags | M | P3 |
| 20.3 | Frame-time and FPS graphs (F3+2) | M | P3 |
| 20.4 | F3+B shows hitboxes (white box, red eye line, blue look line). F3+G shows chunk borders. | M | P3 |
| 20.5 | F3+H advanced tooltips, F3+N switches between creative and spectator, F3+F4 game mode picker, F3+A reloads chunks, F3+D clears chat, F3+C copies your location, F3+I copies block data, F3+P pause on focus loss, F3+Q lists these keys | M | P3 |
| 20.6 | With F3 open, the crosshair becomes a small XYZ axis marker (red, green, blue) | M | P3 |
| 20.7 | F2 saves a screenshot and posts a chat line "Saved screenshot as …png" | M | P3 |
| 20.8 | Reduced Debug Info option | M | P3 |

## 21. Saving and persistence
| # | Requirement | Status | Priority |
|---|---|---|---|
| 21.1 | Save the world: changed blocks per chunk (IndexedDB in the browser), player position, view direction, health, hunger, XP, inventory, armor, effects, spawn point and game mode, time and weather, entities (mobs, items, arrows) and block entities (chests, furnaces, signs) | M | P1 |
| 21.2 | Autosave every 5 minutes (6,000 ticks) and on pause and quit | M | P1 |
| 21.3 | "Save and Quit to Title" button, followed by a "Saving world" screen | M | P1 |
| 21.4 | Several worlds, each with a name, a picture taken on first play, the last-played time and its size | M | P1 |
| 21.5 | Per-world settings: seed, game mode, difficulty, game rules, cheats | M | P2 |
| 21.6 | Export and import a world file (like Bedrock's .mcworld) | M | P3 |
| 21.7 | Options, key binds and touch layout saved apart from worlds | M | P1 |
| 21.8 | Statistics and advancements saved for each world | M | P3 |
| 21.9 | Ask the browser for persistent storage, and warn when storage is full | M | P2 |

## 22. Multiplayer
| # | Requirement | Status | Priority |
|---|---|---|---|
| 22.1 | Multiplayer screen: server list with Add Server, Direct Connection and Refresh. Each server shows its message, ping bars and player count. | M (needs a server) | P3 |
| 22.2 | Open to LAN with game mode and Allow Commands choices. In a browser this would need WebRTC or a relay server. | M | P3 |
| 22.3 | Other players drawn with skins, name tags (hidden behind walls when they sneak), held items, armor and animations | P (local characters only) | P3 |
| 22.4 | Player list (Tab), player-to-player chat, /msg | M | P3 |
| 22.5 | Realms | M | P3 |
| 22.6 | Skins: 64×64 skin files with a second outer layer, slim arms (3 px) or classic arms (4 px), capes | M | P3 |

## 23. Mobile (Bedrock touch) specifics
| # | Requirement | Status | Priority |
|---|---|---|---|
| 23.1 | Choice of control scheme: D-pad (jump in the middle, sneak toggle in the center), joystick, or split controls (aim with a fixed center crosshair and use Attack and Use buttons) | WIP (floating joystick exists) | P1 |
| 23.2 | Joystick: drag to move, push to the top edge to sprint, with an auto-jump option | WIP (moving and auto-jump exist) | P1 |
| 23.3 | Action buttons: Jump, Sneak (toggle), Attack, Use/Place, Sprint | WIP (Jump and Sneak exist) | P1 |
| 23.4 | Tap to place or use, hold to break with a ring filling around the finger, tap a mob to attack it | WIP (tap and hold exist, no ring) | P1 |
| 23.5 | Vibration on block break and on hits | WIP | P2 |
| 23.6 | Top bar: pause, chat, emote and camera view buttons | WIP (pause, view, full screen exist) | P1 |
| 23.7 | Touch hotbar: tap to select, hold a slot to drop that item, and a "…" slot that opens the inventory | WIP (tap exists) | P1 |
| 23.8 | Pocket-style inventory: item tabs and recipe book on the left (Construction, Equipment, Items, Nature, plus Search), paper doll, armor and crafting on the right. Recipe book open by default with craft-one and craft-all. Tap an item to pick it up and tap a slot to put it down. Hold to split a stack. | WIP | P1 |
| 23.9 | Classic UI option that uses the Java-style layout on touch | M | P3 |
| 23.10 | Touch layout editor: drag, resize and change the opacity of each button | WIP | P2 |
| 23.11 | Touch settings: sensitivity, invert Y, swap jump and sneak, show action buttons, hide hand, hide paper doll, show coordinates | WIP | P2 |
| 23.12 | Creative flying on touch: double-tap jump to fly, Up and Down buttons, a button to land | M | P2 |
| 23.13 | In water and on ladders, the jump button means "up" and sneak means "down" | P | P2 |
| 23.14 | Context button: a text button such as "Open", "Sleep", "Ride", "Sit", "Feed" or "Shear" for the block or mob you aim at | M | P2 |
| 23.15 | Performance options for phones and automatic quality | WIP | P1 |
| 23.16 | Add to Home Screen as a web app that opens full screen in landscape and works offline | M | P2 |
| 23.17 | Screen wake lock so the phone does not dim while you play | M | P2 |
| 23.18 | The game pauses and saves when the tab or app goes to the background (visibilitychange and pagehide) | M | P1 |
| 23.19 | Gamepad support in the Bedrock layout: RT attack, LT use, A jump, right stick click sneak, left stick click sprint, LB and RB for the hotbar, Y inventory, B drop, D-pad up for camera view | M | P2 |
| 23.20 | Touch targets at least 44 px, with the HUD and hotbar sized for thumbs (Bedrock's Pocket UI profile) | P | P1 |

## 24. Audio
| # | Requirement | Status | Priority |
|---|---|---|---|
| 24.1 | 3D sound: every world sound (blocks, mobs, items) is panned left or right and gets quieter with distance (about 16 blocks) | M | P1 |
| 24.2 | Material sound groups (stone, wood, gravel, grass, sand, snow, cloth, glass, metal, ladder, anvil, slime, honey, nether types), each with break, place, step, hit and fall sounds and random pitch from 0.8 to 1.2 | P (6 synthesized groups) | P1 |
| 24.3 | Player sounds: hurt, death, eat, drink, burp, level up, XP orb, item pickup pop, water splash, swim, small and big fall, attack sounds, tool breaking, armor equip, shield block, bow shot and arrow hit | M | P1 |
| 24.4 | Mob sounds for each mob: ambient sounds at random intervals (oink, baa, moo, cluck, zombie groan, skeleton rattle, creeper hiss, spider hiss), hurt, death and steps | P (Troll only) | P1 |
| 24.5 | Block and UI sounds: button click (exists), chest open and close, door and trapdoor open and close, furnace crackle, toast whoosh, advancement fanfare | P | P2 |
| 24.6 | Music: calm piano tracks (in the style of C418) played now and then with gaps of 10–20 minutes. Separate music for the menu, creative, underwater, each biome, the Nether and the End. Music discs in jukeboxes. | P (random piano notes every 2.5–7 s) | P2 |
| 24.7 | Ambient sounds: cave sounds that build with darkness, rain outdoors and muffled indoors, thunder, underwater loop | P | P2 |
| 24.8 | Looping block sounds: lava pops, fire crackle, portal hum, flowing water, beehive buzz, campfire | M | P3 |
| 24.9 | Sounds stop or muffle when the game is paused or the tab is hidden | M | P2 |

## 25. Key bindings (Java defaults)
| # | Requirement | Status | Priority |
|---|---|---|---|
| 25.1 | E opens and closes the inventory | WIP | P1 |
| 25.2 | Q drops the held item and Ctrl+Q drops the stack. Move the character wheel to another key, such as holding G or the Switch button. | P (Q opens the wheel) | P1 |
| 25.3 | F swaps the main hand and offhand items | WIP | P2 |
| 25.4 | T opens chat and / opens a command | M | P2 |
| 25.5 | Tab holds open the player list | P (Tab opens the wheel) | P3 |
| 25.6 | L opens advancements | M | P3 |
| 25.7 | F2 takes a screenshot and F11 toggles fullscreen | M | P3 |
| 25.8 | Esc closes any open screen first and pauses only when no screen is open | P | P1 |

---

## Build order (100+ steps, phone-first)

Ordered by impact and by what each step needs first. Foundations come first: game modes, saving, the item model, then crafting, lighting and the survival loop. Phone-specific steps sit right next to the feature they serve. Steps marked WIP above should be finished or checked by the agent working on that area before the steps that depend on them start.

**Phase 1: Foundations**
1. Pause and save when the tab or app goes to the background [23.18]
2. Fixed 20-tick game clock that drives physics, growth and AI, with smoothing between ticks [11.1]
3. Survival and Creative game modes with mode-specific rules and HUD [12.1, 16.20]
4. Item model: item ids, stack limits and item data such as durability [1.22]
5. Save the world (changed blocks, player, inventory, time) to IndexedDB [21.1]
6. Autosave every 5 minutes and on pause [21.2]
7. "Save and Quit to Title" button and "Saving world" screen [21.3, 17.10]
8. Real pausing in singleplayer: stop time, mobs and furnaces while the Game Menu is open [17.10]
9. Save options and touch layout apart from worlds [21.7, 18.29]
10. Move the character wheel off Q and Tab; Q drops items [25.2]

**Phase 2: Inventory and crafting core**
11. Player inventory screen layout and slot art at exact GUI sizes [1.1–1.4]
12. Click handling: left, right, shift-click, putting back the cursor stack [1.12–1.14, 1.17, 1.21]
13. Pocket-style touch inventory: tap to pick up and place, hold to split [23.8]
14. Touch hotbar "…" slot to open the inventory, and hold to drop [23.7]
15. Item counts, durability bars and tooltips [1.23, 1.24, 1.27, 1.28]
16. 2×2 crafting grid in the inventory, with items returned on close [1.8, 1.9]
17. Shaped and shapeless recipes with ingredient groups [3.1–3.3]
18. Result slot rules, including shift-click to craft the maximum [3.4]
19. Starter recipe set: planks, sticks, table, tools, torches, chest, furnace [3.5]
20. Crafting table block and its 3×3 "Crafting" screen [4.1, 4.2]
21. Sneak + use places a block against functional blocks [4.5, 6.12]
22. Container screens close on distance, block broken, Esc or E [4.4, 25.8]
23. Recipe book with tabs, search, craftable filter and auto-fill (open by default on touch) [2.1–2.5]
24. Recipe unlocking with the "New Recipes Unlocked!" toast [2.7, 16.14]

**Phase 3: Breaking, drops and items in the world**
25. Hardness and tool-based break times [6.1, 6.2]
26. Crack overlay in 10 stages, hit particles and hit sounds while mining [6.4, 6.5]
27. Touch break ring around the finger and vibration on break [23.4, 23.5]
28. 0.3 s pause between blocks, and creative instant breaking [6.3]
29. Drop rules: cobblestone from stone, dirt from grass block, nothing from glass, saplings and apples from leaves [6.7]
30. Harvest levels and tool tiers [5.1–5.3]
31. Dropped item entities that spin, bob and merge [5.20, 5.23]
32. Item pickup with the pop sound and the fly-to-player animation [5.21]
33. Q and touch drop throwing items forward [5.22, 1.19]
34. Tool durability and breaking tools [5.4]
35. Placing takes from the stack, and holding use places again [6.9, 6.11]
36. Block textures used for break particles [6.6]
37. 3D held items with the re-equip animation, and the empty hand showing the arm [5.19, 9.19]

**Phase 4: Light and time**
38. Light engine: sky light and block light flood fill [9.1]
39. Light sources with their levels (torch first) [9.2, 7.11]
40. Brightness curve and Brightness option [9.3, 18.7]
41. Torches on walls and floors [6.19]
42. Day-night cycle of 20 minutes, with sky light following time [15.1, 9.5]
43. Sky colors, sunrise and sunset, moon phases and stars [9.11, 9.12]
44. Smooth lighting that blends light with AO [9.4]

**Phase 5: Furnace, chests and beds**
45. Furnace screen with fuel flame and progress arrow [4.6]
46. Furnace that runs with the screen closed, fuel times, XP on taking output [4.7]
47. Smelting recipes: ores, sand to glass, food [3.7]
48. Lit furnace texture, particles and sound [4.8]
49. Chest with its 27-slot screen [4.11]
50. Double chest ("Large Chest") [4.12]
51. Chest lid animation and sounds, facing the player, drops when broken [4.13]
52. Bed: sleep through the night, set spawn, the "monsters nearby" rule [4.26]
53. Respawn at bed or world spawn [12.15]

**Phase 6: Survival loop**
54. Health regeneration and invulnerability frames [12.3, 12.4]
55. Hunger, saturation and exhaustion [12.5]
56. Starvation [12.6]
57. Hunger bar shake and Hunger-effect colors [16.4]
58. Eating with hold-to-eat, particles and sounds [5.14]
59. Food items and their values [5.12]
60. Fall damage with landing sounds and particles [11.7]
61. Drowning with air bubbles [12.7, 16.6]
62. Death screen with Respawn and Title Screen [12.13]
63. Dropping items and XP on death, and the keepInventory rule [12.14]
64. XP orbs and the level curve [12.17, 12.18]
65. Heart flash and low-health jitter [16.3]
66. Damage tilt in place of the red screen flash [9.22]
67. Sneaking stops you at edges [11.5]
68. Sprint rules (stops at 6 hunger, on walls, while using items) and sprint dust [11.6]
69. Sneak hitbox height 1.5 [11.3]
70. 0.6-block step-up [11.4]

**Phase 7: Mobs that make it Minecraft**
71. Mob health, hurt flash, tip-over death, smoke puff [14.21, 14.23, 9.17]
72. Hitting passive mobs: knockback and panic running [13.6, 14.17]
73. Mob drops (pork, mutton, wool, leather, beef, feathers) [14.22]
74. Cow and chicken, plus pig and sheep behavior (shearing, eating grass) [14.11]
75. Pathfinding around blocks and away from drops [14.1]
76. Hostile spawning in darkness, despawning and caps [14.2]
77. Zombie [14.4]
78. Skeleton with the bow [14.5]
79. Creeper with hiss and explosion [14.6, 8.18]
80. Spider [14.7]
81. Undead burn in daylight [14.19]
82. Mob sounds: ambient, hurt and death [24.4]
83. Attack cooldown, real fist damage and the attack indicator [13.1, 13.2, 16.9]
84. Critical hits, sweep and sprint knockback [13.3–13.5]
85. Armor items, armor slots and the armor bar [5.15, 1.5, 13.9, 16.5]
86. Animals spawning in groups, and breeding [14.3, 14.15]
87. Animals following food [14.16]

**Phase 8: Menus and settings**
88. Select World screen with several worlds [17.5, 21.4]
89. Create New World screen (name, mode, difficulty, seed) [17.6]
90. Difficulty levels [12.2]
91. Options screen with Done and Back navigation [17.12, 17.13]
92. Sliders and the rest of the button styles [17.2, 17.3]
93. Volume sliders by sound category [18.15]
94. GUI scale (Auto, 1–4) [16.1, 18.6]
95. Mouse and touch sensitivity, invert Y, toggle or hold for sneak and sprint, auto-jump option [18.18–18.20, 23.11]
96. Render distance option [18.1]
97. Tutorial hints for new worlds, with touch wording [16.15]
98. Title screen with Options and Quit, the Game Menu buttons, and the Bedrock coordinates option [17.1, 17.10, 16.21]

**Phase 9: World and blocks**
99. Infinite chunk loading and unloading around the player [10.1, 9.15]
100. Seeded noise terrain with height −64 to 320 [10.2–10.4]
101. Biomes with their own trees and colors [10.5, 10.6, 9.9]
102. Caves and ravines [10.7]
103. Ore distribution by height [10.9, 7.3]
104. Non-cube block models (slabs, stairs, doors, fences, ladders) [7.16]
105. Directional placement: logs, slabs, stairs, doors, facing blocks [6.13–6.18]
106. Support rules that pop torches, flowers and doors off as items [6.22]
107. Ladders and climbing [11.11, 7.12]
108. Random ticks [8.1]
109. Falling sand and gravel [8.2]
110. Water flow with levels and currents [8.3, 8.4]
111. Buckets [5.8, 8.7]
112. Lava flow and lava + water making cobblestone and obsidian [8.5, 8.6]
113. Leaves decay, saplings grow, bone meal [8.8, 8.9, 5.17]
114. Farming: hoe, farmland, wheat, carrots, potatoes [8.10, 8.11, 5.5]
115. Grass spreading [8.14]
116. Full oak set, then the other wood types [7.5, 7.6]
117. Stone, ground and color block families [7.1, 7.2, 7.7]
118. Villages and dungeons with loot chests [10.11, 10.12, 10.14]

**Phase 10: Sound and feel**
119. 3D positional sound [24.1]
120. Player sounds (hurt, eat, pickup, level up, splash) [24.3]
121. Full material sound groups with pitch variation [24.2]
122. Calm music tracks with long gaps, plus menu and underwater music [24.6]
123. Cave and underwater ambience [24.7, 15.7]
124. Particle system with sprite particles [9.18]
125. Underwater fog and overlay, and swimming [15.5, 9.20, 11.8, 11.9]
126. Rain and snow [15.2, 15.4]
127. Biome tints and fog that follows render distance [9.9, 9.10]

**Phase 11: Depth**
128. Creative inventory with tabs and search [1.32]
129. Creative flying, on keyboard and touch [11.17, 23.12]
130. Shield, then bow and arrows [13.8, 13.10]
131. Chat input and core commands [19.1, 19.3, 19.4]
132. Game rules [19.7]
133. Enchanting table and the tool and weapon enchantments [4.16, 13.15, 13.16]
134. Anvil [4.18]
135. Fire spread, flint and steel, TNT [8.16, 5.7, 8.17]
136. Boats [11.14]
137. Wolves and taming [14.12]
138. Enderman, slime and phantom [14.8, 14.9]
139. Advancements screen and toasts [17.16, 17.17]
140. Nether portal and the Nether [10.19, 10.20]
141. Fishing rod [5.9]
142. Context button for touch (Open, Sleep, Shear) [23.14]
143. Gamepad support [23.19]
144. Add to Home Screen, offline play and screen wake lock [23.16, 23.17]
145. Full F3 screen and F3 key combinations [20.1, 20.4, 20.5]

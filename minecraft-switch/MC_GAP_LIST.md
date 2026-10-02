# Minecraft features Blockcraft is missing

Compared against Minecraft Java Edition 1.21 (with Bedrock notes where phones matter).

**Status:** **M** = missing · **P** = partial (exists but not like Minecraft) · **WIP** = an agent is building it now (items, combat, Valheim content, mobile).

**What Blockcraft already has:** a 160×160 island world, about 22 block types, chunk meshing with AO, first/third-person views, walking, sprinting, sneaking, jumping and swimming, instant break and place, a fixed 9-slot hotbar, hearts/hunger/XP shown but static, chat messages, F3/F1/F5, a title screen, a pause menu, pigs and sheep that only wander, one Troll, a fixed daytime sky, synthesized sounds and music, touch controls, and a character switch.

---

## 1. Inventory and containers UI
| # | Requirement | Status |
|---|---|---|
| 1.1 | Player inventory screen (E): 27 storage slots + 9 hotbar slots, gray beveled panel, exact slot art | WIP |
| 1.2 | 4 armor slots with empty-slot silhouette icons (helmet, chestplate, leggings, boots) | WIP |
| 1.3 | Offhand slot with a shield silhouette; F swaps main hand and offhand | WIP |
| 1.4 | Live 3D player model in the inventory that turns to follow the mouse | M |
| 1.5 | 2×2 crafting grid in the inventory, with an arrow and a result slot | WIP |
| 1.6 | Item stacks: max 64, 16 for some items (eggs, snowballs), 1 for tools | WIP |
| 1.7 | Mouse handling: left-click pick up or place all; right-click pick up half or place one; drag to spread evenly (left) or one each (right); double-click to gather all of a kind; shift-click to quick-move; number key to swap with hotbar; middle-click clone (creative); Q drops one, Ctrl+Q drops the stack | P |
| 1.8 | Drop items by clicking outside the window; dropped items appear as entities in the world | M |
| 1.9 | Tooltips: name in rarity color, enchantments, attribute lines ("When in Main Hand: 7 Attack Damage, 1.6 Attack Speed"), durability (advanced tooltips with F3+H) | WIP |
| 1.10 | Recipe book: green book button, search box, category tabs, "show craftable only" toggle, clicking a recipe fills the grid, red ghost items for missing ingredients | WIP |
| 1.11 | Recipe unlocking: recipes are learned by picking up an ingredient, with a toast "New Recipes Unlocked!" | M |
| 1.12 | Creative inventory: tabs (Building Blocks, Colored Blocks, Natural, Functional, Redstone, Tools, Combat, Food, Ingredients, Spawn Eggs, Search, Survival Inventory), scrolling, a destroy-item slot | M |
| 1.13 | Pick block (middle-click) gets the item from the inventory, or creates it in creative | P |
| 1.14 | Hotbar item name shown above the hotbar when you switch (already there), with enchant glint on enchanted items | P |
| 1.15 | Durability bar under each tool icon, going green to red | WIP |
| 1.16 | Item counts in the bottom-right of the slot, white with shadow | WIP |
| 1.17 | Hovered-slot white highlight, and the held stack follows the cursor | WIP |
| 1.18 | Saved hotbars (creative) | M |
| 1.19 | Bundle item: holds mixed items, with a fill bar in the tooltip | M |

## 2. Crafting and functional blocks (each with its exact Minecraft GUI)
| # | Requirement | Status |
|---|---|---|
| 2.1 | **Crafting table**: real block textures (top grid, sides with tools); right-click opens a 3×3 grid "Crafting" plus the player inventory; shaped recipes (pattern matters, mirrored allowed); result slot; shift-click crafts the maximum | WIP |
| 2.2 | Full vanilla recipe list: planks, sticks, crafting table, all tools in all tiers, armor, torches, chests, furnaces, beds, doors, stairs, slabs, fences, ladders and more | P/WIP |
| 2.3 | **Furnace**: input, fuel and output slots, burning-flame progress, arrow progress, XP when you take the result, lit texture and particles | M |
| 2.4 | Blast furnace and smoker, which run 2× faster for ores or food | M |
| 2.5 | Campfire: cooks 4 items on top, smoke particles, sets you on fire | M |
| 2.6 | **Chest**: 27 slots; double chest with 54 slots; opening animation and sound; "Chest" title | M |
| 2.7 | Barrel, ender chest (shared storage), shulker box (keeps items when broken) | M |
| 2.8 | Enchanting table: 3 options with mysterious text, lapis slot, level cost, bookshelves boost, floating book animation | M |
| 2.9 | Anvil: rename, repair, combine enchantments, level cost, "Too Expensive!", anvil damage stages | M |
| 2.10 | Grindstone (removes enchantments, repairs), smithing table (netherite upgrade, armor trims), stonecutter, loom (banners), cartography table | M |
| 2.11 | Brewing stand: blaze fuel, 3 bottles, ingredient slot, bubble animation; all potions and splash/lingering versions | M |
| 2.12 | Hopper (moves items, 5 slots), dropper, dispenser | M |
| 2.13 | Bed: sleep at night to skip it, sets spawn point, "You can sleep only at night", monsters nearby stop you sleeping | M |
| 2.14 | Workstation blocks that give villagers their jobs | M |
| 2.15 | Lectern, composter, beehive, cauldron (water/lava/snow, dyeing leather), jukebox with music discs, note block | M |

## 3. Blocks and building
| # | Requirement | Status |
|---|---|---|
| 3.1 | Breaking takes time based on hardness and tool, with 10 crack stages and the swing animation | WIP |
| 3.2 | The right tool is needed for drops (stone with a pickaxe, ore tiers: iron needs stone, diamond needs iron) | WIP |
| 3.3 | Block drops appear as 3D item entities that bob and spin, merge together, despawn after 5 minutes, and are picked up with a "pop" sound | WIP |
| 3.4 | Block sounds per material for break, place, step and hit (exists in a simple form) | P |
| 3.5 | Placement rules: logs follow the face you click (axis), stairs and slabs (top/bottom/double), doors (2 tall, hinge side), torches on walls, fences and walls connect, glass panes and iron bars connect | M |
| 3.6 | Shape blocks: stairs, slabs, walls, fences, fence gates, doors, trapdoors, pressure plates, buttons, ladders (climbable), signs (editable text), item frames, paintings, flower pots, carpets, beds, banners | M |
| 3.7 | Block families: stone types (granite, diorite, andesite, deepslate, tuff), stone bricks, wood types (oak, spruce, birch, jungle, acacia, dark oak, mangrove, cherry, bamboo), wool and concrete in 16 colors, terracotta, glazed terracotta, ores (coal, copper, iron, gold, redstone, lapis, diamond, emerald), mineral blocks | P |
| 3.8 | Gravity blocks: sand and gravel fall, concrete powder hardens in water, anvils fall | M |
| 3.9 | Fluids: water and lava flow with levels 1–7, source blocks, infinite water sources, current that pushes, lava + water makes cobblestone/obsidian/stone, buckets (water, lava, milk, fish) | M (water only fills holes) |
| 3.10 | Leaves decay when no log is nearby, saplings drop and grow into trees, bone meal | M |
| 3.11 | Crops and farming: hoe makes farmland, wheat/carrots/potatoes/beetroot grow in stages, water hydration, trampling, pumpkins and melons on stems, sugar cane, cactus that damages and grows, bamboo, kelp | M |
| 3.12 | Grass spreads onto dirt, mycelium, snow layers, ice melts and freezes | M |
| 3.13 | Block lighting: sky light plus block light (torches 14, glowstone 15, lava), smooth lighting, darkness in caves, mobs spawn at light 0 | M |
| 3.14 | Torches, lanterns, glowstone, sea lanterns, jack o'lanterns as light sources | M (torch item WIP, without light) |
| 3.15 | Transparent and translucent blocks: stained glass and ice with correct sorting | P |
| 3.16 | Biome tints for grass, leaves and water (colormap) | M |
| 3.17 | Block entities: chest lid, sign text, banner pattern, skull, bell | M |
| 3.18 | Fire spreads and burns wood, flint and steel, netherrack burns forever | M |
| 3.19 | TNT: ignites, flashes, explodes with crater damage and chain reactions | M |
| 3.20 | Redstone: dust (power 0–15), torch, repeater, comparator, lever, button, pressure plate, piston and sticky piston, observer, lamp, doors and trapdoors powered, daylight sensor, target, tripwire, rails (powered, detector, activator) | M |

## 4. World generation and dimensions
| # | Requirement | Status |
|---|---|---|
| 4.1 | Infinite world, chunks loading and unloading around the player, render distance setting | M (fixed 160×160) |
| 4.2 | Seeds, world height −64 to 320, 3D noise terrain, overhangs, mountains | M |
| 4.3 | Biomes: plains, forest, birch forest, dark forest, taiga, snowy, desert (exists), savanna, jungle, swamp, badlands, mushroom fields, ocean variants, rivers, beaches, cherry grove, meadow, peaks, lush caves, dripstone caves, deep dark | P |
| 4.4 | Caves (cheese, spaghetti and noodle caves), ravines, aquifers, lava lakes, underground water | M |
| 4.5 | Ore distribution by height (diamonds deep down, ore veins) | P (coal and iron only) |
| 4.6 | Structures: villages, desert and jungle temples, shipwrecks, ocean monuments, strongholds with an End portal, mineshafts, dungeons with spawners, pillager outposts, woodland mansions, ruined portals, ancient cities, trail ruins, trial chambers, igloos, witch huts, buried treasure | M |
| 4.7 | Loot chests in structures, with loot tables | M |
| 4.8 | Nether: portal from obsidian lit with fire, purple portal effect, Nether biomes, fortresses, bastions, netherite | M |
| 4.9 | The End: stronghold, eyes of ender, End portal frame, Ender Dragon fight, End cities, elytra, gateway | M |
| 4.10 | Ocean: deep water, kelp, seagrass, coral reefs, underwater fog | M |
| 4.11 | World border | P (invisible clamp) |

## 5. Player and survival mechanics
| # | Requirement | Status |
|---|---|---|
| 5.1 | Game modes: Survival, Creative (flying with double-tap space, infinite blocks, instant break), Adventure, Spectator; /gamemode | M (currently a creative/survival mix) |
| 5.2 | Difficulty: Peaceful, Easy, Normal, Hard, Hardcore | M |
| 5.3 | Health that really changes, with damage, regeneration, absorption and heart flashing | WIP |
| 5.4 | Hunger, saturation and exhaustion: sprinting needs more than 3 shanks, starvation | WIP |
| 5.5 | Eating: hold right-click, particles, sound | WIP |
| 5.6 | Fall damage | WIP |
| 5.7 | Drowning: air bubbles in the HUD, water breathing | WIP |
| 5.8 | Fire and lava damage, burning overlay, catching fire | M |
| 5.9 | Suffocation inside blocks, damage in the void | M |
| 5.10 | Death screen "You died!" (cause, score, Respawn, Title Screen); dropping all items and XP; keepInventory rule | WIP |
| 5.11 | Spawn point, compass, recovery compass | M |
| 5.12 | XP orbs from mobs, ores, smelting and breeding; level-up sound; XP bar fills | P (static display) |
| 5.13 | Crawling, swimming animation (sprint in water), climbing ladders and vines, elytra gliding, riding (horse, boat, minecart, pig, strider) | M |
| 5.14 | Sneaking stops you falling off edges | M |
| 5.15 | Status effects: speed, slowness, haste, strength, regeneration, poison, wither, fire resistance, night vision, invisibility, jump boost, levitation, slow falling and more, with HUD icons and timers | WIP (food buffs only) |
| 5.16 | Hand animations in first person: swing, eating, drawing a bow, shield raised, map held | P |
| 5.17 | Player skin layers (second layer), slim arms model, cape | M |
| 5.18 | Statistics and advancements screen (advancement tree with tabs, toasts) | M (toast WIP) |

## 6. Combat
| # | Requirement | Status |
|---|---|---|
| 6.1 | Attack cooldown indicator (crosshair or hotbar), damage scaled by charge | WIP |
| 6.2 | Critical hits (falling), sweep attack (sword), knockback, invulnerability frames | WIP |
| 6.3 | Shield: blocking, disabled by axes, durability, banner pattern on the shield | WIP |
| 6.4 | Armor points and toughness, armor bar, armor visible on the player model, enchanted armor | WIP |
| 6.5 | Ranged weapons: bow (charge, arrows stuck in blocks), crossbow (loading, multishot, fireworks), trident (throw, riptide, loyalty), snowballs, eggs, ender pearls | M |
| 6.6 | Mace (smash attack), spear | M |
| 6.7 | Enchantments (Sharpness, Protection, Efficiency, Unbreaking, Fortune, Silk Touch, Mending, Looting, Fire Aspect, Power, Infinity, Feather Falling and more) | M |
| 6.8 | Potions and splash potions in combat | M |
| 6.9 | Totem of Undying | M |

## 7. Mobs and entities
| # | Requirement | Status |
|---|---|---|
| 7.1 | Real mob AI: pathfinding around blocks, jumping up steps, avoiding water and lava, following, fleeing | P |
| 7.2 | Spawning rules: hostiles in darkness or at night, passives on grass, caps, despawning far away | M |
| 7.3 | Hostile mobs: zombie (and its variants), skeleton (bow), creeper (hiss and explosion), spider (climbs), enderman (teleports, carries blocks), witch, slime, drowned, phantom, pillager, vindicator, evoker, ravager, silverfish, cave spider, guardian, blaze, ghast, piglin, hoglin, wither skeleton, shulker, warden, breeze | M |
| 7.4 | Passive mobs: cow, chicken (eggs), pig (exists, no drops), sheep (exists: shearing, 16 wool colors, regrowing), horse, donkey, llama, rabbit, fox, wolf (taming, sitting), cat, parrot, bee, turtle, axolotl, frog, goat, camel, sniffer, armadillo, villager, wandering trader, iron golem, snow golem, fish, squid, dolphin | P |
| 7.5 | Breeding with food, baby mobs that grow up, love hearts | M |
| 7.6 | Mob drops and XP (pork, mutton, wool, leather, feathers, bones, string, gunpowder, rotten flesh, ender pearls) | M |
| 7.7 | Hurt flash, knockback, death tip-over animation, smoke puff, hurt and death sounds, idle sounds | P (Troll only) |
| 7.8 | Name tags, leads, saddles | M |
| 7.9 | Villagers: professions, trading UI (trades on the left, level bar, offer lists), restocking, gossip, raids | M |
| 7.10 | Bosses: Ender Dragon, Wither, Elder Guardian, Warden; boss bars (exists for the Troll) | P |

## 8. Day, night, weather and environment
| # | Requirement | Status |
|---|---|---|
| 8.1 | 20-minute day/night cycle: sun and moon, 8 moon phases, stars, sunrise and sunset colors | WIP |
| 8.2 | Weather: rain (particles, splashes, sound, darker sky), thunderstorms (lightning that sets fire and creates charged creepers), snow in cold biomes | M |
| 8.3 | 3D "fancy" clouds | P (flat clouds) |
| 8.4 | Underwater view: blue fog, reduced visibility, bubble particles | M |
| 8.5 | Ambient particles (water drips, smoke, lava pops, falling leaves, spores) | M |
| 8.6 | Cave ambience sounds, biome music, music discs | P |

## 9. HUD and screens
| # | Requirement | Status |
|---|---|---|
| 9.1 | Exact Minecraft GUI scale setting (1–4 or Auto) applied to all UI | M |
| 9.2 | HUD: hearts with half hearts, hunger shanks shaking when low, armor bar, air bubbles, XP bar and level, mount health, boss bars, attack indicator, hotbar, offhand slot next to the hotbar | P |
| 9.3 | Subtitles and action-bar messages, title/subtitle overlays | P |
| 9.4 | Real chat: T to open, text box, command history, / commands (/give, /tp, /time set, /weather, /gamemode, /summon, /kill, /seed), tab completion | M |
| 9.5 | Advancements screen (L), statistics screen | M |
| 9.6 | Main menu: Singleplayer world list (create, edit, delete; game mode; difficulty; seed; world type), Multiplayer, Options, Quit; splash text (exists), panorama (exists) | P |
| 9.7 | Options: video settings (render distance, graphics, smooth lighting, FOV slider, GUI scale, brightness, particles, clouds, VSync, max FPS), sound sliders per category, controls/key binds, mouse sensitivity, language, accessibility, resource packs | M |
| 9.8 | Pause menu: Back to Game, Advancements, Statistics, Options, Open to LAN, Save and Quit | P |
| 9.9 | Loading screen ("Generating terrain" with chunk progress) | M |
| 9.10 | F3 debug screen: full info (biome, light levels, facing, targeted block and fluid), F3+B hitboxes, F3+G chunk borders, F3+T reload | P |
| 9.11 | F2 screenshot | M |
| 9.12 | Maps: craftable, filled in as you explore, zoom levels, markers | M |

## 10. Saving and persistence
| # | Requirement | Status |
|---|---|---|
| 10.1 | Save the world: block changes, player position, inventory, time, entities; autosave; multiple worlds | M (inventory WIP) |
| 10.2 | "Save and Quit to Title" | M |

## 11. Multiplayer
| # | Requirement | Status |
|---|---|---|
| 11.1 | Multiplayer servers, LAN, Realms, player list (Tab), other players' name tags, skins | M (needs a server) |

## 12. Mobile (Bedrock touch) specifics
| # | Requirement | Status |
|---|---|---|
| 12.1 | D-pad or joystick choice, split controls (crosshair mode), auto-jump toggle, touch hotbar with a "…" inventory button, chat and emote buttons, pause in the corner | WIP |
| 12.2 | Tap to place, hold to break with a progress ring, haptics | WIP |
| 12.3 | Touch-friendly inventory: tap to move, long-press to split, crafting with a recipe book | WIP |
| 12.4 | Performance options for phones | WIP |

## 13. Audio
| # | Requirement | Status |
|---|---|---|
| 13.1 | Positional 3D sound (mobs, blocks), per-material sounds for step, place, break and hit, ambient cave sounds, rain, water sounds, menu click (exists), separate volume categories | P |

# Blockcraft story and flow: Valheim-style experience, Minecraft look

**Goal:** The game looks and feels like Minecraft (blocks, pixel UI, panels, tooltips, font), but you play it like Valheim. That means the same story structure, the same progression gates, the same pacing in the first hour, and the same survival rules.
**Rule:** We copy the *structure* one to one, but **never** Valheim's names, dialogue, lore or on-screen text. Every name and line below is our own.

Code we build on: `World` / `Meadows` (js/valheim.js), `DarkForest` (js/darkforest.js), `Inv` / `ITEMS` / `addRecipe` / `STATIONS` (js/items.js), `Combat` (js/combat.js), `Stations` (js/blocks.js: furnace, chests, bed, torches, light, shapes), and `Mobs` / `Save` (js/mobs.js).

---

## 0. Names used everywhere

| Valheim role (structure only) | Blockcraft name |
|---|---|
| The afterlife world the hero is sent to | **Skarnholm**, "the isle at the edge of the north" (later the whole sea of isles: **the Skarn Reach**) |
| The god-figure who sends you | **The All-Watcher** (never seen; only spoken of by the ravens) |
| The winged carrier who drops you off | **A storm-gull** (a giant blocky white bird, a cut-scene only) |
| The starting stone circle with trophy mounts | **The Ring of Oaths**: 7 standing stones around a flat centre stone |
| Two raven guides | **Korra** (talkative, practical tips; already in the game) and **Vesk** (silent until the lore stones; reads them aloud, speaks in short riddles) |
| The forsaken bosses | **The Bound**: seven old powers the All-Watcher chained to the isles |
| Lore stones | **Rune stones** (lore; exist now) and **Waystones** (they mark a boss altar on the map) |
| Boss powers | **Oath powers** (you activate them at the Ring of Oaths) |

**The arc in one paragraph:** You died a warrior's death somewhere far away. The All-Watcher didn't let you rest: he sent you to Skarnholm, where the seven Bound are chained, and the Bound are breaking their chains. A storm-gull carries you over the sea and drops you in the Ring of Oaths with nothing. Korra explains the deal: hunt each Bound in its own land, bring its head back to the Ring, and hang it on a stone. When all seven stones carry a head, the Ring opens a path to the Hall of the Watcher and you ascend. Each boss you kill gives a material that opens the next land, and a head that grants a power. Vesk reads the old stones, which slowly tell you *why* the Bound were chained: they were the All-Watcher's own first champions, cast out when they grew too strong. The last stone hints that you are being shaped into the next one.

---

## 1. The story arc, chapter by chapter

The structure in every chapter is the same as Valheim's: **arrive in a new land, meet new enemies, find a new resource, which needs the last boss's drop or tool to harvest, a Waystone shows the altar, collect the summon item, fight the boss, get its drop (opens the next land) and its head (hang it at the Ring for a power).**

Legend: **[EXISTS]** = built now, **[CHANGE]** = built but has to change, **[NEW]** = still to build.

### Chapter 0: Arrival [NEW]
- **Cut-scene (8 to 10 s, can be skipped):** a black screen, then subtitle 1: *"You fell with your blade in hand. The All-Watcher saw."* The camera follows a storm-gull carrying the blocky player low over a pixel sea at dawn. It drops the player at the Ring of Oaths with a thump, dust particles and the title **SKARNHOLM**.
- **The Ring of Oaths:** a circle of 7 mossy stone pillars, 4 blocks tall, with a radius of 6 around a 3x3 centre stone. Each pillar has an empty trophy mount (an item-frame-like face). Hovering a mount shows the outline of the head it wants: *"An empty mount. It waits for a Bound's head."* The Ring is protected: no enemy spawns within 24 blocks, and it is the default spawn point.
- Korra lands on pillar 1 (the intro lines are in §2).

### Chapter I: The Meadows [EXISTS, CHANGE]
- **Boss:** **Stormhorn**, a lightning stag. **Altar:** the Stag Altar.
- **Summon item:** 2 Deer Trophies. Deer drop them 10% of the time (Valheim-like odds; raise the drop to 25% for the first two).
- **Drops:** Stormhorn Trophy (the head, hung at the Ring) and 3 Hard Antler. This gives the **Antler Pickaxe**, which mines copper and tin.
- **Oath power, "Stormstride":** running and jumping cost 60% less stamina for 5 minutes.
- **Enemies:** Greylings (exist), boars (exist), deer (exist), and at night, rare Forest Trolls at the forest edge (exist).
- **Rune stones (Vesk reads them):** 1 "Of the Ring": the seven mounts; 2 "Of the stag": Stormhorn was the first Bound, the All-Watcher's own hunting beast. A **Waystone** near the meadow centre pins the Stag Altar on the map.
- **What must change to match Valheim's flow:**
  1. Start at the **Ring of Oaths**, not at a character's home. Remove the starter kit (see §4).
  2. Korra's current intro says to hunt deer *at once*. Valheim's flow is gather, then tools, then shelter, then hunt. Replace the opening with the §2 quest line; the deer trophies come at step 10.
  3. Stop showing the altar direction from the start. Reading the **Waystone** reveals it (a map pin plus a compass line in the tracker).
  4. Killing Stormhorn must also say: *"Carry the head to the Ring of Oaths."* Hanging it there unlocks the power and fires `advance('oath1')`.
  5. Swap the Stormhorn end text "Rest, then we go on" for an explicit pointer: pickaxe, then the Dark Forest. The text mostly exists already.

### Chapter II: The Dark Forest [EXISTS, CHANGE]
- **Boss:** **The Old Root**, a tree giant. **Altar:** the Root Shrine.
- **Summon item:** 3 Ancient Seeds, dropped by Greyling Shamans. This exists and matches Valheim.
- **Drops:** the Old Root Trophy plus a **Drowned Key** [NEW]. The key opens the sunken crypt doors in the Swamp; this is the gate Valheim uses. Today the drop is a "Rootheart" and nothing is gated, so make the Rootheart the trophy (head) and add the key.
- **Oath power, "Rootgrip":** +50% damage to trees and logs, and wood drops +1, for 5 minutes.
- **Resources:** copper, tin, bronze, ember cores from crypt urns, pine wood ("core wood"), blueberries, mushrooms, and thistle in clearings [NEW].
- **New in this land (Valheim order):** the **Smelter** (exists) and the **Charcoal Kiln** [NEW], then the **Forge** [NEW] for bronze gear (today it's made at the workbench), the **Cauldron** after tin, a **Karve-style boat** "Skiff" that needs bronze nails, and a **portal**. In Valheim, Greydwarf eyes plus a surtling core make a portal; ours uses Greyling eyes, fine wood and an ember core.
- **Lore:** rune stones exist. Add one Waystone that reveals the Root Shrine. Today the tracker shows the shrine directly, so gate it behind the stone.
- **What must change:**
  1. Bronze weapons and armour move from the Workbench to the **Forge** (copper 6, stone 4, wood 4, ember core 1; it needs a Workbench nearby).
  2. Smelting must use **charcoal**, not wood. This is the Valheim rule: coal comes from the kiln.
  3. Add bronze armour (helm, chest, legs) at the Forge.
  4. Add **Troll hide armour**. The recipe exists, so only gate it to the Workbench level 2 upgrade, the "Tanning Rack".
  5. End text: point to the Swamp and the **Drowned Key**, and tell the player to build a Skiff or portal, since the Swamp is across water.

### Chapter III: The Swamp [NEW]
- **Land:** black water, dead trees, rain all the time (the **Wet** status), poison everywhere. Enemies: Drowners (fish-men), Bog Wraiths (night ghost), Leeches in the water, Blobs (poison ooze), Rotting Dead.
- **Gate:** the **Sunken Crypts** are locked and open only with the Drowned Key. Inside are **Scrap Iron** piles (mined with the Antler Pickaxe or better) and **Grave Bones**.
- **Boss:** **Rotmaw**, the flesh maw. **Altar:** the Bone Pit, revealed by a Waystone in a crypt.
- **Summon item:** 10 Grave Bones.
- **Drops:** Rotmaw Trophy plus the **Dowsing Bone**, an equippable util item. It pings when silver ore is within 30 blocks, the gate for the next land.
- **Oath power, "Ironhide":** −80% blunt, slash and pierce damage taken for 5 minutes.
- **Unlocks:** the iron tier (iron mace, sword, armour), Forge upgrades (anvil), the **Fermenter** (made from bronze) and the first meads, and the **Longship**, "Drakar" (iron nails).
- **Story beat (Vesk):** *"The maw ate the drowned to stay young. The Watcher fed it once."*

### Chapter IV: The Mountains [NEW]
- **Land:** snow and peaks. **Freezing** happens here unless you wear wolf cloaks or drink a Frost Mead. Enemies: Snow Wolves (tameable), Frost Drakes, Stone Golems, Cliff-folk caves.
- **Gate:** silver. You find it with the Dowsing Bone and mine it with an iron pickaxe.
- **Boss:** **Frostwing**, a dragon. **Altar:** the Peak Altar.
- **Summon item:** 3 **Frost Eggs**. They sit in drake nests on peaks, and you carry one at a time because they are heavy (weight 200).
- **Drops:** Frostwing Trophy plus **Frost Tears**. These make the **Artisan Bench**, the "Craftsman's Bench", which builds windmills, spinning wheels and ballista-style defences.
- **Oath power, "Tailwind":** sailing always has wind from behind, for 5 minutes.
- **Unlocks:** silver gear, frost resistance, wolf taming and the stonecutter (stone building pieces).

### Chapter V: The Plains [NEW]
- **Land:** golden grass, blackberry-like bushes, and **Tusklings** (goblin villages with walls, a shaman and a brute) that drop **Black Metal Scrap**. Lox-like **Woolhorns** can be tamed. Deathsquito-like **Needleflies** are the main danger.
- **Gate:** black metal needs the **Blast Furnace**, the "Bellow Furnace", which needs the Artisan Bench. Flax and barley farming need the cultivator and the windmill/spinning wheel.
- **Boss:** **The Brass Colossus**, an armoured golem. **Altar:** the Brass Throne.
- **Summon item:** 5 **Tuskling Effigies** (the shaman totems).
- **Drops:** Colossus Trophy plus a **Bound Wisp**. It makes the **Wisp Lantern**, which clears the mist and is the gate to Chapter VI.
- **Oath power, "Warded":** −50% fire, frost, lightning and poison damage for 5 minutes.

### Chapter VI: The Mist [NEW]
- **Land:** thick fog that blocks vision (the Wisp Lantern clears a 12-block radius), jagged spires, giant bones, and insect-like **Seekers**. The **Hollow Halls** are infested mines: dwarven-like ruins where the enemies are dark knights.
- **Gate:** **Seal Shards** (3) from the Hollow Halls make the **Sealbreaker**. It opens the sealed citadel.
- **Boss:** **The Hollow Knight**, a dark knight with a teal visor. It fills the "Deep Halls" slot in DESIGN.md, so rename that row. **Arena:** the sealed citadel, using the DESIGN.md boss scene recipe.
- **Summon:** using the Sealbreaker on the citadel door.
- **Drops:** Knight Trophy plus **Hollow Essence**. This unlocks **runic magic**: the "Eitr" equivalent is **Wyrdlight**, a third bar (blue) under stamina, and staffs.
- **Oath power, "Deep Breath":** +100% Wyrdlight regen, +30% stamina regen.

### Chapter VII: The Ash [NEW]
- **Land:** lava rivers, charred fortresses, ember skeletons and fire golems (DESIGN.md "fire-headed golem"). You need boats with fire protection to reach it.
- **Gate:** **Cinder Bells** (3), held in the three charred fortresses.
- **Boss:** **The Ember Warden**, a winged fire wyrm. **Altar:** the Ash Ring, the last Waystone.
- **Drops:** Warden Trophy plus the **Ashen Crown**.
- **Oath power, "Cinderstep":** +10% move speed, fire immunity, and less fall damage.
- **Ending:** hanging the 7th head lights the whole Ring. Korra and Vesk land together and say the final dialogue: *"Seven heads. Seven oaths kept. The Watcher's door is open. Will you walk through... or will you sit on his seat?"* Then the credits roll. The Ring stays as a hub, and post-game starred bosses can be summoned again with the summon items.

### Dialogue beats per chapter (the same template every time)
1. **Enter the land** (title card): `CHAPTER N` plus the land's name in its accent colour. Korra gives 2 lines: what's dangerous here and what the resource is.
2. **First new resource:** Korra says what it's for and which station needs it.
3. **First new station built:** Korra gives one line on what it unlocks.
4. **Waystone read:** Vesk speaks one riddle line, a map pin appears, and the tracker changes.
5. **Summon item complete:** Korra says "you carry enough" and points to the altar.
6. **At the altar:** Korra warns about 2 attacks and how to dodge them.
7. **Boss dead:** Korra points to the head ("take it to the Ring") and the drop ("this opens …").
8. **Head hung:** Vesk gives a lore line about this Bound's past, and the power's name and effect show in a toast.

---

## 2. The first 30 minutes, step by step (Valheim's opening, our words)

The tracker sits top-right as **`vhGoal`** (exists). The format is one bold line plus a progress count. Korra's hints use the existing `korra()` dialogue. A "stuck" hint fires when a step lasts more than 120 s (the `stuckT` pattern in darkforest.js). Each step has a stable id for `advance()` and for saving.

| # | Step id | Trigger to finish | Tracker text | Korra / Vesk |
|---|---|---|---|---|
| 0 | `arrive` | the cut-scene ends | *(hidden)* | Korra lands: "Kraa! Up, up. The gull doesn't come back for anyone." / "You're on Skarnholm, in the Ring of Oaths. Seven stones, seven empty mounts." / "Somewhere on these isles the Bound are waking. Hunt them. Bring their heads here." / "But you have nothing, not even a stick. Start there. Kraa!" |
| 1 | `gather` | holding 3 Wood **and** 3 Stone | `Pick up branches and stones: Wood x/3, Stone x/3` | "Branches lie under every tree, and loose stones lie in the grass. Walk over them, or press **E** / tap them." Stuck: "Look down! Grey pebbles and brown sticks on the ground near the Ring." |
| 2 | `club` | crafted a **Wood Club** (no station) | `Craft a Club: open your inventory (E), 6 Wood` | "That's a club. Ugly, but it cracks skulls." |
| 3 | `torch` | crafted a **Torch** (no station: 1 wood + 1 resin) | `Craft a Torch: 1 Wood, 1 Resin (Greylings drop resin, and pine trees bleed it)` | "Night here is very dark. Fire keeps the grey folk away." (In Valheim the opening torch needs only wood and resin, and resin is found early. Our early Greylings drop resin, and 1 resin is found at the Ring as a pickup.) |
| 4 | `hammer` | crafted a **Hammer** (no station: 3 Wood, 2 Stone) | `Craft a Hammer: 3 Wood, 2 Stone` | "A hammer! With it you build, not just break." |
| 5 | `chop` | holding 10 Wood (hit trees with the club or bare hands; a log breaks into wood) | `Gather wood: x/10 (hit a tree)` | "Trees fall slowly with a club. An axe needs flint." |
| 6 | `workbench` | placed a **Workbench** through the hammer menu (10 Wood) | `Build a Workbench: equip the Hammer, right-click to open the build menu` | "The bench is the heart of a camp. Near it you can build walls, roofs and tools." |
| 7 | `shelter` | the **Shelter** status icon is on and a **Campfire** (5 Stone, 2 Wood) burns within 5 blocks | `Build a shelter: walls, a roof and a campfire inside` | "Rain, wind, the grey folk... a roof stops two of them." |
| 8 | `rested` | received the **Rested** buff (sit by the fire under the roof for 20 s) | `Rest by the fire under a roof (Rested)` | "Feel that? Warm, dry, Rested. Your stamina comes back faster now." Tip toast: "Rested: +50% stamina regen. Comfort level adds time." |
| 9 | `flint` | crafted a **Flint Axe** **or** a **Flint Spear** at the Workbench | `Find flint on the shore and craft a Flint Axe at the Workbench (Wood 5, Flint 4)` | "Flint sits on the beaches: grey-black stones at the water's edge." Stuck: "Walk to the sea. Flint lies near the waves." |
| 10 | `bow` *(optional; it only shows a hint)* | crafted a **Crude Bow** (Wood 10, Leather Scraps 8) | `(Optional) Craft a Crude Bow: Wood 10, Leather Scraps 8 (boars)` | "Deer run. Arrows don't care." |
| 11 | `hunt` | killed 1 deer | `Hunt a deer (they flee: sneak, or use the bow)` | "Low and slow. Deer can hear your boots." |
| 12 | `cook` | cooked 1 Raw Meat on a **Cooking Spit** over a campfire | `Cook meat: build a Cooking Spit over the fire (Wood 2)` | "Raw meat is a bellyache. Hang it over the fire, and take it off before it burns!" |
| 13 | `eat` | 2 foods active at the same time | `Eat two different foods (berries + cooked meat)` | "One food fills one slot. Three different foods make you strong." |
| 14 | `bed` | placed a **Bed** under a roof near a fire, and slept or set spawn | `Build a Bed under the roof, near the fire (Wood 8)` | "If you fall, you wake here instead of the Ring." |
| 15 | `waystone` | read the meadow **Waystone** | `Find the Waystone in the meadows (Vesk circles it)` | Vesk's first words: "...a stag of storm... drinks where the stones stand tall..." The altar is pinned on the map. |
| 16 | `trophies` | holding 2 Deer Trophies | `Deer Trophies: x/2` | at 1/2: "The isle has noticed you." at 2/2: "Enough. To the Stag Altar." |
| 17 | `summon` | used the Stag Altar | `Offer 2 Deer Trophies at the Stag Altar (N m, NE)` | Altar beat (exists) plus "It charges with its head down. Roll to the side. When the ground crackles, run." |
| 18 | `boss` | Stormhorn dead | `Defeat Stormhorn!` | *(boss bar)* |
| 19 | `hang` | hung the Stormhorn Trophy at the Ring | `Hang the Stormhorn Trophy at the Ring of Oaths` | Korra: "Hang it. Let the Watcher see." Vesk: "First of seven. The stag ran for him once." Toast: **Oath power: Stormstride** |
| 20 | `power` | activated the power with **R** | `Press R to call on Stormstride` | "It doesn't last, and the Ring needs time to recharge it. Use it when it matters. Kraa!" |
| 21 | `pickaxe` | crafted an **Antler Pickaxe** | `Craft an Antler Pickaxe at the Workbench (Wood 10, Hard Antler 2)` | This connects to the Chapter II `pick` step, which exists. |

**Timing target:** steps 1 to 8 take about 10 min, 9 to 14 about 10 min, and 15 to 21 about 10 min. The night falls around step 9 or 10 (the existing night beat), and the first Greyling attack comes then.

**Ground pickups needed (new):** a `branch` and a `pebble` drop-entity (use `World` item drops; `spawnDrop` exists). Scatter about 40 of each around the Ring at the start and respawn them over time under trees and in grass. Picking one up gives `wood` / `stone`. Add `flint` pickups on sand next to water.

---

## 3. Valheim core mechanics: status and spec

Status: **EXISTS** · **PARTIAL** · **MISSING**. Each spec is written for Minecraft-style UI: panels are `#C6C6C6` with a bevel, and icons are 16x16, as DESIGN.md §2 describes.

| # | Mechanic | Status | Notes and spec |
|---|---|---|---|
| 1 | Stamina | **EXISTS** | combat.js (`CFG.stamina`, sprint and jump costs, exhaustion). Base stays 50; foods add to it (exists). |
| 2 | Block / parry / dodge / stagger | **EXISTS** | combat.js (`parryWindow .25`, dodge i-frames, stagger 2.2 s). |
| 3 | 3-slot food | **PARTIAL** | `maxFoods: 3` with timers exists, but the Minecraft hunger bar stays and drives regen. **Spec:** remove the hunger bar. Base HP is 25 (12.5 hearts shown as half-hearts). Each food adds `+hp, +stamina` for `secs`, and the bonus fades linearly over the last 1/3. Show 3 food icons right of the hearts, with a pie-timer overlay. You can't eat the same food twice until it is under 50%. Starvation is removed. Health regen = 1 hp every 10 s per active food. |
| 4 | Skills that level by use | **MISSING** | **Spec:** skills are Swords, Knives, Clubs, Spears, Axes, Polearms, Bows, Unarmed, Blocking, Woodcutting, Pickaxes, Run, Jump, Swim, Sneak, Cooking and Farming (later: Wyrdcraft). Each goes 0 to 100. XP to the next level = `(lvl+1)^1.5 * 0.5 + 0.5`. You gain XP from **use**: a hit lands (weapon skill), a block absorbs damage, a tree or rock takes a hit, you sprint (1 per 4 s), you jump. Effect: weapon damage `×(1 + lvl/100)`, and the stamina cost of that action `×(1 − 0.33·lvl/100)`. The skill also makes it faster (woodcutting/pickaxes damage, run speed +25% at 100). **UI:** **K** opens "Skills", a Minecraft panel with one row per skill: 16x16 icon, name, level, and a green XP-bar-style progress bar (the MC XP bar texture). A level-up toast in the advancement style shows "Swords 12". Saved per player through `Save`. |
| 5 | Death: tombstone, skill loss, "No skill drain" | **MISSING** (only the "You died!" screen exists) | **Spec:** on death, the whole inventory (not the hotbar of a starter kit) goes into a **Tombstone** block at the death spot: a small stone headstone with the player's name. It is a chest-like GUI where "Take all" moves everything back. A map pin "Tombstone" is added. You lose 5% of **each** skill's level. You respawn at the bed or the Ring with an empty inventory, which is why the Ring stays enemy-free. On picking up the tombstone you get the **"Second Wind"** buff (our "corpse run"): +stamina regen and carry weight +150 for 50 s. A buff after respawn, **"Spared"** (our no-skill-drain), lasts 10 min: dying again during it costs no skill. The status icon is a skull with a green outline. The Minecraft "Score" line on the death screen goes away. |
| 6 | Carry weight | **PARTIAL** | Every item has `weight`, but there is no limit. **Spec:** the max is 300 (+150 with the **Strength Belt**, a later util item). The weight shows in the inventory panel under the player preview: `Weight 112/300` (`#404040`, red when over). Over the limit: walking only (no sprint, no jump), and the status icon "Overloaded" shows. Ore and metal are heavy (ore 10, ingot 8, stone 2, wood 2). |
| 7 | Comfort and Rested | **MISSING** | **Spec:** Shelter = no sky light above (`skylight == 0` at the head) **and** at least 8 of the 12 cells within 2 blocks are enclosed. Rested is granted after 20 s of `shelter && fire within 5 blocks` (campfire, hearth or lit furnace). Comfort level = 1 + fire (1) + bed (1) + chair/bench (1) + table (1) + rugs/banners (1 each type) + hearth (2), max 17 later. Rested lasts `8 min + 1 min × comfort`. Effects: +50% stamina regen, +50% health regen, and skill XP ×1.5. The status icons (exist as a system in combat.js) are "Shelter" (a house), "Rested" (a zZ) and "Resting" (a zZ, pulsing). |
| 8 | Hammer build menu and structural support | **MISSING** (blocks are placed directly from the hotbar) | **Spec:** equip the Hammer (3 Wood, 2 Stone, no station) and right-click to open the **Build Menu**. It is a Minecraft creative-inventory-style panel with tabs at the top (Misc, Crafting, Building, Furniture, Defense) and an 9×N grid of pieces. Each tooltip shows the cost list, green when you have it and red when you don't. Pick a piece, and a ghost preview (green or red tint) follows the cursor. **Q/E** rotate, scrolling while holding Shift cycles the snap. Left-click builds and costs the materials. Middle-click on a placed piece removes it and refunds the materials. Building needs a Workbench within 20 blocks for every piece except the Workbench, Campfire and Hammer-only items. **Support:** every player-built cell has `support 0..1`. If it touches natural terrain, it is 1. Otherwise it is the max of its neighbours' support minus the material loss (wood −0.15 on vertical steps, −0.25 on horizontal; stone −0.05 / −0.5; iron −0.05 / −0.12). Below 0.05 the piece breaks (falls as item drops). With the hammer equipped and the preview shown, it tints by support: **blue** = grounded, **green** > 0.6, **yellow** > 0.35, **orange** > 0.15, **red** below that. Normal hotbar block placing stays only for blocks from crafted *block items*. Decide in §4. |
| 9 | Hoe and cultivator | **MISSING** (only the Minecraft hoe icon) | **Hoe** (Wood 5, Stone 2, Workbench): its build menu has *Level ground* (flattens a 3x3 to the clicked height, adding or removing dirt) and *Path* (dirt-path block, +15% move speed). **Cultivator** (Core Wood 5, Bronze 5, Forge): *Cultivate* turns grass into a tilled block, *Plant* uses seeds (carrot, turnip, barley, flax). Crops need 3 in-game days to grow, need no water, and do not grow under a roof. |
| 10 | Repair | **MISSING** | **Spec:** in the Hammer menu, select the *Repair* tool (wrench icon) and click a damaged station piece. In the Workbench/Forge GUI, a **Repair** button (an anvil icon in the Minecraft button style) fully repairs all items of that station's type and level in your inventory. You can't repair a station level below the item's level ("Requires Forge level 3"). |
| 11 | Workbench and Forge upgrades | **MISSING** (the Workbench is a Minecraft 3x3 grid) | **Spec:** stations have **levels**. The Workbench is 1, plus the Chopping Block (+1), Tanning Rack (+1), Adze (+1) and Tool Shelf (+1), up to 5. The Forge is 1, plus the Anvils, Grinding Wheel, Smith's Anvil, Forge Cooler and Forge Toolrack, up to 7. An upgrade must be within 5 blocks of the station and under its roof. **The GUI changes** from the Minecraft 3x3 grid to a **Valheim-style recipe list in a Minecraft panel**: a scrolling list of craftable items (left), and on the right the item icon, description, cost slots and a big "Craft" button. Upgrading an item (quality 1 to 4) is a second tab, "Upgrade". Keep the 2x2 inventory grid **only** for the no-station starter recipes, or remove it (§4). |
| 12 | Cooking station and cauldron | **PARTIAL** (the Furnace cooks meat) | **Cooking Spit** (Wood 2, placed over a campfire): right-click with raw meat to hang it on one of 2 slots. It is done after 25 s (the meat turns brown, with a "pop" sound). If you leave it for 25 s more it burns into **Coal**. Right-click takes it off. **Cauldron** (Tin 10, Forge; it must sit over a fire) opens a recipe-list GUI for stews and soups (e.g. "Hunter's Stew": 2 cooked meat, 2 mushrooms, 1 carrot). Remove the meat-smelting recipes from the Furnace. |
| 13 | Fermenter and meads | **MISSING** | **Fermenter** (Fine Wood 30, Bronze 5, Resin 10). Mix a **mead base** at the Cauldron, put it in the Fermenter, wait 2 in-game days, and get 6 meads. Meads are drinkable with a cooldown shown by a status icon: Minor Healing Mead (+50 hp over 10 s, 2 min cooldown), Minor Stamina Mead, Poison Resistance Mead (Swamp) and Frost Resistance Mead (Mountains). They use the Minecraft potion-bottle icon shape. |
| 14 | Oath (boss) powers | **MISSING** | **Spec:** hang the head on its Ring mount (right-click the empty mount while holding the trophy). Then right-click any **filled** mount to make that power your active one ("Stormstride selected"). Only one power is active at a time. Press **R** (or the mobile "Power" button) to activate it: it lasts 300 s with a 1200 s cooldown. A HUD icon sits left of the hotbar and shows the head, a grey pie for the cooldown, and a glow while active. Effects are in §1. Changing the selected power at the Ring does not reset the cooldown. |
| 15 | Portals with tags | **MISSING** | **Portal** (Fine Wood 20, Greyling Eye 10, Ember Core 2; Workbench). You place it as a 3-wide by 4-high frame. Right-clicking opens a Minecraft anvil-style text field: "Tag". Two portals with the same tag link (swirl effect). Walking in teleports you after 1 s, with a dimension-style overlay. You **cannot carry ores or metals** through: the message "The portal will not take what the earth gave you." |
| 16 | Boats and sailing | **MISSING** | **Raft** (Wood 20, Resin 6, Leather Scraps 6): slow and paddle only. **Skiff** (Fine Wood 30, Bronze Nails 80, Deer Hide 10, Resin 20): paddle plus a sail with 3 settings. **Drakar** (Iron Nails 100, …): cargo chest. The wind direction rotates every 2 to 5 min, and a wind arrow shows on the minimap. The sail's speed is the dot product of the wind and the boat's heading. Controls: W/S cycles the sail level, A/D steers, E boards and exits. The Tailwind power makes the wind always from behind. Serpents (sea boss-like enemy) appear in deep water during storms. |
| 17 | Map with pins and minimap | **MISSING** | **M** opens a full-screen map (in Valheim, M also toggles music, which must move: §4). The map is a parchment-textured pixel map, showing only **explored** areas (fog of war is revealed in a 50-block radius as you walk). Pins: double-click adds one, and a Minecraft-panel picker sets the icon and a text name. The auto pins are Tombstone, Waystone-revealed altars, beds and portals. The **minimap** is a top-right square of 128 px, under the tracker, centred on the player and rotating with the player. "Off by default" style: a setting has `Minimap: On / Off / Nomap mode` (Nomap: no map at all). |
| 18 | Raids / events | **MISSING** | Our text, shown as a big red title (DESIGN.md "raid warning") plus a top bar with a timer. They roll every 46 min when you are near your base (8 or more player-placed pieces within 30 blocks plus a station), and only after the matching boss is dead. **"The pines are walking..."**: Greylings (after Stormhorn). **"Eyes in the dark. Something hunts you."**: wolves (after the Old Root). **"The earth groans and shifts..."**: roots (after the Old Root). **"A stench rolls in from the bog."**: Blobs (after Rotmaw). **"Frost bites the wind. Wings overhead."**: Drakes (after Frostwing). **"War drums beyond the hills!"**: Tusklings (after the Colossus). It ends when all are dead or after 90 to 150 s: "The threat has passed." |
| 19 | Wet / Cold / Freezing | **MISSING** (no weather) | Weather states: Clear, Rain, Storm, Fog, Snow (in the Mountains). **Wet**: in rain without shelter, or after swimming; it lasts 60 s and gives −25% health regen and stamina regen. **Cold**: at night or in Wet + wind outdoors; −50% health regen. **Freezing**: in the Mountains without frost resistance; −1 hp/s and −50% stamina regen. The icons are blue droplets, a snowflake, and a red snowflake. Standing near a fire removes Cold. |
| 20 | Creature stars / levels | **MISSING** | On spawn, 10% get ★ (2× hp, +50% damage) and 1% get ★★ (3× hp, +100% damage). The chance is higher at night and in later lands. The stars show as gold ★ above the name tag (the Minecraft name-tag style exists). They drop 2× / 3× loot. Tamed ★ animals breed ★ offspring. |
| 21 | Taming | **MISSING** (Minecraft breeding exists for pigs, cows and chickens) | Boars (Meadows: eat mushrooms, berries, carrots), Snow Wolves (meat), Woolhorns (barley, cloudberries). Drop food near a creature with no enemies or players within 4 blocks, and it eats. Taming takes 30 min (boar) of fed time, during which hearts particles show. Tamed = it follows you on E, stays on E again, and breeds when fed (offspring appear after 60 s). A tamed creature attacks your enemies. You can name it with the Minecraft name tag. |
| 22 | Smelter and charcoal kiln | **PARTIAL** (the Smelter block exists in darkforest.js; the Furnace takes coal, charcoal or wood) | **Spec:** the Smelter takes **charcoal only** as fuel (max 20) and **ore** (max 10). Each ore takes 30 s and needs 2 charcoal, and the ingot pops out of the front. The **Charcoal Kiln** (Stone 20, Surtling-like Ember Core 5) turns wood into charcoal (1 per 15 s, holds 25). Both are Valheim-style **interact-to-feed** objects: hold E with an item to add, no slot GUI. A tiny Minecraft panel above the block shows the counts. Remove the Furnace's smelting of ore (§4). |
| 23 | Beehive | **MISSING** | **Queen Bee** comes from the hives in abandoned houses in the Meadows (break one with a bow or club; the bees hurt). **Beehive** (Wood 10, Queen Bee 1): it makes 1 honey every 20 min, up to 4, and only if it's outdoors and in the Meadows. Honey is a food (+8 hp, +35 stamina) used in mead bases. |
| 24 | Ores and tiers | **PARTIAL** | Exists: flint, copper, tin, bronze, coal, iron ore (Minecraft). **Valheim tiers:** Wood → Flint/Stone → Bronze (copper + tin) → Iron (scrap iron, Swamp crypts) → Silver (Mountains) → Black Metal (Plains scrap) → Wyrdsteel/Carapace (Mist) → Flametal (Ash). A pickaxe tier gate (`tool.power`) exists in darkforest.js. Spread it to all ores: Antler 2 (copper, tin, scrap iron), Bronze 3, Iron 4 (silver), and Black metal 5. Move Minecraft iron ore and coal ore to (§4): reskin `iron_ore` into Scrap Iron in crypts, and take coal out of the world (it comes from the kiln, and as a drop from Ember spirits). |
| 25 | Day / night | **EXISTS** | valheim.js `World` (the night spawns of Greylings exist). |
| 26 | Bed and spawn point | **PARTIAL** | blocks.js bed (sleep, spawn). **Change:** a bed only works under a roof with a fire in range ("You need a roof and a fire to rest here"). Sleeping is allowed only at night. |
| 27 | Rune stones / raven | **PARTIAL** | Korra and the rune stones exist. **Add:** Vesk, Waystones (altar pins), and a Korra **"tips" toggle** in Options (Valheim-like "Hide ravens"). Korra also appears with a hint the first time you see a new thing: the first time you see flint, the first boar, the first troll, the first time you are Wet, and the first carry-weight warning. |
| 28 | Shields and weapons with stamina | **EXISTS** | items.js weapon `{dmg,speed,stamina}` plus combat.js. **Add:** damage types (blunt, slash, pierce, fire, frost, poison, lightning, spirit) for the swamp skeletons, which are weak to blunt. Darkforest already hints at this; formalize it in `Combat`. |
| 29 | Armour | **EXISTS** | 4 armour slots (exists). **Add:** a 5th "cape" slot and a 6th "utility" slot (Strength Belt, Dowsing Bone). Capes give the environmental resistances (Wolf Cloak = frost). |
| 30 | Item quality / upgrades | **MISSING** | Items have quality 1 to 4. Upgrading needs a higher station level and more materials. The tooltip line reads `Quality 2/4` (gold). Each quality level adds +durability and +damage. |
| 31 | Durability | **EXISTS** | items.js `wearOut`. Change: broken items do **not** vanish but become unusable "Broken" until repaired (Valheim rule). |

---

## 4. Remove or change (the user decides)

| Thing in the game now | Where | Recommendation | Why |
|---|---|---|---|
| **GTA-style character switch** (Saif, Rakan, Fahad; Tab/Q wheel; 3 bags; 3 homes) | index.html (DEFS, wheel, homes), items.js `bags`, mobile.js top-bar face | **Remove** for the main mode, or keep as an optional "Free roam" mode off the title screen | Valheim is one castaway who arrives with nothing. Three people with homes and a villa break the "arrive with nothing" loop and the death/tombstone loop. It also blocks Minecraft keys (Q = drop, Tab = list) and the power key flow. |
| **Character homes** (villa, house, desert camp, roads of grey concrete, quartz, glass) | index.html world gen | **Remove**, or **reskin** into **ruins**: an abandoned meadow house with a beehive and a chest of loot, and a ruined tower | Valheim lands have only ruins. Ready-built modern homes skip the shelter step. |
| **Starter kit** (club, 8 planks, 4 torches, 4 apples) | items.js `starterBag` | **Remove**: start with an empty bag | Valheim's opening is gather → club → torch → hammer. A kit skips the first 3 tracker steps. |
| **Minecraft hostile mobs**: Zombie, Skeleton, Creeper, Spider | mobs.js | **Creeper: remove** (exploding blocks break the support/building loop). **Zombie: reskin** into the Swamp **Rotting Dead**. **Skeleton: keep** as crypt skeletons (darkforest already has its own) and merge them. **Spider: reskin** into a Mountain "Cliff Crawler" or Mist Seeker. Turn off their Minecraft night/cave spawns in the Meadows; Greylings own the meadow night | Meadow nights in Valheim are "Greylings with torches", not zombies. Each land should own its monster set. |
| **Minecraft passive mobs**: Pig, Cow, Sheep, Chicken; breeding, shearing, eggs | mobs.js | **Pig: remove** (the Boar takes its place). **Cow, Sheep: reskin** into **Woolhorn** (Plains, tameable) and remove them from the Meadows. **Chicken: remove** for now (in Valheim, chickens come in the Mist era). Reuse the breeding code for taming | Meadows wildlife is deer + boar + Greylings. |
| **Minecraft hunger bar, saturation, starvation** | combat.js, index.html HUD | **Change** to the 3-food system (§3 #3) | It's the core Valheim survival rule: health comes from food, not from hunger. |
| **XP orbs, XP level, Score** | index.html, blocks.js `giveXp`, combat.js death | **Remove**, or replace the XP bar with the **skills** system. Keep the Minecraft XP *bar texture* for the Skills screen | Valheim progression is skills plus gear, not levels. |
| **Instant 2x2 / 3x3 grid crafting** | items.js | **Change**: keep the 2x2 only for the 5 no-station recipes (Club, Torch, Hammer, Hoe, Wood). The Workbench, Forge, Cauldron and Artisan Bench use the **recipe-list GUI**. Remove the 3x3 shaped grid (or keep it only as the look of the Workbench panel) | Valheim crafting is "stand near the station, pick from the list". The station's level gates the recipes. |
| **Planks, sticks, Minecraft tool tiers** (wooden, stone, iron sword/axe/pick/shovel) | items.js TIERS loop | **Remove** the wooden/stone/iron Minecraft tiers and the shovel. Keep planks only as a **build material** in the hammer menu | Tool tiers must be Flint → Antler → Bronze → Iron, gated by bosses. A stone pickaxe from a Minecraft recipe skips Stormhorn entirely, and that is the biggest progression break. |
| **Punching stone with your hand / any pickaxe mining all blocks** | items.js `canHarvest`, `HARD` | **Change**: without a pickaxe, stone can't be broken (Valheim: rocks need a pickaxe). Loose stones are pickups. Dirt is changed with the hoe, not dug | It keeps the pickaxe as the boss reward. |
| **Free block placement from the hotbar** | main script, items.js | **Change**: building happens only through the Hammer menu (§3 #8). Blocks in the hotbar can't be placed | Structural support and station range need one entry point. |
| **Furnace (Minecraft)** smelting ore and cooking meat | blocks.js `SMELT` | **Reskin** the Furnace into the **Hearth** (comfort +2, a fire for Rested) and remove its ore and meat recipes. The **Smelter** and **Kiln** handle metal, and the **Cooking Spit** handles meat | Valheim splits smelting, charcoal and cooking into separate stations. |
| **Coal ore, Minecraft iron ore, sand/cactus/desert** | index.html world gen, items.js | **Remove coal ore** (charcoal comes from the kiln). **Reskin iron ore** to Swamp crypt **Scrap Iron**. **Remove the desert** or reskin it as the Ash land later | They are resources in the wrong place and give out-of-order access. |
| **Bow with Minecraft arrows** | mobs.js bow | **Keep** and rename to **Crude Bow**. Arrows: Wood Arrows (no station, 8 wood → 20), Flint Arrows (Workbench). Add a draw-time stamina drain | It matches Valheim. |
| **Shields (iron "shield")** | items.js | **Keep the Wood Shield**. Remove the iron "shield" recipe until the Swamp | Tier order. |
| **Ladders, doors, slabs, stairs, fences** | blocks.js | **Keep**, and move them into the Hammer menu "Building" tab with costs | They fit as build pieces. |
| **Chests, bed, torches** | blocks.js | **Keep**, move them into the Hammer menu, and add the bed rules (§3 #26) | They match Valheim. |
| **Key M = music** | index.html | **Change**: M = Map, music goes to Options | It's the Valheim map key. |
| **Q / Tab = character wheel** | index.html | **Change**: Q = drop item (Minecraft), Tab = inventory, an alternative (Valheim) key; E = use. R = Oath power | It frees the keys. |
| **Sky color, square sun, clouds, title screen** | index.html, shaders.js | **Keep** | It's the Minecraft look. |
| **F3 debug, F1 hide HUD, chat** | index.html | **Keep** | They're harmless. Chat can show the ravens' lines too. |

---

## 5. Implementation plan: 4 parallel work packages

These are ordered by player impact (A is the most important). Each package owns its files. Packages talk only through the existing globals (`World`, `Inv`, `Combat`, `Stations`, `Save`, `Meadows`, `DarkForest`) plus the **new** names listed below, always behind `typeof` guards (the house rule already used).

### WP-A: Opening, story and quest flow (story agent)
**Files:** `js/valheim.js` (Chapter 0 + I), `js/darkforest.js` (Chapter II changes), `index.html` (spawn at the Ring; remove the switch wheel or put it behind a mode flag; key remap M/Q/Tab/R).
**Build:**
1. The Ring of Oaths structure at the island's centre-west meadow, the spawn point, a no-spawn radius of 24, and 7 trophy mounts (block entity with `mount[i] = trophyId`).
2. The storm-gull arrival cut-scene (it uses the existing `bigTitle`/`subtitle`/fade).
3. Ground pickups: `branch`, `pebble`, `flint`, `resin` (spawn and respawn with `spawnDrop`).
4. The quest line from §2 (steps 0 to 21), replacing the current STORY.intro, with stuck hints and saved `stage`/`flags` via `Save`.
5. Vesk (a second raven model: a black body with white eye glints) plus **Waystones**; the altar pin uses `MapUI.pin()` if present.
6. Hanging heads at the Ring, oath powers (`Powers.select(id)`, `Powers.activate()`, key R, HUD icon, cooldown), and power effects applied through `Combat.mod(...)` hooks (Stormstride: `staminaCost×0.4` for run/jump; Rootgrip: tree damage ×1.5).
7. The Dark Forest changes from §1 (Drowned Key drop, Waystone gate, end text).
**Acceptance tests:**
- A new game starts at the Ring with an **empty** inventory. The cut-scene plays once and is skipped with Esc.
- The tracker shows the §2 texts in order. Every step can be finished without any key that isn't listed.
- Breaking a tree is not needed to finish steps 1 to 4 (pickups alone are enough).
- After Stormhorn dies, the tracker says "Hang the Stormhorn Trophy at the Ring". After hanging it, R gives Stormstride for 300 s, and a second press says "Not ready (19:xx)".
- Reloading in the middle of any step restores the same tracker line.

### WP-B: Survival rules (combat/survival agent)
**Files:** `js/combat.js`, plus new HUD bits in it (the status icons exist).
**Build:**
1. The 3-food health system. Remove hunger and starvation, and set base HP to 25.
2. **Skills** (`Skills.gain(id, amt)`, `Skills.level(id)`, the **K** screen in a Minecraft panel, level-up toasts, save).
3. **Death:** the Tombstone (it uses `Stations` chest code if present, otherwise its own), 5% skill loss, the Spared and Second Wind buffs, and a tombstone map pin.
4. **Carry weight** (reads `ITEMS[id].weight`, a line in the inventory panel through `Inv.onRender` or its own DOM, and Overloaded).
5. **Shelter / Comfort / Rested**, **Wet / Cold / Freezing**, and a simple weather state machine (`World.weather`).
6. Creature stars (`Combat.rollStars(entity)` called by the mob modules on spawn; HP and damage multipliers; ★ on the name tag).
7. Damage types and resistances on `Combat.hit`.
**Acceptance tests:**
- Eating raspberries then meat fills 2 slots. Max HP rises, then falls back as the timers run out. No hunger bar is visible.
- 50 club hits raise Clubs to 1 or more. K shows it. A reload keeps it.
- Dying drops a tombstone with every item. Respawn is at the bed, and skills drop 5%. Dying again within 10 min costs no skill.
- Picking up 400 weight of stone disables sprint and jump, and the icon shows.
- Standing in rain without a roof gives Wet. Under a roof by a fire for 20 s gives Rested, with a duration of 8 + comfort minutes.

### WP-C: Building, stations and crafting (items/blocks agent)
**Files:** `js/items.js`, `js/blocks.js`.
**Build:**
1. The Hammer, the **Build Menu** (Minecraft creative-tab panel), the ghost preview, rotate/snap, remove with a refund, the Workbench-range rule, and **structural support** with colour tints.
2. The recipe-list crafting GUI for stations. Station **levels** with upgrade pieces. **Repair** button. Item quality 1 to 4.
3. Stations: Campfire, Cooking Spit, Hearth (the reskinned furnace), Forge (+ upgrades), Charcoal Kiln, Smelter feed-by-interact (charcoal only), Cauldron, Fermenter, Beehive, Portal (tags; blocks ore and metals) and Tombstone (if WP-B asks).
4. The Hoe (level, path) and Cultivator (till, plant, grow).
5. The removals and reskins from §4 that fall in these files: the starter kit, the Minecraft tiers, planks/sticks recipes, hotbar placement, furnace ore/meat, and stone harvesting without a pickaxe.
**Acceptance tests:**
- With no Workbench in range, only Workbench/Campfire show as buildable, and other pieces are red with the text "Requires a Workbench".
- A wooden beam 8 cells out from a wall goes blue → green → yellow → orange → red, and the 9th piece can't be placed or breaks.
- Meat on the Cooking Spit is cooked at 25 s and burned to coal at 50 s.
- The Smelter refuses wood ("Needs charcoal"). The Kiln turns 10 wood into 10 charcoal.
- Bronze Sword is not in the Workbench list but is in the Forge list. Quality 2 needs Forge level 2.
- Two portals tagged "home" link. Carrying copper ore gives the refusal text.

### WP-D: World, creatures, map and travel (mobs/world agent)
**Files:** `js/mobs.js` (`Mobs`, `Save`), plus a new `js/map.js` (MapUI and minimap) **or** inside mobs.js if no new files are wanted, and `index.html` world gen.
**Build:**
1. Apply the §4 mob decisions: remove the Creeper, Pig and Chicken; reskin Zombie → Rotting Dead (Swamp), Cow/Sheep → Woolhorn (Plains); turn off Minecraft night spawns in the Meadows.
2. **Taming** (boar first) built on the breeding code, with follow and stay commands.
3. **Map (M)** with fog of war, pins (manual and auto), the minimap with an Options toggle, the wind arrow, and `MapUI.pin(x,z,icon,label)` as the public API.
4. **Raids/events** (`Events.tick`, our §3 #18 texts, red title, gated on dead bosses and base detection).
5. **Boats** (Raft first, then Skiff), wind, and sailing controls.
6. World gen: swap coal and Minecraft iron ore out; remove the homes or reskin them as ruins; Meadows abandoned house + beehive; shore flint; reserve regions for the Swamp (south) and the Mountains (a peak) for Chapter III/IV.
7. Save: add every new state (mounts, powers, skills, tombstones, pins, tamed creatures, boats) to `Save`'s module registry.
**Acceptance tests:**
- No zombie, creeper, pig or chicken ever spawns on a new world. Greylings spawn at night.
- Feeding a boar mushrooms for the set time tames it (hearts appear), and it follows you on E.
- M shows only explored areas. Double-click adds a named pin. The minimap toggles in Options. The tombstone pin appears on death.
- After Stormhorn is dead and the player has a base, the "The pines are walking..." event fires (a debug command can force it), spawns Greylings, and ends with "The threat has passed."
- A Raft can be built at the shore, moves with W/A/D, and the sail speed changes with the wind direction.

### Order and dependencies
- **Week 1:** A (steps 0 to 8), B (food, Rested, death/tombstone), C (hammer, build menu, campfire, recipe-list GUI) and D (mob removals, map). Steps 1 to 8 of the opening need C's hammer and campfire and B's Rested. A can stub them behind `typeof` guards and test with debug items.
- **Week 2:** A (steps 9 to 21, powers, Chapter II changes), B (skills, weight, weather), C (stations, kiln, forge, cooking) and D (taming, raids, boats).
- **Then:** Chapter III (Swamp) as a new `js/swamp.js`, following the darkforest.js pattern.

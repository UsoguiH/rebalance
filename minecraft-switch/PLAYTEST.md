# Blockcraft playtest (desktop 1000x560 + iPhone 13 landscape)

Played headless (Playwright + SwiftShader, frames stepped by hand) from the title screen: New World, Korra's intro,
wood/stone/flint, workbench, wooden pickaxe, furnace/chest/torch, deer hunt, a full night, Stag Altar + Stormhorn,
then Chapter II (Antler Pickaxe -> copper/tin -> crypt cores -> smelter -> bronze -> bronze sword -> shamans' seeds ->
Root Shrine -> The Old Root). Crafting used real clicks on the recipe book and result slot. Save, Continue and
New World were tested with page reloads. No page errors came up in any run.

## Scores (1-10)

| Area | Score | Notes |
|---|---|---|
| First 10 minutes | 6 | The intro is strong and the deer goal is clear. Before the fix, a Forest Troll could reach the spawn road and kill you in the first minute, and nothing told you to make a workbench. |
| Story clarity | 8 | Korra explains every step, the quest box always shows the next step with distance and direction, and Chapter II starts on its own. |
| Valheim-like progression | 7 | Trophies -> altar boss -> boss drop unlocks the next tier (hard antler -> pickaxe -> copper/tin -> bronze) -> second boss. It follows Valheim closely. Iron/coal and the Minecraft tool tiers sit beside it and blur it. |
| Combat feel | 6 | Stamina, shield and blunt-vs-skeleton work. The Old Root was not hittable when needles were between you and it (fixed). |
| Minecraft UI fidelity | 8 | Hotbar, hearts, hunger and XP, inventory, recipe book and chat all look right. |
| Building / crafting | 7 | Workbench, furnace, chest, torch and smelter all place and work. Stone needs a pickaxe (Minecraft rule), but the game never says so. |
| Phone controls | 6 | The layout is good. Before the fix, Korra's dialog covered the hearts, stamina and the right-hand buttons. |
| Performance | 7 | Game logic costs about 0.2 ms a frame with 24 entities. GPU cost can't be judged under SwiftShader. |
| Bugs | 5 before / 8 after | See below. |

## Bugs and confusing moments (repro -> status)

1. **Continue lost Chapter I progress.** Kill Stormhorn, save, reload, Continue: `Meadows.stage` went back to 1, so the altar woke again and the goal was wrong. **FIXED**: the new `Meadows.restore(stage)` is called from `Save.load`.
2. **Saving mid-boss ate the offering.** Offer 2 trophies, save during the fight, Continue: the boss is gone and so are the trophies. Only the first two deer are guaranteed a trophy. **FIXED**: the 2 deer trophies come back, and the 3 Ancient Seeds come back for The Old Root.
3. **New World left inventories broken.** Before: the current character's bag was emptied, so there was no starter club, planks, torches or apples, and the other two characters kept their old items. **FIXED**: the new `Inv.reset()` gives all three characters the starter bag.
4. **Forest Troll near the spawn meadow** (60 HP, slams for 5, chases from 18 blocks). Its home was x50-80/z92-114, next to the spawn point (88,113). "Rakan was slain by Forest Troll" in the first minute, and its boss bar showed during the intro. **FIXED**: its home is now a clearing inside the Dark Forest, away from the gate, shrine and crypt, and it respawns at ground level under the pines.
5. **The Old Root could not be hit through pine needles or leaves.** Offer seeds at the shrine and swing from 3 blocks: every swing returned false because the ray hit `Dark Pine Needles`. **FIXED** (combat.js): leaves and needles no longer block melee.
6. **Phone: dialog over the HUD.** On iPhone landscape the Korra box covered the stamina bar and hearts and overlapped the shield button. The quest box overlapped it too. **FIXED**: the dialog and subtitles now sit above the stats, the dialog is narrower, and the quest box hides while a dialog is open on touch.
7. **No crafting guidance in Chapter I.** **FIXED**: Korra's intro now has a line about breaking trees, planks, the workbench, torches and a bed.
8. **Trophy lines contradicted each other.** Kill two deer close together and Korra says "One more deer crown..." while you already have two. **PARTLY FIXED**: a second line ("You carry enough now...") follows, or replaces the first if it hasn't played yet.
9. **Bronze step left out the fuel.** The goal said "smelt Copper and Tin", but each smelt needs 1 Wood. **FIXED**: the quest text now names the fuel and the 2 Copper + 1 Tin ratio.
10. Stone, cobblestone and copper drop nothing without a pickaxe, and no message explains why. **OPEN**: Minecraft-correct but confusing; a "needs a pickaxe" tip would help.
11. The Bronze Sword and Mace need Leather Scraps, which only boars drop. The quest says "Sword, Mace or Axe" and doesn't mention this. **OPEN**: the Bronze Axe needs no scraps, so this doesn't block progress.
12. The world still has modern houses (bricks, gray concrete), and the characters start at levels 12, 30 and 45. Fahad starts with 11 HP and 7 food. **OPEN**: these break the Valheim mood.
13. The touch "Switch character" toast sits at the top centre. If it lines up with a boss title, the two overlap. **OPEN, minor**: it only shows for about 12 s after start.
14. During a dialog, bosses go passive (`calm()`) but the player can still swing. **OPEN, minor exploit.**

## Most like Valheim
The trophy -> altar -> boss -> key drop -> next biome loop, Korra the raven guiding you, the antler pickaxe, copper and tin into bronze at a smelter fed with ember cores from a crypt, greyling shamans carrying the seeds, and the dark fog in the forest.

## Least like Valheim
Minecraft hostiles (creepers, zombies, spiders) mixed into the Meadows nights, iron and diamond-style tool tiers being available early, modern buildings, the Minecraft hunger bar and XP levels shown next to the Valheim-style stamina food buffs.

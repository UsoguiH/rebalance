# Blockcraft — Switch Edition

A Minecraft-style voxel game in the browser (Three.js, one HTML file) with the GTA V
character-switch effect. You play as Saif, Rakan and Fahad, each at their own home on one island.

Open `minecraft-switch/index.html` in a browser (or serve the repo folder) and click **Singleplayer**.

## Minecraft features
- First-person view with mouse look (pointer lock), `F5` for back/front third-person views
- Break blocks (left click), place blocks (right click), pick block (middle click), block outline and break particles
- 9-slot hotbar (`1`–`9` or scroll), hearts, hunger and XP level per character
- Walking, sprinting (`Ctrl` or double-tap `W`), sneaking (`Shift`), jumping, swimming, gravity and collision
- Chunk meshing with Minecraft face shading and smooth ambient occlusion
- Grass, flowers, trees, ores on cliffs, a lake, a desert, pigs and sheep, name tags, square sun and flat clouds
- Title screen with a panorama and splash text, pause menu, chat, `F3` debug screen, `F1` to hide the HUD
- Synthesized block sounds and a quiet piano (`M` toggles music)

## Phones and tablets
Touch screens get the mobile-edition controls automatically:
- Left thumb: floating joystick (push all the way forward to sprint), with auto-jump up one-block steps
- Right thumb: drag to look, tap to place, hold still to break
- Jump and Sneak buttons, tap a hotbar slot to select it
- Camera view and pause buttons at the top, **Switch** at the top right opens the character wheel (tap a character)
- Works in landscape and portrait; tapping Singleplayer asks for full screen where the browser allows it

## The switch
Hold `Tab` or `Q` for the wheel, point at a character and let go (or use the **Switch** button).
Time slows and the world goes gray. The camera cuts up into the sky in steps, each with a whoosh-boom,
motion blur and a zoom punch. It pans across the map and drops back down in steps to the new character,
then the color comes back with a flash. Short hops use one level, medium ones two, cross-map switches three.

All textures, skins and sounds are generated in code. Fan-made; not affiliated with Mojang or Rockstar.

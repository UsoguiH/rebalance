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
Touch screens get Bedrock-style controls automatically (`js/mobile.js`):
- Left thumb: floating joystick with a resting ring; push to the edge to sprint (the chevrons light up), auto-jump up one-block steps
- Right thumb: stone-textured Jump, Attack (tap to swing, hold to keep mining; slide to aim), Use/Place (hold to repeat),
  Block (hold) and Sneak (toggle); an Eat button appears while holding food
- Drag anywhere else to look, tap the world to place, hold it to break (a ring fills while you hold)
- Top bar: full screen, camera view, inventory, your face (character wheel) and pause; bigger hotbar with a "..." slot for the inventory
- Pause menu > Touch Controls: look sensitivity, button size and opacity, left-handed layout, vibration, auto quality (saved on the device)
- Auto quality lowers the resolution, view distance and particles when the frame rate stays under 40 fps, and raises them again when stable
- Upright phones show the game turned to landscape; safe areas (notch, home bar) are respected

## The switch
Hold `Tab` or `Q` for the wheel, point at a character and let go (or use the **Switch** button).
Time slows and the world goes gray. The camera cuts up into the sky in steps, each with a whoosh-boom,
motion blur and a zoom punch. It pans across the map and drops back down in steps to the new character,
then the color comes back with a flash. Short hops use one level, medium ones two, cross-map switches three.

All textures, skins and sounds are generated in code. Fan-made; not affiliated with Mojang or Rockstar.

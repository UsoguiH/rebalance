# Blockcraft V — Character Switch

A small Minecraft-style voxel world (Three.js, one HTML file) that recreates the
GTA V character-switch effect with three playable characters: Michael, Franklin and Trevor.

Open `minecraft-switch/index.html` in a browser (or serve the repo folder) and click to play.

## Controls
- `W A S D` walk, `Shift` run, drag to look, scroll to zoom
- Hold `Tab` or `Q` for the character wheel, point at a character, release to switch
- `1` `2` `3` quick switch, or use the on-screen **SWITCH** button

## What the switch does
1. The wheel slows time to a crawl and desaturates and blurs the world.
2. On release the image goes gray and the camera cuts up into the sky in steps (low, mid, high), each with a
   whoosh-boom, a motion-blur pulse and an FOV kick.
3. At the top it pans across the map to the other character.
4. It drops back down in the same steps and lands behind the new character, with a flash and the color back.

Short hops (under 26 blocks) use one level, medium ones two, and cross-map switches use all three, as in GTA V.
All textures, skins and sounds are generated in code.

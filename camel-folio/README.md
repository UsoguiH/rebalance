# رحلة الجمل: معرض أعمال ثلاثي الأبعاد

معرض أعمال تفاعلي باللغة العربية: بدل تصفّح صفحة عادية، يركب الزائر جملاً ويتجوّل في صحراء ثلاثية الأبعاد ليكتشف المشاريع والنبذة والمهارات ووسائل التواصل.

An interactive, Arabic (RTL) 3D portfolio. Instead of scrolling a page, visitors ride a camel around a desert to find the projects, the about section, skills and contact links. It is inspired by the "drive around a world" style of portfolio. All the code, 3D models and sounds here are original.

## التشغيل / Run

No build step. Serve the folder with any static server (ES modules don't load from `file://`):

```sh
cd camel-folio
npx http-server -p 8080 .   # then open http://localhost:8080
```

Everything is self-hosted (three.js, cannon-es and the Arabic fonts are in `vendor/` and `fonts/`), so it works offline and deploys as-is to GitHub Pages, Netlify and similar hosts.

## التخصيص / Customise

Edit **`js/content.js`**: name, role, about text, projects, skills, contact links and every UI string. The 3D signs, boards and crates are drawn from that file at load time.

## البداية / The opening

The page opens on a small desert island floating over a dark void patterned with eight-point stars, with a glowing rim. A hand-drawn «اضغط للبدء» label points at it. A click, a tap, Enter or Space starts the journey: the island's edge grows until it covers the whole desert, the letters of your name drop into the sand, and the camera settles overhead. The world is a moonlit night with brass lanterns (fanous) glowing on the sand.

Section pads are two white rings. Stand on one and the space between them fills up; when it's full, the section opens. Enter opens it immediately.

## ما في العالم / What's in the world

| القسم | Where | What happens |
|---|---|---|
| البداية | centre | Your name painted in the sand, plus a signpost pointing to every section |
| المشاريع | north | One board per project; stand on the glowing rug to open its details |
| نبذة عني | west | A Bedouin tent (بيت الشعر) with a fire, cushions and a dallah; its pad opens the about panel |
| المهارات | south-west | A pyramid of crates, one skill per crate, which you can knock over |
| تواصل معي | east | A well with one sign per link; stand on a pad and press Enter to open it |
| ملعب الجِرار | south-east | Ten clay jars in a bowling triangle, with a counter, confetti on a strike, and a reset pad |
| الواحة | south | A pond: the camel slows down and splashes in the water |

## التحكم / Controls

| Desktop | Phone / tablet |
|---|---|
| ↑ throttle, ↓ brake/reverse, ← → steer (like a vehicle; works on Arabic keyboard layouts too) | Drag anywhere to move; drag further to run |
| Shift to boost (and drift in turns), Space to jump | «قفز» button to jump |
| H for the camel's grunt | 🐪 button |
| Enter to open a section, Esc to close | Tap the prompt bubble |
| Mouse wheel to zoom | Pinch to zoom |
| M to mute | 🔊 button |

The ☰ menu lists every section and project, so the whole portfolio can also be read without playing (for accessibility, or on devices without WebGL).

## الصوت / Sound

All audio is synthesised live with the Web Audio API (`js/audio.js`), with no audio files:
- a generative oud melody (Karplus-Strong plucked strings) in **maqam Hijaz** over a **maqsum** darbuka rhythm
- desert wind, sand footsteps synced to each hoof, water splashes
- the camel's grumble (a buzzy voice through vowel formant filters)
- clay, wood and ball impact sounds scaled by collision speed

Audio starts on the «ابدأ الرحلة» click (needed for iOS and Chrome autoplay rules), and the mute setting is remembered.

## البنية / Structure

```
js/main.js      renderer, island intro + reveal, follow camera, filling pads, game loop, adaptive resolution
js/reveal.js    clips the world to the starting island; island rim, edge and patterned void
js/letters3d.js traces the Arabic name into extruded 3D letter groups
js/stylize.js   moonlit clay matcap shading
js/camel.js     procedural camel: joint hierarchy, pacing gait, idle (chewing, blinking, looking), jump
js/world.js     dunes, sky shader, sun + shadows, palms/rocks (instanced), tent, well, boards, oasis, birds
js/props.js     cannon-es physics: crates, jars, ball, and the camel as a kinematic body
js/fx.js        dust particles, fading hoof prints, splashes, confetti
js/audio.js     Web Audio synthesis (music, ambience, sound effects)
js/input.js     keyboard, floating joystick, pinch/wheel zoom
js/ui.js        RTL overlay: loader, HUD, prompts, panels, menu
js/textures.js  canvas textures (Arabic text shaped by the browser)
js/content.js   all the copy
```

## الأداء على الجوال / Mobile performance

- Palms, rocks and shrubs are instanced (a single draw call each).
- On phones: fewer terrain segments, a smaller shadow map, fewer particles, and no fire point light.
- Pixel ratio is capped and lowered automatically if the frame rate drops below 45 fps.
- Rendering and audio pause when the tab is hidden.

## الرخص / Licences

- three.js: MIT (`vendor/LICENSE-three.txt`)
- cannon-es: MIT (`vendor/LICENSE-cannon-es.txt`)
- Cairo, Reem Kufi and Aref Ruqaa fonts: SIL Open Font License (`fonts/OFL-*.txt`)

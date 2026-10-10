# Island: typewriter teaser

This is a 17-second teaser for [Island](https://github.com/UsoguiH/dynamic-island-windows) in the style of the "premium launch video" reference. Real-life stock footage cuts with whip-blur transitions, a small white caption types out over each shot, and each caption plays one of the reference video's own typing passages from `../sfx/typing/`, untouched, with the letters landing on its key clicks. It ends on a dark card where **Island** and *Dynamic Island for Windows* type in.

```sh
sh motion/teaser/fetch-footage.sh   # once: downloads six Mixkit clips into footage/
python3 motion/teaser/build.py      # writes out/island-teaser.mp4 (1280×720, 30 fps)
```

It needs ffmpeg, numpy, Pillow and the Inter font (set `INTER_DIR` if Inter isn't in a standard font folder).

| Time (s) | Footage (Mixkit id) | Caption |
|---|---|---|
| 0.0 – 2.3 | Top aerial shot of the city at night (26920) | Right now, |
| 2.3 – 4.6 | Crowds crossing a street junction (4401) | someone's song just changed. |
| 4.6 – 6.9 | Reading a newspaper on the train (22142) | A call is coming in. |
| 6.9 – 9.2 | Scrolling a phone beside a laptop (4908) | A download just finished. |
| 9.2 – 11.4 | Close-up of typing on a laptop (1808) | You saw all of it. |
| 11.4 – 13.8 | Zoom-out over NYC skyscrapers (30386) | Without leaving your work. |
| 13.8 – 17.0 | End card | Island / Dynamic Island for Windows |

To change the film, edit `SHOTS` in `build.py` (clip id, start offset, length, caption) and add the clip to `fetch-footage.sh`. Mixkit's free videos are searchable at `https://mixkit.co/free-stock-video/<topic>/`, and a clip downloads from `https://assets.mixkit.co/videos/<id>/<id>-720.mp4` (or `-1080`).

## Cut to the reference soundtrack

`build_sync.py` makes a second version, 21 seconds long, that runs on the reference launch video's whole soundtrack, copied bit for bit. Words pop on its pops, letters type on its key clicks, and the footage cuts on its booms. The soundtrack isn't committed, so pass the file extracted from the reference:

```sh
ffmpeg -i reference.mp4 -vn -c:a copy launch-video-original-audio.m4a
python3 motion/teaser/build_sync.py launch-video-original-audio.m4a   # writes out/island-teaser-original-sound.mp4
```

## Footage licence

The clips are from [Mixkit](https://mixkit.co) under the Mixkit Stock Video Free License, which allows use in commercial and personal projects without attribution. The licence doesn't allow redistributing the clips on their own, so they are downloaded by the script and ignored by git, not committed.

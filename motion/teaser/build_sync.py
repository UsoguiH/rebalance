#!/usr/bin/env python3
"""Island teaser cut to the reference launch video's own soundtrack.

The audio is used exactly as it is in the reference (no edits, no filtering).
Every caption is timed to the sound: words pop on the original's pops, letters
type on its key clicks, and the footage cuts on its booms.

    sh motion/teaser/fetch-footage.sh
    python3 motion/teaser/build_sync.py path/to/launch-video-original-audio.m4a

The soundtrack isn't committed: pass the file extracted from the reference
(ffmpeg -i reference.mp4 -vn -c:a copy launch-video-original-audio.m4a).
Times below are in the soundtrack's own clock.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

from build import (FONT_CAP, FONT_MARK, FONT_SUB, FPS, H, HERE, VIGNETTE, W, caption_layer, grade, read_shot,
                   whip)

START = 0.55        # the reference's sound begins just after this
END = 21.687        # end of the soundtrack
WHIP = 4

# (clip id, seconds into the clip, from, to): cuts land on the soundtrack's booms
SHOTS = [
    (26920, 3.0, START, 3.30),
    (4401, 2.0, 3.30, 7.00),
    (22142, 1.5, 7.00, 8.80),
    (4908, 1.0, 8.80, 11.85),
    (1808, 2.0, 11.85, 15.20),
    (30386, 5.0, 15.20, 18.62),
]

# Captions: text, [(time, characters visible)], time it clears.
# Each time is a sound in the reference: a pop, a key click or a hit.
CAPTIONS = [
    ('Sorry to interrupt your work.', [(1.003, 5), (1.038, 8), (1.085, 18), (1.118, 23), (1.135, 29)], 2.30),
    ('Quick question.', [(2.469, 5), (2.547, 15)], 3.30),
    ('when was the last time', [(3.390, 5), (4.093, 7), (4.188, 10), (4.328, 13), (4.380, 15), (4.505, 18),
                                (4.550, 20), (4.602, 22)], 4.90),
    ('your music changed mid-call', [(5.041, 2), (5.108, 5), (5.173, 7), (5.236, 10), (5.280, 12), (5.340, 14),
                                     (5.435, 16), (5.625, 18), (5.722, 20), (5.854, 23), (5.907, 25), (6.004, 27)], 6.97),
    ('stopped. and checked', [(7.200, 8), (8.324, 12), (8.471, 20)], 8.78),
    ('where did that', [(9.420, 5), (9.606, 7), (9.653, 9), (9.760, 10), (9.813, 11), (9.858, 13), (9.902, 14)], 10.22),
    ('message go?', [(10.300, 7), (10.469, 11)], 11.80),
    ('If you had to look ...', [(12.093, 2), (12.584, 10), (12.674, 18), (13.312, 22)], 15.15),
    ("it's been too long.", [(15.440, 4), (15.525, 9), (17.014, 11), (17.109, 12), (17.163, 13), (17.266, 15),
                             (17.358, 16), (17.453, 17), (17.545, 18), (17.710, 19)], 18.55),
]
# End card: the name lands on the three pops, the line under it on the clicks after.
MARK = ('Island', [(18.735, 2), (18.787, 4), (18.850, 6)])
SUB = ('Dynamic Island for Windows', [(19.042, 3), (19.314, 7), (19.770, 10), (20.010, 13), (20.157, 15), (20.324, 17),
                                      (20.409, 19), (20.588, 21), (20.690, 23), (20.873, 25), (20.970, 26)])


def shown(keys, t):
    n = 0
    for tt, k in keys:
        if t >= tt:
            n = k
    return n


def cursor_on(keys, t):
    last = keys[-1][0]
    return t < last + 0.2 or int((t - last) * 2.4) % 2 == 0


def main():
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        raise SystemExit(__doc__)
    audio = sys.argv[1]
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    video_tmp = os.path.join(HERE, 'out', 'sync-video.mp4')
    enc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '17',
                            '-pix_fmt', 'yuv420p', video_tmp], stdin=subprocess.PIPE)
    total = round((END - START) * FPS)
    shot_frames = {}
    bg = np.zeros((H, W, 3), np.float32) + np.array([0.035, 0.035, 0.04], np.float32) + 0.05 * VIGNETTE
    for fi in range(total):
        t = START + fi / FPS
        si = next((i for i, s in enumerate(SHOTS) if s[2] <= t < s[3]), None)
        if si is None:  # end card, with a slow light swell under the name
            a, b = SHOTS[-1][3], END
            k = (t - a) / (b - a)
            x = bg * (1 + 0.5 * k)
            p_in = max(0, 1 - (t - a) * FPS / WHIP)
        else:
            clip, off, a, b = SHOTS[si]
            if si not in shot_frames:
                shot_frames.clear()
                shot_frames[si] = read_shot(clip, off, b - a + 0.1)
            frames = shot_frames[si]
            x = grade(frames[min(len(frames) - 1, int((t - a) * FPS))])
            p_in = max(0, 1 - (t - a) * FPS / WHIP) if si else 0
            p_out = max(0, 1 - (b - t) * FPS / WHIP)
            p_in = max(p_in, p_out)
        x = whip(x, p_in ** 1.5, None)
        img = Image.fromarray((x.clip(0, 1) * 255).astype(np.uint8)).convert('RGBA')
        for text, keys, clear in CAPTIONS:
            if keys[0][0] <= t < clear:
                img = Image.alpha_composite(img, caption_layer(text, shown(keys, t), cursor_on(keys, t), FONT_CAP, H / 2 + 11))
        if t >= MARK[1][0][0]:
            img = Image.alpha_composite(img, caption_layer(MARK[0], shown(MARK[1], t), False, FONT_MARK, H / 2 + 10, shadow=0))
        if t >= SUB[1][0][0]:
            img = Image.alpha_composite(img, caption_layer(SUB[0], shown(SUB[1], t), cursor_on(SUB[1], t), FONT_SUB, H / 2 + 62,
                                                           color=(150, 150, 156), shadow=0))
        enc.stdin.write(img.convert('RGB').tobytes())
    enc.stdin.close()
    enc.wait()
    out = os.path.join(HERE, 'out', 'island-teaser-original-sound.mp4')
    # the soundtrack is copied, not re-encoded, so it is bit-for-bit the reference's audio
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video_tmp, '-ss', str(START), '-i', audio,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', out], check=True)
    os.remove(video_tmp)
    print('wrote', out)


if __name__ == '__main__':
    main()

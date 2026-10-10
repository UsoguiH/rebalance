#!/usr/bin/env python3
"""Island typewriter teaser: real stock footage, small typed captions, and the
typing clicks from motion/sfx/typing/.

    sh motion/teaser/fetch-footage.sh      # once: downloads the Mixkit clips
    python3 motion/teaser/build.py         # writes motion/teaser/out/island-teaser.mp4

Needs ffmpeg, numpy and Pillow, plus the Inter font (set INTER_DIR if it is not
in a standard font folder).
"""
import os
import random
import subprocess
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, '..', 'sfx', 'typing')
W, H, FPS, SR = 1280, 720, 30, 44100

# (clip id, seconds into the clip, shot length, caption)
SHOTS = [
    (26920, 3.0, 2.3, 'Right now,'),
    (4401, 4.0, 2.3, "someone's song just changed."),
    (22142, 1.5, 2.3, 'A call is coming in.'),
    (4908, 2.0, 2.3, 'A download just finished.'),
    (1808, 3.0, 2.2, 'You saw all of it.'),
    (30386, 6.0, 2.4, 'Without leaving your work.'),
]
END = 3.2           # end card length
WHIP = 4            # frames of motion blur on each side of a cut


def find_font(name):
    dirs = [os.environ.get('INTER_DIR', ''), '/usr/share/fonts/opentype/inter', '/usr/share/fonts/truetype/inter',
            '/Library/Fonts', os.path.expanduser('~/Library/Fonts'), 'C:/Windows/Fonts']
    for d in dirs:
        p = os.path.join(d, name)
        if d and os.path.exists(p):
            return p
    raise SystemExit(f'{name} not found: install Inter or set INTER_DIR')


FONT_CAP = ImageFont.truetype(find_font('Inter-Medium.otf'), 30)
FONT_MARK = ImageFont.truetype(find_font('Inter-SemiBold.otf'), 74)
FONT_SUB = ImageFont.truetype(find_font('Inter-Regular.otf'), 24)


# ------------------------------------------------------------------ typing
def type_schedule(text, start, rnd):
    """Per-character reveal times and the click events that go with them.

    The reference doesn't click on every letter: a click lands on roughly every
    second or third keystroke, irregularly, which is what makes it read as fast
    human typing rather than a metronome."""
    times, clicks, t, last_click = [], [], start, -1.0
    for i, ch in enumerate(text):
        times.append(t)
        if (i == 0 or text[i - 1] == ' ' or rnd.random() < 0.38) and t - last_click > 0.05:
            clicks.append((t, rnd.randrange(12), rnd.uniform(0.62, 1.0)))
            last_click = t
        gap = rnd.uniform(0.032, 0.062)
        if ch == ' ':
            gap += rnd.uniform(0.01, 0.04)
        if ch in ',.':
            gap += 0.1
        t += gap
    return times, clicks


def load_clicks():
    out = []
    for k in range(1, 13):
        with wave.open(os.path.join(SFX, f'key{k:02d}.wav')) as w:
            out.append(np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768)
    return out


# ------------------------------------------------------------------ picture
def read_shot(clip, offset, dur):
    path = os.path.join(HERE, 'footage', f'{clip}.mp4')
    if not os.path.exists(path):
        raise SystemExit(f'missing {path}: run fetch-footage.sh first')
    n = round(dur * FPS)
    cmd = ['ffmpeg', '-loglevel', 'error', '-ss', str(offset), '-i', path, '-frames:v', str(n),
           '-vf', f'fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if len(frames) < n:  # hold the last frame if the clip runs short
        frames = np.concatenate([frames, np.repeat(frames[-1:], n - len(frames), 0)])
    return frames


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGNETTE = (1 - 0.42 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.2).clip(0.35, 1)[..., None]


def grade(f):
    """A soft, slightly muted film look so different stock clips sit together."""
    x = f.astype(np.float32) / 255
    lum = x @ np.array([0.299, 0.587, 0.114], np.float32)
    x = lum[..., None] + (x - lum[..., None]) * 0.8          # desaturate a touch
    x = x * 0.86 + 0.02                                      # lift blacks, pull highlights
    x = x * VIGNETTE
    return x


def whip(x, p, rnd):
    """Horizontal motion blur plus a small zoom punch; p in 0..1."""
    if p <= 0:
        return x
    k = int(4 + p * 120)
    c = np.cumsum(np.pad(x, ((0, 0), (k, k), (0, 0)), mode='edge'), axis=1)
    x = (c[:, 2 * k:] - c[:, :-2 * k])[:, :W] / (2 * k)
    z = 1 + 0.08 * p
    img = Image.fromarray((x.clip(0, 1) * 255).astype(np.uint8))
    cw, ch = int(W / z), int(H / z)
    img = img.crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2)).resize((W, H), Image.BILINEAR)
    return np.asarray(img).astype(np.float32) / 255


def caption_layer(text, n, cursor, font, y, color=(246, 246, 244), shadow=0.55):
    """Typed text centred on the full line width, so letters appear in place."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    full = font.getlength(text)
    x0 = (W - full) / 2
    shown = text[:n]
    d = ImageDraw.Draw(layer)
    if shadow:
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((x0, y + 2), shown, font=font, fill=(0, 0, 0, int(255 * shadow)), anchor='ls')
        layer = Image.alpha_composite(layer, sh.filter(ImageFilter.GaussianBlur(7)))
        d = ImageDraw.Draw(layer)
    d.text((x0, y), shown, font=font, fill=color + (255,), anchor='ls')
    if cursor:
        cx = x0 + font.getlength(shown) + 3
        size = font.size
        d.rectangle([cx, y - size * 0.78, cx + max(2, size * 0.07), y + size * 0.08], fill=color + (235,))
    return layer


def visible(times, t):
    return sum(1 for tt in times if tt <= t)


def main():
    rnd = random.Random(7)
    clicks = load_clicks()
    total = sum(s[2] for s in SHOTS) + END
    audio = np.zeros(int(total * SR) + SR, np.float32)

    def add_clicks(events):
        for t, k, g in events:
            s = clicks[k] * g * 0.8
            i = int(t * SR)
            audio[i:i + len(s)] += s

    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    video_tmp = os.path.join(HERE, 'out', 'video.mp4')
    enc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '17',
                            '-preset', 'medium', '-pix_fmt', 'yuv420p', video_tmp], stdin=subprocess.PIPE)
    t0 = 0.0
    for si, (clip, off, dur, text) in enumerate(SHOTS):
        frames = read_shot(clip, off, dur)
        times, ev = type_schedule(text, t0 + 0.28, rnd)
        add_clicks(ev)
        done = times[-1]
        for fi, f in enumerate(frames):
            t = t0 + fi / FPS
            x = grade(f)
            p_in = max(0, (WHIP - fi) / WHIP) if si else 0
            p_out = max(0, (fi - (len(frames) - 1 - WHIP)) / WHIP)
            x = whip(x, max(p_in, p_out) ** 1.5, rnd)
            img = Image.fromarray((x.clip(0, 1) * 255).astype(np.uint8)).convert('RGBA')
            n = visible(times, t)
            if n and p_out < 0.5:
                blink = t < done + 0.15 or int((t - done) * 2.4) % 2 == 0
                img = Image.alpha_composite(img, caption_layer(text, n, blink, FONT_CAP, H / 2 + 11))
            enc.stdin.write(img.convert('RGB').tobytes())
        t0 += dur

    # end card: the name types in, then the line under it
    times_a, ev_a = type_schedule('Island', t0 + 0.45, rnd)
    times_b, ev_b = type_schedule('Dynamic Island for Windows', times_a[-1] + 0.45, rnd)
    add_clicks(ev_a + ev_b)
    bg = np.zeros((H, W, 3), np.float32) + np.array([0.035, 0.035, 0.04], np.float32)
    bg = bg + 0.05 * VIGNETTE
    for fi in range(round(END * FPS)):
        t = t0 + fi / FPS
        x = whip(bg, max(0, (WHIP - fi) / WHIP) ** 1.5, rnd)
        img = Image.fromarray((x.clip(0, 1) * 255).astype(np.uint8)).convert('RGBA')
        na, nb = visible(times_a, t), visible(times_b, t)
        if na:
            typing_a = nb == 0
            img = Image.alpha_composite(img, caption_layer('Island', na, typing_a and (t < times_a[-1] + 0.15 or int(t * 2.4) % 2 == 0),
                                                           FONT_MARK, H / 2 + 10, shadow=0))
        if nb:
            img = Image.alpha_composite(img, caption_layer('Dynamic Island for Windows', nb, t < times_b[-1] + 0.15 or int(t * 2.4) % 2 == 0,
                                                           FONT_SUB, H / 2 + 62, color=(150, 150, 156), shadow=0))
        enc.stdin.write(img.convert('RGB').tobytes())
    enc.stdin.close()
    enc.wait()

    audio = audio[:int(total * SR)]
    audio *= 0.9 / max(1e-6, np.abs(audio).max())
    wav_tmp = os.path.join(HERE, 'out', 'clicks.wav')
    with wave.open(wav_tmp, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())
    out = os.path.join(HERE, 'out', 'island-teaser.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video_tmp, '-i', wav_tmp, '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-shortest', out], check=True)
    os.remove(video_tmp)
    print('wrote', out, f'({total:.1f}s)')


if __name__ == '__main__':
    main()

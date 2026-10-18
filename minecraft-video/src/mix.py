"""Soundtrack for "Steve vs Herobrine": the narration with breaths at scene changes,
the writing sound driven by the pen's motion, and a page flip (notebook) or eraser
rub (whiteboard) on every scene change.

    python3 src/mix.py 1      # out/video_1.mp4 + out/pen_1.json -> out/steve_vs_herobrine_notebook.mp4
    python3 src/mix.py 4      # whiteboard version
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT.parent / 'discipline-video' / 'src'))
from mix import SR, bandpass, db, decode, follow, rms, writing_sound  # noqa: E402

LEAD, GAP = 0.6, 0.9
CUTS = [10.0, 21.9, 35.5, 42.85, 51.8, 62.2, 69.9]
NAMES = {'1': 'notebook', '4': 'whiteboard'}
rng = np.random.default_rng(11)


def page_flip(n_len):
    """Paper lifting, sliding over itself and settling."""
    k = np.arange(n_len) / SR
    d = n_len / SR
    swoosh = bandpass(rng.standard_normal(n_len), 400, 6000) * np.sin(np.pi * np.clip(k / d, 0, 1)) ** 1.5
    crinkle = bandpass(rng.standard_normal(n_len), 2500, 9000) * (rng.random(n_len) < 0.02) * 6
    crinkle *= np.exp(-k * 3)
    settle = np.zeros(n_len)
    i = int(n_len * 0.82)
    m = np.arange(n_len - i) / SR
    settle[i:] = bandpass(rng.standard_normal(n_len - i), 120, 1200) * np.exp(-m * 40) * 2.5
    out = swoosh + crinkle + settle
    return out / (np.abs(out).max() + 1e-9)


def eraser_rub(speeds, fps, n_len):
    """Felt dragging on the board: rough noise that follows the eraser's speed."""
    env = np.clip(np.asarray(speeds, float) / 60, 0, 1.2) ** 0.8
    env = np.interp(np.arange(n_len) / SR, np.arange(len(env)) / fps, env)
    grit = bandpass(rng.standard_normal(n_len), 30, 120)
    grit = 0.6 + 0.4 * grit / (np.abs(grit).max() + 1e-9)
    rub = bandpass(rng.standard_normal(n_len), 250, 3500) * env * grit
    return rub / (np.abs(rub).max() + 1e-9)


def main(look):
    pen = json.loads((ROOT / f'out/pen_{look}.json').read_text())
    duration, fps = pen['duration'], pen['fps']
    n = int(duration * SR)
    t = np.arange(n) / SR
    vt = lambda tv: LEAD + tv + GAP * sum(c <= tv for c in CUTS)

    voice_src = decode(ROOT / 'audio/voice.mp3', 1)[:, 0]
    voice = np.zeros(n, np.float32)
    bounds = [0.0, *CUTS, len(voice_src) / SR]
    for a, b in zip(bounds, bounds[1:]):
        seg = voice_src[int(a * SR): int(b * SR)]
        o = int(vt(a) * SR)
        if o < n:
            voice[o: o + len(seg)] += seg[: n - o]
    voice *= db(-17) / rms(voice_src[np.abs(voice_src) > 0.01])

    hop = 240
    venv = np.sqrt(np.mean(voice[: n // hop * hop].reshape(-1, hop) ** 2, axis=1))
    venv = follow(venv, 0.03, 0.35, SR / hop)
    duck = np.interp(np.arange(n) / hop, np.arange(len(venv)), np.clip(venv / db(-26), 0, 1))
    pen_audio = writing_sound(pen, n, pen['style']) * db(-4 * duck)

    fx = np.zeros(n, np.float32)
    for e in pen['sfx']:
        i0, i1 = int(e['t'] * SR), min(n, int((e['t'] + e['d']) * SR))
        if e['type'] == 'flip':
            fx[i0:i1] += page_flip(i1 - i0) * db(-22)
        else:
            f0, f1 = int(e['t'] * fps), int((e['t'] + e['d']) * fps) + 1
            fx[i0:i1] += eraser_rub(pen['rubs'][f0:f1], fps, i1 - i0) * db(-24)

    room = bandpass(rng.standard_normal(n), 60, 2500)
    room *= db(-58) / rms(room)
    mono = (voice + pen_audio + fx + room) * np.clip(t / 0.3, 0, 1) * np.clip((duration - t) / 1.0, 0, 1)
    mix = np.repeat(mono[:, None], 2, axis=1)
    mix *= min(1.0, 0.98 / np.abs(mix).max())
    wav = ROOT / f'out/mix_{look}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(wav)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(wav), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    gain = -14.0 - float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1])
    final = ROOT / f'out/steve_vs_herobrine_{NAMES[look]}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / f'out/video_{look}.mp4'), '-i', str(wav),
                    '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false', '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(final)], check=True)
    print('wrote', final)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '1')

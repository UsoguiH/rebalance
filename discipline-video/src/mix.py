"""Mixes the soundtrack for "The Line" and muxes it with the rendered video.

Voice (with breathing gaps between scenes) + "Reign" by Kevin MacLeod (its big
section lands on "staircase") + pencil scratches driven by the pen in the render,
paper whooshes on scene changes and a thud for the PROOF stamp.

    python3 src/mix.py        needs out/video.mp4 and out/ink.json from render.js
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
LEAD, GAP = 0.8, 0.6
CUTS = [9.0, 22.2, 32.75, 47.95, 60.6, 78.95, 91.05]
MUSIC = ROOT / 'audio/music/Reign.mp3'
MUSIC_DROP = 111.25  # seconds into "Reign" where the full section hits
TARGET_LUFS = -14.0


def decode(path, channels):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def db(x):
    return 10 ** (x / 20)


def bandpass(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= np.clip((f - lo * 0.7) / (lo * 0.3), 0, 1) * np.clip((hi * 1.3 - f) / (hi * 0.3), 0, 1)
    return np.fft.irfft(spec, len(x))


def smooth(env, attack, release, sr):
    out = np.empty_like(env)
    a, r, v = np.exp(-1 / (attack * sr)), np.exp(-1 / (release * sr)), 0.0
    for i, e in enumerate(env):  # runs on a decimated envelope, so a Python loop is fine
        v = a * v + (1 - a) * e if e > v else r * v + (1 - r) * e
        out[i] = v
    return out


def envelope(x, hop=240, attack=0.03, release=0.4):
    frames = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    sm = smooth(frames, attack, release, SR / hop)
    return np.interp(np.arange(len(x)) / hop, np.arange(len(sm)), sm)


def main():
    ink = json.loads((ROOT / 'out/ink.json').read_text())
    duration, fps = ink['duration'], ink['fps']
    n = int(duration * SR)
    vt = lambda tv: LEAD + tv + GAP * sum(c <= tv for c in CUTS)

    # Voice, with a short pause added at each scene change.
    voice_src = decode(ROOT / 'audio/voice.mp3', 1)[:, 0]
    voice = np.zeros(n, np.float32)
    bounds = [0.0, *CUTS, len(voice_src) / SR]
    for a, b in zip(bounds, bounds[1:]):
        seg = voice_src[int(a * SR): int(b * SR)]
        o = int(vt(a) * SR)
        voice[o: o + len(seg)] += seg[: n - o]
    speech_rms = np.sqrt(np.mean(voice_src[np.abs(voice_src) > 0.01] ** 2))
    voice *= db(-17) / speech_rms

    # Music, offset so its big section hits on "staircase".
    drop = next(e['t'] for e in ink['sfx'] if e['type'] == 'drop')
    music_src = decode(MUSIC, 2)
    start = int((MUSIC_DROP - drop) * SR)
    music = np.zeros((n, 2), np.float32)
    chunk = music_src[start: start + n]
    music[: len(chunk)] = chunk
    t = np.arange(n) / SR
    gain_db = np.interp(t, [0, drop - 0.35, drop - 0.05, duration], [15, 15, 3, 3])
    venv = envelope(voice)
    duck = np.clip(venv / db(-24), 0, 1)
    gain_db -= duck * np.where(t < drop, 4, 10)
    gain = db(gain_db) * np.clip(t / 1.2, 0, 1) * np.clip((duration - t) / 2.8, 0, 1)
    music *= gain[:, None]

    # Pencil scratch, following the pen in the render.
    frames = np.array(ink['frames'], np.float32)
    ft = (ink['from'] + np.arange(len(frames))) / fps
    amp = frames[:, 0] * np.clip(frames[:, 1] / 22, 0.3, 1.0) * np.where(frames[:, 2] > 0, 1.0, 0.8)
    amp_s = np.interp(t, ft, amp)
    amp_s = envelope(amp_s, hop=48, attack=0.006, release=0.05) * 1.4
    rng = np.random.default_rng(3)
    noise = rng.standard_normal(n).astype(np.float32)
    scratch = bandpass(noise, 1800, 7500)
    grain = bandpass(rng.standard_normal(n), 8, 45)
    grain = 0.55 + 0.45 * grain / (np.abs(grain).max() + 1e-9)
    scratch = scratch / np.sqrt(np.mean(scratch ** 2)) * amp_s * grain * db(-34)

    # Paper whooshes and the stamp thud.
    sfx = np.zeros(n, np.float32)
    swish = bandpass(rng.standard_normal(n), 250, 2200)
    swish /= np.sqrt(np.mean(swish ** 2))
    for e in ink['sfx']:
        if e['type'] == 'whoosh':
            i0, i1 = int(e['t'] * SR), int((e['t'] + e['d']) * SR)
            if i1 > i0:
                bell = np.sin(np.linspace(0, np.pi, i1 - i0)) ** 2
                sfx[i0:i1] += swish[i0:i1] * bell * db(-36)
        elif e['type'] == 'stamp':
            i0 = int(e['t'] * SR)
            k = np.arange(int(0.35 * SR)) / SR
            thud = np.sin(2 * np.pi * (62 + 40 * np.exp(-k * 30)) * k) * np.exp(-k * 11) * db(-10)
            click = rng.standard_normal(len(k)) * np.exp(-k * 160) * db(-18)
            sfx[i0: i0 + len(k)] += (thud + click)[: n - i0]

    mono = voice + scratch + sfx
    mix = music + mono[:, None]
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    wav = ROOT / 'out/mix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(wav)],
                   input=mix.astype(np.float32).tobytes(), check=True)

    # Measure loudness, then set it to the social-media standard with a true-peak limiter.
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(wav), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1])
    gain = TARGET_LUFS - lufs
    print(f'mix loudness {lufs:.1f} LUFS -> applying {gain:+.1f} dB')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'out/video.mp4'), '-i', str(wav),
                    '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false',
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                    '-movflags', '+faststart', str(ROOT / 'out/the-line.mp4')], check=True)
    print('wrote', ROOT / 'out/the-line.mp4')


if __name__ == '__main__':
    main()

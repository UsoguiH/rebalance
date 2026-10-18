"""Mixes the soundtrack for "The Line" and muxes it with the rendered video.

No music: the narration, a quiet room tone, and a writing sound synthesised from
the pen's real motion in the film (out/pen.json, 240 Hz), so every scratch,
letter tap and lift lines up with the ink on screen.

    node src/render.js            # out/video.mp4
    node src/render.js --pen-data # out/pen.json
    python3 src/mix.py            # out/the-line.mp4
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
TARGET_LUFS = -14.0
NFFT, HOP = 1024, 256

rng = np.random.default_rng(7)


def decode(path, channels):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def db(x):
    return 10 ** (x / 20)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) + 1e-12


def bandpass(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= np.clip((f - lo * 0.7) / (lo * 0.3), 0, 1) * np.clip((hi * 1.3 - f) / (hi * 0.3), 0, 1)
    return np.fft.irfft(spec, len(x))


def follow(env, attack, release, rate):
    """Attack/release envelope follower over a (low-rate) control signal."""
    out = np.empty_like(env)
    a, r, v = np.exp(-1 / (attack * rate)), np.exp(-1 / (release * rate)), 0.0
    for i, e in enumerate(env):
        v = a * v + (1 - a) * e if e > v else r * v + (1 - r) * e
        out[i] = v
    return out


def lg(f, fc, width):
    """A log-frequency bump: 1 at fc, falling off over `width` octaves."""
    return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / width) ** 2)


def shaped_noise(H):
    """Noise whose spectrum follows H (frames x bins), via overlap-added random STFT frames."""
    F, B = H.shape
    spec = (rng.standard_normal((F, B)) + 1j * rng.standard_normal((F, B))).astype(np.complex64) * H
    win = np.hanning(NFFT).astype(np.float32)
    frames = np.fft.irfft(spec, NFFT, axis=1).astype(np.float32) * win
    k = NFFT // HOP
    chunks = np.zeros((F + k, HOP), np.float32)
    for j in range(k):
        chunks[j: j + F] += frames[:, j * HOP: (j + 1) * HOP]
    return chunks.reshape(-1)


def pen_motion(pen):
    """Per-sample pen state at the pen.json rate: speed, stroke direction, kind, new-stroke flags."""
    r = np.array(pen['rows'], np.float64)
    rate = pen['rate']
    down = r[:, 0] > 0
    dx, dy = np.diff(r[:, 1], prepend=r[0, 1]), np.diff(r[:, 2], prepend=r[0, 2])
    step = np.hypot(dx, dy)
    cont = down & np.roll(down, 1) & (r[:, 4] == np.roll(r[:, 4], 1)) & (step <= 20)
    cont[0] = False
    speed = np.where(cont, step * rate, 0.0)
    vy = np.where(cont, np.abs(dy) * rate, 0.0)
    direction = np.where(cont, dy / np.maximum(step, 1e-6), 0.0)  # +1 downstroke, -1 upstroke
    onset = down & ~cont
    # Every element gets its own slightly different pen/paper character.
    char = np.where(down, 0.88 + 0.24 * ((r[:, 4] * 0.6180339) % 1.0), 1.0)
    return rate, down, speed, vy, direction, r[:, 3], onset, char


def writing_sound(pen, n):
    rate, down, speed, vy, direction, kind, onset, char = pen_motion(pen)
    tk = np.arange(len(down)) / rate
    marker = kind == 2

    # Loudness follows the stroke. Handwriting pulses with every up- and downstroke and
    # goes quiet at the turns; drawn lines swell with the pen's speed; lifts are silent.
    e_text = 0.12 + 0.88 * np.clip(vy / 950, 0, 1.2) ** 1.4
    e_line = np.clip(speed / 1100, 0, 1.2) ** 1.1
    e = np.where(speed > 0, np.where(kind > 0, e_text, e_line), 0.0)
    e = follow(e, 0.006, 0.025, rate)
    m = follow(marker.astype(float), 0.02, 0.02, rate)
    dirn = follow(direction, 0.01, 0.01, rate)

    # Time-varying spectrum, frame by frame.
    F = n // HOP + 1
    tf = np.arange(F) * HOP / SR
    E, M, D = (np.interp(tf, tk, x) for x in (e, m, dirn))
    C, V = np.interp(tf, tk, char), np.interp(tf, tk, np.clip(speed / 1200, 0, 1.5))
    f = np.fft.rfftfreq(NFFT, 1 / SR)[None, :]
    fc = (2100 * (0.85 + 0.3 * V) * (1 + 0.14 * D) * C)[:, None]
    pencil = lg(f, fc, 0.95) + 0.4 * lg(f, fc * 2.6, 0.55) + 0.35 * lg(f, 780 * C[:, None], 0.7)
    sq = (2350 * (1 + 0.06 * D) * C)[:, None]
    felt = lg(f, 1600 * C[:, None], 1.0) + 0.3 * lg(f, 4600, 0.7) + 0.45 * (np.minimum(V, 1)[:, None] ** 2) * lg(f, sq, 0.03)
    H = E[:, None] * ((1 - M[:, None]) * pencil + M[:, None] * 0.8 * felt) / (1 + (f / 9000) ** 4)
    friction = shaped_noise(H.astype(np.float32))[:n]

    # Stick-slip flutter: real pens skip in tiny jerks, not a steady hiss.
    flutter = bandpass(rng.standard_normal(n), 18, 70)
    friction *= 0.72 + 0.28 * flutter / (np.abs(flutter).max() + 1e-9)

    # Paper tooth: sparse little crackles, denser when the pen moves fast.
    ts = np.arange(n) / SR
    es = np.interp(ts, tk, e)
    ms = np.interp(ts, tk, m)
    lam = (2600 * (1 - ms) + 500 * ms) * es / SR
    hits = np.nonzero(rng.random(n) < lam)[0]
    crackle = np.zeros(n + 96, np.float32)
    kernel = (rng.standard_normal(96) * np.exp(-np.arange(96) / 14)).astype(np.float32)
    kernel = bandpass(np.pad(kernel, (0, 928)), 1500, 7000)[:96].astype(np.float32)
    amps = rng.lognormal(0, 0.35, len(hits)).astype(np.float32) * es[hits].astype(np.float32)
    np.add.at(crackle, hits[:, None] + np.arange(96)[None, :], amps[:, None] * kernel[None, :])
    crackle = crackle[:n]

    # Body: the paper and table underneath, felt more than heard.
    body = bandpass(rng.standard_normal(n), 90, 380) * np.interp(ts, tk, follow(e, 0.008, 0.08, rate))

    # Pen touching down at the start of each stroke and letter.
    taps = np.zeros(n + 2400, np.float32)
    k = np.arange(2400) / SR
    tick = bandpass(np.pad(rng.standard_normal(240) * np.exp(-np.arange(240) / 40), (0, 2160)), 900, 6000)
    knock = np.sin(2 * np.pi * 170 * k) * np.exp(-k * 140)
    tap = (tick / np.abs(tick).max() + 0.5 * knock).astype(np.float32)
    for i in np.nonzero(onset)[0]:
        o = int(tk[i] * SR)
        if o < n:
            taps[o: o + len(tap)] += tap * rng.uniform(0.4, 1.0) * (0.6 if marker[i] else 1.0)
    taps = taps[:n]

    on = es > 0.3
    friction *= db(-26) / rms(friction[on])
    crackle *= db(-30) / rms(crackle[on])
    c = 3 * db(-30)
    crackle = c * np.tanh(crackle / c)
    body *= db(-38) / rms(body[on])
    taps *= db(-27)
    # Soft-limit the bus so no single crackle or squeak jumps out.
    T = db(-11)
    return T * np.tanh((friction + crackle + body + taps) / T)


def main():
    pen = json.loads((ROOT / 'out/pen.json').read_text())
    duration = pen['duration']
    n = int(duration * SR)
    t = np.arange(n) / SR
    vt = lambda tv: LEAD + tv + GAP * sum(c <= tv for c in CUTS)

    # Voice, with a short pause added at each scene change.
    voice_src = decode(ROOT / 'audio/voice.mp3', 1)[:, 0]
    voice = np.zeros(n, np.float32)
    bounds = [0.0, *CUTS, len(voice_src) / SR]
    for a, b in zip(bounds, bounds[1:]):
        seg = voice_src[int(a * SR): int(b * SR)]
        o = int(vt(a) * SR)
        voice[o: o + len(seg)] += seg[: n - o]
    voice *= db(-17) / rms(voice_src[np.abs(voice_src) > 0.01])

    # The pen sits a little under the voice and comes forward in the pauses.
    hop = 240
    venv = np.sqrt(np.mean(voice[: n // hop * hop].reshape(-1, hop) ** 2, axis=1))
    venv = follow(venv, 0.03, 0.35, SR / hop)
    duck = np.interp(np.arange(n) / hop, np.arange(len(venv)), np.clip(venv / db(-26), 0, 1))
    pen_audio = writing_sound(pen, n) * db(-4 * duck)

    # Paper whooshes on scene changes, the stamp, and the stairs clicking into place.
    sfx = np.zeros(n, np.float32)
    swish = bandpass(rng.standard_normal(n), 300, 3200)
    swish /= rms(swish)
    for e in pen['sfx']:
        i0 = int(e['t'] * SR)
        if e['type'] == 'whoosh':
            i1 = int((e['t'] + e['d']) * SR)
            if i1 > i0:
                sfx[i0:i1] += swish[i0:i1] * np.sin(np.linspace(0, np.pi, i1 - i0)) ** 3 * db(-40)
        elif e['type'] == 'stamp':
            k = np.arange(int(0.35 * SR)) / SR
            thud = np.sin(2 * np.pi * (62 + 40 * np.exp(-k * 30)) * k) * np.exp(-k * 11) * db(-10)
            click = rng.standard_normal(len(k)) * np.exp(-k * 160) * db(-18)
            sfx[i0: i0 + len(k)] += (thud + click)[: n - i0]
        elif e['type'] == 'tap':
            k = np.arange(int(0.08 * SR)) / SR
            knock = (np.sin(2 * np.pi * 520 * k) + 0.5 * np.sin(2 * np.pi * 1310 * k)) * np.exp(-k * 70)
            knock += rng.standard_normal(len(k)) * np.exp(-k * 400) * 0.4
            sfx[i0: i0 + len(k)] += (knock * db(-24))[: n - i0]

    # A quiet room so the pauses never drop to digital silence.
    room = bandpass(rng.standard_normal(n), 60, 2500)
    room *= db(-58) / rms(room)

    mono = voice + pen_audio + sfx + room
    mono *= np.clip(t / 0.3, 0, 1) * np.clip((duration - t) / 1.3, 0, 1)
    mix = np.repeat(mono[:, None], 2, axis=1)
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

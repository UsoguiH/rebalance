"""Synthesise the music bed + SFX for the launch video, cued from src/timeline.json.

No samples, no downloads: everything is generated with numpy so the soundtrack is
reproducible and licence-free. Usage: python3 scripts/make_soundtrack.py public/soundtrack.wav
"""

import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src" / "timeline.json").read_text())
FPS = TL["fps"]
DUR = TL["total"] / FPS
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def sec(frame):
    return frame / FPS


def t_axis(n):
    return np.arange(n) / SR


def lowpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(x))


def highpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(spec, len(x))


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    lg = gain * np.sqrt((1 - pan) / 2)
    rg = gain * np.sqrt((1 + pan) / 2)
    L[i : i + len(sig)] += sig * lg
    R[i : i + len(sig)] += sig * rg


def env(n, a, d):
    """Attack/decay envelope in seconds."""
    t = t_axis(n)
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e


def note(freq):
    return 440 * 2 ** ((freq - 69) / 12)


# ---------- SFX ----------

def click():
    n = int(0.05 * SR)
    s = rng.standard_normal(n) * env(n, 0.0005, 0.006)
    s = highpass(s, 2500) + 0.4 * np.sin(2 * np.pi * 1800 * t_axis(n)) * env(n, 0.0005, 0.01)
    return s * 0.9


def tick(freq=2400, length=0.03):
    n = int(length * SR)
    return np.sin(2 * np.pi * freq * t_axis(n)) * env(n, 0.0005, 0.008)


def pop(freq=880):
    n = int(0.18 * SR)
    t = t_axis(n)
    f = freq * (1 + 0.6 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.06)


def thud():
    n = int(0.35 * SR)
    t = t_axis(n)
    f = 140 * np.exp(-t / 0.08) + 50
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.09)
    return body + 0.15 * lowpass(rng.standard_normal(n), 1200) * env(n, 0.001, 0.03)


def whoosh(length=0.5, lo=400, hi=5000):
    n = int(length * SR)
    noise = rng.standard_normal(n)
    # Sweep a band by crossfading two filtered copies.
    a = lowpass(noise, lo)
    b = highpass(lowpass(noise, hi), lo)
    x = np.linspace(0, 1, n)
    shape = np.sin(np.pi * x) ** 2
    return (a * (1 - x) + b * x) * shape * 0.5


def riser(length):
    n = int(length * SR)
    t = t_axis(n)
    x = t / length
    noise = highpass(rng.standard_normal(n), 600) * x**2.5 * 0.35
    f = 120 * (2 ** (4 * x))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * x**2 * 0.25
    return noise + tone


def impact():
    n = int(2.4 * SR)
    t = t_axis(n)
    f = 90 * np.exp(-t / 0.15) + 38
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.7)
    crash = lowpass(highpass(rng.standard_normal(n), 3000), 12000) * env(n, 0.001, 0.5) * 0.25
    return sub + crash


def kick():
    n = int(0.4 * SR)
    t = t_axis(n)
    f = 110 * np.exp(-t / 0.04) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.14)


def hat():
    n = int(0.08 * SR)
    return highpass(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.018) * 0.5


def pad(freqs, length, cutoff=1800):
    n = int(length * SR)
    t = t_axis(n)
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            ff = note(f + det)
            # Soft saw: a few harmonics.
            for h in range(1, 7):
                s += np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28)) / h
    s = lowpass(s, cutoff)
    fade = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.8)
    return s / (len(freqs) * 9) * fade


def pluck(midi, length=0.6):
    n = int(length * SR)
    t = t_axis(n)
    f = note(midi)
    s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (6 + 5 * h)) / h for h in range(1, 6))
    return s * env(n, 0.002, 0.25)


# ---------- cue sheet ----------

S = TL["scenes"]
hook0, prob0, fix0, pay0, logo0 = (S[k][0] for k in ("hook", "problem", "fix", "payoff", "logo"))
P, F, PY, LG = TL["problem"], TL["fix"], TL["payoff"], TL["logo"]

# Hook + problem: mechanical metronome and a flat robotic drone.
beat = TL["hook"]["beat"]
for f in range(0, fix0 - 30, beat):
    g = 0.22 if f < prob0 else 0.14
    add(tick(2000 if (f // beat) % 2 == 0 else 1500), sec(f), g)
drone_len = sec(fix0)
n = int(drone_len * SR)
t = t_axis(n)
drone = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sin(2 * np.pi * 55 * t)
drone = lowpass(drone, 700) * np.minimum(1, t / 0.4) * np.minimum(1, (drone_len - t) / 0.05)
add(drone, 0, 0.07)

for c in P["clicks"]:
    add(click(), sec(prob0 + c), 0.5)
    add(thud(), sec(prob0 + c + 12), 0.45, pan=0.3)
for k in range(24):
    # Counter rolls: ticks that slow down with the ease-out.
    frac = k / 24
    f = prob0 + P["counterStart"] + 60 * (1 - (1 - frac) ** 0.5) * 1.0
    add(tick(2600, 0.02), sec(f), 0.12, pan=0.4)

# Riser into the product reveal, then the impact.
add(riser(1.4), sec(fix0) - 1.4, 0.8)
add(impact(), sec(fix0), 0.8)

# Fix: typing, tag pops, generate.
for f in range(F["typeStart"], F["typeEnd"], 3):
    add(tick(3200 + rng.uniform(-400, 400), 0.015), sec(fix0 + f), 0.09, pan=rng.uniform(-0.2, 0.2))
add(click(), sec(fix0 + F["tagsClick"]), 0.45)
for i, f in enumerate(F["inserts"]):
    add(click(), sec(fix0 + f), 0.4)
    add(pop(784 * 2 ** (i * 4 / 12)), sec(fix0 + f + 2), 0.35)
add(whoosh(0.7, 300, 3000), sec(fix0 + F["zoomIn"][0]), 0.5)
add(click(), sec(fix0 + F["generateClick"]), 0.55)
add(pop(1046), sec(fix0 + F["generateClick"] + 2), 0.3)
for i in range(12):
    add(pluck(84 + [0, 4, 7, 11][i % 4]), sec(fix0 + F["drawStart"]) + i * 0.045, 0.08, pan=-0.5 + i / 12)

# Music: 120 BPM (one beat = 30 frames at 60 fps) from the reveal to the end.
bar = 2.0
start = sec(fix0)
chords = [
    [53, 57, 60, 64],  # Fmaj7
    [57, 60, 64, 67],  # Am7
    [48, 55, 60, 64],  # Cmaj7
    [55, 59, 62, 64],  # G6
]
t0 = start
i = 0
while t0 < sec(logo0):
    ch = chords[i % 4]
    add(pad(ch, bar + 0.4, 1400 + 400 * (t0 > sec(pay0))), t0, 0.5)
    add(pad([ch[0] - 12], bar + 0.2, 300), t0, 0.6)
    t0 += bar
    i += 1
beat_s = 0.5
kt = start + bar / 2
while kt < sec(logo0) - 0.01:
    add(kick(), kt, 0.55)
    kt += beat_s * 2 if kt < sec(pay0) else beat_s
ht = start + bar
while ht < sec(logo0) - 0.01:
    add(hat(), ht + beat_s / 2, 0.35, pan=0.25)
    ht += beat_s
arp = [0, 7, 12, 16, 12, 7]
at = start + bar
k = 0
while at < sec(logo0) - 0.01:
    ch = chords[int((at - start) // bar) % 4]
    add(pluck(ch[0] + 12 + arp[k % len(arp)], 0.4), at, 0.07, pan=0.4 * np.sin(k))
    at += beat_s / 2
    k += 1

# Payoff: card pops + counter rolls.
for i in range(4):
    add(pop(660 * 2 ** (i * 2 / 12)), sec(pay0 + PY["cards"] + i * 4), 0.22, pan=-0.45 + i * 0.3)
for k in range(30):
    frac = k / 30
    add(tick(3000, 0.015), sec(pay0 + PY["counters"] + 60 * (1 - (1 - frac) ** 0.5)), 0.07)

# Scene whooshes.
for b in (prob0, pay0, logo0):
    add(whoosh(0.45), sec(b) - 0.3, 0.45)

# Logo: final hit, bar-by-bar sparkle, a long resolving chord.
add(impact(), sec(logo0), 0.55)
for i in range(11):
    add(pluck(72 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][i], 0.8), sec(logo0 + LG["bars"] + i * 2), 0.1, pan=-0.6 + i * 0.12)
add(pad([53, 60, 64, 67, 72], DUR - sec(logo0), 2200), sec(logo0), 0.6)
add(pad([41], DUR - sec(logo0), 300), sec(logo0), 0.6)
add(pop(1318), sec(logo0 + LG["cta"]), 0.2)

# Master: gentle glue, fade the tail, normalise to -1 dBFS.
mix = np.stack([L, R])
tail = np.ones(N)
fade_n = int(0.6 * SR)
tail[-fade_n:] = np.linspace(1, 0, fade_n)
mix *= tail
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "public" / "soundtrack.wav")
pcm = (mix.T * 32767).astype("<i2")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out} ({DUR:.1f}s)")

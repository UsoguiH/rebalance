#!/usr/bin/env python3
"""Synthesize the background bed: a slow A-minor ambient loop
(pad + soft sub pulse + quiet plucked arpeggio), deterministic.

    python3 tools/music.py 36.3 audio/music.wav
"""
import sys, wave
import numpy as np

SR = 48000
BPM = 84
BEAT = 60 / BPM
BAR = BEAT * 4


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# i - VI - III - VII in A minor, two bars each
CHORDS = [
    [45, 52, 57, 60, 64],  # Am
    [41, 48, 53, 57, 64],  # Fmaj7-ish
    [48, 52, 55, 60, 67],  # C
    [43, 50, 55, 59, 62],  # G
]


def env(n, a, r):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e


def pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):          # slight chorus
            ff = f * 2 ** (det / 12)
            for h, amp in ((1, 1.0), (2, 0.35), (3, 0.12)):
                out += amp * np.sin(2 * np.pi * ff * h * t + h * det * 7)
    out *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) ** 2  # slow breathing
    return out * env(len(t), 1.6, 1.8) / (len(freqs) * 4)


def pluck(f, dur=1.4):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.exp(-t * 4.0) * env(len(t), 0.004, 0.05)


def sub(f, dur=BEAT * 0.95):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) * env(len(t), 0.01, 0.05)


def add(buf, sig, at):
    i = int(at * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]


def main():
    total = float(sys.argv[1])
    out_path = sys.argv[2]
    n = int((total + 2) * SR)
    pads, subs, plucks = np.zeros(n), np.zeros(n), np.zeros(n)
    rng = np.random.default_rng(3)
    t, k = 0.0, 0
    while t < total + 1:
        ch = CHORDS[k % len(CHORDS)]
        add(pads, pad([midi(m) for m in ch], BAR * 2 + 1.8), t - 0.4)
        for b in range(8):
            add(subs, sub(midi(ch[0] - 12)), t + b * BEAT)
        tones = [midi(m + 12) for m in ch[1:]]
        for e in range(16):  # eighth notes, sparse
            if rng.random() < 0.55:
                add(plucks, pluck(tones[(e * 3 + k) % len(tones)]) * (0.6 + 0.4 * rng.random()), t + e * BEAT / 2)
        t += BAR * 2
        k += 1

    mix = 0.55 * pads + 0.45 * subs + 0.16 * plucks
    # small room: a few feedback taps
    for d, g in ((0.071, 0.28), (0.113, 0.22), (0.167, 0.16), (0.241, 0.1)):
        di = int(d * SR)
        mix[di:] += g * mix[:-di]
    mix = mix[: int(total * SR)]
    fade_in, fade_out = int(1.5 * SR), int(2.0 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)
    mix /= np.max(np.abs(mix)) + 1e-9
    stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)  # gentle width
    pcm = (stereo * 0.9 * 32767).astype(np.int16)
    w = wave.open(out_path, "wb")
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
    w.close()
    print("wrote", out_path)


if __name__ == "__main__":
    main()

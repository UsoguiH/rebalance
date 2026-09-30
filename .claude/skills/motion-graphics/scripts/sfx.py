#!/usr/bin/env python3
"""Synthesize the small sound effects motion graphics lean on (license-free, generated in code):
whoosh, swoosh-short, click, pop, tick, riser, impact, shimmer, type (keyboard). Writes public/sfx/*.wav
and turns on autoWhoosh in src/video.json.

Usage: python sfx.py --project DIR
"""
import argparse
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from _common import read_json, write_json  # noqa: E402

SR = 44100
rng = np.random.default_rng(5)


def lp(x, cutoff):
    """One-pole low-pass with a per-sample (array) or fixed cutoff."""
    c = np.broadcast_to(np.asarray(cutoff, np.float64), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def t(sec):
    return np.arange(int(sec * SR)) / SR


def norm(x, peak=0.8):
    return x / (np.abs(x).max() + 1e-9) * peak


def whoosh(sec=0.55):
    k = t(sec)
    n = rng.standard_normal(len(k))
    sweep = 300 + 5000 * np.sin(np.pi * k / sec) ** 2
    body = lp(n, sweep) - lp(n, sweep * 0.25)
    return norm(body * np.sin(np.pi * k / sec) ** 1.5, 0.7)


def click():
    k = t(0.04)
    return norm((rng.standard_normal(len(k)) * np.exp(-k * 400) + np.sin(2 * np.pi * 2400 * k) * np.exp(-k * 250) * 0.6), 0.6)


def pop():
    k = t(0.18)
    f = 900 * np.exp(-k * 18) + 250
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-k * 22), 0.7)


def tick():
    k = t(0.03)
    return norm(np.sin(2 * np.pi * 3800 * k) * np.exp(-k * 500), 0.5)


def riser(sec=2.0):
    k = t(sec)
    n = rng.standard_normal(len(k))
    body = n - lp(n, 400 + 7000 * (k / sec) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (k / sec) ** 2) / SR) * 0.3
    return norm((body * 0.6 + tone) * (k / sec) ** 2, 0.7)


def impact():
    k = t(1.6)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-k * 12)) / SR) * np.exp(-k * 3)
    crack = lp(rng.standard_normal(len(k)), 2500) * np.exp(-k * 14)
    return norm(boom + crack * 0.5, 0.9)


def shimmer():
    k = t(1.2)
    out = np.zeros_like(k)
    for i, f in enumerate([1318.5, 1760, 2217.5, 2637]):
        out += np.sin(2 * np.pi * f * k) * np.exp(-np.maximum(0, k - i * 0.06) * 4) * (k > i * 0.06)
    return norm(out, 0.45)


def type_keys():
    out = np.zeros(int(0.9 * SR))
    for i in range(8):
        at = int((i * 0.1 + rng.uniform(0, 0.03)) * SR)
        c = click() * rng.uniform(0.5, 0.9)
        out[at:at + len(c)] += c[: len(out) - at]
    return norm(out, 0.5)


def save(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    a = ap.parse_args()
    out = os.path.join(a.project, "public", "sfx")
    os.makedirs(out, exist_ok=True)
    fx = {"whoosh": whoosh(), "swoosh-short": whoosh(0.3), "click": click(), "pop": pop(), "tick": tick(),
          "riser": riser(), "impact": impact(), "shimmer": shimmer(), "type": type_keys()}
    for name, x in fx.items():
        save(os.path.join(out, f"{name}.wav"), x)
    sp = os.path.join(a.project, "src", "video.json")
    if os.path.exists(sp):
        spec = read_json(sp)
        spec["autoWhoosh"] = True
        write_json(sp, spec)
    print("Wrote", ", ".join(f"sfx/{n}.wav" for n in fx), "and enabled autoWhoosh")


if __name__ == "__main__":
    main()

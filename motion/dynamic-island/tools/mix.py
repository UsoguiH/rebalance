#!/usr/bin/env python3
"""Build the film's soundtrack: music under the whole film, plus the reference
video's typing passages (motion/sfx/typing/, untouched) at every caption in
js/cues.js.

    python3 motion/dynamic-island/tools/mix.py MUSIC --start 110.128 --out audio/soundtrack.wav

MUSIC is any file ffmpeg can read; --start is where in it the film begins.
The music dips 4 dB under each typing passage so the keys sit on top, and the
mix is normalised to -14 LUFS. Needs ffmpeg and numpy.
"""
import argparse
import json
import os
import re
import subprocess
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SFX = os.path.join(ROOT, '..', 'sfx', 'typing')
SR, DUR = 44100, 24.0


def decode(path, start=0.0, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', path]
    if dur:
        cmd += ['-t', str(dur)]
    cmd += ['-ac', '2', '-ar', str(SR), '-f', 's16le', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768


def cues():
    src = open(os.path.join(ROOT, 'js', 'cues.js')).read()
    block = re.search(r'const CUES = (\[.*?\]);', src, re.S).group(1)
    return json.loads(block)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('music')
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    n = int(DUR * SR)
    music = decode(a.music, a.start, DUR + 0.5)[:n]
    music = np.pad(music, ((0, n - len(music)), (0, 0)))
    fi, fo = int(0.15 * SR), int(0.6 * SR)
    music[:fi] *= np.linspace(0, 1, fi)[:, None]
    music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5

    keys = np.zeros_like(music)
    duck = np.ones(n)
    for c in cues():
        p = decode(os.path.join(SFX, c['passage']))
        first = json.load(open(os.path.join(SFX, 'passages.json')))
        first = next(q for q in first if q['file'] == c['passage'])['clicks'][0]
        i = int(round((c['at'] - first) * SR))  # passage starts so its first click lands on `at`
        keys[i:i + len(p)] += p[:max(0, n - i)]
        d0, d1 = max(0, i - int(0.08 * SR)), min(n, i + len(p) + int(0.15 * SR))
        duck[d0:d1] = np.minimum(duck[d0:d1], 10 ** (-4 / 20))
    duck = np.convolve(duck, np.ones(int(0.06 * SR)) / int(0.06 * SR), 'same')  # soft duck edges
    mixd = music * duck[:, None] + keys * 1.25

    tmp = a.out + '.raw.wav'
    with wave.open(tmp, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mixd / max(1, np.abs(mixd).max() / 0.98), -1, 1) * 32767).astype(np.int16).tobytes())
    # two-pass loudness normalisation to -14 LUFS, -1 dBTP
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json',
                           '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', af, '-ar', str(SR), a.out], check=True)
    os.remove(tmp)
    print('wrote', a.out)


if __name__ == '__main__':
    main()

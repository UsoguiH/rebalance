"""Original launch score for the Island film, synthesised from scratch.

    python3 motion/island/audio/compose.py out.wav

120 BPM in F major, scored to the film's cut list (the timings below are the
same frame times the picture uses). Everything is generated here: no samples,
no recordings. Deterministic, so re-running gives the same file.
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 16.067
N = int(SR * DUR)
rng = np.random.default_rng(44)
F = lambda n: (n - 1) / 30            # film frame → seconds
t_axis = np.arange(N) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def buf():
    return np.zeros((2, N))


def place(dst, sig, at, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal into dst starting at `at` seconds."""
    i = int(at * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.vstack([sig * l * 1.414, sig * r * 1.414])
    j = min(N, i + sig.shape[1])
    if i < 0:
        sig, i = sig[:, -i:], 0
    dst[:, i:j] += sig[:, : j - i] * gain


def env_adsr(n, a, d, s, r, hold=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - a - d - r if hold is None else int(hold * SR)
    hold = max(hold, 0)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(hold, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def saw(freq, n, detune=0.0, phase=None):
    ph = rng.random() if phase is None else phase
    p = (np.arange(n) * freq * (1 + detune) / SR + ph) % 1.0
    return 2 * p - 1


def sine(freq, n, phase=0.0):
    return np.sin(2 * np.pi * freq * np.arange(n) / SR + phase)


# --------------------------------------------------------------- instruments
def pad_chord(notes, dur, bright=1800):
    n = int(dur * SR)
    out = np.zeros(n)
    for m in notes:
        f = midi(m)
        for dt in (-0.006, 0.0, 0.007):
            out += saw(f, n, dt) * 0.18
        out += sine(f, n) * 0.25
    out = lp(lp(out, bright), bright * 1.3)
    e = env_adsr(n, min(0.6, dur * 0.3), 0.3, 0.85, min(0.8, dur * 0.3))
    return out * e / len(notes)


def pluck(m, dur=0.45, bright=4200):
    n = int(dur * SR)
    f = midi(m)
    x = saw(f, n) * 0.6 + sine(f * 2, n) * 0.25 + sine(f, n) * 0.4
    fc = bright * np.exp(-np.arange(n) / SR * 9) + 400
    # cheap swept lowpass: blend a bright and a dark copy with the decay curve
    bright_x, dark_x = lp(x, bright), lp(x, 600)
    k = (fc - 400) / bright
    y = bright_x * k + dark_x * (1 - k)
    return y * np.exp(-np.arange(n) / SR * 7.5) * env_adsr(n, 0.003, 0.05, 1, 0.05)


def bell(m, dur=1.2):
    n = int(dur * SR)
    f = midi(m)
    x = sine(f, n) + 0.5 * sine(f * 2.01, n) + 0.25 * sine(f * 3.98, n) + 0.12 * sine(f * 5.4, n)
    return x * np.exp(-np.arange(n) / SR * 3.2) * env_adsr(n, 0.002, 0.02, 1, 0.1) * 0.5


def kick(gain=1.0):
    n = int(0.42 * SR)
    tt = np.arange(n) / SR
    f = 46 + 110 * np.exp(-tt * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt * 7.5)
    click = lp(rng.standard_normal(n), 5000) * np.exp(-tt * 260) * 0.35
    return np.tanh((body + click) * 1.6) * 0.9 * gain


def clap():
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        i = int(d * SR)
        e[i:] += np.exp(-(tt[: n - i]) * (90 if k < 2 else 22))
    return bp(rng.standard_normal(n), 900, 3800) * e * 0.55


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500, 4) * np.exp(-tt * (14 if open_ else 70)) * 0.22


def whoosh(dur, up=True, lo=300, hi=7000):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    steps = 40
    out = np.zeros(n)
    edges = np.linspace(0, n, steps + 1).astype(int)
    for s in range(steps):
        k = s / (steps - 1)
        fc = lo * (hi / lo) ** (k if up else 1 - k)
        seg = bp(noise[edges[s]: edges[s + 1] + 512], fc * 0.6, min(fc * 1.6, SR * 0.45))[: edges[s + 1] - edges[s]]
        out[edges[s]: edges[s + 1]] = seg
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.4 if up else 0.8)
    if up:
        shape *= np.linspace(0.3, 1, n)
    return out * shape * 0.5


def riser(dur, f0=180, f1=1400):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (tt / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * 0.25
    return (tone + whoosh(dur, True, 400, 9000) * 0.9) * (tt / dur) ** 1.6


def impact(dur=1.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 3.2)
    air = lp(rng.standard_normal(n), 2500) * np.exp(-tt * 6) * 0.35
    return np.tanh((boom + air) * 1.3) * 0.8


def ui_click(gain=1.0):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    x = sine(2200, n) * np.exp(-tt * 180) + bp(rng.standard_normal(n), 2500, 9000) * np.exp(-tt * 400) * 0.5
    return x * 0.45 * gain


def tick(gain=1.0):
    n = int(0.03 * SR)
    tt = np.arange(n) / SR
    return bp(rng.standard_normal(n), 3000, 9000) * np.exp(-tt * 500) * 0.18 * gain


def pop(m, gain=1.0):
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    f = midi(m) * (1 + 0.6 * np.exp(-tt * 60))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 11)
    return x * 0.5 * gain


def sub(m, dur):
    n = int(dur * SR)
    return sine(midi(m), n) * env_adsr(n, 0.01, 0.1, 0.9, 0.08) * 0.55


# ------------------------------------------------------------------- score
BEAT = 0.5
BAR0 = 1.93                    # bar lines: 1.93, 3.93, 5.93 (the drop) …
FMAJ9 = [53, 57, 60, 64, 67]
DM9 = [50, 53, 57, 60, 64]
BBMAJ9 = [46, 50, 53, 57, 60]
C69 = [48, 52, 55, 57, 62]

music, drums, sfx, pads = buf(), buf(), buf(), buf()

# pads
for chord, a, b in [(FMAJ9, 0.93, 3.93), (DM9, 3.93, 4.93), (BBMAJ9, 4.93, 5.93), (FMAJ9, 5.93, 7.93), (DM9, 7.93, 9.93),
                    (BBMAJ9, 9.93, 10.93), (C69, 10.93, 11.23), (DM9, 11.23, 13.6), (FMAJ9 + [72], 13.67, 16.07)]:
    bright = 1500 if a < 5.9 else (2600 if a < 13.6 else 3200)
    place(pads, pad_chord(chord, b - a + 0.6, bright), a, 2.3 if a < 5.9 else (0.75 if a < 13.6 else 1.15))

# arpeggio plucks (8ths) from the typing onwards; 16ths in the build
def arp(chord, a, b, step, octave=12, gain=0.32, pat=(0, 2, 4, 3, 1, 3, 2, 4)):
    k = 0
    tt = a
    while tt < b - 1e-6:
        m = chord[pat[k % len(pat)]] + octave
        place(music, pluck(m), tt, gain, pan=0.35 if k % 2 else -0.35)
        tt += step
        k += 1

arp(FMAJ9, 1.93, 3.93, BEAT / 2, gain=0.6)
arp(DM9, 3.93, 4.93, BEAT / 4, gain=0.5)
arp(BBMAJ9, 4.93, 5.93, BEAT / 4, gain=0.55)
arp(FMAJ9, 5.93, 7.93, BEAT / 2, gain=0.3)
arp(DM9, 7.93, 9.93, BEAT / 2, gain=0.3)
arp(BBMAJ9, 9.93, 10.93, BEAT / 2, gain=0.3)

# drums: four on the floor from the drop to the iris, claps on 2 & 4
kick_times = []
tt = 5.93
while tt < 10.93 - 1e-6:
    kick_times.append(tt)
    place(drums, kick(), tt, 0.95)
    tt += BEAT
for k, tt in enumerate(np.arange(5.93, 10.93 - 1e-6, BEAT)):
    if k % 2 == 1:
        place(drums, clap(), tt, 0.8, pan=0.05)
for tt in np.arange(5.93 + BEAT / 2, 10.93, BEAT):
    place(drums, hat(open_=True), tt, 0.7, pan=0.3)
for tt in np.arange(3.93, 5.93, BEAT / 2):                  # build: hats tightening
    place(drums, hat(), tt, 0.4 + 0.6 * (tt - 3.93) / 2, pan=-0.25)
for tt in np.arange(4.93, 5.93, BEAT / 4):
    place(drums, hat(), tt, 0.5, pan=0.25)
# words section: half-time pulse
for tt in (11.23, 12.0, 12.67):
    place(drums, kick(0.75), tt, 0.85)
    kick_times.append(tt)

# sub bass after the drop
for root, a, b in [(29, 5.93, 7.93), (38, 7.93, 9.93), (34, 9.93, 10.93), (36, 10.93, 11.23), (38, 11.23, 13.55), (29, 13.67, 16.07)]:
    place(music, lp(sub(root + 12, b - a), 180), a, 0.9)

# ------------------------------------------------------- sound design (SFX)
place(sfx, bell(77, 2.0), 0.93, 0.7)                                    # box blooms in
place(sfx, bell(72, 2.4), 0.95, 0.45)
place(sfx, whoosh(0.9, True, 600, 9000), 0.55, 0.25)
typed_frames = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 81, 83, 85]
for i, fr in enumerate(typed_frames):                                   # typing
    place(sfx, tick(0.9 + 0.3 * (i % 3)), F(fr), 1.0, pan=0.2 * ((i % 5) - 2) / 2)
place(sfx, whoosh(0.18, False, 2500, 400), F(85.5), 0.55)               # zoom punch
place(sfx, kick(0.5), F(86.5), 0.5)
place(sfx, ui_click(1.2), F(109), 1.0, pan=0.3)                         # Send
place(sfx, whoosh(0.4, True, 500, 6000), F(119), 0.45)                  # card lifts away
for i, fr in enumerate(np.arange(125, 170, 1.6)):                       # tree letters
    place(sfx, tick(0.6), F(fr), 0.8, pan=-0.3 + 0.6 * (i % 2))
place(sfx, riser(1.8), 4.13, 0.8)                                      # build into the drop
place(sfx, impact(), 5.93, 0.85)                                        # cards slam in
place(sfx, whoosh(0.5, False, 6000, 300), 5.85, 0.45)
place(sfx, whoosh(0.45, True, 400, 7000), 7.75, 0.35)                   # cards orbit
place(sfx, whoosh(0.35, False, 7000, 500), 8.36, 0.45)                  # fan-out into the window
place(sfx, impact(1.0), 8.47, 0.4)
place(sfx, whoosh(0.4, True, 300, 8000), 9.7, 0.5)                      # dive onto Allow
for i, fr in enumerate((306, 307, 308, 309)):
    place(sfx, tick(1.2), F(fr), 0.9)
place(sfx, ui_click(1.5), F(320.5), 1.0, pan=0.2)                       # click Allow
for i, (m, fr) in enumerate([(84, 321), (88, 322.6), (91, 324.2)]):     # ripple rings
    place(sfx, bell(m, 0.9), F(fr), 0.22, pan=-0.4 + 0.4 * i)
place(sfx, whoosh(0.22, False, 8000, 200), F(331.5), 0.6)               # iris closes
place(sfx, pop(72, 1.0), F(337.5), 1.0)                                 # the dot appears
for (m, fr) in [(81, 338.5), (84, 360), (88, 381)]:                     # native. local. alive.
    place(sfx, pluck(m, 0.6, 6000), F(fr), 0.45)
    place(sfx, pop(m - 12, 0.6), F(fr), 0.6)
place(sfx, riser(0.9, 300, 2400), F(405) - 0.5, 0.5)                    # into the flash
place(sfx, whoosh(0.25, False, 9000, 300), F(409), 0.5)
place(sfx, impact(2.2), F(412), 0.75)                                   # Bloub mark lands
place(sfx, kick(1.0), F(412), 0.9)
for i, m in enumerate((89, 93, 96, 100)):                               # shimmer
    place(sfx, bell(m, 2.4), F(412) + 0.06 * i, 0.16, pan=-0.45 + 0.3 * i)
for i, fr in enumerate((449, 454, 455, 456, 457, 459)):                 # Island types out
    place(sfx, tick(1.1), F(fr), 0.9, pan=-0.2 + 0.08 * i)
place(sfx, bell(84, 1.6), F(463), 0.18)

# ------------------------------------------------------------------- mix
# sidechain: duck pads and music under each kick
duck = np.ones(N)
for kt in kick_times:
    i = int(kt * SR)
    n = int(0.32 * SR)
    curve = 1 - 0.55 * np.exp(-np.arange(n) / SR * 11)
    duck[i: i + n] = np.minimum(duck[i: i + n], curve[: max(0, min(n, N - i))])
pads *= duck
music *= duck

# a little stereo width on the pads (Haas)
d = int(0.011 * SR)
pads[1] = np.concatenate([np.zeros(d), pads[1][:-d]])

dry = pads * 0.8 + music + drums * 0.85 + sfx

def reverb(x, secs=2.4, wet=0.22):
    n = int(secs * SR)
    ir = np.vstack([lp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * 3.0) for _ in range(2)])
    ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 40
    y = np.vstack([fftconvolve(x[c], ir[c])[:N] for c in range(2)])
    return x + y * wet

send = pads * 0.8 + music * 0.7 + sfx * 0.6
mix = dry + (reverb(send) - send)

mix = hp(mix, 28)
# gentle bus glue + soft clip; loudness is set afterwards with ffmpeg loudnorm
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
fade = np.ones(N)
fn = int(0.25 * SR)
fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade * 0.89

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{DUR:.3f}s')

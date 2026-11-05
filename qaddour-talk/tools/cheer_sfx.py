# Synthesised sound effects for cheer.html (no voice): whoosh, landing thump, bubble pops, a confetti chime.
import numpy as np, wave, sys
SR, DUR = 48000, 5.0
out = np.zeros(int(SR * DUR))
rng = np.random.default_rng(7)
def put(t, sig):
    i = int(t * SR); out[i:i + len(sig)] += sig[:len(out) - i]
def tone(f0, f1, d, amp, decay):
    n = int(d * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * np.exp(-t * decay) * np.minimum(1, t / 0.004)
def whoosh(d, amp):
    n = int(d * SR); x = rng.standard_normal(n)
    k = np.linspace(0.02, 0.35, n)                      # a rising, brightening sweep
    y = np.zeros(n); v = 0
    for i in range(n): v += (x[i] - v) * k[i]; y[i] = v
    return amp * y * np.sin(np.pi * np.arange(n) / n) ** 1.5
put(0.0, whoosh(0.5, 0.35))
put(0.6, tone(160, 60, 0.25, 0.6, 14))                 # landing thump
put(0.62, whoosh(0.08, 0.15))
for t in (0.68, 2.95):                                 # the bubble pops in
    put(t, tone(780, 1250, 0.09, 0.28, 30))
for t in (1.24, 2.0, 3.02):                            # little ticks on the stressed words
    put(t, tone(1500, 1300, 0.05, 0.08, 60))
put(2.38, tone(200, 520, 0.18, 0.25, 10))              # the cheer hop's spring
for i, (t, f) in enumerate([(2.5, 1046.5), (2.58, 1318.5), (2.66, 1568.0), (2.76, 2093.0)]):   # C6 E6 G6 C7
    put(t, tone(f, f, 0.6, 0.18, 6)); put(t, tone(f * 2, f * 2, 0.4, 0.05, 9))
for k in range(18):                                    # sparkles in the confetti
    t = 2.55 + rng.random() * 0.9; f = 2500 + rng.random() * 2500
    put(t, tone(f, f * 1.05, 0.06, 0.05, 50))
put(3.35, tone(600, 900, 0.1, 0.3, 25))                # the button arrives
put(4.25, tone(1300, 1800, 0.12, 0.14, 18))            # the wink "ting"
out = np.tanh(out * 1.2) * 0.8
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', len(pcm) / SR)

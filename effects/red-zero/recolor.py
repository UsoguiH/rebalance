import sys, subprocess, numpy as np
src, dst = sys.argv[1], sys.argv[2]
W, H = 884, 1920
dec = subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','60','-i','-',
    '-i',src,'-map','0:v','-map','1:a','-c:v','libx264','-crf','16','-preset','slow','-pix_fmt','yuv420p','-c:a','copy',dst], stdin=subprocess.PIPE)

def smooth(x, a, b):  # 0 at a, 1 at b
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

n = W * H * 3
while True:
    buf = dec.stdout.read(n)
    if len(buf) < n: break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32) / 255
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mx = f.max(-1); mn = f.min(-1); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    # green -> teal band (lime 70° .. teal 190°) remaps onto crimson/red, edges fade out
    w = smooth(h, 48, 72) * (1 - smooth(h, 188, 206)) * smooth(s, 0.04, 0.12)
    target = (-14 + (np.clip(h, 72, 188) - 72) / 116 * 22) % 360   # lime->warm red, teal->crimson
    # hue blend along shortest arc
    delta = ((target - h + 180) % 360) - 180
    h2 = (h + delta * w) % 360
    # red reads darker than green at same value; lift value a touch where recolored
    v = np.clip(mx * (1 + 0.08 * w), 0, 1)
    s2 = np.clip(s * (1 + 0.1 * w), 0, 1)
    c = v * s2; hp = h2 / 60; x = c * (1 - np.abs(hp % 2 - 1)); m = v - c
    i = hp.astype(np.int32) % 6
    z = np.zeros_like(c)
    rr = np.choose(i, [c, x, z, z, x, c]); gg = np.choose(i, [x, c, c, x, z, z]); bb = np.choose(i, [z, z, x, c, c, x])
    out = np.stack([rr + m, gg + m, bb + m], -1)
    enc.stdin.write((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); dec.wait()

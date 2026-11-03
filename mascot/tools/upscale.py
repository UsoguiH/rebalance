"""Sharpen the reference sheet 4x with a Real-ESRGAN anime model (ONNX, CPU).

    python3 -I mascot/tools/upscale.py RealESRGAN_x4plus_anime_4B32F.onnx SHEET.png SHEET_x4.png

Model: https://huggingface.co/xiongjie/lightweight-real-ESRGAN-anime (not committed).
Then downscale to 2x (Lanczos) and colour-match it back to the original sheet (a per-channel
quadratic fit of the 4x->1x image against the original) before running extract.py.
Needs numpy, onnxruntime, Pillow.
"""
import sys, numpy as np, onnxruntime as ort
from PIL import Image
model, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
iname = s.get_inputs()[0].name
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255.0
H, W, _ = im.shape
T, P, S = 192, 16, 4
res = np.zeros((H * S, W * S, 3), np.float32); wsum = np.zeros((H * S, W * S, 1), np.float32)
for y in range(0, H, T):
    for x in range(0, W, T):
        y0, x0 = max(0, y - P), max(0, x - P); y1, x1 = min(H, y + T + P), min(W, x + T + P)
        tile = im[y0:y1, x0:x1].transpose(2, 0, 1)[None]
        o = s.run(None, {iname: tile})[0][0].transpose(1, 2, 0)
        # keep the tile's core (drop the padded rim)
        cy0, cx0 = (y - y0) * S, (x - x0) * S
        cy1, cx1 = cy0 + (min(H, y + T) - y) * S, cx0 + (min(W, x + T) - x) * S
        res[y * S:min(H, y + T) * S, x * S:min(W, x + T) * S] = o[cy0:cy1, cx0:cx1]
    print('row', y, flush=True)
Image.fromarray((np.clip(res, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out)

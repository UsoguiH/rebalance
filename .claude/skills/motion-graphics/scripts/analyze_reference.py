#!/usr/bin/env python3
"""Frame-by-frame study of a reference video.

Decodes EVERY frame (downscaled) and measures cuts, motion, brightness, saturation
and color; extracts the soundtrack and measures loudness, tempo and whether the
cuts land on the beat. Produces pictures Claude can look at (contact sheets of
every shot, a pacing timeline) plus numbers it can copy (analysis.json, report.md).

Usage:
  python analyze_reference.py VIDEO --out DIR [--transcribe]
"""
import argparse
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from _common import ffmpeg_bin, probe, run, write_json  # noqa: E402

SMALL_W, SMALL_H = 160, 90


def font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


# ---------------------------------------------------------------- video pass
def scan_frames(path, fps):
    """Stream every frame at 160x90 and compute per-frame metrics."""
    cmd = [ffmpeg_bin(), "-v", "error", "-i", path, "-vf", f"scale={SMALL_W}:{SMALL_H},format=rgb24",
           "-f", "rawvideo", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = SMALL_W * SMALL_H * 3
    prev_gray = prev_hist = None
    rows, pixel_pool = [], []
    rng = random.Random(7)
    i = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        f = np.frombuffer(buf, np.uint8).reshape(SMALL_H, SMALL_W, 3).astype(np.float32)
        gray = f @ np.array([0.299, 0.587, 0.114], np.float32)
        mx, mn = f.max(axis=2), f.min(axis=2)
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
        q = (f // 64).astype(np.int32)  # 4x4x4 color histogram
        hist = np.bincount((q[..., 0] * 16 + q[..., 1] * 4 + q[..., 2]).ravel(), minlength=64) / (SMALL_W * SMALL_H)
        motion = float(np.abs(gray - prev_gray).mean() / 255) if prev_gray is not None else 0.0
        hdiff = float(np.abs(hist - prev_hist).sum() / 2) if prev_hist is not None else 0.0
        rows.append({"i": i, "t": i / fps, "luma": float(gray.mean() / 255), "sat": float(sat.mean()),
                     "motion": motion, "hdiff": hdiff})
        flat = f.reshape(-1, 3)
        for _ in range(40):
            pixel_pool.append(flat[rng.randrange(len(flat))])
        prev_gray, prev_hist = gray, hist
        i += 1
    proc.wait()
    return rows, np.array(pixel_pool)


def detect_cuts(rows, fps):
    """A cut = a spike in color-histogram change that stands out from its neighbourhood."""
    h = np.array([r["hdiff"] for r in rows])
    m = np.array([r["motion"] for r in rows])
    cuts = [0]
    min_gap = max(3, int(fps * 0.12))
    for i in range(1, len(rows)):
        lo, hi = max(0, i - 12), min(len(rows), i + 13)
        local = np.median(h[lo:hi])
        is_spike = h[i] > max(0.28, local * 4) and h[i] == h[max(0, i - 2):i + 3].max()
        hard_motion = m[i] > 0.12 and m[i] > np.median(m[lo:hi]) * 5
        if (is_spike or hard_motion) and i - cuts[-1] >= min_gap:
            cuts.append(i)
    return cuts


def kmeans(pixels, k=6, iters=12, seed=3):
    if len(pixels) < k:
        return pixels, np.ones(len(pixels))
    rng = np.random.default_rng(seed)
    centers = pixels[rng.choice(len(pixels), k, replace=False)]
    for _ in range(iters):
        d = ((pixels[:, None, :] - centers[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            sel = pixels[lab == j]
            if len(sel):
                centers[j] = sel.mean(0)
    counts = np.bincount(lab, minlength=k) / len(pixels)
    order = counts.argsort()[::-1]
    return centers[order], counts[order]


def hexc(c):
    return "#%02x%02x%02x" % tuple(int(max(0, min(255, v))) for v in c)


def grab(path, t, width=480):
    """Extract one frame at time t as a PIL image."""
    res = subprocess.run([ffmpeg_bin(), "-v", "error", "-ss", f"{max(0, t):.3f}", "-i", path, "-frames:v", "1",
                          "-vf", f"scale={width}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
                         capture_output=True)
    if not res.stdout:
        return None
    from io import BytesIO

    return Image.open(BytesIO(res.stdout)).convert("RGB")


# ---------------------------------------------------------------- audio pass
def analyze_audio(path, duration):
    sr = 22050
    res = subprocess.run([ffmpeg_bin(), "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
                         capture_output=True)
    if not res.stdout:
        return None
    y = np.frombuffer(res.stdout, np.int16).astype(np.float32) / 32768
    hop, win = 512, 2048
    n = max(0, (len(y) - win) // hop)
    if n < 10:
        return None
    frames = np.lib.stride_tricks.as_strided(y, (n, win), (y.strides[0] * hop, y.strides[0]))
    spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
    rms = np.sqrt((frames ** 2).mean(1))
    flux = np.maximum(0, np.diff(np.log1p(spec * 10), axis=0)).sum(1)
    flux = np.concatenate([[0], flux])
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    env_fps = sr / hop

    # tempo by autocorrelation of the onset envelope (60-180 BPM)
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lags = np.arange(len(ac))
    lo, hi = int(env_fps * 60 / 180), int(env_fps * 60 / 60)
    if hi >= len(ac):
        return None
    # prefer tempos near 120 BPM and reward lags whose double also correlates (true beat, not an off-beat pattern)
    cand = np.arange(lo, hi)
    bpms = 60 * env_fps / cand
    prior = np.exp(-0.5 * (np.log2(bpms / 120) / 0.9) ** 2)
    double = np.array([ac[2 * c] if 2 * c < len(ac) else 0 for c in cand])
    score = (ac[lo:hi] + 0.5 * np.maximum(double, 0)) * prior
    lag = int(cand[score.argmax()])
    bpm = 60 * env_fps / lag
    # beat phase: offset that maximises onset energy on the grid
    best, phase = -1e9, 0
    for off in range(lag):
        s = flux[off::lag].sum()
        if s > best:
            best, phase = s, off
    beats = [(phase + k * lag) / env_fps for k in range(int((len(flux) - phase) / lag) + 1)]
    strength = float(ac[lag] / (ac[0] + 1e-9))

    # loudness via ffmpeg ebur128
    lufs = None
    r = subprocess.run([ffmpeg_bin(), "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    import re

    m = re.findall(r"I:\s+(-?\d+\.\d) LUFS", r.stderr)
    if m:
        lufs = float(m[-1])

    # quiet stretches (> 0.4 s below -45 dBFS)
    db = 20 * np.log10(rms + 1e-9)
    quiet, start = [], None
    for i, v in enumerate(db):
        if v < -45 and start is None:
            start = i
        elif v >= -45 and start is not None:
            if (i - start) / env_fps > 0.4:
                quiet.append([round(start / env_fps, 2), round(i / env_fps, 2)])
            start = None
    env = [round(float(v), 1) for v in db[:: max(1, int(env_fps / 10))]]  # 10 Hz loudness curve
    return {"bpm": round(bpm, 1), "beat_period": round(60 / bpm, 3), "beat_confidence": round(strength, 2),
            "beats": [round(b, 3) for b in beats], "integrated_lufs": lufs, "quiet_sections": quiet,
            "loudness_db_10hz": env}


def transcribe(path):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {"note": "faster-whisper not installed; skipped (pip install faster-whisper)"}
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segs, info = model.transcribe(path, word_timestamps=True)
    out, words = [], 0
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
        words += len(s.words or [])
    spoken = sum(s["end"] - s["start"] for s in out) or 1
    return {"language": info.language, "segments": out, "words": words, "words_per_sec_spoken": round(words / spoken, 2)}


# ---------------------------------------------------------------- pictures
def contact_sheets(path, shots, out_dir, per_sheet=6, cols=4, width=400):
    os.makedirs(out_dir, exist_ok=True)
    f_label = font(18)
    sheets = []
    for s0 in range(0, len(shots), per_sheet):
        chunk = shots[s0:s0 + per_sheet]
        tiles = []
        for sh in chunk:
            dur = sh["end"] - sh["start"]
            ts = [sh["start"] + dur * p for p in (0.08, 0.38, 0.68, 0.94)][:cols]
            tiles.append([grab(path, t, width) for t in ts])
        h = next((im.height for row in tiles for im in row if im), int(width * 9 / 16))
        label_h = 28
        sheet = Image.new("RGB", (cols * width + (cols + 1) * 6, len(chunk) * (h + label_h + 6) + 6), (18, 18, 18))
        d = ImageDraw.Draw(sheet)
        for r, (sh, row) in enumerate(zip(chunk, tiles)):
            y = 6 + r * (h + label_h + 6)
            d.text((8, y + 4), f"Shot {sh['index']:>3}  {sh['start']:.2f}s - {sh['end']:.2f}s  ({sh['end'] - sh['start']:.2f}s)"
                              f"   motion {sh['motion']:.3f}", fill=(255, 220, 90), font=f_label)
            for c, im in enumerate(row):
                if im:
                    sheet.paste(im, (6 + c * (width + 6), y + label_h))
        p = os.path.join(out_dir, f"sheet_{len(sheets) + 1:02d}.jpg")
        sheet.save(p, quality=82)
        sheets.append(p)
    return sheets


def timeline_png(rows, cuts, audio, duration, out):
    W, H = 1600, 360
    im = Image.new("RGB", (W, H), (16, 16, 20))
    d = ImageDraw.Draw(im)
    fnt = font(14)
    sx = lambda t: int(40 + (W - 60) * t / max(duration, 1e-6))  # noqa: E731
    lanes = [("motion", 20, (90, 200, 255)), ("luma", 110, (240, 240, 240)), ("sat", 200, (255, 120, 200))]
    for key, top, col in lanes:
        d.text((4, top), key, fill=col, font=fnt)
        vals = [r[key] for r in rows]
        mxv = max(max(vals), 1e-6) if key == "motion" else 1
        pts = [(sx(r["t"]), top + 80 - int(78 * r[key] / mxv)) for r in rows]
        if len(pts) > 1:
            d.line(pts, fill=col, width=1)
    if audio:
        d.text((4, 290), "audio", fill=(120, 255, 140), font=fnt)
        env = audio["loudness_db_10hz"]
        pts = [(sx(i / 10), 350 - int(60 * max(0, v + 60) / 60)) for i, v in enumerate(env)]
        if len(pts) > 1:
            d.line(pts, fill=(120, 255, 140), width=1)
        for b in audio["beats"]:
            d.line([(sx(b), 286), (sx(b), 292)], fill=(120, 255, 140))
    for c in cuts:
        x = sx(rows[c]["t"])
        d.line([(x, 10), (x, 285)], fill=(255, 80, 60), width=1)
    for s in range(0, int(duration) + 1, 5):
        d.text((sx(s) - 6, H - 14), f"{s}s", fill=(150, 150, 150), font=fnt)
    im.save(out)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--transcribe", action="store_true", help="speech-to-text with faster-whisper if installed")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    meta = probe(a.video)
    fps = meta["fps"] or 30
    print(f"Scanning every frame of {a.video} ({meta['duration']:.1f}s @ {fps} fps)...")
    rows, pool = scan_frames(a.video, fps)
    duration = len(rows) / fps
    cuts = detect_cuts(rows, fps)
    bounds = cuts + [len(rows)]

    shots = []
    for k in range(len(cuts)):
        s, e = bounds[k], bounds[k + 1]
        seg = rows[s:e]
        shots.append({"index": k + 1, "start": round(s / fps, 3), "end": round(e / fps, 3),
                      "frames": e - s,
                      "motion": round(float(np.mean([r["motion"] for r in seg[1:]] or [0])), 4),
                      "luma": round(float(np.mean([r["luma"] for r in seg])), 3),
                      "sat": round(float(np.mean([r["sat"] for r in seg])), 3)})
    # per-shot palettes from a mid frame
    for sh in shots:
        im = grab(a.video, (sh["start"] + sh["end"]) / 2, 96)
        if im:
            px = np.asarray(im, np.float32).reshape(-1, 3)
            cs, ws = kmeans(px, 4)
            sh["palette"] = [hexc(c) for c, w in zip(cs, ws) if w > 0.04]

    centers, weights = kmeans(pool.astype(np.float32), 8)
    lens = np.array([s["end"] - s["start"] for s in shots])
    print("Analysing soundtrack...")
    audio = analyze_audio(a.video, duration) if meta["has_audio"] else None

    on_beat = None
    if audio and audio["beat_confidence"] > 0.05 and len(cuts) > 1:
        beats = np.array(audio["beats"])
        tol = 0.07
        hits = sum(1 for c in cuts[1:] if np.abs(beats - rows[c]["t"]).min() <= tol)
        chance = min(1, 2 * tol / audio["beat_period"])
        on_beat = {"cuts_on_beat_pct": round(100 * hits / (len(cuts) - 1), 1), "chance_pct": round(100 * chance, 1)}

    speech = transcribe(a.video) if a.transcribe and meta["has_audio"] else None

    summary = {
        "file": os.path.abspath(a.video), "duration_s": round(duration, 2), "fps": fps,
        "resolution": f"{meta['width']}x{meta['height']}", "frames_scanned": len(rows),
        "shots": len(shots), "cuts_per_minute": round(60 * (len(shots) - 1) / max(duration, 1e-6), 1),
        "shot_length_s": {"mean": round(float(lens.mean()), 2), "median": round(float(np.median(lens)), 2),
                          "min": round(float(lens.min()), 2), "max": round(float(lens.max()), 2)},
        "global_palette": [{"hex": hexc(c), "share": round(float(w), 3)} for c, w in zip(centers, weights)],
        "mean_luma": round(float(np.mean([r["luma"] for r in rows])), 3),
        "mean_saturation": round(float(np.mean([r["sat"] for r in rows])), 3),
        "mean_motion": round(float(np.mean([r["motion"] for r in rows])), 4),
        "cut_beat_alignment": on_beat,
    }
    sheets = contact_sheets(a.video, shots, os.path.join(a.out, "sheets"))
    timeline_png(rows, cuts, audio, duration, os.path.join(a.out, "timeline.png"))

    write_json(os.path.join(a.out, "analysis.json"),
               {"summary": summary, "shots": shots, "audio": audio, "speech": speech,
                "frame_metrics_10hz": [rows[i] for i in range(0, len(rows), max(1, int(fps / 10)))]})

    lines = [f"# Reference analysis: {os.path.basename(a.video)}", "",
             f"- Duration **{summary['duration_s']}s**, {summary['resolution']} @ {fps} fps, {len(rows)} frames scanned",
             f"- **{summary['shots']} shots**, {summary['cuts_per_minute']} cuts/min, shot length mean "
             f"{summary['shot_length_s']['mean']}s / median {summary['shot_length_s']['median']}s "
             f"(min {summary['shot_length_s']['min']}s, max {summary['shot_length_s']['max']}s)",
             f"- Brightness {summary['mean_luma']} (0 black - 1 white), saturation {summary['mean_saturation']}, "
             f"motion {summary['mean_motion']}",
             "- Palette: " + ", ".join(f"`{p['hex']}` {p['share'] * 100:.0f}%" for p in summary["global_palette"])]
    if audio:
        lines.append(f"- Music ~**{audio['bpm']} BPM** (beat every {audio['beat_period']}s, confidence "
                     f"{audio['beat_confidence']}), loudness {audio['integrated_lufs']} LUFS")
    if on_beat:
        lines.append(f"- Cuts on the beat: {on_beat['cuts_on_beat_pct']}% (chance would be {on_beat['chance_pct']}%)")
    if speech and "segments" in speech:
        lines.append(f"- Voice-over: {speech['language']}, {speech['words']} words, "
                     f"{speech['words_per_sec_spoken']} words/s while speaking")
    lines += ["", "## Shots", "", "| # | start | length | motion | palette |", "|---|---|---|---|---|"]
    for s in shots:
        lines.append(f"| {s['index']} | {s['start']:.2f}s | {s['end'] - s['start']:.2f}s | {s['motion']:.3f} | "
                     f"{' '.join(s.get('palette', []))} |")
    lines += ["", "## Look at these next", "", f"- Pacing timeline: `{os.path.join(a.out, 'timeline.png')}`"]
    lines += [f"- Contact sheet: `{p}`" for p in sheets]
    with open(os.path.join(a.out, "report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines[:9]))
    print(f"\nWrote {a.out}/report.md, analysis.json, timeline.png and {len(sheets)} contact sheets.")


if __name__ == "__main__":
    main()

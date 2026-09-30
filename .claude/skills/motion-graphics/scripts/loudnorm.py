#!/usr/bin/env python3
"""Two-pass EBU R128 loudness normalisation of a rendered video, in place (video stream copied).
Usage: loudnorm.py video.mp4 [--target -14]"""
import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _common import ffmpeg_bin  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--target", type=float, default=-14.0)
ap.add_argument("--tp", type=float, default=-1.5)
a = ap.parse_args()
ff = ffmpeg_bin()
flt = f"loudnorm=I={a.target}:TP={a.tp}:LRA=11"
r = subprocess.run([ff, "-hide_banner", "-nostats", "-i", a.video, "-af", flt + ":print_format=json", "-f", "null", "-"], capture_output=True, text=True)
m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
if not m:
    sys.exit("loudnorm: could not measure (is there an audio track?)")
d = json.loads(m.group(0))
flt2 = (f"{flt}:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:"
        f"measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true")
tmp = a.video + ".norm.mp4"
subprocess.run([ff, "-hide_banner", "-v", "error", "-y", "-i", a.video, "-c:v", "copy", "-af", flt2, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
os.replace(tmp, a.video)
print(f"Loudness normalised: {d['input_i']} -> {a.target} LUFS")

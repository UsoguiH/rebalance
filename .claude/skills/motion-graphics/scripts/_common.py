"""Shared helpers: locate ffmpeg/ffprobe, run commands, small JSON utils."""
import json
import os
import shutil
import subprocess
import sys


def ffmpeg_bin():
    """Return a usable ffmpeg path: system ffmpeg first, then imageio-ffmpeg's bundled binary."""
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found. Run scripts/setup.sh (or: pip install imageio-ffmpeg).")


def run(cmd, **kw):
    """Run a command, raising with stderr attached if it fails."""
    res = subprocess.run(cmd, capture_output=True, text=kw.pop("text", True), **kw)
    if res.returncode != 0:
        err = res.stderr if isinstance(res.stderr, str) else res.stderr.decode(errors="replace")
        raise RuntimeError(f"Command failed ({res.returncode}): {' '.join(map(str, cmd))}\n{err[-2000:]}")
    return res


def probe(path):
    """Duration, fps, size and audio presence, parsed from `ffmpeg -i` (no ffprobe needed)."""
    import re

    res = subprocess.run([ffmpeg_bin(), "-hide_banner", "-i", path], capture_output=True, text=True)
    info = res.stderr
    out = {"duration": None, "fps": None, "width": None, "height": None, "has_audio": False}
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", info)
    if m:
        h, mnt, s = m.groups()
        out["duration"] = int(h) * 3600 + int(mnt) * 60 + float(s)
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", info)
    if m:
        out["width"], out["height"] = int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d+(?:\.\d+)?) fps", info)
    if m:
        out["fps"] = float(m.group(1))
    out["has_audio"] = "Audio:" in info
    return out


def write_json(path, data):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

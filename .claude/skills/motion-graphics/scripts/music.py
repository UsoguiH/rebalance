#!/usr/bin/env python3
"""Get a music bed for the video and measure its beats.

Modes (pick one):
  --file song.mp3            use the user's own track
  --search "upbeat electronic corporate"   find commercial-use CC music on Openverse (Jamendo, ccMixter,
                                          Freesound, Wikimedia), analyse the best candidates and keep the best fit
  --elevenlabs "prompt"      generate with ElevenLabs Music (needs ELEVENLABS_API_KEY)
  --synth                    compose an original, license-free track in code, with hits on the scene cuts

Always writes public/music/track.* and music.json (bpm, beat times, where the music gets going),
updates src/video.json audio.music / musicTrimBefore, and adds a credits.json entry.

Usage:
  python music.py --project DIR --search "cinematic inspiring" [--duration 45] [--bpm 90-130]
  python music.py --project DIR --synth --mood bright|chill|dark|epic [--bpm 112]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import wave

import numpy as np
import requests

sys.path.insert(0, os.path.dirname(__file__))
from _common import ffmpeg_bin, probe, read_json, write_json  # noqa: E402
from analyze_reference import analyze_audio  # noqa: E402

UA = {"User-Agent": "motion-graphics-skill/1.0 (Claude skill; music search)"}
SR = 44100


def spec_path(project):
    return os.path.join(project, "src", "video.json")


def video_duration(project):
    """Rough length of the storyboard in seconds (scene durations minus transition overlaps)."""
    try:
        spec = read_json(spec_path(project))
    except FileNotFoundError:
        return 30.0
    sc = spec.get("scenes", [])
    total = sum(s.get("duration", 3) for s in sc)
    total -= sum((s.get("transition") or {}).get("duration", 0.5) for s in sc[:-1] if (s.get("transition") or {}).get("type") != "none")
    return max(5.0, total)


def scene_cuts(project):
    try:
        spec = read_json(spec_path(project))
    except FileNotFoundError:
        return []
    t, cuts = 0.0, []
    for s in spec.get("scenes", [])[:-1]:
        tr = (s.get("transition") or {})
        t += s.get("duration", 3) - (0 if tr.get("type") == "none" else tr.get("duration", 0.5))
        cuts.append(round(t, 3))
    return cuts


def first_loud(path, thresh_db=-24):
    """Seconds until the track reaches a real level (skip quiet intros)."""
    res = subprocess.run([ffmpeg_bin(), "-v", "error", "-i", path, "-t", "40", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True)
    y = np.frombuffer(res.stdout, np.int16).astype(np.float32) / 32768
    if len(y) < 800:
        return 0.0
    win = 400
    rms = np.sqrt(np.convolve(y ** 2, np.ones(win) / win, "valid"))[::win]
    db = 20 * np.log10(rms + 1e-9)
    idx = np.argmax(db > thresh_db)
    return round(float(idx * win / 8000), 2) if db.max() > thresh_db else 0.0


def finish(project, path, meta, known_bpm=None):
    info = probe(path)
    audio = analyze_audio(path, info["duration"] or 0) or {}
    trim = first_loud(path)
    if known_bpm:  # composed here: the grid is exact
        period = 60 / known_bpm
        audio.update({"bpm": known_bpm, "beat_period": round(period, 4), "beat_confidence": 1.0,
                      "beats": [round(k * period, 3) for k in range(int((info["duration"] or 0) / period) + 1)]})
        trim = 0.0
    out = {"file": os.path.relpath(path, os.path.join(project, "public")).replace(os.sep, "/"), "duration": info["duration"],
           "bpm": audio.get("bpm"), "beat_period": audio.get("beat_period"), "beat_confidence": audio.get("beat_confidence"),
           "lufs": audio.get("integrated_lufs"), "trim_before": trim,
           "beats": [round(b - trim, 3) for b in audio.get("beats", []) if b >= trim], **meta}
    write_json(os.path.join(project, "music.json"), out)
    sp = spec_path(project)
    if os.path.exists(sp):
        spec = read_json(sp)
        spec.setdefault("audio", {})
        spec["audio"]["music"] = out["file"]
        spec["audio"]["musicTrimBefore"] = trim
        write_json(sp, spec)
    cp = os.path.join(project, "credits.json")
    credits = json.load(open(cp)) if os.path.exists(cp) else []
    credits = [c for c in credits if c.get("what") != "music"] + [{"file": out["file"], "what": "music", "credit": meta.get("credit"),
                                                                   "source": meta.get("source"), "license": meta.get("license")}]
    write_json(cp, credits)
    print(f"Music: public/{out['file']}  {out['duration']:.1f}s  ~{out['bpm']} BPM  starts properly at {trim}s  ({meta.get('credit')})")
    print(f"License: {meta.get('license')}")
    return out


# ------------------------------------------------------------------ search (Openverse)
def search(project, query, want, bpm_range):
    # Only CC0 / CC BY / public domain: syncing music to picture is an adaptation, which ND forbids
    # and SA would force onto the whole video.
    params = {"q": query, "license": "cc0,by,pdm", "category": "music", "page_size": 20}
    r = requests.get("https://api.openverse.org/v1/audio/", params=params, headers=UA, timeout=30)
    r.raise_for_status()
    results = [x for x in r.json().get("results", []) if x.get("duration") and want * 0.85 * 1000 <= x["duration"] <= 480000]
    if not results:
        results = [x for x in r.json().get("results", []) if x.get("duration") and x["duration"] >= 20000]
    if not results:
        return None
    tmp = os.path.join(project, "public", "music", "_candidates")
    os.makedirs(tmp, exist_ok=True)
    scored = []
    for x in results[:6]:
        try:
            a = requests.get(x["url"], headers=UA, timeout=90)
            if not a.ok or len(a.content) < 50000:
                continue
            ext = "mp3" if "mpeg" in a.headers.get("content-type", "mp3") else a.headers.get("content-type", "audio/mp3").split("/")[-1][:4]
            p = os.path.join(tmp, f"{x['id']}.{ext}")
            open(p, "wb").write(a.content)
            info = probe(p)
            au = analyze_audio(p, info["duration"] or 0) or {}
            bpm = au.get("bpm") or 0
            lo, hi = bpm_range
            bpm_fit = 1.0 if lo <= bpm <= hi or lo <= bpm * 2 <= hi or lo <= bpm / 2 <= hi else 0.4
            dur_fit = 1.0 if (info["duration"] or 0) >= want else 0.5
            beat = min(1.0, (au.get("beat_confidence") or 0) * 2)
            intro = first_loud(p)
            score = bpm_fit * 2 + dur_fit + beat - min(1.0, intro / 6)
            scored.append((score, p, x, bpm))
            print(f"  candidate {score:.2f}  {x['title'][:40]:<40} {info['duration']:.0f}s ~{bpm} BPM  {x['license']}  {x.get('foreign_landing_url')}")
        except Exception as e:  # noqa: BLE001
            print("  skip:", e)
    if not scored:
        return None
    scored.sort(key=lambda s: -s[0])
    _, p, x, _ = scored[0]
    dest = os.path.join(project, "public", "music", "track" + os.path.splitext(p)[1])
    shutil.copy(p, dest)
    lic = x["license"].upper() if x["license"] in ("cc0", "pdm") else f"CC {x['license'].upper()} {x.get('license_version', '')}".strip()
    alts = [{"title": s[2]["title"], "creator": s[2].get("creator"), "url": s[2].get("foreign_landing_url"), "score": round(s[0], 2)} for s in scored[1:]]
    return finish(project, dest, {"credit": f"\"{x['title']}\" by {x.get('creator')} ({lic}) via {x.get('provider')}",
                                  "source": x.get("foreign_landing_url"), "license": f"{lic} {x.get('license_url', '')} — attribution required unless CC0",
                                  "alternatives": alts})


# ------------------------------------------------------------------ ElevenLabs Music
def elevenlabs(project, prompt, want):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set.")
    r = requests.post("https://api.elevenlabs.io/v1/music", headers={"xi-api-key": key, "Content-Type": "application/json"},
                      json={"prompt": prompt, "music_length_ms": int(min(300, want + 2) * 1000)}, timeout=300)
    if not r.ok:
        sys.exit(f"ElevenLabs music failed: {r.status_code} {r.text[:300]}")
    dest = os.path.join(project, "public", "music", "track.mp3")
    open(dest, "wb").write(r.content)
    return finish(project, dest, {"credit": "Generated with ElevenLabs Music", "source": "api.elevenlabs.io", "license": "per your ElevenLabs plan terms"})


# ------------------------------------------------------------------ synth
MOODS = {  # chord roots (semitones from A), chord quality, arp on/off, drum energy
    "bright": ([0, 7, 9, 5], ["maj", "maj", "min", "maj"], True, 1.0),
    "chill": ([5, 0, 9, 7], ["maj7", "maj7", "min7", "dom7"], True, 0.6),
    "dark": ([0, 8, 3, 10], ["min", "maj", "maj", "maj"], False, 0.9),
    "epic": ([0, 8, 3, 10], ["min", "maj", "maj", "maj"], True, 1.2),
}
QUAL = {"maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "dom7": [0, 4, 7, 10]}


def synth(project, mood, bpm, want, hits):
    rng = np.random.default_rng(11)
    beat = 60 / bpm
    bar = beat * 4
    n = int((want + 2.5) * SR)
    t = np.arange(n) / SR
    roots, quals, arp_on, energy = MOODS[mood]
    base = 110.0 * (2 ** (-2 / 12))  # G2-ish root so pads sit low
    out = np.zeros((n, 2), np.float32)

    def env(length, a=0.01, d=0.2):
        k = np.arange(length) / SR
        return np.minimum(1, k / max(a, 1e-4)) * np.exp(-k / max(d, 1e-4))

    def place(sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= n:
            return
        j = min(n, i + len(sig))
        s = sig[: j - i] * gain
        out[i:j, 0] += s * (1 - max(0, pan))
        out[i:j, 1] += s * (1 + min(0, pan))

    def saw(f, length):
        k = np.arange(length) / SR
        return 2 * ((k * f) % 1) - 1

    def lowpass(x, cutoff):
        a = np.exp(-2 * np.pi * cutoff / SR)
        y = np.empty_like(x)
        acc = 0.0
        for i in range(0, len(x), 64):  # blockwise one-pole (fast enough, smooth enough)
            seg = x[i:i + 64]
            for k in range(len(seg)):
                acc = (1 - a) * seg[k] + a * acc
                y[i + k] = acc
        return y

    last_hit = hits[-1] if hits else want - 3
    n_bars = int(np.ceil((want + 2) / bar))
    kicks = []
    for b in range(n_bars):
        t0 = b * bar
        ci = b % 4
        notes = [base * 2 ** ((roots[ci] + iv) / 12) for iv in QUAL[quals[ci]]]
        L = int(bar * SR)
        # pad: 3 detuned saws per note, filtered, opening up over the video
        pad = np.zeros(L, np.float32)
        for f in notes:
            for det in (-0.08, 0, 0.08):
                pad += saw(f * 2 * 2 ** (det / 12), L)
        cutoff = 500 + 2200 * min(1, t0 / max(1, want * 0.6))
        pad = lowpass(pad / (len(notes) * 3), cutoff)
        pad *= np.minimum(1, np.arange(L) / (SR * 0.25)) * np.minimum(1, (L - np.arange(L)) / (SR * 0.1))
        place(pad, t0, 0.32, pan=-0.2)
        place(pad, t0 + 0.012, 0.32, pan=0.2)
        in_break = last_hit - bar <= t0 < last_hit
        drums = b >= 1 and not in_break and t0 < want
        for q in range(4):
            bt = t0 + q * beat
            if drums:
                kicks.append(bt)
                kl = int(0.35 * SR)
                k = np.arange(kl) / SR
                freq = 45 + 90 * np.exp(-k * 30)
                kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-k * 9)
                place(kick, bt, 0.9 * energy)
                if q in (1, 3):
                    cl = int(0.2 * SR)
                    clap = rng.standard_normal(cl) * env(cl, 0.002, 0.06)
                    clap = clap - lowpass(clap, 900)
                    place(clap, bt, 0.28 * energy)
                hl = int(0.05 * SR)
                hat = rng.standard_normal(hl) * env(hl, 0.001, 0.015)
                hat = hat - lowpass(hat, 6000)
                place(hat, bt + beat / 2, 0.16 * energy, pan=0.3)
            # bass on 8ths
            if b >= 1 and t0 < want + 1:
                for e in (0, 0.5):
                    bl = int(beat * 0.45 * SR)
                    k = np.arange(bl) / SR
                    f = base * 2 ** (roots[ci] / 12)
                    bass = np.tanh(2 * np.sin(2 * np.pi * f * k)) * env(bl, 0.005, 0.18)
                    place(bass, bt + e * beat, 0.35)
            if arp_on and b >= 1 and t0 < want + 1:
                for s16 in range(4):
                    al = int(beat / 4 * 0.9 * SR)
                    f = notes[(q * 4 + s16) % len(notes)] * 4
                    k = np.arange(al) / SR
                    tri = 2 * np.abs(2 * ((k * f) % 1) - 1) - 1
                    place(tri * env(al, 0.002, 0.07), bt + s16 * beat / 4, 0.09, pan=0.35 if s16 % 2 else -0.35)
    # riser into the final hit, impacts on every scene cut
    rl = int(bar * SR)
    riser = rng.standard_normal(rl) * np.linspace(0, 1, rl) ** 2
    riser = riser - lowpass(riser, 1500)
    place(riser, max(0, last_hit - bar), 0.22)
    for h in hits:
        il = int(1.8 * SR)
        k = np.arange(il) / SR
        boom = np.sin(2 * np.pi * np.cumsum(60 * np.exp(-k * 3) + 30) / SR) * np.exp(-k * 3.5)
        noise = rng.standard_normal(il) * np.exp(-k * 7)
        place(boom * 0.7 + lowpass(noise, 3000) * 0.3, h, 0.55 if h == last_hit else 0.25)
    # sidechain pump from kicks
    duck = np.ones(n, np.float32)
    for kt in kicks:
        i = int(kt * SR)
        L = min(n - i, int(0.25 * SR))
        if L > 0:
            duck[i:i + L] = np.minimum(duck[i:i + L], 1 - 0.45 * np.exp(-np.arange(L) / (0.07 * SR)))
    out *= duck[:, None]
    fade = int(2.0 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    rms = np.sqrt((out ** 2).mean()) + 1e-9
    out = np.tanh(out * (0.16 / rms))  # ~-16 dBFS RMS with soft clipping
    dest = os.path.join(project, "public", "music", "track.wav")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with wave.open(dest, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    return finish(project, dest, {"credit": f"Original music generated in code ({mood}, {bpm} BPM)", "source": "scripts/music.py --synth",
                                  "license": "No third-party rights (generated)"}, known_bpm=bpm)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--file")
    g.add_argument("--search")
    g.add_argument("--elevenlabs")
    g.add_argument("--synth", action="store_true")
    ap.add_argument("--duration", type=float, help="seconds of music needed (default: storyboard length)")
    ap.add_argument("--bpm", default="85-135", help="range for --search (e.g. 90-130) or exact tempo for --synth")
    ap.add_argument("--mood", default="bright", choices=list(MOODS))
    a = ap.parse_args()
    os.makedirs(os.path.join(a.project, "public", "music"), exist_ok=True)
    want = a.duration or video_duration(a.project)

    if a.file:
        dest = os.path.join(a.project, "public", "music", "track" + os.path.splitext(a.file)[1].lower())
        shutil.copy(a.file, dest)
        finish(a.project, dest, {"credit": "Provided by the user", "source": a.file, "license": "user-provided (make sure you have the rights)"})
    elif a.search:
        lo, _, hi = a.bpm.partition("-")
        res = search(a.project, a.search, want, (float(lo), float(hi or lo)))
        if not res:
            print("No suitable track found; composing one instead (--synth).")
            synth(a.project, a.mood, 112, want, scene_cuts(a.project) + [want - 3])
    elif a.elevenlabs:
        elevenlabs(a.project, a.elevenlabs, want)
    else:
        bpm = float(a.bpm.split("-")[0]) if "-" not in a.bpm else 112.0
        cuts = scene_cuts(a.project)
        synth(a.project, a.mood, bpm, want, cuts)


if __name__ == "__main__":
    main()

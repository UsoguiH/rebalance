#!/usr/bin/env python3
"""Re-time the reel to a new voice-over.

    pip install faster-whisper
    python3 tools/retime.py audio/voice.mp3            # -> cues.voice.json + audio/voice_padded.wav
    node tools/render.mjs --cues cues.voice.json --audio audio/voice_padded.wav

Transcribes the file with word timestamps, matches the words to the script in
cues.json and writes a new cue file. Every caption, camera move and character
action is keyed to these cues, so the whole animation follows the new read.
"""
import argparse, difflib, json, re, subprocess, sys, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def load_pcm(path):
    tmp = ROOT / "out" / "_retime.wav"
    tmp.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", "16000", str(tmp)], check=True)
    import numpy as np
    w = wave.open(str(tmp))
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype("float32") / 32768, w.getnframes() / 16000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--lead", type=float, default=0.3, help="silence added before the voice (the opening shot needs ~0.3s)")
    ap.add_argument("--tail", type=float, default=1.1, help="seconds kept after the last word")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--out", default="cues.voice.json")
    a = ap.parse_args()

    from faster_whisper import WhisperModel
    pcm, dur = load_pcm(a.audio)
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(pcm, word_timestamps=True, beam_size=5)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    if not heard:
        sys.exit("no speech found")

    ref = json.load(open(ROOT / "cues.json"))
    script = ref["words"]
    A = [norm(w["word"]) for w in script]
    B = [norm(w[0]) for w in heard]
    sm = difflib.SequenceMatcher(a=A, b=B, autojunk=False)
    times = [None] * len(script)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, s, e = heard[blk.b + k]
            times[blk.a + k] = (s, e)
    missing = [script[i]["word"] for i, t in enumerate(times) if t is None]

    # fill gaps by interpolating between matched neighbours
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t:
            continue
        lo = max([k for k in known if k < i], default=None)
        hi = min([k for k in known if k > i], default=None)
        if lo is None:
            s = times[hi][0] - 0.3 * (hi - i)
        elif hi is None:
            s = times[lo][1] + 0.3 * (i - lo)
        else:
            f = (i - lo) / (hi - lo)
            s = times[lo][1] + f * (times[hi][0] - times[lo][1])
        times[i] = (s, s + 0.25)

    words = [dict(w, start=round(t[0] + a.lead, 3), end=round(t[1] + a.lead, 3)) for w, t in zip(script, times)]
    out = {"source": f"retimed from {a.audio}", "duration": round(words[-1]["end"] + a.tail, 2), "words": words}
    json.dump(out, open(ROOT / a.out, "w"), indent=1)

    padded = ROOT / "audio" / "voice_padded.wav"
    padded.parent.mkdir(exist_ok=True)
    ms = int(a.lead * 1000)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.audio, "-af", f"adelay={ms}:all=1,apad=pad_dur={a.tail + 1}", "-ac", "2", "-ar", "48000", str(padded)], check=True)

    print(f"wrote {a.out}: {len(words)} words, {out['duration']}s (voice {dur:.2f}s)")
    print(f"wrote {padded.relative_to(ROOT)}")
    if missing:
        print("not heard (interpolated):", " ".join(missing))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Places a voice take on the template's beats.

  python3 motion/tools/align.py --piece motion/acme
  python3 motion/tools/align.py --piece motion/acme --take ~/Downloads/ElevenLabs_take.mp3

Transcribes the take with word timestamps (faster-whisper), finds every phrase of
voice/script.json in it, trims each phrase at its pauses, and puts it on its slot
from template/beats.json. Writes:

  audio/mix.json   voice.segments: where each phrase sits in the take (from/to), its
                   slot and script line, and when it starts in the piece (at)
  timing.js        when each on-screen word is spoken, in piece seconds

A phrase that runs past its slot first starts a little earlier (up to 0.3 s, if the
phrase before it leaves room), then is sped up (up to 12%, pitch kept). Anything still
over is reported. --take copies a new take into audio/ first.
Needs ffmpeg, numpy and faster-whisper (pip install faster-whisper).
"""
import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 16000
HOP = 0.01  # energy frames, seconds
MAX_SHIFT = 0.3
MAX_TEMPO = 1.12


def norm(w):
    w = w.lower().replace("’", "'")
    return re.sub(r"[^a-z0-9']", "", w).strip("'")


def spoken(text):
    # drop Eleven v3 tags, keep the words
    return re.sub(r"\[[^\]]*\]", " ", text)


def tokens(text):
    out = []
    for raw in re.split(r"[\s—–]+|\.\.\.|-", spoken(text)):
        n = norm(raw)
        if n:
            out.append(n)
    return out


def decode(path):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def energy_db(audio):
    n = int(HOP * SR)
    frames = len(audio) // n
    x = audio[: frames * n].reshape(frames, n)
    return 10 * np.log10(np.mean(x * x, axis=1) + 1e-12)


def hiss_of(audio):
    # share of a stretch's energy above 4 kHz
    def hiss(t0, t1):
        x = audio[int(t0 * SR) : int(t1 * SR)]
        if len(x) < 64:
            return 1.0
        spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
        f = np.fft.rfftfreq(len(x), 1 / SR)
        return float(spec[f > 4000].sum() / (spec.sum() + 1e-12))

    return hiss


def vocabulary(plain):
    # Prompting with the whole script can make the model skip what it thinks it has
    # already heard, so it only gets the unusual words (names, products) to spell.
    common = set("a an and are at be but by can could do for from get got have in is it its just more no not of on once one or our out so that the their them then they this to up was we what when where which who will with you your".split())
    seen = []
    for w in re.findall(r"[A-Za-z][A-Za-z'’]+", plain):
        if (w[0].isupper() or len(w) > 7) and w.lower() not in common and w not in seen:
            seen.append(w)
    return ", ".join(seen[:30]) + "." if seen else None


def transcribe(audio, prompt, model_name):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(
        audio,
        language="en",
        word_timestamps=True,
        initial_prompt=prompt,
        beam_size=5,
        condition_on_previous_text=False,
    )
    words = []
    for seg in segments:
        for w in seg.words or []:
            for part in re.split(r"[\s\-]+", w.word):
                n = norm(part)
                if n:
                    words.append({"w": n, "start": float(w.start), "end": float(w.end), "p": float(w.probability)})
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--piece", required=True)
    ap.add_argument("--take", help="a new take to copy into audio/ first")
    ap.add_argument("--model", default="small", help="faster-whisper model (small, medium, ...)")
    ap.add_argument("--debug", action="store_true", help="print the transcript and each phrase's trim")
    a = ap.parse_args()

    piece = os.path.abspath(a.piece)
    mix_path = os.path.join(piece, "audio", "mix.json")
    with open(mix_path) as f:
        mix = json.load(f)
    with open(os.path.join(piece, "voice", "script.json")) as f:
        script = json.load(f)
    with open(os.path.join(HERE, "..", "template", "beats.json")) as f:
        beats = json.load(f)
    slots = {s["id"]: s for s in beats["slots"]}

    if a.take:
        ext = os.path.splitext(a.take)[1].lower() or ".mp3"
        name = "take" + ext
        shutil.copyfile(os.path.expanduser(a.take), os.path.join(piece, "audio", name))
        mix["voice"]["take"] = name
    take = os.path.join(piece, "audio", mix["voice"]["take"])
    if not os.path.exists(take):
        sys.exit(f"no take at {take}: pass --take <file>")

    phrases = [p for p in script["phrases"] if p["slot"] in slots]
    plain = " ".join(spoken(p["text"]).strip() for p in phrases)
    audio = decode(take)
    # the transcript is cached next to the take, keyed by the take and the model
    with open(take, "rb") as f:
        key = hashlib.sha1(f.read() + a.model.encode()).hexdigest()
    cache = os.path.splitext(take)[0] + ".words.json"
    heard = None
    if os.path.exists(cache):
        with open(cache) as f:
            c = json.load(f)
        if c.get("key") == key:
            heard = c["words"]
    if heard is None:
        print(f"transcribing {os.path.relpath(take)} ({len(audio) / SR:.1f} s) ...")
        heard = transcribe(audio, vocabulary(plain), a.model)
        with open(cache, "w") as f:
            json.dump({"key": key, "model": a.model, "words": heard}, f)
    if a.debug:
        print("heard:", " ".join(f"{h['w']}@{h['start']:.2f}-{h['end']:.2f}" for h in heard))

    # ---- match script words to heard words: exact runs first, then swapped words
    # (a misheard brand name) one for one, in proportion when the counts differ
    ref = []  # (phrase index, token)
    for pi, p in enumerate(phrases):
        for tok in tokens(p["text"]):
            ref.append((pi, tok))
    sm = difflib.SequenceMatcher(None, [t for _, t in ref], [h["w"] for h in heard], autojunk=False)
    hit = [None] * len(ref)
    fuzzy = [False] * len(ref)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                hit[i1 + k] = j1 + k
        elif op == "replace":
            for k in range(i2 - i1):
                hit[i1 + k] = j1 + min(j2 - j1 - 1, round(k * (j2 - j1) / (i2 - i1)))
                fuzzy[i1 + k] = True

    db = energy_db(audio)
    floor = float(np.percentile(db, 10))
    last = len(db) - 1
    fr = lambda t: min(last, max(0, int(round(t / HOP))))
    hiss = hiss_of(audio)

    # ---- each phrase's words in the take, as the transcript times them
    words = []
    for pi, p in enumerate(phrases):
        idx = [i for i, (q, _) in enumerate(ref) if q == pi and hit[i] is not None]
        if not idx:
            sys.exit(f'phrase "{p["slot"]}" ({spoken(p["text"]).strip()}) is not in the take')
        words.append((heard[hit[idx[0]]], heard[hit[idx[-1]]]))
    # Transcript word edges spill into the pauses (and a drawn-out word can be timed
    # late), so each phrase is trimmed on the take's own energy. A pause is a run of
    # at least 120 ms under the phrase's peak - 38 dB: longer than the closure of a
    # stop inside a word ("up-dates", "sprin-t"), shorter than the pauses the script's
    # punctuation leaves between phrases. A phrase ends where the first pause after
    # its last word begins, and starts where the last pause before its first word ends.
    PAUSE = 12

    def pauses(q, i0, i1):
        out = []
        i = i0
        while i < i1:
            if q[i]:
                j = i
                while j < len(q) and q[j]:
                    j += 1
                if j - i >= PAUSE:
                    out.append((i, j))
                i = j
            else:
                i += 1
        return out

    spans = []
    prev_end = 0.0
    for k, (first, lastw) in enumerate(words):
        f0, f1 = fr(first["start"]), fr(lastw["end"])
        quiet = max(floor + 6, float(np.percentile(db[f0 : max(f0 + 1, f1)], 95)) - 38)
        q = db < quiet
        # start: after the last pause before the first word's end
        lo = fr(max(prev_end + 0.02, first["start"] - 0.8))
        before = pauses(q, lo, fr(first["end"]))
        s = before[-1][1] if before else lo
        while s < fr(first["end"]) and q[s]:
            s += 1
        # end: where the first pause after the last word starts
        nxt = words[k + 1][0]["end"] if k + 1 < len(words) else len(audio) / SR
        e0 = fr(max(lastw["start"] + 0.05, lastw["end"] - 0.3, s * HOP + 0.1))
        after = pauses(q, e0, fr(min(nxt, lastw["end"] + 0.6)))
        e = after[0][0] if after else fr(lastw["end"])
        # a breath after the last word: a short dip, then a long soft sound up to the
        # pause. A stop's release after its closure is short, and a final s or sh has
        # nearly all its energy above 4 kHz (a breath about two thirds), so both stay in.
        peak = float(np.percentile(db[f0 : max(f0 + 1, f1)], 95))
        i = e0
        while i < e:
            if q[i]:
                j = i
                while j < e and q[j]:
                    j += 1
                if j - i >= 5 and j < e:
                    nxt_dip = j
                    while nxt_dip < e and not q[nxt_dip]:
                        nxt_dip += 1
                    if nxt_dip - j >= 15 and float(db[j:nxt_dip].max()) < peak - 10 and hiss(j * HOP, nxt_dip * HOP) < 0.85:
                        e = i
                        break
                i = j
            else:
                i += 1
        spans.append([round(s * HOP, 3), round(e * HOP + 0.02, 3)])
        prev_end = spans[-1][1]
        if a.debug:
            print(f"{phrases[k]['slot']:<10} heard {first['start']:.2f}-{lastw['end']:.2f}  quiet<{quiet:.0f}dB  trimmed {spans[-1][0]:.2f}-{spans[-1][1]:.2f}")

    # ---- place each phrase on its beat, fitting it into its slot
    segs = []
    report = []
    prev_end = 0.0
    for k, p in enumerate(phrases):
        sl = slots[p["slot"]]
        s, e = spans[k]
        dur = e - s
        at = sl["at"]
        tempo = 1.0
        note = ""
        # a few hundredths over is fine: each slot's max leaves a margin before the next beat
        if dur > sl["max"] + 0.06:
            shift = min(dur - sl["max"], MAX_SHIFT, max(0.0, at - (prev_end + 0.1)))
            at -= shift
            room = sl["max"] + shift
            if dur > room:
                tempo = min(MAX_TEMPO, dur / room)
            left = dur / tempo - room
            note = f"starts {shift:.2f}s early" if shift > 0.005 else ""
            if tempo > 1.0:
                note += (", " if note else "") + f"sped up {100 * (tempo - 1):.0f}%"
            if left > 0.06:
                note += (", " if note else "") + f"STILL {left:.2f}s OVER: shorten this phrase or re-generate it faster"
        prev_end = at + dur / tempo
        seg = {"line": sl["line"], "slot": p["slot"], "text": spoken(p["text"]).strip(), "from": round(s, 3), "to": round(e, 3), "at": round(at, 3)}
        if tempo > 1.0:
            seg["tempo"] = round(tempo, 3)
        segs.append(seg)
        report.append((p["slot"], s, e, dur, sl["max"], at, note))

    # ---- when each on-screen word is spoken, in piece time
    timing = {}
    for k, seg in enumerate(segs):
        words = []
        for i, (q, tok) in enumerate(ref):
            if q != k or hit[i] is None:
                continue
            t = seg["at"] + (heard[hit[i]]["start"] - seg["from"]) / seg.get("tempo", 1.0)
            words.append([tok, round(max(seg["at"], t), 3)])
        timing[seg["slot"]] = words

    mix["voice"]["segments"] = segs
    text = json.dumps(mix, indent=2, ensure_ascii=False)
    # one segment per line, as the hand-made mixes have it
    text = re.sub(r"\{\n\s+(\"line\".*?)\n\s+\}", lambda m: "{ " + re.sub(r",\n\s+", ", ", m.group(1)) + " }", text, flags=re.S)
    text = re.sub(r"\[\n\s+([-\d.]+),\n\s+([-\d.]+)\n\s+\]", r"[\1, \2]", text)
    text = re.sub(r"\{\n\s+\"track\": ([\d.]+),\n\s+\"at\": ([\d.]+)\n\s+\}", r'{ "track": \1, "at": \2 }', text)
    with open(mix_path, "w") as f:
        f.write(text + "\n")
    with open(os.path.join(piece, "timing.js"), "w") as f:
        f.write("// When each on-screen word is spoken, in piece seconds. Written by tools/align.py\n// from the voice take; empty until there is one.\n")
        f.write("M.TIMING = " + json.dumps(timing) + ";\n")

    print("\nslot         take from-to    len   max   at    ")
    for slot, s, e, dur, mx, at, note in report:
        flag = "  " + note if note else ""
        print(f"{slot:<11} {s:6.2f}-{e:6.2f}  {dur:4.2f}  {mx:4.2f}  {at:5.2f}{flag}")
    unheard = sorted({tok for i, (_, tok) in enumerate(ref) if hit[i] is None})
    swapped = sorted({f"{tok}->{heard[hit[i]]['w']}" for i, (_, tok) in enumerate(ref) if fuzzy[i] and hit[i] is not None and tok != heard[hit[i]]["w"]})
    extra = len(heard) - sum(1 for h in hit if h is not None)
    if swapped:
        print("\nheard differently (fine for names; otherwise check the take):", ", ".join(swapped))
    if unheard:
        print("not heard:", ", ".join(unheard))
    if extra > 2:
        print(f"{extra} heard words are not in the script (ad-libs or a repeated line?)")
    print(f"\nwrote {os.path.relpath(mix_path)} and {os.path.relpath(os.path.join(piece, 'timing.js'))}")


if __name__ == "__main__":
    main()

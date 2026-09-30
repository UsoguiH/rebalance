#!/usr/bin/env python3
"""Voice-over: turn each scene's `vo` text into speech, time it, and fit the storyboard to it.

For every scene in src/video.json that has "vo": writes public/vo/<id>.mp3, sets scene.voice,
scene.voiceDuration and scene.captions (phrase timings for subtitles), and stretches scene.duration
so the line finishes before the transition. Unchanged lines are cached (not re-generated).

Providers (auto = first available): elevenlabs (ELEVENLABS_API_KEY), openai (OPENAI_API_KEY), edge (free).

Usage:
  python tts.py --project DIR [--provider auto|elevenlabs|openai|edge] [--voice VOICE] [--rate +5%] [--only sceneId]
  python tts.py --list-voices [--lang ar]
"""
import argparse
import asyncio
import base64
import hashlib
import json
import os
import re
import ssl
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
from _common import probe, read_json, write_json  # noqa: E402

# Friendly presets -> provider voice ids. Pick with --voice <preset> or pass a raw provider voice id/name.
PRESETS = {
    "edge": {
        "en-male": "en-US-AndrewMultilingualNeural", "en-female": "en-US-AvaMultilingualNeural",
        "en-narrator": "en-US-BrianMultilingualNeural", "en-energetic": "en-US-EmmaMultilingualNeural",
        "en-british": "en-GB-RyanNeural",
        "ar-sa-male": "ar-SA-HamedNeural", "ar-sa-female": "ar-SA-ZariyahNeural",
        "ar-ae-male": "ar-AE-HamdanNeural", "ar-ae-female": "ar-AE-FatimaNeural",
        "ar-kw-male": "ar-KW-FahedNeural", "ar-kw-female": "ar-KW-NouraNeural",
        "ar-eg-male": "ar-EG-ShakirNeural", "ar-eg-female": "ar-EG-SalmaNeural",
    },
    "elevenlabs": {  # premade voices; any voice id from the user's library also works
        "en-male": "pNInz6obpgDQGcFmaJgB", "en-female": "EXAVITQu4vr4xnSDxMaL", "en-narrator": "JBFqnCBsd6RMkjVDRZzb",
        "en-energetic": "21m00Tcm4TlvDq8ikWAM", "en-british": "JBFqnCBsd6RMkjVDRZzb",
    },
    "openai": {"en-male": "ash", "en-female": "coral", "en-narrator": "onyx", "en-energetic": "nova", "en-british": "fable"},
}


def pick_provider(want):
    if want != "auto":
        return want
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return "edge"


def resolve_voice(provider, voice, rtl):
    if not voice:
        voice = "ar-sa-male" if rtl else "en-male"
    table = PRESETS.get(provider, {})
    if voice in table:
        return table[voice]
    if provider in ("elevenlabs", "openai") and voice.startswith("ar-"):
        return table.get("en-male")  # multilingual models speak Arabic with any voice
    return voice


# ------------------------------------------------------------------ providers
def edge_tts_say(text, voice, rate, path):
    import edge_tts
    import edge_tts.communicate as ec

    if os.environ.get("SSL_CERT_FILE"):  # corporate / sandbox proxies with their own CA
        ec._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])

    async def run():
        words = []
        comm = edge_tts.Communicate(text, voice, rate=rate or "+0%", boundary="WordBoundary")
        with open(path, "wb") as f:
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s = ch["offset"] / 1e7
                    words.append({"w": ch["text"], "s": s, "e": s + ch["duration"] / 1e7})
        return words

    return asyncio.run(run())


def elevenlabs_say(text, voice, rate, path, lang):
    key = os.environ["ELEVENLABS_API_KEY"]
    speed = 1.0
    if rate:
        m = re.match(r"([+-]\d+)%", rate)
        speed = max(0.7, min(1.2, 1 + int(m.group(1)) / 100)) if m else 1.0
    body = {"text": text, "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "speed": speed}}
    if lang:
        body["language_code"] = lang
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
                      headers={"xi-api-key": key}, json=body, timeout=180)
    if not r.ok and lang:  # some models reject language_code
        body.pop("language_code")
        r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
                          headers={"xi-api-key": key}, json=body, timeout=180)
    r.raise_for_status()
    d = r.json()
    open(path, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d.get("alignment") or d.get("normalized_alignment") or {}
    chars, st, en = al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", [])
    words, cur, s0 = [], "", None
    for c, s, e in zip(chars, st, en):
        if c.isspace():
            if cur:
                words.append({"w": cur, "s": s0, "e": prev_e})
            cur, s0 = "", None
            continue
        if s0 is None:
            s0 = s
        cur += c
        prev_e = e
    if cur:
        words.append({"w": cur, "s": s0, "e": prev_e})
    return words


def openai_say(text, voice, rate, path, tone):
    r = requests.post("https://api.openai.com/v1/audio/speech", headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                      json={"model": os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"), "voice": voice, "input": text,
                            "instructions": tone or "Confident, warm product-launch narrator. Clear, unhurried, smiling.",
                            "response_format": "mp3"}, timeout=180)
    r.raise_for_status()
    open(path, "wb").write(r.content)
    return None  # no timestamps: estimated below


def estimate_words(text, duration):
    toks = text.split()
    weights = [len(t) + 2 for t in toks]
    total = sum(weights) or 1
    t, out = 0.05, []
    span = max(0.1, duration - 0.15)
    for tok, w in zip(toks, weights):
        d = span * w / total
        out.append({"w": tok, "s": t, "e": t + d * 0.92})
        t += d
    return out


def restore_punctuation(words, text):
    """Word timings often drop punctuation; put back the original tokens so phrases break at sentence ends."""
    toks = text.split()
    strip = lambda s: re.sub(r"[^\w]", "", s).lower()  # noqa: E731
    j = 0
    for w in words:
        for k in range(j, min(j + 4, len(toks))):
            if strip(toks[k]) and (strip(toks[k]) == strip(w["w"]) or strip(toks[k]).startswith(strip(w["w"]))):
                w["w"] = toks[k]
                j = k + 1
                break
    return words


def phrases(words, max_words=6, max_chars=34):
    """Group word timings into short subtitle phrases, breaking at punctuation."""
    out, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        if len(cur) >= max_words or len(text) >= max_chars or re.search(r"[.,!?;:،؟—]$", w["w"]):
            out.append({"text": text, "start": round(cur[0]["s"], 3), "end": round(cur[-1]["e"], 3)})
            cur = []
    if cur:
        out.append({"text": " ".join(x["w"] for x in cur), "start": round(cur[0]["s"], 3), "end": round(cur[-1]["e"], 3)})
    merged = []  # never leave one word alone when it just continues the previous phrase
    for ph in out:
        if merged and " " not in ph["text"] and not re.search(r"[.!?؟]$", merged[-1]["text"]):
            merged[-1] = {"text": merged[-1]["text"] + " " + ph["text"], "start": merged[-1]["start"], "end": ph["end"]}
        else:
            merged.append(ph)
    return merged


def list_voices(lang):
    import edge_tts
    import edge_tts.communicate as ec

    if os.environ.get("SSL_CERT_FILE"):
        ec._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])
    import edge_tts.voices as ev

    if os.environ.get("SSL_CERT_FILE") and hasattr(ev, "_SSL_CTX"):
        ev._SSL_CTX = ec._SSL_CTX
    vs = asyncio.run(edge_tts.list_voices())
    for v in vs:
        if not lang or v["Locale"].lower().startswith(lang.lower()):
            print(f"{v['ShortName']:<36} {v['Gender']:<7} {', '.join(v.get('VoiceTag', {}).get('VoicePersonalities', []))}")
    print("\nPresets:", json.dumps(PRESETS, indent=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project")
    ap.add_argument("--provider", default="auto", choices=["auto", "elevenlabs", "openai", "edge"])
    ap.add_argument("--voice")
    ap.add_argument("--rate", help="speed, e.g. +8%% or -5%%")
    ap.add_argument("--lang", help="language code for ElevenLabs (e.g. ar) / filter for --list-voices")
    ap.add_argument("--tone", help="OpenAI only: how the narrator should sound")
    ap.add_argument("--only")
    ap.add_argument("--tail", type=float, default=0.35, help="seconds of air after each line")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()
    if a.list_voices:
        return list_voices(a.lang)
    if not a.project:
        sys.exit("--project is required")

    sp = os.path.join(a.project, "src", "video.json")
    spec = read_json(sp)
    rtl = spec.get("brand", {}).get("rtl", False)
    provider = pick_provider(a.provider)
    voice = resolve_voice(provider, a.voice, rtl)
    lang = a.lang or ("ar" if rtl else None)
    vo_dir = os.path.join(a.project, "public", "vo")
    os.makedirs(vo_dir, exist_ok=True)
    cache_p = os.path.join(vo_dir, "cache.json")
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    print(f"Voice: {provider} / {voice}")

    scenes = spec["scenes"]
    for i, sc in enumerate(scenes):
        text = (sc.get("vo") or "").strip()
        if not text or (a.only and sc["id"] != a.only):
            continue
        key = hashlib.sha1(f"{provider}|{voice}|{a.rate}|{a.tone}|{text}".encode()).hexdigest()[:16]
        path = os.path.join(vo_dir, f"{sc['id']}.mp3")
        if cache.get(sc["id"], {}).get("key") == key and os.path.exists(path):
            words = cache[sc["id"]]["words"]
        else:
            if provider == "edge":
                words = edge_tts_say(text, voice, a.rate, path)
            elif provider == "elevenlabs":
                words = elevenlabs_say(text, voice, a.rate, path, lang)
            else:
                words = openai_say(text, voice, a.rate, path, a.tone)
            dur = probe(path)["duration"] or 0
            if not words:
                words = estimate_words(text, dur)
            cache[sc["id"]] = {"key": key, "words": words}
        dur = probe(path)["duration"] or 0
        sc["voice"] = f"vo/{sc['id']}.mp3"
        sc["voiceDuration"] = round(dur, 3)
        sc["captions"] = phrases(restore_punctuation(words, text))
        delay = sc.get("voiceDelay", 0.3)
        trans = 0 if i == len(scenes) - 1 or (sc.get("transition") or {}).get("type") == "none" else (sc.get("transition") or {}).get("duration", 0.5)
        need = round(delay + dur + a.tail + trans, 2)
        if sc.get("duration", 0) < need:
            print(f"  {sc['id']:<14} {dur:5.2f}s voice -> scene {sc.get('duration')}s stretched to {need}s")
            sc["duration"] = need
        else:
            print(f"  {sc['id']:<14} {dur:5.2f}s voice fits in {sc['duration']}s")
    write_json(cache_p, cache)
    write_json(sp, spec)
    total = sum(s["duration"] for s in scenes)
    print(f"Updated {sp} (scenes now sum to {total:.1f}s before transition overlaps)")


if __name__ == "__main__":
    main()

/* Gemini image editing for the try-on.
   - generateContent first, the Interactions API as a fallback, walking down the model list
   - retries rate limits and server hiccups with backoff, gives up after a timeout
   - skips "thought" images and reports blocked or refused edits clearly
   - every result is normalised to the same 3:4 size so the turnable views line up */
(function () {
  const BASE = "https://generativelanguage.googleapis.com/v1beta";
  const MODELS = [
    ["gemini-nano-banana-2.1", "Nano Banana 2.1 (best)"],
    ["gemini-3.1-flash-image", "Nano Banana 2"],
    ["gemini-3-pro-image", "Nano Banana Pro"],
    ["gemini-3.1-flash-lite-image", "Nano Banana 2 Lite (fastest)"],
    ["gemini-2.5-flash-image", "Nano Banana (legacy)"],
  ];
  const OUT_W = 960, OUT_H = 1280; // every result, 3:4
  const IN_MAX = 1024; // longest side sent to Gemini
  const TIMEOUT = 120000;
  const COLOUR_STYLES = new Set(["salt-pepper", "red-full", "wizard"]);

  const settings = {
    get key() { return read("hs.key") || window.GEMINI_API_KEY || ""; },
    set key(v) { write("hs.key", v.trim()); write("hs.route", ""); },
    get model() { return read("hs.model") || MODELS[0][0]; },
    set model(v) { write("hs.model", v); write("hs.route", ""); },
    get views() { return read("hs.views") !== "0"; },
    set views(v) { write("hs.views", v ? "1" : "0"); },
  };
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  // code: NO_KEY | KEY | QUOTA | BLOCKED | NO_IMAGE | NETWORK | TIMEOUT | MODEL | SERVER
  class GeminiError extends Error {
    constructor(code, msg, status) { super(msg || code); this.code = code; this.status = status; }
  }

  const wait = (ms, signal) => new Promise((ok, no) => {
    const t = setTimeout(ok, ms);
    signal && signal.addEventListener("abort", () => { clearTimeout(t); no(new DOMException("Aborted", "AbortError")); }, { once: true });
  });

  /* ---------- images ---------- */
  function loadImage(src) {
    return new Promise((ok, no) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => no(new GeminiError("NO_IMAGE", "Could not read an image."));
      img.src = src;
    });
  }
  // Cover-crops to w x h (or just shrinks when h is omitted) and returns a JPEG data URL.
  async function jpeg(src, w, h, q = 0.9) {
    const img = await loadImage(src);
    const c = document.createElement("canvas");
    if (h) {
      c.width = w; c.height = h;
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      c.getContext("2d").drawImage(img, (w - dw) / 2, (h - dh) * 0.3, dw, dh);
    } else {
      const s = Math.min(1, w / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    }
    return c.toDataURL("image/jpeg", q);
  }
  const split = (url) => ({ mime: url.slice(5, url.indexOf(";")), data: url.slice(url.indexOf(",") + 1) });

  /* ---------- responses ---------- */
  function fromContent(json) {
    const block = json.promptFeedback && json.promptFeedback.blockReason;
    if (block) throw new GeminiError("BLOCKED", block);
    const cand = (json.candidates || [])[0] || {};
    const parts = (cand.content && cand.content.parts) || [];
    const images = parts.filter((p) => !p.thought && (p.inlineData || p.inline_data));
    const last = images[images.length - 1];
    if (last) {
      const b = last.inlineData || last.inline_data;
      return "data:" + (b.mimeType || b.mime_type || "image/png") + ";base64," + b.data;
    }
    const why = cand.finishReason || "";
    if (/SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/.test(why)) throw new GeminiError("BLOCKED", why);
    const said = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join(" ").trim();
    throw new GeminiError("NO_IMAGE", said || why || "No picture came back.");
  }
  function fromInteraction(json) {
    const blocks = [];
    for (const s of json.steps || json.outputs || []) {
      if (s.type && s.type !== "model_output") continue;
      for (const c of [].concat(s.content || s)) if (c && c.type === "image" && c.data) blocks.push(c);
    }
    if (json.output_image && json.output_image.data) blocks.push(json.output_image);
    const last = blocks[blocks.length - 1];
    if (last) return "data:" + (last.mime_type || last.mimeType || "image/png") + ";base64," + last.data;
    if (json.status && /block|safety/i.test(json.status)) throw new GeminiError("BLOCKED", json.status);
    throw new GeminiError("NO_IMAGE", json.output_text || "No picture came back.");
  }

  /* ---------- transport ---------- */
  async function post(url, body, signal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort("timeout"), TIMEOUT);
    const stop = () => ctrl.abort("user");
    signal && signal.addEventListener("abort", stop, { once: true });
    let res;
    try {
      res = await fetch(url, {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": settings.key },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (ctrl.signal.aborted) throw new GeminiError("TIMEOUT", "Gemini took too long.");
      throw new GeminiError("NETWORK", e.message);
    } finally {
      clearTimeout(timer);
      signal && signal.removeEventListener("abort", stop);
    }
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json;
    const err = json.error || {};
    const msg = err.message || res.statusText;
    const retry = (err.details || []).find((d) => d.retryDelay);
    const e = new GeminiError(
      res.status === 429 ? "QUOTA"
        : res.status === 401 || res.status === 403 || /api key/i.test(msg) ? "KEY"
        : res.status === 404 || /not found|not supported|unknown name|invalid json payload/i.test(msg) ? "MODEL"
        : res.status >= 500 ? "SERVER" : "BAD",
      msg, res.status);
    e.retryAfter = retry ? parseFloat(retry.retryDelay) * 1000 : 0;
    throw e;
  }

  const ROUTES = {
    content(model, parts, signal) {
      return post(`${BASE}/models/${model}:generateContent`, {
        contents: [{ role: "user", parts: parts.map((p) => typeof p === "string" ? { text: p } : { inline_data: { mime_type: p.mime, data: p.data } }) }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:4" } },
      }, signal).then(fromContent);
    },
    interactions(model, parts, signal) {
      return post(`${BASE}/interactions`, {
        model,
        input: parts.map((p) => typeof p === "string" ? { type: "text", text: p } : { type: "image", mime_type: p.mime, data: p.data }),
        response_format: { type: "image", aspect_ratio: "3:4", image_size: "1K", mime_type: "image/jpeg" },
      }, signal).then(fromInteraction);
    },
  };

  // One call with retries. Rate limits and server errors wait and try again;
  // a missing picture is retried once with a firmer instruction.
  async function call(model, route, parts, signal) {
    let nudged = false;
    for (let attempt = 0; ; attempt++) {
      try {
        return await ROUTES[route](model, parts, signal);
      } catch (e) {
        if (e.name === "AbortError") throw e;
        if (e.code === "NO_IMAGE" && !nudged) {
          nudged = true;
          parts = [...parts, "Reply with the edited photo only."];
          continue;
        }
        const transient = e.code === "SERVER" || e.code === "TIMEOUT" || e.code === "NETWORK" || (e.code === "QUOTA" && e.retryAfter > 0 && e.retryAfter <= 60000);
        if (!transient || attempt >= 2) throw e;
        await wait(e.retryAfter || 2000 * 2 ** attempt + Math.random() * 800, signal);
      }
    }
  }

  // Finds the route that works for this key once, then sticks to it.
  async function generate(parts, signal) {
    if (!settings.key) throw new GeminiError("NO_KEY");
    const saved = (read("hs.route") || "").split("|");
    const models = [settings.model, ...MODELS.map((m) => m[0]).filter((m) => m !== settings.model)];
    const tries = saved.length === 2 ? [saved] : [];
    for (const m of models) for (const r of ["content", "interactions"]) if (!(m === saved[0] && r === saved[1])) tries.push([m, r]);
    let last;
    for (const [model, route] of tries) {
      try {
        const img = await call(model, route, parts, signal);
        write("hs.route", model + "|" + route);
        return await jpeg(img, OUT_W, OUT_H, 0.92);
      } catch (e) {
        if (e.name === "AbortError") throw e;
        last = e;
        if (e.code !== "MODEL") throw e; // only an unavailable model is worth switching for
      }
    }
    throw last || new GeminiError("MODEL", "No image model is available for this key.");
  }

  /* ---------- prompts ---------- */
  const KEEP = "Keep the exact same person: same face shape, eyes, nose, lips, ears, skin tone, skin texture, age, expression, glasses and clothes. Do not beautify, slim or retouch the face.";
  const LOOK = "It must look like a real, sharp photo taken right after a visit to a good barber: a natural hairline, individual hair strands, realistic density and shine. No illustration, no text, no watermark.";
  const BACKDROP = "Plain, soft, light grey studio backdrop with gentle, even light.";

  function lookParts(photo, hair, beard) {
    const p = ["You are a master barber making a photo-realistic preview of a new look for a customer."];
    p.push("IMAGE 1, the customer:", photo);
    if (hair) p.push(`IMAGE ${2}, a real photo showing the haircut "${hair.name}" (style reference only):`, hair.ref);
    if (beard) p.push(`IMAGE ${hair ? 3 : 2}, a real photo showing the facial hair "${beard.name}" (style reference only):`, beard.ref);

    const t = ["Edit IMAGE 1."];
    if (hair) t.push(`Give the customer a ${hair.name}: ${hair.desc} Copy the cut's shape, length, texture and styling from the reference photo, adapted to the customer's own head shape and hair type.`);
    else t.push("Leave the hair on the head exactly as it is.");
    if (beard) t.push(`Give the customer this facial hair, ${beard.name}: ${beard.desc} Copy its shape, length and edges from the reference photo, adapted to the customer's jaw and face.`);
    else t.push("Leave the beard, moustache and stubble exactly as they are.");
    const keep = [];
    if (hair) keep.push("hair");
    if (beard && !COLOUR_STYLES.has(beard.id)) keep.push("facial hair");
    if (keep.length) t.push(`Keep the customer's natural ${keep.join(" and ")} colour.`);
    t.push("Never copy the reference person's face, skin, age, hair colour or clothes; the reference only shows the style.");
    t.push(KEEP);
    t.push("Keep the same head pose and camera angle as IMAGE 1, head and shoulders in frame, portrait 3:4. " + BACKDROP);
    t.push(LOOK);
    p.push(t.join("\n"));
    return p;
  }

  // Turnable views. Directions are given in image terms so they match the drag:
  // dragging right turns the nose toward the right edge of the picture.
  const VIEW_TEXT = {
    right: "turned 90 degrees so the nose points to the RIGHT edge of the picture: a clean side profile showing the right side of the head and the right ear",
    left: "turned 90 degrees so the nose points to the LEFT edge of the picture: a clean side profile showing the left side of the head and the left ear",
    back: "seen from directly behind: the back of the head and the neckline, showing how the hair is cut at the back and sides; the face is not visible",
  };
  function viewParts(view, result, photo, refs) {
    const p = [
      "IMAGE 1, a customer with their new haircut and facial hair:", result,
      "IMAGE 2, the same customer before the cut (for identity only; ignore their old hair):", photo,
    ];
    refs.forEach((r, i) => p.push(`IMAGE ${3 + i}, a real photo of the style (reference for the sides and back):`, r));
    p.push([
      `Make a realistic photo of the exact same person from IMAGE 1, with the exact same haircut and facial hair, ${VIEW_TEXT[view]}.`,
      "Same hair colour, length, fade height, parting and texture as IMAGE 1. Same clothes. Head and shoulders in frame, portrait 3:4, camera at head height.",
      BACKDROP + " Same lighting as IMAGE 1.",
      LOOK,
    ].join("\n"));
    return p;
  }

  /* ---------- public ---------- */
  const cache = new Map(); // same photo + same styles = same picture, no second charge
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ":" + s.length; }
  const prep = (url) => jpeg(url, IN_MAX).then(split);

  async function cached(key, make) {
    if (cache.has(key)) return cache.get(key);
    const p = make();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  }

  // Lists the image models this key can use, best first.
  async function listModels(key) {
    const res = await fetch(`${BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new GeminiError(res.status === 429 ? "QUOTA" : "KEY", (json.error && json.error.message) || res.statusText, res.status);
    const names = (json.models || []).map((m) => m.name.replace(/^models\//, "")).filter((n) => (/image|banana/.test(n) || MODELS.some((m) => m[0] === n)) && !/imagen|embedding|preview-tts/.test(n));
    const rank = (n) => { const i = MODELS.findIndex((m) => m[0] === n); return i < 0 ? 99 : i; };
    return names.sort((a, b) => rank(a) - rank(b));
  }

  window.Gemini = {
    MODELS, settings, GeminiError, listModels,
    clear() { cache.clear(); },
    tryOn({ photo, hair, beard, signal }) {
      const key = ["look", hash(photo), hair && hair.id, beard && beard.id].join("|");
      return cached(key, async () => {
        const [p, h, b] = await Promise.all([prep(photo), hair && prep(hair.ref), beard && prep(beard.ref)]);
        return generate(lookParts(p, hair && { ...hair, ref: h }, beard && { ...beard, ref: b }), signal);
      });
    },
    view({ result, photo, view, refs = [], signal }) {
      const key = ["view", view, hash(result)].join("|");
      return cached(key, async () => {
        const [r, p, ...x] = await Promise.all([prep(result), prep(photo), ...refs.map(prep)]);
        return generate(viewParts(view, r, p, x), signal);
      });
    },
  };
})();

/* Talking to Gemini: image edits and structured JSON answers.
   - image: generateContent first, the Interactions API as a fallback, walking down the model list
   - json: a fast text model with a response schema, for the plan and check steps
   - retries rate limits and server hiccups with backoff, gives up after a timeout
   - skips "thought" parts and reports blocked or refused requests clearly
   Prompts live in prompts.js, the try-on steps in pipeline.js. */
(function () {
  const BASE = "https://generativelanguage.googleapis.com/v1beta";
  const MODELS = [
    ["gemini-nano-banana-2.1", "Nano Banana 2.1 (best)"],
    ["gemini-3.1-flash-image", "Nano Banana 2"],
    ["gemini-3-pro-image", "Nano Banana Pro"],
    ["gemini-3.1-flash-lite-image", "Nano Banana 2 Lite (fastest)"],
    ["gemini-2.5-flash-image", "Nano Banana (legacy)"],
  ];
  const TEXT_MODELS = ["gemini-flash-latest", "gemini-3-flash", "gemini-2.5-flash"];
  const OUT_W = 960, OUT_H = 1280; // every picture, 3:4
  const IN_MAX = 1024; // longest side sent to Gemini
  const TIMEOUT = 120000;

  const settings = {
    get key() { return read("hs.key") || window.GEMINI_API_KEY || ""; },
    set key(v) { write("hs.key", v.trim()); write("hs.route", ""); write("hs.text", ""); noTextModel = false; },
    get model() { return read("hs.model") || MODELS[0][0]; },
    set model(v) { write("hs.model", v); write("hs.route", ""); },
    // Side and back views cost three more pictures, so by default they are made only on request.
    get views() { return read("hs.views2") === "1"; },
    set views(v) { write("hs.views2", v ? "1" : "0"); },
    get smart() { return read("hs.smart") !== "0"; }, // plan + check steps
    set smart(v) { write("hs.smart", v ? "1" : "0"); },
  };
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  // code: NO_KEY | KEY | QUOTA | BLOCKED | NO_IMAGE | NETWORK | TIMEOUT | MODEL | SERVER | BAD | PHOTO
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
  // Prompt parts are text or image data URLs; images are shrunk and turned into {mime, data}.
  const isImage = (p) => /^data:image\//.test(p);
  const prepAll = (parts) => Promise.all(parts.map((p) => isImage(p) ? jpeg(p, IN_MAX).then(split) : p));

  /* ---------- responses ---------- */
  function contentParts(json) {
    const block = json.promptFeedback && json.promptFeedback.blockReason;
    if (block) throw new GeminiError("BLOCKED", block);
    const cand = (json.candidates || [])[0] || {};
    const parts = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought);
    return { parts, why: cand.finishReason || "" };
  }
  function imageFromContent(json) {
    const { parts, why } = contentParts(json);
    const images = parts.filter((p) => p.inlineData || p.inline_data);
    const last = images[images.length - 1];
    if (last) {
      const b = last.inlineData || last.inline_data;
      return "data:" + (b.mimeType || b.mime_type || "image/png") + ";base64," + b.data;
    }
    if (/SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/.test(why)) throw new GeminiError("BLOCKED", why);
    const said = parts.filter((p) => p.text).map((p) => p.text).join(" ").trim();
    throw new GeminiError("NO_IMAGE", said || why || "No picture came back.");
  }
  function imageFromInteraction(json) {
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
  function jsonFromContent(json) {
    const { parts, why } = contentParts(json);
    if (/SAFETY|PROHIBITED|BLOCKLIST|SPII/.test(why)) throw new GeminiError("BLOCKED", why);
    const text = parts.filter((p) => p.text).map((p) => p.text).join("").trim()
      .replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
    try { return JSON.parse(text); } catch (e) { throw new GeminiError("NO_IMAGE", "The answer was not valid JSON."); }
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

  const asContent = (parts) => [{ role: "user", parts: parts.map((p) => typeof p === "string" ? { text: p } : { inline_data: { mime_type: p.mime, data: p.data } }) }];
  const IMAGE_ROUTES = {
    content(model, parts, signal) {
      return post(`${BASE}/models/${model}:generateContent`, {
        contents: asContent(parts),
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:4" } },
      }, signal).then(imageFromContent);
    },
    interactions(model, parts, signal) {
      return post(`${BASE}/interactions`, {
        model,
        input: parts.map((p) => typeof p === "string" ? { type: "text", text: p } : { type: "image", mime_type: p.mime, data: p.data }),
        response_format: { type: "image", aspect_ratio: "3:4", image_size: "1K", mime_type: "image/jpeg" },
      }, signal).then(imageFromInteraction);
    },
  };

  // Retries rate limits and server errors; a missing picture is retried once with a firmer instruction.
  async function withRetry(run, parts, signal, nudge) {
    let nudged = false;
    for (let attempt = 0; ; attempt++) {
      try {
        return await run(parts);
      } catch (e) {
        if (e.name === "AbortError") throw e;
        if (e.code === "NO_IMAGE" && nudge && !nudged) {
          nudged = true;
          parts = [...parts, nudge];
          continue;
        }
        const transient = e.code === "SERVER" || e.code === "TIMEOUT" || e.code === "NETWORK" || (e.code === "QUOTA" && e.retryAfter > 0 && e.retryAfter <= 60000);
        if (!transient || attempt >= 2) throw e;
        await wait(e.retryAfter || 2000 * 2 ** attempt + Math.random() * 800, signal);
      }
    }
  }

  // Walks the candidates until one answers; only an unavailable model is worth switching for.
  async function walk(store, candidates, attempt) {
    if (!settings.key) throw new GeminiError("NO_KEY");
    const saved = read(store);
    const list = saved ? [saved, ...candidates.filter((c) => c !== saved)] : candidates;
    let last;
    for (const c of list) {
      try {
        const out = await attempt(c);
        write(store, c);
        return out;
      } catch (e) {
        if (e.name === "AbortError" || e.code !== "MODEL") throw e;
        last = e;
      }
    }
    throw last || new GeminiError("MODEL", "No model is available for this key.");
  }

  // parts: strings and data URLs, in order. Returns a 960x1280 JPEG data URL.
  async function image(parts, signal) {
    const prepped = await prepAll(parts);
    const models = [settings.model, ...MODELS.map((m) => m[0]).filter((m) => m !== settings.model)];
    const routes = [];
    for (const m of models) for (const r of ["content", "interactions"]) routes.push(m + "|" + r);
    const img = await walk("hs.route", routes, (mr) => {
      const [model, route] = mr.split("|");
      return withRetry((p) => IMAGE_ROUTES[route](model, p, signal), prepped, signal, "Reply with the edited photo only.");
    });
    count("images");
    return jpeg(img, OUT_W, OUT_H, 0.92);
  }

  // A structured answer from a fast text model that can see images.
  let noTextModel = false; // found out this session that the key has none: stop asking
  async function json(parts, schema, signal) {
    if (noTextModel) throw new GeminiError("MODEL", "No text model for this key.");
    const prepped = await prepAll(parts);
    try {
      const out = await walk("hs.text", TEXT_MODELS, (model) => withRetry((p) => post(`${BASE}/models/${model}:generateContent`, {
        contents: asContent(p),
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
      }, signal).then(jsonFromContent), prepped, signal));
      count("checks");
      return out;
    } catch (e) {
      if (e.code === "MODEL") noTextModel = true;
      throw e;
    }
  }

  // Lists the image models this key can use, best first, and remembers a fast text model.
  async function listModels(key) {
    const res = await fetch(`${BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new GeminiError(res.status === 429 ? "QUOTA" : "KEY", (body.error && body.error.message) || res.statusText, res.status);
    const all = (body.models || []).map((m) => m.name.replace(/^models\//, ""));
    const images = all.filter((n) => (/image|banana/.test(n) || MODELS.some((m) => m[0] === n)) && !/imagen|embedding|tts/.test(n));
    const rank = (n) => { const i = MODELS.findIndex((m) => m[0] === n); return i < 0 ? 99 : i; };
    const text = TEXT_MODELS.find((t) => all.includes(t)) || all.find((n) => /flash/.test(n) && !/image|tts|live|audio|embedding|lite/.test(n));
    if (text) write("hs.text", text);
    return images.sort((a, b) => rank(a) - rank(b));
  }

  // How much this device has asked Gemini for, so staff can keep an eye on the budget.
  function count(what) { write("hs.used." + what, String((parseInt(read("hs.used." + what), 10) || 0) + 1)); }
  const usage = () => ({ images: parseInt(read("hs.used.images"), 10) || 0, checks: parseInt(read("hs.used.checks"), 10) || 0 });

  window.Gemini = { MODELS, settings, GeminiError, image, json, listModels, jpeg, usage };
})();

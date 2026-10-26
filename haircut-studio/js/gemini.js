/* Gemini image editing. Tries generateContent first, then the Interactions API,
   and walks down the model list until one answers. */
(function () {
  const BASE = "https://generativelanguage.googleapis.com/v1beta";
  const MODELS = [
    ["gemini-nano-banana-2.1", "Nano Banana 2.1 (best)"],
    ["gemini-3.1-flash-image", "Nano Banana 2"],
    ["gemini-3-pro-image", "Nano Banana Pro"],
    ["gemini-3.1-flash-lite-image", "Nano Banana 2 Lite (fastest)"],
    ["gemini-2.5-flash-image", "Nano Banana (legacy)"],
  ];
  const COLOUR_STYLES = new Set(["salt-pepper", "red-full", "wizard"]);

  const settings = {
    get key() { return read("hs.key") || window.GEMINI_API_KEY || ""; },
    set key(v) { write("hs.key", v.trim()); },
    get model() { return read("hs.model") || MODELS[0][0]; },
    set model(v) { write("hs.model", v); write("hs.route", ""); },
    get views() { return read("hs.views") !== "0"; },
    set views(v) { write("hs.views", v ? "1" : "0"); },
  };
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  class GeminiError extends Error {
    constructor(msg, status) { super(msg); this.status = status; }
  }

  function b64(dataUrl) {
    const i = dataUrl.indexOf(",");
    return { mime: dataUrl.slice(5, dataUrl.indexOf(";")), data: dataUrl.slice(i + 1) };
  }

  // Finds the first base64 image anywhere in a response, whatever the API shape.
  function findImage(node) {
    if (!node || typeof node !== "object") return null;
    const inline = node.inline_data || node.inlineData;
    if (inline && inline.data) return "data:" + (inline.mime_type || inline.mimeType || "image/png") + ";base64," + inline.data;
    const mime = node.mime_type || node.mimeType || "";
    if (typeof node.data === "string" && node.data.length > 200 && (node.type === "image" || mime.startsWith("image/")))
      return "data:" + (mime || "image/png") + ";base64," + node.data;
    for (const v of Array.isArray(node) ? node : Object.values(node)) {
      const hit = findImage(v);
      if (hit) return hit;
    }
    return null;
  }
  function findText(node, out = []) {
    if (!node || typeof node !== "object") return out;
    if (typeof node.text === "string") out.push(node.text);
    for (const v of Array.isArray(node) ? node : Object.values(node)) findText(v, out);
    return out;
  }

  async function post(url, body, signal) {
    const res = await fetch(url, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": settings.key },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new GeminiError((json.error && json.error.message) || res.statusText, res.status);
    return json;
  }

  const routes = {
    content(model, text, images, signal) {
      return post(`${BASE}/models/${model}:generateContent`, {
        contents: [{ role: "user", parts: [{ text }, ...images.map((u) => { const x = b64(u); return { inline_data: { mime_type: x.mime, data: x.data } }; })] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: "3:4" } },
      }, signal);
    },
    interactions(model, text, images, signal) {
      return post(`${BASE}/interactions`, {
        model,
        input: [{ type: "text", text }, ...images.map((u) => { const x = b64(u); return { type: "image", mime_type: x.mime, data: x.data }; })],
        response_format: { type: "image", aspect_ratio: "3:4", image_size: "1K", mime_type: "image/jpeg" },
      }, signal);
    },
  };

  async function generate(text, images, signal) {
    if (!settings.key) throw new GeminiError("NO_KEY", 0);
    const saved = (read("hs.route") || "").split("|");
    const models = [settings.model, ...MODELS.map((m) => m[0]).filter((m) => m !== settings.model)];
    const tries = [];
    if (saved.length === 2) tries.push(saved);
    for (const m of models) for (const r of ["content", "interactions"]) tries.push([m, r]);

    let last;
    for (const [model, route] of tries) {
      try {
        const json = await routes[route](model, text, images, signal);
        const img = findImage(json);
        if (!img) {
          const said = findText(json).join(" ").trim();
          throw new GeminiError(said || "The model did not return a picture.", 422);
        }
        write("hs.route", model + "|" + route);
        return img;
      } catch (e) {
        if (e.name === "AbortError") throw e;
        last = e;
        // Wrong key, quota or a refusal will not get better on another model.
        if (e.status === 401 || e.status === 403 || e.status === 429 || e.status === 422) throw e;
        if (e.status === 400 && /api key/i.test(e.message)) throw e;
      }
    }
    throw last || new GeminiError("No model answered.", 0);
  }

  function lookPrompt(hair, beard) {
    const parts = [];
    let n = 2;
    const refs = [];
    if (hair) refs.push(`Image ${n++} is a real photo showing the haircut "${hair.name}".`);
    if (beard) refs.push(`Image ${n++} is a real photo showing the facial hair style "${beard.name}".`);
    parts.push("You are a master barber making a photo-realistic preview of a new look for a customer.");
    parts.push("Image 1 is the customer. " + refs.join(" "));
    if (hair) parts.push(`Give the customer this haircut: ${hair.name}. ${hair.desc}`);
    else parts.push("Do not change the hair on the head at all.");
    if (beard) parts.push(`Give the customer this facial hair: ${beard.name}. ${beard.desc}`);
    else parts.push("Do not change the beard, mustache or stubble at all.");
    parts.push("Use the reference photos only for the shape, length and texture of the style. Never copy the reference person's face, skin, age or clothes.");
    const keepColour = [];
    if (hair) keepColour.push("hair");
    if (beard && !COLOUR_STYLES.has(beard.id)) keepColour.push("facial hair");
    if (keepColour.length) parts.push(`Keep the customer's natural ${keepColour.join(" and ")} colour.`);
    parts.push("Keep exactly the same person: same face, identity, skin, age, expression, eyes, glasses, ears, clothes, pose and camera angle.");
    parts.push("Replace the background with a plain, soft, light grey studio backdrop with gentle even light.");
    parts.push("It must look like a real photo taken right after a visit to a good barber: natural hairline, real hair strands, sharp focus, no illustration, no text.");
    return parts.join("\n");
  }

  const VIEW_TEXT = {
    left: "turned 90 degrees so we see the left side of their head in profile (their left ear faces the camera)",
    right: "turned 90 degrees so we see the right side of their head in profile (their right ear faces the camera)",
    back: "seen from directly behind, showing the back of the head, the neckline and how the hair is cut at the back",
  };
  function viewPrompt(view) {
    return [
      "Image 1 shows a customer with their new haircut and facial hair. Image 2 is the original photo of the same person.",
      `Make a realistic photo of this exact same person with the exact same haircut and facial hair, ${VIEW_TEXT[view]}.`,
      "Same hair colour, same hair length, same fade, same clothes and the same plain light grey studio backdrop and lighting as image 1.",
      "Head and shoulders framing, real photo, sharp focus, no illustration, no text.",
    ].join("\n");
  }

  window.Gemini = {
    MODELS, settings, GeminiError,
    tryOn({ photo, hair, beard, signal }) {
      const imgs = [photo];
      if (hair) imgs.push(hair.ref);
      if (beard) imgs.push(beard.ref);
      return generate(lookPrompt(hair, beard), imgs, signal);
    },
    view({ result, photo, view, signal }) {
      return generate(viewPrompt(view), [result, photo], signal);
    },
  };
})();

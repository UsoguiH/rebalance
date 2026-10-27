/* Every prompt the app sends, in one place. Used by the browser app and by tools/eval.mjs.

   The try-on runs in three steps:
   1. PLAN   a fast text model looks at the customer and the style photo and writes a
             barber's brief for this exact person (or rejects an unusable photo)
   2. DRAW   the image model edits the photo, guided by the brief
   3. CHECK  a fast text model compares before / after / reference and scores the result;
             a weak result is redrawn once with its notes
   Images are passed as labelled parts ("IMAGE 1, the customer: <image>") so every model
   knows which picture is which. */
(function (root) {
  const COLOUR_STYLES = new Set(["salt-pepper", "red-full", "wizard"]);

  /* ---------- 1. plan ---------- */
  // Sent when the face lock found the head moved: the edit must stay in place.
  const MOVED_FIX = "The head moved, turned or changed size compared with IMAGE 1. Keep the head, face and shoulders exactly where they are in IMAGE 1, same size and angle; only change what you were asked to change.";

  const PLAN_SCHEMA = {
    type: "OBJECT",
    properties: {
      photo_ok: { type: "BOOLEAN", description: "false only if this photo cannot give a good preview" },
      photo_problem: { type: "STRING", enum: ["none", "no_face", "several_faces", "face_too_small", "face_turned_away", "too_dark", "too_blurry", "face_covered"] },
      greeting: { type: "STRING", description: "One warm sentence to the customer about their hair or face, max 14 words, no flattery about looks, no mention of age or weight" },
      hair_colour: { type: "STRING" },
      hair_texture: { type: "STRING", description: "straight / wavy / curly / coily / thinning / bald, plus density" },
      hairline: { type: "STRING" },
      current_hair: { type: "STRING" },
      current_facial_hair: { type: "STRING" },
      face_shape: { type: "STRING" },
      keep: { type: "STRING", description: "Concrete things in this photo that must not change: glasses, earrings, piercings, tattoos, clothes, scars, freckles" },
      hair_brief: { type: "STRING", description: "Exact instructions for the haircut on this person, or empty if the hair stays" },
      beard_brief: { type: "STRING", description: "Exact instructions for the facial hair on this person, or empty if it stays" },
      fade_and_back: { type: "STRING", description: "How the sides, neckline and back of the head look after the cut, for the side and back views" },
    },
    required: ["photo_ok", "photo_problem", "greeting", "hair_colour", "hair_texture", "keep", "hair_brief", "beard_brief", "fade_and_back"],
  };

  function planParts({ photo, hair, beard }) {
    const p = ["IMAGE 1, the customer:", photo];
    if (hair) p.push(`IMAGE ${2}, a real photo of the haircut "${hair.name}":`, hair.ref);
    if (beard) p.push(`IMAGE ${hair ? 3 : 2}, a real photo of the facial hair style "${beard.name}":`, beard.ref);
    const ask = [];
    if (hair) ask.push(`the haircut "${hair.name}" (${hair.desc})`);
    if (beard) ask.push(`the facial hair "${beard.name}" (${beard.desc})`);
    p.push(`You are a senior barber preparing a photo-realistic preview. The customer in IMAGE 1 wants ${ask.join(" and ")}.

Look carefully at IMAGE 1 and the reference photo(s), then fill in the JSON.

Photo check: set photo_ok to false only if the preview cannot work: no face, more than one clear face, the face is tiny, turned more than about 45 degrees away, very dark, very blurry, or hidden. Glasses, a hat or a beard are fine.

Write hair_brief and beard_brief as precise instructions for an image-editing model that will change IMAGE 1. Use barber language with numbers: clipper guard or mm on the sides, cm on top, where the fade starts and ends, parting side (from the customer's own point of view), fringe length, how the top is styled, beard length in mm, cheek line and neckline height, moustache shape.
Adapt the style to THIS person: their hair texture and density, hairline, head shape and face shape. If their hair is shorter than the style needs, describe the style as if grown, with the same density they have now. If they are bald or thinning, say how to make the style honest on them (do not invent a full head of hair beyond what is natural for them). Always keep their natural hair colour${beard && COLOUR_STYLES.has(beard.id) ? `, but give the beard the colour "${beard.name}" asks for` : " and beard colour"}.
${hair ? "" : "The hair on the head must not change: leave hair_brief empty."}
${beard ? "" : "The facial hair must not change: leave beard_brief empty."}
In keep, list what must stay exactly as it is in this photo.
In fade_and_back, describe how the sides and the back of the head look with the new cut.
greeting is shown to the customer while they wait: friendly, plain words, about their hair.`);
    return p;
  }

  /* ---------- 2. draw ---------- */
  const KEEP = "Keep the exact same person: same face shape, eyes, eyebrows, nose, lips, ears, skin tone, skin texture, freckles, age, expression, glasses, jewellery and clothes. Do not beautify, slim, smooth or retouch the face.";
  const SAME_PHOTO = "This is a local edit of IMAGE 1, not a new photo: keep the same background, lighting, colours, framing and crop, and the head in exactly the same position, size and angle. Change nothing outside the hair you were asked to change.";
  const LOOK = "The result must look like a real, sharp photo taken right after a visit to a good barber: a natural hairline, individual hair strands, realistic density and shine, hair that sits naturally on the head. No illustration, no text, no watermark.";
  const BACKDROP = "The same background as IMAGE 1 where it would be visible, with the same light.";

  function drawParts({ photo, hair, beard, plan, fix }) {
    const p = ["You are a master barber and photo retoucher making a photo-realistic preview of a new look for a customer.", "IMAGE 1, the customer:", photo];
    if (hair) p.push(`IMAGE 2, a real photo showing the haircut "${hair.name}" (style reference only):`, hair.ref);
    if (beard) p.push(`IMAGE ${hair ? 3 : 2}, a real photo showing the facial hair "${beard.name}" (style reference only):`, beard.ref);

    const t = [`Edit IMAGE 1. Change ONLY ${hair && beard ? "the hair on the head and the facial hair" : hair ? "the hair on the head" : "the facial hair"}.`];
    if (hair) {
      t.push(`HAIR: give the customer a ${hair.name}. ${hair.desc}`);
      if (plan && plan.hair_brief) t.push(`Barber's notes for this customer: ${plan.hair_brief}`);
      t.push("Copy the cut's shape, length, texture and styling from the reference photo, adapted to the customer's own head shape and hair type.");
    } else t.push("HAIR: leave the hair on the head exactly as it is.");
    if (beard) {
      t.push(`FACIAL HAIR: give the customer ${beard.name}. ${beard.desc}`);
      if (plan && plan.beard_brief) t.push(`Barber's notes for this customer: ${plan.beard_brief}`);
      t.push("Copy its shape, length and edges from the reference photo, adapted to the customer's jaw and face.");
    } else t.push("FACIAL HAIR: leave the beard, moustache and stubble exactly as they are.");

    const colour = [];
    if (hair) colour.push("hair");
    if (beard && !COLOUR_STYLES.has(beard.id)) colour.push("facial hair");
    if (colour.length) t.push(`COLOUR: keep the customer's natural ${colour.join(" and ")} colour${plan && plan.hair_colour ? ` (${plan.hair_colour})` : ""}.`);
    t.push("Never copy the reference person's face, skin, age, hair colour or clothes; the reference only shows the style.");
    t.push("KEEP: " + KEEP + (plan && plan.keep ? ` In this photo that includes: ${plan.keep}.` : ""));
    t.push("EVERYTHING ELSE: " + SAME_PHOTO);
    t.push(LOOK);
    if (fix) t.push(`A previous attempt had these problems, fix them: ${fix}`);
    p.push(t.join("\n"));
    return p;
  }

  /* ---------- 3. check ---------- */
  const CHECK_SCHEMA = {
    type: "OBJECT",
    properties: {
      same_person: { type: "INTEGER", description: "0-10: is IMAGE 2 clearly the same person as IMAGE 1 (face, skin, age, expression)?" },
      style_match: { type: "INTEGER", description: "0-10: does the new hair / facial hair in IMAGE 2 match the requested style?" },
      realism: { type: "INTEGER", description: "0-10: does IMAGE 2 look like a real photo (hairline, strands, no smudges, no extra limbs or faces)?" },
      kept_details: { type: "INTEGER", description: "0-10: are glasses, jewellery, clothes and the parts that should not change kept?" },
      problems: { type: "STRING", description: "The most important visible problems, short" },
      fix: { type: "STRING", description: "Concrete instructions to fix the problems in a new attempt, or empty" },
    },
    required: ["same_person", "style_match", "realism", "kept_details", "problems", "fix"],
  };

  function checkParts({ photo, result, hair, beard }) {
    const p = ["IMAGE 1, the customer before:", photo, "IMAGE 2, the AI preview of the new look:", result];
    const refs = [hair, beard].filter(Boolean);
    refs.forEach((s, i) => p.push(`IMAGE ${3 + i}, a real photo of the requested ${s.kind === "hair" ? "haircut" : "facial hair"} "${s.name}":`, s.ref));
    p.push(`You are a strict quality inspector for a barbershop's AI preview app. The customer asked for ${refs.map((s) => `${s.name} (${s.desc})`).join(" and ")}.
${hair ? "" : "The hair on the head was supposed to stay unchanged. "}${beard ? "" : "The facial hair was supposed to stay unchanged. "}Everything else (face, skin, clothes, background, lighting, framing) was supposed to stay exactly as in IMAGE 1.
Score IMAGE 2 from the point of view of the customer and their barber, not a pixel inspector. Use this scale for every score:
10 = perfect, looks like a real photo of the same person with the requested style
8-9 = good; only tiny flaws you have to search for
6-7 = noticeable flaws that a customer would see at a glance
3-5 = clearly wrong: looks like a different person, the wrong style, or obviously fake
0-2 = unusable
same_person: compare the face itself (eyes, nose, mouth, skin, age, expression). Score low if it looks like a different person, younger, smoothed or beautified.
style_match: does the new hair or facial hair look like the requested style, adapted to this person?
realism: low only for painted or helmet-like hair, a fake hairline, a seam or halo, or distortions.
kept_details: low if anything outside the hair and facial hair changed.
Only write problems and fix for flaws that score below 8; otherwise leave them empty.`);
    return p;
  }
  // Higher is better; who the person is matters most.
  const checkScore = (c) => c.same_person * 3 + c.style_match * 2 + c.realism * 2 + c.kept_details;
  // A redraw costs time and money; only results a customer would notice are redrawn.
  const checkPassed = (c) => c.same_person >= 7 && c.style_match >= 6 && c.realism >= 6 && c.kept_details >= 6;

  /* ---------- side and back views ---------- */
  // Directions in image terms so they match the drag: dragging right shows the nose pointing right.
  const VIEW_TEXT = {
    right: "turned 90 degrees so the nose points to the RIGHT edge of the picture: a clean side profile showing the right side of the head and the right ear",
    left: "turned 90 degrees so the nose points to the LEFT edge of the picture: a clean side profile showing the left side of the head and the left ear",
    back: "seen from directly behind: the back of the head and the neckline, showing how the hair is cut at the back and sides; the face is not visible",
  };
  function viewParts({ view, result, photo, refs = [], plan }) {
    const p = [
      "IMAGE 1, a customer with their new haircut and facial hair:", result,
      "IMAGE 2, the same customer before the cut (for identity only; ignore their old hair):", photo,
    ];
    refs.forEach((r, i) => p.push(`IMAGE ${3 + i}, a real photo of the style (reference for the sides and back):`, r));
    p.push([
      `Make a realistic photo of the exact same person from IMAGE 1, with the exact same haircut and facial hair, ${VIEW_TEXT[view]}.`,
      plan && plan.fade_and_back ? `How the cut looks around the sides and back: ${plan.fade_and_back}` : "",
      "Same hair colour, length, fade height, parting and texture as IMAGE 1. Same clothes. Head and shoulders in frame, portrait 3:4, camera at head height.",
      BACKDROP,
      LOOK,
    ].filter(Boolean).join("\n"));
    return p;
  }

  root.Prompts = { MOVED_FIX, PLAN_SCHEMA, CHECK_SCHEMA, planParts, drawParts, checkParts, checkScore, checkPassed, viewParts, VIEW_TEXT };
})(typeof window !== "undefined" ? window : globalThis);

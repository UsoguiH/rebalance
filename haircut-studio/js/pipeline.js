/* The try-on steps: plan -> draw -> check -> (redraw once) -> best result.
   The plan and check steps are helpers: if they fail, the try-on still runs without them.
   onStep(stage, info) lets the screen show what is really happening:
   "plan", "planned" (the plan), "draw", "check", "fix" (the check), "done" (the result). */
(function () {
  const P = window.Prompts, G = window.Gemini;
  const cache = new Map(); // same photo + same styles = same picture, no second charge

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ":" + s.length; }
  function remember(key, make) {
    if (cache.has(key)) return cache.get(key);
    const p = make();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  }
  // Runs a helper step; anything but a user stop just means "skip it".
  async function helper(name, run) {
    try { return await run(); } catch (e) {
      if (e.name === "AbortError" || e.code === "KEY" || e.code === "NO_KEY") throw e;
      console.warn(name + " step skipped:", e.code || "", e.message);
      return null;
    }
  }

  async function tryOn({ photo, hair, beard, signal, onStep = () => {} }) {
    const smart = G.settings.smart;
    const look = { photo, hair, beard };

    let plan = null;
    if (smart) {
      onStep("plan");
      plan = await helper("plan", () => G.json(P.planParts(look), P.PLAN_SCHEMA, signal));
      if (plan && plan.photo_ok === false && plan.photo_problem && plan.photo_problem !== "none") {
        throw new G.GeminiError("PHOTO", plan.photo_problem);
      }
      onStep("planned", plan);
    }

    onStep("draw");
    let best = { url: await G.image(P.drawParts({ ...look, plan }), signal), check: null };
    if (!smart) { onStep("done", best); return { ...best, plan }; }

    onStep("check");
    best.check = await helper("check", () => G.json(P.checkParts({ ...look, result: best.url }), P.CHECK_SCHEMA, signal));
    if (best.check && !P.checkPassed(best.check)) {
      onStep("fix", best.check);
      const redo = await helper("redraw", async () => {
        const url = await G.image(P.drawParts({ ...look, plan, fix: best.check.fix || best.check.problems }), signal);
        const check = await helper("recheck", () => G.json(P.checkParts({ ...look, result: url }), P.CHECK_SCHEMA, signal));
        return { url, check };
      });
      // Keep the redraw unless its own check says it is worse.
      if (redo && (!redo.check || P.checkScore(redo.check) >= P.checkScore(best.check))) best = redo;
    }
    onStep("done", best);
    return { ...best, plan };
  }

  window.Pipeline = {
    clear() { cache.clear(); },
    tryOn(args) {
      const key = ["look", G.settings.smart, hash(args.photo), args.hair && args.hair.id, args.beard && args.beard.id].join("|");
      const hit = cache.has(key);
      return remember(key, () => tryOn(args)).then((r) => { if (hit) (args.onStep || (() => {}))("done", r); return r; });
    },
    view({ view, result, photo, refs = [], plan, signal }) {
      return remember(["view", view, hash(result)].join("|"), () => G.image(P.viewParts({ view, result, photo, refs, plan }), signal));
    },
  };
})();

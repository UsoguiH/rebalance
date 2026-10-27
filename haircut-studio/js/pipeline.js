/* The try-on steps:
   look -> plan -> draw -> lock -> check -> (redraw once) -> best result.
   - look:  free on-device check that the photo has one clear face
   - plan:  a text model writes a barber's brief and rejects unusable photos
   - draw:  the image model edits the photo
   - lock:  the customer's own face and everything else is put back (facelock.js); if the
            AI moved the head too much to lock, that counts as a failed draw
   - check: a text model scores the locked picture; a weak one is redrawn once with notes
   At most two image calls per look. Look, plan, lock and check are helpers: if one cannot
   run (no model, no network to the vision files), the try-on goes on without it.
   onStep(stage, info): "look", "plan", "planned", "draw", "check", "fix", "done". */
(function () {
  const P = window.Prompts, G = window.Gemini;
  const cache = new Map(); // same photo + same styles = same picture, no second charge
  const MAX_DRAWS = 2;
  // Beards that grow well below the chin get more room in the face lock.
  const LONG_BEARDS = new Set(["garibaldi", "bandholz", "wizard", "yeard", "forked", "viking", "lumberjack", "hipster", "spade", "old-dutch", "chin-curtain", "ducktail", "verdi", "fu-manchu"]);

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ":" + s.length; }
  function remember(key, make) {
    if (cache.has(key)) return cache.get(key);
    const p = make();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  }
  // Runs a helper step; anything but a user stop or a bad key just means "skip it".
  async function helper(name, run) {
    try { return await run(); } catch (e) {
      if (e.name === "AbortError" || e.code === "KEY" || e.code === "NO_KEY") throw e;
      console.warn(name + " step skipped:", e.code || "", e.message || e);
      return null;
    }
  }

  async function tryOn({ photo, hair, beard, signal, onStep = () => {} }) {
    const smart = G.settings.smart;
    const look = { photo, hair, beard };
    let draws = 0;

    onStep("look");
    const issue = await helper("look", () => FaceLock.inspect(photo));
    if (issue && issue !== "none") throw new G.GeminiError("PHOTO", issue);

    let plan = null;
    if (smart) {
      onStep("plan");
      plan = await helper("plan", () => G.json(P.planParts(look), P.PLAN_SCHEMA, signal));
      if (plan && plan.photo_ok === false && plan.photo_problem && plan.photo_problem !== "none") {
        throw new G.GeminiError("PHOTO", plan.photo_problem);
      }
      onStep("planned", plan);
    }

    // Draws and locks. A picture whose head moved too far to lock is drawn again once.
    async function draw(fix) {
      draws++;
      const raw = await G.image(P.drawParts({ ...look, plan, fix }), signal);
      const lock = await helper("lock", () => FaceLock.lock({ original: photo, result: raw, hair: !!hair, beard: !!beard, beardLength: beard && LONG_BEARDS.has(beard.id) ? 1.3 : 0.5 }));
      if (lock && !lock.ok) console.warn("face lock refused:", lock.reason, lock.metrics || "");
      return { url: lock && lock.ok ? lock.url : raw, locked: !!(lock && lock.ok), lock: lock && { ok: lock.ok, reason: lock.reason, metrics: lock.metrics } };
    }

    onStep("draw");
    let best = await draw();
    if (!best.locked && best.lock && best.lock.reason === "moved" && draws < MAX_DRAWS) {
      onStep("fix", { problems: "moved" });
      const again = await helper("redraw", () => draw(P.MOVED_FIX));
      if (again && (again.locked || !best.locked)) best = again;
    }

    if (smart) {
      onStep("check");
      best.check = await helper("check", () => G.json(P.checkParts({ ...look, result: best.url }), P.CHECK_SCHEMA, signal));
      if (best.check && !P.checkPassed(best.check) && draws < MAX_DRAWS) {
        onStep("fix", best.check);
        const redo = await helper("redraw", async () => {
          const r = await draw([best.check.fix || best.check.problems, best.locked ? "" : P.MOVED_FIX].filter(Boolean).join(" "));
          r.check = await helper("recheck", () => G.json(P.checkParts({ ...look, result: r.url }), P.CHECK_SCHEMA, signal));
          return r;
        });
        // A locked picture always beats an unlocked one; otherwise the better check wins.
        const better = redo && (redo.locked !== best.locked ? redo.locked : !redo.check || P.checkScore(redo.check) >= P.checkScore(best.check));
        if (better) best = redo;
      }
    }
    onStep("done", best);
    return { ...best, plan, draws };
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

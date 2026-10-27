/* Try a New Look: photo -> pick -> making -> result. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const STEPS = ["photo", "pick", "make", "result"];
  const VIEWS = [ // yaw in degrees: dragging right turns the nose toward the right edge
    { id: "front", label: "Front", yaw: 0 },
    { id: "right", label: "Right", yaw: 90 },
    { id: "back", label: "Back", yaw: 180 },
    { id: "left", label: "Left", yaw: 270 },
  ];
  const STYLE_BY_ID = Object.fromEntries(window.STYLES.map((s) => [s.id, s]));

  const S = {
    photo: null, // data URL, 3:4
    photoImg: null,
    photoSource: null, // "camera" | "upload"
    camera: "wait", // "wait" | "on" | "off"
    kind: "hair",
    pick: { hair: null, beard: null },
    frames: {}, // view id -> data URL | "wait" | "fail"
    yaw: 0,
    ctrl: null,
    run: 0,
  };

  const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* no haptics */ } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600);
  }

  /* ---------- presses & ripples on everything tappable ---------- */
  const PRESSABLE = ".btn, .tile, .go, .pill, .view, .seg button, .me";
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(PRESSABLE);
    if (!el) return;
    el.classList.add("is-pressed");
    if (el.classList.contains("btn")) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", e.clientX - r.left + "px");
      el.style.setProperty("--y", e.clientY - r.top + "px");
      el.classList.remove("rip"); void el.offsetWidth; el.classList.add("rip");
    }
    const off = () => { el.classList.remove("is-pressed"); removeEventListener("pointerup", off); removeEventListener("pointercancel", off); };
    addEventListener("pointerup", off); addEventListener("pointercancel", off);
  });

  /* ---------- screens ---------- */
  function go(name, back = false) {
    app.classList.toggle("going-back", back);
    app.dataset.screen = name;
    const i = STEPS.indexOf(name);
    $$(".dots i").forEach((d, j) => { d.className = j === i ? "on" : j < i ? "done" : ""; });
    $("#meBtn").hidden = !S.photo || name === "photo";
    $("#backBtn").setAttribute("aria-label", name === "photo" ? "Staff settings (press and hold)" : "Back");
    scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    if (name === "photo") startCamera(); else stopCamera();
    if (name !== "make") face.stop();
    updateIsland();
  }

  /* ---------- 1. photo ---------- */
  const video = $("#video");
  let stream = null;

  // camera: "wait" while asking, "on" when streaming, "off" when there is none or it was refused.
  async function startCamera() {
    if (S.photo || stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { S.camera = "off"; return photoUI(); }
    S.camera = "wait"; photoUI();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      if (app.dataset.screen !== "photo" || S.photo) return stopCamera();
      video.srcObject = stream;
      S.camera = "on";
    } catch (e) {
      stream = null;
      S.camera = "off";
    }
    photoUI();
  }
  function stopCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; video.srcObject = null;
  }

  // Crops any image/video to a 3:4 portrait (face sits a little above centre).
  function toPortrait(src, w, h, mirror) {
    const outH = Math.min(1280, h, Math.round(w * 4 / 3));
    const outW = Math.round(outH * 3 / 4);
    let sw = w, sh = Math.round(w * 4 / 3);
    if (sh > h) { sh = h; sw = Math.round(h * 3 / 4); }
    const sx = (w - sw) / 2, sy = Math.max(0, Math.min(h - sh, (h - sh) * 0.4));
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const g = c.getContext("2d");
    if (mirror) { g.translate(outW, 0); g.scale(-1, 1); }
    g.drawImage(src, sx, sy, sw, sh, 0, 0, outW, outH);
    return c;
  }

  async function shoot() {
    if (!stream || !video.videoWidth) return;
    const btn = $("#shootBtn"), count = $("#count");
    btn.disabled = true;
    for (const n of [3, 2, 1]) {
      count.innerHTML = `<span>${n}</span>`;
      buzz(12);
      await wait(850);
    }
    count.innerHTML = "";
    $("#flash").classList.remove("go"); void $("#flash").offsetWidth; $("#flash").classList.add("go");
    buzz([20, 40, 20]);
    setPhoto(toPortrait(video, video.videoWidth, video.videoHeight, true), "camera");
    btn.disabled = false;
  }

  function setPhoto(canvas, source) {
    S.photo = canvas.toDataURL("image/jpeg", 0.9);
    S.photoImg = canvas;
    S.photoSource = source;
    const shot = $("#shot");
    shot.src = S.photo; shot.hidden = false;
    stopCamera();
    photoUI();
    face.load(canvas); // start finding the face while they browse styles
  }
  function clearPhoto() {
    S.photo = null; S.photoImg = null;
    $("#shot").hidden = true; $("#shot").removeAttribute("src");
    photoUI();
  }
  // One place decides what the photo screen shows. Choosing a file is always a <label for="file">,
  // a native tap target, because some in-app browsers ignore a file input clicked from script.
  function photoUI() {
    const cam = $("#cam"), shoot = $("#shootBtn"), alt = $("#altBtn"), pick = $("#pickBtn"), again = $("#pickAgainBtn"), hint = $("#photoHint");
    const live = !S.photo && S.camera === "on";
    hint.hidden = false;
    cam.classList.toggle("has-shot", !!S.photo);
    cam.classList.toggle("no-cam", !S.photo && !live);
    video.hidden = !live; // an empty video shows a big "play" placeholder on Android
    $("#camPick").hidden = !!S.photo || live;
    shoot.disabled = false;
    if (S.photo) {
      hint.textContent = "Do you like this photo?";
      setBtn(shoot, "ico-check", "Use this photo");
      shoot.hidden = false; pick.hidden = true;
      alt.hidden = S.photoSource !== "camera";
      again.hidden = S.photoSource === "camera";
      again.querySelector(".lbl").textContent = "Choose another";
    } else if (live) {
      hint.innerHTML = "Look at the screen.<br>Keep your face inside the oval.";
      setBtn(shoot, "ico-rec", "Take photo");
      shoot.hidden = false; pick.hidden = true; alt.hidden = true;
      again.hidden = false;
      again.querySelector(".lbl").textContent = "Upload a photo";
    } else {
      // Simple: just the stadium. The whole of it opens the photo picker.
      hint.hidden = true;
      shoot.hidden = true; alt.hidden = true; again.hidden = true;
      pick.hidden = true;
    }
  }
  function setBtn(btn, ico, label) {
    btn.querySelector(".lbl").textContent = label;
    const old = btn.querySelector(".ico");
    if (old) old.remove();
    if (ico) { const i = document.createElement("span"); i.className = "ico " + ico; btn.prepend(i); }
  }

  $("#shootBtn").addEventListener("click", () => {
    if (S.photo) { $("#meBtn img").src = S.photo; buzz(); go("pick"); }
    else if (S.camera === "on") shoot();
  });
  $("#altBtn").addEventListener("click", () => { clearPhoto(); startCamera(); }); // "Take again"
  ["#pickBtn", "#pickAgainBtn", "#camPick"].forEach((sel) => $(sel).addEventListener("click", () => buzz(6)));
  async function usePicture(f) {
    if (!f || !/^image\//.test(f.type)) { toast("Please choose a photo."); return; }
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      setPhoto(toPortrait(bmp, bmp.width, bmp.height, false), "upload");
      buzz(10);
    } catch (err) { toast("That picture could not be opened."); }
  }
  $("#file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    usePicture(f);
  });
  // Drag a photo onto the card (computers).
  const camCard = $("#cam");
  ["dragenter", "dragover"].forEach((ev) => camCard.addEventListener(ev, (e) => { e.preventDefault(); camCard.classList.add("drag"); }));
  ["dragleave", "dragend"].forEach((ev) => camCard.addEventListener(ev, () => camCard.classList.remove("drag")));
  camCard.addEventListener("drop", (e) => {
    e.preventDefault(); camCard.classList.remove("drag");
    usePicture(e.dataTransfer.files[0]);
  });
  $("#meBtn").addEventListener("click", () => { clearPhoto(); go("photo", true); });

  /* ---------- 2. pick ---------- */
  const grid = $("#grid");

  function renderGrid() {
    const list = window.STYLES.filter((s) => s.kind === S.kind);
    grid.innerHTML = "";
    list.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "tile" + (S.pick[s.kind] === s.id ? " on" : "");
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-pressed", S.pick[s.kind] === s.id);
      b.style.setProperty("--i", Math.min(i, 16));
      b.dataset.id = s.id;
      b.innerHTML = `<img alt="" loading="${i < 8 ? "eager" : "lazy"}" decoding="async"><span class="tile-no">${String(i + 1).padStart(2, "0")}</span><span class="tile-name"></span><span class="tile-tick"><span class="ico ico-check"></span></span>`;
      b.querySelector(".tile-name").textContent = s.name;
      const img = b.querySelector("img");
      img.onload = () => img.classList.add("ok");
      img.src = s.img;
      if (s.pos) img.style.objectPosition = s.pos;
      grid.appendChild(b);
    });
  }

  function setKind(kind) {
    if (S.kind === kind) return;
    S.kind = kind;
    $(".seg").dataset.kind = kind;
    $$(".seg button").forEach((b) => b.setAttribute("aria-selected", b.dataset.kind === kind));
    buzz(6);
    renderGrid();
  }
  $$(".seg button").forEach((b) => b.addEventListener("click", () => setKind(b.dataset.kind)));

  grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile) return;
    const s = STYLE_BY_ID[tile.dataset.id];
    const on = S.pick[s.kind] !== s.id;
    $$(".tile.on", grid).forEach((t) => { t.classList.remove("on"); t.setAttribute("aria-pressed", "false"); });
    S.pick[s.kind] = on ? s.id : null;
    if (on) {
      tile.classList.add("on"); tile.setAttribute("aria-pressed", "true");
      buzz(10);
      loadRef(s);
    } else buzz(4);
    updateIsland(on ? tile : null);
  });

  function wallet(el, animate) {
    const ids = [S.pick.hair, S.pick.beard].filter(Boolean);
    const key = ids.join("+");
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.dataset.n = ids.length;
    el.innerHTML = "";
    ids.forEach((id) => {
      const s = STYLE_BY_ID[id];
      const list = window.STYLES.filter((x) => x.kind === s.kind);
      const c = document.createElement("div");
      c.className = "ocard";
      if (!animate) c.style.animation = "none";
      c.innerHTML = `<img class="ocard-img" alt=""><span class="ocard-kind">${s.kind === "hair" ? "Hair" : "Beard"}</span><span class="ocard-name"></span><span class="ocard-sub mono">No. ${String(list.indexOf(s) + 1).padStart(2, "0")} of ${list.length}</span>`;
      c.querySelector(".ocard-img").src = s.img;
      c.querySelector(".ocard-name").textContent = s.name;
      el.appendChild(c);
    });
  }

  function updateIsland(fromTile) {
    const island = $("#island");
    const any = S.pick.hair || S.pick.beard;
    island.classList.toggle("up", !!any && app.dataset.screen === "pick");
    if (!any) return;
    const w = $("#wallet");
    wallet(w, true);
    if (fromTile) fly(fromTile, w.lastElementChild);
  }

  // The tapped photo flies down into the orange card.
  function fly(tile, card) {
    if (!card || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = tile.querySelector("img");
    const a = img.getBoundingClientRect();
    const target = card.querySelector(".ocard-img");
    requestAnimationFrame(() => {
      const b = target.getBoundingClientRect();
      if (!b.width) return;
      const ghost = img.cloneNode();
      Object.assign(ghost.style, { position: "fixed", left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px", objectFit: "cover", borderRadius: "44px", zIndex: 40, pointerEvents: "none", margin: 0, opacity: 1 });
      document.body.appendChild(ghost);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      ghost.animate([
        { transform: "translate(0,0) scale(1)", borderRadius: "44px" },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.45 - 60}px) scale(.55)`, borderRadius: "80px", offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})`, borderRadius: a.width + "px", opacity: 0.2 },
      ], { duration: 700, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => ghost.remove();
    });
  }

  const refCache = {};
  function loadRef(s) {
    if (!refCache[s.id]) {
      refCache[s.id] = new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL("image/jpeg", 0.88));
        };
        img.onerror = no;
        img.crossOrigin = "anonymous";
        img.src = s.ref || s.img;
      });
      refCache[s.id].catch(() => delete refCache[s.id]);
    }
    return refCache[s.id];
  }

  $("#goBtn").addEventListener("click", () => {
    if (!Gemini.settings.key) { openSettings("Add the Gemini API key first."); return; }
    buzz(14);
    make();
  });

  /* ---------- 3. making ---------- */
  const face = Face3D.create($("#faceCanvas"));
  const log = $("#log");

  function say(text, cls) {
    const lines = $$("p", log);
    lines.forEach((p, i) => {
      const age = lines.length - i;
      p.classList.toggle("old", age === 1);
      p.classList.toggle("older", age >= 2);
      const c = p.querySelector(".caret"); if (c) c.remove();
      if (age >= 3) p.remove();
    });
    const p = document.createElement("p");
    if (cls) p.className = cls;
    log.appendChild(p);
    let i = 0;
    const caret = document.createElement("span"); caret.className = "caret";
    const tick = () => {
      p.textContent = text.slice(0, ++i);
      p.appendChild(caret);
      if (i < text.length) p.t = setTimeout(tick, 26);
    };
    tick();
  }

  async function make() {
    const hair = S.pick.hair && STYLE_BY_ID[S.pick.hair];
    const beard = S.pick.beard && STYLE_BY_ID[S.pick.beard];
    const names = [hair, beard].filter(Boolean).map((s) => s.name);
    const run = ++S.run;
    S.failed = false;
    S.ctrl && S.ctrl.abort();
    S.ctrl = new AbortController();
    S.frames = {};

    go("make");
    $("#makeThumb").src = S.photo;
    $("#makeName").textContent = names.join(" + ");
    setBtn($("#stopBtn"), "ico-stop", "Stop");
    log.innerHTML = "";
    face.start();

    // The lines follow the real steps of the pipeline; while the picture is drawn
    // (the long step) they cycle through what a barber would be doing.
    const drawing = [
      ...(hair ? ["Trimming the sides.", "Shaping the top.", "Blending it all in."] : []),
      ...(beard ? [`Shaping the ${beard.name.toLowerCase()}.`, "Cleaning up the lines."] : []),
      "Matching the light.", "Almost there.",
    ];
    let talk = 0;
    const talkThrough = (lines) => {
      clearInterval(talk);
      let i = 0;
      talk = setInterval(() => { if (i < lines.length) say(lines[i++]); }, 3800);
    };
    say("Hello! Let me have a look at you.");

    const t0 = performance.now(), EST = estimate();
    $("#makeEta").textContent = "~" + clock(EST);
    const timer = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      $("#makeTime").textContent = clock(s);
      $("#makeBar").style.width = Math.min(95, (1 - Math.exp(-s / (EST * 0.55))) * 100) + "%";
    }, 250);
    const end = () => { clearInterval(talk); clearInterval(timer); };

    const onStep = (stage, info) => {
      if (run !== S.run) return;
      if (stage === "plan") say("Reading your hair and the shape of your face.");
      if (stage === "planned" && info) {
        if (info.greeting) say(info.greeting);
        if (info.hair_colour && hair) setTimeout(() => run === S.run && say(`I will keep your natural ${info.hair_colour.toLowerCase()} colour.`), 1800);
      }
      if (stage === "draw") { say(`Now the ${names.join(" and the ")}.`); talkThrough(drawing); }
      if (stage === "fix" && app.dataset.screen === "make") { say("Fixing a small detail. One moment."); talkThrough(["Redoing the edges.", "Matching the light.", "Almost there."]); }
    };

    try {
      const [hRef, bRef] = await Promise.all([hair && loadRef(hair), beard && loadRef(beard)]);
      const out = await Pipeline.tryOn({
        photo: S.photo,
        hair: hair && { ...hair, ref: hRef },
        beard: beard && { ...beard, ref: bRef },
        signal: S.ctrl.signal,
        onStep,
      });
      if (run !== S.run) return;
      end();
      learn((performance.now() - t0) / 1000);
      $("#makeBar").style.width = "100%";
      say("Done. Have a look!");
      buzz([15, 60, 30]);
      await wait(700);
      if (run !== S.run) return;
      S.frames = { front: out.url };
      S.plan = out.plan;
      showResult(true);
      const refs = [hRef, bRef].filter(Boolean);
      if (Gemini.settings.views) { // show the coming views straight away
        VIEWS.forEach((v) => { if (v.id !== "front") S.frames[v.id] = "wait"; });
        renderViews();
      }
      // The check runs while they look; a fixed picture slides in, then the side views are made from it.
      $("#improving").hidden = !Gemini.settings.smart;
      const better = await out.improve;
      if (run !== S.run) return;
      $("#improving").hidden = true;
      if (better) {
        S.frames.front = better.url;
        renderFrames();
        const img = turn.querySelector('[data-v="front"]');
        if (img) { img.classList.remove("swap"); void img.offsetWidth; img.classList.add("swap"); }
        toast("I fixed a small detail");
      }
      S.refs = refs;
      if (Gemini.settings.views) makeViews(run, refs);
      else $("#sidesBtn").hidden = false; // on request: three more pictures cost money
    } catch (e) {
      end();
      if (e.name === "AbortError" || run !== S.run) return;
      console.error(e);
      if (e.code === "NO_KEY") { openSettings("Add the Gemini API key first."); go("pick", true); return; }
      say(friendly(e), "err");
      buzz([40, 60, 40]);
      S.failed = e.code === "PHOTO" ? "photo" : "retry";
      if (S.failed === "photo") setBtn($("#stopBtn"), "ico-rec", "Take a new photo");
      else setBtn($("#stopBtn"), "ico-again", "Try again");
    }
  }

  const PHOTO_TIPS = {
    no_face: "I cannot see a face in this photo. Let's take a new one.",
    several_faces: "I see more than one person. Please take a photo of just you.",
    face_too_small: "Your face is too far away. Please come closer and take a new photo.",
    face_turned_away: "Please look straight at the camera and take a new photo.",
    too_dark: "The photo is too dark. Please find more light and take a new one.",
    too_blurry: "The photo is blurry. Please hold still and take a new one.",
    face_covered: "Part of your face is covered. Please take a new photo.",
  };

  function friendly(e) {
    if (!navigator.onLine || e.code === "NETWORK") return "No internet. Please check the connection.";
    switch (e.code) {
      case "PHOTO": return PHOTO_TIPS[e.message] || "This photo will not work well. Let's take a new one.";
      case "QUOTA": return "The AI is busy. Please wait one minute and try again.";
      case "KEY": return "The AI key is not working. Please ask the staff.";
      case "BLOCKED": return "The AI would not edit this photo. Try another photo or style.";
      case "NO_IMAGE": return "Sorry, I could not make this look. Try again or pick another style.";
      case "TIMEOUT": return "The AI is slow right now. Please try again.";
      case "MODEL": return "No AI image model is available. Please ask the staff.";
      default: return "Sorry, something went wrong. Please try again.";
    }
  }

  // The time estimate learns from real runs on this device.
  const etaKey = () => "hs.eta." + (Gemini.settings.smart ? "smart" : "fast");
  function estimate() {
    const fallback = Gemini.settings.smart ? 35 : 25;
    try { return Math.max(8, Math.min(120, parseFloat(localStorage.getItem(etaKey())) || fallback)); } catch (e) { return fallback; }
  }
  function learn(s) {
    try { localStorage.setItem(etaKey(), String(Math.round(estimate() * 0.6 + s * 0.4))); } catch (e) { /* private mode */ }
  }
  const clock = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  function stopMaking() {
    S.failed = false;
    S.run++;
    S.ctrl && S.ctrl.abort();
    buzz(10);
    go("pick", true);
  }
  $("#stopBtn").addEventListener("click", () => {
    if (S.failed === "photo") { S.failed = false; clearPhoto(); go("photo", true); }
    else if (S.failed) { buzz(10); make(); } else stopMaking();
  });

  // Side and back views are made together; each one appears as soon as it is ready.
  $("#sidesBtn").addEventListener("click", () => {
    $("#sidesBtn").hidden = true;
    buzz(8);
    makeViews(S.run, S.refs || []);
  });
  function makeViews(run, refs) {
    S.refs = refs;
    const todo = VIEWS.filter((v) => v.id !== "front");
    todo.forEach((v) => { S.frames[v.id] = "wait"; });
    renderViews();
    return Promise.all(todo.map(async (v, i) => {
      await new Promise((r) => setTimeout(r, i * 400)); // stagger to be gentle on rate limits
      try {
        const url = await Pipeline.view({ result: S.frames.front, photo: S.photo, view: v.id, refs, plan: S.plan, signal: S.ctrl.signal });
        if (run !== S.run) return;
        S.frames[v.id] = url;
        buzz(6);
      } catch (e) {
        if (e.name === "AbortError" || run !== S.run) return;
        console.error(e);
        S.frames[v.id] = "fail";
      }
      renderFrames(); renderViews();
    }));
  }

  /* ---------- 4. result: drag to turn the head ---------- */
  const stage = $("#stage"), turn = $("#turn");
  const ready = () => VIEWS.filter((v) => typeof S.frames[v.id] === "string" && S.frames[v.id].startsWith("data:"));
  const norm = (a) => ((a % 360) + 360) % 360;

  function showResult(fresh) {
    $("#sidesBtn").hidden = true;
    S.yaw = 0;
    $("#beforeImg").src = S.photo;
    go("result");
    renderFrames(); renderViews();
    if (fresh) { stage.classList.remove("reveal"); void stage.offsetWidth; stage.classList.add("reveal"); }
    S.dragged = false;
  }

  function renderFrames() {
    for (const v of ready()) {
      let img = turn.querySelector(`[data-v="${v.id}"]`);
      if (!img) {
        img = document.createElement("img");
        img.dataset.v = v.id; img.alt = "Your new look, " + v.label.toLowerCase();
        turn.appendChild(img);
      }
      if (img.src !== S.frames[v.id]) img.src = S.frames[v.id];
    }
    $$("img", turn).forEach((img) => { if (!ready().some((v) => v.id === img.dataset.v)) img.remove(); });
    // "Drag to turn" only once there is something to turn to.
    $("#dragHint").classList.toggle("gone", ready().length < 2 || !!S.dragged);
    paint();
  }

  // Cross-fade the two nearest views and lean each one toward the drag.
  function paint() {
    const list = ready();
    if (!list.length) return;
    const yaw = norm(S.yaw);
    let a = list[0], b = list[0], wb = 0;
    if (list.length > 1) {
      const sorted = [...list].sort((p, q) => p.yaw - q.yaw);
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i], q = sorted[(i + 1) % sorted.length];
        const span = norm(q.yaw - p.yaw) || 360, off = norm(yaw - p.yaw);
        if (off <= span) { a = p; b = q; wb = off / span; break; }
      }
    }
    const sm = (x) => { const t = Math.max(0, Math.min(1, (x - 0.32) / 0.36)); return t * t * (3 - 2 * t); };
    const w = sm(wb);
    $$("img", turn).forEach((img) => {
      const v = VIEWS.find((x) => x.id === img.dataset.v);
      let op = 0;
      if (v === a) op += 1 - w;
      if (v === b) op += w;
      let d = norm(yaw - v.yaw); if (d > 180) d -= 360;
      const lean = Math.max(-28, Math.min(28, d * 0.4));
      img.style.opacity = op.toFixed(3);
      img.style.transform = `perspective(900px) rotateY(${lean}deg) translateX(${lean * 0.6}px) scale(${1 + Math.abs(lean) / 400})`;
    });
    const near = list.length === 1 ? list[0] : (w < 0.5 ? a : b);
    $("#angleLbl").textContent = near.label;
    $$(".view").forEach((el) => el.setAttribute("aria-selected", el.dataset.v === near.id));
  }

  function renderViews() {
    const box = $("#views");
    box.hidden = !Gemini.settings.views && ready().length < 2;
    box.innerHTML = "";
    for (const v of VIEWS) {
      const st = S.frames[v.id];
      if (!st) continue;
      const b = document.createElement("button");
      b.className = "view" + (st === "wait" ? " wait" : st === "fail" ? " fail" : "");
      b.dataset.v = v.id; b.setAttribute("role", "tab");
      b.textContent = v.label;
      if (st === "wait") b.setAttribute("aria-label", v.label + ", still making");
      box.appendChild(b);
    }
    paint();
  }
  $("#views").addEventListener("click", (e) => {
    const b = e.target.closest(".view");
    if (!b) return;
    const v = VIEWS.find((x) => x.id === b.dataset.v);
    if (S.frames[v.id] === "fail") { retryView(v); return; }
    if (S.frames[v.id] === "wait") { toast("Still making the " + v.label.toLowerCase() + " view…"); return; }
    let d = norm(v.yaw - norm(S.yaw)); if (d > 180) d -= 360;
    spinTo(S.yaw + d);
    buzz(6);
  });
  async function retryView(v) {
    const run = S.run;
    S.frames[v.id] = "wait"; renderViews();
    try { S.frames[v.id] = await Pipeline.view({ result: S.frames.front, photo: S.photo, view: v.id, refs: S.refs || [], plan: S.plan, signal: S.ctrl.signal }); }
    catch (e) { S.frames[v.id] = "fail"; }
    if (run === S.run) { renderFrames(); renderViews(); }
  }

  let anim = 0;
  function spinTo(target) {
    cancelAnimationFrame(anim);
    let vel = 0;
    const step = () => { // critically damped spring
      const f = (target - S.yaw) * 0.12;
      vel = (vel + f) * 0.62;
      S.yaw += vel;
      paint();
      if (Math.abs(target - S.yaw) > 0.05 || Math.abs(vel) > 0.05) anim = requestAnimationFrame(step);
      else { S.yaw = target; paint(); }
    };
    anim = requestAnimationFrame(step);
  }
  function snap() {
    const list = ready();
    if (list.length < 2) { spinTo(0); return; }
    const yaw = norm(S.yaw);
    let best = list[0], bd = 999;
    for (const v of list) { let d = Math.abs(norm(yaw - v.yaw)); d = Math.min(d, 360 - d); if (d < bd) { bd = d; best = v; } }
    let d = norm(best.yaw - yaw); if (d > 180) d -= 360;
    spinTo(S.yaw + d);
  }

  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#holdBtn")) return;
    cancelAnimationFrame(anim);
    drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, id: e.pointerId, moved: false, lastFrame: null };
    stage.classList.add("live");
  });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    stage.style.setProperty("--gx", (nx + 0.5) * 100 + "%");
    stage.style.setProperty("--gy", (ny + 0.5) * 100 + "%");
    if (!drag) {
      if (e.pointerType === "mouse") { stage.style.setProperty("--rx", (-ny * 8).toFixed(2) + "deg"); stage.style.setProperty("--ry", (nx * 10).toFixed(2) + "deg"); }
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 8) {
      drag.moved = true;
      stage.setPointerCapture(drag.id);
      $("#dragHint").classList.add("gone");
      S.dragged = true;
    }
    if (!drag.moved) return;
    const many = ready().length > 1;
    // With only the front view, the head can lean but springs back.
    S.yaw = many ? drag.yaw + dx * 0.55 : 30 * Math.tanh(dx / 160);
    stage.style.setProperty("--rx", Math.max(-8, Math.min(8, -(e.clientY - drag.y) * 0.05)).toFixed(2) + "deg");
    stage.style.setProperty("--ry", Math.max(-10, Math.min(10, dx * 0.03)).toFixed(2) + "deg");
    paint();
    const near = $("#angleLbl").textContent;
    if (near !== drag.lastFrame) { if (drag.lastFrame) buzz(5); drag.lastFrame = near; }
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    stage.classList.remove("live");
    stage.style.setProperty("--rx", "0deg"); stage.style.setProperty("--ry", "0deg");
    snap();
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("pointerleave", (e) => {
    if (!drag && e.pointerType === "mouse") { stage.style.setProperty("--rx", "0deg"); stage.style.setProperty("--ry", "0deg"); }
  });
  addEventListener("keydown", (e) => {
    if (app.dataset.screen !== "result" || e.target.closest("input, select")) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { stepView(e.key === "ArrowRight" ? 1 : -1); e.preventDefault(); }
  });
  function stepView(dir) {
    const list = ready().sort((p, q) => p.yaw - q.yaw);
    if (list.length < 2) return;
    const yaw = norm(S.yaw);
    const i = list.findIndex((v) => Math.abs(norm(yaw - v.yaw)) < 1 || Math.abs(norm(yaw - v.yaw)) > 359);
    const next = list[(Math.max(0, i) + dir + list.length) % list.length];
    let d = norm(next.yaw - yaw); if (d > 180) d -= 360;
    spinTo(S.yaw + d);
  }

  // Hold to see the original photo.
  const hold = $("#holdBtn");
  const holdOn = (e) => { if (e.type === "keydown" && e.key !== " " && e.key !== "Enter") return; if (e.repeat) return; e.preventDefault(); stage.classList.add("show-before"); hold.classList.add("holding"); hold.querySelector(".lbl").textContent = "This was you before"; buzz(8); };
  const holdOff = () => { stage.classList.remove("show-before"); hold.classList.remove("holding"); hold.querySelector(".lbl").textContent = "Hold to see before"; };
  hold.addEventListener("pointerdown", holdOn);
  ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"].forEach((ev) => hold.addEventListener(ev, holdOff));
  hold.addEventListener("keydown", holdOn);
  hold.addEventListener("contextmenu", (e) => e.preventDefault());

  $("#againBtn").addEventListener("click", () => { S.run++; S.ctrl && S.ctrl.abort(); go("pick", true); });

  /* ---------- show the barber ---------- */
  function currentFrame() {
    const near = VIEWS.find((v) => v.label === $("#angleLbl").textContent);
    const url = near && S.frames[near.id];
    return typeof url === "string" && url.startsWith("data:") ? url : S.frames.front;
  }
  $("#loveBtn").addEventListener("click", () => {
    $("#showImg").src = currentFrame();
    $("#showWallet").dataset.key = "";
    wallet($("#showWallet"), true);
    $("#show").hidden = false;
    buzz([10, 50, 10]);
  });
  $("#showBack").addEventListener("click", () => { $("#show").hidden = true; });
  // Inside claude.ai the page asks the viewer to save through the downloads capability;
  // elsewhere a normal download link does it.
  let downloadsP = null;
  const downloads = () => {
    if (!downloadsP) downloadsP = window.claude && window.claude.use
      ? Promise.race([window.claude.use("downloads").catch(() => null), wait(4000).then(() => null)])
      : Promise.resolve(null);
    return downloadsP;
  };
  $("#saveBtn").addEventListener("click", async () => {
    const names = [S.pick.hair, S.pick.beard].filter(Boolean).join("-");
    const filename = `my-new-look-${names}.jpg`, url = $("#showImg").src;
    const dl = await downloads();
    if (dl) {
      try {
        const blob = await (await fetch(url)).blob();
        await dl.save({ filename, data: blob });
        toast("Saved");
      } catch (e) {
        if (e && e.code !== "declined") toast("Saving is not available here.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    toast("Saved");
  });
  $("#doneBtn").addEventListener("click", reset);

  // Next customer: forget everything about this one.
  function reset() {
    S.run++; S.ctrl && S.ctrl.abort();
    S.pick = { hair: null, beard: null }; S.frames = {};
    Pipeline.clear();
    turn.innerHTML = ""; $("#wallet").dataset.key = "";
    $("#show").hidden = true;
    $("#beforeImg").removeAttribute("src");
    $("#meBtn img").removeAttribute("src");
    clearPhoto();
    S.kind = "beard"; setKind("hair");
    go("photo", true);
  }

  /* ---------- back pill: tap = back, press and hold = staff settings ---------- */
  const back = $("#backBtn");
  let holdT = 0, held = false;
  back.addEventListener("pointerdown", () => {
    held = false;
    back.classList.add("is-holding");
    holdT = setTimeout(() => { held = true; back.classList.remove("is-holding"); buzz([10, 30, 10]); openSettings(); }, 1600);
  });
  const cancelHold = () => { clearTimeout(holdT); back.classList.remove("is-holding"); };
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => back.addEventListener(ev, cancelHold));
  back.addEventListener("contextmenu", (e) => e.preventDefault());
  back.addEventListener("click", () => {
    if (held) return;
    const sc = app.dataset.screen;
    if (sc === "photo") { toast("Press and hold for staff settings"); return; }
    buzz(6);
    if (sc === "pick") go("photo", true);
    else if (sc === "make") stopMaking();
    else if (sc === "result") $("#againBtn").click();
  });

  /* ---------- settings ---------- */
  const modelSel = $("#modelInput");
  fillModels();
  function fillModels(ids) {
    modelSel.innerHTML = "";
    const names = Object.fromEntries(Gemini.MODELS);
    (ids || Gemini.MODELS.map((m) => m[0])).forEach((id) => {
      const o = document.createElement("option"); o.value = id; o.textContent = names[id] || id; modelSel.appendChild(o);
    });
  }
  $("#checkBtn").addEventListener("click", async () => {
    const key = $("#keyInput").value.trim(), note = $("#settingsNote");
    if (!key) { note.textContent = "Paste the key first."; return; }
    note.textContent = "Checking…";
    try {
      const ids = await Gemini.listModels(key);
      if (!ids.length) { note.textContent = "The key works, but it has no image models."; return; }
      const keep = modelSel.value;
      fillModels(ids);
      modelSel.value = ids.includes(keep) ? keep : ids[0];
      note.textContent = `The key works. ${ids.length} image model${ids.length > 1 ? "s" : ""} found.`;
      buzz([10, 40, 10]);
    } catch (e) {
      note.textContent = e.code === "QUOTA" ? "The key works but is busy. Try again in a minute." : "That key does not work: " + e.message;
    }
  });

  function openSettings(note, firstRun) {
    $("#t-settings").textContent = firstRun ? "One-time setup" : "Staff settings";
    $("#advanced").hidden = !!firstRun; // first time: just the key
    $("#credBtn").hidden = !!firstRun;
    $("#keyInput").value = Gemini.settings.key;
    if (![...modelSel.options].some((o) => o.value === Gemini.settings.model)) fillModels([Gemini.settings.model, ...Gemini.MODELS.map((m) => m[0]).filter((m) => m !== Gemini.settings.model)]);
    modelSel.value = Gemini.settings.model;
    $("#viewsInput").checked = Gemini.settings.views;
    $("#smartInput").checked = Gemini.settings.smart;
    const used = Gemini.usage();
    $("#settingsNote").textContent = note || `The key stays on this device only. Used on this device so far: ${used.images} picture${used.images === 1 ? "" : "s"} and ${used.checks} quick check${used.checks === 1 ? "" : "s"}.`;
    $("#settings").hidden = false;
    setTimeout(() => (Gemini.settings.key ? modelSel : $("#keyInput")).focus(), 300);
  }
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    Gemini.settings.key = $("#keyInput").value;
    if (modelSel.value !== Gemini.settings.model) Gemini.settings.model = modelSel.value;
    Gemini.settings.views = $("#viewsInput").checked;
    Gemini.settings.smart = $("#smartInput").checked;
    $("#settings").hidden = true;
    toast(Gemini.settings.key ? "Saved" : "No key saved");
  });
  $("#settings").addEventListener("click", (e) => { if (e.target.id === "settings") $("#settings").hidden = true; });
  $("#closeSettings").addEventListener("click", () => { $("#settings").hidden = true; });
  $("#credBtn").addEventListener("click", () => window.open("credits.html", "_blank", "noopener"));
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#settings").hidden) $("#settings").hidden = true;
    else if (!$("#show").hidden) $("#show").hidden = true;
  });

  /* ---------- start ---------- */
  renderGrid();
  go("photo");
  if (!Gemini.settings.key) setTimeout(() => openSettings("Paste your Gemini API key once. It stays on this device. Later, press and hold the top-left button to come back here.", true), 700);
  setTimeout(() => Vision.warm(), 4000);
})();

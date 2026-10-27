// Prompt evaluation: runs the app's real prompts (js/prompts.js) against Gemini on test
// faces and writes an HTML report with before / reference / result, the plan and the scores.
//
//   GEMINI_API_KEY=... node tools/eval.mjs --faces ./my-test-faces --styles pompadour,low-fade,goatee
//   options: --out eval-out  --model gemini-nano-banana-2.1  --text gemini-flash-latest
//            --no-plan (skip the plan step, to measure what it adds)  --no-check
//
// Use photos of people who agreed to it. Compare runs by their average scores.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : null).filter(Boolean));
const KEY = process.env.GEMINI_API_KEY;
if (!KEY || !args.faces || !args.styles) {
  console.error("usage: GEMINI_API_KEY=... node tools/eval.mjs --faces <dir> --styles id1,id2 [--out dir] [--model id] [--text id] [--no-plan] [--no-check]");
  process.exit(1);
}
const IMAGE_MODEL = args.model || "gemini-nano-banana-2.1";
const TEXT_MODEL = args.text || "gemini-flash-latest";
const OUT = path.resolve(args.out || "eval-out");
fs.mkdirSync(OUT, { recursive: true });

// Load the browser files into this process.
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.createContext(sandbox);
for (const f of ["js/styles.js", "js/prompts.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox);
const { STYLES, Prompts: P } = sandbox.window;

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const dataUrl = (buf, mime = "image/jpeg") => `data:${mime};base64,${buf.toString("base64")}`;
const toParts = (parts) => parts.map((p) => /^data:image\//.test(p)
  ? { inline_data: { mime_type: p.slice(5, p.indexOf(";")), data: p.slice(p.indexOf(",") + 1) } }
  : { text: p });

async function gen(model, parts, generationConfig) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: toParts(parts) }], generationConfig }),
    });
    const json = await res.json();
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await new Promise((r) => setTimeout(r, 4000 * (attempt + 1))); continue; }
    throw new Error(`${res.status} ${json.error && json.error.message}`);
  }
}
const finalParts = (json) => (((json.candidates || [])[0] || {}).content || {}).parts?.filter((p) => !p.thought) || [];
async function image(parts) {
  const json = await gen(IMAGE_MODEL, parts, { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:4" } });
  const img = finalParts(json).filter((p) => p.inlineData || p.inline_data).pop();
  if (!img) throw new Error("no image: " + JSON.stringify(json).slice(0, 300));
  const b = img.inlineData || img.inline_data;
  return `data:${b.mimeType || b.mime_type};base64,${b.data}`;
}
async function ask(parts, schema) {
  const json = await gen(TEXT_MODEL, parts, { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 });
  return JSON.parse(finalParts(json).map((p) => p.text || "").join(""));
}

const refs = {};
async function ref(style) {
  if (!refs[style.id]) {
    const res = await fetch(style.ref.startsWith("http") ? style.ref : path.join(ROOT, style.ref));
    refs[style.id] = dataUrl(Buffer.from(await res.arrayBuffer()));
  }
  return refs[style.id];
}

const faces = fs.readdirSync(args.faces).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const styles = String(args.styles).split(",").map((id) => STYLES.find((s) => s.id === id) || (console.error("unknown style", id), process.exit(1)));
const rows = [];
for (const face of faces) {
  const photo = dataUrl(fs.readFileSync(path.join(args.faces, face)), /png$/i.test(face) ? "image/png" : "image/jpeg");
  for (const style of styles) {
    const look = { photo, [style.kind]: { ...style, ref: await ref(style) } };
    const row = { face, style: style.id, t0: Date.now() };
    process.stdout.write(`${face} × ${style.id} … `);
    try {
      row.plan = args["no-plan"] ? null : await ask(P.planParts(look), P.PLAN_SCHEMA);
      if (row.plan && row.plan.photo_ok === false) throw new Error("photo rejected: " + row.plan.photo_problem);
      row.result = await image(P.drawParts({ ...look, plan: row.plan }));
      if (!args["no-check"]) {
        row.check = await ask(P.checkParts({ ...look, result: row.result }), P.CHECK_SCHEMA);
        row.score = P.checkScore(row.check);
        row.passed = P.checkPassed(row.check);
      }
      const file = `${path.parse(face).name}__${style.id}.jpg`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(row.result.split(",")[1], "base64"));
      row.file = file;
      row.ref = style.ref;
      console.log(row.check ? `score ${row.score} ${row.passed ? "pass" : "FAIL"}` : "done");
    } catch (e) {
      row.error = e.message;
      console.log("error: " + e.message);
    }
    row.seconds = Math.round((Date.now() - row.t0) / 100) / 10;
    delete row.result;
    rows.push(row);
  }
}

const scored = rows.filter((r) => r.check);
const avg = (k) => scored.length ? (scored.reduce((s, r) => s + r.check[k], 0) / scored.length).toFixed(2) : "-";
const summary = { runs: rows.length, errors: rows.filter((r) => r.error).length, passed: scored.filter((r) => r.passed).length,
  same_person: avg("same_person"), style_match: avg("style_match"), realism: avg("realism"), kept_details: avg("kept_details"),
  seconds: (rows.reduce((s, r) => s + r.seconds, 0) / rows.length).toFixed(1), image_model: IMAGE_MODEL, text_model: TEXT_MODEL, plan: !args["no-plan"] };
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ summary, rows }, null, 1));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
fs.writeFileSync(path.join(OUT, "report.html"), `<!doctype html><meta charset="utf-8"><title>Prompt Eval</title>
<style>body{font:15px system-ui;margin:24px;background:#f1f1f1}table{border-collapse:collapse;background:#fff}td{border-top:1px solid #ddd;padding:10px;vertical-align:top}
img{width:180px;border-radius:14px}pre{white-space:pre-wrap;max-width:420px;font-size:12px}.f{color:#d33;font-weight:600}.p{color:#170}</style>
<h1>Prompt eval</h1><pre>${esc(JSON.stringify(summary, null, 1))}</pre><table>
${rows.map((r) => `<tr><td><img src="${esc(path.relative(OUT, path.resolve(args.faces, r.face)))}"><br>${esc(r.face)}</td>
<td><img src="${esc(r.ref)}"><br>${esc(r.style)}</td><td>${r.file ? `<img src="${esc(r.file)}">` : `<span class="f">${esc(r.error)}</span>`}</td>
<td>${r.check ? `<b class="${r.passed ? "p" : "f"}">score ${r.score}</b><pre>${esc(JSON.stringify(r.check, null, 1))}</pre>` : ""}<pre>${esc(r.plan ? JSON.stringify(r.plan, null, 1) : "")}</pre>${r.seconds}s</td></tr>`).join("\n")}
</table>`);
console.log("\n" + JSON.stringify(summary, null, 1) + "\nreport: " + path.join(OUT, "report.html"));

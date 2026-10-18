// The camera keeps whatever is being drawn framed inside the phone-safe area,
// follows the pen along the connecting lines, and pulls back for the overview.

import { clamp, ease, inv } from './util.js';

const SAFE_W = 930, SAFE_H = 1280, SAFE_SHIFT = 50; // px; content sits a bit above centre
const LOOKAHEAD = 0.7;

export class AutoCamera {
  constructor(film, fps) {
    this.film = film;
    this.dt = 1 / fps;
    this.frame = -1;
    this.s = null;
    this.framed = film.els.filter((e) => e.frame !== false);
  }

  target(t) {
    const { overview: ov, transitions } = this.film;
    if (ov && t >= ov.t0 && t < ov.t1) return { x: ov.x, y: ov.y, z: ov.z, rate: 0.085 };
    for (const tr of transitions) {
      if (t >= tr.t0 && t < tr.t1) {
        const tip = tr.el.tip(t) ?? tr.el.tip(tr.t1 - 0.01);
        return { x: tip[0], y: tip[1], z: 0.95, rate: 0.14 };
      }
    }
    let cur = this.framed.reduce((a, e) => (e.t0 < a.t0 ? e : a));
    for (const e of this.framed) if (e.t0 <= t + LOOKAHEAD && e.t0 >= cur.t0) cur = e;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const e of this.framed) {
      if (e.scene !== cur.scene || e.group !== cur.group || (e.t0 > t + LOOKAHEAD && e !== cur)) continue;
      x1 = Math.min(x1, e.bbox[0]); y1 = Math.min(y1, e.bbox[1]); x2 = Math.max(x2, e.bbox[2]); y2 = Math.max(y2, e.bbox[3]);
    }
    const z = clamp(Math.min(SAFE_W / (x2 - x1 + 80), SAFE_H / (y2 - y1 + 80)), 0.8, 1.5);
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + SAFE_SHIFT / z, z, rate: 0.065 };
  }

  step(t) {
    const g = this.target(t);
    if (!this.s) { this.s = { x: g.x, y: g.y, z: g.z }; return; }
    const s = this.s;
    s.x += (g.x - s.x) * g.rate;
    s.y += (g.y - s.y) * g.rate;
    s.z = Math.exp(Math.log(s.z) + (Math.log(g.z) - Math.log(s.z)) * g.rate);
  }

  // Frames must be asked for in order; jumping ahead simulates the frames between.
  at(t) {
    const f = Math.round(t / this.dt);
    if (f < this.frame) { this.frame = -1; this.s = null; }
    while (this.frame < f) { this.frame++; this.step(this.frame * this.dt); }
    const { x, y, z } = this.s;
    let punch = 0;
    for (const p of this.film.punches) punch += p.a * ease.out(inv(p.t - 0.08, p.t, t)) * (1 - ease.inOut(inv(p.t, p.t + 0.6, t)));
    return {
      x: x + Math.sin(t * 0.71) * 5 + Math.sin(t * 1.33) * 2,
      y: y + Math.cos(t * 0.57) * 5,
      z: z * (1 + punch) * (1 + Math.sin(t * 0.45) * 0.004),
      r: Math.sin(t * 0.37) * 0.004,
    };
  }
}

export function makeTimeline(words, { lead, gap, cuts }) {
  const vt = (tv) => lead + tv + gap * cuts.filter((c) => c <= tv).length;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  const W = words.map((w) => ({ n: norm(w.w), s: vt(w.s), e: vt(w.e) }));

  // Finds a phrase in the transcript at or after `from` (video seconds).
  function P(phrase, from = 0) {
    const toks = phrase.split(/\s+/).map(norm);
    for (let i = 0; i + toks.length <= W.length; i++) {
      if (W[i].s < from - 1e-6) continue;
      if (toks.every((tk, k) => W[i + k].n === tk)) return { s: W[i].s, e: W[i + toks.length - 1].e };
    }
    throw new Error(`phrase not found: "${phrase}" after ${from}`);
  }
  return { vt, W, P };
}

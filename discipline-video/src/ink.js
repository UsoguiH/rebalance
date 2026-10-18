// Drawable elements. Each one is "written" between t0 and t1 and stays on the page
// afterwards. tip(t) returns the world point where the pen is while it is being drawn.

import { Path2D } from '@napi-rs/canvas';
import { clamp, ease, inv, noise2 } from './util.js';

export const INK = '#1d1c1a';
export const GREY = '#8c857c';
export const ACCENT = '#e4572e';

const PEN_LIFT = 26; // virtual length between strokes, so the pen "lifts" briefly

let seedCounter = 11;

class Base {
  constructor(t0, t1, o = {}) {
    this.t0 = t0;
    this.t1 = Math.max(t1, t0 + 0.05);
    this.alpha = o.alpha ?? 1;
    this.fade = o.fade; // [a, b]: fade out between a and b
    this.fadeTo = o.fadeTo ?? 0; // alpha multiplier the fade ends at
    this.ease = o.ease ?? ease.sine;
    this.seed = seedCounter++;
    this.sound = o.sound ?? 'pencil';
  }
  progress(t) { return this.ease(inv(this.t0, this.t1, t)); }
  visible(t) { return t >= this.t0 && this.alphaAt(t) > 0.003; }
  alphaAt(t) { return this.alpha * (this.fade ? 1 - (1 - this.fadeTo) * ease.inOut(inv(this.fade[0], this.fade[1], t)) : 1); }
  active(t) { return t >= this.t0 && t < this.t1; }
}

export class Strokes extends Base {
  constructor(strokes, t0, t1, o = {}) {
    super(t0, t1, o);
    this.strokes = strokes.filter((s) => s.length > 1);
    this.w = o.w ?? 6;
    this.color = o.color ?? INK;
    this.boil = o.boil ?? 1.3;
    this.lens = this.strokes.map((pts) => {
      const cl = [0];
      for (let i = 1; i < pts.length; i++) cl.push(cl[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return cl;
    });
    this.total = this.lens.reduce((a, cl) => a + cl[cl.length - 1], 0) + PEN_LIFT * (this.strokes.length - 1);
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const pts of this.strokes) for (const [x, y] of pts) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    this.bbox = [x1 - this.w, y1 - this.w, x2 + this.w, y2 + this.w];
    this.cache = { step: -1, pts: null };
  }

  jittered(step) {
    if (this.cache.step === step) return this.cache.pts;
    const b = this.boil, k = step * 7.13 + this.seed * 3.1;
    const pts = this.strokes.map((s) => s.map(([x, y]) => [
      x + (noise2(x * 0.017 + k, y * 0.017) - 0.5) * 2 * b,
      y + (noise2(x * 0.017 - k, y * 0.017 + 40) - 0.5) * 2 * b,
    ]));
    this.cache = { step, pts };
    return pts;
  }

  // Walks the strokes and calls fn(strokeIndex, length drawn in that stroke).
  walk(t, fn) {
    let L = this.progress(t) * this.total;
    for (let i = 0; i < this.strokes.length && L > 0; i++) {
      const len = this.lens[i][this.lens[i].length - 1];
      fn(i, Math.min(L, len), L <= len);
      L -= len + PEN_LIFT;
    }
  }

  pointAt(i, L, pts) {
    const cl = this.lens[i];
    let j = 1;
    while (j < cl.length - 1 && cl[j] < L) j++;
    const f = clamp((L - cl[j - 1]) / (cl[j] - cl[j - 1] || 1));
    const a = pts[i][j - 1], b = pts[i][j];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, j];
  }

  draw(ctx, t, env) {
    const pts = this.jittered(env.step);
    ctx.globalAlpha = this.alphaAt(t);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    this.walk(t, (i, L) => {
      const s = pts[i], cl = this.lens[i];
      ctx.moveTo(s[0][0], s[0][1]);
      if (L >= cl[cl.length - 1]) {
        for (let j = 1; j < s.length; j++) ctx.lineTo(s[j][0], s[j][1]);
      } else {
        const [x, y, j] = this.pointAt(i, L, pts);
        for (let k = 1; k < j; k++) ctx.lineTo(s[k][0], s[k][1]);
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  tip(t) {
    if (!this.active(t)) return null;
    let tip = null;
    this.walk(t, (i, L, last) => { if (last) tip = this.pointAt(i, L, this.strokes); });
    return tip ? [tip[0], tip[1]] : null;
  }
}

export class Text extends Base {
  // align: 'center' | 'left' | 'right'. y is the baseline.
  constructor(font, str, x, y, size, t0, t1, o = {}) {
    super(t0, t1, { ease: (v) => v, ...o });
    this.color = o.color ?? INK;
    this.xform = o.xform; // t -> { s } scale about the text centre
    this.rot = o.rot ?? 0;
    const width = font.getAdvanceWidth(str, size);
    const align = o.align ?? 'center';
    const x0 = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    this.glyphs = [];
    let weight = 0;
    font.forEachGlyph(str, x0, y, size, { kerning: true }, (g, gx, gy, fs) => {
      const p = g.getPath(gx, gy, fs);
      const bb = p.getBoundingBox();
      if (!(bb.x2 > bb.x1)) { weight += size * 0.22; return; }
      const w = bb.x2 - bb.x1 + size * 0.1;
      this.glyphs.push({ path: new Path2D(p.toPathData(2)), x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2, w0: weight, w });
      weight += w;
    });
    this.weight = weight;
    const g = this.glyphs;
    this.bbox = [Math.min(...g.map((v) => v.x1)), Math.min(...g.map((v) => v.y1)), Math.max(...g.map((v) => v.x2)), Math.max(...g.map((v) => v.y2))];
    this.width = this.bbox[2] - this.bbox[0];
    this.cx = (this.bbox[0] + this.bbox[2]) / 2;
    this.cy = (this.bbox[1] + this.bbox[3]) / 2;
  }

  glyphProgress(g, t) {
    const W = this.progress(t) * this.weight;
    return clamp((W - g.w0) / g.w);
  }

  draw(ctx, t, env) {
    const a = this.alphaAt(t);
    ctx.save();
    const k = env.step * 5.3 + this.seed;
    const dx = (noise2(k, 1.5) - 0.5) * 1.8, dy = (noise2(k, 7.5) - 0.5) * 1.8;
    const s = this.xform ? this.xform(t).s : 1;
    ctx.translate(this.cx + dx, this.cy + dy);
    ctx.rotate(this.rot + (noise2(k, 13.5) - 0.5) * 0.006);
    ctx.scale(s, s);
    ctx.translate(-this.cx, -this.cy);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    for (const g of this.glyphs) {
      const q = this.glyphProgress(g, t);
      if (q <= 0) break;
      if (q >= 1) { ctx.fill(g.path); continue; }
      const h = g.y2 - g.y1, sl = h * 0.22;
      const xe = g.x1 - sl + (g.x2 - g.x1 + 2 * sl) * q;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.x1 - 10, g.y1 - 10);
      ctx.lineTo(xe + sl, g.y1 - 10);
      ctx.lineTo(xe - sl, g.y2 + 10);
      ctx.lineTo(g.x1 - 10, g.y2 + 10);
      ctx.closePath();
      ctx.clip();
      ctx.fill(g.path);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  tip(t) {
    if (!this.active(t)) return null;
    for (const g of this.glyphs) {
      const q = this.glyphProgress(g, t);
      if (q < 1) {
        const x = g.x1 + (g.x2 - g.x1) * q;
        const y = g.y1 + (0.5 + 0.4 * Math.sin(t * 34 + g.x1)) * (g.y2 - g.y1);
        return [x, y];
      }
    }
    return null;
  }
}

// Anything with bespoke animation: draw(ctx, t, env) and optional tip(t).
export class Custom extends Base {
  constructor(t0, t1, bbox, draw, o = {}) {
    super(t0, t1, o);
    this.bbox = bbox;
    this.drawFn = draw;
    this.tipFn = o.tip;
    this.until = o.until ?? Infinity;
  }
  visible(t) { return t >= this.t0 && t < this.until && this.alphaAt(t) > 0.003; }
  draw(ctx, t, env) { ctx.globalAlpha = this.alphaAt(t); this.drawFn(ctx, t, env, this); ctx.globalAlpha = 1; }
  tip(t) { return this.tipFn && this.active(t) ? this.tipFn(t) : null; }
}

// Draws a static set of strokes (with boil) at an arbitrary transform.
export function drawStrokesAt(ctx, strokes, step, seed, { w = 6, color = INK, boil = 1.2 } = {}) {
  const k = step * 7.13 + seed * 3.1;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const s of strokes) {
    s.forEach(([x, y], i) => {
      const jx = x + (noise2(x * 0.03 + k, y * 0.03) - 0.5) * 2 * boil;
      const jy = y + (noise2(x * 0.03 - k, y * 0.03 + 40) - 0.5) * 2 * boil;
      i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy);
    });
  }
  ctx.stroke();
}

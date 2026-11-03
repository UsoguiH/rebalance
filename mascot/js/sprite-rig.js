// sprite-rig.js: animates the ORIGINAL drawings from the reference sheet.
//
// Nothing here redraws the teacher. Each pose is the artwork cut out of the sheet
// (mascot/art/poseNN.png). It is laid on a fine triangle mesh (a 4 px grid) and bent by
// "deformers", the way Rive / Spine / Live2D rig a painted character:
//
//   pupils, mouth, brows, hands, props   small local deformers (move first)
//   face slide (2.5D head turn)          the features slide inside the head outline
//   head                                 turns and bobs about the neck, the afro squashes
//   body                                 leans and breathes about the hips
//   root                                 squash & stretch about the floor, jumps
//
// Each deformer has a soft weight map over the drawing, so bending never tears or
// leaves a seam. Blinks: an eyes-closed copy of the same drawing is made at load time
// (skin colour sampled from just above each eye); the shader reveals it top-down
// inside each eye like a lid, so the blink deforms with the mesh.
(function (root) {
  'use strict';
  const { clamp } = root.Motion;
  const GRID = 4;
  const TEX = 512; // every pose fits a 512² texture (mipmaps need power-of-two in WebGL1)

  // ── weight maps (rest coordinates, sprite px) ─────────────────────────────
  function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  const Wt = {
    all: () => () => 1,
    /** 1 above y0, 0 below y1 (y grows down). */
    above: (y0, y1) => (x, y) => 1 - smooth(y0, y1, y),
    /** 1 below y0, 0 above y1. */
    below: (y0, y1) => (x, y) => smooth(y1, y0, y),
    circle: (cx, cy, r0, r1) => (x, y) => 1 - smooth(r0, r1, Math.hypot(x - cx, y - cy)),
    ellipse: (cx, cy, rx, ry, f) => (x, y) => 1 - smooth(1, 1 + f, Math.hypot((x - cx) / rx, (y - cy) / ry)),
    /** A limb from a (pivot) to b (tip), radius r: full weight past the first quarter. */
    capsule: (ax, ay, bx, by, r, feather, ramp) => (x, y) => {
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
      const t = ((x - ax) * vx + (y - ay) * vy) / L2;
      const tc = clamp(t, 0, 1);
      const d = Math.hypot(x - (ax + vx * tc), y - (ay + vy * tc));
      return smooth(-0.02, ramp == null ? 0.3 : ramp, t) * (1 - smooth(r, r + feather, d)) * (t > 1.15 ? 1 - smooth(1.15, 1.4, t) : 1);
    },
    /** A limb along a polyline [pivot, joint, …, tip]: ramps in along the first segment only. */
    poly: (pts, r, feather, ramp) => (x, y) => {
      let best = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
        const t = ((x - ax) * vx + (y - ay) * vy) / L2, tc = clamp(t, 0, 1);
        const d = Math.hypot(x - (ax + vx * tc), y - (ay + vy * tc));
        let w = 1 - smooth(r, r + feather, d);
        if (i === 0) w *= smooth(-0.02, ramp == null ? 0.3 : ramp, t);
        if (i === pts.length - 2 && t > 1) w *= 1 - smooth(1.05, 1.3, t);
        best = Math.max(best, w);
      }
      return best;
    },
    mul: (...fs) => (x, y) => fs.reduce((a, f) => a * f(x, y), 1),
  };

  // ── loading ───────────────────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }

  /** The eyes-closed copy: each eye white filled with the skin just above it, plus a lash line. */
  function makeClosed(img, eyes, lash) {
    const c = document.createElement('canvas'); c.width = TEX; c.height = TEX;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, img.width, img.height).data;
    const at = (x, y) => { const i = (Math.round(y) * img.width + Math.round(x)) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
    for (const [cx, cy, rx, ry] of eyes) {
      const samples = [];
      for (let a = -150; a <= -30; a += 6) {
        for (const k of [1.18, 1.3, 1.42]) {
          const p = at(cx + Math.cos(a * Math.PI / 180) * rx * k, cy + Math.sin(a * Math.PI / 180) * ry * k);
          if (p[3] > 250 && p[0] > 150 && p[0] > p[1] && p[1] > p[2]) samples.push(p);
        }
      }
      samples.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]));
      const m = samples[Math.floor(samples.length / 2)] || [246, 168, 112];
      g.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`;
      g.beginPath(); g.ellipse(cx, cy, rx + 1.6, ry + 1.6, 0, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(cx - rx * 0.78, cy + ry * 0.12);
      g.quadraticCurveTo(cx, cy + ry * (0.12 + 0.42 * (lash == null ? 1 : lash)), cx + rx * 0.78, cy + ry * 0.12);
      g.lineWidth = 3.2; g.lineCap = 'round'; g.strokeStyle = '#24160f'; g.stroke();
    }
    return c;
  }

  // ── WebGL: one shared context renders every character, then each canvas copies it ──
  const VS = `
    attribute vec2 aPos; attribute vec2 aUV;
    uniform vec4 uView; // scale x, scale y, offset x, offset y  (px → clip)
    varying vec2 vUV;
    void main() { vUV = aUV; gl_Position = vec4(aPos.x * uView.x + uView.z, aPos.y * uView.y + uView.w, 0.0, 1.0); }`;
  const FS = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uTex; uniform sampler2D uClosed;
    uniform vec4 uEyeA; uniform vec4 uEyeB; uniform float uLid; uniform float uAlpha;
    float lidMask(vec4 e, out float edge) {
      edge = 0.0;
      if (e.z <= 0.0) return 0.0;
      vec2 d = (vUV - e.xy) / (e.zw * 1.13);
      float r = length(d);
      float inside = 1.0 - smoothstep(0.96, 1.04, r);
      float line = -1.05 + 2.1 * uLid;           // the lid's edge travels down the eye
      float m = (1.0 - smoothstep(line - 0.04, line + 0.04, d.y)) * inside;
      edge = inside * (1.0 - smoothstep(0.0, 0.11, abs(d.y - line))) * step(0.04, uLid) * step(uLid, 0.94);
      return m;
    }
    void main() {
      vec4 c = texture2D(uTex, vUV);
      float ea, eb;
      float m = max(lidMask(uEyeA, ea), lidMask(uEyeB, eb));
      c = mix(c, texture2D(uClosed, vUV), m);
      c.rgb = mix(c.rgb, vec3(0.42, 0.24, 0.15) * c.a, max(ea, eb) * 0.75);
      gl_FragColor = c * uAlpha;
    }`;

  let G = null;
  function gl() {
    if (G) return G;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!ctx) throw new Error('WebGL is not available');
    const sh = (type, src) => { const s = ctx.createShader(type); ctx.shaderSource(s, src); ctx.compileShader(s); if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(s)); return s; };
    const prog = ctx.createProgram();
    ctx.attachShader(prog, sh(ctx.VERTEX_SHADER, VS)); ctx.attachShader(prog, sh(ctx.FRAGMENT_SHADER, FS));
    ctx.linkProgram(prog); ctx.useProgram(prog);
    const loc = (n) => ctx.getUniformLocation(prog, n);
    G = {
      canvas, ctx, prog,
      aPos: ctx.getAttribLocation(prog, 'aPos'), aUV: ctx.getAttribLocation(prog, 'aUV'),
      uView: loc('uView'), uTex: loc('uTex'), uClosed: loc('uClosed'), uEyeA: loc('uEyeA'), uEyeB: loc('uEyeB'), uLid: loc('uLid'), uAlpha: loc('uAlpha'),
    };
    ctx.uniform1i(G.uTex, 0); ctx.uniform1i(G.uClosed, 1);
    ctx.enable(ctx.BLEND); ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
    return G;
  }
  function texture(src) {
    const { ctx } = gl();
    const t = ctx.createTexture();
    ctx.bindTexture(ctx.TEXTURE_2D, t);
    ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (src.width === TEX && src.height === TEX) {
      ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, src);
    } else {
      const c = document.createElement('canvas'); c.width = TEX; c.height = TEX;
      c.getContext('2d').drawImage(src, 0, 0);
      ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, c);
    }
    ctx.generateMipmap(ctx.TEXTURE_2D);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    return t;
  }

  /**
   * Build a rig: the mesh, the weight of every deformer at every vertex, the textures.
   * `def.deformers` is an ordered list (local first, root last) of
   *   { id, pivot: [x, y], weight: (x, y) => 0..1 }.
   */
  async function build(def, base) {
    const img = await loadImage(base + def.file);
    const w = img.width, h = img.height;
    // keep only cells that hold some of the drawing (plus a margin for deformation)
    const probe = document.createElement('canvas'); probe.width = w; probe.height = h;
    const pg = probe.getContext('2d'); pg.drawImage(img, 0, 0);
    const alpha = pg.getImageData(0, 0, w, h).data;
    const nx = Math.ceil(w / GRID) + 1, ny = Math.ceil(h / GRID) + 1;
    const filled = new Uint8Array((nx - 1) * (ny - 1));
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let any = 0;
      for (let y = j * GRID - 3; y < (j + 1) * GRID + 3 && !any; y += 2) for (let x = i * GRID - 3; x < (i + 1) * GRID + 3; x += 2) {
        if (x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * 4 + 3] > 2) { any = 1; break; }
      }
      filled[j * (nx - 1) + i] = any;
    }
    const rest = new Float32Array(nx * ny * 2), uv = new Float32Array(nx * ny * 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 2;
      rest[k] = i * GRID; rest[k + 1] = j * GRID;
      uv[k] = (i * GRID) / TEX; uv[k + 1] = (j * GRID) / TEX;
    }
    const idx = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (!filled[j * (nx - 1) + i]) continue;
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const n = nx * ny;
    const weights = def.deformers.map((dfm) => {
      const wa = new Float32Array(n);
      for (let v = 0; v < n; v++) wa[v] = dfm.weight(rest[v * 2], rest[v * 2 + 1]);
      return wa;
    });
    const eyes = def.eyes || [];
    const closed = eyes.length ? makeClosed(img, eyes, def.lash) : null;
    const { ctx } = gl();
    const vb = ctx.createBuffer(), ub = ctx.createBuffer(), ib = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, ub); ctx.bufferData(ctx.ARRAY_BUFFER, uv, ctx.STATIC_DRAW);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vb); ctx.bufferData(ctx.ARRAY_BUFFER, rest.byteLength, ctx.DYNAMIC_DRAW);
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, ib); ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), ctx.STATIC_DRAW);
    if (n > 65535) throw new Error('mesh too large');
    return {
      def, w, h, n, rest, weights, pos: new Float32Array(rest.length), count: idx.length,
      vb, ub, ib, tex: texture(img), closedTex: closed ? texture(closed) : null, img,
      eyeUV: eyes.map(([cx, cy, rx, ry]) => [cx / TEX, cy / TEX, rx / TEX, ry / TEX]),
    };
  }

  /** The matrix of one deformer from its params {rot, tx, ty, sx, sy}. */
  function mat(p, pivot) {
    const a = ((p.rot || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const sx = p.sx == null ? 1 : p.sx, sy = p.sy == null ? 1 : p.sy;
    // p' = pivot + R·S·(p − pivot) + T
    const m00 = c * sx, m01 = -s * sy, m10 = s * sx, m11 = c * sy;
    const tx = pivot[0] + (p.tx || 0) - (m00 * pivot[0] + m01 * pivot[1]);
    const ty = pivot[1] + (p.ty || 0) - (m10 * pivot[0] + m11 * pivot[1]);
    return [m00, m01, m10, m11, tx, ty];
  }

  /** Bend the mesh for this frame. `params[id]` holds each deformer's transform. */
  function deform(rig, params) {
    const { rest, pos, n, weights, def } = rig;
    pos.set(rest);
    def.deformers.forEach((dfm, k) => {
      const p = params[dfm.id];
      if (!p) return;
      const M = mat(p, dfm.pivot);
      const wa = weights[k];
      for (let v = 0; v < n; v++) {
        const wv = wa[v];
        if (wv < 0.001) continue;
        const x = pos[v * 2], y = pos[v * 2 + 1];
        const X = M[0] * x + M[1] * y + M[4], Y = M[2] * x + M[3] * y + M[5];
        pos[v * 2] = x + (X - x) * wv;
        pos[v * 2 + 1] = y + (Y - y) * wv;
      }
    });
  }
  /** Where a rest point lands after the same deformation (for effects that ride the art). */
  function warpPoint(rig, params, x, y) {
    const { def } = rig;
    def.deformers.forEach((dfm) => {
      const p = params[dfm.id];
      if (!p) return;
      const wv = dfm.weight(x, y);
      if (wv < 0.001) return;
      const M = mat(p, dfm.pivot);
      const X = M[0] * x + M[1] * y + M[4], Y = M[2] * x + M[3] * y + M[5];
      x += (X - x) * wv; y += (Y - y) * wv;
    });
    return [x, y];
  }

  /**
   * Draw the deformed drawing into a 2D canvas context. `view` maps sprite px to that
   * canvas's pixels: canvas = (sprite − anchor) · scale + origin.
   */
  function render(ctx2d, rig, params, view, lid, alpha) {
    deform(rig, params);
    const g = gl(), c = g.ctx;
    const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
    // the shared canvas only grows; each drawing uses its top-left W × H corner
    if (g.canvas.width < W || g.canvas.height < H) {
      g.canvas.width = Math.max(g.canvas.width, W); g.canvas.height = Math.max(g.canvas.height, H);
    }
    const GH = g.canvas.height;
    c.viewport(0, GH - H, W, H);
    c.enable(c.SCISSOR_TEST); c.scissor(0, GH - H, W, H);
    c.clearColor(0, 0, 0, 0); c.clear(c.COLOR_BUFFER_BIT);
    // sprite px → canvas px → clip space
    const sx = view.scale, ox = view.ox - view.ax * sx, oy = view.oy - view.ay * sx;
    c.uniform4f(g.uView, (2 * sx) / W, (-2 * sx) / H, (2 * ox) / W - 1, 1 - (2 * oy) / H);
    c.uniform1f(g.uLid, clamp(lid || 0, 0, 1));
    c.uniform1f(g.uAlpha, alpha == null ? 1 : alpha);
    const e = rig.eyeUV;
    c.uniform4f(g.uEyeA, ...(e[0] || [0, 0, 0, 0]));
    c.uniform4f(g.uEyeB, ...(e[1] || [0, 0, 0, 0]));
    c.activeTexture(c.TEXTURE0); c.bindTexture(c.TEXTURE_2D, rig.tex);
    c.activeTexture(c.TEXTURE1); c.bindTexture(c.TEXTURE_2D, rig.closedTex || rig.tex);
    c.bindBuffer(c.ARRAY_BUFFER, rig.vb); c.bufferSubData(c.ARRAY_BUFFER, 0, rig.pos);
    c.enableVertexAttribArray(g.aPos); c.vertexAttribPointer(g.aPos, 2, c.FLOAT, false, 0, 0);
    c.bindBuffer(c.ARRAY_BUFFER, rig.ub);
    c.enableVertexAttribArray(g.aUV); c.vertexAttribPointer(g.aUV, 2, c.FLOAT, false, 0, 0);
    c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, rig.ib);
    c.drawElements(c.TRIANGLES, rig.count, c.UNSIGNED_SHORT, 0);
    ctx2d.drawImage(g.canvas, 0, 0, W, H, 0, 0, W, H);
  }

  root.SpriteRig = { Wt, build, render, warpPoint, deform };
})(window);

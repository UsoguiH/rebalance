import React, { useEffect, useState } from "react";
import { continueRender, delayRender, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, prog, rand } from "../motion";
import { useTheme } from "../theme";

type Pt = { x: number; y: number; c: string };

/** Sample the opaque pixels of an image into target points (done once, before rendering). */
const useLogoPoints = (src: string, width: number, step: number, forceColor?: string) => {
  const [pts, setPts] = useState<{ pts: Pt[]; w: number; h: number } | null>(null);
  const [handle] = useState(() => delayRender(`sample ${src}`));
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = Math.round(width);
      const h = Math.round((img.naturalHeight / img.naturalWidth) * w) || w;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const out: Pt[] = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 120) out.push({ x, y, c: forceColor ?? `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
        }
      }
      setPts({ pts: out, w, h });
      continueRender(handle);
    };
    img.onerror = () => { setPts({ pts: [], w: 1, h: 1 }); continueRender(handle); };
    img.src = /^https?:/.test(src) ? src : staticFile(src);
  }, [src, width, step, forceColor, handle]);
  return pts;
};

/**
 * The logo assembles from a swirl of particles, then resolves into the crisp logo file.
 * start/assemble in frames; `disperseAt` (frames) blows it apart again (optional).
 */
export const ParticleLogo: React.FC<{
  src: string;
  width?: number; // logo width in px at 1080 short side
  step?: number; // sampling grid in px (smaller = more particles)
  start?: number;
  assemble?: number; // frames to come together
  color?: string; // force one colour (e.g. brand fg for white logos)
  invert?: boolean; // white logo on light video: draw particles + logo in fg colour
  disperseAt?: number;
}> = ({ src, width = 520, step = 6, start = 0, assemble = 42, color, invert, disperseAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const W = width * t.u;
  const force = color ?? (invert ? t.colors.fg : undefined);
  const data = useLogoPoints(src, W, Math.max(3, step * t.u), force);
  if (!data) return null;
  const { pts, w, h } = data;
  const resolve = prog(frame, start + assemble - 6, 14, ease.inOut); // crossfade to the real logo
  const out = disperseAt !== undefined ? prog(frame, disperseAt, 24, ease.in) : 0;
  const r = Math.max(1.2, step * t.u * 0.42);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - resolve * (1 - out) }}>
        {pts.map((p, i) => {
          const a = rand(i * 7.1) * Math.PI * 2;
          const dist = (0.6 + rand(i * 3.3) * 1.2) * Math.max(t.W, t.H) * 0.55;
          const sx = w / 2 + Math.cos(a) * dist;
          const sy = h / 2 + Math.sin(a) * dist;
          const delay = start + rand(i * 1.7) * assemble * 0.45;
          const k = prog(frame, delay, assemble * 0.6, ease.out);
          const swirl = (1 - k) * 2.2; // spiral in
          const cx = w / 2 + (sx - w / 2) * (1 - k);
          const cy = h / 2 + (sy - h / 2) * (1 - k);
          const x0 = cx + (p.x - w / 2) * k;
          const y0 = cy + (p.y - h / 2) * k;
          const rx = w / 2 + (x0 - w / 2) * Math.cos(swirl) - (y0 - h / 2) * Math.sin(swirl);
          const ry = h / 2 + (x0 - w / 2) * Math.sin(swirl) + (y0 - h / 2) * Math.cos(swirl);
          const ob = out > 0 ? { x: (rand(i + 11) - 0.5) * t.W * out * 1.4, y: (rand(i + 13) - 0.6) * t.H * out * 1.2 } : { x: 0, y: 0 };
          return <circle key={i} cx={rx + ob.x} cy={ry + ob.y} r={r * (0.6 + 0.4 * k)} fill={p.c} opacity={Math.min(1, k * 1.5) * (1 - out)} />;
        })}
      </svg>
      <Img src={/^https?:/.test(src) ? src : staticFile(src)} style={{ position: "absolute", inset: 0, width: w, height: h, opacity: resolve * (1 - out),
        filter: invert ? "brightness(0)" : undefined }} />
    </div>
  );
};

/** Confetti / spark burst from a point (x, y in px of the parent), brand colours, real gravity. */
export const Burst: React.FC<{ at: number; x: number; y: number; count?: number; power?: number; colors?: string[] }> = ({
  at, x, y, count = 70, power = 1, colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const f = frame - at;
  if (f < 0 || f > fps * 2.2) return null;
  const cols = colors ?? [t.colors.accent, t.colors.accent2 ?? "#F2B45A", "#FF7AB6", "#7AA7FF", "#48D597"];
  const sec = f / fps;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i * 2.3) * Math.PI * 2;
        const v = (500 + rand(i * 5.1) * 900) * power * t.u;
        const drag = Math.exp(-sec * 1.6);
        const px = x + Math.cos(a) * v * (1 - drag) / 1.6;
        const py = y + Math.sin(a) * v * (1 - drag) / 1.6 + 900 * t.u * sec * sec * 0.5;
        const rot = sec * (rand(i) - 0.5) * 1400;
        const s = (6 + rand(i * 9.7) * 10) * t.u;
        const o = Math.max(0, 1 - sec / 2.2);
        return i % 3 === 0
          ? <circle key={i} cx={px} cy={py} r={s * 0.4} fill={cols[i % cols.length]} opacity={o} />
          : <rect key={i} x={px - s / 2} y={py - s / 4} width={s} height={s / 2} rx={s / 8} fill={cols[i % cols.length]} opacity={o}
              transform={`rotate(${rot} ${px} ${py})`} />;
      })}
    </svg>
  );
};

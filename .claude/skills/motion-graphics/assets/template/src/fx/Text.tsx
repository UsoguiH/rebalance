import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop, prog, rand } from "../motion";
import { useTheme } from "../theme";

export type CharStyle = "flip3d" | "rise" | "blurIn" | "scramble" | "slam" | "cascade" | "shine";

const clean = (w: string) => w.replace(/[.,!?;:"'“”،؟]/g, "").toLowerCase();
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";

/**
 * Premium headline animation, letter by letter.
 *  flip3d   letters swing up from behind a hinge in 3D (depth + blur)
 *  rise     letters spring up through a mask, staggered
 *  blurIn   letters sharpen out of a soft blur while tracking in
 *  scramble letters decode from random glyphs (tech / AI feel)
 *  slam     each word drops in big and lands with a small camera shake
 *  cascade  letters fall in from above with rotation, like tiles
 *  shine    whole line appears, then a light sweeps through it
 * Arabic (brand.rtl) is animated per word automatically: splitting letters breaks joined script.
 */
export const CharText: React.FC<{
  lines: string[];
  style?: CharStyle;
  highlight?: string[];
  size?: number;
  weight?: number;
  font?: "display" | "body";
  color?: string;
  delay?: number; // frames
  stagger?: number; // frames per letter
  lineGap?: number; // extra frames between lines
  gradientHighlight?: boolean; // highlighted words get an accent gradient fill
  align?: "center" | "start";
}> = ({ lines, style = "flip3d", highlight = [], size = 120, weight = 700, font = "display", color, delay = 0, stagger = 1.2,
  lineGap = 6, gradientHighlight = true, align = "center" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const hl = new Set(highlight.map(clean));
  const px = size * t.u;
  let k = 0;
  const shake = style === "slam" ? slamShake(frame, lines, delay, stagger) : 0;
  return (
    <div style={{
      direction: t.dir, textAlign: align === "center" ? "center" : t.rtl ? "right" : "left", fontFamily: font === "display" ? t.fonts.display : t.fonts.body,
      fontSize: px, fontWeight: weight, lineHeight: 1.05, letterSpacing: t.rtl ? 0 : "-0.025em", color: color ?? t.colors.fg,
      perspective: 900 * t.u, transform: `translate(${shake * rand(frame) * 6 * t.u}px, ${shake * rand(frame + 3) * 6 * t.u}px)`,
    }}>
      {lines.map((line, li) => {
        const lineStart = delay + li * lineGap;
        return (
          <div key={li} style={{ whiteSpace: "nowrap", position: "relative" }}>
            {line.split(/(\s+)/).map((word, wi) => {
              if (/^\s+$/.test(word)) return <span key={wi}>{" "}</span>;
              const isHl = hl.has(clean(word));
              const units = t.rtl ? [word] : Array.from(word);
              const wordStyle: React.CSSProperties = isHl && gradientHighlight
                ? { backgroundImage: `linear-gradient(100deg, ${(t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ")})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                : isHl ? { color: t.colors.accent } : {};
              return (
                <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap", transformStyle: "preserve-3d" }}>
                  {units.map((ch, ci) => {
                    const i = k++;
                    const st = lineStart + i * (t.rtl ? stagger * 3 : stagger);
                    return <Glyph key={ci} ch={ch} i={i} st={st} frame={frame} fps={fps} style={style} extra={wordStyle} px={px} />;
                  })}
                </span>
              );
            })}
            {style === "shine" && <ShineSweep frame={frame} start={lineStart + 10} />}
          </div>
        );
      })}
    </div>
  );
};

const Glyph: React.FC<{ ch: string; i: number; st: number; frame: number; fps: number; style: CharStyle; extra: React.CSSProperties; px: number }> = ({
  ch, i, st, frame, fps, style, extra, px,
}) => {
  const s = pop(frame, fps, st, { damping: 15, stiffness: 140, mass: 0.8 });
  const p = prog(frame, st, 12, ease.out);
  let tf = "";
  let op = 1;
  let blur = 0;
  let txt = ch;
  let clip: string | undefined;
  switch (style) {
    case "flip3d":
      tf = `translateY(${(1 - s) * 0.35}em) rotateX(${(1 - s) * -95}deg)`;
      op = Math.min(1, p * 1.6);
      blur = (1 - p) * px * 0.06;
      break;
    case "rise":
      tf = `translateY(${(1 - s) * 1.05}em)`;
      clip = "inset(-0.2em -0.1em 0 -0.1em)";
      break;
    case "blurIn":
      op = p;
      blur = (1 - p) * px * 0.12;
      tf = `translateX(${(1 - p) * (i % 2 ? 0.25 : -0.25)}em) scale(${1.25 - 0.25 * p})`;
      break;
    case "scramble": {
      const settle = st + 10;
      if (frame < st) op = 0;
      else if (frame < settle && ch.trim()) txt = GLYPHS[Math.floor(rand(i * 31 + Math.floor(frame / 2)) * GLYPHS.length)];
      break;
    }
    case "slam":
      tf = `scale(${1 + (1 - s) * 2.2}) translateZ(${(1 - s) * 200}px)`;
      op = frame >= st ? Math.min(1, p * 3) : 0;
      blur = (1 - p) * px * 0.05;
      break;
    case "cascade":
      tf = `translateY(${(1 - s) * -1.4}em) rotate(${(1 - s) * (rand(i) - 0.5) * 60}deg)`;
      op = Math.min(1, p * 2);
      break;
    case "shine":
      op = prog(frame, st - 4, 10);
      break;
  }
  return (
    <span style={{ display: "inline-block", transform: tf, opacity: op, filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      transformOrigin: "50% 100%", clipPath: clip, backfaceVisibility: "hidden", ...extra }}>
      {txt === " " ? " " : txt}
    </span>
  );
};

const ShineSweep: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const p = prog(frame, start, 26, ease.inOut);
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: "-10% 0", pointerEvents: "none", mixBlendMode: "overlay",
      background: `linear-gradient(105deg, transparent ${p * 140 - 35}%, rgba(255,255,255,0.95) ${p * 140 - 18}%, transparent ${p * 140}%)` }} />
  );
};

function slamShake(frame: number, lines: string[], delay: number, stagger: number) {
  // a short decaying shake each time a word lands
  let shake = 0;
  let i = 0;
  for (const line of lines) {
    for (const w of line.split(/\s+/)) {
      const land = delay + i * stagger + 6;
      const d = frame - land;
      if (d >= 0 && d < 10) shake = Math.max(shake, 1 - d / 10);
      i += w.length;
    }
  }
  return shake;
}

/** Rolling-digit counter (odometer): each digit column spins to its value with a staggered spring. */
export const Odometer: React.FC<{ value: number; prefix?: string; suffix?: string; size?: number; delay?: number; color?: string; accentSuffix?: boolean }> = ({
  value, prefix = "", suffix = "", size = 200, delay = 0, color, accentSuffix = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const txt = Math.round(value).toLocaleString("en-US");
  const px = size * t.u;
  let di = 0;
  const digits = txt.split("");
  return (
    <div style={{ direction: "ltr", display: "flex", alignItems: "baseline", fontFamily: t.fonts.display, fontWeight: 800, fontSize: px, lineHeight: 1,
      letterSpacing: "-0.04em", color: color ?? t.colors.fg, fontVariantNumeric: "tabular-nums" }}>
      {prefix && <span>{prefix}</span>}
      {digits.map((d, i) => {
        if (!/\d/.test(d)) return <span key={i}>{d}</span>;
        const n = Number(d);
        const order = digits.length - i;
        const s = pop(frame, fps, delay + order * 3, { damping: 20, stiffness: 60, mass: 1.2 });
        const spins = 1 + (order % 3); // later digits spin more, like a real counter
        const pos = s * (spins * 10 + n);
        di++;
        return (
          <span key={i} style={{ display: "inline-block", height: "1em", overflow: "hidden", position: "relative", width: "0.62em" }}>
            <span style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-(pos % 10) }em)`, textAlign: "center" }}>
              {Array.from({ length: 11 }, (_, k) => <div key={k} style={{ height: "1em" }}>{k % 10}</div>)}
            </span>
          </span>
        );
      })}
      {suffix && <span style={{ color: accentSuffix ? t.colors.accent : undefined, opacity: prog(frame, delay + di * 3 + 10, 10) }}>{suffix}</span>}
    </div>
  );
};

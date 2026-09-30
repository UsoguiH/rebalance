import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop, prog } from "../motion";
import { alpha, useTheme } from "../theme";

export type KineticProps = {
  lines: string[];
  highlight?: string[]; // words drawn in the accent color
  style?: "rise" | "blur" | "scale" | "type" | "mask";
  marker?: boolean; // highlighted words get a swiped marker behind them
  size?: number; // px at 1080 short side
  weight?: number;
  font?: "display" | "body";
  color?: string;
  align?: "center" | "start";
  delay?: number; // frames
  stagger?: number; // frames between words
  exitAt?: number; // frame at which words leave (optional)
  lineHeight?: number;
  letterSpacing?: number; // em
};

const clean = (w: string) => w.replace(/[.,!?;:"'“”،؟]/g, "").toLowerCase();

/**
 * Headline animated word by word. Words are the animation unit (never single letters)
 * so Arabic shaping and ligatures stay intact.
 */
export const KineticText: React.FC<KineticProps> = ({
  lines, highlight = [], style = "rise", marker = false, size = 96, weight = 700, font = "display",
  color, align = "center", delay = 0, stagger = 3, exitAt, lineHeight = 1.08, letterSpacing = -0.02,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const hl = new Set(highlight.map(clean));
  let idx = 0;
  const totalWords = lines.reduce((n, l) => n + l.split(/\s+/).length, 0);

  return (
    <div
      style={{
        direction: t.dir,
        textAlign: align === "center" ? "center" : t.rtl ? "right" : "left",
        fontFamily: font === "display" ? t.fonts.display : t.fonts.body,
        fontSize: size * t.u,
        fontWeight: weight,
        lineHeight,
        letterSpacing: t.rtl ? 0 : `${letterSpacing}em`,
        color: color ?? t.colors.fg,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap" }}>
          {line.split(/\s+/).map((word, wi) => {
            const i = idx++;
            const start = delay + i * stagger;
            const isHl = hl.has(clean(word));
            const s = pop(frame, fps, start, { damping: 16, stiffness: 150 });
            const p = prog(frame, start, 14, ease.out);
            const out = exitAt !== undefined ? prog(frame, exitAt + (totalWords - i) * 1.5, 10, ease.in) : 0;
            let tr = "";
            let op = 1;
            let blur = 0;
            let clip: string | undefined;
            if (style === "rise") { tr = `translateY(${(1 - s) * 0.55}em)`; op = p; }
            if (style === "blur") { op = p; blur = (1 - p) * 0.25 * size * t.u; tr = `scale(${1.08 - 0.08 * p})`; }
            if (style === "scale") { tr = `scale(${0.4 + 0.6 * s})`; op = p; }
            if (style === "type") { op = frame >= start ? 1 : 0; }
            if (style === "mask") { clip = `inset(0 0 ${(1 - p) * 100}% 0)`; tr = `translateY(${(1 - p) * 0.4}em)`; }
            tr += ` translateY(${-out * 0.6}em)`;
            op *= 1 - out;
            const mk = marker && isHl ? prog(frame, start + 6, 12, ease.inOut) : 0;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  position: "relative",
                  isolation: "isolate",
                  margin: "0 0.12em",
                  transform: tr,
                  opacity: op,
                  filter: blur ? `blur(${blur}px)` : undefined,
                  clipPath: clip,
                  color: isHl && !marker ? t.colors.accent : undefined,
                }}
              >
                {marker && isHl && (
                  <span
                    style={{
                      position: "absolute", left: "-0.08em", right: "-0.08em", top: "12%", bottom: "4%",
                      background: alpha(t.colors.accent, 0.9), borderRadius: "0.12em",
                      transform: `scaleX(${mk})`, transformOrigin: t.rtl ? "right" : "left", zIndex: -1,
                    }}
                  />
                )}
                <span style={{ position: "relative", color: marker && isHl ? "#fff" : undefined }}>{word}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

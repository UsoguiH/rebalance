// Frame-accurate versions of the Dexatel-film moves (timings measured at 0.1 s resolution).
// Used for shot-for-shot remakes; every timing is a prop in seconds from the scene start.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Sheen } from "../fx/Glow";
import { ease, pop, prog } from "../motion";
import { alpha, useTheme } from "../theme";
import type { SceneProps } from "../types";
import { parseWeights, WeightLine } from "./studio";

const file = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));
const isImg = (s: string) => /\.(svg|png|jpe?g|webp|gif)$/i.test(s);
const gradOf = (t: ReturnType<typeof useTheme>) => (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");

/** Typed prefix of a "**bold**"-marked string, keeping the markers balanced. */
const typedMarked = (text: string, n: number) => {
  let shown = "", count = 0;
  for (const part of text.split(/(\*\*)/)) {
    if (part === "**") { shown += "**"; continue; }
    const take = Math.max(0, Math.min(part.length, n - count));
    shown += part.slice(0, take);
    count += part.length;
  }
  if ((shown.match(/\*\*/g) ?? []).length % 2) shown += "**";
  return shown;
};

/** Brand-colour glow creeping in from the frame edges (the flash before a cut to white). */
export const EdgeBloom: React.FC<{ amount: number }> = ({ amount }) => {
  const t = useTheme();
  if (amount <= 0) return null;
  const c = t.colors.accent;
  return <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 ${320 * t.u * amount}px ${150 * t.u * amount}px ${alpha(c, 0.85 * amount)}` }} />;
};

// ------------------------------------------------------------------------------------------------
/**
 * FEED PILE (0.0-3.0 s of the film): full-bleed brand colour; a 3-line headline rises line by line
 * (light / bold / bold); notification cards keep piling up on the right; a dark pill's number flips.
 * props: lines [3], lineAt [s,s,s], cards [{title, meta}], startCount, every (s), ticker [], full (css bg)
 */
export const FeedPileScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const lines: string[] = props.lines ?? [];
  const lineAt: number[] = props.lineAt ?? [0, 0.25, 0.75];
  const cards: any[] = props.cards ?? [{ title: "New message" }];
  const every = (props.every ?? 0.21) * fps;
  const start = props.startCount ?? 4;
  const count = Math.min(30, start + Math.max(0, Math.floor(frame / every)));
  const ticker: string[] = props.ticker ?? [];
  const tk = ticker.length ? ticker[Math.floor(frame / ((props.tickEvery ?? 0.35) * fps)) % ticker.length] : null;
  const W = t.W, H = t.H;
  const cw = Math.min(560 * u, W * 0.27);
  return (
    <AbsoluteFill style={{ background: props.full ?? `linear-gradient(135deg, ${gradOf(t)})`, overflow: "hidden" }}>
      {/* faint outline bars, like empty message slots */}
      {[0.14, 0.24, 0.66, 0.78].map((y, i) => (
        <div key={`o${i}`} style={{ position: "absolute", left: W * (0.64 + (i % 2) * 0.08), top: H * y, width: cw * 0.9, height: 44 * u, borderRadius: 99, border: `${2 * u}px solid rgba(255,255,255,0.35)` }} />
      ))}
      {Array.from({ length: count }, (_, i) => {
        const born = i < start ? -99 : (i - start) * every;
        const s = i < start ? 1 : pop(frame - born, fps, 0, { damping: 18, stiffness: 190 });
        const c = cards[i % cards.length];
        const col = i % 3;
        const x = W * (0.6 + col * 0.075) + ((i * 37) % 40) * u;
        const y = H * (0.04 + ((i * 0.117) % 0.86));
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: cw, transform: `translateY(${(1 - s) * 30 * u}px) scale(${0.92 + 0.08 * s})`, opacity: Math.min(1, s * 1.4),
            background: "rgba(8,18,64,0.42)", backdropFilter: "blur(6px)", borderRadius: 16 * u, padding: `${12 * u}px ${16 * u}px`, color: "#fff",
            fontFamily: t.fonts.body, boxShadow: `0 ${10 * u}px ${30 * u}px rgba(0,0,0,0.12)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 * u, fontSize: 17 * u, fontWeight: 600 }}>
              <span style={{ width: 16 * u, height: 16 * u, borderRadius: 5 * u, background: "#48D597" }} />{c.title}
              <span style={{ marginLeft: "auto", fontWeight: 400, opacity: 0.7, fontSize: 15 * u }}>{c.meta ?? ""}</span>
            </div>
            <div style={{ height: 8 * u, marginTop: 10 * u, borderRadius: 4 * u, background: "rgba(255,255,255,0.22)", width: `${55 + ((i * 23) % 40)}%` }} />
          </div>
        );
      })}
      {tk && (
        <div style={{ position: "absolute", left: W * 0.47, top: H * 0.43, display: "flex", alignItems: "center", gap: 12 * u, padding: `${12 * u}px ${24 * u}px`,
          borderRadius: 99, background: "#0B1024", color: "#fff", fontFamily: t.fonts.body, fontWeight: 600, fontSize: 22 * u, zIndex: 5 }}>
          <span style={{ width: 20 * u, height: 20 * u, borderRadius: 6 * u, background: t.colors.accent2 ?? t.colors.accent }} />{tk}
        </div>
      )}
      <div style={{ position: "absolute", left: W * 0.07, top: H * 0.5, transform: "translateY(-50%)", zIndex: 6 }}>
        {lines.map((l, i) => {
          const p = prog(frame, (lineAt[i] ?? 0) * fps, 9, ease.out);
          return (
            <div key={i} style={{ overflow: "hidden", lineHeight: 1.02 }}>
              <div style={{ transform: `translateY(${(1 - p) * 105}%)` }}>
                <WeightLine line={l} size={props.size ?? 150} light={300} heavy={800} color="#fff" />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * LOCKUP ROW (5.9-8.7 s and 17.2-19.3 s): the symbol lands (optional bloom fading from the edges),
 * the wordmark slides out of it, then an optional suffix types on the same line; the row re-centres.
 * props: logo, aspect (logo w/h), markRatio, height, revealAt (s), revealDur (s), suffix, suffixAt (s), cps, bloomIn
 */
export const LockupRowScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const src = props.logo ?? t.logo;
  const h = (props.height ?? 110) * u;
  const W = h * (props.aspect ?? 5.85);
  const ratio = props.markRatio ?? 0.17;
  const land = pop(frame, fps, 0, { damping: 13, stiffness: 170 });
  const reveal = prog(frame, (props.revealAt ?? 0.8) * fps, (props.revealDur ?? 0.2) * fps, ease.inOut);
  const visW = W * (ratio + (1 - ratio) * reveal);
  const sweep = prog(frame, 3, 14, ease.inOut);
  const suffix: string = props.suffix ?? "";
  const n = Math.max(0, Math.floor((frame / fps - (props.suffixAt ?? 1.5)) * (props.cps ?? 14)));
  const bloom = props.bloomIn ? 1 - prog(frame, 3, 10, ease.out) : 0; // holds briefly, then clears
  const big = (props.markScale ?? 1.6) + (1 - (props.markScale ?? 1.6)) * reveal; // symbol starts big, settles as the name appears
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0.18 * h, transform: `scale(${(0.9 + 0.1 * land) * big})` }}>
        <div style={{ width: visW, height: h, overflow: "hidden", position: "relative" }}>
          <Img src={file(src!)} style={{ width: W, height: h, objectFit: "contain", objectPosition: "left center", filter: t.logoInvert ? "brightness(0)" : undefined }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: h, WebkitMaskImage: `url(${file(src!)})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat" }}>
            <Sheen progress={sweep} strength={0.85} />
          </div>
        </div>
        {suffix && n > 0 && (
          <span style={{ fontFamily: t.fonts.display, fontWeight: 300, fontSize: h * 1.0, color: t.colors.fg, lineHeight: 1, whiteSpace: "pre", letterSpacing: "-0.02em" }}>
            {suffix.slice(0, n)}
          </span>
        )}
      </div>
      <EdgeBloom amount={bloom} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * TYPE WALL (8.7-11.6 s): a line keeps typing (starting with its first words already there), shrinks
 * while it types, then rows of words / icons / pills fly in around it and drift sideways.
 * props: line ("**bold**"), startChars, cps, size, shrinkAt (s), shrinkTo (scale), rowsAt (s), items [], rows
 */
export const TypeWallScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const line: string = props.line ?? "";
  const plain = line.replace(/\*\*/g, "");
  const n = Math.min(plain.length, (props.startChars ?? 0) + Math.floor((frame / fps) * (props.cps ?? 17)));
  const shrink = prog(frame, (props.shrinkAt ?? 0.6) * fps, 0.3 * fps, ease.inOut);
  const scale = 1 - (1 - (props.shrinkTo ?? 0.55)) * shrink;
  const items: string[] = props.items ?? [];
  const rows = props.rows ?? 5;
  const mid = Math.floor(rows / 2);
  const rowsAt = (props.rowsAt ?? 1.5) * fps;
  const order = [mid + 1, mid - 1, mid + 2, mid - 2, mid + 3, mid - 3];
  const rowH = t.H / (rows + 0.6);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {Array.from({ length: rows }, (_, r) => {
        if (r === mid) return null;
        const k = order.indexOf(r);
        const appear = prog(frame, rowsAt + Math.max(0, k) * 2, 6, ease.out);
        if (appear <= 0) return null;
        const dir = r % 2 ? 1 : -1;
        const off = dir * (frame - rowsAt) * 1.6 * u - 300 * u;
        const seq = Array.from({ length: 16 }, (_, j) => items[(j + r * 5) % Math.max(1, items.length)]);
        return (
          <div key={r} style={{ position: "absolute", left: 0, top: (r + 0.3) * rowH, height: rowH, display: "flex", alignItems: "center", gap: 44 * u, whiteSpace: "nowrap",
            transform: `translateX(${off + (1 - appear) * dir * -120 * u}px)`, opacity: appear }}>
            {seq.map((it, j) => it && (isImg(it)
              ? <Img key={j} src={file(it)} style={{ width: 62 * u, height: 62 * u, objectFit: "contain", borderRadius: 14 * u }} />
              : it.startsWith("[")
                ? <span key={j} style={{ fontFamily: t.fonts.body, fontSize: 26 * u, padding: `${6 * u}px ${16 * u}px`, borderRadius: 99, background: alpha(t.colors.fg, 0.08), color: alpha(t.colors.fg, 0.45) }}>{it.slice(1, -1)}</span>
                : <span key={j} style={{ fontFamily: t.fonts.body, fontSize: 42 * u, color: alpha(t.colors.fg, 0.35) }}>{it}</span>))}
          </div>
        );
      })}
      <div style={{ transform: `scale(${scale})`, whiteSpace: "nowrap" }}>
        <WeightLine line={typedMarked(line, n)} size={props.size ?? 84} light={300} heavy={700} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * STATEMENT (14.4-15.8 s): a short bold line that pushes in slightly, then slants to italic right
 * before the cut (hand-off to the italic word in the next shot).
 * props: text ("**bold**"), size, skewAt (s)
 */
export const StatementScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = prog(frame, 0, 4, ease.out);
  const skewAt = props.skewAt !== undefined ? props.skewAt * fps : durationInFrames - 6;
  const skew = prog(frame, skewAt, 5, ease.inOut);
  const parts = parseWeights(props.text ?? "");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.96 + 0.04 * push}) skewX(${-12 * skew}deg)`, fontFamily: t.fonts.display, fontSize: (props.size ?? 110) * t.u, color: t.colors.fg,
        letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
        {parts.map((p, i) => <span key={i} style={{ fontWeight: p.bold ? 800 : 300 }}>{p.text}</span>)}
      </div>
    </AbsoluteFill>
  );
};

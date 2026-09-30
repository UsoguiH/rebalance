// Studio moves: reproductions of techniques studied frame by frame in professional launch films
// (Dexatel promo by Burnwe; Bohdan Martovskyi showreel 2025). All adapted to the always-light style.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../components/Cursor";
import { Media } from "../components/Media";
import { useBeat } from "../fx/beat";
import { Sheen } from "../fx/Glow";
import { Burst } from "../fx/Particles";
import { ease, lerp, pop, prog, rand } from "../motion";
import { alpha, useTheme } from "../theme";
import type { SceneProps } from "../types";

const file = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));
const isImg = (s: string) => /\.(svg|png|jpe?g|webp|gif)$/i.test(s);

/** Split "Verify **humans across** any channel" into [{text, bold}] (weight-contrast typography). */
export const parseWeights = (line: string) =>
  line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith("**") ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }));

/** One line with light/bold contrast; bold parts can take the brand gradient. */
export const WeightLine: React.FC<{ line: string; size: number; light?: number; heavy?: number; gradient?: boolean; color?: string; style?: React.CSSProperties }> = ({
  line, size, light = 300, heavy = 800, gradient = false, color, style,
}) => {
  const t = useTheme();
  const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");
  return (
    <span style={{ fontFamily: t.fonts.display, fontSize: size * t.u, letterSpacing: t.rtl ? 0 : "-0.02em", color: color ?? t.colors.fg, whiteSpace: "pre", ...style }}>
      {parseWeights(line).map((p, i) => (
        <span key={i} style={{ fontWeight: p.bold ? heavy : light,
          ...(p.bold && gradient ? { backgroundImage: `linear-gradient(95deg, ${grad})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}) }}>
          {p.text}
        </span>
      ))}
    </span>
  );
};

/** Small mono labels in the four corners (editorial frame detail from the showreel). */
const Corners: React.FC<{ labels?: string[]; color?: string }> = ({ labels, color }) => {
  const t = useTheme();
  if (!labels?.length) return null;
  const pos: React.CSSProperties[] = [{ left: 28, top: 22 }, { right: 28, top: 22 }, { left: 28, bottom: 22 }, { right: 28, bottom: 22 }];
  return (
    <>
      {labels.slice(0, 4).map((l, i) => (
        <div key={i} style={{ position: "absolute", ...Object.fromEntries(Object.entries(pos[i]).map(([k, v]) => [k, (v as number) * t.u])),
          fontFamily: "ui-monospace, Menlo, monospace", fontSize: 18 * t.u, letterSpacing: "0.08em", textTransform: "uppercase", color: color ?? t.colors.fg, opacity: 0.8 }}>{l}</div>
      ))}
    </>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * WARP TEXT (showreel intro): huge heavy type bent through lens-like warps. Each variant holds for
 * `each` seconds and hard-cuts to the next on the beat; "flip" variants swap background/text colours
 * (on a brand colour or gradient, never black).
 * props: text, variants [bulge|pinch|wave|arc|flat], each (s), font, weight, size, corners [4 labels], flipBg
 */
export const WarpTextScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text: string = props.text ?? t.name;
  const variants: string[] = props.variants ?? ["flat", "bulge", "wave", "pinch"];
  const each = Math.round((props.each ?? 0.55) * fps);
  const vi = Math.min(variants.length - 1, Math.floor(frame / each));
  const local = frame - vi * each;
  const mode = variants[vi];
  const flip = props.flip !== false && vi % 2 === 1;
  const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");
  const bg = flip ? (props.flipBg ?? `linear-gradient(120deg, ${grad})`) : "transparent";
  const fg = flip ? "#ffffff" : t.colors.fg;
  const amt = pop(local, fps, 0, { damping: 11, stiffness: 190, mass: 0.6 }); // snaps in with overshoot
  const phase = (frame / fps) * 5;
  const chars = Array.from(text);
  const n = chars.length;
  const size = (props.size ?? (t.portrait ? 230 : 260)) * t.u;
  return (
    <AbsoluteFill style={{ background: bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: props.font ? `"${props.font}", ${t.fonts.display}` : t.fonts.display,
        fontWeight: props.weight ?? 900, fontSize: size, lineHeight: 1, color: fg, letterSpacing: "-0.04em", whiteSpace: "nowrap", direction: "ltr",
        transform: `scale(${props.fit ?? (t.portrait ? Math.min(1, 7 / n) : Math.min(1, 9 / n))})` }}>
        {chars.map((ch, i) => {
          const x = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; // -1..1 across the word
          let sy = 1, sx = 1, ty = 0, rot = 0, sk = 0;
          if (mode === "bulge") { sy = 1 + 2.2 * x * x * amt; sx = 1 + 0.7 * x * x * amt; rot = -x * 10 * amt; sk = x * 18 * amt; }
          if (mode === "pinch") { sy = 1 + 1.6 * x * x * amt - 0.35 * (1 - x * x) * amt; sx = 1 + 0.4 * x * x * amt; rot = x * 12 * amt; ty = -x * x * 0.1 * amt; }
          if (mode === "wave") { ty = Math.sin(x * Math.PI + phase) * 0.28 * amt; rot = Math.cos(x * Math.PI + phase) * 16 * amt; sy = 1 + 0.35 * Math.cos(x * Math.PI * 1.3 + phase) * amt; }
          if (mode === "arc") { ty = x * x * 0.45 * amt - 0.2 * amt; rot = x * 26 * amt; sy = 1 + 0.25 * amt; }
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${ty}em) rotate(${rot}deg) skewY(${sk}deg) scale(${sx}, ${sy})`, transformOrigin: "50% 50%" }}>
              {ch === " " ? " " : ch}
            </span>
          );
        })}
      </div>
      <Corners labels={props.corners} color={fg} />
      {void durationInFrames}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * WORD SWAP (Dexatel "Fake users? → accounts? → everything"): a fixed light-weight prefix and a bold
 * word that rolls to the next option every `each` seconds; the line re-centres as the word changes.
 * Optional phone outline with skeleton UI breathing behind the text.
 * props: prefix, words [], each (s), size, phone (bool), gradientLast (bool)
 */
export const WordSwapScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words: string[] = props.words ?? ["this?", "that?", "everything"];
  const each = (props.each ?? 1.0) * fps;
  const idx = Math.min(words.length - 1, Math.floor(frame / each));
  const local = frame - idx * each;
  const roll = idx === 0 ? pop(frame, fps, 0, { damping: 16 }) : prog(local, 0, 9, ease.out);
  const size = (props.size ?? (t.portrait ? 96 : 110)) * t.u;
  const estW = (w: string) => (w.length * 0.62 + 0.25) * size; // generous width estimate for smooth re-centring
  const prevW = estW(words[Math.max(0, idx - 1)]);
  const curW = estW(words[idx]);
  const wordW = idx === 0 ? curW : lerp(prevW, curW, ease.inOut(Math.min(1, local / 10)));
  const last = idx === words.length - 1;
  const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");
  const u = t.u;
  const bloom = props.bloomAt !== undefined ? prog(frame, props.bloomAt * fps, 4, ease.in) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {bloom > 0 && <AbsoluteFill style={{ pointerEvents: "none", zIndex: 9, boxShadow: `inset 0 0 ${260 * u * bloom}px ${120 * u * bloom}px ${alpha(t.colors.accent, 0.75 * bloom)}` }} />}
      {props.phone && (
        <div style={{ position: "absolute", width: 520 * u, height: 1000 * u, borderRadius: 80 * u, border: `${6 * u}px solid ${alpha(t.colors.fg, 0.12)}`,
          top: "50%", left: "50%", transform: `translate(-50%, -42%)`, overflow: "hidden" }}>
          {Array.from({ length: 7 }, (_, i) => {
            const w = 0.35 + rand(i + idx * 7) * 0.5;
            const shimmer = prog((frame + i * 5) % 40, 0, 40, (x) => x);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 * u, margin: `${i === 0 ? 90 * u : 26 * u}px ${46 * u}px 0` }}>
                <div style={{ width: 64 * u, height: 64 * u, borderRadius: 16 * u, background: alpha(t.colors.fg, 0.06) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14 * u, width: `${w * 100}%`, borderRadius: 8 * u,
                    background: `linear-gradient(90deg, ${alpha(t.colors.fg, 0.07)} ${shimmer * 100 - 20}%, ${alpha(t.colors.accent, 0.35)} ${shimmer * 100}%, ${alpha(t.colors.fg, 0.07)} ${shimmer * 100 + 20}%)` }} />
                  <div style={{ height: 10 * u, width: `${w * 60}%`, borderRadius: 6 * u, marginTop: 10 * u, background: alpha(t.colors.fg, 0.05) }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", fontFamily: t.fonts.display, fontSize: size, lineHeight: 1.15, color: t.colors.fg, letterSpacing: "-0.02em",
        position: "relative", zIndex: 2, direction: t.dir }}>
        <span style={{ fontWeight: 300, whiteSpace: "pre", height: "1.15em", display: "inline-block" }}>{props.prefix ?? ""} </span>
        <span style={{ position: "relative", display: "inline-block", width: wordW, height: "1.15em", overflow: "hidden" }}>
          {idx > 0 && (
            <span style={{ position: "absolute", left: 0, top: 0, fontWeight: 800, whiteSpace: "nowrap", transform: `translateY(${-roll * 100}%)`, opacity: 1 - roll }}>
              {words[idx - 1]}
            </span>
          )}
          <span style={{ position: "absolute", left: 0, top: 0, fontWeight: 800, whiteSpace: "nowrap", transform: `translateY(${(1 - roll) * 100}%)`,
            ...(last && props.gradientLast !== false ? { backgroundImage: `linear-gradient(95deg, ${grad})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}) }}>
            {words[idx]}
          </span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * LOCKUP (Dexatel logo sequence): the symbol lands with a light sweep, the wordmark slides out from
 * behind it while the whole lockup re-centres, then a line types itself underneath with a caret.
 * props: logo (full lockup image), markRatio (share of width taken by the symbol, e.g. 0.17),
 *        height, type (text, **bold** allowed), typeAt (s), cps
 */
export const LockupScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const src = props.logo ?? t.logo;
  const h = (props.height ?? 130) * u;
  const ratio = props.markRatio ?? 0.17;
  const aspect = props.aspect ?? 5.85; // logo width / height
  const W = h * aspect;
  const land = pop(frame, fps, 0, { damping: 12, stiffness: 150 });
  const reveal = ease.inOut(prog(frame, props.revealAt ? props.revealAt * fps : 16, 18, (x) => x));
  const sweep = prog(frame, 6, 22, ease.inOut);
  const visible = ratio + (1 - ratio) * reveal;
  const shift = ((1 - visible) * W) / 2;
  const typeAt = (props.typeAt ?? 1.3) * fps;
  const text: string = props.type ?? "";
  const plain = text.replace(/\*\*/g, "");
  const n = Math.max(0, Math.floor(((frame - typeAt) / fps) * (props.cps ?? 26)));
  // rebuild the typed prefix keeping bold markers
  let shown = "", count = 0, bold = false;
  for (const part of text.split(/(\*\*)/)) {
    if (part === "**") { bold = !bold; shown += "**"; continue; }
    const take = Math.max(0, Math.min(part.length, n - count));
    shown += part.slice(0, take);
    count += part.length;
  }
  if ((shown.match(/\*\*/g) ?? []).length % 2) shown += "**";
  const caret = frame >= typeAt && (n < plain.length || Math.floor(frame / (fps * 0.45)) % 2 === 0);
  const up = text ? prog(frame, typeAt - 8, 14, ease.inOut) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ transform: `translateY(${-up * 70 * u}px) translateX(${t.rtl ? -shift : shift}px) scale(${0.8 + 0.2 * land})`, opacity: Math.min(1, land * 2) }}>
        <div style={{ position: "relative", width: W, height: h, clipPath: `inset(0 ${(1 - visible) * 100}% 0 0)` }}>
          <Img src={file(src!)} style={{ width: W, height: h, objectFit: "contain", filter: t.logoInvert ? "brightness(0)" : undefined }} />
          <div style={{ position: "absolute", inset: 0, WebkitMaskImage: `url(${file(src!)})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat" }}>
            <Sheen progress={sweep} strength={0.9} />
          </div>
        </div>
      </div>
      {text && frame >= typeAt - 2 && (
        <div style={{ marginTop: 10 * u, transform: `translateY(${-up * 40 * u}px)` }}>
          <WeightLine line={shown} size={props.typeSize ?? 54} gradient={props.gradient} />
          {caret && <span style={{ display: "inline-block", width: 3 * u, height: (props.typeSize ?? 54) * u, background: t.colors.accent, verticalAlign: "middle", marginInlineStart: 4 * u }} />}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * FRAME TO LOGO (Dexatel "Instantly"): a full-bleed brand-colour frame with one word; the word
 * straightens from italic, the frame shrinks into a rounded tile, and the tile becomes the logo symbol.
 * props: word, icon (symbol image), color (css bg, default brand gradient), shrinkAt (s), iconAt (s), burst
 */
export const FrameToLogoScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");
  const bg = props.color ?? `linear-gradient(135deg, ${grad})`;
  const straighten = prog(frame, 2, 12, ease.out);
  const shrinkAt = (props.shrinkAt ?? 0.75) * fps;
  const s = prog(frame, shrinkAt, (props.shrinkDur ?? 0.5) * fps, (x) => x * x * x); // accelerates like the film
  const toIcon = prog(frame, (props.iconAt ?? 1.35) * fps, 10, ease.inOut);
  const tile = Math.min(t.W, t.H) * 0.42;
  const w = lerp(t.W, tile, s) * (1 - toIcon * 0.35);
  const h = lerp(t.H, tile, s) * (1 - toIcon * 0.35);
  const r = lerp(0, tile * 0.22, s);
  const icon = props.icon ?? t.icon;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: w, height: h, borderRadius: r, background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        opacity: 1 - toIcon, boxShadow: s > 0.5 ? `0 ${30 * u}px ${70 * u}px ${alpha(t.colors.accent, 0.3)}` : undefined }}>
        <span style={{ fontFamily: t.fonts.display, fontWeight: 800, color: "#fff", fontSize: lerp(props.size ?? 130, 64, s) * u,
          transform: `skewX(${(1 - straighten) * -12}deg)`, fontStyle: "normal", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{props.word ?? "Instantly"}</span>
      </div>
      {icon && toIcon > 0 && (
        <Img src={file(icon)} style={{ position: "absolute", width: tile * 0.62, height: tile * 0.62, objectFit: "contain",
          transform: `scale(${0.6 + 0.4 * pop(frame, fps, (props.iconAt ?? 1.35) * fps, { damping: 11 })})`, opacity: toIcon }} />
      )}
      {props.burst !== false && <Burst at={(props.iconAt ?? 1.35) * fps + 2} x={t.W / 2} y={t.H / 2} count={50} power={0.8} />}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * FEED (Dexatel "Bots are getting smarter"): a weight-contrast headline on the left while notification
 * cards keep stacking up on the right, faster and faster, with a pill whose number keeps rolling.
 * props: lines [] (**bold** allowed), cards [{title, meta, icon?}], ticker [strings], every (s)
 */
export const FeedScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const cards: any[] = props.cards ?? [];
  const lines: string[] = props.lines ?? [];
  const every = (props.every ?? 0.22) * fps;
  const count = Math.min(24, Math.floor(frame / every) + 1);
  const ticker: string[] = props.ticker ?? [];
  const tk = ticker.length ? ticker[Math.floor(frame / (fps * 0.28)) % ticker.length] : null;
  const colX = t.portrait ? [0.08, 0.3, 0.52] : [0.56, 0.68, 0.8];
  return (
    <AbsoluteFill>
      {Array.from({ length: count }, (_, i) => {
        const c = cards[i % Math.max(1, cards.length)] ?? { title: "New message" };
        const s = pop(frame, fps, i * every, { damping: 16, stiffness: 170 });
        const col = colX[i % colX.length];
        const y = (t.portrait ? 0.52 : 0.08) + ((i * 0.137) % (t.portrait ? 0.42 : 0.82));
        const age = (frame - i * every) / fps;
        return (
          <div key={i} style={{ position: "absolute", left: `${col * 100}%`, top: `${y * 100}%`, width: 360 * u,
            transform: `translateX(${(1 - s) * 120 * u}px) scale(${0.9 + 0.1 * s})`, opacity: Math.min(1, s * 1.5) * (1 - Math.min(0.55, age * 0.12)),
            background: "#fff", borderRadius: 18 * u, padding: `${14 * u}px ${18 * u}px`, boxShadow: `0 ${14 * u}px ${34 * u}px rgba(0,0,0,0.1), 0 0 0 ${1 * u}px rgba(0,0,0,0.05)`,
            display: "flex", gap: 12 * u, alignItems: "center", fontFamily: t.fonts.body }}>
            {c.icon ? <Img src={file(c.icon)} style={{ width: 34 * u, height: 34 * u, objectFit: "contain" }} />
              : <div style={{ width: 16 * u, height: 16 * u, borderRadius: 5 * u, background: t.colors.accent }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20 * u, fontWeight: 700, color: "#111" }}>{c.title}</div>
              {c.meta && <div style={{ fontSize: 16 * u, color: "#888", marginTop: 2 * u }}>{c.meta}</div>}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: t.portrait ? "8%" : "7%", top: t.portrait ? "14%" : "50%", transform: t.portrait ? undefined : "translateY(-50%)", zIndex: 5 }}>
        {lines.map((l, i) => {
          const p = prog(frame, 4 + i * 6, 14, ease.out);
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 6 * u }}>
              <div style={{ transform: `translateY(${(1 - p) * 110}%)` }}><WeightLine line={l} size={props.size ?? (t.portrait ? 110 : 120)} /></div>
            </div>
          );
        })}
        {tk && (
          <div style={{ marginTop: 26 * u, display: "inline-flex", alignItems: "center", gap: 10 * u, padding: `${10 * u}px ${20 * u}px`, borderRadius: 999,
            background: "#111", color: "#fff", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 24 * u, opacity: prog(frame, 14, 10) }}>
            <span style={{ width: 12 * u, height: 12 * u, borderRadius: 99, background: t.colors.accent }} />{tk}
          </div>
        )}
      </div>
      {void durationInFrames}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * MARQUEE WALL (Dexatel "any channel"): the key line sits still in the middle while rows of words,
 * icons and pills slide past above and below in alternating directions.
 * props: line (**bold** allowed), items [text or image path], rows (default 5), speed
 */
export const MarqueeScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const u = t.u;
  const items: string[] = props.items ?? [];
  const rows = props.rows ?? (t.portrait ? 9 : 5);
  const mid = Math.floor(rows / 2);
  const speed = (props.speed ?? 2.2) * u;
  const appear = prog(frame, 6, 16, ease.out);
  return (
    <AbsoluteFill style={{ justifyContent: "center", overflow: "hidden" }}>
      {Array.from({ length: rows }, (_, r) => {
        if (r === mid) {
          return (
            <div key={r} style={{ height: 110 * u, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WeightLine line={props.line ?? ""} size={props.size ?? 64} />
            </div>
          );
        }
        const dir = r % 2 ? 1 : -1;
        const off = ((frame * speed * dir) % (1600 * u)) - 800 * u;
        const seq = Array.from({ length: 14 }, (_, k) => items[(k + r * 3) % Math.max(1, items.length)]);
        return (
          <div key={r} style={{ height: 110 * u, display: "flex", alignItems: "center", gap: 34 * u, whiteSpace: "nowrap",
            transform: `translateX(${off}px)`, opacity: appear * (1 - Math.abs(r - mid) * 0.12) }}>
            {seq.map((it, k) => it && (isImg(it)
              ? <Img key={k} src={file(it)} style={{ width: 64 * u, height: 64 * u, objectFit: "contain", borderRadius: 16 * u }} />
              : it.startsWith("[")
                ? <span key={k} style={{ fontFamily: t.fonts.body, fontSize: 24 * u, padding: `${6 * u}px ${16 * u}px`, borderRadius: 999, background: alpha(t.colors.fg, 0.07), color: alpha(t.colors.fg, 0.55) }}>{it.slice(1, -1)}</span>
                : <span key={k} style={{ fontFamily: t.fonts.body, fontSize: 40 * u, fontWeight: 400, color: alpha(t.colors.fg, 0.4) }}>{it}</span>))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * NOTIFY CYCLE (Dexatel phone sequence): a phone outline whose notification swaps every beat; the
 * app icon pops out over the card edge and the whole background tints to that app's colour.
 * props: items [{icon, title, body, tint}], each (s)
 */
export const NotifyCycleScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const items: any[] = props.items ?? [];
  const each = (props.each ?? 0.62) * fps;
  const i = Math.min(items.length - 1, Math.floor(frame / each));
  const local = frame - i * each;
  const it = items[i] ?? {};
  const prev = items[i - 1];
  const s = pop(local, fps, 0, { damping: 14, stiffness: 180 });
  const ic = pop(local, fps, 3, { damping: 10, stiffness: 200 });
  const tint = it.tint ?? alpha(t.colors.accent, 0.08);
  const enter = pop(frame, fps, 0, { damping: 18, stiffness: 90 });
  const PW = (props.phoneWidth ?? (t.portrait ? 0.52 : 0.24)) * t.W;
  const k = PW / (560 * u); // scale the phone's insides with its width
  return (
    <AbsoluteFill style={{ alignItems: "center", background: tint }}>
      <div style={{ position: "absolute", top: t.H * (props.phoneTop ?? 0.1), width: PW, height: PW * 2.05, borderRadius: 90 * u * k, border: `${10 * u * k}px solid ${t.colors.fg}`, background: "#fff",
        transform: `translateY(${(1 - enter) * 30}%) scale(${1})`, transformOrigin: "top center", overflow: "visible", zoom: 1 }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${k})`, transformOrigin: "top left", width: 560 * u, height: 1148 * u }}>
        <div style={{ position: "absolute", top: 26 * u, left: "50%", width: 150 * u, height: 40 * u, marginLeft: -75 * u, borderRadius: 99, background: t.colors.fg }} />
        {[0, 1].map((k) => <div key={k} style={{ position: "absolute", left: 40 * u, right: 40 * u, top: (360 + k * 110) * u, height: 80 * u, borderRadius: 24 * u, background: alpha(t.colors.fg, 0.06) }} />)}
        <div style={{ position: "absolute", left: 40 * u, right: 40 * u, top: 600 * u, display: "flex", gap: 24 * u }}>
          {[0, 1, 2, 3].map((k) => <div key={k} style={{ flex: 1, height: 90 * u, borderRadius: 26 * u, background: alpha(t.colors.fg, 0.06) }} />)}
        </div>
        {prev && local < 8 && (
          <div style={{ position: "absolute", left: 30 * u, right: 30 * u, top: 110 * u, opacity: 1 - local / 8, transform: `translateY(${-local * 4 * u}px)` }}>
            <Notif it={prev} />
          </div>
        )}
        <div style={{ position: "absolute", left: 30 * u, right: 30 * u, top: 110 * u, transform: `translateY(${(1 - s) * 40 * u}px) scale(${0.94 + 0.06 * s})`, opacity: Math.min(1, s * 1.6) }}>
          <Notif it={it} />
          {it.icon && (
            <div style={{ position: "absolute", left: -58 * u, top: 40 * u, width: 110 * u, height: 110 * u, borderRadius: 28 * u, background: "#fff",
              boxShadow: `0 ${16 * u}px ${34 * u}px rgba(0,0,0,0.16)`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ic})` }}>
              <Img src={file(it.icon)} style={{ width: "66%", height: "66%", objectFit: "contain" }} />
            </div>
          )}
        </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Notif: React.FC<{ it: any }> = ({ it }) => {
  const t = useTheme();
  const u = t.u;
  return (
    <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 30 * u, padding: `${26 * u}px ${30 * u}px ${26 * u}px ${70 * u}px`,
      boxShadow: `0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.12), 0 0 0 ${1 * u}px rgba(0,0,0,0.05)`, fontFamily: t.fonts.body, direction: t.dir }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 * u, fontWeight: 700, color: "#111" }}><span>{it.title}</span><span style={{ fontWeight: 400, color: "#aaa", fontSize: 18 * u }}>now</span></div>
      <div style={{ fontSize: 22 * u, color: "#444", marginTop: 8 * u, lineHeight: 1.35 }}>{it.body}</div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * COLLAGE (showreel #BIKELIFE): cards, stickers and labels start spread around a 3D cylinder and the
 * whole carousel whips round and flattens into a layered collage, then keeps a slow parallax drift.
 * props: items [{src? | text? | sticker?, x, y, w, rot, z}] (x/y centre offsets in px at 1080, w card width)
 */
export const CollageScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const items: any[] = props.items ?? [];
  const k = pop(frame, fps, 0, { damping: 17, stiffness: 70, mass: 1 });
  const drift = frame / fps;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1600 * u }}>
      <div style={{ position: "relative", width: 0, height: 0, transformStyle: "preserve-3d", transform: `rotateY(${(1 - k) * 110}deg) rotateX(${(1 - k) * 12}deg)` }}>
        {items.map((it, i) => {
          const a = ((i / items.length) * 360 - 60) * (1 - k); // spread on a cylinder, collapse to flat
          const R = 700 * u * (1 - k);
          const par = (1 + (it.z ?? 0) * 0.5) * drift * 8 * u;
          const tf = `rotateY(${a}deg) translateZ(${R}px) translate(${(it.x ?? 0) * u * k}px, ${(it.y ?? 0) * u * k - par}px) rotate(${(it.rot ?? 0) * k}deg) translateZ(${(it.z ?? 0) * 40 * u}px)`;
          const pw = pop(frame, fps, 14 + i * 2, { damping: 10, stiffness: 180 });
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: 0, transform: `translate(-50%, -50%) ${tf}`, transformStyle: "preserve-3d" }}>
              {it.src && (
                <div style={{ width: (it.w ?? 360) * u, aspectRatio: String(it.aspect ?? 0.8), borderRadius: 22 * u, overflow: "hidden", background: "#fff",
                  boxShadow: `0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.16)` }}>
                  <Media src={it.src} style={{ objectPosition: it.pos ?? "50% 0%" }} />
                </div>
              )}
              {it.text && <div style={{ whiteSpace: "nowrap" }}><WeightLine line={it.text} size={it.size ?? 54} gradient={it.gradient !== false} /></div>}
              {it.sticker && <div style={{ fontSize: (it.size ?? 90) * u, transform: `scale(${pw})`, filter: `drop-shadow(0 ${8 * u}px ${12 * u}px rgba(0,0,0,0.2))` }}>{it.sticker}</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * VORTEX (showreel "Smooth"): app logos spiral in from past the camera (big and blurred), settle on a
 * ring around the word, and keep orbiting; the word's letters fly in from scattered positions.
 * props: logos [paths], word, size, ring (px radius at 1080)
 */
export const VortexScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const logos: string[] = props.logos ?? [];
  const n = Math.max(1, logos.length);
  const R = (props.ring ?? (t.portrait ? 330 : 300)) * u;
  const word: string = props.word ?? "";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {logos.map((l, i) => {
        const d = pop(frame, fps, i * 2.5, { damping: 20, stiffness: 55, mass: 1 }); // 0 = at camera, 1 = on ring
        const a = (i / n) * Math.PI * 2 + (1 - d) * 3.2 + frame * 0.012;
        const rr = R * (1 + (1 - d) * 2.4);
        const z = (1 - d) * 900 * u;
        const scale = 1 + (1 - d) * 2.2;
        const blur = Math.abs(1 - d) * 14 * u;
        const tile = 108 * u;
        return (
          <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: tile, height: tile, marginLeft: -tile / 2, marginTop: -tile / 2,
            transform: `translate(${Math.cos(a) * rr}px, ${Math.sin(a) * rr * 0.9}px) scale(${scale}) rotate(${(1 - d) * 40}deg)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
            zIndex: Math.round(z), borderRadius: 26 * u, background: "rgba(255,255,255,0.85)", boxShadow: `0 ${14 * u}px ${30 * u}px rgba(0,0,0,0.12)`,
            display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, d * 3) }}>
            <Img src={file(l)} style={{ width: "58%", height: "58%", objectFit: "contain" }} />
          </div>
        );
      })}
      <div style={{ display: "flex", fontFamily: t.fonts.display, fontWeight: 800, fontSize: (props.size ?? 90) * u, letterSpacing: "-0.02em", position: "relative", zIndex: 999 }}>
        {Array.from(word).map((ch, i) => {
          const s = pop(frame, fps, 6 + i * 1.5, { damping: 14, stiffness: 120 });
          const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]);
          return (
            <span key={i} style={{ display: "inline-block", color: grad[i % grad.length],
              transform: `translate(${(1 - s) * (rand(i * 3) - 0.5) * 500 * u}px, ${(1 - s) * (rand(i * 7) - 0.5) * 300 * u}px) rotate(${(1 - s) * (rand(i) - 0.5) * 120}deg) scale(${0.6 + 0.4 * s})`,
              opacity: Math.min(1, s * 2) }}>{ch === " " ? " " : ch}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * RESIZE (showreel design-tool moment): on grid paper, a selected frame with handles is dragged
 * bigger by the cursor; its content swaps at the peak (e.g. 😐 → 🤯, or a rough card → the real app).
 * props: a, b (emoji text or image paths), from [w,h], to [w,h], swapAt (s), fill (css background)
 */
export const ResizeScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const from = props.from ?? [240, 180];
  const to = props.to ?? [t.portrait ? 760 : 900, t.portrait ? 560 : 560];
  const g = pop(frame, fps, 6, { damping: 18, stiffness: 60, mass: 1.1 });
  const w = lerp(from[0], to[0], g) * u;
  const h = lerp(from[1], to[1], g) * u;
  const swapped = frame >= (props.swapAt ?? 0.75) * fps;
  const content = swapped ? props.b : props.a;
  const cellPx = 64 * u;
  const handle = (x: number, y: number, k: number) => <div key={k} style={{ position: "absolute", left: x - 8 * u, top: y - 8 * u, width: 16 * u, height: 16 * u, background: t.colors.fg }} />;
  const cx = t.W / 2, cy = t.H / 2;
  const grow = swapped ? pop(frame, fps, (props.swapAt ?? 0.75) * fps, { damping: 9, stiffness: 220 }) : 1;
  return (
    <AbsoluteFill style={{ backgroundImage: `linear-gradient(${alpha(t.colors.fg, 0.14)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(t.colors.fg, 0.14)} 1px, transparent 1px)`,
      backgroundSize: `${cellPx}px ${cellPx}px`, backgroundPosition: "center center" }}>
      <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, overflow: "hidden",
        background: props.fill ?? `linear-gradient(135deg, ${alpha(t.colors.accent2 ?? t.colors.accent, 0.35)}, ${alpha(t.colors.accent, 0.35)})`,
        outline: `${2 * u}px solid ${t.colors.fg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {content && (isImg(content)
          ? <Media src={content} style={{ objectPosition: "50% 0%", transform: `scale(${grow})` }} />
          : <span style={{ fontSize: Math.min(w, h) * 0.5, transform: `scale(${grow})` }}>{content}</span>)}
      </div>
      {[[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2]].map(([x, y], k) => handle(x, y, k))}
      <div style={{ position: "absolute", left: cx + w / 2, top: cy + h / 2, width: 1, height: 1 }}>
        <Cursor steps={[{ t: 0, x: 0, y: 0 }]} size={46} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * TAGS DROP (showreel "Design System" pile): coloured pills fall with gravity, bounce and pile up.
 * Deterministic physics (same result every render). props: tags [{text, color}], every (s), size
 */
export const TagsDropScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const tags: { text: string; color?: string }[] = props.tags ?? [];
  const size = (props.size ?? 46) * u;
  const every = (props.every ?? 0.12) * fps;
  const palette = t.gradient ?? [t.colors.accent, t.colors.accent2 ?? "#F2B45A", "#FF66F4", "#48D597"];
  const floor = t.H * (t.portrait ? 0.72 : 0.84);
  // simulate from frame 0 to now (small N, cheap, deterministic)
  const bodies = tags.map((tg, i) => {
    const w = (tg.text.length * 0.58 + 1.4) * size;
    const x = t.W * (0.18 + rand(i * 5.3) * 0.64) - w / 2;
    return { i, w, h: size * 1.55, x, y: -size * 2 - i * 40 * u, vy: 0, rot: (rand(i * 2.1) - 0.5) * 50, vr: 0, landed: false, start: i * every, final: (rand(i * 9.7) - 0.5) * 16 };
  });
  const g = 5200 * u / (fps * fps);
  for (let f = 0; f <= frame; f++) {
    for (const b of bodies) {
      if (f < b.start) continue;
      if (b.landed) { b.rot += (b.final - b.rot) * 0.25; continue; } // resting bodies stay put
      b.vy += g;
      b.y += b.vy;
      // support = floor, or the top of any landed body overlapping horizontally
      let support = floor;
      for (const o of bodies) {
        if (o === b || !o.landed || o.y < b.y) continue; // only bodies underneath can hold this one
        if (b.x < o.x + o.w * 0.9 && b.x + b.w > o.x + o.w * 0.1) support = Math.min(support, o.y);
      }
      if (b.y + b.h > support) {
        b.y = support - b.h;
        if (Math.abs(b.vy) > 4 * u) b.vy = -b.vy * 0.32; else { b.vy = 0; b.landed = true; }
      }
      b.rot += (b.final - b.rot) * 0.04;
    }
  }
  return (
    <AbsoluteFill>
      {bodies.map((b) => frame >= b.start && (
        <div key={b.i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.h * 0.3,
          background: tags[b.i].color ?? palette[b.i % palette.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: t.fonts.body, fontWeight: 600, fontSize: size, transform: `rotate(${b.rot}deg)`, boxShadow: `0 ${10 * u}px ${24 * u}px rgba(0,0,0,0.14)`, whiteSpace: "nowrap" }}>
          {tags[b.i].text}
        </div>
      ))}
      {props.lines && (
        <div style={{ position: "absolute", top: t.H * (t.portrait ? 0.16 : 0.12), left: 0, right: 0, textAlign: "center" }}>
          {(props.lines as string[]).map((l, i) => <div key={i}><WeightLine line={l} size={props.titleSize ?? 96} gradient /></div>)}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * WAVEFORM (showreel VAPI): the logo sits in the middle while dotted, multi-colour audio bars pulse
 * out to both sides on the beat (voice / AI / audio products).
 * props: logo, bars (per side), height
 */
export const WaveformScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const beat = useBeat(1, 0.2);
  const bars = props.bars ?? 22;
  const H = (props.height ?? 360) * u;
  const cols = t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent];
  const open = prog(frame, 4, 18, ease.out);
  const logo = props.logo ?? t.logo;
  const side = (dir: number) => (
    <div style={{ display: "flex", flexDirection: dir < 0 ? "row-reverse" : "row", gap: 10 * u, alignItems: "center", height: H }}>
      {Array.from({ length: bars }, (_, i) => {
        const env = Math.abs(Math.sin(frame / 5 + i * 0.7) * Math.cos(frame / 11 + i * 1.3)) * (0.35 + 0.65 * beat) * open;
        const dots = Math.max(1, Math.round(env * 14 * (1 - i / bars * 0.6)));
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 * u, alignItems: "center" }}>
            {Array.from({ length: dots }, (_, k) => <div key={k} style={{ width: 8 * u, height: 5 * u, borderRadius: 2, background: cols[(i + k) % cols.length] }} />)}
          </div>
        );
      })}
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 40 * u }}>
      {side(-1)}
      {logo && <Img src={file(logo)} style={{ height: (props.logoHeight ?? 90) * u, transform: `scale(${1 + beat * 0.04})`, filter: t.logoInvert ? "brightness(0)" : undefined }} />}
      {side(1)}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------
/**
 * CLICK BUTTON (showreel "Create"): a glossy gradient pill with a soft glow; a big cursor glides in
 * and clicks; concentric rings ripple out. Pair with a zoomThrough/iris transition at the click point.
 * props: label, clickAt (s)
 */
export const ClickButtonScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const clickAt = (props.clickAt ?? 0.7) * fps;
  const enter = pop(frame, fps, 0, { damping: 13, stiffness: 140 });
  const press = frame >= clickAt && frame < clickAt + 5 ? 0.93 : 1;
  const grad = (t.gradient ?? [t.colors.accent, t.colors.accent2 ?? t.colors.accent]).join(", ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2, 3].map((k) => {
        const p = prog(frame, clickAt + k * 3, 26, ease.out);
        if (p <= 0 || p >= 1) return null;
        return <div key={k} style={{ position: "absolute", width: 380 * u * (1 + p * (1.2 + k * 0.5)), height: 130 * u * (1 + p * (2.2 + k)), borderRadius: 999,
          border: `${2 * u}px solid ${alpha(t.colors.accent, 1 - p)}` }} />;
      })}
      <div style={{ padding: `${36 * u}px ${96 * u}px`, borderRadius: 999, background: `linear-gradient(120deg, ${grad})`, color: "#fff",
        fontFamily: t.fonts.body, fontWeight: 700, fontSize: 48 * u, transform: `scale(${(0.6 + 0.4 * enter) * press})`,
        boxShadow: `0 ${24 * u}px ${70 * u}px ${alpha(t.colors.accent, 0.45)}, inset 0 ${3 * u}px ${6 * u}px rgba(255,255,255,0.45)` }}>
        {props.label ?? "Create"}
      </div>
      <Cursor steps={[{ t: 0, x: 0.8, y: 0.85 }, { t: (clickAt - 6) / fps, x: 0.55, y: 0.53, hand: false }, { t: clickAt / fps, x: 0.55, y: 0.53, click: true }]} size={70} />
    </AbsoluteFill>
  );
};

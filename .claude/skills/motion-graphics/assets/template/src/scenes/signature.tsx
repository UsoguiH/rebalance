import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Card } from "../components/Card";
import { Cursor, type CursorStep } from "../components/Cursor";
import { Device, type DeviceKind } from "../components/Device";
import { Media } from "../components/Media";
import { useBeat } from "../fx/beat";
import { GlowBorder, LightLeak, Sheen } from "../fx/Glow";
import { Moving } from "../fx/Moving";
import { Burst, ParticleLogo } from "../fx/Particles";
import { CharText, type CharStyle } from "../fx/Text";
import { ease, lerp, pop, prog, rand } from "../motion";
import { alpha, useTheme } from "../theme";
import type { SceneProps } from "../types";

const file = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));

/** Small floating UI chip (badge / notification / stat) used around hero shots. */
export const Chip: React.FC<{ text: string; icon?: string; accent?: boolean }> = ({ text, icon, accent }) => {
  const t = useTheme();
  const u = t.u;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12 * u, padding: `${14 * u}px ${22 * u}px`, borderRadius: 18 * u,
      background: accent ? t.colors.accent : "rgba(255,255,255,0.92)", color: accent ? "#fff" : "#111",
      boxShadow: `0 ${18 * u}px ${44 * u}px rgba(0,0,0,0.14), 0 0 0 ${1 * u}px rgba(0,0,0,0.05)`,
      fontFamily: t.fonts.body, fontWeight: 600, fontSize: 26 * u, whiteSpace: "nowrap", backdropFilter: "blur(10px)", direction: t.dir,
    }}>
      {icon && (/\.(svg|png|jpe?g|webp)$/i.test(icon)
        ? <Img src={file(icon)} style={{ width: 34 * u, height: 34 * u, objectFit: "contain" }} />
        : <span style={{ fontSize: 28 * u }}>{icon}</span>)}
      {text}
    </div>
  );
};

/**
 * HERO DEVICE: the device flies in on a curved 3D path with motion blur, lands with overshoot,
 * catches a light sheen, then keeps breathing (slow orbit + float). Floating chips drift around it
 * at different depths. Optional AI glow around the screen.
 * props: device, src, width, lines[], highlight[], textStyle (CharStyle), side (left|right|none),
 *        from (right|left|bottom|top), glow, chips [{text, icon?, accent?, x, y, at}] (x/y px offsets at 1080),
 *        second {device, src, width}, scrollFrom, scrollTo, cursor [steps]
 */
export const HeroDeviceScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = useBeat(2, 0.25);
  const kind: DeviceKind = props.device ?? "iphone";
  const side = t.portrait ? "none" : props.side ?? (props.lines ? "right" : "none");
  const from = props.from ?? "right";
  const land = pop(frame, fps, 0, { damping: 16, stiffness: 70, mass: 1.1 });
  const life = prog(frame, 0, durationInFrames, ease.inOut);
  const dirX = from === "left" ? -1 : from === "right" ? 1 : 0;
  const dirY = from === "bottom" ? 1 : from === "top" ? -1 : 0;
  const pose = (f: number) => {
    const s = pop(f, fps, 0, { damping: 16, stiffness: 70, mass: 1.1 });
    const lf = prog(f, 0, durationInFrames, ease.inOut);
    const k = 1 - s;
    return {
      x: dirX * k * t.W * 0.7 + Math.sin(f / 40) * 6 * t.u,
      y: dirY * k * t.H * 0.8 + k * k * 120 * t.u * (dirY === 0 ? 1 : 0) + Math.sin(f / 26) * 9 * t.u,
      z: -k * 900 * t.u,
      rx: 10 + k * 40 * (dirY || 0.6) - lf * 4,
      ry: (side === "right" ? 16 : side === "left" ? -16 : 0) + k * -55 * (dirX || 0.5) + Math.sin(f / 50) * 4 - lf * 8,
      rz: k * 14 * (dirX || 1),
      s: 1 + 0.02 * beat,
    };
  };
  const scroll = lerp(props.scrollFrom ?? 0, props.scrollTo ?? 0, prog(frame, fps * 0.8, durationInFrames - fps * 1.2, ease.inOut));
  const sheen = prog(frame, fps * 0.55, fps * 0.9, ease.inOut);
  const w = props.width ?? (kind === "iphone" ? (t.portrait ? 500 : 420) : kind === "macbook" ? 1150 : kind === "browser" ? 1150 : 640);
  const device = (
    <div style={{ position: "relative" }}>
      <Device kind={kind} src={props.src} width={w} scroll={scroll} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 60 * t.u, overflow: "hidden", pointerEvents: "none" }}><Sheen progress={sheen} /></div>
      {props.cursor && <Cursor steps={props.cursor as CursorStep[]} />}
    </div>
  );
  const shadowW = (kind === "iphone" ? 380 : 1000) * t.u;
  const stage = (
    <div style={{ position: "relative", width: t.portrait ? t.W : t.W * 0.5, height: t.H * (t.portrait ? 0.62 : 1), perspective: 2200 * t.u }}>
      {/* floor shadow reacts to height */}
      <div style={{ position: "absolute", left: "50%", bottom: t.H * 0.1, width: shadowW, height: 60 * t.u, marginLeft: -shadowW / 2, borderRadius: "50%",
        background: "rgba(0,0,0,0.22)", filter: `blur(${30 * t.u}px)`, opacity: land * 0.9, transform: `scale(${0.6 + 0.4 * land})` }} />
      {props.second && (
        <Moving pose={(f) => { const s = pop(f, fps, 8, { damping: 16, stiffness: 60 }); return { x: (-1 * (1 - s) * t.W * 0.5) - 260 * t.u, y: 60 * t.u + Math.sin(f / 22) * 10 * t.u, z: -300 * t.u, ry: 20 - (1 - s) * 40, rx: 8 }; }}>
          <div style={{ filter: `blur(${2 * t.u}px)` }}><Device kind={props.second.device ?? "iphone"} src={props.second.src} width={props.second.width ?? 330} /></div>
        </Moving>
      )}
      <Moving pose={pose} blur={0.8}>
        {props.glow ? <GlowBorder radius={kind === "iphone" ? w * 0.165 * t.u : 20 * t.u} intensity={prog(frame, fps * 0.6, 20)}>{device}</GlowBorder> : device}
      </Moving>
      {(props.chips ?? []).map((c: any, i: number) => {
        const at = (c.at ?? 0.9 + i * 0.35) * fps;
        const s = pop(frame, fps, at, { damping: 12, stiffness: 150 });
        if (frame < at) return null;
        const depth = 1 + (i % 2) * 0.35; // parallax: chips at different depths drift at different speeds
        return (
          <div key={i} style={{ position: "absolute", left: "50%", top: "50%",
            transform: `translate(-50%, -50%) translate(${(c.x ?? 0) * t.u + Math.sin(frame / 30 + i) * 10 * depth * t.u}px, ${(c.y ?? 0) * t.u + Math.cos(frame / 34 + i) * 12 * depth * t.u - life * 30 * depth * t.u}px) scale(${s})`,
            zIndex: 20 }}>
            <Chip text={c.text} icon={c.icon} accent={c.accent} />
          </div>
        );
      })}
    </div>
  );
  const text = props.lines && (
    <div style={{ maxWidth: side === "none" ? t.W * 0.9 : t.W * 0.42 }}>
      <CharText lines={props.lines} highlight={props.highlight} style={(props.textStyle as CharStyle) ?? "flip3d"} size={props.size ?? (side === "none" ? 96 : 100)}
        align={side === "none" ? "center" : "start"} delay={props.textDelay ?? 14} />
      {props.sub && <div style={{ marginTop: 22 * t.u, fontFamily: t.fonts.body, fontSize: 34 * t.u, color: t.colors.muted, opacity: prog(frame, fps * 1.1, 14), direction: t.dir }}>{props.sub}</div>}
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: side === "none" ? "column" : side === "right" ? "row" : "row-reverse",
      gap: side === "none" ? 0 : 40 * t.u, padding: `0 ${t.W * 0.05}px` }}>
      {side === "none" && text && <div style={{ position: "absolute", top: t.H * (t.portrait ? 0.1 : 0.08), left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 30 }}>{text}</div>}
      {stage}
      {side !== "none" && text}
    </AbsoluteFill>
  );
};

/**
 * EXPLODED UI: a real screenshot tilts into isometric space and splits into horizontal layers that
 * float apart (with shadows), the camera orbits, then it all snaps back together.
 * props: src, layers (3-8, default 5), explodeAt (s), holdFor (s), lines[], highlight[], labels [text per layer]
 */
export const ExplodeScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(2, Math.min(8, props.layers ?? 5));
  const at = (props.explodeAt ?? 0.6) * fps;
  const hold = (props.holdFor ?? 1.8) * fps;
  const tilt = prog(frame, at - 10, 26, ease.inOut) * (1 - prog(frame, at + hold + 14, 22, ease.inOut));
  const spread = prog(frame, at + 6, 30, ease.out) * (1 - prog(frame, at + hold, 22, ease.inOut));
  const orbit = prog(frame, 0, durationInFrames, ease.inOut);
  // leave room on the right for the layer labels (portrait frames are narrow)
  const W = Math.min(t.W * (t.portrait ? ((props.labels ?? []).length ? 0.62 : 0.9) : 0.62), 1300 * t.u);
  const H = W / (props.aspect ?? 1.6);
  const enter = pop(frame, fps, 0, { damping: 18, stiffness: 90 });
  const labels: string[] = props.labels ?? [];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2600 * t.u }}>
      {props.lines && (
        <div style={{ position: "absolute", top: t.H * 0.07, left: 0, right: 0, zIndex: 50 }}>
          <CharText lines={props.lines} highlight={props.highlight} style="blurIn" size={props.size ?? 80} delay={6} />
        </div>
      )}
      <div style={{
        width: W, height: H, position: "relative", transformStyle: "preserve-3d", marginTop: props.lines ? 90 * t.u : 0,
        marginRight: t.portrait && (props.labels ?? []).length ? t.W * 0.2 : 0,
        transform: `scale(${0.85 + 0.15 * enter}) rotateX(${tilt * 52}deg) rotateZ(${tilt * (-28 + orbit * 16)}deg)`,
      }}>
        {Array.from({ length: n }, (_, i) => {
          const top = (i / n) * 100;
          const z = spread * (i - (n - 1) / 2) * 110 * t.u * 1.6 + spread * i * 30 * t.u;
          const lift = spread * (rand(i + 3) - 0.5) * 30 * t.u;
          return (
            <div key={i} style={{
              position: "absolute", inset: 0, transformStyle: "preserve-3d",
              transform: `translateZ(${z}px) translateY(${lift}px)`,
              clipPath: `inset(${top}% 0 ${100 - top - 100 / n}% 0 round ${12 * t.u}px)`,
              filter: spread > 0.05 ? `drop-shadow(0 ${30 * spread * t.u}px ${30 * t.u}px rgba(0,0,0,${0.18 * spread}))` : undefined,
            }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 18 * t.u, overflow: "hidden", background: "#fff",
                boxShadow: `0 0 0 ${1 * t.u}px rgba(0,0,0,0.06)` }}>
                <Media src={props.src} style={{ objectPosition: "50% 0%" }} />
              </div>
            </div>
          );
        })}
        {labels.map((l, i) => {
          const s = prog(frame, at + 16 + i * 4, 14);
          const z = spread * (i - (n - 1) / 2) * 110 * t.u * 1.6 + spread * i * 30 * t.u;
          return (
            <div key={`l${i}`} style={{ position: "absolute", left: "102%", top: `${((i + 0.5) / n) * 100}%`, transform: `translateZ(${z}px) rotateZ(${tilt * 28}deg) rotateX(${-tilt * 52}deg)`,
              opacity: s * spread, whiteSpace: "nowrap" }}>
              <Chip text={l} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * TEXT MASK: giant words with a real image/video inside the letters; zooms out from inside a letter,
 * then (optional) dives back through it into the full image.
 * props: text, src, size (px at 1080, default 330), dive (bool), weight
 */
export const TextMaskScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const zoomOut = prog(frame, 0, durationInFrames * 0.55, ease.out);
  const dive = props.dive ? prog(frame, durationInFrames * 0.62, durationInFrames * 0.38, ease.in) : 0;
  const scale = lerp(2.6, 1, zoomOut) * (1 + dive * 9);
  const imgOpacity = prog(frame, durationInFrames * 0.7, durationInFrames * 0.25, ease.inOut) * (props.dive ? 1 : 0);
  const bg = /\.(mp4|webm|mov)$/i.test(props.src) ? undefined : `url(${file(props.src)})`;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{
        transform: `scale(${scale})`, fontFamily: t.fonts.display, fontWeight: props.weight ?? 900, fontSize: (props.size ?? (t.portrait ? 260 : 330)) * t.u,
        letterSpacing: t.rtl ? 0 : "-0.05em", lineHeight: 0.9, textAlign: "center", direction: t.dir,
        backgroundImage: bg, backgroundSize: "cover", backgroundPosition: `50% ${30 + zoomOut * 20}%`,
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        filter: `drop-shadow(0 ${20 * t.u}px ${40 * t.u}px rgba(0,0,0,0.12))`, whiteSpace: "pre",
      }}>
        {props.text}
      </div>
      {props.dive && <AbsoluteFill style={{ opacity: imgOpacity }}><Media src={props.src} /></AbsoluteFill>}
    </AbsoluteFill>
  );
};

/**
 * PARTICLE LOGO: the logo assembles from a swirl of brand-coloured particles, resolves crisp,
 * a burst fires, a light leak blooms, the tagline flips in.
 * props: logo (default brand.logo), width, tagline, textStyle, burst (bool), invert (default brand.logoInvert)
 */
export const ParticleLogoScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = props.logo ?? t.logo;
  const assemble = props.assemble ?? 40;
  const W = (props.width ?? 560) * t.u;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 * t.u }}>
      <LightLeak progress={prog(frame, assemble - 8, 40)} />
      {src ? <ParticleLogo src={src} width={props.width ?? 560} start={4} assemble={assemble} invert={props.invert ?? t.logoInvert} step={props.step ?? 6} /> : null}
      {props.tagline && <CharText lines={[props.tagline]} style={(props.textStyle as CharStyle) ?? "blurIn"} size={props.taglineSize ?? 54} weight={500}
        font="body" delay={assemble + 6} stagger={0.8} color={t.colors.muted} />}
      {props.burst !== false && <Burst at={assemble + 2} x={t.W / 2} y={t.H / 2 - 40 * t.u} count={80} power={1.1} />}
      {void W}
    </AbsoluteFill>
  );
};

/**
 * AI PROMPT: a prompt box with the rotating AI glow; text types, Send is pressed, the glow
 * intensifies while "thinking", then result cards burst out of the box into a 3D fan.
 * props: text, placeholder, button, results [image paths], thinking ("Generating…"), lines[] (headline after)
 */
export const PromptGlowScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const text: string = props.text ?? "";
  const typeStart = 0.35 * fps;
  const cps = props.cps ?? 30;
  const typed = Math.max(0, Math.floor(((frame - typeStart) / fps) * cps));
  const doneTyping = typeStart + (text.length / cps) * fps;
  const pressAt = doneTyping + 0.35 * fps;
  const thinkEnd = pressAt + (props.think ?? 1.0) * fps;
  const pressed = frame >= pressAt;
  const thinking = frame >= pressAt && frame < thinkEnd;
  const results: string[] = props.results ?? [];
  const out = prog(frame, thinkEnd, 26, ease.out);
  const boxUp = prog(frame, thinkEnd - 6, 24, ease.inOut);
  const enter = pop(frame, fps, 0, { damping: 16 });
  const width = Math.min(1000 * u, t.W * 0.86);
  const caretOn = Math.floor(frame / (fps * 0.45)) % 2 === 0 || (typed > 0 && typed < text.length);
  const glowI = frame < pressAt ? 0.55 : thinking ? 0.8 + 0.2 * Math.sin(frame / 3) : 0.5;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* result cards fly out of the box into a fan */}
      {results.map((r, i) => {
        const n = results.length;
        const k = i - (n - 1) / 2;
        const s = pop(frame, fps, thinkEnd + i * 3, { damping: 15, stiffness: 90 });
        if (frame < thinkEnd) return null;
        return (
          <Moving key={i} blur={0.7} pose={(f) => {
            const q = pop(f, fps, thinkEnd + i * 3, { damping: 15, stiffness: 90 });
            return { x: k * (t.portrait ? 250 : 420) * u * q, y: (1 - q) * 40 * u + Math.abs(k) * 40 * u * q + 70 * u, z: -Math.abs(k) * 120 * u * q, rz: k * 6 * q, ry: -k * 10 * q, s: 0.4 + 0.6 * q, o: Math.min(1, q * 2) };
          }}>
            <div style={{ opacity: s > 0 ? 1 : 0 }}><Card src={r} width={t.portrait ? 380 : 520} glow={i === Math.floor(n / 2)} /></div>
          </Moving>
        );
      })}
      <div style={{ transform: `translateY(${-boxUp * t.H * (results.length ? 0.3 : 0)}px) scale(${(0.9 + 0.1 * enter) * (1 - boxUp * 0.2)})`, opacity: Math.min(1, enter * 1.4), zIndex: 10 }}>
        <GlowBorder radius={28 * u} intensity={glowI} speed={thinking ? 0.9 : 0.35}>
          <div style={{ width, background: "#fff", padding: `${30 * u}px ${34 * u}px ${24 * u}px`, direction: t.dir }}>
            <div style={{ fontFamily: t.fonts.body, fontSize: 36 * u, lineHeight: 1.35, minHeight: 96 * u, color: typed ? "#161616" : "#9a9a9a" }}>
              {thinking || frame >= thinkEnd ? (
                <span style={{ backgroundImage: `linear-gradient(90deg, #9a9a9a ${((frame % 30) / 30) * 100 - 30}%, ${t.colors.accent} ${((frame % 30) / 30) * 100}%, #9a9a9a ${((frame % 30) / 30) * 100 + 30}%)`,
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{props.thinking ?? "Generating…"}</span>
              ) : (
                <>
                  {text.slice(0, typed) || props.placeholder || ""}
                  {caretOn && <span style={{ display: "inline-block", width: 3 * u, height: 38 * u, background: t.colors.accent, marginInlineStart: 4 * u, verticalAlign: "middle" }} />}
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 * u }}>
              <div style={{ fontFamily: t.fonts.body, fontWeight: 600, fontSize: 26 * u, color: "#fff", padding: `${12 * u}px ${28 * u}px`, borderRadius: 14 * u,
                background: t.colors.accent, opacity: typed >= text.length ? 1 : 0.45, transform: `scale(${pressed && frame - pressAt < 5 ? 0.92 : 1})` }}>{props.button ?? "Send"}</div>
            </div>
          </div>
        </GlowBorder>
      </div>
      {props.lines && frame > thinkEnd + 10 && (
        <div style={{ position: "absolute", bottom: t.H * 0.08, left: 0, right: 0 }}>
          <CharText lines={props.lines} highlight={props.highlight} style="blurIn" size={props.size ?? 70} delay={thinkEnd + 14} />
        </div>
      )}
      {props.cursor !== false && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Cursor steps={[
            { t: 0, x: 0.78, y: 0.9 },
            { t: (pressAt - 10) / fps, x: 0.5 + (width / t.W) * 0.42, y: 0.5 + 60 * u / t.H, hand: true },
            { t: pressAt / fps, x: 0.5 + (width / t.W) * 0.42, y: 0.5 + 60 * u / t.H, click: true },
            { t: (thinkEnd + 10) / fps, x: 0.86, y: 0.95 },
          ]} />
        </div>
      )}
      {void durationInFrames}
    </AbsoluteFill>
  );
};

/**
 * MORPH: a button is clicked, morphs into a card, and the card grows into a full-screen product shot
 * (shared-element transition). props: label, src, clickAt (s), fullAt (s)
 */
export const MorphScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = t.u;
  const clickAt = (props.clickAt ?? 0.9) * fps;
  const fullAt = (props.fullAt ?? 1.6) * fps;
  const a = pop(frame, fps, clickAt + 4, { damping: 17, stiffness: 110 }); // pill -> card
  const b = pop(frame, fps, fullAt, { damping: 20, stiffness: 80 }); // card -> full screen
  const pillW = 330 * u, pillH = 92 * u;
  const cardW = Math.min(1100 * u, t.W * 0.8), cardH = cardW / 1.6;
  const w = lerp(lerp(pillW, cardW, a), t.W, b);
  const h = lerp(lerp(pillH, cardH, a), t.H, b);
  const r = lerp(lerp(pillH / 2, 28 * u, a), 0, b);
  const enter = pop(frame, fps, 0, { damping: 13 });
  const pressed = frame >= clickAt && frame < clickAt + 5;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: w, height: h, borderRadius: r, background: t.colors.accent, overflow: "hidden", position: "relative",
        transform: `scale(${enter * (pressed ? 0.94 : 1)})`, boxShadow: `0 ${30 * u}px ${80 * u}px ${alpha(t.colors.accent, 0.35 * (1 - b))}` }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 - a * 2,
          fontFamily: t.fonts.body, fontWeight: 700, fontSize: 34 * u, color: "#fff" }}>{props.label ?? "Get started"}</div>
        <div style={{ position: "absolute", inset: 0, opacity: prog(frame, clickAt + 8, 12) }}>
          <Media src={props.src} style={{ objectPosition: "50% 0%" }} />
        </div>
      </div>
      <Cursor steps={[{ t: 0, x: 0.72, y: 0.85 }, { t: (clickAt - 8) / fps, x: 0.52, y: 0.52, hand: true }, { t: clickAt / fps, x: 0.52, y: 0.52, click: true }, { t: fullAt / fps, x: 0.9, y: 1.05 }]} />
    </AbsoluteFill>
  );
};

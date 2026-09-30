import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Card } from "../components/Card";
import { Cursor, type CursorStep } from "../components/Cursor";
import { Device, type DeviceKind } from "../components/Device";
import { KineticText } from "../components/KineticText";
import { Media } from "../components/Media";
import { PromptBox } from "../components/PromptBox";
import { ease, keyframes, lerp, pop, prog, rand } from "../motion";
import { alpha, useTheme } from "../theme";
import type { SceneProps } from "../types";
import { Eyebrow } from "./basic";

const src = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));

/**
 * One or two devices showing real screens, with an optional headline beside/above them.
 * props: device (iphone|ipad|ipad-landscape|macbook|browser), src, width, lines[], highlight[], eyebrow,
 *        side (left|right|none), tiltFrom [rx,ry,rz], tiltTo, scrollFrom, scrollTo, enter (rise|spin|zoom),
 *        second {device, src, width, scrollFrom, scrollTo}, cursor [steps]
 */
export const DeviceScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kind: DeviceKind = props.device ?? "iphone";
  const side = t.portrait ? "none" : props.side ?? (props.lines ? "right" : "none");
  const enter = pop(frame, fps, 0, { damping: 18, stiffness: 90 });
  const life = prog(frame, 0, durationInFrames, ease.inOut);
  const tf: number[] = props.tiltFrom ?? (kind === "iphone" ? [8, side === "right" ? 18 : -18, 0] : [14, 0, 0]);
  const tt: number[] = props.tiltTo ?? [2, side === "right" ? 6 : side === "left" ? -6 : 0, 0];
  const rx = lerp(tf[0], tt[0], life);
  const ry = lerp(tf[1], tt[1], life);
  const rz = lerp(tf[2] ?? 0, tt[2] ?? 0, life);
  const scroll = lerp(props.scrollFrom ?? 0, props.scrollTo ?? 0, prog(frame, fps * 0.6, durationInFrames - fps * 1.2, ease.inOut));
  const floatY = Math.sin(frame / 28) * 8 * t.u;
  const entry = props.enter ?? "rise";
  const enterTf = entry === "spin" ? `rotateY(${(1 - enter) * 70}deg)` : entry === "zoom" ? `scale(${0.6 + 0.4 * enter})` : `translateY(${(1 - enter) * 60}%)`;
  const deviceW = props.width ?? (kind === "iphone" ? (t.portrait ? 520 : 400) : kind === "macbook" ? (side === "none" ? 1400 : 1100) : kind === "browser" ? (side === "none" ? 1500 : 1100) : 600);
  const dev = (
    <div style={{ perspective: 2400 * t.u, display: "flex", gap: 40 * t.u, alignItems: "flex-end" }}>
      <div style={{ transform: `${enterTf} translateY(${floatY}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, transformStyle: "preserve-3d", position: "relative" }}>
        <Device kind={kind} src={props.src} width={deviceW} scroll={scroll} />
        {props.cursor && <Cursor steps={props.cursor as CursorStep[]} />}
      </div>
      {props.second && (
        <div style={{ transform: `translateY(${(1 - pop(frame, fps, 8, { damping: 18, stiffness: 90 })) * 70}%) translateY(${-floatY}px) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
          <Device kind={props.second.device ?? "iphone"} src={props.second.src} width={props.second.width ?? 330}
            scroll={lerp(props.second.scrollFrom ?? 0, props.second.scrollTo ?? 0, life)} />
        </div>
      )}
    </div>
  );
  const text = props.lines && (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 * t.u, alignItems: side === "none" ? "center" : "flex-start", maxWidth: side === "none" ? undefined : t.W * 0.4 }}>
      {props.eyebrow && <Eyebrow text={props.eyebrow} />}
      <KineticText lines={props.lines} highlight={props.highlight} size={props.size ?? (side === "none" ? 84 : 88)} align={side === "none" ? "center" : "start"} delay={6} />
    </div>
  );
  if (side === "none") {
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 50 * t.u }}>
        {text}
        {dev}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: side === "right" ? "row" : "row-reverse", gap: 110 * t.u, padding: `0 ${t.W * 0.07}px` }}>
      {dev}
      {text}
    </AbsoluteFill>
  );
};

/**
 * Many screenshots as floating 3D cards. layout: helix (orbiting spiral), scatter (fly-through),
 * grid (tilted wall of screens panning), fan (cards fan out from a stack).
 * props: images[], layout, lines[], highlight[], focus (index to pop forward), focusAt (s), cardWidth
 */
export const CardsScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgs: string[] = props.images ?? [];
  const layout = props.layout ?? "helix";
  const life = prog(frame, 0, durationInFrames, ease.inOut);
  const cw = props.cardWidth ?? (layout === "grid" ? 560 : 620);
  const focusP = props.focus !== undefined ? prog(frame, (props.focusAt ?? 1) * fps, 22, ease.inOut) : 0;
  const n = Math.max(1, imgs.length);
  const cards = [] as React.ReactNode[];
  const copies = layout === "grid" ? Math.max(1, Math.ceil(12 / n)) : 1;
  const list = Array.from({ length: n * copies }, (_, i) => imgs[i % n]);
  list.forEach((img, i) => {
    let tf = "";
    let op = 1;
    const appear = pop(frame, fps, i * 2, { damping: 20, stiffness: 110 });
    if (layout === "helix") {
      const a = (i / n) * Math.PI * 2 + life * Math.PI * 0.9;
      const R = 1100 * t.u;
      const y = (i - (n - 1) / 2) * 110 * t.u;
      tf = `translate3d(${Math.sin(a) * R}px, ${y}px, ${Math.cos(a) * R - R}px) rotateY(${(a * 180) / Math.PI}deg)`;
      op = appear;
    } else if (layout === "scatter") {
      const x = (rand(i + 1) - 0.5) * t.W * 1.3;
      const y = (rand(i + 7) - 0.5) * t.H * 1.2;
      const z = -2400 * t.u + rand(i + 3) * 1200 * t.u + life * 2600 * t.u;
      tf = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${(rand(i + 5) - 0.5) * 30}deg) rotateX(${(rand(i + 9) - 0.5) * 20}deg)`;
      op = appear * Math.min(1, (z + 2600 * t.u) / (800 * t.u));
    } else if (layout === "grid") {
      const cols = 4;
      const gx = (i % cols) - (cols - 1) / 2;
      const gy = Math.floor(i / cols) - 1;
      tf = `translate3d(${gx * (cw + 50) * t.u}px, ${(gy * (cw / 1.6 + 50) - life * 260) * t.u}px, 0)`;
      op = appear;
    } else {
      const k = i - (n - 1) / 2;
      const spread = pop(frame, fps, 6, { damping: 16, stiffness: 70 });
      tf = `translate3d(${k * 330 * spread * t.u}px, ${Math.abs(k) * 40 * spread * t.u}px, ${-Math.abs(k) * 120 * t.u}px) rotateZ(${k * 7 * spread}deg)`;
      op = appear;
    }
    const isFocus = props.focus === i;
    const style: React.CSSProperties = {
      position: "absolute", left: "50%", top: "50%", marginLeft: (-cw / 2) * t.u, marginTop: (-cw / 1.6 / 2) * t.u,
      transform: isFocus && focusP > 0 ? `translate3d(0,0,${lerp(0, 700, focusP) * t.u}px)` : tf,
      opacity: isFocus ? 1 : op * (1 - focusP * 0.6), zIndex: isFocus ? 10 : 1, transformStyle: "preserve-3d",
      backfaceVisibility: "hidden", // cards turned away from camera would read mirrored
    };
    cards.push(<div key={i} style={style}><Card src={img} width={cw} glow={isFocus && focusP > 0.5} /></div>);
  });
  const wall = layout === "grid" ? `rotateX(28deg) rotateZ(-12deg) scale(1.1)` : `rotateX(${layout === "helix" ? 8 : 0}deg)`;
  return (
    <AbsoluteFill style={{ perspective: 1800 * t.u, overflow: "hidden" }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: wall }}>{cards}</AbsoluteFill>
      {props.lines && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: `radial-gradient(ellipse at center, ${alpha(t.colors.bg, 0.9)} 0%, ${alpha(t.colors.bg, 0)} 55%)` }}>
          <KineticText lines={props.lines} highlight={props.highlight} size={props.size ?? 110} delay={props.textDelay ?? 12} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/**
 * Product demo on a real screenshot: camera zooms/pans, a cursor moves and clicks, a prompt types itself,
 * callouts pop up. Coordinates are fractions (0-1) of the screenshot.
 * props: src, frame (browser|none), camera [{t, zoom, x, y}], cursor [{t,x,y,click,hand}],
 *        prompt {text, placeholder, at, x, y, width, button, pressAt}, callouts [{t, x, y, text}]
 */
export const CursorScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = keyframes(frame, ((props.camera ?? [{ t: 0, zoom: 1, x: 0.5, y: 0.5 }]) as any[]).map((k) => ({ ...k, t: k.t * fps })));
  const z = cam.zoom ?? 1;
  const stageW = t.W * (props.frame === "none" ? 0.9 : 0.84);
  const stageH = stageW / (props.aspect ?? 1.6);
  const tx = (0.5 - (cam.x ?? 0.5)) * stageW * z;
  const ty = (0.5 - (cam.y ?? 0.5)) * stageH * z;
  const enter = pop(frame, fps, 0, { damping: 18, stiffness: 100 });
  const bar = props.frame === "none" ? 0 : 48 * t.u;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${z * (0.92 + 0.08 * enter)})`, opacity: Math.min(1, enter * 1.5) }}>
        <div style={{ position: "relative", width: stageW, height: stageH + bar, borderRadius: 18 * t.u, overflow: "hidden", background: "#fff",
          boxShadow: `0 ${40 * t.u}px ${100 * t.u}px rgba(0,0,0,0.22), 0 0 0 ${1 * t.u}px rgba(0,0,0,0.07)` }}>
          {bar > 0 && (
            <div style={{ height: bar, background: "#f4f4f6", display: "flex", alignItems: "center", gap: 8 * t.u, padding: `0 ${18 * t.u}px`, borderBottom: `${1 * t.u}px solid #e4e4e8` }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 12 * t.u, height: 12 * t.u, borderRadius: 99, background: c }} />)}
            </div>
          )}
          <div style={{ position: "absolute", left: 0, right: 0, top: bar, bottom: 0 }}>
            <Media src={props.src} style={{ objectPosition: "50% 0%" }} />
            {(props.callouts ?? []).map((c: any, i: number) => {
              const s = pop(frame, fps, c.t * fps, { damping: 13 });
              if (frame < c.t * fps) return null;
              return (
                <div key={i} style={{ position: "absolute", left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: `translate(-50%, -120%) scale(${s})`,
                  fontFamily: t.fonts.body, fontWeight: 600, fontSize: 22 * t.u, color: "#fff", background: t.colors.accent,
                  padding: `${8 * t.u}px ${16 * t.u}px`, borderRadius: 10 * t.u, whiteSpace: "nowrap", boxShadow: `0 ${10 * t.u}px ${24 * t.u}px ${alpha(t.colors.accent, 0.4)}` }}>
                  {c.text}
                </div>
              );
            })}
            {props.cursor && <Cursor steps={props.cursor} />}
          </div>
        </div>
      </div>
      {props.prompt && (
        // Sequence restarts the clock, so the prompt's own timings count from prompt.at
        <Sequence from={Math.round((props.prompt.at ?? 0) * fps)} durationInFrames={props.prompt.until ? Math.round((props.prompt.until - (props.prompt.at ?? 0)) * fps) : undefined} layout="none">
          <div style={{ position: "absolute", left: `${(props.prompt.x ?? 0.5) * 100}%`, top: `${(props.prompt.y ?? 0.5) * 100}%`, transform: "translate(-50%, -50%)" }}>
            <PromptBox text={props.prompt.text} placeholder={props.prompt.placeholder} start={props.prompt.typeAt ?? 0.3} cps={props.prompt.cps}
              width={props.prompt.width} button={props.prompt.button} pressAt={props.prompt.pressAt} />
          </div>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/**
 * Integration/partner logos appearing around the product. layout: orbit | grid | row
 * props: logos[] (public paths), center (logo path, default brand icon/logo), lines[], highlight[]
 */
export const LogoCloudScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logos: string[] = props.logos ?? [];
  const layout = props.layout ?? "orbit";
  const tile = (props.tile ?? 150) * t.u;
  const centerSrc = props.center ?? t.icon ?? t.logo;
  const tileEl = (l: string, i: number, style: React.CSSProperties) => {
    const s = pop(frame, fps, 8 + i * 3, { damping: 12, stiffness: 160 });
    return (
      <div key={i} style={{ width: tile, height: tile, borderRadius: tile * 0.26, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 ${14 * t.u}px ${34 * t.u}px rgba(0,0,0,0.12), 0 0 0 ${1 * t.u}px rgba(0,0,0,0.05)`, transform: `scale(${s})`, ...style }}>
        <Img src={src(l)} style={{ width: "58%", height: "58%", objectFit: "contain" }} />
      </div>
    );
  };
  const heading = props.lines && <KineticText lines={props.lines} highlight={props.highlight} size={props.size ?? 80} />;
  if (layout !== "orbit") {
    const cols = layout === "row" ? logos.length : Math.min(logos.length, t.portrait ? 3 : 5);
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 70 * t.u }}>
        {heading}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gap: 36 * t.u }}>
          {logos.map((l, i) => tileEl(l, i, {}))}
        </div>
      </AbsoluteFill>
    );
  }
  const off = heading && !t.portrait ? 95 * t.u : 0; // push the orbit below the headline
  const R = (t.portrait ? 380 : heading ? 320 : 400) * t.u;
  const spin = frame * 0.004;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <svg style={{ position: "absolute", width: "100%", height: "100%" }}>
        {logos.map((_, i) => {
          const a = (i / logos.length) * Math.PI * 2 + spin;
          const p = prog(frame, 14 + i * 3, 14);
          return <line key={i} x1={t.W / 2} y1={t.H / 2 + off} x2={t.W / 2 + Math.cos(a) * R * p} y2={t.H / 2 + Math.sin(a) * R * p + off}
            stroke={alpha(t.colors.accent, 0.35)} strokeWidth={2 * t.u} strokeDasharray={`${6 * t.u} ${8 * t.u}`} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) translateY(${off}px)` }}>
        <div style={{ width: tile * 1.5, height: tile * 1.5, borderRadius: tile * 0.4, background: t.colors.accent, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 ${80 * t.u}px ${alpha(t.colors.accent, 0.5)}`, transform: `scale(${pop(frame, fps, 0)})` }}>
          {centerSrc ? <Img src={src(centerSrc)} style={{ width: "60%", height: "60%", objectFit: "contain", filter: t.icon ? undefined : "brightness(0) invert(1)" }} /> : null}
        </div>
      </div>
      {logos.map((l, i) => {
        const a = (i / logos.length) * Math.PI * 2 + spin;
        return tileEl(l, i, { position: "absolute", left: t.W / 2 + Math.cos(a) * R - tile / 2, top: t.H / 2 + Math.sin(a) * R - tile / 2 + off });
      })}
      {heading && <div style={{ position: "absolute", top: t.H * (t.portrait ? 0.12 : 0.07), left: 0, right: 0 }}>{heading}</div>}
    </AbsoluteFill>
  );
};

/**
 * 2-4 feature tiles appearing one by one. props: lines[] (heading), items [{title, text, image?, icon?}]
 */
export const FeaturesScene: React.FC<SceneProps> = ({ props }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items: any[] = props.items ?? [];
  const stack = t.portrait;
  const w = stack ? t.W * 0.82 : Math.min(560 * t.u, (t.W * 0.86) / items.length - 30 * t.u);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 60 * t.u, direction: t.dir }}>
      {props.lines && <KineticText lines={props.lines} highlight={props.highlight} size={props.size ?? 76} />}
      <div style={{ display: "flex", flexDirection: stack ? "column" : "row", gap: 30 * t.u }}>
        {items.map((it, i) => {
          const s = pop(frame, fps, 10 + i * (props.stagger ?? 8), { damping: 16, stiffness: 130 });
          return (
            <div key={i} style={{ width: w, borderRadius: 26 * t.u, background: "#fff", padding: 34 * t.u, boxShadow: `0 ${20 * t.u}px ${50 * t.u}px rgba(0,0,0,0.1), 0 0 0 ${1 * t.u}px rgba(0,0,0,0.05)`,
              transform: `translateY(${(1 - s) * 80 * t.u}px)`, opacity: Math.min(1, s * 1.3), display: "flex", flexDirection: "column", gap: 14 * t.u }}>
              {it.image && <div style={{ height: w * 0.52, borderRadius: 16 * t.u, overflow: "hidden", marginBottom: 8 * t.u }}><Media src={it.image} style={{ objectPosition: "50% 0%" }} /></div>}
              {it.icon && <Img src={src(it.icon)} style={{ width: 56 * t.u, height: 56 * t.u, objectFit: "contain" }} />}
              <div style={{ width: 44 * t.u, height: 6 * t.u, borderRadius: 9, background: t.colors.accent }} />
              <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: 40 * t.u, color: "#111", lineHeight: 1.15 }}>{it.title}</div>
              {it.text && <div style={{ fontFamily: t.fonts.body, fontSize: 27 * t.u, color: "#666", lineHeight: 1.4 }}>{it.text}</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

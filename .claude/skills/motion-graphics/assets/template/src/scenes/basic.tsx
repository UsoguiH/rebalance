import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { KineticText } from "../components/KineticText";
import { Logo } from "../components/Logo";
import { Media } from "../components/Media";
import { CharText, Odometer, type CharStyle } from "../fx/Text";
import { ParticleLogo, Burst } from "../fx/Particles";
import { ease, pop, prog } from "../motion";
import { alpha, onColor, useTheme } from "../theme";
import type { SceneProps } from "../types";

const Center: React.FC<{ children: React.ReactNode; gap?: number; pad?: number }> = ({ children, gap = 28, pad = 0.08 }) => {
  const t = useTheme();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: gap * t.u, padding: `0 ${t.W * pad}px` }}>
      {children}
    </AbsoluteFill>
  );
};

export const Eyebrow: React.FC<{ text: string; delay?: number; color?: string }> = ({ text, delay = 0, color }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const p = prog(frame, delay, 14);
  return (
    <div style={{
      fontFamily: t.fonts.body, fontWeight: 600, fontSize: 26 * t.u, letterSpacing: t.rtl ? 0 : "0.14em",
      textTransform: "uppercase", color: color ?? t.colors.accent, opacity: p, transform: `translateY(${(1 - p) * 14 * t.u}px)`,
    }}>{text}</div>
  );
};

/** Big animated headline. props: lines[], highlight[], style, marker, eyebrow, size, sub */
export const KineticScene: React.FC<SceneProps> = ({ props, scene }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const dark = scene.background === "dark" || scene.background === "accent";
  const color = dark ? onColor(scene.background === "accent" ? t.colors.accent : t.colors.dark!) : undefined;
  const words = (props.lines ?? []).join(" ").split(/\s+/).length;
  const subP = prog(frame, 8 + words * (props.stagger ?? 3), 16);
  return (
    <Center>
      {props.eyebrow && <Eyebrow text={props.eyebrow} color={dark ? color : undefined} />}
      {props.chars ? (
        <CharText lines={props.lines ?? [scene.vo ?? ""]} highlight={props.highlight} style={props.chars as CharStyle}
          size={props.size ?? (t.portrait ? 110 : 130)} delay={props.eyebrow ? 6 : 0} stagger={props.stagger ?? 1.2} />
      ) : <KineticText
        lines={props.lines ?? [scene.vo ?? ""]}
        highlight={props.highlight}
        style={props.style ?? "rise"}
        marker={props.marker}
        size={props.size ?? (t.portrait ? 110 : 120)}
        delay={props.eyebrow ? 6 : 0}
        stagger={props.stagger}
        color={color}
      />}
      {props.sub && (
        <div style={{ fontFamily: t.fonts.body, fontSize: 38 * t.u, color: dark ? alpha(color!, 0.7) : t.colors.muted, opacity: subP,
          transform: `translateY(${(1 - subP) * 16 * t.u}px)`, textAlign: "center", maxWidth: 1200 * t.u, direction: t.dir }}>
          {props.sub}
        </div>
      )}
    </Center>
  );
};

/** Logo reveal (intro or outro). props: tagline, logoHeight, logo (override path) */
export const LogoScene: React.FC<SceneProps> = ({ props, scene }) => {
  const t = useTheme();
  const onDark = scene.background === "dark" || scene.background === "accent";
  return (
    <Center gap={34}>
      <Logo src={props.logo} height={props.logoHeight ?? 140} onDark={onDark} />
      {props.tagline && (
        <KineticText lines={[props.tagline]} size={props.taglineSize ?? 46} weight={500} font="body" style="blur" delay={16} stagger={2}
          color={onDark ? "#ffffffcc" : t.colors.muted} />
      )}
    </Center>
  );
};

/** Final card: logo, tagline, call-to-action button and URL. props: tagline, cta, url */
export const EndCardScene: React.FC<SceneProps> = ({ props, scene }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const onDark = scene.background === "dark" || scene.background === "accent";
  const b = pop(frame, fps, 22);
  const urlP = prog(frame, 30, 16);
  const btnBg = scene.background === "accent" ? "#fff" : t.colors.accent;
  return (
    <Center gap={36}>
      {props.particles && (props.logo ?? t.logo)
        ? <ParticleLogo src={props.logo ?? t.logo!} width={props.logoWidth ?? 440} start={0} assemble={34} invert={t.logoInvert} />
        : <Logo src={props.logo} height={props.logoHeight ?? 120} onDark={onDark} />}
      {props.tagline && (
        <KineticText lines={[props.tagline]} size={54} weight={600} font="display" style="rise" delay={8} stagger={2}
          color={onDark ? "#fff" : t.colors.fg} />
      )}
      {props.cta && (
        <div style={{
          marginTop: 10 * t.u, fontFamily: t.fonts.body, fontWeight: 700, fontSize: 36 * t.u, padding: `${22 * t.u}px ${48 * t.u}px`,
          borderRadius: 999, background: btnBg, color: onColor(btnBg), transform: `scale(${b})`,
          boxShadow: `0 ${16 * t.u}px ${40 * t.u}px ${alpha(t.colors.accent, 0.35)}`,
        }}>{props.cta}</div>
      )}
      {props.cta && props.burst !== false && <Burst at={26} x={t.W / 2} y={t.H * 0.62} count={60} power={0.8} />}
      {(props.url ?? t.url) && (
        <div style={{ fontFamily: t.fonts.body, fontSize: 30 * t.u, color: onDark ? "#ffffffaa" : t.colors.muted, opacity: urlP, letterSpacing: "0.02em" }}>
          {(props.url ?? t.url).replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </div>
      )}
    </Center>
  );
};

/** Full-bleed real photo with slow Ken Burns and a headline. props: src, lines[], highlight[], align: bottom|center, zoom */
export const ImageScene: React.FC<SceneProps> = ({ props, durationInFrames }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const z = 1 + (props.zoom ?? 0.08) * (1 - prog(frame, 0, durationInFrames, ease.inOut));
  const center = props.align === "center";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z}) translateX(${(props.panX ?? -1.5) * prog(frame, 0, durationInFrames, ease.inOut)}%)` }}>
        <Media src={props.src} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: center ? "rgba(0,0,0,0.35)" : "linear-gradient(transparent 35%, rgba(0,0,0,0.75))" }} />
      {props.lines && (
        <AbsoluteFill style={{ justifyContent: center ? "center" : "flex-end", alignItems: center ? "center" : "flex-start", padding: `${t.H * 0.1}px ${t.W * 0.07}px` }}>
          <KineticText lines={props.lines} highlight={props.highlight} size={props.size ?? 96} color="#fff" align={center ? "center" : "start"} style="mask" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Big number that counts up. props: value, prefix, suffix, decimals, label, bars[] */
export const StatScene: React.FC<SceneProps> = ({ props, scene }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const p = prog(frame, 4, 40, ease.out);
  const v = (props.value ?? 100) * p;
  const txt = v.toLocaleString("en-US", { minimumFractionDigits: props.decimals ?? 0, maximumFractionDigits: props.decimals ?? 0 });
  const dark = scene.background === "dark" || scene.background === "accent";
  const fg = dark ? "#fff" : t.colors.fg;
  const bars: number[] = props.bars ?? [];
  return (
    <Center gap={18}>
      {props.roll ? <Odometer value={props.value ?? 100} prefix={props.prefix} suffix={props.suffix} size={props.size ?? (t.portrait ? 180 : 220)} delay={4} /> :
      <div style={{ direction: "ltr", unicodeBidi: "isolate", fontFamily: t.fonts.display, fontWeight: 800, fontSize: (props.size ?? (t.portrait ? 180 : 220)) * t.u, color: fg, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {props.prefix}{txt}<span style={{ color: dark ? fg : t.colors.accent }}>{props.suffix}</span>
      </div>}
      {props.label && <KineticText lines={[props.label]} size={44} weight={500} font="body" delay={10} color={dark ? "#ffffffbb" : t.colors.muted} />}
      {bars.length > 0 && (
        <div style={{ direction: "ltr", display: "flex", alignItems: "flex-end", gap: 14 * t.u, height: 220 * t.u, marginTop: 30 * t.u }}>
          {bars.map((b, i) => {
            const bp = prog(frame, 12 + i * 4, 22, ease.back);
            return <div key={i} style={{ width: 46 * t.u, height: `${b * bp * 100}%`, borderRadius: 10 * t.u, background: i === bars.length - 1 ? t.colors.accent : alpha(fg, 0.18) }} />;
          })}
        </div>
      )}
    </Center>
  );
};

import React from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { ease } from "./motion";
import { useTheme } from "./theme";
import type { TransitionSpec } from "./types";

type P = {
  kind: TransitionSpec["type"];
  direction: NonNullable<TransitionSpec["direction"]>;
  x: number; // 0-1 focus point for iris / zoomThrough
  y: number;
  colors?: string[];
};

const vec = (d: P["direction"]) => ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] })[d];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// One presentation component that covers every transition style the storyboard can ask for.
const Presentation: React.FC<TransitionPresentationComponentProps<P>> = ({
  children, presentationDirection, presentationProgress: p, passedProps,
}) => {
  const t = useTheme();
  const entering = presentationDirection === "entering";
  const [dx, dy] = vec(passedProps.direction);
  const origin = `${passedProps.x * 100}% ${passedProps.y * 100}%`;
  let style: React.CSSProperties = {};
  let overlay: React.ReactNode = null;
  switch (passedProps.kind) {
    case "fade":
      style = { opacity: entering ? p : 1 };
      break;
    case "slide": {
      const o = entering ? (1 - p) * 100 : -p * 100;
      style = { transform: `translate(${-dx * o}%, ${-dy * o}%)` };
      break;
    }
    case "whip": {
      const o = entering ? (1 - p) * 100 : -p * 100;
      const blur = Math.sin(p * Math.PI) * 28;
      style = { transform: `translate(${-dx * o}%, ${-dy * o}%)`, filter: `blur(${blur}px)` };
      break;
    }
    case "zoom":
      style = entering
        ? { opacity: p, transform: `scale(${0.85 + 0.15 * p})`, filter: `blur(${(1 - p) * 16}px)` }
        : { opacity: 1 - p, transform: `scale(${1 + 0.25 * p})`, filter: `blur(${p * 16}px)` };
      break;
    case "blur":
      style = entering ? { opacity: p, filter: `blur(${(1 - p) * 30}px)` } : { opacity: 1 - p * 0.6, filter: `blur(${p * 30}px)` };
      break;
    case "wipe": {
      if (entering) {
        const c = (1 - ease.inOut(p)) * 100;
        const clip = { left: `inset(0 0 0 ${c}%)`, right: `inset(0 ${c}% 0 0)`, up: `inset(${c}% 0 0 0)`, down: `inset(0 0 ${c}% 0)` }[passedProps.direction];
        style = { clipPath: clip };
      }
      break;
    }
    case "iris": {
      // circle opening from a point (e.g. where the cursor clicked)
      if (entering) style = { clipPath: `circle(${ease.inOut(p) * 150}% at ${origin})` };
      else style = { transform: `scale(${1 - 0.06 * p})`, transformOrigin: origin };
      break;
    }
    case "zoomThrough": {
      // dive into a point of the old scene; the new scene grows out of it
      if (entering) {
        const q = clamp01((p - 0.35) / 0.65);
        style = { opacity: q, transform: `scale(${0.55 + 0.45 * ease.out(q)})`, transformOrigin: origin, filter: `blur(${(1 - q) * 18}px)` };
      } else {
        const q = ease.in(p);
        style = { transform: `scale(${1 + q * 7})`, transformOrigin: origin, opacity: 1 - clamp01((p - 0.45) / 0.4), filter: `blur(${q * 22}px)` };
      }
      break;
    }
    case "cube": {
      const ang = 90 * (entering ? 1 - p : -p) * -dx || 90 * (entering ? 1 - p : -p);
      style = {
        transform: `perspective(${2200 * t.u}px) rotateY(${ang}deg)`,
        transformOrigin: entering ? (dx < 0 ? "left center" : "right center") : (dx < 0 ? "right center" : "left center"),
        filter: `brightness(${1 - Math.sin(p * Math.PI) * 0.12})`,
        backfaceVisibility: "hidden",
      };
      break;
    }
    case "panels": {
      // brand-coloured panels sweep over the old scene, then pull away to reveal the new one
      if (entering) {
        const cols = passedProps.colors ?? [t.colors.accent2 ?? t.colors.accent, t.colors.accent, t.colors.bg];
        const n = cols.length;
        style = { opacity: p >= 0.5 ? 1 : 0 };
        overlay = cols.map((c, k) => {
          const inQ = ease.inOut(clamp01((p * 2 - k * 0.14) / (1 - (n - 1) * 0.14)));
          const outQ = ease.inOut(clamp01(((p - 0.5) * 2 - (n - 1 - k) * 0.14) / (1 - (n - 1) * 0.14)));
          const pos = p < 0.5 ? -100 + inQ * 100 : outQ * 100;
          const tr = dx !== 0 || dy === 0 ? `translateX(${pos * (dx === 0 ? -1 : -dx)}%)` : `translateY(${pos * -dy}%)`;
          return <AbsoluteFill key={k} style={{ background: c, transform: tr, zIndex: 10 + k, boxShadow: "0 0 60px rgba(0,0,0,0.12)" }} />;
        });
      }
      break;
    }
    default:
      style = { opacity: entering ? (p > 0.5 ? 1 : 0) : 1 };
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {overlay}
    </AbsoluteFill>
  );
};

export const presentation = (spec?: TransitionSpec): TransitionPresentation<P> => ({
  component: Presentation,
  props: {
    kind: spec?.type ?? "fade",
    direction: spec?.direction ?? "left",
    x: spec?.x ?? 0.5,
    y: spec?.y ?? 0.5,
    colors: spec?.colors,
  },
});

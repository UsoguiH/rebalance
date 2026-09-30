import React from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { TransitionSpec } from "./types";

type P = { kind: TransitionSpec["type"]; direction: NonNullable<TransitionSpec["direction"]> };

const vec = (d: P["direction"]) => ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] })[d];

// One presentation component that covers every transition style the storyboard can ask for.
const Presentation: React.FC<TransitionPresentationComponentProps<P>> = ({
  children, presentationDirection, presentationProgress: p, passedProps,
}) => {
  const entering = presentationDirection === "entering";
  const [dx, dy] = vec(passedProps.direction);
  let style: React.CSSProperties = {};
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
      // fast push with motion blur, like a camera whip-pan
      const o = entering ? (1 - p) * 100 : -p * 100;
      const blur = Math.sin(p * Math.PI) * 24;
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
        const c = (1 - p) * 100;
        const clip = { left: `inset(0 0 0 ${c}%)`, right: `inset(0 ${c}% 0 0)`, up: `inset(${c}% 0 0 0)`, down: `inset(0 0 ${c}% 0)` }[passedProps.direction];
        style = { clipPath: clip };
      }
      break;
    }
    default:
      style = { opacity: entering ? (p > 0.5 ? 1 : 0) : 1 };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const presentation = (spec?: TransitionSpec): TransitionPresentation<P> => ({
  component: Presentation,
  props: { kind: spec?.type ?? "fade", direction: spec?.direction ?? "left" },
});

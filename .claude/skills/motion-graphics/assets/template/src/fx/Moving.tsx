import React, { useId } from "react";
import { useCurrentFrame } from "remotion";

export type Pose = { x?: number; y?: number; z?: number; s?: number; rx?: number; ry?: number; rz?: number; o?: number };

/**
 * Moves its children along a path given as a function of the frame and adds real directional
 * motion blur from the velocity (like a camera shutter), so fast moves look filmed, not computed.
 * `pose(f)` returns px / degrees / scale / opacity for frame f (relative to the parent Sequence).
 */
export const Moving: React.FC<{
  pose: (f: number) => Pose;
  blur?: number; // shutter strength, 0 = off, 1 = 180° shutter (default 0.6)
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ pose, blur = 0.6, children, style }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const p = pose(frame);
  const q = pose(frame - 1);
  const dx = (p.x ?? 0) - (q.x ?? 0);
  const dy = (p.y ?? 0) - (q.y ?? 0);
  const ds = ((p.s ?? 1) - (q.s ?? 1)) * 400; // zooming reads as radial-ish blur
  const bx = Math.min(40, Math.abs(dx) * blur * 0.5 + Math.abs(ds) * 0.3);
  const by = Math.min(40, Math.abs(dy) * blur * 0.5 + Math.abs(ds) * 0.3);
  const on = bx > 0.4 || by > 0.4;
  const tf = `translate3d(${p.x ?? 0}px, ${p.y ?? 0}px, ${p.z ?? 0}px) rotateX(${p.rx ?? 0}deg) rotateY(${p.ry ?? 0}deg) rotateZ(${p.rz ?? 0}deg) scale(${p.s ?? 1})`;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transformStyle: "preserve-3d", ...style }}>
      {on && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={`mb${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{ transform: tf, opacity: p.o ?? 1, filter: on ? `url(#mb${id})` : undefined, transformStyle: "preserve-3d" }}>{children}</div>
    </div>
  );
};

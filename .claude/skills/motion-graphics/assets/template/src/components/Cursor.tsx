import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, prog } from "../motion";
import { alpha, useTheme } from "../theme";

export type CursorStep = { t: number; x: number; y: number; click?: boolean; hand?: boolean };

/**
 * Animated pointer inside a positioned parent. x/y are fractions (0-1) of the parent,
 * t is seconds from scene start. A click shows a press + ripple.
 */
export const Cursor: React.FC<{ steps: CursorStep[]; size?: number; appearAt?: number }> = ({ steps, size = 44, appearAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  if (!steps.length) return null;
  const f = (s: number) => s * fps;
  let x = steps[0].x;
  let y = steps[0].y;
  let hand = !!steps[0].hand;
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    if (frame >= f(a.t)) {
      const p = prog(frame, f(a.t), f(b.t) - f(a.t), ease.inOut);
      x = a.x + (b.x - a.x) * p;
      y = a.y + (b.y - a.y) * p;
      hand = p > 0.8 ? !!b.hand || !!b.click : !!a.hand;
    }
  }
  const clicks = steps.filter((s) => s.click);
  let press = 0;
  let ripple: { p: number; x: number; y: number } | null = null;
  for (const c of clicks) {
    const d = frame - f(c.t);
    if (d >= -4 && d < 6) press = Math.max(press, 1 - Math.abs(d) / 5);
    if (d >= 0 && d < 18) ripple = { p: d / 18, x: c.x, y: c.y };
  }
  const opacity = appearAt !== undefined ? prog(frame, f(appearAt), 8) : 1;
  const s = size * t.u * (1 - press * 0.15);
  return (
    <>
      {ripple && (
        <div style={{
          position: "absolute", left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%`,
          width: 90 * t.u, height: 90 * t.u, marginLeft: -45 * t.u, marginTop: -45 * t.u, borderRadius: 999,
          border: `${3 * t.u}px solid ${alpha(t.colors.accent, 1 - ripple.p)}`,
          transform: `scale(${0.3 + ripple.p})`, pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, opacity, filter: `drop-shadow(0 ${3 * t.u}px ${6 * t.u}px rgba(0,0,0,0.35))`, zIndex: 50 }}>
        {hand ? (
          <svg width={s} height={s} viewBox="0 0 32 32" style={{ marginLeft: -s * 0.33, marginTop: -s * 0.05 }}>
            <path d="M12 3.5c1.1 0 2 .9 2 2V14l1-.2V11c0-1.1.9-2 2-2s2 .9 2 2v3l1 .1V12.5c0-1.1.9-2 2-2s2 .9 2 2v2.7l.6.1c1.1 0 2 .9 2 2V21c0 4.4-3.6 8-8 8h-2.2c-2.4 0-4.6-1.1-6.1-3L5 19.3c-.7-.9-.5-2.2.4-2.9.8-.6 2-.5 2.7.2l1.9 2V5.5c0-1.1.9-2 2-2z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={s} height={s} viewBox="0 0 32 32">
            <path d="M6 3l20 12.5-8.6 1.6 5.2 9.3-3.6 2-5.2-9.4L6 25.5z" fill="#111" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </>
  );
};

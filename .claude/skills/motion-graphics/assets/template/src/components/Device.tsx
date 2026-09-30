import React from "react";
import { Media } from "./Media";
import { useTheme } from "../theme";

export type DeviceKind = "iphone" | "ipad" | "ipad-landscape" | "macbook" | "browser";

type Props = {
  kind: DeviceKind;
  src: string; // screenshot / screen recording in public/
  width?: number; // px at 1080 short side (outer width of the device)
  scroll?: number; // 0 = top of the screenshot, 1 = bottom (for tall full-page captures)
  url?: string; // shown in the browser bar
  color?: "black" | "silver";
  screenStyle?: React.CSSProperties;
};

/** Code-drawn device frames (no image assets, so any size stays sharp and license-free). */
export const Device: React.FC<Props> = ({ kind, src, width, scroll = 0, url, color = "black", screenStyle }) => {
  const t = useTheme();
  const u = t.u;
  const pos = `50% ${Math.max(0, Math.min(1, scroll)) * 100}%`;
  const screen = (radius: number, extra: React.CSSProperties = {}) => (
    <div style={{ position: "absolute", overflow: "hidden", borderRadius: radius, background: "#000", ...extra }}>
      <Media src={src} style={{ objectPosition: pos, ...screenStyle }} />
    </div>
  );
  const shadow = `0 ${40 * u}px ${90 * u}px rgba(0,0,0,0.28), 0 ${8 * u}px ${24 * u}px rgba(0,0,0,0.18)`;
  const frameCol = color === "black" ? "#16171a" : "#d9dbe0";
  const rim = color === "black" ? "#3a3c42" : "#f4f5f7";

  if (kind === "iphone") {
    const w = (width ?? 420) * u;
    const h = w * 2.06;
    const b = w * 0.035;
    return (
      <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.165, background: frameCol, boxShadow: `${shadow}, inset 0 0 0 ${2 * u}px ${rim}` }}>
        {screen(w * 0.13, { left: b, top: b, right: b, bottom: b })}
        <div style={{ position: "absolute", left: "50%", top: b + w * 0.03, width: w * 0.29, height: w * 0.085, marginLeft: -w * 0.145, borderRadius: 999, background: "#000" }} />
        {[0.22, 0.31, 0.4].map((y, i) => (
          <div key={i} style={{ position: "absolute", left: -3 * u, top: h * y, width: 4 * u, height: h * (i === 0 ? 0.04 : 0.07), borderRadius: 2 * u, background: frameCol }} />
        ))}
        <div style={{ position: "absolute", right: -3 * u, top: h * 0.3, width: 4 * u, height: h * 0.1, borderRadius: 2 * u, background: frameCol }} />
      </div>
    );
  }

  if (kind === "ipad" || kind === "ipad-landscape") {
    const land = kind === "ipad-landscape";
    const w = (width ?? (land ? 1000 : 640)) * u;
    const h = land ? w / 1.43 : w * 1.43;
    const b = w * (land ? 0.028 : 0.04);
    return (
      <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.06, background: frameCol, boxShadow: `${shadow}, inset 0 0 0 ${2 * u}px ${rim}` }}>
        {screen(w * 0.03, { left: b, top: b, right: b, bottom: b })}
        <div style={{ position: "absolute", width: 8 * u, height: 8 * u, borderRadius: 99, background: "#2b2d33", ...(land ? { left: b / 2 - 4 * u, top: "50%" } : { top: b / 2 - 4 * u, left: "50%" }) }} />
      </div>
    );
  }

  if (kind === "macbook") {
    const w = (width ?? 1200) * u;
    const lidW = w * 0.86;
    const bez = lidW * 0.018;
    const scrH = (lidW - bez * 2) / 1.6;
    const lidH = scrH + bez * 2.6;
    return (
      <div style={{ position: "relative", width: w, height: lidH + w * 0.032, filter: `drop-shadow(0 ${40 * u}px ${60 * u}px rgba(0,0,0,0.25))` }}>
        <div style={{ position: "absolute", left: (w - lidW) / 2, top: 0, width: lidW, height: lidH, borderRadius: `${lidW * 0.025}px ${lidW * 0.025}px 0 0`, background: "#0d0e10", boxShadow: `inset 0 0 0 ${2 * u}px #2c2e33` }}>
          {screen(lidW * 0.008, { left: bez, top: bez * 1.2, width: lidW - bez * 2, height: scrH })}
          <div style={{ position: "absolute", left: "50%", top: 0, width: lidW * 0.1, height: bez * 1.3, marginLeft: -lidW * 0.05, borderRadius: `0 0 ${6 * u}px ${6 * u}px`, background: "#0d0e10" }} />
        </div>
        <div style={{ position: "absolute", left: 0, top: lidH, width: w, height: w * 0.022, borderRadius: `${2 * u}px ${2 * u}px ${w * 0.02}px ${w * 0.02}px`, background: "linear-gradient(#e3e5ea, #aeb2ba)" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, width: w * 0.12, height: w * 0.008, marginLeft: -w * 0.06, borderRadius: `0 0 ${8 * u}px ${8 * u}px`, background: "#9da1a9" }} />
        </div>
      </div>
    );
  }

  // browser window
  const w = (width ?? 1300) * u;
  const bar = 54 * u;
  const h = bar + (w / 1.6);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 18 * u, overflow: "hidden", background: "#fff", boxShadow: `${shadow}, 0 0 0 ${1 * u}px rgba(0,0,0,0.08)` }}>
      <div style={{ position: "absolute", inset: 0, height: bar, background: "#f3f3f5", borderBottom: `${1 * u}px solid #e2e2e6`, display: "flex", alignItems: "center", padding: `0 ${20 * u}px`, gap: 9 * u }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 13 * u, height: 13 * u, borderRadius: 99, background: c }} />)}
        <div style={{ margin: "0 auto", width: w * 0.42, height: 30 * u, borderRadius: 9 * u, background: "#fff", border: `${1 * u}px solid #e2e2e6`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.fonts.body, fontSize: 15 * u, color: "#666" }}>
          {url ?? t.url?.replace(/^https?:\/\//, "") ?? ""}
        </div>
        <div style={{ width: 13 * u * 3 + 18 * u }} />
      </div>
      {screen(0, { left: 0, top: bar, right: 0, bottom: 0 })}
    </div>
  );
};

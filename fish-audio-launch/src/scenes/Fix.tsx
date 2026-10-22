import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Bars } from "../components/Bars";
import { Camera } from "../components/Camera";
import { Cursor } from "../components/Cursor";
import { Rig, SceneShell, rigScale } from "../components/SceneShell";
import { C, COPY, EASE, Emotion, FONT, T } from "../config";
import { enter, hash, lerp, press, rise, smoothNoise } from "../lib/motion";

// Window layout (window-local px). Rebuilt from the fish.audio text-to-speech panel.
const WIN = { w: 1280, h: 780 };
const TEXTAREA = { x: 40, y: 176, w: 1200, h: 236 };
const TAGS_BTN = { x: 40, y: 432, w: 140, h: 60 };
const GEN_BTN = { x: 960, y: 432, w: 280, h: 60 };
const POPOVER = { x: 40, y: 506, w: 660, h: 220 };
const WAVE = { x: 40, y: 512, w: 1200, h: 232 };
const NBARS = 112;

const emotionColor = (e: Emotion) => C[e];
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// Expressive waveform: each segment has its own shape.
const barShape = (i: number) => {
  const u = i / (NBARS - 1);
  const seg = COPY.fix.segments.find((s) => u >= s.from && u <= s.to) ?? COPY.fix.segments[0];
  const edge = Math.min(u - seg.from, seg.to - u);
  const gap = Math.min(1, edge / 0.025); // brief silence between segments
  let a: number;
  if (seg.emotion === "whisper") a = 0.14 + 0.16 * smoothNoise(i * 0.45, 1);
  else if (seg.emotion === "sob") a = (0.3 + 0.42 * smoothNoise(i * 0.32, 2)) * (0.72 + 0.28 * Math.sin(i * 1.35));
  else a = 0.2 + 0.74 * Math.pow(Math.max(0, Math.sin(i * 0.95)), 1.4) * (0.8 + 0.2 * hash(i));
  return { h: a * gap, emotion: seg.emotion };
};
const SHAPES = Array.from({ length: NBARS }, (_, i) => barShape(i));

const TEXT = COPY.fix.script.filter((t) => "text" in t).map((t) => (t as { text: string }).text);
const TEXT_LEN = TEXT.join(" ").length;

// Scene 3 · Tag it, hear it (fix).
export const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = T.fix;

  // Typing.
  const typed = Math.floor(lerp(frame, [t.typeStart, t.typeEnd], [0, TEXT_LEN], Easing.linear));
  let budget = typed;
  const typedText = TEXT.map((s, idx) => {
    const take = Math.max(0, Math.min(s.length, budget));
    budget -= s.length + (idx < TEXT.length - 1 ? 1 : 0);
    return s.slice(0, take);
  });

  // Tags drop into the script in order.
  let tagIndex = 0;
  const tokens = COPY.fix.script.map((tok) => {
    if ("tag" in tok) {
      const at = t.inserts[tagIndex++];
      return { kind: "tag" as const, tag: tok.tag, emotion: tok.emotion, at };
    }
    return { kind: "text" as const, text: tok.text };
  });
  let textIdx = 0;
  const insertedTagChars = tokens
    .filter((x) => x.kind === "tag" && frame >= x.at)
    .reduce((n, x) => n + (x.kind === "tag" ? x.tag.length + 1 : 0), 0);

  // Playback.
  const play = interpolate(frame, [t.playStart, t.playEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const playing = frame >= t.playStart && frame < t.playEnd;
  const generated = frame >= t.generateClick;
  const segAt = (u: number) => COPY.fix.segments.find((s) => u >= s.from && u <= s.to);

  // How far each emotion's words are lit (karaoke), 0..1.
  const lit = (e: Emotion) => {
    const s = COPY.fix.segments.find((x) => x.emotion === e)!;
    return Math.min(1, Math.max(0, (play - s.from) / (s.to - s.from)));
  };

  // Camera: zoom toward Generate & play on the click, then ease back.
  const scale = rigScale(width, height, WIN.w, WIN.h);
  const g = center(GEN_BTN);
  const gx = (g.x - WIN.w / 2) * scale;
  const gy = (g.y - WIN.h / 2) * scale;
  const Z = 1.3;
  const camKeys = [
    { f: t.zoomIn[0], s: 1, x: 0, y: 0 },
    { f: t.zoomIn[1], s: Z, x: -gx * Z * 0.8, y: -gy * Z * 0.8 },
    { f: t.zoomOut[0], s: Z, x: -gx * Z * 0.8, y: -gy * Z * 0.8 },
    { f: t.zoomOut[1], s: 1, x: 0, y: 0 },
  ];

  const win = enter(frame, 0);
  const row = (n: number) => rise(enter(frame, 6 + n * 3), 24);
  const pop = enter(frame, t.tagsClick + 2) * (1 - lerp(frame, [t.popoverClose, t.popoverClose + 12], [0, 1], EASE.in));
  const chipPos = (i: number) => ({
    x: POPOVER.x + 28 + (i % 3) * 206 + 95,
    y: POPOVER.y + 76 + Math.floor(i / 3) * 70 + 26,
  });
  const tagBtn = center(TAGS_BTN);
  const genScale = press(frame, t.generateClick);

  return (
    <SceneShell>
      <Camera keys={camKeys} push={0.02}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Rig w={WIN.w} h={WIN.h}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: Math.min(1, win * 1.5),
                transform: `translateY(${(1 - win) * 120}px) scale(${0.94 + 0.06 * win})`,
                background: C.paper,
                borderRadius: 32,
                boxShadow: "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
                fontFamily: FONT.sans,
                color: C.ink,
              }}
            >
              {/* Tabs + model pill */}
              <div style={{ ...row(0), position: "absolute", left: 40, top: 32, right: 40, display: "flex", alignItems: "center", gap: 10 }}>
                {COPY.fix.tabs.map((tab, i) => (
                  <div
                    key={tab}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 999,
                      fontSize: 22,
                      fontWeight: 500,
                      background: i === 0 ? C.ink : "transparent",
                      color: i === 0 ? C.paper : C.dim,
                    }}
                  >
                    {tab}
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: `1.5px solid ${C.paperLine}`,
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: C.teal, boxShadow: `0 0 12px ${C.tealGlow}` }} />
                  {COPY.fix.model}
                </div>
              </div>

              {/* Language + voice */}
              <div style={{ ...row(1), position: "absolute", left: 40, top: 104, display: "flex", gap: 14 }}>
                {[COPY.fix.language, COPY.fix.voice].map((label, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 20px 8px 10px",
                      borderRadius: 999,
                      background: "#f5f3f1",
                      fontSize: 21,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background: i === 0 ? "#e5e0dc" : `linear-gradient(135deg, ${C.laugh}, ${C.sob})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        color: C.dim,
                      }}
                    >
                      {i === 0 ? "EN" : ""}
                    </span>
                    {label}
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth={3}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Script text area */}
              <div
                style={{
                  ...row(2),
                  position: "absolute",
                  left: TEXTAREA.x,
                  top: TEXTAREA.y,
                  width: TEXTAREA.w,
                  height: TEXTAREA.h,
                  boxSizing: "border-box",
                  border: `1.5px solid ${C.paperLine}`,
                  borderRadius: 24,
                  padding: "34px 38px",
                  fontSize: 46,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.45,
                  display: "flex",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                  columnGap: 14,
                }}
              >
                {tokens.map((tok, i) => {
                  if (tok.kind === "tag") {
                    const p = enter(frame, tok.at);
                    const w = Math.min(1, Math.max(0, lerp(frame, [tok.at, tok.at + 14], [0, 1], EASE.out)));
                    if (frame < tok.at) return null;
                    const col = emotionColor(tok.emotion);
                    return (
                      <span key={i} style={{ display: "inline-flex", maxWidth: w * 340, overflow: "hidden", alignItems: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            transform: `scale(${0.6 + 0.4 * p})`,
                            fontFamily: FONT.mono,
                            fontSize: 30,
                            fontWeight: 500,
                            padding: "4px 14px",
                            borderRadius: 12,
                            background: `${col}33`,
                            color: C.ink,
                            border: `2px solid ${col}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tok.tag}
                        </span>
                      </span>
                    );
                  }
                  const s = typedText[textIdx];
                  const e: Emotion = textIdx++ === 0 ? "whisper" : "sob";
                  const fill = lit(e) * 100;
                  const col = emotionColor(e);
                  const typingHere = frame < t.typeEnd + 30 && s.length > 0 && (textIdx === TEXT.length || typedText[textIdx]?.length === 0);
                  return (
                    <span
                      key={i}
                      style={{
                        whiteSpace: "pre",
                        background: `linear-gradient(to right, ${col}55 ${fill}%, transparent ${fill}%)`,
                        borderRadius: 8,
                      }}
                    >
                      {s}
                      {typingHere && (
                        <span style={{ display: "inline-block", width: 3, height: 50, marginLeft: 3, background: C.ink, verticalAlign: "-8px", opacity: Math.floor(frame / 16) % 2 ? 0 : 1 }} />
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Bottom row: Tags · count · Generate */}
              <div style={{ ...row(3) }}>
                <div
                  style={{
                    position: "absolute",
                    left: TAGS_BTN.x,
                    top: TAGS_BTN.y,
                    width: TAGS_BTN.w,
                    height: TAGS_BTN.h,
                    borderRadius: 999,
                    border: `1.5px solid ${frame >= t.tagsClick && frame < t.popoverClose ? C.ink : C.paperLine}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontSize: 22,
                    fontWeight: 600,
                    transform: `scale(${press(frame, t.tagsClick)})`,
                  }}
                >
                  <span style={{ fontFamily: FONT.mono, fontSize: 20, color: C.teal }}>[ ]</span>
                  {COPY.fix.tagsButton}
                </div>
                <div style={{ position: "absolute", left: TAGS_BTN.x + TAGS_BTN.w + 24, top: TAGS_BTN.y + 17, fontFamily: FONT.mono, fontSize: 20, color: C.dim }}>
                  {typed + insertedTagChars}/30000
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: GEN_BTN.x,
                    top: GEN_BTN.y,
                    width: GEN_BTN.w,
                    height: GEN_BTN.h,
                    borderRadius: 999,
                    background: C.ink,
                    color: C.paper,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    fontSize: 23,
                    fontWeight: 600,
                    transform: `scale(${genScale})`,
                    boxShadow: generated ? `0 0 0 ${6 + 4 * Math.sin(frame / 6)}px ${C.teal}33` : "none",
                  }}
                >
                  {playing ? (
                    <>
                      <Bars
                        heights={[0, 1, 2, 3].map((k) => 0.35 + 0.65 * Math.abs(Math.sin(frame / 7 + k * 1.3)))}
                        colors={C.paper}
                        width={34}
                        height={24}
                        gap={0.35}
                        minHeight={4}
                      />
                      Playing
                    </>
                  ) : (
                    <>
                      <svg width={18} height={20} viewBox="0 0 18 20">
                        <path d="M2 1.5 L16.5 10 L2 18.5 Z" fill={C.paper} />
                      </svg>
                      {COPY.fix.generate}
                    </>
                  )}
                </div>
              </div>

              {/* Waveform panel */}
              <div
                style={{
                  ...row(4),
                  position: "absolute",
                  left: WAVE.x,
                  top: WAVE.y,
                  width: WAVE.w,
                  height: WAVE.h,
                  borderRadius: 24,
                  background: "#f5f3f1",
                  overflow: "hidden",
                }}
              >
                {COPY.fix.segments.map((s, i) => {
                  const p = enter(frame, t.playStart + s.from * (t.playEnd - t.playStart) - 4);
                  return (
                    <div
                      key={s.label}
                      style={{
                        position: "absolute",
                        left: 32 + s.from * (WAVE.w - 64),
                        top: 22,
                        ...rise(p, 14),
                        fontFamily: FONT.mono,
                        fontSize: 18,
                        fontWeight: 500,
                        padding: "4px 12px",
                        borderRadius: 8,
                        background: `${emotionColor(s.emotion)}40`,
                        color: C.ink,
                        zIndex: i,
                      }}
                    >
                      {s.label}
                    </div>
                  );
                })}
                <div style={{ position: "absolute", left: 32, top: 66 }}>
                  <Bars
                    width={WAVE.w - 64}
                    height={136}
                    gap={0.42}
                    minHeight={4}
                    heights={SHAPES.map((b, i) => {
                      const u = i / (NBARS - 1);
                      const drawn = Math.min(1, Math.max(0, enter(frame, t.drawStart + i * 0.25)));
                      const near = playing && Math.abs(u - play) < 0.03 ? 1 + 0.3 * Math.sin(frame * 0.9 + i) : 1;
                      return frame < t.drawStart ? 0 : b.h * drawn * near;
                    })}
                    colors={SHAPES.map((b, i) => (i / (NBARS - 1) <= play ? emotionColor(b.emotion) : "#d9d3cf"))}
                  />
                </div>
                {frame >= t.playStart && (
                  <div
                    style={{
                      position: "absolute",
                      left: 32 + play * (WAVE.w - 64),
                      top: 56,
                      width: 3,
                      height: 156,
                      borderRadius: 2,
                      background: C.ink,
                      opacity: frame > t.playEnd ? lerp(frame, [t.playEnd, t.playEnd + 12], [1, 0]) : 1,
                    }}
                  />
                )}
                <div style={{ position: "absolute", right: 32, bottom: 18, fontFamily: FONT.mono, fontSize: 16, color: C.dim }}>
                  {`0:${(play * 5.6).toFixed(1).padStart(4, "0")} / 0:05.6`}
                </div>
                {!generated && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      color: "#b5aea9",
                      opacity: 1 - pop,
                    }}
                  >
                    Your audio will appear here
                  </div>
                )}
                {generated && (
                  <div style={{ position: "absolute", left: 32, bottom: 18, fontFamily: FONT.mono, fontSize: 16, color: C.dim, opacity: lerp(frame, [t.drawStart, t.drawStart + 20], [0, 1]) }}>
                    {segAt(play)?.label ? `${COPY.fix.voice} · ${segAt(play)!.label}` : COPY.fix.voice}
                  </div>
                )}
              </div>

              {/* Tags popover */}
              {pop > 0.01 && (
                <div
                  style={{
                    position: "absolute",
                    left: POPOVER.x,
                    top: POPOVER.y,
                    width: POPOVER.w,
                    height: POPOVER.h,
                    boxSizing: "border-box",
                    background: "#ffffff",
                    borderRadius: 22,
                    boxShadow: "0 24px 60px rgba(15,14,13,0.18), 0 0 0 1px rgba(15,14,13,0.06)",
                    opacity: Math.min(1, pop),
                    transform: `translateY(${(1 - pop) * -16}px) scale(${0.96 + 0.04 * pop})`,
                    transformOrigin: "20% 0",
                    padding: "22px 28px",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.dim, letterSpacing: "0.08em" }}>EMOTIONS</div>
                  {COPY.fix.chips.map((chip, i) => {
                    const p = enter(frame, t.tagsClick + 6 + i * 3);
                    const pos = chipPos(i);
                    const clickAt = i < t.inserts.length ? t.inserts[i] : undefined;
                    const picked = clickAt !== undefined && frame >= clickAt;
                    const col = chip.emotion ? emotionColor(chip.emotion) : C.paperLine;
                    return (
                      <div
                        key={chip.tag}
                        style={{
                          position: "absolute",
                          left: pos.x - POPOVER.x - 95,
                          top: pos.y - POPOVER.y - 26,
                          width: 190,
                          height: 52,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: FONT.mono,
                          fontSize: 21,
                          fontWeight: 500,
                          border: `2px solid ${picked ? col : C.paperLine}`,
                          background: picked ? `${col}33` : "#ffffff",
                          opacity: Math.min(1, Math.max(0, p)),
                          transform: `translateY(${(1 - p) * 16}px) scale(${clickAt !== undefined ? press(frame, clickAt) : 1})`,
                        }}
                      >
                        {chip.tag}
                      </div>
                    );
                  })}
                </div>
              )}

              <Cursor
                appear={70}
                hide={400}
                clicks={[t.tagsClick, ...t.inserts, t.generateClick]}
                stops={[
                  { f: 70, x: 760, y: 860 },
                  { f: t.tagsClick - 4, x: tagBtn.x + 10, y: tagBtn.y + 6 },
                  { f: t.inserts[0] - 5, x: chipPos(0).x + 8, y: chipPos(0).y + 6 },
                  { f: t.inserts[1] - 5, x: chipPos(1).x + 8, y: chipPos(1).y + 6 },
                  { f: t.inserts[2] - 5, x: chipPos(2).x + 8, y: chipPos(2).y + 6 },
                  { f: t.generateClick - 6, x: g.x + 30, y: g.y + 8 },
                  { f: 372, x: 1180, y: 860 },
                ]}
              />
            </div>
          </Rig>
        </AbsoluteFill>
      </Camera>
    </SceneShell>
  );
};

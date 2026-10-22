import { Easing } from "remotion";
import timeline from "./timeline.json";

export const T = timeline;

// Brand colours, sampled from fish.audio.
export const C = {
  bg: "#0f0e0d",
  bgRaised: "#191715",
  line: "#2c2926",
  cream: "#f4eeeb",
  paper: "#fdfcfc",
  paperLine: "#e9e4e1",
  ink: "#0f0e0d",
  muted: "#a6a09b",
  dim: "#766f6a",
  teal: "#0089a8",
  tealGlow: "#3cc3df",
  // Emotion palette for the tags.
  whisper: "#7fb2ff",
  sob: "#a493ff",
  laugh: "#ffb35c",
  excited: "#ff7d5c",
};

export const FONT = {
  sans: '"Onest", system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, monospace',
};

// Motion constants from the launch-motion skill.
export const EASE = {
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
};

export const ENTER = 30; // entrance length, frames
export const EXIT = Math.round(ENTER * 0.6); // exits are ~60% of entrances

export type Emotion = "whisper" | "sob" | "laugh";
export type ScriptToken = { tag: string; emotion: Emotion } | { text: string };

export const COPY = {
  hook: {
    chip: "GENERIC TTS",
    readout: ["pitch variance 0.00", "emotion  none"],
    lines: [["Most", "AI", "voices", "sound"], ["exactly", "like", "this."]],
  },
  problem: {
    line: "I can't believe you actually came back.",
    button: "Regenerate",
    takes: ["Take 1 · flat", "Take 2 · flat", "Take 3 · still flat"],
    counterLabel: "Takes",
    counterFrom: 3,
    counterTo: 47,
    headline: [["47", "takes."], ["Still", "zero", "emotion."]],
  },
  fix: {
    tabs: ["Text To Speech", "Voice Cloning", "Speech To Text"],
    language: "English",
    voice: "Sarah",
    model: "Drama 3",
    generate: "Generate & play",
    tagsButton: "Tags",
    chips: [
      { tag: "[whispering]", emotion: "whisper" as Emotion },
      { tag: "[sobbing]", emotion: "sob" as Emotion },
      { tag: "[laughing]", emotion: "laugh" as Emotion },
      { tag: "[excited]", emotion: null },
      { tag: "[sighing]", emotion: null },
      { tag: "[pause]", emotion: null },
    ],
    // The script, as tokens. Tags appear at the insert frames in timeline.json, in order.
    script: [
      { tag: "[whispering]", emotion: "whisper" },
      { text: "I can't believe" },
      { tag: "[sobbing]", emotion: "sob" },
      { text: "you actually came back." },
      { tag: "[laughing]", emotion: "laugh" },
    ] as ScriptToken[],
    segments: [
      { emotion: "whisper" as Emotion, label: "whispering", from: 0, to: 0.34 },
      { emotion: "sob" as Emotion, label: "sobbing", from: 0.34, to: 0.72 },
      { emotion: "laugh" as Emotion, label: "laughing", from: 0.72, to: 1 },
    ],
  },
  payoff: {
    headline: [["Voice", "AI", "that", "doesn't", "sound"], ["like", "an", "AI", "voice."]],
    stats: [
      { value: 2000000, suffix: "+", label: "voices in the library" },
      { value: 15, suffix: " s", label: "to clone any voice" },
      { value: 30, suffix: "+", label: "languages, any voice" },
      { value: 8, suffix: "M+", label: "creators on Fish Audio" },
    ],
  },
  logo: {
    wordmark: "Fish Audio",
    badge: "Introducing Drama 3",
    tagline: "The most expressive AI speech.",
    cta: "Try it free",
    url: "fish.audio",
  },
};

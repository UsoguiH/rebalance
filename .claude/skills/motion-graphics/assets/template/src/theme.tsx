import React, { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";
import { useFontFamily } from "./fonts";
import type { Brand } from "./types";

export type Theme = Brand & {
  fonts: { body: string; display: string };
  u: number; // 1 unit = 1px at a 1080px short side; multiply every size by u
  portrait: boolean;
  square: boolean;
  W: number;
  H: number;
  dir: "rtl" | "ltr";
};

const norm = (hex: string) => {
  const h = hex.replace("#", "");
  return h.length === 3 || h.length === 4 ? h.split("").map((c) => c + c).join("") : h;
};

const Ctx = createContext<Theme | null>(null);

export const ThemeProvider: React.FC<{ brand: Brand; children: React.ReactNode }> = ({ brand, children }) => {
  const { width, height } = useVideoConfig();
  const body = useFontFamily(brand.font, brand.rtl ? "IBM Plex Sans Arabic" : "Inter");
  const display = useFontFamily(brand.displayFont ?? brand.font, brand.rtl ? "IBM Plex Sans Arabic" : "Inter");
  // House rule: videos are always light / white. A dark brand background (e.g. from a dark website)
  // is replaced by white with near-black text; the brand keeps its accent colour.
  const lightBg = isLight(brand.colors.bg) ? brand.colors.bg : "#FFFFFF";
  const fg = isLight(brand.colors.bg) ? brand.colors.fg : "#111111";
  const theme: Theme = {
    ...brand,
    colors: { muted: "#6f6f6f", ...brand.colors, bg: lightBg, fg, dark: "#F1F1EE" },
    fonts: { body, display },
    u: Math.min(width, height) / 1080,
    portrait: height > width * 1.1,
    square: Math.abs(height - width) < width * 0.1,
    W: width,
    H: height,
    dir: brand.rtl ? "rtl" : "ltr",
  };
  return <Ctx.Provider value={theme}>{children}</Ctx.Provider>;
};

export const useTheme = (): Theme => {
  const t = useContext(Ctx);
  if (!t) throw new Error("useTheme outside ThemeProvider");
  return t;
};

/** True when a colour is light enough to be a background in this (always light) style. */
export const isLight = (hex: string) => {
  const h = norm(hex || "#ffffff");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.72;
};

/** Pick readable text color for a background (#rrggbb). */
export const onColor = (hex: string, light = "#ffffff", dark = "#111111") => {
  const h = norm(hex);
  if (h.length < 6) return dark;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? dark : light;
};

/** Mix a hex color with alpha → rgba() */
export const alpha = (hex: string, a: number) => {
  const h = norm(hex);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

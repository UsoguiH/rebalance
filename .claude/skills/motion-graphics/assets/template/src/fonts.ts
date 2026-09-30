import { continueRender, delayRender, staticFile } from "remotion";
import { LOCAL_FONTS } from "./fonts.generated";

// Fonts are downloaded into public/fonts by scripts/fetch_fonts.py (listed in fonts.generated.ts),
// so rendering never depends on the network. A family that is missing there is looked up as
// public/fonts/<Family>.woff2 (e.g. the brand's own font file).

const localFamilies = new Set(LOCAL_FONTS.map((f) => f.family));

if (typeof document !== "undefined" && LOCAL_FONTS.length) {
  const handle = delayRender("Loading local fonts");
  Promise.all(
    LOCAL_FONTS.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, {
        weight: f.weight, style: f.style, ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}),
      });
      return face.load().then((ff) => { document.fonts.add(ff); }).catch(() => undefined);
    }),
  ).then(() => continueRender(handle));
}

const extra: Record<string, boolean> = {};

/** CSS font-family for a family name, with sensible fallbacks. */
export const useFontFamily = (name: string | undefined, fallback = "Inter"): string => {
  const family = name || fallback;
  if (!localFamilies.has(family) && !extra[family] && typeof document !== "undefined") {
    extra[family] = true;
    const handle = delayRender(`font ${family}`);
    new FontFace(family, `url(${staticFile(`fonts/${family}.woff2`)})`).load()
      .then((f) => { document.fonts.add(f); continueRender(handle); })
      .catch(() => { console.warn(`Font ${family} not found; run scripts/fetch_fonts.py`); continueRender(handle); });
  }
  return `"${family}", "${fallback}", system-ui, -apple-system, "Segoe UI", sans-serif`;
};

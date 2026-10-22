import React from "react";

// A row of rounded bars, centred vertically on a baseline. Heights are 0..1.
export const Bars: React.FC<{
  heights: number[];
  colors: string[] | string;
  width: number;
  height: number;
  gap?: number;
  minHeight?: number;
  opacities?: number[];
}> = ({ heights, colors, width, height, gap = 0.45, minHeight = 6, opacities }) => {
  const n = heights.length;
  const slot = width / n;
  const bw = slot * (1 - gap);
  return (
    <div style={{ position: "relative", width, height }}>
      {heights.map((h, i) => {
        const bh = Math.max(minHeight, h * height);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * slot + (slot - bw) / 2,
              top: (height - bh) / 2,
              width: bw,
              height: bh,
              borderRadius: bw,
              background: Array.isArray(colors) ? colors[i] : colors,
              opacity: opacities ? opacities[i] : 1,
            }}
          />
        );
      })}
    </div>
  );
};

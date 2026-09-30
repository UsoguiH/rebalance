import React from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";

/** Show an image or a video from public/ (or an https URL). */
export const Media: React.FC<{ src: string; style?: React.CSSProperties; muted?: boolean }> = ({ src, style, muted = true }) => {
  const url = /^https?:/.test(src) ? src : staticFile(src);
  if (/\.(mp4|webm|mov)$/i.test(src)) {
    return <OffthreadVideo src={url} muted={muted} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />;
  }
  return <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />;
};

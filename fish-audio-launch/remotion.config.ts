import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");

// Point Remotion at an existing headless Chrome (e.g. Playwright's) instead of downloading one.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}

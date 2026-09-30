import type React from "react";
import type { SceneProps } from "../types";
import { EndCardScene, ImageScene, KineticScene, LogoScene, StatScene } from "./basic";
import { CardsScene, CursorScene, DeviceScene, FeaturesScene, LogoCloudScene } from "./product";
import { custom } from "./custom";
import { ClickButtonScene, CollageScene, FeedScene, FrameToLogoScene, LockupScene, MarqueeScene, NotifyCycleScene, ResizeScene, TagsDropScene, VortexScene, WarpTextScene, WaveformScene, WordSwapScene } from "./studio";
import { ExplodeScene, HeroDeviceScene, MorphScene, ParticleLogoScene, PromptGlowScene, TextMaskScene } from "./signature";

// scene.type -> component. Bespoke scenes live in ./custom and are used with type "custom".
export const SCENES: Record<string, React.FC<SceneProps>> = {
  kinetic: KineticScene,
  logo: LogoScene,
  endCard: EndCardScene,
  image: ImageScene,
  stat: StatScene,
  device: DeviceScene,
  cards: CardsScene,
  cursor: CursorScene,
  logoCloud: LogoCloudScene,
  features: FeaturesScene,
  // signature moves
  heroDevice: HeroDeviceScene,
  explode: ExplodeScene,
  textMask: TextMaskScene,
  particleLogo: ParticleLogoScene,
  promptGlow: PromptGlowScene,
  morph: MorphScene,
  // studio moves (studied from professional launch films)
  warpText: WarpTextScene,
  wordSwap: WordSwapScene,
  lockup: LockupScene,
  frameToLogo: FrameToLogoScene,
  feed: FeedScene,
  marquee: MarqueeScene,
  notifyCycle: NotifyCycleScene,
  collage: CollageScene,
  vortex: VortexScene,
  resize: ResizeScene,
  tagsDrop: TagsDropScene,
  waveform: WaveformScene,
  clickButton: ClickButtonScene,
};

export const resolveScene = (type: string, component?: string): React.FC<SceneProps> | undefined =>
  type === "custom" ? custom[component ?? ""] : SCENES[type];

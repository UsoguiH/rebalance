import type React from "react";
import type { SceneProps } from "../types";
import { EndCardScene, ImageScene, KineticScene, LogoScene, StatScene } from "./basic";
import { CardsScene, CursorScene, DeviceScene, FeaturesScene, LogoCloudScene } from "./product";
import { custom } from "./custom";

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
};

export const resolveScene = (type: string, component?: string): React.FC<SceneProps> | undefined =>
  type === "custom" ? custom[component ?? ""] : SCENES[type];

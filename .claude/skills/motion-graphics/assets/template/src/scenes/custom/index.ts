import type React from "react";
import type { SceneProps } from "../../types";

// Bespoke scenes written for this particular video. Add a file next to this one, export a
// React.FC<SceneProps>, register it here, then use {"type": "custom", "component": "<Name>"}.
export const custom: Record<string, React.FC<SceneProps>> = {};

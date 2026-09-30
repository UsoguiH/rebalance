// Shape of src/video.json: the single storyboard file every script reads and writes.

export type Cue = { text: string; start: number; end: number }; // seconds, relative to the voice clip
export type Sfx = { at: number; name: string; volume?: number }; // at = seconds from scene start

export type TransitionSpec = {
  type: "fade" | "slide" | "zoom" | "wipe" | "whip" | "blur" | "none";
  duration?: number; // seconds, default 0.5
  direction?: "left" | "right" | "up" | "down";
};

export type Scene = {
  id: string;
  type: string; // kinetic | logo | device | cards | cursor | logoCloud | features | stat | image | endCard | custom
  duration: number; // seconds (tts.py stretches it to fit the voice)
  vo?: string; // narration text for this scene (tts.py turns it into audio)
  voice?: string; // public/ path of the rendered voice clip
  voiceDuration?: number;
  voiceDelay?: number; // seconds after scene start before the voice starts (default 0.3)
  captions?: Cue[];
  background?: "brand" | "gradient" | "grid" | "none"; // always light ("dark"/"accent" are mapped to light)
  transition?: TransitionSpec; // transition INTO the next scene
  sfx?: Sfx[];
  component?: string; // for type "custom"
  props?: Record<string, any>;
};

export type Brand = {
  name: string;
  url?: string;
  logo?: string; // public/ path, for light backgrounds
  logoDark?: string; // public/ path, for dark surfaces (rare: videos are always light)
  logoInvert?: boolean; // true when the only logo is white (made for a dark site): renders it black
  icon?: string; // square app icon / symbol
  colors: { bg: string; fg: string; accent: string; accent2?: string; muted?: string; dark?: string };
  font?: string; // UI/body font (Google Fonts family name)
  displayFont?: string; // headline font
  rtl?: boolean; // Arabic/Hebrew narration + on-screen text
};

export type VideoSpec = {
  meta: { title: string; fps: number; width: number; height: number };
  brand: Brand;
  audio?: {
    music?: string;
    musicVolume?: number; // 0-1, default 0.55
    duckTo?: number; // music level while the voice speaks, default 0.22
    musicTrimBefore?: number; // seconds to skip at the start of the track
    fadeOut?: number; // seconds, default 1.5
  };
  captions?: boolean;
  autoWhoosh?: boolean; // add a whoosh on every transition (default true if sfx files exist)
  scenes: Scene[];
};

export type SceneProps = {
  scene: Scene;
  props: Record<string, any>;
  durationInFrames: number;
};

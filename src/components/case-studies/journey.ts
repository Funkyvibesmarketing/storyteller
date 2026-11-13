import type { Direction } from "@/config/case-studies";

/**
 * The journey runs on a scene clock `q`: q = k means scene k is at rest in front of
 * the camera, q = k ± 0.5 is the hand-off to the neighbouring scene.
 * Inside one scene, `u = q - k` runs from -0.5 (nothing on screen yet) to +0.5 (all gone).
 */
export const JOURNEY = {
  /**
   * "flythrough" (like 71three.com/latest-work): every block stays still in 3D space and
   * the camera flies straight forward at a constant speed as you scroll. Blocks fade in
   * from the distance and pass by / through the camera — no enter/exit animations.
   * "slides": the older per-slide enter/exit animation engine.
   */
  mode: "flythrough" as "flythrough" | "slides",
  fov: 75,
  /** Camera distance to a scene at rest. */
  read: 24,
  /**
   * Depth between two scenes. Kept below `fadeStart` so the next scene is always already
   * visible (small, in the distance) while the camera passes the current one — the screen
   * is never empty between scenes, like the reference.
   */
  spacing: 45,
  /** 0 = constant camera speed, →1 = camera nearly stops at each scene and rushes between them. */
  hold: 0,
  /** Scroll length of one scene, in screen heights (45 units ÷ ~34 units per screen, as the reference). */
  sceneScreens: 1.32,
  /** Fly-through fade: fully visible within `fadeStart` of the camera, invisible past `fadeEnd`. */
  fadeStart: 50,
  fadeEnd: 60,
  /** Fly-through: depth between consecutive blocks of one scene (they pass one by one). */
  blockGap: 7,
  /** …but a scene never spreads deeper than this. */
  blockSpread: 24,
  /**
   * Fly-through exit: after the camera passes a block's reading point, the block drifts
   * this many world units sideways per unit the camera advances (bigger = leaves sooner).
   */
  exitDrift: 0,
  /**
   * Fly-through: something sitting right in the camera's path (no gap to fly through)
   * fades out over this many world units before the camera reaches it — no pop.
   */
  passFade: 6,
  /** Fly-through backdrop: fades out between these distances from the camera (far → near). */
  backdropNear: [55, 45] as const,
  /**
   * Fly-through backdrop fade-in, by camera distance to its slide (far → near). Starts once
   * the previous slide has passed and blends in slowly, like the reference background.
   */
  backdropIn: [45, 35] as const,
  /** Fly-through `hold`: how closely a held block follows the camera (1 = no growth at all). */
  holdFollow: 0.92,
  /** Fly-through `hold`: world units over which a held block fades away once its hold ends. */
  holdFade: 6,
  /** Fly-through lanes: gap between a lane block's inner edge and the centre line (world units). */
  laneGap: 1.5,
  /** Where the last scene stops (it stays on screen as the section scrolls away). */
  lastRest: 0.06,
  /**
   * Block flight windows in scene time `u`. They overlap on purpose: the next scene is
   * already zooming in from behind while the current one is still flying out, so the
   * screen is never blank between scenes.
   */
  enter: [-0.65, -0.08] as const,
  exit: [0.1, 0.62] as const,
  /** Extra delay per block, so blocks of one scene never move in lock-step. */
  stagger: 0.055,
  endHold: 0.3,
  scrubDesktop: 0.05,
  scrubMobile: 0.1,
  parallax: 0.5,
  wheelSpeed: 0.45,
} as const;

export const FRAMES = {
  desktop: { w: 1920, h: 1080 },
  mobile: { w: 390, h: 844 },
} as const;

/** Figma typography (titles bold, paragraphs regular), in design px of each frame. */
export const TYPE = {
  desktop: { size: 24, line: 33, tracking: 5.52 },
  mobile: { size: 14, line: 20, tracking: 3.2 },
} as const;

/** List layout, in design px: where the marker sits and where the wrapped text starts. */
export const LIST = {
  desktop: { indent: 36, bullet: 15, number: 6 },
  mobile: { indent: 22, bullet: 6, number: 0 },
} as const;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Fly-through starts with the first scene already in view (~35 units away), like the reference.
export const Q_START: number = JOURNEY.mode === "flythrough" ? -0.25 : JOURNEY.enter[0];
export const qEnd = (scenes: number) => scenes - 1 + JOURNEY.lastRest;

/** Camera distance travelled at scene clock q. Slows to a near-stop at each scene. */
export const cameraTravel = (q: number) =>
  JOURNEY.spacing * (q - (JOURNEY.hold * Math.sin(2 * Math.PI * q)) / (2 * Math.PI));

/** 0 while a scene rests, 1 in the middle of the rush between two scenes. */
export const rushAt = (q: number) => (1 - Math.cos(2 * Math.PI * q)) / 2;

export const sceneDepth = (index: number) => JOURNEY.read + index * JOURNEY.spacing;

/**
 * Dwell: while a slide rests in the middle, scrolling moves the story slower, so the
 * active content stays on screen longer. Entry and exit keep their normal speed.
 * Scene time `u` in [from, to] costs `factor`× the scroll; `soften` eases in/out of it.
 */
// The fly-through moves at a constant speed (factor 1); the slide engine slows while a slide rests.
const DWELL = { factor: JOURNEY.mode === "flythrough" ? 1 : 3, from: -0.08, to: 0.1, soften: 0.06 };

const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const density = (u: number) =>
  1 +
  (DWELL.factor - 1) *
    smoothstep(DWELL.from - DWELL.soften, DWELL.from, u) *
    (1 - smoothstep(DWELL.to, DWELL.to + DWELL.soften, u));

// Cumulative scroll cost across one scene period, u from -0.5 to 0.5.
const STEPS = 2000;
const PERIOD: number[] = [0];
for (let i = 1; i <= STEPS; i++) {
  const u0 = -0.5 + (i - 1) / STEPS;
  const u1 = -0.5 + i / STEPS;
  PERIOD.push(PERIOD[i - 1] + ((density(u0) + density(u1)) / 2) * (u1 - u0));
}
const PER_SCENE = PERIOD[STEPS];

/**
 * Scroll pacing for a list of scenes. `paces[i]` scales how much scroll scene i takes
 * (1 = normal, 0.35 = fast-forward). Scene time q stays the same — only how much
 * scrolling it costs changes, so all entry/exit animations play exactly as before.
 */
export function createPacing(paces: number[]) {
  const count = paces.length;
  const weight = (n: number) => (n >= 0 && n < count ? paces[n] : 1);
  // prefix[n] = scroll cost of the full periods of scenes before n (from period -1).
  const prefix: number[] = [0];
  for (let n = -1; n < count + 1; n++) prefix.push(prefix[prefix.length - 1] + PER_SCENE * weight(n));
  const before = (n: number) => {
    const k = clamp(n + 1, 0, prefix.length - 1);
    return prefix[k] + Math.max(0, n + 1 - k) * PER_SCENE;
  };

  /** Scroll cost from the start of time to scene clock q. */
  const costAt = (q: number) => {
    const n = Math.floor(q + 0.5);
    const f = (q - n + 0.5) * STEPS;
    const i = Math.min(Math.floor(f), STEPS - 1);
    return before(n) + weight(n) * (PERIOD[i] + (PERIOD[i + 1] - PERIOD[i]) * (f - i));
  };

  /** Scroll units (relative to the start) needed to reach scene clock q. */
  const scrollUnits = (q: number) => costAt(q) - costAt(Q_START);

  /** Inverse of `scrollUnits`: which scene clock a scroll amount lands on. */
  const qAtUnits = (units: number) => {
    const cost = units + costAt(Q_START);
    let n = -1;
    while (n < count && before(n + 1) <= cost) n++;
    const r = (cost - before(n)) / weight(n);
    let lo = 0;
    let hi = STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (PERIOD[mid] <= r) lo = mid;
      else hi = mid;
    }
    const span = PERIOD[hi] - PERIOD[lo] || 1;
    return n - 0.5 + (lo + clamp((r - PERIOD[lo]) / span, 0, 1)) / STEPS;
  };

  const travelScreens = scrollUnits(qEnd(count)) * JOURNEY.sceneScreens;
  return {
    qAtUnits,
    travelScreens,
    sectionScreens: travelScreens + JOURNEY.endHold + 1,
    /** Scroll offset (in screens) where scene `index` is at rest. */
    anchorScreens: (index: number) => scrollUnits(index) * JOURNEY.sceneScreens,
  };
}

export const scrubFactor = (scrub: number, deltaSeconds: number) => 1 - Math.pow(1 - scrub, deltaSeconds * 60);

const DIRECTIONS: Direction[] = ["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right", "depth", "camera"];
const EXITS: Direction[] = ["left", "right", "bottom", "bottom-left", "bottom-right", "top-left", "top-right", "depth"];

const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Stable "random" direction for blocks that don't pick one, never the same way twice. */
export function pickDirections(seed: string, enter?: Direction, exit?: Direction) {
  const h = hash(seed);
  const inDir = enter ?? DIRECTIONS[h % DIRECTIONS.length];
  const exits = EXITS.filter((d) => d !== inDir);
  const outDir = exit ?? exits[(h >>> 8) % exits.length];
  return { enter: inDir, exit: outDir };
}

export const directionVector = (direction: Direction) => ({
  x: direction.includes("left") ? -1 : direction.includes("right") ? 1 : 0,
  y: direction.includes("top") ? 1 : direction.includes("bottom") ? -1 : 0,
  depth: direction === "depth",
  camera: direction === "camera",
});

/** Directions the parts of a "scatter" block fly from, in turn. */
export const SCATTER: Direction[] = ["top-left", "right", "bottom-left", "top", "bottom-right", "left", "top-right", "bottom"];

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** Starts gently, then speeds away — no pull-back, no sudden kick. */
export const smoothExit = (t: number) => t * t * (2 - t) * t;

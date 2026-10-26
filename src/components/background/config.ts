export const MAX_TRAIL = 32;
export const TRAIL_MAX_AGE = 2.4;

export const renderScale = {
  desktop: 0.75,
  mobile: 0.6,
} as const;

export const scrollMotion = {
  drift: 0.12,
  driftSmoothing: 6,
  maxBoost: 2.5,
  boostStrength: 0.6,
  boostSmoothing: 3,
} as const;

export const backgroundConfig = {
  speed: 1.08,
  amplitude: 0,
  frequency: 0.2,
  directionAngle: 152,
  distortionStrength: 0.9,
  cursorRadius: 0.038,
  color1: "#f874a0",
  color2: "#782b81",
  color3: "#782b81",
  color4: "#782b81",
  stop1: 0.56,
  stop2: 0.3,
  stop3: 1,
} as const;

export const JOURNEY = {
  fov: 75,
  start: 60,
  spacing: 120,
  storyOffset: 60,
  read: 24,
  fadeStart: 50,
  fadeEnd: 60,
  unitsPerScreen: 45,
  endHold: 0.3,
  scrubDesktop: 0.05,
  scrubMobile: 0.1,
  parallax: 0.5,
  wheelSpeed: 0.45,
} as const;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const caseDepth = (index: number) => JOURNEY.start + index * JOURNEY.spacing;
export const storyDepth = (index: number) => caseDepth(index) + JOURNEY.storyOffset;
export const readingTravel = (index: number) => caseDepth(index) - JOURNEY.read;
export const storyTravel = (index: number) => storyDepth(index) - JOURNEY.read;
export const caseCenterTravel = (index: number) => (readingTravel(index) + storyTravel(index)) / 2;
export const travelEnd = (count: number) => storyTravel(count - 1);
export const travelScreens = (count: number) => travelEnd(count) / JOURNEY.unitsPerScreen;
export const sectionScreens = (count: number) => travelScreens(count) + JOURNEY.endHold + 1;
export const anchorScreens = (index: number) => readingTravel(index) / JOURNEY.unitsPerScreen;

export function fadeByDistance(distance: number) {
  if (distance <= JOURNEY.fadeStart) return 1;
  return clamp(1 - (distance - JOURNEY.fadeStart) / (JOURNEY.fadeEnd - JOURNEY.fadeStart), 0, 1);
}

export function scrubFactor(scrub: number, deltaSeconds: number) {
  return 1 - Math.pow(1 - scrub, deltaSeconds * 60);
}

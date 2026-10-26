import type { ProcessStep, Stat } from "@/types";

export const stats: Stat[] = [
  { value: 120, suffix: "+", label: "Projects delivered" },
  { value: 48, suffix: "", label: "Brands launched" },
  { value: 12, suffix: "", label: "Industry awards" },
  { value: 98, suffix: "%", label: "Client retention" },
];

export const processSteps: ProcessStep[] = [
  {
    title: "Discover",
    description: "Workshops, research and honest conversations to understand your audience, goals and story.",
  },
  {
    title: "Define",
    description: "We turn insights into a sharp strategy, a clear structure and a creative direction everyone believes in.",
  },
  {
    title: "Design",
    description: "Ideas come to life through iterative design, prototypes and motion that feels just right.",
  },
  {
    title: "Deliver",
    description: "We build, test and launch with care, then keep improving long after go-live.",
  },
];

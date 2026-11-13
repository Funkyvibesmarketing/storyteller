export type Service = {
  slug: string;
  /** One string per line on the card. */
  lines: string[];
  /** Glass tint (same palette as the old FunkyVibes expertise cards). */
  tint: string;
  /** Video or image projected inside the glass. Files live in /public (videos are git-ignored). */
  media: { kind: "video"; src: string } | { kind: "image"; src: string };
};

export const services: Service[] = [
  {
    slug: "website",
    lines: ["Website"],
    tint: "#55b39f",
    media: { kind: "video", src: "/video/services/website.mp4" },
  },
  {
    slug: "social-media",
    lines: ["Social", "Media"],
    tint: "#d9658f",
    media: { kind: "video", src: "/video/services/social-media.mp4" },
  },
  {
    slug: "strategy",
    lines: ["Strategy"],
    tint: "#9b78d6",
    media: { kind: "video", src: "/video/services/strategy.mp4" },
  },
  {
    slug: "film-photo",
    lines: ["Film", "&Photo"],
    tint: "#5aa9c4",
    media: { kind: "video", src: "/video/services/film-photo.mp4" },
  },
  {
    slug: "branding",
    lines: ["Branding"],
    tint: "#d9806f",
    media: { kind: "image", src: "/images/services/branding.png" },
  },
];

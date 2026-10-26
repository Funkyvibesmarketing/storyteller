export const siteConfig = {
  name: "Storyteller",
  shortName: "Storyteller",
  title: "Storyteller — Creative studio crafting digital stories",
  description:
    "Storyteller is a creative studio crafting brands, websites and digital experiences that move people. Strategy, design, development and motion.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "hello@example.com",
  locale: "en_US",
  language: "en",
  keywords: [
    "creative studio",
    "digital agency",
    "brand strategy",
    "web design",
    "web development",
    "motion design",
    "portfolio",
  ],
  author: {
    name: "FunkyVibes",
    url: "https://example.com",
  },
  twitterHandle: "@funkyvibes",
  themeColor: "#782b81",
  links: {
    instagram: "https://instagram.com/funkyvibes",
    linkedin: "https://linkedin.com/company/funkyvibes",
    dribbble: "https://dribbble.com/funkyvibes",
    twitter: "https://x.com/funkyvibes",
  },
} as const;

export type SiteConfig = typeof siteConfig;

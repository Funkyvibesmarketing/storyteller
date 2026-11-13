export const siteConfig = {
  name: "Storyteller by FunkyVibes",
  shortName: "Storyteller",
  title: "Storyteller by FunkyVibes | Film, websites, social & branding that tell your story",
  description:
    "Storyteller by FunkyVibes tells the stories of people, places and businesses through film & photography, websites, social media, strategy and branding, making people feel something, and giving them a reason to act on it.",
  /** Live site. Override per environment with NEXT_PUBLIC_SITE_URL (e.g. preview deploys). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storyteller.funkyvibes.co.uk").replace(/\/$/, ""),
  /** Placeholder until the real address is confirmed — kept out of search data (structured data). */
  email: "hello@example.com",
  locale: "en_GB",
  language: "en-GB",
  keywords: [
    "storytelling agency",
    "brand storytelling",
    "video production",
    "film and photography",
    "website design",
    "social media marketing",
    "content strategy",
    "branding agency",
    "Rochdale",
    "FunkyVibes",
  ],
  /** The company behind the site. */
  author: {
    name: "FunkyVibes",
    url: "https://funkyvibes.co.uk",
  },
  /** Services offered (used in structured data). Keep in step with src/config/services.ts. */
  services: ["Website", "Social Media", "Strategy", "Film & Photography", "Branding"],
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

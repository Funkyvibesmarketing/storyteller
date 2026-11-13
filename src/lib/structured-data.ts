import type { CreativeWork, ItemList, Organization, WebPage, WebSite, WithContext } from "schema-dts";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/utils";

const ORG_ID = `${siteConfig.url}/#organization`;
const SITE_ID = `${siteConfig.url}/#website`;

export function websiteSchema(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    publisher: { "@id": ORG_ID },
  };
}

export function organizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.author.name,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    // Google needs a raster logo of at least 112x112 (SVG isn't accepted).
    logo: { "@type": "ImageObject", url: absoluteUrl("/apple-icon.png"), width: "180", height: "180" },
    knowsAbout: [...siteConfig.services],
    sameAs: Object.values(siteConfig.links),
  };
}

export function webPageSchema({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): WithContext<WebPage> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: siteConfig.language,
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
  };
}

/** The case studies on the home page, as a list of creative works by FunkyVibes. */
export function caseStudiesSchema(
  studies: { slug: string; client: string; title: string; category: string }[],
  anchor: (slug: string) => string,
): WithContext<ItemList> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Case studies",
    itemListElement: studies.map((study, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: study.title,
        genre: study.category,
        url: absoluteUrl(`/#${anchor(study.slug)}`),
        creator: { "@id": ORG_ID },
        about: { "@type": "Organization", name: study.client },
      } satisfies CreativeWork,
    })),
  };
}

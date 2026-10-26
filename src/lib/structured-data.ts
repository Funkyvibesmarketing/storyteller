import type { Organization, WebPage, WebSite, WithContext } from "schema-dts";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/utils";

export function websiteSchema(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
  };
}

export function organizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.author.name,
    url: siteConfig.author.url,
    email: siteConfig.email,
    logo: absoluteUrl("/icon.svg"),
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
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  };
}

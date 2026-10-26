import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/utils";

type CreateMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function createMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  image,
  noIndex = false,
}: CreateMetadataOptions = {}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.title;
  const images = image ? [{ url: image, width: 1200, height: 630, alt: fullTitle }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: siteConfig.twitterHandle,
      ...(images && { images }),
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}

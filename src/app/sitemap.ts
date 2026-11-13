import type { MetadataRoute } from "next";
import { sitemapRoutes } from "@/config/navigation";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-static";

/** The sitemap is generated at build time, so each deploy refreshes the date. */
const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: BUILT_AT,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

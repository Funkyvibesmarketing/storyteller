import { siteConfig } from "@/config/site";
import { createMetadata } from "@/lib/seo";
import { webPageSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { Hero } from "@/components/sections";

export const metadata = createMetadata({ path: "/" });

export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageSchema({ title: siteConfig.title, description: siteConfig.description, path: "/" })} />
      <Hero />
    </>
  );
}

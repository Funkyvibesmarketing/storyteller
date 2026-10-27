import { siteConfig } from "@/config/site";
import { caseStudies } from "@/config/case-studies";
import { createMetadata } from "@/lib/seo";
import { webPageSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { Hero } from "@/components/sections";
import { CaseStudies } from "@/components/case-studies/case-studies";

export const metadata = createMetadata({ path: "/" });

export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageSchema({ title: siteConfig.title, description: siteConfig.description, path: "/" })} />
      <Hero />
      <CaseStudies studies={caseStudies} />
    </>
  );
}

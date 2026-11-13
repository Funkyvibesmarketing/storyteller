import { siteConfig } from "@/config/site";
import { caseStudies, caseStudyAnchor } from "@/config/case-studies";
import { createMetadata } from "@/lib/seo";
import { caseStudiesSchema, webPageSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { Hero, Landing, Services } from "@/components/sections";
import { CaseStudies } from "@/components/case-studies/case-studies";
import { FinalSection } from "@/components/final";

export const metadata = createMetadata({ path: "/" });

export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageSchema({ title: siteConfig.title, description: siteConfig.description, path: "/" })} />
      <JsonLd data={caseStudiesSchema(caseStudies, caseStudyAnchor)} />
      <Hero />
      <Landing />
      <CaseStudies studies={caseStudies} />
      <Services />
      <FinalSection />
    </>
  );
}

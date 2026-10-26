import { processSteps, stats } from "@/config/content";
import { createMetadata } from "@/lib/seo";
import { webPageSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { Cta, PageHero, Process, Statement, Stats } from "@/components/sections";

const title = "About";
const description =
  "Meet the designers, developers and storytellers behind Storyteller, a creative studio crafting digital experiences that move people.";

export const metadata = createMetadata({ title, description, path: "/about" });

export default function AboutPage() {
  return (
    <>
      <JsonLd data={webPageSchema({ title, description, path: "/about" })} />
      <PageHero eyebrow="About the studio" title="Curious minds, crafted stories." description={description} />
      <Statement
        index="01"
        label="Our belief"
        text="Great brands are not built on features. They are built on stories that people feel, remember and want to be part of. That is what we design for, every single time."
      />
      <Stats items={stats} index="02" />
      <Process steps={processSteps} index="03" />
      <Cta index="04" />
    </>
  );
}

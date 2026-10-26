import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Magnetic } from "@/components/ui/magnetic";
import { RevealText } from "@/components/ui/reveal-text";
import { Section } from "@/components/ui/section";

export function Cta({ index = "06" }: { index?: string }) {
  return (
    <Section id="contact" className="py-[18svh]">
      <Container>
        <Eyebrow>({index}) Contact</Eyebrow>
        <RevealText
          as="h2"
          className="mt-8 text-[clamp(3.25rem,11vw,10rem)] font-semibold leading-[0.88] tracking-[-0.045em]"
        >
          Have a story worth telling?
        </RevealText>
        <div className="mt-14 flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-fluid-lg">
            Tell us about your idea. We reply within one business day and love a good challenge.
          </p>
          <Magnetic strength={0.4}>
            <a
              href={`mailto:${siteConfig.email}`}
              className="flex size-[clamp(10rem,7rem+8vw,13rem)] flex-col items-center justify-center rounded-full bg-ink text-center text-fluid-lg font-medium leading-tight text-paper transition-transform duration-500 hover:scale-105"
            >
              Start a
              <br />
              project ↗
            </a>
          </Magnetic>
        </div>
      </Container>
    </Section>
  );
}

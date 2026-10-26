import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RevealText } from "@/components/ui/reveal-text";
import { Section } from "@/components/ui/section";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <Section className="flex min-h-[85svh] flex-col justify-end pb-16 pt-36 md:pb-24">
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <RevealText
          as="h1"
          immediate
          className="mt-6 text-[clamp(3.25rem,10vw,9.5rem)] font-semibold leading-[0.9] tracking-[-0.045em]"
        >
          {title}
        </RevealText>
        <RevealText immediate delay={0.25} className="mt-8 max-w-xl text-fluid-xl opacity-70">
          {description}
        </RevealText>
      </Container>
    </Section>
  );
}

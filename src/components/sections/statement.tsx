"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";

type StatementProps = {
  index: string;
  label: string;
  text: string;
};

export function Statement({ index, label, text }: StatementProps) {
  const root = useRef<HTMLElement>(null);
  const paragraph = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const split = SplitText.create(paragraph.current, { type: "words" });
        gsap.fromTo(
          split.words,
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: paragraph.current, start: "top 80%", end: "bottom 50%", scrub: true },
          },
        );
        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section ref={root} id="about" className="py-[18svh]">
      <Container>
        <Eyebrow>
          ({index}) {label}
        </Eyebrow>
        <p
          ref={paragraph}
          className="mt-8 max-w-6xl text-[clamp(1.75rem,4.4vw,4.25rem)] font-medium leading-[1.1] tracking-[-0.02em]"
        >
          {text}
        </p>
      </Container>
    </Section>
  );
}

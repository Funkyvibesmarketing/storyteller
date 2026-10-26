"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import type { ProcessStep } from "@/types";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

export function Process({ steps, index = "05" }: { steps: ProcessStep[]; index?: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          ".process-progress",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: ".process-list", start: "top 65%", end: "bottom 65%", scrub: true },
          },
        );

        gsap.utils.toArray<HTMLElement>(".process-step").forEach((step) => {
          gsap.fromTo(
            step,
            { opacity: 0.2, y: 40 },
            {
              opacity: 1,
              y: 0,
              ease: "none",
              scrollTrigger: { trigger: step, start: "top 85%", end: "top 55%", scrub: true },
            },
          );
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section ref={root} id="process" className="py-[16svh]">
      <Container className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-32">
            <SectionHeading index={index} label="Process" title="How stories come to life" />
            <p className="mt-6 max-w-sm opacity-70 text-fluid-lg">
              A clear, collaborative process that keeps you close to the work at every step.
            </p>
          </div>
        </div>

        <div className="process-list relative md:col-span-7">
          <div aria-hidden="true" className="absolute left-0 top-0 h-full w-px bg-foreground/15">
            <div className="process-progress size-full origin-top bg-foreground" />
          </div>
          <ol>
            {steps.map((step, i) => (
              <li key={step.title} className="process-step relative py-10 pl-8 md:py-16 md:pl-14">
                <span className="font-mono text-fluid-sm opacity-60">0{i + 1}</span>
                <h3 className="mt-3 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-none tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-md opacity-70 text-fluid-lg">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}

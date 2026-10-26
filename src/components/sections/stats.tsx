"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import type { Stat } from "@/types";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

export function Stats({ items, index = "04" }: { items: Stat[]; index?: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>(".stat-number").forEach((el) => {
          const end = Number(el.dataset.value ?? 0);
          const counter = { value: 0 };
          el.textContent = "0";
          gsap.to(counter, {
            value: end,
            duration: 2,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent = String(Math.round(counter.value));
            },
          });
        });

        gsap.from(".stat-item", {
          y: 40,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.1,
          scrollTrigger: { trigger: ".stat-grid", start: "top 85%", once: true },
        });

        return () => {
          gsap.utils.toArray<HTMLElement>(".stat-number").forEach((el) => {
            el.textContent = el.dataset.value ?? "0";
          });
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section ref={root} className="py-[14svh]">
      <Container>
        <SectionHeading index={index} label="Impact" title="Numbers that tell the story" />
        <dl className="stat-grid mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-24 md:grid-cols-4">
          {items.map((stat) => (
            <div key={stat.label} className="stat-item border-t border-foreground/15 pt-6">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-[clamp(3rem,8vw,6.5rem)] font-semibold leading-none tracking-tighter tabular-nums">
                <span className="stat-number" data-value={stat.value}>
                  {stat.value}
                </span>
                <span className="opacity-40">{stat.suffix}</span>
              </dd>
              <dd aria-hidden="true" className="mt-3 text-fluid-sm opacity-60">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}

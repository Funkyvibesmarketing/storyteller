"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";
import { whenRevealed } from "@/lib/reveal-gate";

type RevealTextProps = {
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
  delay?: number;
  immediate?: boolean;
};

export function RevealText({ as: Tag = "p", className, children, delay = 0, immediate = false }: RevealTextProps) {
  const wrap = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = wrap.current?.firstElementChild;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        let release = () => {};

        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            release();
            const tween = gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.2,
              stagger: 0.1,
              ease: "expo.out",
              delay,
              paused: immediate,
              scrollTrigger: immediate ? undefined : { trigger: el, start: "top 88%", once: true },
            });
            if (immediate) release = whenRevealed(() => tween.play());
            return tween;
          },
        });

        return () => {
          release();
          split.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap}>
      <Tag className={className}>{children}</Tag>
    </div>
  );
}

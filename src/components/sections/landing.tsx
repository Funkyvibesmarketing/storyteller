"use client";

import { useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { Section } from "@/components/ui/section";
import { ScrollHintLabel } from "@/components/ui/scroll-hint-label";

/**
 * Comes after the hero (Figma "Landing Page"): "Not for onward distribution" drops in
 * from the top, rests in the centre, then zooms toward you and out — straight into HY.
 */
export function Landing() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true },
          })
          // Drops in from the top of the screen and settles in the centre…
          .fromTo(
            ".landing-move",
            { y: () => -window.innerHeight * 0.28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
            0,
          )
          .fromTo(".landing-scroll-wrap", { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }, 0.2)
          // …holds while you read…
          .to({}, { duration: 0.2 })
          // …then zooms toward you and out of the screen, like the hero.
          .to(".landing-scroll-wrap", { opacity: 0, y: 30, duration: 0.12, ease: "none" }, 0.55)
          .to(".landing-move", { scale: 7, duration: 0.45, ease: "power2.in" }, 0.55)
          .to(".landing-move", { opacity: 0, duration: 0.3, ease: "power1.in" }, 0.7);
      });

      // When the note rests in the centre, give first-time visitors a peek at the menu.
      let previewed = false;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (previewed || self.progress < 0.35 || self.progress > 0.55) return;
          previewed = true;
          window.dispatchEvent(new CustomEvent("menupreview"));
        },
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const scrollForward = () => {
    const section = root.current;
    if (section) lenis?.scrollTo(section.offsetTop + section.offsetHeight, { duration: 2 });
  };

  return (
    <Section ref={root} aria-label="Introduction" className="h-[260svh]">
      <div className="sticky top-0 grid h-svh place-items-center overflow-hidden text-white">
        <div className="landing-move will-change-transform">
          <p className="text-center text-[clamp(0.75rem,0.6rem+0.55vw,1.375rem)] font-normal leading-none tracking-[0.2em] [text-box:trim-both_cap_alphabetic]">
            Not for onward distribution
          </p>
        </div>

        <div className="landing-scroll-wrap absolute inset-x-0 bottom-[clamp(1.5rem,7svh,4.5rem)] text-center">
          <button
            type="button"
            onClick={scrollForward}
            className="text-[clamp(0.75rem,0.6rem+0.55vw,1.375rem)] font-light uppercase leading-none tracking-[0.3em] transition-transform duration-300 [text-box:trim-both_cap_alphabetic] hover:-translate-y-1"
          >
            <ScrollHintLabel />
          </button>
        </div>
      </div>
    </Section>
  );
}

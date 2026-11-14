"use client";

import { useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { Section } from "@/components/ui/section";
import { GlassPhoto } from "./glass-photo";
import { ScrollHintLabel } from "@/components/ui/scroll-hint-label";

const PHOTO_SRC = "/images/final/ishtar-mark.jpg";

const WHY_US = [
  "Rochdale doesn’t just need its story told. It needs people to hear it, see themselves in it, and want to be part of what happens next.",
  "Whether it’s helping young people tell their story through a camera lens, editing a family’s footage so their words land with the feeling they deserve, turning a real place into a story people want to visit, or standing beside a local business that heard the call to action and stepped forward, the aim is the same.",
  "We make people feel something, and give them a reason to act on it",
];

/**
 * Final section (Figma "FVM"): "Why us" zooms up out of the depth, rests while you read, then
 * flies past you — a breath of empty background — and the FVM mark zooms in to close the story.
 */
export function FinalSection() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const [photoMissing, setPhotoMissing] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 1 },
          })
          // "Why us" rises out of the depth and settles, holds while you read…
          .fromTo(".final-why", { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.14, ease: "power2.out" }, 0)
          .fromTo(".final-hint", { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.08)
          // …then zooms toward you and out, like the landing note.
          .to(".final-why", { scale: 6, duration: 0.14, ease: "power2.in" }, 0.28)
          .to(".final-why", { opacity: 0, duration: 0.07, ease: "power1.in" }, 0.35)
          // Second screen: Ishtar & Mark zoom in from the depth, rest, then fly past you too.
          .fromTo(
            ".final-photo",
            { scale: 0.08, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.14, ease: "power3.out" },
            0.38,
          )
          // Inside the frame the photo eases from a close crop to the full shot (slow push-out).
          .fromTo(".final-photo-img", { scale: 1.3 }, { scale: 1, duration: 0.22, ease: "power2.out" }, 0.38)
          // A sheen of light sweeps across the glass once it has landed.
          .fromTo(".final-sheen", { xPercent: 0 }, { xPercent: 260, duration: 0.1, ease: "power1.inOut" }, 0.5)
          .to(".final-photo", { scale: 6, duration: 0.12, ease: "power2.in" }, 0.64)
          .to(".final-photo", { opacity: 0, duration: 0.06, ease: "power1.in" }, 0.7)
          // Nothing left to scroll to on the last screen: the hint fades out as the mark arrives.
          .to(".final-hint", { autoAlpha: 0, duration: 0.06 }, 0.72)
          // The FVM mark zooms in from far away and lands.
          .fromTo(
            ".final-mark",
            { scale: 0.08, rotate: -25, opacity: 0 },
            { scale: 1, rotate: 0, opacity: 1, duration: 0.18, ease: "power3.out" },
            0.76,
          )
          .to({}, { duration: 0.06 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const scrollForward = () => {
    const section = root.current;
    if (!section) return;
    const step = section.offsetHeight / 4;
    const next = Math.min(section.offsetTop + section.offsetHeight - window.innerHeight, window.scrollY + step);
    lenis?.scrollTo(next, { duration: 1.6 });
  };

  return (
    <Section ref={root} aria-label="Why us" className="motion-safe:h-[560svh]">
      <div className="grid min-h-svh place-items-center gap-24 overflow-hidden px-4 py-24 motion-safe:gap-0 text-white motion-safe:sticky motion-safe:top-0 motion-safe:h-svh motion-safe:py-0">
        <div className="final-why motion-safe:col-start-1 motion-safe:row-start-1 w-full max-w-[clamp(18rem,48vw,72rem)] will-change-transform">
          {/* Figma: 32px / 700, line-height 33px, 4.8px tracking, capitals. Body 24px / 400, 33px, 2.4px tracking. Box 921px. */}
          <h2 className="text-[clamp(1.125rem,0.6rem+1.17vw,2.5rem)] font-bold uppercase leading-[1.03] tracking-[0.15em]">Why us</h2>
          <div className="mt-[1.3em] space-y-[1.4em] text-[clamp(0.8125rem,0.5rem+0.833vw,1.75rem)] font-normal leading-[1.375] tracking-[0.1em]">
            {WHY_US.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Second screen: Ishtar & Mark (public/images/final/ishtar-mark.jpg) */}
        {photoMissing ? null : (
          <GlassPhoto
            src={PHOTO_SRC}
            alt="Ishtar and Mark, the FunkyVibes team"
            onError={() => setPhotoMissing(true)}
            className="final-photo w-[clamp(18rem,42vw,62rem)] will-change-transform max-md:w-[84vw] motion-safe:col-start-1 motion-safe:row-start-1 motion-safe:opacity-0"
          />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element -- SVG mark, kept crisp while it scales */}
        <img
          src="/images/fvm-mark.svg"
          alt="FunkyVibes"
          width={63}
          height={63}
          className="final-mark motion-safe:col-start-1 motion-safe:row-start-1 size-[clamp(11rem,28vw,40rem)] max-md:size-[60vw] motion-safe:opacity-0"
        />

        <div className="final-hint absolute inset-x-0 bottom-[clamp(1.5rem,7svh,4.5rem)] hidden px-[clamp(1.5rem,6.4vw,7.5rem)] motion-safe:block">
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

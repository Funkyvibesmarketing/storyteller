"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap, MOBILE, MOTION_OK, useGSAP } from "@/lib/gsap";
import { whenRevealed } from "@/lib/reveal-gate";
import { backgroundState } from "@/lib/background-state";
import { Section } from "@/components/ui/section";

const subhead = "We tell";
const headline = ["Your", "Story"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK, mobile: MOBILE }, (context) => {
        const { motion, mobile } = context.conditions as { motion: boolean; mobile: boolean };
        if (!motion) return;

        gsap.set(".hero-subhead", { x: -120, opacity: 0 });
        gsap.set(".hero-letter", { yPercent: 100 });
        gsap.set(".hero-scroll-inner", { y: 80, opacity: 0 });

        const intro = gsap
          .timeline({ paused: true })
          .to(".hero-subhead", { x: 0, opacity: 1, duration: 1, ease: "power4.out" })
          .to(".hero-letter", { yPercent: 0, duration: 1, stagger: 0.05, ease: "power4.out" }, "-=0.6")
          .to(".hero-scroll-inner", { y: 0, opacity: 1, duration: 1, ease: "power4.out" }, "-=0.5");

        const release = whenRevealed(() => intro.play());

        const zoom = { value: 1 };

        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true },
          })
          .to(".hero-scroll", { y: 30, opacity: 0, duration: 0.15, ease: "none" }, 0)
          .to(".hero-content", { scale: mobile ? 5 : 7, duration: 1, ease: "power2.in" }, 0)
          .to(".hero-content", { opacity: 0, duration: 0.7, ease: "power1.in" }, 0.25)
          .to(
            zoom,
            {
              value: 3,
              duration: 1,
              ease: "power1.inOut",
              onUpdate: () => {
                backgroundState.zoom = zoom.value;
              },
            },
            0,
          );

        return () => {
          release();
          backgroundState.zoom = 1;
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const scrollForward = () => {
    const section = root.current;
    if (!section) return;
    lenis?.scrollTo(section.offsetTop + section.offsetHeight, { duration: 3.2 });
  };

  return (
    <Section ref={root} aria-labelledby="hero-title" className="h-[250svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="hero-content relative grid h-full content-center gap-y-[clamp(3rem,1.5rem+5vw,7rem)] px-[clamp(1.375rem,14.1vw-1.93rem,16rem)] py-[clamp(1.5rem,3.5vw,5rem)] text-white will-change-transform">
          <h1
            id="hero-title"
            className="grid gap-y-[clamp(3rem,1.5rem+5vw,7rem)]"
          >
            <span className="sr-only">
              {subhead} {headline.join(" ")}
            </span>
            <span
              aria-hidden="true"
              className="hero-subhead block text-[clamp(1.25rem,0.643rem+2.589vw,4.5rem)] font-normal uppercase leading-[1.2] tracking-[clamp(1px,0.712vw-1.67px,16px)] [text-box:trim-both_cap_alphabetic]"
            >
              {subhead}
            </span>
            <span
              aria-hidden="true"
              className="flex justify-between gap-[0.45em] text-center text-[clamp(2rem,0.25rem+9.375vw,14rem)] font-normal uppercase leading-[0.9] tracking-[0.08em] [text-box:trim-both_cap_alphabetic] max-md:justify-center"
            >
              {headline.map((word) => (
                <span key={word} className="inline-block shrink-0 overflow-hidden whitespace-nowrap">
                  {word.split("").map((letter, i) => (
                    <span key={i} className="hero-letter inline-block will-change-transform">
                      {letter}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h1>

          <div className="hero-scroll absolute inset-x-0 bottom-[clamp(1.5rem,5svh,4rem)] text-center">
            <div className="hero-scroll-inner">
              <button
                type="button"
                onClick={scrollForward}
                className="relative text-[clamp(0.75rem,0.68rem+0.3vw,1.125rem)] font-light uppercase leading-none tracking-[0.3em] transition-transform duration-300 [text-box:trim-both_cap_alphabetic] hover:-translate-y-1.25"
              >
                [Scroll to move forward]
              </button>
              <div className="mt-[clamp(1rem,0.8rem+0.6vw,1.75rem)] flex justify-center" aria-hidden="true">
                <Image
                  src="/images/scroll-icon-move.svg"
                  alt=""
                  width={32}
                  height={54}
                  className="h-auto w-[clamp(1.5rem,1.3rem+0.6vw,2.25rem)] animate-bob"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

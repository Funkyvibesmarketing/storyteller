"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { caseStudies, caseStudyAnchor } from "@/config/case-studies";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { TransitionLink } from "@/components/transition/transition-link";

const glassBox =
  "block size-[clamp(3.375rem,5.31vw,7rem)] rounded-[clamp(0.5rem,1.04vw,1.5rem)] border border-white bg-white/10 shadow-[0_18px_40px_0_rgba(0,0,0,0.25)]";

export function Header() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      timeline.current = gsap
        .timeline({ paused: true })
        .fromTo(
          panel.current,
          { autoAlpha: 0, y: -12, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
        )
        .from(".case-link", { autoAlpha: 0, x: 16, duration: 0.4, stagger: 0.05, ease: "power3.out" }, "-=0.25");
    },
    { scope: menu },
  );

  useEffect(() => {
    if (open) timeline.current?.timeScale(1).play();
    else timeline.current?.timeScale(1.6).reverse();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-end px-[clamp(1.375rem,0.7rem+2.4vw,3rem)] py-[clamp(1.25rem,1.08vw,2rem)] text-white">

      <div ref={menu} className="pointer-events-auto relative">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="case-study-menu"
          aria-label={open ? "Close case studies menu" : "Open case studies menu"}
          onClick={() => setOpen((value) => !value)}
          className={cn(glassBox, "p-[clamp(0.6875rem,1.56vw,2rem)] transition-colors hover:bg-white/20")}
        >
          <Image
            src="/images/gridmenu-icon.svg"
            alt=""
            width={43}
            height={43}
            className={cn(
              "size-full transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.3,1)]",
              open && "rotate-45",
            )}
          />
        </button>

        <div
          ref={panel}
          id="case-study-menu"
          inert={!open}
          className="invisible absolute right-0 top-full mt-[clamp(0.5rem,0.8vw,1rem)] w-[clamp(16rem,22vw,28rem)] max-w-[calc(100vw-2.75rem)] origin-top-right rounded-2xl border border-white/40 bg-white/10 p-2 shadow-[0_18px_40px_0_rgba(0,0,0,0.25)] backdrop-blur-xl"
        >
          <p className="px-4 pb-2 pt-3 text-fluid-xs uppercase tracking-[4px] opacity-70">Case studies</p>
          <nav aria-label="Case studies">
            <ul>
              {caseStudies.map((study, i) => (
                <li key={study.slug}>
                  <TransitionLink
                    href={`/#${caseStudyAnchor(study.slug)}`}
                    onClick={() => setOpen(false)}
                    className="case-link group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className="font-mono text-fluid-xs opacity-60">0{i + 1}</span>
                    <span className="flex-1">
                      <span className="block text-fluid-base font-medium leading-tight">{study.title}</span>
                      <span className="block text-fluid-xs uppercase tracking-[2px] opacity-60">{study.category}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

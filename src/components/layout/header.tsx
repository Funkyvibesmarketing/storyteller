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
  // The case study currently on screen (from the journey), highlighted in the menu.
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    const onCase = (event: Event) => setCurrent((event as CustomEvent<number>).detail);
    window.addEventListener("journeycase", onCase);
    return () => window.removeEventListener("journeycase", onCase);
  }, []);

  // Landing screen ("Not for onward distribution"): the "Case Studies" label and the open menu
  // show while that screen is up, and close again as you scroll on — unless the visitor has
  // started using the menu themselves. The Landing section sends `menupreview` (true / false).
  const [preview, setPreview] = useState(false);
  const touched = useRef(false);
  useEffect(() => {
    const onPreview = (event: Event) => {
      const show = (event as CustomEvent<boolean>).detail === true;
      if (show) {
        touched.current = false;
        setPreview(true);
        setOpen(true);
      } else {
        setPreview(false);
        if (!touched.current) setOpen(false);
      }
    };
    window.addEventListener("menupreview", onPreview);
    return () => window.removeEventListener("menupreview", onPreview);
  }, []);
  const highlighted = preview && current < 0 ? 0 : current;
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

      <div
        ref={menu}
        onPointerEnter={() => (touched.current = true)}
        onFocus={() => (touched.current = true)}
        className="pointer-events-auto relative flex items-center gap-[clamp(0.75rem,1.25vw,1.5rem)]"
      >
        {/* Figma: "Case Studies" label beside the button while the menu is open. */}
        <span
          aria-hidden="true"
          className={cn(
            "whitespace-nowrap text-[clamp(0.875rem,0.94vw,1.25rem)] font-normal leading-none tracking-[0.15em] transition-[opacity,translate] duration-500 [text-box:trim-both_cap_alphabetic] max-md:hidden",
            open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-3 opacity-0",
          )}
        >
          Case Studies
        </span>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="case-study-menu"
          aria-label={open ? "Close case studies menu" : "Open case studies menu"}
          onClick={() => {
            setPreview(false);
            setOpen((value) => !value);
          }}
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
          className="invisible absolute right-0 top-full mt-[clamp(0.5rem,0.8vw,1rem)] w-max min-w-[clamp(15rem,20vw,26rem)] max-w-[calc(100vw-2.75rem)] origin-top-right rounded-xl border border-white/40 bg-white/10 p-[clamp(0.375rem,0.45vw,0.625rem)] shadow-[0_18px_40px_0_rgba(0,0,0,0.25)] backdrop-blur-xl"
        >
          <p className="px-[clamp(0.375rem,0.45vw,0.625rem)] pb-[clamp(0.5rem,0.6vw,0.875rem)] pt-[clamp(0.25rem,0.3vw,0.5rem)] text-[clamp(0.625rem,0.6vw,0.875rem)] leading-none tracking-[0.2em] opacity-70">
            Case Studies
          </p>
          <nav aria-label="Case studies">
            {/* A little breathing room between the items. */}
            <ul className="grid gap-[clamp(0.25rem,0.36vw,0.5rem)]">
              {caseStudies.map((study, i) => (
                <li key={study.slug}>
                  <TransitionLink
                    href={`/#${caseStudyAnchor(study.slug)}`}
                    onClick={() => setOpen(false)}
                    aria-current={i === current ? "true" : undefined}
                    className={cn(
                      "case-link group flex items-center gap-3 rounded-md px-[clamp(0.375rem,0.45vw,0.625rem)] py-[clamp(0.5rem,0.6vw,0.875rem)] text-[clamp(0.8125rem,0.83vw,1.125rem)] leading-none tracking-[0.15em] transition-colors duration-300 max-md:tracking-[0.1em]",
                      i === highlighted ? "bg-white text-[#6b1d6e]" : "hover:bg-white hover:text-[#6b1d6e]",
                    )}
                  >
                    {/* Figma: case study names in capitals ("01 HY CONVEYANCING"). */}
                    <span className="flex-1 whitespace-nowrap uppercase [text-box:trim-both_cap_alphabetic]">
                      {String(i + 1).padStart(2, "0")} {study.client}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "transition-[opacity,translate] duration-300",
                        i === highlighted ? "opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                      )}
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

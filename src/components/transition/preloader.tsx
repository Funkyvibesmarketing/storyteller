"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { setCovered } from "@/lib/reveal-gate";

const COLUMNS = 12;

const wordClass =
  "whitespace-nowrap text-center text-[clamp(2rem,0.82rem+5.566vw,9rem)] font-normal leading-normal tracking-[clamp(0.4em,5.73vw,0.95em)] indent-[3%] [text-box:trim-both_cap_alphabetic]";

function whenPageReady() {
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  return Promise.all([loaded, fonts]);
}

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const wordFill = useRef<HTMLParagraphElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const done = useRef(false);

  useEffect(() => {
    lenisRef.current = lenis;
    if (lenis && !done.current) lenis.stop();
  }, [lenis]);

  useGSAP(
    () => {
      setCovered(true);
      let cancelled = false;

      const finish = () => {
        done.current = true;
        gsap.set(root.current, { display: "none" });
        lenisRef.current?.start();
        window.dispatchEvent(new CustomEvent("preloaderComplete"));
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCovered(false);
        finish();
        return;
      }

      const setFill = gsap.quickSetter(fill.current, "scaleX");
      const setDot = gsap.quickSetter(dot.current, "x", "px");
      let trackWidth = track.current?.offsetWidth ?? 0;
      const measure = () => {
        trackWidth = track.current?.offsetWidth ?? 0;
      };
      window.addEventListener("resize", measure, { passive: true });

      const progress = { value: 0 };
      let lastShown = -1;
      const render = () => {
        const value = progress.value;
        setFill(value);
        setDot(value * trackWidth);
        if (wordFill.current) wordFill.current.style.clipPath = `inset(-25% ${(1 - value) * 100}% -25% 0)`;
        const shown = Math.round(value * 100);
        if (shown !== lastShown && count.current) {
          lastShown = shown;
          count.current.textContent = `${shown}%`;
        }
      };

      gsap.set(dot.current, { xPercent: -100, yPercent: -50 });
      render();

      const columns = gsap.utils.toArray<HTMLElement>(".loader-column");
      let ready = false;
      const tl = gsap.timeline({ onComplete: finish });

      tl.fromTo(content.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, 0)
        .fromTo(word.current, { y: 30 }, { y: 0, duration: 1, ease: "expo.out" }, 0)
        .fromTo(row.current, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out" }, 0.15)
        .to(progress, { value: 1, duration: 2.2, ease: "power2.inOut", onUpdate: render }, 0.2)
        .add(() => {
          if (!ready) tl.pause();
        })
        .addLabel("exit", "+=0.2")
        .to(word.current, { scale: 1.06, opacity: 0, duration: 0.7, ease: "power3.in" }, "exit")
        .to(row.current, { y: -16, opacity: 0, duration: 0.5, ease: "power2.in" }, "exit")
        .addLabel("lift", "-=0.15")
        .to(
          columns,
          {
            yPercent: (i: number) => (i % 2 === 0 ? -100 : 100),
            duration: 1.4,
            ease: "power4.inOut",
            stagger: { each: 0.05, from: "center" },
          },
          "lift",
        )
        .call(() => setCovered(false), undefined, "lift+=0.55")
        .to(root.current, { opacity: 0, duration: 0.3 }, "-=0.35");

      whenPageReady().then(() => {
        if (cancelled) return;
        ready = true;
        if (tl.paused()) tl.play();
      });

      return () => {
        cancelled = true;
        window.removeEventListener("resize", measure);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="fixed inset-0 z-200 flex overflow-hidden">
      {Array.from({ length: COLUMNS }, (_, i) => (
        <div
          key={i}
          className="loader-column h-full flex-1 bg-white/2 backdrop-blur-[40px] will-change-transform max-md:backdrop-blur-2xl"
          style={{ marginRight: i < COLUMNS - 1 ? -1 : 0 }}
        />
      ))}

      <div
        ref={content}
        className="invisible absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[clamp(2.5rem,1.5rem+2.5vw,4.5rem)] font-sans text-white opacity-0"
      >
        <div ref={word} className="relative will-change-transform">
          <p className={`${wordClass} text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.7)]`}>
            LOAD<strong className="font-bold">ING</strong>
          </p>
          <p
            ref={wordFill}
            className={`${wordClass} absolute inset-0 text-white`}
            style={{ clipPath: "inset(-25% 100% -25% 0)" }}
          >
            LOAD<strong className="font-bold">ING</strong>
          </p>
        </div>

        <div
          ref={row}
          className="flex items-center justify-center gap-[clamp(0.75rem,0.5rem+0.8vw,1.5rem)] text-[clamp(0.875rem,0.48rem+1.683vw,3rem)] leading-normal"
        >
          <span className="[text-box:trim-both_cap_alphabetic]">Progress</span>
          <div ref={track} className="relative">
            <span className="mt-0.5 block h-px w-[clamp(8rem,49.11vw-2rem,60rem)] border-b border-dashed border-white/70" />
            <span
              ref={fill}
              className="absolute left-0 top-0.5 block h-px w-full origin-left scale-x-0 border-b border-white will-change-transform"
            />
            <span
              ref={dot}
              className="absolute left-0 top-[2.5px] block size-[clamp(0.875rem,0.7rem+0.45vw,1.5rem)] rounded-full bg-white will-change-transform"
            />
          </div>
          <span
            ref={count}
            className="inline-block w-[2.6em] tabular-nums [text-box:trim-both_cap_alphabetic]"
          >
            0%
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { setCovered } from "@/lib/reveal-gate";
import { primeCaseVideo } from "@/lib/case-video";
import { firstScreenVideo } from "@/config/case-studies";

/**
 * Loading screen — a 1:1 port of the FunkyVibes loader (HTML_BCKP/assets/js/preloader.js
 * + #loader styles in style.css): 12 frosted columns, solid "LOADING" word, dashed
 * progress line with a dot, % counter; then the word fades and the columns lift away
 * one by one from the right.
 */

const COLUMNS = 12;
const VIDEO_WAIT = 8000;

function whenVideoReady() {
  const first = firstScreenVideo();
  if (!first || !document.getElementById("case-studies")) return Promise.resolve();
  return primeCaseVideo(first, VIDEO_WAIT);
}

function whenPageReady() {
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  return Promise.all([loaded, fonts, whenVideoReady()]);
}

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
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
      const loader = root.current;
      if (!loader) return;
      setCovered(true);
      let cancelled = false;

      const finish = () => {
        done.current = true;
        gsap.set(loader, { display: "none" });
        lenisRef.current?.start();
        window.dispatchEvent(new CustomEvent("preloaderComplete"));
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCovered(false);
        finish();
        return;
      }

      // Columns sit on whole device pixels so no hairline gaps show between them.
      const columns = gsap.utils.toArray<HTMLElement>(".loader-column", loader);
      const layoutColumns = () => {
        const dpr = window.devicePixelRatio || 1;
        const total = loader.clientWidth;
        const edge = (i: number) => Math.round((i * total * dpr) / COLUMNS) / dpr;
        columns.forEach((col, i) => {
          const left = edge(i);
          const right = i === COLUMNS - 1 ? total : edge(i + 1) + Math.ceil(dpr) / dpr;
          col.style.left = `${left}px`;
          col.style.width = `${right - left}px`;
        });
      };
      layoutColumns();
      window.addEventListener("resize", layoutColumns);

      const counter = { value: 0 };
      let ready = false;
      gsap.set(bar.current, { width: "0%" });

      const tl = gsap.timeline({ onComplete: finish });

      tl.fromTo(content.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0)
        // STEP 1 → progress fill + counter
        .to(bar.current, { width: "100%", duration: 2, ease: "power2.out" }, 0)
        .to(
          counter,
          {
            value: 100,
            duration: 2,
            ease: "none",
            onUpdate: () => {
              if (count.current) count.current.textContent = `${Math.round(counter.value)}%`;
            },
          },
          0,
        )
        // Hold at 100% until the page (fonts, first video) is actually ready.
        .add(() => {
          if (!ready) tl.pause();
        })
        .call(() => {
          window.scrollTo(0, 0);
          lenisRef.current?.scrollTo(0, { immediate: true, force: true });
        })
        // STEP 2 → text fade out
        .to(content.current, { opacity: 0, duration: 0.6, ease: "power2.out" })
        // STEP 3 → columns disappear, last column first
        .addLabel("lift")
        .to(columns, {
          yPercent: -100,
          duration: 1.6,
          ease: "power4.inOut",
          stagger: { each: 0.12, from: "end" },
        })
        .call(() => setCovered(false), undefined, "lift+=0.55")
        // hide loader
        .to(loader, { opacity: 0, duration: 0.3, delay: -0.4 });

      whenPageReady().then(() => {
        if (cancelled) return;
        ready = true;
        if (tl.paused()) tl.play();
      });

      return () => {
        cancelled = true;
        window.removeEventListener("resize", layoutColumns);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="fixed inset-0 z-200 flex overflow-hidden">
      {Array.from({ length: COLUMNS }, (_, i) => (
        <div
          key={i}
          className="loader-column absolute inset-y-0 bg-white/2 backdrop-blur-[40px] will-change-transform"
          style={{ left: `${(i * 100) / COLUMNS}%`, width: `${100 / COLUMNS}%` }}
        />
      ))}

      <div
        ref={content}
        className="invisible absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-15 font-sans text-white opacity-0 md:max-[992px]:gap-16 max-md:left-0 max-md:translate-x-5.5"
      >
        <h3 className="mb-0 whitespace-nowrap text-center text-[6.25vw] font-normal leading-normal tracking-[5.73vw] indent-[3%] [text-box:trim-both_cap_alphabetic] md:max-[992px]:text-[64px] md:max-[992px]:tracking-[46px] max-md:tracking-[8vw]">
          LOAD<strong className="font-bold">ING</strong>
        </h3>

        <div className="flex flex-row items-center justify-center gap-5 text-[2.08vw] font-normal leading-normal md:max-[992px]:text-[24px] max-md:text-[14px]">
          <span className="inline-block [text-box:trim-both_cap_alphabetic]">Progress</span>
          <div className="relative grid items-center">
            <span className="mt-0.5 block h-px w-[49.11vw] border-b border-dashed border-white" />
            <span ref={bar} className="absolute top-0.5 block h-px w-0 border-b border-white">
              <span className="absolute -top-2.25 right-0 block size-5 rounded-full bg-white max-md:-top-1.75 max-md:size-3.5" />
            </span>
          </div>
          <span
            ref={count}
            className="inline-block w-25 tabular-nums [text-box:trim-both_cap_alphabetic] md:max-[992px]:w-15.25 max-md:w-9.25"
          >
            0%
          </span>
        </div>
      </div>
    </div>
  );
}

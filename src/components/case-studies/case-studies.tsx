"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { caseStudyAnchor, type CaseStudy } from "@/config/case-studies";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { createJourneyScene, type JourneyScene } from "./journey-scene";
import {
  anchorScreens,
  clamp,
  JOURNEY,
  caseCenterTravel,
  readingTravel,
  scrubFactor,
  storyTravel,
  sectionScreens,
  travelEnd,
  travelScreens,
} from "./journey";

export function CaseStudies({ studies }: { studies: CaseStudy[] }) {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<JourneyScene | null>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const total = studies.length;
  const screens = sectionScreens(total);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useGSAP(
    () => {
      const section = root.current;
      const stage = viewport.current;
      const canvasEl = canvas.current;
      if (!section || !stage || !canvasEl) return;

      let disposed = false;
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const end = travelEnd(total);
      const moveScreens = travelScreens(total);
      const hud = gsap.utils.toArray<HTMLElement>(".journey-hud", section);
      const keepScrolling = section.querySelector<HTMLElement>(".journey-keep");
      const sound = section.querySelector<HTMLElement>(".journey-sound");
      const skipSmall = section.querySelector<HTMLElement>(".journey-skip");
      const motion = {
        travel: 0,
        camX: 0,
        camY: 0,
        time: 0,
        hud: -1,
        keep: -1,
        flying: false,
        wheel: 1,
        pointer: { x: 0, y: 0, inside: false },
      };

      const setWheelSpeed = (value: number) => {
        const instance = lenisRef.current as unknown as { virtualScroll?: { options?: { wheelMultiplier: number } } };
        const options = instance?.virtualScroll?.options;
        if (options) options.wheelMultiplier = value;
      };

      const main = ScrollTrigger.create({ trigger: section, start: "top top", end: "bottom bottom" });
      const visible = ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive) return;
          sceneRef.current?.setVideo(activeRef.current, false);
          motion.wheel = 1;
          setWheelSpeed(1);
        },
      });

      const resize = () => sceneRef.current?.resize(stage.clientWidth, stage.clientHeight);
      const observer = new ResizeObserver(resize);
      observer.observe(stage);

      createJourneyScene(canvasEl, studies).then((scene) => {
        if (disposed) {
          scene?.dispose();
          return;
        }
        if (!scene) return;
        sceneRef.current = scene;
        resize();
        gsap.to(canvasEl, { opacity: 1, duration: 0.8, ease: "power2.out" });
      });

      const onPointerMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        motion.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        motion.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        motion.pointer.inside = event.clientY >= rect.top && event.clientY <= rect.bottom;
      };
      const onPointerLeave = () => {
        motion.pointer.inside = false;
      };
      if (finePointer) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onPointerLeave);
      }

      const targetTravel = () => {
        const range = main.end - main.start;
        const scrollTop = lenisRef.current?.targetScroll ?? window.scrollY;
        const progress = range > 0 ? clamp((scrollTop - main.start) / range, 0, 1) : main.progress;
        const scrolled = progress * (moveScreens + JOURNEY.endHold);
        return clamp(scrolled / moveScreens, 0, 1) * end;
      };
      motion.travel = targetTravel();

      const tick = (_time: number, deltaMs: number) => {
        if (!visible.isActive) return;
        const delta = Math.min(deltaMs / 1000, 0.05);
        motion.time += delta;

        const target = targetTravel();
        const scrub = reduce ? 1 : finePointer ? JOURNEY.scrubDesktop : JOURNEY.scrubMobile;
        motion.travel += (target - motion.travel) * scrubFactor(scrub, delta);
        if (Math.abs(target - motion.travel) < 0.001) motion.travel = target;

        if (finePointer && !reduce) {
          const follow = scrubFactor(0.1, delta);
          motion.camX += (motion.pointer.x * JOURNEY.parallax - motion.camX) * follow;
          motion.camY += (motion.pointer.y * JOURNEY.parallax - motion.camY) * follow;
        }

        const scene = sceneRef.current;
        scene?.render({
          camX: motion.camX,
          camY: motion.camY,
          camZ: -motion.travel,
          time: reduce ? 0 : motion.time,
          entry: reduce ? 1 : motion.travel / readingTravel(0),
          speed: Math.abs(target - motion.travel),
          pointer: motion.pointer,
        });

        let nearest = 0;
        let best = Infinity;
        studies.forEach((_, i) => {
          const gap = Math.abs(caseCenterTravel(i) - motion.travel);
          if (gap < best) {
            best = gap;
            nearest = i;
          }
        });
        if (nearest !== activeRef.current) {
          activeRef.current = nearest;
          setActive(nearest);
        }
        scene?.setVideo(
          nearest,
          motion.travel > readingTravel(nearest) - 34 && motion.travel < storyTravel(nearest) + 20,
        );

        const docked = main.isActive ? 1 : 0;
        const wheel = docked ? JOURNEY.wheelSpeed : 1;
        if (wheel !== motion.wheel) {
          motion.wheel = wheel;
          setWheelSpeed(wheel);
        }
        const moving = clamp((motion.travel - 4) / 10, 0, 1);
        const keep = docked * (1 - moving);
        if (Math.abs(keep - motion.keep) > 0.003 || (docked === 0 && motion.keep !== 0)) {
          motion.keep = keep;
          if (keepScrolling) {
            keepScrolling.style.opacity = keep.toFixed(3);
            keepScrolling.style.pointerEvents = keep > 0.5 ? "auto" : "none";
          }
          const after = (docked * moving).toFixed(3);
          [sound, skipSmall].forEach((el) => {
            if (!el) return;
            el.style.opacity = after;
            el.style.pointerEvents = docked * moving > 0.5 ? "auto" : "none";
          });
        }

        const flying = docked === 1 && motion.travel > 10 && motion.travel < end - 2;
        if (flying !== motion.flying) {
          motion.flying = flying;
          document.documentElement.dataset.journey = flying ? "flying" : "";
        }

        const hudValue = clamp((motion.travel - 6) / 18, 0, 1);
        if (Math.abs(hudValue - motion.hud) > 0.003) {
          motion.hud = hudValue;
          hud.forEach((el) => {
            el.style.opacity = hudValue.toFixed(3);
          });
        }
      };

      gsap.ticker.add(tick);

      return () => {
        disposed = true;
        gsap.ticker.remove(tick);
        observer.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        document.documentElement.removeEventListener("pointerleave", onPointerLeave);
        sceneRef.current?.dispose();
        sceneRef.current = null;
        delete document.documentElement.dataset.journey;
        setWheelSpeed(1);
      };
    },
    { scope: root },
  );

  const toggleSound = () => {
    const nextMuted = !muted;
    sceneRef.current?.setMuted(nextMuted);
    setMuted(nextMuted);
  };

  const skip = () => {
    const section = root.current;
    if (!section) return;
    lenisRef.current?.scrollTo(section.offsetTop + section.offsetHeight - window.innerHeight, { duration: 2.4 });
  };

  const activeStudy = studies[active];

  return (
    <Section
      ref={root}
      id="case-studies"
      aria-label="Case studies"
      className="relative z-10 -mt-[100svh]"
      style={{ height: `${screens * 100}svh` }}
    >
      {studies.map((study, i) => (
        <div
          key={study.slug}
          id={caseStudyAnchor(study.slug)}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{ top: `${anchorScreens(i) * 100}svh` }}
        />
      ))}

      <div className="sr-only">
        {studies.map((study) => (
          <article key={study.slug}>
            <h2>{study.title || study.category}</h2>
            {study.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </div>

      <div ref={viewport} className="sticky top-0 h-svh overflow-hidden text-white">
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 block size-full opacity-0" />

        <div className="journey-hud absolute bottom-[clamp(1.25rem,4svh,3rem)] left-[clamp(1.375rem,0.7rem+2.4vw,3rem)] flex items-center gap-4 opacity-0">
          <p className="text-[clamp(1.5rem,1rem+1.6vw,2.75rem)] font-bold leading-none tabular-nums">
            {active + 1}
            <span className="font-light opacity-60">/{total}</span>
          </p>
          <p className="whitespace-nowrap text-fluid-xs uppercase leading-relaxed tracking-[0.3em] opacity-80">
            [Scroll to travel]
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-[clamp(1.25rem,4svh,3rem)] flex justify-center max-md:bottom-[clamp(4rem,9svh,5rem)]">
          <div className="journey-keep pointer-events-none absolute bottom-0 flex flex-col items-center gap-[clamp(1.25rem,3svh,2.5rem)] opacity-0">
            <p className="text-fluid-xs uppercase tracking-[0.4em]">[Keep scrolling]</p>
            <button
              type="button"
              onClick={skip}
              className="rounded-full border border-white/70 px-5 py-2 text-fluid-sm transition-colors hover:bg-white/15"
            >
              Skip Experience
            </button>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            disabled={!activeStudy?.video}
            className={cn(
              "journey-sound pointer-events-none inline-flex items-center gap-3 rounded-full border border-white/60 px-5 py-2.5 text-fluid-xs uppercase tracking-[0.3em] opacity-0 transition-colors hover:bg-white/15",
              !activeStudy?.video && "invisible",
            )}
          >
            <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
              {[0, 1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={cn("w-0.5 origin-bottom rounded-full bg-white", muted ? "h-1" : "h-3.5 animate-sound-bar")}
                  style={{ animationDelay: `${bar * 0.15}s` }}
                />
              ))}
            </span>
            {muted ? "Sound on!" : "Sound off"}
          </button>
        </div>

        <button
          type="button"
          onClick={skip}
          className="journey-skip pointer-events-none absolute bottom-[clamp(1.25rem,4svh,3rem)] right-[clamp(1.375rem,0.7rem+2.4vw,3rem)] text-fluid-xs underline-offset-4 opacity-0 hover:underline"
        >
          Skip Experience
        </button>
      </div>
    </Section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { caseStudyAnchor, paragraphText, type CaseStudy } from "@/config/case-studies";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { isCovered } from "@/lib/reveal-gate";
import { backgroundState } from "@/lib/background-state";
import { Section } from "@/components/ui/section";
import { createJourneyScene, type JourneyScene } from "./journey-scene";
import { clamp, createPacing, JOURNEY, Q_START, scrubFactor } from "./journey";

export function CaseStudies({ studies }: { studies: CaseStudy[] }) {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<JourneyScene | null>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  // Videos play with sound by default while active; the button starts as "Sound off".
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);

  // Every scene of every case, in order, tagged with the case it belongs to.
  const scenes = useMemo(
    () => studies.flatMap((study, caseIndex) => study.scenes.map((scene) => ({ ...scene, caseIndex }))),
    [studies],
  );
  const firstScene = useMemo(
    () => studies.map((_, i) => studies.slice(0, i).reduce((sum, study) => sum + study.scenes.length, 0)),
    [studies],
  );
  const total = studies.length;
  const pacing = useMemo(() => createPacing(scenes.map((scene) => scene.pace ?? 1)), [scenes]);
  const { anchorScreens } = pacing;
  const screens = pacing.sectionScreens;

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
      const moveScreens = pacing.travelScreens;
      const hud = gsap.utils.toArray<HTMLElement>(".journey-hud", section);
      const sound = section.querySelector<HTMLElement>(".journey-sound");
      const motion = {
        q: Q_START,
        camX: 0,
        camY: 0,
        time: 0,
        hud: -1,
        sound: -1,
        wheel: 1,
        pointer: { x: 0, y: 0, inside: false },
        menuCase: -1,
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
          sceneRef.current?.pauseAll();
          motion.wheel = 1;
          setWheelSpeed(1);
        },
      });

      const resize = () => sceneRef.current?.resize(stage.clientWidth, stage.clientHeight);
      const observer = new ResizeObserver(resize);
      observer.observe(stage);

      createJourneyScene(canvasEl, scenes, {
        muted: mutedRef.current,
      }).then((scene) => {
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

      /** Scroll position → scene clock q. */
      const targetQ = () => {
        const range = main.end - main.start;
        const scrollTop = lenisRef.current?.targetScroll ?? window.scrollY;
        const progress = range > 0 ? clamp((scrollTop - main.start) / range, 0, 1) : main.progress;
        const scrolled = progress * (moveScreens + JOURNEY.endHold);
        // Scroll → scene clock, slowed down while a slide rests in the middle.
        return pacing.qAtUnits(clamp(scrolled, 0, moveScreens) / JOURNEY.sceneScreens);
      };
      motion.q = targetQ();

      // Menu jump: cut straight to the new spot with a quick fade instead of flying there.
      let jumping = false;
      const onJump = () => {
        jumping = true;
        gsap.fromTo(canvasEl, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out", overwrite: true });
      };
      window.addEventListener("journeyjump", onJump);

      const tick = (_time: number, deltaMs: number) => {
        if (jumping) {
          jumping = false;
          motion.q = targetQ();
        }
        if (!visible.isActive || isCovered()) {
          // Stay synced to the real scroll position while off screen or behind the
          // preloader, so the scene never starts from a stale position and visibly rewinds.
          motion.q = targetQ();
          if (!visible.isActive) {
            // Left the section (fast scroll / menu jump can skip the frames that would reset this):
            // hand the background colours and the menu back to the default.
            if (motion.menuCase !== -1) {
              motion.menuCase = -1;
              backgroundState.colors = null;
              window.dispatchEvent(new CustomEvent("journeycase", { detail: -1 }));
            }
            return;
          }
        }
        const delta = Math.min(deltaMs / 1000, 0.05);
        motion.time += delta;

        const target = targetQ();
        const scrub = reduce ? 1 : finePointer ? JOURNEY.scrubDesktop : JOURNEY.scrubMobile;
        motion.q += (target - motion.q) * scrubFactor(scrub, delta);
        if (Math.abs(target - motion.q) < 0.0005) motion.q = target;

        if (finePointer && !reduce) {
          const follow = scrubFactor(0.1, delta);
          motion.camX += (motion.pointer.x * JOURNEY.parallax - motion.camX) * follow;
          motion.camY += (motion.pointer.y * JOURNEY.parallax - motion.camY) * follow;
        }

        const status = sceneRef.current?.render({
          camX: motion.camX,
          camY: motion.camY,
          q: motion.q,
          time: reduce ? 0 : motion.time,
        });

        const nearest = clamp(Math.round(motion.q), 0, scenes.length - 1);
        const caseIndex = scenes[nearest]?.caseIndex ?? 0;
        if (caseIndex !== activeRef.current) {
          activeRef.current = caseIndex;
          setActive(caseIndex);
        }

        const docked = main.isActive ? 1 : 0;
        // Tell the menu which case is on screen (-1 = none, e.g. still on the hero).
        const inCase = docked && motion.q > JOURNEY.enter[1] ? caseIndex : -1;
        if (inCase !== motion.menuCase) {
          motion.menuCase = inCase;
          // Ease the liquid background to this case study's colours (default outside cases).
          backgroundState.colors = inCase >= 0 ? (studies[inCase]?.background ?? null) : null;
          window.dispatchEvent(new CustomEvent("journeycase", { detail: inCase }));
        }
        const wheel = docked ? JOURNEY.wheelSpeed : 1;
        if (wheel !== motion.wheel) {
          motion.wheel = wheel;
          setWheelSpeed(wheel);
        }

        const hudValue = clamp((motion.q - Q_START) / 0.35, 0, 1);
        if (Math.abs(hudValue - motion.hud) > 0.003) {
          motion.hud = hudValue;
          hud.forEach((el) => {
            el.style.opacity = hudValue.toFixed(3);
          });
        }

        // From when a sound video reaches the centre until it has left the screen.
        const soundValue = docked && status?.sound ? 1 : 0;
        if (sound && Math.abs(soundValue - motion.sound) > 0.003) {
          motion.sound = soundValue;
          sound.style.opacity = soundValue.toFixed(3);
          sound.style.pointerEvents = soundValue > 0.5 ? "auto" : "none";
        }
      };

      gsap.ticker.add(tick);

      return () => {
        disposed = true;
        backgroundState.colors = null;
        gsap.ticker.remove(tick);
        window.removeEventListener("journeyjump", onJump);
        observer.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        document.documentElement.removeEventListener("pointerleave", onPointerLeave);
        sceneRef.current?.dispose();
        sceneRef.current = null;
        setWheelSpeed(1);
      };
    },
    // Rebuild the 3D scene whenever the slide content changes (e.g. a video is added).
    { scope: root, dependencies: [scenes, pacing], revertOnUpdate: true },
  );

  const toggleSound = () => {
    const nextMuted = !muted;
    sceneRef.current?.setMuted(nextMuted);
    setMuted(nextMuted);
  };

  const scrollForward = () => {
    const section = root.current;
    if (!section) return;
    const scrollTop = lenisRef.current?.targetScroll ?? window.scrollY;
    const offset = (scrollTop - section.offsetTop) / window.innerHeight;
    const next = scenes.findIndex((_, i) => anchorScreens(i) > offset + 0.05);
    const top = next >= 0 ? section.offsetTop + anchorScreens(next) * window.innerHeight : section.offsetTop + section.offsetHeight;
    lenisRef.current?.scrollTo(top, { duration: 2.4 });
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
          style={{ top: `${anchorScreens(firstScene[i]) * 100}svh` }}
        />
      ))}

      <div className="sr-only">
        {studies.map((study) => (
          <article key={study.slug}>
            <h2>{study.client}</h2>
            {study.scenes.flatMap((scene, s) =>
              scene.blocks.flatMap((block, b) => {
                if (block.kind === "image") return [<p key={`${s}-${b}`}>{block.alt}</p>];
                if (block.kind !== "text") return [];
                return [
                  block.title ? <h3 key={`${s}-${b}-t`}>{block.title}</h3> : null,
                  ...(block.paragraphs ?? []).map((paragraph, p) => <p key={`${s}-${b}-${p}`}>{paragraphText(paragraph)}</p>),
                ];
              }),
            )}
          </article>
        ))}
      </div>

      <div ref={viewport} className="sticky top-0 h-svh overflow-hidden text-white">
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 block size-full opacity-0" />

        {/* Figma: counter 38px (1 bold, /5 light, 1.4px tracking), 24px gap, client 22px light 9.4px tracking. */}
        <div className="journey-hud absolute bottom-[clamp(1.25rem,5.75svh,4.5rem)] left-[clamp(1.25rem,2.08vw,3rem)] flex items-center gap-[clamp(0.75rem,1.25vw,2rem)] opacity-0">
          <p className="text-[clamp(1.5rem,1.98vw,3rem)] font-bold leading-none tracking-[0.037em] tabular-nums [text-box:trim-both_cap_alphabetic]">
            {active + 1}
            <span className="font-light">/{total}</span>
          </p>
          <p className="whitespace-nowrap text-[clamp(0.75rem,1.146vw,1.75rem)] font-light uppercase leading-none tracking-[0.427em] [text-box:trim-both_cap_alphabetic] max-md:tracking-[0.25em]">
            {activeStudy?.client}
          </p>
        </div>

        {/* Figma: 22px light, 9.4px tracking (brackets 1.4px), right-aligned on the counter's centre line. */}
        <button
          type="button"
          onClick={scrollForward}
          className="journey-hud absolute bottom-[calc(clamp(1.25rem,5.75svh,4.5rem)+(clamp(1.5rem,1.98vw,3rem)-clamp(0.75rem,1.146vw,1.75rem))*0.35)] right-[clamp(1.25rem,2.08vw,3rem)] whitespace-nowrap text-[clamp(0.75rem,1.146vw,1.75rem)] font-light uppercase leading-none tracking-[0.427em] opacity-0 transition-transform duration-300 [text-box:trim-both_cap_alphabetic] hover:-translate-y-1 max-md:tracking-[0.25em]"
        >
          {/* "[ S" and "D ]" get the same gap as the letters; no trailing space after "]". */}
          [Scroll<span className="max-md:hidden"> to move forward</span>
          <span className="tracking-normal">]</span>
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(1.25rem,4svh,3rem)] flex justify-center max-md:bottom-[clamp(3.75rem,9svh,5rem)]">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            className={cn(
              "journey-sound pointer-events-none inline-flex items-center gap-3 rounded-full border border-white/60 px-5 py-2.5 text-fluid-xs uppercase tracking-[0.3em] opacity-0 transition-[opacity,background-color] duration-300 hover:bg-white/15",
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
      </div>
    </Section>
  );
}

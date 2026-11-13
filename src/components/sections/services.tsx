"use client";

import { useRef, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { services } from "@/config/services";
import { Section } from "@/components/ui/section";
import type { GlassPointer } from "@/components/services/services-glass";
import { ScrollHintLabel } from "@/components/ui/scroll-hint-label";

/**
 * Card keyframes along the flight path (Figma "Services"), sampled at slot -2 ... 2:
 * -2 far away (top-right, hidden) -> -1 "up next" (top-right) -> 0 in focus (centre)
 * -> 1 just passed (bottom-left, cropped) -> 2 gone past the viewer.
 * x / y are fractions of the viewport width / height from the centre.
 */
const KEYS = {
  x: [0.56, 0.28, 0, -0.44, -0.9],
  y: [-0.5, -0.3, -0.02, 0.3, 0.62],
  scale: [0.2, 0.5, 1, 1.15, 1.7],
  rotZ: [4, 2.5, 2, 1.5, 0],
  rotY: [-26, -16, -5, 14, 26],
  rotX: [10, 7, 4, 0, -6],
  opacity: [0, 1, 1, 1, 0],
};

const dwell = gsap.parseEase("power2.inOut");
/** How strongly cards linger at each slot: 0 = constant speed, 1 = full stop at every slot. */
const DWELL = 0.6;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function sample(key: number[], s: number) {
  const pos = Math.min(2, Math.max(-2, s)) + 2;
  const i = Math.min(3, Math.floor(pos));
  const f = pos - i;
  return key[i] + (key[i + 1] - key[i]) * f;
}

// Scroll range in "slots": the first card starts as "up next", the last one leaves past the viewer.
const T_START = -1.3;
const SCREENS_PER_SLOT = 0.8;
/** Cards this close to focus keep their video playing. */
const VIDEO_PLAY_DIST = 1.2;
/**
 * Services: old-FunkyVibes WebGL glass cards (video inside, refracted liquid background, lit
 * bevel, light-to-bold title) flying in from the top-right, resting in the centre, then sweeping past
 * the viewer bottom-left. Scroll-driven only, no pointer motion.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const count = services.length;
  const tEnd = count - 1 + 1.6;
  const screens = (tEnd - T_START) * SCREENS_PER_SLOT + 1;

  useGSAP(
    () => {
      const section = root.current;
      const stage = viewport.current;
      if (!section || !stage) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        section.dataset.animated = "true";
        const cards = gsap.utils.toArray<HTMLElement>(".service-card", section);
        const videos = cards.map((card) => card.querySelector<HTMLVideoElement>("video[data-svc-media]"));
        const intro = section.querySelector<HTMLElement>(".services-intro");
        const hint = section.querySelector<HTMLElement>(".services-scroll-wrap");
        // No hover effects: the glass gets a pointer that never targets a card.
        const pointer: GlassPointer = { u: 0.5, v: 0.5, strength: 0, index: -1 };
        let visible = false;
        let primed = false;
        let t = T_START;
        const webgl = () => section.dataset.webgl === "true";

        const render = (progress: number) => {
          t = T_START + (tEnd - T_START) * progress;
          const w = window.innerWidth;
          const h = window.innerHeight;

          cards.forEach((card, i) => {
            const raw = t - i;
            // Slow each card down as it reaches a slot (blended with linear motion so it never fully
            // stops) — a steady scroll then reads as one continuous glide, not stop-start steps.
            const base = Math.floor(raw);
            const s = raw + (base + dwell(raw - base) - raw) * DWELL;
            const hidden = s <= -2 || s >= 2;
            card.style.visibility = hidden ? "hidden" : "visible";
            const video = videos[i];
            if (video) {
              const play = visible && !hidden && Math.abs(s) < VIDEO_PLAY_DIST && !document.hidden;
              if (play && video.paused) video.play().catch(() => {});
              else if (!play && !video.paused) video.pause();
            }
            if (hidden) return;
            // Smoothstep, so the title eases from light to bold (and back) without a hard edge.
            const near = clamp01(1 - Math.abs(s));
            const focus = near * near * (3 - 2 * near);
            card.style.zIndex = String(Math.round((s + 2) * 10));
            card.style.opacity = sample(KEYS.opacity, s).toFixed(3);
            card.style.transform =
              `translate3d(${(sample(KEYS.x, s) * w).toFixed(1)}px, ${(sample(KEYS.y, s) * h).toFixed(1)}px, 0) ` +
              `rotateX(${sample(KEYS.rotX, s).toFixed(2)}deg) rotateY(${sample(KEYS.rotY, s).toFixed(2)}deg) ` +
              `rotateZ(${sample(KEYS.rotZ, s).toFixed(2)}deg) scale(${sample(KEYS.scale, s).toFixed(3)})`;
            card.dataset.focus = focus.toFixed(3);
            if (!webgl()) {
              card.style.setProperty("--focus", focus.toFixed(3));
              card.style.setProperty("--dim", Math.min(1, Math.abs(s) / 1.6).toFixed(2));
            }
          });

          if (intro) {
            const on = clamp01((t - -1.25) / 0.2) * clamp01((-0.35 - t) / 0.25);
            intro.style.opacity = String(on);
            intro.style.transform = `translateY(${((1 - on) * 12).toFixed(1)}px)`;
          }
          if (hint) hint.style.opacity = String(clamp01((tEnd - 0.4 - t) / 0.4));
        };

        // Scroll sets a target; a per-frame loop glides toward it, so motion stays silky between scroll events.
        let goal = 0;
        let current = 0;
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            goal = self.progress;
          },
          onRefresh: (self) => {
            goal = current = self.progress;
            render(current);
          },
        });
        const onScreen = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            visible = self.isActive;
            // Buffer every video once the section is near, so each card shows a real frame, not a blank.
            if (visible && !primed) {
              primed = true;
              videos.forEach((video) => {
                if (!video) return;
                video.preload = "auto";
                video.load();
              });
            }
            render(current);
          },
        });
        goal = current = trigger.progress;
        render(current);

        const tick = (_time: number, deltaTime: number) => {
          if (!visible) return;
          const diff = goal - current;
          if (Math.abs(diff) < 0.00002) return;
          current += diff * (1 - Math.exp(-deltaTime / 150));
          render(current);
        };
        gsap.ticker.add(tick);

        // The WebGL glass layer (falls back to the CSS cards if WebGL is unavailable).
        let disposed = false;
        let glass: { dispose: () => void } | null = null;
        import("@/components/services/services-glass").then(({ createServicesGlass }) => {
          if (disposed) return;
          glass = createServicesGlass({ section, viewport: stage, cards, tints: services.map((s) => s.tint), pointer });
        });

        return () => {
          disposed = true;
          glass?.dispose();
          gsap.ticker.remove(tick);
          trigger.kill();
          onScreen.kill();
          videos.forEach((video) => video?.pause());
          delete section.dataset.animated;
          cards.forEach((card) => card.removeAttribute("style"));
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const scrollForward = () => {
    const section = root.current;
    if (!section) return;
    const step = section.offsetHeight / (tEnd - T_START);
    const next = Math.min(section.offsetTop + section.offsetHeight, window.scrollY + step);
    lenis?.scrollTo(next, { duration: 1.4 });
  };

  return (
    <Section
      ref={root}
      aria-label="Services"
      className="group/services data-[animated=true]:h-(--services-h)"
      style={{ "--services-h": `${screens * 100}svh` } as CSSProperties}
    >
      <div
        ref={viewport}
        className={`relative min-h-svh overflow-hidden text-white [perspective:1000px] group-data-[animated=true]/services:sticky group-data-[animated=true]/services:top-0 group-data-[animated=true]/services:h-svh`}
      >
        <p
          className={`services-intro pointer-events-none relative z-[2] pt-24 text-center text-[clamp(0.75rem,0.6rem+0.55vw,1.375rem)] font-normal leading-none tracking-[0.2em] [text-box:trim-both_cap_alphabetic] group-data-[animated=true]/services:absolute group-data-[animated=true]/services:left-1/2 group-data-[animated=true]/services:top-1/2 group-data-[animated=true]/services:-translate-x-1/2 group-data-[animated=true]/services:pt-0 group-data-[animated=true]/services:opacity-0`}
        >
          we&rsquo;ll tell stories through&hellip;
        </p>
        {/* Readable section heading for search engines and screen readers (the cards are drawn in WebGL). */}
        <h2 className="sr-only">Our services: {services.map((s) => s.lines.join(" ").replace(/&(\S)/, "& $1")).join(", ")}</h2>

        <ul className={`flex flex-col items-center gap-6 px-4 py-16 group-data-[animated=true]/services:[transform-style:preserve-3d] group-data-[animated=true]/services:absolute group-data-[animated=true]/services:inset-0 group-data-[animated=true]/services:block group-data-[animated=true]/services:p-0`}>
          {services.map((service) => (
            <li
              key={service.slug}
              aria-label={service.lines.join(" ")}
              className={[
                "service-card relative isolate aspect-[780/420] w-(--cw) rounded-[calc(var(--cw)*0.0513)] [--cw:min(78vw,26rem)] [--dim:0] [--focus:1]",
                "will-change-[transform,opacity] [backface-visibility:hidden]",
                `group-data-[animated=true]/services:absolute group-data-[animated=true]/services:left-[calc(50%-var(--cw)/2)] group-data-[animated=true]/services:top-[calc(50%-var(--cw)*0.26923)] group-data-[animated=true]/services:[--cw:clamp(17.8rem,33vw,90rem)] max-md:group-data-[animated=true]/services:[--cw:76vw]`,
                "shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)]",
                `group-data-[webgl=true]/services:shadow-none`,
              ].join(" ")}
            >
              {/* Source for the WebGL title; the visual title is drawn by the glass. */}
              <span data-svc-title data-lines={service.lines.join("|").toUpperCase()} aria-hidden className="sr-only font-sans">
                {service.lines.join(" ").toUpperCase()}
              </span>

              {/* CSS fallback card (old site's DOM layers) — hidden once the WebGL glass takes over. */}
              <div
                aria-hidden
                className={`absolute inset-0 overflow-hidden rounded-[inherit] border-[calc(var(--cw)*0.019)] border-white/[0.04] bg-[linear-gradient(145deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_42%,rgba(86,191,251,0.08)_100%)] group-data-[webgl=true]/services:opacity-0`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_30%_20%,rgba(86,191,251,0.25),rgba(6,14,24,0.9))]">
                  {service.media.kind === "video" ? (
                    <video
                      data-svc-media
                      src={service.media.src}
                      muted
                      loop
                      playsInline
                      preload="none"
                      disablePictureInPicture
                      className="block size-full scale-[1.08] object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- also used as a WebGL texture
                    <img data-svc-media src={service.media.src} alt="" decoding="async" className="block size-full scale-[1.08] object-cover" />
                  )}
                </div>
                <span className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_50%,rgba(6,14,24,0.5)_0%,rgba(6,14,24,0)_100%),radial-gradient(120%_90%_at_50%_50%,rgba(6,14,24,0)_40%,rgba(6,14,24,0.55)_100%),linear-gradient(180deg,rgba(6,14,24,0.1)_0%,rgba(6,14,24,0.45)_100%)] bg-[rgba(6,14,24,calc(0.32+var(--dim)*0.5))]" />
                <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0)_70%,rgba(255,255,255,0.06)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_22px_34px_-22px_rgba(255,255,255,0.35),inset_0_-30px_46px_-26px_rgba(0,0,0,0.55)]" />
                <span className="absolute inset-0 grid place-items-center text-[calc(var(--cw)*0.085)] uppercase leading-[1.25] [text-shadow:0_2px_28px_rgba(0,0,0,0.45)]">
                  <span className="col-start-1 row-start-1 grid place-items-center font-light tracking-[0.16em] opacity-[calc(1-var(--focus))]">
                    {service.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                  <span className="col-start-1 row-start-1 grid place-items-center font-bold tracking-[0.16em] opacity-(--focus)">
                    {service.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div
          className={`services-scroll-wrap absolute inset-x-0 bottom-[clamp(1.5rem,7svh,4.5rem)] z-[2] hidden px-[clamp(1.5rem,6.4vw,7.5rem)] group-data-[animated=true]/services:block`}
        >
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

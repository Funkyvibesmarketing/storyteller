"use client";

import { useRef } from "react";
import { FINE_POINTER, gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(`${FINE_POINTER} and ${MOTION_OK}`, () => {
      const el = dot.current;
      if (!el) return;

      gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

      const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });
      let visible = false;
      let active = false;

      const move = (event: PointerEvent) => {
        if (!visible) {
          visible = true;
          gsap.set(el, { x: event.clientX, y: event.clientY });
          gsap.to(el, { autoAlpha: 1, duration: 0.3 });
        }
        xTo(event.clientX);
        yTo(event.clientY);
      };

      const over = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        const hit = !!target?.closest("a, button, [data-cursor]");
        if (hit === active) return;
        active = hit;
        gsap.to(el, { scale: hit ? 3.2 : 1, duration: 0.4, ease: "power3.out" });
      };

      const leave = () => {
        visible = false;
        gsap.to(el, { autoAlpha: 0, duration: 0.3 });
      };

      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerover", over, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);

      return () => {
        window.removeEventListener("pointermove", move);
        document.removeEventListener("pointerover", over);
        document.documentElement.removeEventListener("pointerleave", leave);
      };
    });

    return () => mm.revert();
  });

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-170 hidden size-3 rounded-full bg-white opacity-0 mix-blend-difference pointer-fine:block"
    />
  );
}

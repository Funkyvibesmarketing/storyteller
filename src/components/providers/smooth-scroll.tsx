"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

if (typeof window !== "undefined" && "scrollRestoration" in history) history.scrollRestoration = "manual";

function GsapLenisSync() {
  const lenis = useLenis();
  const started = useRef(false);

  useEffect(() => {
    if (!lenis) return;

    const toTop = () => {
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true, force: true });
    };
    const toTopAfterLoad = () => requestAnimationFrame(toTop);

    if (!started.current) {
      started.current = true;
      if (window.location.hash) history.replaceState(history.state, "", window.location.pathname + window.location.search);
      toTop();
      if (document.readyState !== "complete") window.addEventListener("load", toTopAfterLoad, { once: true });
    }

    lenis.on("scroll", ScrollTrigger.update);

    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("load", toTopAfterLoad);
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(update);
    };
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: 0.085,
        wheelMultiplier: 1,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        respectReducedMotion: true,
      }}
    >
      <GsapLenisSync />
      {children}
    </ReactLenis>
  );
}

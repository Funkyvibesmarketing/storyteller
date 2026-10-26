"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setCovered } from "@/lib/reveal-gate";
import { siteConfig } from "@/config/site";

type PageTransitionContextValue = {
  navigate: (href: string) => void;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) throw new Error("usePageTransition must be used within PageTransition");
  return context;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const overlay = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const lenisRef = useRef(lenis);
  const busy = useRef(false);
  const pendingHash = useRef<string | null>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      const instance = lenisRef.current;

      if (url.origin !== window.location.origin) {
        window.location.assign(url.href);
        return;
      }

      if (url.pathname === window.location.pathname) {
        instance?.scrollTo(url.hash || 0, { force: true });
        return;
      }

      if (busy.current) return;
      busy.current = true;
      pendingHash.current = url.hash || null;
      instance?.stop();
      setCovered(true);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap
        .timeline({ onComplete: () => router.push(url.pathname + url.search) })
        .set(overlay.current, { autoAlpha: 1, yPercent: 100 })
        .to(overlay.current, { yPercent: 0, duration: reduce ? 0.01 : 0.75, ease: "expo.inOut" })
        .fromTo(label.current, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: "expo.out" }, "-=0.25");
    },
    [router],
  );

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const instance = lenisRef.current;
    instance?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.refresh();

    if (!busy.current) {
      setCovered(false);
      return;
    }

    gsap
      .timeline({
        delay: 0.1,
        onComplete: () => {
          gsap.set(overlay.current, { autoAlpha: 0 });
          busy.current = false;
          instance?.start();
          if (pendingHash.current) {
            instance?.scrollTo(pendingHash.current);
            pendingHash.current = null;
          }
        },
      })
      .to(label.current, { yPercent: -110, duration: 0.4, ease: "expo.in" })
      .call(() => setCovered(false))
      .to(overlay.current, { yPercent: -100, duration: 0.85, ease: "expo.inOut" }, "-=0.05");
  }, [pathname]);

  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <PageTransitionContext value={value}>
      {children}
      <div
        ref={overlay}
        aria-hidden="true"
        className="invisible fixed inset-0 z-190 flex items-center justify-center bg-accent text-ink will-change-transform"
      >
        <div className="overflow-hidden">
          <span ref={label} className="block text-[clamp(2rem,6vw,4.5rem)] font-semibold tracking-tight">
            {siteConfig.name}
            <span className="font-serif italic">.</span>
          </span>
        </div>
      </div>
    </PageTransitionContext>
  );
}

"use client";

import { useCallback } from "react";
import { useLenis } from "lenis/react";

export function useLenisScroll() {
  const lenis = useLenis();

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, offset = 0) => {
      lenis?.scrollTo(target, { offset });
    },
    [lenis],
  );

  const stop = useCallback(() => lenis?.stop(), [lenis]);
  const start = useCallback(() => lenis?.start(), [lenis]);

  return { lenis, scrollTo, stop, start };
}

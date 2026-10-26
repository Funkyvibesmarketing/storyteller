import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { PageTransition } from "@/components/transition/page-transition";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <PageTransition>{children}</PageTransition>
    </SmoothScroll>
  );
}

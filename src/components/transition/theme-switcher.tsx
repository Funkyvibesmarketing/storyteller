"use client";

import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { isThemeName, themes } from "@/lib/themes";

export function ThemeSwitcher() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const root = document.documentElement;

      gsap.utils.toArray<HTMLElement>("[data-theme]").forEach((section) => {
        const name = section.dataset.theme;
        const theme = isThemeName(name) ? themes[name] : themes.brand;

        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (!self.isActive) return;
            gsap.to(root, {
              "--background": theme.background,
              "--foreground": theme.foreground,
              duration: 0.7,
              ease: "power2.out",
              overwrite: "auto",
            });
          },
        });
      });
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}

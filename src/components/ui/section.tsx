import type { ComponentProps } from "react";
import type { ThemeName } from "@/lib/themes";
import { cn } from "@/lib/utils";

type SectionProps = ComponentProps<"section"> & {
  theme?: ThemeName;
};

export function Section({ theme = "brand", className, ...props }: SectionProps) {
  return <section data-theme={theme} className={cn("relative", className)} {...props} />;
}

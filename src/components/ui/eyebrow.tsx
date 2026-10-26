import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-fluid-xs uppercase tracking-[0.2em] opacity-60", className)}>{children}</p>;
}

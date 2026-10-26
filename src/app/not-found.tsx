import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { TransitionLink } from "@/components/transition/transition-link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Section className="flex min-h-svh items-center">
      <Container className="text-center">
        <p className="font-mono text-fluid-sm opacity-60">404</p>
        <h1 className="mt-4 text-[clamp(3rem,10vw,8rem)] font-semibold leading-none tracking-tighter">
          Lost the <em className="font-serif font-normal italic">plot</em>
        </h1>
        <p className="mt-6 opacity-70">This chapter does not exist.</p>
        <TransitionLink
          href="/"
          className="mt-10 inline-block rounded-full bg-foreground px-6 py-3 text-fluid-sm font-medium text-background transition-transform hover:scale-105"
        >
          Back to home
        </TransitionLink>
      </Container>
    </Section>
  );
}

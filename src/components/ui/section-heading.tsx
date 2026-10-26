import { Eyebrow } from "@/components/ui/eyebrow";
import { RevealText } from "@/components/ui/reveal-text";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  index: string;
  label: string;
  title: string;
  className?: string;
};

export function SectionHeading({ index, label, title, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Eyebrow>
        ({index}) {label}
      </Eyebrow>
      <RevealText as="h2" className="text-[clamp(2.5rem,7vw,6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
        {title}
      </RevealText>
    </div>
  );
}

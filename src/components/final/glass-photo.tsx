"use client";

import { useRef, type CSSProperties } from "react";
import { FINE_POINTER, gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/** Cuts a layer down to a ring: everything except its content box (padding = ring width). */
const RING: CSSProperties = {
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
};

/** Ring-shaped plates between the photo and the front glass: the slab's thickness, never over the photo. */
const EDGE_DEPTHS = [4, 8, 12, 16, 20];
const FRONT_Z = 24;

/**
 * A photo set in a thick 3D glass frame. The photo sits at the back, perfectly clear; the glass
 * frame floats in front of it, so tilting shows real depth. A light runs around the rim, the
 * glass catches a pointer glare and reflection streaks, and a sheen sweeps across as it lands.
 */
export function GlassPhoto({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const tilt = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        // Slow idle drift, so the depth always reads.
        gsap.fromTo(
          ".glass-float",
          { rotateX: 6, rotateY: -10, y: -8 },
          { rotateX: 2, rotateY: 8, y: 8, duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1 },
        );
        // Light travelling around the rim.
        gsap.to(".glass-rim-light", { rotate: 360, duration: 7, ease: "none", repeat: -1 });
      });

      // Lean toward the cursor; the glare follows it.
      mm.add(`${MOTION_OK} and ${FINE_POINTER}`, () => {
        const el = root.current;
        const inner = tilt.current;
        if (!el || !inner) return;
        const rx = gsap.quickTo(inner, "rotateX", { duration: 0.9, ease: "power3.out" });
        const ry = gsap.quickTo(inner, "rotateY", { duration: 0.9, ease: "power3.out" });
        const glare = { x: 30, y: 20, o: 0 };
        const paint = () => {
          inner.style.setProperty("--gx", `${glare.x.toFixed(1)}%`);
          inner.style.setProperty("--gy", `${glare.y.toFixed(1)}%`);
          inner.style.setProperty("--go", glare.o.toFixed(3));
        };
        const onMove = (event: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const u = gsap.utils.clamp(0, 1, (event.clientX - r.left) / r.width);
          const v = gsap.utils.clamp(0, 1, (event.clientY - r.top) / r.height);
          rx((0.5 - v) * 16);
          ry((u - 0.5) * 22);
          gsap.to(glare, { x: u * 100, y: v * 100, o: 1, duration: 0.6, ease: "power3.out", onUpdate: paint, overwrite: true });
        };
        const onLeave = () => {
          rx(0);
          ry(0);
          gsap.to(glare, { o: 0, duration: 0.8, ease: "power2.out", onUpdate: paint, overwrite: true });
        };
        el.addEventListener("pointermove", onMove, { passive: true });
        el.addEventListener("pointerleave", onLeave, { passive: true });
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  // Frame width and corner radius scale with the frame's own width (container query units).
  return (
    <figure
      ref={root}
      className={cn("relative aspect-[3/2] [container-type:inline-size] [perspective:1600px]", className)}
    >
      <div className="glass-float size-full [transform-style:preserve-3d]">
        <div
          ref={tilt}
          className="relative size-full [--frame:4.2cqw] [--go:0] [--gx:30%] [--gy:20%] [--r:3.4cqw] [transform-style:preserve-3d]"
        >
          {/* Coloured light the glass throws onto the background. */}
          <div
            aria-hidden
            className="absolute -inset-[22%] bg-[radial-gradient(50%_50%_at_50%_55%,rgba(217,101,143,0.5),rgba(155,120,214,0.25)_45%,transparent_72%)]"
            style={{ transform: "translateZ(-120px)" }}
          />
          {/* Contact shadow. */}
          <div
            aria-hidden
            className="absolute inset-[5%] rounded-(--r) shadow-[0_70px_120px_-30px_rgba(10,0,20,0.8)]"
            style={{ transform: "translateZ(-60px)" }}
          />

          {/* Back plate the photo is mounted on. */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-(--r) bg-[linear-gradient(160deg,#4a2266,#25102f)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            style={{ transform: "translateZ(-6px)" }}
          />

          {/* The photo — clear and full colour, nothing in front of it but clean glass highlights. */}
          <div className="absolute inset-(--frame) overflow-hidden rounded-[calc(var(--r)*0.55)] bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- transformed in 3D, next/image adds nothing here */}
            <img
              src={src}
              alt={alt}
              decoding="async"
              onError={onError}
              className="final-photo-img block size-full object-cover"
            />
            {/* Recess shading where the glass frame overhangs the photo. */}
            <span
              aria-hidden
              className="absolute inset-0 shadow-[inset_0_16px_26px_-14px_rgba(0,0,0,0.6),inset_0_-12px_22px_-14px_rgba(0,0,0,0.45),inset_12px_0_20px_-16px_rgba(0,0,0,0.4),inset_-12px_0_20px_-16px_rgba(0,0,0,0.4)]"
            />
          </div>

          {/* Glass thickness: ring-shaped plates stepping toward the viewer. */}
          {EDGE_DEPTHS.map((z, i) => (
            <div
              key={z}
              aria-hidden
              className="absolute inset-0 rounded-(--r) p-(--frame) bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(217,101,143,0.10)_50%,rgba(155,120,214,0.14))]"
              style={{ ...RING, transform: `translateZ(${z}px)`, opacity: 0.5 + i * 0.08 }}
            />
          ))}

          {/* Front glass frame. */}
          <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(${FRONT_Z}px)` }}>
            <div
              aria-hidden
              className="absolute inset-0 rounded-(--r) p-(--frame) bg-[linear-gradient(145deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.14)_35%,rgba(217,101,143,0.22)_65%,rgba(155,120,214,0.30)_100%)]"
              style={RING}
            />
            {/* Light running around the rim. */}
            <div aria-hidden className="absolute inset-0 overflow-hidden rounded-(--r) p-[1.5px]" style={RING}>
              <div className="glass-rim-light absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.95)_30deg,rgba(255,170,210,0.7)_60deg,transparent_110deg,transparent_200deg,rgba(190,160,255,0.8)_230deg,transparent_280deg)]" />
            </div>
            {/* Static lit edges: bright top-left, darker bottom-right, and the inner bevel. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-(--r) shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),inset_2px_3px_0_rgba(255,255,255,0.5),inset_-2px_-3px_8px_rgba(20,0,30,0.35)]"
            />
            <div
              aria-hidden
              className="absolute inset-(--frame) rounded-[calc(var(--r)*0.55)] shadow-[0_0_0_1.5px_rgba(255,255,255,0.4),0_6px_18px_-4px_rgba(20,0,30,0.5)]"
            />

            {/* Clear glass over the photo: soft streaks, sheen and pointer glare only. */}
            <div aria-hidden className="absolute inset-0 overflow-hidden rounded-(--r)">
              <div className="absolute -inset-[30%] rotate-[24deg] bg-[linear-gradient(90deg,transparent_40%,rgba(255,255,255,0.10)_42%,transparent_47%,transparent_52%,rgba(255,255,255,0.07)_53.5%,transparent_55%)]" />
              <div className="final-sheen absolute inset-y-0 -left-full w-full skew-x-[-18deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--gx)_var(--gy),rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.07)_22%,transparent_45%)] opacity-(--go) mix-blend-screen" />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

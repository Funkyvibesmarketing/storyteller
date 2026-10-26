"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { backgroundState } from "@/lib/background-state";
import { backgroundConfig as config, MAX_TRAIL, renderScale, scrollMotion, TRAIL_MAX_AGE } from "./config";
import { fragmentShader, vertexShader } from "./shaders";

type TrailPoint = { x: number; y: number; vx: number; vy: number; age: number };
type Point = { x: number; y: number };

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }

      const onContextLost = (event: Event) => event.preventDefault();
      canvas.addEventListener("webglcontextlost", onContextLost, false);

      renderer.setPixelRatio(isMobile ? renderScale.mobile : renderScale.desktop);
      renderer.setClearColor("#000000");

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const angle = config.directionAngle * (Math.PI / 180);

      const uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: config.speed },
        uAmplitude: { value: config.amplitude },
        uFrequency: { value: config.frequency },
        uDirection: { value: new THREE.Vector2(Math.cos(angle), Math.sin(angle)) },
        uDistortionStrength: { value: config.distortionStrength },
        uCursorRadius: { value: config.cursorRadius },
        uAspect: { value: 1 },
        uColor1: { value: new THREE.Color(config.color1) },
        uColor2: { value: new THREE.Color(config.color2) },
        uColor3: { value: new THREE.Color(config.color3) },
        uColor4: { value: new THREE.Color(config.color4) },
        uStop1: { value: config.stop1 },
        uStop2: { value: config.stop2 },
        uStop3: { value: config.stop3 },
        uScroll: { value: 0 },
        uZoom: { value: 1 },
        uTrailPositions: { value: Array.from({ length: MAX_TRAIL }, () => new THREE.Vector2(0.5, 0.5)) },
        uTrailVelocities: { value: Array.from({ length: MAX_TRAIL }, () => new THREE.Vector2(0, 0)) },
        uTrailAges: { value: new Float32Array(MAX_TRAIL) },
        uTrailCount: { value: 0 },
      };

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(geometry, material));

      const render = () => renderer.render(scene, camera);

      const resize = () => {
        const width = window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.uAspect.value = width / height;
        if (reduceMotion) render();
      };
      window.addEventListener("resize", resize, { passive: true });
      resize();

      const trail: TrailPoint[] = [];
      const smoothVel = { x: 0, y: 0 };
      let lastMouse: Point | null = null;
      let targetPointer: Point | null = null;
      let currPointer: Point | null = null;

      const addTrailPoint = (x: number, y: number, vx: number, vy: number) => {
        if (lastMouse) {
          const dx = x - lastMouse.x;
          const dy = y - lastMouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.008) {
            const steps = Math.min(Math.floor(dist / 0.008), 5);
            for (let i = 1; i <= steps; i++) {
              const linearT = i / (steps + 1);
              const smoothT = linearT * linearT * (3 - 2 * linearT);
              trail.unshift({ x: lastMouse.x + dx * smoothT, y: lastMouse.y + dy * smoothT, vx, vy, age: 0 });
            }
          }
        }
        trail.unshift({ x, y, vx, vy, age: 0 });
        if (trail.length > MAX_TRAIL) trail.length = MAX_TRAIL;
      };

      const handleMove = (event: PointerEvent) => {
        const x = event.clientX / window.innerWidth;
        const y = 1 - event.clientY / window.innerHeight;
        targetPointer = { x, y };
        if (!currPointer) {
          currPointer = { x, y };
          lastMouse = { x, y };
        }
      };

      const pointerEnabled = !isMobile && !reduceMotion;
      if (pointerEnabled) window.addEventListener("pointermove", handleMove, { passive: true });

      const scroll = { current: 0, last: 0, boost: 0 };
      scroll.current = scroll.last = window.scrollY / window.innerHeight;

      const tick = (_time: number, deltaMs: number) => {
        const delta = Math.min(deltaMs / 1000, 0.05);
        const position = window.scrollY / window.innerHeight;
        const velocity = Math.abs(position - scroll.last) / Math.max(delta, 0.001);
        scroll.last = position;

        scroll.current += (position - scroll.current) * (1 - Math.exp(-delta * scrollMotion.driftSmoothing));
        const boostTarget = Math.min(velocity, scrollMotion.maxBoost);
        scroll.boost += (boostTarget - scroll.boost) * (1 - Math.exp(-delta * scrollMotion.boostSmoothing));

        uniforms.uTime.value += delta * (1 + scroll.boost * scrollMotion.boostStrength);
        uniforms.uScroll.value = scroll.current * scrollMotion.drift;
        uniforms.uZoom.value += (backgroundState.zoom - uniforms.uZoom.value) * (1 - Math.exp(-delta * 10));

        if (pointerEnabled && targetPointer && currPointer) {
          const lerpBlend = 1 - Math.exp(-delta * 30);
          const prevX = currPointer.x;
          const prevY = currPointer.y;

          currPointer.x += (targetPointer.x - currPointer.x) * lerpBlend;
          currPointer.y += (targetPointer.y - currPointer.y) * lerpBlend;

          const instVx = (currPointer.x - prevX) / Math.max(delta, 0.001);
          const instVy = (currPointer.y - prevY) / Math.max(delta, 0.001);
          const velBlend = 1 - Math.exp(-delta * 22);
          smoothVel.x += (instVx - smoothVel.x) * velBlend;
          smoothVel.y += (instVy - smoothVel.y) * velBlend;

          if (Math.hypot(currPointer.x - prevX, currPointer.y - prevY) > 0.0004) {
            addTrailPoint(currPointer.x, currPointer.y, smoothVel.x, smoothVel.y);
            lastMouse = { x: currPointer.x, y: currPointer.y };
          }
        }

        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].age += delta;
          if (trail[i].age > TRAIL_MAX_AGE) trail.splice(i, 1);
        }

        uniforms.uTrailCount.value = trail.length;
        trail.forEach((point, i) => {
          uniforms.uTrailPositions.value[i].set(point.x, point.y);
          uniforms.uTrailVelocities.value[i].set(point.vx, point.vy);
          uniforms.uTrailAges.value[i] = point.age;
        });

        render();
      };

      if (reduceMotion) render();
      else gsap.ticker.add(tick);

      gsap.to(canvas, { opacity: 1, duration: 0.8, ease: "power1.out" });

      cleanup = () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", handleMove);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh w-full opacity-0"
    />
  );
}

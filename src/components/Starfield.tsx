"use client";

// Parallax 3-layer starfield. Ported from the mockup's app.js with
// React lifecycle wiring + Hi-DPI handling + clean teardown on unmount.

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
  hue: number;
};

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let rafId = 0;

    function initStars() {
      stars = [];
      const count = Math.floor((w * h) / 9000);
      for (let i = 0; i < count; i++) {
        const layer = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: layer < 0.7 ? 0.4 * dpr : layer < 0.95 ? 1 * dpr : 1.6 * dpr,
          speed: layer < 0.7 ? 0.05 : layer < 0.95 ? 0.15 : 0.35,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.01 + Math.random() * 0.03,
          // Most stars cool-blue; a rare few warm-amber (the "anomaly" stars).
          hue: layer < 0.95 ? 200 + Math.random() * 30 : 30 + Math.random() * 30,
        });
      }
    }

    function resize() {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      initStars();
    }

    function draw() {
      if (!ctx) return;
      // Translucent dark fill on each frame creates a soft motion trail.
      ctx.fillStyle = "rgba(3, 5, 26, 0.4)";
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        s.x -= s.speed * dpr;
        if (s.x < 0) s.x = w;
        s.twinkle += s.twinkleSpeed;
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
        ctx.fillStyle = `hsla(${s.hue}, 80%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}

/** Renders Starfield + vignette + scanlines as one drop-in background. */
export function SpaceBackdrop() {
  return (
    <>
      <Starfield />
      <div className="vignette" aria-hidden />
      <div className="scanlines" aria-hidden />
    </>
  );
}

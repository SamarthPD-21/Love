"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCelebrationStore } from "@/stores/useCelebrationStore";

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  color: string;
  life: number;
  decay: number;
  emoji?: string;
}

const COLORS = [
  "#E8587A", // primary rose
  "#B8A9C9", // mauve
  "#D4A574", // gold
  "#FFD700", // gold-bright
  "#FF6B9D", // pink
  "#C084FC", // purple
  "#F97316", // orange
  "#34D399", // emerald
];

// Particle count caps — keeps total GPU/CPU work bounded
const MAX_PARTICLES = 120;
const BIG_BURST = 40;   // was 80
const SMALL_BURST = 20;  // was 35

/**
 * Lightweight canvas-based confetti burst — zero deps.
 * Reads from the celebration store; renders a burst per entry.
 *
 * Performance optimisations vs. prior version:
 *  - Halved default particle counts (40 / 20 instead of 80 / 35)
 *  - Hard cap at 120 simultaneous particles
 *  - Emoji particles are only 1-in-4 (was 1-in-3) and rendered at smaller font size
 *  - Shorter lifetimes (40-60 frames instead of 60-100)
 *  - Canvas sized once + on resize only, no per-frame allocation
 *  - rAF loop self-terminates immediately when particles drain to 0
 *  - Canvas hidden via CSS when idle to reduce composite cost
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);

  const bursts = useCelebrationStore((s) => s.bursts);

  // ── Canvas resize ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      // Match CSS size; no DPR scaling to keep drawing cheap
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Animation loop ──────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isAnimatingRef.current = false;
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      isAnimatingRef.current = false;
      return;
    }

    const particles = particlesRef.current;

    if (particles.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isAnimatingRef.current = false;
      // Hide the canvas layer to reduce compositor cost when idle
      canvas.style.visibility = "hidden";
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let writeIdx = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14; // slightly stronger gravity = shorter airtime
      p.vx *= 0.985;
      p.rot += p.rotV;
      p.life -= p.decay;

      if (p.life <= 0) continue;

      const alpha = Math.min(1, p.life * 2.5);
      ctx.globalAlpha = alpha;

      if (p.emoji) {
        // Emoji rendering is expensive — keep font small
        ctx.font = `${p.w}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        // Simple rectangle — much cheaper than save/translate/rotate/restore
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.w * 0.5, p.y - p.h * 0.5, p.w, p.h);
      }

      // Compact surviving particles in-place (avoids .filter() allocation)
      particles[writeIdx++] = p;
    }
    particles.length = writeIdx;
    ctx.globalAlpha = 1;

    animRef.current = requestAnimationFrame(draw);
  }, []);

  // ── Spawn particles on new burst ────────────────────────────
  useEffect(() => {
    const newIds = bursts
      .map((b) => b.id)
      .filter((id) => !burstsRef.current.includes(id));

    if (newIds.length === 0) return;
    burstsRef.current = bursts.map((b) => b.id);

    const canvas = canvasRef.current;
    const originX = (canvas?.width ?? window.innerWidth) / 2;
    const originY = (canvas?.height ?? window.innerHeight) * 0.4; // slightly above center

    for (const id of newIds) {
      const burst = bursts.find((b) => b.id === id);
      const count = burst?.intensity === "big" ? BIG_BURST : SMALL_BURST;
      const useEmoji = burst?.emoji;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 2.5 + Math.random() * 5;
        const isEmoji = useEmoji && i % 4 === 0; // 1-in-4 instead of 1-in-3

        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 16,
          y: originY + (Math.random() - 0.5) * 16,
          w: isEmoji ? 14 : 3 + Math.random() * 5,
          h: isEmoji ? 14 : 6 + Math.random() * 8,
          vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.7),
          vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.7) - 1.5,
          rot: Math.random() * 360,
          rotV: (Math.random() - 0.5) * 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
          decay: 1 / (40 + Math.random() * 20), // 40-60 frames (was 60-100)
          emoji: isEmoji ? useEmoji : undefined,
        });
      }
    }

    // Hard cap to prevent unbounded growth from rapid celebrations
    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }

    // Start animation loop if not already running
    if (particlesRef.current.length > 0 && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      // Make canvas visible before drawing
      if (canvas) canvas.style.visibility = "visible";
      animRef.current = requestAnimationFrame(draw);
    }
  }, [bursts, draw]);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9998]"
      style={{ visibility: "hidden" }}
      aria-hidden="true"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
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
  maxLife: number;
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

/**
 * Lightweight canvas-based confetti burst — zero deps.
 * Reads from the celebration store; renders a burst per entry.
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);

  const bursts = useCelebrationStore((s) => s.bursts);

  // Setup canvas size listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const draw = () => {
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

    if (particlesRef.current.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isAnimatingRef.current = false;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.vx *= 0.99;
      p.rot += p.rotV;
      p.life -= 1 / p.maxLife;

      if (p.life <= 0) return false;

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);

      if (p.emoji) {
        ctx.font = `${p.w}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
      return true;
    });

    animRef.current = requestAnimationFrame(draw);
  };

  // Track new burst IDs so we can spawn particles.
  useEffect(() => {
    const newIds = bursts
      .map((b) => b.id)
      .filter((id) => !burstsRef.current.includes(id));

    if (newIds.length === 0) return;
    burstsRef.current = bursts.map((b) => b.id);

    const canvas = canvasRef.current;
    const originX = (canvas?.width ?? window.innerWidth) / 2;
    const originY = (canvas?.height ?? window.innerHeight) / 2;

    for (const id of newIds) {
      const burst = bursts.find((b) => b.id === id);
      const count = burst?.intensity === "big" ? 80 : 35;
      const useEmoji = burst?.emoji;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 3 + Math.random() * 6;
        const isEmoji = useEmoji && i % 3 === 0;

        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 20,
          y: originY + (Math.random() - 0.5) * 20,
          w: isEmoji ? 16 : 4 + Math.random() * 6,
          h: isEmoji ? 16 : 8 + Math.random() * 10,
          vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
          vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8) - 2,
          rot: Math.random() * 360,
          rotV: (Math.random() - 0.5) * 12,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
          maxLife: 60 + Math.random() * 40,
          emoji: isEmoji ? useEmoji : undefined,
        });
      }
    }

    // Cap particles to prevent lag when spammed
    if (particlesRef.current.length > 250) {
      particlesRef.current = particlesRef.current.slice(-250);
    }

    // Start animation loop if not already running
    if (particlesRef.current.length > 0 && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animRef.current = requestAnimationFrame(draw);
    }
  }, [bursts]);

  // Clean up loop on unmount
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
      aria-hidden="true"
    />
  );
}

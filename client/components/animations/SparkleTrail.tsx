"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface SparkleTrailProps {
  count?: number;
  className?: string;
}

/**
 * Ambient drifting sparkles — soft golden dots that float upward.
 * Used alongside FloatingHearts (daytime) and Fireflies (nighttime)
 * for an extra layer of warmth.
 */
export function SparkleTrail({ count = 18, className = "" }: SparkleTrailProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generated: Sparkle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 20 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10,
      opacity: 0.15 + Math.random() * 0.25,
    }));
    Promise.resolve().then(() => setSparkles(generated));
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {sparkles.map((sp) => (
        <motion.div
          key={sp.id}
          className="absolute rounded-full"
          style={{
            left: `${sp.x}%`,
            top: `${sp.y}%`,
            width: `${sp.size}px`,
            height: `${sp.size}px`,
            background: "radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,215,0,0) 70%)",
            boxShadow: `0 0 ${sp.size * 3}px rgba(255,215,0,0.3)`,
          }}
          animate={{
            opacity: [0, sp.opacity, 0.1, sp.opacity, 0],
            y: [0, -40, -80, -50, -100],
            x: [0, 15, -20, 10, -10],
            scale: [0.5, 1.2, 0.8, 1.1, 0.5],
          }}
          transition={{
            duration: sp.duration,
            delay: sp.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

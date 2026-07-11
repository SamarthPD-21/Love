"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Heart {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface FloatingHeartsProps {
  count?: number;
  className?: string;
}

export function FloatingHearts({ count = 24, className = "" }: FloatingHeartsProps) {
  const [hearts, setHearts] = useState<(Heart & { color: string })[]>([]);

  const colors = ["#E8A0BF", "#C4B2D8", "#B5D6B3", "#FFD2B8"]; // Blush, Lavender, Sage, Peach

  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 12 + Math.random() * 20,
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 12,
      opacity: 0.12 + Math.random() * 0.18,
      color: colors[i % colors.length],
    }));
    setHearts(generated);
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute"
            style={{
              left: `${heart.x}%`,
              fontSize: `${heart.size}px`,
              opacity: heart.opacity,
              color: heart.color,
            }}
            initial={{ y: "110vh", rotate: 0 }}
            animate={{
              y: "-10vh",
              rotate: [0, 20, -20, 15, -15, 0],
              x: [0, 30, -30, 20, -20, 0],
            }}
            transition={{
              duration: heart.duration,
              delay: heart.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            ♥
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

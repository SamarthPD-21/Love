"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingReactionProps {
  /** If truthy, the reaction is currently active. Toggle true to spawn. */
  active: boolean;
  /** Origin point in CSS coordinates (e.g. from a click event). */
  origin?: { x: number; y: number };
  /** Emoji(s) to float. Randomly picked per particle if array. */
  emoji?: string | string[];
  /** Number of particles. */
  count?: number;
  /** CSS class for the wrapper. */
  className?: string;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
}

let pid = 0;

/**
 * A burst of floating emoji that spawn at an origin point and drift
 * upward with gravity. Used for hugs, favorites, notifications.
 *
 * Usage:
 *   const [show, setShow] = useState(false);
 *   <FloatingReaction active={show} emoji="❤️" origin={clickPos} />
 *   // Trigger: onClick → setShow(true); reset after 1s.
 */
export function FloatingReaction({
  active,
  origin = typeof window !== "undefined" ? { x: window.innerWidth / 2, y: window.innerHeight / 2 } : { x: 0, y: 0 },
  emoji = ["❤️", "💕", "✨", "💖"],
  count = 6,
  className = "",
}: FloatingReactionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const emojiKey = Array.isArray(emoji) ? emoji.join(",") : emoji;

  useEffect(() => {
    if (!active) {
      Promise.resolve().then(() => setParticles([]));
      return;
    }
    const emojis = emojiKey.split(",");
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const speed = 1.5 + Math.random() * 3;
      arr.push({
        id: pid++,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: -2 - Math.random() * 3,
        rotation: (Math.random() - 0.5) * 30,
        scale: 0.7 + Math.random() * 0.6,
      });
    }
    Promise.resolve().then(() => setParticles(arr));
  }, [active, count, emojiKey]);

  return (
    <div
      className={`pointer-events-none fixed z-[9997] ${className}`}
      style={{ left: origin.x, top: origin.y }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {active &&
          particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute select-none"
              style={{ fontSize: 24 }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
              animate={{
                opacity: 0,
                x: p.vx * 60,
                y: p.vy * 60 - 30,
                scale: p.scale * 1.5,
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {p.emoji}
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  );
}

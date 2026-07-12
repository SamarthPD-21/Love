"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Firefly {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface FirefliesProps {
  count?: number;
  className?: string;
}

export function Fireflies({ count = 35, className = "" }: FirefliesProps) {
  const [fireflies, setFireflies] = useState<Firefly[]>([]);

  useEffect(() => {
    const generated: Firefly[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 5,
      duration: 5 + Math.random() * 8,
      delay: Math.random() * 6,
    }));
    Promise.resolve().then(() => setFireflies(generated));
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {fireflies.map((ff) => (
        <motion.div
          key={ff.id}
          className="absolute rounded-full"
          style={{
            left: `${ff.x}%`,
            top: `${ff.y}%`,
            width: `${ff.size}px`,
            height: `${ff.size}px`,
            background: "radial-gradient(circle, rgba(255,223,140,0.95) 0%, rgba(255,223,140,0) 70%)",
            boxShadow: `0 0 ${ff.size * 4}px rgba(255,223,140,0.5)`,
          }}
          animate={{
            opacity: [0, 0.9, 0.2, 0.9, 0],
            x: [0, 45, -30, 25, -15, 0],
            y: [0, -35, 20, -40, 20, 0],
            scale: [1, 1.4, 0.7, 1.3, 1],
          }}
          transition={{
            duration: ff.duration,
            delay: ff.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  maxOpacity: number;
  drift: number; // horizontal drift in px
  lift: number;  // vertical lift in px
}

interface SparkleTrailProps {
  count?: number;
  className?: string;
}

/**
 * Ambient drifting sparkles — soft golden dots that float upward.
 *
 * Performance: rendered with pure CSS @keyframes (compositor/GPU thread),
 * NOT Framer Motion JS loops. Each sparkle sets its own timing via inline
 * CSS custom properties so the browser animates them off the main thread.
 * Respects `prefers-reduced-motion`.
 */
export function SparkleTrail({ count = 12, className = "" }: SparkleTrailProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generated: Sparkle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 20 + Math.random() * 80,
      size: 3 + Math.random() * 5,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10,
      maxOpacity: 0.15 + Math.random() * 0.25,
      drift: -40 + Math.random() * 60,
      lift: 60 + Math.random() * 60,
    }));
    setSparkles(generated);
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 sparkle-field ${className}`}
      aria-hidden="true"
    >
      {sparkles.map((sp) => (
        <span
          key={sp.id}
          className="sparkle"
          style={
            {
              left: `${sp.x}%`,
              top: `${sp.y}%`,
              width: `${sp.size}px`,
              height: `${sp.size}px`,
              animationDuration: `${sp.duration}s`,
              animationDelay: `${sp.delay}s`,
              "--sp-max-opacity": sp.maxOpacity,
              "--sp-drift": `${sp.drift}px`,
              "--sp-lift": `${sp.lift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

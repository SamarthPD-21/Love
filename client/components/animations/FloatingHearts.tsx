"use client";

import { useEffect, useState } from "react";

interface Heart {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  color: string;
}

interface FloatingHeartsProps {
  count?: number;
  className?: string;
}

const colors = ["#BE3A6E", "#B8A9C9", "#D4A574", "#E8587A"]; // Rose, Mauve, Gold, Light Rose

export function FloatingHearts({ count = 24, className = "" }: FloatingHeartsProps) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 12 + Math.random() * 20,
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 12,
      opacity: 0.12 + Math.random() * 0.18,
      drift: -60 + Math.random() * 120, // drift in pixels
      color: colors[i % colors.length],
    }));
    setHearts(generated);
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 heart-field ${className}`}
      aria-hidden="true"
    >
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="heart-particle"
          style={
            {
              left: `${heart.x}%`,
              fontSize: `${heart.size}px`,
              color: heart.color,
              animationDuration: `${heart.duration}s`,
              animationDelay: `${heart.delay}s`,
              "--heart-max-opacity": heart.opacity,
              "--heart-drift": `${heart.drift}px`,
            } as React.CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </div>
  );
}

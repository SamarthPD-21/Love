"use client";

import { useEffect, useState } from "react";

interface Firefly {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

interface FirefliesProps {
  count?: number;
  className?: string;
}

export function Fireflies({ count = 35, className = "" }: FirefliesProps) {
  const [fireflies, setFireflies] = useState<Firefly[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 5,
      duration: 5 + Math.random() * 8,
      delay: Math.random() * 6,
      driftX: -30 + Math.random() * 60,
      driftY: -30 + Math.random() * 60,
    }));
    setFireflies(generated);
  }, [count]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 firefly-field ${className}`}
      aria-hidden="true"
    >
      {fireflies.map((ff) => (
        <span
          key={ff.id}
          className="firefly-particle"
          style={
            {
              left: `${ff.x}%`,
              top: `${ff.y}%`,
              width: `${ff.size}px`,
              height: `${ff.size}px`,
              boxShadow: `0 0 ${ff.size * 4}px rgba(255,223,140,0.5)`,
              animationDuration: `${ff.duration}s`,
              animationDelay: `${ff.delay}s`,
              "--ff-drift-x": `${ff.driftX}px`,
              "--ff-drift-y": `${ff.driftY}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

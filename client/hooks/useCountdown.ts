"use client";

import { useState, useEffect } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalDays: number;
  progress: number; // 0-1, how much time has passed since creation
}

export function useCountdown(
  targetDate?: string | Date | null,
  startDate?: string | Date | null
): CountdownResult {
  const [result, setResult] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    totalDays: 0,
    progress: 0,
  });

  // Calculate dependencies using primitive timestamps to prevent reference loops
  const targetTime = targetDate ? new Date(targetDate).getTime() : 0;
  const startTime = startDate ? new Date(startDate).getTime() : 0;

  useEffect(() => {
    if (!targetTime) {
      Promise.resolve().then(() => {
        setResult((prev) => 
          prev.isExpired ? prev : {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            totalDays: 0,
            progress: 0,
          }
        );
      });
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setResult((prev) => 
          prev.isExpired && prev.progress === 1 ? prev : {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            totalDays: 0,
            progress: 1,
          }
        );
        return;
      }

      const start = startTime || (now - 1000); // default start is slightly in the past
      const totalMs = targetTime - start;
      const elapsedMs = now - start;
      const progress = Math.min(Math.max(elapsedMs / (totalMs || 1), 0), 1);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

      setResult({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        totalDays,
        progress,
      });
    };

    Promise.resolve().then(() => calculate());
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime, startTime]);

  return result;
}

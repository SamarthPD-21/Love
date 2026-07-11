"use client";

import { useState, useEffect } from "react";
import { getTimeOfDay, getGreeting, getDailySubGreeting } from "@/lib/utils";

export function useTimeOfDay() {
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [greeting, setGreeting] = useState("Hello");
  const [subGreeting, setSubGreeting] = useState("");

  useEffect(() => {
    const update = () => {
      const tod = getTimeOfDay();
      setTimeOfDay(tod);
      setGreeting(getGreeting(tod));
      setSubGreeting(getDailySubGreeting());
    };

    update();

    // Update every minute
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { timeOfDay, greeting, subGreeting };
}

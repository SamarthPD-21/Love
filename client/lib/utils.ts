import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the time-of-day period based on current hour.
 */
export function getTimeOfDay(hour?: number): "morning" | "afternoon" | "evening" | "night" {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

/**
 * Get a greeting based on the time of day.
 */
export function getGreeting(timeOfDay: string): string {
  switch (timeOfDay) {
    case "morning": return "Good Morning";
    case "afternoon": return "Good Afternoon";
    case "evening": return "Good Evening";
    case "night": return "Good Night";
    default: return "Hello";
  }
}

/**
 * Calculate days between two dates.
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a number with commas.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get a random item from an array.
 */
export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Daily messages — motivational sub-greetings for the home screen.
 * Rotates based on day of year so it's consistent for the whole day.
 */
const dailySubGreetings = [
  "You survived another day. I'm proud of you.",
  "You're doing amazing, even when it doesn't feel like it.",
  "Remember: you're never alone in this.",
  "Take a deep breath. You've got this.",
  "Today is another beautiful chapter.",
  "You make the world brighter just by being in it.",
  "Even the smallest step forward counts.",
  "You're stronger than you think.",
  "The best is yet to come.",
  "I hope today treats you gently.",
  "You deserve all the good things coming your way.",
  "Don't forget to be kind to yourself today.",
  "You're someone's favorite person.",
  "Every day with you is a gift.",
  "The stars aligned the day I found you.",
  "Home isn't a place. It's you.",
  "You're the best part of my story.",
  "I'm grateful for every moment with you.",
  "Whatever happens today, we'll face it together.",
  "You make ordinary days feel magical.",
];

export function getDailySubGreeting(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return dailySubGreetings[dayOfYear % dailySubGreetings.length];
}

/**
 * Helper to safely extract the relationship ID string.
 * Handles both plain strings and populated Relationship objects.
 */
export function getRelationshipId(rel: any): string {
  if (!rel) return "";
  return typeof rel === "object" ? (rel._id || rel.id || "") : rel;
}

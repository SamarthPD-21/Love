"use client";

import { motion, type Variants } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
  },
  enter: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: {
      duration: 0.25,
      ease: "easeInOut" as const,
    },
  },
};

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

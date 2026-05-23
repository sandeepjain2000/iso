"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const easeOut = [0.33, 1, 0.68, 1] as const;

/**
 * v0-style card: subtle lift + shadow on hover. Respects prefers-reduced-motion.
 */
export function MotionSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={false}
      transition={{ duration: 0.2, ease: easeOut }}
      whileHover={{
        y: -2,
        boxShadow: "0 12px 40px -16px rgba(0, 0, 0, 0.1)",
      }}
      whileTap={{ scale: 0.997 }}
    >
      {children}
    </motion.div>
  );
}

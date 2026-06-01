"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GradientOrbProps {
  className?: string;
  color?: string;
  size?: string;
  delay?: number;
}

export function GradientOrb({
  className,
  color = "rgba(139, 92, 246, 0.15)",
  size = "400px",
  delay = 0,
}: GradientOrbProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-accent/20 text-accent-light": variant === "default",
          "bg-emerald-500/20 text-emerald-400": variant === "success",
          "bg-amber-500/20 text-amber-400": variant === "warning",
          "bg-red-500/20 text-red-400": variant === "danger",
          "bg-cyan-500/20 text-cyan-400": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

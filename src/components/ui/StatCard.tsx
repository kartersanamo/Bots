"use client";

import { cn, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
  className?: string;
  delay?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  loading,
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "glass glow-border rounded-xl p-5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-surface-hover" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-white">
              {typeof value === "number" ? formatNumber(value) : value}
            </p>
          )}
          {trend && !loading && (
            <p className="mt-1 text-xs text-accent-light">{trend}</p>
          )}
        </div>
        <div className="rounded-lg bg-accent/10 p-2.5">
          <Icon className="h-5 w-5 text-accent-light" />
        </div>
      </div>
    </motion.div>
  );
}

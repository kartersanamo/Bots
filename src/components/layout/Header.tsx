"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
  action?: ReactNode;
}

export function Header({
  title,
  description,
  breadcrumbs,
  className,
  action,
}: HeaderProps) {
  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="mb-2 flex max-w-full items-center gap-1 overflow-x-auto text-xs text-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white sm:text-xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

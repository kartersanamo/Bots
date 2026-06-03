"use client";

import { cn } from "@/lib/utils";

export interface ScrollableTabItem<T extends string = string> {
  id: T;
  label: string;
}

interface ScrollableTabNavProps<T extends string> {
  tabs: ScrollableTabItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  className?: string;
  /** Underline matches dashboard page tabs; pill matches section chips. */
  variant?: "underline" | "pill";
}

export function ScrollableTabNav<T extends string>({
  tabs,
  activeId,
  onSelect,
  className,
  variant = "underline",
}: ScrollableTabNavProps<T>) {
  return (
    <div
      className={cn(
        "-mx-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        variant === "underline" && "border-b border-border",
        className
      )}
    >
      <nav
        className={cn(
          "flex w-max min-w-full gap-1",
          variant === "underline" ? "gap-0" : "pb-1"
        )}
        aria-label="Section tabs"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap text-sm transition-colors",
                variant === "underline"
                  ? cn(
                      "min-h-11 border-b-2 px-3 py-2.5 sm:px-4",
                      active
                        ? "border-accent text-white"
                        : "border-transparent text-muted hover:text-white"
                    )
                  : cn(
                      "min-h-10 rounded-md px-3 py-2",
                      active
                        ? "bg-surface-hover text-white"
                        : "text-muted hover:bg-surface-hover hover:text-white"
                    )
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

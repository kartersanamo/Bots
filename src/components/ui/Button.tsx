import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent text-white hover:bg-accent/90": variant === "primary",
            "border border-border bg-surface text-white hover:bg-surface-hover":
              variant === "secondary",
            "text-muted hover:bg-surface-hover hover:text-white":
              variant === "ghost",
            "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-sm": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
